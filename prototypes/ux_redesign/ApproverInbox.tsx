// ─────────────────────────────────────────────────────────────────────────────
// ApproverInbox.tsx — Phase 2.3
// ─────────────────────────────────────────────────────────────────────────────
//
// CAPABILITY AUDIT
// ─────────────────────────────────────────────────────────────────────────────
//
// UNCHANGED
//   API surface:
//     fetchApprovalInbox, fetchApprovalDetail, approveApproval,
//     rejectApproval, sendBackApproval — all calls preserved, same signatures.
//   Queue data and saved views:
//     All 6 saved views (mine_pending, mine_all, awaiting_other, sent_back,
//     decided, all) — preserved with per-view counts.
//   Filters:
//     Search (id / opportunity / account / submitter / requestType / policyKey),
//     Status, Request type. Reset filters. All filter logic identical.
//   Queue row content:
//     Request id (short mono), opportunity title + id, account + policyKey,
//     submitted by + date, active step role + SLA, status pill,
//     "your step" annotation, "locked" annotation.
//   Preview content:
//     Request id, policy key/version, request type, opportunity title,
//     account, status pill, submitted by/at, active step, SLA deadline,
//     frozen opportunity snapshot (all fields: title, account, contact,
//     amount, close date, current/target stage, owner, status),
//     business justification (frozen at submit), approval chain with
//     per-step status/SLA/assignee/decision timestamps, decision history
//     (audit log: event type, actor, status transition, comment).
//   Decision workflow:
//     Approve / Reject / Send back — all three actions.
//     Comment required (min 10 chars). Quick-reason chips. Immutability
//     callout. Submitting state. Toast confirmation. Keyboard: Escape
//     closes modal. Decision is recorded against immutable snapshot.
//   Role isolation:
//     Only steps where activeStep.approverRoleKey === currentUser.roleKey
//     are actionable. Locked / decided / sent-back states clearly labelled
//     with contextual disabled UI.
//   Non-decision states:
//     Decided (immutable), Locked (step owned by different role), Sent back
//     (awaiting submitter revision) — all preserved with correct labels.
//   Refresh queue button.
//   Footer ruler (tenant / role / user / scope / environment).
//   Toast notifications.
//   Error states (inbox load error, detail load error).
//   Empty states (no selection, no results, loading).
//
// MOVED
//   KPI strip — 5 standalone tiles:
//     → 3 compact inline stats in queue panel header (Assigned to me,
//       Awaiting other, Sent back). "Decided" and "Total" remain readable
//       via view chip counts and queue head "X of Y". Vertical space
//       savings ~80px. No data removed.
//   Decision action buttons — bottom of preview scroll area:
//     → Pinned action bar immediately below the status banner, above the
//       scrollable detail body. Approver sees the decision surface without
//       scrolling past snapshot/justification/chain. Net workflow unchanged.
//   Access context box — full-width 3-column banner:
//     → Single-line scope note above queue head. Same semantic content
//       (role name, roleKey, what you can do) at a fraction of the height.
//       Reduces repetitive noise for returning approvers. Preserved for
//       first-time context; dismissibility is a future enhancement.
//
// DE-EMPHASIZED, NOT REMOVED
//   "Total visible" KPI:
//     Shown as "X of Y" in queue panel title. Not a standalone tile.
//   "Sent back" and "Decided" counts:
//     Visible on view chips (.ct count). Not prominent tiles.
//   Role context (roleKey, tenantName, scope label, environment):
//     Footer ruler. Unchanged copy.
//   "Awaiting other" count:
//     Inline stat in queue panel header.
//
// BACKEND / API CONSTRAINTS (unchanged from current implementation)
//   ApprovalInboxItem exposes activeStepDueAt at the item level.
//   SLA in queue rows uses activeStepDueAt; if null, renders "No SLA".
//   Snapshot stored as opportunitySnapshotJson (string). Parsed
//   defensively; if JSON is invalid, raw string fallback is shown.
//   No request-level SLA field exists; step-level dueAt is the proxy.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import {
  approveApproval,
  fetchApprovalDetail,
  fetchApprovalInbox,
  rejectApproval,
  sendBackApproval,
} from "../../api/approvals";
import { describeRequestError } from "../../api/session";
import type {
  ApprovalDetailResponse,
  ApprovalHistoryItem,
  ApprovalInboxItem,
  ApprovalStepItem,
} from "../../types/approvals";
import type { CurrentUser } from "../../types/session";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ApproverInboxProps = {
  currentUser: CurrentUser;
  /** Optional: navigate to the full approval detail page for a request id. */
  onOpenDetail?: (requestId: string) => void;
};

type SavedViewKey =
  | "mine_pending"
  | "mine_all"
  | "awaiting_other"
  | "sent_back"
  | "decided"
  | "all";

type DecisionKind = "approve" | "reject" | "sendBack";
type StatusFilter = "" | "pending_step" | "approved" | "rejected" | "sent_back";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SAVED_VIEWS: {
  key: SavedViewKey;
  label: string;
  description: string;
  mine?: boolean;
}[] = [
  {
    key: "mine_pending",
    label: "My pending",
    description: "Active step assigned to my role",
    mine: true,
  },
  {
    key: "mine_all",
    label: "Assigned to me",
    description: "Includes pending + awaiting upstream",
    mine: true,
  },
  {
    key: "awaiting_other",
    label: "Awaiting other",
    description: "Pending on a different role",
  },
  {
    key: "sent_back",
    label: "Sent back",
    description: "Returned to owner for revision",
  },
  {
    key: "decided",
    label: "Decided",
    description: "Approved or rejected · immutable",
  },
  {
    key: "all",
    label: "All visible",
    description: "Everything routed to the inbox",
  },
];

