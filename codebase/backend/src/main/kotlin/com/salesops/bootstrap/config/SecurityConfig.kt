package com.salesops.bootstrap.config

import com.salesops.bootstrap.auth.BearerTokenFilter
import com.salesops.bootstrap.auth.TokenService
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
class SecurityConfig(
    private val tokenService: TokenService,
    @Value("\${app.allowed-origin}") private val allowedOrigin: String,
) {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors { cors ->
                val config = CorsConfiguration()
                config.allowedOrigins = listOf(allowedOrigin)
                config.allowedMethods = listOf("*")
                config.allowedHeaders = listOf("*")
                val source = UrlBasedCorsConfigurationSource()
                source.registerCorsConfiguration("/**", config)
                cors.configurationSource(source)
            }
            .csrf { it.disable() }
            .addFilterBefore(BearerTokenFilter(tokenService), UsernamePasswordAuthenticationFilter::class.java)
            .authorizeHttpRequests {
                it.anyRequest().permitAll()
            }

        return http.build()
    }
}
