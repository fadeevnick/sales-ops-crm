# Phase 4 Ninth Coding Slice Planning Note

## Slice

```text
metadata admin draft edit endpoints
```

## Goal

Allow RevOps admins to edit draft metadata fields, stages and required-field rules through backend API endpoints, so later runtime custom-field slices can be exercised without direct database edits.

## Files

- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataDtos.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/MetadataController.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataService.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataRepository.kt`
- update project status docs after verification

## In Scope

- create, update and delete draft field definitions
- create, update and delete draft stage definitions
- create and delete draft required-field rules
- keep operations RevOps-only and draft-only
- return the updated draft snapshot after each mutation
- preserve existing draft validate/publish flow

## Out of Scope

- frontend metadata admin edit UI
- custom field value capture/rendering on CRM records
- publishing smoke that intentionally changes the current published config
- replacing backend `opportunity_stages` query joins

## Acceptance

- backend `compileKotlin` passes in the container
- backend restarts and `/readyz` returns ready
- API smoke can create and update a draft field definition
- API smoke can create and update a draft stage definition
- API smoke can create and delete a draft required-field rule
- API smoke can delete the temporary draft field/stage records
- draft validates after cleanup
