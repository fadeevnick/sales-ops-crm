package com.salesops.bootstrap.bulkexport

import com.salesops.bootstrap.api.ForbiddenOperationException
import com.salesops.bootstrap.api.ValidationFailureException
import com.salesops.bootstrap.auth.CurrentUserContext
import com.salesops.bootstrap.crm.account.AccountExportRecord
import com.salesops.bootstrap.crm.account.AccountListFilter
import com.salesops.bootstrap.crm.account.AccountRepository
import com.salesops.bootstrap.crm.opportunity.OpportunityListFilter
import com.salesops.bootstrap.crm.opportunity.OpportunityListRecord
import com.salesops.bootstrap.crm.opportunity.OpportunityRepository
import com.salesops.bootstrap.crm.opportunity.TeamScopePolicy
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class ExportJobService(
    private val exportJobRepository: ExportJobRepository,
    private val accountRepository: AccountRepository,
    private val opportunityRepository: OpportunityRepository,
    private val teamScopePolicy: TeamScopePolicy,
) {
    @Transactional
    fun createJob(
        context: CurrentUserContext,
        request: CreateExportJobRequest,
    ): ExportJobResponse {
        assertCanUseExportJobs(context)

        val entityType = request.entityType.trim().lowercase()
        if (entityType !in setOf("account", "opportunity")) {
            throw ValidationFailureException("Only account and opportunity export are supported")
        }

        val limit = normalizeLimit(request.limit)
        val normalizedQuery = request.query?.trim()?.takeIf { it.isNotEmpty() }
        val ownerId = request.ownerId?.trim()?.takeIf { it.isNotEmpty() }
        val stageKey = request.stageKey?.trim()?.takeIf { it.isNotEmpty() }
        val exportData = when (entityType) {
            "account" -> accountExportData(
                context = context,
                query = normalizedQuery,
                ownerId = ownerId,
                limit = limit,
            )
            "opportunity" -> opportunityExportData(
                context = context,
                query = normalizedQuery,
                ownerId = ownerId,
                stageKey = stageKey,
                limit = limit,
            )
            else -> throw ValidationFailureException("Only account and opportunity export are supported")
        }
        val job = exportJobRepository.createCompleted(
            CreateExportJobCommand(
                id = "ej_${UUID.randomUUID().toString().replace("-", "").take(12)}",
                tenantId = context.tenant.tenantId,
                entityType = entityType,
                criteria = exportData.criteria,
                rowCount = exportData.rowCount,
                csvContent = exportData.csvContent,
                createdByUserId = context.userId,
            ),
        )

        return job.toResponse()
    }

    fun getJob(
        context: CurrentUserContext,
        exportJobId: String,
    ): ExportJobResponse {
        assertCanUseExportJobs(context)

        val job = exportJobRepository.findJob(
            tenantId = context.tenant.tenantId,
            exportJobId = exportJobId,
        ) ?: throw ValidationFailureException("Export job does not exist")

        return job.toResponse()
    }

    private fun assertCanUseExportJobs(context: CurrentUserContext) {
        if (context.roleKey != "revops_admin") {
            throw ForbiddenOperationException("Current role cannot use export jobs")
        }
    }

    private fun normalizeLimit(limit: Int?): Int {
        val resolved = limit ?: 1000
        if (resolved !in 1..1000) {
            throw ValidationFailureException("Export limit must be between 1 and 1000")
        }

        return resolved
    }

    private fun accountExportData(
        context: CurrentUserContext,
        query: String?,
        ownerId: String?,
        limit: Int,
    ): ExportData {
        val filter = AccountListFilter(
            tenantId = context.tenant.tenantId,
            ownerScope = teamScopePolicy.opportunityOwnerScope(context),
            ownerUserId = ownerId,
            queryText = query?.lowercase()?.let { "%$it%" },
            page = 1,
            pageSize = limit,
        )
        val records = accountRepository.listVisibleForExport(filter)

        return ExportData(
            csvContent = renderAccountCsv(records),
            rowCount = records.size,
            criteria = mapOf(
                "query" to query,
                "ownerId" to ownerId,
                "limit" to limit,
            ),
        )
    }

    private fun opportunityExportData(
        context: CurrentUserContext,
        query: String?,
        ownerId: String?,
        stageKey: String?,
        limit: Int,
    ): ExportData {
        val stageBridge = opportunityRepository.listStageBridge(context.tenant.tenantId)
            .associate { it.id to it.stageKey }
        val stageId = stageKey?.let { requestedStageKey ->
            stageBridge.entries.firstOrNull { (_, bridgeStageKey) -> bridgeStageKey == requestedStageKey }?.key
                ?: return ExportData(
                    csvContent = renderOpportunityCsv(emptyList(), emptyMap()),
                    rowCount = 0,
                    criteria = opportunityCriteria(query = query, ownerId = ownerId, stageKey = stageKey, limit = limit),
                )
        }
        val filter = OpportunityListFilter(
            tenantId = context.tenant.tenantId,
            ownerScope = teamScopePolicy.opportunityOwnerScope(context),
            stageId = stageId,
            ownerUserId = ownerId,
            accountId = null,
            queryText = query?.lowercase()?.let { "%$it%" },
            customFieldFilters = emptyList(),
            page = 1,
            pageSize = limit,
        )
        val records = opportunityRepository.listVisible(filter)

        return ExportData(
            csvContent = renderOpportunityCsv(records, stageBridge),
            rowCount = records.size,
            criteria = opportunityCriteria(query = query, ownerId = ownerId, stageKey = stageKey, limit = limit),
        )
    }

    private fun opportunityCriteria(
        query: String?,
        ownerId: String?,
        stageKey: String?,
        limit: Int,
    ): Map<String, Any?> =
        mapOf(
            "query" to query,
            "ownerId" to ownerId,
            "stageKey" to stageKey,
            "limit" to limit,
        )

    private fun renderAccountCsv(records: List<AccountExportRecord>): String {
        val rows = mutableListOf(
            listOf("Account ID", "Account Name", "Website", "Owner ID", "Owner Name", "Open Opportunity Count"),
        )
        rows += records.map { record ->
            listOf(
                record.id,
                record.name,
                record.website.orEmpty(),
                record.ownerUserId,
                record.ownerName,
                record.openOpportunityCount.toString(),
            )
        }

        return rows.joinToString("\n") { row -> row.joinToString(",") { value -> value.toCsvCell() } } + "\n"
    }

    private fun renderOpportunityCsv(
        records: List<OpportunityListRecord>,
        stageBridge: Map<String, String>,
    ): String {
        val rows = mutableListOf(
            listOf(
                "Opportunity ID",
                "Title",
                "Account ID",
                "Account Name",
                "Owner ID",
                "Owner Name",
                "Stage",
                "Expected Amount",
                "Close Date",
                "Approval State",
            ),
        )
        rows += records.map { record ->
            listOf(
                record.id,
                record.title,
                record.accountId,
                record.accountName,
                record.ownerUserId,
                record.ownerName,
                stageBridge[record.stageId].orEmpty(),
                record.expectedAmount?.toPlainString().orEmpty(),
                record.closeDate?.toString().orEmpty(),
                record.approvalState,
            )
        }

        return rows.joinToString("\n") { row -> row.joinToString(",") { value -> value.toCsvCell() } } + "\n"
    }
}

private data class ExportData(
    val csvContent: String,
    val rowCount: Int,
    val criteria: Map<String, Any?>,
)

private fun ExportJobRecord.toResponse(): ExportJobResponse =
    ExportJobResponse(
        job = ExportJobItem(
            id = id,
            entityType = entityType,
            status = status,
            criteria = criteria,
            rowCount = rowCount,
            createdAt = createdAt,
            completedAt = completedAt,
        ),
        csvContent = csvContent,
    )

private fun String.toCsvCell(): String {
    val shouldQuote = any { it == ',' || it == '"' || it == '\n' || it == '\r' }
    val escaped = replace("\"", "\"\"")
    return if (shouldQuote) "\"$escaped\"" else escaped
}
