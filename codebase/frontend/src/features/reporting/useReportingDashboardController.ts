import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  ReportingOpportunityDrillDownResponse,
} from "../../types/reporting";
import type { CurrentUser } from "../../types/session";
import {
  buildExecApprovalQueues,
  buildExecClosedQtd,
  buildExecDrillOpps,
  buildExecExceptionTypes,
  buildExecProjectionHealth,
  buildExecStages,
  buildPipelineRows,
  buildTeamMembers,
} from "./reportingDashboardAdapters";
import type { ReportingTab } from "./ReportingDashboardViews";

const PIPELINE_PAGE_SIZE = 20;

type DrillDownSelection = {
  dimension: ReportingDrillDownDimension;
  label: string;
  value: string;
};

export function useReportingDashboardController(currentUser: CurrentUser) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab: ReportingTab = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/reporting/executive")) return "executive";
    if (path.startsWith("/reporting/metrics")) return "metrics";
    return "pipeline";
  }, [location.pathname]);

  const selectTab = (tab: ReportingTab) => navigate(`/reporting/${tab}`);

  // Pipeline-tab data
  const [opportunities, setOpportunities] = useState<OpportunityListItem[]>([]);
  const [pipelineTotal, setPipelineTotal] = useState(0);
  const [pipelinePage, setPipelinePage] = useState(1);
  const [isLoadingMorePipeline, setIsLoadingMorePipeline] = useState(false);
  const [stageOrder, setStageOrder] = useState<string[]>([]);
  const [stageLabels, setStageLabels] = useState<Map<string, string>>(new Map());
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Metrics / executive-tab data (shared)
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

  useEffect(() => {
    if (location.pathname === "/reporting" || location.pathname === "/reporting/") {
      navigate("/reporting/pipeline", { replace: true });
    }
  }, [location.pathname, navigate]);

  // ── Pipeline data load ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setPipelineLoading(true);
      setPipelineError(null);
      try {
        const [opps, metadata] = await Promise.all([
          fetchOpportunities(currentUser.userId, {}, { page: 1, pageSize: PIPELINE_PAGE_SIZE }),
          fetchPublishedMetadata(currentUser.userId),
        ]);
        if (cancelled) return;
        setOpportunities(opps.items);
        setPipelineTotal(opps.total);
        setPipelinePage(1);
        setStageOrder(metadata.stages.map((s) => s.stageKey));
        setStageLabels(new Map(metadata.stages.map((s) => [s.stageKey, s.displayName])));
      } catch (error) {
        if (!cancelled) setPipelineError(describeRequestError(error));
      } finally {
        if (!cancelled) setPipelineLoading(false);
      }
    };
    void load();
    void fetchAccounts(currentUser.userId).catch(() => undefined);
    return () => { cancelled = true; };
  }, [currentUser.userId]);

  // ── Metrics load (lazy on metrics or executive tab open) ─────────────────
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
    if ((activeTab === "metrics" || activeTab === "executive") && !metricsLoaded) {
      setMessage(null);
      void loadProjection();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const closeDrillDown = () => {
    setDrillDown(null);
    setDrillDownSelection(null);
    setDrillDownErrorMessage(null);
  };

  const loadMorePipeline = async () => {
    if (isLoadingMorePipeline) return;
    if (opportunities.length >= pipelineTotal) return;
    setIsLoadingMorePipeline(true);
    try {
      const nextPage = pipelinePage + 1;
      const response = await fetchOpportunities(currentUser.userId, {}, { page: nextPage, pageSize: PIPELINE_PAGE_SIZE });
      setOpportunities((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...response.items.filter((item) => !seen.has(item.id))];
      });
      setPipelineTotal(response.total);
      setPipelinePage(nextPage);
    } catch (error) {
      setPipelineError(describeRequestError(error));
    } finally {
      setIsLoadingMorePipeline(false);
    }
  };

  const stageBreakdown = projection?.metrics.stageBreakdown ?? [];
  const forecastByMonth = projection?.metrics.forecastByMonth ?? [];

  const pipelineRows = useMemo(
    () => buildPipelineRows(opportunities, stageOrder, stageLabels),
    [opportunities, stageOrder, stageLabels],
  );
  const teamMembers = useMemo(
    () => buildTeamMembers(opportunities, stageOrder),
    [opportunities, stageOrder],
  );
  const execStages = useMemo(
    () => buildExecStages(projection, stageBreakdown, stageOrder, stageLabels),
    [projection, stageBreakdown, stageOrder, stageLabels],
  );
  const execDrillOpps = useMemo(
    () => buildExecDrillOpps(opportunities, stageOrder),
    [opportunities, stageOrder],
  );
  const execApprovalQueues = useMemo(() => buildExecApprovalQueues(projection), [projection]);
  const execExceptionTypes = useMemo(() => buildExecExceptionTypes(projection), [projection]);
  const execClosedQtd = useMemo(() => buildExecClosedQtd(projection), [projection]);
  const execProjectionHealth = useMemo(() => buildExecProjectionHealth(projection), [projection]);

  // Refresh handler for executive dashboard.
  // - revops_admin: triggers backend recompute via refreshReportingDashboard.
  // - sales_manager: re-fetches current stored projection (read-only).
  // Both update local state and propagate API errors to the caller.
  const handleExecRefresh = async (): Promise<void> => {
    if (canRefresh) {
      const res = await refreshReportingDashboard(currentUser.userId);
      setProjection(res.projection);
    } else {
      const res = await fetchReportingDashboard(currentUser.userId);
      setProjection(res);
    }
  };

  // Executive & Metrics load their projection lazily on first visit. Until that
  // first load resolves, treat the tab as loading — otherwise the first paint
  // (isLoading still false, projection still null) renders an empty body.
  const metricsViewLoading = isLoading || !metricsLoaded;

  return {
    activeTab,
    selectTab,
    canRefresh,
    metricsViewLoading,
    pipelineError,
    pipelineLoading,
    pipelineRows,
    pipelineTotal,
    isLoadingMorePipeline,
    loadMorePipeline,
    teamMembers,
    projection,
    stageBreakdown,
    stageLabels,
    forecastByMonth,
    isLoading,
    isRefreshing,
    isDrillDownLoading,
    drillDown,
    drillDownSelection,
    errorMessage,
    drillDownErrorMessage,
    message,
    execStages,
    execDrillOpps,
    execApprovalQueues,
    execExceptionTypes,
    execClosedQtd,
    execProjectionHealth,
    handleRefresh,
    handleExecRefresh,
    openDrillDown,
    closeDrillDown,
  };
}
