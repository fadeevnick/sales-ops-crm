package com.salesops.bootstrap.api

import com.salesops.bootstrap.bulkexport.CreateExportJobRequest
import com.salesops.bootstrap.bulkexport.ExportJobResponse
import com.salesops.bootstrap.bulkexport.ExportJobService
import com.salesops.bootstrap.service.SessionService
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
@RequestMapping("/api/export-jobs")
class ExportJobController(
    private val exportJobService: ExportJobService,
    private val sessionService: SessionService,
) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createJob(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @RequestBody request: CreateExportJobRequest,
    ): ExportJobResponse =
        exportJobService.createJob(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            request = request,
        )

    @GetMapping("/{exportJobId}")
    fun getJob(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable exportJobId: String,
    ): ExportJobResponse =
        exportJobService.getJob(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            exportJobId = exportJobId,
        )
}
