import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createAccount } from "../../api/accounts";
import { createContact } from "../../api/contacts";
import { createOpportunity } from "../../api/opportunities";
import { describeRequestError } from "../../api/session";
import type { AccountListItem, ContactListItem, CustomFieldValue } from "../../types/crm";
import type { MetadataFieldDefinitionItem, MetadataStageDefinitionItem } from "../../types/metadata";
import type { CurrentUser } from "../../types/session";

type CrmCreatePanelProps = {
  accounts: AccountListItem[];
  contacts: ContactListItem[];
  currentUser: CurrentUser;
  fields: MetadataFieldDefinitionItem[];
  stages: MetadataStageDefinitionItem[];
  selectedAccountId: string | null;
  selectedContactId: string | null;
  onSelectContact: (contactId: string | null) => void;
  onAccountCreated: (accountId: string) => Promise<void> | void;
  onContactCreated: (contactId: string) => Promise<void> | void;
  onOpportunityCreated: (opportunityId: string) => Promise<void> | void;
};

type FormState = "idle" | "submitting";

export function CrmCreatePanel({
  accounts,
  contacts,
  currentUser,
  fields,
  stages,
  selectedAccountId,
  selectedContactId,
  onSelectContact,
  onAccountCreated,
  onContactCreated,
  onOpportunityCreated,
}: CrmCreatePanelProps) {
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
  const [formState, setFormState] = useState<FormState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedAccountName = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId)?.name ?? "No account selected",
    [accounts, selectedAccountId],
  );

  const defaultStageKey = stages[0]?.stageKey ?? "";

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
      setMessage("Account created");
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
      setMessage("Contact created");
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
      setMessage("Opportunity created");
      await onOpportunityCreated(response.id);
    });
  };

  const runSubmit = async (action: () => Promise<void>) => {
    try {
      setFormState("submitting");
      setErrorMessage(null);
      setMessage(null);
      await action();
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setFormState("idle");
    }
  };

  const isSubmitting = formState === "submitting";

  return (
    <section className="crm-section create-section">
      <div className="section-heading">
        <h3>Create</h3>
        <span>{selectedAccountName}</span>
      </div>

      {message ? <div className="success-box">{message}</div> : null}
      {errorMessage ? <div className="error-box">{errorMessage}</div> : null}

      <form className="create-form" onSubmit={submitAccount}>
        <h4>Account</h4>
        <label>
          <span>Name</span>
          <input value={accountName} onChange={(event) => setAccountName(event.target.value)} />
        </label>
        <label>
          <span>Website</span>
          <input
            value={accountWebsite}
            onChange={(event) => setAccountWebsite(event.target.value)}
          />
        </label>
        <button className="primary-button compact-button" disabled={isSubmitting} type="submit">
          Create Account
        </button>
      </form>

      <form className="create-form" onSubmit={submitContact}>
        <h4>Contact</h4>
        <label>
          <span>Full Name</span>
          <input value={contactName} onChange={(event) => setContactName(event.target.value)} />
        </label>
        <label>
          <span>Email</span>
          <input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
        </label>
        <label>
          <span>Phone</span>
          <input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
        </label>
        <button
          className="primary-button compact-button"
          disabled={isSubmitting || !selectedAccountId}
          type="submit"
        >
          Create Contact
        </button>
      </form>

      <form className="create-form" onSubmit={submitOpportunity}>
        <h4>Opportunity</h4>
        <label>
          <span>Title</span>
          <input
            value={opportunityTitle}
            onChange={(event) => setOpportunityTitle(event.target.value)}
          />
        </label>
        <label>
          <span>Primary Contact</span>
          <select
            value={selectedContactId ?? ""}
            onChange={(event) => onSelectContact(event.target.value || null)}
          >
            <option value="">No primary contact</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Stage</span>
          <select
            value={opportunityStageKey || defaultStageKey}
            onChange={(event) => setOpportunityStageKey(event.target.value)}
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.stageKey}>
                {stage.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Expected Amount</span>
          <input
            inputMode="decimal"
            value={opportunityAmount}
            onChange={(event) => setOpportunityAmount(event.target.value)}
          />
        </label>
        <label>
          <span>Close Date</span>
          <input
            type="date"
            value={opportunityCloseDate}
            onChange={(event) => setOpportunityCloseDate(event.target.value)}
          />
        </label>
        {fields.map((field) => (
          <CustomFieldInput
            field={field}
            key={field.id}
            value={opportunityCustomFields[field.fieldKey] ?? ""}
            onChange={(value) =>
              setOpportunityCustomFields((current) => ({
                ...current,
                [field.fieldKey]: value,
              }))
            }
          />
        ))}
        <button
          className="primary-button compact-button"
          disabled={isSubmitting || !selectedAccountId || !defaultStageKey}
          type="submit"
        >
          Create Opportunity
        </button>
      </form>
    </section>
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
      <label>
        <span>{field.label}</span>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
      </label>
    );
  }

  if (field.fieldType === "single_select") {
    return (
      <label>
        <span>{field.label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">None</option>
          {field.selectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.fieldType === "boolean") {
    return (
      <label>
        <span>{field.label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">None</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
    );
  }

  const inputType = field.fieldType === "date" ? "date" : "text";
  const inputMode = field.fieldType === "number" || field.fieldType === "currency" ? "decimal" : undefined;

  return (
    <label>
      <span>{field.label}</span>
      <input
        inputMode={inputMode}
        type={inputType}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
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
