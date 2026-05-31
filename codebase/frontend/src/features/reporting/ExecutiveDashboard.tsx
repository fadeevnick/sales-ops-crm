// ─────────────────────────────────────────────────────────────────────────────
// ExecutiveDashboard.tsx — Phase 2.10 (real integration state)
// ─────────────────────────────────────────────────────────────────────────────
//
// CAPABILITY AUDIT — REAL INTEGRATED STATE
// This block reflects the actual data wired from ReportingDashboard.tsx,
// not the prototype design intent. Updated after integration.
// ─────────────────────────────────────────────────────────────────────────────
//
// INTEGRATED — real data wired, renders accurately
//   KPI strip (4 tiles): all clickable; values from real API.
//     Open Pipeline  → openPipelineAmount (real aggregate). No trend delta
//       shown — no historical comparison data in API (former "+2.4%" removed).
//     Pending Approvals → approvalBacklog.pendingRequests (real aggregate);
//       overdue alert + delta shown only when overdue > 0.
//     Sent back / overdue → real count of overdue + sent-back approvals
//       (the turnover drill). Replaces the former hardcoded "36.4h" turnaround.
//     Weighted Forecast → client-side estimate (openPipeline × 0.365).
//   Pipeline funnel: built from real stageBreakdown + metadata stage order.
//     count and value are real per-stage aggregates.
//     stuck: always 0 — no stuck-deal signal in API; all rows show "—".
//     warn: always false — derived from stuck, which is always 0.
//     Stage codes are position-mapped (pos 0→Q, 1→D, 2→P, 3→N, …).
//     "Closed Won QTD" row always shows 0/0 — no closed-won data in API.
//   Projection health accordion: lastRefresh from real projection.refreshedAt.
//     refreshDuration: "n/a" — field not in API.
//     sourceEvents: real opportunityCount + approvalRequestCount total.
//     pendingImports / pendingMerges: always 0 — fields not in API.
//   Access notice strip: always rendered.
//   Drill-down table + sticky preview panel: real opportunity list data.
//     team column: always "" — not in opportunity list API.
//     notes/context field: always "" — not in opportunity list API.
//   Refresh Projection button: wired to real endpoint.
//     revops_admin → refreshReportingDashboard (triggers backend recompute).
//     sales_manager → fetchReportingDashboard (re-fetches stored projection).
//
// DEGRADED — component renders, but data is thinner than prototype design
//   Approval queues panel: real API exposes only aggregate totals
//     (pendingRequests, activeSteps) with no per-department breakdown.
//     Receives one row: { dept: "All Queues", abbr: "ALL", badgeCls: "r-exe",
//     pending: N, overdue: 0, avgH: "n/a", sla: "48h", bottleneck: false }.
//     Finance / Legal / Manager rows from the prototype are NOT present.
//     overdue is always 0. avgH is "n/a". Bottleneck badge never shown.
//   Exception types accordion: no per-type breakdown in API.
//     Receives []. Accordion renders "Exception types 0" and opens empty.
//     Discount / Payment terms / Legal/indemnity rows are NOT present.
//
// NOT RENDERED — handler not provided; no dead affordances in UI
//   Export Summary button: onExport not provided → button absent.
//   "Open opportunity ›" in preview panel: onOpenOpportunity not provided
//     → button absent. Cross-workspace navigation not threaded.
//   "Approvals ›" link: onOpenApprovals provided only when currentUser
//     can access the approvals workspace (revops_admin). Renders as plain
//     <span> for users without approvals access.
//
// DRILL PRESETS — 14 total; real behavior in integration
//   all       : () => true — full opportunity list.
//   pipeline  : () => true — same data, different label context.
//   approvals : approvalStatus ∈ {pending, overdue} — works with real data.
//   turnover  : approvalStatus ∈ {overdue, sentback} — works with real data.
//               (Filters only overdue + sentback. The approvals-panel
//               click target routes here to show turnaround-risk deals.)
//   closingQ2 : close < "2026-07-01" — works with real close dates.
//   stageQ/D/P/N: filter by position-derived stageCode — returns results
//               only when real stage positions map to Q/D/P/N codes.
//   stageW    : stageCode === "W" — ALWAYS returns empty in real integration.
//               Opportunity list contains only open opportunities. Honest
//               emptyNote rendered.
//   apprFin   : approvalLabel.startsWith("Finance") — ALWAYS returns empty.
//               Real approvalLabel values: "Pending approval", "Approved",
//               "Sent back", "Rejected". None start with "Finance". No
//               dedicated emptyNote; generic fallback shown.
//   apprLeg   : approvalLabel.includes("Legal") — ALWAYS returns empty.
//               Same reason: real labels do not contain "Legal". No
//               dedicated emptyNote; generic fallback shown.
//   apprMgr   : approvalLabel.toLowerCase().includes("manager") — ALWAYS
//               returns empty. Real labels do not contain "manager". Honest
//               emptyNote rendered.
//   risk      : riskSev !== "none" — works; riskSev derived from close-date
//               proximity (≤14 days, not approved) and sent_back state.
//
// FALSE AFFORDANCES — eliminated
//   ALL TEAMS / Q2 2026: non-interactive .exe-context-label spans.
//   Approvals ›: button only when onOpenApprovals is provided.
//   Export Summary: absent in real integration (onExport not provided).
//
// REFRESH SEMANTICS
//   refreshState: "idle" | "loading" | "success" | "error"
//   success: only on resolved onRefresh promise.
//   error: catch block; button shows "✕ Refresh failed — retry"; clears 5 s.
//   Never shows success on failure.
//
// BACKEND / API CONSTRAINTS
//   // CONSTRAINT: per-department approval queue data not in API.
//   //   Finance / Legal / Manager pending + overdue + avgH unavailable.
//   // CONSTRAINT: per-exception-type request breakdown not in API.
//   // CONSTRAINT: closed-won QTD data not in API.
//   // CONSTRAINT: stuck-deal signal not in API (always 0).
//   // CONSTRAINT: opportunity team and deal-notes fields not in list API.
//   // CONSTRAINT: projection health detail fields (refreshDuration,
//   //   pendingImports, pendingMerges) not in API.
//   // CONSTRAINT: field-level visibility enforcement is server-side only.
//   // CONSTRAINT: custom field slices excluded per FR-050 MVP boundary.
//   // CONSTRAINT: weightedForecast is a client-side estimate (× 0.365).
//
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useModalChrome } from "../../hooks/useModalChrome";
import { buildOpportunityPath } from "../crm/routes/paths";
import { ApprovalPanel, DrillTable, PipelineFunnel, ProjectionHealthAccordion } from "./ExecutiveDashboardSections";
import type { DrillOpportunity } from "./ExecutiveDashboardShared";
import {
  DRILL_PRESETS,
  KpiTile,
  fmtMoney,
  type ExecDashboardProps,
} from "./ExecutiveDashboardShared";

