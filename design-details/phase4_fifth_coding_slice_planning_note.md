# Phase 4 Fifth Coding Slice Planning Note

## Slice

```text
frontend metadata admin read/create draft UI
```

## Goal

Add a focused RevOps metadata admin workspace that can read the active published metadata config, read or create the current draft, validate it, and publish it through the Phase 4 backend endpoints.

## Files

- add `codebase/frontend/src/types/metadata.ts`
- add `codebase/frontend/src/api/metadata.ts`
- add `codebase/frontend/src/features/metadata/MetadataAdminWorkspace.tsx`
- update `codebase/frontend/src/features/shell/WorkspaceShell.tsx`
- update `codebase/frontend/src/styles.css`
- update project status docs after verification

## In Scope

- published metadata read
- current draft read
- create draft from published config
- validate draft
- publish draft
- render config version, stage count, field count, required-rule count, stages and validation issues
- show the workspace only to RevOps Admin

## Out of Scope

- metadata field/stage editing UI
- metadata-aware CRM forms
- runtime replacement of existing CRM stage reads
- broader visual navigation redesign

## Acceptance

- frontend `npm run build` passes in the container
- browser smoke under `irina@orion.local` renders Metadata Admin
- browser smoke can create a draft and validate it
- no UI error box is rendered during the smoke path
