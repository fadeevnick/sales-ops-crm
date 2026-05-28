# CURRENT

## Focus
Frontend integration of the redesigned Sales Ops CRM screens into
`codebase/frontend/src`. Phase 1 shell + screens 1–4 already integrated
in earlier commits; this session integrated screens 5–9.

## Status
Phase 1 shell and screens 1–9 are integrated into the real frontend,
but some later screens intentionally degrade where the backend shape is
still thinner than the redesign prototypes. The last cleanup pass
reworked `DuplicateReviewPanel.tsx` into a queue / preview / action
workflow on top of the real duplicate-candidate endpoints and rebuilt
`BulkOperationsPanel.tsx` into a real import wizard plus session-scoped
history / errors / audit surfaces on top of the existing import/export
APIs. TS build passes; production build passes to `/tmp`.

## Next
- Wire Executive Dashboard (Phase 2.10) once its final redesign is
  ready (out of scope for this session).
- Backend follow-ups noted under `Open questions`.
- Optional: rename `BulkOperationsPanel.tsx` →
  `ImportExportOperationsPanel.tsx` and `ReportingDashboard.tsx` →
  `PipelineWorkspace.tsx` for naming alignment (deliberately deferred
  to keep diff size manageable; see Open questions).

## Open questions / Backend follow-ups
The integrated UI works against the existing API contract and gracefully
degrades where data is missing. Capabilities deferred until the backend
exposes additional fields:

1. **Account Detail**
   - `fetchAccountDetail` endpoint (website, phone, region, legal entity,
     openPipeline, inFlightApprovals, duplicateCandidate)
   - Account-level activity feed (currently empty array; AddActivity
     modal still creates per-opportunity activities via createActivity)
   - Account audit events
2. **Manager Pipeline**
   - `OpportunityListItem.hasOverdueActivity` for proper risk computation
   - Per-opportunity manager notes / next-activity-note fields
   - Dedicated team-members endpoint (currently synthesised from
     opportunity owners)
3. **Import/Export Operations**
   - Global list-jobs endpoint (current Job History is session-scoped)
   - Backend row-errors export artifact
   - Persistent audit log endpoint (current audit is session-scoped)
4. **Duplicate Review/Merge**
   - Per-field comparison data on `DuplicateCandidateItem`
   - Linked-record deep links / related-opportunity lookup
   - Score breakdown components
5. **Approver Inbox** (already integrated, prior session)
   - Already wired; SLA + active approval runtime coverage in
     commit a7208b2.

## Verification
- `tsc -b` clean (zero diagnostics)
- `vite build -- --outDir /tmp/salesops-frontend-fix --emptyOutDir`
  clean (52 modules, 102.57KB CSS, 396.63KB JS)
- Runtime smoke (`npm run pilot:smoke`) requires live backend on
  127.0.0.1:8081 + Chrome on 9223 — not run in this static
  integration session.

## Mode detection
implement (handed off CRM screen redesign integration in vertical slices,
one commit per screen).
