import type { ApiError, CurrentUser, DemoLoginResponse, DemoUser } from "../types/session";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

type RequestOptions = {
  method?: string;
  body?: unknown;
  userId?: string;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : undefined),
      ...(options.userId ? { "X-Demo-User-Id": options.userId } : undefined),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const rawBody = await response.text();
  const jsonBody = parseJsonBody<T | ApiError>(rawBody);

  if (!response.ok) {
    const apiError = isApiError(jsonBody) ? jsonBody : null;

    throw new ApiRequestError(
      response.status,
      apiError?.error ?? "request_failed",
      apiError?.message ?? `Request failed: ${response.status}`,
    );
  }

  return jsonBody as T;
}

function parseJsonBody<T>(rawBody: string): T | null {
  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    return null;
  }
}

function isApiError(value: unknown): value is ApiError {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ApiError>;
  return typeof candidate.error === "string" && typeof candidate.message === "string";
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 401;
}

export function describeRequestError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown request failure";
}

export function fetchDemoUsers(): Promise<DemoUser[]> {
  return requestJson<DemoUser[]>("/api/session/demo-users");
}

export function loginDemoUser(email: string): Promise<DemoLoginResponse> {
  return requestJson<DemoLoginResponse>("/api/session/demo-login", {
    method: "POST",
    body: { email },
  });
}

export function fetchCurrentUser(userId: string): Promise<CurrentUser> {
  return requestJson<CurrentUser>("/api/me", { userId });
}
