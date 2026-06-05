const storageKey = "salesops-auth-token";

export function readStoredToken(): string | null {
  return localStorage.getItem(storageKey);
}

export function writeStoredToken(token: string): void {
  localStorage.setItem(storageKey, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(storageKey);
}
