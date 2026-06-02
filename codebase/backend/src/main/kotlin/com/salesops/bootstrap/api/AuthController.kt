package com.salesops.bootstrap.api

import com.salesops.bootstrap.service.AuthService
import com.salesops.bootstrap.service.LoginRequest
import com.salesops.bootstrap.service.LoginResponse
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService,
) {
    @PostMapping("/login")
    fun login(@RequestBody request: LoginRequest): LoginResponse =
        authService.login(request.email, request.password)
}
