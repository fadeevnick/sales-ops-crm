# MVP Pilot Cut Summary

## Cut Status

```text
local MVP pilot cut accepted with deferred pilot follow-ups
```

## Local Operating Assumptions

- Runtime is Docker Compose from `codebase/`.
- Backend port remains `8081`.
- Frontend port remains `5173`.
- PostgreSQL named volume is retained between verification runs.
- Runtime smoke runner is `codebase/frontend/scripts/runtime-smoke.mjs`.
- Stable command form is `npm run runtime:smoke -- <scenario>` from `codebase/frontend`.

## Verified Runtime Gates

### Core Pilot Gate

```bash
npm run runtime:smoke -- phase9-pilot-e2e
```

Verified:

- demo personas resolve;
- Sales Rep CRM creation works;
- large-deal approval chain completes through Finance and Legal;
- unauthorized decisions are blocked;
- RevOps account import executes with row outcomes;
- non-RevOps import/export admin actions are blocked;
- account duplicate merge rewires records;
- merge audit event is written;
- reporting projection refresh and manager drill-down scope work.

### Metadata Safety Gate

```bash
npm run runtime:smoke -- phase9-metadata-safety
```

Verified:

- non-RevOps metadata management is forbidden;
- invalid required-field draft validates as an error;
- invalid draft cannot publish;
- published metadata version is unchanged after failed publish;
- smoke cleans up its own draft mutation.

### Approval Negative Gate

```bash
npm run runtime:smoke -- phase9-approval-negative
```

Verified:

- Finance send-back resolves request as `sent_back`;
- sent-back opportunity returns to approval state `none`;
- Finance rejection resolves request as `rejected`;
- rejected opportunity records approval state `rejected`;
- unauthorized and repeated decisions remain blocked.

### Reporting Gates

```bash
npm run runtime:smoke -- phase8-reporting-foundation
npm run runtime:smoke -- phase8-reporting-ui
npm run runtime:smoke -- phase8-reporting-drilldown
npm run runtime:smoke -- phase8-reporting-drilldown-ui
```

Verified:

- RevOps projection refresh;
- Sales Manager dashboard read;
- Sales Rep reporting denial;
- dashboard UI visibility by role;
- stage and forecast drill-down scope;
- frontend drill-down controls.

## Deferred Pilot Follow-Ups

- full browser walkthrough for every persona;
- approval cancellation/supersede coverage;
- metadata rollback runtime smoke;
- contact and opportunity import composed hardening smoke;
- reporting approval-backlog drill-down;
- automatic reporting projection refresh after every write path;
- custom-field reporting dimensions;
- record-detail audit timeline integration;
- deployment/pilot runbook beyond local compose.

## Current Smoke Scenario Inventory

- `health`
- `phase7-account-merge`
- `phase7-contact-merge`
- `phase7-merge-audit`
- `phase7-merge-ui`
- `phase8-reporting-foundation`
- `phase8-reporting-ui`
- `phase8-reporting-drilldown`
- `phase8-reporting-drilldown-ui`
- `phase9-pilot-e2e`
- `phase9-metadata-safety`
- `phase9-approval-negative`

## Pilot Readiness Boundary

This cut is suitable for local controlled-pilot validation of the MVP wedge. It is not yet a production deployment package.
