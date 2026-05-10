# MVP Pilot Metadata Rollback Smoke Planning Note

## Slice

```text
pilot metadata rollback smoke baseline
```

## Goal

Close the metadata rollback hardening gap by verifying that RevOps Admin can publish a safe metadata version and roll back to the previously published version without leaving runtime metadata changed.

## Files

- add runtime smoke scenario under `npm run runtime:smoke`;
- include the scenario in the `npm run pilot:smoke` suite;
- update pilot runbook and project status docs after verification.

## In Scope

- verify non-RevOps rollback attempt is forbidden;
- create a draft from current published metadata when no draft exists;
- add a unique optional field to the draft;
- validate and publish the draft;
- verify the new field appears in published metadata;
- rollback to the original archived metadata config;
- verify the original version is published again and the temporary field is absent.

## Out of Scope

- rolling back user-created drafts;
- browser metadata UI;
- destructive metadata cleanup;
- custom-field value migration behavior;
- production backup/restore.

## Acceptance

- `npm run runtime:smoke -- phase9-metadata-rollback` passes;
- `npm run pilot:smoke` includes and passes the new gate;
- runbook lists the new gate.
