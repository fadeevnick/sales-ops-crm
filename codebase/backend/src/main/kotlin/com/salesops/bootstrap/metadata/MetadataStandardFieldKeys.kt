package com.salesops.bootstrap.metadata

object MetadataStandardFieldKeys {
    val opportunity: Set<String> = setOf(
        "title",
        "account_id",
        "primary_contact_id",
        "owner_user_id",
        "expected_amount",
        "close_date",
    )
}
