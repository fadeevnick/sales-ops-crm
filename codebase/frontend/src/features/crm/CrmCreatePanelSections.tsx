import type { FormEventHandler } from "react";
import type { AccountListItem, ContactListItem } from "../../types/crm";
import type { MetadataFieldDefinitionItem, MetadataStageDefinitionItem } from "../../types/metadata";
import { AccountSearchSelect } from "./AccountSearchSelect";
import { CustomFieldInput } from "./CrmCreatePanelShared";

export function CreateAccountForm({
  accountName,
  accountWebsite,
  isSubmitting,
  onAccountNameChange,
  onAccountWebsiteChange,
  onClose,
  onSubmit,
}: {
  accountName: string;
  accountWebsite: string;
  isSubmitting: boolean;
  onAccountNameChange: (value: string) => void;
  onAccountWebsiteChange: (value: string) => void;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return (
    <form className="rep-create-panel" onSubmit={onSubmit}>
      <div className="rep-form-section">
        <h4>New account</h4>
        <div className="rep-form-grid">
          <div className="rep-form-field full">
            <label>Name *</label>
            <input onChange={(event) => onAccountNameChange(event.target.value)} placeholder="e.g. Tarsis Bearings" value={accountName} />
          </div>
          <div className="rep-form-field full">
            <label>Website</label>
            <input onChange={(event) => onAccountWebsiteChange(event.target.value)} placeholder="https://example.com" value={accountWebsite} />
          </div>
        </div>
        <div className="rep-form-field">
          <span className="hint">After creating, the new account is auto-selected — switch to Contact or Opportunity to add to it.</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="rep-btn" onClick={onClose} type="button">Cancel</button>
        <button
          className={accountName.trim() ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
          disabled={isSubmitting || !accountName.trim()}
          type="submit"
        >
          Create account
        </button>
      </div>
    </form>
  );
}

export function CreateContactForm({
  accounts,
  contactEmail,
  contactName,
  contactPhone,
  isSubmitting,
  selectedAccountId,
  userId,
  onClose,
  onContactEmailChange,
  onContactNameChange,
  onContactPhoneChange,
  onSelectAccount,
  onSubmit,
}: {
  accounts: AccountListItem[];
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  isSubmitting: boolean;
  selectedAccountId: string | null;
  userId: string;
  onClose: () => void;
  onContactEmailChange: (value: string) => void;
  onContactNameChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onSelectAccount: (accountId: string | null) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return (
    <form className="rep-create-panel" onSubmit={onSubmit}>
      <div className="rep-form-section">
        <h4>Relationship</h4>
        <div className="rep-form-grid">
          <div className="rep-form-field full">
            <label>Account *</label>
            <AccountSearchSelect
              userId={userId}
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelectAccount={onSelectAccount}
            />
          </div>
        </div>
      </div>
      <div className="rep-form-section">
        <h4>New contact</h4>
        <div className="rep-form-grid">
          <div className="rep-form-field full">
            <label>Full name *</label>
            <input onChange={(event) => onContactNameChange(event.target.value)} placeholder="e.g. Liam Whitford" value={contactName} />
          </div>
          <div className="rep-form-field">
            <label>Email</label>
            <input onChange={(event) => onContactEmailChange(event.target.value)} placeholder="liam@example.com" value={contactEmail} />
          </div>
          <div className="rep-form-field">
            <label>Phone</label>
            <input onChange={(event) => onContactPhoneChange(event.target.value)} value={contactPhone} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="rep-btn" onClick={onClose} type="button">Cancel</button>
        <button
          className={contactName.trim() && selectedAccountId ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
          disabled={isSubmitting || !contactName.trim() || !selectedAccountId}
          type="submit"
        >
          Create contact
        </button>
      </div>
    </form>
  );
}

export function CreateOpportunityForm({
  accounts,
  contactsForAccount,
  defaultStageKey,
  fields,
  isSubmitting,
  opportunityAmount,
  opportunityCloseDate,
  opportunityCustomFields,
  opportunityStageKey,
  opportunityTitle,
  selectedAccountId,
  selectedContactId,
  stages,
  userId,
  onClose,
  onCustomFieldChange,
  onOpportunityAmountChange,
  onOpportunityCloseDateChange,
  onOpportunityStageKeyChange,
  onOpportunityTitleChange,
  onSelectAccount,
  onSelectContact,
  onSubmit,
}: {
  accounts: AccountListItem[];
  contactsForAccount: ContactListItem[];
  defaultStageKey: string;
  fields: MetadataFieldDefinitionItem[];
  isSubmitting: boolean;
  opportunityAmount: string;
  opportunityCloseDate: string;
  opportunityCustomFields: Record<string, string>;
  opportunityStageKey: string;
  opportunityTitle: string;
  selectedAccountId: string | null;
  selectedContactId: string | null;
  stages: MetadataStageDefinitionItem[];
  userId: string;
  onClose: () => void;
  onCustomFieldChange: (fieldKey: string, value: string) => void;
  onOpportunityAmountChange: (value: string) => void;
  onOpportunityCloseDateChange: (value: string) => void;
  onOpportunityStageKeyChange: (value: string) => void;
  onOpportunityTitleChange: (value: string) => void;
  onSelectAccount: (accountId: string | null) => void;
  onSelectContact: (contactId: string | null) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return (
    <form className="rep-create-panel" onSubmit={onSubmit}>
      <div className="rep-form-section">
        <h4>Relationship</h4>
        <div className="rep-form-grid">
          <div className="rep-form-field">
            <label>Account *</label>
            <AccountSearchSelect
              userId={userId}
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelectAccount={onSelectAccount}
            />
          </div>
          <div className="rep-form-field">
            <label>Primary contact</label>
            <select onChange={(event) => onSelectContact(event.target.value || null)} value={selectedContactId ?? ""}>
              <option value="">No primary contact</option>
              {contactsForAccount.map((contact) => (
                <option key={contact.id} value={contact.id}>{contact.fullName}</option>
              ))}
            </select>
            <span className="hint">Linked to selected account</span>
          </div>
        </div>
      </div>

      <div className="rep-form-section">
        <h4>Opportunity</h4>
        <div className="rep-form-grid">
          <div className="rep-form-field full">
            <label>Title *</label>
            <input onChange={(event) => onOpportunityTitleChange(event.target.value)} placeholder="e.g. Q3 line-4 equipment renewal" value={opportunityTitle} />
          </div>
          <div className="rep-form-field">
            <label>Stage</label>
            <select onChange={(event) => onOpportunityStageKeyChange(event.target.value)} value={opportunityStageKey || defaultStageKey}>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.stageKey}>{stage.displayName}</option>
              ))}
            </select>
          </div>
          <div className="rep-form-field">
            <label>Expected amount</label>
            <input inputMode="decimal" onChange={(event) => onOpportunityAmountChange(event.target.value)} placeholder="148000" value={opportunityAmount} />
          </div>
          <div className="rep-form-field">
            <label>Close date</label>
            <input onChange={(event) => onOpportunityCloseDateChange(event.target.value)} type="date" value={opportunityCloseDate} />
          </div>
        </div>
      </div>

      {fields.length > 0 ? (
        <div className="rep-form-section">
          <h4>Tenant custom fields</h4>
          <div className="rep-form-grid">
            {fields.map((field) => (
              <CustomFieldInput
                field={field}
                key={field.id}
                onChange={(value) => onCustomFieldChange(field.fieldKey, value)}
                value={opportunityCustomFields[field.fieldKey] ?? ""}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="rep-btn" onClick={onClose} type="button">Cancel</button>
        <button
          className={opportunityTitle.trim() && selectedAccountId && defaultStageKey ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
          disabled={isSubmitting || !opportunityTitle.trim() || !selectedAccountId || !defaultStageKey}
          type="submit"
        >
          Create opportunity
        </button>
      </div>
    </form>
  );
}
