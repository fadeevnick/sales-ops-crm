package com.salesops.bootstrap.crm.opportunity

import jakarta.validation.constraints.NotBlank
import com.fasterxml.jackson.databind.JsonNode
import java.math.BigDecimal
import java.time.LocalDate

data class CreateOpportunityRequest(
    @field:NotBlank(message = "Opportunity title is required")
    val title: String,
    @field:NotBlank(message = "Account id is required")
    val accountId: String,
    val primaryContactId: String? = null,
    val ownerId: String? = null,
    @field:NotBlank(message = "Stage key is required")
    val stageKey: String,
    val expectedAmount: BigDecimal? = null,
    val closeDate: LocalDate? = null,
    val customFields: Map<String, JsonNode?> = emptyMap(),
)

data class CreateOpportunityResponse(
    val id: String,
)

data class MoveOpportunityStageRequest(
    @field:NotBlank(message = "Target stage key is required")
    val targetStageKey: String,
)

data class MoveOpportunityStageResponse(
    val id: String,
    val stageKey: String,
    val updated: Boolean,
)

data class UpdateOpportunityRequest(
    val title: String? = null,
    val expectedAmount: BigDecimal? = null,
    val closeDate: LocalDate? = null,
    val customFields: Map<String, JsonNode?>? = null,
    val stageKey: String? = null,
    val ownerId: String? = null,
)

data class UpdateOpportunityResponse(
    val id: String,
    val updated: Boolean,
)

data class ReassignOpportunityOwnerRequest(
    @field:NotBlank(message = "New owner id is required")
    val newOwnerId: String,
)

data class ReassignOpportunityOwnerResponse(
    val id: String,
    val ownerId: String,
    val updated: Boolean,
)

data class OpportunityListItem(
    val id: String,
    val title: String,
    val accountId: String,
    val accountName: String,
    val ownerId: String,
    val ownerName: String,
    val stageKey: String,
    val expectedAmount: BigDecimal?,
    val closeDate: LocalDate?,
    val approvalState: String,
)

data class OpportunityListResponse(
    val items: List<OpportunityListItem>,
    val page: Int,
    val pageSize: Int,
    val total: Int,
)

data class OpportunityDetailAccount(
    val id: String,
    val name: String,
)

data class OpportunityDetailContact(
    val id: String,
    val fullName: String,
)

data class OpportunityDetailOwner(
    val id: String,
    val displayName: String,
)

data class OpportunityDetailResponse(
    val id: String,
    val title: String,
    val account: OpportunityDetailAccount,
    val primaryContact: OpportunityDetailContact?,
    val owner: OpportunityDetailOwner,
    val stageKey: String,
    val expectedAmount: BigDecimal?,
    val closeDate: LocalDate?,
    val customFields: Map<String, Any?> = emptyMap(),
    val approvalState: String,
    val timeline: List<Any> = emptyList(),
)
