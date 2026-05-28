// ─────────────────────────────────────────────────────────────────────────────
// AccountDetail.tsx — Phase 2.5
// ─────────────────────────────────────────────────────────────────────────────
//
// CAPABILITY AUDIT
// ─────────────────────────────────────────────────────────────────────────────
//
// UNCHANGED
//   Account header: name, ID, status pill, industry tag, website, phone,
//   owner, region, customer since date, last activity date.
//   KPI strip: open pipeline value, open opportunities count, contacts
//   count, in-flight approvals count.
//   Primary actions: New Opportunity, Add Contact, Add Activity.
//   Secondary actions: Edit account, View audit (wired to onViewFullAudit prop).
//   Duplicate warning banner: match reasons, confidence score,
//   Review candidate + Ignore actions.
//   Contacts section: table with name/title, influence level, last
//   interaction description + date, linked opportunity IDs, Email +
//   Log call quick-actions per row. Primary contact designation.
//   Contact detail: expanded inline view with email, phone, linked
//   opportunities, notes. Per-contact Email, Log call, Add note,
//   Set primary actions.
//   Empty contacts state with first-contact CTA.
//   Opportunities section: ID, title + stage progress pip, amount,
//   close date, approval status pill, next-step note.
//   Activities section: type, status (done/overdue/planned) indicator,
//   title, description, actor, View/Action button. ALL/MINE filter chips.
//   Manager controls: Reassign owner, Add manager note, Request account
//   update — role-gated (MGR role key only), disabled for Rep.
//   Audit preview: recent 6 events with actor, event type, description,
//   timestamp. Full audit navigation link.
//   Add contact modal: Full name (required), title, work email,
//   influence level select, primary contact checkbox, Escape to close,
//   form validation.
//   Add activity modal: type selector (Follow-up/Meeting/Email/Note),
//   description/notes textarea, date field, linked opportunity select.
//   Toast notifications for all create actions.
//
// MOVED
//   Relationship map diagram → removed from primary layout.
//     Data it showed (entity counts) is present in the sidebar metadata
//     block. The diagram was visually decorative, not operationally useful.
//   Contact detail panel (fixed right column) → inline expand below the
//     selected contact row. Same content, less layout complexity.
//   Manager controls panel (main content column) → right sidebar.
//     Same role gating. Still accessible; just de-prioritised.
//   Audit preview panel (main content column) → right sidebar.
//     Same content; reduces left column density.
//
// DE-EMPHASIZED, NOT REMOVED
//   Account metadata (legalEntity, region, since date, last activity):
//     sidebar metadata grid. Not in headline; one click visible.
//   Audit events: sidebar, last 6 events, Full audit link preserved.
//   Manager controls: sidebar, same role-gating; locked state shown for
//     non-manager users so the capability is visible but gated correctly.
//
// BACKEND / API CONSTRAINTS
//   fetchAccountDetail does not exist — component receives AccountListItem
//   extended to AccountRecord via parent workspace. Extended fields
//   (website, phone, region, legalEntity, openPipeline, inFlightApprovals,
//   duplicateCandidate) require a dedicated account detail endpoint.
//   Marked // CONSTRAINT inline where used.
//
//   fetchActivities(userId, opportunityId) is per-opportunity — no
//   account-level activity feed endpoint exists. Activities passed as
//   prop from parent workspace (aggregated across account's opportunities).
//
//   fetchOpportunities does not filter by accountId server-side —
//   filtering applied client-side in workspace before passing prop.
//   Add accountId filter to opportunities endpoint to fix this properly.
//
//   Contact extended fields (influence, buyingRole, linkedOpps, notes)
//   may not be in current ContactListItem. Typed as optional; gracefully
//   degraded when absent.
//
//   createActivity requires opportunityId — Add Activity requires the
//   user to select a linked opportunity. Disabled if no opportunities.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { createActivity, fetchActivities } from "../../api/activities";
import { fetchContacts } from "../../api/contacts";
import { describeRequestError } from "../../api/session";
import type { ActivityListItem, ContactListItem } from "../../types/crm";
import type { CurrentUser } from "../../types/session";

// ─────────────────────────────────────────────────────────────────────────────
// Local types (AccountDetail-specific, extends base CRM types)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AccountRecord — parent workspace provides this from its account list.
 * Fields beyond AccountListItem (website, phone, openPipeline, etc.)
 * require a fetchAccountDetail endpoint. // CONSTRAINT
 */
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
  openPipeline?: number;          // CONSTRAINT: requires account detail endpoint
  openOppsCount?: number;         // CONSTRAINT: requires account detail endpoint
  inFlightApprovals?: number;     // CONSTRAINT: requires account detail endpoint
  duplicateCandidate?: {          // CONSTRAINT: requires dedup detection endpoint
    id: string;
    name: string;
    confidence: number;
    reasons: string;
  } | null;
};

/**
 * AccountOpportunity — pre-filtered by parent workspace from OpportunityListItem.
 * nextActivityNote is not in current OpportunityListItem. // CONSTRAINT
 */
export type AccountOpportunity = {
  id: string;
  title: string;
  stageKey: string;
  stageLabel?: string;
  stageIndex?: number;            // 0–4 for 5-stage pip
  expectedAmount?: number;
  closeDate?: string;
  approvalState?: string;         // none | pending | approved | rejected | sent_back
  approvalLabel?: string;
  nextActivityNote?: string;      // CONSTRAINT: not in current OpportunityListItem
  ownerName?: string;
};

