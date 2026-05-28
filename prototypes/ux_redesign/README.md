# UX Redesign Handoff

This directory is the implementation-oriented redesign handoff set for Sales Ops CRM.

Use it as follows:

- `prototypes/ui-redesign/` = visual/concept prototypes
- `prototypes/ux_redesign/` = implementation-ready TSX/CSS handoff packages
- `codebase/frontend/src/` = real integrated product code

Conventions in this directory:

- one screen-level TSX file per redesign package
- one phase CSS patch per redesign package
- no temporary output folders
- no stale implementation notes files

Current screen packages:

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

Supporting files:

- `02_sales_rep_workspace_simplified.html`
- `ExecutiveDashboard.html`
