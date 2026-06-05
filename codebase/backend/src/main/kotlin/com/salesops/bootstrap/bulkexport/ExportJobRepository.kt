package com.salesops.bootstrap.bulkexport

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import java.time.Instant
import java.time.OffsetDateTime

@Repository
class ExportJobRepository(
    private val jdbcClient: JdbcClient,
    private val objectMapper: ObjectMapper,
) {
    fun createCompleted(command: CreateExportJobCommand): ExportJobRecord =
        jdbcClient.sql(
            """
            INSERT INTO export_jobs (
                id,
                tenant_id,
                entity_type,
                status,
                criteria,
                row_count,
                csv_content,
                completed_at,
                created_by_user_id
            ) VALUES (
                :id,
                :tenantId,
                :entityType,
                'completed',
                CAST(:criteriaJson AS jsonb),
                :rowCount,
                :csvContent,
                NOW(),
                :createdByUserId
            )
            RETURNING
                id,
                entity_type,
                status,
                criteria,
                row_count,
                csv_content,
                created_at,
                completed_at
            """.trimIndent(),
        )
            .param("id", command.id)
            .param("tenantId", command.tenantId)
            .param("entityType", command.entityType)
            .param("criteriaJson", objectMapper.writeValueAsString(command.criteria))
            .param("rowCount", command.rowCount)
            .param("csvContent", command.csvContent)
            .param("createdByUserId", command.createdByUserId)
            .query { rs, _ -> rs.toExportJobRecord() }
            .single()

    fun findJob(tenantId: String, exportJobId: String): ExportJobRecord? =
        jdbcClient.sql(
            """
            SELECT
                id,
                entity_type,
                status,
                criteria,
                row_count,
                csv_content,
                created_at,
                completed_at
            FROM export_jobs
            WHERE tenant_id = :tenantId
              AND id = :exportJobId
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("exportJobId", exportJobId)
            .query { rs, _ -> rs.toExportJobRecord() }
            .optional()
            .orElse(null)

    private fun java.sql.ResultSet.toExportJobRecord(): ExportJobRecord =
        ExportJobRecord(
            id = getString("id"),
            entityType = getString("entity_type"),
            status = getString("status"),
            criteria = objectMapper.readValue(getString("criteria"), criteriaType),
            rowCount = getInt("row_count"),
            csvContent = getString("csv_content"),
            createdAt = getObject("created_at", OffsetDateTime::class.java).toInstant(),
            completedAt = getObject("completed_at", OffsetDateTime::class.java)?.toInstant(),
        )
}

data class CreateExportJobCommand(
    val id: String,
    val tenantId: String,
    val entityType: String,
    val criteria: Map<String, Any?>,
    val rowCount: Int,
    val csvContent: String,
    val createdByUserId: String,
)

data class ExportJobRecord(
    val id: String,
    val entityType: String,
    val status: String,
    val criteria: Map<String, Any?>,
    val rowCount: Int,
    val csvContent: String,
    val createdAt: Instant,
    val completedAt: Instant?,
)

private val criteriaType = object : TypeReference<Map<String, Any?>>() {}
