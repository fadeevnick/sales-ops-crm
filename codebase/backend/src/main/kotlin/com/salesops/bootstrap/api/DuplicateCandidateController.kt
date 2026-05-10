package com.salesops.bootstrap.api

import com.salesops.bootstrap.dedup.DuplicateCandidateGenerationResponse
import com.salesops.bootstrap.dedup.DuplicateCandidateItem
import com.salesops.bootstrap.dedup.DuplicateCandidateListResponse
import com.salesops.bootstrap.dedup.DuplicateCandidateMergeResponse
import com.salesops.bootstrap.dedup.DuplicateCandidateService
import com.salesops.bootstrap.dedup.ContactDuplicateCandidateMergeResponse
import com.salesops.bootstrap.dedup.GenerateDuplicateCandidatesRequest
import com.salesops.bootstrap.dedup.MergeAccountDuplicateCandidateRequest
import com.salesops.bootstrap.dedup.MergeContactDuplicateCandidateRequest
import com.salesops.bootstrap.dedup.RejectDuplicateCandidateRequest
import com.salesops.bootstrap.service.SessionService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/duplicate-candidates")
class DuplicateCandidateController(
    private val duplicateCandidateService: DuplicateCandidateService,
    private val sessionService: SessionService,
) {
    @PostMapping("/generate")
    @ResponseStatus(HttpStatus.CREATED)
    fun generateCandidates(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @RequestBody request: GenerateDuplicateCandidatesRequest,
    ): DuplicateCandidateGenerationResponse =
        duplicateCandidateService.generateCandidates(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            request = request,
        )

    @GetMapping
    fun listCandidates(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @RequestParam("entityType", required = false) entityType: String?,
        @RequestParam("status", required = false) status: String?,
        @RequestParam("limit", required = false) limit: Int?,
    ): DuplicateCandidateListResponse =
        duplicateCandidateService.listCandidates(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            entityType = entityType,
            status = status,
            limit = limit,
        )

    @PostMapping("/{candidateId}/reject")
    fun rejectCandidate(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable candidateId: String,
        @RequestBody request: RejectDuplicateCandidateRequest,
    ): DuplicateCandidateItem =
        duplicateCandidateService.rejectCandidate(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            candidateId = candidateId,
            request = request,
        )

    @PostMapping("/{candidateId}/merge-account")
    fun mergeAccountCandidate(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable candidateId: String,
        @RequestBody request: MergeAccountDuplicateCandidateRequest,
    ): DuplicateCandidateMergeResponse =
        duplicateCandidateService.mergeAccountCandidate(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            candidateId = candidateId,
            request = request,
        )

    @PostMapping("/{candidateId}/merge-contact")
    fun mergeContactCandidate(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable candidateId: String,
        @RequestBody request: MergeContactDuplicateCandidateRequest,
    ): ContactDuplicateCandidateMergeResponse =
        duplicateCandidateService.mergeContactCandidate(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            candidateId = candidateId,
            request = request,
        )
}
