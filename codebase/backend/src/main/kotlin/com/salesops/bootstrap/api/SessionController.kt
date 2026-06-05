package com.salesops.bootstrap.api

import com.salesops.bootstrap.service.CurrentUserView
import com.salesops.bootstrap.service.DemoLoginRequest
import com.salesops.bootstrap.service.DemoLoginResponse
import com.salesops.bootstrap.service.DemoUserSummary
import com.salesops.bootstrap.service.SessionService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class SessionController(
    private val sessionService: SessionService,
) {
    @GetMapping("/session/demo-users")
    fun demoUsers(): List<DemoUserSummary> = sessionService.demoUsers()

    @PostMapping("/session/demo-login")
    fun demoLogin(@RequestBody request: DemoLoginRequest): DemoLoginResponse = sessionService.demoLogin(request)

    @GetMapping("/me")
    fun currentUser(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
    ): CurrentUserView = sessionService.currentUser(demoUserId)
}

@ResponseStatus(HttpStatus.UNAUTHORIZED)
class UnauthorizedSessionException(message: String) : RuntimeException(message)

@ResponseStatus(HttpStatus.FORBIDDEN)
class ForbiddenOperationException(message: String) : RuntimeException(message)

@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
class ValidationFailureException(message: String) : RuntimeException(message)
