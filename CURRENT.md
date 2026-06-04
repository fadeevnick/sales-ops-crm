# CURRENT

## Focus
UX remediation — sales_manager role (all pages). Post-integration polish pass:
id-noise cleanup, design-language tokens, layout.

## Status
**sales_manager pass complete.** All screens verified in browser.

### What was done this session

**Dual navigation removed (3 surfaces)**
- `ReportingDashboard.tsx`: removed `<ReportingTabs>` internal tab strip;
  URL-driven left subNav is the sole nav. Also removed `ReportingTabs`
  component from `ReportingDashboardViews.tsx`.
- `MetadataAdminWorkspace.tsx`: removed `<div className="ma-tab-strip">` tab
  bar; removed `METADATA_ADMIN_TABS` constant from `metadataAdminForms.ts` and
  barrel export from `useMetadataAdminController.ts`.
- `RevOpsWorkspace.tsx`: removed `revops-subtabs` NavLink bar.

**Reporting first-render blank screen fixed**
`isLoading` starts `false` then flips inside useEffect → empty first frame.
Fixed: `metricsViewLoading = isLoading || !metricsLoaded` in
`useReportingDashboardController.ts`; used for both Executive and Metrics views.

**Executive Dashboard drill-down refactored**
Drawer was stacking a record preview below the list (two scroll areas).
Changed to list-only: rows navigate straight to opportunity page.
Removed `OppPreview`, `selectedId`/`selectedOpp` state, `STAGE_LABELS`.
Removed `opp_` UUID sub-label from each drill row.

**Team Breakdown position (ManagerPipeline)**
Moved from below Load-more button to summary zone (after KPI note, before
controls). Toggle effect now visible immediately without scrolling down.

**Metadata Admin: design-language tokenization**
Was using `primary-button`/`secondary-button`/`danger-button`/`record-row`
shared classes with green/pink colors. Added `.ma-workspace` scoped CSS
overrides → neutral ink tokens. No changes to Account Detail appearance.
Removed duplicate version UUID and user identity noise from header.

**Import/Export (BulkOperations): layout + noise**
- Content in `.rep-panel` was flush to edges — added margin-left/right 16px
  for non-head, non-table-scroll children via `.ieo-body .rep-panel` override.
- KPI foot: `exportJob.job.entityType · rowCount rows` instead of raw job UUID.
- History rows: `HISTORY_MODE_LABEL` map for human-readable mode names.
- Removed "Data & Quality /" breadcrumb prefix (duplicated sidebar item).

**Duplicate Review: full restyle**
Was on old hardcoded hex green/pink palette; record labels expanded as full
email+URL strings.
- Filter chips, queue rows, score/type/deferred badges, impact note, empty
  states → neutral CSS-variable tokens.
- Record names clamped to 3 lines (`-webkit-line-clamp: 3`).
- Reason chip: converted from pill to 2-line clamped text.
- Replaced fake 5-row comparison table (3 identical columns) with honest
  `drm-record-pair` two-card layout (Record A / vs / Record B).
- Removed raw UUIDs from queue row headers and resolution panel.
- Reject/Merge toast messages use record labels, not IDs.

**`styles.css` dead CSS removed**
- `.ma-tab-strip` / `.ma-tab*` (~45 lines)
- `.drm-qrow-id`, `.drm-field-name/val`, `.drm-cmp-table` and related
- `.exe-pv-*` (all preview panel CSS, ~120 lines)

## Open questions / Backend follow-ups

Executive Dashboard degraded surfaces (unchanged from last session):
1. Approval queues: per-dept breakdown (Finance/Legal/Manager) not in API.
2. Avg approval turnaround: no per-request elapsed time in API.
3. Exception types: no per-type breakdown in API.
4. Closed Won QTD: no closed-won aggregate in API.
5. Stuck signal: no per-opportunity stuck flag in API.
6. Projection health detail: refreshDuration/pendingImports/pendingMerges not in API.

### What was done (sales_manager pass)

**Raw ID noise removed (4 surfaces)**
- `ManagerPipelineSections.tsx`: removed `opp_...` and `acc_...` sub-labels
  from every table row; removed `opp.id` from detail panel head; removed
  `{opp.id} ·` prefix from Reassign and Manager Note modal titles.
- `CrmWorkspacePreviewSections.tsx`: removed `{listItem.id}` from the
  OPPORTUNITY header row; removed `{listItem.accountId}` sub-label from the
  account row in the preview rail.

