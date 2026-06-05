package com.salesops.bootstrap.dedup

import com.salesops.bootstrap.api.ForbiddenOperationException
import com.salesops.bootstrap.api.ValidationFailureException
import com.salesops.bootstrap.auth.CurrentUserContext
import com.salesops.bootstrap.audit.AppendBusinessAuditEventCommand
import com.salesops.bootstrap.audit.BusinessAuditRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class DuplicateCandidateService(
    private val duplicateCandidateRepository: DuplicateCandidateRepository,
    private val businessAuditRepository: BusinessAuditRepository,
) {
    @Transactional
    fun generateCandidates(
        context: CurrentUserContext,
        request: GenerateDuplicateCandidatesRequest,
    ): DuplicateCandidateGenerationResponse {
        assertCanUseDuplicateCandidates(context)

        val entityTypes = normalizeRequestedEntityTypes(request.entityType)
        val limit = normalizeLimit(request.limit)
        val command = GenerateDuplicateCandidatesCommand(
            tenantId = context.tenant.tenantId,
            createdByUserId = context.userId,
            limit = limit,
        )
        val generatedCount = entityTypes.sumOf { entityType ->
            when (entityType) {
                "account" -> duplicateCandidateRepository.generateAccountCandidates(command)
                "contact" -> duplicateCandidateRepository.generateContactCandidates(command)
                else -> throw ValidationFailureException("Only account and contact duplicate candidates are supported")
            }
        }

        return DuplicateCandidateGenerationResponse(
            generatedCount = generatedCount,
            candidates = listCandidates(
                context = context,
                entityType = request.entityType,
                status = "open",
                limit = limit,
            ).candidates,
        )
    }

    fun listCandidates(
        context: CurrentUserContext,
        entityType: String?,
        status: String?,
        limit: Int?,
    ): DuplicateCandidateListResponse {
        assertCanUseDuplicateCandidates(context)

        val normalizedEntityType = entityType?.trim()?.lowercase()?.takeIf { it.isNotEmpty() }
        if (normalizedEntityType != null && normalizedEntityType !in supportedEntityTypes) {
            throw ValidationFailureException("Only account and contact duplicate candidates are supported")
        }

        val normalizedStatus = status?.trim()?.lowercase()?.takeIf { it.isNotEmpty() } ?: "open"
        if (normalizedStatus !in supportedStatuses) {
            throw ValidationFailureException("Duplicate candidate status is not supported")
        }

        return DuplicateCandidateListResponse(
            candidates = duplicateCandidateRepository.listCandidates(
                DuplicateCandidateListQuery(
                    tenantId = context.tenant.tenantId,
                    entityType = normalizedEntityType,
                    status = normalizedStatus,
                    limit = normalizeLimit(limit),
                ),
            ).map { it.toItem() },
        )
    }

    @Transactional
    fun rejectCandidate(
        context: CurrentUserContext,
        candidateId: String,
        request: RejectDuplicateCandidateRequest,
    ): DuplicateCandidateItem {
        assertCanUseDuplicateCandidates(context)

        val candidate = duplicateCandidateRepository.findCandidate(
            tenantId = context.tenant.tenantId,
            candidateId = candidateId,
        ) ?: throw ValidationFailureException("Duplicate candidate does not exist")

        if (candidate.status != "open") {
            throw ValidationFailureException("Only open duplicate candidates can be rejected")
        }

        return duplicateCandidateRepository.rejectCandidate(
            RejectDuplicateCandidateCommand(
                tenantId = context.tenant.tenantId,
                candidateId = candidateId,
                reviewedByUserId = context.userId,
                reviewReason = request.reviewReason?.trim()?.takeIf { it.isNotEmpty() },
            ),
        )?.toItem() ?: throw ValidationFailureException("Only open duplicate candidates can be rejected")
    }

    @Transactional
    fun mergeAccountCandidate(
        context: CurrentUserContext,
        candidateId: String,
        request: MergeAccountDuplicateCandidateRequest,
    ): DuplicateCandidateMergeResponse {
        assertCanUseDuplicateCandidates(context)

        val candidate = duplicateCandidateRepository.findCandidate(
            tenantId = context.tenant.tenantId,
            candidateId = candidateId,
        ) ?: throw ValidationFailureException("Duplicate candidate does not exist")

        if (candidate.entityType != "account") {
            throw ValidationFailureException("Only account duplicate candidates can be merged")
        }
        if (candidate.status != "open") {
            throw ValidationFailureException("Only open duplicate candidates can be merged")
        }

        val masterRecordId = request.masterRecordId.trim()
        val duplicateRecordId = when (masterRecordId) {
            candidate.leftRecordId -> candidate.rightRecordId
            candidate.rightRecordId -> candidate.leftRecordId
            else -> throw ValidationFailureException("Merge master must be one side of the duplicate candidate")
        }
        val command = MergeAccountDuplicateCandidateCommand(
            tenantId = context.tenant.tenantId,
            candidateId = candidateId,
            masterRecordId = masterRecordId,
            duplicateRecordId = duplicateRecordId,
            reviewedByUserId = context.userId,
            mergeReason = request.mergeReason?.trim()?.takeIf { it.isNotEmpty() },
        )

        val reassignedContacts = duplicateCandidateRepository.reassignAccountContacts(command)
        val reassignedOpportunities = duplicateCandidateRepository.reassignAccountOpportunities(command)
        val mergedCandidate = duplicateCandidateRepository.markAccountCandidateMerged(command)
            ?: throw ValidationFailureException("Only open account duplicate candidates can be merged")
        businessAuditRepository.append(
            AppendBusinessAuditEventCommand(
                tenantId = context.tenant.tenantId,
                eventType = "account_duplicate_merged",
                entityType = "duplicate_candidate",
                entityId = candidateId,
                summary = "Merged account duplicate candidate $candidateId",
                actorUserId = context.userId,
                details = mapOf(
                    "candidateId" to candidateId,
                    "masterRecordId" to masterRecordId,
                    "duplicateRecordId" to duplicateRecordId,
                    "mergeReason" to command.mergeReason,
                    "reassignedContacts" to reassignedContacts,
                    "reassignedOpportunities" to reassignedOpportunities,
                ),
            ),
        )

        return DuplicateCandidateMergeResponse(
            candidate = mergedCandidate.toItem(),
            masterRecordId = masterRecordId,
            duplicateRecordId = duplicateRecordId,
            reassignedContacts = reassignedContacts,
            reassignedOpportunities = reassignedOpportunities,
        )
    }

    @Transactional
    fun mergeContactCandidate(
        context: CurrentUserContext,
        candidateId: String,
        request: MergeContactDuplicateCandidateRequest,
    ): ContactDuplicateCandidateMergeResponse {
        assertCanUseDuplicateCandidates(context)

        val candidate = duplicateCandidateRepository.findCandidate(
            tenantId = context.tenant.tenantId,
            candidateId = candidateId,
        ) ?: throw ValidationFailureException("Duplicate candidate does not exist")

        if (candidate.entityType != "contact") {
            throw ValidationFailureException("Only contact duplicate candidates can be merged")
        }
        if (candidate.status != "open") {
            throw ValidationFailureException("Only open duplicate candidates can be merged")
        }

        val masterRecordId = request.masterRecordId.trim()
        val duplicateRecordId = when (masterRecordId) {
            candidate.leftRecordId -> candidate.rightRecordId
            candidate.rightRecordId -> candidate.leftRecordId
            else -> throw ValidationFailureException("Merge master must be one side of the duplicate candidate")
        }
        val command = MergeContactDuplicateCandidateCommand(
            tenantId = context.tenant.tenantId,
            candidateId = candidateId,
            masterRecordId = masterRecordId,
            duplicateRecordId = duplicateRecordId,
            reviewedByUserId = context.userId,
            mergeReason = request.mergeReason?.trim()?.takeIf { it.isNotEmpty() },
        )

        val reassignedPrimaryContactOpportunities =
            duplicateCandidateRepository.reassignPrimaryContactOpportunities(command)
        val mergedCandidate = duplicateCandidateRepository.markContactCandidateMerged(command)
            ?: throw ValidationFailureException("Only open contact duplicate candidates can be merged")
        businessAuditRepository.append(
            AppendBusinessAuditEventCommand(
                tenantId = context.tenant.tenantId,
                eventType = "contact_duplicate_merged",
                entityType = "duplicate_candidate",
                entityId = candidateId,
                summary = "Merged contact duplicate candidate $candidateId",
                actorUserId = context.userId,
                details = mapOf(
                    "candidateId" to candidateId,
                    "masterRecordId" to masterRecordId,
                    "duplicateRecordId" to duplicateRecordId,
                    "mergeReason" to command.mergeReason,
                    "reassignedPrimaryContactOpportunities" to reassignedPrimaryContactOpportunities,
                ),
            ),
        )

        return ContactDuplicateCandidateMergeResponse(
            candidate = mergedCandidate.toItem(),
            masterRecordId = masterRecordId,
            duplicateRecordId = duplicateRecordId,
            reassignedPrimaryContactOpportunities = reassignedPrimaryContactOpportunities,
        )
    }

    private fun assertCanUseDuplicateCandidates(context: CurrentUserContext) {
        if (context.roleKey != "revops_admin") {
            throw ForbiddenOperationException("Current role cannot use duplicate candidates")
        }
    }

    private fun normalizeRequestedEntityTypes(entityType: String?): List<String> {
        val normalized = entityType?.trim()?.lowercase()?.takeIf { it.isNotEmpty() }
        if (normalized == null) {
            return supportedEntityTypes.toList()
        }
        if (normalized !in supportedEntityTypes) {
            throw ValidationFailureException("Only account and contact duplicate candidates are supported")
        }

        return listOf(normalized)
    }

    private fun normalizeLimit(limit: Int?): Int {
        val resolved = limit ?: 100
        if (resolved !in 1..500) {
            throw ValidationFailureException("Duplicate candidate limit must be between 1 and 500")
        }

        return resolved
    }

    private fun DuplicateCandidateRecord.toItem(): DuplicateCandidateItem =
        DuplicateCandidateItem(
            id = id,
            entityType = entityType,
            status = status,
            leftRecordId = leftRecordId,
            leftRecordLabel = leftRecordLabel,
            rightRecordId = rightRecordId,
            rightRecordLabel = rightRecordLabel,
            matchScore = matchScore,
            reasonSummary = reasonSummary,
            reviewReason = reviewReason,
            mergeMasterRecordId = mergeMasterRecordId,
            mergeDuplicateRecordId = mergeDuplicateRecordId,
            mergeReason = mergeReason,
            generatedAt = generatedAt,
        )
}

private val supportedEntityTypes = setOf("account", "contact")
private val supportedStatuses = setOf("open", "rejected", "merged")
