package com.salesops.bootstrap.bulkimport

import com.salesops.bootstrap.crm.account.AccountRepository
import com.salesops.bootstrap.crm.account.CreateAccountCommand
import com.salesops.bootstrap.crm.contact.ContactRepository
import com.salesops.bootstrap.crm.contact.CreateContactCommand
import com.salesops.bootstrap.crm.opportunity.CreateOpportunityCommand
import com.salesops.bootstrap.crm.opportunity.OpportunityRepository
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

        return accountRepository.create(
            CreateAccountCommand(
                id = "acc_${UUID.randomUUID().toString().replace("-", "").take(12)}",
                tenantId = tenantId,
                name = accountName,
                website = row.previewData["website"]?.toString()?.trim()?.takeIf { it.isNotEmpty() },
                ownerUserId = executingUserId,
                createdByUserId = executingUserId,
                updatedByUserId = executingUserId,
            ),
        )
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
