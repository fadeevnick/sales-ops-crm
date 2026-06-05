import type { OpportunityListItem } from "../../types/crm";
import type { ReportingDashboardResponse } from "../../types/reporting";
import type { PipelineOpportunity, TeamMember } from "./ManagerPipeline";
import type {
  ApprovalQueue,
  DrillOpportunity,
  ExceptionType,
  PipelineStage,
  ProjectionHealth,
} from "./ExecutiveDashboard";

type StageBreakdown = ReportingDashboardResponse["metrics"]["stageBreakdown"];

// ── Stage position → single-letter code (Q D P N C …) ──────────────────────
const STAGE_POS_CODES = ["Q", "D", "P", "N", "C", "F", "G", "H"];

export function stagePosCode(idx: number): string {
  return STAGE_POS_CODES[idx] ?? String.fromCharCode(65 + (idx % 26));
}

function fmtTurnaround(hours: number | null | undefined): string {
  if (hours == null) return "n/a";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}

// ── Approval state mapping for DrillOpportunity ──────────────────────────────

export function mapApprovalStatus(state: string): string {
  switch (state) {
    case "pending":   return "pending";
    case "approved":  return "approved";
    case "sent_back": return "sentback";
    case "rejected":  return "rejected";
    default:          return "none";
  }
}

