# Phase 3 Second Coding Slice Planning Note

## Slice

```text
backend approval DTOs and repository baseline
```

## Goal

Add the approval module's transport contracts and persistence access layer on top of `V4`, without exposing endpoints or implementing lifecycle decisions yet.

## Files

- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/approval/ApprovalDtos.kt`
- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/approval/ApprovalRepository.kt`
- update project status docs after verification

## In Scope

- request/response DTO shapes for future submit, inbox, detail, and decision endpoints
- repository commands and records for approval request, step, and decision history storage
- repository methods for:
  - creating approval requests
  - creating approval steps
  - appending decision history
  - updating request/step status
  - loading request detail pieces
  - listing active approver inbox items

## Out of Scope

- controller endpoints
- approval lifecycle service
- policy resolver
- visibility policy
- opportunity lifecycle bridge
- frontend approval UI

## Acceptance

- backend `compileKotlin` passes in the container
- existing health/readiness checks remain green
- repository code does not depend on CRM account/contact/activity internals
