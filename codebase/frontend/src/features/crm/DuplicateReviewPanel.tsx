import { useEffect, useState } from "react";
import {
  fetchDuplicateCandidates,
  generateDuplicateCandidates,
  mergeAccountDuplicateCandidate,
  mergeContactDuplicateCandidate,
  rejectDuplicateCandidate,
} from "../../api/duplicateCandidates";
import { describeRequestError } from "../../api/session";
import type { DuplicateCandidateEntityType, DuplicateCandidateItem } from "../../types/duplicateCandidates";
import type { CurrentUser } from "../../types/session";

type DuplicateReviewPanelProps = {
  currentUser: CurrentUser;
};

export function DuplicateReviewPanel({ currentUser }: DuplicateReviewPanelProps) {
  const [entityType, setEntityType] = useState<DuplicateCandidateEntityType>("account");
  const [candidates, setCandidates] = useState<DuplicateCandidateItem[]>([]);
  const [masterSelections, setMasterSelections] = useState<Record<string, string>>({});
  const [mergeReasons, setMergeReasons] = useState<Record<string, string>>({});
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void refreshCandidates({ silent: true });
  }, [entityType]);

  const refreshCandidates = async (options: { silent?: boolean } = {}) => {
    try {
      if (!options.silent) {
        setIsSubmitting(true);
        setErrorMessage(null);
        setMessage(null);
      }
      const response = await fetchDuplicateCandidates(currentUser.userId, {
        entityType,
        limit: 100,
        status: "open",
      });
      setCandidates(response.candidates);
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      if (!options.silent) {
        setIsSubmitting(false);
      }
    }
  };

  const handleGenerate = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      const response = await generateDuplicateCandidates(currentUser.userId, {
        entityType,
        limit: 100,
      });
      setCandidates(response.candidates.filter((candidate) => candidate.entityType === entityType));
      setMessage(`${response.generatedCount} candidates generated`);
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (candidate: DuplicateCandidateItem) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      const reviewReason = reviewReasons[candidate.id]?.trim() || "False positive";
      await rejectDuplicateCandidate(currentUser.userId, candidate.id, { reviewReason });
      setCandidates((current) => current.filter((item) => item.id !== candidate.id));
      setReviewReasons((current) => {
        const next = { ...current };
        delete next[candidate.id];
        return next;
      });
      setMessage("Duplicate candidate rejected");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMerge = async (candidate: DuplicateCandidateItem) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      const masterRecordId = masterSelections[candidate.id] ?? candidate.leftRecordId;
      const mergeReason = mergeReasons[candidate.id]?.trim() || "Duplicate merge";
      const response =
        candidate.entityType === "account"
          ? await mergeAccountDuplicateCandidate(currentUser.userId, candidate.id, { masterRecordId, mergeReason })
          : await mergeContactDuplicateCandidate(currentUser.userId, candidate.id, { masterRecordId, mergeReason });

      setCandidates((current) => current.filter((item) => item.id !== candidate.id));
      setMasterSelections((current) => {
        const next = { ...current };
        delete next[candidate.id];
        return next;
      });
      setMergeReasons((current) => {
        const next = { ...current };
        delete next[candidate.id];
        return next;
      });
      setMessage(formatMergeMessage(response));
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="crm-section duplicate-review-section">
      <div className="section-heading">
        <h3>Duplicate Review</h3>
        <span>RevOps</span>
      </div>

      {errorMessage ? <div className="error-box">{errorMessage}</div> : null}
      {message ? <div className="success-box">{message}</div> : null}

      <div className="action-group">
        <label>
          <span>Entity</span>
          <select
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value as DuplicateCandidateEntityType);
              setMessage(null);
              setErrorMessage(null);
            }}
          >
            <option value="account">Account</option>
            <option value="contact">Contact</option>
          </select>
        </label>

        <div className="button-row">
          <button
            className="primary-button compact-button"
            disabled={isSubmitting}
            onClick={handleGenerate}
            type="button"
          >
            Generate
          </button>
          <button
            className="secondary-button compact-button"
            disabled={isSubmitting}
            onClick={() => void refreshCandidates()}
            type="button"
          >
            Refresh
          </button>
        </div>

        <div className="job-summary">
          <strong>{candidates.length} open</strong>
          <span>{entityType}</span>
        </div>

        {candidates.length ? (
          <div className="duplicate-candidate-list">
            {candidates.map((candidate) => (
              <div className="duplicate-candidate-row" key={candidate.id}>
                <div className="duplicate-candidate-main">
                  <strong>{candidate.reasonSummary}</strong>
                  <span>{candidate.leftRecordLabel}</span>
                  <span>{candidate.rightRecordLabel}</span>
                </div>
                <div className="duplicate-candidate-meta">
                  <strong>{candidate.matchScore}</strong>
                  <span>{candidate.id}</span>
                </div>
                <label>
                  <span>Master record</span>
                  <select
                    value={masterSelections[candidate.id] ?? candidate.leftRecordId}
                    onChange={(event) =>
                      setMasterSelections((current) => ({
                        ...current,
                        [candidate.id]: event.target.value,
                      }))
                    }
                  >
                    <option value={candidate.leftRecordId}>{candidate.leftRecordLabel}</option>
                    <option value={candidate.rightRecordId}>{candidate.rightRecordLabel}</option>
                  </select>
                </label>
                <label>
                  <span>Merge reason</span>
                  <input
                    value={mergeReasons[candidate.id] ?? ""}
                    onChange={(event) =>
                      setMergeReasons((current) => ({
                        ...current,
                        [candidate.id]: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Reject reason</span>
                  <input
                    value={reviewReasons[candidate.id] ?? ""}
                    onChange={(event) =>
                      setReviewReasons((current) => ({
                        ...current,
                        [candidate.id]: event.target.value,
                      }))
                    }
                  />
                </label>
                <button
                  className="primary-button compact-button"
                  disabled={isSubmitting}
                  onClick={() => void handleMerge(candidate)}
                  type="button"
                >
                  Merge
                </button>
                <button
                  className="danger-button compact-button"
                  disabled={isSubmitting}
                  onClick={() => void handleReject(candidate)}
                  type="button"
                >
                  Reject
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-row">No open duplicate candidates</div>
        )}
      </div>
    </section>
  );
}

function formatMergeMessage(
  response:
    | Awaited<ReturnType<typeof mergeAccountDuplicateCandidate>>
    | Awaited<ReturnType<typeof mergeContactDuplicateCandidate>>,
): string {
  if ("reassignedContacts" in response) {
    return `Merged: ${response.reassignedContacts} contacts, ${response.reassignedOpportunities} opportunities reassigned`;
  }

  return `Merged: ${response.reassignedPrimaryContactOpportunities} primary-contact opportunities reassigned`;
}
