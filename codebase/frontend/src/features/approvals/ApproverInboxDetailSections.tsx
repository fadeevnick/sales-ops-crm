import { useState } from "react";
import type {
  ApprovalDetailResponse,
  ApprovalHistoryItem,
  ApprovalStepItem,
} from "../../types/approvals";
import type { CurrentUser } from "../../types/session";
import {
  SlaPill,
  describeSla,
  formatCurrency,
  formatDate,
  formatDateTime,
  humaniseRequestType,
  humaniseRole,
  humaniseStatus,
  pillKindForStatus,
  type DecisionKind,
  type DetailPreviewProps,
  type SnapshotShape,
} from "./ApproverInboxShared";

export function DetailPreview({
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
  const [tab, setTab] = useState<"details" | "chain" | "history">("details");

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
    if (bannerKind === "locked") return `Currently with ${activeStep ? humaniseRole(activeStep.approverRoleKey) : "another approver"} — read-only for you`;
    if (bannerKind === "yours") return "Pending your decision · this is your active step";
    return "Pending step — no active step assigned";
  })();

  const bannerSub = (() => {
    if (isDecided) return `Resolved at ${formatDateTime(detail.resolvedAt)}`;
    if (detail.status === "sent_back") return "Awaiting submitter to revise the underlying record and resubmit.";
    if (activeStep) return `Active step ${String(activeStep.stepOrder).padStart(2, "0")} · ${humaniseRole(activeStep.approverRoleKey)} · ${describeSla(activeStep.dueAt).label}`;
    return "—";
  })();

  return (
    <>
      <div className="rep-preview-head">
        <div className="rep-preview-id">
          <span>{humaniseRequestType(detail.requestType)}</span>
        </div>
        <div className="rep-preview-title">{snapshot.data?.title ?? "Opportunity snapshot"}</div>
        <div className="rep-preview-acct">
          <span>{snapshot.data?.account?.name ?? snapshot.data?.accountName ?? "—"}</span>
        </div>
      </div>

      <div className={`appr-banner appr-banner-${bannerKind}`}>
        <div className="appr-banner-mark">{bannerKind === "approved" ? "✓" : bannerKind === "rejected" ? "✕" : bannerKind === "locked" ? "🔒" : "!"}</div>
        <div className="appr-banner-body">
          <div className="v">{bannerCopy}</div>
          <div className="s">{bannerSub}</div>
        </div>
        <span className={`rep-pill p-${pillKindForStatus(detail.status)}`}>
          <span className="dot" />
          {humaniseStatus(detail.status)}
        </span>
      </div>

      <div className="appr-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "details"} className={`appr-tab${tab === "details" ? " active" : ""}`} onClick={() => setTab("details")}>
          Details
        </button>
        <button type="button" role="tab" aria-selected={tab === "chain"} className={`appr-tab${tab === "chain" ? " active" : ""}`} onClick={() => setTab("chain")}>
          Chain<span className="ct">{sortedSteps.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "history"} className={`appr-tab${tab === "history" ? " active" : ""}`} onClick={() => setTab("history")}>
          History<span className="ct">{sortedHistory.length}</span>
        </button>
      </div>

      {tab === "details" ? (
        <>
          <div className="rep-preview-grid">
            <div className="rep-pf"><div className="rep-pf-l">Submitted by</div><div className="rep-pf-v">{detail.submittedBy.displayName}</div></div>
            <div className="rep-pf"><div className="rep-pf-l">Submitted at</div><div className="rep-pf-v mono" style={{ fontFamily: "ui-monospace, monospace" }}>{formatDateTime(detail.submittedAt)}</div></div>
            <div className="rep-pf"><div className="rep-pf-l">Policy</div><div className="rep-pf-v mono" style={{ fontFamily: "ui-monospace, monospace" }}>{detail.policyKey} v{detail.policyVersion}</div></div>
            <div className="rep-pf"><div className="rep-pf-l">Decision recorded</div><div className="rep-pf-v mono" style={{ fontFamily: "ui-monospace, monospace" }}>{detail.resolvedAt ? formatDateTime(detail.resolvedAt) : "—"}</div></div>
          </div>

          <SnapshotBlock snapshot={snapshot} opportunityId={detail.opportunityId} />

          <div className="rep-pf-block">
            <div className="rep-pf-block-title">
              <span>Business justification</span>
              <span className="mono" style={{ color: "var(--muted-2)", letterSpacing: 0, textTransform: "none" }}>frozen at submit</span>
            </div>
            <div className="appr-just-body">
              {detail.businessJustification && detail.businessJustification.trim().length > 0 ? detail.businessJustification : "No justification provided."}
            </div>
          </div>
        </>
      ) : null}

      {tab === "chain" ? (
        <div className="appr-chain" style={{ padding: 14 }}>
          {sortedSteps.map((step) => <ChainStep key={step.id} step={step} currentRoleKey={currentUser.roleKey} />)}
          {sortedSteps.length === 0 ? <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>No steps configured.</div> : null}
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="appr-history" style={{ padding: 14 }}>
          {sortedHistory.length === 0 ? <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>No history recorded yet.</div> : null}
          {sortedHistory.map((event) => <HistoryRow key={event.id} event={event} />)}
        </div>
      ) : null}

      <DecisionActions
        detail={detail}
        isDecided={isDecided}
        isLockedForMe={isLockedForMe}
        isMineActive={isMineActive}
        isDeciding={isDeciding}
        currentUser={currentUser}
        onDecide={onDecide}
      />
    </>
  );
}

