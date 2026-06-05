package com.salesops.bootstrap.crm.opportunity

import com.salesops.bootstrap.api.ValidationFailureException
import org.springframework.stereotype.Component

@Component
class StageTransitionPolicy {
    fun validateInitialStage(stageKey: String) {
        if (stageKey == "pending_approval") {
            throw ValidationFailureException("Target stage requires approval workflow that is not implemented yet")
        }
    }

    fun decideMove(
        currentStageKey: String,
        currentGlobalStatus: String,
        currentApprovalState: String,
        targetStageKey: String,
    ): StageTransitionDecision {
        if (currentGlobalStatus == "closed_won" || currentGlobalStatus == "closed_lost") {
            throw ValidationFailureException("Closed opportunity cannot change stage")
        }

        if (targetStageKey == currentStageKey) {
            throw ValidationFailureException("Target stage must differ from current stage")
        }

        if (currentApprovalState == "pending") {
            throw ValidationFailureException("Opportunity cannot change stage while approval is pending")
        }

        if (currentApprovalState == "rejected" || currentGlobalStatus == "blocked_by_rejection") {
            throw ValidationFailureException("Opportunity cannot change stage after rejection until approval workflow exists")
        }

        if (targetStageKey == "pending_approval") {
            throw ValidationFailureException("Target stage requires approval workflow that is not implemented yet")
        }

        return StageTransitionDecision(
            targetStageKey = targetStageKey,
            nextGlobalStatus = "active",
        )
    }
}

data class StageTransitionDecision(
    val targetStageKey: String,
    val nextGlobalStatus: String,
)
