package com.salesops.bootstrap.audit

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import java.time.Instant
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class BusinessAuditRepository(
    private val jdbcClient: JdbcClient,
    private val objectMapper: ObjectMapper,
) {
    fun append(command: AppendBusinessAuditEventCommand): String {
        val id = "bae_${UUID.randomUUID().toString().replace("-", "").take(12)}"
        jdbcClient.sql(
            """
            INSERT INTO business_audit_events (
                id,
                tenant_id,
                event_type,
                entity_type,
                entity_id,
                summary,
                details,
                actor_user_id
            ) VALUES (
                :id,
                :tenantId,
                :eventType,
                :entityType,
                :entityId,
                :summary,
                CAST(:detailsJson AS jsonb),
                :actorUserId
            )
            """.trimIndent(),
        )
            .param("id", id)
            .param("tenantId", command.tenantId)
            .param("eventType", command.eventType)
            .param("entityType", command.entityType)
            .param("entityId", command.entityId)
            .param("summary", command.summary)
            .param("detailsJson", objectMapper.writeValueAsString(command.details))
            .param("actorUserId", command.actorUserId)
            .update()

        return id
    }

    fun listRecent(query: BusinessAuditListQuery): List<BusinessAuditEventRecord> =
        jdbcClient.sql(
            """
            SELECT
                event.id,
                event.event_type,
                event.entity_type,
                event.entity_id,
                event.summary,
                event.details,
                event.actor_user_id,
                actor.display_name AS actor_name,
                event.created_at
            FROM business_audit_events event
            JOIN app_users actor
                ON actor.id = event.actor_user_id
               AND actor.tenant_id = event.tenant_id
            WHERE event.tenant_id = :tenantId
            ORDER BY event.created_at DESC, event.id
            LIMIT :limit
            """.trimIndent(),
        )
            .param("tenantId", query.tenantId)
            .param("limit", query.limit)
            .query { rs, _ ->
                BusinessAuditEventRecord(
                    id = rs.getString("id"),
                    eventType = rs.getString("event_type"),
                    entityType = rs.getString("entity_type"),
                    entityId = rs.getString("entity_id"),
                    summary = rs.getString("summary"),
                    details = objectMapper.readValue(rs.getString("details"), detailsType),
                    actorUserId = rs.getString("actor_user_id"),
                    actorName = rs.getString("actor_name"),
                    createdAt = rs.getObject("created_at", OffsetDateTime::class.java).toInstant(),
                )
            }
            .list()
}

data class AppendBusinessAuditEventCommand(
    val tenantId: String,
    val eventType: String,
    val entityType: String,
    val entityId: String,
    val summary: String,
    val details: Map<String, Any?>,
    val actorUserId: String,
)

data class BusinessAuditListQuery(
    val tenantId: String,
    val limit: Int,
)

data class BusinessAuditEventRecord(
    val id: String,
    val eventType: String,
    val entityType: String,
    val entityId: String,
    val summary: String,
    val details: Map<String, Any?>,
    val actorUserId: String,
    val actorName: String,
    val createdAt: Instant,
)

private val detailsType = object : TypeReference<Map<String, Any?>>() {}
