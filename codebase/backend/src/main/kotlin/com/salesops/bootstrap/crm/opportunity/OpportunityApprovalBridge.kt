package com.salesops.bootstrap.crm.opportunity

import com.fasterxml.jackson.databind.ObjectMapper
import com.salesops.bootstrap.api.ValidationFailureException
import com.salesops.bootstrap.auth.CurrentUserContext
import com.salesops.bootstrap.metadata.MetadataRuntimeService
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.LocalDate

@Component
class OpportunityApprovalBridge(
    private val opportunityRepository: OpportunityRepository,
    private val teamScopePolicy: TeamScopePolicy,
    private val metadataRuntimeService: MetadataRuntimeService,
    private val objectMapper: ObjectMapper,
) {
    fun loadSubmissionSnapshot(
        context: CurrentUserContext,
        opportunityId: String,
        targetStageKey: String,
    ): OpportunityApprovalSnapshot {
        val record = opportunityRepository.findVisibleById(
            OpportunityVisibilityLookup(
                tenantId = context.tenant.tenantId,
                ownerScope = teamScopePolicy.opportunityOwnerScope(context),
                opportunityId = opportunityId,
            ),
        ) ?: throw ValidationFailureException("Opportunity does not exist in visible scope")

        return record.toApprovalSnapshot(
            currentStageKey = publishedStageKeyForLegacyStageId(
                tenantId = context.tenant.tenantId,
                stageId = record.stageId,
            ),
            targetStageKey = targetStageKey,
        )
    }

    fun loadVisibilityContext(
        tenantId: String,
        opportunityId: String,
    ): OpportunityApprovalVisibilityContext =
        opportunityRepository.findApprovalContext(tenantId = tenantId, opportunityId = opportunityId)
            ?.let { record ->
                OpportunityApprovalVisibilityContext(
                    opportunityId = record.id,
                    ownerUserId = record.ownerId,
                )
            }
            ?: throw ValidationFailureException("Opportunity does not exist")

    fun visibleOwnerUserIds(context: CurrentUserContext): List<String> =
        when (val scope = teamScopePolicy.opportunityOwnerScope(context)) {
            OpportunityOwnerScope.AllTenant -> emptyList()
            is OpportunityOwnerScope.Limited -> scope.ownerUserIds
        }

    fun serializeSnapshot(snapshot: OpportunityApprovalSnapshot): String =
        objectMapper.writeValueAsString(snapshot)

    fun markPending(context: CurrentUserContext, opportunityId: String) {
        updateApprovalState(
            context = context,
            opportunityId = opportunityId,
            globalStatus = "pending_approval",
            approvalState = "pending",
        )
    }

    fun markApproved(context: CurrentUserContext, opportunityId: String) {
        updateApprovalState(
            context = context,
            opportunityId = opportunityId,
            globalStatus = "approved_to_progress",
            approvalState = "approved",
        )
    }

    fun markRejected(context: CurrentUserContext, opportunityId: String) {
        updateApprovalState(
            context = context,
            opportunityId = opportunityId,
            globalStatus = "blocked_by_rejection",
            approvalState = "rejected",
        )
    }

    fun markSentBack(context: CurrentUserContext, opportunityId: String) {
        updateApprovalState(
            context = context,
            opportunityId = opportunityId,
            globalStatus = "active",
            approvalState = "none",
        )
    }

    private fun updateApprovalState(
        context: CurrentUserContext,
        opportunityId: String,
        globalStatus: String,
        approvalState: String,
    ) {
        val updated = opportunityRepository.updateApprovalState(
            UpdateOpportunityApprovalStateCommand(
                tenantId = context.tenant.tenantId,
                opportunityId = opportunityId,
                globalStatus = globalStatus,
                approvalState = approvalState,
                updatedByUserId = context.userId,
            ),
        )

        if (!updated) {
            throw ValidationFailureException("Opportunity approval state update was not applied")
        }
    }

    private fun publishedStageKeyForLegacyStageId(
        tenantId: String,
        stageId: String,
    ): String {
        val publishedStageKeys = metadataRuntimeService.loadPublishedSnapshot(tenantId).stages.map { it.stageKey }.toSet()
        return opportunityRepository.listStageBridge(tenantId)
            .firstOrNull { it.id == stageId && it.stageKey in publishedStageKeys }
            ?.stageKey
            ?: throw ValidationFailureException("Opportunity stage is not available in published metadata")
    }
}

data class OpportunityApprovalSnapshot(
    val opportunityId: String,
    val title: String,
    val accountId: String,
    val accountName: String,
    val primaryContactId: String?,
    val primaryContactName: String?,
    val ownerId: String,
    val ownerName: String,
    val currentStageKey: String,
    val targetStageKey: String,
    val expectedAmount: BigDecimal?,
    val closeDate: LocalDate?,
    val globalStatus: String,
    val approvalState: String,
)

data class OpportunityApprovalVisibilityContext(
    val opportunityId: String,
    val ownerUserId: String,
)

private fun OpportunityDetailRecord.toApprovalSnapshot(
    currentStageKey: String,
    targetStageKey: String,
): OpportunityApprovalSnapshot =
    OpportunityApprovalSnapshot(
        opportunityId = id,
        title = title,
        accountId = accountId,
        accountName = accountName,
        primaryContactId = primaryContactId,
        primaryContactName = primaryContactName,
        ownerId = ownerId,
        ownerName = ownerName,
        currentStageKey = currentStageKey,
        targetStageKey = targetStageKey,
        expectedAmount = expectedAmount,
        closeDate = closeDate,
        globalStatus = globalStatus,
        approvalState = approvalState,
    )
