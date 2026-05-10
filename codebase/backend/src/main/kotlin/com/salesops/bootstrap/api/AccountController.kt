package com.salesops.bootstrap.api

import com.salesops.bootstrap.crm.account.AccountListResponse
import com.salesops.bootstrap.crm.account.AccountService
import com.salesops.bootstrap.crm.account.CreateAccountRequest
import com.salesops.bootstrap.crm.account.CreateAccountResponse
import com.salesops.bootstrap.service.SessionService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/accounts")
class AccountController(
    private val accountService: AccountService,
    private val sessionService: SessionService,
) {
    @GetMapping
    fun listAccounts(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @RequestParam("q", required = false) query: String?,
        @RequestParam("ownerId", required = false) ownerId: String?,
        @RequestParam("page", required = false) page: Int?,
        @RequestParam("pageSize", required = false) pageSize: Int?,
    ): AccountListResponse =
        accountService.listAccounts(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            ownerId = ownerId,
            query = query,
            page = page,
            pageSize = pageSize,
        )

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createAccount(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @Valid @RequestBody request: CreateAccountRequest,
    ): CreateAccountResponse =
        accountService.createAccount(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            request = request,
        )
}
