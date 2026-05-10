# Phase 5 Sixth Coding Slice Planning Note

## Slice

```text
phase 5 access regression and workspace empty states
```

## Goal

Close the main Phase 5 access-scope risk by verifying direct record access, saved-view application and manager workspace behavior across Sales Rep, Sales Manager and RevOps Admin, then tighten frontend empty/error states where the current UI is misleading.

## Files

- update frontend CRM workspace components only where permission/empty states need clearer handling
- update backend only if runtime verification finds a scope gap
- update project status docs after verification

## In Scope

- direct opportunity detail access regression for Sales Rep, Sales Manager and RevOps Admin;
- saved view application regression across private and shared views;
- manager workspace verification for accounts, contacts, opportunities and activities;
- permission-aware empty/error states for account/contact/opportunity panels if current frontend output is misleading;
- document any remaining Phase 5 deferred items.

## Out of Scope

- org chart UI;
- arbitrary record sharing;
- territory model;
- dashboards and reporting;
- field-level security;
- schema cleanup for the legacy `opportunities.stage_id` persistence bridge.

## Acceptance

- backend `gradle compileKotlin --no-daemon` passes if backend code changes;
- frontend `npm run build` passes if frontend code changes;
- Sales Rep cannot direct-open manager-owned opportunities;
- Sales Manager can direct-open persisted report opportunities but not tenant-wide unrelated opportunities;
- RevOps Admin can direct-open tenant opportunities;
- shared saved views do not expand record access when applied;
- manager account/contact/opportunity workspace behavior is consistent in runtime.
