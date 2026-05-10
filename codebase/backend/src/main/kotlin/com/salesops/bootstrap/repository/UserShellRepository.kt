package com.salesops.bootstrap.repository

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository

@Repository
class UserShellRepository(
    private val jdbcClient: JdbcClient,
) {
    fun findAll(): List<UserShellRecord> =
        jdbcClient.sql(baseSelect + "\nORDER BY u.display_name")
            .query { rs, _ -> rs.toUserShellRecord() }
            .list()

    fun findByEmail(email: String): UserShellRecord? =
        jdbcClient.sql(baseSelect + "\nWHERE lower(u.email) = lower(:email)")
            .param("email", email)
            .query { rs, _ -> rs.toUserShellRecord() }
            .optional()
            .orElse(null)

    fun findByUserId(userId: String): UserShellRecord? =
        jdbcClient.sql(baseSelect + "\nWHERE u.id = :userId")
            .param("userId", userId)
            .query { rs, _ -> rs.toUserShellRecord() }
            .optional()
            .orElse(null)

    private companion object {
        val baseSelect =
            """
            SELECT
                u.id,
                u.email,
                u.display_name,
                r.role_key,
                r.display_name AS role_name,
                t.id AS tenant_id,
                t.name AS tenant_name
            FROM app_users u
            JOIN user_role_assignments ura ON ura.user_id = u.id
            JOIN roles r ON r.id = ura.role_id
            JOIN tenants t ON t.id = u.tenant_id
            """.trimIndent()
    }
}

data class UserShellRecord(
    val userId: String,
    val email: String,
    val displayName: String,
    val roleKey: String,
    val roleName: String,
    val tenantId: String,
    val tenantName: String,
)

private fun java.sql.ResultSet.toUserShellRecord(): UserShellRecord =
    UserShellRecord(
        userId = getString("id"),
        email = getString("email"),
        displayName = getString("display_name"),
        roleKey = getString("role_key"),
        roleName = getString("role_name"),
        tenantId = getString("tenant_id"),
        tenantName = getString("tenant_name"),
    )
