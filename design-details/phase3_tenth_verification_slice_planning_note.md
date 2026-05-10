# Phase 3 Tenth Verification Slice Planning Note

## Slice

```text
legal final approval and Sales Rep outcome readback
```

## Goal

Verify the implemented Phase 3 approval UI across the final approver handoff without adding new UI surface.

## Files

- no product code changes planned
- update project status docs after verification

## In Scope

- log in as Legal Approver
- approve the active legal approval step from the approval detail panel
- confirm both approval steps are approved
- switch to the submitting Sales Rep
- confirm the opportunity detail shows `approvalState = approved`

## Out of Scope

- new approval routes
- notification delivery
- workflow designer
- metadata-driven approval policy editing

## Acceptance

- browser smoke completes legal approval without UI errors
- legal inbox no longer shows the completed request
- Sales Rep opportunity detail shows approved approval state
