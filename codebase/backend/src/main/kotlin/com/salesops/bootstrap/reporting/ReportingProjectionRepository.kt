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
            closedWonQtd = closedWonQtd(tenantId),
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
        val pendingImports = jdbcClient.sql(
            "SELECT COUNT(*)::int FROM import_jobs WHERE tenant_id = :tenantId AND status = 'previewed'",
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.getInt(1) }
            .single()
        val pendingMerges = jdbcClient.sql(
            "SELECT COUNT(*)::int FROM duplicate_candidates WHERE tenant_id = :tenantId AND status = 'open'",
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.getInt(1) }
            .single()

        return ReportingSourceCounters(
            opportunityCount = opportunityCount,
            approvalRequestCount = approvalRequestCount,
            pendingImports = pendingImports,
            pendingMerges = pendingMerges,
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
                source_counters,
                refresh_duration_ms
            ) VALUES (
                :tenantId,
                NOW(),
                :refreshedByUserId,
                CAST(:metricsJson AS jsonb),
                CAST(:sourceCountersJson AS jsonb),
                :refreshDurationMs
            )
            ON CONFLICT (tenant_id) DO UPDATE SET
                refreshed_at = EXCLUDED.refreshed_at,
                refreshed_by_user_id = EXCLUDED.refreshed_by_user_id,
                metrics = EXCLUDED.metrics,
                source_counters = EXCLUDED.source_counters,
                refresh_duration_ms = EXCLUDED.refresh_duration_ms
            RETURNING
                tenant_id,
                refreshed_at,
                refreshed_by_user_id,
                metrics,
                source_counters,
                refresh_duration_ms
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("refreshedByUserId", command.refreshedByUserId)
            .param("metricsJson", objectMapper.writeValueAsString(command.metrics))
            .param("sourceCountersJson", objectMapper.writeValueAsString(command.sourceCounters))
            .param("refreshDurationMs", command.refreshDurationMs)
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
                source_counters,
                refresh_duration_ms
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

    private fun listStageMetrics(tenantId: String): List<ReportingStageMetric> {
        val stuckByStage = listStuckCountsByStage(tenantId)
        return jdbcClient.sql(
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
                val stageKey = rs.getString("stage_key")
                ReportingStageMetric(
                    stageKey = stageKey,
                    opportunityCount = rs.getInt("opportunity_count"),
                    expectedAmount = rs.getBigDecimal("expected_amount"),
                    stuckCount = stuckByStage[stageKey] ?: 0,
                )
            }
            .list()
    }

    private fun listStuckCountsByStage(tenantId: String): Map<String, Int> =
        jdbcClient.sql(
            """
            SELECT
                stage.stage_key,
                COUNT(o.id)::int AS stuck_count
            FROM opportunities o
            JOIN opportunity_stages stage
                ON stage.id = o.stage_id
               AND stage.tenant_id = o.tenant_id
            LEFT JOIN (
                SELECT opportunity_id, MAX(created_at) AS last_event_at
                FROM opportunity_timeline_events
                WHERE tenant_id = :tenantId
                GROUP BY opportunity_id
            ) latest ON latest.opportunity_id = o.id
            WHERE o.tenant_id = :tenantId
              AND o.global_status NOT IN ('closed_won', 'closed_lost')
              AND COALESCE(latest.last_event_at, o.updated_at) < NOW() - INTERVAL '14 days'
            GROUP BY stage.stage_key
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.getString("stage_key") to rs.getInt("stuck_count") }
            .list()
            .toMap()

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

        val avgTurnaroundHours = jdbcClient.sql(
            """
            SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - submitted_at)) / 3600)::double precision
            FROM approval_requests
            WHERE tenant_id = :tenantId
              AND status IN ('approved', 'rejected')
              AND submitted_at IS NOT NULL
              AND resolved_at IS NOT NULL
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.getDouble(1).takeIf { !rs.wasNull() } }
            .single()

        val queueBreakdown = buildQueueBreakdown(tenantId)
        val exceptionBreakdown = buildExceptionBreakdown(tenantId)

        return ReportingApprovalBacklogMetric(
            pendingRequests = pendingRequests,
            activeSteps = activeSteps,
            avgTurnaroundHours = avgTurnaroundHours,
            queueBreakdown = queueBreakdown,
            exceptionBreakdown = exceptionBreakdown,
        )
    }

    private fun buildExceptionBreakdown(tenantId: String): List<ReportingExceptionTypeMetric> =
        jdbcClient.sql(
            """
            SELECT
                r.policy_key,
                COUNT(r.id)::int AS cnt,
                COALESCE(SUM(o.expected_amount), 0)::numeric AS total_amount
            FROM approval_requests r
            JOIN opportunities o
                ON o.id = r.opportunity_id
               AND o.tenant_id = r.tenant_id
            WHERE r.tenant_id = :tenantId
              AND r.status = 'pending_step'
            GROUP BY r.policy_key
            ORDER BY cnt DESC, r.policy_key
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ ->
                ReportingExceptionTypeMetric(
                    policyKey = rs.getString("policy_key"),
                    count = rs.getInt("cnt"),
                    totalExpectedAmount = rs.getBigDecimal("total_amount"),
                )
            }
            .list()

    private fun buildQueueBreakdown(tenantId: String): List<ReportingApprovalQueueMetric> {
        data class PendingRow(val roleKey: String, val pending: Int, val overdue: Int)

        val pendingByRole = jdbcClient.sql(
            """
            SELECT
                s.approver_role_key,
                COUNT(DISTINCT r.id)::int AS pending,
                COUNT(DISTINCT CASE WHEN s.due_at < NOW() THEN r.id END)::int AS overdue
            FROM approval_requests r
            JOIN approval_steps s
                ON s.approval_request_id = r.id
               AND s.tenant_id = r.tenant_id
               AND s.status = 'active'
            WHERE r.tenant_id = :tenantId
              AND r.status = 'pending_step'
            GROUP BY s.approver_role_key
            ORDER BY s.approver_role_key
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ ->
                PendingRow(
                    roleKey = rs.getString("approver_role_key"),
                    pending = rs.getInt("pending"),
                    overdue = rs.getInt("overdue"),
                )
            }
            .list()

        if (pendingByRole.isEmpty()) return emptyList()

        val avgByRole: Map<String, Double> = jdbcClient.sql(
            """
            SELECT
                approver_role_key,
                AVG(EXTRACT(EPOCH FROM (decided_at - activated_at)) / 3600)::double precision AS avg_hours
            FROM approval_steps
            WHERE tenant_id = :tenantId
              AND status IN ('approved', 'rejected', 'sent_back')
              AND activated_at IS NOT NULL
              AND decided_at IS NOT NULL
            GROUP BY approver_role_key
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ -> rs.getString("approver_role_key") to rs.getDouble("avg_hours") }
            .list()
            .toMap()

        return pendingByRole.map { row ->
            ReportingApprovalQueueMetric(
                roleKey = row.roleKey,
                pending = row.pending,
                overdue = row.overdue,
                avgTurnaroundHours = avgByRole[row.roleKey],
            )
        }
    }

    private fun closedWonQtd(tenantId: String): ReportingClosedWonQtdMetric =
        jdbcClient.sql(
            """
            SELECT
                COUNT(*)::int AS cnt,
                COALESCE(SUM(expected_amount), 0)::numeric AS total_amount
            FROM opportunities
            WHERE tenant_id = :tenantId
              AND global_status = 'closed_won'
              AND EXTRACT(YEAR FROM COALESCE(close_date::timestamptz, updated_at)) = EXTRACT(YEAR FROM NOW())
              AND EXTRACT(QUARTER FROM COALESCE(close_date::timestamptz, updated_at)) = EXTRACT(QUARTER FROM NOW())
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ ->
                ReportingClosedWonQtdMetric(
                    count = rs.getInt("cnt"),
                    totalExpectedAmount = rs.getBigDecimal("total_amount"),
                )
            }
            .single()

    private fun java.sql.ResultSet.toSnapshotRecord(): ReportingProjectionSnapshotRecord =
        ReportingProjectionSnapshotRecord(
            tenantId = getString("tenant_id"),
            refreshedAt = getObject("refreshed_at", OffsetDateTime::class.java).toInstant(),
            refreshedByUserId = getString("refreshed_by_user_id"),
            metrics = objectMapper.readValue(getString("metrics"), ReportingDashboardMetrics::class.java),
            sourceCounters = objectMapper.readValue(getString("source_counters"), ReportingSourceCounters::class.java),
            refreshDurationMs = getLong("refresh_duration_ms").takeIf { !wasNull() },
        )
}

data class UpsertReportingProjectionCommand(
    val tenantId: String,
    val refreshedByUserId: String,
    val metrics: ReportingDashboardMetrics,
    val sourceCounters: ReportingSourceCounters,
    val refreshDurationMs: Long? = null,
)

data class ReportingProjectionSnapshotRecord(
    val tenantId: String,
    val refreshedAt: Instant,
    val refreshedByUserId: String,
    val metrics: ReportingDashboardMetrics,
    val sourceCounters: ReportingSourceCounters,
    val refreshDurationMs: Long? = null,
)

private data class OpenPipelineMetric(
    val count: Int,
    val amount: BigDecimal,
)

enum class ReportingDrillDownDimension {
    Stage,
    ForecastMonth,
}
