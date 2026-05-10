import { requestJson } from "./session";
import type { ContactListResponse, CreateContactRequest, CreateContactResponse } from "../types/crm";

export function fetchContacts(
  userId: string,
  accountId?: string | null,
): Promise<ContactListResponse> {
  const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
  return requestJson<ContactListResponse>(`/api/contacts${query}`, { userId });
}

export function createContact(
  userId: string,
  request: CreateContactRequest,
): Promise<CreateContactResponse> {
  return requestJson<CreateContactResponse>("/api/contacts", {
    body: request,
    method: "POST",
    userId,
  });
}
