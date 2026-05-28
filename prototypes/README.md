# Prototypes

This directory is the current prototype source set for Sales Ops CRM.

There are no `ui-redesign/` or `ux_redesign/` subfolders anymore. The
active prototype files now live directly in `prototypes/`.

## What lives here

1. Visual screen prototypes

- `01_app_shell.html`
- `02_sales_rep_workspace.html`
- `03_opportunity_detail.html`
- `04_submit_approval_flow.html`
- `05_approver_inbox.html` + `05_approver_inbox.jsx`
- `06_approval_decision_detail.html` + `06_approval_decision_detail.jsx`
- `07_account_detail.html` + `07_account_detail.jsx`
- `08_manager_pipeline.html` + `08_manager_pipeline.jsx`
- `09_metadata_admin.html` + `09_metadata_admin.jsx`
- `10_import_export_operations.html` + `10_import_export_operations.jsx`
- `11_duplicate_review_merge.html` + `11_duplicate_review_merge.jsx`
- `12_executive_dashboard.html` + `12_executive_dashboard.jsx`

2. Implementation handoff files

- `CrmReadWorkspace.tsx` + `styles.phase2-1.css`
- `OpportunityDetail.tsx` + `styles.phase2-2.css`
- `ApproverInbox.tsx` + `styles.phase2-3.css`
- `ApprovalDecisionDetail.tsx` + `styles.phase2-4.css`
- `AccountDetail.tsx` + `styles.phase2-5.css`
- `ManagerPipeline.tsx` + `styles.phase2-6.css`
- `MetadataAdmin.tsx` + `styles.phase2-7.css`
- `ImportExportOperations.tsx` + `styles.phase2-8.css`
- `DuplicateReviewMerge.tsx` + `styles.phase2-9.css`
- `ExecutiveDashboard.tsx` + `styles.phase2-10.css`

3. Shared redesign reference

- `UX Simplification Plan.html`

## Source-of-truth rule

- `prototypes/` = current prototype and redesign handoff artifacts
- `codebase/frontend/src/` = real integrated product code

If a file in `prototypes/` is no longer current, remove it instead of
creating another archive-style subfolder.
