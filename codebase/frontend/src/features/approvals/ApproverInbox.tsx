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

type ApproverInboxProps = {
  currentUser: CurrentUser;
};

type SavedViewKey = "mine_pending" | "mine_all" | "awaiting_other" | "sent_back" | "decided" | "all";
type DecisionKind = "approve" | "reject" | "sendBack";
type StatusFilter = "" | "pending_step" | "approved" | "rejected" | "sent_back";

const SAVED_VIEWS: { key: SavedViewKey; label: string; description: string }[] = [
  { key: "mine_pending", label: "My pending", description: "Active step assigned to my role" },
  { key: "mine_all", label: "Assigned to me", description: "Includes pending + awaiting upstream" },
  { key: "awaiting_other", label: "Awaiting other approver", description: "Pending on a different role" },
  { key: "sent_back", label: "Sent back", description: "Returned to owner for revision" },
  { key: "decided", label: "Decided", description: "Approved or rejected · immutable" },
  { key: "all", label: "All visible", description: "Everything routed to the inbox" },
];

const DECISION_CONFIG: Record<
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

function parseSnapshot(raw: string | null | undefined): { data: SnapshotShape | null; raw: string } {
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

type SlaState = {
  label: string;
  tone: "none" | "ok" | "warn" | "overdue";
  title: string;
};

function describeSla(value: string | null | undefined, now = Date.now()): SlaState {
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

function SlaPill({ dueAt }: { dueAt: string | null | undefined }) {
  const sla = describeSla(dueAt);
  return (
    <span className={`appr-sla-pill appr-sla-${sla.tone}`} title={sla.title}>
      {sla.label}
    </span>
  );
}

function formatCurrency(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function applyFilter(item: ApprovalInboxItem, view: SavedViewKey, currentRoleKey: string): boolean {
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

function viewCount(items: ApprovalInboxItem[], view: SavedViewKey, currentRoleKey: string): number {
  return items.reduce((acc, item) => (applyFilter(item, view, currentRoleKey) ? acc + 1 : acc), 0);
}

export function ApproverInbox({ currentUser }: ApproverInboxProps) {
  const [items, setItems] = useState<ApprovalInboxItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApprovalDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [view, setView] = useState<SavedViewKey>("mine_pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [typeFilter, setTypeFilter] = useState("");

  const [decisionKind, setDecisionKind] = useState<DecisionKind | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionTouched, setDecisionTouched] = useState(false);

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
        const response = await fetchApprovalDetail(currentUser.userId, selectedRequestId);
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

  // KPIs over the entire inbox response
  const kpis = useMemo(() => {
    const isMine = (item: ApprovalInboxItem) => item.approverRoleKey === currentUser.roleKey;
    return {
      assignedToMe: items.filter((it) => isMine(it) && it.status === "pending_step").length,
      awaitingOther: items.filter((it) => !isMine(it) && it.status === "pending_step").length,
      sentBack: items.filter((it) => it.status === "sent_back").length,
      decided: items.filter((it) => it.status === "approved" || it.status === "rejected").length,
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

  // Keep selection inside the filtered set when possible
  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedRequestId(null);
      return;
    }
    if (selectedRequestId && filteredItems.some((it) => it.id === selectedRequestId)) return;
    setSelectedRequestId(filteredItems[0].id);
  }, [filteredItems, selectedRequestId]);

  const activeStep: ApprovalStepItem | null = detail?.steps.find((step) => step.status === "active") ?? null;
  const isMineActive =
    !!detail && detail.status === "pending_step" && activeStep?.approverRoleKey === currentUser.roleKey;
  const isLockedForMe =
    !!detail &&
    detail.status === "pending_step" &&
    !!activeStep &&
    activeStep.approverRoleKey !== currentUser.roleKey;
  const isDecided = detail?.status === "approved" || detail?.status === "rejected";

  const flashToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 3200);
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
    const request = { comment: trimmed };
    try {
      setIsDeciding(true);
      setDetailErrorMessage(null);
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
      const refreshed = await fetchApprovalDetail(currentUser.userId, detail.id);
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

  const selectedItem = filteredItems.find((it) => it.id === selectedRequestId) ?? null;
  const snapshot = parseSnapshot(detail?.opportunitySnapshotJson);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setTypeFilter("");
  };

  const filtersActive = !!searchQuery || !!statusFilter || !!typeFilter;

  return (
    <section className="rep-workspace appr-workspace">
      <div className="rep-page-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="rep-page-title">
            Approval inbox
            <em>{currentUser.roleName}</em>
          </h1>
          <div className="rep-page-sub">
            <span className="mono">{currentUser.roleKey}</span>
            <span className="sep">/</span>
            <span>{currentUser.displayName}</span>
            <span className="sep">·</span>
            <span>{currentUser.tenantName} · Local Pilot</span>
            <span className="sep">·</span>
            <span className="mono">approver scope · {currentUser.roleKey}</span>
          </div>
        </div>
        <div className="rep-page-actions">
          <button
            className="rep-btn"
            onClick={() => void loadInbox(selectedRequestId)}
            type="button"
            disabled={isLoading}
          >
            {isLoading ? "Refreshing…" : "Refresh queue"}
          </button>
        </div>
      </div>

      <div className="appr-accbox">
        <div className="appr-accbox-mark">i</div>
        <div className="appr-accbox-body">
          <div className="appr-accbox-title">Approval context only — you are not editing the opportunity</div>
          <div className="appr-accbox-sub">
            You see the deal context required to decide on approvals routed to <strong>{currentUser.roleName}</strong>.
            You can <strong>Approve</strong>, <strong>Send back</strong> or <strong>Reject</strong> only the steps
            assigned to your role. Other steps are immutable and read-only.
          </div>
        </div>
        <span className="appr-accbox-tag mono">SCOPE · {currentUser.roleKey.toUpperCase()}</span>
      </div>

      {errorMessage ? <div className="appr-error">{errorMessage}</div> : null}

      <div className="rep-kpis">
        <div className="rep-kpi">
          <div className="rep-kpi-label">Assigned to me</div>
          <div className="rep-kpi-value">{kpis.assignedToMe}</div>
          <div className="rep-kpi-foot">Pending decision · my role</div>
        </div>
        <div className="rep-kpi">
          <div className="rep-kpi-label">Awaiting other approver</div>
          <div className="rep-kpi-value">{kpis.awaitingOther}</div>
          <div className="rep-kpi-foot">Locked for you · upstream step open</div>
        </div>
        <div className="rep-kpi">
          <div className="rep-kpi-label">Sent back</div>
          <div className="rep-kpi-value">{kpis.sentBack}</div>
          <div className="rep-kpi-foot">Returned to owner for revision</div>
        </div>
        <div className="rep-kpi">
          <div className="rep-kpi-label">Decided</div>
          <div className="rep-kpi-value">{kpis.decided}</div>
          <div className="rep-kpi-foot">Approved or rejected · immutable</div>
        </div>
        <div className="rep-kpi">
          <div className="rep-kpi-label">Total visible</div>
          <div className="rep-kpi-value">{kpis.total}</div>
          <div className="rep-kpi-foot">Inbox response</div>
        </div>
      </div>

      <div className="rep-views">
        <span className="rep-views-label">Saved views</span>
        {SAVED_VIEWS.map((v) => (
          <button
            className={`rep-view-chip${view === v.key ? " active" : ""}`}
            key={v.key}
            onClick={() => setView(v.key)}
            title={v.description}
            type="button"
          >
            {v.label}
            <span className="ct">{viewCounts[v.key] ?? 0}</span>
          </button>
        ))}
        <span className="rep-view-chip-spacer" />
        {filtersActive ? (
          <button className="rep-btn rep-btn-ghost" onClick={resetFilters} type="button">
            Reset filters
          </button>
        ) : null}
      </div>

      <div className="rep-filters appr-filters">
        <label className="rep-field">
          <span className="rep-field-lbl">Search</span>
          <input
            placeholder="request id, opportunity, account, submitter…"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
          />
        </label>
        <label className="rep-field">
          <span className="rep-field-lbl">Status</span>
          <select onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} value={statusFilter}>
            <option value="">Any</option>
            <option value="pending_step">Pending</option>
            <option value="sent_back">Sent back</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="rep-field">
          <span className="rep-field-lbl">Type</span>
          <select onChange={(e) => setTypeFilter(e.target.value)} value={typeFilter}>
            <option value="">Any</option>
            {requestTypes.map((t) => (
              <option key={t} value={t}>
                {humaniseRequestType(t)}
              </option>
            ))}
          </select>
        </label>
        <span className="rep-lock-chip">APPROVER · {currentUser.roleKey.toUpperCase()}</span>
      </div>

      <div className="rep-grid appr-grid">
        <div className="rep-panel">
          <div className="rep-panel-head">
            <div className="rep-panel-title">
              Approval queue
              <em>
                {filteredItems.length} of {items.length}
              </em>
            </div>
            <div className="rep-panel-actions">
              <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                SORT · NEWEST
              </span>
            </div>
          </div>
          <div className="rep-table-scroll">
            <table className="rep-table appr-queue-table">
              <colgroup>
                <col style={{ width: "16%" }} />
                <col />
                <col style={{ width: "20%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "18%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Opportunity</th>
                  <th>Account</th>
                  <th>Submitted</th>
                  <th>Active step</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isMine = item.approverRoleKey === currentUser.roleKey;
                  const decided = item.status === "approved" || item.status === "rejected";
                  const locked = !isMine && !decided && item.status === "pending_step";
                  const rowCls = [
                    selectedRequestId === item.id ? "selected" : "",
                    locked ? "appr-row-locked" : "",
                    decided ? "appr-row-decided" : "",
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
                        <div className="rep-cell-truncate mono" style={{ fontSize: "0.78rem" }}>
                          {item.id.slice(0, 8)}
                        </div>
                        <span className="rep-cell-sub">{humaniseRequestType(item.requestType)}</span>
                      </td>
                      <td>
                        <div className="rep-cell-truncate">{item.opportunityTitle}</div>
                        <span className="rep-cell-sub">{item.opportunityId.slice(0, 8)}</span>
                      </td>
                      <td>
                        <div className="rep-cell-truncate">{item.accountName}</div>
                        <span className="rep-cell-sub">{item.policyKey}</span>
                      </td>
                      <td>
                        <div className="rep-cell-truncate">{item.submittedByName}</div>
                        <span className="rep-cell-sub">{formatDate(item.submittedAt)}</span>
                      </td>
                      <td>
                        <div className="rep-cell-truncate">{item.approverRoleKey}</div>
                        <span className="rep-cell-sub">{humaniseStatus(item.activeStepStatus)}</span>
                        <SlaPill dueAt={item.activeStepDueAt} />
                      </td>
                      <td>
                        <span className={`rep-pill p-${pillKindForStatus(item.status)}`}>
                          <span className="dot" />
                          {humaniseStatus(item.status)}
                        </span>
                        {locked ? (
                          <span className="rep-cell-sub" title="Step is assigned to a different role">
                            locked for you
                          </span>
                        ) : null}
                        {isMine && item.status === "pending_step" ? (
                          <span className="rep-cell-sub" style={{ color: "var(--accent-2)" }}>
                            your step
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
                <div>Try a different saved view or clear filters.</div>
                {filtersActive ? (
                  <button className="reset" onClick={resetFilters} type="button">
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : null}
            {isLoading ? <div className="rep-empty">Loading approval requests…</div> : null}
          </div>
        </div>

        <div className="rep-panel rep-preview appr-preview">
          {!selectedItem && !isDetailLoading ? (
            <div className="rep-empty">
              <div className="icon">AP</div>
              <div className="ttl">Pick a request from the queue</div>
              <div>The preview shows snapshot, justification, chain and history.</div>
            </div>
          ) : null}

          {isDetailLoading ? <div className="rep-empty">Loading approval detail…</div> : null}

          {detailErrorMessage ? <div className="appr-error appr-error-inline">{detailErrorMessage}</div> : null}

          {detail && !isDetailLoading ? (
            <DetailPreview
              detail={detail}
              snapshot={snapshot}
              activeStep={activeStep}
              isMineActive={isMineActive}
              isLockedForMe={isLockedForMe}
              isDecided={isDecided}
              isDeciding={isDeciding}
              currentUser={currentUser}
              onDecide={openDecision}
            />
          ) : null}
        </div>
      </div>

      <div className="rep-foot-ruler">
        <span>SALES OPS CRM · {currentUser.tenantName.toUpperCase()} · LOCAL PILOT</span>
        <span>
          USER {currentUser.roleKey.toUpperCase()} · {currentUser.displayName} · APPROVER SCOPE
        </span>
        <span>STAGE PROGRESSION ONLY · DECISIONS IMMUTABLE</span>
      </div>

      {decisionKind && detail ? (
        <DecisionModal
          kind={decisionKind}
          detail={detail}
          snapshot={snapshot}
          comment={decisionComment}
          touched={decisionTouched}
          isSubmitting={isDeciding}
          onCommentChange={(value) => setDecisionComment(value)}
          onTouch={() => setDecisionTouched(true)}
          onClose={closeDecision}
          onConfirm={submitDecision}
        />
      ) : null}

      {toast ? (
        <div className="rep-toast">
          <span className="ok">✓</span>
          {toast}
        </div>
      ) : null}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Detail preview — frozen snapshot, chain, history, decision actions
// ─────────────────────────────────────────────────────────────────────────

type DetailPreviewProps = {
  detail: ApprovalDetailResponse;
  snapshot: ReturnType<typeof parseSnapshot>;
  activeStep: ApprovalStepItem | null;
  isMineActive: boolean;
  isLockedForMe: boolean;
  isDecided: boolean;
  isDeciding: boolean;
  currentUser: CurrentUser;
  onDecide: (kind: DecisionKind) => void;
};

function DetailPreview({
  detail,
  snapshot,
  activeStep,
  isMineActive,
  isLockedForMe,
  isDecided,
  isDeciding,
  currentUser,
  onDecide,
}: DetailPreviewProps) {
  const sortedSteps = [...detail.steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const sortedHistory = [...detail.history].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

  const bannerKind = isDecided
    ? detail.status === "approved"
      ? "approved"
      : "rejected"
    : detail.status === "sent_back"
      ? "sent_back"
      : isLockedForMe
        ? "locked"
        : isMineActive
          ? "yours"
          : "pending";

  const bannerCopy = (() => {
    if (bannerKind === "approved") return "Approved · decision is immutable";
    if (bannerKind === "rejected") return "Rejected · decision is immutable";
    if (bannerKind === "sent_back") return "Sent back to owner — request stays open until resubmitted";
    if (bannerKind === "locked")
      return `Currently with ${activeStep?.approverRoleKey ?? "another approver"} — read-only for you`;
    if (bannerKind === "yours") return "Pending your decision · this is your active step";
    return "Pending step — no active step assigned";
  })();

  const bannerSub = (() => {
    if (isDecided) return `Resolved at ${formatDateTime(detail.resolvedAt)}`;
    if (detail.status === "sent_back")
      return "Awaiting submitter to revise the underlying record and resubmit.";
    if (activeStep)
      return `Active step ${String(activeStep.stepOrder).padStart(2, "0")} · ${activeStep.approverRoleKey} · ${
        describeSla(activeStep.dueAt).label
      }`;
    return "—";
  })();

  return (
    <>
      <div className="rep-preview-head">
        <div className="rep-preview-id">
          <span>{detail.id.slice(0, 8)} · approval request</span>
          <span>policy {detail.policyKey} v{detail.policyVersion}</span>
        </div>
        <div className="rep-preview-title">{snapshot.data?.title ?? "Opportunity snapshot"}</div>
        <div className="rep-preview-acct">
          <span className="mono">{detail.opportunityId.slice(0, 8)}</span>
          <span>·</span>
          <span>{snapshot.data?.account?.name ?? snapshot.data?.accountName ?? "—"}</span>
          <span>·</span>
          <span className="mono">{humaniseRequestType(detail.requestType)}</span>
        </div>
      </div>

      <div className={`appr-banner appr-banner-${bannerKind}`}>
        <div className="appr-banner-mark">
          {bannerKind === "approved" ? "✓" : bannerKind === "rejected" ? "✕" : bannerKind === "locked" ? "🔒" : "!"}
        </div>
        <div className="appr-banner-body">
          <div className="l">{humaniseStatus(detail.status)}</div>
          <div className="v">{bannerCopy}</div>
          <div className="s">{bannerSub}</div>
        </div>
        <span className={`rep-pill p-${pillKindForStatus(detail.status)}`}>
          <span className="dot" />
          {humaniseStatus(detail.status)}
        </span>
      </div>

      <div className="rep-preview-grid">
        <div className="rep-pf">
          <div className="rep-pf-l">Submitted by</div>
          <div className="rep-pf-v">{detail.submittedBy.displayName}</div>
        </div>
        <div className="rep-pf">
          <div className="rep-pf-l">Submitted at</div>
          <div className="rep-pf-v mono" style={{ fontFamily: "ui-monospace, monospace" }}>
            {formatDateTime(detail.submittedAt)}
          </div>
        </div>
        <div className="rep-pf">
          <div className="rep-pf-l">Request type</div>
          <div className="rep-pf-v">{humaniseRequestType(detail.requestType)}</div>
        </div>
        <div className="rep-pf">
          <div className="rep-pf-l">Active step</div>
          <div className="rep-pf-v">
            {activeStep ? (
              <>
                <span>
                  {String(activeStep.stepOrder).padStart(2, "0")} · {activeStep.approverRoleKey}
                </span>
                {isMineActive ? (
                  <span className="rep-pill p-pending">
                    <span className="dot" />
                    your step
                  </span>
                ) : null}
              </>
            ) : (
              <span style={{ color: "var(--muted)" }}>No active step</span>
            )}
          </div>
        </div>
        <div className="rep-pf">
          <div className="rep-pf-l">Policy</div>
          <div className="rep-pf-v mono" style={{ fontFamily: "ui-monospace, monospace" }}>
            {detail.policyKey} v{detail.policyVersion}
          </div>
        </div>
        <div className="rep-pf">
          <div className="rep-pf-l">Decision recorded</div>
          <div className="rep-pf-v mono" style={{ fontFamily: "ui-monospace, monospace" }}>
            {detail.resolvedAt ? formatDateTime(detail.resolvedAt) : "—"}
          </div>
        </div>
        <div className="rep-pf">
          <div className="rep-pf-l">SLA deadline</div>
          <div className="rep-pf-v">
            <SlaPill dueAt={activeStep?.dueAt} />
            {activeStep?.dueAt ? (
              <span className="mono" style={{ color: "var(--muted)", fontFamily: "ui-monospace, monospace" }}>
                {formatDateTime(activeStep.dueAt)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <SnapshotBlock snapshot={snapshot} opportunityId={detail.opportunityId} />

      <div className="rep-pf-block">
        <div className="rep-pf-block-title">
          <span>Business justification</span>
          <span className="mono" style={{ color: "var(--muted-2)", letterSpacing: 0, textTransform: "none" }}>
            frozen at submit
          </span>
        </div>
        <div className="appr-just-body">
          {detail.businessJustification && detail.businessJustification.trim().length > 0
            ? detail.businessJustification
            : "No justification provided."}
        </div>
      </div>

      <div className="rep-pf-block">
        <div className="rep-pf-block-title">
          <span>Approval chain</span>
          <em
            className="mono"
            style={{ color: "var(--muted-2)", fontStyle: "normal", letterSpacing: 0, textTransform: "none" }}
          >
            {sortedSteps.length} step{sortedSteps.length === 1 ? "" : "s"}
          </em>
        </div>
        <div className="appr-chain">
          {sortedSteps.map((step) => {
            const cls =
              step.status === "approved"
                ? "done"
                : step.status === "rejected" || step.status === "sent_back"
                  ? "done"
                  : step.status === "active"
                    ? "cur"
                    : "fut";
            const yours = step.approverRoleKey === currentUser.roleKey;
            return (
              <div className={`appr-chain-step ${cls}${yours ? " mine" : ""}`} key={step.id}>
                <div className="appr-chain-mark">{String(step.stepOrder).padStart(2, "0")}</div>
                <div className="appr-chain-body">
                  <div className="nm">
                    {step.approverRoleKey}
                    {yours && step.status === "active" ? (
                      <span className="rep-pill p-pending" style={{ marginLeft: 8 }}>
                        <span className="dot" />
                        you
                      </span>
                    ) : null}
                    {!yours && step.status === "active" ? (
                      <span className="rep-pill" style={{ marginLeft: 8 }}>
                        <span className="dot" />
                        locked
                      </span>
                    ) : null}
                  </div>
                  <div className="who">
                    {step.assignedApprover?.displayName ?? "Unassigned"}
                    {step.activatedAt ? ` · activated ${formatDateTime(step.activatedAt)}` : ""}
                    {step.decidedAt ? ` · decided ${formatDateTime(step.decidedAt)}` : ""}
                  </div>
                  <div className="sla">
                    {step.isRequired ? "required" : "optional"} · status {humaniseStatus(step.status)}
                    <SlaPill dueAt={step.dueAt} />
                  </div>
                </div>
                <span className={`appr-chain-badge appr-chain-badge-${pillKindForStatus(step.status)}`}>
                  {humaniseStatus(step.status)}
                </span>
              </div>
            );
          })}
          {sortedSteps.length === 0 ? (
            <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>No steps configured.</div>
          ) : null}
        </div>
      </div>

      <div className="rep-pf-block">
        <div className="rep-pf-block-title">
          <span>Decision history</span>
          <em
            className="mono"
            style={{ color: "var(--muted-2)", fontStyle: "normal", letterSpacing: 0, textTransform: "none" }}
          >
            {sortedHistory.length} event{sortedHistory.length === 1 ? "" : "s"} · audit
          </em>
        </div>
        <div className="appr-history">
          {sortedHistory.length === 0 ? (
            <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>No history recorded yet.</div>
          ) : null}
          {sortedHistory.map((event) => (
            <HistoryRow key={event.id} event={event} />
          ))}
        </div>
      </div>

      <div className="rep-preview-actions appr-actions">
        {isDecided ? (
          <>
            <span className="appr-action-hint mono">DECISION RECORDED · IMMUTABLE</span>
            <div className="right">
              <button className="rep-btn" disabled type="button" title="Decision is immutable">
                Cannot re-decide
              </button>
            </div>
          </>
        ) : isLockedForMe ? (
          <>
            <span className="appr-action-hint mono">
              STEP NOT ASSIGNED TO {currentUser.roleKey.toUpperCase()}
            </span>
            <div className="right">
              <button className="rep-btn" disabled type="button">
                Locked
              </button>
            </div>
          </>
        ) : detail.status === "sent_back" ? (
          <>
            <span className="appr-action-hint mono">SENT BACK · AWAITING SUBMITTER</span>
            <div className="right">
              <button className="rep-btn" disabled type="button">
                Waiting on owner
              </button>
            </div>
          </>
        ) : isMineActive ? (
          <>
            <span className="appr-action-hint mono">YOUR STEP · COMMENT REQUIRED</span>
            <div className="right">
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
          </>
        ) : (
          <>
            <span className="appr-action-hint mono">PENDING · NO ACTIVE STEP FOR YOU</span>
            <div className="right">
              <button className="rep-btn" disabled type="button">
                No action available
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Snapshot block — defensive parse with raw fallback
// ─────────────────────────────────────────────────────────────────────────

function SnapshotBlock({
  snapshot,
  opportunityId,
}: {
  snapshot: ReturnType<typeof parseSnapshot>;
  opportunityId: string;
}) {
  if (!snapshot.data && !snapshot.raw) {
    return (
      <div className="rep-pf-block">
        <div className="rep-pf-block-title">
          <span>Frozen opportunity snapshot</span>
        </div>
        <div className="appr-snap-empty">
          No snapshot recorded for this request. Opportunity{" "}
          <span className="mono">{opportunityId.slice(0, 8)}</span>.
        </div>
      </div>
    );
  }

  if (!snapshot.data) {
    return (
      <div className="rep-pf-block">
        <div className="rep-pf-block-title">
          <span>Frozen opportunity snapshot</span>
          <span
            className="mono"
            style={{ color: "var(--muted-2)", letterSpacing: 0, textTransform: "none" }}
          >
            raw
          </span>
        </div>
        <pre className="appr-snap-raw">{snapshot.raw}</pre>
      </div>
    );
  }

  const data = snapshot.data;
  const accountName = data.account?.name ?? data.accountName ?? "—";
  const accountId = data.account?.id ?? data.accountId ?? "—";
  const contactName = data.primaryContactName ?? "—";
  const contactId = data.primaryContactId ?? "—";
  const amount = typeof data.expectedAmount === "number" ? data.expectedAmount : data.amount;
  const currentStage = data.currentStageKey ?? data.stageKey ?? data.stage ?? "—";
  const targetStage = data.targetStageKey ?? "—";
  const status = data.globalStatus ?? data.approvalState ?? "—";
  const ownerName = data.owner?.displayName ?? data.ownerName ?? "—";

  return (
    <div className="rep-pf-block">
      <div className="rep-pf-block-title">
        <span>Frozen opportunity snapshot</span>
        <span className="mono" style={{ color: "var(--muted-2)", letterSpacing: 0, textTransform: "none" }}>
          immutable
        </span>
      </div>
      <div className="appr-snap-grid">
        <div className="appr-snap-cell">
          <div className="l">Opportunity</div>
          <div className="v">
            {data.title ?? "—"}
            <small className="mono">· {opportunityId.slice(0, 8)}</small>
          </div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Account</div>
          <div className="v">
            {accountName}
            {accountId !== "—" ? <small className="mono">· {accountId.slice(0, 8)}</small> : null}
          </div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Primary contact</div>
          <div className="v">
            {contactName}
            {contactId !== "—" ? <small className="mono">· {contactId.slice(0, 8)}</small> : null}
          </div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Amount</div>
          <div className="v num">{formatCurrency(amount)}</div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Current stage</div>
          <div className="v mono" style={{ fontFamily: "ui-monospace, monospace" }}>
            {currentStage}
          </div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Target stage</div>
          <div className="v mono" style={{ fontFamily: "ui-monospace, monospace" }}>
            {targetStage}
          </div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Close date</div>
          <div className="v mono" style={{ fontFamily: "ui-monospace, monospace" }}>
            {formatDate(data.closeDate)}
          </div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Owner</div>
          <div className="v">{ownerName}</div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Snapshot status</div>
          <div className="v mono" style={{ fontFamily: "ui-monospace, monospace" }}>
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// History row
// ─────────────────────────────────────────────────────────────────────────

function HistoryRow({ event }: { event: ApprovalHistoryItem }) {
  const eventLabel = humaniseStatus(event.eventType);
  return (
    <div className="rep-activity-row appr-history-row">
      <div className="appr-history-body">
        <div className="appr-history-title">
          <span>{eventLabel}</span>
          <span className="mono" style={{ color: "var(--muted-2)" }}>
            · {event.actor.displayName}
          </span>
        </div>
        <div className="appr-history-meta">
          {event.fromStatus ? `${humaniseStatus(event.fromStatus)} → ` : ""}
          {humaniseStatus(event.toStatus)}
        </div>
        {event.comment ? <div className="appr-history-comment">{event.comment}</div> : null}
      </div>
      <span className="sub mono" style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
        {formatDateTime(event.createdAt)}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Decision modal
// ─────────────────────────────────────────────────────────────────────────

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
  const accountName = snapshot.data?.account?.name ?? snapshot.data?.accountName ?? "—";
  const amount = typeof snapshot.data?.expectedAmount === "number" ? snapshot.data?.expectedAmount : snapshot.data?.amount;

  return (
    <>
      <div className="rep-scrim" onClick={isSubmitting ? undefined : onClose} />
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
                {detail.submittedBy.displayName} · {formatDateTime(detail.submittedAt)}
              </dd>
              <dt>Policy</dt>
              <dd>
                {detail.policyKey} v{detail.policyVersion}
              </dd>
            </dl>

            <div className="appr-modal-field">
              <label>
                <span>
                  Decision comment <span className="appr-required">*</span>
                </span>
                <span className="mono" style={{ fontSize: "0.66rem", color: "var(--muted)" }}>
                  {comment.length} · min 10 chars
                </span>
              </label>
              <div className={`appr-modal-ctl${showError ? " err" : ""}`}>
                <textarea
                  value={comment}
                  placeholder={config.placeholder}
                  onBlur={onTouch}
                  onChange={(e) => onCommentChange(e.target.value)}
                />
              </div>
              {showError ? (
                <div className="appr-modal-err">
                  <span className="x">!</span>
                  Comment is required (at least 10 characters). Approvers cannot decide silently — this is logged
                  to the audit trail.
                </div>
              ) : null}
              <div className="appr-modal-reasons">
                {config.quickReasons.map((reason) => (
                  <button
                    className="appr-modal-reason"
                    key={reason}
                    onClick={() => {
                      onCommentChange(comment ? `${comment} · ${reason}` : reason);
                      onTouch();
                    }}
                    type="button"
                  >
                    + {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className={`appr-modal-impact appr-modal-impact-${config.bannerKind}`}>
              <span className="mono">{config.bannerLabel}</span>
              {kind === "approve"
                ? "Decision is recorded against the immutable snapshot. If more steps remain, the request advances to the next approver."
                : kind === "reject"
                  ? "The opportunity returns to its prior commercial baseline. Owner is notified. Decision is immutable."
                  : "The request stays open. Owner sees your comment, may revise the underlying record and resubmit."}
            </div>
          </div>
          <div className="foot appr-modal-foot">
            <span className="appr-modal-foothint mono">DECISION AUDITED · COMMENT IMMUTABLE</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="rep-btn" disabled={isSubmitting} onClick={onClose} type="button">
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
