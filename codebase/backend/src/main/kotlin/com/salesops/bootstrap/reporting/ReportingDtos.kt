package com.salesops.bootstrap.reporting

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

data class ReportingDashboardResponse(
    val refreshedAt: Instant,
    val refreshedByUserId: String,
    val metrics: ReportingDashboardMetrics,
    val sourceCounters: ReportingSourceCounters,
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
)

data class ReportingStageMetric(
    val stageKey: String,
    val opportunityCount: Int,
    val expectedAmount: BigDecimal,
)

data class ReportingForecastMetric(
    val closeMonth: String,
    val opportunityCount: Int,
    val expectedAmount: BigDecimal,
)

data class ReportingApprovalBacklogMetric(
    val pendingRequests: Int,
    val activeSteps: Int,
)

data class ReportingSourceCounters(
    val opportunityCount: Int,
    val approvalRequestCount: Int,
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
