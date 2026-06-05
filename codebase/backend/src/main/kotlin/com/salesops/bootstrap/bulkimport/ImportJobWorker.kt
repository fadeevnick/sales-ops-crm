package com.salesops.bootstrap.bulkimport

import com.salesops.bootstrap.crm.account.AccountRepository
import com.salesops.bootstrap.crm.account.CreateAccountCommand
import com.salesops.bootstrap.crm.account.UpsertAccountCustomFieldValueCommand
import com.salesops.bootstrap.crm.contact.ContactRepository
import com.salesops.bootstrap.crm.contact.CreateContactCommand
import com.salesops.bootstrap.crm.opportunity.CreateOpportunityCommand
import com.salesops.bootstrap.crm.opportunity.OpportunityRepository
import com.salesops.bootstrap.metadata.MetadataRuntimeService
import com.salesops.bootstrap.metadata.PublishedMetadataRuntimeFieldDefinition
import com.salesops.bootstrap.metadata.PublishedMetadataRuntimeSnapshot
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.core.task.TaskExecutor
import org.springframework.stereotype.Component
import org.springframework.transaction.support.TransactionTemplate
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Component
class ImportJobWorker(
    private val importJobRepository: ImportJobRepository,
    private val accountRepository: AccountRepository,
    private val contactRepository: ContactRepository,
    private val opportunityRepository: OpportunityRepository,
    private val metadataRuntimeService: MetadataRuntimeService,
    private val transactionTemplate: TransactionTemplate,
    @Qualifier("bulkJobTaskExecutor") private val taskExecutor: TaskExecutor,
) {
    fun enqueue(tenantId: String, importJobId: String) {
        taskExecutor.execute {
            process(tenantId = tenantId, importJobId = importJobId)
        }
    }

    private fun process(tenantId: String, importJobId: String) {
        transactionTemplate.executeWithoutResult {
            val started = importJobRepository.markJobRunning(
                tenantId = tenantId,
                importJobId = importJobId,
            )
            if (!started) {
                return@executeWithoutResult
            }

            try {
                processRunningJob(tenantId = tenantId, importJobId = importJobId)
            } catch (error: RuntimeException) {
                importJobRepository.markJobFailed(
                    tenantId = tenantId,
                    importJobId = importJobId,
                    failureMessage = error.message ?: "Import job failed",
                )
            }
        }
    }

    private fun processRunningJob(tenantId: String, importJobId: String) {
        val job = importJobRepository.findJob(
            tenantId = tenantId,
            importJobId = importJobId,
        ) ?: throw IllegalStateException("Import job does not exist")

        val executingUserId = job.executedByUserId
            ?: throw IllegalStateException("Import job does not have an executing user")
        val rows = importJobRepository.listRows(
            tenantId = tenantId,
            importJobId = job.id,
        )
        var executedRows = 0
        var skippedRows = 0

        rows.forEach { row ->
            if (row.validationErrors.isNotEmpty()) {
                skippedRows += 1
                importJobRepository.updateRowExecution(
                    UpdateImportJobRowExecutionCommand(
                        tenantId = tenantId,
                        rowId = row.id,
                        executionStatus = "skipped",
                        createdRecordId = null,
                        executionErrors = row.validationErrors,
                    ),
                )
                return@forEach
            }

            try {
                val createdRecordId = when (job.entityType) {
                    "account" -> createAccount(
                        tenantId = tenantId,
                        executingUserId = executingUserId,
                        row = row,
                    )
                    "contact" -> createContact(
                        tenantId = tenantId,
                        executingUserId = executingUserId,
                        row = row,
                    )
                    "opportunity" -> createOpportunity(
                        tenantId = tenantId,
                        executingUserId = executingUserId,
                        row = row,
                    )
                    else -> throw IllegalStateException("Only account, contact and opportunity import execution is supported")
                }
                executedRows += 1
                importJobRepository.updateRowExecution(
                    UpdateImportJobRowExecutionCommand(
                        tenantId = tenantId,
                        rowId = row.id,
                        executionStatus = "created",
                        createdRecordId = createdRecordId,
                        executionErrors = emptyList(),
                    ),
                )
            } catch (error: RuntimeException) {
                skippedRows += 1
                importJobRepository.updateRowExecution(
                    UpdateImportJobRowExecutionCommand(
                        tenantId = tenantId,
                        rowId = row.id,
                        executionStatus = "failed",
                        createdRecordId = null,
                        executionErrors = listOf(error.message ?: "Import row failed"),
                    ),
                )
            }
        }

        val completed = importJobRepository.markJobExecuted(
            tenantId = tenantId,
            importJobId = job.id,
            executedRows = executedRows,
            skippedRows = skippedRows,
        )
        if (!completed) {
            throw IllegalStateException("Import job execution was not completed")
        }
    }

    private fun createAccount(
        tenantId: String,
        executingUserId: String,
        row: ImportJobRowRecord,
    ): String {
        val accountName = row.previewData["name"]?.toString()?.trim()
        if (accountName.isNullOrBlank()) {
            throw IllegalStateException("Account name is required")
        }

        val accountId = "acc_${UUID.randomUUID().toString().replace("-", "").take(12)}"

        accountRepository.create(
            CreateAccountCommand(
                id = accountId,
                tenantId = tenantId,
                name = accountName,
                website = row.previewData["website"]?.toString()?.trim()?.takeIf { it.isNotEmpty() },
                ownerUserId = executingUserId,
                createdByUserId = executingUserId,
                updatedByUserId = executingUserId,
            ),
        )

        val publishedSnapshot = metadataRuntimeService.loadPublishedSnapshot(tenantId)
        saveAccountCustomFieldValues(
            tenantId = tenantId,
            accountId = accountId,
            executingUserId = executingUserId,
            publishedSnapshot = publishedSnapshot,
            previewData = row.previewData,
        )

        return accountId
    }

    private fun saveAccountCustomFieldValues(
        tenantId: String,
        accountId: String,
        executingUserId: String,
        publishedSnapshot: PublishedMetadataRuntimeSnapshot,
        previewData: Map<String, Any?>,
    ) {
        val accountFieldsByKey = publishedSnapshot.fields
            .filter { it.entityType == "account" }
            .associateBy { it.fieldKey }

        val standardFields = setOf("name", "website")
        val customFieldCommands = previewData
            .filterKeys { it !in standardFields && it in accountFieldsByKey }
            .mapNotNull { (fieldKey, rawValue) ->
                val field = accountFieldsByKey[fieldKey]!!
                val normalizedValue = normalizeAccountCustomFieldValue(field, rawValue) ?: return@mapNotNull null

                UpsertAccountCustomFieldValueCommand(
                    id = "mcfv_${UUID.randomUUID().toString().replace("-", "").take(12)}",
                    tenantId = tenantId,
                    accountId = accountId,
                    fieldKey = field.fieldKey,
                    fieldType = field.fieldType,
                    valueText = normalizedValue.valueText,
                    valueNumber = normalizedValue.valueNumber,
                    valueDate = normalizedValue.valueDate,
                    valueBoolean = normalizedValue.valueBoolean,
                    publishedVersionNumber = publishedSnapshot.versionNumber,
                    createdByUserId = executingUserId,
                    updatedByUserId = executingUserId,
                )
            }

        if (customFieldCommands.isNotEmpty()) {
            accountRepository.upsertCustomFieldValues(customFieldCommands)
        }
    }

    private fun normalizeAccountCustomFieldValue(
        field: PublishedMetadataRuntimeFieldDefinition,
        rawValue: Any?,
    ): NormalizedAccountCustomFieldValue? {
        if (rawValue == null) {
            return null
        }

        val stringValue = rawValue.toString().trim()
        if (stringValue.isEmpty()) {
            return null
        }

        return when (field.fieldType) {
            "text", "long_text" -> NormalizedAccountCustomFieldValue(
                fieldType = field.fieldType,
                valueText = stringValue,
            )
            "single_select" -> {
                val allowedValues = field.selectOptions.map { it.value }.toSet()
                if (stringValue !in allowedValues) {
                    throw IllegalStateException("Custom field '${field.fieldKey}' value is not an allowed option")
                }
                NormalizedAccountCustomFieldValue(
                    fieldType = field.fieldType,
                    valueText = stringValue,
                )
            }
            "number", "currency" -> {
                val number = try {
                    BigDecimal(stringValue)
                } catch (_: NumberFormatException) {
                    throw IllegalStateException("Custom field '${field.fieldKey}' must be a number")
                }
                NormalizedAccountCustomFieldValue(
                    fieldType = field.fieldType,
                    valueNumber = number,
                )
            }
            "date" -> {
                val date = try {
                    LocalDate.parse(stringValue)
                } catch (_: RuntimeException) {
                    throw IllegalStateException("Custom field '${field.fieldKey}' must use ISO format yyyy-MM-dd")
                }
                NormalizedAccountCustomFieldValue(
                    fieldType = field.fieldType,
                    valueDate = date,
                )
            }
            "boolean" -> {
                val boolValue = when (stringValue.lowercase()) {
                    "true" -> true
                    "false" -> false
                    else -> throw IllegalStateException("Custom field '${field.fieldKey}' must be a boolean (true/false)")
                }
                NormalizedAccountCustomFieldValue(
                    fieldType = field.fieldType,
                    valueBoolean = boolValue,
                )
            }
            else -> throw IllegalStateException("Custom field '${field.fieldKey}' type '${field.fieldType}' is not supported")
        }
    }

    private fun createContact(
        tenantId: String,
        executingUserId: String,
        row: ImportJobRowRecord,
    ): String {
        val fullName = row.previewData["fullName"]?.toString()?.trim()
        val accountId = row.previewData["accountId"]?.toString()?.trim()
        if (fullName.isNullOrBlank()) {
            throw IllegalStateException("Contact full name is required")
        }
        if (accountId.isNullOrBlank()) {
            throw IllegalStateException("Account reference does not resolve")
        }

        return contactRepository.create(
            CreateContactCommand(
                id = "con_${UUID.randomUUID().toString().replace("-", "").take(12)}",
                tenantId = tenantId,
                accountId = accountId,
                fullName = fullName,
                email = row.previewData["email"]?.toString()?.trim()?.takeIf { it.isNotEmpty() },
                phone = row.previewData["phone"]?.toString()?.trim()?.takeIf { it.isNotEmpty() },
                ownerUserId = executingUserId,
                createdByUserId = executingUserId,
                updatedByUserId = executingUserId,
            ),
        )
    }

    private fun createOpportunity(
        tenantId: String,
        executingUserId: String,
        row: ImportJobRowRecord,
    ): String {
        val title = row.previewData["title"]?.toString()?.trim()
        val accountId = row.previewData["accountId"]?.toString()?.trim()
        val stageKey = row.previewData["stageKey"]?.toString()?.trim()
        if (title.isNullOrBlank()) {
            throw IllegalStateException("Opportunity title is required")
        }
        if (accountId.isNullOrBlank()) {
            throw IllegalStateException("Account reference does not resolve")
        }
        if (stageKey.isNullOrBlank()) {
            throw IllegalStateException("Opportunity stage key is required")
        }

        val stage = opportunityRepository.findStageByKey(
            tenantId = tenantId,
            stageKey = stageKey,
        ) ?: throw IllegalStateException("Opportunity stage key does not exist")

        val expectedAmount = row.previewData["expectedAmount"]?.toString()?.trim()?.takeIf { it.isNotEmpty() }?.let {
            try {
                BigDecimal(it)
            } catch (_: NumberFormatException) {
                throw IllegalStateException("Expected amount must be a number")
            }
        }
        val closeDate = row.previewData["closeDate"]?.toString()?.trim()?.takeIf { it.isNotEmpty() }?.let {
            try {
                LocalDate.parse(it)
            } catch (_: RuntimeException) {
                throw IllegalStateException("Close date must use ISO format yyyy-MM-dd")
            }
        }

        return opportunityRepository.create(
            CreateOpportunityCommand(
                id = "opp_${UUID.randomUUID().toString().replace("-", "").take(12)}",
                tenantId = tenantId,
                accountId = accountId,
                primaryContactId = null,
                title = title,
                ownerUserId = executingUserId,
                stageId = stage.id,
                expectedAmount = expectedAmount,
                closeDate = closeDate,
                globalStatus = "active",
                approvalState = "none",
                createdByUserId = executingUserId,
                updatedByUserId = executingUserId,
            ),
        )
    }
}

private data class NormalizedAccountCustomFieldValue(
    val fieldType: String,
    val valueText: String? = null,
    val valueNumber: BigDecimal? = null,
    val valueDate: LocalDate? = null,
    val valueBoolean: Boolean? = null,
)
