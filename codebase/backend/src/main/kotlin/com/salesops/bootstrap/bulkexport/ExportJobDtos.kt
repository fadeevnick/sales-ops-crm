package com.salesops.bootstrap.bulkexport

import java.time.Instant

data class CreateExportJobRequest(
    val entityType: String = "account",
    val query: String? = null,
    val ownerId: String? = null,
    val stageKey: String? = null,
    val limit: Int? = null,
)

data class ExportJobResponse(
    val job: ExportJobItem,
    val csvContent: String,
)

data class ExportJobItem(
    val id: String,
    val entityType: String,
    val status: String,
    val criteria: Map<String, Any?>,
    val rowCount: Int,
    val createdAt: Instant,
    val completedAt: Instant?,
)
