# Phase 8 First Coding Slice Planning Note

## Slice

```text
reporting projection foundation backend baseline
```

## Goal

Start Phase 8 by adding a durable reporting projection for MVP dashboard metrics and backend APIs to refresh/read those projections without building a generic report builder.

## Files

- add Flyway migration for tenant reporting projection snapshot
- add backend reporting DTOs, repository, service and controller
- calculate pipeline, stage, forecast and approval backlog metrics
- add runtime smoke scenario under `npm run runtime:smoke`
- update project status docs after verification

## In Scope

- RevOps Admin can refresh and read tenant dashboard projections;
- Sales Manager can read dashboard projections;
- Sales Rep cannot read tenant dashboard projections;
- projection includes open pipeline opportunity count and amount;
- projection includes opportunity count and amount by stage;
- projection includes forecast amount by close month;
- projection includes pending approval request count;
- projection includes projection timestamp and source counters;
- projection read path uses stored snapshot, not ad hoc dashboard aggregation response.

## Out of Scope

- executive dashboard frontend UI;
- drill-down endpoints;
- manager-team scoped projection variants;
- custom-field reporting slices;
- automatic refresh triggers from every write path;
- materialized views;
- advanced forecast modeling.

## Acceptance

- backend migration applies on the current compose stack;
- backend `gradle compileKotlin --no-daemon` passes in the container;
- RevOps Admin refreshes and reads a projection;
- Sales Manager reads the projection;
- Sales Rep projection read/refresh attempts return `403`;
- projection reflects a newly created opportunity after refresh;
- projection includes pending approval metrics when pending approvals exist;
- runtime smoke passes through `npm run runtime:smoke`.
