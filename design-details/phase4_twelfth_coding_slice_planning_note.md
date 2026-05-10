# Phase 4 Twelfth Coding Slice Planning Note

## Slice

```text
published metadata config rollback/new-draft management
```

## Goal

Give RevOps Admin a controlled way to inspect metadata config version history, discard an unfinished draft, and roll back runtime to an archived published version without direct database edits.

## Files

- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataDtos.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataRepository.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/metadata/MetadataService.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/MetadataController.kt`
- update `codebase/frontend/src/types/metadata.ts`
- update `codebase/frontend/src/api/metadata.ts`
- update `codebase/frontend/src/features/metadata/MetadataAdminWorkspace.tsx`
- update `codebase/frontend/src/styles.css` only if layout needs it
- update project status docs after verification

## In Scope

- list metadata config versions for the current tenant
- expose RevOps-only draft discard endpoint
- expose RevOps-only rollback endpoint for archived config versions
- block rollback while a draft is open
- refresh published metadata, draft state and version history after draft discard, publish or rollback
- render version history and management actions in Metadata Admin

## Out of Scope

- schema migration
- partial rollback or diff UI
- merging draft edits into a rollback target
- config comparison viewer
- custom fields in opportunity list/filter views
- replacing backend `opportunity_stages` query joins

## Acceptance

- backend `gradle compileKotlin --no-daemon` passes in the container
- frontend `npm run build` passes in the container
- RevOps Admin can see published, archived and draft metadata config versions
- RevOps Admin can discard an open draft and create a new draft afterward
- RevOps Admin can roll back to an archived config when no draft is open
- rollback makes the selected archived version the published runtime config
- Sales Rep rollback/discard attempts return `403 forbidden`
