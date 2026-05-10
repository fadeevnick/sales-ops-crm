# Phase 5 Fourth Coding Slice Planning Note

## Slice

```text
manager visibility relationship persistence
```

## Goal

Replace the hardcoded manager team scope seed with a small tenant-scoped manager relationship model so Phase 5 manager visibility is operationally meaningful and data-driven.

## Files

- add a Flyway migration for manager/team visibility relationships
- update `codebase/backend/src/main/kotlin/com/salesops/bootstrap/crm/opportunity/TeamScopePolicy.kt`
- add a narrow repository/helper for manager report lookups if needed
- update opportunity access runtime checks only through the existing owner-scope boundary
- update project status docs after verification

## In Scope

- persist manager-to-report relationships for the seeded Orion tenant;
- resolve Sales Manager opportunity scope from persisted relationships instead of hardcoded IDs;
- keep RevOps Admin tenant-wide scope unchanged;
- keep Sales Rep own-record scope unchanged;
- verify manager sees own plus persisted report scope;
- verify manager does not see unrelated users by default.

## Out of Scope

- org chart UI;
- territory model;
- arbitrary record sharing;
- account/contact team scope expansion;
- approval approver visibility changes;
- field-level security;
- schema cleanup for the legacy `opportunities.stage_id` persistence bridge.

## Acceptance

- backend migration applies on the current compose stack;
- backend `gradle compileKotlin --no-daemon` passes in the container;
- backend restart passes `/readyz`;
- Sales Manager opportunity list includes own records plus persisted direct-report records;
- Sales Rep opportunity list remains own-record only;
- RevOps Admin tenant-wide opportunity list remains unchanged;
- removing the hardcoded `user_michael -> user_anna` branch would not change the seeded runtime behavior.
