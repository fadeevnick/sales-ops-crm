package com.salesops.bootstrap.bulkimport

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import java.time.Instant
import java.time.OffsetDateTime

@Repository
class ImportJobRepository(
    private val jdbcClient: JdbcClient,
    private val objectMapper: ObjectMapper,
) {
    fun createPreview(command: CreateImportJobCommand): ImportJobRecord {
        jdbcClient.sql(
            """
            INSERT INTO import_jobs (
                id,
                tenant_id,
                entity_type,
                status,
                original_file_name,
                source_columns,
                mapping_config,
                total_rows,
                valid_rows,
                invalid_rows,
                created_by_user_id
            ) VALUES (
                :id,
                :tenantId,
                :entityType,
                'previewed',
                :originalFileName,
                CAST(:sourceColumnsJson AS jsonb),
                CAST(:mappingConfigJson AS jsonb),
                :totalRows,
                :validRows,
                :invalidRows,
                :createdByUserId
            )
            """.trimIndent(),
        )
            .param("id", command.id)
            .param("tenantId", command.tenantId)
            .param("entityType", command.entityType)
            .param("originalFileName", command.originalFileName)
            .param("sourceColumnsJson", objectMapper.writeValueAsString(command.sourceColumns))
            .param("mappingConfigJson", objectMapper.writeValueAsString(command.mappingConfig))
            .param("totalRows", command.totalRows)
            .param("validRows", command.validRows)
            .param("invalidRows", command.invalidRows)
            .param("createdByUserId", command.createdByUserId)
            .update()

        command.rows.forEach { row ->
            jdbcClient.sql(
                """
                INSERT INTO import_job_rows (
                    id,
                    tenant_id,
                    import_job_id,
                    row_number,
                    source_data,
                    preview_data,
                    validation_errors
                ) VALUES (
                    :id,
                    :tenantId,
                    :importJobId,
                    :rowNumber,
                    CAST(:sourceDataJson AS jsonb),
                    CAST(:previewDataJson AS jsonb),
                    CAST(:validationErrorsJson AS jsonb)
                )
                """.trimIndent(),
            )
                .param("id", row.id)
                .param("tenantId", command.tenantId)
                .param("importJobId", command.id)
                .param("rowNumber", row.rowNumber)
                .param("sourceDataJson", objectMapper.writeValueAsString(row.sourceData))
                .param("previewDataJson", objectMapper.writeValueAsString(row.previewData))
                .param("validationErrorsJson", objectMapper.writeValueAsString(row.validationErrors))
                .update()
        }

        return jdbcClient.sql(
            """
            SELECT
                id,
                entity_type,
                status,
                original_file_name,
                total_rows,
                valid_rows,
                invalid_rows,
                executed_rows,
                skipped_rows,
                created_at,
                started_at,
                executed_at
            FROM import_jobs
            WHERE tenant_id = :tenantId
              AND id = :id
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("id", command.id)
            .query { rs, _ ->
                ImportJobRecord(
                    id = rs.getString("id"),
                    entityType = rs.getString("entity_type"),
                    status = rs.getString("status"),
                    originalFileName = rs.getString("original_file_name"),
                    totalRows = rs.getInt("total_rows"),
                    validRows = rs.getInt("valid_rows"),
                    invalidRows = rs.getInt("invalid_rows"),
                    executedRows = rs.getInt("executed_rows"),
                    skippedRows = rs.getInt("skipped_rows"),
                    createdAt = rs.getObject("created_at", OffsetDateTime::class.java).toInstant(),
                    startedAt = rs.getObject("started_at", OffsetDateTime::class.java)?.toInstant(),
                    executedAt = rs.getObject("executed_at", OffsetDateTime::class.java)?.toInstant(),
                )
            }
            .single()
    }

    fun findJob(tenantId: String, importJobId: String): ImportJobRecord? =
        jdbcClient.sql(
            """
            SELECT
                id,
                entity_type,
                status,
                original_file_name,
                source_columns,
                total_rows,
                valid_rows,
                invalid_rows,
                executed_rows,
                skipped_rows,
                created_by_user_id,
                executed_by_user_id,
                created_at,
                started_at,
                executed_at
            FROM import_jobs
            WHERE tenant_id = :tenantId
              AND id = :importJobId
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("importJobId", importJobId)
            .query { rs, _ ->
                ImportJobRecord(
                    id = rs.getString("id"),
                    entityType = rs.getString("entity_type"),
                    status = rs.getString("status"),
                    originalFileName = rs.getString("original_file_name"),
                    sourceColumns = parseStringList(rs.getString("source_columns")),
                    totalRows = rs.getInt("total_rows"),
                    validRows = rs.getInt("valid_rows"),
                    invalidRows = rs.getInt("invalid_rows"),
                    executedRows = rs.getInt("executed_rows"),
                    skippedRows = rs.getInt("skipped_rows"),
                    createdByUserId = rs.getString("created_by_user_id"),
                    executedByUserId = rs.getString("executed_by_user_id"),
                    createdAt = rs.getObject("created_at", OffsetDateTime::class.java).toInstant(),
                    startedAt = rs.getObject("started_at", OffsetDateTime::class.java)?.toInstant(),
                    executedAt = rs.getObject("executed_at", OffsetDateTime::class.java)?.toInstant(),
                )
            }
            .optional()
            .orElse(null)

    fun listRows(tenantId: String, importJobId: String): List<ImportJobRowRecord> =
        jdbcClient.sql(
            """
            SELECT
                id,
                row_number,
                source_data,
                preview_data,
                validation_errors,
                execution_status,
                created_record_id,
                execution_errors
            FROM import_job_rows
            WHERE tenant_id = :tenantId
              AND import_job_id = :importJobId
            ORDER BY row_number
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("importJobId", importJobId)
            .query { rs, _ ->
                ImportJobRowRecord(
                    id = rs.getString("id"),
                    rowNumber = rs.getInt("row_number"),
                    sourceData = parseStringMap(rs.getString("source_data")),
                    previewData = parseAnyMap(rs.getString("preview_data")),
                    validationErrors = parseStringList(rs.getString("validation_errors")),
                    executionStatus = rs.getString("execution_status"),
                    createdRecordId = rs.getString("created_record_id"),
                    executionErrors = parseStringList(rs.getString("execution_errors")),
                )
            }
            .list()

    fun updateRowExecution(command: UpdateImportJobRowExecutionCommand): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE import_job_rows
            SET execution_status = :executionStatus,
                created_record_id = :createdRecordId,
                execution_errors = CAST(:executionErrorsJson AS jsonb)
            WHERE tenant_id = :tenantId
              AND id = :rowId
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("rowId", command.rowId)
            .param("executionStatus", command.executionStatus)
            .param("createdRecordId", command.createdRecordId)
            .param("executionErrorsJson", objectMapper.writeValueAsString(command.executionErrors))
            .update()

        return updatedRows == 1
    }

    fun markJobQueued(
        tenantId: String,
        importJobId: String,
        executedByUserId: String,
    ): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE import_jobs
            SET status = 'queued',
                executed_by_user_id = :executedByUserId,
                updated_at = NOW()
            WHERE tenant_id = :tenantId
              AND id = :importJobId
              AND status = 'previewed'
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("importJobId", importJobId)
            .param("executedByUserId", executedByUserId)
            .update()

        return updatedRows == 1
    }

    fun markJobRunning(
        tenantId: String,
        importJobId: String,
    ): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE import_jobs
            SET status = 'running',
                started_at = NOW(),
                updated_at = NOW()
            WHERE tenant_id = :tenantId
              AND id = :importJobId
              AND status = 'queued'
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("importJobId", importJobId)
            .update()

        return updatedRows == 1
    }

    fun markJobExecuted(
        tenantId: String,
        importJobId: String,
        executedRows: Int,
        skippedRows: Int,
    ): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE import_jobs
            SET status = 'executed',
                executed_rows = :executedRows,
                skipped_rows = :skippedRows,
                executed_at = NOW(),
                updated_at = NOW()
            WHERE tenant_id = :tenantId
              AND id = :importJobId
              AND status = 'running'
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("importJobId", importJobId)
            .param("executedRows", executedRows)
            .param("skippedRows", skippedRows)
            .update()

        return updatedRows == 1
    }

    fun markJobFailed(
        tenantId: String,
        importJobId: String,
        failureMessage: String,
    ): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE import_jobs
            SET status = 'failed',
                failure_message = :failureMessage,
                executed_at = NOW(),
                updated_at = NOW()
            WHERE tenant_id = :tenantId
              AND id = :importJobId
              AND status IN ('queued', 'running')
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("importJobId", importJobId)
            .param("failureMessage", failureMessage)
            .update()

        return updatedRows == 1
    }

    private fun parseStringList(json: String): List<String> =
        objectMapper.readValue(json, stringListType)

    private fun parseStringMap(json: String): Map<String, String> =
        objectMapper.readValue(json, stringMapType)

    private fun parseAnyMap(json: String): Map<String, Any?> =
        objectMapper.readValue(json, anyMapType)
}

data class CreateImportJobCommand(
    val id: String,
    val tenantId: String,
    val entityType: String,
    val originalFileName: String,
    val sourceColumns: List<String>,
    val mappingConfig: Map<String, String>,
    val totalRows: Int,
    val validRows: Int,
    val invalidRows: Int,
    val createdByUserId: String,
    val rows: List<CreateImportJobRowCommand>,
)

data class CreateImportJobRowCommand(
    val id: String,
    val rowNumber: Int,
    val sourceData: Map<String, String>,
    val previewData: Map<String, Any?>,
    val validationErrors: List<String>,
)

data class ImportJobRecord(
    val id: String,
    val entityType: String,
    val status: String,
    val originalFileName: String,
    val sourceColumns: List<String> = emptyList(),
    val totalRows: Int,
    val validRows: Int,
    val invalidRows: Int,
    val executedRows: Int,
    val skippedRows: Int,
    val createdByUserId: String? = null,
    val executedByUserId: String? = null,
    val createdAt: Instant,
    val startedAt: Instant?,
    val executedAt: Instant?,
)

data class ImportJobRowRecord(
    val id: String,
    val rowNumber: Int,
    val sourceData: Map<String, String>,
    val previewData: Map<String, Any?>,
    val validationErrors: List<String>,
    val executionStatus: String,
    val createdRecordId: String?,
    val executionErrors: List<String>,
)

data class UpdateImportJobRowExecutionCommand(
    val tenantId: String,
    val rowId: String,
    val executionStatus: String,
    val createdRecordId: String?,
    val executionErrors: List<String>,
)

private val stringListType = object : TypeReference<List<String>>() {}
private val stringMapType = object : TypeReference<Map<String, String>>() {}
private val anyMapType = object : TypeReference<Map<String, Any?>>() {}
