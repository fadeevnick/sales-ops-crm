import { useEffect, useMemo, useState } from "react";
import { describeRequestError } from "../../api/session";
import { createActivity, fetchActivities } from "../../api/activities";
import { fetchAccounts } from "../../api/accounts";
import { submitApproval } from "../../api/approvals";
import { fetchContacts } from "../../api/contacts";
import { fetchPublishedMetadata } from "../../api/metadata";
import {
  fetchOpportunityDetail,
  fetchOpportunities,
  moveOpportunityStage,
  reassignOpportunityOwner,
  updateOpportunity,
} from "../../api/opportunities";
import {
  createSavedOpportunityView,
  deleteSavedOpportunityView,
  fetchSavedOpportunityViews,
  updateSavedOpportunityView,
} from "../../api/savedViews";
import type {
  AccountListItem,
  ActivityListItem,
  CustomFieldValue,
  ContactListItem,
  OpportunityDetail,
  OpportunityListItem,
  OpportunitySavedViewFilters,
  SavedOpportunityViewItem,
} from "../../types/crm";
import type { MetadataFieldDefinitionItem, MetadataStageDefinitionItem } from "../../types/metadata";
import type { CurrentUser } from "../../types/session";
import { AccountList } from "./AccountList";
import { BulkOperationsPanel } from "./BulkOperationsPanel";
import { CrmCreatePanel } from "./CrmCreatePanel";
import { DuplicateReviewPanel } from "./DuplicateReviewPanel";
import { OpportunityDetail as OpportunityDetailView } from "./OpportunityDetail";
import { OpportunityList } from "./OpportunityList";

type CrmReadWorkspaceProps = {
  currentUser: CurrentUser;
};

