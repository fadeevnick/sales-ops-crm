package com.salesops.bootstrap.crm.opportunity

import com.fasterxml.jackson.databind.JsonNode
import com.salesops.bootstrap.api.ForbiddenOperationException
import com.salesops.bootstrap.api.ValidationFailureException
import com.salesops.bootstrap.approval.ApprovalRepository
import com.salesops.bootstrap.auth.CurrentUserContext
import com.salesops.bootstrap.crm.account.AccountRepository
import com.salesops.bootstrap.crm.account.AccountVisibilityLookup
import com.salesops.bootstrap.crm.contact.ContactRepository
import com.salesops.bootstrap.crm.contact.ContactVisibilityLookup
import com.salesops.bootstrap.metadata.MetadataRuntimeService
import com.salesops.bootstrap.metadata.MetadataStandardFieldKeys
import com.salesops.bootstrap.metadata.PublishedMetadataRuntimeFieldDefinition
import com.salesops.bootstrap.metadata.PublishedMetadataRuntimeSnapshot
import com.salesops.bootstrap.repository.UserShellRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.format.DateTimeParseException
import java.time.LocalDate
import java.util.UUID

@Service
class OpportunityService(
    private val opportunityRepository: OpportunityRepository,
    private val approvalRepository: ApprovalRepository,
    private val accountRepository: AccountRepository,
    private val contactRepository: ContactRepository,
    private val userShellRepository: UserShellRepository,
    private val stageTransitionPolicy: StageTransitionPolicy,
    private val teamScopePolicy: TeamScopePolicy,
    private val metadataRuntimeService: MetadataRuntimeService,
) {
    fun listOpportunities(
        context: CurrentUserContext,
        stageKey: String?,
        ownerId: String?,
        accountId: String?,
        query: String?,
        customFieldFilters: Map<String, String>,
        page: Int?,
        pageSize: Int?,
    ): OpportunityListResponse {
        val resolvedPage = normalizePage(page)
        val resolvedPageSize = normalizePageSize(pageSize)

        assertCanReadOpportunities(context)
        val publishedSnapshot = metadataRuntimeService.loadPublishedSnapshot(context.tenant.tenantId)
        val stageBridge = publishedStageKeyByLegacyStageId(context.tenant.tenantId, publishedSnapshot)
        val resolvedStageId = stageKey?.trim()?.takeIf { it.isNotEmpty() }?.let { requestedStageKey ->
            findPublishedOpportunityStage(
                snapshot = publishedSnapshot,
                stageKey = requestedStageKey,
            )
            stageBridge.entries.firstOrNull { (_, bridgeStageKey) -> bridgeStageKey == requestedStageKey }?.key
                ?: return OpportunityListResponse(
                    items = emptyList(),
                    page = resolvedPage,
                    pageSize = resolvedPageSize,
                    total = 0,
                )
        }

        val filter = OpportunityListFilter(
            tenantId = context.tenant.tenantId,
            ownerScope = teamScopePolicy.opportunityOwnerScope(context),
            stageId = resolvedStageId,
            ownerUserId = ownerId?.trim()?.takeIf { it.isNotEmpty() },
            accountId = accountId?.trim()?.takeIf { it.isNotEmpty() },
            queryText = query?.trim()?.takeIf { it.isNotEmpty() }?.lowercase()?.let { "%$it%" },
            customFieldFilters = normalizeOpportunityCustomFieldFilters(
                publishedSnapshot = publishedSnapshot,
                customFieldFilters = customFieldFilters,
            ),
            page = resolvedPage,
            pageSize = resolvedPageSize,
        )

        val items = opportunityRepository.listVisible(filter).map { record ->
            OpportunityListItem(
                id = record.id,
                title = record.title,
                accountId = record.accountId,
                accountName = record.accountName,
                ownerId = record.ownerUserId,
                ownerName = record.ownerName,
                stageKey = stageBridge.stageKeyFor(record.stageId),
                expectedAmount = record.expectedAmount,
                closeDate = record.closeDate,
                approvalState = record.approvalState,
            )
        }

        return OpportunityListResponse(
            items = items,
            page = resolvedPage,
            pageSize = resolvedPageSize,
            total = opportunityRepository.countVisible(filter),
        )
    }

    fun summarizeOpportunities(
        context: CurrentUserContext,
        stageKey: String?,
        ownerId: String?,
        accountId: String?,
        query: String?,
        customFieldFilters: Map<String, String>,
    ): OpportunitySummaryResponse {
        assertCanReadOpportunities(context)
        val publishedSnapshot = metadataRuntimeService.loadPublishedSnapshot(context.tenant.tenantId)
        val stageBridge = publishedStageKeyByLegacyStageId(context.tenant.tenantId, publishedSnapshot)
        val resolvedStageId = stageKey?.trim()?.takeIf { it.isNotEmpty() }?.let { requestedStageKey ->
            findPublishedOpportunityStage(snapshot = publishedSnapshot, stageKey = requestedStageKey)
            stageBridge.entries.firstOrNull { (_, bridgeStageKey) -> bridgeStageKey == requestedStageKey }?.key
                ?: return OpportunitySummaryResponse(0, BigDecimal.ZERO, 0, 0)
        }

        val filter = OpportunityListFilter(
            tenantId = context.tenant.tenantId,
            ownerScope = teamScopePolicy.opportunityOwnerScope(context),
            stageId = resolvedStageId,
            ownerUserId = ownerId?.trim()?.takeIf { it.isNotEmpty() },
            accountId = accountId?.trim()?.takeIf { it.isNotEmpty() },
            queryText = query?.trim()?.takeIf { it.isNotEmpty() }?.lowercase()?.let { "%$it%" },
            customFieldFilters = normalizeOpportunityCustomFieldFilters(
                publishedSnapshot = publishedSnapshot,
                customFieldFilters = customFieldFilters,
            ),
            page = 1,
            pageSize = 1,
        )

        val record = opportunityRepository.summarizeVisible(filter, java.time.YearMonth.now().toString())
        return OpportunitySummaryResponse(
            open = record.openCount,
            pipelineValue = record.pipelineValue,
            pendingApprovals = record.pendingApprovals,
            closingThisMonth = record.closingThisMonth,
        )
    }

    fun listAssignableOwners(context: CurrentUserContext): AssignableOwnersResponse {
        val owners = when (val scope = teamScopePolicy.opportunityOwnerScope(context)) {
            is OpportunityOwnerScope.AllTenant ->
                userShellRepository.findAllByTenant(context.tenant.tenantId)
            is OpportunityOwnerScope.Limited ->
                userShellRepository.findByTenantAndIds(context.tenant.tenantId, scope.ownerUserIds.distinct())
        }

        return AssignableOwnersResponse(
            owners = owners
                .map { AssignableOwnerItem(id = it.userId, displayName = it.displayName) }
                .sortedBy { it.displayName.lowercase() },
        )
    }

    @Transactional
    fun createOpportunity(
        context: CurrentUserContext,
        request: CreateOpportunityRequest,
    ): CreateOpportunityResponse {
        val resolvedOwnerId = request.ownerId?.trim()?.takeIf { it.isNotEmpty() } ?: context.userId
        assertCanCreateOpportunity(context, resolvedOwnerId)

        val owner = userShellRepository.findByUserId(resolvedOwnerId)
            ?: throw ValidationFailureException("Owner user does not exist")

        if (owner.tenantId != context.tenant.tenantId) {
            throw ValidationFailureException("Owner must belong to the current tenant")
        }

        val resolvedAccountId = request.accountId.trim()
        val visibleAccount = accountRepository.findVisibleAccountById(
            AccountVisibilityLookup(
                tenantId = context.tenant.tenantId,
                ownerScope = teamScopePolicy.opportunityOwnerScope(context),
                accountId = resolvedAccountId,
            ),
        ) ?: throw ValidationFailureException("Account does not exist in visible scope")

        val resolvedTitle = request.title.trim()
        val resolvedStageKey = request.stageKey.trim()
        val publishedSnapshot = metadataRuntimeService.loadPublishedSnapshot(context.tenant.tenantId)
        val publishedStage = findPublishedOpportunityStage(
            snapshot = publishedSnapshot,
            stageKey = resolvedStageKey,
        )

        val stage = opportunityRepository.findStageByKey(context.tenant.tenantId, resolvedStageKey)
            ?: throw ValidationFailureException("Stage key does not exist in the CRM stage catalog")
        stageTransitionPolicy.validateInitialStage(publishedStage.stageKey)

        val primaryContactId = request.primaryContactId?.trim()?.takeIf { it.isNotEmpty() }?.let { contactId ->
            val contact = contactRepository.findVisibleContactById(
                ContactVisibilityLookup(
                    tenantId = context.tenant.tenantId,
                    ownerScope = teamScopePolicy.opportunityOwnerScope(context),
                    contactId = contactId,
                    accountId = visibleAccount.id,
                ),
            ) ?: throw ValidationFailureException("Primary contact does not exist in visible account scope")

            contact.id
        }

        val customFieldValues = normalizeOpportunityCustomFields(
            publishedSnapshot = publishedSnapshot,
            customFields = request.customFields,
        )

        validateRequiredFieldsForStage(
            stageKey = publishedStage.stageKey,
            publishedSnapshot = publishedSnapshot,
            values = OpportunityStandardRequiredFieldValues(
                title = resolvedTitle,
                accountId = visibleAccount.id,
                primaryContactId = primaryContactId,
                ownerUserId = resolvedOwnerId,
                expectedAmount = request.expectedAmount,
                closeDate = request.closeDate,
                customFields = customFieldValues.valuesByFieldKey(),
            ),
        )

        val opportunityId = "opp_${UUID.randomUUID().toString().replace("-", "").take(12)}"
        opportunityRepository.create(
            CreateOpportunityCommand(
                id = opportunityId,
                tenantId = context.tenant.tenantId,
                accountId = visibleAccount.id,
                primaryContactId = primaryContactId,
                title = resolvedTitle,
                ownerUserId = resolvedOwnerId,
                stageId = stage.id,
                expectedAmount = request.expectedAmount,
                closeDate = request.closeDate,
                globalStatus = "active",
                approvalState = "none",
                createdByUserId = context.userId,
                updatedByUserId = context.userId,
            ),
        )

        saveCustomFieldValues(
            context = context,
            opportunityId = opportunityId,
            publishedSnapshot = publishedSnapshot,
            values = customFieldValues,
        )

        return CreateOpportunityResponse(id = opportunityId)
    }

    fun getOpportunity(
        context: CurrentUserContext,
        opportunityId: String,
    ): OpportunityDetailResponse {
        assertCanReadOpportunities(context)

        val record = opportunityRepository.findVisibleById(
            OpportunityVisibilityLookup(
                tenantId = context.tenant.tenantId,
                ownerScope = teamScopePolicy.opportunityOwnerScope(context),
                opportunityId = opportunityId,
            ),
        ) ?: throw ValidationFailureException("Opportunity does not exist in visible scope")
        val publishedSnapshot = metadataRuntimeService.loadPublishedSnapshot(context.tenant.tenantId)
        val stageBridge = publishedStageKeyByLegacyStageId(context.tenant.tenantId, publishedSnapshot)
        val customFields = opportunityRepository
            .listCustomFieldValues(
                tenantId = context.tenant.tenantId,
                opportunityId = record.id,
            )
            .toCustomFieldResponseMap()
        val activeApproval = approvalRepository.findActiveSummaryByOpportunityId(
            tenantId = context.tenant.tenantId,
            opportunityId = record.id,
        )

        return OpportunityDetailResponse(
            id = record.id,
            title = record.title,
            account = OpportunityDetailAccount(
                id = record.accountId,
                name = record.accountName,
            ),
            primaryContact = record.primaryContactId?.let { contactId ->
                OpportunityDetailContact(
                    id = contactId,
                    fullName = record.primaryContactName ?: "",
                )
            },
            owner = OpportunityDetailOwner(
                id = record.ownerId,
                displayName = record.ownerName,
            ),
            stageKey = stageBridge.stageKeyFor(record.stageId),
            expectedAmount = record.expectedAmount,
            closeDate = record.closeDate,
            customFields = customFields,
            approvalState = record.approvalState,
            activeApproval = activeApproval?.let { approval ->
                OpportunityActiveApprovalSummary(
                    id = approval.approvalRequestId,
                    status = approval.requestStatus,
                    policyKey = approval.policyKey,
                    activeStepId = approval.activeStepId,
                    activeStepStatus = approval.activeStepStatus,
                    activeStepDueAt = approval.activeStepDueAt,
                    approverRoleKey = approval.approverRoleKey,
                    submittedAt = approval.submittedAt,
                )
            },
            timeline = opportunityRepository.listTimelineEvents(
                tenantId = context.tenant.tenantId,
                opportunityId = record.id,
            ).map { event ->
                OpportunityTimelineEventItem(
                    type = event.eventType,
                    code = event.eventCode,
                    title = event.title,
                    description = event.description,
                    actor = event.actorName,
                    at = event.createdAt,
                )
            },
        )
    }

    @Transactional
    fun updateOpportunity(
        context: CurrentUserContext,
        opportunityId: String,
        request: UpdateOpportunityRequest,
    ): UpdateOpportunityResponse {
        assertCanUpdateOpportunities(context)

        val record = opportunityRepository.findVisibleById(
            OpportunityVisibilityLookup(
                tenantId = context.tenant.tenantId,
                ownerScope = teamScopePolicy.opportunityOwnerScope(context),
                opportunityId = opportunityId,
            ),
        ) ?: throw ValidationFailureException("Opportunity does not exist in visible scope")

        val title = request.title?.trim()
        if (title != null && title.isEmpty()) {
            throw ValidationFailureException("Opportunity title cannot be blank")
        }

        if (request.stageKey != null) {
            throw ValidationFailureException("Stage cannot be updated through opportunity patch")
        }

        if (request.ownerId != null) {
            throw ValidationFailureException("Owner cannot be updated through opportunity patch")
        }

        if (title == null && request.expectedAmount == null && request.closeDate == null && request.customFields == null) {
            throw ValidationFailureException("At least one mutable opportunity field must be provided")
        }

        val publishedSnapshot = request.customFields?.let {
            metadataRuntimeService.loadPublishedSnapshot(context.tenant.tenantId)
        }
        val customFieldPlan = publishedSnapshot?.let {
            resolveCustomFieldUpdates(
                publishedSnapshot = it,
                customFields = request.customFields.orEmpty(),
            )
        }

        val updated = opportunityRepository.updateMutableFields(
            UpdateOpportunityCommand(
                tenantId = context.tenant.tenantId,
                opportunityId = record.id,
                title = title,
                expectedAmount = request.expectedAmount,
                closeDate = request.closeDate,
                updatedByUserId = context.userId,
            ),
        )

        if (!updated) {
            throw ValidationFailureException("Opportunity update was not applied")
        }

        if (publishedSnapshot != null && customFieldPlan != null) {
            saveCustomFieldValues(
                context = context,
                opportunityId = record.id,
                publishedSnapshot = publishedSnapshot,
                values = customFieldPlan.upserts,
            )
            if (customFieldPlan.clears.isNotEmpty()) {
                opportunityRepository.deleteCustomFieldValues(
                    tenantId = context.tenant.tenantId,
                    opportunityId = record.id,
                    fieldKeys = customFieldPlan.clears,
                )
            }
        }

        return UpdateOpportunityResponse(
            id = record.id,
            updated = true,
        )
    }

    fun moveStage(
        context: CurrentUserContext,
        opportunityId: String,
        request: MoveOpportunityStageRequest,
    ): MoveOpportunityStageResponse {
        assertCanModifyOpportunities(context)

        val record = opportunityRepository.findVisibleById(
            OpportunityVisibilityLookup(
                tenantId = context.tenant.tenantId,
                ownerScope = teamScopePolicy.opportunityOwnerScope(context),
                opportunityId = opportunityId,
            ),
        ) ?: throw ValidationFailureException("Opportunity does not exist in visible scope")

        val targetStageKey = request.targetStageKey.trim()
        val publishedSnapshot = metadataRuntimeService.loadPublishedSnapshot(context.tenant.tenantId)
        val publishedTargetStage = findPublishedOpportunityStage(
            snapshot = publishedSnapshot,
            stageKey = targetStageKey,
        )

        val targetStage = opportunityRepository.findStageByKey(context.tenant.tenantId, targetStageKey)
            ?: throw ValidationFailureException("Stage key does not exist in the CRM stage catalog")

        val stageBridge = publishedStageKeyByLegacyStageId(context.tenant.tenantId, publishedSnapshot)
        val currentStageKey = stageBridge.stageKeyFor(record.stageId)

        val decision = stageTransitionPolicy.decideMove(
            currentStageKey = currentStageKey,
            currentGlobalStatus = record.globalStatus,
            currentApprovalState = record.approvalState,
            targetStageKey = publishedTargetStage.stageKey,
        )

        validateRequiredFieldsForStage(
            stageKey = decision.targetStageKey,
            publishedSnapshot = publishedSnapshot,
            values = OpportunityStandardRequiredFieldValues(
                title = record.title,
                accountId = record.accountId,
                primaryContactId = record.primaryContactId,
                ownerUserId = record.ownerId,
                expectedAmount = record.expectedAmount,
                closeDate = record.closeDate,
                customFields = opportunityRepository
                    .listCustomFieldValues(
                        tenantId = context.tenant.tenantId,
                        opportunityId = record.id,
                    )
                    .toCustomFieldResponseMap(),
            ),
        )

        val updated = opportunityRepository.updateStage(
            MoveOpportunityStageCommand(
                tenantId = context.tenant.tenantId,
                opportunityId = record.id,
                stageId = targetStage.id,
                globalStatus = decision.nextGlobalStatus,
                updatedByUserId = context.userId,
            ),
        )

        if (!updated) {
            throw ValidationFailureException("Opportunity stage transition was not applied")
        }

        val actorName = userShellRepository.findByUserId(context.userId)?.displayName ?: context.userId
        val fromLabel = publishedSnapshot.stages.firstOrNull { it.stageKey == currentStageKey }?.displayName ?: currentStageKey
        val toLabel = publishedTargetStage.displayName
        opportunityRepository.appendTimelineEvent(
            AppendOpportunityTimelineEventCommand(
                id = "evt_${UUID.randomUUID().toString().replace("-", "").take(16)}",
                tenantId = context.tenant.tenantId,
                opportunityId = record.id,
                eventType = "stage_move",
                eventCode = "STAGE_MOVE",
                title = "Stage changed to $toLabel",
                description = "$fromLabel → $toLabel",
                actorUserId = context.userId,
                actorName = actorName,
            ),
        )

        return MoveOpportunityStageResponse(
            id = record.id,
            stageKey = decision.targetStageKey,
            updated = true,
        )
    }

    fun reassignOwner(
        context: CurrentUserContext,
        opportunityId: String,
        request: ReassignOpportunityOwnerRequest,
    ): ReassignOpportunityOwnerResponse {
        assertCanReassignOpportunities(context)

        val record = opportunityRepository.findVisibleById(
            OpportunityVisibilityLookup(
                tenantId = context.tenant.tenantId,
                ownerScope = teamScopePolicy.opportunityOwnerScope(context),
                opportunityId = opportunityId,
            ),
        ) ?: throw ValidationFailureException("Opportunity does not exist in visible scope")

        val newOwnerId = request.newOwnerId.trim()
        val newOwner = userShellRepository.findByUserId(newOwnerId)
            ?: throw ValidationFailureException("New owner user does not exist")

        if (newOwner.tenantId != context.tenant.tenantId) {
            throw ValidationFailureException("New owner must belong to the current tenant")
        }

        if (newOwner.userId == record.ownerId) {
            throw ValidationFailureException("New owner must differ from current owner")
        }

        val updated = opportunityRepository.updateOwner(
            ReassignOpportunityOwnerCommand(
                tenantId = context.tenant.tenantId,
                opportunityId = record.id,
                ownerUserId = newOwner.userId,
                updatedByUserId = context.userId,
            ),
        )

        if (!updated) {
            throw ValidationFailureException("Opportunity owner reassignment was not applied")
        }

        return ReassignOpportunityOwnerResponse(
            id = record.id,
            ownerId = newOwner.userId,
            updated = true,
        )
    }

    private fun assertCanReadOpportunities(context: CurrentUserContext) {
        when (context.roleKey) {
            "sales_rep", "sales_manager", "revops_admin" -> return
            "finance_approver", "legal_approver" ->
                throw ForbiddenOperationException("Current role cannot browse opportunity records")
            else ->
                throw ForbiddenOperationException("Current role cannot browse opportunity records")
        }
    }

    private fun assertCanCreateOpportunity(context: CurrentUserContext, ownerUserId: String) {
        when (context.roleKey) {
            "sales_rep", "sales_manager" -> {
                if (ownerUserId != context.userId) {
                    throw ForbiddenOperationException("Current role cannot assign opportunity owner outside self scope")
                }
            }
            "revops_admin" -> return
            "finance_approver", "legal_approver" ->
                throw ForbiddenOperationException("Current role cannot create opportunity records")
            else ->
                throw ForbiddenOperationException("Current role cannot create opportunity records")
        }
    }

    private fun assertCanModifyOpportunities(context: CurrentUserContext) {
        when (context.roleKey) {
            "sales_rep", "sales_manager", "revops_admin" -> return
            "finance_approver", "legal_approver" ->
                throw ForbiddenOperationException("Current role cannot move opportunity stages")
            else ->
                throw ForbiddenOperationException("Current role cannot move opportunity stages")
        }
    }

    private fun assertCanUpdateOpportunities(context: CurrentUserContext) {
        when (context.roleKey) {
            "sales_rep", "sales_manager", "revops_admin" -> return
            "finance_approver", "legal_approver" ->
                throw ForbiddenOperationException("Current role cannot update opportunity records")
            else ->
                throw ForbiddenOperationException("Current role cannot update opportunity records")
        }
    }

    private fun assertCanReassignOpportunities(context: CurrentUserContext) {
        when (context.roleKey) {
            "sales_manager", "revops_admin" -> return
            "sales_rep" ->
                throw ForbiddenOperationException("Current role cannot reassign opportunity owners")
            "finance_approver", "legal_approver" ->
                throw ForbiddenOperationException("Current role cannot reassign opportunity owners")
            else ->
                throw ForbiddenOperationException("Current role cannot reassign opportunity owners")
        }
    }

    private fun normalizePage(page: Int?): Int {
        val resolved = page ?: 1
        if (resolved < 1) {
            throw ValidationFailureException("Page must be greater than or equal to 1")
        }

        return resolved
    }

    private fun normalizePageSize(pageSize: Int?): Int {
        val resolved = pageSize ?: 20
        if (resolved !in 1..100) {
            throw ValidationFailureException("Page size must be between 1 and 100")
        }

        return resolved
    }

    private fun findPublishedOpportunityStage(
        snapshot: PublishedMetadataRuntimeSnapshot,
        stageKey: String,
    ) = snapshot.stages.firstOrNull { it.stageKey == stageKey }
        ?: throw ValidationFailureException("Published metadata stage key does not exist")

    private fun publishedStageKeyByLegacyStageId(
        tenantId: String,
        publishedSnapshot: PublishedMetadataRuntimeSnapshot,
    ): Map<String, String> {
        val publishedStageKeys = publishedSnapshot.stages.map { it.stageKey }.toSet()
        return opportunityRepository.listStageBridge(tenantId)
            .filter { it.stageKey in publishedStageKeys }
            .associate { it.id to it.stageKey }
    }

    private fun Map<String, String>.stageKeyFor(stageId: String): String =
        this[stageId] ?: throw ValidationFailureException("Opportunity stage is not available in published metadata")

    private fun validateRequiredFieldsForStage(
        stageKey: String,
        publishedSnapshot: PublishedMetadataRuntimeSnapshot,
        values: OpportunityStandardRequiredFieldValues,
    ) {
        val requiredFieldKeys = publishedSnapshot.requiredFieldsByStage[stageKey].orEmpty()
        if (requiredFieldKeys.isEmpty()) {
            return
        }

        val missingFieldKeys = requiredFieldKeys
            .filter { fieldKey -> values.isMissing(fieldKey) }
            .sorted()
        if (missingFieldKeys.isNotEmpty()) {
            throw ValidationFailureException(
                "Missing required fields for target stage: ${missingFieldKeys.joinToString(", ")}",
            )
        }
    }

    private fun normalizeOpportunityCustomFields(
        publishedSnapshot: PublishedMetadataRuntimeSnapshot,
        customFields: Map<String, JsonNode?>,
    ): List<NormalizedOpportunityCustomFieldValue> {
        if (customFields.isEmpty()) {
            return emptyList()
        }

        val opportunityFieldsByKey = publishedSnapshot.fields
            .filter { it.entityType == "opportunity" }
            .associateBy { it.fieldKey }

        return customFields.mapNotNull { (rawFieldKey, rawValue) ->
            val fieldKey = rawFieldKey.trim()
            val field = opportunityFieldsByKey[fieldKey]
                ?: throw ValidationFailureException("Custom opportunity field '$fieldKey' is not published")
            val normalizedValue = normalizeCustomFieldValue(field, rawValue)

            if (normalizedValue == null) {
                null
            } else {
                NormalizedOpportunityCustomFieldValue(
                    fieldKey = field.fieldKey,
                    fieldType = field.fieldType,
                    value = normalizedValue,
                )
            }
        }
    }

    /**
     * Splits a custom-field patch into values to upsert and field keys to clear.
     * A key present with a null/blank value is an explicit clear (delete the stored
     * value); a key absent from the map is simply left untouched by the caller.
     */
    private fun resolveCustomFieldUpdates(
        publishedSnapshot: PublishedMetadataRuntimeSnapshot,
        customFields: Map<String, JsonNode?>,
    ): CustomFieldUpdatePlan {
        if (customFields.isEmpty()) {
            return CustomFieldUpdatePlan(upserts = emptyList(), clears = emptyList())
        }

        val opportunityFieldsByKey = publishedSnapshot.fields
            .filter { it.entityType == "opportunity" }
            .associateBy { it.fieldKey }

        val upserts = mutableListOf<NormalizedOpportunityCustomFieldValue>()
        val clears = mutableListOf<String>()

        customFields.forEach { (rawFieldKey, rawValue) ->
            val fieldKey = rawFieldKey.trim()
            val field = opportunityFieldsByKey[fieldKey]
                ?: throw ValidationFailureException("Custom opportunity field '$fieldKey' is not published")
            val normalizedValue = normalizeCustomFieldValue(field, rawValue)
            if (normalizedValue == null) {
                clears.add(field.fieldKey)
            } else {
                upserts.add(
                    NormalizedOpportunityCustomFieldValue(
                        fieldKey = field.fieldKey,
                        fieldType = field.fieldType,
                        value = normalizedValue,
                    ),
                )
            }
        }

        return CustomFieldUpdatePlan(upserts = upserts, clears = clears)
    }

    private fun normalizeCustomFieldValue(
        field: PublishedMetadataRuntimeFieldDefinition,
        value: JsonNode?,
    ): Any? {
        if (value == null || value.isNull) {
            return null
        }

        return when (field.fieldType) {
            "text", "long_text" -> value.asTrimmedTextOrNull()
            "single_select" -> {
                val selectedValue = value.asTrimmedTextOrNull() ?: return null
                val allowedValues = field.selectOptions.map { it.value }.toSet()
                if (selectedValue !in allowedValues) {
                    throw ValidationFailureException("Custom field '${field.fieldKey}' value is not an allowed option")
                }

                selectedValue
            }
            "number", "currency" -> value.asBigDecimalOrNull(field.fieldKey)
            "date" -> value.asLocalDateOrNull(field.fieldKey)
            "boolean" -> value.asBooleanOrNull(field.fieldKey)
            else -> throw ValidationFailureException("Custom field '${field.fieldKey}' type is not supported")
        }
    }

    private fun normalizeOpportunityCustomFieldFilters(
        publishedSnapshot: PublishedMetadataRuntimeSnapshot,
        customFieldFilters: Map<String, String>,
    ): List<OpportunityCustomFieldListFilter> {
        if (customFieldFilters.isEmpty()) {
            return emptyList()
        }

        val opportunityFieldsByKey = publishedSnapshot.fields
            .filter { it.entityType == "opportunity" }
            .associateBy { it.fieldKey }

        return customFieldFilters.mapNotNull { (rawFieldKey, rawValue) ->
            val fieldKey = rawFieldKey.trim()
            val value = rawValue.trim()
            if (value.isEmpty()) {
                return@mapNotNull null
            }

            val field = opportunityFieldsByKey[fieldKey]
                ?: throw ValidationFailureException("Custom opportunity field '$fieldKey' is not published")

            when (field.fieldType) {
                "text", "long_text" -> OpportunityCustomFieldListFilter(
                    fieldKey = field.fieldKey,
                    fieldType = field.fieldType,
                    valueText = "%${value.lowercase()}%",
                )
                "single_select" -> {
                    val allowedValues = field.selectOptions.map { it.value }.toSet()
                    if (value !in allowedValues) {
                        throw ValidationFailureException("Custom field '${field.fieldKey}' value is not an allowed option")
                    }

                    OpportunityCustomFieldListFilter(
                        fieldKey = field.fieldKey,
                        fieldType = field.fieldType,
                        valueText = value,
                    )
                }
                "number", "currency" -> OpportunityCustomFieldListFilter(
                    fieldKey = field.fieldKey,
                    fieldType = field.fieldType,
                    valueNumber = try {
                        BigDecimal(value)
                    } catch (exception: NumberFormatException) {
                        throw ValidationFailureException("Custom field '${field.fieldKey}' must be a number")
                    },
                )
                "date" -> OpportunityCustomFieldListFilter(
                    fieldKey = field.fieldKey,
                    fieldType = field.fieldType,
                    valueDate = try {
                        LocalDate.parse(value)
                    } catch (exception: DateTimeParseException) {
                        throw ValidationFailureException("Custom field '${field.fieldKey}' must be an ISO date")
                    },
                )
                "boolean" -> OpportunityCustomFieldListFilter(
                    fieldKey = field.fieldKey,
                    fieldType = field.fieldType,
                    valueBoolean = when (value.lowercase()) {
                        "true" -> true
                        "false" -> false
                        else -> throw ValidationFailureException("Custom field '${field.fieldKey}' must be a boolean")
                    },
                )
                else -> throw ValidationFailureException("Custom field '${field.fieldKey}' type is not supported")
            }
        }
    }

    private fun saveCustomFieldValues(
        context: CurrentUserContext,
        opportunityId: String,
        publishedSnapshot: PublishedMetadataRuntimeSnapshot,
        values: List<NormalizedOpportunityCustomFieldValue>,
    ) {
        if (values.isEmpty()) {
            return
        }

        opportunityRepository.upsertCustomFieldValues(
            values.map { value ->
                UpsertOpportunityCustomFieldValueCommand(
                    id = "mcfv_${UUID.randomUUID().toString().replace("-", "").take(12)}",
                    tenantId = context.tenant.tenantId,
                    opportunityId = opportunityId,
                    fieldKey = value.fieldKey,
                    fieldType = value.fieldType,
                    valueText = value.valueText,
                    valueNumber = value.valueNumber,
                    valueDate = value.valueDate,
                    valueBoolean = value.valueBoolean,
                    publishedVersionNumber = publishedSnapshot.versionNumber,
                    createdByUserId = context.userId,
                    updatedByUserId = context.userId,
                )
            },
        )
    }
}

