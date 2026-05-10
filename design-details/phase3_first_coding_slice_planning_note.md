# Phase 3 First Coding Slice Planning Note

## Slice

```text
backend approval database foundation
```

## Goal

Introduce the Phase 3 approval aggregate storage boundary without adding service, controller, or frontend behavior yet.

## Files

- add `codebase/backend/src/main/resources/db/migration/V4__phase3_approval_core.sql`
- update project status docs after verification

## In Scope

- `approval_requests`
- `approval_steps`
- `approval_decision_history`
- request/step lifecycle check constraints
- tenant/status/approver indexes
- partial uniqueness guard for conflicting active approval requests per opportunity and policy scope

## Out of Scope

- submit approval endpoint
- approver inbox endpoint
- approve/reject/send-back commands
- policy resolver implementation
- opportunity lifecycle bridge
- frontend approval UI

## Acceptance

- Flyway applies `V4` after a clean backend restart.
- Backend compile still passes.
- Existing Phase 2 health/readiness checks still pass.
- No approval logic is collapsed into the opportunity table.
