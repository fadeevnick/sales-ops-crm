# Phase 5 Third Coding Slice Planning Note

## Slice

```text
custom-field saved view filter execution
```

## Goal

Make saved views useful for tenant-specific process fields by executing supported opportunity custom-field filters through the existing access-aware opportunity list path.

## Files

- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityDtos.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityRepository.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityService.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/OpportunityController.kt`
- update frontend opportunity API/types
- update opportunity saved-view UI to capture supported custom field filters
- update project status docs after verification

## In Scope

- execute opportunity custom-field filters for supported field types where query semantics are clear;
- keep all filtering inside the current access-aware opportunity list service;
- validate requested custom field filters against published metadata before query execution;
- support saved-view apply for custom-field filters already stored in saved views;
- show invalid custom-field saved views as invalid if metadata no longer publishes a referenced field.

## Out of Scope

- custom field list columns;
- arbitrary expression/query builder;
- cross-entity custom-field filters;
- field-level security;
- dashboards and reporting;
- import/export reuse of saved views;
- schema cleanup for the legacy `opportunities.stage_id` persistence bridge.

## Acceptance

- backend `gradle compileKotlin --no-daemon` passes in the container;
- frontend `npm run build` passes in the container if UI is changed;
- Sales Rep can filter opportunities by at least one published opportunity custom field;
- saved view with a custom-field filter applies through the same opportunity access scope;
- unpublished custom-field filter requests return `422 validation_failed`;
- Manager applying the same custom-field view remains limited to manager-visible records.
