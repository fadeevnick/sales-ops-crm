# Phase 3 Fifth Coding Slice Planning Note

## Slice

```text
backend approval controller endpoints
```

## Goal

Expose the backend approval service through the planned API boundary, without adding frontend approval UI yet.

## Files

- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/ApprovalController.kt`
- update project status docs after verification

## In Scope

- `POST /api/opportunities/{opportunityId}/submit-approval`
- `GET /api/approvals/inbox`
- `GET /api/approvals/{approvalRequestId}`
- `POST /api/approvals/{approvalRequestId}/approve`
- `POST /api/approvals/{approvalRequestId}/reject`
- `POST /api/approvals/{approvalRequestId}/send-back`

## Out of Scope

- frontend approval UI
- opportunity detail approval summary strip
- browser-level approval workflow
- notification side effects

## Acceptance

- backend `compileKotlin` passes in the container
- runtime API sanity check covers submit, inbox, sequential approve, and opportunity lifecycle reflection
