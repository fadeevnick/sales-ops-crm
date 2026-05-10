package com.salesops.bootstrap.crm.account

import com.salesops.bootstrap.api.ForbiddenOperationException
import com.salesops.bootstrap.api.ValidationFailureException
import com.salesops.bootstrap.auth.CurrentUserContext
import com.salesops.bootstrap.crm.opportunity.TeamScopePolicy
import com.salesops.bootstrap.repository.UserShellRepository
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class AccountService(
    private val accountRepository: AccountRepository,
    private val userShellRepository: UserShellRepository,
    private val teamScopePolicy: TeamScopePolicy,
) {
    fun listAccounts(
        context: CurrentUserContext,
        ownerId: String?,
        query: String?,
        page: Int?,
        pageSize: Int?,
    ): AccountListResponse {
        val resolvedPage = normalizePage(page)
        val resolvedPageSize = normalizePageSize(pageSize)
        val normalizedQuery = query?.trim()?.takeIf { it.isNotEmpty() }?.lowercase()?.let { "%$it%" }

        assertCanListAccounts(context)

        val filter = AccountListFilter(
            tenantId = context.tenant.tenantId,
            ownerScope = teamScopePolicy.opportunityOwnerScope(context),
            ownerUserId = ownerId?.trim()?.takeIf { it.isNotEmpty() },
            queryText = normalizedQuery,
            page = resolvedPage,
            pageSize = resolvedPageSize,
        )

        val items = accountRepository.listVisible(filter).map { record ->
            AccountListItem(
                id = record.id,
                name = record.name,
                ownerId = record.ownerUserId,
                ownerName = record.ownerName,
                openOpportunityCount = record.openOpportunityCount,
            )
        }

        return AccountListResponse(
            items = items,
            page = resolvedPage,
            pageSize = resolvedPageSize,
            total = accountRepository.countVisible(filter),
        )
    }

    fun createAccount(
        context: CurrentUserContext,
        request: CreateAccountRequest,
    ): CreateAccountResponse {
        val resolvedOwnerId = request.ownerId?.trim()?.takeIf { it.isNotEmpty() } ?: context.userId
        assertCanCreateAccount(context, resolvedOwnerId)

        val owner = userShellRepository.findByUserId(resolvedOwnerId)
            ?: throw ValidationFailureException("Owner user does not exist")

        if (owner.tenantId != context.tenant.tenantId) {
            throw ValidationFailureException("Owner must belong to the current tenant")
        }

        val accountId = accountRepository.create(
            CreateAccountCommand(
                id = "acc_${UUID.randomUUID().toString().replace("-", "").take(12)}",
                tenantId = context.tenant.tenantId,
                name = request.name.trim(),
                website = request.website?.trim()?.takeIf { it.isNotEmpty() },
                ownerUserId = resolvedOwnerId,
                createdByUserId = context.userId,
                updatedByUserId = context.userId,
            ),
        )

        return CreateAccountResponse(id = accountId)
    }

    private fun assertCanListAccounts(context: CurrentUserContext) {
        when (context.roleKey) {
            "sales_rep", "sales_manager", "revops_admin" -> return
            "finance_approver", "legal_approver" ->
                throw ForbiddenOperationException("Current role cannot browse account records")
            else ->
                throw ForbiddenOperationException("Current role cannot browse account records")
        }
    }

    private fun assertCanCreateAccount(context: CurrentUserContext, ownerUserId: String) {
        when (context.roleKey) {
            "sales_rep", "sales_manager" -> {
                if (ownerUserId != context.userId) {
                    throw ForbiddenOperationException("Current role cannot assign account owner outside self scope")
                }
            }
            "revops_admin" -> return
            "finance_approver", "legal_approver" ->
                throw ForbiddenOperationException("Current role cannot create account records")
            else ->
                throw ForbiddenOperationException("Current role cannot create account records")
        }
    }

    private fun normalizePage(page: Int?): Int {
        val resolved = page ?: 1
        if (resolved < 1) {
            throw ValidationFailureException("Page must be greater than or equal to 1")
        }

        return resolved
    }

    private fun normalizePageSize(pageSize: Int?): Int {
        val resolved = pageSize ?: 20
        if (resolved !in 1..100) {
            throw ValidationFailureException("Page size must be between 1 and 100")
        }

        return resolved
    }
}
