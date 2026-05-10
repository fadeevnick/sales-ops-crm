# Phase 4 Seventh Coding Slice Planning Note

## Slice

```text
metadata-aware CRM forms/detail display
```

## Goal

Make the CRM frontend consume published metadata stage definitions for opportunity create, list and detail display, without implementing metadata-driven required-field validation yet.

## Files

- update `codebase/frontend/src/features/crm/CrmReadWorkspace.tsx`
- update `codebase/frontend/src/features/crm/CrmCreatePanel.tsx`
- update `codebase/frontend/src/features/crm/OpportunityList.tsx`
- update `codebase/frontend/src/features/crm/OpportunityDetail.tsx`
- update project status docs after verification

## In Scope

- load published metadata alongside CRM list data
- use published stage definitions as opportunity create options
- display stage labels in opportunity list rows
- display stage labels in opportunity detail badges
- use published stage definitions for the move-stage target selector

## Out of Scope

- metadata-aware required-field validation
- custom field value rendering/editing
- replacing backend `opportunity_stages` list/detail joins
- metadata field/stage edit UI

## Acceptance

- frontend `npm run build` passes in the container
- browser smoke under `anna@orion.local` renders CRM with published stage labels
- browser smoke can create an opportunity through a selected published stage
- no UI error box is rendered during the smoke path
