package com.salesops.bootstrap.metadata

import com.salesops.bootstrap.api.ForbiddenOperationException
import com.salesops.bootstrap.api.ValidationFailureException
import com.salesops.bootstrap.auth.CurrentUserContext
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class MetadataService(
    private val metadataRepository: MetadataRepository,
    private val metadataValidationPolicy: MetadataValidationPolicy,
) {
    fun getPublishedMetadata(context: CurrentUserContext): PublishedMetadataResponse {
        val snapshot = metadataRepository.findPublishedSnapshot(context.tenant.tenantId)
            ?: throw ValidationFailureException("Published metadata config does not exist")

        return snapshot.toPublishedMetadataResponse()
    }

    fun listConfigVersions(context: CurrentUserContext): MetadataConfigVersionListResponse {
        assertCanManageMetadata(context)

        return MetadataConfigVersionListResponse(
            configVersions = metadataRepository.listConfigVersions(context.tenant.tenantId).map { it.toItem() },
        )
    }

    fun getDraftMetadata(
        context: CurrentUserContext,
        configVersionId: String,
    ): PublishedMetadataResponse {
        assertCanManageMetadata(context)

        return loadDraftSnapshot(context, configVersionId).toPublishedMetadataResponse()
    }

    fun getCurrentDraftMetadata(context: CurrentUserContext): PublishedMetadataResponse {
        assertCanManageMetadata(context)

        val draft = metadataRepository.findDraftConfigVersion(context.tenant.tenantId)
            ?: throw ValidationFailureException("Draft metadata config does not exist")

        return loadDraftSnapshot(context, draft.id).toPublishedMetadataResponse()
    }

    @Transactional
    fun createDraftFromPublished(
        context: CurrentUserContext,
        request: CreateMetadataDraftRequest,
    ): PublishedMetadataResponse {
        assertCanManageMetadata(context)

        val existingDraft = metadataRepository.findDraftConfigVersion(context.tenant.tenantId)
        if (existingDraft != null) {
            throw ValidationFailureException("A draft metadata config already exists")
        }

        val publishedSnapshot = metadataRepository.findPublishedSnapshot(context.tenant.tenantId)
            ?: throw ValidationFailureException("Published metadata config does not exist")
        val draftConfigVersionId = metadataId("mcv")

        metadataRepository.createConfigVersion(
            CreateMetadataConfigVersionCommand(
                id = draftConfigVersionId,
                tenantId = context.tenant.tenantId,
                versionNumber = metadataRepository.nextVersionNumber(context.tenant.tenantId),
                status = "draft",
                notes = request.notes?.trim()?.takeIf { it.isNotEmpty() },
                createdByUserId = context.userId,
                publishedByUserId = null,
            ),
        )

        metadataRepository.createFieldDefinitions(
            publishedSnapshot.fields.map { field ->
                CreateMetadataFieldDefinitionCommand(
                    id = metadataId("mfd"),
                    tenantId = context.tenant.tenantId,
                    configVersionId = draftConfigVersionId,
                    entityType = field.entityType,
                    fieldKey = field.fieldKey,
                    label = field.label,
                    fieldType = field.fieldType,
                    isRequiredDefault = field.isRequiredDefault,
                    selectOptions = field.selectOptions,
                    sortOrder = field.sortOrder,
                    isActive = field.isActive,
                )
            },
        )

        metadataRepository.createStageDefinitions(
            publishedSnapshot.stages.map { stage ->
                CreateMetadataStageDefinitionCommand(
                    id = metadataId("msd"),
                    tenantId = context.tenant.tenantId,
                    configVersionId = draftConfigVersionId,
                    stageKey = stage.stageKey,
                    displayName = stage.displayName,
                    sortOrder = stage.sortOrder,
                    isClosed = stage.isClosed,
                )
            },
        )

        metadataRepository.createStageRequiredFields(
            publishedSnapshot.requiredFields.map { requiredField ->
                CreateMetadataStageRequiredFieldCommand(
                    id = metadataId("msrf"),
                    tenantId = context.tenant.tenantId,
                    configVersionId = draftConfigVersionId,
                    stageKey = requiredField.stageKey,
                    entityType = requiredField.entityType,
                    fieldKey = requiredField.fieldKey,
                )
            },
        )

        val draftSnapshot = metadataRepository.findConfigSnapshot(
            tenantId = context.tenant.tenantId,
            configVersionId = draftConfigVersionId,
        ) ?: throw ValidationFailureException("Draft metadata config could not be reloaded")

        return draftSnapshot.toPublishedMetadataResponse()
    }

    @Transactional
    fun discardDraft(
        context: CurrentUserContext,
        configVersionId: String,
    ): MetadataConfigVersionListResponse {
        assertCanManageMetadata(context)

        val snapshot = loadDraftSnapshot(context, configVersionId)
        val deleted = metadataRepository.deleteDraftConfigVersion(
            tenantId = context.tenant.tenantId,
            configVersionId = snapshot.configVersion.id,
        )
        if (!deleted) {
            throw ValidationFailureException("Metadata draft discard was not applied")
        }

        return listConfigVersions(context)
    }

    @Transactional
    fun createFieldDefinition(
        context: CurrentUserContext,
        configVersionId: String,
        request: SaveMetadataFieldDefinitionRequest,
    ): PublishedMetadataResponse =
        mutateDraft(context, configVersionId) { snapshot ->
            metadataRepository.createFieldDefinitions(
                listOf(request.toCreateCommand(context, snapshot.configVersion.id)),
            )
        }

    @Transactional
    fun updateFieldDefinition(
        context: CurrentUserContext,
        configVersionId: String,
        fieldDefinitionId: String,
        request: SaveMetadataFieldDefinitionRequest,
    ): PublishedMetadataResponse =
        mutateDraft(context, configVersionId) { snapshot ->
            val updated = metadataRepository.updateFieldDefinition(
                request.toUpdateCommand(
                    context = context,
                    configVersionId = snapshot.configVersion.id,
                    fieldDefinitionId = fieldDefinitionId.trim(),
                ),
            )
            if (!updated) {
                throw ValidationFailureException("Metadata field definition does not exist in draft")
            }
        }

    @Transactional
    fun deleteFieldDefinition(
        context: CurrentUserContext,
        configVersionId: String,
        fieldDefinitionId: String,
    ): PublishedMetadataResponse =
        mutateDraft(context, configVersionId) { snapshot ->
            val deleted = metadataRepository.deleteFieldDefinition(
                tenantId = context.tenant.tenantId,
                configVersionId = snapshot.configVersion.id,
                fieldDefinitionId = fieldDefinitionId.trim(),
            )
            if (!deleted) {
                throw ValidationFailureException("Metadata field definition does not exist in draft")
            }
        }

    @Transactional
    fun createStageDefinition(
        context: CurrentUserContext,
        configVersionId: String,
        request: SaveMetadataStageDefinitionRequest,
    ): PublishedMetadataResponse =
        mutateDraft(context, configVersionId) { snapshot ->
            metadataRepository.createStageDefinitions(
                listOf(request.toCreateCommand(context, snapshot.configVersion.id)),
            )
        }

    @Transactional
    fun updateStageDefinition(
        context: CurrentUserContext,
        configVersionId: String,
        stageDefinitionId: String,
        request: SaveMetadataStageDefinitionRequest,
    ): PublishedMetadataResponse =
        mutateDraft(context, configVersionId) { snapshot ->
            val updated = metadataRepository.updateStageDefinition(
                request.toUpdateCommand(
                    context = context,
                    configVersionId = snapshot.configVersion.id,
                    stageDefinitionId = stageDefinitionId.trim(),
                ),
            )
            if (!updated) {
                throw ValidationFailureException("Metadata stage definition does not exist in draft")
            }
        }

    @Transactional
    fun deleteStageDefinition(
        context: CurrentUserContext,
        configVersionId: String,
        stageDefinitionId: String,
    ): PublishedMetadataResponse =
        mutateDraft(context, configVersionId) { snapshot ->
            val deleted = metadataRepository.deleteStageDefinition(
                tenantId = context.tenant.tenantId,
                configVersionId = snapshot.configVersion.id,
                stageDefinitionId = stageDefinitionId.trim(),
            )
            if (!deleted) {
                throw ValidationFailureException("Metadata stage definition does not exist in draft")
            }
        }

    @Transactional
    fun createRequiredField(
        context: CurrentUserContext,
        configVersionId: String,
        request: CreateMetadataStageRequiredFieldRequest,
    ): PublishedMetadataResponse =
        mutateDraft(context, configVersionId) { snapshot ->
            metadataRepository.createStageRequiredFields(
                listOf(request.toCreateCommand(context, snapshot.configVersion.id)),
            )
        }

    @Transactional
    fun deleteRequiredField(
        context: CurrentUserContext,
        configVersionId: String,
        requiredFieldId: String,
    ): PublishedMetadataResponse =
        mutateDraft(context, configVersionId) { snapshot ->
            val deleted = metadataRepository.deleteStageRequiredField(
                tenantId = context.tenant.tenantId,
                configVersionId = snapshot.configVersion.id,
                requiredFieldId = requiredFieldId.trim(),
            )
            if (!deleted) {
                throw ValidationFailureException("Metadata required-field rule does not exist in draft")
            }
        }

    fun validateDraft(
        context: CurrentUserContext,
        configVersionId: String,
    ): MetadataValidationResponse {
        assertCanManageMetadata(context)

        val snapshot = loadDraftSnapshot(context, configVersionId)
        val validation = metadataValidationPolicy.validate(snapshot)

        return validation.toResponse(configVersionId = snapshot.configVersion.id)
    }

    @Transactional
    fun publishDraft(
        context: CurrentUserContext,
        configVersionId: String,
    ): MetadataPublishResponse {
        assertCanManageMetadata(context)

        val snapshot = loadDraftSnapshot(context, configVersionId)
        val validation = metadataValidationPolicy.validate(snapshot)
        if (!validation.valid) {
            throw ValidationFailureException("Metadata config cannot be published until validation passes")
        }

        metadataRepository.archivePublishedConfigVersion(context.tenant.tenantId)
        val published = metadataRepository.publishConfigVersion(
            PublishMetadataConfigVersionCommand(
                tenantId = context.tenant.tenantId,
                configVersionId = snapshot.configVersion.id,
                publishedByUserId = context.userId,
            ),
        )

        if (!published) {
            throw ValidationFailureException("Metadata config publish was not applied")
        }

        val publishedVersion = metadataRepository.findConfigVersion(
            tenantId = context.tenant.tenantId,
            configVersionId = snapshot.configVersion.id,
        ) ?: throw ValidationFailureException("Published metadata config could not be reloaded")

        return MetadataPublishResponse(
            configVersion = publishedVersion.toItem(),
            validation = validation.toResponse(configVersionId = snapshot.configVersion.id),
        )
    }

    @Transactional
    fun rollbackToArchivedConfig(
        context: CurrentUserContext,
        configVersionId: String,
    ): PublishedMetadataResponse {
        assertCanManageMetadata(context)

        val existingDraft = metadataRepository.findDraftConfigVersion(context.tenant.tenantId)
        if (existingDraft != null) {
            throw ValidationFailureException("Discard or publish the current metadata draft before rollback")
        }

        val target = metadataRepository.findConfigVersion(
            tenantId = context.tenant.tenantId,
            configVersionId = configVersionId.trim(),
        ) ?: throw ValidationFailureException("Metadata config version does not exist")

        if (target.status != "archived") {
            throw ValidationFailureException("Only archived metadata config versions can be rolled back")
        }

        metadataRepository.archivePublishedConfigVersion(context.tenant.tenantId)
        val published = metadataRepository.publishArchivedConfigVersion(
            PublishMetadataConfigVersionCommand(
                tenantId = context.tenant.tenantId,
                configVersionId = target.id,
                publishedByUserId = context.userId,
            ),
        )
        if (!published) {
            throw ValidationFailureException("Metadata config rollback was not applied")
        }

        val publishedSnapshot = metadataRepository.findPublishedSnapshot(context.tenant.tenantId)
            ?: throw ValidationFailureException("Published metadata config could not be reloaded")

        return publishedSnapshot.toPublishedMetadataResponse()
    }

    private fun loadDraftSnapshot(
        context: CurrentUserContext,
        configVersionId: String,
    ): MetadataConfigSnapshotRecord {
        val snapshot = metadataRepository.findConfigSnapshot(
            tenantId = context.tenant.tenantId,
            configVersionId = configVersionId.trim(),
        ) ?: throw ValidationFailureException("Metadata config version does not exist")

        if (snapshot.configVersion.status != "draft") {
            throw ValidationFailureException("Only draft metadata config versions can be validated or published")
        }

        return snapshot
    }

    private fun mutateDraft(
        context: CurrentUserContext,
        configVersionId: String,
        mutation: (MetadataConfigSnapshotRecord) -> Unit,
    ): PublishedMetadataResponse {
        assertCanManageMetadata(context)
        val snapshot = loadDraftSnapshot(context, configVersionId)

        try {
            mutation(snapshot)
        } catch (exception: DataIntegrityViolationException) {
            throw ValidationFailureException("Metadata draft update violates a uniqueness or check constraint")
        }

        return loadDraftSnapshot(context, snapshot.configVersion.id).toPublishedMetadataResponse()
    }

    private fun assertCanManageMetadata(context: CurrentUserContext) {
        if (context.roleKey != "revops_admin") {
            throw ForbiddenOperationException("Current role cannot manage metadata configuration")
        }
    }

    private fun metadataId(prefix: String): String =
        "${prefix}_${UUID.randomUUID().toString().replace("-", "").take(12)}"

    private fun SaveMetadataFieldDefinitionRequest.toCreateCommand(
        context: CurrentUserContext,
        configVersionId: String,
    ): CreateMetadataFieldDefinitionCommand {
        val normalized = normalize()

        return CreateMetadataFieldDefinitionCommand(
            id = metadataId("mfd"),
            tenantId = context.tenant.tenantId,
            configVersionId = configVersionId,
            entityType = normalized.entityType,
            fieldKey = normalized.fieldKey,
            label = normalized.label,
            fieldType = normalized.fieldType,
            isRequiredDefault = normalized.isRequiredDefault,
            selectOptions = normalized.selectOptions,
            sortOrder = normalized.sortOrder,
            isActive = normalized.isActive,
        )
    }

    private fun SaveMetadataFieldDefinitionRequest.toUpdateCommand(
        context: CurrentUserContext,
        configVersionId: String,
        fieldDefinitionId: String,
    ): UpdateMetadataFieldDefinitionCommand {
        val normalized = normalize()

        return UpdateMetadataFieldDefinitionCommand(
            tenantId = context.tenant.tenantId,
            configVersionId = configVersionId,
            fieldDefinitionId = fieldDefinitionId,
            entityType = normalized.entityType,
            fieldKey = normalized.fieldKey,
            label = normalized.label,
            fieldType = normalized.fieldType,
            isRequiredDefault = normalized.isRequiredDefault,
            selectOptions = normalized.selectOptions,
            sortOrder = normalized.sortOrder,
            isActive = normalized.isActive,
        )
    }

    private fun SaveMetadataFieldDefinitionRequest.normalize(): NormalizedMetadataFieldDefinition {
        val normalizedEntityType = entityType.trim()
        if (normalizedEntityType !in supportedEntityTypes) {
            throw ValidationFailureException("Metadata field entity type is not supported")
        }

        val normalizedFieldKey = fieldKey.trim()
        validateStableKey(normalizedFieldKey, "Metadata field key")

        val normalizedLabel = label.trim()
        if (normalizedLabel.isEmpty()) {
            throw ValidationFailureException("Metadata field label is required")
        }

        val normalizedFieldType = fieldType.trim()
        if (normalizedFieldType !in supportedFieldTypes) {
            throw ValidationFailureException("Metadata field type is not supported")
        }

        if (sortOrder <= 0) {
            throw ValidationFailureException("Metadata field sort order must be greater than zero")
        }

        val normalizedSelectOptions = selectOptions.map { option ->
            val value = option.value.trim()
            val optionLabel = option.label.trim()
            if (value.isEmpty()) {
                throw ValidationFailureException("Metadata select option value is required")
            }
            if (optionLabel.isEmpty()) {
                throw ValidationFailureException("Metadata select option label is required")
            }

            MetadataSelectOptionRecord(
                value = value,
                label = optionLabel,
            )
        }

        return NormalizedMetadataFieldDefinition(
            entityType = normalizedEntityType,
            fieldKey = normalizedFieldKey,
            label = normalizedLabel,
            fieldType = normalizedFieldType,
            isRequiredDefault = isRequiredDefault,
            selectOptions = normalizedSelectOptions,
            sortOrder = sortOrder,
            isActive = isActive,
        )
    }

    private fun SaveMetadataStageDefinitionRequest.toCreateCommand(
        context: CurrentUserContext,
        configVersionId: String,
    ): CreateMetadataStageDefinitionCommand {
        val normalized = normalize()

        return CreateMetadataStageDefinitionCommand(
            id = metadataId("msd"),
            tenantId = context.tenant.tenantId,
            configVersionId = configVersionId,
            stageKey = normalized.stageKey,
            displayName = normalized.displayName,
            sortOrder = normalized.sortOrder,
            isClosed = normalized.isClosed,
        )
    }

    private fun SaveMetadataStageDefinitionRequest.toUpdateCommand(
        context: CurrentUserContext,
        configVersionId: String,
        stageDefinitionId: String,
    ): UpdateMetadataStageDefinitionCommand {
        val normalized = normalize()

        return UpdateMetadataStageDefinitionCommand(
            tenantId = context.tenant.tenantId,
            configVersionId = configVersionId,
            stageDefinitionId = stageDefinitionId,
            stageKey = normalized.stageKey,
            displayName = normalized.displayName,
            sortOrder = normalized.sortOrder,
            isClosed = normalized.isClosed,
        )
    }

    private fun SaveMetadataStageDefinitionRequest.normalize(): NormalizedMetadataStageDefinition {
        val normalizedStageKey = stageKey.trim()
        validateStableKey(normalizedStageKey, "Metadata stage key")

        val normalizedDisplayName = displayName.trim()
        if (normalizedDisplayName.isEmpty()) {
            throw ValidationFailureException("Metadata stage display name is required")
        }

        if (sortOrder <= 0) {
            throw ValidationFailureException("Metadata stage sort order must be greater than zero")
        }

        return NormalizedMetadataStageDefinition(
            stageKey = normalizedStageKey,
            displayName = normalizedDisplayName,
            sortOrder = sortOrder,
            isClosed = isClosed,
        )
    }

    private fun CreateMetadataStageRequiredFieldRequest.toCreateCommand(
        context: CurrentUserContext,
        configVersionId: String,
    ): CreateMetadataStageRequiredFieldCommand {
        val normalizedStageKey = stageKey.trim()
        validateStableKey(normalizedStageKey, "Metadata required-field stage key")

        val normalizedEntityType = entityType.trim()
        if (normalizedEntityType != "opportunity") {
            throw ValidationFailureException("Metadata required-field rules only support opportunity fields")
        }

        val normalizedFieldKey = fieldKey.trim()
        validateStableKey(normalizedFieldKey, "Metadata required-field key")

        return CreateMetadataStageRequiredFieldCommand(
            id = metadataId("msrf"),
            tenantId = context.tenant.tenantId,
            configVersionId = configVersionId,
            stageKey = normalizedStageKey,
            entityType = normalizedEntityType,
            fieldKey = normalizedFieldKey,
        )
    }

    private fun validateStableKey(value: String, label: String) {
        if (!stableKeyPattern.matches(value)) {
            throw ValidationFailureException("$label must be a stable snake_case key")
        }
    }

    private companion object {
        val stableKeyPattern = Regex("^[a-z][a-z0-9_]*$")
        val supportedEntityTypes = setOf("account", "contact", "opportunity")
        val supportedFieldTypes = setOf(
            "text",
            "long_text",
            "number",
            "currency",
            "date",
            "boolean",
            "single_select",
        )
    }
}

