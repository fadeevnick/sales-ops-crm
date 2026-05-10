# Phase 4 Completion Review Note

## Phase

```text
metadata-driven process configuration
```

## Completion Decision

Phase 4 can be treated as functionally complete for the MVP path and the project can move into Phase 5 planning.

The remaining `opportunities.stage_id` persistence bridge is deferred as schema cleanup. It is no longer a runtime read-path dependency for opportunity list/detail/approval responses after the thirteenth Phase 4 slice, and removing it now would add migration/data-risk without unlocking a new Phase 4 capability.

## Completed Capability Surface

- metadata config storage foundation exists for tenant-scoped draft/published lifecycle;
- RevOps Admin can read published config, create drafts, validate, publish and discard drafts;
- published metadata drives opportunity stages and supported custom fields at runtime;
- opportunity create/edit/detail flows can capture and render custom field values;
- required-field-by-stage rules are enforced by the published metadata runtime before stage transitions;
- metadata admin UI supports field, stage and required-rule edits for the MVP scope;
- metadata version history, rollback and new-draft management are available to RevOps Admin;
- opportunity list/detail/approval reads resolve stage keys through published metadata runtime instead of joining `opportunity_stages`.

## Verification Summary

- backend compile checks passed inside the backend container across the Phase 4 slices;
- frontend build checks passed inside the frontend container across UI-bearing Phase 4 slices;
- API and browser smoke passes verified draft/publish, custom field capture/rendering, stage validation, admin edit flows and rollback behavior;
- the final Phase 4 stage-runtime slice passed backend compile and API smoke on `2026-05-08`.

## Deferred Items

- custom fields in opportunity list/filter views, if needed for the narrowed Phase 5 saved view baseline;
- schema/data migration to remove the legacy `opportunities.stage_id` persistence bridge and the remaining legacy `opportunity_stages` dependency from write paths;
- richer metadata config diff UI or partial rollback.

## Exit Criteria Assessment

Phase 4 exit criteria are met for the product path:

- tenant-specific metadata configuration works through a controlled draft/publish boundary;
- published metadata affects runtime behavior without code changes;
- invalid metadata and invalid stage transitions are blocked before they corrupt core workflows;
- the core CRM model remains explicit and controlled according to ADR-001.

## Next Phase Entry

Enter Phase 5 with a narrow saved views baseline for the opportunity workspace. Phase 5 must read published metadata where custom field filters/columns are supported, but it must not introduce a universal schema/query abstraction.
