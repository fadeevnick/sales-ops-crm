package com.salesops.bootstrap.approval

import com.salesops.bootstrap.api.ValidationFailureException
import org.springframework.stereotype.Component

@Component
class ApprovalStatePolicy {
    fun validateRequestTransition(currentStatus: String, targetStatus: String) {
        val allowedTargets = allowedRequestTransitions[currentStatus].orEmpty()
        if (targetStatus !in allowedTargets) {
            throw ValidationFailureException(
                "Approval request cannot transition from $currentStatus to $targetStatus",
            )
        }
    }

    fun validateStepTransition(currentStatus: String, targetStatus: String) {
        val allowedTargets = allowedStepTransitions[currentStatus].orEmpty()
        if (targetStatus !in allowedTargets) {
            throw ValidationFailureException(
                "Approval step cannot transition from $currentStatus to $targetStatus",
            )
        }
    }

    fun validateDecisionAction(activeStepStatus: String, requestStatus: String) {
        if (requestStatus != "pending_step") {
            throw ValidationFailureException("Approval request is not waiting for a decision")
        }

        if (activeStepStatus != "active") {
            throw ValidationFailureException("Approval step is not active")
        }
    }

    private companion object {
        val allowedRequestTransitions = mapOf(
            "draft" to setOf("submitted", "cancelled"),
            "submitted" to setOf("pending_step", "cancelled", "superseded"),
            "pending_step" to setOf("approved", "rejected", "sent_back", "cancelled", "superseded"),
            "sent_back" to setOf("submitted", "cancelled", "superseded"),
            "approved" to emptySet(),
            "rejected" to emptySet(),
            "cancelled" to emptySet(),
            "superseded" to emptySet(),
        )

        val allowedStepTransitions = mapOf(
            "inactive" to setOf("active", "skipped"),
            "active" to setOf("approved", "rejected", "expired"),
            "approved" to emptySet(),
            "rejected" to emptySet(),
            "skipped" to emptySet(),
            "expired" to emptySet(),
        )
    }
}
