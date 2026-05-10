# Phase 6 Fifth Coding Slice Planning Note

## Slice

```text
import/export frontend operations baseline
```

## Goal

Expose the Phase 6 backend capabilities through a minimal RevOps Admin frontend workflow: account CSV import preview/enqueue/status and account export job creation/result display.

## Files

- add frontend API/types for import and export jobs
- add RevOps-only operations surface in the existing CRM workspace or shell
- keep styling consistent with the current frontend patterns
- update project status docs after verification

## In Scope

- RevOps Admin can paste or enter account CSV content and mapping for a preview job;
- preview screen shows source columns, row validity and validation errors;
- RevOps Admin can enqueue execution from a previewed job;
- job status panel can refresh/poll detail and show queued/running/executed row outcomes;
- RevOps Admin can create an account export job using search text;
- export result displays CSV content in a copyable/readable text area;
- Sales Rep and Sales Manager do not see the operations controls.

## Out of Scope

- polished multipart file upload;
- drag-and-drop mapping UI;
- contact/opportunity imports;
- saved-view export integration;
- downloadable file storage or signed download links;
- cancellation/retry controls;
- broad browser-per-persona regression beyond the new workflow.

## Acceptance

- frontend build passes in the container;
- RevOps Admin can create an import preview through the UI;
- RevOps Admin can enqueue the import and observe final row outcomes;
- created account appears in existing account search/list behavior;
- RevOps Admin can create an account export and see CSV output;
- Sales Rep and Sales Manager workspace does not expose import/export operations controls;
- backend API still passes readiness on port `8081` and frontend remains on port `5173`.
