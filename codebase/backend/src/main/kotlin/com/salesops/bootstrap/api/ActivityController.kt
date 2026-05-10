package com.salesops.bootstrap.api

import com.salesops.bootstrap.crm.activity.ActivityListResponse
import com.salesops.bootstrap.crm.activity.ActivityService
import com.salesops.bootstrap.crm.activity.CreateActivityRequest
import com.salesops.bootstrap.crm.activity.CreateActivityResponse
import com.salesops.bootstrap.service.SessionService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/opportunities/{opportunityId}/activities")
class ActivityController(
    private val activityService: ActivityService,
    private val sessionService: SessionService,
) {
    @GetMapping
    fun listActivities(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable opportunityId: String,
    ): ActivityListResponse =
        activityService.listActivities(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            opportunityId = opportunityId,
        )

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createActivity(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable opportunityId: String,
        @Valid @RequestBody request: CreateActivityRequest,
    ): CreateActivityResponse =
        activityService.createActivity(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            opportunityId = opportunityId,
            request = request,
        )
}
