import { requestJson } from "./session";
import type {
  CreateOpportunityRequest,
  CreateOpportunityResponse,
  MoveOpportunityStageRequest,
  MoveOpportunityStageResponse,
  OpportunityDetail,
  OpportunityListResponse,
  OpportunitySavedViewFilters,
  ReassignOpportunityOwnerRequest,
  ReassignOpportunityOwnerResponse,
  UpdateOpportunityRequest,
  UpdateOpportunityResponse,
} from "../types/crm";

export function fetchOpportunities(
  userId: string,
  filters: OpportunitySavedViewFilters = {},
  pagination: { page?: number; pageSize?: number } = {},
): Promise<OpportunityListResponse> {
  const params = new URLSearchParams();
  appendParam(params, "stage", filters.stageKey);
  appendParam(params, "ownerId", filters.ownerId);
  appendParam(params, "accountId", filters.accountId);
  appendParam(params, "q", filters.query);
  Object.entries(filters.customFields ?? {}).forEach(([fieldKey, value]) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      appendParam(params, `cf.${fieldKey}`, String(value));
    }
  });
  if (pagination.page) appendParam(params, "page", String(pagination.page));
  if (pagination.pageSize) appendParam(params, "pageSize", String(pagination.pageSize));
  const query = params.toString();

  return requestJson<OpportunityListResponse>(
    `/api/opportunities${query ? `?${query}` : ""}`,
    { userId },
  );
}

export type OpportunitySummary = {
  open: number;
  pipelineValue: number;
  pendingApprovals: number;
  closingThisMonth: number;
};

/** Full-scope KPI aggregate — stable regardless of how many list pages are loaded. */
export function fetchOpportunitySummary(
  userId: string,
  filters: OpportunitySavedViewFilters = {},
): Promise<OpportunitySummary> {
  const params = new URLSearchParams();
  appendParam(params, "stage", filters.stageKey);
  appendParam(params, "ownerId", filters.ownerId);
  appendParam(params, "accountId", filters.accountId);
  appendParam(params, "q", filters.query);
  Object.entries(filters.customFields ?? {}).forEach(([fieldKey, value]) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      appendParam(params, `cf.${fieldKey}`, String(value));
    }
  });
  const query = params.toString();
  return requestJson<OpportunitySummary>(
    `/api/opportunities/summary${query ? `?${query}` : ""}`,
    { userId },
  );
}

export function fetchOpportunityDetail(
  userId: string,
  opportunityId: string,
): Promise<OpportunityDetail> {
  return requestJson<OpportunityDetail>(`/api/opportunities/${opportunityId}`, { userId });
}

export type AssignableOwner = { id: string; displayName: string };

export function fetchAssignableOwners(userId: string): Promise<{ owners: AssignableOwner[] }> {
  return requestJson<{ owners: AssignableOwner[] }>("/api/opportunities/assignable-owners", { userId });
}

export function createOpportunity(
  userId: string,
  request: CreateOpportunityRequest,
): Promise<CreateOpportunityResponse> {
  return requestJson<CreateOpportunityResponse>("/api/opportunities", {
    body: request,
    method: "POST",
    userId,
  });
}

export function updateOpportunity(
  userId: string,
  opportunityId: string,
  request: UpdateOpportunityRequest,
): Promise<UpdateOpportunityResponse> {
  return requestJson<UpdateOpportunityResponse>(`/api/opportunities/${opportunityId}`, {
    body: request,
    method: "PATCH",
    userId,
  });
}

export function moveOpportunityStage(
  userId: string,
  opportunityId: string,
  request: MoveOpportunityStageRequest,
): Promise<MoveOpportunityStageResponse> {
  return requestJson<MoveOpportunityStageResponse>(
    `/api/opportunities/${opportunityId}/move-stage`,
    {
      body: request,
      method: "POST",
      userId,
    },
  );
}

export function reassignOpportunityOwner(
  userId: string,
  opportunityId: string,
  request: ReassignOpportunityOwnerRequest,
): Promise<ReassignOpportunityOwnerResponse> {
  return requestJson<ReassignOpportunityOwnerResponse>(
    `/api/opportunities/${opportunityId}/reassign-owner`,
    {
      body: request,
      method: "POST",
      userId,
    },
  );
}

function appendParam(params: URLSearchParams, key: string, value?: string): void {
  const normalized = value?.trim();
  if (normalized) {
    params.set(key, normalized);
  }
}
