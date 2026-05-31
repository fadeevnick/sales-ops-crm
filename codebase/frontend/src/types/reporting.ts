export type ReportingDashboardResponse = {
  refreshedAt: string;
  refreshedByUserId: string;
  metrics: ReportingDashboardMetrics;
  sourceCounters: ReportingSourceCounters;
  refreshDurationMs?: number | null;
};

export type ReportingProjectionRefreshResponse = {
  projection: ReportingDashboardResponse;
};

export type ReportingDashboardMetrics = {
  openPipelineCount: number;
  openPipelineAmount: number | string;
  stageBreakdown: ReportingStageMetric[];
  forecastByMonth: ReportingForecastMetric[];
  approvalBacklog: ReportingApprovalBacklogMetric;
  closedWonQtd?: ReportingClosedWonQtdMetric;
};

export type ReportingStageMetric = {
  stageKey: string;
  opportunityCount: number;
  expectedAmount: number | string;
  stuckCount?: number;
};

export type ReportingForecastMetric = {
  closeMonth: string;
  opportunityCount: number;
  expectedAmount: number | string;
};

export type ReportingApprovalBacklogMetric = {
  pendingRequests: number;
  activeSteps: number;
  avgTurnaroundHours?: number | null;
  queueBreakdown?: ReportingApprovalQueueMetric[];
  exceptionBreakdown?: ReportingExceptionTypeMetric[];
};

export type ReportingApprovalQueueMetric = {
  roleKey: string;
  pending: number;
  overdue: number;
  avgTurnaroundHours?: number | null;
};

export type ReportingExceptionTypeMetric = {
  policyKey: string;
  count: number;
  totalExpectedAmount: number | string;
};

export type ReportingClosedWonQtdMetric = {
  count: number;
  totalExpectedAmount: number | string;
};

export type ReportingSourceCounters = {
  opportunityCount: number;
  approvalRequestCount: number;
  pendingImports?: number;
  pendingMerges?: number;
};

export type ReportingDrillDownDimension = "stage" | "forecastMonth";

export type ReportingOpportunityDrillDownResponse = {
  dimension: ReportingDrillDownDimension;
  value: string;
  items: ReportingOpportunityDrillDownItem[];
  limit: number;
};

export type ReportingOpportunityDrillDownItem = {
  id: string;
  title: string;
  accountId: string;
  accountName: string;
  ownerId: string;
  ownerName: string;
  stageKey: string;
  expectedAmount: number | string | null;
  closeDate: string | null;
  approvalState: string;
};
