import type { ContactListItem } from "../../types/crm";

export type AccountRecord = {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  status?: string;
  ownerId?: string;
  ownerName?: string;
  region?: string;
  legalEntity?: string;
  customerSince?: string;
  lastActivity?: string;
  openPipeline?: number;
  openOppsCount?: number;
  inFlightApprovals?: number;
  duplicateCandidate?: {
    id: string;
    name: string;
    confidence: number;
    reasons: string;
  } | null;
};

export type AccountOpportunity = {
  id: string;
  title: string;
  stageKey: string;
  stageLabel?: string;
  stageIndex?: number;
  expectedAmount?: number;
  closeDate?: string;
  approvalState?: string;
  approvalLabel?: string;
  nextActivityNote?: string;
  ownerName?: string;
};

export type AccountActivity = {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  description?: string;
  actor?: string;
  status: "done" | "overdue" | "planned";
  linkedOpportunityId?: string;
};

export type AccountAuditEvent = {
  id: string;
  timestamp: string;
  actor: string;
  eventType: string;
  description: string;
};

export type AccountContact = ContactListItem & {
  title?: string;
  phone?: string;
  influence?: string;
  buyingRole?: string;
  isPrimary?: boolean;
  linkedOpportunityIds?: string[];
  lastInteractionDate?: string;
  lastInteractionDesc?: string;
  notes?: string;
};

export type ContactFormData = {
  name: string;
  email: string;
};

export function fmtMoney(n: number | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function fmtDate(v: string | undefined): string {
  if (!v) return "—";
  return v.slice(0, 10);
}

export function influenceClass(influence: string | undefined): string {
  if (!influence) return "acct-influence";
  const l = influence.toLowerCase();
  if (l.includes("decision")) return "acct-influence acct-influence-decision";
  if (l.includes("influencer")) return "acct-influence acct-influence-influencer";
  if (l.includes("technical")) return "acct-influence acct-influence-technical";
  if (l.includes("legal")) return "acct-influence acct-influence-legal";
  return "acct-influence";
}

export function auditDotIcon(eventType: string): string {
  switch (eventType) {
    case "create":
      return "+";
    case "contact":
      return "C";
    case "opp":
      return "O";
    case "owner":
      return "→";
    case "duplicate":
      return "!";
    case "approval":
      return "✓";
    default:
      return "·";
  }
}

export function StagePip({ index = 0, total = 5 }: { index?: number; total?: number }) {
  return (
    <span className="acct-stage-pip">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < index ? "on" : i === index ? "cur" : ""} />
      ))}
    </span>
  );
}
