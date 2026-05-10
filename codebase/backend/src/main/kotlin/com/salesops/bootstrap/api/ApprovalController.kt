package com.salesops.bootstrap.api

import com.salesops.bootstrap.approval.ApprovalDecisionRequest
import com.salesops.bootstrap.approval.ApprovalDecisionResponse
import com.salesops.bootstrap.approval.ApprovalDetailResponse
import com.salesops.bootstrap.approval.ApprovalInboxResponse
import com.salesops.bootstrap.approval.ApprovalService
import com.salesops.bootstrap.approval.SubmitApprovalRequest
import com.salesops.bootstrap.approval.SubmitApprovalResponse
import com.salesops.bootstrap.service.SessionService
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class ApprovalController(
    private val approvalService: ApprovalService,
    private val sessionService: SessionService,
) {
    @PostMapping("/opportunities/{opportunityId}/submit-approval")
    fun submitApproval(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable opportunityId: String,
        @Valid @RequestBody request: SubmitApprovalRequest,
    ): SubmitApprovalResponse =
        approvalService.submitApproval(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            opportunityId = opportunityId,
            request = request,
        )

    @GetMapping("/approvals/inbox")
    fun inbox(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
    ): ApprovalInboxResponse =
        approvalService.listInbox(
            context = sessionService.resolveCurrentUserContext(demoUserId),
        )

    @GetMapping("/approvals/{approvalRequestId}")
    fun detail(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable approvalRequestId: String,
    ): ApprovalDetailResponse =
        approvalService.getApprovalDetail(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            approvalRequestId = approvalRequestId,
        )

    @PostMapping("/approvals/{approvalRequestId}/approve")
    fun approve(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable approvalRequestId: String,
        @RequestBody request: ApprovalDecisionRequest,
    ): ApprovalDecisionResponse =
        approvalService.approve(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            approvalRequestId = approvalRequestId,
            request = request,
        )

    @PostMapping("/approvals/{approvalRequestId}/reject")
    fun reject(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable approvalRequestId: String,
        @RequestBody request: ApprovalDecisionRequest,
    ): ApprovalDecisionResponse =
        approvalService.reject(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            approvalRequestId = approvalRequestId,
            request = request,
        )

    @PostMapping("/approvals/{approvalRequestId}/send-back")
    fun sendBack(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable approvalRequestId: String,
        @RequestBody request: ApprovalDecisionRequest,
    ): ApprovalDecisionResponse =
        approvalService.sendBack(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            approvalRequestId = approvalRequestId,
            request = request,
        )
}
