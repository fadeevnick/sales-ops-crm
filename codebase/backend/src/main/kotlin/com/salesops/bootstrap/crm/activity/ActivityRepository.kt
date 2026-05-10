package com.salesops.bootstrap.crm.activity

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import java.time.LocalDate

@Repository
class ActivityRepository(
    private val jdbcClient: JdbcClient,
) {
    fun create(command: CreateActivityCommand): String {
        jdbcClient.sql(
            """
            INSERT INTO activities (
                id,
                tenant_id,
                opportunity_id,
                type,
                title,
                status,
                due_date,
                owner_user_id,
                created_by_user_id,
                updated_by_user_id
            ) VALUES (
                :id,
                :tenantId,
                :opportunityId,
                :type,
                :title,
                :status,
                :dueDate,
                :ownerUserId,
                :createdByUserId,
                :updatedByUserId
            )
            """.trimIndent(),
        )
            .param("id", command.id)
            .param("tenantId", command.tenantId)
            .param("opportunityId", command.opportunityId)
            .param("type", command.type)
            .param("title", command.title)
            .param("status", command.status)
            .param("dueDate", command.dueDate)
            .param("ownerUserId", command.ownerUserId)
            .param("createdByUserId", command.createdByUserId)
            .param("updatedByUserId", command.updatedByUserId)
            .update()

        return command.id
    }

    fun listByOpportunity(tenantId: String, opportunityId: String): List<ActivityRecord> =
        jdbcClient.sql(
            """
            SELECT
                id,
                type,
                title,
                due_date,
                status
            FROM activities
            WHERE tenant_id = :tenantId
              AND opportunity_id = :opportunityId
            ORDER BY COALESCE(due_date, DATE '9999-12-31'), created_at, id
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("opportunityId", opportunityId)
            .query { rs, _ -> rs.toActivityRecord() }
            .list()
}

data class CreateActivityCommand(
    val id: String,
    val tenantId: String,
    val opportunityId: String,
    val type: String,
    val title: String,
    val status: String,
    val dueDate: LocalDate?,
    val ownerUserId: String,
    val createdByUserId: String,
    val updatedByUserId: String,
)

data class ActivityRecord(
    val id: String,
    val type: String,
    val title: String,
    val dueDate: LocalDate?,
    val status: String,
)

private fun java.sql.ResultSet.toActivityRecord(): ActivityRecord =
    ActivityRecord(
        id = getString("id"),
        type = getString("type"),
        title = getString("title"),
        dueDate = getObject("due_date", LocalDate::class.java),
        status = getString("status"),
    )
