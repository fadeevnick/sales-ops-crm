package com.salesops.bootstrap.api

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class HealthController(
    private val jdbcClient: JdbcClient,
) {
    @GetMapping("/healthz")
    fun healthz(): Map<String, Any> = mapOf("status" to "ok")

    @GetMapping("/readyz")
    fun readyz(): ResponseEntity<Map<String, Any>> =
        try {
            jdbcClient.sql("select 1").query(Int::class.java).single()
            ResponseEntity.ok(
                mapOf(
                    "status" to "ready",
                    "dependencies" to mapOf("postgres" to "ok"),
                ),
            )
        } catch (ex: Exception) {
            ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(
                mapOf(
                    "status" to "not_ready",
                    "dependencies" to mapOf("postgres" to "down"),
                    "error" to (ex.message ?: "database check failed"),
                ),
            )
        }
}
