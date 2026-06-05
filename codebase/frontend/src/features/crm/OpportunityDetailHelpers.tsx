import type {
  ActivityListItem,
  CustomFieldValue,
} from "../../types/crm";
import type { MetadataFieldDefinitionItem } from "../../types/metadata";

export type Urgency = "routine" | "normal" | "high" | "critical";
export type RequestTypeKey = "stage_progression" | "discount_exception" | "terms_exception";
export type SubmitPhase = "draft" | "validated" | "submitted";
export type ValidatedState = null | "ok" | "err";

export type AuditEvent = {
  at: string;
  actor: string;
  type: string;
  code: string;
  title: string;
  description: string;
};

export const REQUEST_TYPE_CATALOG: {
  key: RequestTypeKey;
  code: string;
  name: string;
  description: string;
  supported: boolean;
}[] = [
  {
    key: "stage_progression",
    code: "STAGE-A",
    name: "Stage progression",
    description: "Promote the opportunity past a stage that policy gates behind approval.",
    supported: true,
  },
  {
    key: "discount_exception",
    code: "DISCOUNT-A",
    name: "Discount exception",
    description: "Not yet available — only stage progression is currently supported.",
    supported: false,
  },
  {
    key: "terms_exception",
    code: "TERMS-A",
    name: "Terms / NET-X exception",
    description: "Not yet available — only stage progression is currently supported.",
    supported: false,
  },
];

export function normalizeApprovalState(state: string): string {
  return state.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function isEmpty(value: CustomFieldValue | undefined): boolean {
  return value === null || value === undefined || value === "";
}

export function isActivityCompleted(activity: ActivityListItem): boolean {
  const status = activity.status.toLowerCase();
  return status === "completed" || status === "done" || status === "closed";
}

export function isActivityOverdue(activity: ActivityListItem): boolean {
  if (!activity.dueDate) return false;
  const dueMs = Date.parse(activity.dueDate);
  if (Number.isNaN(dueMs)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueMs < today.getTime();
}

export function daysUntil(value: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((ms - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days < 0) return `${Math.abs(days)} d ago`;
  return `${days} d`;
}

export function describeApprovalSla(value: string | null | undefined): { label: string } {
  if (!value) {
    return { label: "No SLA set" };
  }
  const dueMs = Date.parse(value);
  if (Number.isNaN(dueMs)) {
    return { label: "SLA invalid" };
  }
  const diffMs = dueMs - Date.now();
  const absHours = Math.max(1, Math.round(Math.abs(diffMs) / 3_600_000));
  if (diffMs < 0) {
    return { label: `Overdue by ${absHours}h` };
  }
  if (diffMs <= 24 * 3_600_000) {
    return { label: `Due in ${absHours}h` };
  }
  const days = Math.max(1, Math.round(diffMs / 86_400_000));
  return { label: `Due in ${days}d` };
}

export function compactId(value: string): string {
  return value.slice(0, 8);
}

export function formatCurrency(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function formatCustomFieldsForForm(
  fields: MetadataFieldDefinitionItem[],
  values: Record<string, CustomFieldValue>,
): Record<string, string> {
  return fields.reduce<Record<string, string>>((result, field) => {
    const value = values[field.fieldKey];
    result[field.fieldKey] = value === null || value === undefined ? "" : String(value);
    return result;
  }, {});
}

export function parseCustomFields(
  fields: MetadataFieldDefinitionItem[],
  values: Record<string, string>,
): Record<string, CustomFieldValue> {
  return fields.reduce<Record<string, CustomFieldValue>>((result, field) => {
    const rawValue = values[field.fieldKey];
    if (rawValue === undefined) {
      return result;
    }
    if (rawValue === "") {
      // Explicit clear: send null so the backend removes the stored value
      // (omitting the key would be read as "leave unchanged").
      result[field.fieldKey] = null;
      return result;
    }
    if (field.fieldType === "number" || field.fieldType === "currency") {
      result[field.fieldKey] = Number(rawValue);
      return result;
    }
    if (field.fieldType === "boolean") {
      result[field.fieldKey] = rawValue === "true";
      return result;
    }
    result[field.fieldKey] = rawValue;
    return result;
  }, {});
}

export function parseTimeline(timeline: unknown[]): AuditEvent[] {
  if (!Array.isArray(timeline)) return [];
  return timeline
    .map((raw): AuditEvent | null => {
      if (!raw || typeof raw !== "object") return null;
      const event = raw as Record<string, unknown>;
      const at =
        typeof event.at === "string"
          ? event.at
          : typeof event.createdAt === "string"
            ? event.createdAt
            : typeof event.timestamp === "string"
              ? event.timestamp
              : "";
      const actorRaw = event.actor ?? event.by ?? event.user;
      const actor =
        typeof actorRaw === "string"
          ? actorRaw
          : actorRaw && typeof actorRaw === "object" && "displayName" in actorRaw
            ? String((actorRaw as { displayName: unknown }).displayName ?? "")
            : "";
      const type =
        typeof event.type === "string"
          ? event.type
          : typeof event.eventType === "string"
            ? event.eventType
            : "";
      const code =
        typeof event.code === "string"
          ? event.code
          : typeof event.eventCode === "string"
            ? event.eventCode
            : type
              ? type.toUpperCase()
              : "";
      const title =
        typeof event.title === "string"
          ? event.title
          : typeof event.summary === "string"
            ? event.summary
            : code || "Event";
      const description =
        typeof event.description === "string"
          ? event.description
          : typeof event.message === "string"
            ? event.message
            : "";
      return {
        actor: actor || "system",
        at,
        code: code || "EVENT",
        description,
        title,
        type: classifyEventType(type, code),
      };
    })
    .filter((event): event is AuditEvent => event !== null)
    .sort((left, right) => (left.at < right.at ? 1 : -1));
}

function classifyEventType(type: string, code: string): string {
  const haystack = `${type} ${code}`.toLowerCase();
  if (haystack.includes("stage")) return "stage";
  if (haystack.includes("appr")) return "appr";
  if (haystack.includes("field") || haystack.includes("update")) return "field";
  if (haystack.includes("activity") || haystack.includes("act")) return "act";
  if (haystack.includes("create")) return "create";
  return "";
}
