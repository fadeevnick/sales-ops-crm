package com.salesops.bootstrap.savedview

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant
import java.time.OffsetDateTime

@Repository
class SavedViewRepository(
    private val jdbcClient: JdbcClient,
    private val objectMapper: ObjectMapper,
) {
    fun listOpportunityViews(tenantId: String, ownerUserId: String): List<SavedViewRecord> =
        jdbcClient.sql(
            """
            SELECT
                saved_views.id,
                saved_views.tenant_id,
                owner_user_id,
                owner.display_name AS owner_name,
                workspace_type,
                name,
                visibility_scope,
                filter_config,
                saved_views.created_at,
                updated_at
            FROM saved_views
            JOIN app_users owner
                ON owner.id = saved_views.owner_user_id
               AND owner.tenant_id = saved_views.tenant_id
            WHERE saved_views.tenant_id = :tenantId
              AND workspace_type = 'opportunity'
              AND (
                owner_user_id = :ownerUserId
                OR visibility_scope = 'shared'
              )
            ORDER BY
                CASE WHEN owner_user_id = :ownerUserId THEN 0 ELSE 1 END,
                updated_at DESC,
                lower(name),
                id
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("ownerUserId", ownerUserId)
            .query { rs, _ -> rs.toSavedViewRecord(objectMapper) }
            .list()

    fun createOpportunityView(command: CreateSavedViewCommand): String {
        jdbcClient.sql(
            """
            INSERT INTO saved_views (
                id,
                tenant_id,
                owner_user_id,
                workspace_type,
                name,
                visibility_scope,
                filter_config
            ) VALUES (
                :id,
                :tenantId,
                :ownerUserId,
                'opportunity',
                :name,
                :visibilityScope,
                CAST(:filterConfigJson AS jsonb)
            )
            """.trimIndent(),
        )
            .param("id", command.id)
            .param("tenantId", command.tenantId)
            .param("ownerUserId", command.ownerUserId)
            .param("name", command.name)
            .param("visibilityScope", command.visibilityScope)
            .param("filterConfigJson", objectMapper.writeValueAsString(command.filters))
            .update()

        return command.id
    }

    fun findOpportunityView(tenantId: String, savedViewId: String): SavedViewRecord? =
        jdbcClient.sql(
            """
            SELECT
                saved_views.id,
                saved_views.tenant_id,
                owner_user_id,
                owner.display_name AS owner_name,
                workspace_type,
                name,
                visibility_scope,
                filter_config,
                saved_views.created_at,
                updated_at
            FROM saved_views
            JOIN app_users owner
                ON owner.id = saved_views.owner_user_id
               AND owner.tenant_id = saved_views.tenant_id
            WHERE saved_views.tenant_id = :tenantId
              AND saved_views.id = :savedViewId
              AND workspace_type = 'opportunity'
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("savedViewId", savedViewId)
            .query { rs, _ -> rs.toSavedViewRecord(objectMapper) }
            .optional()
            .orElse(null)

    fun updateOpportunityView(command: UpdateSavedViewCommand): Boolean {
        val updatedRows = jdbcClient.sql(
            """
            UPDATE saved_views
            SET name = :name,
                visibility_scope = :visibilityScope,
                filter_config = CAST(:filterConfigJson AS jsonb),
                updated_at = NOW()
            WHERE id = :id
              AND tenant_id = :tenantId
              AND owner_user_id = :ownerUserId
              AND workspace_type = 'opportunity'
            """.trimIndent(),
        )
            .param("id", command.id)
            .param("tenantId", command.tenantId)
            .param("ownerUserId", command.ownerUserId)
            .param("name", command.name)
            .param("visibilityScope", command.visibilityScope)
            .param("filterConfigJson", objectMapper.writeValueAsString(command.filters))
            .update()

        return updatedRows == 1
    }

    fun deleteOpportunityView(tenantId: String, ownerUserId: String, savedViewId: String): Boolean {
        val deletedRows = jdbcClient.sql(
            """
            DELETE FROM saved_views
            WHERE id = :savedViewId
              AND tenant_id = :tenantId
              AND owner_user_id = :ownerUserId
              AND workspace_type = 'opportunity'
            """.trimIndent(),
        )
            .param("tenantId", tenantId)
            .param("ownerUserId", ownerUserId)
            .param("savedViewId", savedViewId)
            .update()

        return deletedRows == 1
    }
}

data class CreateSavedViewCommand(
    val id: String,
    val tenantId: String,
    val ownerUserId: String,
    val name: String,
    val visibilityScope: String,
    val filters: SavedOpportunityViewFilters,
)

data class UpdateSavedViewCommand(
    val id: String,
    val tenantId: String,
    val ownerUserId: String,
    val name: String,
    val visibilityScope: String,
    val filters: SavedOpportunityViewFilters,
)

data class SavedViewRecord(
    val id: String,
    val tenantId: String,
    val ownerUserId: String,
    val ownerName: String,
    val workspaceType: String,
    val name: String,
    val visibilityScope: String,
    val filters: SavedOpportunityViewFilters,
    val createdAt: Instant,
    val updatedAt: Instant,
)

private fun ResultSet.toSavedViewRecord(objectMapper: ObjectMapper): SavedViewRecord =
    SavedViewRecord(
        id = getString("id"),
        tenantId = getString("tenant_id"),
        ownerUserId = getString("owner_user_id"),
        ownerName = getString("owner_name"),
        workspaceType = getString("workspace_type"),
        name = getString("name"),
        visibilityScope = getString("visibility_scope"),
        filters = objectMapper.readValue(
            getString("filter_config"),
            SavedOpportunityViewFilters::class.java,
        ),
        createdAt = getObject("created_at", OffsetDateTime::class.java).toInstant(),
        updatedAt = getObject("updated_at", OffsetDateTime::class.java).toInstant(),
    )
