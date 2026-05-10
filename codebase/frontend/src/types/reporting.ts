export type ReportingDashboardResponse = {
  refreshedAt: string;
  refreshedByUserId: string;
  metrics: ReportingDashboardMetrics;
  sourceCounters: ReportingSourceCounters;
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
};

export type ReportingStageMetric = {
  stageKey: string;
  opportunityCount: number;
  expectedAmount: number | string;
};

export type ReportingForecastMetric = {
  closeMonth: string;
  opportunityCount: number;
  expectedAmount: number | string;
};

export type ReportingApprovalBacklogMetric = {
  pendingRequests: number;
  activeSteps: number;
};

export type ReportingSourceCounters = {
  opportunityCount: number;
  approvalRequestCount: number;
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
