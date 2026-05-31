import type { ApprovalInboxItem } from "../../types/approvals";
import type { CurrentUser } from "../../types/session";
import {
  SAVED_VIEWS,
  SlaPill,
  formatDate,
  humaniseRequestType,
  humaniseRole,
  humaniseStatus,
  pillKindForStatus,
  type SavedViewKey,
  type StatusFilter,
} from "./ApproverInboxShared";

export function InboxHeader({
  isLoading,
  onRefresh,
}: {
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="rep-page-head">
      <h1 className="rep-page-title">Approval inbox</h1>
      <div className="rep-page-actions">
        <button className="rep-btn" onClick={onRefresh} type="button" disabled={isLoading}>
          {isLoading ? "Refreshing…" : "Refresh queue"}
        </button>
      </div>
    </div>
  );
}

export function InboxSavedViews({
  view,
  setView,
  viewCounts,
  filtersActive,
  resetFilters,
}: {
  view: SavedViewKey;
  setView: (view: SavedViewKey) => void;
  viewCounts: Record<SavedViewKey, number>;
  filtersActive: boolean;
  resetFilters: () => void;
}) {
  return (
    <div className="rep-views">
      <span className="rep-views-label">Saved views</span>
      {SAVED_VIEWS.map((v) => (
        <button
          className={`rep-view-chip${view === v.key ? " active" : ""}`}
          key={v.key}
          onClick={() => setView(v.key)}
          title={v.description}
          type="button"
        >
          {v.label}
          <span className="ct">{viewCounts[v.key] ?? 0}</span>
        </button>
      ))}
      <span className="rep-view-chip-spacer" />
      {filtersActive ? (
        <button className="rep-btn rep-btn-ghost" onClick={resetFilters} type="button">
          Reset filters
        </button>
      ) : null}
    </div>
  );
}

export function InboxFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  requestTypes,
  currentUser,
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  requestTypes: string[];
  currentUser: CurrentUser;
}) {
  return (
    <div className="rep-filters appr-filters">
      <label className="rep-field">
        <span className="rep-field-lbl">Search</span>
        <input
          placeholder="request id, opportunity, account, submitter…"
          onChange={(e) => setSearchQuery(e.target.value)}
          value={searchQuery}
        />
      </label>
      <label className="rep-field">
        <span className="rep-field-lbl">Status</span>
        <select onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} value={statusFilter}>
          <option value="">Any</option>
          <option value="pending_step">Pending</option>
          <option value="sent_back">Sent back</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>
      <label className="rep-field">
        <span className="rep-field-lbl">Type</span>
        <select onChange={(e) => setTypeFilter(e.target.value)} value={typeFilter}>
          <option value="">Any</option>
          {requestTypes.map((t) => (
            <option key={t} value={t}>
              {humaniseRequestType(t)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function InboxQueuePanel({
  items,
  filteredItems,
  selectedRequestId,
  setSelectedRequestId,
  currentUser,
  isLoading,
  filtersActive,
  resetFilters,
}: {
  items: ApprovalInboxItem[];
  filteredItems: ApprovalInboxItem[];
  selectedRequestId: string | null;
  setSelectedRequestId: (id: string) => void;
  currentUser: CurrentUser;
  isLoading: boolean;
  filtersActive: boolean;
  resetFilters: () => void;
}) {
  return (
    <div className="rep-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Approval queue
          <em>
            {filteredItems.length} of {items.length}
          </em>
        </div>
      </div>
      <div className="rep-table-scroll">
        <table className="rep-table appr-queue-table">
          <colgroup>
            <col style={{ width: "16%" }} />
            <col />
            <col style={{ width: "20%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "18%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Request</th>
              <th>Opportunity</th>
              <th>Account</th>
              <th>Submitted</th>
              <th>Active step</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const isMine = item.approverRoleKey === currentUser.roleKey;
              const decided = item.status === "approved" || item.status === "rejected";
              const locked = !isMine && !decided && item.status === "pending_step";
              const rowCls = [
                selectedRequestId === item.id ? "selected" : "",
                locked ? "appr-row-locked" : "",
                decided ? "appr-row-decided" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <tr className={rowCls} key={item.id} onClick={() => setSelectedRequestId(item.id)}>
                  <td>
                    <div className="rep-cell-truncate" style={{ fontWeight: 500 }}>{humaniseRequestType(item.requestType)}</div>
                  </td>
                  <td>
                    <div className="rep-cell-truncate">{item.opportunityTitle}</div>
                  </td>
                  <td>
                    <div className="rep-cell-truncate">{item.accountName}</div>
                  </td>
                  <td>
                    <div className="rep-cell-truncate">{item.submittedByName}</div>
                    <span className="rep-cell-sub">{formatDate(item.submittedAt)}</span>
                  </td>
                  <td>
                    <div className="rep-cell-truncate">{humaniseRole(item.approverRoleKey)}</div>
                    <span className="rep-cell-sub">{humaniseStatus(item.activeStepStatus)}</span>
                    <SlaPill dueAt={item.activeStepDueAt} />
                  </td>
                  <td>
                    <span className={`rep-pill p-${pillKindForStatus(item.status)}`}>
                      <span className="dot" />
                      {humaniseStatus(item.status)}
                    </span>
                    {locked ? (
                      <span className="rep-cell-sub" title="Step is assigned to a different role">
                        locked for you
                      </span>
                    ) : null}
                    {isMine && item.status === "pending_step" ? (
                      <span className="rep-cell-sub" style={{ color: "var(--accent-2)" }}>
                        your step
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!isLoading && filteredItems.length === 0 ? (
          <div className="rep-empty">
            <div className="icon">AP</div>
            <div className="ttl">No requests match this view</div>
            <div>Try a different saved view or clear filters.</div>
            {filtersActive ? (
              <button className="reset" onClick={resetFilters} type="button">
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}
        {isLoading ? <div className="rep-empty">Loading approval requests…</div> : null}
      </div>
    </div>
  );
}
