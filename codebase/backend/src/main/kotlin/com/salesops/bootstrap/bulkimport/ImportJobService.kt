package com.salesops.bootstrap.bulkimport

import com.salesops.bootstrap.api.ForbiddenOperationException
import com.salesops.bootstrap.api.ValidationFailureException
import com.salesops.bootstrap.auth.CurrentUserContext
import com.salesops.bootstrap.crm.account.AccountImportLookup
import com.salesops.bootstrap.crm.account.AccountRepository
import com.salesops.bootstrap.crm.opportunity.OpportunityRepository
import com.salesops.bootstrap.metadata.MetadataRuntimeService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
import java.math.BigDecimal
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.util.UUID

@Service
class ImportJobService(
    private val importJobRepository: ImportJobRepository,
    private val accountRepository: AccountRepository,
    private val opportunityRepository: OpportunityRepository,
    private val metadataRuntimeService: MetadataRuntimeService,
    private val importJobWorker: ImportJobWorker,
) {
    @Transactional
    fun createPreview(
        context: CurrentUserContext,
        request: CreateImportPreviewRequest,
    ): ImportPreviewResponse {
        assertCanCreateImportJobs(context)

        val entityType = request.entityType.trim().lowercase()
        if (entityType !in supportedImportEntityTypes) {
            throw ValidationFailureException("Only account, contact and opportunity import preview are supported")
        }

        val fileName = request.fileName.trim()
        if (fileName.isEmpty()) {
            throw ValidationFailureException("Import file name is required")
        }

        val parsedCsv = CsvPreviewParser.parse(request.csvContent)
        if (parsedCsv.headers.isEmpty()) {
            throw ValidationFailureException("CSV must include a header row")
        }

        val mapping = normalizeMapping(
            entityType = entityType,
            sourceColumns = parsedCsv.headers,
            requestedMapping = request.mapping,
            tenantId = context.tenant.tenantId,
        )
        val previewRows = parsedCsv.rows.mapIndexed { index, rowValues ->
            previewRow(
                entityType = entityType,
                tenantId = context.tenant.tenantId,
                rowNumber = index + 2,
                sourceColumns = parsedCsv.headers,
                rowValues = rowValues,
                mapping = mapping,
            )
        }
        val validRows = previewRows.count { it.validationErrors.isEmpty() }
        val invalidRows = previewRows.size - validRows

        val jobId = "ij_${UUID.randomUUID().toString().replace("-", "").take(12)}"
        val job = importJobRepository.createPreview(
            CreateImportJobCommand(
                id = jobId,
                tenantId = context.tenant.tenantId,
                entityType = entityType,
                originalFileName = fileName,
                sourceColumns = parsedCsv.headers,
                mappingConfig = mapping,
                totalRows = previewRows.size,
                validRows = validRows,
                invalidRows = invalidRows,
                createdByUserId = context.userId,
                rows = previewRows.map { row ->
                    CreateImportJobRowCommand(
                        id = "ijr_${UUID.randomUUID().toString().replace("-", "").take(12)}",
                        rowNumber = row.rowNumber,
                        sourceData = row.sourceData,
                        previewData = row.previewData,
                        validationErrors = row.validationErrors,
                    )
                },
            ),
        )

        return ImportPreviewResponse(
            job = ImportJobItem(
                id = job.id,
                entityType = job.entityType,
                status = job.status,
                originalFileName = job.originalFileName,
                totalRows = job.totalRows,
                validRows = job.validRows,
                invalidRows = job.invalidRows,
                executedRows = job.executedRows,
                skippedRows = job.skippedRows,
                createdAt = job.createdAt,
                startedAt = job.startedAt,
                executedAt = job.executedAt,
            ),
            sourceColumns = parsedCsv.headers,
            rows = previewRows.map { row ->
                ImportPreviewRowItem(
                    rowNumber = row.rowNumber,
                    sourceData = row.sourceData,
                    previewData = row.previewData,
                    valid = row.validationErrors.isEmpty(),
                    validationErrors = row.validationErrors,
                )
            },
        )
    }

    fun getJob(
        context: CurrentUserContext,
        importJobId: String,
    ): ImportJobDetailResponse {
        assertCanCreateImportJobs(context)

        val job = importJobRepository.findJob(
            tenantId = context.tenant.tenantId,
            importJobId = importJobId,
        ) ?: throw ValidationFailureException("Import job does not exist")

        val rows = importJobRepository.listRows(
            tenantId = context.tenant.tenantId,
            importJobId = job.id,
        )

        return job.toDetailResponse(rows)
    }

    @Transactional
    fun executeJob(
        context: CurrentUserContext,
        importJobId: String,
    ): ImportJobDetailResponse {
        assertCanCreateImportJobs(context)

        val job = importJobRepository.findJob(
            tenantId = context.tenant.tenantId,
            importJobId = importJobId,
        ) ?: throw ValidationFailureException("Import job does not exist")

        if (job.entityType !in supportedImportEntityTypes) {
            throw ValidationFailureException("Only account, contact and opportunity import execution are supported")
        }

        if (job.status != "previewed") {
            throw ValidationFailureException("Import job is not in previewed status")
        }

        val updated = importJobRepository.markJobQueued(
            tenantId = context.tenant.tenantId,
            importJobId = job.id,
            executedByUserId = context.userId,
        )
        if (!updated) {
            throw ValidationFailureException("Import job execution was not enqueued")
        }

        runAfterCommit {
            importJobWorker.enqueue(
                tenantId = context.tenant.tenantId,
                importJobId = job.id,
            )
        }

        return getJob(context = context, importJobId = job.id)
    }

    private fun assertCanCreateImportJobs(context: CurrentUserContext) {
        if (context.roleKey != "revops_admin") {
            throw ForbiddenOperationException("Current role cannot create import jobs")
        }
    }

    private fun normalizeMapping(
        entityType: String,
        sourceColumns: List<String>,
        requestedMapping: Map<String, String>,
        tenantId: String,
    ): Map<String, String> {
        val sourceColumnSet = sourceColumns.toSet()
        val allowedTargets = importTargetFields(entityType = entityType, tenantId = tenantId)
        val mapping = if (requestedMapping.isEmpty()) {
            sourceColumns.mapNotNull { sourceColumn ->
                val inferredTarget = inferTargetField(entityType = entityType, sourceColumn = sourceColumn)
                if (inferredTarget == null) null else sourceColumn to inferredTarget
            }.toMap()
        } else {
            requestedMapping
                .mapKeys { (sourceColumn, _) -> sourceColumn.trim() }
                .mapValues { (_, targetField) -> targetField.trim() }
                .filterKeys { it.isNotEmpty() }
                .filterValues { it.isNotEmpty() }
        }

        mapping.keys
            .filter { it !in sourceColumnSet }
            .sorted()
            .takeIf { it.isNotEmpty() }
            ?.let { unknownColumns ->
                throw ValidationFailureException("Mapping references unknown source columns: ${unknownColumns.joinToString(", ")}")
            }

        mapping.values
            .filter { it !in allowedTargets }
            .sorted()
            .takeIf { it.isNotEmpty() }
            ?.let { unknownTargets ->
                throw ValidationFailureException("Mapping references unsupported $entityType fields: ${unknownTargets.joinToString(", ")}")
            }

        when (entityType) {
            "account" -> {
                if ("name" !in mapping.values) {
                    throw ValidationFailureException("Account import mapping must include target field name")
                }
            }
            "contact" -> {
                if ("fullName" !in mapping.values) {
                    throw ValidationFailureException("Contact import mapping must include target field fullName")
                }
                if ("accountId" !in mapping.values && "accountName" !in mapping.values) {
                    throw ValidationFailureException("Contact import mapping must include accountId or accountName")
                }
            }
            "opportunity" -> {
                if ("title" !in mapping.values) {
                    throw ValidationFailureException("Opportunity import mapping must include target field title")
                }
                if ("accountId" !in mapping.values && "accountName" !in mapping.values) {
                    throw ValidationFailureException("Opportunity import mapping must include accountId or accountName")
                }
                if ("stageKey" !in mapping.values) {
                    throw ValidationFailureException("Opportunity import mapping must include target field stageKey")
                }
            }
        }

        return mapping
    }

    private fun importTargetFields(entityType: String, tenantId: String): Set<String> {
        if (entityType == "contact") {
            return setOf("fullName", "email", "phone", "accountId", "accountName")
        }
        if (entityType == "opportunity") {
            return setOf("title", "accountId", "accountName", "stageKey", "expectedAmount", "closeDate")
        }

        val publishedSnapshot = metadataRuntimeService.loadPublishedSnapshot(tenantId)
        val customAccountFields = publishedSnapshot.fields
            .filter { it.entityType == "account" }
            .map { it.fieldKey }
            .toSet()

        return setOf("name", "website") + customAccountFields
    }

    private fun inferTargetField(entityType: String, sourceColumn: String): String? {
        val normalized = sourceColumn.trim().lowercase().replace(" ", "_")
        return when (entityType) {
            "account" -> when (normalized) {
                "name", "account_name", "company", "company_name" -> "name"
                "website", "web_site", "url" -> "website"
                else -> null
            }
            "contact" -> when (normalized) {
                "full_name", "contact_name", "name" -> "fullName"
                "email", "email_address" -> "email"
                "phone", "phone_number" -> "phone"
                "account_id", "company_id" -> "accountId"
                "account_name", "company", "company_name" -> "accountName"
                else -> null
            }
            "opportunity" -> when (normalized) {
                "title", "opportunity", "opportunity_name", "name" -> "title"
                "account_id", "company_id" -> "accountId"
                "account_name", "company", "company_name" -> "accountName"
                "stage", "stage_key", "pipeline_stage" -> "stageKey"
                "expected_amount", "amount", "value" -> "expectedAmount"
                "close_date", "close" -> "closeDate"
                else -> null
            }
            else -> null
        }
    }

    private fun previewRow(
        entityType: String,
        tenantId: String,
        rowNumber: Int,
        sourceColumns: List<String>,
        rowValues: List<String>,
        mapping: Map<String, String>,
    ): ParsedPreviewRow {
        val sourceData = sourceColumns.mapIndexed { index, sourceColumn ->
            sourceColumn to rowValues.getOrElse(index) { "" }
        }.toMap()
        val previewData = mapping.entries.associate { (sourceColumn, targetField) ->
            targetField to sourceData.getValue(sourceColumn).trim().takeIf { it.isNotEmpty() }
        }
        val validationErrors = mutableListOf<String>()

        if (rowValues.size > sourceColumns.size) {
            validationErrors += "Row has more values than the header"
        }

        when (entityType) {
            "account" -> {
                if (previewData["name"].isMissingImportValue()) {
                    validationErrors += "Account name is required"
                }
            }
            "contact" -> {
                if (previewData["fullName"].isMissingImportValue()) {
                    validationErrors += "Contact full name is required"
                }

                val accountId = previewData["accountId"]?.toString()?.trim()?.takeIf { it.isNotEmpty() }
                val accountName = previewData["accountName"]?.toString()?.trim()?.takeIf { it.isNotEmpty() }
                val account = accountRepository.findTenantAccountForImport(
                    AccountImportLookup(
                        tenantId = tenantId,
                        accountId = accountId,
                        accountName = accountName,
                    ),
                )
                if (account == null) {
                    validationErrors += "Account reference does not resolve"
                }
                if (account != null) {
                    val mutablePreviewData = previewData.toMutableMap()
                    mutablePreviewData["accountId"] = account.id
                    mutablePreviewData["accountName"] = account.name
                    return ParsedPreviewRow(
                        rowNumber = rowNumber,
                        sourceData = sourceData,
                        previewData = mutablePreviewData,
                        validationErrors = validationErrors,
                    )
                }
            }
            "opportunity" -> {
                if (previewData["title"].isMissingImportValue()) {
                    validationErrors += "Opportunity title is required"
                }

                val accountId = previewData["accountId"]?.toString()?.trim()?.takeIf { it.isNotEmpty() }
                val accountName = previewData["accountName"]?.toString()?.trim()?.takeIf { it.isNotEmpty() }
                val account = accountRepository.findTenantAccountForImport(
                    AccountImportLookup(
                        tenantId = tenantId,
                        accountId = accountId,
                        accountName = accountName,
                    ),
                )
                if (account == null) {
                    validationErrors += "Account reference does not resolve"
                }

                val stageKey = previewData["stageKey"]?.toString()?.trim()?.takeIf { it.isNotEmpty() }
                if (stageKey == null) {
                    validationErrors += "Opportunity stage key is required"
                } else if (opportunityRepository.findStageByKey(tenantId = tenantId, stageKey = stageKey) == null) {
                    validationErrors += "Opportunity stage key does not exist"
                }

                val expectedAmount = previewData["expectedAmount"]?.toString()?.trim()?.takeIf { it.isNotEmpty() }
                if (expectedAmount != null && expectedAmount.toBigDecimalOrNull() == null) {
                    validationErrors += "Expected amount must be a number"
                }

                val closeDate = previewData["closeDate"]?.toString()?.trim()?.takeIf { it.isNotEmpty() }
                if (closeDate != null && closeDate.toLocalDateOrNull() == null) {
                    validationErrors += "Close date must use ISO format yyyy-MM-dd"
                }

                if (account != null || stageKey != null || expectedAmount != null || closeDate != null) {
                    val mutablePreviewData = previewData.toMutableMap()
                    if (account != null) {
                        mutablePreviewData["accountId"] = account.id
                        mutablePreviewData["accountName"] = account.name
                    }
                    if (stageKey != null) {
                        mutablePreviewData["stageKey"] = stageKey
                    }
                    if (expectedAmount != null && expectedAmount.toBigDecimalOrNull() != null) {
                        mutablePreviewData["expectedAmount"] = expectedAmount.toBigDecimalOrNull()!!.toPlainString()
                    }
                    if (closeDate != null && closeDate.toLocalDateOrNull() != null) {
                        mutablePreviewData["closeDate"] = closeDate
                    }
                    return ParsedPreviewRow(
                        rowNumber = rowNumber,
                        sourceData = sourceData,
                        previewData = mutablePreviewData,
                        validationErrors = validationErrors,
                    )
                }
            }
        }

        return ParsedPreviewRow(
            rowNumber = rowNumber,
            sourceData = sourceData,
            previewData = previewData,
            validationErrors = validationErrors,
        )
    }
}

