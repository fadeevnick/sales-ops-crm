package com.salesops.bootstrap.api

import com.salesops.bootstrap.metadata.CreateMetadataDraftRequest
import com.salesops.bootstrap.metadata.CreateMetadataStageRequiredFieldRequest
import com.salesops.bootstrap.metadata.MetadataConfigVersionListResponse
import com.salesops.bootstrap.metadata.MetadataPublishResponse
import com.salesops.bootstrap.metadata.MetadataService
import com.salesops.bootstrap.metadata.MetadataValidationResponse
import com.salesops.bootstrap.metadata.PublishedMetadataResponse
import com.salesops.bootstrap.metadata.SaveMetadataFieldDefinitionRequest
import com.salesops.bootstrap.metadata.SaveMetadataStageDefinitionRequest
import com.salesops.bootstrap.service.SessionService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/metadata")
class MetadataController(
    private val metadataService: MetadataService,
    private val sessionService: SessionService,
) {
    @GetMapping("/published")
    fun published(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
    ): PublishedMetadataResponse =
        metadataService.getPublishedMetadata(
            context = sessionService.resolveCurrentUserContext(demoUserId),
        )

    @GetMapping("/config-versions")
    fun configVersions(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
    ): MetadataConfigVersionListResponse =
        metadataService.listConfigVersions(
            context = sessionService.resolveCurrentUserContext(demoUserId),
        )

    @PostMapping("/drafts")
    @ResponseStatus(HttpStatus.CREATED)
    fun createDraft(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @RequestBody request: CreateMetadataDraftRequest,
    ): PublishedMetadataResponse =
        metadataService.createDraftFromPublished(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            request = request,
        )

    @GetMapping("/drafts/current")
    fun currentDraft(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
    ): PublishedMetadataResponse =
        metadataService.getCurrentDraftMetadata(
            context = sessionService.resolveCurrentUserContext(demoUserId),
        )

    @GetMapping("/drafts/{configVersionId}")
    fun draft(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable configVersionId: String,
    ): PublishedMetadataResponse =
        metadataService.getDraftMetadata(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            configVersionId = configVersionId,
        )

    @PostMapping("/drafts/{configVersionId}/fields")
    @ResponseStatus(HttpStatus.CREATED)
    fun createFieldDefinition(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable configVersionId: String,
        @RequestBody request: SaveMetadataFieldDefinitionRequest,
    ): PublishedMetadataResponse =
        metadataService.createFieldDefinition(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            configVersionId = configVersionId,
            request = request,
        )

    @PutMapping("/drafts/{configVersionId}/fields/{fieldDefinitionId}")
    fun updateFieldDefinition(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable configVersionId: String,
        @PathVariable fieldDefinitionId: String,
        @RequestBody request: SaveMetadataFieldDefinitionRequest,
    ): PublishedMetadataResponse =
        metadataService.updateFieldDefinition(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            configVersionId = configVersionId,
            fieldDefinitionId = fieldDefinitionId,
            request = request,
        )

    @DeleteMapping("/drafts/{configVersionId}/fields/{fieldDefinitionId}")
    fun deleteFieldDefinition(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable configVersionId: String,
        @PathVariable fieldDefinitionId: String,
    ): PublishedMetadataResponse =
        metadataService.deleteFieldDefinition(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            configVersionId = configVersionId,
            fieldDefinitionId = fieldDefinitionId,
        )

    @PostMapping("/drafts/{configVersionId}/stages")
    @ResponseStatus(HttpStatus.CREATED)
    fun createStageDefinition(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable configVersionId: String,
        @RequestBody request: SaveMetadataStageDefinitionRequest,
    ): PublishedMetadataResponse =
        metadataService.createStageDefinition(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            configVersionId = configVersionId,
            request = request,
        )

    @PutMapping("/drafts/{configVersionId}/stages/{stageDefinitionId}")
    fun updateStageDefinition(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable configVersionId: String,
        @PathVariable stageDefinitionId: String,
        @RequestBody request: SaveMetadataStageDefinitionRequest,
    ): PublishedMetadataResponse =
        metadataService.updateStageDefinition(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            configVersionId = configVersionId,
            stageDefinitionId = stageDefinitionId,
            request = request,
        )

    @DeleteMapping("/drafts/{configVersionId}/stages/{stageDefinitionId}")
    fun deleteStageDefinition(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable configVersionId: String,
        @PathVariable stageDefinitionId: String,
    ): PublishedMetadataResponse =
        metadataService.deleteStageDefinition(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            configVersionId = configVersionId,
            stageDefinitionId = stageDefinitionId,
        )

    @PostMapping("/drafts/{configVersionId}/required-fields")
    @ResponseStatus(HttpStatus.CREATED)
    fun createRequiredField(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable configVersionId: String,
        @RequestBody request: CreateMetadataStageRequiredFieldRequest,
    ): PublishedMetadataResponse =
        metadataService.createRequiredField(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            configVersionId = configVersionId,
            request = request,
        )

    @DeleteMapping("/drafts/{configVersionId}/required-fields/{requiredFieldId}")
    fun deleteRequiredField(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable configVersionId: String,
        @PathVariable requiredFieldId: String,
    ): PublishedMetadataResponse =
        metadataService.deleteRequiredField(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            configVersionId = configVersionId,
            requiredFieldId = requiredFieldId,
        )

    @DeleteMapping("/drafts/{configVersionId}")
    fun discardDraft(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable configVersionId: String,
    ): MetadataConfigVersionListResponse =
        metadataService.discardDraft(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            configVersionId = configVersionId,
        )

    @PostMapping("/drafts/{configVersionId}/validate")
    fun validateDraft(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable configVersionId: String,
    ): MetadataValidationResponse =
        metadataService.validateDraft(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            configVersionId = configVersionId,
        )

    @PostMapping("/drafts/{configVersionId}/publish")
    fun publishDraft(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable configVersionId: String,
    ): MetadataPublishResponse =
        metadataService.publishDraft(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            configVersionId = configVersionId,
        )

    @PostMapping("/config-versions/{configVersionId}/rollback")
    fun rollbackConfigVersion(
        @RequestHeader("X-Demo-User-Id", required = false) demoUserId: String?,
        @PathVariable configVersionId: String,
    ): PublishedMetadataResponse =
        metadataService.rollbackToArchivedConfig(
            context = sessionService.resolveCurrentUserContext(demoUserId),
            configVersionId = configVersionId,
        )
}
