const storageKey = "salesops-demo-user-id";

export function readStoredSessionUserId(): string | null {
  return localStorage.getItem(storageKey);
}

export function writeStoredSessionUserId(userId: string): void {
  localStorage.setItem(storageKey, userId);
}

export function clearStoredSessionUserId(): void {
  localStorage.removeItem(storageKey);
}
