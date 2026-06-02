package com.salesops.bootstrap.auth

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletRequestWrapper
import jakarta.servlet.http.HttpServletResponse
import org.springframework.web.filter.OncePerRequestFilter
import java.util.Collections
import java.util.Enumeration

class BearerTokenFilter(
    private val tokenService: TokenService,
) : OncePerRequestFilter() {

    override fun shouldNotFilter(request: HttpServletRequest): Boolean =
        request.method == "OPTIONS"

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        if (isPublicPath(request.servletPath)) {
            filterChain.doFilter(request, response)
            return
        }

        val authHeader = request.getHeader("Authorization")
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing Bearer token")
            return
        }

        val token = authHeader.removePrefix("Bearer ").trim()
        val userId = tokenService.validateToken(token)
        if (userId == null) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired token")
            return
        }

        filterChain.doFilter(InjectUserIdRequestWrapper(request, userId), response)
    }

    private fun isPublicPath(path: String): Boolean =
        path == "/api/auth/login" || path.startsWith("/actuator")
}

private class InjectUserIdRequestWrapper(
    request: HttpServletRequest,
    private val userId: String,
) : HttpServletRequestWrapper(request) {

    override fun getHeader(name: String): String? {
        if (name.equals("X-Demo-User-Id", ignoreCase = true)) return userId
        return super.getHeader(name)
    }

    override fun getHeaders(name: String): Enumeration<String> {
        if (name.equals("X-Demo-User-Id", ignoreCase = true)) return Collections.enumeration(listOf(userId))
        return super.getHeaders(name)
    }

    override fun getHeaderNames(): Enumeration<String> {
        val names = Collections.list(super.getHeaderNames()).toMutableList()
        if (names.none { it.equals("X-Demo-User-Id", ignoreCase = true) }) {
            names.add("X-Demo-User-Id")
        }
        return Collections.enumeration(names)
    }
}
