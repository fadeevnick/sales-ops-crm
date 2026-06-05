package com.salesops.bootstrap.crm.contact

import com.salesops.bootstrap.crm.opportunity.OpportunityOwnerScope
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository

@Repository
class ContactRepository(
    private val jdbcClient: JdbcClient,
) {
    fun create(command: CreateContactCommand): String {
        jdbcClient.sql(
            """
            INSERT INTO contacts (
                id,
                tenant_id,
                account_id,
                full_name,
                email,
                phone,
                owner_user_id,
                created_by_user_id,
                updated_by_user_id
            ) VALUES (
                :id,
                :tenantId,
                :accountId,
                :fullName,
                :email,
                :phone,
                :ownerUserId,
                :createdByUserId,
                :updatedByUserId
            )
            """.trimIndent(),
        )
            .param("id", command.id)
            .param("tenantId", command.tenantId)
            .param("accountId", command.accountId)
            .param("fullName", command.fullName)
            .param("email", command.email)
            .param("phone", command.phone)
            .param("ownerUserId", command.ownerUserId)
            .param("createdByUserId", command.createdByUserId)
            .param("updatedByUserId", command.updatedByUserId)
            .update()

        return command.id
    }

    fun listVisible(filter: ContactListFilter): List<ContactRecord> =
        bindFilterParams(jdbcClient.sql(selectSql(filter)), filter)
            .query { rs, _ -> rs.toContactRecord() }
            .list()

    fun findVisibleContactById(filter: ContactVisibilityLookup): VisibleContactRecord? =
        bindVisibilityLookupParams(jdbcClient.sql(findVisibleByIdSql(filter)), filter)
            .query { rs, _ -> rs.toVisibleContactRecord() }
            .optional()
            .orElse(null)

    private fun selectSql(filter: ContactListFilter): String =
        """
        SELECT
            c.id,
            c.account_id,
            a.name AS account_name,
            c.full_name,
            c.email
        FROM contacts c
        JOIN accounts a
            ON a.id = c.account_id
           AND a.tenant_id = c.tenant_id
        ${baseWhereClause(filter)}
        ORDER BY lower(c.full_name), c.id
        """.trimIndent()

    private fun findVisibleByIdSql(filter: ContactVisibilityLookup): String =
        """
        SELECT
            c.id,
            c.account_id,
            c.full_name
        FROM contacts c
        JOIN accounts a
            ON a.id = c.account_id
           AND a.tenant_id = c.tenant_id
        ${visibilityLookupWhereClause(filter)}
        """.trimIndent()

    private fun baseWhereClause(filter: ContactListFilter): String {
        val clauses = mutableListOf("c.tenant_id = :tenantId")

        if (filter.ownerScope is OpportunityOwnerScope.Limited) {
            clauses += "a.owner_user_id IN (:ownerScopeUserIds)"
        }

        if (filter.accountId != null) {
            clauses += "c.account_id = :accountId"
        }

        if (filter.ownerUserId != null) {
            clauses += "c.owner_user_id = :ownerUserId"
        }

        if (filter.queryText != null) {
            clauses += "(lower(c.full_name) LIKE :queryText OR lower(COALESCE(c.email, '')) LIKE :queryText)"
        }

        return "WHERE " + clauses.joinToString("\n  AND ")
    }

    private fun visibilityLookupWhereClause(filter: ContactVisibilityLookup): String {
        val clauses = mutableListOf(
            "c.id = :contactId",
            "c.tenant_id = :tenantId",
        )

        if (filter.accountId != null) {
            clauses += "c.account_id = :accountId"
        }

        if (filter.ownerScope is OpportunityOwnerScope.Limited) {
            clauses += "a.owner_user_id IN (:ownerScopeUserIds)"
        }

        return "WHERE " + clauses.joinToString("\n  AND ")
    }

    private fun bindFilterParams(
        statement: JdbcClient.StatementSpec,
        filter: ContactListFilter,
    ): JdbcClient.StatementSpec {
        var current = statement
            .param("tenantId", filter.tenantId)

        if (filter.ownerScope is OpportunityOwnerScope.Limited) {
            current = current.param("ownerScopeUserIds", filter.ownerScope.ownerUserIds)
        }

        if (filter.accountId != null) {
            current = current.param("accountId", filter.accountId)
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
        filter: ContactVisibilityLookup,
    ): JdbcClient.StatementSpec {
        var current = statement
            .param("contactId", filter.contactId)
            .param("tenantId", filter.tenantId)

        if (filter.accountId != null) {
            current = current.param("accountId", filter.accountId)
        }

        if (filter.ownerScope is OpportunityOwnerScope.Limited) {
            current = current.param("ownerScopeUserIds", filter.ownerScope.ownerUserIds)
        }

        return current
    }
}

data class CreateContactCommand(
    val id: String,
    val tenantId: String,
    val accountId: String,
    val fullName: String,
    val email: String?,
    val phone: String?,
    val ownerUserId: String,
    val createdByUserId: String,
    val updatedByUserId: String,
)

data class ContactListFilter(
    val tenantId: String,
    val ownerScope: OpportunityOwnerScope,
    val accountId: String?,
    val ownerUserId: String?,
    val queryText: String?,
)

data class ContactVisibilityLookup(
    val tenantId: String,
    val ownerScope: OpportunityOwnerScope,
    val contactId: String,
    val accountId: String? = null,
)

data class ContactRecord(
    val id: String,
    val accountId: String,
    val accountName: String,
    val fullName: String,
    val email: String?,
)

data class VisibleContactRecord(
    val id: String,
    val accountId: String,
    val fullName: String,
)

private fun java.sql.ResultSet.toContactRecord(): ContactRecord =
    ContactRecord(
        id = getString("id"),
        accountId = getString("account_id"),
        accountName = getString("account_name"),
        fullName = getString("full_name"),
        email = getString("email"),
    )

private fun java.sql.ResultSet.toVisibleContactRecord(): VisibleContactRecord =
    VisibleContactRecord(
        id = getString("id"),
        accountId = getString("account_id"),
        fullName = getString("full_name"),
    )
