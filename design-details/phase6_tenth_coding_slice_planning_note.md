# Phase 6 Tenth Coding Slice Planning Note

## Slice

```text
opportunity import baseline
```

## Goal

Extend the existing async import pipeline to opportunities so Phase 6 covers CSV onboarding for the main CRM core records: accounts, contacts and opportunities.

## Files

- add additive Flyway migration only if import constraints need opportunity support
- update backend import preview mapping/validation for opportunities
- update import worker opportunity creation path
- update frontend import entity options only if the backend slice is completed cleanly
- update project status docs after verification

## In Scope

- RevOps Admin-only opportunity CSV preview and execution;
- opportunity fields: title, account id or account name, stage key, expected amount, close date;
- optional primary contact id if narrow reuse is safe;
- row-level validation for title, account resolution, stage key and amount/date parsing;
- async execution through queued/running/executed statuses;
- create valid opportunities under the executing RevOps Admin;
- skip invalid rows with row-level errors;
- preserve account and contact import behavior.

## Out of Scope

- opportunity custom fields;
- approval submission during import;
- owner mapping;
- fuzzy account/contact matching;
- deduplication;
- saved-view import presets;
- frontend drag-and-drop mapping.

## Acceptance

- backend migration applies on the current compose stack if needed;
- backend `gradle compileKotlin --no-daemon` passes in the container;
- RevOps Admin can preview opportunity CSV;
- Sales Rep and Sales Manager cannot preview or execute opportunity import jobs;
- valid opportunity rows create opportunity records;
- invalid rows preserve row-level errors;
- execution remains async through queued/running/executed statuses;
- account/contact import regression still passes.
