export type PipelineOpportunity = {
  id: string;
  title: string;
  accountName: string;
  accountId: string;
  ownerId: string;
  ownerName: string;
  stageKey: string;
  stageLabel?: string;
  stageIndex?: number;
  expectedAmount?: number;
  closeDate?: string;
  approvalState?: string;
  approvalLabel?: string;
  approvalRequestId?: string | null;
  riskKey?: string;
  riskLabel?: string;
  nextActivityNote?: string;
  managerNotes?: string;
  primaryContact?: string;
};

export type TeamMember = {
  id: string;
  displayName: string;
  initials?: string;
  colorKey?: string;
  openOppsCount?: number;
  pipelineTotal?: number;
  weightedPipeline?: number;
  pendingApprovals?: number;
  overdueActivities?: number;
  closingThisMonth?: number;
};

export type ViewDef = { key: string; label: string; test: (o: PipelineOpportunity) => boolean };
export type ManagerActionKind = "reassign" | "note" | "update" | "detail";

export function fmtMoney(n: number | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function fmtDate(v: string | undefined): string {
  if (!v) return "—";
  return v.slice(0, 10);
}

export type RiskMeta = { color: string; bg: string; border: string };

export function riskMeta(key: string | undefined): RiskMeta | null {
  if (!key || key === "none") return null;
  if (key === "overdue") return { color: "var(--neg)", bg: "var(--neg-soft)", border: "#D6B0A8" };
  if (key === "stuck" || key === "sla") return { color: "var(--accent-2)", bg: "var(--accent-soft)", border: "#D9BFA0" };
  if (key === "close") return { color: "var(--info,#2D5B6B)", bg: "var(--info-soft,#DDE9ED)", border: "#A4C0C8" };
  if (key === "nonext") return { color: "var(--muted)", bg: "var(--paper-2)", border: "var(--line)" };
  return null;
}

export function approvalPillState(state: string | undefined): string {
  if (!state || state === "none") return "none";
  if (state === "approved") return "approved";
  if (state === "pending") return "pending";
  if (state === "overdue") return "rejected";
  if (state === "legal" || state === "sentback") return "sent_back";
  return "none";
}

export function StagePip({ index = 0, total = 5 }: { index?: number; total?: number }) {
  return (
    <span className="pipe-stage-pip">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < index ? "on" : i === index ? "cur" : ""} />
      ))}
    </span>
  );
}

export function RiskTag({ riskKey, riskLabel }: { riskKey?: string; riskLabel?: string }) {
  const meta = riskMeta(riskKey);
  if (!meta || !riskLabel) return <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>;
  return (
    <span className="pipe-risk-tag" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
      {riskLabel}
    </span>
  );
}

export const PIPELINE_VIEWS: ViewDef[] = [
  { key: "all", label: "Team Pipeline", test: () => true },
  {
    key: "closing",
    label: "Closing This Month",
    test: (o) => {
      const now = new Date();
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return !!o.closeDate && o.closeDate.startsWith(prefix);
    },
  },
  { key: "approval", label: "Pending Approval", test: (o) => ["pending", "overdue", "legal", "sentback"].includes(o.approvalState ?? "") },
  { key: "stuck", label: "Stuck / SLA", test: (o) => ["stuck", "overdue", "sla"].includes(o.riskKey ?? "") },
  { key: "nonext", label: "No Next Step", test: (o) => o.riskKey === "nonext" },
];

export const NOTE_TEMPLATES = [
  "Flag for QBR review",
  "Escalate to executive",
  "Needs immediate attention",
  "Customer deadline risk",
  "On track — monitor weekly",
];
