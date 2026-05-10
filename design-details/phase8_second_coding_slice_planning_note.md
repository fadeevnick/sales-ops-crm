# Phase 8 Second Coding Slice Planning Note

## Slice

```text
reporting dashboard frontend baseline
```

## Goal

Expose the stored Phase 8 reporting projection in the frontend workspace for Sales Manager and RevOps Admin personas, using the backend projection read path as the single dashboard source.

## Files

- add frontend reporting API client and types;
- add reporting dashboard workspace component;
- wire dashboard visibility into the workspace shell;
- add focused dashboard styling;
- add runtime smoke scenario under `npm run runtime:smoke`;
- update project status docs after verification.

## In Scope

- Sales Manager can see the reporting dashboard;
- RevOps Admin can see the reporting dashboard;
- Sales Rep cannot see the reporting dashboard UI;
- dashboard loads the stored projection from `GET /api/reporting/dashboard`;
- RevOps Admin can refresh the projection from the dashboard;
- Sales Manager has no refresh control;
- dashboard renders open pipeline count/amount, stage breakdown, forecast by month, approval backlog and source counters;
- empty/error/loading states are explicit and scoped to the dashboard.

## Out of Scope

- new backend metrics;
- drill-down links/endpoints;
- charts library integration;
- manager-team scoped reporting variants;
- custom-field reporting;
- automatic projection refresh after CRM writes;
- CSV/PDF dashboard export.

## Acceptance

- frontend `npm run build` passes in the container;
- RevOps Admin dashboard loads, refreshes and shows projection metrics;
- Sales Manager dashboard loads and shows projection metrics without refresh control;
- Sales Rep workspace does not render the reporting dashboard;
- runtime smoke passes through `npm run runtime:smoke`.
