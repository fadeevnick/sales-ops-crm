package com.salesops.bootstrap.crm.account

import com.salesops.bootstrap.crm.opportunity.OpportunityOwnerScope
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository

@Repository
class AccountRepository(
    private val jdbcClient: JdbcClient,
) {
    fun create(command: CreateAccountCommand): String {
        jdbcClient.sql(
            """
            INSERT INTO accounts (
                id,
                tenant_id,
                name,
                website,
                owner_user_id,
                created_by_user_id,
                updated_by_user_id
            ) VALUES (
                :id,
                :tenantId,
                :name,
                :website,
                :ownerUserId,
                :createdByUserId,
                :updatedByUserId
            )
            """.trimIndent(),
        )
            .param("id", command.id)
            .param("tenantId", command.tenantId)
            .param("name", command.name)
            .param("website", command.website)
            .param("ownerUserId", command.ownerUserId)
            .param("createdByUserId", command.createdByUserId)
            .param("updatedByUserId", command.updatedByUserId)
            .update()

        return command.id
    }

    fun listVisible(filter: AccountListFilter): List<AccountRecord> =
        bindFilterParams(jdbcClient.sql(selectSql(filter)), filter)
            .param("limit", filter.pageSize)
            .param("offset", (filter.page - 1) * filter.pageSize)
            .query { rs, _ -> rs.toAccountRecord() }
            .list()

    fun listVisibleForExport(filter: AccountListFilter): List<AccountExportRecord> =
        bindFilterParams(jdbcClient.sql(selectExportSql(filter)), filter)
            .param("limit", filter.pageSize)
            .param("offset", (filter.page - 1) * filter.pageSize)
            .query { rs, _ -> rs.toAccountExportRecord() }
            .list()

    fun countVisible(filter: AccountListFilter): Int =
        bindFilterParams(jdbcClient.sql(countSql(filter)), filter)
            .query { rs, _ -> rs.getInt(1) }
            .single()

    fun findVisibleAccountById(filter: AccountVisibilityLookup): VisibleAccountRecord? =
        bindVisibilityLookupParams(jdbcClient.sql(findVisibleByIdSql(filter)), filter)
            .query { rs, _ -> rs.toVisibleAccountRecord() }
            .optional()
            .orElse(null)

    fun findVisibleDetailById(filter: AccountVisibilityLookup): AccountRecord? =
        bindVisibilityLookupParams(jdbcClient.sql(findVisibleDetailByIdSql(filter)), filter)
            .query { rs, _ -> rs.toAccountRecord() }
            .optional()
            .orElse(null)

    fun findTenantAccountForImport(command: AccountImportLookup): VisibleAccountRecord? {
        val accountId = command.accountId?.trim()?.takeIf { it.isNotEmpty() }
        val accountName = command.accountName?.trim()?.takeIf { it.isNotEmpty() }
        if (accountId == null && accountName == null) {
            return null
        }

        val clauses = mutableListOf("a.tenant_id = :tenantId")
        if (accountId != null) {
            clauses += "a.id = :accountId"
        } else {
            clauses += "lower(a.name) = :accountName"
        }

        var statement = jdbcClient.sql(
            """
            SELECT
                a.id,
                a.name,
                a.owner_user_id
            FROM accounts a
            WHERE ${clauses.joinToString("\n  AND ")}
            ORDER BY lower(a.name), a.id
            LIMIT 1
            """.trimIndent(),
        )
            .param("tenantId", command.tenantId)

        if (accountId != null) {
            statement = statement.param("accountId", accountId)
        } else {
            statement = statement.param("accountName", accountName!!.lowercase())
        }

        return statement
            .query { rs, _ -> rs.toVisibleAccountRecord() }
            .optional()
            .orElse(null)
    }

    private fun selectSql(filter: AccountListFilter): String =
        """
        SELECT
            a.id,
            a.name,
            a.owner_user_id,
            owner.display_name AS owner_name,
            COALESCE(COUNT(o.id), 0) AS open_opportunity_count
        FROM accounts a
        JOIN app_users owner ON owner.id = a.owner_user_id
        LEFT JOIN opportunities o
            ON o.account_id = a.id
           AND o.tenant_id = a.tenant_id
           AND o.global_status NOT IN ('closed_won', 'closed_lost')
        ${baseWhereClause(filter)}
        GROUP BY a.id, a.name, a.owner_user_id, owner.display_name
        ORDER BY lower(a.name), a.id
        LIMIT :limit OFFSET :offset
        """.trimIndent()

    private fun countSql(filter: AccountListFilter): String =
        """
        SELECT COUNT(*)
        FROM accounts a
        ${baseWhereClause(filter)}
        """.trimIndent()

    private fun selectExportSql(filter: AccountListFilter): String =
        """
        SELECT
            a.id,
            a.name,
            a.website,
            a.owner_user_id,
            owner.display_name AS owner_name,
            COALESCE(COUNT(o.id), 0) AS open_opportunity_count
        FROM accounts a
        JOIN app_users owner ON owner.id = a.owner_user_id
        LEFT JOIN opportunities o
            ON o.account_id = a.id
           AND o.tenant_id = a.tenant_id
           AND o.global_status NOT IN ('closed_won', 'closed_lost')
        ${baseWhereClause(filter)}
        GROUP BY a.id, a.name, a.website, a.owner_user_id, owner.display_name
        ORDER BY lower(a.name), a.id
        LIMIT :limit OFFSET :offset
        """.trimIndent()

    private fun baseWhereClause(filter: AccountListFilter): String {
        val clauses = mutableListOf("a.tenant_id = :tenantId")

        if (filter.ownerScope is OpportunityOwnerScope.Limited) {
            clauses += "a.owner_user_id IN (:ownerScopeUserIds)"
        }

        if (filter.ownerUserId != null) {
            clauses += "a.owner_user_id = :ownerUserId"
        }

        if (filter.queryText != null) {
            clauses += "lower(a.name) LIKE :queryText"
        }

        return "WHERE " + clauses.joinToString("\n  AND ")
    }

    private fun findVisibleByIdSql(filter: AccountVisibilityLookup): String =
        """
        SELECT
            a.id,
            a.name,
            a.owner_user_id
        FROM accounts a
        ${visibilityLookupWhereClause(filter)}
        """.trimIndent()

    private fun findVisibleDetailByIdSql(filter: AccountVisibilityLookup): String =
        """
        SELECT
            a.id,
            a.name,
            a.owner_user_id,
            owner.display_name AS owner_name,
            COALESCE(COUNT(o.id), 0) AS open_opportunity_count
        FROM accounts a
        JOIN app_users owner ON owner.id = a.owner_user_id
        LEFT JOIN opportunities o
            ON o.account_id = a.id
           AND o.tenant_id = a.tenant_id
           AND o.global_status NOT IN ('closed_won', 'closed_lost')
        ${visibilityLookupWhereClause(filter)}
        GROUP BY a.id, a.name, a.owner_user_id, owner.display_name
        """.trimIndent()

    private fun visibilityLookupWhereClause(filter: AccountVisibilityLookup): String {
        val clauses = mutableListOf(
            "a.id = :accountId",
            "a.tenant_id = :tenantId",
        )

        if (filter.ownerScope is OpportunityOwnerScope.Limited) {
            clauses += "a.owner_user_id IN (:ownerScopeUserIds)"
        }

        return "WHERE " + clauses.joinToString("\n  AND ")
    }

    private fun bindFilterParams(
        statement: JdbcClient.StatementSpec,
        filter: AccountListFilter,
    ): JdbcClient.StatementSpec {
        var current = statement
            .param("tenantId", filter.tenantId)

        if (filter.ownerScope is OpportunityOwnerScope.Limited) {
            current = current.param("ownerScopeUserIds", filter.ownerScope.ownerUserIds)
        }

        if (filter.ownerUserId != null) {
            current = current.param("ownerUserId", filter.ownerUserId)
        }

        if (filter.queryText != null) {
            current = current.param("queryText", filter.queryText)
        }

        return current
    }

    private fun bindVisibilityLookupParams(
        statement: JdbcClient.StatementSpec,
        filter: AccountVisibilityLookup,
    ): JdbcClient.StatementSpec {
        var current = statement
            .param("accountId", filter.accountId)
            .param("tenantId", filter.tenantId)

        if (filter.ownerScope is OpportunityOwnerScope.Limited) {
            current = current.param("ownerScopeUserIds", filter.ownerScope.ownerUserIds)
        }

        return current
    }
}

