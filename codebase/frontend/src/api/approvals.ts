import { requestJson } from "./session";
import type {
  ApprovalDecisionRequest,
  ApprovalDecisionResponse,
  ApprovalDetailResponse,
  ApprovalInboxResponse,
  SubmitApprovalRequest,
  SubmitApprovalResponse,
} from "../types/approvals";

export function submitApproval(
  userId: string,
  opportunityId: string,
  request: SubmitApprovalRequest,
): Promise<SubmitApprovalResponse> {
  return requestJson<SubmitApprovalResponse>(
    `/api/opportunities/${opportunityId}/submit-approval`,
    {
      body: request,
      method: "POST",
      userId,
    },
  );
}

export function fetchApprovalInbox(userId: string): Promise<ApprovalInboxResponse> {
  return requestJson<ApprovalInboxResponse>("/api/approvals/inbox", { userId });
}

export function fetchApprovalDetail(
  userId: string,
  approvalRequestId: string,
): Promise<ApprovalDetailResponse> {
  return requestJson<ApprovalDetailResponse>(`/api/approvals/${approvalRequestId}`, { userId });
}

export function approveApproval(
  userId: string,
  approvalRequestId: string,
  request: ApprovalDecisionRequest,
): Promise<ApprovalDecisionResponse> {
  return requestJson<ApprovalDecisionResponse>(`/api/approvals/${approvalRequestId}/approve`, {
    body: request,
    method: "POST",
    userId,
  });
}

export function rejectApproval(
  userId: string,
  approvalRequestId: string,
  request: ApprovalDecisionRequest,
): Promise<ApprovalDecisionResponse> {
  return requestJson<ApprovalDecisionResponse>(`/api/approvals/${approvalRequestId}/reject`, {
    body: request,
    method: "POST",
    userId,
  });
}

export function sendBackApproval(
  userId: string,
  approvalRequestId: string,
  request: ApprovalDecisionRequest,
): Promise<ApprovalDecisionResponse> {
  return requestJson<ApprovalDecisionResponse>(`/api/approvals/${approvalRequestId}/send-back`, {
    body: request,
    method: "POST",
    userId,
  });
}
