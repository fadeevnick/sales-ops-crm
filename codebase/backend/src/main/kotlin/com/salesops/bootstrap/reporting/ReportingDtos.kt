package com.salesops.bootstrap.reporting

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

data class ReportingDashboardResponse(
    val refreshedAt: Instant,
    val refreshedByUserId: String,
    val metrics: ReportingDashboardMetrics,
    val sourceCounters: ReportingSourceCounters,
    val refreshDurationMs: Long? = null,
)

data class ReportingProjectionRefreshResponse(
    val projection: ReportingDashboardResponse,
)

data class ReportingDashboardMetrics(
    val openPipelineCount: Int,
    val openPipelineAmount: BigDecimal,
    val stageBreakdown: List<ReportingStageMetric>,
    val forecastByMonth: List<ReportingForecastMetric>,
    val approvalBacklog: ReportingApprovalBacklogMetric,
    val closedWonQtd: ReportingClosedWonQtdMetric = ReportingClosedWonQtdMetric(0, BigDecimal.ZERO),
)

data class ReportingStageMetric(
    val stageKey: String,
    val opportunityCount: Int,
    val expectedAmount: BigDecimal,
    val stuckCount: Int = 0,
)

data class ReportingForecastMetric(
    val closeMonth: String,
    val opportunityCount: Int,
    val expectedAmount: BigDecimal,
)

data class ReportingApprovalBacklogMetric(
    val pendingRequests: Int,
    val activeSteps: Int,
    val avgTurnaroundHours: Double? = null,
    val queueBreakdown: List<ReportingApprovalQueueMetric> = emptyList(),
    val exceptionBreakdown: List<ReportingExceptionTypeMetric> = emptyList(),
)

data class ReportingApprovalQueueMetric(
    val roleKey: String,
    val pending: Int,
    val overdue: Int,
    val avgTurnaroundHours: Double? = null,
)

data class ReportingExceptionTypeMetric(
    val policyKey: String,
    val count: Int,
    val totalExpectedAmount: BigDecimal,
)

data class ReportingClosedWonQtdMetric(
    val count: Int,
    val totalExpectedAmount: BigDecimal,
)

data class ReportingSourceCounters(
    val opportunityCount: Int,
    val approvalRequestCount: Int,
    val pendingImports: Int = 0,
    val pendingMerges: Int = 0,
)

data class ReportingOpportunityDrillDownResponse(
    val dimension: String,
    val value: String,
    val items: List<ReportingOpportunityDrillDownItem>,
    val limit: Int,
)

data class ReportingOpportunityDrillDownItem(
    val id: String,
    val title: String,
    val accountId: String,
    val accountName: String,
    val ownerId: String,
    val ownerName: String,
    val stageKey: String,
    val expectedAmount: BigDecimal?,
    val closeDate: LocalDate?,
    val approvalState: String,
)
