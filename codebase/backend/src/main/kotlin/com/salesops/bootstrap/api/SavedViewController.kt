package com.salesops.bootstrap.api

import com.salesops.bootstrap.savedview.CreateSavedOpportunityViewRequest
import com.salesops.bootstrap.savedview.CreateSavedOpportunityViewResponse
import com.salesops.bootstrap.savedview.DeleteSavedOpportunityViewResponse
import com.salesops.bootstrap.savedview.SavedOpportunityViewListResponse
import com.salesops.bootstrap.savedview.SavedViewService
import com.salesops.bootstrap.savedview.UpdateSavedOpportunityViewRequest
import com.salesops.bootstrap.savedview.UpdateSavedOpportunityViewResponse
import com.salesops.bootstrap.service.SessionService
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/opportunity-saved-views")
class SavedViewController(
    private val savedViewService: SavedViewService,
    private val sessionService: SessionService,
) {
    @GetMapping
    fun listOpportunityViews(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
    ): SavedOpportunityViewListResponse =
        savedViewService.listOpportunityViews(
            context = sessionService.resolveCurrentUserContext(demoUserId),
        )

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createOpportunityView(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @Valid @RequestBody request: CreateSavedOpportunityViewRequest,
    ): CreateSavedOpportunityViewResponse =
        savedViewService.createOpportunityView(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            request = request,
        )

    @PatchMapping("/{savedViewId}")
    fun updateOpportunityView(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable savedViewId: String,
        @RequestBody request: UpdateSavedOpportunityViewRequest,
    ): UpdateSavedOpportunityViewResponse =
        savedViewService.updateOpportunityView(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            savedViewId = savedViewId,
            request = request,
        )

    @DeleteMapping("/{savedViewId}")
    fun deleteOpportunityView(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable savedViewId: String,
    ): DeleteSavedOpportunityViewResponse =
        savedViewService.deleteOpportunityView(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            savedViewId = savedViewId,
        )
}