private fun runAfterCommit(action: () -> Unit) {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
        action()
        return
    }

    TransactionSynchronizationManager.registerSynchronization(
        object : TransactionSynchronization {
            override fun afterCommit() {
                action()
            }
        },
    )
}

private fun ImportJobRecord.toDetailResponse(rows: List<ImportJobRowRecord>): ImportJobDetailResponse =
    ImportJobDetailResponse(
        job = ImportJobItem(
            id = id,
            entityType = entityType,
            status = status,
            originalFileName = originalFileName,
            totalRows = totalRows,
            validRows = validRows,
            invalidRows = invalidRows,
            executedRows = executedRows,
            skippedRows = skippedRows,
            createdAt = createdAt,
            startedAt = startedAt,
            executedAt = executedAt,
        ),
        sourceColumns = sourceColumns,
        rows = rows.map { row ->
            ImportJobRowItem(
                rowNumber = row.rowNumber,
                sourceData = row.sourceData,
                previewData = row.previewData,
                valid = row.validationErrors.isEmpty(),
                validationErrors = row.validationErrors,
                executionStatus = row.executionStatus,
                createdRecordId = row.createdRecordId,
                executionErrors = row.executionErrors,
            )
        },
    )

private data class ParsedCsv(
    val headers: List<String>,
    val rows: List<List<String>>,
)

