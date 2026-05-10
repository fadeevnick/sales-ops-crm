# Phase 4 Eighth Coding Slice Planning Note

## Slice

```text
metadata-aware stage validation
```

## Goal

Enforce published metadata required-field rules when an opportunity enters a stage through create or move-stage, while keeping custom field editing outside this slice.

## Files

- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataStandardFieldKeys.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataValidationPolicy.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityService.kt`
- update project status docs after verification

## In Scope

- reuse the published metadata runtime snapshot for stage lookup and required-field rules
- validate standard opportunity fields required by the target stage
- apply the validation on opportunity create
- apply the validation on opportunity move-stage before updating the stage
- preserve the existing API error envelope

## Out of Scope

- metadata admin edit endpoints for required-field rules
- custom field value forms or APIs
- structured validation `details` in API errors
- replacing backend `opportunity_stages` query joins

## Acceptance

- backend `compileKotlin` passes in the container
- backend restarts and `/readyz` returns ready
- API smoke confirms no-regression stage move when no required rules exist
- API smoke confirms create and move-stage return `422 validation_failed` when a temporary published required rule is missing
- API smoke confirms entering the stage succeeds when the required standard field is present
- temporary smoke-only metadata rule is removed after verification
