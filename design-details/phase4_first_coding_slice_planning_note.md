# Phase 4 First Coding Slice Planning Note

## Slice

```text
backend metadata schema foundation
```

## Goal

Introduce controlled metadata storage tables and a seeded published baseline for the existing tenant, without wiring metadata into CRM runtime behavior yet.

## Files

- add `codebase/backend/src/main/resources/db/migration/V5__phase4_metadata_core.sql`
- update project status docs after verification

## In Scope

- metadata config version table
- custom field definition table
- opportunity stage definition table
- required-field-by-stage rule table
- custom field value table
- seeded published config for `tenant_orion`
- seeded stage definitions matching current opportunity stages

## Out of Scope

- metadata admin API
- draft/publish service
- frontend metadata admin UI
- metadata-aware CRM forms
- runtime replacement of existing `opportunity_stages`

## Acceptance

- backend restarts and Flyway applies V5
- `/readyz` returns `200`
- metadata tables exist
- seeded published config and stage definitions can be queried
