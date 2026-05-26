# Sales Ops CRM UI Redesign Prototypes

This folder contains standalone UI redesign prototypes for the Sales Ops CRM local pilot MVP.

The prototypes are design artifacts, not production frontend code. They are intended to define the target UX before implementation in `codebase/frontend`.

## Prototype Index

| # | Prototype | Role / audience | Coverage |
|---|---|---|---|
| 01 | `01_app_shell.html` | All authenticated users | App shell, navigation, role switching, module visibility |
| 02 | `02_sales_rep_workspace.html` | Sales Representative | Daily opportunity workspace, filters, selected opportunity preview, new opportunity drawer |
| 03 | `03_opportunity_detail.html` | Sales Representative / Manager | Opportunity record, stage path, activities, approval panel, audit, account/contact context |
| 04 | `04_submit_approval_flow.html` | Sales Representative | Commercial exception submission, policy preview, approval chain, submit/blocked states |
| 05 | `05_approver_inbox.html` + `05_approver_inbox.jsx` | Finance / Legal Approver | Approval queue, filters, request preview, decision modal |
| 06 | `06_approval_decision_detail.html` + `06_approval_decision_detail.jsx` | Finance / Legal Approver | Approval request detail, frozen snapshot, decision panel, immutable history |
| 07 | `07_account_detail.html` + `07_account_detail.jsx` | Sales Representative / Manager | Account profile, contacts, linked opportunities, activities, duplicate warning, audit |
| 08 | `08_manager_pipeline.html` + `08_manager_pipeline.jsx` | Sales Manager | Team pipeline, risk triage, scoped visibility, reassignment and manager notes |
| 09 | `09_metadata_admin.html` + `09_metadata_admin.jsx` | RevOps Administrator | Custom fields, stages, required rules, draft/publish validation, impact review |
| 10 | `10_import_export_operations.html` + `10_import_export_operations.jsx` | RevOps Administrator | CSV import/export, mapping, validation, async jobs, row errors, audit |
| 11 | `11_duplicate_review_merge.html` + `11_duplicate_review_merge.jsx` | RevOps Administrator | Duplicate queue, side-by-side compare, master selection, merge/reject, audit |
| 12 | `12_executive_dashboard.html` + `12_executive_dashboard.jsx` | Executive | Pipeline/forecast/approval metrics, projection health, access-aware drill-down |

## Design Principles

- Use the product name `Sales Ops CRM`.
- Treat the environment as `Local Pilot`.
- Keep the UI dense, operational, and B2B-workspace oriented.
- Prioritize scanability, clear primary actions, access boundaries, auditability, and role-specific workflow.
- Avoid marketing-page layout, decorative cards, and generic CRM screens that hide approvals, metadata, import, dedup, or audit.

## QA Checklist

Before using a prototype as an implementation reference:

- Open the `.html` file in a browser.
- Confirm any paired `.jsx` file is present in the same folder.
- Confirm there are no unrelated brands or marketplace/vendor references.
- Confirm the shell uses `LOCAL PILOT` / `Local Pilot`, not production wording.
- Confirm the active role and active navigation item match the screen.
- Check the main interaction: row selection, drawer/modal, validation, toast, or scenario toggle.
- Check that access boundaries and audit/traceability are visible where relevant.

## Implementation Order Recommendation

When carrying this design into `codebase/frontend`, implement in this order:

1. App shell redesign.
2. Sales Rep workspace.
3. Opportunity detail.
4. Account detail.
5. Approval inbox and approval detail.
6. Manager pipeline.
7. RevOps admin screens: metadata, import/export, duplicate merge.
8. Executive dashboard.

