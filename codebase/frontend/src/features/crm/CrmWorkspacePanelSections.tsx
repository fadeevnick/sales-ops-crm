import type {
  AccountListItem,
  OpportunitySavedViewFilters,
  SavedOpportunityViewItem,
} from "../../types/crm";
import type { MetadataStageDefinitionItem } from "../../types/metadata";
import { formatCompactCurrency } from "./OpportunityList";

type ApprovalFilter = "" | "none" | "pending" | "sent_back" | "approved" | "rejected";
type CloseWindowFilter = "" | "30" | "60" | "90" | "month";

export function Kpis({
  kpiOpen,
  kpiPipeline,
  kpiPending,
  kpiClosing,
}: {
  kpiOpen: number;
  kpiPipeline: number;
  kpiPending: number;
  kpiClosing: number;
}) {
  return (
    <div className="rep-kpis">
      <div className="rep-kpi">
        <div className="rep-kpi-label">Open opportunities</div>
        <div className="rep-kpi-value">{kpiOpen}</div>
        <div className="rep-kpi-foot">In your scope</div>
      </div>
      <div className="rep-kpi">
        <div className="rep-kpi-label">Pipeline value</div>
        <div className="rep-kpi-value">{formatCompactCurrency(kpiPipeline)}</div>
        <div className="rep-kpi-foot">Sum of expected amount</div>
      </div>
      <div className="rep-kpi">
        <div className="rep-kpi-label">Pending approvals</div>
        <div className="rep-kpi-value">{kpiPending}</div>
        <div className="rep-kpi-foot">Pending or sent back</div>
      </div>
      <div className="rep-kpi">
        <div className="rep-kpi-label">Closing this month</div>
        <div className="rep-kpi-value">{kpiClosing}</div>
        <div className="rep-kpi-foot">By close date</div>
      </div>
    </div>
  );
}

