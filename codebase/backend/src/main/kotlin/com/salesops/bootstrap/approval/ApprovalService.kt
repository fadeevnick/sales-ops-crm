package com.salesops.bootstrap.approval

import com.salesops.bootstrap.api.ForbiddenOperationException
import com.salesops.bootstrap.api.ValidationFailureException
import com.salesops.bootstrap.auth.CurrentUserContext
import com.salesops.bootstrap.crm.opportunity.OpportunityApprovalBridge
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
class ApprovalService(
    private val approvalRepository: ApprovalRepository,
    private val approvalPolicyResolver: ApprovalPolicyResolver,
    private val approvalStatePolicy: ApprovalStatePolicy,
    private val approvalVisibilityPolicy: ApprovalVisibilityPolicy,
    private val opportunityApprovalBridge: OpportunityApprovalBridge,
) {
    @Transactional
    fun submitApproval(
        context: CurrentUserContext,
        opportunityId: String,
        request: SubmitApprovalRequest,
    ): SubmitApprovalResponse {
        if (!approvalVisibilityPolicy.canSubmitApproval(context)) {
            throw ForbiddenOperationException("Current role cannot submit approval requests")
        }

        val requestType = request.requestType.trim()
        val snapshot = opportunityApprovalBridge.loadSubmissionSnapshot(
            context = context,
            opportunityId = opportunityId,
            targetStageKey = TARGET_STAGE_KEY,
        )

        if (snapshot.approvalState == "pending" || snapshot.globalStatus == "pending_approval") {
            throw ValidationFailureException("Opportunity already has a pending approval request")
        }

        if (snapshot.globalStatus in terminalOpportunityStatuses) {
            throw ValidationFailureException("Closed opportunity cannot be submitted for approval")
        }

        val policy = approvalPolicyResolver.resolve(
            ApprovalPolicyInput(
                requestType = requestType,
                opportunityId = snapshot.opportunityId,
                stageKey = snapshot.currentStageKey,
                targetStageKey = snapshot.targetStageKey,
                expectedAmount = snapshot.expectedAmount,
            ),
        )

        approvalStatePolicy.validateRequestTransition("submitted", "pending_step")

        val now = Instant.now()
        val approvalRequestId = newId("apr")
        val steps = policy.steps.map { policyStep ->
            CreateApprovalStepCommand(
                id = newId("aps"),
                tenantId = context.tenant.tenantId,
                approvalRequestId = approvalRequestId,
                stepOrder = policyStep.stepOrder,
                approverRoleKey = policyStep.approverRoleKey,
                assignedApproverUserId = policyStep.assignedApproverUserId,
                status = if (policyStep.stepOrder == 1) "active" else "inactive",
                isRequired = policyStep.isRequired,
                activatedAt = if (policyStep.stepOrder == 1) now else null,
                decidedAt = null,
                dueAt = if (policyStep.stepOrder == 1) dueAtFor(policyStep.approverRoleKey, now) else null,
            )
        }

        if (steps.isEmpty()) {
            throw ValidationFailureException("Approval policy did not produce any approval steps")
        }

        try {
            approvalRepository.createRequest(
                CreateApprovalRequestCommand(
                    id = approvalRequestId,
                    tenantId = context.tenant.tenantId,
                    opportunityId = snapshot.opportunityId,
                    requestType = requestType,
                    policyKey = policy.policyKey,
                    policyVersion = policy.policyVersion,
                    status = "pending_step",
                    businessJustification = request.businessJustification?.trim()?.takeIf { it.isNotEmpty() },
                    opportunitySnapshotJson = opportunityApprovalBridge.serializeSnapshot(snapshot),
                    submittedByUserId = context.userId,
                    submittedAt = now,
                    resolvedAt = null,
                    createdByUserId = context.userId,
                    updatedByUserId = context.userId,
                ),
            )
        } catch (exception: DataIntegrityViolationException) {
            throw ValidationFailureException("Opportunity already has an active approval request in this policy scope")
        }

        approvalRepository.createSteps(steps)
        approvalRepository.appendHistory(
            AppendApprovalHistoryCommand(
                id = newId("adh"),
                tenantId = context.tenant.tenantId,
                approvalRequestId = approvalRequestId,
                approvalStepId = null,
                actorUserId = context.userId,
                eventType = "submitted",
                fromStatus = null,
                toStatus = "pending_step",
                comment = request.businessJustification?.trim()?.takeIf { it.isNotEmpty() },
                decisionPayloadJson = "{}",
            ),
        )

        steps.firstOrNull { it.status == "active" }?.let { activeStep ->
            approvalRepository.appendHistory(
                AppendApprovalHistoryCommand(
                    id = newId("adh"),
                    tenantId = context.tenant.tenantId,
                    approvalRequestId = approvalRequestId,
                    approvalStepId = activeStep.id,
                    actorUserId = context.userId,
                    eventType = "step_activated",
                    fromStatus = null,
                    toStatus = "active",
                    comment = null,
                    decisionPayloadJson = "{}",
                ),
            )
        }

        opportunityApprovalBridge.markPending(context = context, opportunityId = snapshot.opportunityId)

        return SubmitApprovalResponse(
            id = approvalRequestId,
            status = "pending_step",
        )
    }

    fun listInbox(context: CurrentUserContext): ApprovalInboxResponse {
        if (!approvalVisibilityPolicy.canBrowseInbox(context)) {
            throw ForbiddenOperationException("Current role cannot browse approval inbox")
        }

        val records = approvalRepository.listInbox(
            ApprovalInboxFilter(
                tenantId = context.tenant.tenantId,
                approverUserId = context.userId,
                approverRoleKeys = approverRoleKeys(context),
                includeTenantWideScope = context.roleKey == "revops_admin",
            ),
        )

        return ApprovalInboxResponse(
            items = records.map { record ->
                ApprovalInboxItem(
                    id = record.approvalRequestId,
                    opportunityId = record.opportunityId,
                    opportunityTitle = record.opportunityTitle,
                    accountName = record.accountName,
                    requestType = record.requestType,
                    policyKey = record.policyKey,
                    status = record.requestStatus,
                    activeStepId = record.activeStepId,
                    activeStepStatus = record.activeStepStatus,
                    activeStepDueAt = record.activeStepDueAt,
                    approverRoleKey = record.approverRoleKey,
                    submittedByName = record.submittedByName,
                    submittedAt = record.submittedAt,
                )
            },
        )
    }

    fun getApprovalDetail(
        context: CurrentUserContext,
        approvalRequestId: String,
    ): ApprovalDetailResponse {
        val detail = loadDetailRecords(context, approvalRequestId)
        assertCanViewDetail(context, detail.request, detail.steps)

        return detail.toResponse()
    }

    @Transactional
    fun approve(
        context: CurrentUserContext,
        approvalRequestId: String,
        request: ApprovalDecisionRequest,
    ): ApprovalDecisionResponse {
        val detail = loadDetailRecords(context, approvalRequestId)
        val activeStep = detail.activeStep()

        approvalStatePolicy.validateDecisionAction(
            activeStepStatus = activeStep.status,
            requestStatus = detail.request.status,
        )
        assertCanActOnStep(context, activeStep)

        approvalStatePolicy.validateStepTransition(activeStep.status, "approved")
        approvalRepository.updateStepStatus(
            UpdateApprovalStepStatusCommand(
                tenantId = context.tenant.tenantId,
                approvalRequestId = detail.request.id,
                approvalStepId = activeStep.id,
                status = "approved",
                activatedAt = null,
                decidedAt = Instant.now(),
                dueAt = null,
            ),
        )
        appendDecisionHistory(
            context = context,
            request = detail.request,
            step = activeStep,
            eventType = "approved",
            fromStatus = activeStep.status,
            toStatus = "approved",
            comment = request.comment,
        )

        val nextStep = detail.steps
            .filter { it.stepOrder > activeStep.stepOrder && it.status == "inactive" }
            .minByOrNull { it.stepOrder }

        if (nextStep != null) {
            val activatedAt = Instant.now()
            approvalStatePolicy.validateStepTransition(nextStep.status, "active")
            approvalRepository.updateStepStatus(
                UpdateApprovalStepStatusCommand(
                    tenantId = context.tenant.tenantId,
                    approvalRequestId = detail.request.id,
                    approvalStepId = nextStep.id,
                    status = "active",
                    activatedAt = activatedAt,
                    decidedAt = null,
                    dueAt = dueAtFor(nextStep.approverRoleKey, activatedAt),
                ),
            )
            appendDecisionHistory(
                context = context,
                request = detail.request,
                step = nextStep,
                eventType = "step_activated",
                fromStatus = "inactive",
                toStatus = "active",
                comment = null,
            )

            return ApprovalDecisionResponse(id = detail.request.id, status = "pending_step", updated = true)
        }

        approvalStatePolicy.validateRequestTransition(detail.request.status, "approved")
        approvalRepository.updateRequestStatus(
            UpdateApprovalRequestStatusCommand(
                tenantId = context.tenant.tenantId,
                approvalRequestId = detail.request.id,
                status = "approved",
                resolvedAt = Instant.now(),
                updatedByUserId = context.userId,
            ),
        )
        appendRequestHistory(
            context = context,
            request = detail.request,
            eventType = "approved",
            fromStatus = detail.request.status,
            toStatus = "approved",
            comment = request.comment,
        )
        opportunityApprovalBridge.markApproved(context = context, opportunityId = detail.request.opportunityId)

        return ApprovalDecisionResponse(id = detail.request.id, status = "approved", updated = true)
    }

    @Transactional
    fun reject(
        context: CurrentUserContext,
        approvalRequestId: String,
        request: ApprovalDecisionRequest,
    ): ApprovalDecisionResponse =
        decideTerminal(
            context = context,
            approvalRequestId = approvalRequestId,
            request = request,
            targetRequestStatus = "rejected",
            targetStepStatus = "rejected",
            eventType = "rejected",
        ) { detail ->
            opportunityApprovalBridge.markRejected(context = context, opportunityId = detail.request.opportunityId)
        }

    @Transactional
    fun sendBack(
        context: CurrentUserContext,
        approvalRequestId: String,
        request: ApprovalDecisionRequest,
    ): ApprovalDecisionResponse {
        val detail = loadDetailRecords(context, approvalRequestId)
        val activeStep = detail.activeStep()

        approvalStatePolicy.validateDecisionAction(
            activeStepStatus = activeStep.status,
            requestStatus = detail.request.status,
        )
        assertCanActOnStep(context, activeStep)

        approvalStatePolicy.validateStepTransition(activeStep.status, "sent_back")
        approvalRepository.updateStepStatus(
            UpdateApprovalStepStatusCommand(
                tenantId = context.tenant.tenantId,
                approvalRequestId = detail.request.id,
                approvalStepId = activeStep.id,
                status = "sent_back",
                activatedAt = null,
                decidedAt = Instant.now(),
                dueAt = null,
            ),
        )

        approvalStatePolicy.validateRequestTransition(detail.request.status, "sent_back")
        approvalRepository.updateRequestStatus(
            UpdateApprovalRequestStatusCommand(
                tenantId = context.tenant.tenantId,
                approvalRequestId = detail.request.id,
                status = "sent_back",
                resolvedAt = null,
                updatedByUserId = context.userId,
            ),
        )
        appendDecisionHistory(
            context = context,
            request = detail.request,
            step = activeStep,
            eventType = "sent_back",
            fromStatus = activeStep.status,
            toStatus = "sent_back",
            comment = request.comment,
        )
        appendRequestHistory(
            context = context,
            request = detail.request,
            eventType = "sent_back",
            fromStatus = detail.request.status,
            toStatus = "sent_back",
            comment = request.comment,
        )
        opportunityApprovalBridge.markSentBack(context = context, opportunityId = detail.request.opportunityId)

        return ApprovalDecisionResponse(id = detail.request.id, status = "sent_back", updated = true)
    }

    private fun decideTerminal(
        context: CurrentUserContext,
        approvalRequestId: String,
        request: ApprovalDecisionRequest,
        targetRequestStatus: String,
        targetStepStatus: String,
        eventType: String,
        applyOpportunityOutcome: (ApprovalDetailRecords) -> Unit,
    ): ApprovalDecisionResponse {
        val detail = loadDetailRecords(context, approvalRequestId)
        val activeStep = detail.activeStep()

        approvalStatePolicy.validateDecisionAction(
            activeStepStatus = activeStep.status,
            requestStatus = detail.request.status,
        )
        assertCanActOnStep(context, activeStep)
        approvalStatePolicy.validateStepTransition(activeStep.status, targetStepStatus)
        approvalStatePolicy.validateRequestTransition(detail.request.status, targetRequestStatus)

        approvalRepository.updateStepStatus(
            UpdateApprovalStepStatusCommand(
                tenantId = context.tenant.tenantId,
                approvalRequestId = detail.request.id,
                approvalStepId = activeStep.id,
                status = targetStepStatus,
                activatedAt = null,
                decidedAt = Instant.now(),
                dueAt = null,
            ),
        )
        approvalRepository.updateRequestStatus(
            UpdateApprovalRequestStatusCommand(
                tenantId = context.tenant.tenantId,
                approvalRequestId = detail.request.id,
                status = targetRequestStatus,
                resolvedAt = Instant.now(),
                updatedByUserId = context.userId,
            ),
        )
        appendDecisionHistory(
            context = context,
            request = detail.request,
            step = activeStep,
            eventType = eventType,
            fromStatus = activeStep.status,
            toStatus = targetStepStatus,
            comment = request.comment,
        )
        appendRequestHistory(
            context = context,
            request = detail.request,
            eventType = eventType,
            fromStatus = detail.request.status,
            toStatus = targetRequestStatus,
            comment = request.comment,
        )
        applyOpportunityOutcome(detail)

        return ApprovalDecisionResponse(id = detail.request.id, status = targetRequestStatus, updated = true)
    }

    private fun loadDetailRecords(
        context: CurrentUserContext,
        approvalRequestId: String,
    ): ApprovalDetailRecords {
        val request = approvalRepository.findRequestById(
            tenantId = context.tenant.tenantId,
            approvalRequestId = approvalRequestId,
        ) ?: throw ValidationFailureException("Approval request does not exist")

        return ApprovalDetailRecords(
            request = request,
            steps = approvalRepository.listSteps(context.tenant.tenantId, request.id),
            history = approvalRepository.listHistory(context.tenant.tenantId, request.id),
        )
    }

    private fun assertCanViewDetail(
        context: CurrentUserContext,
        request: ApprovalRequestRecord,
        steps: List<ApprovalStepRecord>,
    ) {
        val opportunity = opportunityApprovalBridge.loadVisibilityContext(
            tenantId = context.tenant.tenantId,
            opportunityId = request.opportunityId,
        )

        val subject = ApprovalVisibilitySubject(
            submittedByUserId = request.submittedByUserId,
            opportunityOwnerUserId = opportunity.ownerUserId,
            opportunityOwnerUserIdsVisibleToViewer = opportunityApprovalBridge.visibleOwnerUserIds(context),
            assignedApproverUserIds = steps.mapNotNull { it.assignedApproverUserId },
            assignedApproverRoleKeys = steps.map { it.approverRoleKey },
        )

        if (!approvalVisibilityPolicy.canViewRequest(context, subject)) {
            throw ForbiddenOperationException("Current role cannot view this approval request")
        }
    }

    private fun assertCanActOnStep(context: CurrentUserContext, step: ApprovalStepRecord) {
        val subject = ApprovalStepVisibilitySubject(
            status = step.status,
            approverRoleKey = step.approverRoleKey,
            assignedApproverUserId = step.assignedApproverUserId,
        )

        if (!approvalVisibilityPolicy.canActOnStep(context, subject)) {
            throw ForbiddenOperationException("Current role cannot decide this approval step")
        }
    }

    private fun appendDecisionHistory(
        context: CurrentUserContext,
        request: ApprovalRequestRecord,
        step: ApprovalStepRecord,
        eventType: String,
        fromStatus: String?,
        toStatus: String,
        comment: String?,
    ) {
        approvalRepository.appendHistory(
            AppendApprovalHistoryCommand(
                id = newId("adh"),
                tenantId = context.tenant.tenantId,
                approvalRequestId = request.id,
                approvalStepId = step.id,
                actorUserId = context.userId,
                eventType = eventType,
                fromStatus = fromStatus,
                toStatus = toStatus,
                comment = comment?.trim()?.takeIf { it.isNotEmpty() },
                decisionPayloadJson = "{}",
            ),
        )
    }

    private fun appendRequestHistory(
        context: CurrentUserContext,
        request: ApprovalRequestRecord,
        eventType: String,
        fromStatus: String?,
        toStatus: String,
        comment: String?,
    ) {
        approvalRepository.appendHistory(
            AppendApprovalHistoryCommand(
                id = newId("adh"),
                tenantId = context.tenant.tenantId,
                approvalRequestId = request.id,
                approvalStepId = null,
                actorUserId = context.userId,
                eventType = eventType,
                fromStatus = fromStatus,
                toStatus = toStatus,
                comment = comment?.trim()?.takeIf { it.isNotEmpty() },
                decisionPayloadJson = "{}",
            ),
        )
    }

    private fun approverRoleKeys(context: CurrentUserContext): List<String> =
        when (context.roleKey) {
            "finance_approver", "legal_approver" -> listOf(context.roleKey)
            else -> emptyList()
        }

    private fun newId(prefix: String): String =
        "${prefix}_${UUID.randomUUID().toString().replace("-", "").take(12)}"

    private fun dueAtFor(approverRoleKey: String, activatedAt: Instant): Instant =
        activatedAt.plus(SLA_HOURS_BY_ROLE[approverRoleKey] ?: DEFAULT_SLA_HOURS, ChronoUnit.HOURS)

    private companion object {
        const val TARGET_STAGE_KEY = "pending_approval"
        const val DEFAULT_SLA_HOURS = 72L
        val SLA_HOURS_BY_ROLE = mapOf(
            "finance_approver" to 24L,
            "legal_approver" to 48L,
        )
        val terminalOpportunityStatuses = setOf("closed_won", "closed_lost")
    }
}

