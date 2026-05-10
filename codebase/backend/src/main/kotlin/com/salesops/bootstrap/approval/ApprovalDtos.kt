package com.salesops.bootstrap.approval

import jakarta.validation.constraints.NotBlank
import java.time.Instant

data class SubmitApprovalRequest(
    @field:NotBlank(message = "Request type is required")
    val requestType: String,
    val businessJustification: String? = null,
)

data class SubmitApprovalResponse(
    val id: String,
    val status: String,
)

data class ApprovalDecisionRequest(
    val comment: String? = null,
)

data class ApprovalDecisionResponse(
    val id: String,
    val status: String,
    val updated: Boolean,
)

data class ApprovalInboxResponse(
    val items: List<ApprovalInboxItem>,
)

data class ApprovalInboxItem(
    val id: String,
    val opportunityId: String,
    val opportunityTitle: String,
    val accountName: String,
    val requestType: String,
    val policyKey: String,
    val status: String,
    val activeStepId: String,
    val activeStepStatus: String,
    val approverRoleKey: String,
    val submittedByName: String,
    val submittedAt: Instant?,
)

data class ApprovalDetailResponse(
    val id: String,
    val opportunityId: String,
    val requestType: String,
    val policyKey: String,
    val policyVersion: Int,
    val status: String,
    val businessJustification: String?,
    val opportunitySnapshotJson: String,
    val submittedBy: ApprovalActor,
    val submittedAt: Instant?,
    val resolvedAt: Instant?,
    val steps: List<ApprovalStepItem>,
    val history: List<ApprovalHistoryItem>,
)

data class ApprovalActor(
    val id: String,
    val displayName: String,
)

data class ApprovalStepItem(
    val id: String,
    val stepOrder: Int,
    val approverRoleKey: String,
    val assignedApprover: ApprovalActor?,
    val status: String,
    val isRequired: Boolean,
    val activatedAt: Instant?,
    val decidedAt: Instant?,
    val dueAt: Instant?,
)

data class ApprovalHistoryItem(
    val id: String,
    val stepId: String?,
    val actor: ApprovalActor,
    val eventType: String,
    val fromStatus: String?,
    val toStatus: String,
    val comment: String?,
    val decisionPayloadJson: String,
    val createdAt: Instant,
)

data class ApprovalSummary(
    val id: String,
    val status: String,
    val policyKey: String,
    val activeStepId: String?,
)
