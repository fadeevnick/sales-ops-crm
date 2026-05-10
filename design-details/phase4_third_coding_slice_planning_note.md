# Phase 4 Third Coding Slice Planning Note

## Slice

```text
backend draft/publish validation service
```

## Goal

Add a backend service boundary for validating and publishing metadata config versions, without exposing admin endpoints or changing CRM runtime metadata consumption yet.

## Files

- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataDtos.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataRepository.kt`
- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataValidationPolicy.kt`
- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataService.kt`
- update project status docs after verification

## In Scope

- reproducible validation result for a draft metadata config
- RevOps-only service boundary for draft validation and publish commands
- validation checks for:
  - supported entity types
  - supported field types
  - stable field and stage keys
  - nonblank labels and display names
  - unique field keys and sort order within entity scope
  - unique stage keys and sort order
  - valid select options
  - required-field rules referencing known opportunity stages and fields
- transactional publish command that archives the previous published config and publishes the validated draft

## Out of Scope

- metadata admin controller endpoints
- draft creation/edit commands
- frontend metadata admin UI
- metadata-aware CRM forms
- replacement of existing `opportunity_stages` runtime reads

## Acceptance

- backend `compileKotlin` passes in the container
- backend restarts with metadata service and validation policy in the Spring context
- readiness remains green against the existing PostgreSQL-backed compose stack
