package com.salesops.bootstrap.bulkimport

import java.time.Instant

data class CreateImportPreviewRequest(
    val entityType: String = "account",
    val fileName: String,
    val csvContent: String,
    val mapping: Map<String, String> = emptyMap(),
)

data class ImportPreviewResponse(
    val job: ImportJobItem,
    val sourceColumns: List<String>,
    val rows: List<ImportPreviewRowItem>,
)

data class ImportJobItem(
    val id: String,
    val entityType: String,
    val status: String,
    val originalFileName: String,
    val totalRows: Int,
    val validRows: Int,
    val invalidRows: Int,
    val executedRows: Int,
    val skippedRows: Int,
    val createdAt: Instant,
    val startedAt: Instant? = null,
    val executedAt: Instant? = null,
)

data class ImportPreviewRowItem(
    val rowNumber: Int,
    val sourceData: Map<String, String>,
    val previewData: Map<String, Any?>,
    val valid: Boolean,
    val validationErrors: List<String>,
)

data class ImportJobDetailResponse(
    val job: ImportJobItem,
    val sourceColumns: List<String>,
    val rows: List<ImportJobRowItem>,
)

data class ImportJobRowItem(
    val rowNumber: Int,
    val sourceData: Map<String, String>,
    val previewData: Map<String, Any?>,
    val valid: Boolean,
    val validationErrors: List<String>,
    val executionStatus: String,
    val createdRecordId: String?,
    val executionErrors: List<String>,
)
