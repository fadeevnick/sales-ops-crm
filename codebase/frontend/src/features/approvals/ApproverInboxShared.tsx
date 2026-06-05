import type {
  ApprovalDetailResponse,
  ApprovalHistoryItem,
  ApprovalInboxItem,
  ApprovalStepItem,
} from "../../types/approvals";

export type SavedViewKey =
  | "mine_pending"
  | "mine_all"
  | "awaiting_other"
  | "sent_back"
  | "decided"
  | "all";

export type DecisionKind = "approve" | "reject" | "sendBack";
export type StatusFilter = "" | "pending_step" | "approved" | "rejected" | "sent_back";

export const SAVED_VIEWS: { key: SavedViewKey; label: string; description: string }[] = [
  { key: "mine_pending", label: "My pending", description: "Active step assigned to my role" },
  { key: "mine_all", label: "Assigned to me", description: "Includes pending + awaiting upstream" },
  { key: "awaiting_other", label: "Awaiting other approver", description: "Pending on a different role" },
  { key: "sent_back", label: "Sent back", description: "Returned to owner for revision" },
  { key: "decided", label: "Decided", description: "Approved or rejected · immutable" },
  { key: "all", label: "All visible", description: "Everything routed to the inbox" },
];

export const DECISION_CONFIG: Record<
  DecisionKind,
  {
    title: string;
    intro: string;
    placeholder: string;
    confirmLabel: string;
    confirmCls: string;
    bannerLabel: string;
    bannerKind: "info" | "pos" | "neg";
    quickReasons: string[];
  }
> = {
  approve: {
    title: "Approve request",
    intro: "Confirms approval of this step. Decision is recorded against the immutable snapshot and audited.",
    placeholder:
      "e.g. Within policy. Stage progression validated against snapshot — record financial baseline preserved.",
    confirmLabel: "Confirm approval",
    confirmCls: "appr-btn-pos",
    bannerLabel: "Next",
    bannerKind: "info",
    quickReasons: ["Within policy", "Snapshot validated", "Stage progression aligned", "No additional risk"],
  },
  reject: {
    title: "Reject request",
    intro: "Rejects this approval request. The opportunity returns to its prior baseline. Decision is immutable.",
    placeholder:
      "e.g. Stage progression not aligned with current commercial baseline. Resubmit after the close plan is updated.",
    confirmLabel: "Confirm rejection",
    confirmCls: "appr-btn-neg",
    bannerLabel: "Effect",
    bannerKind: "neg",
    quickReasons: [
      "Out of policy",
      "Insufficient justification",
      "Snapshot data inconsistent",
      "Risk too high for this stage",
    ],
  },
  sendBack: {
    title: "Send back to owner",
    intro:
      "Returns the request to the submitter. The request stays open. Owner can revise the underlying record and resubmit.",
    placeholder:
      "e.g. Please attach updated close plan and link the latest customer commitment before resubmitting.",
    confirmLabel: "Send back",
    confirmCls: "appr-btn-info",
    bannerLabel: "Effect",
    bannerKind: "info",
    quickReasons: [
      "Justification too thin",
      "Missing supporting record",
      "Update the snapshot first",
      "Attach business context",
    ],
  },
};

export type SnapshotShape = {
  opportunityId?: string;
  title?: string;
  account?: { name?: string; id?: string };
  accountId?: string;
  accountName?: string;
  primaryContactId?: string | null;
  primaryContactName?: string | null;
  ownerId?: string;
  expectedAmount?: number;
  amount?: number;
  closeDate?: string;
  currentStageKey?: string;
  targetStageKey?: string;
  stageKey?: string;
  stage?: string;
  globalStatus?: string;
  approvalState?: string;
  ownerName?: string;
  owner?: { displayName?: string };
};

