import { useEffect, useMemo, useState } from "react";
import { fetchOpportunitySummary, type OpportunitySummary } from "../../api/opportunities";
import type { OpportunitySavedViewFilters } from "../../types/crm";
import type { CurrentUser } from "../../types/session";
import { normalizeApproval } from "./OpportunityList";
import { useCrmOpportunityActions } from "./useCrmOpportunityActions";
import { useCrmSavedViews } from "./useCrmSavedViews";
import { useCrmWorkspaceData } from "./useCrmWorkspaceData";

export type CloseWindowFilter = "" | "30" | "60" | "90" | "month";
export type ApprovalFilter = "" | "none" | "pending" | "sent_back" | "approved" | "rejected";
export type DrawerKind = null | { kind: "create"; mode: "account" | "contact" | "opportunity" };
export type CrmTab = "opportunities" | "accounts";

type UseCrmWorkspaceControllerArgs = {
  currentUser: CurrentUser;
  routeAccountId: string | null;
  routeOpportunityId: string | null;
};

export function useCrmWorkspaceController({
  currentUser,
  routeAccountId,
  routeOpportunityId,
}: UseCrmWorkspaceControllerArgs) {
  const [activeFilters, setActiveFilters] = useState<OpportunitySavedViewFilters>({});
  const [closeWindow, setCloseWindow] = useState<CloseWindowFilter>("");
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("");
  const [recentlyCreatedIds, setRecentlyCreatedIds] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [crmTab, setCrmTab] = useState<CrmTab>("opportunities");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const {
    accountActivities,
    accounts,
    activities,
    assignableOwners,
    accountTotal,
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
    loadMoreAccounts,
    loadMoreOpportunities,
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
    setSelectedOpportunityId,
    refreshLists,
    refreshSelectedAccountContacts,
    refreshSelectedOpportunity,
    refreshSelectedOpportunityActivities,
  } = useCrmWorkspaceData({
    activeFilters,
    currentUser,
    routeAccountId,
    routeOpportunityId,
    setErrorMessage,
  });

  const stageLabels = useMemo(
    () => new Map(stages.map((stage) => [stage.stageKey, stage.displayName])),
    [stages],
  );
  const closedStageKeys = useMemo(
    () => new Set(stages.filter((s) => s.isClosed).map((s) => s.stageKey)),
    [stages],
  );
  const opportunityCustomFields = useMemo(
    () =>
      metadataFields
        .filter((field) => field.entityType === "opportunity" && field.isActive)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.fieldKey.localeCompare(right.fieldKey)),
    [metadataFields],
  );

  const visibleOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (approvalFilter && normalizeApproval(opp.approvalState) !== approvalFilter) {
        return false;
      }
      if (closeWindow) {
        if (!opp.closeDate) return false;
        const closeDate = parseDateOnly(opp.closeDate);
        if (!closeDate) return false;

        if (closeWindow === "month") {
          const today = new Date();
          if (
            closeDate.getUTCFullYear() !== today.getUTCFullYear() ||
            closeDate.getUTCMonth() !== today.getUTCMonth()
          ) {
            return false;
          }
        } else {
          const today = new Date();
          const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
          const closeUtc = Date.UTC(
            closeDate.getUTCFullYear(),
            closeDate.getUTCMonth(),
            closeDate.getUTCDate(),
          );
          const days = (closeUtc - todayUtc) / (1000 * 60 * 60 * 24);
          const limit = parseInt(closeWindow, 10);
          if (days < 0 || days > limit) return false;
        }
      }
      return true;
    });
  }, [opportunities, approvalFilter, closeWindow]);

  // KPI cards come from a server-side aggregate over the FULL scope (not the
  // client-loaded page), so they are stable regardless of "Load more". Keyed on the
  // server-side filters; a fresh fetch happens whenever those change.
  const [summary, setSummary] = useState<OpportunitySummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchOpportunitySummary(currentUser.userId, activeFilters)
      .then((next) => { if (!cancelled) setSummary(next); })
      .catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, [currentUser.userId, activeFilters]);

  const kpis = useMemo(
    () => ({
      open: summary?.open ?? 0,
      pipeline: summary?.pipelineValue ?? 0,
      pendingApprovals: summary?.pendingApprovals ?? 0,
      closingThisMonth: summary?.closingThisMonth ?? 0,
    }),
    [summary],
  );

  useEffect(() => {
    if (!routeOpportunityId && visibleOpportunities.length > 0 && !visibleOpportunities.find((o) => o.id === selectedOpportunityId)) {
      setSelectedOpportunityId(visibleOpportunities[0].id);
    }
  }, [routeOpportunityId, visibleOpportunities, selectedOpportunityId]);

  const canCreateSharedViews =
    currentUser.roleKey === "sales_manager" || currentUser.roleKey === "revops_admin";
  const scopeLabel =
    currentUser.roleKey === "revops_admin"
      ? "Tenant-scoped"
      : currentUser.roleKey === "sales_manager"
        ? "Team-scoped"
        : "Owner-scoped";
  const scopeLockLabel =
    currentUser.roleKey === "revops_admin"
      ? "SCOPE · TENANT"
      : currentUser.roleKey === "sales_manager"
        ? "SCOPE · TEAM"
        : `OWNER · ${currentUser.displayName.toUpperCase()}`;

  const hasServerFilters = Boolean(
    activeFilters.stageKey ||
      activeFilters.ownerId ||
      activeFilters.accountId ||
      activeFilters.query ||
      Object.values(activeFilters.customFields ?? {}).some(
        (value) => value !== undefined && value !== null && value !== "",
      ),
  );
  const hasLocalFilters = Boolean(closeWindow || approvalFilter);
  const hasActiveFilters = hasServerFilters || hasLocalFilters;

  const opportunityEmptyLabel = hasActiveFilters
    ? "No opportunities match the current view"
    : currentUser.roleKey === "sales_manager"
      ? "No opportunities in your team scope"
      : currentUser.roleKey === "revops_admin"
        ? "No tenant opportunities"
        : "No opportunities in your workspace";

  const flashToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2800);
  };

  const markRecentlyCreated = (id: string) => {
    setRecentlyCreatedIds((current) => Array.from(new Set([id, ...current])).slice(0, 5));
    setTimeout(() => {
      setRecentlyCreatedIds((current) => current.filter((value) => value !== id));
    }, 4000);
  };

  const opportunityActions = useCrmOpportunityActions({
    currentUser,
    selectedOpportunityId,
    refreshSelectedOpportunity,
    refreshSelectedOpportunityActivities,
    setSelectedOpportunityId,
    setErrorMessage,
    flashToast,
  });

  const savedViewActions = useCrmSavedViews({
    currentUser,
    activeFilters,
    canCreateSharedViews,
    setSavedViews,
    setActiveFilters,
    setCloseWindow,
    setApprovalFilter,
    setErrorMessage,
    flashToast,
  });

  const resetFilters = () => {
    setActiveFilters({});
    setCloseWindow("");
    setApprovalFilter("");
    savedViewActions.setActiveSavedViewId(null);
  };

  const handleAccountCreated = async (accountId: string) => {
    await refreshLists();
    setSelectedAccountId(accountId);
    setSelectedContactId(null);
    flashToast("Account created and selected");
  };

  const handleContactCreated = async (contactId: string) => {
    if (!selectedAccountId) return;
    await refreshSelectedAccountContacts(selectedAccountId);
    setSelectedContactId(contactId);
    flashToast("Contact created and selected");
  };

  const handleOpportunityCreated = async (opportunityId: string) => {
    await refreshLists(opportunityId);
    markRecentlyCreated(opportunityId);
    setDrawer(null);
    flashToast(`Opportunity ${opportunityId} created`);
  };

  const selectedListItem = visibleOpportunities.find((o) => o.id === selectedOpportunityId) ?? null;
  const selectedApprovalEligible = selectedListItem
    ? normalizeApproval(selectedListItem.approvalState) === "none"
    : false;

  return {
    accountActivities,
    accounts,
    accountTotal,
    activities,
    activeFilters,
    activeSavedViewId: savedViewActions.activeSavedViewId,
    assignableOwners,
    activityTitle: opportunityActions.activityTitle,
    approvalFilter,
    canCreateSharedViews,
    closeWindow,
    contacts,
    crmTab,
    drawer,
    errorMessage,
    setErrorMessage,
    hasActiveFilters,
    isActionSubmitting: opportunityActions.isActionSubmitting,
    isActivitySubmitting: opportunityActions.isActivitySubmitting,
    isApprovalSubmitting: opportunityActions.isApprovalSubmitting,
    isLoadingDetail,
    isLoadingLists,
    isLoadingMoreAccounts,
    isLoadingMoreOpportunities,
    isSavedViewSubmitting: savedViewActions.isSavedViewSubmitting,
    kpis,
    loadMoreAccounts,
    loadMoreOpportunities,
    metadataFields,
    opportunities,
    opportunityCustomFields,
    opportunityEmptyLabel,
    opportunityTotal,
    recentlyCreatedIds,
    refreshLists,
    routeAccount,
    isLoadingRouteAccount,
    savedViewFormOpen: savedViewActions.savedViewFormOpen,
    savedViewName: savedViewActions.savedViewName,
    savedViewVisibilityScope: savedViewActions.savedViewVisibilityScope,
    savedViews,
    scopeLabel,
    scopeLockLabel,
    selectedAccountId,
    selectedApprovalEligible,
    selectedContactId,
    selectedListItem,
    selectedOpportunity,
    selectedOpportunityId,
    stageLabels,
    stageRequiredFields,
    stages,
    submitJustification: opportunityActions.submitJustification,
    submitModalOpp: opportunityActions.submitModalOpp,
    toast,
    visibleOpportunities,
    setActivityTitle: opportunityActions.setActivityTitle,
    setActiveFilters,
    setActiveSavedViewId: savedViewActions.setActiveSavedViewId,
    setApprovalFilter,
    setCloseWindow,
    setCrmTab,
    setDrawer,
    setSavedViewFormOpen: savedViewActions.setSavedViewFormOpen,
    setSavedViewName: savedViewActions.setSavedViewName,
    setSavedViewVisibilityScope: savedViewActions.setSavedViewVisibilityScope,
    setSelectedAccountId,
    setSelectedContactId,
    setSelectedOpportunityId,
    setSubmitJustification: opportunityActions.setSubmitJustification,
    setSubmitModalOpp: opportunityActions.setSubmitModalOpp,
    resetFilters,
    handleAccountCreated,
    handleApplySavedView: savedViewActions.handleApplySavedView,
    handleContactCreated,
    handleCreateActivity: opportunityActions.handleCreateActivity,
    handleCreateSavedView: savedViewActions.handleCreateSavedView,
    handleDeleteSavedView: savedViewActions.handleDeleteSavedView,
    handleMoveStage: opportunityActions.handleMoveStage,
    handleOpportunityCreated,
    handleReassignOwner: opportunityActions.handleReassignOwner,
    handleSubmitApproval: opportunityActions.handleSubmitApproval,
    handleSubmitApprovalFromDetail: opportunityActions.handleSubmitApprovalFromDetail,
    handleUpdateOpportunity: opportunityActions.handleUpdateOpportunity,
    handleUpdateSavedView: savedViewActions.handleUpdateSavedView,
    submitInlineActivity: opportunityActions.submitInlineActivity,
  };
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}
