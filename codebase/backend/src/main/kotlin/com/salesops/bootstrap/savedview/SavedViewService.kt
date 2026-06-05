package com.salesops.bootstrap.savedview

import com.salesops.bootstrap.api.ForbiddenOperationException
import com.salesops.bootstrap.api.ValidationFailureException
import com.salesops.bootstrap.auth.CurrentUserContext
import com.salesops.bootstrap.metadata.MetadataRuntimeService
import com.salesops.bootstrap.metadata.PublishedMetadataRuntimeSnapshot
import org.springframework.dao.DuplicateKeyException
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class SavedViewService(
    private val savedViewRepository: SavedViewRepository,
    private val metadataRuntimeService: MetadataRuntimeService,
) {
    fun listOpportunityViews(context: CurrentUserContext): SavedOpportunityViewListResponse {
        assertCanUseOpportunityViews(context)
        val snapshot = metadataRuntimeService.loadPublishedSnapshot(context.tenant.tenantId)

        return SavedOpportunityViewListResponse(
            views = savedViewRepository
                .listOpportunityViews(
                    tenantId = context.tenant.tenantId,
                    ownerUserId = context.userId,
                )
                .map { record ->
                    val validation = validateFilters(snapshot, record.filters)
                    SavedOpportunityViewItem(
                        id = record.id,
                        name = record.name,
                        ownerId = record.ownerUserId,
                        ownerName = record.ownerName,
                        visibilityScope = record.visibilityScope,
                        canManage = record.ownerUserId == context.userId,
                        filters = normalizeFilters(record.filters),
                        valid = validation.isEmpty(),
                        invalidReasons = validation,
                        createdAt = record.createdAt,
                        updatedAt = record.updatedAt,
                    )
                },
        )
    }

    fun createOpportunityView(
        context: CurrentUserContext,
        request: CreateSavedOpportunityViewRequest,
    ): CreateSavedOpportunityViewResponse {
        assertCanUseOpportunityViews(context)

        val name = request.name.trim()
        if (name.isEmpty()) {
            throw ValidationFailureException("Saved view name cannot be blank")
        }

        if (name.length > 80) {
            throw ValidationFailureException("Saved view name must be 80 characters or fewer")
        }

        val snapshot = metadataRuntimeService.loadPublishedSnapshot(context.tenant.tenantId)
        val filters = normalizeFilters(request.filters)
        val visibilityScope = normalizeVisibilityScope(context, request.visibilityScope)
        val validationErrors = validateFilters(snapshot, filters)
        if (validationErrors.isNotEmpty()) {
            throw ValidationFailureException(validationErrors.joinToString("; "))
        }

        return try {
            CreateSavedOpportunityViewResponse(
                id = savedViewRepository.createOpportunityView(
                    CreateSavedViewCommand(
                        id = "sv_${UUID.randomUUID().toString().replace("-", "").take(12)}",
                        tenantId = context.tenant.tenantId,
                        ownerUserId = context.userId,
                        name = name,
                        visibilityScope = visibilityScope,
                        filters = filters,
                    ),
                ),
            )
        } catch (exception: DuplicateKeyException) {
            throw ValidationFailureException("Saved view name already exists")
        }
    }

    fun updateOpportunityView(
        context: CurrentUserContext,
        savedViewId: String,
        request: UpdateSavedOpportunityViewRequest,
    ): UpdateSavedOpportunityViewResponse {
        assertCanUseOpportunityViews(context)

        if (request.name == null && request.filters == null && request.visibilityScope == null) {
            throw ValidationFailureException("At least one saved view field must be provided")
        }

        val existing = savedViewRepository.findOpportunityView(
            tenantId = context.tenant.tenantId,
            savedViewId = savedViewId,
        ) ?: throw ValidationFailureException("Saved view does not exist")

        if (existing.ownerUserId != context.userId) {
            throw ForbiddenOperationException("Current user cannot manage this saved view")
        }

        val name = request.name?.trim() ?: existing.name
        if (name.isEmpty()) {
            throw ValidationFailureException("Saved view name cannot be blank")
        }

        if (name.length > 80) {
            throw ValidationFailureException("Saved view name must be 80 characters or fewer")
        }

        val filters = request.filters?.let { normalizeFilters(it) } ?: normalizeFilters(existing.filters)
        val visibilityScope = request.visibilityScope?.let { normalizeVisibilityScope(context, it) }
            ?: existing.visibilityScope
        val snapshot = metadataRuntimeService.loadPublishedSnapshot(context.tenant.tenantId)
        val validationErrors = validateFilters(snapshot, filters)
        if (validationErrors.isNotEmpty()) {
            throw ValidationFailureException(validationErrors.joinToString("; "))
        }

        val updated = try {
            savedViewRepository.updateOpportunityView(
                UpdateSavedViewCommand(
                    id = existing.id,
                    tenantId = context.tenant.tenantId,
                    ownerUserId = context.userId,
                    name = name,
                    visibilityScope = visibilityScope,
                    filters = filters,
                ),
            )
        } catch (exception: DuplicateKeyException) {
            throw ValidationFailureException("Saved view name already exists")
        }

        if (!updated) {
            throw ValidationFailureException("Saved view update was not applied")
        }

        return UpdateSavedOpportunityViewResponse(id = existing.id, updated = true)
    }

    fun deleteOpportunityView(
        context: CurrentUserContext,
        savedViewId: String,
    ): DeleteSavedOpportunityViewResponse {
        assertCanUseOpportunityViews(context)

        val existing = savedViewRepository.findOpportunityView(
            tenantId = context.tenant.tenantId,
            savedViewId = savedViewId,
        ) ?: throw ValidationFailureException("Saved view does not exist")

        if (existing.ownerUserId != context.userId) {
            throw ForbiddenOperationException("Current user cannot manage this saved view")
        }

        val deleted = savedViewRepository.deleteOpportunityView(
            tenantId = context.tenant.tenantId,
            ownerUserId = context.userId,
            savedViewId = existing.id,
        )

        if (!deleted) {
            throw ValidationFailureException("Saved view delete was not applied")
        }

        return DeleteSavedOpportunityViewResponse(id = existing.id, deleted = true)
    }

    private fun assertCanUseOpportunityViews(context: CurrentUserContext) {
        when (context.roleKey) {
            "sales_rep", "sales_manager", "revops_admin" -> return
            "finance_approver", "legal_approver" ->
                throw ForbiddenOperationException("Current role cannot use opportunity saved views")
            else ->
                throw ForbiddenOperationException("Current role cannot use opportunity saved views")
        }
    }

    private fun normalizeFilters(filters: SavedOpportunityViewFilters): SavedOpportunityViewFilters =
        SavedOpportunityViewFilters(
            stageKey = filters.stageKey.normalizeNullableToken(),
            ownerId = filters.ownerId.normalizeNullableToken(),
            accountId = filters.accountId.normalizeNullableToken(),
            query = filters.query?.trim()?.takeIf { it.isNotEmpty() },
            customFields = filters.customFields
                .mapKeys { (fieldKey, _) -> fieldKey.trim() }
                .filterKeys { it.isNotEmpty() },
        )

    private fun normalizeVisibilityScope(context: CurrentUserContext, visibilityScope: String): String {
        val normalized = visibilityScope.trim().lowercase()
        if (normalized !in setOf("private", "shared")) {
            throw ValidationFailureException("Saved view visibility scope is not supported")
        }

        if (normalized == "shared" && context.roleKey !in setOf("sales_manager", "revops_admin")) {
            throw ForbiddenOperationException("Current role cannot create shared saved views")
        }

        return normalized
    }

    private fun validateFilters(
        snapshot: PublishedMetadataRuntimeSnapshot,
        filters: SavedOpportunityViewFilters,
    ): List<String> {
        val errors = mutableListOf<String>()
        val stageKeys = snapshot.stages.map { it.stageKey }.toSet()
        val customFieldKeys = snapshot.fields
            .filter { it.entityType == "opportunity" }
            .map { it.fieldKey }
            .toSet()

        if (filters.stageKey != null && filters.stageKey !in stageKeys) {
            errors += "Saved view stage '${filters.stageKey}' is not published"
        }

        filters.customFields.keys
            .filter { it !in customFieldKeys }
            .sorted()
            .forEach { fieldKey ->
                errors += "Saved view custom field '$fieldKey' is not published"
            }

        return errors
    }
}

private fun String?.normalizeNullableToken(): String? =
    this?.trim()?.takeIf { it.isNotEmpty() }
