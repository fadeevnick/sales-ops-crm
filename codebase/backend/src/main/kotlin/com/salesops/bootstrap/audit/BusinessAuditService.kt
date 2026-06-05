package com.salesops.bootstrap.audit

import com.salesops.bootstrap.api.ForbiddenOperationException
import com.salesops.bootstrap.api.ValidationFailureException
import com.salesops.bootstrap.auth.CurrentUserContext
import org.springframework.stereotype.Service

@Service
class BusinessAuditService(
    private val businessAuditRepository: BusinessAuditRepository,
) {
    fun listRecentEvents(context: CurrentUserContext, limit: Int?): BusinessAuditListResponse {
        if (context.roleKey != "revops_admin") {
            throw ForbiddenOperationException("Current role cannot read business audit events")
        }

        val resolvedLimit = limit ?: 50
        if (resolvedLimit !in 1..200) {
            throw ValidationFailureException("Audit event limit must be between 1 and 200")
        }

        return BusinessAuditListResponse(
            events = businessAuditRepository.listRecent(
                BusinessAuditListQuery(
                    tenantId = context.tenant.tenantId,
                    limit = resolvedLimit,
                ),
            ).map { it.toItem() },
        )
    }

    private fun BusinessAuditEventRecord.toItem(): BusinessAuditEventItem =
        BusinessAuditEventItem(
            id = id,
            eventType = eventType,
            entityType = entityType,
            entityId = entityId,
            summary = summary,
            details = details,
            actorUserId = actorUserId,
            actorName = actorName,
            createdAt = createdAt,
        )
}
