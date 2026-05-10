# Phase 9 Third Hardening Slice Planning Note

## Slice

```text
metadata publish safety runtime smoke baseline
```

## Goal

Add a focused runtime smoke scenario for the Phase 9 metadata publish safety gate: invalid draft changes must validate as errors, must not publish, and must not alter the current published runtime metadata.

## Files

- add runtime smoke scenario under `npm run runtime:smoke`;
- update project status docs after verification.

## In Scope

- non-RevOps metadata management attempt is forbidden;
- RevOps Admin can create or reuse a draft safely for the smoke;
- invalid required-field rule produces validation errors;
- publishing an invalid draft returns validation failure;
- published metadata version remains unchanged after failed publish;
- smoke cleans up its own draft mutation.

## Out of Scope

- browser metadata admin UI;
- broad metadata editor matrix;
- rollback runtime smoke;
- custom-field reporting behavior;
- destructive cleanup of unrelated user-created drafts.

## Acceptance

- `npm run runtime:smoke -- phase9-metadata-safety` passes against the current compose runtime;
- scenario returns the published version before/after and the validation error code;
- project status docs point to the next Phase 9 hardening gate.