private data class NormalizedMetadataFieldDefinition(
    val entityType: String,
    val fieldKey: String,
    val label: String,
    val fieldType: String,
    val isRequiredDefault: Boolean,
    val selectOptions: List<MetadataSelectOptionRecord>,
    val sortOrder: Int,
    val isActive: Boolean,
)

private data class NormalizedMetadataStageDefinition(
    val stageKey: String,
    val displayName: String,
    val sortOrder: Int,
    val isClosed: Boolean,
)

private fun PublishedMetadataSnapshotRecord.toPublishedMetadataResponse(): PublishedMetadataResponse =
    PublishedMetadataResponse(
        configVersion = configVersion.toItem(),
        fields = fields.map { it.toItem() },
        stages = stages.map { it.toItem() },
        requiredFields = requiredFields.map { it.toItem() },
    )

private fun MetadataConfigSnapshotRecord.toPublishedMetadataResponse(): PublishedMetadataResponse =
    PublishedMetadataResponse(
        configVersion = configVersion.toItem(),
        fields = fields.map { it.toItem() },
        stages = stages.map { it.toItem() },
        requiredFields = requiredFields.map { it.toItem() },
    )

private fun MetadataConfigVersionRecord.toItem(): MetadataConfigVersionItem =
    MetadataConfigVersionItem(
        id = id,
        tenantId = tenantId,
        versionNumber = versionNumber,
        status = status,
        notes = notes,
        createdAt = createdAt,
        publishedAt = publishedAt,
        createdByUserId = createdByUserId,
        publishedByUserId = publishedByUserId,
    )

