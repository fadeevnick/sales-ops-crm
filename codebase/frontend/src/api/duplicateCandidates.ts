import { requestJson } from "./session";
import type {
  AccountDuplicateCandidateMergeResponse,
  ContactDuplicateCandidateMergeResponse,
  DuplicateCandidateGenerationResponse,
  DuplicateCandidateItem,
  DuplicateCandidateListResponse,
  GenerateDuplicateCandidatesRequest,
  MergeDuplicateCandidateRequest,
  RejectDuplicateCandidateRequest,
} from "../types/duplicateCandidates";

export function generateDuplicateCandidates(
  userId: string,
  request: GenerateDuplicateCandidatesRequest,
): Promise<DuplicateCandidateGenerationResponse> {
  return requestJson<DuplicateCandidateGenerationResponse>("/api/duplicate-candidates/generate", {
    body: request,
    method: "POST",
    userId,
  });
}

export function fetchDuplicateCandidates(
  userId: string,
  params: { entityType?: string; status?: string; limit?: number } = {},
): Promise<DuplicateCandidateListResponse> {
  const searchParams = new URLSearchParams();
  if (params.entityType) {
    searchParams.set("entityType", params.entityType);
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();
  return requestJson<DuplicateCandidateListResponse>(
    `/api/duplicate-candidates${queryString ? `?${queryString}` : ""}`,
    { userId },
  );
}

export function rejectDuplicateCandidate(
  userId: string,
  candidateId: string,
  request: RejectDuplicateCandidateRequest,
): Promise<DuplicateCandidateItem> {
  return requestJson<DuplicateCandidateItem>(`/api/duplicate-candidates/${candidateId}/reject`, {
    body: request,
    method: "POST",
    userId,
  });
}

export function mergeAccountDuplicateCandidate(
  userId: string,
  candidateId: string,
  request: MergeDuplicateCandidateRequest,
): Promise<AccountDuplicateCandidateMergeResponse> {
  return requestJson<AccountDuplicateCandidateMergeResponse>(`/api/duplicate-candidates/${candidateId}/merge-account`, {
    body: request,
    method: "POST",
    userId,
  });
}

export function mergeContactDuplicateCandidate(
  userId: string,
  candidateId: string,
  request: MergeDuplicateCandidateRequest,
): Promise<ContactDuplicateCandidateMergeResponse> {
  return requestJson<ContactDuplicateCandidateMergeResponse>(`/api/duplicate-candidates/${candidateId}/merge-contact`, {
    body: request,
    method: "POST",
    userId,
  });
}
