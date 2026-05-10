package com.salesops.bootstrap.api

import com.salesops.bootstrap.reporting.ReportingDashboardResponse
import com.salesops.bootstrap.reporting.ReportingOpportunityDrillDownResponse
import com.salesops.bootstrap.reporting.ReportingProjectionRefreshResponse
import com.salesops.bootstrap.reporting.ReportingService
import com.salesops.bootstrap.service.SessionService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/reporting")
class ReportingController(
    private val reportingService: ReportingService,
    private val sessionService: SessionService,
) {
    @PostMapping("/dashboard/refresh")
    fun refreshDashboardProjection(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
    ): ReportingProjectionRefreshResponse =
        reportingService.refreshDashboardProjection(
            context = sessionService.resolveCurrentUserContext(demoUserId),
        )

    @GetMapping("/dashboard")
    fun getDashboardProjection(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
    ): ReportingDashboardResponse =
        reportingService.getDashboardProjection(
            context = sessionService.resolveCurrentUserContext(demoUserId),
        )

    @GetMapping("/dashboard/drill-down")
    fun listDashboardOpportunityDrillDown(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @RequestParam("dimension", required = false) dimension: String?,
        @RequestParam("value", required = false) value: String?,
        @RequestParam("limit", required = false) limit: Int?,
    ): ReportingOpportunityDrillDownResponse =
        reportingService.listOpportunityDrillDown(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            dimension = dimension,
            value = value,
            limit = limit,
        )
}