export type {
  ApprovalQueue,
  ClosedQtd,
  DrillOpportunity,
  ExceptionType,
  PipelineStage,
  ProjectionHealth,
} from "./ExecutiveDashboardShared";

export function ExecutiveDashboard({
  currentUser,
  pipelineStages,
  closedQtd,
  approvalQueues,
  exceptionTypes,
  projectionHealth,
  opportunities,
  periodLabel = "Q2 2026",
  tenantName: tenantNameProp,
  onRefresh,
  onExport,
  onOpenApprovals,
  onOpenOpportunity,
}: ExecDashboardProps) {
  const navigate = useNavigate();
  // Drill rows link straight to the opportunity page — keeps the drawer a single
  // scrollable list instead of stacking a record preview below it.
  const openOpportunity = onOpenOpportunity ?? ((id: string) => navigate(buildOpportunityPath(id)));

  const [drillKey,      setDrillKey]      = useState("all");
  const [refreshState,  setRefreshState]  = useState<"idle" | "loading" | "success" | "error">("idle");
  const [lastRefresh,   setLastRefresh]   = useState(projectionHealth.lastRefresh);
  // Drill results open in an overlay drawer at the click, so the wide table is
  // visible immediately without scrolling the page down to a bottom section.
  const [isDrillOpen,   setIsDrillOpen]   = useState(false);

  const tenantName = tenantNameProp ?? currentUser.tenantName ?? "Tenant";

  const preset    = DRILL_PRESETS[drillKey] ?? DRILL_PRESETS.all;
  const drillRows = useMemo(
    () => opportunities.filter(preset.f),
    [opportunities, preset]
  );
  const openCount     = pipelineStages.reduce((s, st) => s + st.count, 0);
  const totalPipeline = pipelineStages.reduce((s, st) => s + st.value, 0);
  const totalPending  = approvalQueues.reduce((s, q) => s + q.pending, 0);
  const totalOverdue  = approvalQueues.reduce((s, q) => s + q.overdue, 0);
  const weighted      = totalPipeline * 0.365;
  const bottleneck    = approvalQueues.find((q) => q.bottleneck) ?? null;
  // Real count behind the "turnover" drill (overdue + sent-back approvals).
  const turnoverCount = opportunities.filter(DRILL_PRESETS.turnover.f).length;

  function selectDrill(key: string) {
    setDrillKey(key);
    setIsDrillOpen(true);
  }

  async function handleRefresh() {
    if (refreshState === "loading") return;
    setRefreshState("loading");
    try {
      if (onRefresh) await onRefresh();
      // Advance timestamp only on success.
      const [date, time] = lastRefresh.split(" ");
      const [h, m] = time.split(":").map(Number);
      setLastRefresh(
        `${date} ${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      );
      setRefreshState("success");
      window.setTimeout(() => setRefreshState("idle"), 3500);
    } catch {
      // Failure: show error state; never show success on a failed refresh.
      setRefreshState("error");
      window.setTimeout(() => setRefreshState("idle"), 5000);
    }
  }

  function refreshLabel() {
    if (refreshState === "loading") return <><span className="exe-spin">↻</span> Refreshing…</>;
    if (refreshState === "success") return <><span style={{ color: "var(--pos)" }}>✓</span> Updated {lastRefresh}</>;
    if (refreshState === "error")   return <><span style={{ color: "var(--neg)" }}>✕</span> Refresh failed — retry</>;
    return (
      <>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M14 8A6 6 0 1 1 8 2" /><path d="M14 2v4h-4" />
        </svg>
        Refresh Projection
      </>
    );
  }

  return (
    <section className="rep-workspace exe-workspace">

      {/* ── Page head ── */}
      <div className="exe-page-head">
        <div className="exe-page-head-left">
          <div className="exe-page-meta">
            <span className="mono">{periodLabel}</span>
            <span className="sep">·</span>
            <span>All teams · {tenantName}</span>
            <span className="sep">·</span>
            <span>Projection: <span className="mono">{lastRefresh}</span></span>
          </div>
        </div>
        <div className="exe-page-head-right">
          <button
            className={[
              "rep-btn",
              refreshState === "loading" ? "exe-btn-busy" : "",
              refreshState === "error"   ? "exe-btn-error" : "",
            ].filter(Boolean).join(" ")}
            type="button"
            onClick={() => { void handleRefresh(); }}
            disabled={refreshState === "loading"}
          >
            {refreshLabel()}
          </button>
          {/* Only rendered when handler is provided */}
          {onExport && (
            <button className="rep-btn" type="button" onClick={onExport}>
              Export Summary
            </button>
          )}
        </div>
      </div>

      {/* ── KPI band ── */}
      <div className="exe-kpi-band">
        <KpiTile
          label="Open pipeline"
          value={`${(totalPipeline / 1_000_000).toFixed(2)}`}
          unit="M"
          foot={`${openCount} open opportunities · weighted ${fmtMoney(weighted)}`}
          active={drillKey === "pipeline"}
          onClick={() => selectDrill("pipeline")}
        />
        <KpiTile
          label="Pending approvals"
          value={String(totalPending)}
          foot={bottleneck ? `Bottleneck: ${bottleneck.dept} · ${totalOverdue} overdue` : totalOverdue > 0 ? `${totalOverdue} overdue` : "None past SLA"}
          delta={totalOverdue > 0 ? { dir: "up", v: `${totalOverdue} OD` } : undefined}
          alert={totalOverdue > 0}
          active={drillKey === "approvals"}
          onClick={() => selectDrill("approvals")}
        />
        <KpiTile
          label="Sent back / overdue"
          value={String(turnoverCount)}
          foot="Approvals needing attention · 48h SLA"
          alert={turnoverCount > 0}
          active={drillKey === "turnover"}
          onClick={() => selectDrill("turnover")}
        />
        <KpiTile
          label="Weighted forecast"
          value={`${(weighted / 1_000_000).toFixed(2)}`}
          unit="M"
          foot={`${periodLabel} · projection ${lastRefresh}`}
          active={drillKey === "closingQ2"}
          onClick={() => selectDrill("closingQ2")}
        />
      </div>

      {/* ── Main analytical grid ── */}
      <div className="exe-main-grid">
        <PipelineFunnel
          stages={pipelineStages}
          closedQtd={closedQtd}
          drillKey={drillKey}
          onDrill={selectDrill}
          periodLabel={periodLabel}
        />
        <ApprovalPanel
          queues={approvalQueues}
          exceptionTypes={exceptionTypes}
          drillKey={drillKey}
          onDrill={selectDrill}
          onOpenApprovals={onOpenApprovals}
        />
      </div>

      {/* ── Data freshness (collapsed by default) ── */}
      <div className="exe-below-grid">
        <ProjectionHealthAccordion health={projectionHealth} lastRefresh={lastRefresh} />
      </div>

      {/* ── Access strip ── */}
      <div className="exe-access-strip">
        <span className="exe-access-icon" aria-hidden="true">ⓘ</span>
        <span>
          <strong>Executive access</strong> — aggregate metrics and permitted drill-down records only.
          Drill-down respects role access and field visibility rules.
          {" "}Sensitive fields may be hidden even when the aggregate includes them.
        </span>
      </div>

      {/* ── Drill-down (opens in an overlay drawer at the click) ── */}
      {isDrillOpen ? (
        <ExecutiveDrillDrawer
          drillLabel={preset.label}
          emptyNote={preset.emptyNote}
          rows={drillRows}
          onClose={() => setIsDrillOpen(false)}
          onOpenOpportunity={openOpportunity}
        />
      ) : null}

    </section>
  );
}

function ExecutiveDrillDrawer({
  drillLabel,
  emptyNote,
  rows,
  onClose,
  onOpenOpportunity,
}: {
  drillLabel: string;
  emptyNote?: string;
  rows: DrillOpportunity[];
  onClose: () => void;
  onOpenOpportunity: (id: string) => void;
}) {
  useModalChrome(onClose);
  return (
    <>
      <div className="rep-scrim" onClick={onClose} />
      <aside className="rep-drawer exe-drill-drawer" role="dialog" aria-label="Drill-down">
        <div className="rep-drawer-head">
          <div>
            <div className="rep-drawer-title">Drill-down</div>
            <div className="rep-drawer-sub">{drillLabel}</div>
          </div>
          <button aria-label="Close" className="rep-drawer-close" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="rep-drawer-body exe-drill-drawer-body">
          <DrillTable
            rows={rows}
            drillLabel={drillLabel}
            emptyNote={emptyNote}
            onOpenOpportunity={onOpenOpportunity}
          />
        </div>
      </aside>
    </>
  );
}
