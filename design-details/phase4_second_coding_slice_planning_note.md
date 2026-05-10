# Phase 4 Second Coding Slice Planning Note

## Slice

```text
backend metadata DTO/repository read baseline
```

## Goal

Add the backend metadata transport shapes and published-read repository on top of `V5`, without exposing metadata admin endpoints or switching CRM runtime behavior to metadata yet.

## Files

- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataDtos.kt`
- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataRepository.kt`
- update project status docs after verification

## In Scope

- DTO shapes for a future published metadata response
- repository records for metadata config versions, field definitions, stage definitions, and stage required-field rules
- repository methods for:
  - loading the tenant's current published metadata config version
  - loading field definitions by config version and optional entity type
  - loading opportunity stage definitions by config version
  - loading stage required-field rules by config version and optional stage key
  - loading a full published metadata snapshot for one tenant

## Out of Scope

- metadata admin controller endpoints
- draft creation or publish commands
- metadata validation policy
- frontend metadata admin UI
- metadata-aware CRM forms
- replacement of existing `opportunity_stages` runtime reads

## Acceptance

- backend `compileKotlin` passes in the container
- backend restarts with the metadata repository in the Spring context
- readiness remains green against the existing PostgreSQL-backed compose stack
