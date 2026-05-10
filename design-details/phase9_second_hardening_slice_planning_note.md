# Phase 9 Second Hardening Slice Planning Note

## Slice

```text
end-to-end pilot runtime smoke baseline
```

## Goal

Add one composed runtime smoke scenario that exercises the MVP pilot path across personas and verifies the highest-risk access, approval, import, merge/audit and reporting boundaries without adding product capability.

## Files

- add runtime smoke scenario under `npm run runtime:smoke`;
- keep checks API-level for stable repeatability;
- update project status docs after verification.

## In Scope

- demo personas resolve through session endpoints;
- Sales Rep creates account/contact/opportunity and submits a large-deal approval;
- Finance and Legal Approvers complete the approval chain;
- unauthorized approval decisions are blocked;
- RevOps Admin imports account data and sees row-level execution outcomes;
- non-RevOps personas cannot run import/export admin flows;
- RevOps Admin generates and merges an account duplicate pair;
- merge audit event is recorded and non-admin audit reads are blocked;
- RevOps Admin refreshes reporting projection;
- Sales Manager reads reporting and sees only team-visible drill-down rows;
- Sales Rep cannot read reporting dashboard.

## Out of Scope

- browser/UI walkthrough;
- new backend endpoints;
- schema changes;
- broad negative-case matrix;
- metadata draft/publish mutation checks;
- performance/load testing.

## Acceptance

- `npm run runtime:smoke -- phase9-pilot-e2e` passes against the current compose runtime;
- scenario returns ids for the approval request, import job, merge candidate, audit event and reporting projection;
- project status docs point to the next Phase 9 hardening step.
