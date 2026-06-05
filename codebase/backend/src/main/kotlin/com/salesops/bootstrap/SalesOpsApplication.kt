package com.salesops.bootstrap

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class SalesOpsApplication

fun main(args: Array<String>) {
    runApplication<SalesOpsApplication>(*args)
}
