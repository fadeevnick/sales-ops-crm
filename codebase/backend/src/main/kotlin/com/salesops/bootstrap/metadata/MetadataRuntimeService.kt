package com.salesops.bootstrap.metadata

import com.salesops.bootstrap.api.ValidationFailureException
import org.springframework.stereotype.Service

@Service
class MetadataRuntimeService(
    private val metadataRepository: MetadataRepository,
) {
    fun loadPublishedSnapshot(tenantId: String): PublishedMetadataRuntimeSnapshot {
        val snapshot = metadataRepository.findPublishedSnapshot(tenantId)
            ?: throw ValidationFailureException("Published metadata config does not exist")

        return PublishedMetadataRuntimeSnapshot(
            configVersionId = snapshot.configVersion.id,
            versionNumber = snapshot.configVersion.versionNumber,
            fields = snapshot.fields
                .filter { it.isActive }
                .sortedWith(
                    compareBy<MetadataFieldDefinitionRecord> { it.entityType }
                        .thenBy { it.sortOrder }
                        .thenBy { it.fieldKey },
                )
                .map { field ->
                    PublishedMetadataRuntimeFieldDefinition(
                        entityType = field.entityType,
                        fieldKey = field.fieldKey,
                        label = field.label,
                        fieldType = field.fieldType,
                        selectOptions = field.selectOptions.map { option ->
                            PublishedMetadataRuntimeSelectOption(
                                value = option.value,
                                label = option.label,
                            )
                        },
                        sortOrder = field.sortOrder,
                    )
                },
            stages = snapshot.stages
                .sortedWith(compareBy<MetadataStageDefinitionRecord> { it.sortOrder }.thenBy { it.stageKey })
                .map { stage ->
                    PublishedOpportunityStageRuntimeDefinition(
                        stageKey = stage.stageKey,
                        displayName = stage.displayName,
                        sortOrder = stage.sortOrder,
                        isClosed = stage.isClosed,
                    )
                },
            requiredFieldsByStage = snapshot.requiredFields
                .filter { it.entityType == "opportunity" }
                .groupBy { it.stageKey }
                .mapValues { (_, rules) -> rules.map { it.fieldKey }.sorted() },
        )
    }

    fun findPublishedOpportunityStage(
        tenantId: String,
        stageKey: String,
    ): PublishedOpportunityStageRuntimeDefinition? =
        loadPublishedSnapshot(tenantId).stages.firstOrNull { it.stageKey == stageKey }
}

data class PublishedMetadataRuntimeSnapshot(
    val configVersionId: String,
    val versionNumber: Int,
    val fields: List<PublishedMetadataRuntimeFieldDefinition>,
    val stages: List<PublishedOpportunityStageRuntimeDefinition>,
    val requiredFieldsByStage: Map<String, List<String>>,
)

data class PublishedMetadataRuntimeFieldDefinition(
    val entityType: String,
    val fieldKey: String,
    val label: String,
    val fieldType: String,
    val selectOptions: List<PublishedMetadataRuntimeSelectOption>,
    val sortOrder: Int,
)

data class PublishedMetadataRuntimeSelectOption(
    val value: String,
    val label: String,
)

data class PublishedOpportunityStageRuntimeDefinition(
    val stageKey: String,
    val displayName: String,
    val sortOrder: Int,
    val isClosed: Boolean,
)
