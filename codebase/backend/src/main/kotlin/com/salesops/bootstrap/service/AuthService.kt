package com.salesops.bootstrap.service

import com.salesops.bootstrap.api.UnauthorizedSessionException
import com.salesops.bootstrap.auth.TokenService
import com.salesops.bootstrap.repository.UserShellRepository
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service

@Service
class AuthService(
    private val userShellRepository: UserShellRepository,
    private val tokenService: TokenService,
) {
    private val passwordEncoder = BCryptPasswordEncoder()

    fun login(email: String, password: String): LoginResponse {
        val user = userShellRepository.findByEmail(email)
            ?: throw UnauthorizedSessionException("Invalid credentials")

        val hash = userShellRepository.findPasswordHash(email)
            ?: throw UnauthorizedSessionException("Invalid credentials")

        if (!passwordEncoder.matches(password, hash)) {
            throw UnauthorizedSessionException("Invalid credentials")
        }

        return LoginResponse(
            token = tokenService.generateToken(user.userId),
            userId = user.userId,
            email = user.email,
            displayName = user.displayName,
            roleKey = user.roleKey,
            roleName = user.roleName,
            tenantId = user.tenantId,
            tenantName = user.tenantName,
        )
    }
}

data class LoginRequest(
    val email: String,
    val password: String,
)

data class LoginResponse(
    val token: String,
    val userId: String,
    val email: String,
    val displayName: String,
    val roleKey: String,
    val roleName: String,
    val tenantId: String,
    val tenantName: String,
)