function ChainStep({ step, currentRoleKey }: { step: ApprovalStepItem; currentRoleKey: string }) {
  const cls =
    step.status === "approved"
      ? "done"
      : step.status === "rejected" || step.status === "sent_back"
        ? "done"
        : step.status === "active"
          ? "cur"
          : "fut";
  const yours = step.approverRoleKey === currentRoleKey;
  return (
    <div className={`appr-chain-step ${cls}${yours ? " mine" : ""}`}>
      <div className="appr-chain-mark">{String(step.stepOrder).padStart(2, "0")}</div>
      <div className="appr-chain-body">
        <div className="nm">
          {humaniseRole(step.approverRoleKey)}
          {yours && step.status === "active" ? <span className="rep-pill p-pending" style={{ marginLeft: 8 }}><span className="dot" />you</span> : null}
          {!yours && step.status === "active" ? <span className="rep-pill" style={{ marginLeft: 8 }}><span className="dot" />locked</span> : null}
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
      <span className={`appr-chain-badge appr-chain-badge-${pillKindForStatus(step.status)}`}>{humaniseStatus(step.status)}</span>
    </div>
  );
}

function DecisionActions({
  detail,
  isDecided,
  isLockedForMe,
  isMineActive,
  isDeciding,
  currentUser,
  onDecide,
}: {
  detail: ApprovalDetailResponse;
  isDecided: boolean;
  isLockedForMe: boolean;
  isMineActive: boolean;
  isDeciding: boolean;
  currentUser: Pick<CurrentUser, "roleKey">;
  onDecide: (kind: DecisionKind) => void;
}) {
  return (
    <div className="rep-preview-actions appr-actions">
      {isDecided ? (
        <>
          <span className="appr-action-hint mono">DECISION RECORDED · IMMUTABLE</span>
          <div className="right"><button className="rep-btn" disabled type="button" title="Decision is immutable">Cannot re-decide</button></div>
        </>
      ) : isLockedForMe ? (
        <>
          <span className="appr-action-hint mono">STEP NOT ASSIGNED TO YOU</span>
          <div className="right"><button className="rep-btn" disabled type="button">Locked</button></div>
        </>
      ) : detail.status === "sent_back" ? (
        <>
          <span className="appr-action-hint mono">SENT BACK · AWAITING SUBMITTER</span>
          <div className="right"><button className="rep-btn" disabled type="button">Waiting on owner</button></div>
        </>
      ) : isMineActive ? (
        <>
          <span className="appr-action-hint mono">YOUR STEP · COMMENT REQUIRED</span>
          <div className="right">
            <button className="rep-btn appr-btn-info" disabled={isDeciding} onClick={() => onDecide("sendBack")} type="button">Send back</button>
            <button className="rep-btn appr-btn-neg" disabled={isDeciding} onClick={() => onDecide("reject")} type="button">Reject</button>
            <button className="rep-btn rep-btn-primary appr-btn-pos" disabled={isDeciding} onClick={() => onDecide("approve")} type="button">Approve</button>
          </div>
        </>
      ) : (
        <>
          <span className="appr-action-hint mono">PENDING · NO ACTIVE STEP FOR YOU</span>
          <div className="right"><button className="rep-btn" disabled type="button">No action available</button></div>
        </>
      )}
    </div>
  );
}

