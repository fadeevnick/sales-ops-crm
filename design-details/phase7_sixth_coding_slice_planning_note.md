# Phase 7 Sixth Coding Slice Planning Note

## Slice

```text
duplicate merge frontend controls baseline
```

## Goal

Expose the completed account/contact merge backend commands in the RevOps Duplicate Review panel so admins can choose a master record and execute merge from the UI.

## Files

- update frontend duplicate candidate types/API wrappers for account/contact merge
- update `DuplicateReviewPanel` with master selection and merge actions
- keep generate/refresh/reject behavior intact
- add browser/runtime verification
- update project status docs after verification

## In Scope

- RevOps Admin can choose left or right candidate side as master;
- RevOps Admin can merge account candidates from the UI;
- RevOps Admin can merge contact candidates from the UI;
- merged candidate disappears from the open UI queue;
- UI displays merge result counts;
- Sales Rep and Sales Manager do not see Duplicate Review controls;
- existing reject flow remains functional.

## Out of Scope

- detailed compare screen;
- field conflict resolution UI;
- merged/rejected history UI;
- undo merge;
- audit timeline display;
- visual graph of rewired relations.

## Acceptance

- frontend build passes in the container;
- RevOps Admin merges an account duplicate candidate through the UI;
- RevOps Admin merges a contact duplicate candidate through the UI;
- backend merged queue confirms persisted merge metadata;
- reject flow still works from the UI;
- Sales Rep and Sales Manager workspace does not expose Duplicate Review controls.
