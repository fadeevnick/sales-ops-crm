package com.salesops.bootstrap.config

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type.SERVLET
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.annotation.Order
import org.springframework.security.config.Customizer.withDefaults
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.web.SecurityFilterChain

@Configuration
@ConditionalOnWebApplication(type = SERVLET)
class HealthEndpointSecurityConfig {
    @Bean
    @Order(1)
    fun healthEndpointSecurityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .securityMatcher("/readyz", "/healthz", "/actuator/health", "/actuator/health/**")
            .authorizeHttpRequests { it.anyRequest().permitAll() }
            .csrf { it.disable() }
            .httpBasic(withDefaults())

        return http.build()
    }
}
