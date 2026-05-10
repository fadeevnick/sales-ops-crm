package com.salesops.bootstrap.dedup

import java.time.Instant

data class GenerateDuplicateCandidatesRequest(
    val entityType: String? = null,
    val limit: Int? = null,
)

data class RejectDuplicateCandidateRequest(
    val reviewReason: String? = null,
)

data class MergeAccountDuplicateCandidateRequest(
    val masterRecordId: String,
    val mergeReason: String? = null,
)

data class MergeContactDuplicateCandidateRequest(
    val masterRecordId: String,
    val mergeReason: String? = null,
)

data class DuplicateCandidateGenerationResponse(
    val generatedCount: Int,
    val candidates: List<DuplicateCandidateItem>,
)

data class DuplicateCandidateMergeResponse(
    val candidate: DuplicateCandidateItem,
    val masterRecordId: String,
    val duplicateRecordId: String,
    val reassignedContacts: Int,
    val reassignedOpportunities: Int,
)

data class ContactDuplicateCandidateMergeResponse(
    val candidate: DuplicateCandidateItem,
    val masterRecordId: String,
    val duplicateRecordId: String,
    val reassignedPrimaryContactOpportunities: Int,
)

data class DuplicateCandidateListResponse(
    val candidates: List<DuplicateCandidateItem>,
)

data class DuplicateCandidateItem(
    val id: String,
    val entityType: String,
    val status: String,
    val leftRecordId: String,
    val leftRecordLabel: String,
    val rightRecordId: String,
    val rightRecordLabel: String,
    val matchScore: Int,
    val reasonSummary: String,
    val reviewReason: String?,
    val mergeMasterRecordId: String?,
    val mergeDuplicateRecordId: String?,
    val mergeReason: String?,
    val generatedAt: Instant,
)