private data class ApprovalDetailRecords(
    val request: ApprovalRequestRecord,
    val steps: List<ApprovalStepRecord>,
    val history: List<ApprovalHistoryRecord>,
) {
    fun activeStep(): ApprovalStepRecord =
        steps.firstOrNull { it.status == "active" }
            ?: throw ValidationFailureException("Approval request has no active step")

    fun toResponse(): ApprovalDetailResponse =
        ApprovalDetailResponse(
            id = request.id,
            opportunityId = request.opportunityId,
            requestType = request.requestType,
            policyKey = request.policyKey,
            policyVersion = request.policyVersion,
            status = request.status,
            businessJustification = request.businessJustification,
            opportunitySnapshotJson = request.opportunitySnapshotJson,
            submittedBy = ApprovalActor(
                id = request.submittedByUserId,
                displayName = request.submittedByName,
            ),
            submittedAt = request.submittedAt,
            resolvedAt = request.resolvedAt,
            steps = steps.map { step ->
                ApprovalStepItem(
                    id = step.id,
                    stepOrder = step.stepOrder,
                    approverRoleKey = step.approverRoleKey,
                    assignedApprover = step.assignedApproverUserId?.let { approverId ->
                        ApprovalActor(
                            id = approverId,
                            displayName = step.assignedApproverName ?: "",
                        )
                    },
                    status = step.status,
                    isRequired = step.isRequired,
                    activatedAt = step.activatedAt,
                    decidedAt = step.decidedAt,
                    dueAt = step.dueAt,
                )
            },
            history = history.map { record ->
                ApprovalHistoryItem(
                    id = record.id,
                    stepId = record.approvalStepId,
                    actor = ApprovalActor(
                        id = record.actorUserId,
                        displayName = record.actorName,
                    ),
                    eventType = record.eventType,
                    fromStatus = record.fromStatus,
                    toStatus = record.toStatus,
                    comment = record.comment,
                    decisionPayloadJson = record.decisionPayloadJson,
                    createdAt = record.createdAt,
                )
            },
        )
}
