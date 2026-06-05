package com.salesops.bootstrap.crm.account

import jakarta.validation.constraints.NotBlank

data class CreateAccountRequest(
    @field:NotBlank(message = "Account name is required")
    val name: String,
    val website: String? = null,
    val ownerId: String? = null,
)

data class CreateAccountResponse(
    val id: String,
)

data class AccountListItem(
    val id: String,
    val name: String,
    val ownerId: String,
    val ownerName: String,
    val openOpportunityCount: Int,
)

data class AccountListResponse(
    val items: List<AccountListItem>,
    val page: Int,
    val pageSize: Int,
    val total: Int,
)
