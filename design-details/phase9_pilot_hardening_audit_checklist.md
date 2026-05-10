# Phase 9 Pilot Hardening Audit Checklist

## Purpose

Freeze the MVP pilot cut around verified workflows and explicit deferred items. Phase 9 should fix blockers and prove runtime scenarios; it should not add broad new product capability.

## Pilot Blocker Gates

### Access and Role Boundaries

- Sales Rep cannot access admin-only metadata, duplicate review, reporting dashboards or audit feeds.
- Sales Manager sees team-scoped CRM and reporting drill-down records only.
- RevOps Admin can operate tenant-wide administrative workflows.
- Finance and Legal Approvers can access approval inbox/detail only within assigned approval context.
- Exports, saved views, dashboard drill-downs and direct list APIs share the same visibility assumptions.

### Approval Workflow

- Sales Rep can submit a high-value opportunity for approval.
- Finance Approver can approve first step.
- Legal Approver can approve final step.
- Sales Rep sees approved outcome on the opportunity.
- Rejection and send-back negative paths remain covered before pilot cut.
- Unauthorized approver decisions return forbidden or validation failure.

### Metadata Publish Safety

- RevOps Admin can create a draft and publish valid metadata.
- Invalid draft changes return validation issues without altering published runtime behavior.
- CRM forms and stage validation read the published metadata version.
- Rollback/new-draft behavior remains explicit.

### Import, Export and Data Quality

- Account, contact and opportunity import paths still create jobs and report row-level outcomes.
- Async import worker processes queued jobs.
- Controlled exports remain role/scope-aware.
- Duplicate generation finds account/contact candidates after imported or manually created data.
- Merge rewires key relationships and writes business audit events.

### Reporting and Drill-Down

- RevOps Admin can refresh dashboard projection.
- Sales Manager and RevOps Admin can read dashboard projection.
- Sales Rep cannot read dashboard projection and does not see reporting UI.
- Dashboard shows pipeline, stage, forecast and approval backlog metrics after refresh.
- Stage and forecast drill-downs return access-aware opportunity rows.
- Reporting freshness limitations are visible enough for pilot usage.

### End-to-End Pilot Walkthrough

- Demo login loads for each pilot persona.
- Sales Rep creates account/contact/opportunity and submits approval.
- Approvers complete approval chain.
- RevOps Admin imports data, reviews duplicates, merges a pair and checks audit event.
- Sales Manager reviews team CRM list and reporting dashboard.
- RevOps Admin refreshes reporting and verifies drill-down.

## Deferred Enhancements

- generic report builder;
- custom dashboard designer;
- broad analytics metric catalog;
- automatic reporting refresh after every write path;
- approval turnaround analytics;
- custom-field reporting dimensions;
- full audit timeline on every record detail;
- export/download from reporting drill-down;
- territory/sharing engine beyond current manager-report relationship;
- full browser walkthrough for every role and every negative case.

## Next Runtime Slice

```text
Phase 9 second hardening slice: end-to-end pilot runtime smoke baseline
```

The next slice should add one composed runtime smoke scenario that exercises the pilot walkthrough across personas without introducing new product behavior.
