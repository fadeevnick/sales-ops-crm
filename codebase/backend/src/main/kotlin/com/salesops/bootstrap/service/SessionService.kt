package com.salesops.bootstrap.service

import com.salesops.bootstrap.api.ForbiddenOperationException
import com.salesops.bootstrap.api.UnauthorizedSessionException
import com.salesops.bootstrap.auth.CurrentUserContext
import com.salesops.bootstrap.auth.SessionResolver
import com.salesops.bootstrap.auth.ShellModuleVisibilityPolicy
import com.salesops.bootstrap.auth.TenantContext
import com.salesops.bootstrap.repository.UserShellRecord
import com.salesops.bootstrap.repository.UserShellRepository
import org.springframework.stereotype.Service

@Service
class SessionService(
    private val userShellRepository: UserShellRepository,
    private val sessionResolver: SessionResolver,
    private val shellModuleVisibilityPolicy: ShellModuleVisibilityPolicy,
) {
    fun demoUsers(): List<DemoUserSummary> =
        userShellRepository.findAll().map { it.toDemoUserSummary() }

    fun demoLogin(request: DemoLoginRequest): DemoLoginResponse {
        val user = userShellRepository.findByEmail(request.email)
            ?: throw UnauthorizedSessionException("Unknown demo user")

        return DemoLoginResponse(
            userId = user.userId,
            email = user.email,
            displayName = user.displayName,
            roleKey = user.roleKey,
            roleName = user.roleName,
            tenantId = user.tenantId,
            tenantName = user.tenantName,
            tokenHint = user.userId,
        )
    }

    fun currentUser(userId: String?): CurrentUserView {
        val context = resolveCurrentUserContext(userId)
        val modules = shellModuleVisibilityPolicy.visibleModulesFor(context.roleKey)

        return CurrentUserView(
            userId = context.userId,
            email = context.email,
            displayName = context.displayName,
            roleKey = context.roleKey,
            roleName = context.roleName,
            tenantId = context.tenant.tenantId,
            tenantName = context.tenant.tenantName,
            modules = modules,
        )
    }

    fun resolveCurrentUserContext(userId: String?): CurrentUserContext {
        val resolvedUserId = sessionResolver.resolveDemoUserId(userId)
        return loadCurrentUserContext(resolvedUserId)
    }

    private fun loadCurrentUserContext(userId: String): CurrentUserContext {
        val user = userShellRepository.findByUserId(userId)
            ?: throw UnauthorizedSessionException("Unknown demo user id")

        if (user.tenantId.isBlank()) {
            throw ForbiddenOperationException("Resolved user has no tenant context")
        }

        return CurrentUserContext(
            userId = user.userId,
            email = user.email,
            displayName = user.displayName,
            roleKey = user.roleKey,
            roleName = user.roleName,
            tenant = TenantContext(
                tenantId = user.tenantId,
                tenantName = user.tenantName,
            ),
        )
    }
}

private fun UserShellRecord.toDemoUserSummary(): DemoUserSummary =
    DemoUserSummary(
        userId = userId,
        email = email,
        displayName = displayName,
        roleKey = roleKey,
        roleName = roleName,
        tenantId = tenantId,
        tenantName = tenantName,
    )

data class DemoUserSummary(
    val userId: String,
    val email: String,
    val displayName: String,
    val roleKey: String,
    val roleName: String,
    val tenantId: String,
    val tenantName: String,
)

data class DemoLoginRequest(
    val email: String,
)

data class DemoLoginResponse(
    val userId: String,
    val email: String,
    val displayName: String,
    val roleKey: String,
    val roleName: String,
    val tenantId: String,
    val tenantName: String,
    val tokenHint: String,
)

data class CurrentUserView(
    val userId: String,
    val email: String,
    val displayName: String,
    val roleKey: String,
    val roleName: String,
    val tenantId: String,
    val tenantName: String,
    val modules: List<String>,
)