const DECISION_CONFIG: Record<
  DecisionKind,
  {
    title: string;
    intro: string;
    placeholder: string;
    confirmLabel: string;
    confirmCls: string;
    bannerKind: "info" | "pos" | "neg";
    quickReasons: string[];
  }
> = {
  approve: {
    title: "Approve request",
    intro:
      "Confirms approval of this step. Decision is recorded against the immutable snapshot and audited.",
    placeholder:
      "e.g. Within policy. Stage progression validated against snapshot — record financial baseline preserved.",
    confirmLabel: "Confirm approval",
    confirmCls: "appr-btn-pos",
    bannerKind: "pos",
    quickReasons: [
      "Within policy",
      "Snapshot validated",
      "Stage progression aligned",
      "No additional risk",
    ],
  },
  reject: {
    title: "Reject request",
    intro:
      "Rejects this approval request. The opportunity returns to its prior baseline. Decision is immutable.",
    placeholder:
      "e.g. Stage progression not aligned with current commercial baseline. Resubmit after the close plan is updated.",
    confirmLabel: "Confirm rejection",
    confirmCls: "appr-btn-neg",
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
    bannerKind: "info",
    quickReasons: [
      "Justification too thin",
      "Missing supporting record",
      "Update the snapshot first",
      "Attach business context",
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot types + parser
// ─────────────────────────────────────────────────────────────────────────────

type SnapshotShape = {
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

function parseSnapshot(raw: string | null | undefined): {
  data: SnapshotShape | null;
  raw: string;
} {
  const safe = (raw ?? "").trim();
  if (!safe) return { data: null, raw: "" };
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

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

function pillKindForStatus(status: string): string {
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

function humaniseStatus(status: string): string {
  return status.replace(/_/g, " ");
}

function humaniseRequestType(type: string): string {
  return type.replace(/_/g, " ");
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace("T", " ").slice(0, 16);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 10);
}

function formatCurrency(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

type SlaState = {
  label: string;
  tone: "none" | "ok" | "warn" | "overdue";
  title: string;
};

function describeSla(
  value: string | null | undefined,
  now = Date.now()
): SlaState {
  if (!value) {
    return {
      label: "No SLA",
      tone: "none",
      title: "No due date returned for this step",
    };
  }
  const dueMs = Date.parse(value);
  if (!Number.isFinite(dueMs)) {
    return { label: "SLA invalid", tone: "warn", title: value };
  }
  const diffMs = dueMs - now;
  const absHours = Math.max(1, Math.round(Math.abs(diffMs) / 3_600_000));
  const dueLabel = formatDateTime(value);
  if (diffMs < 0) {
    return {
      label: `Overdue ${absHours}h`,
      tone: "overdue",
      title: `Due ${dueLabel}`,
    };
  }
  if (diffMs <= 24 * 3_600_000) {
    return {
      label: `${absHours}h left`,
      tone: "warn",
      title: `Due ${dueLabel}`,
    };
  }
  const days = Math.max(1, Math.round(diffMs / 86_400_000));
  return {
    label: `${days}d left`,
    tone: "ok",
    title: `Due ${dueLabel}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

// Uses appr3-sla classes — styled in styles.phase2-3.css
// Replaces the old appr-sla-pill / appr-sla-{tone} pattern.
function SlaPill({ dueAt }: { dueAt: string | null | undefined }) {
  const sla = describeSla(dueAt);
  return (
    <span
      className={`appr3-sla${sla.tone !== "none" ? ` ${sla.tone}` : ""}`}
      title={sla.title}
    >
      {sla.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter / view helpers
// ─────────────────────────────────────────────────────────────────────────────

function applyFilter(
  item: ApprovalInboxItem,
  view: SavedViewKey,
  currentRoleKey: string
): boolean {
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

function viewCount(
  items: ApprovalInboxItem[],
  view: SavedViewKey,
  currentRoleKey: string
): number {
  return items.reduce(
    (acc, item) => (applyFilter(item, view, currentRoleKey) ? acc + 1 : acc),
    0
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function ApproverInbox({
  currentUser,
  onOpenDetail,
}: ApproverInboxProps) {
  const [items, setItems] = useState<ApprovalInboxItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );
  const [detail, setDetail] = useState<ApprovalDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);

  const [view, setView] = useState<SavedViewKey>("mine_pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [typeFilter, setTypeFilter] = useState("");

  const [decisionKind, setDecisionKind] = useState<DecisionKind | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionTouched, setDecisionTouched] = useState(false);

  // ── Load inbox ──────────────────────────────────────────────────────────

  const loadInbox = async (preserveSelectionId: string | null = null) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetchApprovalInbox(currentUser.userId);
      setItems(response.items);
      if (preserveSelectionId) {
        setSelectedRequestId(preserveSelectionId);
      } else if (response.items.length > 0) {
        setSelectedRequestId((current) => current ?? response.items[0].id);
      } else {
        setSelectedRequestId(null);
      }
    } catch (error) {
      setItems([]);
      setSelectedRequestId(null);
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.userId]);

  // ── Load detail ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedRequestId) {
      setDetail(null);
      setDetailErrorMessage(null);
      return;
    }
    let cancelled = false;
    const loadDetail = async () => {
      setIsDetailLoading(true);
      setDetailErrorMessage(null);
      try {
        const response = await fetchApprovalDetail(
          currentUser.userId,
          selectedRequestId
        );
        if (!cancelled) setDetail(response);
      } catch (error) {
        if (!cancelled) {
          setDetail(null);
          setDetailErrorMessage(describeRequestError(error));
        }
      } finally {
        if (!cancelled) setIsDetailLoading(false);
      }
    };
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [currentUser.userId, selectedRequestId]);

  // ── Derived values ──────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const isMine = (item: ApprovalInboxItem) =>
      item.approverRoleKey === currentUser.roleKey;
    return {
      assignedToMe: items.filter(
        (it) => isMine(it) && it.status === "pending_step"
      ).length,
      awaitingOther: items.filter(
        (it) => !isMine(it) && it.status === "pending_step"
      ).length,
      sentBack: items.filter((it) => it.status === "sent_back").length,
      decided: items.filter(
        (it) => it.status === "approved" || it.status === "rejected"
      ).length,
      total: items.length,
    };
  }, [items, currentUser.roleKey]);

  const viewCounts = useMemo(() => {
    const counts = {} as Record<SavedViewKey, number>;
    for (const v of SAVED_VIEWS) {
      counts[v.key] = viewCount(items, v.key, currentUser.roleKey);
    }
    return counts;
  }, [items, currentUser.roleKey]);

  const requestTypes = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (it.requestType) set.add(it.requestType);
    }
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (!applyFilter(item, view, currentUser.roleKey)) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (typeFilter && item.requestType !== typeFilter) return false;
      if (q) {
        const haystack = [
          item.id,
          item.opportunityId,
          item.opportunityTitle,
          item.accountName,
          item.submittedByName,
          item.requestType,
          item.policyKey,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, view, statusFilter, typeFilter, searchQuery, currentUser.roleKey]);

  // Keep selection inside the filtered set
  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedRequestId(null);
      return;
    }
    if (
      selectedRequestId &&
      filteredItems.some((it) => it.id === selectedRequestId)
    )
      return;
    setSelectedRequestId(filteredItems[0].id);
  }, [filteredItems, selectedRequestId]);

  // ── Decision state helpers ──────────────────────────────────────────────

  const activeStep: ApprovalStepItem | null =
    detail?.steps.find((step) => step.status === "active") ?? null;

  const isMineActive =
    !!detail &&
    detail.status === "pending_step" &&
    activeStep?.approverRoleKey === currentUser.roleKey;

  const isLockedForMe =
    !!detail &&
    detail.status === "pending_step" &&
    !!activeStep &&
    activeStep.approverRoleKey !== currentUser.roleKey;

  const isDecided =
    detail?.status === "approved" || detail?.status === "rejected";

  const snapshot = parseSnapshot(detail?.opportunitySnapshotJson);

  const flashToast = (message: string) => {
    setToast(message);
    window.setTimeout(
      () => setToast((current) => (current === message ? null : current)),
      3200
    );
  };

  const openDecision = (kind: DecisionKind) => {
    if (!isMineActive || isDeciding) return;
    setDecisionKind(kind);
    setDecisionComment("");
    setDecisionTouched(false);
  };

  const closeDecision = () => {
    if (isDeciding) return;
    setDecisionKind(null);
    setDecisionComment("");
    setDecisionTouched(false);
  };

  const submitDecision = async () => {
    if (!detail || !decisionKind) return;
    const trimmed = decisionComment.trim();
    setDecisionTouched(true);
    if (trimmed.length < 10) return;
    try {
      setIsDeciding(true);
      setDetailErrorMessage(null);
      const request = { comment: trimmed };
      if (decisionKind === "approve") {
        await approveApproval(currentUser.userId, detail.id, request);
        flashToast(`Approved ${detail.id}`);
      } else if (decisionKind === "reject") {
        await rejectApproval(currentUser.userId, detail.id, request);
        flashToast(`Rejected ${detail.id} · decision is immutable`);
      } else {
        await sendBackApproval(currentUser.userId, detail.id, request);
        flashToast(`Sent back ${detail.id} · owner notified`);
      }
      const refreshed = await fetchApprovalDetail(
        currentUser.userId,
        detail.id
      );
      setDetail(refreshed);
      await loadInbox(detail.id);
      setDecisionKind(null);
      setDecisionComment("");
      setDecisionTouched(false);
    } catch (error) {
      setDetailErrorMessage(describeRequestError(error));
    } finally {
      setIsDeciding(false);
    }
  };

  const filtersActive = !!searchQuery || !!statusFilter || !!typeFilter;

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setTypeFilter("");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <section className="rep-workspace">
      {/* ── Page head ── */}
      <div className="rep-page-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="rep-page-title">
            Approval inbox
            <em>{currentUser.roleName}</em>
          </h1>
          <div className="rep-page-sub">
            <span className="mono">{currentUser.roleKey}</span>
            <span className="sep">·</span>
            <span>{currentUser.displayName}</span>
            <span className="sep">·</span>
            <span>{currentUser.tenantName}</span>
          </div>
        </div>
        <div className="rep-page-actions">
          <button
            className="rep-btn"
            disabled={isLoading}
            onClick={() => void loadInbox(selectedRequestId)}
            type="button"
          >
            {isLoading ? "Refreshing…" : "Refresh queue"}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="appr-error">{errorMessage}</div>
      ) : null}

      {/* ── Two-pane grid ── */}
      <div className="appr3-split-grid">

        {/* ────────────────────────────────────────────────────────────────
            LEFT PANE: queue
            rep-panel  — base border/bg from styles.css
            appr3-panel — padding:0 override + appr3 layout anchor
            ──────────────────────────────────────────────────────────────── */}
        <div className="rep-panel appr3-panel">

          {/* Scope note — compact, replaces the accbox banner */}
          <div className="appr3-scope-note">
            <span className="mk">APPROVER SCOPE</span>
            <span className="txt">
              You can approve, reject, or send back steps assigned to{" "}
              <strong>{currentUser.roleName}</strong>. Other steps are
              read-only.
            </span>
            <span className="role-key mono">{currentUser.roleKey}</span>
          </div>

          {/* Queue head: title + inline stats */}
          <div className="appr3-queue-head">
            <div className="appr3-queue-head-left">
              <div className="appr3-queue-title">
                Approval queue
                <em>
                  {filteredItems.length} of {items.length}
                </em>
              </div>
              <div className="appr3-stats">
                <div className="appr3-stat">
                  <span
                    className={`appr3-stat-val${kpis.assignedToMe > 0 ? " warn" : ""}`}
                  >
                    {kpis.assignedToMe}
                  </span>
                  <span className="appr3-stat-lbl">mine</span>
                </div>
                <div className="appr3-stat">
                  <span className="appr3-stat-val">{kpis.awaitingOther}</span>
                  <span className="appr3-stat-lbl">other</span>
                </div>
                <div className="appr3-stat">
                  <span
                    className={`appr3-stat-val${kpis.sentBack > 0 ? " warn" : ""}`}
                  >
                    {kpis.sentBack}
                  </span>
                  <span className="appr3-stat-lbl">sent back</span>
                </div>
              </div>
            </div>
            <span className="appr3-sort-hint">SORT · NEWEST</span>
          </div>

          {/* View tab strip */}
          <div className="appr3-tabs" role="tablist">
            {SAVED_VIEWS.map((v) => (
              <button
                aria-selected={view === v.key}
                className={[
                  "appr3-tab",
                  view === v.key ? "active" : "",
                  v.mine ? "mine" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={v.key}
                onClick={() => setView(v.key)}
                role="tab"
                title={v.description}
                type="button"
              >
                {v.label}
                <span className="ct">{viewCounts[v.key] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* Filter row */}
          <div className="appr3-filter-row">
            <div className="appr3-filter-search">
              <input
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="search id, opportunity, account, submitter…"
                value={searchQuery}
              />
            </div>
            <div className="appr3-filter-select">
              <span className="appr3-filter-lbl">Status</span>
              <select
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                value={statusFilter}
              >
                <option value="">Any</option>
                <option value="pending_step">Pending</option>
                <option value="sent_back">Sent back</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="appr3-filter-select">
              <span className="appr3-filter-lbl">Type</span>
              <select
                onChange={(e) => setTypeFilter(e.target.value)}
                value={typeFilter}
              >
                <option value="">Any</option>
                {requestTypes.map((t) => (
                  <option key={t} value={t}>
                    {humaniseRequestType(t)}
                  </option>
                ))}
              </select>
            </div>
            {filtersActive ? (
              <button
                className="appr3-reset-btn"
                onClick={resetFilters}
                type="button"
              >
                ↺ Reset
              </button>
            ) : null}
            <span className="appr3-filter-row-chip">
              {currentUser.roleKey.toUpperCase()}
            </span>
          </div>

          {/* Queue table */}
          <div className="rep-table-scroll">
            <table className="rep-table appr3-queue-tbl">
              <colgroup>
                <col style={{ width: "14%" }} />
                <col />
                <col style={{ width: "17%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Opportunity</th>
                  <th>Account</th>
                  <th>Submitted</th>
                  <th>Step / SLA</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isMine =
                    item.approverRoleKey === currentUser.roleKey;
                  const decided =
                    item.status === "approved" ||
                    item.status === "rejected";
                  const locked =
                    !isMine && !decided && item.status === "pending_step";
                  const sla = describeSla(item.activeStepDueAt);
                  const rowCls = [
                    selectedRequestId === item.id ? "selected" : "",
                    locked ? "appr-row-locked" : "",
                    decided ? "appr-row-decided" : "",
                    sla.tone === "overdue" && !decided
                      ? "appr-row-over"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr
                      className={rowCls}
                      key={item.id}
                      onClick={() => setSelectedRequestId(item.id)}
                    >
                      <td>
                        <div
                          className="rep-cell-truncate mono"
                          style={{ fontSize: "0.77rem" }}
                        >
                          {item.id.slice(0, 8)}
                        </div>
                        <span className="rep-cell-sub">
                          {humaniseRequestType(item.requestType)}
                        </span>
                      </td>
                      <td>
                        <div className="rep-cell-truncate">
                          {item.opportunityTitle}
                        </div>
                        <span
                          className="rep-cell-sub mono"
                          style={{ fontSize: "0.69rem" }}
                        >
                          {item.opportunityId.slice(0, 8)}
                        </span>
                      </td>
                      <td>
                        <div className="rep-cell-truncate">
                          {item.accountName}
                        </div>
                        <span className="rep-cell-sub">{item.policyKey}</span>
                      </td>
                      <td>
                        <div className="rep-cell-truncate">
                          {item.submittedByName}
                        </div>
                        <span className="rep-cell-sub">
                          {formatDate(item.submittedAt)}
                        </span>
                      </td>
                      <td>
                        <div
                          className="rep-cell-truncate mono"
                          style={{ fontSize: "0.77rem" }}
                        >
                          {item.approverRoleKey}
                        </div>
                        <span
                          className={`appr3-sla${sla.tone !== "none" ? ` ${sla.tone}` : ""}`}
                          title={sla.title}
                        >
                          {sla.label}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`rep-pill p-${pillKindForStatus(item.status)}`}
                        >
                          <span className="dot" />
                          {humaniseStatus(item.status)}
                        </span>
                        {isMine && item.status === "pending_step" ? (
                          <span
                            className="rep-cell-sub"
                            style={{
                              color: "var(--accent-2)",
                              fontWeight: 500,
                            }}
                          >
                            your step
                          </span>
                        ) : null}
                        {locked ? (
                          <span
                            className="rep-cell-sub"
                            style={{ color: "var(--muted-2)" }}
                          >
                            locked
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!isLoading && filteredItems.length === 0 ? (
              <div className="rep-empty">
                <div className="icon">AP</div>
                <div className="ttl">No requests match this view</div>
                <div>Try a different view or clear filters.</div>
                {filtersActive ? (
                  <button
                    className="reset"
                    onClick={resetFilters}
                    type="button"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : null}

            {isLoading ? (
              <div className="rep-empty">Loading approval requests…</div>
            ) : null}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────
            RIGHT PANE: preview
            rep-panel      — base border/bg from styles.css
            appr3-panel    — padding:0 override + appr3 layout anchor
            appr3-preview  — sticky, overflow:hidden, flex-column
            ──────────────────────────────────────────────────────────────── */}
        <div className="rep-panel appr3-panel appr3-preview">
          {!selectedRequestId && !isDetailLoading ? (
            <div className="rep-empty" style={{ padding: "48px 20px" }}>
              <div className="icon">AP</div>
              <div className="ttl">Select a request</div>
              <div>Preview shows context, chain, and history.</div>
            </div>
          ) : null}

          {isDetailLoading ? (
            <div className="rep-empty" style={{ padding: "48px 20px" }}>
              Loading detail…
            </div>
          ) : null}

          {detailErrorMessage ? (
            <div className="appr-error appr-error-inline">
              {detailErrorMessage}
            </div>
          ) : null}

          {detail && !isDetailLoading ? (
            <ApproverPreview
              activeStep={activeStep}
              currentUser={currentUser}
              detail={detail}
              isDecided={isDecided}
              isDeciding={isDeciding}
              isLockedForMe={isLockedForMe}
              isMineActive={isMineActive}
              onDecide={openDecision}
              onOpenDetail={onOpenDetail}
              snapshot={snapshot}
            />
          ) : null}
        </div>
      </div>

      {/* ── Footer ruler ── */}
      <div className="rep-foot-ruler">
        <span>
          SALES OPS CRM · {currentUser.tenantName.toUpperCase()} · LOCAL PILOT
        </span>
        <span>
          USER {currentUser.roleKey.toUpperCase()} · {currentUser.displayName}{" "}
          · APPROVER SCOPE
        </span>
        <span>STAGE PROGRESSION ONLY · DECISIONS IMMUTABLE</span>
      </div>

      {/* ── Decision modal ── */}
      {decisionKind && detail ? (
        <DecisionModal
          comment={decisionComment}
          detail={detail}
          isSubmitting={isDeciding}
          kind={decisionKind}
          onClose={closeDecision}
          onCommentChange={(value) => setDecisionComment(value)}
          onConfirm={submitDecision}
          onTouch={() => setDecisionTouched(true)}
          snapshot={snapshot}
          touched={decisionTouched}
        />
      ) : null}

      {/* ── Toast ── */}
      {toast ? (
        <div className="rep-toast">
          <span className="ok">✓</span>
          {toast}
        </div>
      ) : null}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ApproverPreview — right-pane detail preview
// ─────────────────────────────────────────────────────────────────────────────

type ApproverPreviewProps = {
  detail: ApprovalDetailResponse;
  snapshot: ReturnType<typeof parseSnapshot>;
  activeStep: ApprovalStepItem | null;
  isMineActive: boolean;
  isLockedForMe: boolean;
  isDecided: boolean;
  isDeciding: boolean;
  currentUser: CurrentUser;
  onDecide: (kind: DecisionKind) => void;
  onOpenDetail?: (requestId: string) => void;
};

function ApproverPreview({
  detail,
  snapshot,
  activeStep,
  isMineActive,
  isLockedForMe,
  isDecided,
  isDeciding,
  currentUser,
  onDecide,
  onOpenDetail,
}: ApproverPreviewProps) {
  const sortedSteps = [...detail.steps].sort(
    (a, b) => a.stepOrder - b.stepOrder
  );
  const sortedHistory = [...detail.history].sort((a, b) =>
    b.createdAt > a.createdAt ? 1 : -1
  );

  // Determine banner variant
  const bannerKind = isDecided
    ? detail.status === "approved"
      ? "approved"
      : "rejected"
    : detail.status === "sent_back"
      ? "sentback"
      : isLockedForMe
        ? "locked"
        : isMineActive
          ? "yours"
          : "pending";

  const bannerMark =
    bannerKind === "approved"
      ? "✓"
      : bannerKind === "rejected"
        ? "✕"
        : bannerKind === "yours"
          ? "!"
          : "·";

  const bannerHeadline = (() => {
    if (bannerKind === "approved") return "Approved · decision immutable";
    if (bannerKind === "rejected") return "Rejected · decision immutable";
    if (bannerKind === "sentback")
      return "Sent back — awaiting submitter revision";
    if (bannerKind === "locked")
      return `With ${activeStep?.approverRoleKey ?? "another approver"} — read-only`;
    if (bannerKind === "yours") return "Pending your decision";
    return "Pending — no active step assigned to you";
  })();

  const bannerSub = (() => {
    if (isDecided) return `Resolved ${formatDateTime(detail.resolvedAt)}`;
    if (detail.status === "sent_back")
      return "Owner must revise and resubmit.";
    if (activeStep)
      return `Step ${String(activeStep.stepOrder).padStart(2, "0")} · ${activeStep.approverRoleKey} · ${describeSla(activeStep.dueAt).label}`;
    return "";
  })();

  const opportunityTitle = snapshot.data?.title ?? "Opportunity snapshot";
  const accountName =
    snapshot.data?.account?.name ?? snapshot.data?.accountName ?? "—";

  return (
    <>
      {/* ── Preview header (frozen, always visible) ── */}
      <div className="appr3-pv-head">
        <div className="appr3-pv-id-row">
          <div className="appr3-pv-id">
            <span>{detail.id.slice(0, 8)}</span>
            <span style={{ color: "var(--line-2)" }}>·</span>
            <span style={{ color: "var(--muted-2)" }}>
              {humaniseRequestType(detail.requestType)}
            </span>
            <span style={{ color: "var(--line-2)" }}>·</span>
            <span style={{ color: "var(--muted-2)" }}>
              policy {detail.policyKey} v{detail.policyVersion}
            </span>
          </div>
          <span className={`rep-pill p-${pillKindForStatus(detail.status)}`}>
            <span className="dot" />
            {humaniseStatus(detail.status)}
          </span>
        </div>
        <div className="appr3-pv-title">{opportunityTitle}</div>
        <div className="appr3-pv-acct">
          <span className="mono" style={{ fontSize: "11px" }}>
            {detail.opportunityId.slice(0, 8)}
          </span>
          <span className="sep">·</span>
          <span>{accountName}</span>
        </div>
      </div>

      {/* ── Status banner ── */}
      <div className={`appr3-banner appr3-banner-${bannerKind}`}>
        <div className="appr3-banner-mk">{bannerMark}</div>
        <div className="appr3-banner-copy">
          <div className="appr3-banner-eyebrow">
            {humaniseStatus(detail.status)}
          </div>
          <div className="appr3-banner-headline">{bannerHeadline}</div>
          {bannerSub ? (
            <div className="appr3-banner-sub">{bannerSub}</div>
          ) : null}
        </div>
      </div>

      {/* ── Decision action bar — pinned below banner ── */}
      {isMineActive && !isDecided ? (
        <div className="appr3-action-bar">
          <span className="appr3-action-hint">
            YOUR STEP · COMMENT REQUIRED
          </span>
          <div className="btns">
            <button
              className="rep-btn appr-btn-info"
              disabled={isDeciding}
              onClick={() => onDecide("sendBack")}
              type="button"
            >
              Send back
            </button>
            <button
              className="rep-btn appr-btn-neg"
              disabled={isDeciding}
              onClick={() => onDecide("reject")}
              type="button"
            >
              Reject
            </button>
            <button
              className="rep-btn rep-btn-primary appr-btn-pos"
              disabled={isDeciding}
              onClick={() => onDecide("approve")}
              type="button"
            >
              Approve
            </button>
          </div>
        </div>
      ) : isLockedForMe ? (
        <div className="appr3-action-bar">
          <span className="appr3-action-hint">
            STEP NOT ASSIGNED TO {currentUser.roleKey.toUpperCase()} · READ
            ONLY
          </span>
        </div>
      ) : isDecided ? (
        <div className="appr3-action-bar">
          <span className="appr3-action-hint">
            DECISION RECORDED · IMMUTABLE
          </span>
        </div>
      ) : detail.status === "sent_back" ? (
        <div className="appr3-action-bar">
          <span className="appr3-action-hint">
            SENT BACK · AWAITING SUBMITTER
          </span>
        </div>
      ) : null}

      {/* ── Scrollable body ── */}
      <div className="appr3-preview-body">

        {/* Metadata: submitted, step, SLA */}
        <div className="appr3-pv-meta-grid">
          <div className="appr3-pv-cell">
            <div className="appr3-pv-l">Submitted by</div>
            <div className="appr3-pv-v">
              {detail.submittedBy.displayName}
            </div>
          </div>
          <div className="appr3-pv-cell">
            <div className="appr3-pv-l">Submitted at</div>
            <div className="appr3-pv-v mono-val" style={{ fontSize: "11.5px" }}>
              {formatDateTime(detail.submittedAt)}
            </div>
          </div>
          <div className="appr3-pv-cell">
            <div className="appr3-pv-l">Active step</div>
            <div className="appr3-pv-v">
              {activeStep ? (
                <>
                  <span>
                    {String(activeStep.stepOrder).padStart(2, "0")} ·{" "}
                    {activeStep.approverRoleKey}
                  </span>
                  {isMineActive ? (
                    <span
                      className="rep-pill p-pending"
                      style={{ fontSize: "10px" }}
                    >
                      <span className="dot" />
                      you
                    </span>
                  ) : null}
                </>
              ) : (
                <span style={{ color: "var(--muted)" }}>—</span>
              )}
            </div>
          </div>
          <div className="appr3-pv-cell">
            <div className="appr3-pv-l">SLA deadline</div>
            <div className="appr3-pv-v">
              {activeStep?.dueAt ? (
                <>
                  <SlaPill dueAt={activeStep.dueAt} />
                  <small className="mono">
                    {formatDateTime(activeStep.dueAt)}
                  </small>
                </>
              ) : (
                <span style={{ color: "var(--muted)" }}>No SLA</span>
              )}
            </div>
          </div>
        </div>

        {/* Frozen opportunity snapshot */}
        <SnapshotSection
          opportunityId={detail.opportunityId}
          snapshot={snapshot}
        />

        {/* Business justification */}
        <div className="appr3-section">
          <div className="appr3-section-title">
            <span>Business justification</span>
            <em>frozen at submit</em>
          </div>
          <div className="appr3-just">
            {detail.businessJustification &&
            detail.businessJustification.trim().length > 0
              ? detail.businessJustification
              : "No justification provided."}
          </div>
        </div>

        {/* Approval chain */}
        <div className="appr3-section">
          <div className="appr3-section-title">
            <span>Approval chain</span>
            <em>
              {sortedSteps.length} step
              {sortedSteps.length === 1 ? "" : "s"}
            </em>
          </div>
          <div className="appr3-chain">
            {sortedSteps.map((step) => {
              const cls =
                step.status === "active"
                  ? "cur"
                  : step.status === "approved" ||
                      step.status === "rejected" ||
                      step.status === "sent_back"
                    ? "done"
                    : "fut";
              const yours =
                step.approverRoleKey === currentUser.roleKey;
              return (
                <div
                  className={`appr3-chain-step ${cls}`}
                  key={step.id}
                >
                  <div className="appr3-chain-mk">
                    {String(step.stepOrder).padStart(2, "0")}
                  </div>
                  <div>
                    <div className="appr3-chain-nm">
                      {step.approverRoleKey}
                      {yours && step.status === "active" ? (
                        <span
                          className="rep-pill p-pending"
                          style={{ fontSize: "10px" }}
                        >
                          <span className="dot" />
                          you
                        </span>
                      ) : null}
                    </div>
                    <div className="appr3-chain-who">
                      {step.assignedApprover?.displayName ?? "Unassigned"}
                      {step.decidedAt
                        ? ` · decided ${formatDateTime(step.decidedAt)}`
                        : ""}
                    </div>
                    <div className="appr3-chain-who">
                      {step.isRequired ? "required" : "optional"} ·{" "}
                      {step.dueAt ? describeSla(step.dueAt).label : "no SLA"}
                    </div>
                  </div>
                  <span className="appr3-chain-badge">
                    {humaniseStatus(step.status)}
                  </span>
                </div>
              );
            })}
            {sortedSteps.length === 0 ? (
              <div style={{ fontSize: "0.77rem", color: "var(--muted)" }}>
                No steps configured.
              </div>
            ) : null}
          </div>
        </div>

        {/* Decision history */}
        <div className="appr3-section">
          <div className="appr3-section-title">
            <span>Decision history</span>
            <em>
              {sortedHistory.length} event
              {sortedHistory.length === 1 ? "" : "s"} · audit
            </em>
          </div>
          {sortedHistory.length === 0 ? (
            <div style={{ fontSize: "0.77rem", color: "var(--muted)" }}>
              No history recorded yet.
            </div>
          ) : null}
          {sortedHistory.map((event) => (
            <HistoryRow key={event.id} event={event} />
          ))}
        </div>
      </div>

      {/* ── Open full decision CTA ── */}
      <button
        className="appr3-open-cta"
        disabled={!onOpenDetail}
        onClick={
          onOpenDetail ? () => onOpenDetail(detail.id) : undefined
        }
        title={
          onOpenDetail
            ? "Open the full approval decision surface"
            : "Navigation not available in this context"
        }
        type="button"
      >
        Open full decision ›
      </button>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SnapshotSection — frozen opportunity snapshot block
// ─────────────────────────────────────────────────────────────────────────────

function SnapshotSection({
  snapshot,
  opportunityId,
}: {
  snapshot: ReturnType<typeof parseSnapshot>;
  opportunityId: string;
}) {
  if (!snapshot.data && !snapshot.raw) {
    return (
      <div className="appr3-section">
        <div className="appr3-section-title">
          <span>Opportunity snapshot</span>
        </div>
        <div style={{ fontSize: "0.77rem", color: "var(--muted)" }}>
          No snapshot recorded.{" "}
          <span className="mono">{opportunityId.slice(0, 8)}</span>
        </div>
      </div>
    );
  }

  if (!snapshot.data) {
    return (
      <div className="appr3-section">
        <div className="appr3-section-title">
          <span>Opportunity snapshot</span>
          <em>raw · parse error</em>
        </div>
        <pre
          style={{
            fontSize: "0.72rem",
            overflowX: "auto",
            color: "var(--muted)",
            margin: 0,
            padding: "6px 8px",
            background: "var(--paper-2)",
          }}
        >
          {snapshot.raw}
        </pre>
      </div>
    );
  }

  const d = snapshot.data;
  const accountName = d.account?.name ?? d.accountName ?? "—";
  const accountId = d.account?.id ?? d.accountId ?? "";
  const contactName = d.primaryContactName ?? "—";
  const amount =
    typeof d.expectedAmount === "number" ? d.expectedAmount : d.amount;
  const currentStage = d.currentStageKey ?? d.stageKey ?? d.stage ?? "—";
  const targetStage = d.targetStageKey ?? "—";
  const ownerName = d.owner?.displayName ?? d.ownerName ?? "—";
  const snapshotStatus = d.globalStatus ?? d.approvalState ?? "—";

  return (
    <div className="appr3-section" style={{ padding: 0 }}>
      <div
        className="appr3-section-title"
        style={{ padding: "9px 12px 6px" }}
      >
        <span>Opportunity snapshot</span>
        <em>immutable · frozen at submit</em>
      </div>
      <div className="appr3-snap-grid">
        <div className="appr3-snap-cell">
          <div className="appr3-snap-l">Opportunity</div>
          <div className="appr3-snap-v">
            {d.title ?? "—"}
            <small>· {opportunityId.slice(0, 8)}</small>
          </div>
        </div>
        <div className="appr3-snap-cell">
          <div className="appr3-snap-l">Account</div>
          <div className="appr3-snap-v">
            {accountName}
            {accountId ? <small>· {accountId.slice(0, 8)}</small> : null}
          </div>
        </div>
        <div className="appr3-snap-cell">
          <div className="appr3-snap-l">Amount</div>
          <div className="appr3-snap-v num-val">{formatCurrency(amount)}</div>
        </div>
        <div className="appr3-snap-cell">
          <div className="appr3-snap-l">Close date</div>
          <div className="appr3-snap-v mono-val">{formatDate(d.closeDate)}</div>
        </div>
        <div className="appr3-snap-cell">
          <div className="appr3-snap-l">Current stage</div>
          <div className="appr3-snap-v mono-val">{currentStage}</div>
        </div>
        <div className="appr3-snap-cell">
          <div className="appr3-snap-l">Target stage</div>
          <div className="appr3-snap-v mono-val">{targetStage}</div>
        </div>
        <div className="appr3-snap-cell">
          <div className="appr3-snap-l">Owner</div>
          <div className="appr3-snap-v">{ownerName}</div>
        </div>
        <div className="appr3-snap-cell">
          <div className="appr3-snap-l">Primary contact</div>
          <div className="appr3-snap-v">{contactName}</div>
        </div>
        <div className="appr3-snap-cell">
          <div className="appr3-snap-l">Snapshot status</div>
          <div className="appr3-snap-v mono-val">{snapshotStatus}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HistoryRow
// ─────────────────────────────────────────────────────────────────────────────

function HistoryRow({ event }: { event: ApprovalHistoryItem }) {
  return (
    <div className="appr3-hist-row">
      <div className="appr3-hist-body">
        <div className="appr3-hist-title">
          <span>{humaniseStatus(event.eventType)}</span>
          <span className="appr3-hist-by">· {event.actor.displayName}</span>
        </div>
        <div className="appr3-hist-meta">
          {event.fromStatus
            ? `${humaniseStatus(event.fromStatus)} → `
            : ""}
          {humaniseStatus(event.toStatus)}
        </div>
        {event.comment ? (
          <div className="appr3-hist-comment">{event.comment}</div>
        ) : null}
      </div>
      <span className="appr3-hist-ts">{formatDateTime(event.createdAt)}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DecisionModal — unchanged from Phase 2.2; preserved in full
// ─────────────────────────────────────────────────────────────────────────────

type DecisionModalProps = {
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

function DecisionModal({
  kind,
  detail,
  snapshot,
  comment,
  touched,
  isSubmitting,
  onCommentChange,
  onTouch,
  onClose,
  onConfirm,
}: DecisionModalProps) {
  const config = DECISION_CONFIG[kind];
  const empty = comment.trim().length < 10;
  const showError = touched && empty;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isSubmitting, onClose]);

  const opportunityTitle = snapshot.data?.title ?? "Opportunity snapshot";
  const accountName =
    snapshot.data?.account?.name ?? snapshot.data?.accountName ?? "—";
  const amount =
    typeof snapshot.data?.expectedAmount === "number"
      ? snapshot.data.expectedAmount
      : snapshot.data?.amount;

  return (
    <>
      <div
        className="rep-scrim"
        onClick={isSubmitting ? undefined : onClose}
      />
      <div className="rep-modal" role="dialog" aria-label={config.title}>
        <div className="rep-modal-card appr-modal-card">
          <div className={`head appr-modal-head appr-modal-head-${kind}`}>
            <div>
              <h3>{config.title}</h3>
              <p>{config.intro}</p>
            </div>
            <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
              {detail.id.slice(0, 8)}
            </span>
          </div>
          <div className="body">
            <dl className="rep-snap">
              <dt>Opportunity</dt>
              <dd>{opportunityTitle}</dd>
              <dt>Account</dt>
              <dd>{accountName}</dd>
              <dt>Type</dt>
              <dd>{humaniseRequestType(detail.requestType)}</dd>
              <dt>Amount</dt>
              <dd>{formatCurrency(amount)}</dd>
              <dt>Submitted</dt>
              <dd>
                {detail.submittedBy.displayName} ·{" "}
                {formatDateTime(detail.submittedAt)}
              </dd>
              <dt>Policy</dt>
              <dd>
                {detail.policyKey} v{detail.policyVersion}
              </dd>
            </dl>

            <div className="appr-modal-field">
              <label>
                <span>
                  Decision comment{" "}
                  <span className="appr-required">*</span>
                </span>
                <span
                  className="mono"
                  style={{ fontSize: "0.66rem", color: "var(--muted)" }}
                >
                  {comment.length} · min 10 chars
                </span>
              </label>
              <div
                className={`appr-modal-ctl${showError ? " err" : ""}`}
              >
                <textarea
                  onBlur={onTouch}
                  onChange={(e) => onCommentChange(e.target.value)}
                  placeholder={config.placeholder}
                  value={comment}
                />
              </div>
              {showError ? (
                <div className="appr-modal-err">
                  <span className="x">!</span>
                  Comment required (min 10 chars) — decisions are audited and
                  immutable.
                </div>
              ) : null}
              <div className="appr-modal-reasons">
                {config.quickReasons.map((reason) => (
                  <button
                    className="appr-modal-reason"
                    key={reason}
                    onClick={() => {
                      onCommentChange(
                        comment ? `${comment} · ${reason}` : reason
                      );
                      onTouch();
                    }}
                    type="button"
                  >
                    + {reason}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`appr-modal-impact appr-modal-impact-${config.bannerKind}`}
            >
              <span className="mono">{kind === "approve" ? "Next" : "Effect"}</span>
              {kind === "approve"
                ? "Decision recorded against the immutable snapshot. If further steps remain, the request advances to the next approver."
                : kind === "reject"
                  ? "Opportunity returns to its prior commercial baseline. Owner is notified. Decision is immutable."
                  : "Request stays open. Owner sees your comment, may revise the underlying record and resubmit."}
            </div>
          </div>
          <div className="foot appr-modal-foot">
            <span className="appr-modal-foothint mono">
              DECISION AUDITED · COMMENT IMMUTABLE
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="rep-btn"
                disabled={isSubmitting}
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className={`rep-btn rep-btn-primary ${config.confirmCls}`}
                disabled={isSubmitting}
                onClick={onConfirm}
                type="button"
              >
                {isSubmitting ? "Submitting…" : config.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