export function SavedViewsRow({
  activeSavedViewId,
  canCreateSharedViews,
  hasActiveFilters,
  isSavedViewSubmitting,
  savedViewFormOpen,
  savedViewName,
  savedViewVisibilityScope,
  savedViews,
  onApplySavedView,
  onCreateSavedView,
  onDeleteSavedView,
  onResetView,
  onSavedViewNameChange,
  onSavedViewVisibilityScopeChange,
  onToggleSavedViewForm,
  onUpdateSavedView,
}: {
  activeSavedViewId: string | null;
  canCreateSharedViews: boolean;
  hasActiveFilters: boolean;
  isSavedViewSubmitting: boolean;
  savedViewFormOpen: boolean;
  savedViewName: string;
  savedViewVisibilityScope: "private" | "shared";
  savedViews: SavedOpportunityViewItem[];
  onApplySavedView: (view: SavedOpportunityViewItem) => void;
  onCreateSavedView: () => void;
  onDeleteSavedView: (view: SavedOpportunityViewItem) => void;
  onResetView: () => void;
  onSavedViewNameChange: (name: string) => void;
  onSavedViewVisibilityScopeChange: (scope: "private" | "shared") => void;
  onToggleSavedViewForm: () => void;
  onUpdateSavedView: (view: SavedOpportunityViewItem) => void;
}) {
  return (
    <div>
      <div className="rep-views">
        <span className="rep-views-label">Saved views</span>
        <button className={!activeSavedViewId && !hasActiveFilters ? "rep-view-chip active" : "rep-view-chip"} onClick={onResetView} type="button">
          All open
        </button>
        {savedViews.map((view) => (
          <button
            className={view.id === activeSavedViewId ? "rep-view-chip active" : "rep-view-chip"}
            disabled={!view.valid}
            key={view.id}
            onClick={() => onApplySavedView(view)}
            title={view.valid ? view.name : view.invalidReasons.join("; ")}
            type="button"
          >
            {view.name}
            <span className="ct">{view.visibilityScope === "shared" ? "shared" : "priv"}</span>
          </button>
        ))}
        <span className="rep-view-chip-spacer" />
        <button className="rep-btn rep-btn-ghost" onClick={onToggleSavedViewForm} type="button">
          {savedViewFormOpen ? "Close" : "+ Save view"}
        </button>
      </div>
      {savedViewFormOpen ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(160px, 1fr) 140px auto auto",
            gap: 8,
            marginTop: 10,
            alignItems: "end",
          }}
        >
          <div className="rep-form-field">
            <label>View name</label>
            <input onChange={(event) => onSavedViewNameChange(event.target.value)} placeholder="e.g. My pipeline next 30 days" value={savedViewName} />
          </div>
          <div className="rep-form-field">
            <label>Visibility</label>
            <select
              disabled={!canCreateSharedViews}
              onChange={(event) => onSavedViewVisibilityScopeChange(event.target.value === "shared" ? "shared" : "private")}
              value={savedViewVisibilityScope}
            >
              <option value="private">Private</option>
              <option value="shared">Shared</option>
            </select>
          </div>
          <button className="rep-btn rep-btn-primary" disabled={isSavedViewSubmitting || !savedViewName.trim()} onClick={onCreateSavedView} type="button">
            Save view
          </button>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Saves the current filter set</span>
          {savedViews.some((view) => view.canManage) ? (
            <div style={{ gridColumn: "1 / -1", display: "grid", gap: 6 }}>
              {savedViews.filter((view) => view.canManage).map((view) => (
                <div
                  key={view.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    padding: "6px 8px",
                    border: "1px solid var(--hairline)",
                    borderRadius: 3,
                    background: "var(--paper-2)",
                    fontSize: "0.78rem",
                  }}
                >
                  <strong style={{ flex: 1 }}>{view.name}</strong>
                  <button className="rep-btn" disabled={isSavedViewSubmitting} onClick={() => onUpdateSavedView(view)} title="Overwrite this view with the current filters" type="button">
                    Overwrite
                  </button>
                  <button className="rep-btn" disabled={isSavedViewSubmitting} onClick={() => onDeleteSavedView(view)} type="button">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function FiltersRow({
  accounts,
  approvalFilter,
  closeWindow,
  filters,
  hasActiveFilters,
  scopeLockLabel,
  stages,
  onApprovalFilterChange,
  onCloseWindowChange,
  onFiltersChange,
  onResetFilters,
}: {
  accounts: AccountListItem[];
  approvalFilter: ApprovalFilter;
  closeWindow: CloseWindowFilter;
  filters: OpportunitySavedViewFilters;
  hasActiveFilters: boolean;
  scopeLockLabel: string;
  stages: MetadataStageDefinitionItem[];
  onApprovalFilterChange: (value: ApprovalFilter) => void;
  onCloseWindowChange: (value: CloseWindowFilter) => void;
  onFiltersChange: (filters: OpportunitySavedViewFilters) => void;
  onResetFilters: () => void;
}) {
  return (
    <>
      <div className="rep-filters">
        <label className="rep-field">
          <input onChange={(event) => onFiltersChange({ ...filters, query: event.target.value || undefined })} placeholder="Filter by title or account…" value={filters.query ?? ""} />
        </label>
        <label className="rep-field">
          <span className="rep-field-lbl">Stage</span>
          <select onChange={(event) => onFiltersChange({ ...filters, stageKey: event.target.value || undefined })} value={filters.stageKey ?? ""}>
            <option value="">All</option>
            {stages.map((stage) => (
              <option key={stage.stageKey} value={stage.stageKey}>{stage.displayName}</option>
            ))}
          </select>
        </label>
        <label className="rep-field">
          <span className="rep-field-lbl">Account</span>
          <select onChange={(event) => onFiltersChange({ ...filters, accountId: event.target.value || undefined })} value={filters.accountId ?? ""}>
            <option value="">All</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
        </label>
        <label className="rep-field">
          <span className="rep-field-lbl">Close</span>
          <select onChange={(event) => onCloseWindowChange(event.target.value as CloseWindowFilter)} value={closeWindow}>
            <option value="">Any</option>
            <option value="30">≤ 30 days</option>
            <option value="60">≤ 60 days</option>
            <option value="90">≤ 90 days</option>
            <option value="month">This month</option>
          </select>
        </label>
        <label className="rep-field">
          <span className="rep-field-lbl">Approval</span>
          <select onChange={(event) => onApprovalFilterChange(event.target.value as ApprovalFilter)} value={approvalFilter}>
            <option value="">Any</option>
            <option value="none">None</option>
            <option value="pending">Pending</option>
            <option value="sent_back">Sent back</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        {scopeLockLabel ? (
          <span className="rep-lock-chip" title="Visibility is enforced by the current user's role and backend access policy.">
            {scopeLockLabel}
          </span>
        ) : null}
      </div>
      {hasActiveFilters ? (
        <div className="rep-filter-active">
          <span>Filters active</span>
          <button onClick={onResetFilters} type="button">Clear all</button>
        </div>
      ) : null}
    </>
  );
}
