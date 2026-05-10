# Phase 7 Fifth Coding Slice Planning Note

## Slice

```text
contact duplicate merge backend baseline
```

## Goal

Add controlled merge execution for contact duplicate candidates, proving that opportunities referencing the losing contact as primary contact are safely rewired to the selected master contact.

## Files

- update duplicate candidate DTOs for contact merge request/response if needed
- update duplicate candidate repository with contact candidate merge update
- add contact merge service logic for master/duplicate selection and relation rewiring
- expose RevOps-only backend endpoint for contact candidate merge
- add runtime smoke scenario under `npm run runtime:smoke`
- update project status docs after verification

## In Scope

- RevOps Admin can merge an open contact duplicate candidate;
- request chooses one candidate side as the master contact;
- opportunities whose `primary_contact_id` points at the duplicate contact are reassigned to the master contact;
- duplicate candidate is marked `merged`;
- merged candidate is removed from the open queue and visible in `status=merged`;
- merge rejects non-contact candidates, non-open candidates and master ids outside the candidate pair;
- Sales Rep and Sales Manager cannot execute merge.

## Out of Scope

- account merge UI;
- contact merge UI;
- contact field conflict resolution;
- deletion/archive of losing contact;
- activity relation changes because activities are currently opportunity-scoped;
- undo merge;
- full audit timeline enrichment beyond merge candidate status/history.

## Acceptance

- backend `gradle compileKotlin --no-daemon` passes in the container;
- RevOps Admin merges a contact duplicate candidate;
- opportunities from the losing primary contact become attached to the master contact;
- merged candidate is no longer in the open queue;
- `status=merged` list shows the merged candidate;
- invalid merge attempts return validation failure;
- Sales Rep and Sales Manager merge attempts return `403`;
- runtime smoke passes through `npm run runtime:smoke`.