export function parseSnapshot(raw: string | null | undefined): { data: SnapshotShape | null; raw: string } {
  const safe = (raw ?? "").trim();
  if (!safe) {
    return { data: null, raw: "" };
  }
  try {
    const parsed = JSON.parse(safe) as unknown;
    if (parsed && typeof parsed === "object") {
      return { data: parsed as SnapshotShape, raw: safe };
    }
    return { data: null, raw: safe };
  } catch {
    return { data: null, raw: safe };
  }
}

export function pillKindForStatus(status: string): string {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "sent_back":
      return "sent_back";
    case "pending_step":
    case "active":
    case "pending":
      return "pending";
    default:
      return "none";
  }
}

export function humaniseStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function humaniseRequestType(type: string): string {
  return type.replace(/_/g, " ");
}

/** Role keys (e.g. "finance_approver") → readable label ("Finance approver"). */
export function humaniseRole(roleKey: string | null | undefined): string {
  if (!roleKey) return "—";
  const spaced = roleKey.replace(/_/g, " ").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace("T", " ").slice(0, 16);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 10);
}

export type SlaState = {
  label: string;
  tone: "none" | "ok" | "warn" | "overdue";
  title: string;
};

export function describeSla(value: string | null | undefined, now = Date.now()): SlaState {
  if (!value) {
    return { label: "No SLA set", tone: "none", title: "No due date was returned for this approval step" };
  }
  const dueMs = Date.parse(value);
  if (!Number.isFinite(dueMs)) {
    return { label: "SLA invalid", tone: "warn", title: value };
  }

  const diffMs = dueMs - now;
  const absHours = Math.max(1, Math.round(Math.abs(diffMs) / 3_600_000));
  const dueLabel = formatDateTime(value);
  if (diffMs < 0) {
    return { label: `Overdue by ${absHours}h`, tone: "overdue", title: `Due ${dueLabel}` };
  }
  if (diffMs <= 24 * 3_600_000) {
    return { label: `Due in ${absHours}h`, tone: "warn", title: `Due ${dueLabel}` };
  }
  const days = Math.max(1, Math.round(diffMs / 86_400_000));
  return { label: `Due in ${days}d`, tone: "ok", title: `Due ${dueLabel}` };
}

export function SlaPill({ dueAt }: { dueAt: string | null | undefined }) {
  const sla = describeSla(dueAt);
  return (
    <span className={`appr-sla-pill appr-sla-${sla.tone}`} title={sla.title}>
      {sla.label}
    </span>
  );
}

export function formatCurrency(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function applyFilter(item: ApprovalInboxItem, view: SavedViewKey, currentRoleKey: string): boolean {
  const isMine = item.approverRoleKey === currentRoleKey;
  switch (view) {
    case "mine_pending":
      return isMine && item.status === "pending_step";
    case "mine_all":
      return isMine;
    case "awaiting_other":
      return !isMine && item.status === "pending_step";
    case "sent_back":
      return item.status === "sent_back";
    case "decided":
      return item.status === "approved" || item.status === "rejected";
    case "all":
    default:
      return true;
  }
}

export function viewCount(items: ApprovalInboxItem[], view: SavedViewKey, currentRoleKey: string): number {
  return items.reduce((acc, item) => (applyFilter(item, view, currentRoleKey) ? acc + 1 : acc), 0);
}

export type DetailPreviewProps = {
  detail: ApprovalDetailResponse;
  snapshot: ReturnType<typeof parseSnapshot>;
  activeStep: ApprovalStepItem | null;
  isMineActive: boolean;
  isLockedForMe: boolean;
  isDecided: boolean;
  isDeciding: boolean;
  currentUser: { roleKey: string; displayName: string };
  onDecide: (kind: DecisionKind) => void;
};

export type DecisionModalProps = {
  kind: DecisionKind;
  detail: ApprovalDetailResponse;
  snapshot: ReturnType<typeof parseSnapshot>;
  comment: string;
  touched: boolean;
  isSubmitting: boolean;
  onCommentChange: (value: string) => void;
  onTouch: () => void;
  onClose: () => void;
  onConfirm: () => void;
};

export type HistoryRowProps = { event: ApprovalHistoryItem };
