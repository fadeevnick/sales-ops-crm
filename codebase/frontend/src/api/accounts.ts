import { requestJson } from "./session";
import type { AccountListResponse, CreateAccountRequest, CreateAccountResponse } from "../types/crm";

export function fetchAccounts(userId: string): Promise<AccountListResponse> {
  return requestJson<AccountListResponse>("/api/accounts", { userId });
}

export function createAccount(
  userId: string,
  request: CreateAccountRequest,
): Promise<CreateAccountResponse> {
  return requestJson<CreateAccountResponse>("/api/accounts", {
    body: request,
    method: "POST",
    userId,
  });
}
