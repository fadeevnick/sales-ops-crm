# Phase 8 Fourth Coding Slice Planning Note

## Slice

```text
reporting dashboard drill-down frontend controls baseline
```

## Goal

Connect the Phase 8 reporting dashboard UI to the access-aware backend drill-down endpoint so managers and RevOps users can inspect the underlying opportunities behind stage and forecast metrics.

## Files

- extend frontend reporting API/types for drill-down responses;
- add stage and forecast drill-down controls to the reporting dashboard;
- render bounded drill-down opportunity results;
- add focused responsive styling;
- add runtime smoke scenario under `npm run runtime:smoke`;
- update project status docs after verification.

## In Scope

- RevOps Admin can open a stage drill-down from the dashboard and see matching opportunities;
- Sales Manager can open a stage drill-down and sees only team-visible opportunities;
- dashboard exposes forecast-month drill-down controls;
- drill-down result rows show opportunity title, account, owner, stage, amount, close date and approval state;
- loading/error/empty states are scoped to the drill-down panel;
- Sales Rep still does not render the reporting dashboard UI.

## Out of Scope

- deep linking to CRM detail;
- pagination controls;
- approval backlog drill-down UI;
- export from drill-down results;
- chart interactions;
- custom-field reporting dimensions.

## Acceptance

- frontend `npm run build` passes in the container;
- RevOps Admin dashboard opens a stage drill-down and shows a fixture opportunity;
- Sales Manager dashboard opens a stage drill-down and does not show a non-team fixture;
- Sales Rep workspace does not render the reporting dashboard;
- runtime smoke passes through `npm run runtime:smoke`.
