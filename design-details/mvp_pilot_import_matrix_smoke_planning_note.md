# MVP Pilot Import Matrix Smoke Planning Note

## Slice

```text
pilot contact and opportunity import matrix smoke baseline
```

## Goal

Close the pilot smoke coverage gap for contact and opportunity imports by adding a composed runtime scenario that verifies preview, async execution, row outcomes and created CRM records for both entity types.

## Files

- add runtime smoke scenario under `npm run runtime:smoke`;
- include the scenario in the `npm run pilot:smoke` suite;
- update pilot runbook and project status docs after verification.

## In Scope

- RevOps Admin imports contacts by account name;
- contact import creates one valid row and skips one invalid row;
- created contact is visible through contact list API;
- RevOps Admin imports opportunities by account name;
- opportunity import creates one valid row and skips one invalid row;
- created opportunity is visible through opportunity list API;
- import job status reaches `executed`.

## Out of Scope

- frontend import UI browser smoke;
- delete/cleanup of imported records;
- bulk import performance;
- all custom-field import combinations;
- new import behavior.

## Acceptance

- `npm run runtime:smoke -- phase9-import-matrix` passes;
- `npm run pilot:smoke` includes and passes the new gate;
- runbook lists the new gate.
