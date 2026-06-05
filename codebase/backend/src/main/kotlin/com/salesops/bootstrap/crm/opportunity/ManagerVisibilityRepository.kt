package com.salesops.bootstrap.crm.opportunity

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository

@Repository
class ManagerVisibilityRepository(
    private val jdbcClient: JdbcClient,
) {
    fun listActiveReportUserIds(tenantId: String, managerUserId: String): List<String> =
        jdbcClient.sql(
            """
            SELECT report.id
            FROM manager_user_reports relationship
            JOIN app_users manager
                ON manager.id = relationship.manager_user_id
               AND manager.tenant_id = relationship.tenant_id
               AND manager.status = 'active'
            JOIN app_users report
                ON report.id = relationship.report_user_id
               AND report.tenant_id = relationship.tenant_id
               AND report.status = 'active'
            WHERE relationship.tenant_id = :tenantId
              AND relationship.manager_user_id = :managerUserId
            ORDER BY report.display_name, report.id
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("managerUserId", managerUserId)
            .query { rs, _ -> rs.getString("id") }
            .list()
}
