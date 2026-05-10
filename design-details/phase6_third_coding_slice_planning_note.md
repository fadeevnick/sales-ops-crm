# Phase 6 Third Coding Slice Planning Note

## Slice

```text
controlled export job baseline
```

## Goal

Add the first controlled export job path so RevOps Admin can export account records through the same durable job/status pattern used by imports, while preserving access-aware query execution and audit basics.

## Files

- add additive Flyway migration for export job storage
- add backend export DTOs, repository, service and controller
- reuse existing account list/search access behavior where possible
- update project status docs after verification

## In Scope

- RevOps Admin-only export job creation for account records;
- narrow account export only;
- support basic search/filter input compatible with the existing account list endpoint;
- generate CSV content synchronously for the narrow baseline;
- persist export job audit basics: tenant, initiator, entity type, status, row count, created/completed timestamps and criteria;
- expose export job detail/status endpoint with CSV content or a direct content field for the MVP baseline;
- ensure export results respect tenant and role access boundaries.

## Out of Scope

- async worker process;
- contact/opportunity exports;
- saved-view export integration;
- file object storage and signed downloads;
- field-level visibility controls;
- export frontend flow;
- large-file streaming.

## Acceptance

- backend migration applies on the current compose stack if needed;
- backend `gradle compileKotlin --no-daemon` passes in the container;
- RevOps Admin can create an account export job;
- Sales Rep and Sales Manager cannot create export jobs;
- export job status/result endpoint returns completed job details;
- CSV includes expected account rows and headers;
- export criteria can narrow results by account search text;
- export does not include records outside the tenant/access scope.
