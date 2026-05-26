# Sales Ops CRM UI Redesign Implementation Plan

This plan turns the `prototypes/ui-redesign` design artifacts into production frontend work in `codebase/frontend`.

The goal is not to change backend behavior first. The first pass should preserve the existing API calls and data contracts while replacing the current rough pilot UI with the redesigned operational workspace.

## Current Frontend Surface

The existing React app already has most of the required domain modules:

| Area | Current code | Target prototype |
|---|---|---|
| App shell / role framing | `src/App.tsx`, `src/features/shell/WorkspaceShell.tsx`, `SessionBanner.tsx`, `ModuleGrid.tsx` | `01_app_shell.html` |
| Sales workspace | `src/features/crm/CrmReadWorkspace.tsx`, `OpportunityList.tsx`, `CrmCreatePanel.tsx` | `02_sales_rep_workspace.html` |
| Opportunity detail | `src/features/crm/OpportunityDetail.tsx` | `03_opportunity_detail.html`, `04_submit_approval_flow.html` |
| Approval inbox/detail | `src/features/approvals/ApproverInbox.tsx` | `05_approver_inbox.html`, `06_approval_decision_detail.html` |
| Account context | `src/features/crm/AccountList.tsx`, `CrmReadWorkspace.tsx` | `07_account_detail.html` |
| Manager pipeline | `src/features/crm/CrmReadWorkspace.tsx`, `src/features/reporting/ReportingDashboard.tsx` | `08_manager_pipeline.html` |
| Metadata admin | `src/features/metadata/MetadataAdminWorkspace.tsx` | `09_metadata_admin.html` |
| Import/export | `src/features/crm/BulkOperationsPanel.tsx` | `10_import_export_operations.html` |
| Duplicate review | `src/features/crm/DuplicateReviewPanel.tsx` | `11_duplicate_review_merge.html` |
| Executive dashboard | `src/features/reporting/ReportingDashboard.tsx` | `12_executive_dashboard.html` |
| Shared styles | `src/styles.css` | all prototypes |

## Implementation Principles

- Keep product naming as `Sales Ops CRM`.
- Show the environment as `LOCAL PILOT` / `Local Pilot`.
- Keep backend endpoints and TypeScript API clients stable unless a screen truly needs missing data.
- Build a reusable shell, layout, table, badge, button, drawer, modal, tab, and metric-card style layer instead of copying prototype CSS into every component.
- Keep role-aware visibility explicit: sales rep, sales manager, finance approver, legal approver, RevOps admin, executive.
- Preserve auditability and access-boundary cues in every workflow where they exist in the prototypes.
- Ship in small vertical slices that can be tested with the existing Docker Compose local pilot.

## Phase 1: Shell Foundation

Target: make the application frame match `01_app_shell.html`.

Files:

- `src/App.tsx`
- `src/features/shell/WorkspaceShell.tsx`
- `src/features/shell/SessionBanner.tsx`
- `src/features/shell/ModuleGrid.tsx`
- `src/styles.css`

Work:

- Replace the current stacked shell with a persistent sidebar and topbar.
- Add role-aware navigation items instead of showing all eligible modules as stacked sections.
- Keep the demo user switch/logout flow, but present it as an operational session control.
- Introduce shared CSS tokens for color, spacing, typography, badges, panels, tables, forms, drawers, and modals.
- Ensure the first authenticated screen lands on the correct default workspace for the selected role.

Acceptance:

- Login still works with demo users.
- Role visibility is unchanged from current behavior.
- The UI reads as `Local Pilot`, not production.
- `npm run build` passes.

## Phase 2: Sales Rep Workspace

Target: implement the daily sales workspace from `02_sales_rep_workspace.html`.

Files:

- `src/features/crm/CrmReadWorkspace.tsx`
- `src/features/crm/OpportunityList.tsx`
- `src/features/crm/CrmCreatePanel.tsx`
- `src/features/crm/OpportunityDetail.tsx`
- `src/styles.css`

Work:

- Convert the CRM screen into a focused opportunity workspace with saved views, filters, list/table density, selected opportunity preview, and create drawer.
- Keep account/contact/opportunity creation behavior working.
- Make the created-record path obvious: after creating an account/contact/opportunity, select it and show it in the visible workspace.
- Preserve current API calls for listing and creating records.

Acceptance:

- A sales rep can create an account and immediately see where it appeared.
- A sales rep can create/select an opportunity and inspect the detail panel.
- Filter/search controls do not break existing list behavior.
- Empty/loading/error states are readable and compact.

## Phase 3: Opportunity Detail And Approval Submission

Target: implement `03_opportunity_detail.html` and fold `04_submit_approval_flow.html` into the real opportunity detail workflow.

Files:

- `src/features/crm/OpportunityDetail.tsx`
- `src/api/opportunities.ts`
- `src/api/approvals.ts`
- `src/types/crm.ts`
- `src/types/approvals.ts`
- `src/styles.css`

Work:

