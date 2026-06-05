package com.salesops.bootstrap.metadata

import org.springframework.stereotype.Component

@Component
class MetadataValidationPolicy {
    fun validate(snapshot: MetadataConfigSnapshotRecord): MetadataValidationResult {
        val errors = mutableListOf<MetadataValidationIssue>()
        val warnings = mutableListOf<MetadataValidationIssue>()

        validateFields(snapshot.fields, errors)
        validateStages(snapshot.stages, errors)
        validateRequiredFields(snapshot, errors)

        if (snapshot.fields.none { it.isActive }) {
            warnings += MetadataValidationIssue(
                code = "no_active_custom_fields",
                message = "Metadata config has no active custom fields",
                path = "fields",
            )
        }

        return MetadataValidationResult(
            valid = errors.isEmpty(),
            errors = errors,
            warnings = warnings,
        )
    }

    private fun validateFields(
        fields: List<MetadataFieldDefinitionRecord>,
        errors: MutableList<MetadataValidationIssue>,
    ) {
        fields.forEachIndexed { index, field ->
            val path = "fields[$index]"

            if (field.entityType !in supportedEntityTypes) {
                errors += issue("unsupported_entity_type", "Field entity type is not supported", "$path.entityType")
            }

            if (!stableKeyPattern.matches(field.fieldKey)) {
                errors += issue("invalid_field_key", "Field key must be a stable snake_case key", "$path.fieldKey")
            }

            if (field.label.isBlank()) {
                errors += issue("blank_field_label", "Field label is required", "$path.label")
            }

            if (field.fieldType !in supportedFieldTypes) {
                errors += issue("unsupported_field_type", "Field type is not supported", "$path.fieldType")
            }

            if (field.sortOrder <= 0) {
                errors += issue("invalid_field_sort_order", "Field sort order must be greater than zero", "$path.sortOrder")
            }

            validateSelectOptions(field, path, errors)
        }

        fields.groupBy { it.entityType to it.fieldKey }
            .filterValues { it.size > 1 }
            .forEach { (scope, _) ->
                errors += issue(
                    code = "duplicate_field_key",
                    message = "Field key '${scope.second}' is duplicated for entity '${scope.first}'",
                    path = "fields",
                )
            }

        fields.groupBy { it.entityType to it.sortOrder }
            .filterValues { it.size > 1 }
            .forEach { (scope, _) ->
                errors += issue(
                    code = "duplicate_field_sort_order",
                    message = "Field sort order '${scope.second}' is duplicated for entity '${scope.first}'",
                    path = "fields",
                )
            }
    }

    private fun validateSelectOptions(
        field: MetadataFieldDefinitionRecord,
        path: String,
        errors: MutableList<MetadataValidationIssue>,
    ) {
        if (field.fieldType == "single_select" && field.selectOptions.isEmpty()) {
            errors += issue(
                code = "missing_select_options",
                message = "Single-select fields must define at least one option",
                path = "$path.selectOptions",
            )
        }

        if (field.fieldType != "single_select" && field.selectOptions.isNotEmpty()) {
            errors += issue(
                code = "unexpected_select_options",
                message = "Select options are only allowed for single-select fields",
                path = "$path.selectOptions",
            )
        }

        field.selectOptions.forEachIndexed { optionIndex, option ->
            val optionPath = "$path.selectOptions[$optionIndex]"
            if (option.value.isBlank()) {
                errors += issue("blank_select_option_value", "Select option value is required", "$optionPath.value")
            }
            if (option.label.isBlank()) {
                errors += issue("blank_select_option_label", "Select option label is required", "$optionPath.label")
            }
        }

        field.selectOptions.groupBy { it.value }
            .filterValues { it.size > 1 }
            .forEach { (value, _) ->
                errors += issue(
                    code = "duplicate_select_option_value",
                    message = "Select option value '$value' is duplicated",
                    path = "$path.selectOptions",
                )
            }
    }

    private fun validateStages(
        stages: List<MetadataStageDefinitionRecord>,
        errors: MutableList<MetadataValidationIssue>,
    ) {
        if (stages.isEmpty()) {
            errors += issue("missing_stages", "At least one opportunity stage is required", "stages")
        }

        stages.forEachIndexed { index, stage ->
            val path = "stages[$index]"

            if (!stableKeyPattern.matches(stage.stageKey)) {
                errors += issue("invalid_stage_key", "Stage key must be a stable snake_case key", "$path.stageKey")
            }

            if (stage.displayName.isBlank()) {
                errors += issue("blank_stage_display_name", "Stage display name is required", "$path.displayName")
            }

            if (stage.sortOrder <= 0) {
                errors += issue("invalid_stage_sort_order", "Stage sort order must be greater than zero", "$path.sortOrder")
            }
        }

        stages.groupBy { it.stageKey }
            .filterValues { it.size > 1 }
            .forEach { (stageKey, _) ->
                errors += issue("duplicate_stage_key", "Stage key '$stageKey' is duplicated", "stages")
            }

        stages.groupBy { it.sortOrder }
            .filterValues { it.size > 1 }
            .forEach { (sortOrder, _) ->
                errors += issue("duplicate_stage_sort_order", "Stage sort order '$sortOrder' is duplicated", "stages")
            }
    }

    private fun validateRequiredFields(
        snapshot: MetadataConfigSnapshotRecord,
        errors: MutableList<MetadataValidationIssue>,
    ) {
        val stageKeys = snapshot.stages.map { it.stageKey }.toSet()
        val opportunityFieldKeys = snapshot.fields
            .filter { it.entityType == "opportunity" && it.isActive }
            .map { it.fieldKey }
            .toSet() + MetadataStandardFieldKeys.opportunity

        snapshot.requiredFields.forEachIndexed { index, requiredField ->
            val path = "requiredFields[$index]"

            if (requiredField.entityType != "opportunity") {
                errors += issue(
                    code = "unsupported_required_field_entity",
                    message = "Stage required-field rules only support opportunity fields",
                    path = "$path.entityType",
                )
            }

            if (requiredField.stageKey !in stageKeys) {
                errors += issue(
                    code = "unknown_required_field_stage",
                    message = "Required-field rule references an unknown stage",
                    path = "$path.stageKey",
                )
            }

            if (requiredField.fieldKey !in opportunityFieldKeys) {
                errors += issue(
                    code = "unknown_required_field_key",
                    message = "Required-field rule references an unknown opportunity field",
                    path = "$path.fieldKey",
                )
            }
        }
    }

    private fun issue(code: String, message: String, path: String): MetadataValidationIssue =
        MetadataValidationIssue(
            code = code,
            message = message,
            path = path,
        )

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

data class MetadataValidationResult(
    val valid: Boolean,
    val errors: List<MetadataValidationIssue>,
    val warnings: List<MetadataValidationIssue>,
)

data class MetadataValidationIssue(
    val code: String,
    val message: String,
    val path: String,
)
