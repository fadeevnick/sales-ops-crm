import type { DuplicateCandidateItem } from "../../types/duplicateCandidates";
import {
  DUPLICATE_QUEUE_FILTERS,
  filterLabel,
  formatDate,
  formatScore,
  type QueueFilter,
} from "./DuplicateReviewShared";

export function DuplicateQueuePanel({
  isLoading,
  filteredCandidates,
  selectedId,
  deferredIds,
  queueFilter,
  counts,
  onSelect,
  onQueueFilterChange,
}: {
  isLoading: boolean;
  filteredCandidates: DuplicateCandidateItem[];
  selectedId: string | null;
  deferredIds: Record<string, true>;
  queueFilter: QueueFilter;
  counts: { open: number; high: number; low: number; account: number; contact: number; deferred: number };
  onSelect: (id: string) => void;
  onQueueFilterChange: (filter: QueueFilter) => void;
}) {
  const filterCount = (filter: QueueFilter): number => {
    switch (filter) {
      case "all":
        return counts.open;
      case "high":
        return counts.high;
      case "account":
        return counts.account;
      case "contact":
        return counts.contact;
      case "needs":
        return counts.low;
      case "deferred":
        return counts.deferred;
    }
  };

  return (
    <section className="rep-panel drm-queue">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Queue
          <em>{filteredCandidates.length} visible</em>
        </div>
      </div>
      <div className="drm-queue-filter">
        {DUPLICATE_QUEUE_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`drm-filter-chip${queueFilter === filter ? " active" : ""}`}
            onClick={() => onQueueFilterChange(filter)}
          >
            {filterLabel(filter)}
            <span className="ct">{filterCount(filter)}</span>
          </button>
        ))}
      </div>
      <div className="drm-queue-list">
        {isLoading ? <div className="drm-queue-empty">Loading candidates…</div> : null}
        {!isLoading && !filteredCandidates.length ? <div className="drm-queue-empty">No candidates match the current filters.</div> : null}
        {!isLoading &&
          filteredCandidates.map((candidate) => {
            const isSelected = candidate.id === selectedId;
            const isDeferred = Boolean(deferredIds[candidate.id]);
            return (
              <button
                key={candidate.id}
                type="button"
                className={`drm-qrow${isSelected ? " selected" : ""}${isDeferred ? " deferred" : ""}`}
                onClick={() => onSelect(candidate.id)}
              >
                <div className="drm-qrow-header">
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
  );
}

export function DuplicateComparisonPanel({
  candidate,
  isSelectedDeferred,
}: {
  candidate: DuplicateCandidateItem | null;
  isSelectedDeferred: boolean;
}) {
  return (
    <div className="drm-comparison">
      {candidate ? (
        <>
          <section className="rep-panel drm-match-bar">
            <div className="rep-panel-head">
              <div className="drm-score-badge">
                <span className="mono drm-score-num">{formatScore(Number(candidate.matchScore))}</span>
                <span className="drm-score-conf mono">{Number(candidate.matchScore) >= 0.85 ? "High confidence" : "Needs review"}</span>
              </div>
            </div>
            <div className="drm-match-body">
              <div className="drm-interpretation">
                <span className="drm-interp-label mono">Signal</span>
                <span className="drm-interp-text">{candidate.reasonSummary}</span>
              </div>
              <div className="drm-reasons-row">
                <span className="drm-reason-tag mono">{candidate.entityType}</span>
                <span className="drm-reason-tag mono">generated {formatDate(candidate.generatedAt)}</span>
                {isSelectedDeferred ? <span className="drm-reason-tag mono">deferred</span> : null}
              </div>
            </div>
          </section>

          <section className="rep-panel drm-field-panel">
            <div className="rep-panel-head">
              <div className="rep-panel-title">
                The two records
                <em>which one stays as master</em>
              </div>
            </div>
            <div className="drm-record-pair">
              <div className="drm-record-card">
                <div className="drm-record-role mono">Record A</div>
                <strong className="drm-record-name">{candidate.leftRecordLabel}</strong>
              </div>
              <div className="drm-record-vs mono">vs</div>
              <div className="drm-record-card">
                <div className="drm-record-role mono">Record B</div>
                <strong className="drm-record-name">{candidate.rightRecordLabel}</strong>
              </div>
            </div>
            <div className="drm-section-note">
              The pairing API exposes record identity, match score and a summary signal — not per-field
              values — so a field-by-field diff isn’t available yet. Choose the master and merge below.
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
  );
}

export function DuplicateActionPanel({
  candidate,
  isSubmitting,
  masterSelection,
  mergeReason,
  rejectReason,
  onMasterChange,
  onMergeReasonChange,
  onRejectReasonChange,
  onMerge,
  onDefer,
  onReject,
}: {
  candidate: DuplicateCandidateItem | null;
  isSubmitting: boolean;
  masterSelection?: string;
  mergeReason: string;
  rejectReason: string;
  onMasterChange: (value: string) => void;
  onMergeReasonChange: (value: string) => void;
  onRejectReasonChange: (value: string) => void;
  onMerge: () => void;
  onDefer: () => void;
  onReject: () => void;
}) {
  return (
    <aside className="rep-panel drm-action-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Resolution
          <em>{candidate ? `${candidate.entityType} pair` : "queue empty"}</em>
        </div>
      </div>
      {candidate ? (
        <>
          <label className="ieo-config-label">
            <span>Master record</span>
            <select value={masterSelection ?? candidate.leftRecordId} onChange={(event) => onMasterChange(event.target.value)}>
              <option value={candidate.leftRecordId}>{candidate.leftRecordLabel}</option>
              <option value={candidate.rightRecordId}>{candidate.rightRecordLabel}</option>
            </select>
          </label>
          <label className="ieo-config-label">
            <span>Merge reason</span>
            <textarea
              value={mergeReason}
              onChange={(event) => onMergeReasonChange(event.target.value)}
              placeholder="Required for audit clarity. Defaults to “Duplicate merge”."
            />
          </label>
          <label className="ieo-config-label">
            <span>Reject reason</span>
            <textarea
              value={rejectReason}
              onChange={(event) => onRejectReasonChange(event.target.value)}
              placeholder="Required when rejecting as false positive."
            />
          </label>
          <div className="drm-impact-note">
            Merge will archive the secondary record and preserve reassignment behavior exposed by the merge endpoints. Preview of detailed field-level impact is not yet available.
          </div>
          <div className="button-row">
            <button className="rep-btn rep-btn-primary" disabled={isSubmitting} onClick={onMerge} type="button">Merge</button>
            <button className="rep-btn rep-btn-ghost" disabled={isSubmitting} onClick={onDefer} type="button">Defer</button>
            <button className="rep-btn" disabled={isSubmitting} onClick={onReject} type="button">Reject</button>
          </div>
        </>
      ) : (
        <div className="drm-queue-empty">Select a candidate to review.</div>
      )}
    </aside>
  );
}
