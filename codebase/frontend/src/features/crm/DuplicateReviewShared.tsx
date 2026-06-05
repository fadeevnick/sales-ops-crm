export type QueueFilter = "all" | "high" | "account" | "contact" | "needs" | "deferred";

export const DUPLICATE_QUEUE_FILTERS: QueueFilter[] = ["all", "high", "account", "contact", "needs", "deferred"];

export function formatDate(value: string): string {
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

export function formatScore(score: number): string {
  return score.toFixed(2);
}

export function filterLabel(filter: QueueFilter): string {
  switch (filter) {
    case "all":
      return "All Open";
    case "high":
      return "High Confidence";
    case "account":
      return "Accounts";
    case "contact":
      return "Contacts";
    case "needs":
      return "Needs Review";
    case "deferred":
      return "Deferred";
  }
}

