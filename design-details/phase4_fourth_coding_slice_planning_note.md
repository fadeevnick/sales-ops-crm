# Phase 4 Fourth Coding Slice Planning Note

## Slice

```text
backend metadata admin endpoints
```

## Goal

Expose the metadata service through a narrow backend API boundary so the next frontend slice can read published metadata, create a draft from the published config, inspect the current draft, validate it, and publish it.

## Files

- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/MetadataController.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataDtos.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataRepository.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataService.kt`
- update project status docs after verification

## In Scope

- `GET /api/metadata/published`
- `POST /api/metadata/drafts`
- `GET /api/metadata/drafts/current`
- `GET /api/metadata/drafts/{configVersionId}`
- `POST /api/metadata/drafts/{configVersionId}/validate`
- `POST /api/metadata/drafts/{configVersionId}/publish`
- RevOps-only management access for draft endpoints
- create-draft command that clones the current published config into a new draft version

## Out of Scope

- field/stage edit endpoints
- frontend metadata admin UI
- metadata-aware CRM forms
- replacement of existing `opportunity_stages` runtime reads

## Acceptance

- backend `compileKotlin` passes in the container
- backend restarts with `MetadataController` in the Spring context
- readiness remains green against the existing PostgreSQL-backed compose stack
- published metadata read returns the active config
- RevOps Admin can create, read, validate and publish a draft
- Sales Rep cannot create metadata drafts
