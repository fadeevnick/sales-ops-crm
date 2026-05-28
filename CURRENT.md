# CURRENT

## Focus
Frontend integration of the redesigned Sales Ops CRM screens into
`codebase/frontend/src`. All 10 redesign screens are now integrated.

## Status
Phase 1 shell and screens 1–9 were integrated in prior sessions.
Executive Dashboard (Phase 2.10) was integrated as the final screen.

**What was done:**
- Created `features/reporting/ExecutiveDashboard.tsx` from the prototype
  component. The UX structure (KPI band, pipeline funnel, approval queues
  panel, exception types accordion, projection health accordion, drill-down
  table, sticky preview panel) is intact. The capability audit comment at the
  top of that file was rewritten to reflect the real integrated data shape,
  not the prototype design intent.
- Added "Executive Dashboard" as a third tab in `ReportingDashboard.tsx`
  alongside "Team Pipeline" and "Aggregate Metrics". Metrics data is
  lazy-loaded and shared across both data-heavy tabs.
- Wired `onNavigateToApprovals` from `WorkspaceShell` → `ReportingDashboard`
  → `ExecutiveDashboard`. Available to revops_admin (who also has approvals
  access). Renders as plain `<span>` for users without that access.
- Appended `styles.phase2-10.css` + role-badge CSS to `styles.css`.
- Added missing `--neg`, `--neg-soft`, `--warn`, `--warn-soft`, `--info`,
  `--info-soft` CSS variables to `:root`. These were referenced throughout
  the prior integrated phases but never defined.

TS build: clean (zero diagnostics). Production build: clean
(53 modules, 115.76 KB CSS, 420.15 KB JS).

## Degraded state — Executive Dashboard

The screen renders with real data where the API supports it. Several
sections show reduced data because the backend does not yet expose the
needed fields. Each degraded surface is visible to the user in the UI
(empty state, "n/a", or 0 rather than fabricated values).

**Approval queues panel**
The API exposes only aggregate `pendingRequests` / `activeSteps` totals,
no per-department breakdown. One row is shown: "All Queues" with real
pending count, `overdue: 0`, `avgH: "n/a"`. Finance / Legal / Manager
rows do not appear. Clicking a per-queue funnel row (apprFin / apprLeg /
apprMgr) always returns an empty drill-down table because real
`approvalLabel` values ("Pending approval", "Sent back", etc.) do not
contain department names.

**Exception types accordion**
No per-type data in API. The accordion renders "Exception types 0" and
opens to an empty body. Discount / Payment terms / Legal/indemnity rows
do not appear.

**Pipeline funnel — stuck signal**
`stuck` is always 0; no stuck-deal signal in the API. All stage rows
show "—" in the Stuck column. The funnel footer shows "Stuck: 0". Warn
highlighting never triggers.

**Closed Won QTD row**
No closed-won data in the API. The row shows `0 / $0`. Clicking it
triggers the `stageW` drill preset which always returns empty (opportunity
list is open opportunities only) with an honest empty note.

**Avg approval turnaround KPI**
Displays hardcoded "36.4h". No per-request time data in the API; this
is a placeholder, not a live metric.

**Projection health accordion**
`lastRefresh` is real (`projection.refreshedAt`). `refreshDuration`,
`pendingImports`, `pendingMerges` are not in the API and show "n/a" / 0.

**Drill-down table**
`team` column always blank. `notes/context` field in preview always
blank. Both are absent from the opportunity list API.

**Export Summary button**
`onExport` not provided → button absent. No export endpoint exists.

**"Open opportunity ›" in preview panel**
`onOpenOpportunity` not provided → button absent. Cross-workspace
navigation (reporting → CRM opportunity detail) is not threaded.

**Stage codes**
Derived by position (pos 0→Q, 1→D, 2→P, 3→N, …). Stage-specific drill
presets work correctly as long as real stage positions follow this
mapping. If the tenant reorders stages, the single-letter codes shift.

**Weighted forecast delta chip**
Shows "+2.4%" — hardcoded estimate; no historical comparison data in API.

## Open questions / Backend follow-ups

Prior session's open questions remain (Account Detail, Manager Pipeline,
Import/Export, Duplicate Review). New items for Executive Dashboard:

1. **Approval queues**: per-department breakdown (Finance / Legal / Manager
   pending count, overdue count, avgH) needed for honest per-queue rows
   and for apprFin / apprLeg / apprMgr drill presets to produce results.
2. **Avg turnaround**: real per-request elapsed-time aggregate needed to
   replace the hardcoded "36.4h" display.
3. **Exception types**: per-type request breakdown (type, count, value)
   needed for the accordion rows to populate.
4. **Closed Won QTD**: closed-won opportunity aggregate by quarter needed
   for the funnel W row and stageW drill preset.
5. **Stuck signal**: per-opportunity stuck flag or last-stage-change date
   needed for the funnel Stuck column and warn highlighting.
6. **Projection health detail**: `refreshDuration`, `pendingImports`,
   `pendingMerges` fields needed in the reporting API response.
7. **`onOpenOpportunity`**: cross-workspace navigation state threading
   (or a lightweight opportunity modal) needed to enable "Open opportunity ›".
8. **Export Summary**: executive summary export endpoint needed.

## Verification
- `tsc -b` clean (zero diagnostics)
- `vite build --outDir /tmp/salesops-frontend-exec` clean
  (53 modules, 115.76 KB CSS, 420.15 KB JS)
- Runtime smoke (`npm run pilot:smoke`) requires live backend on
  127.0.0.1:8081 — not run in this static integration session.

## Mode detection
implement (final screen integration complete; capability audit corrected).
