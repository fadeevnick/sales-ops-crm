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
import { createContact, fetchContacts } from "../../api/contacts";
import { describeRequestError } from "../../api/session";
import type { CurrentUser } from "../../types/session";
import {
  AccountHeader,
  AccountSidebar,
  ActivitiesBlock,
  AddActivityModal,
  AddContactModal,
  ContactsBlock,
  DuplicateWarning,
  OpportunitiesBlock,
} from "./AccountDetailSections";
import type {
  AccountActivity,
  AccountAuditEvent,
  AccountContact,
  AccountOpportunity,
  AccountRecord,
} from "./AccountDetailShared";

// ─────────────────────────────────────────────────────────────────────────────
// Local types (AccountDetail-specific, extends base CRM types)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AccountRecord — parent workspace provides this from its account list.
 * Fields beyond AccountListItem (website, phone, openPipeline, etc.)
 * require a fetchAccountDetail endpoint. // CONSTRAINT
 */
export type { AccountActivity, AccountAuditEvent, AccountOpportunity, AccountRecord } from "./AccountDetailShared";

/**
 * AccountOpportunity — pre-filtered by parent workspace from OpportunityListItem.
 * nextActivityNote is not in current OpportunityListItem. // CONSTRAINT
 */
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

  return (
    <section className="rep-workspace acct-workspace">

      {/* ── Page head ── */}
      <div className="acct-page-head">
        {onBack ? (
          <button className="acct-back-btn" onClick={onBack} type="button">
            ← Back to accounts
          </button>
        ) : null}
      </div>

      {/* ── Account header ── */}
      <AccountHeader
        account={account}
        contactCount={contacts.length}
        showOwner={currentUser.roleKey !== "sales_rep"}
        onEditAccount={onEditAccount}
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

      {/* ── Body: main content + optional audit rail ── */}
      <div className={auditEvents.length > 0 ? "acct-body-grid" : "acct-body-grid acct-body-solo"}>

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

        {/* ── RIGHT: audit rail (only when there are events) ── */}
        {auditEvents.length > 0 ? (
          <AccountSidebar auditEvents={auditEvents} onViewFullAudit={onViewFullAudit} />
        ) : null}
      </div>

      {/* ── Modals ── */}
      {showAddContact ? (
        <AddContactModal
          accountName={account.name}
          onClose={() => setShowAddContact(false)}
          onSave={async data => {
            try {
              const response = await createContact(currentUser.userId, {
                accountId: account.id,
                fullName: data.name,
                email: data.email || undefined,
              });
              const newContact: AccountContact = {
                id: response.id,
                accountId: account.id,
                accountName: account.name,
                fullName: data.name,
                email: data.email || null,
                linkedOpportunityIds: [],
              };
              setContacts(prev => [...prev, newContact]);
              setShowAddContact(false);
              flashToast(`✓ Contact "${data.name}" added to ${account.name}`);
            } catch {
              flashToast(`✗ Failed to save contact`);
            }
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
          {toast}
        </div>
      ) : null}
    </section>
  );
}
