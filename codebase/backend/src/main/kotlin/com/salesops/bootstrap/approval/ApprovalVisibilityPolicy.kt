package com.salesops.bootstrap.approval

import com.salesops.bootstrap.auth.CurrentUserContext
import org.springframework.stereotype.Component

@Component
class ApprovalVisibilityPolicy {
    fun canSubmitApproval(context: CurrentUserContext): Boolean =
        context.roleKey in approvalSubmitterRoles

    fun canBrowseInbox(context: CurrentUserContext): Boolean =
        context.roleKey in approverRoles || context.roleKey == "revops_admin"

    fun canViewRequest(context: CurrentUserContext, subject: ApprovalVisibilitySubject): Boolean =
        when (context.roleKey) {
            "revops_admin" -> true
            "sales_rep" -> subject.submittedByUserId == context.userId || subject.opportunityOwnerUserId == context.userId
            "sales_manager" ->
                subject.submittedByUserId == context.userId ||
                    subject.opportunityOwnerUserIdsVisibleToViewer.contains(subject.opportunityOwnerUserId)
            "finance_approver", "legal_approver" ->
                subject.assignedApproverUserIds.contains(context.userId) ||
                    subject.assignedApproverRoleKeys.contains(context.roleKey)
            else -> false
        }

    fun canActOnStep(context: CurrentUserContext, step: ApprovalStepVisibilitySubject): Boolean {
        if (step.status != "active") {
            return false
        }

        return step.assignedApproverUserId == context.userId ||
            (step.assignedApproverUserId == null && step.approverRoleKey == context.roleKey)
    }

    private companion object {
        val approvalSubmitterRoles = setOf("sales_rep", "sales_manager", "revops_admin")
        val approverRoles = setOf("finance_approver", "legal_approver")
    }
}

data class ApprovalVisibilitySubject(
    val submittedByUserId: String,
    val opportunityOwnerUserId: String,
    val opportunityOwnerUserIdsVisibleToViewer: List<String>,
    val assignedApproverUserIds: List<String>,
    val assignedApproverRoleKeys: List<String>,
)

data class ApprovalStepVisibilitySubject(
    val status: String,
    val approverRoleKey: String,
    val assignedApproverUserId: String?,
)