private data class OpportunityStandardRequiredFieldValues(
    val title: String?,
    val accountId: String?,
    val primaryContactId: String?,
    val ownerUserId: String?,
    val expectedAmount: BigDecimal?,
    val closeDate: LocalDate?,
    val customFields: Map<String, Any?>,
) {
    fun isMissing(fieldKey: String): Boolean =
        when (fieldKey) {
            "title" -> title.isNullOrBlank()
            "account_id" -> accountId.isNullOrBlank()
            "primary_contact_id" -> primaryContactId.isNullOrBlank()
            "owner_user_id" -> ownerUserId.isNullOrBlank()
            "expected_amount" -> expectedAmount == null
            "close_date" -> closeDate == null
            else -> customFields[fieldKey].isMissingCustomValue()
        }
}

private data class CustomFieldUpdatePlan(
    val upserts: List<NormalizedOpportunityCustomFieldValue>,
    val clears: List<String>,
)

private data class NormalizedOpportunityCustomFieldValue(
    val fieldKey: String,
    val fieldType: String,
    val value: Any,
) {
    val valueText: String?
        get() = when (fieldType) {
            "text", "long_text", "single_select" -> value as String
            else -> null
        }

    val valueNumber: BigDecimal?
        get() = when (fieldType) {
            "number", "currency" -> value as BigDecimal
            else -> null
        }

    val valueDate: LocalDate?
        get() = if (fieldType == "date") value as LocalDate else null

    val valueBoolean: Boolean?
        get() = if (fieldType == "boolean") value as Boolean else null
}

