package com.salesops.bootstrap.auth

data class CurrentUserContext(
    val userId: String,
    val email: String,
    val displayName: String,
    val roleKey: String,
    val roleName: String,
    val tenant: TenantContext,
)
