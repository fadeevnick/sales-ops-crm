import type {
  ReportingDashboardResponse,
  ReportingDrillDownDimension,
  ReportingForecastMetric,
  ReportingOpportunityDrillDownResponse,
  ReportingStageMetric,
} from "../../types/reporting";
import type { CurrentUser } from "../../types/session";
import { useModalChrome } from "../../hooks/useModalChrome";
import {
  ExecutiveDashboard,
  type ApprovalQueue,
  type ClosedQtd,
  type DrillOpportunity,
  type ExceptionType,
  type PipelineStage,
  type ProjectionHealth,
} from "./ExecutiveDashboard";

import { ManagerPipeline, type PipelineOpportunity, type TeamMember } from "./ManagerPipeline";

export type ReportingTab = "pipeline" | "metrics" | "executive";

type DrillDownSelection = {
  dimension: ReportingDrillDownDimension;
  label: string;
  value: string;
};

type DrillDownSelectionHandler = (selection: DrillDownSelection) => void | Promise<void>;

type ReportingPipelineViewProps = {
  currentUser: CurrentUser;
  pipelineError: string | null;
  pipelineLoading: boolean;
  pipelineRows: PipelineOpportunity[];
  pipelineTotal: number;
  isLoadingMorePipeline: boolean;
  onLoadMorePipeline: () => void;
  teamMembers: TeamMember[];
};

type ReportingExecutiveViewProps = {
  currentUser: CurrentUser;
  errorMessage: string | null;
  execApprovalQueues: ApprovalQueue[];
  execExceptionTypes: ExceptionType[];
  execClosedQtd: ClosedQtd;
  execDrillOpps: DrillOpportunity[];
  execProjectionHealth: ProjectionHealth;
  execStages: PipelineStage[];
  isLoading: boolean;
  onNavigateToApprovals?: () => void;
  onRefresh: () => Promise<void>;
  pipelineLoading: boolean;
};

