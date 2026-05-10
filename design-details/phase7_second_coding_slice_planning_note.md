# Phase 7 Second Coding Slice Planning Note

## Slice

```text
duplicate false-positive rejection baseline
```

## Goal

Let RevOps Admin reject duplicate candidates as false positives before merge work begins, preserving a review reason and keeping rejected pairs out of the open review queue.

## Files

- update duplicate candidate DTOs for rejection request/response
- update duplicate candidate repository with tenant-scoped candidate lookup and rejection update
- update duplicate candidate service/controller with RevOps-only reject command
- update project status docs after verification

## In Scope

- RevOps Admin can reject an open duplicate candidate;
- rejection stores reviewed timestamp, reviewer and optional reason;
- rejected candidates disappear from the default open queue;
- rejected candidates remain visible when listing `status=rejected`;
- rejecting a non-open candidate returns validation failure;
- Sales Rep and Sales Manager cannot reject duplicate candidates;
- generation remains idempotent and does not recreate rejected pairs.

## Out of Scope

- merge command;
- relation rewiring;
- undo rejection;
- frontend duplicate review UI;
- audit timeline enrichment beyond candidate review fields;
- fuzzy matching.

## Acceptance

- backend `gradle compileKotlin --no-daemon` passes in the container;
- RevOps Admin rejects an open candidate and sees status `rejected`;
- default open list no longer includes the rejected candidate;
- rejected list includes the candidate and reason;
- repeated generation does not recreate the rejected pair;
- Sales Rep and Sales Manager reject attempts return `403`.
