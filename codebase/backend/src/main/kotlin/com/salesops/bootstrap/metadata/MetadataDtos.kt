package com.salesops.bootstrap.metadata

import java.time.Instant

data class PublishedMetadataResponse(
    val configVersion: MetadataConfigVersionItem,
    val fields: List<MetadataFieldDefinitionItem>,
    val stages: List<MetadataStageDefinitionItem>,
    val requiredFields: List<MetadataStageRequiredFieldItem>,
)

data class CreateMetadataDraftRequest(
    val notes: String? = null,
)

data class SaveMetadataFieldDefinitionRequest(
    val entityType: String,
    val fieldKey: String,
    val label: String,
    val fieldType: String,
    val isRequiredDefault: Boolean = false,
    val selectOptions: List<MetadataSelectOptionInput> = emptyList(),
    val sortOrder: Int,
    val isActive: Boolean = true,
)

data class MetadataSelectOptionInput(
    val value: String,
    val label: String,
)

data class SaveMetadataStageDefinitionRequest(
    val stageKey: String,
    val displayName: String,
    val sortOrder: Int,
    val isClosed: Boolean = false,
)

data class CreateMetadataStageRequiredFieldRequest(
    val stageKey: String,
    val entityType: String = "opportunity",
    val fieldKey: String,
)

data class MetadataValidationResponse(
    val configVersionId: String,
    val valid: Boolean,
    val errors: List<MetadataValidationIssueItem>,
    val warnings: List<MetadataValidationIssueItem>,
)

data class MetadataValidationIssueItem(
    val code: String,
    val message: String,
    val path: String,
)

data class MetadataPublishResponse(
    val configVersion: MetadataConfigVersionItem,
    val validation: MetadataValidationResponse,
)

data class MetadataConfigVersionListResponse(
    val configVersions: List<MetadataConfigVersionItem>,
)

data class MetadataConfigVersionItem(
    val id: String,
    val tenantId: String,
    val versionNumber: Int,
    val status: String,
    val notes: String?,
    val createdAt: Instant,
    val publishedAt: Instant?,
    val createdByUserId: String,
    val publishedByUserId: String?,
)

data class MetadataFieldDefinitionItem(
    val id: String,
    val entityType: String,
    val fieldKey: String,
    val label: String,
    val fieldType: String,
    val isRequiredDefault: Boolean,
    val selectOptions: List<MetadataSelectOptionItem>,
    val sortOrder: Int,
    val isActive: Boolean,
)

data class MetadataSelectOptionItem(
    val value: String,
    val label: String,
)

data class MetadataStageDefinitionItem(
    val id: String,
    val stageKey: String,
    val displayName: String,
    val sortOrder: Int,
    val isClosed: Boolean,
)

data class MetadataStageRequiredFieldItem(
    val id: String,
    val stageKey: String,
    val entityType: String,
    val fieldKey: String,
)
