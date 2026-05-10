# Phase 7 Fourth Coding Slice Planning Note

## Slice

```text
account duplicate merge backend baseline
```

## Goal

Add the first controlled merge command for account duplicate candidates, proving that a reviewed duplicate pair can be merged without leaving related contacts or opportunities attached to the losing account.

## Files

- add Flyway migration for merge result/history fields if needed
- update duplicate candidate DTOs for account merge request/response
- update duplicate candidate repository with account candidate merge update
- add account merge service logic for master/duplicate selection and relation rewiring
- expose RevOps-only backend endpoint for account candidate merge
- update project status docs after verification

## In Scope

- RevOps Admin can merge an open account duplicate candidate;
- request chooses one candidate side as the master account;
- contacts attached to the duplicate account are reassigned to the master account;
- opportunities attached to the duplicate account are reassigned to the master account;
- duplicate candidate is marked `merged`;
- merged candidate is removed from the open queue and visible in `status=merged`;
- merge rejects non-account candidates, non-open candidates and master ids outside the candidate pair;
- Sales Rep and Sales Manager cannot execute merge.

## Out of Scope

- contact merge;
- account field conflict resolution UI;
- soft-delete/archive of losing account;
- undo merge;
- frontend merge controls;
- reporting projection refresh;
- full audit timeline enrichment beyond merge candidate status/history.

## Acceptance

- backend migration applies on the current compose stack if needed;
- backend `gradle compileKotlin --no-daemon` passes in the container;
- RevOps Admin merges an account duplicate candidate;
- contacts and opportunities from the losing account become attached to the master account;
- merged candidate is no longer in the open queue;
- `status=merged` list shows the merged candidate;
- invalid merge attempts return validation failure;
- Sales Rep and Sales Manager merge attempts return `403`.
