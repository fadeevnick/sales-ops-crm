import { useEffect, useMemo, useState } from "react";
import { fetchAccounts } from "../../api/accounts";
import { fetchPublishedMetadata } from "../../api/metadata";
import { fetchOpportunities } from "../../api/opportunities";
import {
  fetchReportingDashboard,
  fetchReportingOpportunityDrillDown,
  refreshReportingDashboard,
} from "../../api/reporting";
import { describeRequestError } from "../../api/session";
import type { OpportunityListItem } from "../../types/crm";
import type {
  ReportingDrillDownDimension,
  ReportingDashboardResponse,
  ReportingForecastMetric,
  ReportingOpportunityDrillDownResponse,
  ReportingStageMetric,
} from "../../types/reporting";
import type { CurrentUser } from "../../types/session";
import { ManagerPipeline, type PipelineOpportunity, type TeamMember } from "./ManagerPipeline";

type ReportingDashboardProps = {
  currentUser: CurrentUser;
};

type DrillDownSelection = {
  dimension: ReportingDrillDownDimension;
  label: string;
  value: string;
};

type ReportingTab = "pipeline" | "metrics";

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
  const [activeTab, setActiveTab] = useState<ReportingTab>("pipeline");

  // Pipeline-tab data
  const [opportunities, setOpportunities] = useState<OpportunityListItem[]>([]);
  const [stageOrder, setStageOrder] = useState<string[]>([]);
  const [stageLabels, setStageLabels] = useState<Map<string, string>>(new Map());
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Metrics-tab data
  const [projection, setProjection] = useState<ReportingDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDrillDownLoading, setIsDrillDownLoading] = useState(false);
  const [drillDown, setDrillDown] = useState<ReportingOpportunityDrillDownResponse | null>(null);
  const [drillDownSelection, setDrillDownSelection] = useState<DrillDownSelection | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [drillDownErrorMessage, setDrillDownErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [metricsLoaded, setMetricsLoaded] = useState(false);

  const canRefresh = currentUser.roleKey === "revops_admin";

  // ── Pipeline data load ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setPipelineLoading(true);
      setPipelineError(null);
      try {
        const [opps, metadata] = await Promise.all([
          fetchOpportunities(currentUser.userId, {}),
          fetchPublishedMetadata(currentUser.userId),
        ]);
        if (cancelled) return;
        setOpportunities(opps.items);
        setStageOrder(metadata.stages.map((s) => s.stageKey));
        setStageLabels(new Map(metadata.stages.map((s) => [s.stageKey, s.displayName])));
      } catch (error) {
        if (!cancelled) setPipelineError(describeRequestError(error));
      } finally {
        if (!cancelled) setPipelineLoading(false);
      }
    };
    void load();
    // Also kick off accounts cache (not strictly needed but warms cache for drill-downs)
    void fetchAccounts(currentUser.userId).catch(() => undefined);
    return () => { cancelled = true; };
  }, [currentUser.userId]);

  // ── Metrics load (lazy on tab open) ─────────────────────────────────────
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
      setMetricsLoaded(true);
    }
  };

  useEffect(() => {
    if (activeTab === "metrics" && !metricsLoaded) {
      setMessage(null);
      void loadProjection();
    }
  }, [activeTab, metricsLoaded, currentUser.userId]);

  const handleRefresh = async () => {
    if (!canRefresh || isRefreshing) return;
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

  // ── Build PipelineOpportunity[] + TeamMember[] from opportunities ───────
  const pipelineRows: PipelineOpportunity[] = useMemo(() => {
    const today = new Date();
    return opportunities.map((o) => {
      const stageIndex = stageOrder.indexOf(o.stageKey);
      let riskKey: string | undefined;
      let riskLabel: string | undefined;
      if (o.closeDate) {
        const close = new Date(o.closeDate);
        if (!Number.isNaN(close.getTime())) {
          const days = Math.round((close.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 0 && days <= 14 && o.approvalState !== "approved") {
            riskKey = "close";
            riskLabel = "Closing soon";
          }
        }
      }
      if (o.approvalState === "sent_back") {
        riskKey = "sla";
        riskLabel = "Sent back";
      }
      const approvalState =
        o.approvalState === "sent_back"
          ? "sentback"
          : o.approvalState === "none"
            ? undefined
            : o.approvalState;
      return {
        id: o.id,
        title: o.title,
        accountName: o.accountName,
        accountId: o.accountId,
        ownerId: o.ownerId,
        ownerName: o.ownerName,
        stageKey: o.stageKey,
        stageLabel: stageLabels.get(o.stageKey) ?? o.stageKey,
        stageIndex: stageIndex >= 0 ? stageIndex : undefined,
        expectedAmount: o.expectedAmount ?? undefined,
        closeDate: o.closeDate ?? undefined,
        approvalState,
        approvalLabel: o.approvalState?.replace(/_/g, " "),
        riskKey,
        riskLabel,
      };
    });
  }, [opportunities, stageOrder, stageLabels]);

  const teamMembers: TeamMember[] = useMemo(() => {
    const byOwner = new Map<string, TeamMember & { _opps: OpportunityListItem[] }>();
    for (const o of opportunities) {
      let entry = byOwner.get(o.ownerId);
      if (!entry) {
        entry = {
          id: o.ownerId,
          displayName: o.ownerName,
          initials: getInitials(o.ownerName),
          colorKey: pickColorKey(o.ownerId),
          openOppsCount: 0,
          pipelineTotal: 0,
          weightedPipeline: 0,
          pendingApprovals: 0,
          overdueActivities: 0,
          closingThisMonth: 0,
          _opps: [],
        };
        byOwner.set(o.ownerId, entry);
      }
      entry._opps.push(o);
      entry.openOppsCount = (entry.openOppsCount ?? 0) + 1;
      entry.pipelineTotal = (entry.pipelineTotal ?? 0) + (o.expectedAmount ?? 0);
      entry.weightedPipeline = (entry.weightedPipeline ?? 0) + (o.expectedAmount ?? 0) * weightForStage(o.stageKey, stageOrder);
      if (o.approvalState === "pending" || o.approvalState === "sent_back") {
        entry.pendingApprovals = (entry.pendingApprovals ?? 0) + 1;
      }
      const monthPrefix = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      if (o.closeDate?.startsWith(monthPrefix)) {
        entry.closingThisMonth = (entry.closingThisMonth ?? 0) + 1;
      }
    }
    return Array.from(byOwner.values()).map(({ _opps, ...m }) => {
      void _opps;
      return m;
    });
  }, [opportunities, stageOrder]);

  const stageBreakdown = projection?.metrics.stageBreakdown ?? [];
  const forecastByMonth = projection?.metrics.forecastByMonth ?? [];

  return (
    <section className="reporting-workspace">
      <div className="reporting-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "pipeline"}
          className={activeTab === "pipeline" ? "rep-btn rep-btn-primary" : "rep-btn"}
          onClick={() => setActiveTab("pipeline")}
        >
          Team Pipeline
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "metrics"}
          className={activeTab === "metrics" ? "rep-btn rep-btn-primary" : "rep-btn"}
          onClick={() => setActiveTab("metrics")}
        >
          Aggregate Metrics
        </button>
      </div>

      {activeTab === "pipeline" ? (
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
            />
          )}
        </>
      ) : (
        <>
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
        </>
      )}
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
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFormatter.format(date);
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const COLOR_KEYS = ["c1", "c2", "c3", "c4", "c5", "c6"];

function pickColorKey(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLOR_KEYS[h % COLOR_KEYS.length];
}

function weightForStage(stageKey: string, stageOrder: string[]): number {
  const idx = stageOrder.indexOf(stageKey);
  if (idx < 0 || stageOrder.length === 0) return 0.5;
  return Math.min(1, (idx + 1) / stageOrder.length);
}