private fun List<NormalizedOpportunityCustomFieldValue>.valuesByFieldKey(): Map<String, Any?> =
    associate { it.fieldKey to it.value }

private fun List<OpportunityCustomFieldValueRecord>.toCustomFieldResponseMap(): Map<String, Any?> =
    associate { record ->
        record.fieldKey to when (record.fieldType) {
            "text", "long_text", "single_select" -> record.valueText
            "number", "currency" -> record.valueNumber
            "date" -> record.valueDate?.toString()
            "boolean" -> record.valueBoolean
            else -> null
        }
    }

private fun JsonNode.asTrimmedTextOrNull(): String? {
    val text = if (isTextual) asText() else toString()
    return text.trim().takeIf { it.isNotEmpty() }
}

private fun JsonNode.asBigDecimalOrNull(fieldKey: String): BigDecimal? {
    if (isNull) {
        return null
    }

    if (isNumber) {
        return decimalValue()
    }

    val text = asTrimmedTextOrNull() ?: return null
    return try {
        BigDecimal(text)
    } catch (exception: NumberFormatException) {
        throw ValidationFailureException("Custom field '$fieldKey' must be a number")
    }
}

private fun JsonNode.asLocalDateOrNull(fieldKey: String): LocalDate? {
    val text = asTrimmedTextOrNull() ?: return null
    return try {
        LocalDate.parse(text)
    } catch (exception: DateTimeParseException) {
        throw ValidationFailureException("Custom field '$fieldKey' must be an ISO date")
    }
}

private fun JsonNode.asBooleanOrNull(fieldKey: String): Boolean? {
    if (isNull) {
        return null
    }

    if (isBoolean) {
        return asBoolean()
    }

    val text = asTrimmedTextOrNull()?.lowercase() ?: return null
    return when (text) {
        "true" -> true
        "false" -> false
        else -> throw ValidationFailureException("Custom field '$fieldKey' must be a boolean")
    }
}

private fun Any?.isMissingCustomValue(): Boolean =
    this == null || (this is String && isBlank())