**Metrics stage keys + user ID fixed**
- `ReportingDashboardViews.tsx`: Stage Breakdown now uses display names
  (`stageLabels.get(stageKey)`) instead of raw keys (`qualification` →
  "Qualification", `pending_approval` → "Pending Approval"). Drill-down rows
  also use display names.
- "Refreshed by user_irina" → "Refreshed by Irina": added `formatUserId()`
  helper that strips `user_` prefix and title-cases the result.
- Wired `stageLabels` from controller → `ReportingDashboard` →
  `ReportingMetricsView` (was missing from controller return).

**Duplicate Review breadcrumb**
- `DuplicateReviewPanel.tsx`: removed "Data & Quality /" prefix from the
  content-area header (same cleanup already applied to BulkOperations).

### What was done (bug fixes)

**Bug #2 — OPEN OPPORTUNITIES KPI stale after opportunity creation**
- Root cause: `refreshLists` only re-fetched the paginated list; `routeAccount`
  (fetched directly by ID, source of the KPI counter) stayed stale.
- Fix: `useCrmWorkspaceData.ts` → `refreshLists` now parallel-fetches
  `fetchAccount(userId, routeAccountId)` when `routeAccountId` is set and
  applies the result with `setRouteAccount(freshRouteAccount)`.
- Verified: counter 0 → 1 immediately after creating an opportunity from
  Account Detail, no page reload.

**Bug #3 — Audit tab empty after stage move**
- Root cause: `OpportunityDetailResponse.timeline` was hardcoded to
  `List<Any> = emptyList()` — no DB table, no writes.
- Fix: Full implementation:
  - V21 migration: `opportunity_timeline_events` table.
  - `OpportunityRepository`: `appendTimelineEvent` + `listTimelineEvents`.
  - `OpportunityService.moveStage()`: writes a `STAGE_MOVE` event after each
    successful stage transition ("Qualification → Negotiation" etc.).
  - `OpportunityService.getOpportunity()`: populates `timeline` from DB.
- Verified: Audit tab shows badge "1" and event line immediately after
  a stage move; `actor`, `title`, `description` all correct.

### What was done (sales_rep pass — Anna's screens)

**Raw ID noise removed (3 surfaces)**
- `WorkspaceShell.tsx`: removed the third breadcrumb segment that was showing
  the raw URL path param (`opp_xxx` / `acc_xxx`) for detail pages. Also removed
  now-dead `useMatch` calls and imports.
- `OpportunityDetailHeaderSections.tsx`: removed `<span className="opp-id">{opportunity.id}</span>`
  from the heading row next to the title.
- `styles.css`: removed `.opp-id` and `.crumb-detail` dead CSS rules.

**No dual nav, no layout issues, no token issues** found on Anna's screens —
the Opportunities list, preview rail, Accounts list, and Account Detail all use
the correct design-language tokens and have no redundant internal tab strips.

### What was done (FR-051 approval turnaround)

**Avg approval turnaround implemented end-to-end**
- Backend `ReportingDtos.kt`: added `avgTurnaroundHours: Double?` to
  `ReportingApprovalBacklogMetric`.
- Backend `ReportingProjectionRepository.kt`: added SQL query —
  `AVG(EXTRACT(EPOCH FROM (resolved_at - submitted_at)) / 3600)` for
  `status IN ('approved', 'rejected')` with both timestamps set.
  Built on decision history per FR-051 constraint ("не на эвристиках").
- Frontend `types/reporting.ts`: added `avgTurnaroundHours?: number | null`.
- Frontend `reportingDashboardAdapters.ts`: added `fmtTurnaround()` helper
  (`Xh` / `Xm` formatting); passes real value to `avgH` instead of `"n/a"`.
- Frontend `ReportingDashboardViews.tsx`: added "Avg approval turnaround" KPI
  tile in the Metrics view (alongside pending/active steps).
- Executive Dashboard approval queue row: already wired — shows `· avg Xh`
  when value is non-null/non-"n/a" (was always suppressed before).

## Status
**All items complete. Executive Dashboard fully wired.**

### What was done (Executive Dashboard gaps)

**#1 Approval queue dept breakdown**
- SQL: join `approval_requests` + `approval_steps` WHERE `step.status = 'active'`, group by `approver_role_key`.
- Overdue: `due_at < NOW()`. Avg turnaround: per-step `decided_at - activated_at`.
- Frontend: Finance (FIN/r-fin/SLA 24h), Legal (LEG/r-leg/SLA 48h), fallback Manager.
- Bottleneck badge on dept with highest pending count.