export function CrmReadWorkspace({ currentUser }: CrmReadWorkspaceProps) {
  const [accounts, setAccounts] = useState<AccountListItem[]>([]);
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [activities, setActivities] = useState<ActivityListItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityListItem[]>([]);
  const [savedViews, setSavedViews] = useState<SavedOpportunityViewItem[]>([]);
  const [metadataFields, setMetadataFields] = useState<MetadataFieldDefinitionItem[]>([]);
  const [stages, setStages] = useState<MetadataStageDefinitionItem[]>([]);
  const [activeFilters, setActiveFilters] = useState<OpportunitySavedViewFilters>({});
  const [savedViewName, setSavedViewName] = useState("");
  const [savedViewVisibilityScope, setSavedViewVisibilityScope] = useState<"private" | "shared">("private");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityDetail | null>(null);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [isApprovalSubmitting, setIsApprovalSubmitting] = useState(false);
  const [isActivitySubmitting, setIsActivitySubmitting] = useState(false);
  const [isSavedViewSubmitting, setIsSavedViewSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadLists = async () => {
      setIsLoadingLists(true);
      setErrorMessage(null);
      setMessage(null);

      try {
        const [accountResponse, opportunityResponse, metadataResponse, savedViewResponse] = await Promise.all([
          fetchAccounts(currentUser.userId),
          fetchOpportunities(currentUser.userId, activeFilters),
          fetchPublishedMetadata(currentUser.userId),
          fetchSavedOpportunityViews(currentUser.userId),
        ]);

        if (cancelled) {
          return;
        }

        setAccounts(accountResponse.items);
        setOpportunities(opportunityResponse.items);
        setSavedViews(savedViewResponse.views);
        setMetadataFields(metadataResponse.fields);
        setStages(metadataResponse.stages);
        setSelectedAccountId((current) => current ?? accountResponse.items[0]?.id ?? null);
        setSelectedOpportunityId((current) =>
          current && opportunityResponse.items.some((item) => item.id === current)
            ? current
            : opportunityResponse.items[0]?.id ?? null,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(describeRequestError(error));
        setAccounts([]);
        setContacts([]);
        setActivities([]);
        setOpportunities([]);
        setSavedViews([]);
        setMetadataFields([]);
        setStages([]);
        setSelectedAccountId(null);
        setSelectedContactId(null);
        setSelectedOpportunityId(null);
      } finally {
        if (!cancelled) {
          setIsLoadingLists(false);
        }
      }
    };

    void loadLists();

    return () => {
      cancelled = true;
    };
  }, [activeFilters, currentUser.userId]);

  useEffect(() => {
    let cancelled = false;

    const loadContacts = async () => {
      if (!selectedAccountId) {
        setContacts([]);
        setSelectedContactId(null);
        return;
      }

      try {
        const contactResponse = await fetchContacts(currentUser.userId, selectedAccountId);

        if (cancelled) {
          return;
        }

        setContacts(contactResponse.items);
        setSelectedContactId((current) => current ?? contactResponse.items[0]?.id ?? null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setContacts([]);
        setSelectedContactId(null);
        setErrorMessage(describeRequestError(error));
      }
    };

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, [currentUser.userId, selectedAccountId]);

  useEffect(() => {
    let cancelled = false;

    const loadDetail = async () => {
      if (!selectedOpportunityId) {
        setSelectedOpportunity(null);
        return;
      }

      setIsLoadingDetail(true);
      setErrorMessage(null);

      try {
        const detail = await fetchOpportunityDetail(currentUser.userId, selectedOpportunityId);

        if (cancelled) {
          return;
        }

        setSelectedOpportunity(detail);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSelectedOpportunity(null);
        setErrorMessage(describeRequestError(error));
      } finally {
        if (!cancelled) {
          setIsLoadingDetail(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [currentUser.userId, selectedOpportunityId]);

  useEffect(() => {
    let cancelled = false;

    const loadActivities = async () => {
      if (!selectedOpportunityId) {
        setActivities([]);
        return;
      }

      try {
        const activityResponse = await fetchActivities(currentUser.userId, selectedOpportunityId);

        if (cancelled) {
          return;
        }

        setActivities(activityResponse.items);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setActivities([]);
        setErrorMessage(describeRequestError(error));
      }
    };

    void loadActivities();

    return () => {
      cancelled = true;
    };
  }, [currentUser.userId, selectedOpportunityId]);

  const pipelineTotal = useMemo(
    () =>
      opportunities.reduce(
        (total, opportunity) => total + (opportunity.expectedAmount ?? 0),
        0,
      ),
    [opportunities],
  );

  const stageLabels = useMemo(
    () => new Map(stages.map((stage) => [stage.stageKey, stage.displayName])),
    [stages],
  );

  const opportunityCustomFields = useMemo(
    () =>
      metadataFields
        .filter((field) => field.entityType === "opportunity" && field.isActive)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.fieldKey.localeCompare(right.fieldKey)),
    [metadataFields],
  );

  const canCreateSharedViews = currentUser.roleKey === "sales_manager" || currentUser.roleKey === "revops_admin";
  const canUseBulkOperations = currentUser.roleKey === "revops_admin";
  const hasActiveOpportunityFilters = Boolean(
    activeFilters.stageKey ||
      activeFilters.ownerId ||
      activeFilters.accountId ||
      activeFilters.query ||
      Object.values(activeFilters.customFields ?? {}).some((value) => value !== undefined && value !== null && value !== ""),
  );
  const accountEmptyLabel =
    currentUser.roleKey === "sales_manager"
      ? "No accounts in your team workspace"
      : currentUser.roleKey === "revops_admin"
        ? "No tenant accounts"
        : "No accounts in your workspace";
  const opportunityEmptyLabel = hasActiveOpportunityFilters
    ? "No opportunities match the current view"
    : currentUser.roleKey === "sales_manager"
      ? "No opportunities in your team scope"
      : currentUser.roleKey === "revops_admin"
        ? "No tenant opportunities"
        : "No opportunities in your workspace";
  const savedViewsEmptyLabel = canCreateSharedViews
    ? "No private or shared saved views"
    : "No saved views available";

  const refreshLists = async (nextSelectedOpportunityId?: string) => {
    const [accountResponse, opportunityResponse] = await Promise.all([
      fetchAccounts(currentUser.userId),
      fetchOpportunities(currentUser.userId, activeFilters),
    ]);

    setAccounts(accountResponse.items);
    setOpportunities(opportunityResponse.items);
    setSelectedOpportunityId(
      nextSelectedOpportunityId && opportunityResponse.items.some((item) => item.id === nextSelectedOpportunityId)
        ? nextSelectedOpportunityId
        : opportunityResponse.items[0]?.id ?? null,
    );
  };

  const handleAccountCreated = async (accountId: string) => {
    await refreshLists();
    setSelectedAccountId(accountId);
    setSelectedContactId(null);
  };

  const handleContactCreated = async (contactId: string) => {
    if (!selectedAccountId) {
      return;
    }

    const contactResponse = await fetchContacts(currentUser.userId, selectedAccountId);
    setContacts(contactResponse.items);
    setSelectedContactId(contactId);
  };

  const handleOpportunityCreated = async (opportunityId: string) => {
    await refreshLists(opportunityId);
  };

  const refreshSelectedOpportunity = async () => {
    if (!selectedOpportunityId) {
      return;
    }

    const [opportunityResponse, detail] = await Promise.all([
      fetchOpportunities(currentUser.userId, activeFilters),
      fetchOpportunityDetail(currentUser.userId, selectedOpportunityId),
    ]);

    setOpportunities(opportunityResponse.items);
    setSelectedOpportunity(detail);
  };

  const runOpportunityAction = async (action: () => Promise<void>, successMessage: string) => {
    try {
      setIsActionSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      await action();
      await refreshSelectedOpportunity();
      setMessage(successMessage);
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleUpdateOpportunity = async (request: {
    closeDate?: string;
    customFields?: Record<string, CustomFieldValue>;
    expectedAmount?: number;
    title?: string;
  }) => {
    if (!selectedOpportunityId) {
      return;
    }

    await runOpportunityAction(
      () => updateOpportunity(currentUser.userId, selectedOpportunityId, request).then(() => undefined),
      "Opportunity updated",
    );
  };

  const handleMoveStage = async (targetStageKey: string) => {
    if (!selectedOpportunityId) {
      return;
    }

    await runOpportunityAction(
      () =>
        moveOpportunityStage(currentUser.userId, selectedOpportunityId, {
          targetStageKey,
        }).then(() => undefined),
      "Opportunity stage moved",
    );
  };

  const handleReassignOwner = async (newOwnerId: string) => {
    if (!selectedOpportunityId) {
      return;
    }

    await runOpportunityAction(
      () =>
        reassignOpportunityOwner(currentUser.userId, selectedOpportunityId, {
          newOwnerId,
        }).then(() => undefined),
      "Opportunity owner reassigned",
    );
  };

  const handleCreateActivity = async (request: {
    dueDate?: string;
    title: string;
    type: string;
  }) => {
    if (!selectedOpportunityId) {
      return;
    }

    try {
      setIsActivitySubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      await createActivity(currentUser.userId, selectedOpportunityId, request);
      const activityResponse = await fetchActivities(currentUser.userId, selectedOpportunityId);
      setActivities(activityResponse.items);
      setMessage("Activity created");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsActivitySubmitting(false);
    }
  };

  const handleSubmitApproval = async (request: { businessJustification?: string }) => {
    if (!selectedOpportunityId) {
      return;
    }

    try {
      setIsApprovalSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      await submitApproval(currentUser.userId, selectedOpportunityId, {
        businessJustification: request.businessJustification,
        requestType: "stage_progression",
      });
      await refreshSelectedOpportunity();
      setMessage("Approval submitted");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsApprovalSubmitting(false);
    }
  };

  const handleCreateSavedView = async () => {
    const name = savedViewName.trim();
    if (!name) {
      setErrorMessage("Saved view name cannot be blank");
      return;
    }

    try {
      setIsSavedViewSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      await createSavedOpportunityView(currentUser.userId, {
        name,
        filters: activeFilters,
        visibilityScope: canCreateSharedViews ? savedViewVisibilityScope : "private",
      });
      const savedViewResponse = await fetchSavedOpportunityViews(currentUser.userId);
      setSavedViews(savedViewResponse.views);
      setSavedViewName("");
      setMessage("Saved view created");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSavedViewSubmitting(false);
    }
  };

  const handleUpdateSavedView = async (view: SavedOpportunityViewItem) => {
    const name = savedViewName.trim() || view.name;

    try {
      setIsSavedViewSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      await updateSavedOpportunityView(currentUser.userId, view.id, {
        name,
        filters: activeFilters,
        visibilityScope: canCreateSharedViews ? savedViewVisibilityScope : view.visibilityScope,
      });
      const savedViewResponse = await fetchSavedOpportunityViews(currentUser.userId);
      setSavedViews(savedViewResponse.views);
      setSavedViewName("");
      setMessage("Saved view updated");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSavedViewSubmitting(false);
    }
  };

  const handleDeleteSavedView = async (view: SavedOpportunityViewItem) => {
    try {
      setIsSavedViewSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      await deleteSavedOpportunityView(currentUser.userId, view.id);
      const savedViewResponse = await fetchSavedOpportunityViews(currentUser.userId);
      setSavedViews(savedViewResponse.views);
      setMessage("Saved view deleted");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSavedViewSubmitting(false);
    }
  };

  const handleApplySavedView = (view: SavedOpportunityViewItem) => {
    if (!view.valid) {
      setErrorMessage(view.invalidReasons.join("; ") || "Saved view is invalid");
      return;
    }

    setErrorMessage(null);
    setMessage(`Saved view applied: ${view.name}`);
    setActiveFilters(view.filters);
  };

  return (
    <div className="crm-workspace">
      <div className="workspace-header">
        <div>
          <span>{currentUser.displayName}</span>
          <h2>CRM Workspace</h2>
        </div>
        <div className="workspace-metrics">
          <strong>{opportunities.length}</strong>
          <span>{formatCurrency(pipelineTotal)}</span>
        </div>
      </div>

      {errorMessage ? <div className="error-box">{errorMessage}</div> : null}
      {message ? <div className="success-box">{message}</div> : null}
      {isLoadingLists ? <div className="empty-row">Loading CRM records</div> : null}

      <div className="crm-grid">
        {canUseBulkOperations ? (
          <BulkOperationsPanel currentUser={currentUser} onAccountsChanged={() => refreshLists()} />
        ) : null}
        {canUseBulkOperations ? <DuplicateReviewPanel currentUser={currentUser} /> : null}
        <CrmCreatePanel
          accounts={accounts}
          contacts={contacts}
          currentUser={currentUser}
          fields={opportunityCustomFields}
          stages={stages}
          selectedAccountId={selectedAccountId}
          selectedContactId={selectedContactId}
          onAccountCreated={handleAccountCreated}
          onContactCreated={handleContactCreated}
          onOpportunityCreated={handleOpportunityCreated}
          onSelectContact={setSelectedContactId}
        />
        <AccountList
          accounts={accounts}
          emptyLabel={accountEmptyLabel}
          selectedAccountId={selectedAccountId}
          onSelectAccount={(accountId) => {
            setSelectedAccountId(accountId);
            setSelectedContactId(null);
          }}
        />
        <OpportunityList
          filters={activeFilters}
          canCreateSharedViews={canCreateSharedViews}
          customFields={opportunityCustomFields}
          emptyLabel={opportunityEmptyLabel}
          isSavedViewSubmitting={isSavedViewSubmitting}
          opportunities={opportunities}
          savedViewsEmptyLabel={savedViewsEmptyLabel}
          savedViewName={savedViewName}
          savedViewVisibilityScope={savedViewVisibilityScope}
          savedViews={savedViews}
          stageLabels={stageLabels}
          stages={stages}
          selectedOpportunityId={selectedOpportunityId}
          onApplySavedView={handleApplySavedView}
          onClearFilters={() => setActiveFilters({})}
          onCreateSavedView={handleCreateSavedView}
          onDeleteSavedView={handleDeleteSavedView}
          onFiltersChange={setActiveFilters}
          onSavedViewVisibilityScopeChange={setSavedViewVisibilityScope}
          onSavedViewNameChange={setSavedViewName}
          onSelectOpportunity={setSelectedOpportunityId}
          onUpdateSavedView={handleUpdateSavedView}
        />
        <OpportunityDetailView
          activities={activities}
          opportunity={selectedOpportunity}
          fields={opportunityCustomFields}
          stages={stages}
          isActionSubmitting={isActionSubmitting}
          isActivitySubmitting={isActivitySubmitting}
          isApprovalSubmitting={isApprovalSubmitting}
          isLoading={isLoadingDetail}
          onCreateActivity={handleCreateActivity}
          onMoveStage={handleMoveStage}
          onReassignOwner={handleReassignOwner}
          onSubmitApproval={handleSubmitApproval}
          onUpdateOpportunity={handleUpdateOpportunity}
        />
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
