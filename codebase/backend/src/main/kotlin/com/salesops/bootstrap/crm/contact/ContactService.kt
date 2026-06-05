package com.salesops.bootstrap.crm.contact

import com.salesops.bootstrap.api.ForbiddenOperationException
import com.salesops.bootstrap.api.ValidationFailureException
import com.salesops.bootstrap.auth.CurrentUserContext
import com.salesops.bootstrap.crm.account.AccountRepository
import com.salesops.bootstrap.crm.account.AccountVisibilityLookup
import com.salesops.bootstrap.crm.opportunity.TeamScopePolicy
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class ContactService(
    private val accountRepository: AccountRepository,
    private val contactRepository: ContactRepository,
    private val teamScopePolicy: TeamScopePolicy,
) {
    fun listContacts(
        context: CurrentUserContext,
        accountId: String?,
        ownerId: String?,
        query: String?,
    ): ContactListResponse {
        assertCanListContacts(context)

        val items = contactRepository.listVisible(
            ContactListFilter(
                tenantId = context.tenant.tenantId,
                ownerScope = teamScopePolicy.opportunityOwnerScope(context),
                accountId = accountId?.trim()?.takeIf { it.isNotEmpty() },
                ownerUserId = ownerId?.trim()?.takeIf { it.isNotEmpty() },
                queryText = query?.trim()?.takeIf { it.isNotEmpty() }?.lowercase()?.let { "%$it%" },
            ),
        ).map { record ->
            ContactListItem(
                id = record.id,
                accountId = record.accountId,
                accountName = record.accountName,
                fullName = record.fullName,
                email = record.email,
            )
        }

        return ContactListResponse(items = items)
    }

    fun createContact(
        context: CurrentUserContext,
        request: CreateContactRequest,
    ): CreateContactResponse {
        assertCanCreateContact(context)

        val resolvedAccountId = request.accountId.trim()
        val visibleAccount = accountRepository.findVisibleAccountById(
            AccountVisibilityLookup(
                tenantId = context.tenant.tenantId,
                ownerScope = teamScopePolicy.opportunityOwnerScope(context),
                accountId = resolvedAccountId,
            ),
        ) ?: throw ValidationFailureException("Account does not exist in visible scope")

        val contactId = contactRepository.create(
            CreateContactCommand(
                id = "con_${UUID.randomUUID().toString().replace("-", "").take(12)}",
                tenantId = context.tenant.tenantId,
                accountId = visibleAccount.id,
                fullName = request.fullName.trim(),
                email = request.email?.trim()?.takeIf { it.isNotEmpty() },
                phone = request.phone?.trim()?.takeIf { it.isNotEmpty() },
                ownerUserId = context.userId,
                createdByUserId = context.userId,
                updatedByUserId = context.userId,
            ),
        )

        return CreateContactResponse(id = contactId)
    }

    private fun assertCanListContacts(context: CurrentUserContext) {
        when (context.roleKey) {
            "sales_rep", "sales_manager", "revops_admin" -> return
            "finance_approver", "legal_approver" ->
                throw ForbiddenOperationException("Current role cannot browse contact records")
            else ->
                throw ForbiddenOperationException("Current role cannot browse contact records")
        }
    }

    private fun assertCanCreateContact(context: CurrentUserContext) {
        when (context.roleKey) {
            "sales_rep", "sales_manager", "revops_admin" -> return
            "finance_approver", "legal_approver" ->
                throw ForbiddenOperationException("Current role cannot create contact records")
            else ->
                throw ForbiddenOperationException("Current role cannot create contact records")
        }
    }

}
