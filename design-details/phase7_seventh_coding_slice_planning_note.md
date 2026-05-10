# Phase 7 Seventh Coding Slice Planning Note

## Slice

```text
merge audit event baseline
```

## Goal

Add a business-readable audit event baseline for duplicate merge actions so account/contact merges are traceable outside the duplicate candidate queue.

## Files

- add Flyway migration for business audit events
- add backend audit DTO/repository/service or focused repository helper
- write audit events from account/contact merge commands
- add read endpoint for recent audit events if narrow reuse is safe
- add runtime smoke scenario under `npm run runtime:smoke`
- update project status docs after verification

## In Scope

- account merge writes an audit event with actor, candidate id, master id, duplicate id and reassigned counts;
- contact merge writes an audit event with actor, candidate id, master id, duplicate id and reassigned primary-contact opportunity count;
- audit events are tenant-scoped;
- RevOps Admin can read recent audit events;
- Sales Rep and Sales Manager cannot read audit event feed;
- merge candidate status/history behavior remains intact.

## Out of Scope

- full record detail timeline UI;
- generic audit coverage for all existing actions;
- immutable event signing;
- projection/report refresh;
- audit export;
- event retention policy.

## Acceptance

- backend migration applies on the current compose stack;
- backend `gradle compileKotlin --no-daemon` passes in the container;
- account merge creates a readable audit event;
- contact merge creates a readable audit event;
- RevOps Admin can read the events through API;
- Sales Rep and Sales Manager read attempts return `403`;
- runtime smoke passes through `npm run runtime:smoke`.
