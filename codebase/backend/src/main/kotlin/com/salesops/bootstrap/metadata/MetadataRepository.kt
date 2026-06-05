package com.salesops.bootstrap.metadata

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant
import java.time.OffsetDateTime

@Repository
class MetadataRepository(
    private val jdbcClient: JdbcClient,
    private val objectMapper: ObjectMapper,
) {
    fun findConfigSnapshot(tenantId: String, configVersionId: String): MetadataConfigSnapshotRecord? {
        val configVersion = findConfigVersion(tenantId, configVersionId) ?: return null

        return MetadataConfigSnapshotRecord(
            configVersion = configVersion,
            fields = listFieldDefinitions(
                tenantId = tenantId,
                configVersionId = configVersion.id,
                entityType = null,
            ),
            stages = listStageDefinitions(
                tenantId = tenantId,
                configVersionId = configVersion.id,
            ),
            requiredFields = listStageRequiredFields(
                tenantId = tenantId,
                configVersionId = configVersion.id,
                stageKey = null,
            ),
        )
    }

    fun findPublishedSnapshot(tenantId: String): PublishedMetadataSnapshotRecord? {
        val configVersion = findPublishedConfigVersion(tenantId) ?: return null

        return PublishedMetadataSnapshotRecord(
            configVersion = configVersion,
            fields = listFieldDefinitions(
                tenantId = tenantId,
                configVersionId = configVersion.id,
                entityType = null,
            ),
            stages = listStageDefinitions(
                tenantId = tenantId,
                configVersionId = configVersion.id,
            ),
            requiredFields = listStageRequiredFields(
                tenantId = tenantId,
                configVersionId = configVersion.id,
                stageKey = null,
            ),
        )
    }

    fun findConfigVersion(tenantId: String, configVersionId: String): MetadataConfigVersionRecord? =
        jdbcClient.sql(
            """
            SELECT
                id,
                tenant_id,
                version_number,
                status,
                notes,
                created_at,
                published_at,
                created_by_user_id,
                published_by_user_id
            FROM metadata_config_versions
            WHERE tenant_id = :tenantId
              AND id = :configVersionId
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("configVersionId", configVersionId)
            .query { rs, _ -> rs.toMetadataConfigVersionRecord() }
            .optional()
            .orElse(null)

    fun findPublishedConfigVersion(tenantId: String): MetadataConfigVersionRecord? =
        jdbcClient.sql(
            """
            SELECT
                id,
                tenant_id,
                version_number,
                status,
                notes,
                created_at,
                published_at,
                created_by_user_id,
                published_by_user_id
            FROM metadata_config_versions
            WHERE tenant_id = :tenantId
              AND status = 'published'
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.toMetadataConfigVersionRecord() }
            .optional()
            .orElse(null)

    fun findDraftConfigVersion(tenantId: String): MetadataConfigVersionRecord? =
        jdbcClient.sql(
            """
            SELECT
                id,
                tenant_id,
                version_number,
                status,
                notes,
                created_at,
                published_at,
                created_by_user_id,
                published_by_user_id
            FROM metadata_config_versions
            WHERE tenant_id = :tenantId
              AND status = 'draft'
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.toMetadataConfigVersionRecord() }
            .optional()
            .orElse(null)

    fun listConfigVersions(tenantId: String): List<MetadataConfigVersionRecord> =
        jdbcClient.sql(
            """
            SELECT
                id,
                tenant_id,
                version_number,
                status,
                notes,
                created_at,
                published_at,
                created_by_user_id,
                published_by_user_id
            FROM metadata_config_versions
            WHERE tenant_id = :tenantId
            ORDER BY version_number DESC, created_at DESC
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.toMetadataConfigVersionRecord() }
            .list()

    fun nextVersionNumber(tenantId: String): Int =
        jdbcClient.sql(
            """
            SELECT COALESCE(MAX(version_number), 0) + 1
            FROM metadata_config_versions
            WHERE tenant_id = :tenantId
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.getInt(1) }
            .single()

    fun createConfigVersion(command: CreateMetadataConfigVersionCommand): String {
        jdbcClient.sql(
            """
            INSERT INTO metadata_config_versions (
                id,
                tenant_id,
                version_number,
                status,
                notes,
                created_by_user_id,
                published_by_user_id
            ) VALUES (
                :id,
                :tenantId,
                :versionNumber,
                :status,
                :notes,
                :createdByUserId,
                :publishedByUserId
            )
            """.trimIndent(),
        )
            .param("id", command.id)
            .param("tenantId", command.tenantId)
            .param("versionNumber", command.versionNumber)
            .param("status", command.status)
            .param("notes", command.notes)
            .param("createdByUserId", command.createdByUserId)
            .param("publishedByUserId", command.publishedByUserId)
            .update()

        return command.id
    }

    fun createFieldDefinitions(commands: List<CreateMetadataFieldDefinitionCommand>) {
        commands.forEach { command ->
            jdbcClient.sql(
                """
                INSERT INTO metadata_field_definitions (
                    id,
                    tenant_id,
                    config_version_id,
                    entity_type,
                    field_key,
                    label,
                    field_type,
                    is_required_default,
                    select_options,
                    sort_order,
                    is_active
                ) VALUES (
                    :id,
                    :tenantId,
                    :configVersionId,
                    :entityType,
                    :fieldKey,
                    :label,
                    :fieldType,
                    :isRequiredDefault,
                    CAST(:selectOptionsJson AS jsonb),
                    :sortOrder,
                    :isActive
                )
                """.trimIndent(),
            )
                .param("id", command.id)
                .param("tenantId", command.tenantId)
                .param("configVersionId", command.configVersionId)
                .param("entityType", command.entityType)
                .param("fieldKey", command.fieldKey)
                .param("label", command.label)
                .param("fieldType", command.fieldType)
                .param("isRequiredDefault", command.isRequiredDefault)
                .param("selectOptionsJson", objectMapper.writeValueAsString(command.selectOptions))
                .param("sortOrder", command.sortOrder)
                .param("isActive", command.isActive)
                .update()
        }
    }

    fun createStageDefinitions(commands: List<CreateMetadataStageDefinitionCommand>) {
        commands.forEach { command ->
            jdbcClient.sql(
                """
                INSERT INTO metadata_stage_definitions (
                    id,
                    tenant_id,
                    config_version_id,
                    stage_key,
                    display_name,
                    sort_order,
                    is_closed
                ) VALUES (
                    :id,
                    :tenantId,
                    :configVersionId,
                    :stageKey,
                    :displayName,
                    :sortOrder,
                    :isClosed
                )
                """.trimIndent(),
            )
                .param("id", command.id)
                .param("tenantId", command.tenantId)
                .param("configVersionId", command.configVersionId)
                .param("stageKey", command.stageKey)
                .param("displayName", command.displayName)
                .param("sortOrder", command.sortOrder)
                .param("isClosed", command.isClosed)
                .update()
        }
    }

    fun createStageRequiredFields(commands: List<CreateMetadataStageRequiredFieldCommand>) {
        commands.forEach { command ->
            jdbcClient.sql(
                """
                INSERT INTO metadata_stage_required_fields (
                    id,
                    tenant_id,
                    config_version_id,
                    stage_key,
                    entity_type,
                    field_key
                ) VALUES (
                    :id,
                    :tenantId,
                    :configVersionId,
                    :stageKey,
                    :entityType,
                    :fieldKey
                )
                """.trimIndent(),
            )
                .param("id", command.id)
                .param("tenantId", command.tenantId)
                .param("configVersionId", command.configVersionId)
                .param("stageKey", command.stageKey)
                .param("entityType", command.entityType)
                .param("fieldKey", command.fieldKey)
                .update()
        }
    }

    fun updateFieldDefinition(command: UpdateMetadataFieldDefinitionCommand): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE metadata_field_definitions
            SET entity_type = :entityType,
                field_key = :fieldKey,
                label = :label,
                field_type = :fieldType,
                is_required_default = :isRequiredDefault,
                select_options = CAST(:selectOptionsJson AS jsonb),
                sort_order = :sortOrder,
                is_active = :isActive,
                updated_at = NOW()
            WHERE tenant_id = :tenantId
              AND config_version_id = :configVersionId
              AND id = :fieldDefinitionId
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("configVersionId", command.configVersionId)
            .param("fieldDefinitionId", command.fieldDefinitionId)
            .param("entityType", command.entityType)
            .param("fieldKey", command.fieldKey)
            .param("label", command.label)
            .param("fieldType", command.fieldType)
            .param("isRequiredDefault", command.isRequiredDefault)
            .param("selectOptionsJson", objectMapper.writeValueAsString(command.selectOptions))
            .param("sortOrder", command.sortOrder)
            .param("isActive", command.isActive)
            .update()

        return updatedRows == 1
    }

    fun deleteFieldDefinition(
        tenantId: String,
        configVersionId: String,
        fieldDefinitionId: String,
    ): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            DELETE FROM metadata_field_definitions
            WHERE tenant_id = :tenantId
              AND config_version_id = :configVersionId
              AND id = :fieldDefinitionId
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("configVersionId", configVersionId)
            .param("fieldDefinitionId", fieldDefinitionId)
            .update()

        return updatedRows == 1
    }

    fun updateStageDefinition(command: UpdateMetadataStageDefinitionCommand): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE metadata_stage_definitions
            SET stage_key = :stageKey,
                display_name = :displayName,
                sort_order = :sortOrder,
                is_closed = :isClosed,
                updated_at = NOW()
            WHERE tenant_id = :tenantId
              AND config_version_id = :configVersionId
              AND id = :stageDefinitionId
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("configVersionId", command.configVersionId)
            .param("stageDefinitionId", command.stageDefinitionId)
            .param("stageKey", command.stageKey)
            .param("displayName", command.displayName)
            .param("sortOrder", command.sortOrder)
            .param("isClosed", command.isClosed)
            .update()

        return updatedRows == 1
    }

    fun deleteStageDefinition(
        tenantId: String,
        configVersionId: String,
        stageDefinitionId: String,
    ): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            DELETE FROM metadata_stage_definitions
            WHERE tenant_id = :tenantId
              AND config_version_id = :configVersionId
              AND id = :stageDefinitionId
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("configVersionId", configVersionId)
            .param("stageDefinitionId", stageDefinitionId)
            .update()

        return updatedRows == 1
    }

    fun deleteStageRequiredField(
        tenantId: String,
        configVersionId: String,
        requiredFieldId: String,
    ): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            DELETE FROM metadata_stage_required_fields
            WHERE tenant_id = :tenantId
              AND config_version_id = :configVersionId
              AND id = :requiredFieldId
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("configVersionId", configVersionId)
            .param("requiredFieldId", requiredFieldId)
            .update()

        return updatedRows == 1
    }

    fun deleteDraftConfigVersion(tenantId: String, configVersionId: String): Boolean {
        deleteMetadataRows(
            tableName = "metadata_stage_required_fields",
            tenantId = tenantId,
            configVersionId = configVersionId,
        )
        deleteMetadataRows(
            tableName = "metadata_stage_definitions",
            tenantId = tenantId,
            configVersionId = configVersionId,
        )
        deleteMetadataRows(
            tableName = "metadata_field_definitions",
            tenantId = tenantId,
            configVersionId = configVersionId,
        )

        val updatedRows = jdbcClient.sql(
            """
            DELETE FROM metadata_config_versions
            WHERE tenant_id = :tenantId
              AND id = :configVersionId
              AND status = 'draft'
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("configVersionId", configVersionId)
            .update()

        return updatedRows == 1
    }

    fun listFieldDefinitions(
        tenantId: String,
        configVersionId: String,
        entityType: String?,
    ): List<MetadataFieldDefinitionRecord> {
        val entityClause = if (entityType == null) "" else "AND entity_type = :entityType"

        var statement = jdbcClient.sql(
            """
            SELECT
                id,
                tenant_id,
                config_version_id,
                entity_type,
                field_key,
                label,
                field_type,
                is_required_default,
                select_options::text AS select_options_json,
                sort_order,
                is_active,
                created_at,
                updated_at
            FROM metadata_field_definitions
            WHERE tenant_id = :tenantId
              AND config_version_id = :configVersionId
              $entityClause
            ORDER BY entity_type, sort_order, field_key
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("configVersionId", configVersionId)

        if (entityType != null) {
            statement = statement.param("entityType", entityType)
        }

        return statement
            .query { rs, _ -> rs.toMetadataFieldDefinitionRecord(::parseSelectOptions) }
            .list()
    }

    fun listStageDefinitions(
        tenantId: String,
        configVersionId: String,
    ): List<MetadataStageDefinitionRecord> =
        jdbcClient.sql(
            """
            SELECT
                id,
                tenant_id,
                config_version_id,
                stage_key,
                display_name,
                sort_order,
                is_closed,
                created_at,
                updated_at
            FROM metadata_stage_definitions
            WHERE tenant_id = :tenantId
              AND config_version_id = :configVersionId
            ORDER BY sort_order, stage_key
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("configVersionId", configVersionId)
            .query { rs, _ -> rs.toMetadataStageDefinitionRecord() }
            .list()

    fun listStageRequiredFields(
        tenantId: String,
        configVersionId: String,
        stageKey: String?,
    ): List<MetadataStageRequiredFieldRecord> {
        val stageClause = if (stageKey == null) "" else "AND stage_key = :stageKey"

        var statement = jdbcClient.sql(
            """
            SELECT
                id,
                tenant_id,
                config_version_id,
                stage_key,
                entity_type,
                field_key,
                created_at
            FROM metadata_stage_required_fields
            WHERE tenant_id = :tenantId
              AND config_version_id = :configVersionId
              $stageClause
            ORDER BY stage_key, field_key
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("configVersionId", configVersionId)

        if (stageKey != null) {
            statement = statement.param("stageKey", stageKey)
        }

        return statement
            .query { rs, _ -> rs.toMetadataStageRequiredFieldRecord() }
            .list()
    }

    fun archivePublishedConfigVersion(tenantId: String): Int =
        jdbcClient.sql(
            """
            UPDATE metadata_config_versions
            SET status = 'archived'
            WHERE tenant_id = :tenantId
              AND status = 'published'
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .update()

    fun publishConfigVersion(command: PublishMetadataConfigVersionCommand): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE metadata_config_versions
            SET status = 'published',
                published_at = NOW(),
                published_by_user_id = :publishedByUserId
            WHERE tenant_id = :tenantId
              AND id = :configVersionId
              AND status = 'draft'
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("configVersionId", command.configVersionId)
            .param("publishedByUserId", command.publishedByUserId)
            .update()

        return updatedRows == 1
    }

    fun publishArchivedConfigVersion(command: PublishMetadataConfigVersionCommand): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE metadata_config_versions
            SET status = 'published',
                published_at = NOW(),
                published_by_user_id = :publishedByUserId
            WHERE tenant_id = :tenantId
              AND id = :configVersionId
              AND status = 'archived'
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("configVersionId", command.configVersionId)
            .param("publishedByUserId", command.publishedByUserId)
            .update()

        return updatedRows == 1
    }

    private fun deleteMetadataRows(tableName: String, tenantId: String, configVersionId: String) {
        jdbcClient.sql(
            """
            DELETE FROM $tableName
            WHERE tenant_id = :tenantId
              AND config_version_id = :configVersionId
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("configVersionId", configVersionId)
            .update()
    }

    private fun parseSelectOptions(json: String): List<MetadataSelectOptionRecord> =
        objectMapper.readValue(json, selectOptionRecordListType)
}

data class PublishMetadataConfigVersionCommand(
    val tenantId: String,
    val configVersionId: String,
    val publishedByUserId: String,
)

data class CreateMetadataConfigVersionCommand(
    val id: String,
    val tenantId: String,
    val versionNumber: Int,
    val status: String,
    val notes: String?,
    val createdByUserId: String,
    val publishedByUserId: String?,
)

data class CreateMetadataFieldDefinitionCommand(
    val id: String,
    val tenantId: String,
    val configVersionId: String,
    val entityType: String,
    val fieldKey: String,
    val label: String,
    val fieldType: String,
    val isRequiredDefault: Boolean,
    val selectOptions: List<MetadataSelectOptionRecord>,
    val sortOrder: Int,
    val isActive: Boolean,
)

data class CreateMetadataStageDefinitionCommand(
    val id: String,
    val tenantId: String,
    val configVersionId: String,
    val stageKey: String,
    val displayName: String,
    val sortOrder: Int,
    val isClosed: Boolean,
)

data class CreateMetadataStageRequiredFieldCommand(
    val id: String,
    val tenantId: String,
    val configVersionId: String,
    val stageKey: String,
    val entityType: String,
    val fieldKey: String,
)

data class UpdateMetadataFieldDefinitionCommand(
    val tenantId: String,
    val configVersionId: String,
    val fieldDefinitionId: String,
    val entityType: String,
    val fieldKey: String,
    val label: String,
    val fieldType: String,
    val isRequiredDefault: Boolean,
    val selectOptions: List<MetadataSelectOptionRecord>,
    val sortOrder: Int,
    val isActive: Boolean,
)

data class UpdateMetadataStageDefinitionCommand(
    val tenantId: String,
    val configVersionId: String,
    val stageDefinitionId: String,
    val stageKey: String,
    val displayName: String,
    val sortOrder: Int,
    val isClosed: Boolean,
)

data class MetadataConfigSnapshotRecord(
    val configVersion: MetadataConfigVersionRecord,
    val fields: List<MetadataFieldDefinitionRecord>,
    val stages: List<MetadataStageDefinitionRecord>,
    val requiredFields: List<MetadataStageRequiredFieldRecord>,
)

data class PublishedMetadataSnapshotRecord(
    val configVersion: MetadataConfigVersionRecord,
    val fields: List<MetadataFieldDefinitionRecord>,
    val stages: List<MetadataStageDefinitionRecord>,
    val requiredFields: List<MetadataStageRequiredFieldRecord>,
)

data class MetadataConfigVersionRecord(
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

data class MetadataFieldDefinitionRecord(
    val id: String,
    val tenantId: String,
    val configVersionId: String,
    val entityType: String,
    val fieldKey: String,
    val label: String,
    val fieldType: String,
    val isRequiredDefault: Boolean,
    val selectOptions: List<MetadataSelectOptionRecord>,
    val sortOrder: Int,
    val isActive: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class MetadataSelectOptionRecord(
    val value: String,
    val label: String,
)

data class MetadataStageDefinitionRecord(
    val id: String,
    val tenantId: String,
    val configVersionId: String,
    val stageKey: String,
    val displayName: String,
    val sortOrder: Int,
    val isClosed: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class MetadataStageRequiredFieldRecord(
    val id: String,
    val tenantId: String,
    val configVersionId: String,
    val stageKey: String,
    val entityType: String,
    val fieldKey: String,
    val createdAt: Instant,
)

private val selectOptionRecordListType = object : TypeReference<List<MetadataSelectOptionRecord>>() {}

private fun ResultSet.toMetadataConfigVersionRecord(): MetadataConfigVersionRecord =
    MetadataConfigVersionRecord(
        id = getString("id"),
        tenantId = getString("tenant_id"),
        versionNumber = getInt("version_number"),
        status = getString("status"),
        notes = getString("notes"),
        createdAt = checkNotNull(getInstant("created_at")),
        publishedAt = getInstant("published_at"),
        createdByUserId = getString("created_by_user_id"),
        publishedByUserId = getString("published_by_user_id"),
    )

private fun ResultSet.toMetadataFieldDefinitionRecord(
    parseSelectOptions: (String) -> List<MetadataSelectOptionRecord>,
): MetadataFieldDefinitionRecord =
    MetadataFieldDefinitionRecord(
        id = getString("id"),
        tenantId = getString("tenant_id"),
        configVersionId = getString("config_version_id"),
        entityType = getString("entity_type"),
        fieldKey = getString("field_key"),
        label = getString("label"),
        fieldType = getString("field_type"),
        isRequiredDefault = getBoolean("is_required_default"),
        selectOptions = parseSelectOptions(getString("select_options_json")),
        sortOrder = getInt("sort_order"),
        isActive = getBoolean("is_active"),
        createdAt = checkNotNull(getInstant("created_at")),
        updatedAt = checkNotNull(getInstant("updated_at")),
    )

private fun ResultSet.toMetadataStageDefinitionRecord(): MetadataStageDefinitionRecord =
    MetadataStageDefinitionRecord(
        id = getString("id"),
        tenantId = getString("tenant_id"),
        configVersionId = getString("config_version_id"),
        stageKey = getString("stage_key"),
        displayName = getString("display_name"),
        sortOrder = getInt("sort_order"),
        isClosed = getBoolean("is_closed"),
        createdAt = checkNotNull(getInstant("created_at")),
        updatedAt = checkNotNull(getInstant("updated_at")),
    )

private fun ResultSet.toMetadataStageRequiredFieldRecord(): MetadataStageRequiredFieldRecord =
    MetadataStageRequiredFieldRecord(
        id = getString("id"),
        tenantId = getString("tenant_id"),
        configVersionId = getString("config_version_id"),
        stageKey = getString("stage_key"),
        entityType = getString("entity_type"),
        fieldKey = getString("field_key"),
        createdAt = checkNotNull(getInstant("created_at")),
    )

private fun ResultSet.getInstant(columnLabel: String): Instant? =
    getObject(columnLabel, OffsetDateTime::class.java)?.toInstant()
