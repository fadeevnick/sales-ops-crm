package com.salesops.bootstrap.reporting

import com.salesops.bootstrap.api.ForbiddenOperationException
import com.salesops.bootstrap.api.ValidationFailureException
import com.salesops.bootstrap.auth.CurrentUserContext
import com.salesops.bootstrap.crm.opportunity.TeamScopePolicy
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ReportingService(
    private val reportingProjectionRepository: ReportingProjectionRepository,
    private val teamScopePolicy: TeamScopePolicy,
) {
    @Transactional
    fun refreshDashboardProjection(context: CurrentUserContext): ReportingProjectionRefreshResponse {
        assertCanRefreshReporting(context)

        val startMs = System.currentTimeMillis()
        val metrics = reportingProjectionRepository.calculateMetrics(context.tenant.tenantId)
        val sourceCounters = reportingProjectionRepository.calculateSourceCounters(context.tenant.tenantId)
        val durationMs = System.currentTimeMillis() - startMs

        val snapshot = reportingProjectionRepository.upsertSnapshot(
            UpsertReportingProjectionCommand(
                tenantId = context.tenant.tenantId,
                refreshedByUserId = context.userId,
                metrics = metrics,
                sourceCounters = sourceCounters,
                refreshDurationMs = durationMs,
            ),
        )

        return ReportingProjectionRefreshResponse(projection = snapshot.toResponse())
    }

    fun getDashboardProjection(context: CurrentUserContext): ReportingDashboardResponse {
        assertCanReadReporting(context)

        val snapshot = reportingProjectionRepository.findSnapshot(context.tenant.tenantId)
            ?: throw ValidationFailureException("Reporting projection has not been refreshed")

        return snapshot.toResponse()
    }

    fun listOpportunityDrillDown(
        context: CurrentUserContext,
        dimension: String?,
        value: String?,
        limit: Int?,
    ): ReportingOpportunityDrillDownResponse {
        assertCanReadReporting(context)

        val normalizedDimension = dimension?.trim().orEmpty()
        val normalizedValue = value?.trim().orEmpty()
        if (normalizedValue.isBlank()) {
            throw ValidationFailureException("Reporting drill-down value is required")
        }

        val parsedDimension = when (normalizedDimension) {
            "stage" -> ReportingDrillDownDimension.Stage
            "forecastMonth" -> ReportingDrillDownDimension.ForecastMonth
            else -> throw ValidationFailureException("Unsupported reporting drill-down dimension")
        }
        val normalizedLimit = (limit ?: 25).coerceIn(1, 100)

        val items = reportingProjectionRepository.listOpportunityDrillDown(
            tenantId = context.tenant.tenantId,
            ownerScope = teamScopePolicy.opportunityOwnerScope(context),
            dimension = parsedDimension,
            value = normalizedValue,
            limit = normalizedLimit,
        )

        return ReportingOpportunityDrillDownResponse(
            dimension = normalizedDimension,
            value = normalizedValue,
            items = items,
            limit = normalizedLimit,
        )
    }

    private fun assertCanReadReporting(context: CurrentUserContext) {
        if (context.roleKey !in setOf("sales_manager", "revops_admin")) {
            throw ForbiddenOperationException("Current role cannot read reporting dashboards")
        }
    }

    private fun assertCanRefreshReporting(context: CurrentUserContext) {
        if (context.roleKey != "revops_admin") {
            throw ForbiddenOperationException("Current role cannot refresh reporting projections")
        }
    }

    private fun ReportingProjectionSnapshotRecord.toResponse(): ReportingDashboardResponse =
        ReportingDashboardResponse(
            refreshedAt = refreshedAt,
            refreshedByUserId = refreshedByUserId,
            metrics = metrics,
            sourceCounters = sourceCounters,
            refreshDurationMs = refreshDurationMs,
        )
}
