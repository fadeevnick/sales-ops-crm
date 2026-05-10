# Phase 9 Fourth Hardening Slice Planning Note

## Slice

```text
approval negative-path runtime smoke baseline
```

## Goal

Cover the approval negative paths called out in the Phase 9 pilot checklist: send-back, rejection and unauthorized decisions must preserve predictable request and opportunity outcomes.

## Files

- add runtime smoke scenario under `npm run runtime:smoke`;
- update project status docs after verification.

## In Scope

- Sales Rep submits approval requests for fresh opportunities;
- Finance Approver can send back an active request;
- sent-back request resets opportunity approval state to `none`;
- Finance Approver can reject an active request;
- rejected request sets opportunity approval state to `rejected`;
- unauthorized approver/submitter decisions remain blocked;
- resolved requests cannot be decided again.

## Out of Scope

- UI approval inbox behavior;
- full approval policy matrix;
- SLA/due-date behavior;
- approval cancellation/supersede flows;
- new approval capabilities.

## Acceptance

- `npm run runtime:smoke -- phase9-approval-negative` passes against the current compose runtime;
- scenario returns request ids and observed terminal statuses;
- project status docs point to the next Phase 9 hardening gate.
