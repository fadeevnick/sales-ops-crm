package com.salesops.bootstrap.crm.opportunity

import com.salesops.bootstrap.auth.CurrentUserContext
import org.springframework.stereotype.Component

@Component
class TeamScopePolicy(
    private val managerVisibilityRepository: ManagerVisibilityRepository,
) {
    fun opportunityOwnerScope(context: CurrentUserContext): OpportunityOwnerScope =
        when (context.roleKey) {
            "revops_admin" -> OpportunityOwnerScope.AllTenant
            "sales_manager" -> OpportunityOwnerScope.Limited(
                ownerUserIds = listOf(context.userId) + managerVisibilityRepository.listActiveReportUserIds(
                    tenantId = context.tenant.tenantId,
                    managerUserId = context.userId,
                ),
            )
            else -> OpportunityOwnerScope.Limited(
                ownerUserIds = listOf(context.userId),
            )
        }
}

sealed interface OpportunityOwnerScope {
    data object AllTenant : OpportunityOwnerScope
    data class Limited(val ownerUserIds: List<String>) : OpportunityOwnerScope
}
