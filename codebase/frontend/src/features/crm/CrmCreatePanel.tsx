import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createAccount } from "../../api/accounts";
import { createContact } from "../../api/contacts";
import { createOpportunity } from "../../api/opportunities";
import { describeRequestError } from "../../api/session";
import type { AccountListItem, ContactListItem, CustomFieldValue } from "../../types/crm";
import type { MetadataFieldDefinitionItem, MetadataStageDefinitionItem } from "../../types/metadata";
import type { CurrentUser } from "../../types/session";

export type CreateMode = "account" | "contact" | "opportunity";

type CrmCreatePanelProps = {
  accounts: AccountListItem[];
  contacts: ContactListItem[];
  currentUser: CurrentUser;
  fields: MetadataFieldDefinitionItem[];
  stages: MetadataStageDefinitionItem[];
  selectedAccountId: string | null;
  selectedContactId: string | null;
  initialMode?: CreateMode;
  onSelectAccount: (accountId: string | null) => void;
  onSelectContact: (contactId: string | null) => void;
  onAccountCreated: (accountId: string) => Promise<void> | void;
  onContactCreated: (contactId: string) => Promise<void> | void;
  onOpportunityCreated: (opportunityId: string) => Promise<void> | void;
  onClose: () => void;
};

export function CrmCreatePanel({
  accounts,
  contacts,
  currentUser,
  fields,
  stages,
  selectedAccountId,
  selectedContactId,
  initialMode = "opportunity",
  onSelectAccount,
  onSelectContact,
  onAccountCreated,
  onContactCreated,
  onOpportunityCreated,
  onClose,
}: CrmCreatePanelProps) {
  const [mode, setMode] = useState<CreateMode>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const [accountName, setAccountName] = useState("");
  const [accountWebsite, setAccountWebsite] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [opportunityTitle, setOpportunityTitle] = useState("");
  const [opportunityStageKey, setOpportunityStageKey] = useState("");
  const [opportunityAmount, setOpportunityAmount] = useState("");
  const [opportunityCloseDate, setOpportunityCloseDate] = useState("");
  const [opportunityCustomFields, setOpportunityCustomFields] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMessage(null);
    setErrorMessage(null);
  }, [mode]);

  const defaultStageKey = stages[0]?.stageKey ?? "";
  const selectedAccountName = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId)?.name ?? "Pick an account",
    [accounts, selectedAccountId],
  );

  const runSubmit = async (action: () => Promise<void>) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      await action();
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountName.trim()) {
      setErrorMessage("Account name is required");
      return;
    }

    await runSubmit(async () => {
      const response = await createAccount(currentUser.userId, {
        name: accountName.trim(),
        website: accountWebsite.trim() || undefined,
      });
      setAccountName("");
      setAccountWebsite("");
      setMessage(`Account created: ${response.id}`);
      await onAccountCreated(response.id);
    });
  };

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAccountId) {
      setErrorMessage("Select an account before creating a contact");
      return;
    }
    if (!contactName.trim()) {
      setErrorMessage("Contact name is required");
      return;
    }

    await runSubmit(async () => {
      const response = await createContact(currentUser.userId, {
        accountId: selectedAccountId,
        email: contactEmail.trim() || undefined,
        fullName: contactName.trim(),
        phone: contactPhone.trim() || undefined,
      });
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setMessage(`Contact created: ${response.id}`);
      await onContactCreated(response.id);
    });
  };

  const submitOpportunity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAccountId) {
      setErrorMessage("Select an account before creating an opportunity");
      return;
    }
    if (!opportunityTitle.trim()) {
      setErrorMessage("Opportunity title is required");
      return;
    }
    if (!defaultStageKey) {
      setErrorMessage("No published opportunity stages are available");
      return;
    }

    const parsedAmount = opportunityAmount.trim() ? Number(opportunityAmount) : undefined;
    if (parsedAmount !== undefined && Number.isNaN(parsedAmount)) {
      setErrorMessage("Expected amount must be a number");
      return;
    }

    await runSubmit(async () => {
      const customFields = parseCustomFields(fields, opportunityCustomFields);
      const response = await createOpportunity(currentUser.userId, {
        accountId: selectedAccountId,
        closeDate: opportunityCloseDate || undefined,
        customFields,
        expectedAmount: parsedAmount,
        primaryContactId: selectedContactId || undefined,
        stageKey: opportunityStageKey || defaultStageKey,
        title: opportunityTitle.trim(),
      });
      setOpportunityTitle("");
      setOpportunityStageKey(defaultStageKey);
      setOpportunityAmount("");
      setOpportunityCloseDate("");
      setOpportunityCustomFields({});
      setMessage(`Opportunity created: ${response.id}`);
      await onOpportunityCreated(response.id);
    });
  };

  return (
    <>
      <div className="rep-drawer-tabs">
        <button
          className={mode === "account" ? "rep-drawer-tab active" : "rep-drawer-tab"}
          onClick={() => setMode("account")}
          type="button"
        >
          Account
        </button>
        <button
          className={mode === "contact" ? "rep-drawer-tab active" : "rep-drawer-tab"}
          onClick={() => setMode("contact")}
          type="button"
        >
          Contact
        </button>
        <button
          className={mode === "opportunity" ? "rep-drawer-tab active" : "rep-drawer-tab"}
          onClick={() => setMode("opportunity")}
          type="button"
        >
          Opportunity
        </button>
      </div>

      <div className="rep-drawer-body">
        {message ? <div className="rep-form-success">{message}</div> : null}
        {errorMessage ? <div className="rep-form-error">{errorMessage}</div> : null}

        {mode === "account" ? (
          <form className="rep-create-panel" onSubmit={submitAccount}>
            <div className="rep-form-section">
              <h4>New account</h4>
              <div className="rep-form-grid">
                <div className="rep-form-field full">
                  <label>Name *</label>
                  <input
                    onChange={(event) => setAccountName(event.target.value)}
                    placeholder="e.g. Tarsis Bearings"
                    value={accountName}
                  />
                </div>
                <div className="rep-form-field full">
                  <label>Website</label>
                  <input
                    onChange={(event) => setAccountWebsite(event.target.value)}
                    placeholder="https://example.com"
                    value={accountWebsite}
                  />
                </div>
              </div>
              <div className="rep-form-field">
                <span className="hint">
                  After creating, the new account is auto-selected and the contact tab is enabled.
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="rep-btn" onClick={onClose} type="button">
                Cancel
              </button>
              <button
                className={accountName.trim() ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
                disabled={isSubmitting || !accountName.trim()}
                type="submit"
              >
                Create account
              </button>
            </div>
          </form>
        ) : null}

        {mode === "contact" ? (
          <form className="rep-create-panel" onSubmit={submitContact}>
            <div className="rep-form-section">
              <h4>Relationship</h4>
              <div className="rep-form-grid">
                <div className="rep-form-field full">
                  <label>Account *</label>
                  <select
                    onChange={(event) => onSelectAccount(event.target.value || null)}
                    value={selectedAccountId ?? ""}
                  >
                    <option value="">Pick an account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  <span className="hint">{selectedAccountName}</span>
                </div>
              </div>
            </div>
            <div className="rep-form-section">
              <h4>New contact</h4>
              <div className="rep-form-grid">
                <div className="rep-form-field full">
                  <label>Full name *</label>
                  <input
                    onChange={(event) => setContactName(event.target.value)}
                    placeholder="e.g. Liam Whitford"
                    value={contactName}
                  />
                </div>
                <div className="rep-form-field">
                  <label>Email</label>
                  <input
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="liam@example.com"
                    value={contactEmail}
                  />
                </div>
                <div className="rep-form-field">
                  <label>Phone</label>
                  <input
                    onChange={(event) => setContactPhone(event.target.value)}
                    value={contactPhone}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="rep-btn" onClick={onClose} type="button">
                Cancel
              </button>
              <button
                className={
                  contactName.trim() && selectedAccountId
                    ? "rep-btn rep-btn-primary"
                    : "rep-btn rep-btn-disabled"
                }
                disabled={isSubmitting || !contactName.trim() || !selectedAccountId}
                type="submit"
              >
                Create contact
              </button>
            </div>
          </form>
        ) : null}

        {mode === "opportunity" ? (
          <form className="rep-create-panel" onSubmit={submitOpportunity}>
            <div className="rep-form-section">
              <h4>Relationship</h4>
              <div className="rep-form-grid">
                <div className="rep-form-field">
                  <label>Account *</label>
                  <select
                    onChange={(event) => onSelectAccount(event.target.value || null)}
                    value={selectedAccountId ?? ""}
                  >
                    <option value="">Pick an account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rep-form-field">
                  <label>Primary contact</label>
                  <select
                    onChange={(event) => onSelectContact(event.target.value || null)}
                    value={selectedContactId ?? ""}
                  >
                    <option value="">No primary contact</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.fullName}
                      </option>
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
                  <input
                    onChange={(event) => setOpportunityTitle(event.target.value)}
                    placeholder="e.g. Q3 line-4 equipment renewal"
                    value={opportunityTitle}
                  />
                </div>
                <div className="rep-form-field">
                  <label>Stage</label>
                  <select
                    onChange={(event) => setOpportunityStageKey(event.target.value)}
                    value={opportunityStageKey || defaultStageKey}
                  >
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.stageKey}>
                        {stage.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rep-form-field">
                  <label>Expected amount</label>
                  <input
                    inputMode="decimal"
                    onChange={(event) => setOpportunityAmount(event.target.value)}
                    placeholder="148000"
                    value={opportunityAmount}
                  />
                </div>
                <div className="rep-form-field">
                  <label>Close date</label>
                  <input
                    onChange={(event) => setOpportunityCloseDate(event.target.value)}
                    type="date"
                    value={opportunityCloseDate}
                  />
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
                      onChange={(value) =>
                        setOpportunityCustomFields((current) => ({
                          ...current,
                          [field.fieldKey]: value,
                        }))
                      }
                      value={opportunityCustomFields[field.fieldKey] ?? ""}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="rep-btn" onClick={onClose} type="button">
                Cancel
              </button>
              <button
                className={
                  opportunityTitle.trim() && selectedAccountId && defaultStageKey
                    ? "rep-btn rep-btn-primary"
                    : "rep-btn rep-btn-disabled"
                }
                disabled={
                  isSubmitting ||
                  !opportunityTitle.trim() ||
                  !selectedAccountId ||
                  !defaultStageKey
                }
                type="submit"
              >
                Create opportunity
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </>
  );
}

function CustomFieldInput({
  field,
  onChange,
  value,
}: {
  field: MetadataFieldDefinitionItem;
  onChange: (value: string) => void;
  value: string;
}) {
  if (field.fieldType === "long_text") {
    return (
      <div className="rep-form-field full">
        <label>{field.label}</label>
        <textarea onChange={(event) => onChange(event.target.value)} rows={3} value={value} />
      </div>
    );
  }

  if (field.fieldType === "single_select") {
    return (
      <div className="rep-form-field">
        <label>{field.label}</label>
        <select onChange={(event) => onChange(event.target.value)} value={value}>
          <option value="">None</option>
          {field.selectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.fieldType === "boolean") {
    return (
      <div className="rep-form-field">
        <label>{field.label}</label>
        <select onChange={(event) => onChange(event.target.value)} value={value}>
          <option value="">None</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
    );
  }

  const inputType = field.fieldType === "date" ? "date" : "text";
  const inputMode = field.fieldType === "number" || field.fieldType === "currency" ? "decimal" : undefined;

  return (
    <div className="rep-form-field">
      <label>{field.label}</label>
      <input
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        type={inputType}
        value={value}
      />
    </div>
  );
}

function parseCustomFields(
  fields: MetadataFieldDefinitionItem[],
  values: Record<string, string>,
): Record<string, CustomFieldValue> {
  return fields.reduce<Record<string, CustomFieldValue>>((result, field) => {
    const rawValue = values[field.fieldKey];
    if (rawValue === undefined || rawValue === "") {
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
