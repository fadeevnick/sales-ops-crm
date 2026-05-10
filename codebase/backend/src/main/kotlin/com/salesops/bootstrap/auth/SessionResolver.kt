package com.salesops.bootstrap.auth

import com.salesops.bootstrap.api.UnauthorizedSessionException
import org.springframework.stereotype.Component

@Component
class SessionResolver {
    fun resolveDemoUserId(headerValue: String?): String {
        if (headerValue.isNullOrBlank()) {
            throw UnauthorizedSessionException("Missing X-Demo-User-Id header")
        }

        return headerValue.trim()
    }
}
