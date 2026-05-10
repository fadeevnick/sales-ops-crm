# Phase 6 Second Coding Slice Planning Note

## Slice

```text
account import execution and job status baseline
```

## Goal

Turn account import preview jobs into executable jobs that can create valid account rows, preserve row-level results, and expose job status/result read endpoints.

## Files

- add additive Flyway migration if row execution result columns are needed
- update backend import DTOs, repository, service and controller
- update account creation/import helper only if reuse is safe and narrow
- update project status docs after verification

## In Scope

- RevOps Admin-only execute command for previewed account import jobs;
- create accounts for valid preview rows;
- skip invalid preview rows and preserve row-level errors;
- expose job detail/status endpoint with row results;
- keep execution synchronous for this narrow baseline while preserving job status fields;
- ensure import execution does not bypass tenant ownership or account validation basics.

## Out of Scope

- async worker process;
- contact/opportunity imports;
- export jobs;
- deduplication;
- file object storage;
- frontend import wizard;
- rollback/undo import.

## Acceptance

- backend migration applies on the current compose stack if needed;
- backend `gradle compileKotlin --no-daemon` passes in the container;
- RevOps Admin can execute a previewed account import job;
- Sales Rep and Sales Manager cannot execute import jobs;
- valid rows create account records;
- invalid rows remain failed/skipped with row-level errors;
- job status/result endpoint reports totals and row outcomes.