**#2 Exception types breakdown**
- SQL: join `approval_requests` + `opportunities`, group by `policy_key` WHERE `status = 'pending_step'`.
- Frontend: `POLICY_LABELS` map (`large_deal_stage_progression` → "Large Deal" etc.).
- Accordion renders when data exists; was always empty before.

**#3 Closed Won QTD**
- SQL: `global_status = 'closed_won'` AND `COALESCE(close_date, updated_at)` in current quarter.
- `pctOfMax` computed relative to max stage value in stageBreakdown.
- Row renders only when `count > 0 || value > 0`.

**#4 Stuck deal signal**
- SQL: open opps with no activity (`COALESCE(last_timeline_event, updated_at) < NOW() - 14 days`).
- Threshold: 14 days (seed data all within 25 days; 30-day threshold gave 0).
- Added `stuckCount` to `ReportingStageMetric` DTO.
- Frontend: `exe-stuck-badge` below stage name; bar turns amber (`warn: stuck > 0`).
- Layout fix: `exe-funnel-row` → `align-items: start`; `exe-funnel-stage-name` column flex.

**#5 Projection health detail**
- V22 migration: `refresh_duration_ms BIGINT` column on `reporting_projection_snapshots`.
- `refreshDuration`: measured in `refreshDashboardProjection()` with `System.currentTimeMillis()`.
- `pendingImports`: import_jobs WHERE `status = 'previewed'`.
- `pendingMerges`: duplicate_candidates WHERE `status = 'open'`.
- Both stored in `ReportingSourceCounters` snapshot.
- Frontend: formatted as `Xms`/`X.Xs`; pending counts show amber with warning flag in header.

## Next
Операционный слой — изучить и реально использовать скрипты из `scripts/`.

---

## GCP Pilot Deployment

**Статус:** приложение запущено, доступно по `https://sales-ops-crm.duckdns.org`

### Что сделано

- GCP проект: `salesops-crm-pilot`
- Billing account: `01B783-DB5F57-874E7E`
- Region: `europe-west1` (Бельгия)
- Artifact Registry: `europe-west1-docker.pkg.dev/salesops-crm-pilot/salesops-docker`
  - `salesops-backend:pilot`
  - `salesops-frontend:pilot`
- GCE VM: `salesops-pilot`, zone `europe-west1-b`, `e2-medium`, 20GB disk
- External IP: `34.76.69.146` (ephemeral, меняется при рестарте VM)
- Firewall: порты 80, 443, 8081, 5173 открыты (rule: `salesops-allow-http`)
- Docker установлен на VM (v29.5.2)
- Деплой: `docker-compose.production.yml` + `.env` на VM
- Миграции применены (V1–V23)

### HTTPS

- Домен: `sales-ops-crm.duckdns.org` → DuckDNS → `34.76.69.146`
- nginx-proxy контейнер: SSL termination, роутит `/api/*` → backend, `/*` → frontend
- Сертификат Let's Encrypt, истекает 2026-09-01
- Конфиги: `codebase/nginx/http-only.conf`, `codebase/nginx/https.conf`
- **Важно:** при смене IP VM нужно обновить DuckDNS вручную

### Bearer token auth

- Логин: `POST /api/auth/login` → JWT-подобный токен (HMAC-SHA256, 7 дней)
- Пользователи: `anna@orion.local/anna2026`, `michael@orion.local/michael2026` и др.
- `BearerTokenFilter` инжектирует `X-Demo-User-Id` через `HttpServletRequestWrapper`
- Секрет: `APP_TOKEN_SECRET` в `.env` (дефолт: `dev-secret-change-in-production`)

### Открытые вопросы

- IP ephemeral — при рестарте VM нужно обновлять DuckDNS и перезапускать контейнеры
- Нет автоматического обновления сертификата (истекает 2026-09-01)
- Нет мониторинга
- Нет автоматического деплоя (CI/CD)

### Файлы

- `codebase/docker-compose.production.yml` — production конфиг
- `codebase/nginx/` — конфиги nginx-proxy
- `codebase/scripts/` — операционные скрипты (разбиты по папкам: ci/, deploy/, post-deploy/, validate/, env/, drills/)
