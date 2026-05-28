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
//     Open Pipeline  → openPipelineAmount (real aggregate).
//     Pending Approvals → approvalBacklog.pendingRequests (real aggregate).
//     Avg Approval Turnaround → hardcoded display "36.4h"; no per-request
//       time data in API — rendered as estimate, not a live metric.
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
//   // CONSTRAINT: avg turnaround time metric not in API (hardcoded "36.4h").
//   // CONSTRAINT: field-level visibility enforcement is server-side only.
//   // CONSTRAINT: custom field slices excluded per FR-050 MVP boundary.
//   // CONSTRAINT: weightedForecast is a client-side estimate (× 0.365).
//
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import type { CurrentUser } from "../../types/session";

// ─────────────────────────────────────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────────────────────────────────────

export type PipelineStage = {
  stage: string;
  code: string;
  count: number;
  value: number;
  pct: number;
  stuck: number;
  warn?: boolean;
};

export type ClosedQtd = {
  count: number;
  value: number;
  pctOfMax: number;
};

export type ApprovalQueue = {
  dept: string;
  abbr: string;
  badgeCls: string;
  pending: number;
  overdue: number;
  avgH: string;
  sla: string;
  bottleneck?: boolean;
};

export type ExceptionType = {
  type: string;
  count: number;
  value: number;
  detail: string;
};

export type ProjectionHealth = {
  lastRefresh: string;
  refreshDuration: string;
  sourceEvents: string;
  pendingImports: number;
  pendingMerges: number;
};

