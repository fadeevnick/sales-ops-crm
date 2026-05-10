# Phase 6 Ninth Coding Slice Planning Note

## Slice

```text
opportunity export frontend support baseline
```

## Goal

Expose opportunity export through the existing RevOps Admin Data Operations panel while keeping account export behavior intact.

## Files

- update frontend export job types for opportunity export requests
- update `BulkOperationsPanel` export entity selector and criteria controls
- keep import controls unchanged
- update project status docs after verification

## In Scope

- RevOps Admin can choose account or opportunity export mode;
- opportunity export mode supports search text and stage key;
- opportunity export displays CSV output in the existing result area;
- account export mode still works as before;
- Sales Rep and Sales Manager still do not see Data Operations controls.

## Out of Scope

- saved-view export button integration;
- contact export;
- custom-field export columns;
- downloadable file storage;
- signed download links;
- field-level visibility controls.

## Acceptance

- frontend build passes in the container;
- RevOps Admin can create opportunity export through the UI;
- CSV output includes expected opportunity data;
- account export UI mode still creates account export jobs;
- Sales Rep and Sales Manager workspace does not expose Data Operations controls.
