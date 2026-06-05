import { useEffect, useState } from "react";
import { createActivity, fetchActivities } from "../../api/activities";
import { fetchAccount, fetchAccounts } from "../../api/accounts";
import { fetchContacts } from "../../api/contacts";
import { fetchPublishedMetadata } from "../../api/metadata";
import { fetchAssignableOwners, fetchOpportunityDetail, fetchOpportunities, type AssignableOwner } from "../../api/opportunities";
import { fetchSavedOpportunityViews } from "../../api/savedViews";
import { describeRequestError } from "../../api/session";
import type {
  AccountListItem,
  ActivityListItem,
  ContactListItem,
  OpportunityDetail,
  OpportunityListItem,
  OpportunitySavedViewFilters,
  SavedOpportunityViewItem,
} from "../../types/crm";
import type {
  MetadataFieldDefinitionItem,
  MetadataStageDefinitionItem,
  MetadataStageRequiredFieldItem,
} from "../../types/metadata";
import type { CurrentUser } from "../../types/session";

const OPPORTUNITY_PAGE_SIZE = 20;
const ACCOUNT_PAGE_SIZE = 20;

type UseCrmWorkspaceDataArgs = {
  activeFilters: OpportunitySavedViewFilters;
  currentUser: CurrentUser;
  routeAccountId: string | null;
  routeOpportunityId: string | null;
  setErrorMessage: (message: string | null) => void;
};

