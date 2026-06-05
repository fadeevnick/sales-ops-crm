package com.salesops.bootstrap.dedup

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import java.time.Instant
import java.time.OffsetDateTime

@Repository
class DuplicateCandidateRepository(
    private val jdbcClient: JdbcClient,
) {
    fun generateAccountCandidates(command: GenerateDuplicateCandidatesCommand): Int =
        jdbcClient.sql(
            """
            WITH candidate_pairs AS (
                SELECT
                    a1.id AS left_record_id,
                    a2.id AS right_record_id,
                    a1.name AS left_record_label,
                    a2.name AS right_record_label,
                    lower(trim(a1.name)) AS match_key
                FROM accounts a1
                JOIN accounts a2
                    ON a2.tenant_id = a1.tenant_id
                   AND a1.id < a2.id
                   AND lower(trim(a1.name)) = lower(trim(a2.name))
                WHERE a1.tenant_id = :tenantId
                  AND trim(a1.name) <> ''
                ORDER BY lower(trim(a1.name)), a1.id, a2.id
                LIMIT :limit
            )
            INSERT INTO duplicate_candidates (
                id,
                tenant_id,
                entity_type,
                left_record_id,
                right_record_id,
                left_record_label,
                right_record_label,
                match_key,
                match_score,
                reason_summary,
                created_by_user_id
            )
            SELECT
                concat('dc_', substr(md5(:tenantId || ':account:' || left_record_id || ':' || right_record_id), 1, 12)),
                :tenantId,
                'account',
                left_record_id,
                right_record_id,
                left_record_label,
                right_record_label,
                match_key,
                90,
                'Exact normalized account name match',
                :createdByUserId
            FROM candidate_pairs
            ON CONFLICT (tenant_id, entity_type, left_record_id, right_record_id) DO NOTHING
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("createdByUserId", command.createdByUserId)
            .param("limit", command.limit)
            .update()

    fun generateContactCandidates(command: GenerateDuplicateCandidatesCommand): Int =
        jdbcClient.sql(
            """
            WITH candidate_pairs AS (
                SELECT
                    c1.id AS left_record_id,
                    c2.id AS right_record_id,
                    concat(c1.full_name, ' <', c1.email, '> / ', a1.name) AS left_record_label,
                    concat(c2.full_name, ' <', c2.email, '> / ', a2.name) AS right_record_label,
                    lower(trim(c1.email)) AS match_key
                FROM contacts c1
                JOIN contacts c2
                    ON c2.tenant_id = c1.tenant_id
                   AND c1.id < c2.id
                   AND lower(trim(c1.email)) = lower(trim(c2.email))
                JOIN accounts a1
                    ON a1.id = c1.account_id
                   AND a1.tenant_id = c1.tenant_id
                JOIN accounts a2
                    ON a2.id = c2.account_id
                   AND a2.tenant_id = c2.tenant_id
                WHERE c1.tenant_id = :tenantId
                  AND c1.email IS NOT NULL
                  AND trim(c1.email) <> ''
                ORDER BY lower(trim(c1.email)), c1.id, c2.id
                LIMIT :limit
            )
            INSERT INTO duplicate_candidates (
                id,
                tenant_id,
                entity_type,
                left_record_id,
                right_record_id,
                left_record_label,
                right_record_label,
                match_key,
                match_score,
                reason_summary,
                created_by_user_id
            )
            SELECT
                concat('dc_', substr(md5(:tenantId || ':contact:' || left_record_id || ':' || right_record_id), 1, 12)),
                :tenantId,
                'contact',
                left_record_id,
                right_record_id,
                left_record_label,
                right_record_label,
                match_key,
                95,
                'Exact normalized contact email match',
                :createdByUserId
            FROM candidate_pairs
            ON CONFLICT (tenant_id, entity_type, left_record_id, right_record_id) DO NOTHING
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("createdByUserId", command.createdByUserId)
            .param("limit", command.limit)
            .update()

    fun listCandidates(query: DuplicateCandidateListQuery): List<DuplicateCandidateRecord> {
        val clauses = mutableListOf(
            "tenant_id = :tenantId",
            "status = :status",
        )
        if (query.entityType != null) {
            clauses += "entity_type = :entityType"
        }

        var statement = jdbcClient.sql(
            """
            SELECT
                id,
                entity_type,
                status,
                left_record_id,
                left_record_label,
                right_record_id,
                right_record_label,
                match_score,
                reason_summary,
                review_reason,
                merge_master_record_id,
                merge_duplicate_record_id,
                merge_reason,
                generated_at
            FROM duplicate_candidates
            WHERE ${clauses.joinToString("\n  AND ")}
            ORDER BY generated_at DESC, id
            LIMIT :limit
            """.trimIndent(),
        )
            .param("tenantId", query.tenantId)
            .param("status", query.status)
            .param("limit", query.limit)

        if (query.entityType != null) {
            statement = statement.param("entityType", query.entityType)
        }

        return statement
            .query { rs, _ -> rs.toDuplicateCandidateRecord() }
            .list()
    }

    fun findCandidate(tenantId: String, candidateId: String): DuplicateCandidateRecord? =
        jdbcClient.sql(
            """
            SELECT
                id,
                entity_type,
                status,
                left_record_id,
                left_record_label,
                right_record_id,
                right_record_label,
                match_score,
                reason_summary,
                review_reason,
                merge_master_record_id,
                merge_duplicate_record_id,
                merge_reason,
                generated_at
            FROM duplicate_candidates
            WHERE tenant_id = :tenantId
              AND id = :candidateId
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("candidateId", candidateId)
            .query { rs, _ -> rs.toDuplicateCandidateRecord() }
            .optional()
            .orElse(null)

    fun rejectCandidate(command: RejectDuplicateCandidateCommand): DuplicateCandidateRecord? =
        jdbcClient.sql(
            """
            UPDATE duplicate_candidates
            SET status = 'rejected',
                reviewed_at = NOW(),
                reviewed_by_user_id = :reviewedByUserId,
                review_reason = :reviewReason
            WHERE tenant_id = :tenantId
              AND id = :candidateId
              AND status = 'open'
            RETURNING
                id,
                entity_type,
                status,
                left_record_id,
                left_record_label,
                right_record_id,
                right_record_label,
                match_score,
                reason_summary,
                review_reason,
                merge_master_record_id,
                merge_duplicate_record_id,
                merge_reason,
                generated_at
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("candidateId", command.candidateId)
            .param("reviewedByUserId", command.reviewedByUserId)
            .param("reviewReason", command.reviewReason)
            .query { rs, _ -> rs.toDuplicateCandidateRecord() }
            .optional()
            .orElse(null)

    fun reassignAccountContacts(command: MergeAccountDuplicateCandidateCommand): Int =
        jdbcClient.sql(
            """
            UPDATE contacts
            SET account_id = :masterRecordId,
                updated_at = NOW(),
                updated_by_user_id = :reviewedByUserId
            WHERE tenant_id = :tenantId
              AND account_id = :duplicateRecordId
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("masterRecordId", command.masterRecordId)
            .param("duplicateRecordId", command.duplicateRecordId)
            .param("reviewedByUserId", command.reviewedByUserId)
            .update()

    fun reassignAccountOpportunities(command: MergeAccountDuplicateCandidateCommand): Int =
        jdbcClient.sql(
            """
            UPDATE opportunities
            SET account_id = :masterRecordId,
                updated_at = NOW(),
                updated_by_user_id = :reviewedByUserId
            WHERE tenant_id = :tenantId
              AND account_id = :duplicateRecordId
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("masterRecordId", command.masterRecordId)
            .param("duplicateRecordId", command.duplicateRecordId)
            .param("reviewedByUserId", command.reviewedByUserId)
            .update()

    fun markAccountCandidateMerged(command: MergeAccountDuplicateCandidateCommand): DuplicateCandidateRecord? =
        jdbcClient.sql(
            """
            UPDATE duplicate_candidates
            SET status = 'merged',
                reviewed_at = NOW(),
                reviewed_by_user_id = :reviewedByUserId,
                merge_master_record_id = :masterRecordId,
                merge_duplicate_record_id = :duplicateRecordId,
                merge_reason = :mergeReason
            WHERE tenant_id = :tenantId
              AND id = :candidateId
              AND entity_type = 'account'
              AND status = 'open'
            RETURNING
                id,
                entity_type,
                status,
                left_record_id,
                left_record_label,
                right_record_id,
                right_record_label,
                match_score,
                reason_summary,
                review_reason,
                merge_master_record_id,
                merge_duplicate_record_id,
                merge_reason,
                generated_at
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("candidateId", command.candidateId)
            .param("masterRecordId", command.masterRecordId)
            .param("duplicateRecordId", command.duplicateRecordId)
            .param("reviewedByUserId", command.reviewedByUserId)
            .param("mergeReason", command.mergeReason)
            .query { rs, _ -> rs.toDuplicateCandidateRecord() }
            .optional()
            .orElse(null)

    fun reassignPrimaryContactOpportunities(command: MergeContactDuplicateCandidateCommand): Int =
        jdbcClient.sql(
            """
            UPDATE opportunities
            SET primary_contact_id = :masterRecordId,
                updated_at = NOW(),
                updated_by_user_id = :reviewedByUserId
            WHERE tenant_id = :tenantId
              AND primary_contact_id = :duplicateRecordId
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("masterRecordId", command.masterRecordId)
            .param("duplicateRecordId", command.duplicateRecordId)
            .param("reviewedByUserId", command.reviewedByUserId)
            .update()

    fun markContactCandidateMerged(command: MergeContactDuplicateCandidateCommand): DuplicateCandidateRecord? =
        jdbcClient.sql(
            """
            UPDATE duplicate_candidates
            SET status = 'merged',
                reviewed_at = NOW(),
                reviewed_by_user_id = :reviewedByUserId,
                merge_master_record_id = :masterRecordId,
                merge_duplicate_record_id = :duplicateRecordId,
                merge_reason = :mergeReason
            WHERE tenant_id = :tenantId
              AND id = :candidateId
              AND entity_type = 'contact'
              AND status = 'open'
            RETURNING
                id,
                entity_type,
                status,
                left_record_id,
                left_record_label,
                right_record_id,
                right_record_label,
                match_score,
                reason_summary,
                review_reason,
                merge_master_record_id,
                merge_duplicate_record_id,
                merge_reason,
                generated_at
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)
            .param("candidateId", command.candidateId)
            .param("masterRecordId", command.masterRecordId)
            .param("duplicateRecordId", command.duplicateRecordId)
            .param("reviewedByUserId", command.reviewedByUserId)
            .param("mergeReason", command.mergeReason)
            .query { rs, _ -> rs.toDuplicateCandidateRecord() }
            .optional()
            .orElse(null)

    private fun java.sql.ResultSet.toDuplicateCandidateRecord(): DuplicateCandidateRecord =
        DuplicateCandidateRecord(
            id = getString("id"),
            entityType = getString("entity_type"),
            status = getString("status"),
            leftRecordId = getString("left_record_id"),
            leftRecordLabel = getString("left_record_label"),
            rightRecordId = getString("right_record_id"),
            rightRecordLabel = getString("right_record_label"),
            matchScore = getInt("match_score"),
            reasonSummary = getString("reason_summary"),
            reviewReason = getString("review_reason"),
            mergeMasterRecordId = getString("merge_master_record_id"),
            mergeDuplicateRecordId = getString("merge_duplicate_record_id"),
            mergeReason = getString("merge_reason"),
            generatedAt = getObject("generated_at", OffsetDateTime::class.java).toInstant(),
        )
}

data class GenerateDuplicateCandidatesCommand(
    val tenantId: String,
    val createdByUserId: String,
    val limit: Int,
)

data class DuplicateCandidateListQuery(
    val tenantId: String,
    val entityType: String?,
    val status: String,
    val limit: Int,
)

data class RejectDuplicateCandidateCommand(
    val tenantId: String,
    val candidateId: String,
    val reviewedByUserId: String,
    val reviewReason: String?,
)

data class MergeAccountDuplicateCandidateCommand(
    val tenantId: String,
    val candidateId: String,
    val masterRecordId: String,
    val duplicateRecordId: String,
    val reviewedByUserId: String,
    val mergeReason: String?,
)

data class MergeContactDuplicateCandidateCommand(
    val tenantId: String,
    val candidateId: String,
    val masterRecordId: String,
    val duplicateRecordId: String,
    val reviewedByUserId: String,
    val mergeReason: String?,
)

data class DuplicateCandidateRecord(
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