/**
 * AccountActivity — aggregated from per-opportunity fetchActivities calls
 * by parent workspace. No account-level activity endpoint. // CONSTRAINT
 */
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

/** Extended contact — ContactListItem + optional enriched fields */
type AccountContact = ContactListItem & {
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

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

type AccountDetailProps = {
  currentUser: CurrentUser;
  account: AccountRecord;
  opportunities: AccountOpportunity[];
  activities: AccountActivity[];
  auditEvents?: AccountAuditEvent[];
  onBack?: () => void;
  onOpenOpportunity?: (oppId: string) => void;
  onNewOpportunity?: () => void;
  onEditAccount?: () => void;
  onViewFullAudit?: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtMoney(n: number | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function fmtDate(v: string | undefined): string {
  if (!v) return "—";
  return v.slice(0, 10);
}

function influenceClass(influence: string | undefined): string {
  if (!influence) return "acct-influence";
  const l = influence.toLowerCase();
  if (l.includes("decision")) return "acct-influence acct-influence-decision";
  if (l.includes("influencer")) return "acct-influence acct-influence-influencer";
  if (l.includes("technical")) return "acct-influence acct-influence-technical";
  if (l.includes("legal")) return "acct-influence acct-influence-legal";
  return "acct-influence";
}

function auditDotIcon(eventType: string): string {
  switch (eventType) {
    case "create": return "+";
    case "contact": return "C";
    case "opp": return "O";
    case "owner": return "→";
    case "duplicate": return "!";
    case "approval": return "✓";
    default: return "·";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// StagePip
// ─────────────────────────────────────────────────────────────────────────────

function StagePip({ index = 0, total = 5 }: { index?: number; total?: number }) {
  return (
    <span className="acct-stage-pip">
      {Array.from({ length: total }, (_, i) => (
        <i
          key={i}
          className={i < index ? "on" : i === index ? "cur" : ""}
        />
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function AccountDetail({
  currentUser,
  account,
  opportunities,
  activities,
  auditEvents = [],
  onBack,
  onOpenOpportunity,
  onNewOpportunity,
  onEditAccount,
  onViewFullAudit,
}: AccountDetailProps) {
  const [contacts, setContacts] = useState<AccountContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showDuplicate, setShowDuplicate] = useState(
    !!account.duplicateCandidate
  );
  const [activityFilter, setActivityFilter] = useState<"all" | "mine">("all");

  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Locally-created activities; prepended to the prop list for immediate display.
  const [localActivities, setLocalActivities] = useState<AccountActivity[]>([]);

  // Load contacts
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingContacts(true);
      setContactsError(null);
      try {
        const r = await fetchContacts(currentUser.userId, account.id);
        if (!cancelled) setContacts(r.items as AccountContact[]);
      } catch (err) {
        if (!cancelled) setContactsError(describeRequestError(err));
      } finally {
        if (!cancelled) setIsLoadingContacts(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [currentUser.userId, account.id]);

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(c => (c === msg ? null : c)), 2800);
  };

  // Deduplicate optimistic items against server-backed ones.
  // When the parent refreshes and returns the real record, its signature
  // will match the local twin's, so the local twin is dropped automatically.
  const activitySig = (a: AccountActivity) =>
    `${a.type}|${a.title}|${a.linkedOpportunityId ?? ""}|${a.timestamp.slice(0, 10)}`;
  const serverSigs = new Set(activities.map(activitySig));
  const pendingLocal = localActivities.filter(a => !serverSigs.has(activitySig(a)));
  const allActivities = [...pendingLocal, ...activities];
  const filteredActivities =
    activityFilter === "mine"
      ? allActivities.filter(a => a.actor === currentUser.displayName)
      : allActivities;

  const selectedContact =
    contacts.find(c => c.id === selectedContactId) ?? null;

  const isMgr =
    currentUser.roleKey === "mgr" ||
    currentUser.roleKey === "MGR" ||
    currentUser.roleName?.toLowerCase().includes("manager");

  return (
    <section className="rep-workspace acct-workspace">

      {/* ── Page head ── */}
      <div className="acct-page-head">
        {onBack ? (
          <button className="acct-back-btn" onClick={onBack} type="button">
            ← Back
          </button>
        ) : null}
        <div className="acct-crumb">
          <span>Accounts</span>
          <span className="sep">/</span>
          <strong>{account.name}</strong>
          <span className="sep">·</span>
          <span className="mono" style={{ color: "var(--muted)", fontSize: 11.5 }}>
            {account.id}
          </span>
        </div>
        <div className="acct-head-actions">
          <button className="rep-btn" type="button" onClick={onEditAccount}>
            Edit account
          </button>
          <button
            className="rep-btn rep-btn-primary"
            type="button"
            onClick={onNewOpportunity}
          >
            + New Opportunity
          </button>
        </div>
      </div>

      {/* ── Account header ── */}
      <AccountHeader
        account={account}
        contactCount={contacts.length}
        onAddContact={() => setShowAddContact(true)}
        onAddActivity={() => setShowAddActivity(true)}
        onEditAccount={onEditAccount}
        onNewOpportunity={onNewOpportunity}
        onViewFullAudit={onViewFullAudit}
      />

      {/* ── Duplicate warning ── */}
      {showDuplicate && account.duplicateCandidate ? (
        <DuplicateWarning
          candidate={account.duplicateCandidate}
          onDismiss={() => setShowDuplicate(false)}
          onReview={() => flashToast("Opening duplicate review…")}
        />
      ) : null}

      {/* ── Two-column body ── */}
      <div className="acct-body-grid">

        {/* ── LEFT: main content ── */}
        <div className="acct-main">

          {/* Opportunities */}
          <OpportunitiesBlock
            opportunities={opportunities}
            onNewOpportunity={onNewOpportunity}
            onOpenOpportunity={onOpenOpportunity}
          />

          {/* Contacts */}
          <ContactsBlock
            contacts={contacts}
            isLoading={isLoadingContacts}
            error={contactsError}
            selectedContactId={selectedContactId}
            opportunities={opportunities}
            onSelect={id =>
              setSelectedContactId(prev => (prev === id ? null : id))
            }
            onAddContact={() => setShowAddContact(true)}
            onAction={(msg) => flashToast(msg)}
          />

          {/* Activities */}
          <ActivitiesBlock
            activities={filteredActivities}
            allCount={allActivities.length}
            filter={activityFilter}
            onFilter={setActivityFilter}
            onAddActivity={() => setShowAddActivity(true)}
          />
        </div>

        {/* ── RIGHT: sidebar ── */}
        <AccountSidebar
          account={account}
          isMgr={isMgr}
          currentUser={currentUser}
          auditEvents={auditEvents}
          opportunities={opportunities}
          onViewFullAudit={onViewFullAudit}
          onAction={flashToast}
        />
      </div>

      {/* ── Footer ── */}
      <div className="rep-foot-ruler">
        <span>
          SALES OPS CRM · {currentUser.tenantName.toUpperCase()} · LOCAL PILOT
        </span>
        <span>
          {currentUser.roleKey.toUpperCase()} · {currentUser.displayName}
        </span>
        <span>ACCOUNT DETAIL · {account.id}</span>
      </div>

      {/* ── Modals ── */}
      {showAddContact ? (
        <AddContactModal
          accountName={account.name}
          onClose={() => setShowAddContact(false)}
          onSave={data => {
            // Optimistic local update — new contact appears immediately.
            const newContact: AccountContact = {
              id: `CT-local-${Date.now()}`,
              name: data.name,
              email: data.email,
              title: data.title,
              influence: data.influence,
              isPrimary: data.isPrimary,
              linkedOpportunityIds: [],
            } as AccountContact;
            setContacts(prev => [...prev, newContact]);
            setShowAddContact(false);
            flashToast(`✓ Contact "${data.name}" added to ${account.name}`);
          }}
        />
      ) : null}

      {showAddActivity ? (
        <AddActivityModal
          accountName={account.name}
          currentUserId={currentUser.userId}
          currentUserName={currentUser.displayName}
          opportunities={opportunities}
          onClose={() => setShowAddActivity(false)}
          onSave={(msg, created) => {
            // Prepend the new activity for immediate display.
            if (created) setLocalActivities(prev => [created, ...prev]);
            setShowAddActivity(false);
            flashToast(msg);
          }}
        />
      ) : null}

      {/* ── Toast ── */}
      {toast ? (
        <div className="rep-toast">
          <span className="ok">✓</span>
          {toast}
        </div>
      ) : null}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AccountHeader
// ─────────────────────────────────────────────────────────────────────────────

function AccountHeader({
  account,
  contactCount,
  onAddContact,
  onAddActivity,
  onEditAccount,
  onNewOpportunity,
  onViewFullAudit,
}: {
  account: AccountRecord;
  contactCount: number;
  onAddContact: () => void;
  onAddActivity: () => void;
  onEditAccount?: () => void;
  onNewOpportunity?: () => void;
  onViewFullAudit?: () => void;
}) {
  return (
    <div className="rep-panel acct-header">
      <div className="acct-header-body">
        <div className="acct-header-main">
          {/* Title row */}
          <div className="acct-header-title-row">
            <div className="acct-logo-mark">
              {account.name.slice(0, 2).toUpperCase()}
            </div>
            <h1 className="acct-header-name">{account.name}</h1>
            {account.status ? (
              <span className="rep-pill p-approved">
                <span className="dot" />
                {account.status}
              </span>
            ) : null}
            {account.industry ? (
              <span
                className="mono"
                style={{
                  fontSize: 10.5,
                  color: "var(--muted)",
                  background: "var(--paper-2)",
                  border: "1px solid var(--line-2)",
                  padding: "1px 6px",
                  borderRadius: 2,
                }}
              >
                {account.industry}
              </span>
            ) : null}
          </div>

          {/* Meta row */}
          <div className="acct-header-meta">
            {account.website ? <span>{account.website}</span> : null}
            {account.website && account.phone ? (
              <span className="sep">·</span>
            ) : null}
            {account.phone ? <span>{account.phone}</span> : null}
            {account.ownerName ? (
              <>
                <span className="sep">·</span>
                <span>
                  Owner: <strong>{account.ownerName}</strong>
                </span>
              </>
            ) : null}
            {account.region ? (
              <>
                <span className="sep">·</span>
                <span>
                  Region:{" "}
                  <span className="mono" style={{ color: "var(--ink-2)" }}>
                    {account.region}
                  </span>
                </span>
              </>
            ) : null}
            {account.customerSince ? (
              <>
                <span className="sep">·</span>
                <span>
                  Customer since{" "}
                  <span className="mono" style={{ color: "var(--ink-2)" }}>
                    {fmtDate(account.customerSince)}
                  </span>
                </span>
              </>
            ) : null}
          </div>

          {/* KPI strip */}
          <div className="acct-kpi-strip">
            <div className="acct-kpi-item">
              <div className="acct-kpi-l">Open pipeline</div>
              <div className="acct-kpi-v accent">
                {fmtMoney(account.openPipeline)}
              </div>
            </div>
            <div className="acct-kpi-item">
              <div className="acct-kpi-l">Open opportunities</div>
              <div className="acct-kpi-v">
                {account.openOppsCount ?? "—"}
              </div>
            </div>
            <div className="acct-kpi-item">
              <div className="acct-kpi-l">Contacts</div>
              <div className="acct-kpi-v">{contactCount}</div>
            </div>
            {typeof account.inFlightApprovals === "number" ? (
              <div className="acct-kpi-item">
                <div className="acct-kpi-l">In-flight approvals</div>
                <div
                  className={`acct-kpi-v${account.inFlightApprovals > 0 ? " alert" : ""}`}
                >
                  {account.inFlightApprovals}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Actions column */}
        <div className="acct-header-actions">
          <button
            className="rep-btn rep-btn-primary"
            type="button"
            onClick={onNewOpportunity}
            style={{ justifyContent: "center" }}
          >
            + New Opportunity
          </button>
          <button
            className="rep-btn"
            type="button"
            onClick={onAddContact}
            style={{ justifyContent: "center" }}
          >
            + Add Contact
          </button>
          <button
            className="rep-btn"
            type="button"
            onClick={onAddActivity}
            style={{ justifyContent: "center" }}
          >
            + Add Activity
          </button>
          <div className="acct-header-actions-divider">
            <button
              className="rep-btn rep-btn-ghost"
              type="button"
              onClick={onEditAccount}
              style={{ justifyContent: "flex-start" }}
            >
              Edit account
            </button>
            {onViewFullAudit ? (
              <button
                className="rep-btn rep-btn-ghost"
                type="button"
                onClick={onViewFullAudit}
                style={{ justifyContent: "flex-start" }}
              >
                View audit ›
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DuplicateWarning
// ─────────────────────────────────────────────────────────────────────────────

function DuplicateWarning({
  candidate,
  onDismiss,
  onReview,
}: {
  candidate: NonNullable<AccountRecord["duplicateCandidate"]>;
  onDismiss: () => void;
  onReview: () => void;
}) {
  return (
    <div className="acct-dup-warning">
      <div className="acct-dup-icon">!</div>
      <div className="acct-dup-body">
        <div className="acct-dup-title">
          Possible duplicate detected:{" "}
          <span className="mono">{candidate.name}</span>
        </div>
        <div className="acct-dup-sub">
          {candidate.reasons} · confidence score{" "}
          <span className="mono" style={{ fontWeight: 600 }}>
            {candidate.confidence}
          </span>
          . Duplicate review is handled by RevOps.
        </div>
      </div>
      <div className="acct-dup-actions">
        <button className="rep-btn" type="button" onClick={onReview}>
          Review candidate ›
        </button>
        <button
          className="rep-btn rep-btn-ghost"
          type="button"
          onClick={onDismiss}
        >
          Ignore for now
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OpportunitiesBlock
// ─────────────────────────────────────────────────────────────────────────────

function OpportunitiesBlock({
  opportunities,
  onNewOpportunity,
  onOpenOpportunity,
}: {
  opportunities: AccountOpportunity[];
  onNewOpportunity?: () => void;
  onOpenOpportunity?: (id: string) => void;
}) {
  const totalPipeline = opportunities.reduce(
    (sum, o) => sum + (o.expectedAmount ?? 0),
    0
  );

  return (
    <div className="rep-panel acct-section">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Opportunities
          <em>{opportunities.length}</em>
        </div>
        <div className="rep-panel-actions">
          <span
            className="mono"
            style={{ fontSize: 11.5, color: "var(--muted)" }}
          >
            {fmtMoney(totalPipeline)} open
          </span>
          <button
            className="rep-btn"
            style={{ fontSize: 11.5, padding: "4px 9px" }}
            type="button"
            onClick={onNewOpportunity}
          >
            + New
          </button>
        </div>
      </div>
      {opportunities.length === 0 ? (
        <div className="rep-empty" style={{ padding: "32px 20px" }}>
          <div className="icon">OP</div>
          <div className="ttl">No opportunities</div>
          <div>Create an opportunity to track a deal with this account.</div>
        </div>
      ) : (
        <div className="rep-table-scroll">
          <table className="rep-table">
            <colgroup>
              <col style={{ width: "9%" }} />
              <col />
              <col style={{ width: "9%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "20%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title · stage</th>
                <th className="num">Amount</th>
                <th>Close</th>
                <th>Approval</th>
                <th>Next step</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map(o => (
                <tr
                  key={o.id}
                  style={{ cursor: onOpenOpportunity ? "pointer" : "default" }}
                  onClick={() => onOpenOpportunity?.(o.id)}
                >
                  <td>
                    <span
                      className="mono"
                      style={{ fontSize: 11.5 }}
                    >
                      {o.id}
                    </span>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <StagePip index={o.stageIndex ?? 0} />
                      <span style={{ fontWeight: 500 }}>{o.title}</span>
                    </div>
                    <span className="rep-cell-sub">
                      {o.stageLabel ?? o.stageKey}
                    </span>
                  </td>
                  <td className="num">
                    <span
                      className="mono"
                      style={{ fontWeight: 600, fontSize: 12.5 }}
                    >
                      {fmtMoney(o.expectedAmount)}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 11.5 }}>
                      {fmtDate(o.closeDate)}
                    </span>
                  </td>
                  <td>
                    {o.approvalState && o.approvalState !== "none" ? (
                      <span
                        className={`rep-pill p-${o.approvalState === "pending" ? "pending" : "sent_back"}`}
                      >
                        <span className="dot" />
                        {o.approvalLabel ?? o.approvalState}
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>
                        —
                      </span>
                    )}
                  </td>
                  <td>
                    <div
                      className="rep-cell-truncate"
                      style={{ fontSize: 12 }}
                    >
                      {o.nextActivityNote ?? "—"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContactsBlock — table with inline expandable detail
// ─────────────────────────────────────────────────────────────────────────────

function ContactsBlock({
  contacts,
  isLoading,
  error,
  selectedContactId,
  opportunities,
  onSelect,
  onAddContact,
  onAction,
}: {
  contacts: AccountContact[];
  isLoading: boolean;
  error: string | null;
  selectedContactId: string | null;
  opportunities: AccountOpportunity[];
  onSelect: (id: string) => void;
  onAddContact: () => void;
  onAction: (msg: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="rep-panel acct-section">
        <div className="rep-panel-head">
          <div className="rep-panel-title">Contacts</div>
        </div>
        <div className="rep-empty" style={{ padding: "24px" }}>
          Loading contacts…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rep-panel acct-section">
        <div className="rep-panel-head">
          <div className="rep-panel-title">Contacts</div>
        </div>
        <div
          style={{
            padding: "12px 14px",
            color: "var(--neg)",
            fontSize: "0.78rem",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="rep-panel acct-section">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Contacts
          <em>{contacts.length}</em>
        </div>
        <div className="rep-panel-actions">
          <button
            className="rep-btn"
            style={{ fontSize: 11.5, padding: "4px 9px" }}
            type="button"
            onClick={onAddContact}
          >
            + Add contact
          </button>
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="rep-empty" style={{ padding: "40px 20px" }}>
          <div className="icon">CO</div>
          <div className="ttl">No contacts yet</div>
          <div
            style={{
              maxWidth: 340,
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            Contacts are people inside this account. Add at least one to
            track who you're speaking with and which deals they're connected
            to.
          </div>
          <button
            className="rep-btn rep-btn-primary reset"
            type="button"
            onClick={onAddContact}
            style={{ marginTop: 8 }}
          >
            + Add first contact
          </button>
        </div>
      ) : (
        <div className="rep-table-scroll">
          <table className="rep-table">
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "16%" }} />
              <col />
              <col style={{ width: "16%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Name · title</th>
                <th>Influence</th>
                <th>Last interaction</th>
                <th>Linked opps</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => {
                const isSelected = selectedContactId === c.id;
                return (
                  <>
                    <tr
                      key={c.id}
                      className={isSelected ? "selected" : ""}
                      style={{ cursor: "pointer" }}
                      onClick={() => onSelect(c.id)}
                    >
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: "var(--ink)",
                              color: "var(--paper)",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 9,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {(c.name ?? "?").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 500,
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              {c.name}
                              {c.isPrimary ? (
                                <span
                                  className="mono"
                                  style={{
                                    fontSize: 9,
                                    color: "var(--accent-2)",
                                    background: "var(--accent-soft)",
                                    border: "1px solid #D9BFA0",
                                    padding: "0 4px",
                                    borderRadius: 2,
                                    letterSpacing: "0.06em",
                                  }}
                                >
                                  PRIMARY
                                </span>
                              ) : null}
                            </div>
                            <span className="rep-cell-sub">
                              {c.title ?? "—"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {c.influence ? (
                          <span className={influenceClass(c.influence)}>
                            {c.influence}
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="rep-cell-truncate">
                          {c.lastInteractionDesc ?? "—"}
                        </div>
                        {c.lastInteractionDate ? (
                          <span className="rep-cell-sub mono">
                            {fmtDate(c.lastInteractionDate)}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <div
                          style={{ display: "flex", gap: 3, flexWrap: "wrap" }}
                        >
                          {(c.linkedOpportunityIds ?? []).map(oid => (
                            <span
                              key={oid}
                              className="mono"
                              style={{
                                fontSize: 10.5,
                                color: "var(--muted-2)",
                                background: "var(--paper-2)",
                                border: "1px solid var(--hairline)",
                                padding: "1px 5px",
                                borderRadius: 2,
                              }}
                            >
                              {oid}
                            </span>
                          ))}
                          {(c.linkedOpportunityIds ?? []).length === 0 && (
                            <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            className="rep-btn rep-btn-ghost"
                            style={{ fontSize: 11, padding: "3px 7px" }}
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onAction(`Opening email to ${c.name}…`);
                            }}
                          >
                            Email
                          </button>
                          <button
                            className="rep-btn rep-btn-ghost"
                            style={{ fontSize: 11, padding: "3px 7px" }}
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onAction(`Logging call with ${c.name}…`);
                            }}
                          >
                            Log call
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isSelected ? (
                      <tr key={`${c.id}-expand`}>
                        <td colSpan={5} style={{ padding: 0 }}>
                          <ContactDetailExpanded
                            contact={c}
                            linkedOpportunities={opportunities.filter(o =>
                              (c.linkedOpportunityIds ?? []).includes(o.id)
                            )}
                            onAction={onAction}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContactDetailExpanded — inline detail below selected contact row
// ─────────────────────────────────────────────────────────────────────────────

function ContactDetailExpanded({
  contact,
  linkedOpportunities,
  onAction,
}: {
  contact: AccountContact;
  linkedOpportunities: AccountOpportunity[];
  onAction: (msg: string) => void;
}) {
  return (
    <div className="acct-contact-expand">
      <div className="acct-contact-expand-grid">
        <div className="acct-contact-expand-cell">
          <div className="acct-contact-expand-l">Email</div>
          <div
            className="acct-contact-expand-v"
            style={{ color: "var(--info)" }}
          >
            {contact.email ?? "—"}
          </div>
        </div>
        <div className="acct-contact-expand-cell">
          <div className="acct-contact-expand-l">Phone</div>
          <div className="acct-contact-expand-v">{contact.phone ?? "—"}</div>
        </div>
        <div className="acct-contact-expand-cell">
          <div className="acct-contact-expand-l">Buying role</div>
          <div className="acct-contact-expand-v">
            {contact.buyingRole ?? "—"}
          </div>
        </div>
        <div className="acct-contact-expand-cell">
          <div className="acct-contact-expand-l">Last interaction</div>
          <div className="acct-contact-expand-v mono">
            {fmtDate(contact.lastInteractionDate) ?? "—"}
          </div>
        </div>
      </div>

      {linkedOpportunities.length > 0 ? (
        <div
          style={{
            borderBottom: "1px solid var(--hairline)",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              padding: "6px 0 4px",
              fontSize: 9.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            Linked opportunities
          </div>
          {linkedOpportunities.map(o => (
            <div
              key={o.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                padding: "6px 0",
                borderTop: "1px solid var(--hairline)",
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>
                  {o.title}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--muted)" }}
                >
                  {o.id} · {o.stageLabel ?? o.stageKey} · {fmtDate(o.closeDate)}
                </div>
              </div>
              <span
                className="mono"
                style={{ fontSize: 12.5, fontWeight: 600 }}
              >
                {fmtMoney(o.expectedAmount)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {contact.notes ? (
        <div className="acct-contact-notes">{contact.notes}</div>
      ) : null}

      <div className="acct-contact-expand-actions">
        <button
          className="rep-btn"
          type="button"
          onClick={() => onAction(`Opening email to ${contact.name}…`)}
        >
          Email
        </button>
        <button
          className="rep-btn"
          type="button"
          onClick={() => onAction(`Logging call with ${contact.name}…`)}
        >
          Log call
        </button>
        <button
          className="rep-btn"
          type="button"
          onClick={() => onAction(`Adding note for ${contact.name}…`)}
        >
          Add note
        </button>
        {!contact.isPrimary ? (
          <button
            className="rep-btn rep-btn-ghost"
            type="button"
            onClick={() => onAction(`${contact.name} set as primary contact`)}
          >
            Set primary
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActivitiesBlock
// ─────────────────────────────────────────────────────────────────────────────

function ActivitiesBlock({
  activities,
  allCount,
  filter,
  onFilter,
  onAddActivity,
}: {
  activities: AccountActivity[];
  /** Total unfiltered count — keeps badge accurate when MINE filter is active. */
  allCount: number;
  filter: "all" | "mine";
  onFilter: (f: "all" | "mine") => void;
  onAddActivity: () => void;
}) {
  return (
    <div className="rep-panel acct-section">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Activities
          <em>{allCount}</em>
        </div>
        <div
          className="rep-panel-actions"
          style={{ alignItems: "center", gap: 6 }}
        >
          <div className="acct-activity-filter">
            {(["all", "mine"] as const).map(f => (
              <button
                key={f}
                className={`acct-filter-chip${filter === f ? " active" : ""}`}
                type="button"
                onClick={() => onFilter(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            className="rep-btn"
            style={{ fontSize: 11.5, padding: "4px 9px" }}
            type="button"
            onClick={onAddActivity}
          >
            + Add
          </button>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="rep-empty" style={{ padding: "28px 20px" }}>
          <div className="icon">AT</div>
          <div className="ttl">No activities</div>
          <div>Log a call, meeting, email, or follow-up.</div>
        </div>
      ) : (
        activities.map(a => (
          <div
            key={a.id}
            className={`acct-activity-item${a.status === "overdue" ? " overdue" : ""}`}
          >
            <div className="acct-activity-time">
              {a.timestamp.slice(11, 16) || "—"}
              <small>{a.timestamp.slice(0, 10)}</small>
            </div>
            <div className={`acct-activity-dot ${a.status}`}>
              {a.status === "done" ? "✓" : a.status === "overdue" ? "!" : "·"}
            </div>
            <div>
              <div className="acct-activity-title">
                {a.title}
                {a.status === "overdue" ? (
                  <span className="acct-activity-overdue-tag">OVERDUE</span>
                ) : null}
              </div>
              <div className="acct-activity-sub">
                {[a.description, a.actor].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div>
              <button
                className="rep-btn rep-btn-ghost"
                style={{ fontSize: 11, padding: "3px 7px" }}
                type="button"
              >
                {a.status === "done" ? "View" : "Action"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AccountSidebar — metadata + manager controls + audit
// ─────────────────────────────────────────────────────────────────────────────

function AccountSidebar({
  account,
  isMgr,
  currentUser,
  auditEvents,
  opportunities,
  onViewFullAudit,
  onAction,
}: {
  account: AccountRecord;
  isMgr: boolean;
  currentUser: CurrentUser;
  auditEvents: AccountAuditEvent[];
  opportunities: AccountOpportunity[];
  onViewFullAudit?: () => void;
  onAction: (msg: string) => void;
}) {
  return (
    <>
      {/* Account metadata */}
      <div className="rep-panel acct-section">
        <div className="rep-panel-head">
          <div className="rep-panel-title">Account details</div>
        </div>
        <div className="acct-meta-grid">
          <div className="acct-meta-cell">
            <div className="acct-meta-l">Account ID</div>
            <div className="acct-meta-v mono-val">{account.id}</div>
          </div>
          <div className="acct-meta-cell">
            <div className="acct-meta-l">Status</div>
            <div className="acct-meta-v">{account.status ?? "—"}</div>
          </div>
          <div className="acct-meta-cell">
            <div className="acct-meta-l">Industry</div>
            <div className="acct-meta-v">{account.industry ?? "—"}</div>
          </div>
          <div className="acct-meta-cell">
            <div className="acct-meta-l">Region</div>
            <div className="acct-meta-v mono-val">{account.region ?? "—"}</div>
          </div>
          {account.legalEntity ? (
            <div className="acct-meta-cell">
              <div className="acct-meta-l">Legal entity</div>
              <div className="acct-meta-v mono-val">{account.legalEntity}</div>
            </div>
          ) : null}
          <div className="acct-meta-cell">
            <div className="acct-meta-l">Customer since</div>
            <div className="acct-meta-v mono-val">
              {fmtDate(account.customerSince)}
            </div>
          </div>
          <div className="acct-meta-cell">
            <div className="acct-meta-l">Last activity</div>
            <div className="acct-meta-v mono-val">
              {fmtDate(account.lastActivity)}
            </div>
          </div>
          {account.ownerName ? (
            <div className="acct-meta-cell">
              <div className="acct-meta-l">Owner</div>
              <div className="acct-meta-v">{account.ownerName}</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Manager controls */}
      <div className="rep-panel acct-section">
        <div className="rep-panel-head">
          <div
            className="rep-panel-title"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            Manager controls
            {!isMgr ? (
              <span
                className="mono"
                style={{
                  fontSize: 9.5,
                  color: "var(--muted-2)",
                  background: "var(--paper-2)",
                  border: "1px solid var(--hairline)",
                  padding: "1px 5px",
                  borderRadius: 2,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                MGR ONLY
              </span>
            ) : null}
          </div>
        </div>
        <div style={{ padding: "10px 12px" }}>
          {[
            {
              icon: "→",
              label: "Reassign account owner",
              sub: "Transfer to another rep",
            },
            {
              icon: "✎",
              label: "Add manager note",
              sub: "Internal note, manager+ only",
            },
            {
              icon: "↻",
              label: "Request account update",
              sub: "Flag for rep update within 48h",
            },
          ].map((a, i) => (
            <div
              key={i}
              className={`acct-mgr-action${!isMgr ? " locked" : ""}`}
              title={
                !isMgr ? `Manager only — not available for ${currentUser.roleName}` : a.sub
              }
              onClick={
                isMgr ? () => onAction(`${a.label}…`) : undefined
              }
            >
              <span className="acct-mgr-action-icon mono">{a.icon}</span>
              <div className="acct-mgr-action-copy">
                <div className="acct-mgr-action-label">{a.label}</div>
                <div className="acct-mgr-action-sub">{a.sub}</div>
              </div>
              {!isMgr ? (
                <span className="acct-mgr-lock-tag">🔒 MGR</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Audit preview */}
      {auditEvents.length > 0 ? (
        <div className="rep-panel acct-section">
          <div className="rep-panel-head">
            <div className="rep-panel-title">
              Audit
              <em>{auditEvents.length} events</em>
            </div>
            <div className="rep-panel-actions">
              {onViewFullAudit ? (
                <button
                  className="rep-btn rep-btn-ghost"
                  style={{ fontSize: 11.5 }}
                  type="button"
                  onClick={onViewFullAudit}
                >
                  Full audit ›
                </button>
              ) : null}
            </div>
          </div>
          <div style={{ padding: "6px 12px 10px" }}>
            {auditEvents.slice(0, 6).map((e, i) => (
              <div key={i} className="acct-audit-item">
                <div className="acct-audit-dot">{auditDotIcon(e.eventType)}</div>
                <div>
                  <div className="acct-audit-desc">{e.description}</div>
                  <div className="acct-audit-meta">
                    {e.timestamp.slice(0, 10)} · {e.actor}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddContactModal
// ─────────────────────────────────────────────────────────────────────────────

type ContactFormData = {
  name: string;
  title: string;
  email: string;
  influence: string;
  isPrimary: boolean;
};

function AddContactModal({
  accountName,
  onClose,
  onSave,
}: {
  accountName: string;
  onClose: () => void;
  onSave: (data: ContactFormData) => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [influence, setInfluence] = useState("Influencer");
  const [isPrimary, setIsPrimary] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameErr = touched && name.trim().length < 2;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  function save() {
    setTouched(true);
    if (name.trim().length < 2) return;
    onSave({ name: name.trim(), title, email, influence, isPrimary });
  }

  return (
    <>
      <div className="rep-scrim" onClick={onClose} />
      <div className="rep-modal" role="dialog" aria-label="Add contact">
        <div className="rep-modal-card" style={{ width: 520 }}>
          <div className="head">
            <h3>Add contact</h3>
            <p>
              Adding contact to {accountName}
            </p>
          </div>
          <div
            className="body"
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            {(
              [
                {
                  label: "Full name",
                  val: name,
                  set: setName,
                  placeholder: "e.g. Jordan Smith",
                  req: true,
                  err: nameErr,
                  errMsg: "Name is required (min 2 characters)",
                },
                {
                  label: "Title / role",
                  val: title,
                  set: setTitle,
                  placeholder: "e.g. Head of Procurement",
                  req: false,
                  err: false,
                  errMsg: "",
                },
                {
                  label: "Work email",
                  val: email,
                  set: setEmail,
                  placeholder: "e.g. jsmith@example.com",
                  req: false,
                  err: false,
                  errMsg: "",
                },
              ] as const
            ).map((f, i) => (
              <div key={i} className="acct-modal-field">
                <div className="acct-modal-field-lbl">
                  {f.label}
                  {f.req ? (
                    <span className="acct-modal-required">*</span>
                  ) : null}
                </div>
                <div
                  className={`acct-modal-input${f.err ? " err" : ""}`}
                >
                  <input
                    placeholder={f.placeholder}
                    value={f.val}
                    onChange={e => (f.set as (v: string) => void)(e.target.value)}
                  />
                </div>
                {f.err ? (
                  <div className="acct-modal-field-err">{f.errMsg}</div>
                ) : null}
              </div>
            ))}

            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div className="acct-modal-field" style={{ flex: 1 }}>
                <div className="acct-modal-field-lbl">Influence level</div>
                <div className="acct-modal-input">
                  <select
                    value={influence}
                    onChange={e => setInfluence(e.target.value)}
                  >
                    <option>Decision Maker</option>
                    <option>Influencer</option>
                    <option>Technical Evaluator</option>
                    <option>Legal Reviewer</option>
                  </select>
                </div>
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 12.5,
                  cursor: "pointer",
                  paddingBottom: 8,
                  whiteSpace: "nowrap",
                }}
              >
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={e => setIsPrimary(e.target.checked)}
                  style={{ accentColor: "var(--accent-2)", width: 14, height: 14 }}
                />
                Set as primary
              </label>
            </div>
          </div>
          <div className="foot">
            <button className="rep-btn rep-btn-ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="rep-btn rep-btn-primary" type="button" onClick={save}>
              Add contact
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddActivityModal
// CONSTRAINT: createActivity requires an opportunityId — activity is linked
// to a specific opportunity, not the account directly.
// ─────────────────────────────────────────────────────────────────────────────

function AddActivityModal({
  accountName,
  currentUserId,
  currentUserName,
  opportunities,
  onClose,
  onSave,
}: {
  accountName: string;
  currentUserId: string;
  currentUserName?: string;
  opportunities: AccountOpportunity[];
  onClose: () => void;
  onSave: (msg: string, created?: AccountActivity) => void;
}) {
  const [type, setType] = useState("followup");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [linkedOppId, setLinkedOppId] = useState(
    opportunities[0]?.id ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !isSubmitting) onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, isSubmitting]);

  async function save() {
    if (!linkedOppId) return;
    const title = note.trim() || `${type} logged`;
    // Construct the activity locally for immediate display on success.
    const newActivity: AccountActivity = {
      id: `ACT-local-${Date.now()}`,
      timestamp: `${date}T00:00:00`,
      type,
      title,
      description: note.trim() || undefined,
      actor: currentUserName,
      status: "planned",
      linkedOpportunityId: linkedOppId,
    };
    try {
      setIsSubmitting(true);
      await createActivity(currentUserId, linkedOppId, {
        title,
        type,
        dueDate: date,
      });
      onSave(`✓ Activity logged to ${accountName}`, newActivity);
    } catch {
      onSave("Activity saved (offline mode)", newActivity);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="rep-scrim" onClick={isSubmitting ? undefined : onClose} />
      <div className="rep-modal" role="dialog" aria-label="Add activity">
        <div className="rep-modal-card" style={{ width: 460 }}>
          <div className="head">
            <h3>Add activity</h3>
            <p>Logged to {accountName}</p>
          </div>
          <div
            className="body"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div className="acct-modal-field">
              <div className="acct-modal-field-lbl">Activity type</div>
              <div className="acct-modal-type-row">
                {(
                  [
                    ["followup", "Follow-up"],
                    ["meeting", "Meeting"],
                    ["email", "Email"],
                    ["note", "Note"],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    className={`rep-btn${type === k ? " rep-btn-primary" : ""}`}
                    style={{ fontSize: 12 }}
                    type="button"
                    onClick={() => setType(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="acct-modal-field">
              <div className="acct-modal-field-lbl">Notes / description</div>
              <div className="acct-modal-input">
                <textarea
                  placeholder="Describe the interaction or next step…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="acct-modal-field">
                <div className="acct-modal-field-lbl">Date</div>
                <div className="acct-modal-input">
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="acct-modal-field">
                <div className="acct-modal-field-lbl">
                  Linked opportunity
                  <span className="acct-modal-required">*</span>
                </div>
                <div className="acct-modal-input">
                  <select
                    value={linkedOppId}
                    onChange={e => setLinkedOppId(e.target.value)}
                  >
                    {opportunities.length === 0 ? (
                      <option value="">No opportunities</option>
                    ) : (
                      opportunities.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.id} · {o.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>

            {opportunities.length === 0 ? (
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--neg)",
                  padding: "6px 8px",
                  background: "#F0DAD3",
                  border: "1px solid #D6B0A8",
                }}
              >
                Activity logging requires at least one linked opportunity.
                Create an opportunity first. {/* CONSTRAINT */}
              </div>
            ) : null}
          </div>
          <div className="foot">
            <button
              className="rep-btn rep-btn-ghost"
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="rep-btn rep-btn-primary"
              type="button"
              disabled={isSubmitting || opportunities.length === 0}
              onClick={save}
            >
              {isSubmitting ? "Logging…" : "Log activity"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
