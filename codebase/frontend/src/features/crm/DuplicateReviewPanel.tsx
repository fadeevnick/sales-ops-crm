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

type DuplicateReviewPanelProps = {
  currentUser: CurrentUser;
};

type QueueFilter = "all" | "high" | "account" | "contact" | "needs" | "deferred";

function formatDate(value: string): string {
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

function formatScore(score: number): string {
  return score.toFixed(2);
}

function filterLabel(filter: QueueFilter): string {
  switch (filter) {
    case "all":
      return "All Open";
    case "high":
      return "High Confidence";
    case "account":
      return "Accounts";
    case "contact":
      return "Contacts";
    case "needs":
      return "Needs Review";
    case "deferred":
      return "Deferred";
  }
}

function flashConstraint(currentUser: CurrentUser, callback: (message: string) => void, candidate: DuplicateCandidateItem, side: "left" | "right" | "related") {
  if (side === "related") {
    callback(
      `Related records for ${candidate.id} are not exposed by the current API in ${currentUser.tenantName.toUpperCase()} · CONSTRAINT`,
    );
    return;
  }

  const recordId = side === "left" ? candidate.leftRecordId : candidate.rightRecordId;
  callback(`Open ${recordId} is not wired yet in ${currentUser.tenantName.toUpperCase()} · CONSTRAINT`);
}

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
      setMessage(`Rejected ${candidate.id} as false positive`);
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
      setMessage(
        "reassignedContacts" in response
          ? `Merged ${candidate.id} · ${response.reassignedContacts} contacts and ${response.reassignedOpportunities} opportunities reassigned`
          : `Merged ${candidate.id} · ${response.reassignedPrimaryContactOpportunities} primary-contact opportunities reassigned`,
      );
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const comparisonRows = selectedCandidate
    ? [
        { label: "Record ID", left: selectedCandidate.leftRecordId, right: selectedCandidate.rightRecordId, tone: "exact" },
        { label: "Record label", left: selectedCandidate.leftRecordLabel, right: selectedCandidate.rightRecordLabel, tone: "conflict" },
        { label: "Entity scope", left: selectedCandidate.entityType, right: selectedCandidate.entityType, tone: "exact" },
        { label: "Match summary", left: selectedCandidate.reasonSummary, right: selectedCandidate.reasonSummary, tone: "exact" },
        { label: "Generated", left: formatDate(selectedCandidate.generatedAt), right: formatDate(selectedCandidate.generatedAt), tone: "exact" },
      ]
    : [];

  return (
    <section className="rep-workspace drm-workspace crm-section duplicate-review-section">
      <div className="drm-page-head">
        <div className="drm-head-left">
          <div className="drm-crumb">
            <span>Data &amp; Quality</span>
            <span className="sep">/</span>
            <strong>Duplicate Review</strong>
            <span className="drm-live-chip">
              <span className="drm-pulse-dot" />
              <span className="mono">{counts.open} open</span>
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

      <div className="drm-kpi-band">
        {[
          { label: "Open candidates", value: counts.open, foot: "Current review queue" },
          { label: "High confidence", value: counts.high, foot: "score ≥ 0.85" },
          { label: "Needs review", value: counts.low, foot: "low score or deferred" },
          { label: "Accounts pending", value: counts.account, foot: "account entity" },
          { label: "Contacts pending", value: counts.contact, foot: "contact entity" },
          { label: "Resolved now", value: resolvedCounts.merged + resolvedCounts.rejected, foot: `${resolvedCounts.merged} merged · ${resolvedCounts.rejected} rejected` },
        ].map((metric) => (
          <div className="drm-kpi-item" key={metric.label}>
            <div className="drm-kpi-l">{metric.label}</div>
            <div className="drm-kpi-v mono">{metric.value}</div>
            <div className="drm-kpi-foot">{metric.foot}</div>
          </div>
        ))}
      </div>

      {errorMessage ? <div className="error-box">{errorMessage}</div> : null}
      {message ? <div className="success-box">{message}</div> : null}

      <div className="drm-main-grid">
        <section className="rep-panel drm-queue">
          <div className="rep-panel-head">
            <div className="rep-panel-title">
              Queue
              <em>{filteredCandidates.length} visible</em>
            </div>
          </div>
          <div className="drm-queue-filter">
            {(["all", "high", "account", "contact", "needs", "deferred"] as QueueFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`drm-filter-chip${queueFilter === filter ? " active" : ""}`}
                onClick={() => setQueueFilter(filter)}
              >
                {filterLabel(filter)}
              </button>
            ))}
          </div>
          <div className="drm-queue-list">
            {isLoading ? <div className="drm-queue-empty">Loading candidates…</div> : null}
            {!isLoading && !filteredCandidates.length ? <div className="drm-queue-empty">No candidates match the current filters.</div> : null}
            {!isLoading &&
              filteredCandidates.map((candidate) => {
                const isSelected = candidate.id === selectedCandidate?.id;
                const isDeferred = Boolean(deferredIds[candidate.id]);
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    className={`drm-qrow${isSelected ? " selected" : ""}${isDeferred ? " deferred" : ""}`}
                    onClick={() => setSelectedId(candidate.id)}
                  >
                    <div className="drm-qrow-header">
                      <span className="mono drm-qrow-id">{candidate.id}</span>
                      <span className="drm-type-badge mono">{candidate.entityType}</span>
                      {isDeferred ? <span className="drm-deferred-tag mono">Deferred</span> : null}
                      <span className="mono drm-qrow-score">{formatScore(Number(candidate.matchScore))}</span>
                    </div>
                    <div className="drm-qrow-names">
                      <strong className="drm-qrow-a">{candidate.leftRecordLabel}</strong>
                      <span className="drm-qrow-sep">vs</span>
                      <strong className="drm-qrow-b">{candidate.rightRecordLabel}</strong>
                    </div>
                    <div className="drm-qrow-reasons">
                      <span className="drm-reason-chip">{candidate.reasonSummary}</span>
                    </div>
                  </button>
                );
              })}
          </div>
        </section>

        <div className="drm-comparison">
          {selectedCandidate ? (
            <>
              <section className="rep-panel drm-match-bar">
                <div className="drm-match-top">
                  <div>
                    <div className="drm-score-badge">
                      <span className="mono drm-score-num">{formatScore(Number(selectedCandidate.matchScore))}</span>
                      <span className="drm-score-conf mono">
                        {Number(selectedCandidate.matchScore) >= 0.85 ? "High confidence" : "Needs review"}
                      </span>
                    </div>
                    <div className="drm-interpretation">
                      <span className="drm-interp-label mono">Signal</span>
                      <span className="drm-interp-text">{selectedCandidate.reasonSummary}</span>
                    </div>
                  </div>
                  <div className="drm-match-actions">
                    <button
                      className="rep-btn rep-btn-ghost"
                      type="button"
                      onClick={() => flashConstraint(currentUser, flash, selectedCandidate, "left")}
                    >
                      Open A ›
                    </button>
                    <button
                      className="rep-btn rep-btn-ghost"
                      type="button"
                      onClick={() => flashConstraint(currentUser, flash, selectedCandidate, "right")}
                    >
                      Open B ›
                    </button>
                    <button
                      className="rep-btn rep-btn-ghost"
                      type="button"
                      onClick={() => flashConstraint(currentUser, flash, selectedCandidate, "related")}
                    >
                      Related opps
                    </button>
                  </div>
                </div>
                <div className="drm-reasons-row">
                  <span className="drm-reason-tag mono">{selectedCandidate.entityType}</span>
                  <span className="drm-reason-tag mono">generated {formatDate(selectedCandidate.generatedAt)}</span>
                  {isSelectedDeferred ? <span className="drm-reason-tag mono">deferred</span> : null}
                </div>
              </section>

              <section className="rep-panel drm-field-panel">
                <div className="rep-panel-head">
                  <div className="rep-panel-title">
                    Comparison workspace
                    <em>API-backed summary</em>
                  </div>
                  <div className="rep-panel-actions">
                    <span className="drm-legend">Deep field comparison is not exposed by the current API.</span>
                  </div>
                </div>
                <div className="rep-table-scroll">
                  <table className="rep-table drm-cmp-table">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>{selectedCandidate.leftRecordLabel}</th>
                        <th>{selectedCandidate.rightRecordLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row) => (
                        <tr key={row.label}>
                          <td className="drm-field-name">{row.label}</td>
                          <td className="drm-field-val">{row.left}</td>
                          <td className="drm-field-val">{row.right}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="drm-section-note">
                  Merge is real. Per-field conflict selection is currently limited by `DuplicateCandidateItem` shape; the backend exposes only pair identity, score, and summary.
                </div>
              </section>
            </>
          ) : (
            <section className="rep-panel drm-empty-workspace">
              <div className="drm-empty-icon mono">DUP</div>
              <div className="drm-empty-title">No open duplicate candidates</div>
            </section>
          )}
        </div>

        <aside className="rep-panel drm-action-panel">
          <div className="rep-panel-head">
            <div className="rep-panel-title">
              Resolution
              <em>{selectedCandidate ? selectedCandidate.id : "queue empty"}</em>
            </div>
          </div>
          {selectedCandidate ? (
            <>
              <label className="ieo-config-label">
                <span>Master record</span>
                <select
                  value={masterSelections[selectedCandidate.id] ?? selectedCandidate.leftRecordId}
                  onChange={(event) =>
                    setMasterSelections((current) => ({
                      ...current,
                      [selectedCandidate.id]: event.target.value,
                    }))
                  }
                >
                  <option value={selectedCandidate.leftRecordId}>{selectedCandidate.leftRecordLabel}</option>
                  <option value={selectedCandidate.rightRecordId}>{selectedCandidate.rightRecordLabel}</option>
                </select>
              </label>
              <label className="ieo-config-label">
                <span>Merge reason</span>
                <textarea
                  value={mergeReasons[selectedCandidate.id] ?? ""}
                  onChange={(event) =>
                    setMergeReasons((current) => ({
                      ...current,
                      [selectedCandidate.id]: event.target.value,
                    }))
                  }
                  placeholder="Required for audit clarity. Defaults to “Duplicate merge”."
                />
              </label>
              <label className="ieo-config-label">
                <span>Reject reason</span>
                <textarea
                  value={rejectReasons[selectedCandidate.id] ?? ""}
                  onChange={(event) =>
                    setRejectReasons((current) => ({
                      ...current,
                      [selectedCandidate.id]: event.target.value,
                    }))
                  }
                  placeholder="Required when rejecting as false positive."
                />
              </label>
              <div className="drm-impact-note">
                Merge will archive the secondary record and preserve reassignment behavior exposed by the merge endpoints. Preview of detailed field-level impact is not yet available.
              </div>
              <div className="button-row">
                <button
                  className="rep-btn rep-btn-primary"
                  disabled={isSubmitting}
                  onClick={() => void handleMerge(selectedCandidate)}
                  type="button"
                >
                  Merge
                </button>
                <button
                  className="rep-btn rep-btn-ghost"
                  disabled={isSubmitting}
                  onClick={() =>
                    setDeferredIds((current) =>
                      current[selectedCandidate.id]
                        ? current
                        : {
                            ...current,
                            [selectedCandidate.id]: true,
                          },
                    )
                  }
                  type="button"
                >
                  Defer
                </button>
                <button
                  className="rep-btn"
                  disabled={isSubmitting}
                  onClick={() => void handleReject(selectedCandidate)}
                  type="button"
                >
                  Reject
                </button>
              </div>
            </>
          ) : (
            <div className="drm-queue-empty">Select a candidate to review.</div>
          )}
        </aside>
      </div>

      <div className="rep-foot-ruler">
        <span>SALES OPS CRM · {currentUser.tenantName.toUpperCase()} · LOCAL PILOT</span>
        <span>{currentUser.roleKey.toUpperCase()} · {currentUser.displayName}</span>
        <span>{counts.open} OPEN · {resolvedCounts.merged} MERGED · {resolvedCounts.rejected} REJECTED</span>
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
