import { useEffect, useState } from "react";
import {
  approveApproval,
  fetchApprovalDetail,
  fetchApprovalInbox,
  rejectApproval,
  sendBackApproval,
} from "../../api/approvals";
import { describeRequestError } from "../../api/session";
import type { ApprovalDetailResponse, ApprovalInboxItem } from "../../types/approvals";
import type { CurrentUser } from "../../types/session";

type ApproverInboxProps = {
  currentUser: CurrentUser;
};

export function ApproverInbox({ currentUser }: ApproverInboxProps) {
  const [items, setItems] = useState<ApprovalInboxItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApprovalDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null);

  const loadInbox = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchApprovalInbox(currentUser.userId);
      setItems(response.items);

      if (!selectedRequestId && response.items.length > 0) {
        setSelectedRequestId(response.items[0].id);
      }
    } catch (error) {
      setItems([]);
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInbox();
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
      setDecisionMessage(null);

      try {
        const response = await fetchApprovalDetail(currentUser.userId, selectedRequestId);

        if (!cancelled) {
          setDetail(response);
        }
      } catch (error) {
        if (!cancelled) {
          setDetail(null);
          setDetailErrorMessage(describeRequestError(error));
        }
      } finally {
        if (!cancelled) {
          setIsDetailLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [currentUser.userId, selectedRequestId]);

  const activeStep = detail?.steps.find((step) => step.status === "active") ?? null;
  const canDecide =
    detail?.status === "pending_step" &&
    activeStep?.approverRoleKey === currentUser.roleKey &&
    !isDeciding;

  const submitDecision = async (decision: "approve" | "reject" | "sendBack") => {
    if (!detail) {
      return;
    }

    const request = { comment: decisionComment.trim() || undefined };

    try {
      setIsDeciding(true);
      setDetailErrorMessage(null);
      setDecisionMessage(null);

      if (decision === "approve") {
        await approveApproval(currentUser.userId, detail.id, request);
        setDecisionMessage("Approval step approved");
      } else if (decision === "reject") {
        await rejectApproval(currentUser.userId, detail.id, request);
        setDecisionMessage("Approval request rejected");
      } else {
        await sendBackApproval(currentUser.userId, detail.id, request);
        setDecisionMessage("Approval request sent back");
      }

      setDecisionComment("");
      const refreshedDetail = await fetchApprovalDetail(currentUser.userId, detail.id);
      setDetail(refreshedDetail);
      await loadInbox();
    } catch (error) {
      setDetailErrorMessage(describeRequestError(error));
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <section className="approval-workspace">
      <div className="workspace-header">
        <div>
          <span>{currentUser.displayName}</span>
          <h2>Approval Inbox</h2>
        </div>
        <div className="workspace-metrics">
          <strong>{items.length}</strong>
          <span>active requests</span>
        </div>
      </div>

      {errorMessage ? <div className="error-box">{errorMessage}</div> : null}
      {isLoading ? <div className="empty-row">Loading approval requests</div> : null}

      <div className="approval-grid">
        <div className="approval-list">
          {items.map((item) => (
            <button
              className={`approval-row${selectedRequestId === item.id ? " selected" : ""}`}
              key={`${item.id}-${item.activeStepId}`}
              onClick={() => setSelectedRequestId(item.id)}
              type="button"
            >
              <div>
                <strong>{item.opportunityTitle}</strong>
                <span>{item.accountName}</span>
                <span>{item.submittedByName}</span>
              </div>
              <div className="record-meta">
                <span>{item.policyKey}</span>
                <span>{item.approverRoleKey}</span>
                <span>{item.activeStepStatus}</span>
              </div>
            </button>
          ))}
          {!isLoading && items.length === 0 ? (
            <div className="empty-row">No active approval requests</div>
          ) : null}
        </div>

        <div className="approval-detail">
          {!selectedRequestId ? <div className="empty-row">Select an approval request</div> : null}
          {isDetailLoading ? <div className="empty-row">Loading approval detail</div> : null}
          {detailErrorMessage ? <div className="error-box">{detailErrorMessage}</div> : null}
          {decisionMessage ? <div className="success-box">{decisionMessage}</div> : null}
          {detail && !isDetailLoading ? (
            <>
              <div className="detail-header">
                <div>
                  <span>{detail.policyKey}</span>
                  <h3>{detail.requestType}</h3>
                </div>
                <div className="detail-badges">
                  <span>{detail.status}</span>
                  <span>v{detail.policyVersion}</span>
                </div>
              </div>

              <dl className="detail-grid approval-detail-grid">
                <div>
                  <dt>Submitted by</dt>
                  <dd>{detail.submittedBy.displayName}</dd>
                </div>
                <div>
                  <dt>Active step</dt>
                  <dd>{activeStep ? activeStep.approverRoleKey : "No active step"}</dd>
                </div>
                <div>
                  <dt>Business justification</dt>
                  <dd>{detail.businessJustification || "No justification provided"}</dd>
                </div>
                <div>
                  <dt>Opportunity</dt>
                  <dd>{detail.opportunityId}</dd>
                </div>
              </dl>

              <div className="approval-steps">
                {detail.steps.map((step) => (
                  <div className="approval-step" key={step.id}>
                    <strong>
                      {step.stepOrder}. {step.approverRoleKey}
                    </strong>
                    <span>{step.status}</span>
                  </div>
                ))}
              </div>

              <div className="action-group">
                <h4>Decision</h4>
                <label>
                  <span>Comment</span>
                  <textarea
                    value={decisionComment}
                    onChange={(event) => setDecisionComment(event.target.value)}
                    disabled={!canDecide}
                  />
                </label>
                <div className="button-row">
                  <button
                    className="primary-button compact-button"
                    disabled={!canDecide}
                    onClick={() => void submitDecision("approve")}
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="secondary-button compact-button"
                    disabled={!canDecide}
                    onClick={() => void submitDecision("sendBack")}
                    type="button"
                  >
                    Send back
                  </button>
                  <button
                    className="danger-button compact-button"
                    disabled={!canDecide}
                    onClick={() => void submitDecision("reject")}
                    type="button"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="approval-history">
                <h4>Recent history</h4>
                {detail.history.slice(0, 6).map((event) => (
                  <div className="history-row" key={event.id}>
                    <strong>{event.eventType}</strong>
                    <span>{event.actor.displayName}</span>
                    <span>{event.comment || event.toStatus}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
