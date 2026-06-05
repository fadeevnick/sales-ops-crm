import { requestJson } from "./session";
import type { ActivityListResponse, CreateActivityRequest, CreateActivityResponse } from "../types/crm";

export function fetchActivities(
  userId: string,
  opportunityId: string,
): Promise<ActivityListResponse> {
  return requestJson<ActivityListResponse>(`/api/opportunities/${opportunityId}/activities`, {
    userId,
  });
}

export function createActivity(
  userId: string,
  opportunityId: string,
  request: CreateActivityRequest,
): Promise<CreateActivityResponse> {
  return requestJson<CreateActivityResponse>(`/api/opportunities/${opportunityId}/activities`, {
    body: request,
    method: "POST",
    userId,
  });
}