data class CreateAccountCommand(
    val id: String,
    val tenantId: String,
    val name: String,
    val website: String?,
    val ownerUserId: String,
    val createdByUserId: String,
    val updatedByUserId: String,
)

data class AccountListFilter(
    val tenantId: String,
    val ownerScope: OpportunityOwnerScope,
    val ownerUserId: String?,
    val queryText: String?,
    val page: Int,
    val pageSize: Int,
)

data class AccountVisibilityLookup(
    val tenantId: String,
    val ownerScope: OpportunityOwnerScope,
    val accountId: String,
)

data class AccountImportLookup(
    val tenantId: String,
    val accountId: String? = null,
    val accountName: String? = null,
)

data class AccountRecord(
    val id: String,
    val name: String,
    val ownerUserId: String,
    val ownerName: String,
    val openOpportunityCount: Int,
)

data class AccountExportRecord(
    val id: String,
    val name: String,
    val website: String?,
    val ownerUserId: String,
    val ownerName: String,
    val openOpportunityCount: Int,
)

data class VisibleAccountRecord(
    val id: String,
    val name: String,
    val ownerUserId: String,
)

private fun java.sql.ResultSet.toAccountRecord(): AccountRecord =
    AccountRecord(
        id = getString("id"),
        name = getString("name"),
        ownerUserId = getString("owner_user_id"),
        ownerName = getString("owner_name"),
        openOpportunityCount = getInt("open_opportunity_count"),
    )

private fun java.sql.ResultSet.toAccountExportRecord(): AccountExportRecord =
    AccountExportRecord(
        id = getString("id"),
        name = getString("name"),
        website = getString("website"),
        ownerUserId = getString("owner_user_id"),
        ownerName = getString("owner_name"),
        openOpportunityCount = getInt("open_opportunity_count"),
    )

private fun java.sql.ResultSet.toVisibleAccountRecord(): VisibleAccountRecord =
    VisibleAccountRecord(
        id = getString("id"),
        name = getString("name"),
        ownerUserId = getString("owner_user_id"),
    )
