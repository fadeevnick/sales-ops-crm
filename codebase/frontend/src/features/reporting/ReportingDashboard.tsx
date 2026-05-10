import { useEffect, useState } from "react";
import {
  fetchReportingDashboard,
  fetchReportingOpportunityDrillDown,
  refreshReportingDashboard,
} from "../../api/reporting";
import { describeRequestError } from "../../api/session";
import type {
  ReportingDrillDownDimension,
  ReportingDashboardResponse,
  ReportingForecastMetric,
  ReportingOpportunityDrillDownResponse,
  ReportingStageMetric,
} from "../../types/reporting";
import type { CurrentUser } from "../../types/session";

type ReportingDashboardProps = {
  currentUser: CurrentUser;
};

type DrillDownSelection = {
  dimension: ReportingDrillDownDimension;
  label: string;
  value: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ReportingDashboard({ currentUser }: ReportingDashboardProps) {
  const [projection, setProjection] = useState<ReportingDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDrillDownLoading, setIsDrillDownLoading] = useState(false);
  const [drillDown, setDrillDown] = useState<ReportingOpportunityDrillDownResponse | null>(null);
  const [drillDownSelection, setDrillDownSelection] = useState<DrillDownSelection | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [drillDownErrorMessage, setDrillDownErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canRefresh = currentUser.roleKey === "revops_admin";

  const loadProjection = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchReportingDashboard(currentUser.userId);
      setProjection(response);
    } catch (error) {
      setProjection(null);
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMessage(null);
    void loadProjection();
  }, [currentUser.userId]);

  const handleRefresh = async () => {
    if (!canRefresh || isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await refreshReportingDashboard(currentUser.userId);
      setProjection(response.projection);
      setDrillDown(null);
      setDrillDownSelection(null);
      setMessage("Projection refreshed");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsRefreshing(false);
    }
  };

  const openDrillDown = async (selection: DrillDownSelection) => {
    setIsDrillDownLoading(true);
    setDrillDownErrorMessage(null);
    setDrillDownSelection(selection);

    try {
      const response = await fetchReportingOpportunityDrillDown(
        currentUser.userId,
        selection.dimension,
        selection.value,
      );
      setDrillDown(response);
    } catch (error) {
      setDrillDown(null);
      setDrillDownErrorMessage(describeRequestError(error));
    } finally {
      setIsDrillDownLoading(false);
    }
  };

  const stageBreakdown = projection?.metrics.stageBreakdown ?? [];
  const forecastByMonth = projection?.metrics.forecastByMonth ?? [];

  return (
    <section className="reporting-workspace">
      <div className="workspace-header">
        <div>
          <span>{currentUser.displayName}</span>
          <h2>Reporting Dashboard</h2>
        </div>
        <div className="workspace-metrics">
          <strong>{projection ? formatCurrency(projection.metrics.openPipelineAmount) : "..."}</strong>
          <span>open pipeline</span>
        </div>
      </div>

      <div className="reporting-toolbar">
        <div>
          <strong>{projection ? formatRefreshedAt(projection.refreshedAt) : "No projection loaded"}</strong>
          <span>{projection ? `Refreshed by ${projection.refreshedByUserId}` : "Stored projection"}</span>
        </div>
        {canRefresh ? (
          <button
            className="primary-button compact-button"
            disabled={isRefreshing}
            onClick={() => void handleRefresh()}
            type="button"
          >
            {isRefreshing ? "Refreshing" : "Refresh"}
          </button>
        ) : null}
      </div>

      {errorMessage ? <div className="error-box">{errorMessage}</div> : null}
      {message ? <div className="success-box">{message}</div> : null}
      {isLoading ? <div className="empty-row">Loading reporting dashboard</div> : null}

      {projection && !isLoading ? (
        <div className="reporting-grid">
          <div className="reporting-metric">
            <span>Open opportunities</span>
            <strong>{projection.metrics.openPipelineCount}</strong>
          </div>
          <div className="reporting-metric">
            <span>Pending approvals</span>
            <strong>{projection.metrics.approvalBacklog.pendingRequests}</strong>
          </div>
          <div className="reporting-metric">
            <span>Active approval steps</span>
            <strong>{projection.metrics.approvalBacklog.activeSteps}</strong>
          </div>
          <div className="reporting-metric">
            <span>Tracked opportunities</span>
            <strong>{projection.sourceCounters.opportunityCount}</strong>
          </div>

          <MetricList
            emptyLabel="No stage metrics"
            items={stageBreakdown}
            title="Stage Breakdown"
            valueLabel={(item) => item.stageKey}
            amountLabel={(item) => formatCurrency(item.expectedAmount)}
            countLabel={(item) => `${item.opportunityCount} opportunities`}
            onSelect={(item) =>
              void openDrillDown({
                dimension: "stage",
                label: `Stage ${item.stageKey}`,
                value: item.stageKey,
              })
            }
          />

          <MetricList
            emptyLabel="No forecast metrics"
            items={forecastByMonth}
            title="Forecast By Month"
            valueLabel={(item) => item.closeMonth}
            amountLabel={(item) => formatCurrency(item.expectedAmount)}
            countLabel={(item) => `${item.opportunityCount} opportunities`}
            onSelect={(item) =>
              void openDrillDown({
                dimension: "forecastMonth",
                label: `Forecast ${item.closeMonth}`,
                value: item.closeMonth,
              })
            }
          />

          <div className="reporting-section">
            <div className="section-heading">
              <h3>Source Counters</h3>
              <span>{projection.sourceCounters.approvalRequestCount} approvals</span>
            </div>
            <dl className="detail-grid metadata-detail-grid">
              <div>
                <dt>Opportunities</dt>
                <dd>{projection.sourceCounters.opportunityCount}</dd>
              </div>
              <div>
                <dt>Approval requests</dt>
                <dd>{projection.sourceCounters.approvalRequestCount}</dd>
              </div>
            </dl>
          </div>

          <div className="reporting-section reporting-drilldown-section">
            <div className="section-heading">
              <h3>Drill-Down</h3>
              <span>{drillDownSelection?.label ?? "No selection"}</span>
            </div>
            {drillDownErrorMessage ? <div className="error-box">{drillDownErrorMessage}</div> : null}
            {isDrillDownLoading ? <div className="empty-row">Loading drill-down</div> : null}
            {!drillDown && !isDrillDownLoading ? (
              <div className="empty-row">Select a stage or forecast month</div>
            ) : null}
            {drillDown && !isDrillDownLoading ? (
              <div className="reporting-drilldown-list">
                {drillDown.items.map((item) => (
                  <div className="reporting-drilldown-row" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.accountName}</span>
                    </div>
                    <span>{item.ownerName}</span>
                    <span>{item.stageKey}</span>
                    <span>{formatCurrency(item.expectedAmount ?? 0)}</span>
                    <span>{item.closeDate ?? "No close date"}</span>
                    <span>{item.approvalState}</span>
                  </div>
                ))}
                {drillDown.items.length === 0 ? (
                  <div className="empty-row">No opportunities in this drill-down</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

type MetricListProps<T extends ReportingStageMetric | ReportingForecastMetric> = {
  amountLabel: (item: T) => string;
  countLabel: (item: T) => string;
  emptyLabel: string;
  items: T[];
  onSelect?: (item: T) => void;
  title: string;
  valueLabel: (item: T) => string;
};

function MetricList<T extends ReportingStageMetric | ReportingForecastMetric>({
  amountLabel,
  countLabel,
  emptyLabel,
  items,
  onSelect,
  title,
  valueLabel,
}: MetricListProps<T>) {
  return (
    <div className="reporting-section">
      <div className="section-heading">
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>
      <div className="reporting-row-list">
        {items.map((item) => (
          <div className="reporting-row" key={valueLabel(item)}>
            <div>
              <strong>{valueLabel(item)}</strong>
              <span>{countLabel(item)}</span>
            </div>
            <div className="reporting-row-actions">
              <span>{amountLabel(item)}</span>
              {onSelect ? (
                <button
                  className="secondary-button compact-button"
                  onClick={() => onSelect(item)}
                  type="button"
                >
                  View
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {items.length === 0 ? <div className="empty-row">{emptyLabel}</div> : null}
      </div>
    </div>
  );
}

function formatCurrency(value: number | string): string {
  return currencyFormatter.format(Number(value));
}

function formatRefreshedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
}
