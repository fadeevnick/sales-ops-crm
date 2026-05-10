# Phase 6 Fourth Coding Slice Planning Note

## Slice

```text
async import execution worker baseline
```

## Goal

Move account import execution off the request path by introducing a minimal durable queued/running/completed import execution lifecycle while preserving the row-level results already added in Phase 6.

## Files

- add additive Flyway migration for import job queued/running/completed status support if needed
- update import DTOs, repository, service and controller
- add a small backend worker component or Spring-managed async executor
- update project status docs after verification

## In Scope

- RevOps Admin can enqueue execution for a previewed account import job;
- execute request returns quickly with queued/running job status instead of doing all row writes inline;
- backend worker processes valid rows and marks invalid rows skipped;
- job detail endpoint exposes queued/running/executed or failed status and final row outcomes;
- repeat execute/enqueue is rejected once a job is not `previewed`;
- preserve existing synchronous row processing semantics inside the worker;
- keep worker single-process and MVP-local.

## Out of Scope

- distributed job queue infrastructure;
- retry scheduling;
- cancellation;
- progress percentages beyond durable row/job statuses;
- contact/opportunity imports;
- file object storage;
- frontend job monitor UI.

## Acceptance

- backend migration applies on the current compose stack if needed;
- backend `gradle compileKotlin --no-daemon` passes in the container;
- RevOps Admin enqueue returns a non-previewed job without blocking on manual row verification;
- worker completes the job and account rows are created;
- invalid rows remain skipped with row-level errors;
- Sales Rep and Sales Manager cannot enqueue execution;
- repeat enqueue returns `422 validation_failed`;
- job detail can be polled until completion.
