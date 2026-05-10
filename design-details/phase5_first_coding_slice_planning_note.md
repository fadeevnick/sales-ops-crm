# Phase 5 First Coding Slice Planning Note

## Slice

```text
saved views read/create baseline for opportunity workspace
```

## Goal

Start Phase 5 by making the opportunity workspace remember useful user views. The first slice should establish saved-view storage and a narrow read/create/list API for opportunity filters while preserving the current access-aware opportunity query boundary.

## Files

- add a backend Flyway migration for saved view storage if no suitable table exists
- add backend saved-view DTOs, repository, service and controller
- update opportunity workspace frontend API/types
- update opportunity workspace UI to list saved views and create a saved view from the current filter state
- update project status docs after verification

## In Scope

- saved views for the opportunity workspace only
- tenant-scoped and user-owned saved views
- list current user's saved views
- create a saved view from supported opportunity filters
- load/apply a saved view to the opportunity list
- store filter config in a structured shape that can reference standard fields and supported published custom field keys
- validate saved view filters against the published metadata snapshot on create/load
- mark metadata-invalid saved views instead of silently applying invalid custom-field references
- keep opportunity access enforcement in the existing opportunity service/query layer

## Out of Scope

- shared views across users or roles
- manager/admin view ownership rules beyond user-owned baseline
- full sharing/access policy redesign
- dashboards, reporting and export/import
- custom field list columns unless required for a minimal saved-view filter UI
- schema cleanup for the legacy `opportunities.stage_id` persistence bridge
- universal metadata query abstraction

## Acceptance

- backend migration applies on the current compose stack
- backend `gradle compileKotlin --no-daemon` passes in the container
- frontend `npm run build` passes in the container if UI is changed
- Sales Rep can create a saved opportunity view from supported filters
- Sales Rep can list and apply their saved opportunity views after reload
- saved views cannot bypass existing opportunity access scope
- saved views referencing removed/unpublished custom fields are reported as invalid on load rather than executed silently
- Manager scope remains team-limited when applying a saved view