- Redesign the opportunity detail view with stage path, commercial data, account/contact context, activities, custom fields, approval state, and audit/history.
- Replace the current approval text box with a guided submit approval flow.
- Show policy preview, blocked states, required fields, approval chain, and submitted state.
- Keep the existing submit approval endpoint unless missing backend data forces a follow-up backend task.

Acceptance:

- An eligible opportunity can submit an approval request.
- Blocked submission states explain the missing data.
- Submitted approval state is visible without refreshing the whole app.
- Existing stage/update behavior still works.

## Phase 4: Approval Workflows

Target: implement `05_approver_inbox.html` and `06_approval_decision_detail.html`.

Files:

- `src/features/approvals/ApproverInbox.tsx`
- `src/api/approvals.ts`
- `src/types/approvals.ts`
- `src/styles.css`

Work:

- Split approval UX into queue, filters, selected request detail, frozen opportunity snapshot, decision panel, and immutable history.
- Keep approve/reject/request-changes behavior connected to the existing API.
- Make current approver ownership and inactive/non-actionable states clear.

Acceptance:

- Finance/legal approver can open the inbox, select a request, and make a decision.
- RevOps admin can inspect requests according to existing access rules.
- Decision history and snapshot data remain visible after action.

## Phase 5: Account Detail

Target: implement `07_account_detail.html`.

Files:

- `src/features/crm/AccountList.tsx`
- `src/features/crm/CrmReadWorkspace.tsx`
- `src/api/accounts.ts`
- `src/types/crm.ts`
- `src/styles.css`

Work:

- Add a real account detail experience with profile, contacts, linked opportunities, activity context, duplicate warnings, owner/visibility metadata, and audit cues.
- Keep the account list usable as a navigation surface.
- If the backend lacks a dedicated account detail endpoint, first compose the detail from currently available list/detail calls and create a backend follow-up only for missing data.

Acceptance:

- Selecting an account exposes enough context to verify it exists after creation.
- Linked opportunities and contacts are visible where data is available.
- Duplicate warning links naturally to duplicate review.

## Phase 6: Manager Pipeline

Target: implement `08_manager_pipeline.html`.

Files:

- `src/features/crm/CrmReadWorkspace.tsx`
- `src/features/reporting/ReportingDashboard.tsx`
- `src/api/reporting.ts`
- `src/types/reporting.ts`
- `src/styles.css`

Work:

- Add a manager-oriented pipeline screen with team filters, stage breakdown, risk triage, forecast summary, and selected opportunity context.
- Reuse reporting data where possible.
- Keep scoped visibility obvious: manager sees team/pipeline context, not global admin controls.

Acceptance:

- Sales manager can review team pipeline health.
- At-risk and approval-blocked opportunities are easy to identify.
- Existing reporting projection calls still work.

## Phase 7: RevOps Admin Screens

Target: implement `09_metadata_admin.html`, `10_import_export_operations.html`, and `11_duplicate_review_merge.html`.

Files:

- `src/features/metadata/MetadataAdminWorkspace.tsx`
- `src/features/crm/BulkOperationsPanel.tsx`
- `src/features/crm/DuplicateReviewPanel.tsx`
- `src/api/metadata.ts`
- `src/api/bulkOperations.ts`
- `src/api/duplicateCandidates.ts`
- `src/styles.css`

Work:

- Redesign metadata admin around draft/publish, validation issues, stage rules, custom fields, required rules, and impact review.
- Redesign import/export around mapping, validation, async job progress, row-level errors, and audit.
- Redesign duplicate review around candidate queue, side-by-side compare, master selection, merge/reject, and audit result.

Acceptance:

- RevOps admin can publish metadata changes with validation feedback.
- RevOps admin can preview/execute imports and inspect row errors.
- RevOps admin can merge or reject duplicate candidates without losing context.

## Phase 8: Executive Dashboard

Target: implement `12_executive_dashboard.html`.

Files:

- `src/features/reporting/ReportingDashboard.tsx`
- `src/api/reporting.ts`
- `src/types/reporting.ts`
- `src/styles.css`

Work:

- Redesign reporting into an executive dashboard with pipeline, forecast, approval backlog, projection health, and access-aware drill-down.
- Keep RevOps refresh controls where currently allowed.
- Separate executive summary layout from manager pipeline operations if both use the same data source.

Acceptance:

- Executive/manager personas can scan business health quickly.
- RevOps admin can still refresh projections.
- Dashboard clearly shows data freshness and source counters.

## Verification Loop

For each phase:

1. Compare against the matching prototype file.
2. Run `npm run build` in `codebase/frontend`.
3. Run the Docker Compose local pilot.
4. Log in as the relevant demo role.
5. Exercise the primary workflow manually.
6. Run or update `npm run pilot:smoke` / `npm run runtime:smoke` where the workflow is covered.

## First Implementation Slice

Start with Phase 1 only.

Reason: the current app renders multiple eligible modules stacked on one page. The prototypes assume a real app shell with navigation. Implementing that shell first creates the frame needed to migrate every later screen without repeatedly reworking layout.
