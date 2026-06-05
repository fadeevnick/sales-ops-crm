package com.salesops.bootstrap.crm.opportunity

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDate

@Repository
class OpportunityRepository(
    private val jdbcClient: JdbcClient,
) {
    fun create(command: CreateOpportunityCommand): String {
        jdbcClient.sql(
            """
            INSERT INTO opportunities (
                id,
                tenant_id,
                account_id,
                primary_contact_id,
                title,
                owner_user_id,
                stage_id,
                expected_amount,
                close_date,
                global_status,
                approval_state,
                created_by_user_id,
                updated_by_user_id
            ) VALUES (
                :id,
                :tenantId,
                :accountId,
                :primaryContactId,
                :title,
                :ownerUserId,
                :stageId,
                :expectedAmount,
                :closeDate,
                :globalStatus,
                :approvalState,
                :createdByUserId,
                :updatedByUserId
            )
            """.trimIndent(),
        )
            .param("id", command.id)
            .param("tenantId", command.tenantId)
            .param("accountId", command.accountId)
            .param("primaryContactId", command.primaryContactId)
            .param("title", command.title)
            .param("ownerUserId", command.ownerUserId)
            .param("stageId", command.stageId)
            .param("expectedAmount", command.expectedAmount)
            .param("closeDate", command.closeDate)
            .param("globalStatus", command.globalStatus)
            .param("approvalState", command.approvalState)
            .param("createdByUserId", command.createdByUserId)
            .param("updatedByUserId", command.updatedByUserId)
            .update()

        return command.id
    }

    fun listVisible(filter: OpportunityListFilter): List<OpportunityListRecord> =
        bindListFilterParams(jdbcClient.sql(selectSql(filter)), filter)
            .param("limit", filter.pageSize)
            .param("offset", (filter.page - 1) * filter.pageSize)
            .query { rs, _ -> rs.toOpportunityListRecord() }
            .list()

    fun countVisible(filter: OpportunityListFilter): Int =
        bindListFilterParams(jdbcClient.sql(countSql(filter)), filter)
            .query { rs, _ -> rs.getInt(1) }
            .single()

    fun summarizeVisible(filter: OpportunityListFilter, monthKey: String): OpportunitySummaryRecord =
        bindListFilterParams(jdbcClient.sql(summarySql(filter)), filter)
            .param("monthKey", monthKey)
            .query { rs, _ ->
                OpportunitySummaryRecord(
                    openCount = rs.getInt("open_count"),
                    pipelineValue = rs.getBigDecimal("pipeline_value") ?: java.math.BigDecimal.ZERO,
                    pendingApprovals = rs.getInt("pending_approvals"),
                    closingThisMonth = rs.getInt("closing_this_month"),
                )
            }
            .single()

    fun findVisibleById(filter: OpportunityVisibilityLookup): OpportunityDetailRecord? =
        bindVisibilityLookupParams(jdbcClient.sql(findVisibleByIdSql(filter)), filter)
            .query { rs, _ -> rs.toOpportunityDetailRecord() }
            .optional()
            .orElse(null)

    fun listCustomFieldValues(
        tenantId: String,
        opportunityId: String,
    ): List<OpportunityCustomFieldValueRecord> =
        jdbcClient.sql(
            """
            SELECT
                field_key,
                field_type,
                value_text,
                value_number,
                value_date,
                value_boolean
            FROM metadata_custom_field_values
            WHERE tenant_id = :tenantId
              AND entity_type = 'opportunity'
              AND entity_record_id = :opportunityId
            ORDER BY field_key
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("opportunityId", opportunityId)
            .query { rs, _ -> rs.toOpportunityCustomFieldValueRecord() }
            .list()

    fun upsertCustomFieldValues(commands: List<UpsertOpportunityCustomFieldValueCommand>) {
        commands.forEach { command ->
            jdbcClient.sql(
                """
                INSERT INTO metadata_custom_field_values (
                    id,
                    tenant_id,
                    entity_type,
                    entity_record_id,
                    field_key,
                    field_type,
                    value_text,
                    value_number,
                    value_date,
                    value_boolean,
                    published_version_number,
                    created_by_user_id,
                    updated_by_user_id
                ) VALUES (
                    :id,
                    :tenantId,
                    'opportunity',
                    :opportunityId,
                    :fieldKey,
                    :fieldType,
                    :valueText,
                    :valueNumber,
                    :valueDate,
                    :valueBoolean,
                    :publishedVersionNumber,
                    :createdByUserId,
                    :updatedByUserId
                )
                ON CONFLICT (tenant_id, entity_type, entity_record_id, field_key)
                DO UPDATE SET
                    field_type = EXCLUDED.field_type,
                    value_text = EXCLUDED.value_text,
                    value_number = EXCLUDED.value_number,
                    value_date = EXCLUDED.value_date,
                    value_boolean = EXCLUDED.value_boolean,
                    value_json = '{}'::jsonb,
                    published_version_number = EXCLUDED.published_version_number,
                    updated_at = NOW(),
                    updated_by_user_id = EXCLUDED.updated_by_user_id
                """.trimIndent(),
            )
                .param("id", command.id)
                .param("tenantId", command.tenantId)
                .param("opportunityId", command.opportunityId)
                .param("fieldKey", command.fieldKey)
                .param("fieldType", command.fieldType)
                .param("valueText", command.valueText)
                .param("valueNumber", command.valueNumber)
                .param("valueDate", command.valueDate)
                .param("valueBoolean", command.valueBoolean)
                .param("publishedVersionNumber", command.publishedVersionNumber)
                .param("createdByUserId", command.createdByUserId)
                .param("updatedByUserId", command.updatedByUserId)
                .update()
        }
    }

    fun deleteCustomFieldValues(
        tenantId: String,
        opportunityId: String,
        fieldKeys: List<String>,
    ): Int {
        if (fieldKeys.isEmpty()) {
            return 0
        }

        return jdbcClient.sql(
            """
            DELETE FROM metadata_custom_field_values
            WHERE tenant_id = :tenantId
              AND entity_type = 'opportunity'
              AND entity_record_id = :opportunityId
              AND field_key IN (:fieldKeys)
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("opportunityId", opportunityId)
            .param("fieldKeys", fieldKeys)
            .update()
    }

    fun findStageByKey(tenantId: String, stageKey: String): OpportunityStageRecord? =
        jdbcClient.sql(
            """
            SELECT id, stage_key
            FROM opportunity_stages
            WHERE tenant_id = :tenantId
              AND stage_key = :stageKey
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("stageKey", stageKey)
            .query { rs, _ ->
                OpportunityStageRecord(
                    id = rs.getString("id"),
                    stageKey = rs.getString("stage_key"),
                )
            }
            .optional()
            .orElse(null)

    fun listStageBridge(tenantId: String): List<OpportunityStageRecord> =
        jdbcClient.sql(
            """
            SELECT id, stage_key
            FROM opportunity_stages
            WHERE tenant_id = :tenantId
            ORDER BY sort_order, stage_key
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .query { rs, _ ->
                OpportunityStageRecord(
                    id = rs.getString("id"),
                    stageKey = rs.getString("stage_key"),
                )
            }
            .list()

    fun updateStage(command: MoveOpportunityStageCommand): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE opportunities
            SET stage_id = :stageId,
                global_status = :globalStatus,
                updated_at = NOW(),
                updated_by_user_id = :updatedByUserId
            WHERE id = :opportunityId
              AND tenant_id = :tenantId
            """.trimIndent(),
        )
            .param("stageId", command.stageId)
            .param("globalStatus", command.globalStatus)
            .param("updatedByUserId", command.updatedByUserId)
            .param("opportunityId", command.opportunityId)
            .param("tenantId", command.tenantId)
            .update()

        return updatedRows == 1
    }

    fun updateMutableFields(command: UpdateOpportunityCommand): Boolean {
        val assignments = mutableListOf(
            "updated_at = NOW()",
            "updated_by_user_id = :updatedByUserId",
        )

        if (command.title != null) {
            assignments += "title = :title"
        }

        if (command.expectedAmount != null) {
            assignments += "expected_amount = :expectedAmount"
        }

        if (command.closeDate != null) {
            assignments += "close_date = :closeDate"
        }

        var statement = jdbcClient.sql(
            """
            UPDATE opportunities
            SET ${assignments.joinToString(",\n                ")}
            WHERE id = :opportunityId
              AND tenant_id = :tenantId
            """.trimIndent(),
        )
            .param("updatedByUserId", command.updatedByUserId)
            .param("opportunityId", command.opportunityId)
            .param("tenantId", command.tenantId)

        if (command.title != null) {
            statement = statement.param("title", command.title)
        }

        if (command.expectedAmount != null) {
            statement = statement.param("expectedAmount", command.expectedAmount)
        }

        if (command.closeDate != null) {
            statement = statement.param("closeDate", command.closeDate)
        }

        return statement.update() == 1
    }

    fun updateOwner(command: ReassignOpportunityOwnerCommand): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE opportunities
            SET owner_user_id = :ownerUserId,
                updated_at = NOW(),
                updated_by_user_id = :updatedByUserId
            WHERE id = :opportunityId
              AND tenant_id = :tenantId
            """.trimIndent(),
        )
            .param("ownerUserId", command.ownerUserId)
            .param("updatedByUserId", command.updatedByUserId)
            .param("opportunityId", command.opportunityId)
            .param("tenantId", command.tenantId)
            .update()

        return updatedRows == 1
    }

    fun updateApprovalState(command: UpdateOpportunityApprovalStateCommand): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE opportunities
            SET global_status = :globalStatus,
                approval_state = :approvalState,
                updated_at = NOW(),
                updated_by_user_id = :updatedByUserId
            WHERE id = :opportunityId
              AND tenant_id = :tenantId
            """.trimIndent(),
        )
            .param("globalStatus", command.globalStatus)
            .param("approvalState", command.approvalState)
            .param("updatedByUserId", command.updatedByUserId)
            .param("opportunityId", command.opportunityId)
            .param("tenantId", command.tenantId)
            .update()

        return updatedRows == 1
    }

    fun appendTimelineEvent(command: AppendOpportunityTimelineEventCommand) {
        jdbcClient.sql(
            """
            INSERT INTO opportunity_timeline_events (
                id, tenant_id, opportunity_id,
                event_type, event_code, title, description,
                actor_user_id, actor_name
            ) VALUES (
                :id, :tenantId, :opportunityId,
                :eventType, :eventCode, :title, :description,
                :actorUserId, :actorName
            )
            """.trimIndent(),
        )
            .param("id", command.id)
            .param("tenantId", command.tenantId)
            .param("opportunityId", command.opportunityId)
            .param("eventType", command.eventType)
            .param("eventCode", command.eventCode)
            .param("title", command.title)
            .param("description", command.description)
            .param("actorUserId", command.actorUserId)
            .param("actorName", command.actorName)
            .update()
    }

    fun listTimelineEvents(tenantId: String, opportunityId: String): List<OpportunityTimelineEventRecord> =
        jdbcClient.sql(
            """
            SELECT id, event_type, event_code, title, description, actor_name, created_at
            FROM opportunity_timeline_events
            WHERE tenant_id = :tenantId AND opportunity_id = :opportunityId
            ORDER BY created_at DESC
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("opportunityId", opportunityId)
            .query { rs, _ -> rs.toOpportunityTimelineEventRecord() }
            .list()

    fun findApprovalContext(
        tenantId: String,
        opportunityId: String,
    ): OpportunityApprovalContextRecord? =
        jdbcClient.sql(
            """
            SELECT
                o.id,
                o.title,
                a.id AS account_id,
                a.name AS account_name,
                c.id AS primary_contact_id,
                c.full_name AS primary_contact_name,
                owner.id AS owner_id,
                owner.display_name AS owner_name,
                o.global_status,
                o.stage_id,
                o.expected_amount,
                o.close_date,
                o.approval_state
            FROM opportunities o
            JOIN accounts a
                ON a.id = o.account_id
               AND a.tenant_id = o.tenant_id
            LEFT JOIN contacts c
                ON c.id = o.primary_contact_id
               AND c.tenant_id = o.tenant_id
            JOIN app_users owner ON owner.id = o.owner_user_id
            WHERE o.id = :opportunityId
              AND o.tenant_id = :tenantId
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("opportunityId", opportunityId)
            .query { rs, _ -> rs.toOpportunityApprovalContextRecord() }
            .optional()
            .orElse(null)

    private fun selectSql(filter: OpportunityListFilter): String =
        """
        SELECT
            o.id,
            o.title,
            o.account_id,
            a.name AS account_name,
            o.owner_user_id,
            owner.display_name AS owner_name,
            o.stage_id,
            o.expected_amount,
            o.close_date,
            o.approval_state
        ${baseFromAndWhereClause(filter)}
        ORDER BY COALESCE(o.close_date, DATE '9999-12-31'), lower(o.title), o.id
        LIMIT :limit OFFSET :offset
        """.trimIndent()

    private fun countSql(filter: OpportunityListFilter): String =
        """
        SELECT COUNT(*)
        ${baseFromAndWhereClause(filter)}
        """.trimIndent()

    private fun summarySql(filter: OpportunityListFilter): String =
        """
        SELECT
            COUNT(*) AS open_count,
            COALESCE(SUM(o.expected_amount), 0) AS pipeline_value,
            COUNT(*) FILTER (WHERE o.approval_state IN ('pending', 'sent_back')) AS pending_approvals,
            COUNT(*) FILTER (WHERE o.close_date IS NOT NULL AND to_char(o.close_date, 'YYYY-MM') = :monthKey) AS closing_this_month
        ${baseFromAndWhereClause(filter)}
        """.trimIndent()

    private fun findVisibleByIdSql(filter: OpportunityVisibilityLookup): String =
        """
        SELECT
            o.id,
            o.title,
            a.id AS account_id,
            a.name AS account_name,
            c.id AS primary_contact_id,
            c.full_name AS primary_contact_name,
            owner.id AS owner_id,
            owner.display_name AS owner_name,
            o.global_status,
            o.stage_id,
            o.expected_amount,
            o.close_date,
            o.approval_state
        FROM opportunities o
        JOIN accounts a
            ON a.id = o.account_id
           AND a.tenant_id = o.tenant_id
        LEFT JOIN contacts c
            ON c.id = o.primary_contact_id
           AND c.tenant_id = o.tenant_id
        JOIN app_users owner ON owner.id = o.owner_user_id
        ${visibilityLookupWhereClause(filter)}
        """.trimIndent()

    private fun baseFromAndWhereClause(filter: OpportunityListFilter): String {
        val clauses = mutableListOf("o.tenant_id = :tenantId")

        if (filter.ownerScope is OpportunityOwnerScope.Limited) {
            clauses += "o.owner_user_id IN (:ownerScopeUserIds)"
        }

        if (filter.ownerUserId != null) {
            clauses += "o.owner_user_id = :ownerUserId"
        }

        if (filter.accountId != null) {
            clauses += "o.account_id = :accountId"
        }

        if (filter.stageId != null) {
            clauses += "o.stage_id = :stageId"
        }

        if (filter.queryText != null) {
            clauses += "(lower(o.title) LIKE :queryText OR lower(a.name) LIKE :queryText)"
        }

        filter.customFieldFilters.forEachIndexed { index, customFieldFilter ->
            val valueClause = when (customFieldFilter.fieldType) {
                "text", "long_text" -> "lower(cfv$index.value_text) LIKE :customFieldText$index"
                "single_select" -> "cfv$index.value_text = :customFieldText$index"
                "number", "currency" -> "cfv$index.value_number = :customFieldNumber$index"
                "date" -> "cfv$index.value_date = :customFieldDate$index"
                "boolean" -> "cfv$index.value_boolean = :customFieldBoolean$index"
                else -> throw IllegalArgumentException("Unsupported custom field filter type: ${customFieldFilter.fieldType}")
            }
            clauses += """
                EXISTS (
                    SELECT 1
                    FROM metadata_custom_field_values cfv$index
                    WHERE cfv$index.tenant_id = o.tenant_id
                      AND cfv$index.entity_type = 'opportunity'
                      AND cfv$index.entity_record_id = o.id
                      AND cfv$index.field_key = :customFieldKey$index
                      AND cfv$index.field_type = :customFieldType$index
                      AND $valueClause
                )
            """.trimIndent()
        }

        return """
        FROM opportunities o
        JOIN accounts a
            ON a.id = o.account_id
           AND a.tenant_id = o.tenant_id
        JOIN app_users owner ON owner.id = o.owner_user_id
        WHERE ${clauses.joinToString("\n  AND ")}
        """.trimIndent()
    }

    private fun visibilityLookupWhereClause(filter: OpportunityVisibilityLookup): String {
        val clauses = mutableListOf(
            "o.id = :opportunityId",
            "o.tenant_id = :tenantId",
        )

        if (filter.ownerScope is OpportunityOwnerScope.Limited) {
            clauses += "o.owner_user_id IN (:ownerScopeUserIds)"
        }

        return "WHERE " + clauses.joinToString("\n  AND ")
    }

    private fun bindListFilterParams(
        statement: JdbcClient.StatementSpec,
        filter: OpportunityListFilter,
    ): JdbcClient.StatementSpec {
        var current = statement.param("tenantId", filter.tenantId)

        if (filter.ownerScope is OpportunityOwnerScope.Limited) {
            current = current.param("ownerScopeUserIds", filter.ownerScope.ownerUserIds)
        }

        if (filter.ownerUserId != null) {
            current = current.param("ownerUserId", filter.ownerUserId)
        }

        if (filter.accountId != null) {
            current = current.param("accountId", filter.accountId)
        }

        if (filter.stageId != null) {
            current = current.param("stageId", filter.stageId)
        }

        if (filter.queryText != null) {
            current = current.param("queryText", filter.queryText)
        }

        filter.customFieldFilters.forEachIndexed { index, customFieldFilter ->
            current = current
                .param("customFieldKey$index", customFieldFilter.fieldKey)
                .param("customFieldType$index", customFieldFilter.fieldType)

            when (customFieldFilter.fieldType) {
                "text", "long_text", "single_select" ->
                    current = current.param("customFieldText$index", customFieldFilter.valueText)
                "number", "currency" ->
                    current = current.param("customFieldNumber$index", customFieldFilter.valueNumber)
                "date" ->
                    current = current.param("customFieldDate$index", customFieldFilter.valueDate)
                "boolean" ->
                    current = current.param("customFieldBoolean$index", customFieldFilter.valueBoolean)
            }
        }

        return current
    }

    private fun bindVisibilityLookupParams(
        statement: JdbcClient.StatementSpec,
        filter: OpportunityVisibilityLookup,
    ): JdbcClient.StatementSpec {
        var current = statement
            .param("opportunityId", filter.opportunityId)
            .param("tenantId", filter.tenantId)

        if (filter.ownerScope is OpportunityOwnerScope.Limited) {
            current = current.param("ownerScopeUserIds", filter.ownerScope.ownerUserIds)
        }

        return current
    }
}

data class CreateOpportunityCommand(
    val id: String,
    val tenantId: String,
    val accountId: String,
    val primaryContactId: String?,
    val title: String,
    val ownerUserId: String,
    val stageId: String,
    val expectedAmount: BigDecimal?,
    val closeDate: LocalDate?,
    val globalStatus: String,
    val approvalState: String,
    val createdByUserId: String,
    val updatedByUserId: String,
)

data class MoveOpportunityStageCommand(
    val tenantId: String,
    val opportunityId: String,
    val stageId: String,
    val globalStatus: String,
    val updatedByUserId: String,
)

data class UpdateOpportunityCommand(
    val tenantId: String,
    val opportunityId: String,
    val title: String?,
    val expectedAmount: BigDecimal?,
    val closeDate: LocalDate?,
    val updatedByUserId: String,
)

data class ReassignOpportunityOwnerCommand(
    val tenantId: String,
    val opportunityId: String,
    val ownerUserId: String,
    val updatedByUserId: String,
)

data class UpdateOpportunityApprovalStateCommand(
    val tenantId: String,
    val opportunityId: String,
    val globalStatus: String,
    val approvalState: String,
    val updatedByUserId: String,
)

data class UpsertOpportunityCustomFieldValueCommand(
    val id: String,
    val tenantId: String,
    val opportunityId: String,
    val fieldKey: String,
    val fieldType: String,
    val valueText: String?,
    val valueNumber: BigDecimal?,
    val valueDate: LocalDate?,
    val valueBoolean: Boolean?,
    val publishedVersionNumber: Int,
    val createdByUserId: String,
    val updatedByUserId: String,
)

data class OpportunitySummaryRecord(
    val openCount: Int,
    val pipelineValue: java.math.BigDecimal,
    val pendingApprovals: Int,
    val closingThisMonth: Int,
)

data class OpportunityListFilter(
    val tenantId: String,
    val ownerScope: OpportunityOwnerScope,
    val stageId: String?,
    val ownerUserId: String?,
    val accountId: String?,
    val queryText: String?,
    val customFieldFilters: List<OpportunityCustomFieldListFilter>,
    val page: Int,
    val pageSize: Int,
)

data class OpportunityCustomFieldListFilter(
    val fieldKey: String,
    val fieldType: String,
    val valueText: String? = null,
    val valueNumber: BigDecimal? = null,
    val valueDate: LocalDate? = null,
    val valueBoolean: Boolean? = null,
)

data class OpportunityVisibilityLookup(
    val tenantId: String,
    val ownerScope: OpportunityOwnerScope,
    val opportunityId: String,
)

data class OpportunityStageRecord(
    val id: String,
    val stageKey: String,
)

data class OpportunityListRecord(
    val id: String,
    val title: String,
    val accountId: String,
    val accountName: String,
    val ownerUserId: String,
    val ownerName: String,
    val stageId: String,
    val expectedAmount: BigDecimal?,
    val closeDate: LocalDate?,
    val approvalState: String,
)

data class OpportunityDetailRecord(
    val id: String,
    val title: String,
    val accountId: String,
    val accountName: String,
    val primaryContactId: String?,
    val primaryContactName: String?,
    val ownerId: String,
    val ownerName: String,
    val globalStatus: String,
    val stageId: String,
    val expectedAmount: BigDecimal?,
    val closeDate: LocalDate?,
    val approvalState: String,
)

data class OpportunityApprovalContextRecord(
    val id: String,
    val title: String,
    val accountId: String,
    val accountName: String,
    val primaryContactId: String?,
    val primaryContactName: String?,
    val ownerId: String,
    val ownerName: String,
    val globalStatus: String,
    val stageId: String,
    val expectedAmount: BigDecimal?,
    val closeDate: LocalDate?,
    val approvalState: String,
)

data class OpportunityCustomFieldValueRecord(
    val fieldKey: String,
    val fieldType: String,
    val valueText: String?,
    val valueNumber: BigDecimal?,
    val valueDate: LocalDate?,
    val valueBoolean: Boolean?,
)

private fun java.sql.ResultSet.toOpportunityListRecord(): OpportunityListRecord =
    OpportunityListRecord(
        id = getString("id"),
        title = getString("title"),
        accountId = getString("account_id"),
        accountName = getString("account_name"),
        ownerUserId = getString("owner_user_id"),
        ownerName = getString("owner_name"),
        stageId = getString("stage_id"),
        expectedAmount = getBigDecimal("expected_amount"),
        closeDate = getObject("close_date", LocalDate::class.java),
        approvalState = getString("approval_state"),
    )

private fun java.sql.ResultSet.toOpportunityDetailRecord(): OpportunityDetailRecord =
    OpportunityDetailRecord(
        id = getString("id"),
        title = getString("title"),
        accountId = getString("account_id"),
        accountName = getString("account_name"),
        primaryContactId = getString("primary_contact_id"),
        primaryContactName = getString("primary_contact_name"),
        ownerId = getString("owner_id"),
        ownerName = getString("owner_name"),
        globalStatus = getString("global_status"),
        stageId = getString("stage_id"),
        expectedAmount = getBigDecimal("expected_amount"),
        closeDate = getObject("close_date", LocalDate::class.java),
        approvalState = getString("approval_state"),
    )

private fun java.sql.ResultSet.toOpportunityApprovalContextRecord(): OpportunityApprovalContextRecord =
    OpportunityApprovalContextRecord(
        id = getString("id"),
        title = getString("title"),
        accountId = getString("account_id"),
        accountName = getString("account_name"),
        primaryContactId = getString("primary_contact_id"),
        primaryContactName = getString("primary_contact_name"),
        ownerId = getString("owner_id"),
        ownerName = getString("owner_name"),
        globalStatus = getString("global_status"),
        stageId = getString("stage_id"),
        expectedAmount = getBigDecimal("expected_amount"),
        closeDate = getObject("close_date", LocalDate::class.java),
        approvalState = getString("approval_state"),
    )

private fun java.sql.ResultSet.toOpportunityCustomFieldValueRecord(): OpportunityCustomFieldValueRecord =
    OpportunityCustomFieldValueRecord(
        fieldKey = getString("field_key"),
        fieldType = getString("field_type"),
        valueText = getString("value_text"),
        valueNumber = getBigDecimal("value_number"),
        valueDate = getObject("value_date", LocalDate::class.java),
        valueBoolean = getNullableBoolean("value_boolean"),
    )

private fun java.sql.ResultSet.getNullableBoolean(columnLabel: String): Boolean? {
    val value = getBoolean(columnLabel)
    return if (wasNull()) null else value
}

private fun java.sql.ResultSet.toOpportunityTimelineEventRecord(): OpportunityTimelineEventRecord =
    OpportunityTimelineEventRecord(
        id = getString("id"),
        eventType = getString("event_type"),
        eventCode = getString("event_code"),
        title = getString("title"),
        description = getString("description"),
        actorName = getString("actor_name"),
        createdAt = getObject("created_at", java.time.OffsetDateTime::class.java).toInstant(),
    )

data class AppendOpportunityTimelineEventCommand(
    val id: String,
    val tenantId: String,
    val opportunityId: String,
    val eventType: String,
    val eventCode: String,
    val title: String,
    val description: String,
    val actorUserId: String,
    val actorName: String,
)

data class OpportunityTimelineEventRecord(
    val id: String,
    val eventType: String,
    val eventCode: String,
    val title: String,
    val description: String,
    val actorName: String,
    val createdAt: java.time.Instant,
)
