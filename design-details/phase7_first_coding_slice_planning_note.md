# Phase 7 First Coding Slice Planning Note

## Slice

```text
duplicate candidate storage and generation baseline
```

## Goal

Start Phase 7 by adding a durable duplicate candidate queue for accounts and contacts, with explainable candidate reasons and RevOps-only access.

## Files

- add Flyway migration for duplicate candidate storage
- add backend duplicate candidate DTOs, repository, service and controller
- add generation logic for narrow exact-match account/contact cases
- update project status docs after verification

## In Scope

- RevOps Admin can generate duplicate candidates for accounts and contacts;
- RevOps Admin can list open duplicate candidates;
- account candidates are generated from exact normalized account name matches;
- contact candidates are generated from exact normalized email matches;
- candidate rows include left/right record ids, labels, score and reason summary;
- repeated generation does not duplicate existing candidate pairs;
- Sales Rep and Sales Manager cannot generate or list duplicate candidates.

## Out of Scope

- fuzzy matching;
- manual candidate creation;
- false-positive rejection;
- merge command;
- relation rewiring;
- merge/audit history tables;
- frontend duplicate review UI.

## Acceptance

- backend migration applies on the current compose stack;
- backend `gradle compileKotlin --no-daemon` passes in the container;
- RevOps Admin can generate account duplicate candidates;
- RevOps Admin can generate contact duplicate candidates;
- duplicate candidate list returns explainable rows;
- repeated generation is idempotent for existing pairs;
- Sales Rep and Sales Manager receive `403` for generate/list attempts.
