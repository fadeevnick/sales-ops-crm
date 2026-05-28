# Phase 2.1 — Implementation Notes
# Simplified Sales Rep Workspace
# Sales Ops CRM · LOCAL PILOT

---

## Changed files

| File | Action |
|---|---|
| `src/features/crm/CrmReadWorkspace.tsx` | Replace with `phase2-1-output/CrmReadWorkspace.tsx` |
| `src/styles.css` | Append `phase2-1-output/styles.phase2-1.css` at end of file |
| `src/features/crm/OpportunityList.tsx` | No changes required |
| `src/features/crm/CrmCreatePanel.tsx` | No changes required |
| `src/features/crm/OpportunityDetail.tsx` | No changes required |
| `src/types/crm.ts` | No changes required |

---

## What was simplified

### Header
- Removed domain trail (`rep-page-sub` row with role / scope / tenantName).
  That information is still rendered in the existing `rep-foot-ruler`.
- Replaced four separate buttons (New account, New contact,
  Submit for approval, New opportunity) with a single split button:
  - Main action: **New Opportunity**
  - Caret dropdown: **New Account**, **New Contact**
- "Submit for approval" removed from the header entirely.
  It is now only reachable from the preview panel (see below).

### KPI strip
- Reduced from 5 metrics to 3:
  - Open opportunities
  - Pipeline value
  - Pending approvals (Pending + Sent back)
- Removed: Closing this month, Tenant scope tile.
- Scope and tenant context moved to the KPI foot text.
- CSS: added `.rep-kpis--3col` modifier; base `.rep-kpis` rule untouched.

### Saved-view chip row → View tabs
- `SavedViewsRow` component is no longer rendered.
- Replaced with four hardcoded tabs rendered by `ViewTabs`:
  1. **Needs Attention** (default)
  2. **My Open**
  3. **Closing Soon** (≤ 30 days)
  4. **All**
- Each tab badge shows the count from the full opportunity list
  (not reduced by inline filters).
- Switching tabs closes the preview panel so the new list renders cleanly.

### Filter row
- Was: Search · Stage · Account · Close · Approval · scope lock (6 controls)
- Now: Search · Stage · Approval · Filters▾ button · scope lock (4 controls)
- Account filter and Close date filter moved into the **Filters popover**
  (opens on button click, closes on outside click or Apply).
- The Filters button highlights (`.rep-btn-filters-active`) when
  either secondary filter is active, and shows a label summary.

### Table columns
- Unchanged at 6 columns (already correct in `OpportunityList.tsx`).
  Next Activity was not in the table; no column change needed.

### Preview panel
- Hidden by default. Renders only when the user clicks a table row.
- Clicking the same selected row again closes the preview (toggle).
- Added an explicit **✕ close button** in the preview header.
- Duplicate fields removed from preview facts grid:
  - **Amount** removed — already in table "Amount" column
  - **Close date** removed — already in table "Close date" column
  - **Stage pip** removed — already in table "Stage" column
- Facts grid now shows only new information:
  - Owner (not in table)
  - Primary contact (from `OpportunityDetail`, loaded on row select)
  - Up to 3 custom fields (from `OpportunityDetail`)
- Account shown once — in preview header as identity context.
  Not repeated in the facts grid.
- Approval state banner kept: it shows the full detail text,
  which is more than the pill in the table.
- Activities section kept (not in table).
- **Submit for approval** CTA moved here from the page header.

---

## Preserved behavior

- All API calls unchanged:
  `fetchAccounts`, `fetchOpportunities`, `fetchPublishedMetadata`,
  `fetchSavedOpportunityViews`, `fetchOpportunityDetail`,
  `fetchActivities`, `submitApproval`, `createActivity`,
  `moveOpportunityStage`, `reassignOpportunityOwner`, `updateOpportunity`,
  `createSavedOpportunityView`, `updateSavedOpportunityView`,
  `deleteSavedOpportunityView`.
- Saved view state is fully loaded and maintained. All saved view
  handlers (`handleApplySavedView`, `handleCreateSavedView`,
  `handleDeleteSavedView`, `handleUpdateSavedView`) still exist and
  work. The `savedViews` array can be re-exposed if the UI needs it
  in a future phase.
- Create account / contact / opportunity drawer behavior unchanged.
  After creating an opportunity the preview opens automatically.
- Approval submission modal unchanged (same `rep-modal-card` markup).
- Full `OpportunityDetail` view accessible via "Open detail ›" in preview.
- Role scoping: `scopeLockLabel`, `canCreateSharedViews`,
  `canUseBulkOperations` all unchanged.
- RevOps bulk tools `<details>` block unchanged.
- `LOCAL PILOT` / `tenantName` displayed in KPI foot and footer ruler.
- Product name: "Sales Ops CRM" throughout.

---

## Data limitation — Needs Attention tab

`OpportunityListItem` does not include per-opportunity activity data.

The UX spec requires three criteria for Needs Attention:
1. `approvalState === "sent_back"` ✅ implemented
2. `closeDate` within 14 days AND approval not `approved` ✅ implemented
3. Has an overdue activity ❌ not implementable at list level

Criterion 3 requires a `hasOverdueActivity: boolean` (or similar) field
on the `GET /opportunities` list response.

**To implement criterion 3:**
- Backend: add `hasOverdueActivity` to `OpportunityListItem` in the
  list endpoint response and in `src/types/crm.ts`.
- Frontend: add `|| opp.hasOverdueActivity` to `isNeedsAttention()`
  in `CrmReadWorkspace.tsx` (the comment in the function marks the spot).

---

## CSS apply instructions

1. Open `src/styles.css`.
2. Scroll to the very end of the file.
3. Append the full contents of `phase2-1-output/styles.phase2-1.css`.
4. No existing lines in `styles.css` need to be deleted or modified.
   The new modifier classes override the existing base rules via
   specificity (`.rep-kpis--3col`, `.rep-grid.rep-grid--no-preview`,
   `.rep-grid.rep-grid--with-preview`).

---

## Verification checklist

- [ ] `npm run build` in `codebase/frontend` passes with no type errors
- [ ] Log in as `sales_rep` demo user
- [ ] Landing screen shows 3 KPIs and "Needs Attention" tab selected by default
- [ ] Clicking a row opens the preview; clicking it again closes it
- [ ] Preview ✕ button closes the preview
- [ ] Preview does not show Amount or Close date (visible in the table row)
- [ ] "Submit for approval" is absent from the page header
- [ ] "Submit for approval" is present in the preview for eligible opps
- [ ] Split button: main click opens create-opportunity drawer
- [ ] Split button caret: dropdown shows New Account and New Contact
- [ ] "Filters" button opens popover with Account + Close date controls
- [ ] "Filters" button shows active state when a filter is set
- [ ] Tabs filter the list; badge counts reflect the full unfiltered list
- [ ] Switching tabs closes the preview
- [ ] RevOps admin: bulk-ops section still visible
- [ ] Approval submission modal still works end-to-end
