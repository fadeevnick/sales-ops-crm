import type {
  ActivityListItem,
  OpportunityDetail,
  OpportunityListItem,
} from "../../types/crm";
import type {
  MetadataFieldDefinitionItem,
  MetadataStageDefinitionItem,
} from "../../types/metadata";
import { OpportunityList, StagePip, formatCompactCurrency, normalizeApproval } from "./OpportunityList";

export function OpportunityPreview({
  activities,
  activityTitle,
  customFields,
  isActivitySubmitting,
  isLoadingDetail,
  listItem,
  opportunity,
  stageLabels,
  stages,
  onActivityTitleChange,
  onOpenAccount,
  onOpenDetail,
  onSubmitActivity,
  onSubmitApproval,
  showOwner,
}: {
  activities: ActivityListItem[];
  activityTitle: string;
  customFields: MetadataFieldDefinitionItem[];
  isActivitySubmitting: boolean;
  isLoadingDetail: boolean;
  listItem: OpportunityListItem | null;
  opportunity: OpportunityDetail | null;
  stageLabels: Map<string, string>;
  stages: MetadataStageDefinitionItem[];
  onActivityTitleChange: (value: string) => void;
  onOpenAccount: (accountId: string) => void;
  onOpenDetail: () => void;
  onSubmitActivity: () => void;
  onSubmitApproval: () => void;
  showOwner: boolean;
}) {
  if (!listItem) {
    return (
      <section className="rep-panel rep-preview">
        <div className="rep-empty">
          <div className="icon">OP</div>
          <div className="ttl">Select an opportunity</div>
          <div>Click any row in the table to see its account, contact, activity and approval state.</div>
        </div>
      </section>
    );
  }

  const stageIndex = stages.findIndex((s) => s.stageKey === listItem.stageKey);
  const approvalKey = normalizeApproval(listItem.approvalState);
  const eligibleToSubmit = approvalKey === "none";
  const stageLabel = stageLabels.get(listItem.stageKey) ?? listItem.stageKey;

  return (
    <section className="rep-panel rep-preview">
      <div className="rep-preview-head">
        <div className="rep-preview-id">
          <span>OPPORTUNITY</span>
        </div>
        <div className="rep-preview-title">{listItem.title}</div>
        <div className="rep-preview-acct">
          <span>{listItem.accountName}</span>
          <button className="rep-btn rep-btn-ghost" style={{ marginLeft: "auto", fontSize: "0.7rem", padding: "2px 6px" }} onClick={() => onOpenAccount(listItem.accountId)} type="button">
            Open account ›
          </button>
        </div>
      </div>

      <div className={`rep-approval-state p-${approvalKey}`}>
        {approvalKey === "none" ? (
          <>
            <span className="mono" style={{ fontSize: "0.66rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>Approval</span>
            <span>No active request</span>
          </>
        ) : (
          <>
            <span className={`rep-pill p-${approvalKey}`}>
              <span className="dot" />
              {listItem.approvalState.replace(/_/g, " ")}
            </span>
            <span>Latest approval state for this opportunity</span>
          </>
        )}
      </div>

      <div className="rep-preview-grid">
        <div className="rep-pf">
          <div className="rep-pf-l">Stage</div>
          <div className="rep-pf-v">
            <StagePip activeIndex={stageIndex} total={stages.length || 5} />
            <span className="mono" style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.78rem" }}>{stageLabel}</span>
          </div>
        </div>
        <div className="rep-pf">
          <div className="rep-pf-l">Amount</div>
          <div className="rep-pf-v num">{formatCompactCurrency(listItem.expectedAmount)}</div>
        </div>
        <div className="rep-pf">
          <div className="rep-pf-l">Close date</div>
          <div className="rep-pf-v">
            <span className="mono" style={{ fontFamily: "ui-monospace, monospace" }}>{listItem.closeDate ?? "—"}</span>
          </div>
        </div>
        {showOwner ? (
          <div className="rep-pf">
            <div className="rep-pf-l">Owner</div>
            <div className="rep-pf-v" style={{ fontSize: "0.78rem" }}>{listItem.ownerName}</div>
          </div>
        ) : null}
        {opportunity?.primaryContact ? (
          <div className="rep-pf" style={{ gridColumn: "1 / -1" }}>
            <div className="rep-pf-l">Primary contact</div>
            <div className="rep-pf-v" style={{ fontSize: "0.78rem" }}>{opportunity.primaryContact.fullName}</div>
          </div>
        ) : null}
        {customFields.slice(0, 4).map((field) => {
          const value = opportunity?.customFields[field.fieldKey];
          if (value === undefined || value === null || value === "") return null;
          return (
            <div className="rep-pf" key={field.id}>
              <div className="rep-pf-l">{field.label}</div>
              <div className="rep-pf-v" style={{ fontSize: "0.78rem" }}>{String(value)}</div>
            </div>
          );
        })}
      </div>

      <div className="rep-pf-block">
        <div className="rep-pf-block-title">
          <span>Recent activities</span>
          <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--muted-2)" }}>{activities.length}</span>
        </div>
        {isLoadingDetail ? (
          <div className="rep-empty" style={{ padding: 16 }}>Loading…</div>
        ) : activities.length === 0 ? (
          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>No activities yet.</div>
        ) : (
          activities.slice(0, 5).map((activity) => (
            <div className="rep-activity-row" key={activity.id}>
              <div>
                <strong>{activity.title}</strong>
                <span className="sub">{activity.type} · {activity.status}</span>
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{activity.dueDate ?? "no date"}</div>
            </div>
          ))
        )}
        <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
          <input
            className="rep-form-field"
            onChange={(event) => onActivityTitleChange(event.target.value)}
            placeholder="Quick add task…"
            style={{ flex: 1, padding: "8px 10px", fontSize: "0.82rem", border: "1px solid var(--line)", borderRadius: 3, background: "var(--white)" }}
            value={activityTitle}
          />
          <button className={activityTitle.trim() ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"} disabled={isActivitySubmitting || !activityTitle.trim()} onClick={onSubmitActivity} type="button">
            Add
          </button>
        </div>
      </div>

      {!eligibleToSubmit ? (
        <div className="rep-blocked">
          <div className="rep-blocked-title">Submit blocked</div>
          <ul className="rep-blocked-list">
            <li>
              An approval request is already in state <strong>{listItem.approvalState.replace(/_/g, " ")}</strong> for this opportunity.
            </li>
            <li>Wait for the current decision before resubmitting a different exception.</li>
          </ul>
        </div>
      ) : null}

      <div className="rep-preview-actions">
        <button className="rep-btn rep-btn-ghost" onClick={onOpenDetail} type="button">Open detail ›</button>
        <div className="right">
          <button className={eligibleToSubmit ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"} disabled={!eligibleToSubmit} onClick={onSubmitApproval} type="button">
            Submit for approval
          </button>
        </div>
      </div>
    </section>
  );
}

export function WorkspaceOpportunityList({
  emptyLabel,
  hasActiveFilters,
  opportunities,
  recentlyCreatedIds,
  selectedOpportunityId,
  stageLabels,
  stages,
  totalRows,
  canLoadMore,
  isLoadingMore,
  onClearFilters,
  onLoadMore,
  onSelectOpportunity,
}: {
  emptyLabel: string;
  hasActiveFilters: boolean;
  opportunities: OpportunityListItem[];
  recentlyCreatedIds: string[];
  selectedOpportunityId: string | null;
  stageLabels: Map<string, string>;
  stages: MetadataStageDefinitionItem[];
  totalRows: number;
  canLoadMore: boolean;
  isLoadingMore: boolean;
  onClearFilters: () => void;
  onLoadMore: () => void;
  onSelectOpportunity: (id: string) => void;
}) {
  return (
    <OpportunityList
      emptyLabel={emptyLabel}
      hasActiveFilters={hasActiveFilters}
      opportunities={opportunities}
      recentlyCreatedIds={recentlyCreatedIds}
      selectedOpportunityId={selectedOpportunityId}
      stageLabels={stageLabels}
      stages={stages}
      totalRows={totalRows}
      canLoadMore={canLoadMore}
      isLoadingMore={isLoadingMore}
      onClearFilters={onClearFilters}
      onLoadMore={onLoadMore}
      onSelectOpportunity={onSelectOpportunity}
    />
  );
}
