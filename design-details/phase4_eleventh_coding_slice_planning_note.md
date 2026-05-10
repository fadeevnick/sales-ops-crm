# Phase 4 Eleventh Coding Slice Planning Note

## Slice

```text
frontend metadata admin field/stage edit UI
```

## Goal

Expose the draft metadata edit endpoints in the RevOps metadata admin workspace so field definitions, stage definitions and required-field rules can be managed without direct API or database calls.

## Files

- update `codebase/frontend/src/types/metadata.ts`
- update `codebase/frontend/src/api/metadata.ts`
- update `codebase/frontend/src/features/metadata/MetadataAdminWorkspace.tsx`
- update `codebase/frontend/src/styles.css`
- update project status docs after verification

## In Scope

- add frontend types for draft edit requests
- add frontend API wrappers for field/stage/required-rule mutations
- render draft field create/edit/delete controls
- render draft stage create/edit/delete controls
- render draft required-rule create/delete controls
- refresh the draft snapshot after each mutation
- validate and publish the edited draft through the existing flow

## Out of Scope

- custom field list/filter support in CRM views
- metadata config rollback UI
- deleting drafts without publishing
- replacing backend `opportunity_stages` query joins

## Acceptance

- frontend `npm run build` passes in the container
- browser smoke as `irina@orion.local` can create a draft
- browser smoke can add and update a field
- browser smoke can add and update a stage
- browser smoke can add and remove a required-field rule
- browser smoke can delete temporary field/stage records
- browser smoke can publish the cleaned draft with no UI error box
