import { requestJson } from "./session";
import type {
  ReportingDrillDownDimension,
  ReportingDashboardResponse,
  ReportingOpportunityDrillDownResponse,
  ReportingProjectionRefreshResponse,
} from "../types/reporting";

export function fetchReportingDashboard(userId: string): Promise<ReportingDashboardResponse> {
  return requestJson<ReportingDashboardResponse>("/api/reporting/dashboard", { userId });
}

export function refreshReportingDashboard(userId: string): Promise<ReportingProjectionRefreshResponse> {
  return requestJson<ReportingProjectionRefreshResponse>("/api/reporting/dashboard/refresh", {
    method: "POST",
    userId,
  });
}

export function fetchReportingOpportunityDrillDown(
  userId: string,
  dimension: ReportingDrillDownDimension,
  value: string,
  limit = 25,
): Promise<ReportingOpportunityDrillDownResponse> {
  const params = new URLSearchParams({
    dimension,
    value,
    limit: String(limit),
  });

  return requestJson<ReportingOpportunityDrillDownResponse>(
    `/api/reporting/dashboard/drill-down?${params.toString()}`,
    { userId },
  );
}
