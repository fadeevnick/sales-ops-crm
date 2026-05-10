# Phase 3 Seventh Coding Slice Planning Note

## Slice

```text
frontend opportunity approval submit strip
```

## Goal

Expose the first sales-side approval UI entry point inside opportunity detail, without building approver inbox or approval detail UI yet.

## Files

- update `codebase/frontend/src/features/crm/CrmReadWorkspace.tsx`
- update `codebase/frontend/src/features/crm/OpportunityDetail.tsx`
- update `codebase/frontend/src/styles.css`
- update project status docs after verification

## In Scope

- submit approval from selected opportunity detail
- business justification input
- refresh selected opportunity after successful submit
- keep existing opportunity list/detail refresh behavior

## Out of Scope

- approver inbox UI
- approval request detail UI
- decision action UI
- approval timeline UI
- browser-level approval workflow

## Acceptance

- frontend `npm run build` passes in the container
- dev server remains reachable
- backend approval API remains reachable
