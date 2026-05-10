# Phase 6 Seventh Coding Slice Planning Note

## Slice

```text
contact import frontend support baseline
```

## Goal

Expose the backend contact import path through the existing RevOps Admin Data Operations panel without changing the broader workspace structure.

## Files

- update frontend import/export job types for contact import requests
- update `BulkOperationsPanel` entity selector, default CSV and mapping generation
- keep existing account import and export UI behavior intact
- update project status docs after verification

## In Scope

- RevOps Admin can choose account or contact import mode;
- contact mode provides CSV fields for full name, email, phone and account name;
- contact mode sends `entityType = contact` with contact mapping;
- preview and execute controls work for contact jobs;
- row-level contact validation/execution outcomes display in the existing row list;
- account import mode still works as before;
- Sales Rep and Sales Manager still do not see Data Operations controls.

## Out of Scope

- drag-and-drop mapping editor;
- frontend account lookup/autocomplete;
- opportunity import;
- saved-view export integration;
- file upload widgets;
- duplicate detection or merge prompts.

## Acceptance

- frontend build passes in the container;
- RevOps Admin can create a contact import preview through the UI;
- RevOps Admin can execute the contact import through the UI and observe final row outcomes;
- imported contact appears through existing contact search/list behavior;
- account import UI mode still creates account preview jobs;
- Sales Rep and Sales Manager workspace does not expose Data Operations controls.
