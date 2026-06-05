package com.salesops.bootstrap.api

import com.salesops.bootstrap.audit.BusinessAuditListResponse
import com.salesops.bootstrap.audit.BusinessAuditService
import com.salesops.bootstrap.service.SessionService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/business-audit-events")
class BusinessAuditController(
    private val businessAuditService: BusinessAuditService,
    private val sessionService: SessionService,
) {
    @GetMapping
    fun listRecentEvents(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @RequestParam("limit", required = false) limit: Int?,
    ): BusinessAuditListResponse =
        businessAuditService.listRecentEvents(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            limit = limit,
        )
}
