# Phase 7 Third Coding Slice Planning Note

## Slice

```text
duplicate review frontend baseline
```

## Goal

Expose the duplicate candidate queue to RevOps Admin so generated duplicate candidates can be reviewed and false positives can be rejected from the UI before merge execution is introduced.

## Files

- add frontend duplicate candidate types and API wrappers
- add RevOps-only duplicate review panel
- wire candidate generation, queue refresh and rejection actions into the CRM workspace
- update project status docs after verification

## In Scope

- RevOps Admin can generate account or contact duplicate candidates from the UI;
- RevOps Admin can view open duplicate candidates with labels, score and reason summary;
- RevOps Admin can reject an open candidate with a review reason;
- rejected candidate disappears from the open UI queue after refresh;
- Sales Rep and Sales Manager do not see duplicate review controls;
- existing Data Operations import/export UI remains intact.

## Out of Scope

- merge command;
- compare-record detail screen;
- undo rejection;
- rejected-candidate history UI;
- fuzzy matching controls;
- audit timeline display.

## Acceptance

- frontend build passes in the container;
- RevOps Admin can generate duplicate candidates through the UI;
- RevOps Admin can reject a duplicate candidate through the UI;
- backend rejected queue confirms the review reason;
- Sales Rep and Sales Manager workspace does not expose duplicate review controls;
- import/export Data Operations smoke remains unaffected.
