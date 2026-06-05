package com.salesops.bootstrap.auth

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

@Component
class TokenService(
    @Value("\${app.token-secret}") private val secret: String,
) {
    private val tokenTtlMs = 7L * 24 * 60 * 60 * 1000

    fun generateToken(userId: String): String {
        val expiryMs = System.currentTimeMillis() + tokenTtlMs
        val payload = encodeBase64("$userId|$expiryMs")
        val sig = hmac(payload)
        return "$payload.$sig"
    }

    fun validateToken(token: String): String? {
        val dot = token.lastIndexOf('.')
        if (dot < 0) return null
        val payload = token.substring(0, dot)
        val sig = token.substring(dot + 1)
        if (hmac(payload) != sig) return null
        val decoded = decodeBase64(payload) ?: return null
        val parts = decoded.split("|")
        if (parts.size != 2) return null
        val (userId, expiryStr) = parts
        val expiry = expiryStr.toLongOrNull() ?: return null
        if (System.currentTimeMillis() > expiry) return null
        return userId.takeIf { it.isNotBlank() }
    }

    private fun hmac(data: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return Base64.getUrlEncoder().withoutPadding()
            .encodeToString(mac.doFinal(data.toByteArray(Charsets.UTF_8)))
    }

    private fun encodeBase64(value: String): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(value.toByteArray(Charsets.UTF_8))

    private fun decodeBase64(value: String): String? =
        runCatching { String(Base64.getUrlDecoder().decode(value), Charsets.UTF_8) }.getOrNull()
}
