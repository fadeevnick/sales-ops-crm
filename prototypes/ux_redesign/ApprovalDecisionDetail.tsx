// ─────────────────────────────────────────────────────────────────────────────
// ApprovalDecisionDetail.tsx — Phase 2.4
// ─────────────────────────────────────────────────────────────────────────────
//
// CAPABILITY AUDIT
// ─────────────────────────────────────────────────────────────────────────────
//
// UNCHANGED
//   API surface:
//     fetchApprovalDetail, approveApproval, rejectApproval, sendBackApproval
//     — all calls preserved, same signatures and request shapes.
//   All displayed data:
//     Request id, policy key + version, request type, current status,
//     opportunity title + id, account name + id, primary contact,
//     submitted by + timestamp, active step (role + assignee + SLA),
//     SLA deadline, decision recorded timestamp (resolvedAt).
//     Frozen opportunity snapshot: title, account, contact, amount,
//     close date, current stage, target stage, owner, snapshot status.
//     Business justification (frozen at submit).
//     Approval chain: all steps in order, each with role, assignee,
//     required/optional, status, SLA, activated + decided timestamps.
//     Decision history: all events with actor, event type, status
//     transition, comment, and timestamp.
//   Decision workflow:
//     Approve / Reject / Send back — all three paths.
//     Comment required (min 10 chars). Quick-reason chips.
//     Effect description for each action. Immutability / audit notice.
//     Submitting state. Toast confirmation. Keyboard: Escape cancels.
//   Role isolation:
//     Only steps where approverRoleKey === currentUser.roleKey are
//     actionable. Locked / decided / sent-back states clearly labelled.
//   Non-decision states:
//     Decided (immutable), Locked (step owned by different role),
//     Sent back (awaiting submitter revision) — all preserved.
//   Refresh capability. Footer ruler. Toast. Error states. Empty states.
//
// MOVED
//   Decision buttons — previously at bottom of scroll area (ApproverInbox
//   preview pane) → inline in left column immediately below state banner,
//   visible above the fold. No modal overlay; inline expansion form.
//   Comment + quick reasons — previously in a modal overlay → inline in
//   the expanded decision form. Same comment requirement and quick-reason
//   chips; surface changes from modal to inline section.
//   Metadata (submitted, policy, step, SLA, resolvedAt) — previously in
//   a 4-cell grid mid-preview → right sidebar MetaBlock.
//   Approval chain — previously mid-preview → right sidebar ChainBlock.
//   Decision history — previously at bottom of preview scroll → right
//   sidebar HistoryBlock, expanded by default, collapsible.
//   Access context — previously full-width accbox banner → single-line
//   role label in page head meta.
//
// DE-EMPHASIZED, NOT REMOVED
//   Policy key + version: sidebar MetaBlock, not a headline element.
//   Decision recorded timestamp: sidebar MetaBlock.
//   Snapshot status field: in snapshot grid, not visually prominent.
//   History: right sidebar; defaults expanded, user can collapse.
//
// BACKEND / API CONSTRAINTS (unchanged from current implementation)
//   No request-level SLA field; step-level dueAt is the SLA proxy.
//   Snapshot is opportunitySnapshotJson (string); parsed defensively.
//   onBack / onOpenOpportunity are optional routing hooks — wire to
//   router at integration point. Absent = buttons rendered disabled.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import {
  approveApproval,
  fetchApprovalDetail,
  rejectApproval,
  sendBackApproval,
} from "../../api/approvals";
import { describeRequestError } from "../../api/session";
import type {
  ApprovalDetailResponse,
  ApprovalHistoryItem,
  ApprovalStepItem,
} from "../../types/approvals";
import type { CurrentUser } from "../../types/session";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ApprovalDecisionDetailProps = {
  currentUser: CurrentUser;
  requestId: string;
  /** Navigate back to the calling surface (inbox, etc.) */
  onBack?: () => void;
  /** Navigate to the full opportunity detail for an opportunity id */
  onOpenOpportunity?: (opportunityId: string) => void;
};

type DecisionKind = "approve" | "reject" | "sendBack";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DECISION_CONFIG: Record<
  DecisionKind,
  {
    label: string;
    intro: string;
    placeholder: string;
    confirmLabel: string;
    effectKind: "approve" | "reject" | "sendBack";
    effectText: string;
    quickReasons: string[];
  }
