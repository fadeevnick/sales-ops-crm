package com.salesops.bootstrap.api

import com.salesops.bootstrap.crm.opportunity.CreateOpportunityRequest
import com.salesops.bootstrap.crm.opportunity.CreateOpportunityResponse
import com.salesops.bootstrap.crm.opportunity.MoveOpportunityStageRequest
import com.salesops.bootstrap.crm.opportunity.MoveOpportunityStageResponse
import com.salesops.bootstrap.crm.opportunity.OpportunityDetailResponse
import com.salesops.bootstrap.crm.opportunity.OpportunityListResponse
import com.salesops.bootstrap.crm.opportunity.OpportunityService
import com.salesops.bootstrap.crm.opportunity.ReassignOpportunityOwnerRequest
import com.salesops.bootstrap.crm.opportunity.ReassignOpportunityOwnerResponse
import com.salesops.bootstrap.crm.opportunity.UpdateOpportunityRequest
import com.salesops.bootstrap.crm.opportunity.UpdateOpportunityResponse
import com.salesops.bootstrap.service.SessionService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/opportunities")
class OpportunityController(
    private val opportunityService: OpportunityService,
    private val sessionService: SessionService,
) {
    @GetMapping
    fun listOpportunities(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @RequestParam("stage", required = false) stage: String?,
        @RequestParam("ownerId", required = false) ownerId: String?,
        @RequestParam("accountId", required = false) accountId: String?,
        @RequestParam("q", required = false) query: String?,
        @RequestParam("page", required = false) page: Int?,
        @RequestParam("pageSize", required = false) pageSize: Int?,
        @RequestParam allParams: Map<String, String>,
    ): OpportunityListResponse =
        opportunityService.listOpportunities(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            stageKey = stage,
            ownerId = ownerId,
            accountId = accountId,
            query = query,
            customFieldFilters = allParams.customFieldFilters(),
            page = page,
            pageSize = pageSize,
        )

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createOpportunity(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @Valid @RequestBody request: CreateOpportunityRequest,
    ): CreateOpportunityResponse =
        opportunityService.createOpportunity(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            request = request,
        )

    @GetMapping("/{opportunityId}")
    fun getOpportunity(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable opportunityId: String,
    ): OpportunityDetailResponse =
        opportunityService.getOpportunity(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            opportunityId = opportunityId,
        )

    @PatchMapping("/{opportunityId}")
    fun updateOpportunity(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable opportunityId: String,
        @RequestBody request: UpdateOpportunityRequest,
    ): UpdateOpportunityResponse =
        opportunityService.updateOpportunity(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            opportunityId = opportunityId,
            request = request,
        )

    @PostMapping("/{opportunityId}/move-stage")
    fun moveStage(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable opportunityId: String,
        @Valid @RequestBody request: MoveOpportunityStageRequest,
    ): MoveOpportunityStageResponse =
        opportunityService.moveStage(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            opportunityId = opportunityId,
            request = request,
        )

    @PostMapping("/{opportunityId}/reassign-owner")
    fun reassignOwner(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable opportunityId: String,
        @Valid @RequestBody request: ReassignOpportunityOwnerRequest,
    ): ReassignOpportunityOwnerResponse =
        opportunityService.reassignOwner(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            opportunityId = opportunityId,
            request = request,
        )
}

private fun Map<String, String>.customFieldFilters(): Map<String, String> =
    filterKeys { it.startsWith("cf.") }
        .mapKeys { (key, _) -> key.removePrefix("cf.") }
        .filterKeys { it.isNotBlank() }
