package com.salesops.bootstrap.savedview

import com.fasterxml.jackson.databind.JsonNode
import jakarta.validation.constraints.NotBlank
import java.time.Instant

data class SavedOpportunityViewListResponse(
    val views: List<SavedOpportunityViewItem>,
)

data class SavedOpportunityViewItem(
    val id: String,
    val name: String,
    val ownerId: String,
    val ownerName: String,
    val visibilityScope: String,
    val canManage: Boolean,
    val filters: SavedOpportunityViewFilters,
    val valid: Boolean,
    val invalidReasons: List<String>,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class CreateSavedOpportunityViewRequest(
    @field:NotBlank(message = "Saved view name is required")
    val name: String,
    val filters: SavedOpportunityViewFilters = SavedOpportunityViewFilters(),
    val visibilityScope: String = "private",
)

data class CreateSavedOpportunityViewResponse(
    val id: String,
)

data class UpdateSavedOpportunityViewRequest(
    val name: String? = null,
    val filters: SavedOpportunityViewFilters? = null,
    val visibilityScope: String? = null,
)

data class UpdateSavedOpportunityViewResponse(
    val id: String,
    val updated: Boolean,
)

data class DeleteSavedOpportunityViewResponse(
    val id: String,
    val deleted: Boolean,
)

data class SavedOpportunityViewFilters(
    val stageKey: String? = null,
    val ownerId: String? = null,
    val accountId: String? = null,
    val query: String? = null,
    val customFields: Map<String, JsonNode?> = emptyMap(),
)
