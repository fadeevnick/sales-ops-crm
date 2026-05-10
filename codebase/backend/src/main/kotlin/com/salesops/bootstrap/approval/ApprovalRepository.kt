package com.salesops.bootstrap.approval

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Repository
class ApprovalRepository(
    private val jdbcClient: JdbcClient,
) {
    fun createRequest(command: CreateApprovalRequestCommand): String {
        jdbcClient.sql(
            """
            INSERT INTO approval_requests (
                id,
                tenant_id,
                opportunity_id,
                request_type,
                policy_key,
                policy_version,
                status,
                business_justification,
                opportunity_snapshot,
                submitted_by_user_id,
                submitted_at,
                resolved_at,
                created_by_user_id,
                updated_by_user_id
            ) VALUES (
                :id,
                :tenantId,
                :opportunityId,
                :requestType,
                :policyKey,
                :policyVersion,
                :status,
                :businessJustification,
                CAST(:opportunitySnapshotJson AS jsonb),
                :submittedByUserId,
                :submittedAt,
                :resolvedAt,
                :createdByUserId,
                :updatedByUserId
            )
            """.trimIndent(),
        )
            .param("id", command.id)
            .param("tenantId", command.tenantId)
            .param("opportunityId", command.opportunityId)
            .param("requestType", command.requestType)
            .param("policyKey", command.policyKey)
            .param("policyVersion", command.policyVersion)
            .param("status", command.status)
            .param("businessJustification", command.businessJustification)
            .param("opportunitySnapshotJson", command.opportunitySnapshotJson)
            .param("submittedByUserId", command.submittedByUserId)
            .param("submittedAt", command.submittedAt.toDbTimestamp())
            .param("resolvedAt", command.resolvedAt.toDbTimestamp())
            .param("createdByUserId", command.createdByUserId)
            .param("updatedByUserId", command.updatedByUserId)
            .update()

        return command.id
    }

    fun createSteps(commands: List<CreateApprovalStepCommand>) {
        commands.forEach { createStep(it) }
    }

    fun createStep(command: CreateApprovalStepCommand): String {
        jdbcClient.sql(
            """
            INSERT INTO approval_steps (
                id,
                tenant_id,
                approval_request_id,
                step_order,
                approver_role_key,
                assigned_approver_user_id,
                status,
                is_required,
                activated_at,
                decided_at,
                due_at
            ) VALUES (
                :id,
                :tenantId,
                :approvalRequestId,
                :stepOrder,
                :approverRoleKey,
                :assignedApproverUserId,
                :status,
                :isRequired,
                :activatedAt,
                :decidedAt,
                :dueAt
            )
            """.trimIndent(),
        )
            .param("id", command.id)
            .param("tenantId", command.tenantId)
            .param("approvalRequestId", command.approvalRequestId)
            .param("stepOrder", command.stepOrder)
            .param("approverRoleKey", command.approverRoleKey)
            .param("assignedApproverUserId", command.assignedApproverUserId)
            .param("status", command.status)
            .param("isRequired", command.isRequired)
            .param("activatedAt", command.activatedAt.toDbTimestamp())
            .param("decidedAt", command.decidedAt.toDbTimestamp())
            .param("dueAt", command.dueAt.toDbTimestamp())
            .update()

        return command.id
    }

    fun appendHistory(command: AppendApprovalHistoryCommand): String {
        jdbcClient.sql(
            """
            INSERT INTO approval_decision_history (
                id,
                tenant_id,
                approval_request_id,
                approval_step_id,
                actor_user_id,
                event_type,
                from_status,
                to_status,
                comment,
                decision_payload
            ) VALUES (
                :id,
                :tenantId,
                :approvalRequestId,
                :approvalStepId,
                :actorUserId,
                :eventType,
                :fromStatus,
                :toStatus,
                :comment,
                CAST(:decisionPayloadJson AS jsonb)
            )
            """.trimIndent(),
        )
            .param("id", command.id)
            .param("tenantId", command.tenantId)
            .param("approvalRequestId", command.approvalRequestId)
            .param("approvalStepId", command.approvalStepId)
            .param("actorUserId", command.actorUserId)
            .param("eventType", command.eventType)
            .param("fromStatus", command.fromStatus)
            .param("toStatus", command.toStatus)
            .param("comment", command.comment)
            .param("decisionPayloadJson", command.decisionPayloadJson)
            .update()

        return command.id
    }

    fun updateRequestStatus(command: UpdateApprovalRequestStatusCommand): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE approval_requests
            SET status = :status,
                resolved_at = COALESCE(:resolvedAt, resolved_at),
                updated_at = NOW(),
                updated_by_user_id = :updatedByUserId
            WHERE id = :approvalRequestId
              AND tenant_id = :tenantId
            """.trimIndent(),
        )
            .param("status", command.status)
            .param("resolvedAt", command.resolvedAt.toDbTimestamp())
            .param("updatedByUserId", command.updatedByUserId)
            .param("approvalRequestId", command.approvalRequestId)
            .param("tenantId", command.tenantId)
            .update()

        return updatedRows == 1
    }

    fun updateStepStatus(command: UpdateApprovalStepStatusCommand): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE approval_steps
            SET status = :status,
                activated_at = COALESCE(:activatedAt, activated_at),
                decided_at = COALESCE(:decidedAt, decided_at),
                updated_at = NOW()
            WHERE id = :approvalStepId
              AND tenant_id = :tenantId
              AND approval_request_id = :approvalRequestId
            """.trimIndent(),
        )
            .param("status", command.status)
            .param("activatedAt", command.activatedAt.toDbTimestamp())
            .param("decidedAt", command.decidedAt.toDbTimestamp())
            .param("approvalStepId", command.approvalStepId)
            .param("tenantId", command.tenantId)
            .param("approvalRequestId", command.approvalRequestId)
            .update()

        return updatedRows == 1
    }

    fun findRequestById(tenantId: String, approvalRequestId: String): ApprovalRequestRecord? =
        jdbcClient.sql(
            """
            SELECT
                ar.id,
                ar.tenant_id,
                ar.opportunity_id,
                ar.request_type,
                ar.policy_key,
                ar.policy_version,
                ar.status,
                ar.business_justification,
                ar.opportunity_snapshot::text AS opportunity_snapshot_json,
                ar.submitted_by_user_id,
                submitter.display_name AS submitted_by_name,
                ar.submitted_at,
                ar.resolved_at
            FROM approval_requests ar
            JOIN app_users submitter ON submitter.id = ar.submitted_by_user_id
            WHERE ar.tenant_id = :tenantId
              AND ar.id = :approvalRequestId
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("approvalRequestId", approvalRequestId)
            .query { rs, _ -> rs.toApprovalRequestRecord() }
            .optional()
            .orElse(null)

    fun listSteps(tenantId: String, approvalRequestId: String): List<ApprovalStepRecord> =
        jdbcClient.sql(
            """
            SELECT
                s.id,
                s.approval_request_id,
                s.step_order,
                s.approver_role_key,
                s.assigned_approver_user_id,
                assigned.display_name AS assigned_approver_name,
                s.status,
                s.is_required,
                s.activated_at,
                s.decided_at,
                s.due_at
            FROM approval_steps s
            LEFT JOIN app_users assigned ON assigned.id = s.assigned_approver_user_id
            WHERE s.tenant_id = :tenantId
              AND s.approval_request_id = :approvalRequestId
            ORDER BY s.step_order, s.id
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("approvalRequestId", approvalRequestId)
            .query { rs, _ -> rs.toApprovalStepRecord() }
            .list()

    fun listHistory(tenantId: String, approvalRequestId: String): List<ApprovalHistoryRecord> =
        jdbcClient.sql(
            """
            SELECT
                h.id,
                h.approval_request_id,
                h.approval_step_id,
                h.actor_user_id,
                actor.display_name AS actor_name,
                h.event_type,
                h.from_status,
                h.to_status,
                h.comment,
                h.decision_payload::text AS decision_payload_json,
                h.created_at
            FROM approval_decision_history h
            JOIN app_users actor ON actor.id = h.actor_user_id
            WHERE h.tenant_id = :tenantId
              AND h.approval_request_id = :approvalRequestId
            ORDER BY h.created_at, h.id
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("approvalRequestId", approvalRequestId)
            .query { rs, _ -> rs.toApprovalHistoryRecord() }
            .list()

    fun listInbox(filter: ApprovalInboxFilter): List<ApprovalInboxRecord> {
        val inboxScopeClause = if (filter.includeTenantWideScope) {
            "TRUE"
        } else if (filter.approverRoleKeys.isEmpty()) {
            "s.assigned_approver_user_id = :approverUserId"
        } else {
            """
            (
                s.assigned_approver_user_id = :approverUserId
                OR (s.assigned_approver_user_id IS NULL AND s.approver_role_key IN (:approverRoleKeys))
            )
            """.trimIndent()
        }

        var statement = jdbcClient.sql(
            """
            SELECT
                ar.id AS approval_request_id,
                ar.opportunity_id,
                o.title AS opportunity_title,
                a.name AS account_name,
                ar.request_type,
                ar.policy_key,
                ar.status AS request_status,
                s.id AS active_step_id,
                s.status AS active_step_status,
                s.approver_role_key,
                ar.submitted_by_user_id,
                submitter.display_name AS submitted_by_name,
                ar.submitted_at
            FROM approval_steps s
            JOIN approval_requests ar
                ON ar.id = s.approval_request_id
               AND ar.tenant_id = s.tenant_id
            JOIN opportunities o
                ON o.id = ar.opportunity_id
               AND o.tenant_id = ar.tenant_id
            JOIN accounts a
                ON a.id = o.account_id
               AND a.tenant_id = o.tenant_id
            JOIN app_users submitter ON submitter.id = ar.submitted_by_user_id
            WHERE s.tenant_id = :tenantId
              AND s.status = 'active'
              AND ar.status = 'pending_step'
              AND $inboxScopeClause
            ORDER BY ar.submitted_at NULLS LAST, ar.created_at, ar.id
            """.trimIndent(),
        )
            .param("tenantId", filter.tenantId)

        if (!filter.includeTenantWideScope) {
            statement = statement.param("approverUserId", filter.approverUserId)
        }

        if (!filter.includeTenantWideScope && filter.approverRoleKeys.isNotEmpty()) {
            statement = statement.param("approverRoleKeys", filter.approverRoleKeys)
        }

        return statement.query { rs, _ -> rs.toApprovalInboxRecord() }.list()
    }
}

data class CreateApprovalRequestCommand(
    val id: String,
    val tenantId: String,
    val opportunityId: String,
    val requestType: String,
    val policyKey: String,
    val policyVersion: Int,
    val status: String,
    val businessJustification: String?,
    val opportunitySnapshotJson: String,
    val submittedByUserId: String,
    val submittedAt: Instant?,
    val resolvedAt: Instant?,
    val createdByUserId: String,
    val updatedByUserId: String,
)

data class CreateApprovalStepCommand(
    val id: String,
    val tenantId: String,
    val approvalRequestId: String,
    val stepOrder: Int,
    val approverRoleKey: String,
    val assignedApproverUserId: String?,
    val status: String,
    val isRequired: Boolean,
    val activatedAt: Instant?,
    val decidedAt: Instant?,
    val dueAt: Instant?,
)

data class AppendApprovalHistoryCommand(
    val id: String,
    val tenantId: String,
    val approvalRequestId: String,
    val approvalStepId: String?,
    val actorUserId: String,
    val eventType: String,
    val fromStatus: String?,
    val toStatus: String,
    val comment: String?,
    val decisionPayloadJson: String,
)

data class UpdateApprovalRequestStatusCommand(
    val tenantId: String,
    val approvalRequestId: String,
    val status: String,
    val resolvedAt: Instant?,
    val updatedByUserId: String,
)

data class UpdateApprovalStepStatusCommand(
    val tenantId: String,
    val approvalRequestId: String,
    val approvalStepId: String,
    val status: String,
    val activatedAt: Instant?,
    val decidedAt: Instant?,
)

data class ApprovalInboxFilter(
    val tenantId: String,
    val approverUserId: String,
    val approverRoleKeys: List<String>,
    val includeTenantWideScope: Boolean,
)

data class ApprovalRequestRecord(
    val id: String,
    val tenantId: String,
    val opportunityId: String,
    val requestType: String,
    val policyKey: String,
    val policyVersion: Int,
    val status: String,
    val businessJustification: String?,
    val opportunitySnapshotJson: String,
    val submittedByUserId: String,
    val submittedByName: String,
    val submittedAt: Instant?,
    val resolvedAt: Instant?,
)

data class ApprovalStepRecord(
    val id: String,
    val approvalRequestId: String,
    val stepOrder: Int,
    val approverRoleKey: String,
    val assignedApproverUserId: String?,
    val assignedApproverName: String?,
    val status: String,
    val isRequired: Boolean,
    val activatedAt: Instant?,
    val decidedAt: Instant?,
    val dueAt: Instant?,
)

data class ApprovalHistoryRecord(
    val id: String,
    val approvalRequestId: String,
    val approvalStepId: String?,
    val actorUserId: String,
    val actorName: String,
    val eventType: String,
    val fromStatus: String?,
    val toStatus: String,
    val comment: String?,
    val decisionPayloadJson: String,
    val createdAt: Instant,
)

data class ApprovalInboxRecord(
    val approvalRequestId: String,
    val opportunityId: String,
    val opportunityTitle: String,
    val accountName: String,
    val requestType: String,
    val policyKey: String,
    val requestStatus: String,
    val activeStepId: String,
    val activeStepStatus: String,
    val approverRoleKey: String,
    val submittedByUserId: String,
    val submittedByName: String,
    val submittedAt: Instant?,
)

private fun ResultSet.toApprovalRequestRecord(): ApprovalRequestRecord =
    ApprovalRequestRecord(
        id = getString("id"),
        tenantId = getString("tenant_id"),
        opportunityId = getString("opportunity_id"),
        requestType = getString("request_type"),
        policyKey = getString("policy_key"),
        policyVersion = getInt("policy_version"),
        status = getString("status"),
        businessJustification = getString("business_justification"),
        opportunitySnapshotJson = getString("opportunity_snapshot_json"),
        submittedByUserId = getString("submitted_by_user_id"),
        submittedByName = getString("submitted_by_name"),
        submittedAt = getInstant("submitted_at"),
        resolvedAt = getInstant("resolved_at"),
    )

private fun ResultSet.toApprovalStepRecord(): ApprovalStepRecord =
    ApprovalStepRecord(
        id = getString("id"),
        approvalRequestId = getString("approval_request_id"),
        stepOrder = getInt("step_order"),
        approverRoleKey = getString("approver_role_key"),
        assignedApproverUserId = getString("assigned_approver_user_id"),
        assignedApproverName = getString("assigned_approver_name"),
        status = getString("status"),
        isRequired = getBoolean("is_required"),
        activatedAt = getInstant("activated_at"),
        decidedAt = getInstant("decided_at"),
        dueAt = getInstant("due_at"),
    )

private fun ResultSet.toApprovalHistoryRecord(): ApprovalHistoryRecord =
    ApprovalHistoryRecord(
        id = getString("id"),
        approvalRequestId = getString("approval_request_id"),
        approvalStepId = getString("approval_step_id"),
        actorUserId = getString("actor_user_id"),
        actorName = getString("actor_name"),
        eventType = getString("event_type"),
        fromStatus = getString("from_status"),
        toStatus = getString("to_status"),
        comment = getString("comment"),
        decisionPayloadJson = getString("decision_payload_json"),
        createdAt = checkNotNull(getInstant("created_at")),
    )

private fun ResultSet.toApprovalInboxRecord(): ApprovalInboxRecord =
    ApprovalInboxRecord(
        approvalRequestId = getString("approval_request_id"),
        opportunityId = getString("opportunity_id"),
        opportunityTitle = getString("opportunity_title"),
        accountName = getString("account_name"),
        requestType = getString("request_type"),
        policyKey = getString("policy_key"),
        requestStatus = getString("request_status"),
        activeStepId = getString("active_step_id"),
        activeStepStatus = getString("active_step_status"),
        approverRoleKey = getString("approver_role_key"),
        submittedByUserId = getString("submitted_by_user_id"),
        submittedByName = getString("submitted_by_name"),
        submittedAt = getInstant("submitted_at"),
    )

private fun ResultSet.getInstant(columnLabel: String): Instant? =
    getObject(columnLabel, OffsetDateTime::class.java)?.toInstant()

private fun Instant?.toDbTimestamp(): OffsetDateTime? =
    this?.atOffset(ZoneOffset.UTC)
