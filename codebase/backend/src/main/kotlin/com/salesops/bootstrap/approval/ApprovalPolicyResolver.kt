package com.salesops.bootstrap.approval

import com.salesops.bootstrap.api.ValidationFailureException
import org.springframework.stereotype.Component
import java.math.BigDecimal

@Component
class ApprovalPolicyResolver {
    fun resolve(input: ApprovalPolicyInput): ApprovalPolicyResolution {
        if (input.requestType != REQUEST_TYPE_STAGE_PROGRESSION) {
            throw ValidationFailureException("Unsupported approval request type")
        }

        val amount = input.expectedAmount ?: BigDecimal.ZERO
        val isLargeDeal = amount >= LARGE_DEAL_THRESHOLD

        return if (isLargeDeal) {
            ApprovalPolicyResolution(
                policyKey = "large_deal_stage_progression",
                policyVersion = 1,
                steps = listOf(
                    ApprovalPolicyStep(stepOrder = 1, approverRoleKey = "finance_approver"),
                    ApprovalPolicyStep(stepOrder = 2, approverRoleKey = "legal_approver"),
                ),
            )
        } else {
            ApprovalPolicyResolution(
                policyKey = "standard_stage_progression",
                policyVersion = 1,
                steps = listOf(
                    ApprovalPolicyStep(stepOrder = 1, approverRoleKey = "finance_approver"),
                ),
            )
        }
    }

    private companion object {
        const val REQUEST_TYPE_STAGE_PROGRESSION = "stage_progression"
        val LARGE_DEAL_THRESHOLD: BigDecimal = BigDecimal("50000.00")
    }
}

data class ApprovalPolicyInput(
    val requestType: String,
    val opportunityId: String,
    val stageKey: String,
    val targetStageKey: String,
    val expectedAmount: BigDecimal?,
)

data class ApprovalPolicyResolution(
    val policyKey: String,
    val policyVersion: Int,
    val steps: List<ApprovalPolicyStep>,
)

data class ApprovalPolicyStep(
    val stepOrder: Int,
    val approverRoleKey: String,
    val assignedApproverUserId: String? = null,
    val isRequired: Boolean = true,
)
