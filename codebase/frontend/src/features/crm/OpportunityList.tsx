import type { OpportunityListItem } from "../../types/crm";
import type { MetadataStageDefinitionItem } from "../../types/metadata";

type OpportunityListProps = {
  opportunities: OpportunityListItem[];
  totalRows: number;
  stages: MetadataStageDefinitionItem[];
  stageLabels: Map<string, string>;
  selectedOpportunityId: string | null;
  recentlyCreatedIds: string[];
  emptyLabel: string;
  hasActiveFilters: boolean;
  canLoadMore: boolean;
  isLoadingMore: boolean;
  onSelectOpportunity: (opportunityId: string) => void;
  onClearFilters: () => void;
  onLoadMore: () => void;
};

export function OpportunityList({
  opportunities,
  totalRows,
  stages,
  stageLabels,
  selectedOpportunityId,
  recentlyCreatedIds,
  emptyLabel,
  hasActiveFilters,
  canLoadMore,
  isLoadingMore,
  onSelectOpportunity,
  onClearFilters,
  onLoadMore,
}: OpportunityListProps) {
  const stageOrder = new Map(stages.map((stage, index) => [stage.stageKey, index]));
  const stageCount = stages.length || 5;

  if (opportunities.length === 0) {
    return (
      <section className="rep-panel">
        <div className="rep-panel-head">
          <div className="rep-panel-title">
            Opportunities <em>0 of {totalRows}</em>
          </div>
          {hasActiveFilters ? (
            <div className="rep-panel-actions">
              <button onClick={onClearFilters} type="button">
                Clear filters
              </button>
            </div>
          ) : null}
        </div>
        <div className="rep-empty">
          <div className="icon">∅</div>
          <div className="ttl">{emptyLabel}</div>
          <div>
            {hasActiveFilters
              ? "Try removing the close-date or approval filter, or change the saved view."
              : "Create a new opportunity to get started."}
          </div>
          {hasActiveFilters ? (
            <button className="reset" onClick={onClearFilters} type="button">
              Reset filters
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="rep-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Opportunities <em>{opportunities.length} of {totalRows}</em>
        </div>
        {hasActiveFilters ? (
          <div className="rep-panel-actions">
            <button onClick={onClearFilters} type="button">
              Clear filters
            </button>
          </div>
        ) : null}
      </div>
      <div className="rep-table-scroll">
        <table className="rep-table">
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Opportunity</th>
              <th>Account</th>
              <th>Stage</th>
              <th className="num">Amount</th>
              <th>Close date</th>
              <th>Approval</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opportunity) => {
              const stageIndex = stageOrder.get(opportunity.stageKey);
              const stageLabel = stageLabels.get(opportunity.stageKey) ?? opportunity.stageKey;
              const isSelected = opportunity.id === selectedOpportunityId;
              const isRecent = recentlyCreatedIds.includes(opportunity.id);
              const className = [
                isSelected ? "selected" : "",
                isRecent ? "flash" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <tr
                  className={className || undefined}
                  key={opportunity.id}
                  onClick={() => onSelectOpportunity(opportunity.id)}
                >
                  <td>
                    <div className="rep-cell-truncate">{opportunity.title}</div>
                  </td>
                  <td>
                    <div className="rep-cell-truncate">{opportunity.accountName}</div>
                  </td>
                  <td>
                    <StagePip
                      activeIndex={stageIndex ?? -1}
                      total={stageCount}
                    />
                    <span className="rep-stage-label">{stageLabel}</span>
                  </td>
                  <td className="num">{formatCompactCurrency(opportunity.expectedAmount)}</td>
                  <td>
                    <span className="rep-cell-sub" style={{ marginTop: 0 }}>
                      {opportunity.closeDate ?? "—"}
                    </span>
                  </td>
                  <td>
                    {opportunity.approvalState === "none" ? (
                      <span className="rep-cell-sub" style={{ marginTop: 0 }}>—</span>
                    ) : (
                      <span className={`rep-pill p-${normalizeApproval(opportunity.approvalState)}`}>
                        <span className="dot" />
                        {opportunity.approvalState.replace(/_/g, " ")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {canLoadMore ? (
        <div className="rep-load-more">
          <button className="rep-btn" disabled={isLoadingMore} onClick={onLoadMore} type="button">
            {isLoadingMore ? "Loading…" : `Load more — showing ${opportunities.length} of ${totalRows}`}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function StagePip({ activeIndex, total }: { activeIndex: number; total: number }) {
  return (
    <span className="rep-stage-pip" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <i className={i <= activeIndex ? "on" : ""} key={i} />
      ))}
    </span>
  );
}

export function normalizeApproval(state: string): string {
  return state.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function formatCompactCurrency(value: number | null): string {
  if (value === null) {
    return "—";
  }

  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `$${Math.round(value / 1_000)}K`;
  }

  return `$${value}`;
}