type ReportingMetricsViewProps = {
  canRefresh: boolean;
  drillDown: ReportingOpportunityDrillDownResponse | null;
  drillDownErrorMessage: string | null;
  drillDownSelection?: DrillDownSelection | null;
  errorMessage: string | null;
  forecastByMonth: ReportingForecastMetric[];
  isDrillDownLoading: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  message: string | null;
  onCloseDrillDown: () => void;
  onOpenDrillDown: DrillDownSelectionHandler;
  onRefresh: () => void;
  projection: ReportingDashboardResponse | null;
  stageBreakdown: ReportingStageMetric[];
  stageLabels: Map<string, string>;
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

export function ReportingPipelineView({
  currentUser,
  pipelineError,
  pipelineLoading,
  pipelineRows,
  pipelineTotal,
  isLoadingMorePipeline,
  onLoadMorePipeline,
  teamMembers,
}: ReportingPipelineViewProps) {
  return (
    <>
      {pipelineError ? <div className="error-box">{pipelineError}</div> : null}
      {pipelineLoading ? (
        <div className="empty-row">Loading team pipeline…</div>
      ) : (
        <ManagerPipeline
          currentUser={currentUser}
          teamMembers={teamMembers}
          opportunities={pipelineRows}
          teamName={`${currentUser.tenantName} team`}
          total={pipelineTotal}
          isLoadingMore={isLoadingMorePipeline}
          onLoadMore={onLoadMorePipeline}
        />
      )}
    </>
  );
}

export function ReportingExecutiveView({
  currentUser,
  errorMessage,
  execApprovalQueues,
  execExceptionTypes,
  execClosedQtd,
  execDrillOpps,
  execProjectionHealth,
  execStages,
  isLoading,
  onNavigateToApprovals,
  onRefresh,
  pipelineLoading,
}: ReportingExecutiveViewProps) {
  return isLoading || pipelineLoading ? (
    <div className="empty-row">Loading executive dashboard…</div>
  ) : errorMessage ? (
    <div className="error-box">{errorMessage}</div>
  ) : (
    <ExecutiveDashboard
      currentUser={currentUser}
      pipelineStages={execStages}
      closedQtd={execClosedQtd}
      approvalQueues={execApprovalQueues}
      exceptionTypes={execExceptionTypes}
      projectionHealth={execProjectionHealth}
      opportunities={execDrillOpps}
      onRefresh={onRefresh}
      onOpenApprovals={onNavigateToApprovals}
    />
  );
}

export function ReportingMetricsView({
  canRefresh,
  drillDown,
  drillDownErrorMessage,
  drillDownSelection,
  errorMessage,
  forecastByMonth,
  isDrillDownLoading,
  isLoading,
  isRefreshing,
  message,
  onCloseDrillDown,
  onOpenDrillDown,
  onRefresh,
  projection,
  stageBreakdown,
  stageLabels,
}: ReportingMetricsViewProps) {
  const activeStage = drillDownSelection?.dimension === "stage" ? drillDownSelection.value : null;
  const activeMonth = drillDownSelection?.dimension === "forecastMonth" ? drillDownSelection.value : null;
  return (
    <>
      <div className="reporting-toolbar">
        <div className="reporting-toolbar-lead">
          <strong>{projection ? formatCurrency(projection.metrics.openPipelineAmount) : "..."}</strong>
          <span>open pipeline</span>
        </div>
        <div>
          <strong>{projection ? formatRefreshedAt(projection.refreshedAt) : "No projection loaded"}</strong>
          <span>{projection ? `Refreshed by ${formatUserId(projection.refreshedByUserId)}` : "Stored projection"}</span>
        </div>
        {canRefresh ? (
          <button
            className="primary-button compact-button"
            disabled={isRefreshing}
            onClick={onRefresh}
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
          {projection.metrics.approvalBacklog.avgTurnaroundHours != null && (
            <div className="reporting-metric">
              <span>Avg approval turnaround</span>
              <strong>{projection.metrics.approvalBacklog.avgTurnaroundHours < 1
                ? `${Math.round(projection.metrics.approvalBacklog.avgTurnaroundHours * 60)}m`
                : `${projection.metrics.approvalBacklog.avgTurnaroundHours.toFixed(1)}h`}
              </strong>
              <small className="reporting-metric-foot">completed decisions</small>
            </div>
          )}
          <div className="reporting-metric">
            <span>Tracked opportunities</span>
            <strong>{projection.sourceCounters.opportunityCount}</strong>
            <small className="reporting-metric-foot">
              {projection.sourceCounters.approvalRequestCount} approval requests
            </small>
          </div>

          <MetricList
            activeValue={activeStage}
            emptyLabel="No stage metrics"
            items={stageBreakdown}
            title="Stage Breakdown"
            valueLabel={(item) => stageLabels.get(item.stageKey) ?? item.stageKey}
            amountLabel={(item) => formatCurrency(item.expectedAmount)}
            countLabel={(item) => `${item.opportunityCount} opportunities`}
            onSelect={(item) =>
              void onOpenDrillDown({
                dimension: "stage",
                label: stageLabels.get(item.stageKey) ?? item.stageKey,
                value: item.stageKey,
              })
            }
          />

          <MetricList
            activeValue={activeMonth}
            emptyLabel="No forecast metrics"
            items={forecastByMonth}
            title="Forecast By Month"
            valueLabel={(item) => item.closeMonth}
            amountLabel={(item) => formatCurrency(item.expectedAmount)}
            countLabel={(item) => `${item.opportunityCount} opportunities`}
            onSelect={(item) =>
              void onOpenDrillDown({
                dimension: "forecastMonth",
                label: `Forecast ${item.closeMonth}`,
                value: item.closeMonth,
              })
            }
          />
        </div>
      ) : null}

      {drillDownSelection ? (
        <ReportingDrillDownDrawer
          drillDown={drillDown}
          errorMessage={drillDownErrorMessage}
          isLoading={isDrillDownLoading}
          selectionLabel={drillDownSelection.label}
          stageLabels={stageLabels}
          onClose={onCloseDrillDown}
        />
      ) : null}
    </>
  );
}

function ReportingDrillDownDrawer({
  drillDown,
  errorMessage,
  isLoading,
  selectionLabel,
  stageLabels,
  onClose,
}: {
  drillDown: ReportingOpportunityDrillDownResponse | null;
  errorMessage: string | null;
  isLoading: boolean;
  selectionLabel: string;
  stageLabels: Map<string, string>;
  onClose: () => void;
}) {
  useModalChrome(onClose);
  return (
    <>
      <div className="rep-scrim" onClick={onClose} />
      <aside className="rep-drawer reporting-drilldown-drawer" role="dialog" aria-label="Drill-down">
        <div className="rep-drawer-head">
          <div>
            <div className="rep-drawer-title">Drill-down</div>
            <div className="rep-drawer-sub">{selectionLabel}</div>
          </div>
          <button aria-label="Close" className="rep-drawer-close" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="rep-drawer-body">
          {errorMessage ? <div className="error-box">{errorMessage}</div> : null}
          {isLoading ? <div className="empty-row">Loading drill-down</div> : null}
          {drillDown && !isLoading ? (
            <div className="reporting-drilldown-list">
              {drillDown.items.map((item) => (
                <div className="reporting-drilldown-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.accountName}</span>
                  </div>
                  <span>{item.ownerName}</span>
                  <span>{stageLabels.get(item.stageKey) ?? item.stageKey}</span>
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
      </aside>
    </>
  );
}

type MetricListProps<T extends ReportingStageMetric | ReportingForecastMetric> = {
  activeValue?: string | null;
  amountLabel: (item: T) => string;
  countLabel: (item: T) => string;
  emptyLabel: string;
  items: T[];
  onSelect?: (item: T) => void;
  title: string;
  valueLabel: (item: T) => string;
};

function MetricList<T extends ReportingStageMetric | ReportingForecastMetric>({
  activeValue,
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
        {items.map((item) => {
          const isActive = activeValue != null && valueLabel(item) === activeValue;
          return (
            <div className={isActive ? "reporting-row reporting-row--active" : "reporting-row"} key={valueLabel(item)}>
              <div>
                <strong>{valueLabel(item)}</strong>
                <span>{countLabel(item)}</span>
              </div>
              <div className="reporting-row-actions">
                <span>{amountLabel(item)}</span>
                {onSelect ? (
                  <button
                    aria-pressed={isActive}
                    className={isActive ? "primary-button compact-button" : "secondary-button compact-button"}
                    onClick={() => onSelect(item)}
                    type="button"
                  >
                    {isActive ? "Viewing" : "View"}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {items.length === 0 ? <div className="empty-row">{emptyLabel}</div> : null}
      </div>
    </div>
  );
}

function formatCurrency(value: number | string): string {
  return currencyFormatter.format(Number(value));
}

function formatUserId(userId: string): string {
  return userId.replace(/^user_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRefreshedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFormatter.format(date);
}
