package com.salesops.bootstrap.api

import com.salesops.bootstrap.crm.contact.ContactListResponse
import com.salesops.bootstrap.crm.contact.ContactService
import com.salesops.bootstrap.crm.contact.CreateContactRequest
import com.salesops.bootstrap.crm.contact.CreateContactResponse
import com.salesops.bootstrap.service.SessionService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/contacts")
class ContactController(
    private val contactService: ContactService,
    private val sessionService: SessionService,
) {
    @GetMapping
    fun listContacts(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @RequestParam("accountId", required = false) accountId: String?,
        @RequestParam("ownerId", required = false) ownerId: String?,
        @RequestParam("q", required = false) query: String?,
    ): ContactListResponse =
        contactService.listContacts(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            accountId = accountId,
            ownerId = ownerId,
            query = query,
        )

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createContact(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @Valid @RequestBody request: CreateContactRequest,
    ): CreateContactResponse =
        contactService.createContact(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            request = request,
        )
}
