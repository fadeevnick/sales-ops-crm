# Phase 3 Fourth Coding Slice Planning Note

## Slice

```text
backend approval service and opportunity bridge baseline
```

## Goal

Wire the Phase 3 approval persistence and policy pieces into a backend application service, while keeping controller endpoints and frontend UI outside this pass.

## Files

- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/approval/ApprovalService.kt`
- add `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityApprovalBridge.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/approval/ApprovalRepository.kt`
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/OpportunityRepository.kt`
- update project status docs after verification

## In Scope

- submit approval orchestration
- approver inbox assembly
- approval detail assembly
- approve / reject / send-back orchestration
- opportunity snapshot construction through an explicit bridge
- minimal opportunity lifecycle reflection for approval pending / approved / rejected / sent-back outcomes

## Out of Scope

- `ApprovalController`
- opportunity submit endpoint wiring
- frontend approval UI
- notification side effects
- metadata-driven policy configuration

## Acceptance

- backend `compileKotlin` passes in the container
- existing health/readiness checks remain green
- approval service depends on opportunity only through `OpportunityApprovalBridge`
