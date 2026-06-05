package com.salesops.bootstrap.api

import com.salesops.bootstrap.bulkimport.CreateImportPreviewRequest
import com.salesops.bootstrap.bulkimport.ImportJobDetailResponse
import com.salesops.bootstrap.bulkimport.ImportJobService
import com.salesops.bootstrap.bulkimport.ImportPreviewResponse
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
@RequestMapping("/api/import-jobs")
class ImportJobController(
    private val importJobService: ImportJobService,
    private val sessionService: SessionService,
) {
    @PostMapping("/preview")
    @ResponseStatus(HttpStatus.CREATED)
    fun createPreview(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @RequestBody request: CreateImportPreviewRequest,
    ): ImportPreviewResponse =
        importJobService.createPreview(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            request = request,
        )

    @GetMapping("/{importJobId}")
    fun getJob(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable importJobId: String,
    ): ImportJobDetailResponse =
        importJobService.getJob(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            importJobId = importJobId,
        )

    @PostMapping("/{importJobId}/execute")
    fun executeJob(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable importJobId: String,
    ): ImportJobDetailResponse =
        importJobService.executeJob(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            importJobId = importJobId,
        )
}
