import { useEffect, useMemo, useState } from "react";
import {
  fetchDuplicateCandidates,
  generateDuplicateCandidates,
  mergeAccountDuplicateCandidate,
  mergeContactDuplicateCandidate,
  rejectDuplicateCandidate,
} from "../../api/duplicateCandidates";
import { describeRequestError } from "../../api/session";
import type { DuplicateCandidateItem } from "../../types/duplicateCandidates";
import type { CurrentUser } from "../../types/session";
import {
  DuplicateActionPanel,
  DuplicateComparisonPanel,
  DuplicateQueuePanel,
} from "./DuplicateReviewSections";
import { type QueueFilter } from "./DuplicateReviewShared";

type DuplicateReviewPanelProps = {
  currentUser: CurrentUser;
};

export function DuplicateReviewPanel({ currentUser }: DuplicateReviewPanelProps) {
  const [candidates, setCandidates] = useState<DuplicateCandidateItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [masterSelections, setMasterSelections] = useState<Record<string, string>>({});
  const [mergeReasons, setMergeReasons] = useState<Record<string, string>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [deferredIds, setDeferredIds] = useState<Record<string, true>>({});
  const [resolvedCounts, setResolvedCounts] = useState({ merged: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (nextMessage: string) => {
    setToast(nextMessage);
    window.setTimeout(() => {
      setToast((current) => (current === nextMessage ? null : current));
    }, 2800);
  };

  const loadCandidates = async (options: { silent?: boolean } = {}) => {
    try {
      if (!options.silent) {
        setIsLoading(true);
        setErrorMessage(null);
        setMessage(null);
      }

      const [accountResponse, contactResponse] = await Promise.all([
        fetchDuplicateCandidates(currentUser.userId, { entityType: "account", limit: 100, status: "open" }),
        fetchDuplicateCandidates(currentUser.userId, { entityType: "contact", limit: 100, status: "open" }),
      ]);

      const nextCandidates = [...accountResponse.candidates, ...contactResponse.candidates].sort(
        (a, b) => Number(b.matchScore) - Number(a.matchScore) || b.generatedAt.localeCompare(a.generatedAt),
      );
      setCandidates(nextCandidates);
      setSelectedId((current) => {
        if (current && nextCandidates.some((candidate) => candidate.id === current)) {
          return current;
        }
        return nextCandidates[0]?.id ?? null;
      });
    } catch (error) {
      setErrorMessage(describeRequestError(error));
      setCandidates([]);
      setSelectedId(null);
    } finally {
      if (!options.silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadCandidates();
  }, [currentUser.userId]);

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return candidates.filter((candidate) => {
      const isDeferred = Boolean(deferredIds[candidate.id]);
      if (queueFilter === "high" && (isDeferred || Number(candidate.matchScore) < 0.85)) {
        return false;
      }
      if (queueFilter === "account" && candidate.entityType !== "account") {
        return false;
      }
      if (queueFilter === "contact" && candidate.entityType !== "contact") {
        return false;
      }
      if (queueFilter === "needs" && !(Number(candidate.matchScore) < 0.85 || isDeferred)) {
        return false;
      }
      if (queueFilter === "deferred" && !isDeferred) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        candidate.id,
        candidate.leftRecordId,
        candidate.leftRecordLabel,
        candidate.rightRecordId,
        candidate.rightRecordLabel,
        candidate.reasonSummary,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [candidates, deferredIds, queueFilter, searchQuery]);

  useEffect(() => {
    if (!filteredCandidates.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredCandidates.some((candidate) => candidate.id === selectedId)) {
      setSelectedId(filteredCandidates[0].id);
    }
  }, [filteredCandidates, selectedId]);

  const selectedCandidate = filteredCandidates.find((candidate) => candidate.id === selectedId) ?? filteredCandidates[0] ?? null;
  const isSelectedDeferred = selectedCandidate ? Boolean(deferredIds[selectedCandidate.id]) : false;

  const counts = useMemo(() => {
    const open = candidates.length;
    return {
      account: candidates.filter((candidate) => candidate.entityType === "account").length,
      contact: candidates.filter((candidate) => candidate.entityType === "contact").length,
      deferred: Object.keys(deferredIds).length,
      high: candidates.filter((candidate) => Number(candidate.matchScore) >= 0.85 && !deferredIds[candidate.id]).length,
      low: candidates.filter((candidate) => Number(candidate.matchScore) < 0.85 || deferredIds[candidate.id]).length,
      open,
    };
  }, [candidates, deferredIds]);

  const handleGenerate = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      const [accountResponse, contactResponse] = await Promise.all([
        generateDuplicateCandidates(currentUser.userId, { entityType: "account", limit: 100 }),
        generateDuplicateCandidates(currentUser.userId, { entityType: "contact", limit: 100 }),
      ]);
      setMessage(`${accountResponse.generatedCount + contactResponse.generatedCount} candidates generated`);
      await loadCandidates({ silent: true });
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeCandidate = (candidateId: string) => {
    setCandidates((current) => current.filter((candidate) => candidate.id !== candidateId));
    setDeferredIds((current) => {
      const next = { ...current };
      delete next[candidateId];
      return next;
    });
    setMasterSelections((current) => {
      const next = { ...current };
      delete next[candidateId];
      return next;
    });
    setMergeReasons((current) => {
      const next = { ...current };
      delete next[candidateId];
      return next;
    });
    setRejectReasons((current) => {
      const next = { ...current };
      delete next[candidateId];
      return next;
    });
  };

  const handleReject = async (candidate: DuplicateCandidateItem) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      const reviewReason = rejectReasons[candidate.id]?.trim() || "False positive";
      await rejectDuplicateCandidate(currentUser.userId, candidate.id, { reviewReason });
      removeCandidate(candidate.id);
      setResolvedCounts((current) => ({ ...current, rejected: current.rejected + 1 }));
      setMessage(`Rejected ${candidate.leftRecordLabel} ↔ ${candidate.rightRecordLabel} as not a duplicate`);
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
      removeCandidate(candidate.id);
      setResolvedCounts((current) => ({ ...current, merged: current.merged + 1 }));
      const masterLabel =
        masterRecordId === candidate.rightRecordId ? candidate.rightRecordLabel : candidate.leftRecordLabel;
      setMessage(
        "reassignedContacts" in response
          ? `Merged into ${masterLabel} · ${response.reassignedContacts} contacts and ${response.reassignedOpportunities} opportunities reassigned`
          : `Merged into ${masterLabel} · ${response.reassignedPrimaryContactOpportunities} primary-contact opportunities reassigned`,
      );
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rep-workspace drm-workspace crm-section duplicate-review-section">
      <div className="drm-page-head">
        <div className="drm-head-left">
          <div className="drm-crumb">
            <strong>Duplicate Review</strong>
            <span className="drm-live-chip">
              <span className="drm-pulse-dot" />
              <span className="mono">
                {counts.open} open
                {resolvedCounts.merged + resolvedCounts.rejected > 0
                  ? ` · ${resolvedCounts.merged + resolvedCounts.rejected} resolved`
                  : ""}
              </span>
            </span>
          </div>
        </div>
        <div className="drm-head-right">
          <div className="drm-search">
            <input
              placeholder="Search candidate, record, reason…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery ? (
              <button className="drm-search-clear" type="button" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            ) : null}
          </div>
          <button className="rep-btn rep-btn-ghost" disabled={isSubmitting} onClick={() => void loadCandidates()} type="button">
            Refresh
          </button>
          <button className="rep-btn rep-btn-primary" disabled={isSubmitting} onClick={handleGenerate} type="button">
            Generate
          </button>
        </div>
      </div>

      {errorMessage ? <div className="error-box">{errorMessage}</div> : null}
      {message ? <div className="success-box">{message}</div> : null}

      <div className="drm-main-grid">
        <DuplicateQueuePanel
          isLoading={isLoading}
          filteredCandidates={filteredCandidates}
          selectedId={selectedCandidate?.id ?? null}
          deferredIds={deferredIds}
          queueFilter={queueFilter}
          counts={counts}
          onSelect={setSelectedId}
          onQueueFilterChange={setQueueFilter}
        />

        <DuplicateComparisonPanel
          candidate={selectedCandidate}
          isSelectedDeferred={isSelectedDeferred}
        />

        <DuplicateActionPanel
          candidate={selectedCandidate}
          isSubmitting={isSubmitting}
          masterSelection={selectedCandidate ? masterSelections[selectedCandidate.id] : undefined}
          mergeReason={selectedCandidate ? mergeReasons[selectedCandidate.id] ?? "" : ""}
          rejectReason={selectedCandidate ? rejectReasons[selectedCandidate.id] ?? "" : ""}
          onMasterChange={(value) => {
            if (!selectedCandidate) {
              return;
            }
            setMasterSelections((current) => ({
              ...current,
              [selectedCandidate.id]: value,
            }));
          }}
          onMergeReasonChange={(value) => {
            if (!selectedCandidate) {
              return;
            }
            setMergeReasons((current) => ({
              ...current,
              [selectedCandidate.id]: value,
            }));
          }}
          onRejectReasonChange={(value) => {
            if (!selectedCandidate) {
              return;
            }
            setRejectReasons((current) => ({
              ...current,
              [selectedCandidate.id]: value,
            }));
          }}
          onMerge={() => {
            if (!selectedCandidate) {
              return;
            }
            void handleMerge(selectedCandidate);
          }}
          onDefer={() => {
            if (!selectedCandidate) {
              return;
            }
            setDeferredIds((current) =>
              current[selectedCandidate.id]
                ? current
                : {
                    ...current,
                    [selectedCandidate.id]: true,
                  },
            );
          }}
          onReject={() => {
            if (!selectedCandidate) {
              return;
            }
            void handleReject(selectedCandidate);
          }}
        />
      </div>

      {toast ? (
        <div className="rep-toast">
          <span className="ok">i</span>
          {toast}
        </div>
      ) : null}
    </section>
  );
}
