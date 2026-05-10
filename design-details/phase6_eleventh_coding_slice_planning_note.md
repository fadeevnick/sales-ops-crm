# Phase 6 Eleventh Coding Slice Planning Note

## Slice

```text
opportunity import frontend support baseline
```

## Goal

Expose opportunity CSV import through the existing RevOps Admin Data Operations panel now that the backend async import path supports accounts, contacts and opportunities.

## Files

- update frontend import job types for opportunity import requests
- update `BulkOperationsPanel` import entity selector and default CSV/mapping state
- keep account and contact import modes working as before
- update project status docs after verification

## In Scope

- RevOps Admin can choose account, contact or opportunity import mode;
- opportunity import mode provides default CSV content and mapping for title, account name, stage key, expected amount and close date;
- opportunity preview displays resolved account/stage data and row-level validation errors in the existing preview table;
- opportunity execute/enqueue uses the existing job polling flow and row-level execution display;
- account/contact import UI modes remain intact;
- Sales Rep and Sales Manager still do not see Data Operations controls.

## Out of Scope

- drag-and-drop file upload;
- saved import presets;
- opportunity custom field import;
- owner or primary contact mapping;
- deduplication or merge UI;
- downloadable import result files.

## Acceptance

- frontend build passes in the container;
- RevOps Admin can preview opportunity import through the UI;
- RevOps Admin can execute opportunity import through the UI and see `executed`, `created` and row-level validation errors;
- backend opportunity search finds the UI-imported opportunity;
- account/contact import UI smoke still passes;
- Sales Rep and Sales Manager workspace does not expose Data Operations controls.