> = {
  approve: {
    label: "Approve",
    intro: "Approving this request",
    placeholder:
      "e.g. Within policy. Stage progression validated against snapshot — record financial baseline preserved.",
    confirmLabel: "Confirm approval",
    effectKind: "approve",
    effectText:
      "Decision is recorded against the immutable snapshot. If further steps remain, the request advances to the next approver.",
    quickReasons: [
      "Within policy",
      "Snapshot validated",
      "Stage progression aligned",
      "No additional risk",
    ],
  },
  reject: {
    label: "Reject",
    intro: "Rejecting this request",
    placeholder:
      "e.g. Stage progression not aligned with current commercial baseline. Resubmit after the close plan is updated.",
    confirmLabel: "Confirm rejection",
    effectKind: "reject",
    effectText:
      "The opportunity returns to its prior commercial baseline. Owner is notified. Decision is immutable.",
    quickReasons: [
      "Out of policy",
      "Insufficient justification",
      "Snapshot data inconsistent",
      "Risk too high for this stage",
    ],
  },
  sendBack: {
    label: "Send back",
    intro: "Sending back to owner",
    placeholder:
      "e.g. Please attach updated close plan and link the latest customer commitment before resubmitting.",
    confirmLabel: "Send back",
    effectKind: "sendBack",
    effectText:
      "Request stays open. Owner sees your comment, may revise the underlying record and resubmit.",
    quickReasons: [
      "Justification too thin",
      "Missing supporting record",
      "Update the snapshot first",
      "Attach business context",
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot
// ─────────────────────────────────────────────────────────────────────────────

type SnapshotShape = {
  title?: string;
  account?: { name?: string; id?: string };
  accountId?: string;
  accountName?: string;
  primaryContactId?: string | null;
  primaryContactName?: string | null;
  ownerId?: string;
  ownerName?: string;
  owner?: { displayName?: string };
  expectedAmount?: number;
  amount?: number;
  closeDate?: string;
  currentStageKey?: string;
  targetStageKey?: string;
  stageKey?: string;
  stage?: string;
  globalStatus?: string;
  approvalState?: string;
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

function humaniseStatus(s: string): string {
  return s.replace(/_/g, " ");
}

function humaniseRequestType(t: string): string {
  return t.replace(/_/g, " ");
}

function formatDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  return v.replace("T", " ").slice(0, 16);
}

function formatDate(v: string | null | undefined): string {
  if (!v) return "—";
  return v.slice(0, 10);
}

function formatCurrency(v: number | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return v.toLocaleString("en-US", {
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
  if (!value)
    return { label: "No SLA", tone: "none", title: "No due date set" };
  const dueMs = Date.parse(value);
  if (!Number.isFinite(dueMs))
    return { label: "SLA invalid", tone: "warn", title: value };
  const diffMs = dueMs - now;
  const absHours = Math.max(1, Math.round(Math.abs(diffMs) / 3_600_000));
  const dueLabel = formatDateTime(value);
  if (diffMs < 0)
    return {
      label: `Overdue ${absHours}h`,
      tone: "overdue",
      title: `Due ${dueLabel}`,
    };
  if (diffMs <= 24 * 3_600_000)
    return {
      label: `${absHours}h left`,
      tone: "warn",
      title: `Due ${dueLabel}`,
    };
  const days = Math.max(1, Math.round(diffMs / 86_400_000));
  return {
    label: `${days}d left`,
    tone: "ok",
    title: `Due ${dueLabel}`,
  };
}

// Uses base appr-sla-* classes defined in styles.css
function SlaPill({ dueAt }: { dueAt: string | null | undefined }) {
  const sla = describeSla(dueAt);
  return (
    <span
      className={`appr-sla-pill${sla.tone !== "none" ? ` appr-sla-${sla.tone}` : ""}`}
      title={sla.title}
    >
      {sla.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function ApprovalDecisionDetail({
  currentUser,
  requestId,
  onBack,
  onOpenOpportunity,
}: ApprovalDecisionDetailProps) {
  const [detail, setDetail] = useState<ApprovalDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeciding, setIsDeciding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Inline decision form state
  const [decisionKind, setDecisionKind] = useState<DecisionKind | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionTouched, setDecisionTouched] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────

  const loadDetail = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetchApprovalDetail(
        currentUser.userId,
        requestId
      );
      setDetail(response);
    } catch (error) {
      setDetail(null);
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.userId, requestId]);

  // ── Derived ─────────────────────────────────────────────────────────────

  const activeStep: ApprovalStepItem | null =
    detail?.steps.find((s) => s.status === "active") ?? null;

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
  const opportunityTitle = snapshot.data?.title ?? "—";
  const accountName =
    snapshot.data?.account?.name ?? snapshot.data?.accountName ?? "—";

  // ── Decision handlers ───────────────────────────────────────────────────

  const flashToast = (message: string) => {
    setToast(message);
    window.setTimeout(
      () => setToast((c) => (c === message ? null : c)),
      3200
    );
  };

  const selectDecision = (kind: DecisionKind) => {
    if (!isMineActive || isDeciding) return;
    if (decisionKind === kind) {
      // Toggle off
      setDecisionKind(null);
      setDecisionComment("");
      setDecisionTouched(false);
    } else {
      setDecisionKind(kind);
      setDecisionComment("");
      setDecisionTouched(false);
    }
  };

  const cancelDecision = () => {
    if (isDeciding) return;
    setDecisionKind(null);
    setDecisionComment("");
    setDecisionTouched(false);
  };

  // Close inline form on Escape
  useEffect(() => {
    if (!decisionKind) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeciding) cancelDecision();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisionKind, isDeciding]);

  const submitDecision = async () => {
    if (!detail || !decisionKind) return;
    const trimmed = decisionComment.trim();
    setDecisionTouched(true);
    if (trimmed.length < 10) return;
    try {
      setIsDeciding(true);
      setErrorMessage(null);
      const req = { comment: trimmed };
      if (decisionKind === "approve") {
        await approveApproval(currentUser.userId, detail.id, req);
        flashToast(`Approved ${detail.id}`);
      } else if (decisionKind === "reject") {
        await rejectApproval(currentUser.userId, detail.id, req);
        flashToast(`Rejected ${detail.id} · decision is immutable`);
      } else {
        await sendBackApproval(currentUser.userId, detail.id, req);
        flashToast(`Sent back ${detail.id} · owner notified`);
      }
      // Re-load to reflect new state
      const refreshed = await fetchApprovalDetail(
        currentUser.userId,
        detail.id
      );
      setDetail(refreshed);
      setDecisionKind(null);
      setDecisionComment("");
      setDecisionTouched(false);
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsDeciding(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <section className="rep-workspace appr4-workspace">

      {/* ── Page head ── */}
      <div className="appr4-page-head">
        {onBack ? (
          <button
            className="appr4-back-btn"
            onClick={onBack}
            type="button"
          >
            ← Back
          </button>
        ) : null}
        <div className="appr4-head-title">
          <h1>Approval decision</h1>
          <div className="appr4-head-meta">
            <span className="mono" style={{ color: "var(--ink-2)" }}>
              {requestId.slice(0, 8)}
            </span>
            <span className="sep">·</span>
            <span>
              {currentUser.roleName}
            </span>
            <span className="sep">·</span>
            <span>{currentUser.tenantName} · LOCAL PILOT</span>
          </div>
        </div>
        <div className="appr4-head-actions">
          <button
            className="rep-btn"
            disabled={isLoading}
            onClick={() => void loadDetail()}
            type="button"
          >
            {isLoading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {errorMessage ? (
        <div className="appr-error" style={{ margin: "12px 22px 0" }}>
          {errorMessage}
        </div>
      ) : null}

      {/* ── Loading state ── */}
      {isLoading ? (
        <div className="rep-empty" style={{ flex: 1 }}>
          Loading approval detail…
        </div>
      ) : null}

      {/* ── Detail content ── */}
      {detail && !isLoading ? (
        <>
          {/* ── Request summary bar ── */}
          <RequestBar
            accountName={accountName}
            activeStep={activeStep}
            detail={detail}
            opportunityTitle={opportunityTitle}
          />

          {/* ── Two-column body ── */}
          <div className="appr4-body-grid">

            {/* ────────────────────────────────────────────────────────
                LEFT: main decision surface
                ──────────────────────────────────────────────────────── */}
            <div className="appr4-main">

              {/* State banner */}
              <StateBanner
                activeStep={activeStep}
                currentUser={currentUser}
                detail={detail}
                isDecided={isDecided}
                isLockedForMe={isLockedForMe}
                isMineActive={isMineActive}
              />

              {/* Decision zone — inline form when actionable */}
              {isMineActive && !isDecided ? (
                <DecisionZone
                  comment={decisionComment}
                  decisionKind={decisionKind}
                  isDeciding={isDeciding}
                  onCancel={cancelDecision}
                  onCommentChange={(v) => setDecisionComment(v)}
                  onSelectKind={selectDecision}
                  onSubmit={submitDecision}
                  onTouch={() => setDecisionTouched(true)}
                  touched={decisionTouched}
                />
              ) : (
                <StateNote
                  currentUser={currentUser}
                  detail={detail}
                  isDecided={isDecided}
                  isLockedForMe={isLockedForMe}
                />
              )}

              {/* Business justification */}
              <div className="appr4-section">
                <div className="appr4-section-title">
                  <span>Business justification</span>
                  <em>frozen at submit</em>
                </div>
                <div className="appr-just-body">
                  {detail.businessJustification &&
                  detail.businessJustification.trim().length > 0
                    ? detail.businessJustification
                    : "No justification provided."}
                </div>
              </div>

              {/* Frozen snapshot */}
              <SnapshotBlock
                opportunityId={detail.opportunityId}
                snapshot={snapshot}
              />
            </div>

            {/* ────────────────────────────────────────────────────────
                RIGHT: sidebar — chain / metadata / history
                ──────────────────────────────────────────────────────── */}
            <div className="appr4-sidebar">

              {/* Approval chain */}
              <ChainBlock
                currentUser={currentUser}
                detail={detail}
              />

              {/* Request metadata */}
              <MetaBlock
                activeStep={activeStep}
                detail={detail}
              />

              {/* Decision history */}
              <HistoryBlock detail={detail} />

              {/* Open opportunity link */}
              <button
                className="appr4-opp-link"
                disabled={!onOpenOpportunity}
                onClick={
                  onOpenOpportunity
                    ? () => onOpenOpportunity(detail.opportunityId)
                    : undefined
                }
                title={
                  onOpenOpportunity
                    ? "Open the linked opportunity"
                    : "Navigation not wired in this context"
                }
                type="button"
              >
                View opportunity{" "}
                <span className="mono" style={{ fontSize: "10px" }}>
                  {detail.opportunityId.slice(0, 8)}
                </span>
                {" "}→
              </button>
            </div>
          </div>
        </>
      ) : null}

      {/* ── Footer ruler ── */}
      <div className="rep-foot-ruler">
        <span>
          SALES OPS CRM · {currentUser.tenantName.toUpperCase()} · LOCAL PILOT
        </span>
        <span>
          USER {currentUser.roleKey.toUpperCase()} · {currentUser.displayName}{" "}
          · APPROVER SCOPE
        </span>
        <span>DECISIONS IMMUTABLE · AUDIT TRAIL ACTIVE</span>
      </div>

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
// RequestBar — compact summary strip
// ─────────────────────────────────────────────────────────────────────────────

function RequestBar({
  detail,
  opportunityTitle,
  accountName,
  activeStep,
}: {
  detail: ApprovalDetailResponse;
  opportunityTitle: string;
  accountName: string;
  activeStep: ApprovalStepItem | null;
}) {
  const sla = describeSla(activeStep?.dueAt);
  return (
    <div className="appr4-request-bar">
      <div className="appr4-rb-item">
        <div className="appr4-rb-l">Request</div>
        <div className="appr4-rb-v mono-val">{detail.id.slice(0, 8)}</div>
      </div>
      <div className="appr4-rb-item">
        <div className="appr4-rb-l">Type</div>
        <div className="appr4-rb-v">{humaniseRequestType(detail.requestType)}</div>
      </div>
      <div className="appr4-rb-item">
        <div className="appr4-rb-l">Status</div>
        <div className="appr4-rb-v">
          <span className={`rep-pill p-${pillKindForStatus(detail.status)}`}>
            <span className="dot" />
            {humaniseStatus(detail.status)}
          </span>
        </div>
      </div>
      <div className="appr4-rb-item grow">
        <div className="appr4-rb-l">Opportunity</div>
        <div className="appr4-rb-v">{opportunityTitle}</div>
      </div>
      <div className="appr4-rb-item">
        <div className="appr4-rb-l">Account</div>
        <div className="appr4-rb-v">{accountName}</div>
      </div>
      <div className="appr4-rb-item">
        <div className="appr4-rb-l">Submitted by</div>
        <div className="appr4-rb-v">{detail.submittedBy.displayName}</div>
      </div>
      <div className="appr4-rb-item">
        <div className="appr4-rb-l">Submitted at</div>
        <div className="appr4-rb-v mono-val" style={{ fontSize: "11.5px" }}>
          {formatDateTime(detail.submittedAt)}
        </div>
      </div>
      <div className="appr4-rb-item">
        <div className="appr4-rb-l">SLA</div>
        <div className="appr4-rb-v">
          <span
            className={`appr-sla-pill${sla.tone !== "none" ? ` appr-sla-${sla.tone}` : ""}`}
            title={sla.title}
          >
            {sla.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StateBanner — current state display at top of left column
// ─────────────────────────────────────────────────────────────────────────────

function StateBanner({
  detail,
  activeStep,
  isMineActive,
  isLockedForMe,
  isDecided,
  currentUser,
}: {
  detail: ApprovalDetailResponse;
  activeStep: ApprovalStepItem | null;
  isMineActive: boolean;
  isLockedForMe: boolean;
  isDecided: boolean;
  currentUser: CurrentUser;
}) {
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

  const mark =
    bannerKind === "approved"
      ? "✓"
      : bannerKind === "rejected"
        ? "✕"
        : bannerKind === "yours"
          ? "!"
          : "·";

  const headline = (() => {
    if (bannerKind === "approved") return "Approved · decision is immutable";
    if (bannerKind === "rejected") return "Rejected · decision is immutable";
    if (bannerKind === "sentback")
      return "Sent back to owner — awaiting revision and resubmission";
    if (bannerKind === "locked")
      return `With ${activeStep?.approverRoleKey ?? "another approver"} — read-only for ${currentUser.roleKey}`;
    if (bannerKind === "yours")
      return `Pending your decision · step assigned to ${currentUser.roleKey}`;
    return "Pending — no active step currently assigned to you";
  })();

  const sub = (() => {
    if (isDecided) return `Resolved ${formatDateTime(detail.resolvedAt)}`;
    if (detail.status === "sent_back")
      return "Owner must revise the underlying record and resubmit.";
    if (activeStep)
      return `Step ${String(activeStep.stepOrder).padStart(2, "0")} · ${activeStep.approverRoleKey} · ${describeSla(activeStep.dueAt).label}`;
    return "";
  })();

  return (
    <div className={`appr4-state-banner appr4-state-${bannerKind}`}>
      <div className="appr4-state-mk">{mark}</div>
      <div className="appr4-state-copy">
        <div className="appr4-state-eyebrow">
          {humaniseStatus(detail.status)}
        </div>
        <div className="appr4-state-headline">{headline}</div>
        {sub ? <div className="appr4-state-sub">{sub}</div> : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StateNote — read-only state for non-actionable requests
// ─────────────────────────────────────────────────────────────────────────────

function StateNote({
  detail,
  isLockedForMe,
  isDecided,
  currentUser,
}: {
  detail: ApprovalDetailResponse;
  isLockedForMe: boolean;
  isDecided: boolean;
  currentUser: CurrentUser;
}) {
  if (isDecided) {
    return (
      <div className="appr4-state-note">
        <span className="lbl">DECISION RECORDED · IMMUTABLE</span>
        <span>This approval has been resolved. No further action is possible.</span>
      </div>
    );
  }
  if (isLockedForMe) {
    return (
      <div className="appr4-state-note">
        <span className="lbl">
          LOCKED — NOT ASSIGNED TO {currentUser.roleKey.toUpperCase()}
        </span>
        <span>
          This step is with another approver. The decision surface is
          read-only for you.
        </span>
      </div>
    );
  }
  if (detail.status === "sent_back") {
    return (
      <div className="appr4-state-note">
        <span className="lbl">SENT BACK · AWAITING SUBMITTER</span>
        <span>
          Owner must revise and resubmit before this can be acted on.
        </span>
      </div>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DecisionZone — inline decision form (no modal)
// ─────────────────────────────────────────────────────────────────────────────

type DecisionZoneProps = {
  decisionKind: DecisionKind | null;
  comment: string;
  touched: boolean;
  isDeciding: boolean;
  onSelectKind: (kind: DecisionKind) => void;
  onCommentChange: (value: string) => void;
  onTouch: () => void;
  onCancel: () => void;
  onSubmit: () => void;
};

function DecisionZone({
  decisionKind,
  comment,
  touched,
  isDeciding,
  onSelectKind,
  onCommentChange,
  onTouch,
  onCancel,
  onSubmit,
}: DecisionZoneProps) {
  const config = decisionKind ? DECISION_CONFIG[decisionKind] : null;
  const commentShort = comment.trim().length < 10;
  const showErr = touched && commentShort;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus the textarea when a kind is selected
  useEffect(() => {
    if (decisionKind && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [decisionKind]);

  return (
    <div className="appr4-decision-zone">
      {/* Hint + button row */}
      <div className="appr4-dz-header">
        <span className="appr4-dz-hint">YOUR STEP · SELECT A DECISION</span>
      </div>

      <div className="appr4-dz-btn-row">
        {(["sendBack", "reject", "approve"] as DecisionKind[]).map(
          (kind) => {
            const cfg = DECISION_CONFIG[kind];
            const selClass =
              decisionKind === kind
                ? kind === "approve"
                  ? " sel-approve"
                  : kind === "reject"
                    ? " sel-reject"
                    : " sel-sendBack"
                : "";
            return (
              <button
                className={`appr4-dz-mode-btn${selClass}`}
                disabled={isDeciding}
                key={kind}
                onClick={() => onSelectKind(kind)}
                type="button"
              >
                <span className="dz-mark">
                  {kind === "approve" ? "✓" : kind === "reject" ? "✕" : "↩"}
                </span>
                {cfg.label}
              </button>
            );
          }
        )}
      </div>

      {/* Expanded form — shown when a kind is selected */}
      {config && decisionKind ? (
        <div className="appr4-dz-form">
          <div className="appr4-dz-form-title">
            <span>{config.intro}</span>
          </div>

          {/* Effect description */}
          <div
            className={`appr4-dz-effect appr4-dz-effect-${config.effectKind}`}
          >
            {config.effectText}
          </div>

          {/* Comment field */}
          <div className="appr4-dz-field">
            <div className="appr4-dz-field-label">
              <span>
                Decision comment
                <span className="appr4-required">*</span>
              </span>
              <span className="count">
                {comment.length} · min 10 chars
              </span>
            </div>
            <div
              className={`appr4-dz-textarea-wrap${showErr ? " err" : ""}`}
            >
              <textarea
                onBlur={onTouch}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder={config.placeholder}
                ref={textareaRef}
                value={comment}
              />
            </div>
            {showErr ? (
              <div className="appr4-dz-field-err">
                <span className="x">!</span>
                Comment required (min 10 chars) — decisions are audited and
                immutable.
              </div>
            ) : null}
          </div>

          {/* Quick reasons */}
          <div className="appr4-dz-reasons">
            {config.quickReasons.map((reason) => (
              <button
                className="appr4-dz-reason"
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

          {/* Confirm row */}
          <div className="appr4-dz-confirm-row">
            <span className="appr4-dz-audit-note">
              DECISION AUDITED · COMMENT IMMUTABLE
            </span>
            <button
              className="rep-btn rep-btn-ghost"
              disabled={isDeciding}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`rep-btn rep-btn-primary${
                decisionKind === "approve"
                  ? " appr-btn-pos"
                  : decisionKind === "reject"
                    ? " appr-btn-neg"
                    : " appr-btn-info"
              }`}
              disabled={isDeciding}
              onClick={onSubmit}
              type="button"
            >
              {isDeciding ? "Submitting…" : config.confirmLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SnapshotBlock — frozen opportunity snapshot (left column)
// Uses base appr-snap-grid / appr-snap-cell / .l / .v from styles.css
// ─────────────────────────────────────────────────────────────────────────────

function SnapshotBlock({
  snapshot,
  opportunityId,
}: {
  snapshot: ReturnType<typeof parseSnapshot>;
  opportunityId: string;
}) {
  if (!snapshot.data && !snapshot.raw) {
    return (
      <div className="appr4-section">
        <div className="appr4-section-title">
          <span>Opportunity snapshot</span>
        </div>
        <div className="appr-snap-empty">
          No snapshot recorded.{" "}
          <span className="mono">{opportunityId.slice(0, 8)}</span>
        </div>
      </div>
    );
  }

  if (!snapshot.data) {
    return (
      <div className="appr4-section">
        <div className="appr4-section-title">
          <span>Opportunity snapshot</span>
          <em>raw · parse error</em>
        </div>
        <pre className="appr-snap-raw">{snapshot.raw}</pre>
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
    <div className="appr4-section appr4-section-snap">
      <div className="appr4-section-title">
        <span>Opportunity snapshot</span>
        <em>immutable · frozen at submit</em>
      </div>
      <div className="appr-snap-grid">
        <div className="appr-snap-cell">
          <div className="l">Opportunity</div>
          <div className="v">
            {d.title ?? "—"}
            <small className="mono">· {opportunityId.slice(0, 8)}</small>
          </div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Account</div>
          <div className="v">
            {accountName}
            {accountId ? (
              <small className="mono">· {accountId.slice(0, 8)}</small>
            ) : null}
          </div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Amount</div>
          <div className="v num">{formatCurrency(amount)}</div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Close date</div>
          <div className="v">
            <span className="mono">{formatDate(d.closeDate)}</span>
          </div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Current stage</div>
          <div className="v">
            <span className="mono">{currentStage}</span>
          </div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Target stage</div>
          <div className="v">
            <span className="mono">{targetStage}</span>
          </div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Owner</div>
          <div className="v">{ownerName}</div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Primary contact</div>
          <div className="v">{contactName}</div>
        </div>
        <div className="appr-snap-cell">
          <div className="l">Snapshot status</div>
          <div className="v">
            <span className="mono">{snapshotStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChainBlock — approval routing chain (right sidebar)
// Uses base appr-chain / appr-chain-step / appr-chain-mark / appr-chain-body /
// appr-chain-badge-* from styles.css
// ─────────────────────────────────────────────────────────────────────────────

function ChainBlock({
  detail,
  currentUser,
}: {
  detail: ApprovalDetailResponse;
  currentUser: CurrentUser;
}) {
  const sortedSteps = [...detail.steps].sort(
    (a, b) => a.stepOrder - b.stepOrder
  );

  return (
    <div className="appr4-sidebar-block">
      <div className="appr4-sidebar-block-head">
        <div className="appr4-sidebar-block-title">
          Approval chain
          <em>
            {sortedSteps.length} step
            {sortedSteps.length === 1 ? "" : "s"} · {detail.policyKey} v
            {detail.policyVersion}
          </em>
        </div>
      </div>
      <div className="appr4-sidebar-block-body">
        <div className="appr-chain">
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
            const mineClass = yours && step.status === "active" ? " mine" : "";
            const badgeCls =
              step.status === "approved"
                ? "appr-chain-badge-approved"
                : step.status === "pending" || step.status === "active"
                  ? "appr-chain-badge-pending"
                  : step.status === "rejected"
                    ? "appr-chain-badge-rejected"
                    : step.status === "sent_back"
                      ? "appr-chain-badge-sent_back"
                      : "";
            return (
              <div
                className={`appr-chain-step ${cls}${mineClass}`}
                key={step.id}
              >
                <div className="appr-chain-mark">
                  {String(step.stepOrder).padStart(2, "0")}
                </div>
                <div className="appr-chain-body">
                  <div className="nm">
                    {step.approverRoleKey}
                    {yours && step.status === "active" ? (
                      <span
                        className="rep-pill p-pending"
                        style={{ fontSize: "10px", marginLeft: 6 }}
                      >
                        <span className="dot" />
                        you
                      </span>
                    ) : null}
                  </div>
                  <div className="who">
                    {step.assignedApprover?.displayName ?? "Unassigned"}
                    {step.decidedAt
                      ? ` · ${formatDateTime(step.decidedAt)}`
                      : ""}
                  </div>
                  <div className="sla">
                    {step.isRequired ? "required" : "optional"}
                    {step.dueAt ? (
                      <SlaPill dueAt={step.dueAt} />
                    ) : null}
                  </div>
                </div>
                <span className={`appr-chain-badge ${badgeCls}`}>
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MetaBlock — request metadata grid (right sidebar)
// ─────────────────────────────────────────────────────────────────────────────

function MetaBlock({
  detail,
  activeStep,
}: {
  detail: ApprovalDetailResponse;
  activeStep: ApprovalStepItem | null;
}) {
  return (
    <div className="appr4-sidebar-block">
      <div className="appr4-sidebar-block-head">
        <div className="appr4-sidebar-block-title">Request metadata</div>
      </div>
      <div className="appr4-meta-grid">
        <div className="appr4-meta-cell">
          <div className="appr4-meta-l">Submitted by</div>
          <div className="appr4-meta-v">{detail.submittedBy.displayName}</div>
        </div>
        <div className="appr4-meta-cell">
          <div className="appr4-meta-l">Submitted at</div>
          <div className="appr4-meta-v mono-val">
            {formatDateTime(detail.submittedAt)}
          </div>
        </div>
        <div className="appr4-meta-cell">
          <div className="appr4-meta-l">Policy</div>
          <div className="appr4-meta-v mono-val">
            {detail.policyKey}{" "}
            <small>v{detail.policyVersion}</small>
          </div>
        </div>
        <div className="appr4-meta-cell">
          <div className="appr4-meta-l">Request type</div>
          <div className="appr4-meta-v">
            {humaniseRequestType(detail.requestType)}
          </div>
        </div>
        <div className="appr4-meta-cell">
          <div className="appr4-meta-l">Active step</div>
          <div className="appr4-meta-v">
            {activeStep ? (
              <>
                <span className="mono-val">
                  {String(activeStep.stepOrder).padStart(2, "0")}
                </span>
                <span>{activeStep.approverRoleKey}</span>
              </>
            ) : (
              <span style={{ color: "var(--muted)" }}>—</span>
            )}
          </div>
        </div>
        <div className="appr4-meta-cell">
          <div className="appr4-meta-l">SLA deadline</div>
          <div className="appr4-meta-v">
            {activeStep?.dueAt ? (
              <SlaPill dueAt={activeStep.dueAt} />
            ) : (
              <span style={{ color: "var(--muted)" }}>No SLA</span>
            )}
          </div>
        </div>
        {detail.resolvedAt ? (
          <div className="appr4-meta-cell full">
            <div className="appr4-meta-l">Decision recorded</div>
            <div className="appr4-meta-v mono-val">
              {formatDateTime(detail.resolvedAt)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HistoryBlock — decision history / audit log (right sidebar, collapsible)
// Uses base appr-history / rep-activity-row / appr-history-row from styles.css
// ─────────────────────────────────────────────────────────────────────────────

function HistoryBlock({ detail }: { detail: ApprovalDetailResponse }) {
  const sortedHistory = [...detail.history].sort((a, b) =>
    b.createdAt > a.createdAt ? 1 : -1
  );
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="appr4-sidebar-block">
      <div className="appr4-sidebar-block-head">
        <div className="appr4-sidebar-block-title">
          Decision history
          <em>
            {sortedHistory.length} event
            {sortedHistory.length === 1 ? "" : "s"} · audit
          </em>
        </div>
        <button
          className="appr4-sidebar-toggle"
          onClick={() => setExpanded((v) => !v)}
          type="button"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>
      {expanded ? (
        <div className="appr4-sidebar-block-body">
          <div className="appr-history">
            {sortedHistory.length === 0 ? (
              <div style={{ fontSize: "0.77rem", color: "var(--muted)" }}>
                No history recorded yet.
              </div>
            ) : null}
            {sortedHistory.map((event) => (
              <HistoryRow event={event} key={event.id} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HistoryRow
// Uses base rep-activity-row / appr-history-row / appr-history-body etc.
// ─────────────────────────────────────────────────────────────────────────────

function HistoryRow({ event }: { event: ApprovalHistoryItem }) {
  return (
    <div className="rep-activity-row appr-history-row">
      <div className="appr-history-body">
        <div className="appr-history-title">
          <span>{humaniseStatus(event.eventType)}</span>
          <span
            className="mono"
            style={{ color: "var(--muted-2)", fontSize: "0.74rem" }}
          >
            · {event.actor.displayName}
          </span>
        </div>
        <div className="appr-history-meta">
          {event.fromStatus
            ? `${humaniseStatus(event.fromStatus)} → `
            : ""}
          {humaniseStatus(event.toStatus)}
        </div>
        {event.comment ? (
          <div className="appr-history-comment">{event.comment}</div>
        ) : null}
      </div>
      <span
        className="sub mono"
        style={{ color: "var(--muted)", fontSize: "0.7rem" }}
      >
        {formatDateTime(event.createdAt)}
      </span>
    </div>
  );
}
