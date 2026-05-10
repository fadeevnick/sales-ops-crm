package com.salesops.bootstrap.reporting

import com.fasterxml.jackson.databind.ObjectMapper
import com.salesops.bootstrap.crm.opportunity.OpportunityOwnerScope
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime

@Repository
class ReportingProjectionRepository(
    private val jdbcClient: JdbcClient,
    private val objectMapper: ObjectMapper,
) {
    fun calculateMetrics(tenantId: String): ReportingDashboardMetrics {
        val openPipeline = jdbcClient.sql(
            """
            SELECT
                COUNT(*)::int AS opportunity_count,
                COALESCE(SUM(expected_amount), 0)::numeric AS expected_amount
            FROM opportunities
            WHERE tenant_id = :tenantId
              AND global_status NOT IN ('closed_won', 'closed_lost')
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ ->
                OpenPipelineMetric(
                    count = rs.getInt("opportunity_count"),
                    amount = rs.getBigDecimal("expected_amount"),
                )
            }
            .single()

        return ReportingDashboardMetrics(
            openPipelineCount = openPipeline.count,
            openPipelineAmount = openPipeline.amount,
            stageBreakdown = listStageMetrics(tenantId),
            forecastByMonth = listForecastMetrics(tenantId),
            approvalBacklog = approvalBacklog(tenantId),
        )
    }

    fun calculateSourceCounters(tenantId: String): ReportingSourceCounters {
        val opportunityCount = jdbcClient.sql(
            "SELECT COUNT(*)::int FROM opportunities WHERE tenant_id = :tenantId",
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.getInt(1) }
            .single()
        val approvalRequestCount = jdbcClient.sql(
            "SELECT COUNT(*)::int FROM approval_requests WHERE tenant_id = :tenantId",
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.getInt(1) }
            .single()

        return ReportingSourceCounters(
            opportunityCount = opportunityCount,
            approvalRequestCount = approvalRequestCount,
        )
    }

    fun upsertSnapshot(command: UpsertReportingProjectionCommand): ReportingProjectionSnapshotRecord =
        jdbcClient.sql(
            """
            INSERT INTO reporting_projection_snapshots (
                tenant_id,
                refreshed_at,
                refreshed_by_user_id,
                metrics,
                source_counters
            ) VALUES (
                :tenantId,
                NOW(),
                :refreshedByUserId,
                CAST(:metricsJson AS jsonb),
                CAST(:sourceCountersJson AS jsonb)
            )
            ON CONFLICT (tenant_id) DO UPDATE SET
                refreshed_at = EXCLUDED.refreshed_at,
                refreshed_by_user_id = EXCLUDED.refreshed_by_user_id,
                metrics = EXCLUDED.metrics,
                source_counters = EXCLUDED.source_counters
            RETURNING
                tenant_id,
                refreshed_at,
                refreshed_by_user_id,
                metrics,
                source_counters
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("refreshedByUserId", command.refreshedByUserId)
            .param("metricsJson", objectMapper.writeValueAsString(command.metrics))
            .param("sourceCountersJson", objectMapper.writeValueAsString(command.sourceCounters))
            .query { rs, _ -> rs.toSnapshotRecord() }
            .single()

    fun findSnapshot(tenantId: String): ReportingProjectionSnapshotRecord? =
        jdbcClient.sql(
            """
            SELECT
                tenant_id,
                refreshed_at,
                refreshed_by_user_id,
                metrics,
                source_counters
            FROM reporting_projection_snapshots
            WHERE tenant_id = :tenantId
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.toSnapshotRecord() }
            .optional()
            .orElse(null)

    fun listOpportunityDrillDown(
        tenantId: String,
        ownerScope: OpportunityOwnerScope,
        dimension: ReportingDrillDownDimension,
        value: String,
        limit: Int,
    ): List<ReportingOpportunityDrillDownItem> {
        val clauses = mutableListOf(
            "o.tenant_id = :tenantId",
            "o.global_status NOT IN ('closed_won', 'closed_lost')",
        )

        if (ownerScope is OpportunityOwnerScope.Limited) {
            clauses += "o.owner_user_id IN (:ownerScopeUserIds)"
        }

        when (dimension) {
            ReportingDrillDownDimension.Stage -> clauses += "stage.stage_key = :value"
            ReportingDrillDownDimension.ForecastMonth ->
                clauses += "to_char(date_trunc('month', o.close_date), 'YYYY-MM') = :value"
        }

        val sql = """
            SELECT
                o.id,
                o.title,
                a.id AS account_id,
                a.name AS account_name,
                owner.id AS owner_id,
                owner.display_name AS owner_name,
                stage.stage_key,
                o.expected_amount,
                o.close_date,
                o.approval_state
            FROM opportunities o
            JOIN accounts a
                ON a.id = o.account_id
               AND a.tenant_id = o.tenant_id
            JOIN app_users owner
                ON owner.id = o.owner_user_id
               AND owner.tenant_id = o.tenant_id
            JOIN opportunity_stages stage
                ON stage.id = o.stage_id
               AND stage.tenant_id = o.tenant_id
            WHERE ${clauses.joinToString("\n  AND ")}
            ORDER BY COALESCE(o.close_date, DATE '9999-12-31'), lower(o.title), o.id
            LIMIT :limit
        """.trimIndent()

        var statement = jdbcClient.sql(sql)
            .param("tenantId", tenantId)
            .param("value", value)
            .param("limit", limit)

        if (ownerScope is OpportunityOwnerScope.Limited) {
            statement = statement.param("ownerScopeUserIds", ownerScope.ownerUserIds)
        }

        return statement
            .query { rs, _ ->
                ReportingOpportunityDrillDownItem(
                    id = rs.getString("id"),
                    title = rs.getString("title"),
                    accountId = rs.getString("account_id"),
                    accountName = rs.getString("account_name"),
                    ownerId = rs.getString("owner_id"),
                    ownerName = rs.getString("owner_name"),
                    stageKey = rs.getString("stage_key"),
                    expectedAmount = rs.getBigDecimal("expected_amount"),
                    closeDate = rs.getObject("close_date", LocalDate::class.java),
                    approvalState = rs.getString("approval_state"),
                )
            }
            .list()
    }

    private fun listStageMetrics(tenantId: String): List<ReportingStageMetric> =
        jdbcClient.sql(
            """
            SELECT
                stage.stage_key,
                COUNT(opportunity.id)::int AS opportunity_count,
                COALESCE(SUM(opportunity.expected_amount), 0)::numeric AS expected_amount
            FROM opportunity_stages stage
            LEFT JOIN opportunities opportunity
                ON opportunity.stage_id = stage.id
               AND opportunity.tenant_id = stage.tenant_id
               AND opportunity.global_status NOT IN ('closed_won', 'closed_lost')
            WHERE stage.tenant_id = :tenantId
            GROUP BY stage.stage_key, stage.sort_order
            ORDER BY stage.sort_order, stage.stage_key
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ ->
                ReportingStageMetric(
                    stageKey = rs.getString("stage_key"),
                    opportunityCount = rs.getInt("opportunity_count"),
                    expectedAmount = rs.getBigDecimal("expected_amount"),
                )
            }
            .list()

    private fun listForecastMetrics(tenantId: String): List<ReportingForecastMetric> =
        jdbcClient.sql(
            """
            SELECT
                to_char(date_trunc('month', close_date), 'YYYY-MM') AS close_month,
                COUNT(*)::int AS opportunity_count,
                COALESCE(SUM(expected_amount), 0)::numeric AS expected_amount
            FROM opportunities
            WHERE tenant_id = :tenantId
              AND close_date IS NOT NULL
              AND global_status NOT IN ('closed_won', 'closed_lost')
            GROUP BY date_trunc('month', close_date)
            ORDER BY date_trunc('month', close_date)
            LIMIT 12
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ ->
                ReportingForecastMetric(
                    closeMonth = rs.getString("close_month"),
                    opportunityCount = rs.getInt("opportunity_count"),
                    expectedAmount = rs.getBigDecimal("expected_amount"),
                )
            }
            .list()

    private fun approvalBacklog(tenantId: String): ReportingApprovalBacklogMetric {
        val pendingRequests = jdbcClient.sql(
            """
            SELECT COUNT(*)::int
            FROM approval_requests
            WHERE tenant_id = :tenantId
              AND status = 'pending_step'
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.getInt(1) }
            .single()
        val activeSteps = jdbcClient.sql(
            """
            SELECT COUNT(*)::int
            FROM approval_steps
            WHERE tenant_id = :tenantId
              AND status = 'active'
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.getInt(1) }
            .single()

        return ReportingApprovalBacklogMetric(
            pendingRequests = pendingRequests,
            activeSteps = activeSteps,
        )
    }

    private fun java.sql.ResultSet.toSnapshotRecord(): ReportingProjectionSnapshotRecord =
        ReportingProjectionSnapshotRecord(
            tenantId = getString("tenant_id"),
            refreshedAt = getObject("refreshed_at", OffsetDateTime::class.java).toInstant(),
            refreshedByUserId = getString("refreshed_by_user_id"),
            metrics = objectMapper.readValue(getString("metrics"), ReportingDashboardMetrics::class.java),
            sourceCounters = objectMapper.readValue(getString("source_counters"), ReportingSourceCounters::class.java),
        )
}

data class UpsertReportingProjectionCommand(
    val tenantId: String,
    val refreshedByUserId: String,
    val metrics: ReportingDashboardMetrics,
    val sourceCounters: ReportingSourceCounters,
)

data class ReportingProjectionSnapshotRecord(
    val tenantId: String,
    val refreshedAt: Instant,
    val refreshedByUserId: String,
    val metrics: ReportingDashboardMetrics,
    val sourceCounters: ReportingSourceCounters,
)

private data class OpenPipelineMetric(
    val count: Int,
    val amount: BigDecimal,
)

enum class ReportingDrillDownDimension {
    Stage,
    ForecastMonth,
}
