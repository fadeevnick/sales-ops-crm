package com.salesops.bootstrap.auth

import com.salesops.bootstrap.api.ForbiddenOperationException
import org.springframework.stereotype.Component

@Component
class ShellModuleVisibilityPolicy {
    fun visibleModulesFor(roleKey: String): List<String> =
        when (roleKey) {
            "sales_rep" -> listOf("Opportunities", "Accounts", "Contacts", "Activities", "Approvals")
            "sales_manager" -> listOf("Team Pipeline", "Opportunities", "Approvals", "Views", "Reports")
            "revops_admin" -> listOf("Configuration", "Imports", "Approvals", "Views", "Audit")
            "finance_approver" -> listOf("Approvals")
            "legal_approver" -> listOf("Approvals")
            else -> throw ForbiddenOperationException("No shell visibility policy for role '$roleKey'")
        }
}