private data class ParsedPreviewRow(
    val rowNumber: Int,
    val sourceData: Map<String, String>,
    val previewData: Map<String, Any?>,
    val validationErrors: List<String>,
)

private object CsvPreviewParser {
    fun parse(csvContent: String): ParsedCsv {
        if (csvContent.isBlank()) {
            throw ValidationFailureException("CSV content is required")
        }

        val records = parseRecords(csvContent.trimStart('\uFEFF'))
            .filter { record -> record.any { it.isNotBlank() } }
        if (records.isEmpty()) {
            throw ValidationFailureException("CSV must include a header row")
        }

        val headers = records.first().map { it.trim() }
        if (headers.any { it.isEmpty() }) {
            throw ValidationFailureException("CSV header columns cannot be blank")
        }

        if (headers.toSet().size != headers.size) {
            throw ValidationFailureException("CSV header columns must be unique")
        }

        return ParsedCsv(headers = headers, rows = records.drop(1))
    }

    private fun parseRecords(csvContent: String): List<List<String>> {
        val records = mutableListOf<MutableList<String>>()
        var currentRecord = mutableListOf<String>()
        val currentField = StringBuilder()
        var inQuotes = false
        var index = 0

        while (index < csvContent.length) {
            val char = csvContent[index]
            when {
                char == '"' && inQuotes && index + 1 < csvContent.length && csvContent[index + 1] == '"' -> {
                    currentField.append('"')
                    index += 1
                }
                char == '"' -> inQuotes = !inQuotes
                char == ',' && !inQuotes -> {
                    currentRecord += currentField.toString()
                    currentField.clear()
                }
                (char == '\n' || char == '\r') && !inQuotes -> {
                    if (char == '\r' && index + 1 < csvContent.length && csvContent[index + 1] == '\n') {
                        index += 1
                    }
                    currentRecord += currentField.toString()
                    records += currentRecord
                    currentRecord = mutableListOf()
                    currentField.clear()
                }
                else -> currentField.append(char)
            }
            index += 1
        }

        if (inQuotes) {
            throw ValidationFailureException("CSV contains an unterminated quoted value")
        }

        currentRecord += currentField.toString()
        records += currentRecord

        return records
    }
}

private fun Any?.isMissingImportValue(): Boolean =
    this == null || (this is String && isBlank())

private val supportedImportEntityTypes = setOf("account", "contact", "opportunity")

private fun String.toBigDecimalOrNull(): BigDecimal? =
    try {
        BigDecimal(this)
    } catch (_: NumberFormatException) {
        null
    }

private fun String.toLocalDateOrNull(): LocalDate? =
    try {
        LocalDate.parse(this)
    } catch (_: DateTimeParseException) {
        null
    }