export function mapApprovalLabel(state: string): string {
  switch (state) {
    case "pending":   return "Pending approval";
    case "approved":  return "Approved";
    case "sent_back": return "Sent back";
    case "rejected":  return "Rejected";
    default:          return "";
  }
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const COLOR_KEYS = ["c1", "c2", "c3", "c4", "c5", "c6"];

export function pickColorKey(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLOR_KEYS[h % COLOR_KEYS.length];
}

export function weightForStage(stageKey: string, stageOrder: string[]): number {
  const idx = stageOrder.indexOf(stageKey);
  if (idx < 0 || stageOrder.length === 0) return 0.5;
  return Math.min(1, (idx + 1) / stageOrder.length);
}

// ── Pipeline-tab adapters ──────────────────────────────────────────────────

export function buildPipelineRows(
  opportunities: OpportunityListItem[],
  stageOrder: string[],
  stageLabels: Map<string, string>,
): PipelineOpportunity[] {
  const today = new Date();
  return opportunities.map((o) => {
    const stageIndex = stageOrder.indexOf(o.stageKey);
    let riskKey: string | undefined;
    let riskLabel: string | undefined;
    if (o.closeDate) {
      const close = new Date(o.closeDate);
      if (!Number.isNaN(close.getTime())) {
        const days = Math.round((close.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 0 && days <= 14 && o.approvalState !== "approved") {
          riskKey = "close";
          riskLabel = "Closing soon";
        }
      }
    }
    if (o.approvalState === "sent_back") {
      riskKey = "sla";
      riskLabel = "Sent back";
    }
    const approvalState =
      o.approvalState === "sent_back"
        ? "sentback"
        : o.approvalState === "none"
          ? undefined
          : o.approvalState;
    return {
      id: o.id,
      title: o.title,
      accountName: o.accountName,
      accountId: o.accountId,
      ownerId: o.ownerId,
      ownerName: o.ownerName,
      stageKey: o.stageKey,
      stageLabel: stageLabels.get(o.stageKey) ?? o.stageKey,
      stageIndex: stageIndex >= 0 ? stageIndex : undefined,
      expectedAmount: o.expectedAmount ?? undefined,
      closeDate: o.closeDate ?? undefined,
      approvalState,
      approvalLabel: o.approvalState?.replace(/_/g, " "),
      riskKey,
      riskLabel,
    };
  });
}

export function buildTeamMembers(
  opportunities: OpportunityListItem[],
  stageOrder: string[],
): TeamMember[] {
  const byOwner = new Map<string, TeamMember & { _opps: OpportunityListItem[] }>();
  for (const o of opportunities) {
    let entry = byOwner.get(o.ownerId);
    if (!entry) {
      entry = {
        id: o.ownerId,
        displayName: o.ownerName,
        initials: getInitials(o.ownerName),
        colorKey: pickColorKey(o.ownerId),
        openOppsCount: 0,
        pipelineTotal: 0,
        weightedPipeline: 0,
        pendingApprovals: 0,
        overdueActivities: 0,
        closingThisMonth: 0,
        _opps: [],
      };
      byOwner.set(o.ownerId, entry);
    }
    entry._opps.push(o);
    entry.openOppsCount = (entry.openOppsCount ?? 0) + 1;
    entry.pipelineTotal = (entry.pipelineTotal ?? 0) + (o.expectedAmount ?? 0);
    entry.weightedPipeline =
      (entry.weightedPipeline ?? 0) +
      (o.expectedAmount ?? 0) * weightForStage(o.stageKey, stageOrder);
    if (o.approvalState === "pending" || o.approvalState === "sent_back") {
      entry.pendingApprovals = (entry.pendingApprovals ?? 0) + 1;
    }
    const monthPrefix = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    if (o.closeDate?.startsWith(monthPrefix)) {
      entry.closingThisMonth = (entry.closingThisMonth ?? 0) + 1;
    }
  }
  return Array.from(byOwner.values()).map(({ _opps, ...m }) => {
    void _opps;
    return m;
  });
}

// ── Executive Dashboard adapters ────────────────────────────────────────────

export function buildExecStages(
  projection: ReportingDashboardResponse | null,
  stageBreakdown: StageBreakdown,
  stageOrder: string[],
  stageLabels: Map<string, string>,
): PipelineStage[] {
  if (!projection || stageOrder.length === 0) return [];
  const maxVal = Math.max(...stageBreakdown.map((st) => Number(st.expectedAmount)), 1);
  return stageOrder
    .map((key, pos) => {
      const metric = stageBreakdown.find((st) => st.stageKey === key);
      if (!metric) return null;
      const stuck = metric.stuckCount ?? 0;
      const stage: PipelineStage = {
        code: stagePosCode(pos),
        stage: stageLabels.get(key) ?? key,
        count: metric.opportunityCount,
        value: Number(metric.expectedAmount),
        pct: Math.round((Number(metric.expectedAmount) / maxVal) * 100),
        stuck,
        warn: stuck > 0,
      };
      return stage;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

export function buildExecDrillOpps(
  opportunities: OpportunityListItem[],
  stageOrder: string[],
): DrillOpportunity[] {
  const today = new Date();
  return opportunities.map((o): DrillOpportunity => {
    const stagePos = stageOrder.indexOf(o.stageKey);
    const code = stagePosCode(stagePos >= 0 ? stagePos : 0);
    const approvalStatus = mapApprovalStatus(o.approvalState);
    const approvalLabel = mapApprovalLabel(o.approvalState);

    let riskLabel = "";
    let riskSev: "neg" | "warn" | "none" = "none";
    if (o.approvalState === "sent_back") {
      riskLabel = "Sent back";
      riskSev = "warn";
    } else if (o.closeDate) {
      const close = new Date(o.closeDate);
      if (!Number.isNaN(close.getTime())) {
        const days = Math.round((close.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 0 && days <= 14 && o.approvalState !== "approved") {
          riskLabel = "Closing soon";
          riskSev = "warn";
        }
      }
    }

    return {
      id: o.id,
      title: o.title,
      account: o.accountName,
      owner: o.ownerName,
      team: "",
      stageCode: code,
      stageIdx: stagePos >= 0 ? stagePos : 0,
      amount: o.expectedAmount ?? 0,
      close: o.closeDate ?? "—",
      approvalStatus,
      approvalLabel,
      riskLabel,
      riskSev,
      notes: "",
    };
  });
}

type QueueMeta = { dept: string; abbr: string; badgeCls: string; sla: string };

const ROLE_META: Record<string, QueueMeta> = {
  finance_approver: { dept: "Finance",  abbr: "FIN", badgeCls: "r-fin", sla: "24h" },
  legal_approver:   { dept: "Legal",    abbr: "LEG", badgeCls: "r-leg", sla: "48h" },
};
const FALLBACK_ROLE_META: QueueMeta = { dept: "Manager", abbr: "MGR", badgeCls: "r-mgr", sla: "72h" };

export function buildExecApprovalQueues(
  projection: ReportingDashboardResponse | null,
): ApprovalQueue[] {
  if (!projection) return [];
  const breakdown = projection.metrics.approvalBacklog.queueBreakdown;
  if (!breakdown || breakdown.length === 0) {
    return [
      {
        dept: "All Queues",
        abbr: "ALL",
        badgeCls: "r-exe",
        pending: projection.metrics.approvalBacklog.pendingRequests,
        overdue: 0,
        avgH: fmtTurnaround(projection.metrics.approvalBacklog.avgTurnaroundHours),
        sla: "48h",
        bottleneck: false,
      },
    ];
  }
  const maxPending = Math.max(...breakdown.map((r) => r.pending), 0);
  return breakdown.map((row) => {
    const meta = ROLE_META[row.roleKey] ?? FALLBACK_ROLE_META;
    return {
      dept: meta.dept,
      abbr: meta.abbr,
      badgeCls: meta.badgeCls,
      pending: row.pending,
      overdue: row.overdue,
      avgH: fmtTurnaround(row.avgTurnaroundHours),
      sla: meta.sla,
      bottleneck: row.pending > 0 && row.pending === maxPending && breakdown.length > 1,
    };
  });
}

export function buildExecProjectionHealth(
  projection: ReportingDashboardResponse | null,
): ProjectionHealth {
  if (!projection) {
    return {
      lastRefresh: "—",
      refreshDuration: "n/a",
      sourceEvents: "—",
      pendingImports: 0,
      pendingMerges: 0,
    };
  }
  const ts = new Date(projection.refreshedAt);
  const lastRefresh = Number.isNaN(ts.getTime())
    ? projection.refreshedAt
    : ts.toISOString().replace("T", " ").slice(0, 16);
  const events =
    projection.sourceCounters.opportunityCount +
    projection.sourceCounters.approvalRequestCount;
  const refreshDuration = projection.refreshDurationMs != null
    ? projection.refreshDurationMs < 1000
      ? `${projection.refreshDurationMs}ms`
      : `${(projection.refreshDurationMs / 1000).toFixed(1)}s`
    : "n/a";
  return {
    lastRefresh,
    refreshDuration,
    sourceEvents: `${events} source records`,
    pendingImports: projection.sourceCounters.pendingImports ?? 0,
    pendingMerges: projection.sourceCounters.pendingMerges ?? 0,
  };
}

export function buildExecClosedQtd(
  projection: ReportingDashboardResponse | null,
): { count: number; value: number; pctOfMax: number } {
  const empty = { count: 0, value: 0, pctOfMax: 0 };
  if (!projection?.metrics.closedWonQtd) return empty;
  const qtd = projection.metrics.closedWonQtd;
  const value = Number(qtd.totalExpectedAmount);
  const maxStageVal = Math.max(
    ...projection.metrics.stageBreakdown.map((st) => Number(st.expectedAmount)),
    1,
  );
  return {
    count: qtd.count,
    value,
    pctOfMax: Math.round((value / maxStageVal) * 100),
  };
}

const POLICY_LABELS: Record<string, string> = {
  large_deal_stage_progression: "Large Deal",
  discount_approval: "Discount",
  payment_terms_approval: "Payment Terms",
  legal_indemnity_approval: "Legal / Indemnity",
};

function fmtPolicyLabel(policyKey: string): string {
  if (POLICY_LABELS[policyKey]) return POLICY_LABELS[policyKey];
  return policyKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildExecExceptionTypes(
  projection: ReportingDashboardResponse | null,
): ExceptionType[] {
  if (!projection) return [];
  const breakdown = projection.metrics.approvalBacklog.exceptionBreakdown;
  if (!breakdown || breakdown.length === 0) return [];
  return breakdown.map((row) => ({
    type: fmtPolicyLabel(row.policyKey),
    count: row.count,
    value: Number(row.totalExpectedAmount),
    detail: `${row.count} pending · policy: ${row.policyKey}`,
  }));
}
