import { requestJson } from "./session";
import type {
  CreateSavedOpportunityViewRequest,
  CreateSavedOpportunityViewResponse,
  DeleteSavedOpportunityViewResponse,
  SavedOpportunityViewListResponse,
  UpdateSavedOpportunityViewRequest,
  UpdateSavedOpportunityViewResponse,
} from "../types/crm";

export function fetchSavedOpportunityViews(
  userId: string,
): Promise<SavedOpportunityViewListResponse> {
  return requestJson<SavedOpportunityViewListResponse>("/api/opportunity-saved-views", {
    userId,
  });
}

export function createSavedOpportunityView(
  userId: string,
  request: CreateSavedOpportunityViewRequest,
): Promise<CreateSavedOpportunityViewResponse> {
  return requestJson<CreateSavedOpportunityViewResponse>("/api/opportunity-saved-views", {
    body: request,
    method: "POST",
    userId,
  });
}

export function updateSavedOpportunityView(
  userId: string,
  savedViewId: string,
  request: UpdateSavedOpportunityViewRequest,
): Promise<UpdateSavedOpportunityViewResponse> {
  return requestJson<UpdateSavedOpportunityViewResponse>(
    `/api/opportunity-saved-views/${savedViewId}`,
    {
      body: request,
      method: "PATCH",
      userId,
    },
  );
}

export function deleteSavedOpportunityView(
  userId: string,
  savedViewId: string,
): Promise<DeleteSavedOpportunityViewResponse> {
  return requestJson<DeleteSavedOpportunityViewResponse>(
    `/api/opportunity-saved-views/${savedViewId}`,
    {
      method: "DELETE",
      userId,
    },
  );
}
