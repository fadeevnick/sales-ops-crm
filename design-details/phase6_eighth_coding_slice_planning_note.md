# Phase 6 Eighth Coding Slice Planning Note

## Slice

```text
opportunity export baseline
```

## Goal

Extend controlled exports from accounts to opportunities so RevOps Admin can export pipeline records with existing access-aware filters and saved-view-compatible criteria.

## Files

- add additive Flyway migration only if export job constraints need opportunity support
- update export DTO/service/repository/controller behavior where needed
- reuse existing opportunity list filter behavior where possible
- update frontend export mode only if the narrow UI change is safe
- update project status docs after verification

## In Scope

- RevOps Admin-only opportunity export job creation;
- support basic opportunity search and stage filters;
- generated CSV includes opportunity id, title, account, owner, stage, amount, close date and approval state;
- export job persists criteria, row count and CSV content;
- export results respect tenant/access rules;
- existing account export behavior remains intact.

## Out of Scope

- saved-view export button integration;
- contact export;
- opportunity import;
- large-file streaming;
- field-level visibility controls;
- custom-field columns in export;
- signed download links.

## Acceptance

- backend migration applies on the current compose stack if needed;
- backend `gradle compileKotlin --no-daemon` passes in the container;
- RevOps Admin can create opportunity export jobs;
- Sales Rep and Sales Manager cannot create export jobs;
- CSV includes expected opportunity rows and headers;
- criteria can narrow exported opportunities;
- account export regression still passes.
