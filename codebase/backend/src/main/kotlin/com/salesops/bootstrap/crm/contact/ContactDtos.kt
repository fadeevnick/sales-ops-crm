package com.salesops.bootstrap.crm.contact

import jakarta.validation.constraints.NotBlank

data class CreateContactRequest(
    @field:NotBlank(message = "Account id is required")
    val accountId: String,
    @field:NotBlank(message = "Contact full name is required")
    val fullName: String,
    val email: String? = null,
    val phone: String? = null,
)

data class CreateContactResponse(
    val id: String,
)

data class ContactListItem(
    val id: String,
    val accountId: String,
    val accountName: String,
    val fullName: String,
    val email: String?,
)

data class ContactListResponse(
    val items: List<ContactListItem>,
)
