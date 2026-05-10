# Phase 4 Sixth Coding Slice Planning Note

## Slice

```text
runtime published metadata read path
```

## Goal

Introduce a runtime-facing metadata reader that consumes only the current published metadata config and wire the first CRM stage gates through it, without replacing the legacy `opportunity_stages` storage bridge yet.

## Files

- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataRuntimeService.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityService.kt`
- update project status docs after verification

## In Scope

- runtime service that loads only published metadata snapshots
- runtime projection for published opportunity stage definitions
- runtime projection for required-field rules by stage, for later validation slices
- opportunity create stage gate reads published metadata before the legacy stage catalog
- opportunity move-stage target gate reads published metadata before the legacy stage catalog
- keep existing CRM persistence through `opportunity_stages` until the replacement slice

## Out of Scope

- metadata-aware CRM forms/detail display
- metadata-aware required-field validation
- replacing `opportunity_stages` joins in list/detail queries
- field/stage edit UI

## Acceptance

- backend `compileKotlin` passes in the container
- backend restarts with `MetadataRuntimeService` in the Spring context
- readiness remains green against the existing PostgreSQL-backed compose stack
- runtime reads published metadata while draft metadata exists
- opportunity create and move-stage still pass for published stages
- invalid stage is rejected by the published metadata gate
