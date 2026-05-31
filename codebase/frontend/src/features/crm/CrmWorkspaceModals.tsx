import type {
  AccountListItem,
  ContactListItem,
  OpportunityListItem,
} from "../../types/crm";
import type {
  MetadataFieldDefinitionItem,
  MetadataStageDefinitionItem,
} from "../../types/metadata";
import type { CurrentUser } from "../../types/session";
import { useModalChrome } from "../../hooks/useModalChrome";
import { CrmCreatePanel } from "./CrmCreatePanel";
import { formatCompactCurrency } from "./OpportunityList";

export function CrmCreateDrawer({
  mode,
  accounts,
  contacts,
  currentUser,
  fields,
  selectedAccountId,
  selectedContactId,
  stages,
  onClose,
  onAccountCreated,
  onContactCreated,
  onOpportunityCreated,
  onSelectAccount,
  onSelectContact,
}: {
  mode: "account" | "contact" | "opportunity";
  accounts: AccountListItem[];
  contacts: ContactListItem[];
  currentUser: CurrentUser;
  fields: MetadataFieldDefinitionItem[];
  selectedAccountId: string | null;
  selectedContactId: string | null;
  stages: MetadataStageDefinitionItem[];
  onClose: () => void;
  onAccountCreated: (accountId: string) => Promise<void> | void;
  onContactCreated: (contactId: string) => Promise<void> | void;
  onOpportunityCreated: (opportunityId: string) => Promise<void> | void;
  onSelectAccount: (accountId: string | null) => void;
  onSelectContact: (contactId: string | null) => void;
}) {
  useModalChrome(onClose);
  const entityLabel = mode === "account" ? "account" : mode === "contact" ? "contact" : "opportunity";
  return (
    <>
      <div className="rep-scrim" onClick={onClose} />
      <aside className="rep-drawer" role="dialog" aria-label={`New ${entityLabel}`}>
        <div className="rep-drawer-head">
          <div>
            <div className="rep-drawer-title">New {entityLabel}</div>
            <div className="rep-drawer-sub">
              Linked to <span style={{ color: "var(--ink-2)" }}>{currentUser.tenantName}</span>
            </div>
          </div>
          <button aria-label="Close" className="rep-drawer-close" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <CrmCreatePanel
          accounts={accounts}
          contacts={contacts}
          currentUser={currentUser}
          fields={fields}
          initialMode={mode}
          selectedAccountId={selectedAccountId}
          selectedContactId={selectedContactId}
          stages={stages}
          onAccountCreated={onAccountCreated}
          onClose={onClose}
          onContactCreated={onContactCreated}
          onOpportunityCreated={onOpportunityCreated}
          onSelectAccount={onSelectAccount}
          onSelectContact={onSelectContact}
        />
      </aside>
    </>
  );
}

export function SubmitForApprovalModal({
  opp,
  justification,
  isApprovalSubmitting,
  stageLabels,
  onClose,
  onJustificationChange,
  onSubmit,
}: {
  opp: OpportunityListItem;
  justification: string;
  isApprovalSubmitting: boolean;
  stageLabels: Map<string, string>;
  onClose: () => void;
  onJustificationChange: (value: string) => void;
  onSubmit: () => void;
}) {
  useModalChrome(onClose, { disabled: isApprovalSubmitting });
  return (
    <>
      <div className="rep-scrim" onClick={onClose} />
      <div className="rep-modal" role="dialog" aria-label="Submit for approval">
        <div className="rep-modal-card">
          <div className="head">
            <h3>Submit {opp.id} for approval</h3>
            <p>
              This freezes the opportunity context (amount, stage, custom fields) at submission
              time. The approver will see this snapshot.
            </p>
          </div>
          <div className="body">
            <dl className="rep-snap">
              <dt>Account</dt>
              <dd>
                {opp.accountId} · {opp.accountName}
              </dd>
              <dt>Opportunity</dt>
              <dd>
                {opp.id} · {opp.title.length > 34 ? opp.title.slice(0, 34) + "…" : opp.title}
              </dd>
              <dt>Amount</dt>
              <dd>{formatCompactCurrency(opp.expectedAmount)}</dd>
              <dt>Stage</dt>
              <dd>{stageLabels.get(opp.stageKey) ?? opp.stageKey}</dd>
            </dl>
            <div className="rep-form-field" style={{ marginTop: 14 }}>
              <label>Business justification</label>
              <textarea
                onChange={(event) => onJustificationChange(event.target.value)}
                placeholder="Optional context for the approver"
                rows={3}
                value={justification}
              />
            </div>
          </div>
          <div className="foot">
            <button className="rep-btn" onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="rep-btn rep-btn-primary"
              disabled={isApprovalSubmitting}
              onClick={onSubmit}
              type="button"
            >
              Submit request
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
