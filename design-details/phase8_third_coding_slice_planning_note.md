# Phase 8 Third Coding Slice Planning Note

## Slice

```text
reporting drill-down backend baseline
```

## Goal

Add access-aware reporting drill-down endpoints for the existing dashboard aggregates so the dashboard can move from summary numbers to permitted underlying opportunity rows without bypassing CRM visibility rules.

## Files

- extend reporting DTOs for drill-down query and opportunity row response;
- extend reporting repository with stage and forecast-month opportunity drill-down queries;
- extend reporting service/controller with read-only drill-down endpoint;
- add runtime smoke scenario under `npm run runtime:smoke`;
- update project status docs after verification.

## In Scope

- Sales Manager and RevOps Admin can request dashboard opportunity drill-downs;
- Sales Rep cannot request reporting drill-downs;
- supported drill-down dimensions are `stage` and `forecastMonth`;
- drill-down returns permitted opportunity rows with account, owner, stage, expected amount, close date and approval state;
- Sales Manager results are constrained by the existing team owner scope;
- RevOps Admin results can include all tenant opportunities;
- invalid dimension/value combinations return validation failure.

## Out of Scope

- frontend drill-down navigation;
- approval backlog drill-down;
- pagination beyond a bounded MVP limit;
- custom-field reporting dimensions;
- export from drill-down results;
- new projection tables.

## Acceptance

- backend `gradle compileKotlin --no-daemon` passes in the container;
- RevOps Admin can drill into a stage and forecast month that include a fixture opportunity;
- Sales Manager sees only team-visible opportunities in drill-down results;
- Sales Rep drill-down request returns `403`;
- invalid drill-down dimension returns validation failure;
- runtime smoke passes through `npm run runtime:smoke`.
