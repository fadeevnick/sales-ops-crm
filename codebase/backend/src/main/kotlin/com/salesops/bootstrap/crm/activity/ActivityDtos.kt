package com.salesops.bootstrap.crm.activity

import jakarta.validation.constraints.NotBlank
import java.time.LocalDate

data class CreateActivityRequest(
    @field:NotBlank(message = "Activity type is required")
    val type: String,
    @field:NotBlank(message = "Activity title is required")
    val title: String,
    val dueDate: LocalDate? = null,
)

data class CreateActivityResponse(
    val id: String,
)

data class ActivityListItem(
    val id: String,
    val type: String,
    val title: String,
    val dueDate: LocalDate?,
    val status: String,
)

data class ActivityListResponse(
    val items: List<ActivityListItem>,
)
