import { useModalChrome } from "../../hooks/useModalChrome";
import {
  DECISION_CONFIG,
  formatCurrency,
  formatDateTime,
  humaniseRequestType,
  type DecisionModalProps,
} from "./ApproverInboxShared";

export function DecisionModal({
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

  useModalChrome(onClose, { disabled: isSubmitting });

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
          </div>
          <div className="body">
            <dl className="rep-snap">
              <dt>Opportunity</dt><dd>{opportunityTitle}</dd>
              <dt>Account</dt><dd>{accountName}</dd>
              <dt>Type</dt><dd>{humaniseRequestType(detail.requestType)}</dd>
              <dt>Amount</dt><dd>{formatCurrency(amount)}</dd>
              <dt>Submitted</dt><dd>{detail.submittedBy.displayName} · {formatDateTime(detail.submittedAt)}</dd>
              <dt>Policy</dt><dd>{detail.policyKey} v{detail.policyVersion}</dd>
            </dl>

            <div className="appr-modal-field">
              <label>
                <span>Decision comment <span className="appr-required">*</span></span>
                <span className="mono" style={{ fontSize: "0.66rem", color: "var(--muted)" }}>{comment.length} · min 10 chars</span>
              </label>
              <div className={`appr-modal-ctl${showError ? " err" : ""}`}>
                <textarea value={comment} placeholder={config.placeholder} onBlur={onTouch} onChange={(e) => onCommentChange(e.target.value)} />
              </div>
              {showError ? (
                <div className="appr-modal-err">
                  <span className="x">!</span>
                  Comment is required (at least 10 characters). Approvers cannot decide silently — this is logged to the audit trail.
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
              <button className="rep-btn" disabled={isSubmitting} onClick={onClose} type="button">Cancel</button>
              <button className={`rep-btn rep-btn-primary ${config.confirmCls}`} disabled={isSubmitting} onClick={onConfirm} type="button">
                {isSubmitting ? "Submitting…" : config.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
