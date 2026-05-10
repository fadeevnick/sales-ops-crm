# Phase 3 Eighth Coding Slice Planning Note

## Slice

```text
frontend approver inbox UI
```

## Goal

Render a lightweight approver inbox for approval-capable roles using the Phase 3 approval API, without adding decision action controls yet.

## Files

- add `codebase/frontend/src/features/approvals/ApproverInbox.tsx`
- update `codebase/frontend/src/features/shell/WorkspaceShell.tsx`
- update `codebase/frontend/src/styles.css`
- update project status docs after verification

## In Scope

- load active approval inbox items
- render request/opportunity/account/policy/step status summary
- show inbox errors with existing request error copy
- avoid rendering CRM workspace for approver-only roles

## Out of Scope

- approval detail page
- approve/reject/send-back buttons
- approval timeline UI
- browser-level full multi-role approval decision flow

## Acceptance

- frontend `npm run build` passes in the container
- approver inbox API remains reachable
- browser smoke confirms approver login renders inbox
