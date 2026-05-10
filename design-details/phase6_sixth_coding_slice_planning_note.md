# Phase 6 Sixth Coding Slice Planning Note

## Slice

```text
contact import baseline
```

## Goal

Extend the existing import job pipeline from accounts to contacts so tenant onboarding can bring in people attached to accounts while preserving preview, async execution and row-level outcomes.

## Files

- add additive Flyway migration only if import job constraints need contact support
- update backend import DTO/service/repository behavior where needed
- reuse existing contact repository creation logic or add a narrow import command
- update frontend mapping options only if the existing UI needs a narrow contact path
- update project status docs after verification

## In Scope

- RevOps Admin-only contact CSV preview and execution;
- contact fields: full name, email, phone, account id or account name;
- row-level preview validation for required contact name and account resolution;
- async execution through the existing import worker lifecycle;
- create valid contact rows under the executing RevOps Admin unless owner mapping is explicitly added later;
- skip invalid rows with row-level errors;
- preserve account import behavior.

## Out of Scope

- opportunity import;
- owner mapping;
- deduplication;
- fuzzy account matching;
- contact custom fields;
- frontend drag-and-drop mapping polish;
- file object storage.

## Acceptance

- backend migration applies on the current compose stack if needed;
- backend `gradle compileKotlin --no-daemon` passes in the container;
- RevOps Admin can preview a contact CSV;
- Sales Rep and Sales Manager cannot preview or execute contact import jobs;
- valid contact rows create contact records attached to visible tenant accounts;
- invalid contact rows preserve row-level errors;
- contact import execution remains async through queued/running/executed statuses;
- existing account import and export smoke paths still work.