export function useCrmWorkspaceData({
  activeFilters,
  currentUser,
  routeAccountId,
  routeOpportunityId,
  setErrorMessage,
}: UseCrmWorkspaceDataArgs) {
  const [accounts, setAccounts] = useState<AccountListItem[]>([]);
  const [accountTotal, setAccountTotal] = useState(0);
  const [accountPage, setAccountPage] = useState(1);
  const [isLoadingMoreAccounts, setIsLoadingMoreAccounts] = useState(false);
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [activities, setActivities] = useState<ActivityListItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityListItem[]>([]);
  const [opportunityTotal, setOpportunityTotal] = useState(0);
  const [opportunityPage, setOpportunityPage] = useState(1);
  const [isLoadingMoreOpportunities, setIsLoadingMoreOpportunities] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedOpportunityViewItem[]>([]);
  const [metadataFields, setMetadataFields] = useState<MetadataFieldDefinitionItem[]>([]);
  const [stages, setStages] = useState<MetadataStageDefinitionItem[]>([]);
  const [stageRequiredFields, setStageRequiredFields] = useState<MetadataStageRequiredFieldItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityDetail | null>(null);
  const [accountActivities, setAccountActivities] = useState<ActivityListItem[]>([]);
  const [routeAccount, setRouteAccount] = useState<AccountListItem | null>(null);
  const [isLoadingRouteAccount, setIsLoadingRouteAccount] = useState(false);
  const [assignableOwners, setAssignableOwners] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadLists = async () => {
      setIsLoadingLists(true);
      setErrorMessage(null);
      try {
        // Core lists (accounts, opportunities, metadata) must load together — a
        // failure there is a real error. Enrichment calls (saved views, assignable
        // owners) degrade to empty on failure so a single missing / not-yet-deployed
        // endpoint can't reject the whole load and wipe the workspace. Notably,
        // /api/opportunities/assignable-owners on an un-redeployed backend collides
        // with /api/opportunities/{id} and 422s — that must not blank the lists.
        const [accountResponse, opportunityResponse, metadataResponse, savedViewResponse, assignableOwnersResponse] =
          await Promise.all([
            fetchAccounts(currentUser.userId, { page: 1, pageSize: ACCOUNT_PAGE_SIZE }),
            fetchOpportunities(currentUser.userId, activeFilters, { page: 1, pageSize: OPPORTUNITY_PAGE_SIZE }),
            fetchPublishedMetadata(currentUser.userId),
            fetchSavedOpportunityViews(currentUser.userId).catch(() => ({ views: [] as SavedOpportunityViewItem[] })),
            fetchAssignableOwners(currentUser.userId).catch(() => ({ owners: [] as AssignableOwner[] })),
          ]);

        if (cancelled) return;

        setAccounts(accountResponse.items);
        setAccountTotal(accountResponse.total);
        setAccountPage(1);
        setOpportunities(opportunityResponse.items);
        setOpportunityTotal(opportunityResponse.total);
        setOpportunityPage(1);
        setSavedViews(savedViewResponse.views);
        setAssignableOwners(
          assignableOwnersResponse.owners.map((owner) => ({ id: owner.id, name: owner.displayName })),
        );
        setMetadataFields(metadataResponse.fields);
        setStages(metadataResponse.stages);
        setStageRequiredFields(metadataResponse.requiredFields);
        setSelectedAccountId((current) => current ?? accountResponse.items[0]?.id ?? null);
        setSelectedOpportunityId((current) =>
          current && opportunityResponse.items.some((item) => item.id === current)
            ? current
            : opportunityResponse.items[0]?.id ?? null,
        );
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(describeRequestError(error));
        setAccounts([]);
        setContacts([]);
        setActivities([]);
        setOpportunities([]);
        setSavedViews([]);
        setMetadataFields([]);
        setStages([]);
        setOpportunityTotal(0);
        setAccountTotal(0);
        setAssignableOwners([]);
        setSelectedAccountId(null);
        setSelectedContactId(null);
        setSelectedOpportunityId(null);
      } finally {
        if (!cancelled) setIsLoadingLists(false);
      }
    };

    void loadLists();
    return () => {
      cancelled = true;
    };
  }, [activeFilters, currentUser.userId, setErrorMessage]);

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
        if (cancelled) return;
        setContacts(contactResponse.items);
        setSelectedContactId((current) => current ?? contactResponse.items[0]?.id ?? null);
      } catch (error) {
        if (cancelled) return;
        setContacts([]);
        setSelectedContactId(null);
        setErrorMessage(describeRequestError(error));
      }
    };

    void loadContacts();
    return () => {
      cancelled = true;
    };
  }, [currentUser.userId, selectedAccountId, setErrorMessage]);

  useEffect(() => {
    let cancelled = false;
    const loadDetail = async () => {
      if (!selectedOpportunityId) {
        setSelectedOpportunity(null);
        return;
      }
      setIsLoadingDetail(true);
      try {
        const detail = await fetchOpportunityDetail(currentUser.userId, selectedOpportunityId);
        if (cancelled) return;
        setSelectedOpportunity(detail);
      } catch (error) {
        if (cancelled) return;
        setSelectedOpportunity(null);
        setErrorMessage(describeRequestError(error));
      } finally {
        if (!cancelled) setIsLoadingDetail(false);
      }
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [currentUser.userId, selectedOpportunityId, setErrorMessage]);

  useEffect(() => {
    if (routeOpportunityId && routeOpportunityId !== selectedOpportunityId) {
      setSelectedOpportunityId(routeOpportunityId);
    }
  }, [routeOpportunityId, selectedOpportunityId]);

  useEffect(() => {
    let cancelled = false;
    const loadActivities = async () => {
      if (!selectedOpportunityId) {
        setActivities([]);
        return;
      }
      try {
        const activityResponse = await fetchActivities(currentUser.userId, selectedOpportunityId);
        if (cancelled) return;
        setActivities(activityResponse.items);
      } catch (error) {
        if (cancelled) return;
        setActivities([]);
        setErrorMessage(describeRequestError(error));
      }
    };

    void loadActivities();
    return () => {
      cancelled = true;
    };
  }, [currentUser.userId, selectedOpportunityId, setErrorMessage]);

  // Fetch the routed account directly by id — independent of which page of the
  // accounts list happens to be loaded (the list is paginated; this is not).
  useEffect(() => {
    let cancelled = false;
    const loadRouteAccount = async () => {
      if (!routeAccountId) {
        setRouteAccount(null);
        setIsLoadingRouteAccount(false);
        return;
      }
      setIsLoadingRouteAccount(true);
      try {
        const account = await fetchAccount(currentUser.userId, routeAccountId);
        if (!cancelled) setRouteAccount(account);
      } catch {
        if (!cancelled) setRouteAccount(null);
      } finally {
        if (!cancelled) setIsLoadingRouteAccount(false);
      }
    };
    void loadRouteAccount();
    return () => {
      cancelled = true;
    };
  }, [routeAccountId, currentUser.userId]);

  useEffect(() => {
    let cancelled = false;
    const loadAccountActivities = async () => {
      if (!routeAccountId) {
        setAccountActivities([]);
        return;
      }
      const accountOppIds = opportunities.filter((o) => o.accountId === routeAccountId).map((o) => o.id);
      if (accountOppIds.length === 0) {
        setAccountActivities([]);
        return;
      }
      try {
        const results = await Promise.all(accountOppIds.map((id) => fetchActivities(currentUser.userId, id)));
        if (cancelled) return;
        setAccountActivities(results.flatMap((r) => r.items));
      } catch {
        if (!cancelled) setAccountActivities([]);
      }
    };
    void loadAccountActivities();
    return () => {
      cancelled = true;
    };
  }, [routeAccountId, opportunities, currentUser.userId]);

  const refreshLists = async (nextSelectedOpportunityId?: string) => {
    const [accountResponse, opportunityResponse, freshRouteAccount] = await Promise.all([
      fetchAccounts(currentUser.userId, { page: 1, pageSize: ACCOUNT_PAGE_SIZE }),
      fetchOpportunities(currentUser.userId, activeFilters, { page: 1, pageSize: OPPORTUNITY_PAGE_SIZE }),
      routeAccountId
        ? fetchAccount(currentUser.userId, routeAccountId).catch(() => null)
        : Promise.resolve(null),
    ]);

    setAccounts(accountResponse.items);
    setAccountTotal(accountResponse.total);
    setAccountPage(1);
    setOpportunities(opportunityResponse.items);
    setOpportunityTotal(opportunityResponse.total);
    setOpportunityPage(1);
    setSelectedOpportunityId(
      nextSelectedOpportunityId && opportunityResponse.items.some((item) => item.id === nextSelectedOpportunityId)
        ? nextSelectedOpportunityId
        : opportunityResponse.items[0]?.id ?? null,
    );
    if (freshRouteAccount) setRouteAccount(freshRouteAccount);
  };

  const loadMoreAccounts = async () => {
    if (isLoadingMoreAccounts) return;
    if (accounts.length >= accountTotal) return;
    setIsLoadingMoreAccounts(true);
    try {
      const nextPage = accountPage + 1;
      const response = await fetchAccounts(currentUser.userId, { page: nextPage, pageSize: ACCOUNT_PAGE_SIZE });
      setAccounts((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...response.items.filter((item) => !seen.has(item.id))];
      });
      setAccountTotal(response.total);
      setAccountPage(nextPage);
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsLoadingMoreAccounts(false);
    }
  };

  const loadMoreOpportunities = async () => {
    if (isLoadingMoreOpportunities) return;
    if (opportunities.length >= opportunityTotal) return;
    setIsLoadingMoreOpportunities(true);
    try {
      const nextPage = opportunityPage + 1;
      const response = await fetchOpportunities(currentUser.userId, activeFilters, {
        page: nextPage,
        pageSize: OPPORTUNITY_PAGE_SIZE,
      });
      // Append, de-duplicating by id in case the underlying set shifted between fetches.
      setOpportunities((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...response.items.filter((item) => !seen.has(item.id))];
      });
      setOpportunityTotal(response.total);
      setOpportunityPage(nextPage);
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsLoadingMoreOpportunities(false);
    }
  };

  const refreshSelectedOpportunity = async (opportunityId = selectedOpportunityId) => {
    if (!opportunityId) return;
    const [opportunityResponse, detail] = await Promise.all([
      fetchOpportunities(currentUser.userId, activeFilters),
      fetchOpportunityDetail(currentUser.userId, opportunityId),
    ]);
    setOpportunities(opportunityResponse.items);
    setSelectedOpportunity(detail);
  };

  const refreshSelectedOpportunityActivities = async (opportunityId = selectedOpportunityId) => {
    if (!opportunityId) return;
    const activityResponse = await fetchActivities(currentUser.userId, opportunityId);
    setActivities(activityResponse.items);
  };

  const refreshSelectedAccountContacts = async (accountId = selectedAccountId) => {
    if (!accountId) return;
    const contactResponse = await fetchContacts(currentUser.userId, accountId);
    setContacts(contactResponse.items);
  };

  return {
    accountActivities,
    accounts,
    accountTotal,
    activities,
    assignableOwners,
    contacts,
    isLoadingDetail,
    isLoadingLists,
    isLoadingMoreAccounts,
    isLoadingMoreOpportunities,
    isLoadingRouteAccount,
    routeAccount,
    metadataFields,
    opportunities,
    opportunityTotal,
    savedViews,
    selectedAccountId,
    selectedContactId,
    selectedOpportunity,
    selectedOpportunityId,
    stageRequiredFields,
    stages,
    setActivities,
    setContacts,
    setSavedViews,
    setSelectedAccountId,
    setSelectedContactId,
    setSelectedOpportunity,
    setSelectedOpportunityId,
    loadMoreAccounts,
    loadMoreOpportunities,
    refreshLists,
    refreshSelectedAccountContacts,
    refreshSelectedOpportunity,
    refreshSelectedOpportunityActivities,
  };
}
