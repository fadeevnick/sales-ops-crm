import { requestJson } from "./session";
import type { AccountListItem, AccountListResponse, CreateAccountRequest, CreateAccountResponse } from "../types/crm";

export function fetchAccounts(
  userId: string,
  params: { q?: string; page?: number; pageSize?: number } = {},
): Promise<AccountListResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  const queryString = searchParams.toString();
  return requestJson<AccountListResponse>(`/api/accounts${queryString ? `?${queryString}` : ""}`, { userId });
}

export function fetchAccount(userId: string, accountId: string): Promise<AccountListItem> {
  return requestJson<AccountListItem>(`/api/accounts/${encodeURIComponent(accountId)}`, { userId });
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
