package com.salesops.bootstrap.crm.activity

import com.salesops.bootstrap.api.ForbiddenOperationException
import com.salesops.bootstrap.api.ValidationFailureException
import com.salesops.bootstrap.auth.CurrentUserContext
import com.salesops.bootstrap.crm.opportunity.OpportunityRepository
import com.salesops.bootstrap.crm.opportunity.OpportunityVisibilityLookup
import com.salesops.bootstrap.crm.opportunity.TeamScopePolicy
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class ActivityService(
    private val activityRepository: ActivityRepository,
    private val opportunityRepository: OpportunityRepository,
    private val teamScopePolicy: TeamScopePolicy,
) {
    fun listActivities(
        context: CurrentUserContext,
        opportunityId: String,
    ): ActivityListResponse {
        assertCanReadActivities(context)
        requireVisibleOpportunity(context, opportunityId)

        val items = activityRepository.listByOpportunity(
            tenantId = context.tenant.tenantId,
            opportunityId = opportunityId,
        ).map { record ->
            ActivityListItem(
                id = record.id,
                type = record.type,
                title = record.title,
                dueDate = record.dueDate,
                status = record.status,
            )
        }

        return ActivityListResponse(items = items)
    }

    fun createActivity(
        context: CurrentUserContext,
        opportunityId: String,
        request: CreateActivityRequest,
    ): CreateActivityResponse {
        assertCanCreateActivities(context)
        requireVisibleOpportunity(context, opportunityId)

        val activityId = activityRepository.create(
            CreateActivityCommand(
                id = "act_${UUID.randomUUID().toString().replace("-", "").take(12)}",
                tenantId = context.tenant.tenantId,
                opportunityId = opportunityId,
                type = request.type.trim(),
                title = request.title.trim(),
                status = "open",
                dueDate = request.dueDate,
                ownerUserId = context.userId,
                createdByUserId = context.userId,
                updatedByUserId = context.userId,
            ),
        )

        return CreateActivityResponse(id = activityId)
    }

    private fun requireVisibleOpportunity(
        context: CurrentUserContext,
        opportunityId: String,
    ) {
        val visible = opportunityRepository.findVisibleById(
            OpportunityVisibilityLookup(
                tenantId = context.tenant.tenantId,
                ownerScope = teamScopePolicy.opportunityOwnerScope(context),
                opportunityId = opportunityId,
            ),
        )

        if (visible == null) {
            throw ValidationFailureException("Opportunity does not exist in visible scope")
        }
    }

    private fun assertCanReadActivities(context: CurrentUserContext) {
        when (context.roleKey) {
            "sales_rep", "sales_manager", "revops_admin" -> return
            "finance_approver", "legal_approver" ->
                throw ForbiddenOperationException("Current role cannot browse activity records")
            else ->
                throw ForbiddenOperationException("Current role cannot browse activity records")
        }
    }

    private fun assertCanCreateActivities(context: CurrentUserContext) {
        when (context.roleKey) {
            "sales_rep", "sales_manager", "revops_admin" -> return
            "finance_approver", "legal_approver" ->
                throw ForbiddenOperationException("Current role cannot create activity records")
            else ->
                throw ForbiddenOperationException("Current role cannot create activity records")
        }
    }

}
