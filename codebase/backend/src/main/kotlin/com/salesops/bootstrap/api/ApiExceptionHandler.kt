package com.salesops.bootstrap.api

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(UnauthorizedSessionException::class)
    fun handleUnauthorized(exception: UnauthorizedSessionException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(ApiErrorResponse(error = "unauthorized", message = exception.message ?: "Unauthorized"))

    @ExceptionHandler(ForbiddenOperationException::class)
    fun handleForbidden(exception: ForbiddenOperationException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity
            .status(HttpStatus.FORBIDDEN)
            .body(ApiErrorResponse(error = "forbidden", message = exception.message ?: "Forbidden"))

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(exception: MethodArgumentNotValidException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity
            .status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ApiErrorResponse(error = "validation_failed", message = exception.message ?: "Validation failed"))

    @ExceptionHandler(ValidationFailureException::class)
    fun handleValidationFailure(exception: ValidationFailureException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity
            .status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ApiErrorResponse(error = "validation_failed", message = exception.message ?: "Validation failed"))
}

data class ApiErrorResponse(
    val error: String,
    val message: String,
)