export function SnapshotBlock({
  snapshot,
  opportunityId,
}: {
  snapshot: { data: SnapshotShape | null; raw: string };
  opportunityId: string;
}) {
  if (!snapshot.data && !snapshot.raw) {
    return (
      <div className="rep-pf-block">
        <div className="rep-pf-block-title"><span>Frozen opportunity snapshot</span></div>
        <div className="appr-snap-empty">No snapshot recorded for this request.</div>
      </div>
    );
  }

  if (!snapshot.data) {
    return (
      <div className="rep-pf-block">
        <div className="rep-pf-block-title">
          <span>Frozen opportunity snapshot</span>
          <span className="mono" style={{ color: "var(--muted-2)", letterSpacing: 0, textTransform: "none" }}>raw</span>
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
        <span className="mono" style={{ color: "var(--muted-2)", letterSpacing: 0, textTransform: "none" }}>immutable</span>
      </div>
      <div className="appr-snap-grid">
        <div className="appr-snap-cell"><div className="l">Opportunity</div><div className="v">{data.title ?? "—"}</div></div>
        <div className="appr-snap-cell"><div className="l">Account</div><div className="v">{accountName}</div></div>
        <div className="appr-snap-cell"><div className="l">Primary contact</div><div className="v">{contactName}</div></div>
        <div className="appr-snap-cell"><div className="l">Amount</div><div className="v num">{formatCurrency(amount)}</div></div>
        <div className="appr-snap-cell"><div className="l">Current stage</div><div className="v mono" style={{ fontFamily: "ui-monospace, monospace" }}>{currentStage}</div></div>
        <div className="appr-snap-cell"><div className="l">Target stage</div><div className="v mono" style={{ fontFamily: "ui-monospace, monospace" }}>{targetStage}</div></div>
        <div className="appr-snap-cell"><div className="l">Close date</div><div className="v mono" style={{ fontFamily: "ui-monospace, monospace" }}>{formatDate(data.closeDate)}</div></div>
        <div className="appr-snap-cell"><div className="l">Owner</div><div className="v">{ownerName}</div></div>
        <div className="appr-snap-cell"><div className="l">Snapshot status</div><div className="v mono" style={{ fontFamily: "ui-monospace, monospace" }}>{status}</div></div>
      </div>
    </div>
  );
}

export function HistoryRow({ event }: { event: ApprovalHistoryItem }) {
  const eventLabel = humaniseStatus(event.eventType);
  return (
    <div className="rep-activity-row appr-history-row">
      <div className="appr-history-body">
        <div className="appr-history-title">
          <span>{eventLabel}</span>
          <span className="mono" style={{ color: "var(--muted-2)" }}>· {event.actor.displayName}</span>
        </div>
        <div className="appr-history-meta">
          {event.fromStatus ? `${humaniseStatus(event.fromStatus)} → ` : ""}
          {humaniseStatus(event.toStatus)}
        </div>
        {event.comment ? <div className="appr-history-comment">{event.comment}</div> : null}
      </div>
      <span className="sub mono" style={{ color: "var(--muted)", fontSize: "0.7rem" }}>{formatDateTime(event.createdAt)}</span>
    </div>
  );
}