private fun MetadataFieldDefinitionRecord.toItem(): MetadataFieldDefinitionItem =
    MetadataFieldDefinitionItem(
        id = id,
        entityType = entityType,
        fieldKey = fieldKey,
        label = label,
        fieldType = fieldType,
        isRequiredDefault = isRequiredDefault,
        selectOptions = selectOptions.map { it.toItem() },
        sortOrder = sortOrder,
        isActive = isActive,
    )

private fun MetadataSelectOptionRecord.toItem(): MetadataSelectOptionItem =
    MetadataSelectOptionItem(
        value = value,
        label = label,
    )

private fun MetadataStageDefinitionRecord.toItem(): MetadataStageDefinitionItem =
    MetadataStageDefinitionItem(
        id = id,
        stageKey = stageKey,
        displayName = displayName,
        sortOrder = sortOrder,
        isClosed = isClosed,
    )

private fun MetadataStageRequiredFieldRecord.toItem(): MetadataStageRequiredFieldItem =
    MetadataStageRequiredFieldItem(
        id = id,
        stageKey = stageKey,
        entityType = entityType,
        fieldKey = fieldKey,
    )

private fun MetadataValidationResult.toResponse(configVersionId: String): MetadataValidationResponse =
    MetadataValidationResponse(
        configVersionId = configVersionId,
        valid = valid,
        errors = errors.map { it.toItem() },
        warnings = warnings.map { it.toItem() },
    )

private fun MetadataValidationIssue.toItem(): MetadataValidationIssueItem =
    MetadataValidationIssueItem(
        code = code,
        message = message,
        path = path,
    )
