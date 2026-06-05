import type { CurrentUser } from "../../types/session";

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
  onRefresh?: () => Promise<void>;
  onExport?: () => void;
  onOpenApprovals?: () => void;
  onOpenOpportunity?: (id: string) => void;
};

export type DrillPreset = {
  label: string;
  f: (o: DrillOpportunity) => boolean;
  emptyNote?: string;
};

export const DRILL_PRESETS: Record<string, DrillPreset> = {
  all: { label: "All opportunities", f: () => true },
  pipeline: { label: "Open pipeline · all stages", f: () => true },
  approvals: {
    label: "Approval action required",
    f: (o) => ["pending", "overdue"].includes(o.approvalStatus),
  },
  turnover: {
    label: "Turnaround risk · overdue & sent back",
    f: (o) => ["overdue", "sentback"].includes(o.approvalStatus),
    emptyNote:
      "No overdue or sent-back approval requests are currently active. These are the primary contributors to elevated avg turnaround time.",
  },
  closingQ2: { label: "Closing Q2 2026", f: (o) => o.close < "2026-07-01" },
  stageQ: { label: "Stage: Qualification", f: (o) => o.stageCode === "Q" },
  stageD: { label: "Stage: Discovery", f: (o) => o.stageCode === "D" },
  stageP: { label: "Stage: Proposal", f: (o) => o.stageCode === "P" },
  stageN: { label: "Stage: Negotiation", f: (o) => o.stageCode === "N" },
  stageW: {
    label: "Stage: Closed Won",
    f: (o) => o.stageCode === "W",
    emptyNote:
      "Closed Won opportunities are tracked in the Closed pipeline view. This executive drill-down covers open and recently approved opportunities only.",
  },
  apprFin: { label: "Finance approval queue", f: (o) => o.approvalLabel.startsWith("Finance") },
  apprLeg: { label: "Legal Review queue", f: (o) => o.approvalLabel.includes("Legal") },
  apprMgr: {
    label: "Manager approval queue",
    f: (o) => o.approvalLabel.toLowerCase().includes("manager"),
    emptyNote:
      "No manager-level approval requests are currently active. Manager approvals will appear here when submitted.",
  },
  risk: { label: "Deals with risk signals", f: (o) => o.riskSev !== "none" },
};

export const QUEUE_DRILL_KEY: Record<string, string> = {
  Finance: "apprFin",
  Legal: "apprLeg",
  Manager: "apprMgr",
};

export function fmtMoney(n: number | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function nextScheduled(last: string): string {
  const [date, time] = last.split(" ");
  const [h, m] = time.split(":").map(Number);
  return `${date} ${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function approvalPillState(status: string): string {
  switch (status) {
    case "approved":
      return "approved";
    case "pending":
      return "pending";
    case "overdue":
      return "rejected";
    case "sentback":
    case "legal":
      return "sent_back";
    default:
      return "none";
  }
}

export function riskColor(sev: "neg" | "warn" | "none"): string {
  if (sev === "neg") return "var(--neg)";
  if (sev === "warn") return "var(--warn)";
  return "var(--muted-2)";
}

export function StagePip({ idx, total = 5 }: { idx: number; total?: number }) {
  return (
    <span className="exe-stage-pip" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < idx ? "on" : i === idx ? "cur" : ""} />
      ))}
    </span>
  );
}

export function ApprPill({ status, label }: { status: string; label: string }) {
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

export type KpiTileProps = {
  label: string;
  value: string;
  unit?: string;
  delta?: { dir: "up" | "dn"; v: string };
  foot: string;
  alert?: boolean;
  active?: boolean;
  onClick?: () => void;
};

export function KpiTile({ label, value, unit, delta, foot, alert, active, onClick }: KpiTileProps) {
  return (
    <div
      className={["exe-kpi-item", onClick ? "exe-kpi-btn" : "", active ? "exe-kpi-active" : ""].filter(Boolean).join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      aria-pressed={onClick ? active : undefined}
      title={onClick ? "Click to filter drill-down" : undefined}
    >
      <div className="exe-kpi-l">
        <span>{label}</span>
        {delta ? <span className={`exe-kpi-delta ${delta.dir}`}>{delta.dir === "up" ? "▲" : "▼"} {delta.v}</span> : null}
      </div>
      <div className="exe-kpi-v mono" style={alert ? { color: "var(--neg)" } : undefined}>
        {value}
        {unit ? <small>{unit}</small> : null}
      </div>
      <div className="exe-kpi-foot">{foot}</div>
    </div>
  );
}
