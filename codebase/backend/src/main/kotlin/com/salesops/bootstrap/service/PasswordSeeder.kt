package com.salesops.bootstrap.service

import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Component

@Component
class PasswordSeeder(
    private val jdbcTemplate: JdbcTemplate,
) : ApplicationRunner {
    private val encoder = BCryptPasswordEncoder()

    private val demoPasswords = mapOf(
        "user_anna" to "anna2026",
        "user_michael" to "michael2026",
        "user_irina" to "irina2026",
        "user_daria" to "daria2026",
        "user_oleg" to "oleg2026",
    )

    override fun run(args: ApplicationArguments) {
        demoPasswords.forEach { (userId, plainPassword) ->
            jdbcTemplate.update(
                "UPDATE app_users SET password_hash = ? WHERE id = ? AND password_hash IS NULL",
                encoder.encode(plainPassword),
                userId,
            )
        }
    }
}