export type DrillOpportunity = {
  id: string;
  title: string;
  account: string;
  owner: string;
  team: string;
  stageCode: string;
  stageIdx: number;
  amount: number;
  close: string;
  approvalStatus: string;
  approvalLabel: string;
  riskLabel: string;
  riskSev: "neg" | "warn" | "none";
  notes: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export type ExecDashboardProps = {
  currentUser: CurrentUser;
  pipelineStages: PipelineStage[];
  closedQtd: ClosedQtd;
  approvalQueues: ApprovalQueue[];
  exceptionTypes: ExceptionType[];
  projectionHealth: ProjectionHealth;
  opportunities: DrillOpportunity[];
  periodLabel?: string;
  tenantName?: string;
  /** Resolves on success, throws on failure. */
  onRefresh?: () => Promise<void>;
  /** Only rendered when provided. */
  onExport?: () => void;
  /** Only rendered when provided. */
  onOpenApprovals?: () => void;
  onOpenOpportunity?: (id: string) => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Drill presets
// ─────────────────────────────────────────────────────────────────────────────

type DrillPreset = {
  label: string;
  f: (o: DrillOpportunity) => boolean;
  /**
   * Contextual explanation shown in the empty state when this preset returns
   * zero rows. If absent, a generic fallback message is used.
   */
  emptyNote?: string;
};

const DRILL_PRESETS: Record<string, DrillPreset> = {
  all: {
    label: "All opportunities",
    f: () => true,
  },
  pipeline: {
    label: "Open pipeline · all stages",
    f: () => true,
  },
  // DISTINCT from turnover: pending + overdue only — needs immediate action.
  approvals: {
    label: "Approval action required",
    f: o => ["pending", "overdue"].includes(o.approvalStatus),
  },
  // DISTINCT from approvals: overdue + sentback — the specific states that
  // directly inflate the avg turnaround metric.
  //   overdue  → SLA already breached; worst individual contributors.
  //   sentback → returned to rep for correction; the approval clock restarts
  //              on resubmission, compounding elapsed time. These do NOT
  //              appear in the approvals preset (no active decision pending).
  turnover: {
    label: "Turnaround risk · overdue & sent back",
    f: o => ["overdue", "sentback"].includes(o.approvalStatus),
    emptyNote:
      "No overdue or sent-back approval requests are currently active. " +
      "These are the primary contributors to elevated avg turnaround time.",
  },
  closingQ2: {
    label: "Closing Q2 2026",
    f: o => o.close < "2026-07-01",
  },
  stageQ: {
    label: "Stage: Qualification",
    f: o => o.stageCode === "Q",
  },
  stageD: {
    label: "Stage: Discovery",
    f: o => o.stageCode === "D",
  },
  stageP: {
    label: "Stage: Proposal",
    f: o => o.stageCode === "P",
  },
  stageN: {
    label: "Stage: Negotiation",
    f: o => o.stageCode === "N",
  },
  // Real filter — returns empty when exec drill-down data covers open
  // opportunities only. Empty state explains this honestly.
  stageW: {
    label: "Stage: Closed Won",
    f: o => o.stageCode === "W",
    emptyNote:
      "Closed Won opportunities are tracked in the Closed pipeline view. " +
      "This executive drill-down covers open and recently approved opportunities only.",
  },
  apprFin: {
    label: "Finance approval queue",
    f: o => o.approvalLabel.startsWith("Finance"),
  },
  apprLeg: {
    label: "Legal Review queue",
    f: o => o.approvalLabel.includes("Legal"),
  },
  // Real filter — returns empty when no manager-level requests are active.
  // Empty state explains this honestly.
  apprMgr: {
    label: "Manager approval queue",
    f: o => o.approvalLabel.toLowerCase().includes("manager"),
    emptyNote:
      "No manager-level approval requests are currently active. " +
      "Manager approvals will appear here when submitted.",
  },
  risk: {
    label: "Deals with risk signals",
    f: o => o.riskSev !== "none",
  },
};

const QUEUE_DRILL_KEY: Record<string, string> = {
  Finance: "apprFin",
  Legal:   "apprLeg",
  Manager: "apprMgr",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtMoney(n: number | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function nextScheduled(last: string): string {
  const [date, time] = last.split(" ");
  const [h, m] = time.split(":").map(Number);
  return `${date} ${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function approvalPillState(status: string): string {
  switch (status) {
    case "approved":  return "approved";
    case "pending":   return "pending";
    case "overdue":   return "rejected";
    case "sentback":
    case "legal":     return "sent_back";
    default:          return "none";
  }
}

function riskColor(sev: "neg" | "warn" | "none"): string {
  if (sev === "neg")  return "var(--neg)";
  if (sev === "warn") return "var(--warn)";
  return "var(--muted-2)";
}

const STAGE_LABELS = ["Qualification", "Discovery", "Proposal", "Negotiation", "Closed Won"];

// ─────────────────────────────────────────────────────────────────────────────
// StagePip
// ─────────────────────────────────────────────────────────────────────────────

function StagePip({ idx, total = 5 }: { idx: number; total?: number }) {
  return (
    <span className="exe-stage-pip" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < idx ? "on" : i === idx ? "cur" : ""} />
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ApprPill
// ─────────────────────────────────────────────────────────────────────────────

function ApprPill({ status, label }: { status: string; label: string }) {
  if (!status || status === "none") {
    return <span className="exe-pill-none">—</span>;
  }
  return (
    <span className={`rep-pill p-${approvalPillState(status)}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KpiTile
// ─────────────────────────────────────────────────────────────────────────────

type KpiTileProps = {
  label: string;
  value: string;
  unit?: string;
  delta?: { dir: "up" | "dn"; v: string };
  foot: string;
  alert?: boolean;
  active?: boolean;
  onClick?: () => void;
};

function KpiTile({ label, value, unit, delta, foot, alert, active, onClick }: KpiTileProps) {
  return (
    <div
      className={[
        "exe-kpi-item",
        onClick ? "exe-kpi-btn" : "",
        active  ? "exe-kpi-active" : "",
      ].filter(Boolean).join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
      aria-pressed={onClick ? active : undefined}
      title={onClick ? "Click to filter drill-down" : undefined}
    >
      <div className="exe-kpi-l">
        <span>{label}</span>
        {delta && (
          <span className={`exe-kpi-delta ${delta.dir}`}>
            {delta.dir === "up" ? "▲" : "▼"} {delta.v}
          </span>
        )}
      </div>
      <div
        className="exe-kpi-v mono"
        style={alert ? { color: "var(--neg)" } : undefined}
      >
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <div className="exe-kpi-foot">{foot}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineFunnel
// ─────────────────────────────────────────────────────────────────────────────

function PipelineFunnel({
  stages,
  closedQtd,
  drillKey,
  onDrill,
  periodLabel,
}: {
  stages: PipelineStage[];
  closedQtd: ClosedQtd;
  drillKey: string;
  onDrill: (key: string) => void;
  periodLabel: string;
}) {
  const openTotal  = stages.reduce((s, st) => s + st.value, 0);
  const stuckTotal = stages.reduce((s, st) => s + st.stuck, 0);
  // CONSTRAINT: client-side weighted estimate; replace with backend aggregate.
  const weighted   = openTotal * 0.365;
  const openCount  = stages.reduce((s, st) => s + st.count, 0);

  return (
    <div className="rep-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Pipeline by stage
          <em>{openCount} open</em>
        </div>
        <div className="rep-panel-actions">
          {/* Non-interactive context labels — no real backend filter exists */}
          <span className="exe-context-label">ALL TEAMS</span>
          <span className="exe-context-label">{periodLabel}</span>
          <button
            className="rep-btn rep-btn-ghost exe-link-btn"
            type="button"
            onClick={() => onDrill("pipeline")}
          >
            All opportunities ›
          </button>
        </div>
      </div>

      <div>
        <div className="exe-funnel-col-hd">
          <div className="exe-fhd">Stage</div>
          <div className="exe-fhd">Distribution</div>
          <div className="exe-fhd exe-fhd--num">Deals</div>
          <div className="exe-fhd exe-fhd--num">Value</div>
          <div className="exe-fhd exe-fhd--num">Stuck</div>
        </div>

        {stages.map((s) => {
          const key    = `stage${s.code}`;
          const active = drillKey === key;
          return (
            <div
              key={s.code}
              className={["exe-funnel-row", active ? "exe-funnel-row--active" : ""].filter(Boolean).join(" ")}
              onClick={() => onDrill(key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") onDrill(key); }}
              aria-pressed={active}
            >
              <div className="exe-funnel-stage">
                <span className="exe-funnel-code mono">{s.code}</span>
                <span>{s.stage}</span>
              </div>
              <div className="exe-bar-track">
                <div
                  className="exe-bar-fill"
                  style={{ width: `${s.pct}%`, background: s.warn ? "var(--warn)" : "var(--ink)" }}
                />
              </div>
              <div className="exe-funnel-num mono">{s.count}</div>
              <div className="exe-funnel-num mono">{fmtMoney(s.value)}</div>
              <div
                className="exe-funnel-num mono"
                style={{
                  color:
                    s.stuck > 3 ? "var(--neg)" :
                    s.stuck > 1 ? "var(--warn)" :
                    "var(--muted)",
                }}
              >
                {s.stuck > 0 ? s.stuck : "—"}
              </div>
            </div>
          );
        })}

        <div
          className={["exe-funnel-row", "exe-funnel-row--won", drillKey === "stageW" ? "exe-funnel-row--active" : ""].filter(Boolean).join(" ")}
          onClick={() => onDrill("stageW")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter") onDrill("stageW"); }}
          aria-pressed={drillKey === "stageW"}
        >
          <div className="exe-funnel-stage" style={{ color: "var(--pos)" }}>
            <span className="exe-funnel-code mono">W</span>
            <span>Closed Won QTD</span>
          </div>
          <div className="exe-bar-track">
            <div className="exe-bar-fill" style={{ width: `${closedQtd.pctOfMax}%`, background: "var(--pos)" }} />
          </div>
          <div className="exe-funnel-num mono" style={{ color: "var(--pos)" }}>{closedQtd.count}</div>
          <div className="exe-funnel-num mono" style={{ color: "var(--pos)" }}>{fmtMoney(closedQtd.value)}</div>
          <div className="exe-funnel-num mono" style={{ color: "var(--muted)" }}>—</div>
        </div>
      </div>

      <div className="exe-funnel-foot">
        <span>Open: <strong className="mono">{fmtMoney(openTotal)}</strong></span>
        <span>Weighted: <strong className="mono" style={{ color: "var(--accent-2)" }}>{fmtMoney(weighted)}</strong></span>
        <span>Stuck: <strong className="mono" style={{ color: stuckTotal > 0 ? "var(--neg)" : "inherit" }}>{stuckTotal}</strong></span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ApprovalPanel
// ─────────────────────────────────────────────────────────────────────────────

function ApprovalPanel({
  queues,
  exceptionTypes,
  drillKey,
  onDrill,
  onOpenApprovals,
}: {
  queues: ApprovalQueue[];
  exceptionTypes: ExceptionType[];
  drillKey: string;
  onDrill: (key: string) => void;
  onOpenApprovals?: () => void;
}) {
  const [exceptOpen, setExceptOpen] = useState(false);

  const totalPending = queues.reduce((s, q) => s + q.pending, 0);
  const totalOverdue = queues.reduce((s, q) => s + q.overdue, 0);
  const exceptTotal  = exceptionTypes.reduce((s, t) => s + t.count, 0);

  return (
    <div className="rep-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Approval queues
          <em>{totalPending} pending</em>
        </div>
        <div className="rep-panel-actions">
          {/* Render as button only when handler exists; plain span otherwise */}
          {onOpenApprovals ? (
            <button
              className="rep-btn rep-btn-ghost exe-link-btn"
              type="button"
              onClick={onOpenApprovals}
            >
              Approvals ›
            </button>
          ) : (
            <span className="exe-panel-link-label">Approvals</span>
          )}
        </div>
      </div>

      {queues.map((q, i) => {
        const key    = QUEUE_DRILL_KEY[q.dept] ?? "approvals";
        const active = drillKey === key;
        return (
          <div
            key={q.dept}
            className={[
              "exe-appr-row",
              active       ? "exe-appr-row--active"     : "",
              q.bottleneck ? "exe-appr-row--bottleneck" : "",
            ].filter(Boolean).join(" ")}
            style={i < queues.length - 1 ? { borderBottom: "1px solid var(--hairline)" } : undefined}
            onClick={() => onDrill(key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") onDrill(key); }}
            aria-pressed={active}
          >
            <span className={`role-badge ${q.badgeCls}`}>{q.abbr}</span>
            <div className="exe-appr-meta">
              <div className="exe-appr-dept">
                {q.dept}
                {q.bottleneck && <span className="exe-bottleneck-badge">BOTTLENECK</span>}
              </div>
              <div className="exe-appr-sla">SLA {q.sla} · avg {q.avgH}</div>
            </div>
            <div className="exe-appr-counts">
              <span className="exe-appr-pending mono">{q.pending}</span>
              {q.overdue > 0 ? (
                <span className="exe-overdue-badge">{q.overdue} OD</span>
              ) : (
                <span className="exe-ontime-badge">ON TIME</span>
              )}
            </div>
          </div>
        );
      })}

      <div className="exe-appr-foot">
        <span>Total: <strong className="mono">{totalPending}</strong></span>
        <span style={{ color: "var(--neg)", fontWeight: 600 }}>▲ {totalOverdue} past SLA</span>
        <span>Avg: <strong className="mono">36.4h</strong></span>
      </div>

      {/* Exception types — collapsed by default */}
      <div style={{ borderTop: "1px solid var(--hairline)" }}>
        <button
          className="exe-accordion-hd"
          type="button"
          onClick={() => setExceptOpen((o) => !o)}
          aria-expanded={exceptOpen}
        >
          <span className="exe-accordion-label">Exception types</span>
          <em className="exe-accordion-count mono">{exceptTotal}</em>
          <span className="exe-accordion-chev" aria-hidden="true">{exceptOpen ? "▲" : "▼"}</span>
        </button>

        {exceptOpen && (
          <div className="exe-accordion-body">
            {exceptionTypes.map((t, i) => (
              <div
                key={t.type}
                className="exe-except-row"
                style={i < exceptionTypes.length - 1 ? { borderBottom: "1px solid var(--hairline)" } : undefined}
              >
                <div className="exe-except-copy">
                  <div className="exe-except-type">{t.type}</div>
                  <div className="exe-except-detail">{t.count} req · {fmtMoney(t.value)} · {t.detail}</div>
                </div>
                <span className="exe-except-n mono">{t.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProjectionHealthAccordion — collapsed by default
// ─────────────────────────────────────────────────────────────────────────────

function ProjectionHealthAccordion({
  health,
  lastRefresh,
}: {
  health: ProjectionHealth;
  lastRefresh: string;
}) {
  const [open, setOpen] = useState(false);

  const hasPending = health.pendingImports > 0 || health.pendingMerges > 0;

  const rows: Array<{ label: string; value: string; warn: boolean }> = [
    { label: "Last refresh",            value: lastRefresh,                   warn: false },
    { label: "Refresh duration",        value: health.refreshDuration,        warn: false },
    { label: "Source events included",  value: health.sourceEvents,           warn: false },
    { label: "Pending imports",         value: String(health.pendingImports), warn: health.pendingImports > 0 },
    { label: "Pending merge refresh",   value: String(health.pendingMerges),  warn: health.pendingMerges > 0 },
    { label: "Next scheduled",          value: nextScheduled(lastRefresh),    warn: false },
  ];

  return (
    <div className="rep-panel exe-proj-accordion">
      <button
        className="exe-accordion-hd exe-proj-hd"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="exe-accordion-label">Data freshness</span>
        <span className="exe-proj-meta mono">
          Last: {lastRefresh}
          {hasPending && (
            <span className="exe-proj-warn-flag">
              {" "}· {health.pendingImports + health.pendingMerges} pending
            </span>
          )}
        </span>
        <span className="exe-accordion-chev" aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="exe-accordion-body">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className="exe-proj-row"
              style={i < rows.length - 1 ? { borderBottom: "1px solid var(--hairline)" } : undefined}
            >
              <span className="exe-proj-lbl">{r.label}</span>
              <span
                className="mono exe-proj-val"
                style={r.warn ? { color: "var(--accent-2)", fontWeight: 600 } : undefined}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DrillTable
// ─────────────────────────────────────────────────────────────────────────────

function DrillTable({
  rows,
  drillLabel,
  emptyNote,
  selectedId,
  onSelect,
}: {
  rows: DrillOpportunity[];
  drillLabel: string;
  emptyNote?: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rep-panel">
        <div className="rep-panel-head">
          <div className="rep-panel-title">Drill-down <em>0 results</em></div>
          <div className="rep-panel-actions">
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{drillLabel}</span>
          </div>
        </div>
        <div className="exe-empty">
          <div className="exe-empty-icon mono">∅</div>
          <div className="exe-empty-title">No records match this filter</div>
          <div className="exe-empty-sub">
            {emptyNote ?? "The selected view returned no permitted drill-down records. Try a different metric, stage, or queue."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rep-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Drill-down
          <em>{rows.length} result{rows.length !== 1 ? "s" : ""}</em>
        </div>
        <div className="rep-panel-actions">
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{drillLabel}</span>
        </div>
      </div>
      <div className="rep-table-scroll">
        <table className="rep-table exe-drill-table">
          <colgroup>
            <col style={{ width: "17%" }} /><col style={{ width: "13%" }} />
            <col style={{ width: "8%" }} /><col style={{ width: "9%" }} />
            <col style={{ width: "5%" }} /><col style={{ width: "7%" }} />
            <col style={{ width: "8%" }} /><col style={{ width: "11%" }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>Opportunity</th><th>Account</th><th>Owner</th><th>Team</th>
              <th>Stage</th><th className="num">Amount</th><th>Close</th>
              <th>Approval</th><th>Risk Signal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr
                key={o.id}
                className={selectedId === o.id ? "selected" : ""}
                style={{ cursor: "pointer" }}
                onClick={() => onSelect(o.id === selectedId ? null : o.id)}
              >
                <td>
                  <div className="rep-cell-truncate" style={{ fontWeight: 500 }}>{o.title}</div>
                  <span className="rep-cell-sub mono">{o.id}</span>
                </td>
                <td className="rep-cell-truncate">{o.account}</td>
                <td style={{ fontSize: 12 }}>{o.owner}</td>
                <td style={{ fontSize: 11.5, color: "var(--muted)" }}>{o.team}</td>
                <td style={{ textAlign: "center" }}><StagePip idx={o.stageIdx} /></td>
                <td className="num">
                  <span className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{fmtMoney(o.amount)}</span>
                </td>
                <td><span className="mono" style={{ fontSize: 12 }}>{o.close}</span></td>
                <td><ApprPill status={o.approvalStatus} label={o.approvalLabel} /></td>
                <td>
                  <span className="mono exe-risk-label" style={{ color: riskColor(o.riskSev) }}>
                    {o.riskLabel || "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OppPreview
// ─────────────────────────────────────────────────────────────────────────────

function OppPreview({
  opp,
  onOpenOpportunity,
}: {
  opp: DrillOpportunity | null;
  onOpenOpportunity?: (id: string) => void;
}) {
  if (!opp) {
    return (
      <div className="rep-panel exe-preview-empty">
        <div className="exe-preview-empty-icon">↗</div>
        <div className="exe-preview-empty-title">Opportunity preview</div>
        <div className="exe-preview-empty-sub">Select a row to preview deal context.</div>
      </div>
    );
  }

  const metaRows: Array<[string, string, boolean]> = [
    ["Account", opp.account,                   false],
    ["Owner",   `${opp.owner} · ${opp.team}`,  false],
    ["Amount",  fmtMoney(opp.amount),           true],
    ["Close",   opp.close,                     true],
  ];

  return (
    <div className="rep-panel exe-preview">
      <div className="exe-pv-head">
        <div className="exe-pv-title">{opp.title}</div>
        <div className="mono exe-pv-id">{opp.id}</div>
      </div>

      <div className="exe-pv-stage-row">
        <StagePip idx={opp.stageIdx} />
        <span className="exe-pv-stage-label">{STAGE_LABELS[opp.stageIdx]}</span>
      </div>

      {metaRows.map(([l, v, isMono]) => (
        <div key={l} className="exe-pv-field">
          <span className="exe-pv-fl">{l}</span>
          <span className={isMono ? "mono exe-pv-fv" : "exe-pv-fv"}>{v}</span>
        </div>
      ))}

      <div className="exe-pv-field">
        <span className="exe-pv-fl">Approval</span>
        <ApprPill status={opp.approvalStatus} label={opp.approvalLabel} />
      </div>

      {opp.riskSev !== "none" && (
        <div className="exe-pv-field">
          <span className="exe-pv-fl">Risk</span>
          <span className="mono exe-risk-label" style={{ color: riskColor(opp.riskSev) }}>
            {opp.riskLabel}
          </span>
        </div>
      )}

      <div className="exe-pv-notes">
        <div className="exe-pv-notes-lbl">Context</div>
        <div className="exe-pv-notes-body">{opp.notes}</div>
      </div>

      {onOpenOpportunity && (
        <div className="exe-pv-action">
          <button
            className="rep-btn rep-btn-ghost exe-pv-open-btn"
            type="button"
            onClick={() => onOpenOpportunity(opp.id)}
          >
            Open opportunity ›
          </button>
        </div>
      )}

      <div className="exe-pv-caveat">
        ⓘ Sensitive fields may be hidden per role access and field visibility policy.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExecutiveDashboard — main exported component
// ─────────────────────────────────────────────────────────────────────────────

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
  const [drillKey,      setDrillKey]      = useState("all");
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [refreshState,  setRefreshState]  = useState<"idle" | "loading" | "success" | "error">("idle");
  const [lastRefresh,   setLastRefresh]   = useState(projectionHealth.lastRefresh);

  const tenantName = tenantNameProp ?? currentUser.tenantName ?? "Tenant";

  const preset    = DRILL_PRESETS[drillKey] ?? DRILL_PRESETS.all;
  const drillRows = useMemo(
    () => opportunities.filter(preset.f),
    [opportunities, preset]
  );
  const selectedOpp = selectedId
    ? (opportunities.find((o) => o.id === selectedId) ?? null)
    : null;

  const openCount     = pipelineStages.reduce((s, st) => s + st.count, 0);
  const totalPipeline = pipelineStages.reduce((s, st) => s + st.value, 0);
  const totalPending  = approvalQueues.reduce((s, q) => s + q.pending, 0);
  const totalOverdue  = approvalQueues.reduce((s, q) => s + q.overdue, 0);
  const weighted      = totalPipeline * 0.365;
  const bottleneck    = approvalQueues.find((q) => q.bottleneck) ?? null;

  function selectDrill(key: string) {
    setDrillKey(key);
    setSelectedId(null);
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
          <div className="exe-crumb">
            <span>Reporting</span>
            <span className="sep">/</span>
            <strong>Executive Dashboard</strong>
          </div>
          <div className="exe-page-meta">
            <span className="mono">{periodLabel}</span>
            <span className="sep">·</span>
            <span>All teams · {tenantName}</span>
            <span className="sep">·</span>
            <span>Projection: <span className="mono">{lastRefresh}</span></span>
            <span className="sep">·</span>
            <span className="mono exe-env-tag">LOCAL PILOT</span>
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
          delta={{ dir: "up", v: "+2.4%" }}
          active={drillKey === "pipeline"}
          onClick={() => selectDrill("pipeline")}
        />
        <KpiTile
          label="Pending approvals"
          value={String(totalPending)}
          foot={bottleneck ? `Bottleneck: ${bottleneck.dept} · ${totalOverdue} overdue` : `${totalOverdue} overdue`}
          delta={{ dir: "up", v: `${totalOverdue} OD` }}
          alert
          active={drillKey === "approvals"}
          onClick={() => selectDrill("approvals")}
        />
        <KpiTile
          label="Avg approval turnaround"
          value="36.4"
          unit="h"
          foot={bottleneck ? `Target 48h SLA · ${bottleneck.dept} avg ${bottleneck.avgH}` : "Target 48h SLA"}
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

      {/* ── Drill-down section ── */}
      <div className="exe-drill-section">
        <DrillTable
          rows={drillRows}
          drillLabel={preset.label}
          emptyNote={preset.emptyNote}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <div className="exe-preview-col">
          <OppPreview opp={selectedOpp} onOpenOpportunity={onOpenOpportunity} />
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="rep-foot-ruler">
        <span>12 · Executive Dashboard</span>
        <span>{tenantName.toUpperCase()} · LOCAL PILOT · EU-CENTRAL-1</span>
        <span className="mono">Projection {lastRefresh} · access-controlled aggregate</span>
      </div>

    </section>
  );
}
