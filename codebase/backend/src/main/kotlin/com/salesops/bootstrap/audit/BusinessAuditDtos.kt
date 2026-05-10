package com.salesops.bootstrap.audit

import java.time.Instant

data class BusinessAuditListResponse(
    val events: List<BusinessAuditEventItem>,
)

data class BusinessAuditEventItem(
    val id: String,
    val eventType: String,
    val entityType: String,
    val entityId: String,
    val summary: String,
    val details: Map<String, Any?>,
    val actorUserId: String,
    val actorName: String,
    val createdAt: Instant,
)
