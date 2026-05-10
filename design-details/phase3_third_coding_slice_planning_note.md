# Phase 3 Third Coding Slice Planning Note

## Slice

```text
backend approval policy/state/visibility baseline
```

## Goal

Add the approval module's decision-support policies before wiring them into an application service.

## Files

- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/approval/ApprovalPolicyResolver.kt`
- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/approval/ApprovalStatePolicy.kt`
- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/approval/ApprovalVisibilityPolicy.kt`
- update project status docs after verification

## In Scope

- limited MVP policy resolution for stage progression approvals
- explicit request and step transition validation
- baseline submit/inbox/request/step action visibility decisions

## Out of Scope

- approval service orchestration
- controller endpoints
- persistence writes beyond the existing repository
- opportunity lifecycle bridge
- frontend approval UI
- metadata-driven policy builder

## Acceptance

- backend `compileKotlin` passes in the container
- existing health/readiness checks remain green
- no policy logic is placed in controllers or opportunity repository code
