package com.salesops.bootstrap.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.task.TaskExecutor
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor

@Configuration
class BulkJobConfig {
    @Bean
    fun bulkJobTaskExecutor(): TaskExecutor {
        val executor = ThreadPoolTaskExecutor()
        executor.corePoolSize = 1
        executor.maxPoolSize = 2
        executor.queueCapacity = 100
        executor.setThreadNamePrefix("bulk-job-")
        executor.initialize()
        return executor
    }
}
