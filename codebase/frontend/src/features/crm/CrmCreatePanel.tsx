import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createAccount } from "../../api/accounts";
import { fetchContacts, createContact } from "../../api/contacts";
import { createOpportunity } from "../../api/opportunities";
import { describeRequestError } from "../../api/session";
import type { AccountListItem, ContactListItem } from "../../types/crm";
import type { MetadataFieldDefinitionItem, MetadataStageDefinitionItem } from "../../types/metadata";
import type { CurrentUser } from "../../types/session";
import {
  CreateAccountForm,
  CreateContactForm,
  CreateOpportunityForm,
} from "./CrmCreatePanelSections";
import { parseCustomFields } from "./CrmCreatePanelShared";

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

  const [contactsForAccount, setContactsForAccount] = useState<ContactListItem[]>([]);

  useEffect(() => {
    if (!selectedAccountId) { setContactsForAccount([]); onSelectContact(null); return; }
    let cancelled = false;
    fetchContacts(currentUser.userId, selectedAccountId).then((r) => {
      if (!cancelled) setContactsForAccount(r.items);
    }).catch(() => { if (!cancelled) setContactsForAccount([]); });
    onSelectContact(null);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, currentUser.userId]);

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
      <div className="rep-drawer-body">
        {message ? <div className="rep-form-success">{message}</div> : null}
        {errorMessage ? <div className="rep-form-error">{errorMessage}</div> : null}

        {mode === "account" ? (
          <CreateAccountForm
            accountName={accountName}
            accountWebsite={accountWebsite}
            isSubmitting={isSubmitting}
            onAccountNameChange={setAccountName}
            onAccountWebsiteChange={setAccountWebsite}
            onClose={onClose}
            onSubmit={submitAccount}
          />
        ) : null}

        {mode === "contact" ? (
          <CreateContactForm
            accounts={accounts}
            contactEmail={contactEmail}
            contactName={contactName}
            contactPhone={contactPhone}
            isSubmitting={isSubmitting}
            selectedAccountId={selectedAccountId}
            userId={currentUser.userId}
            onClose={onClose}
            onContactEmailChange={setContactEmail}
            onContactNameChange={setContactName}
            onContactPhoneChange={setContactPhone}
            onSelectAccount={onSelectAccount}
            onSubmit={submitContact}
          />
        ) : null}

        {mode === "opportunity" ? (
          <CreateOpportunityForm
            accounts={accounts}
            contactsForAccount={contactsForAccount}
            defaultStageKey={defaultStageKey}
            fields={fields}
            isSubmitting={isSubmitting}
            opportunityAmount={opportunityAmount}
            opportunityCloseDate={opportunityCloseDate}
            opportunityCustomFields={opportunityCustomFields}
            opportunityStageKey={opportunityStageKey}
            opportunityTitle={opportunityTitle}
            selectedAccountId={selectedAccountId}
            selectedContactId={selectedContactId}
            stages={stages}
            userId={currentUser.userId}
            onClose={onClose}
            onCustomFieldChange={(fieldKey, value) =>
              setOpportunityCustomFields((current) => ({
                ...current,
                [fieldKey]: value,
              }))
            }
            onOpportunityAmountChange={setOpportunityAmount}
            onOpportunityCloseDateChange={setOpportunityCloseDate}
            onOpportunityStageKeyChange={setOpportunityStageKey}
            onOpportunityTitleChange={setOpportunityTitle}
            onSelectAccount={onSelectAccount}
            onSelectContact={onSelectContact}
            onSubmit={submitOpportunity}
          />
        ) : null}
      </div>
    </>
  );
}
