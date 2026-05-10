# Phase 6 First Coding Slice Planning Note

## Slice

```text
import job foundation and CSV preview baseline
```

## Goal

Start Phase 6 by adding durable import job storage and a narrow CSV preview endpoint for account imports. This creates the bulk-operation foundation before async execution and row-level writes.

## Files

- add Flyway migration for import job and import row/result storage
- add backend import DTOs, repository, service and controller
- add frontend import API/types only if a minimal UI is included
- update project status docs after verification

## In Scope

- RevOps Admin-only import job creation for CSV text upload or multipart upload, using the simplest existing stack-compatible input shape;
- account import preview only;
- store original file name, entity type, status, source columns and parsed preview rows;
- validate mapping targets against standard account fields and published account custom fields where supported;
- return row-level preview records without creating accounts;
- persist job audit basics: tenant, initiator, timestamps, status and row counts.

## Out of Scope

- async row execution;
- opportunity/contact imports;
- export jobs;
- deduplication and merge;
- file object storage;
- import wizard polish;
- arbitrary mapping expressions;
- schema cleanup for the legacy `opportunities.stage_id` persistence bridge.

## Acceptance

- backend migration applies on the current compose stack;
- backend `gradle compileKotlin --no-daemon` passes in the container;
- RevOps Admin can create an account import preview job;
- Sales Rep and Sales Manager cannot create import jobs;
- malformed CSV returns `422 validation_failed`;
- preview response includes source columns and row-level preview data;
- no account records are created by preview.
