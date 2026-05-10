# Phase 5 Fifth Coding Slice Planning Note

## Slice

```text
manager account and contact workspace scope alignment
```

## Goal

Align manager daily workspace lists with the data-driven team visibility model so account/contact selectors do not remain owner-only while manager opportunity visibility is team-aware.

## Files

- update account visibility policy/query path
- update contact visibility policy/query path
- reuse persisted manager report relationships through `TeamScopePolicy` or a narrow shared scope helper
- update frontend only if response contracts or empty states need adjustment
- update project status docs after verification

## In Scope

- Sales Manager account list includes accounts owned by self and persisted direct reports;
- Sales Manager contact list can browse contacts under team-visible accounts;
- Sales Rep account/contact scope remains own-record only;
- RevOps Admin tenant-wide account/contact scope remains unchanged;
- opportunity create still requires the selected account/contact to be visible to the acting user.

## Out of Scope

- territory model;
- arbitrary record sharing;
- account/contact reassignment UI;
- org chart UI;
- field-level security;
- dashboards and reporting;
- schema cleanup for the legacy `opportunities.stage_id` persistence bridge.

## Acceptance

- backend `gradle compileKotlin --no-daemon` passes in the container;
- frontend `npm run build` passes in the container if frontend code changes;
- Sales Manager can list a direct report's account created by the seed relationship;
- Sales Manager can create an opportunity against a team-visible account if existing create rules allow the owner choice;
- Sales Rep cannot list a manager-owned account by default;
- RevOps Admin remains tenant-wide for account/contact browse.
