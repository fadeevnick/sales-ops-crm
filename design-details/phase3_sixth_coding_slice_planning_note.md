# Phase 3 Sixth Coding Slice Planning Note

## Slice

```text
frontend approval API and type contracts
```

## Goal

Add frontend approval contracts and API transport helpers for the backend approval endpoints, without rendering approval UI yet.

## Files

- add `codebase/frontend/src/types/approvals.ts`
- add `codebase/frontend/src/api/approvals.ts`
- update project status docs after verification

## In Scope

- submit approval request/response types
- approval inbox/detail/decision types
- API clients for submit, inbox, detail, approve, reject and send-back

## Out of Scope

- submit approval panel
- approver inbox UI
- approval detail UI
- opportunity detail approval strip
- browser-level approval walkthrough

## Acceptance

- frontend `npm run build` passes in the container
- backend approval API remains reachable after frontend contract addition
