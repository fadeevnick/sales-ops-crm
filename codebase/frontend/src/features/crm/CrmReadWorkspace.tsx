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
import { AccountDetail, type AccountOpportunity, type AccountRecord } from "./AccountDetail";
import { BulkOperationsPanel } from "./BulkOperationsPanel";
import { CrmCreatePanel } from "./CrmCreatePanel";
import type { CreateMode } from "./CrmCreatePanel";
import { DuplicateReviewPanel } from "./DuplicateReviewPanel";
import { OpportunityDetail as OpportunityDetailView } from "./OpportunityDetail";
import {
  OpportunityList,
  StagePip,
  formatCompactCurrency,
  normalizeApproval,
} from "./OpportunityList";

type CrmReadWorkspaceProps = {
  currentUser: CurrentUser;
};

type CloseWindowFilter = "" | "30" | "60" | "90" | "month";
type ApprovalFilter = "" | "none" | "pending" | "sent_back" | "approved" | "rejected";

type DrawerKind = null | { kind: "create"; mode: CreateMode };

export function CrmReadWorkspace({ currentUser }: CrmReadWorkspaceProps) {
  const [accounts, setAccounts] = useState<AccountListItem[]>([]);
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [activities, setActivities] = useState<ActivityListItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityListItem[]>([]);
  const [savedViews, setSavedViews] = useState<SavedOpportunityViewItem[]>([]);
  const [metadataFields, setMetadataFields] = useState<MetadataFieldDefinitionItem[]>([]);
  const [stages, setStages] = useState<MetadataStageDefinitionItem[]>([]);
  const [activeFilters, setActiveFilters] = useState<OpportunitySavedViewFilters>({});
  const [closeWindow, setCloseWindow] = useState<CloseWindowFilter>("");
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("");
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityDetail | null>(null);
  const [recentlyCreatedIds, setRecentlyCreatedIds] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [submitModalOpp, setSubmitModalOpp] = useState<OpportunityListItem | null>(null);
  const [submitJustification, setSubmitJustification] = useState("");
  const [savedViewFormOpen, setSavedViewFormOpen] = useState(false);
  const [savedViewName, setSavedViewName] = useState("");
  const [savedViewVisibilityScope, setSavedViewVisibilityScope] = useState<"private" | "shared">("private");
  const [showDetailFull, setShowDetailFull] = useState(false);
  const [accountDetailId, setAccountDetailId] = useState<string | null>(null);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [isApprovalSubmitting, setIsApprovalSubmitting] = useState(false);
  const [isActivitySubmitting, setIsActivitySubmitting] = useState(false);
  const [isSavedViewSubmitting, setIsSavedViewSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activityTitle, setActivityTitle] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadLists = async () => {
      setIsLoadingLists(true);
      setErrorMessage(null);
      try {
        const [accountResponse, opportunityResponse, metadataResponse, savedViewResponse] = await Promise.all([
          fetchAccounts(currentUser.userId),
          fetchOpportunities(currentUser.userId, activeFilters),
          fetchPublishedMetadata(currentUser.userId),
          fetchSavedOpportunityViews(currentUser.userId),
        ]);

        if (cancelled) return;

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
        if (cancelled) return;
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
        if (!cancelled) setIsLoadingLists(false);
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
  }, [currentUser.userId, selectedAccountId]);

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
  }, [currentUser.userId, selectedOpportunityId]);

  // ── Derived state ───────────────────────────────────────────────────────
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

  // KPIs based on visible opportunities + total
  const kpis = useMemo(() => {
    const open = visibleOpportunities.filter((o) => !closedStageKeys.has(o.stageKey)).length;
    const pipeline = visibleOpportunities.reduce(
      (total, opp) => total + (opp.expectedAmount ?? 0),
      0,
    );
    const pendingApprovals = visibleOpportunities.filter((o) => {
      const a = normalizeApproval(o.approvalState);
      return a === "pending" || a === "sent_back";
    }).length;
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const closingThisMonth = visibleOpportunities.filter(
      (o) => o.closeDate?.startsWith(monthKey) ?? false,
    ).length;

    return { open, pipeline, pendingApprovals, closingThisMonth };
  }, [visibleOpportunities, closedStageKeys]);

  // Keep selection valid when filters change
  useEffect(() => {
    if (
      visibleOpportunities.length > 0 &&
      !visibleOpportunities.find((o) => o.id === selectedOpportunityId)
    ) {
      setSelectedOpportunityId(visibleOpportunities[0].id);
    }
  }, [visibleOpportunities, selectedOpportunityId]);

  // ── Permissions / labels ────────────────────────────────────────────────
  const canCreateSharedViews =
    currentUser.roleKey === "sales_manager" || currentUser.roleKey === "revops_admin";
  const canUseBulkOperations = currentUser.roleKey === "revops_admin";
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

  // ── Helpers ─────────────────────────────────────────────────────────────
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

  const resetFilters = () => {
    setActiveFilters({});
    setCloseWindow("");
    setApprovalFilter("");
    setActiveSavedViewId(null);
  };

  const refreshLists = async (nextSelectedOpportunityId?: string) => {
    const [accountResponse, opportunityResponse] = await Promise.all([
      fetchAccounts(currentUser.userId),
      fetchOpportunities(currentUser.userId, activeFilters),
    ]);

    setAccounts(accountResponse.items);
    setOpportunities(opportunityResponse.items);
    setSelectedOpportunityId(
      nextSelectedOpportunityId &&
        opportunityResponse.items.some((item) => item.id === nextSelectedOpportunityId)
        ? nextSelectedOpportunityId
        : opportunityResponse.items[0]?.id ?? null,
    );
  };

  // ── Create handlers ─────────────────────────────────────────────────────
  const handleAccountCreated = async (accountId: string) => {
    await refreshLists();
    setSelectedAccountId(accountId);
    setSelectedContactId(null);
    flashToast("Account created and selected");
  };

  const handleContactCreated = async (contactId: string) => {
    if (!selectedAccountId) return;
    const contactResponse = await fetchContacts(currentUser.userId, selectedAccountId);
    setContacts(contactResponse.items);
    setSelectedContactId(contactId);
    flashToast("Contact created and selected");
  };

  const handleOpportunityCreated = async (opportunityId: string) => {
    await refreshLists(opportunityId);
    markRecentlyCreated(opportunityId);
    setDrawer(null);
    flashToast(`Opportunity ${opportunityId} created`);
  };

  // ── Selected opportunity actions ────────────────────────────────────────
  const refreshSelectedOpportunity = async (opportunityId = selectedOpportunityId) => {
    if (!opportunityId) return;
    const [opportunityResponse, detail] = await Promise.all([
      fetchOpportunities(currentUser.userId, activeFilters),
      fetchOpportunityDetail(currentUser.userId, opportunityId),
    ]);
    setOpportunities(opportunityResponse.items);
    setSelectedOpportunity(detail);
  };

  const runOpportunityAction = async (action: () => Promise<void>, successMessage: string) => {
    try {
      setIsActionSubmitting(true);
      setErrorMessage(null);
      await action();
      await refreshSelectedOpportunity();
      flashToast(successMessage);
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
    if (!selectedOpportunityId) return;
    await runOpportunityAction(
      () => updateOpportunity(currentUser.userId, selectedOpportunityId, request).then(() => undefined),
      "Opportunity updated",
    );
  };

  const handleMoveStage = async (targetStageKey: string) => {
    if (!selectedOpportunityId) return;
    await runOpportunityAction(
      () =>
        moveOpportunityStage(currentUser.userId, selectedOpportunityId, { targetStageKey }).then(
          () => undefined,
        ),
      "Opportunity stage moved",
    );
  };

  const handleReassignOwner = async (newOwnerId: string) => {
    if (!selectedOpportunityId) return;
    await runOpportunityAction(
      () =>
        reassignOpportunityOwner(currentUser.userId, selectedOpportunityId, { newOwnerId }).then(
          () => undefined,
        ),
      "Opportunity owner reassigned",
    );
  };

  const handleCreateActivity = async (request: {
    dueDate?: string;
    title: string;
    type: string;
  }) => {
    if (!selectedOpportunityId) return;
    try {
      setIsActivitySubmitting(true);
      setErrorMessage(null);
      await createActivity(currentUser.userId, selectedOpportunityId, request);
      const activityResponse = await fetchActivities(currentUser.userId, selectedOpportunityId);
      setActivities(activityResponse.items);
      flashToast("Activity created");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsActivitySubmitting(false);
    }
  };

  const submitInlineActivity = async () => {
    const trimmed = activityTitle.trim();
    if (!trimmed) return;
    await handleCreateActivity({ title: trimmed, type: "task" });
    setActivityTitle("");
  };

  const handleSubmitApproval = async () => {
    if (!submitModalOpp) return;
    try {
      setIsApprovalSubmitting(true);
      setErrorMessage(null);
      await submitApproval(currentUser.userId, submitModalOpp.id, {
        businessJustification: submitJustification.trim() || undefined,
        requestType: "stage_progression",
      });
      setSelectedOpportunityId(submitModalOpp.id);
      await refreshSelectedOpportunity(submitModalOpp.id);
      flashToast(`Approval request submitted for ${submitModalOpp.id}`);
      setSubmitModalOpp(null);
      setSubmitJustification("");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsApprovalSubmitting(false);
    }
  };

  const handleSubmitApprovalFromDetail = async (request: {
    businessJustification?: string;
    requestType?: string;
  }) => {
    if (!selectedOpportunityId) return;
    try {
      setIsApprovalSubmitting(true);
      setErrorMessage(null);
      await submitApproval(currentUser.userId, selectedOpportunityId, {
        businessJustification: request.businessJustification,
        requestType: request.requestType ?? "stage_progression",
      });
      await refreshSelectedOpportunity();
      flashToast("Approval submitted");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsApprovalSubmitting(false);
    }
  };

  // ── Saved views ─────────────────────────────────────────────────────────
  const handleApplySavedView = (view: SavedOpportunityViewItem) => {
    if (!view.valid) {
      setErrorMessage(view.invalidReasons.join("; ") || "Saved view is invalid");
      return;
    }
    setErrorMessage(null);
    setActiveFilters(view.filters);
    setActiveSavedViewId(view.id);
    setCloseWindow("");
    setApprovalFilter("");
    flashToast(`Saved view applied: ${view.name}`);
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
      await createSavedOpportunityView(currentUser.userId, {
        name,
        filters: activeFilters,
        visibilityScope: canCreateSharedViews ? savedViewVisibilityScope : "private",
      });
      const savedViewResponse = await fetchSavedOpportunityViews(currentUser.userId);
      setSavedViews(savedViewResponse.views);
      setSavedViewName("");
      setSavedViewFormOpen(false);
      flashToast(`Saved view created: ${name}`);
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
      await deleteSavedOpportunityView(currentUser.userId, view.id);
      const savedViewResponse = await fetchSavedOpportunityViews(currentUser.userId);
      setSavedViews(savedViewResponse.views);
      if (activeSavedViewId === view.id) setActiveSavedViewId(null);
      flashToast("Saved view deleted");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSavedViewSubmitting(false);
    }
  };

  const handleUpdateSavedView = async (view: SavedOpportunityViewItem) => {
    try {
      setIsSavedViewSubmitting(true);
      setErrorMessage(null);
      await updateSavedOpportunityView(currentUser.userId, view.id, {
        filters: activeFilters,
        visibilityScope: canCreateSharedViews ? savedViewVisibilityScope : view.visibilityScope,
      });
      const savedViewResponse = await fetchSavedOpportunityViews(currentUser.userId);
      setSavedViews(savedViewResponse.views);
      flashToast(`Saved view updated: ${view.name}`);
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSavedViewSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const selectedListItem = visibleOpportunities.find((o) => o.id === selectedOpportunityId) ?? null;
  const selectedApprovalEligible = selectedListItem
    ? normalizeApproval(selectedListItem.approvalState) === "none"
    : false;

  // ── Account Detail drill-down ───────────────────────────────────────────
  if (accountDetailId) {
    const accountRecord = accounts.find((a) => a.id === accountDetailId);
    if (accountRecord) {
      const stageLabelLookup = new Map(stages.map((s) => [s.stageKey, s.displayName]));
      const accountDetailRecord: AccountRecord = {
        id: accountRecord.id,
        name: accountRecord.name,
        ownerId: accountRecord.ownerId,
        ownerName: accountRecord.ownerName,
        openOppsCount: accountRecord.openOpportunityCount,
      };
      const accountOpps: AccountOpportunity[] = opportunities
        .filter((o) => o.accountId === accountDetailId)
        .map((o) => {
          const stageIndex = stages.findIndex((s) => s.stageKey === o.stageKey);
          return {
            id: o.id,
            title: o.title,
            stageKey: o.stageKey,
            stageLabel: stageLabelLookup.get(o.stageKey) ?? o.stageKey,
            stageIndex: stageIndex >= 0 ? stageIndex : undefined,
            expectedAmount: o.expectedAmount ?? undefined,
            closeDate: o.closeDate ?? undefined,
            approvalState: normalizeApproval(o.approvalState),
            approvalLabel: o.approvalState?.replace(/_/g, " "),
            ownerName: o.ownerName,
          };
        });
      const openPipeline = accountOpps.reduce((sum, o) => sum + (o.expectedAmount ?? 0), 0);
      const inFlightApprovals = accountOpps.filter(
        (o) => o.approvalState === "pending" || o.approvalState === "sent_back",
      ).length;
      accountDetailRecord.openPipeline = openPipeline;
      accountDetailRecord.inFlightApprovals = inFlightApprovals;
      return (
        <AccountDetail
          currentUser={currentUser}
          account={accountDetailRecord}
          opportunities={accountOpps}
          activities={[]}
          auditEvents={[]}
          onBack={() => setAccountDetailId(null)}
          onOpenOpportunity={(id) => {
            setSelectedOpportunityId(id);
            setAccountDetailId(null);
            setShowDetailFull(true);
          }}
          onNewOpportunity={() => {
            setSelectedAccountId(accountDetailId);
            setAccountDetailId(null);
            setDrawer({ kind: "create", mode: "opportunity" });
          }}
        />
      );
    }
  }

  return (
    <div className="rep-workspace" data-screen-label="Sales Rep Workspace">
      <header className="rep-page-head">
        <div>
          <h1 className="rep-page-title">
            My workspace <em>· {todayLabel}</em>
          </h1>
          <div className="rep-page-sub">
            <span className="mono">{currentUser.roleKey.toUpperCase()}</span>
            <span className="sep">/</span>
            <span>{currentUser.roleName} workspace</span>
            <span className="sep">·</span>
            <span>{scopeLabel}</span>
            <span className="sep">·</span>
            <span className="mono">Local Pilot · {currentUser.tenantName}</span>
          </div>
        </div>
        <div className="rep-page-actions">
          <button
            className="rep-btn"
            onClick={() => setDrawer({ kind: "create", mode: "account" })}
            type="button"
          >
            New account
          </button>
          <button
            className="rep-btn"
            onClick={() => setDrawer({ kind: "create", mode: "contact" })}
            type="button"
          >
            New contact
          </button>
          <button
            className={selectedApprovalEligible ? "rep-btn" : "rep-btn rep-btn-disabled"}
            disabled={!selectedApprovalEligible || !selectedListItem}
            onClick={() => selectedListItem && setSubmitModalOpp(selectedListItem)}
            title={
              selectedApprovalEligible
                ? "Submit selected opportunity for approval"
                : "Selected opportunity is not eligible to submit (active or completed approval state)"
            }
            type="button"
          >
            Submit for approval
          </button>
          <button
            className="rep-btn rep-btn-primary"
            onClick={() => setDrawer({ kind: "create", mode: "opportunity" })}
            type="button"
          >
            New opportunity <span className="kbd">N</span>
          </button>
        </div>
      </header>

      {errorMessage ? <div className="rep-form-error">{errorMessage}</div> : null}
      {isLoadingLists ? <div className="rep-empty">Loading workspace…</div> : null}

      <Kpis
        kpiOpen={kpis.open}
        kpiPipeline={kpis.pipeline}
        kpiPending={kpis.pendingApprovals}
        kpiClosing={kpis.closingThisMonth}
        totalOpportunities={opportunities.length}
      />

      <SavedViewsRow
        activeSavedViewId={activeSavedViewId}
        canCreateSharedViews={canCreateSharedViews}
        hasActiveFilters={hasActiveFilters}
        isSavedViewSubmitting={isSavedViewSubmitting}
        savedViewFormOpen={savedViewFormOpen}
        savedViewName={savedViewName}
        savedViewVisibilityScope={savedViewVisibilityScope}
        savedViews={savedViews}
        onApplySavedView={handleApplySavedView}
        onCreateSavedView={handleCreateSavedView}
        onDeleteSavedView={handleDeleteSavedView}
        onResetView={() => {
          setActiveSavedViewId(null);
          resetFilters();
        }}
        onSavedViewNameChange={setSavedViewName}
        onSavedViewVisibilityScopeChange={setSavedViewVisibilityScope}
        onToggleSavedViewForm={() => setSavedViewFormOpen((value) => !value)}
        onUpdateSavedView={handleUpdateSavedView}
      />

      <FiltersRow
        accounts={accounts}
        approvalFilter={approvalFilter}
        closeWindow={closeWindow}
        filters={activeFilters}
        hasActiveFilters={hasActiveFilters}
        stages={stages}
        scopeLockLabel={scopeLockLabel}
        onApprovalFilterChange={setApprovalFilter}
        onCloseWindowChange={setCloseWindow}
        onFiltersChange={(next) => {
          setActiveFilters(next);
          setActiveSavedViewId(null);
        }}
        onResetFilters={resetFilters}
      />

      {showDetailFull ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <button className="rep-btn" onClick={() => setShowDetailFull(false)} type="button">
              ← Back to workspace
            </button>
            <span className="rep-page-sub">
              <span className="mono">{selectedOpportunity?.id ?? ""}</span>
            </span>
          </div>
          <OpportunityDetailView
            activities={activities}
            currentUser={currentUser}
            fields={opportunityCustomFields}
            isActionSubmitting={isActionSubmitting}
            isActivitySubmitting={isActivitySubmitting}
            isApprovalSubmitting={isApprovalSubmitting}
            isLoading={isLoadingDetail}
            opportunity={selectedOpportunity}
            stages={stages}
            onCreateActivity={handleCreateActivity}
            onMoveStage={handleMoveStage}
            onReassignOwner={handleReassignOwner}
            onSubmitApproval={handleSubmitApprovalFromDetail}
            onUpdateOpportunity={handleUpdateOpportunity}
          />
        </div>
      ) : (
        <div className="rep-grid">
          <OpportunityList
            emptyLabel={opportunityEmptyLabel}
            hasActiveFilters={hasActiveFilters}
            opportunities={visibleOpportunities}
            recentlyCreatedIds={recentlyCreatedIds}
            selectedOpportunityId={selectedOpportunityId}
            stageLabels={stageLabels}
            stages={stages}
            totalRows={opportunities.length}
            onClearFilters={resetFilters}
            onSelectOpportunity={(id) => {
              setSelectedOpportunityId(id);
              const opp = opportunities.find((o) => o.id === id);
              if (opp) setSelectedAccountId(opp.accountId);
            }}
          />
          <OpportunityPreview
            activities={activities}
            activityTitle={activityTitle}
            customFields={opportunityCustomFields}
            isActivitySubmitting={isActivitySubmitting}
            isLoadingDetail={isLoadingDetail}
            listItem={selectedListItem}
            opportunity={selectedOpportunity}
            stageLabels={stageLabels}
            stages={stages}
            onActivityTitleChange={setActivityTitle}
            onOpenAccount={(id) => setAccountDetailId(id)}
            onOpenDetail={() => setShowDetailFull(true)}
            onSubmitActivity={submitInlineActivity}
            onSubmitApproval={() => {
              if (selectedListItem) setSubmitModalOpp(selectedListItem);
            }}
          />
        </div>
      )}

      {canUseBulkOperations ? (
        <details style={{ marginTop: 8 }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: "0.78rem",
              color: "var(--muted)",
              padding: "6px 0",
            }}
          >
            RevOps tools (bulk operations and duplicate review)
          </summary>
          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            <BulkOperationsPanel currentUser={currentUser} onAccountsChanged={() => refreshLists()} />
            <DuplicateReviewPanel currentUser={currentUser} />
          </div>
        </details>
      ) : null}

      <div className="rep-foot-ruler">
        <span>SALES OPS CRM · {currentUser.tenantName.toUpperCase()} · LOCAL PILOT</span>
        <span>
          USER {currentUser.roleKey.toUpperCase()} · {currentUser.displayName}
        </span>
        <span>{currentUser.email}</span>
      </div>

      {drawer && drawer.kind === "create" ? (
        <>
          <div className="rep-scrim" onClick={() => setDrawer(null)} />
          <aside className="rep-drawer" role="dialog" aria-label="Create record">
            <div className="rep-drawer-head">
              <div>
                <div className="rep-drawer-title">Create record</div>
                <div className="rep-drawer-sub">
                  Linked to <span style={{ color: "var(--ink-2)" }}>{currentUser.tenantName}</span>
                </div>
              </div>
              <button
                aria-label="Close"
                className="rep-drawer-close"
                onClick={() => setDrawer(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <CrmCreatePanel
              accounts={accounts}
              contacts={contacts}
              currentUser={currentUser}
              fields={opportunityCustomFields}
              initialMode={drawer.mode}
              selectedAccountId={selectedAccountId}
              selectedContactId={selectedContactId}
              stages={stages}
              onAccountCreated={handleAccountCreated}
              onClose={() => setDrawer(null)}
              onContactCreated={handleContactCreated}
              onOpportunityCreated={handleOpportunityCreated}
              onSelectAccount={(id) => {
                setSelectedAccountId(id);
                setSelectedContactId(null);
              }}
              onSelectContact={setSelectedContactId}
            />
          </aside>
        </>
      ) : null}

      {submitModalOpp ? (
        <>
          <div
            className="rep-scrim"
            onClick={() => {
              setSubmitModalOpp(null);
              setSubmitJustification("");
            }}
          />
          <div className="rep-modal" role="dialog" aria-label="Submit for approval">
            <div className="rep-modal-card">
              <div className="head">
                <h3>Submit {submitModalOpp.id} for approval</h3>
                <p>
                  This freezes the opportunity context (amount, stage, custom fields) at submission
                  time. The approver will see this snapshot.
                </p>
              </div>
              <div className="body">
                <dl className="rep-snap">
                  <dt>Account</dt>
                  <dd>
                    {submitModalOpp.accountId} · {submitModalOpp.accountName}
                  </dd>
                  <dt>Opportunity</dt>
                  <dd>
                    {submitModalOpp.id} ·{" "}
                    {submitModalOpp.title.length > 34
                      ? submitModalOpp.title.slice(0, 34) + "…"
                      : submitModalOpp.title}
                  </dd>
                  <dt>Amount</dt>
                  <dd>{formatCompactCurrency(submitModalOpp.expectedAmount)}</dd>
                  <dt>Stage</dt>
                  <dd>{stageLabels.get(submitModalOpp.stageKey) ?? submitModalOpp.stageKey}</dd>
                </dl>
                <div className="rep-form-field" style={{ marginTop: 14 }}>
                  <label>Business justification</label>
                  <textarea
                    onChange={(event) => setSubmitJustification(event.target.value)}
                    placeholder="Optional context for the approver"
                    rows={3}
                    value={submitJustification}
                  />
                </div>
              </div>
              <div className="foot">
                <button
                  className="rep-btn"
                  onClick={() => {
                    setSubmitModalOpp(null);
                    setSubmitJustification("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rep-btn rep-btn-primary"
                  disabled={isApprovalSubmitting}
                  onClick={() => void handleSubmitApproval()}
                  type="button"
                >
                  Submit request
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {toast ? (
        <div className="rep-toast">
          <span className="ok">✓</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────

function Kpis({
  kpiOpen,
  kpiPipeline,
  kpiPending,
  kpiClosing,
  totalOpportunities,
}: {
  kpiOpen: number;
  kpiPipeline: number;
  kpiPending: number;
  kpiClosing: number;
  totalOpportunities: number;
}) {
  return (
    <div className="rep-kpis">
      <div className="rep-kpi">
        <div className="rep-kpi-label">Open opportunities</div>
        <div className="rep-kpi-value">{kpiOpen}</div>
        <div className="rep-kpi-foot">{totalOpportunities} total in current view</div>
      </div>
      <div className="rep-kpi">
        <div className="rep-kpi-label">Pipeline value</div>
        <div className="rep-kpi-value">{formatCompactCurrency(kpiPipeline)}</div>
        <div className="rep-kpi-foot">Sum of expected amount</div>
      </div>
      <div className="rep-kpi">
        <div className="rep-kpi-label">Pending approvals</div>
        <div className="rep-kpi-value">{kpiPending}</div>
        <div className="rep-kpi-foot">Pending or sent back</div>
      </div>
      <div className="rep-kpi">
        <div className="rep-kpi-label">Closing this month</div>
        <div className="rep-kpi-value">{kpiClosing}</div>
        <div className="rep-kpi-foot">By close date</div>
      </div>
      <div className="rep-kpi">
        <div className="rep-kpi-label">Tenant scope</div>
        <div className="rep-kpi-value" style={{ fontSize: "0.95rem" }}>
          Local Pilot
        </div>
        <div className="rep-kpi-foot">Owner-scoped visibility</div>
      </div>
    </div>
  );
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function SavedViewsRow({
  activeSavedViewId,
  canCreateSharedViews,
  hasActiveFilters,
  isSavedViewSubmitting,
  savedViewFormOpen,
  savedViewName,
  savedViewVisibilityScope,
  savedViews,
  onApplySavedView,
  onCreateSavedView,
  onDeleteSavedView,
  onResetView,
  onSavedViewNameChange,
  onSavedViewVisibilityScopeChange,
  onToggleSavedViewForm,
  onUpdateSavedView,
}: {
  activeSavedViewId: string | null;
  canCreateSharedViews: boolean;
  hasActiveFilters: boolean;
  isSavedViewSubmitting: boolean;
  savedViewFormOpen: boolean;
  savedViewName: string;
  savedViewVisibilityScope: "private" | "shared";
  savedViews: SavedOpportunityViewItem[];
  onApplySavedView: (view: SavedOpportunityViewItem) => void;
  onCreateSavedView: () => void;
  onDeleteSavedView: (view: SavedOpportunityViewItem) => void;
  onResetView: () => void;
  onSavedViewNameChange: (name: string) => void;
  onSavedViewVisibilityScopeChange: (scope: "private" | "shared") => void;
  onToggleSavedViewForm: () => void;
  onUpdateSavedView: (view: SavedOpportunityViewItem) => void;
}) {
  return (
    <div>
      <div className="rep-views">
        <span className="rep-views-label">Saved views</span>
        <button
          className={!activeSavedViewId && !hasActiveFilters ? "rep-view-chip active" : "rep-view-chip"}
          onClick={onResetView}
          type="button"
        >
          All open
        </button>
        {savedViews.map((view) => (
          <button
            className={view.id === activeSavedViewId ? "rep-view-chip active" : "rep-view-chip"}
            disabled={!view.valid}
            key={view.id}
            onClick={() => onApplySavedView(view)}
            title={view.valid ? view.name : view.invalidReasons.join("; ")}
            type="button"
          >
            {view.name}
            <span className="ct">{view.visibilityScope === "shared" ? "shared" : "priv"}</span>
          </button>
        ))}
        <span className="rep-view-chip-spacer" />
        <button
          className="rep-btn rep-btn-ghost"
          onClick={onToggleSavedViewForm}
          type="button"
        >
          {savedViewFormOpen ? "Close" : "+ Save view"}
        </button>
      </div>
      {savedViewFormOpen ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(160px, 1fr) 140px auto auto",
            gap: 8,
            marginTop: 10,
            alignItems: "end",
          }}
        >
          <div className="rep-form-field">
            <label>View name</label>
            <input
              onChange={(event) => onSavedViewNameChange(event.target.value)}
              placeholder="e.g. My pipeline next 30 days"
              value={savedViewName}
            />
          </div>
          <div className="rep-form-field">
            <label>Visibility</label>
            <select
              disabled={!canCreateSharedViews}
              onChange={(event) =>
                onSavedViewVisibilityScopeChange(event.target.value === "shared" ? "shared" : "private")
              }
              value={savedViewVisibilityScope}
            >
              <option value="private">Private</option>
              <option value="shared">Shared</option>
            </select>
          </div>
          <button
            className="rep-btn rep-btn-primary"
            disabled={isSavedViewSubmitting || !savedViewName.trim()}
            onClick={onCreateSavedView}
            type="button"
          >
            Save view
          </button>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            Saves the current filter set
          </span>
          {savedViews.some((view) => view.canManage) ? (
            <div style={{ gridColumn: "1 / -1", display: "grid", gap: 6 }}>
              {savedViews
                .filter((view) => view.canManage)
                .map((view) => (
                  <div
                    key={view.id}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      padding: "6px 8px",
                      border: "1px solid var(--hairline)",
                      borderRadius: 3,
                      background: "var(--paper-2)",
                      fontSize: "0.78rem",
                    }}
                  >
                    <strong style={{ flex: 1 }}>{view.name}</strong>
                    <button
                      className="rep-btn"
                      disabled={isSavedViewSubmitting}
                      onClick={() => onUpdateSavedView(view)}
                      title="Overwrite this view with the current filters"
                      type="button"
                    >
                      Overwrite
                    </button>
                    <button
                      className="rep-btn"
                      disabled={isSavedViewSubmitting}
                      onClick={() => onDeleteSavedView(view)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FiltersRow({
  accounts,
  approvalFilter,
  closeWindow,
  filters,
  hasActiveFilters,
  scopeLockLabel,
  stages,
  onApprovalFilterChange,
  onCloseWindowChange,
  onFiltersChange,
  onResetFilters,
}: {
  accounts: AccountListItem[];
  approvalFilter: ApprovalFilter;
  closeWindow: CloseWindowFilter;
  filters: OpportunitySavedViewFilters;
  hasActiveFilters: boolean;
  scopeLockLabel: string;
  stages: MetadataStageDefinitionItem[];
  onApprovalFilterChange: (value: ApprovalFilter) => void;
  onCloseWindowChange: (value: CloseWindowFilter) => void;
  onFiltersChange: (filters: OpportunitySavedViewFilters) => void;
  onResetFilters: () => void;
}) {
  return (
    <>
      <div className="rep-filters">
        <label className="rep-field">
          <input
            onChange={(event) =>
              onFiltersChange({ ...filters, query: event.target.value || undefined })
            }
            placeholder="Filter by title or account…"
            value={filters.query ?? ""}
          />
        </label>
        <label className="rep-field">
          <span className="rep-field-lbl">Stage</span>
          <select
            onChange={(event) =>
              onFiltersChange({ ...filters, stageKey: event.target.value || undefined })
            }
            value={filters.stageKey ?? ""}
          >
            <option value="">All</option>
            {stages.map((stage) => (
              <option key={stage.stageKey} value={stage.stageKey}>
                {stage.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="rep-field">
          <span className="rep-field-lbl">Account</span>
          <select
            onChange={(event) =>
              onFiltersChange({ ...filters, accountId: event.target.value || undefined })
            }
            value={filters.accountId ?? ""}
          >
            <option value="">All</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label className="rep-field">
          <span className="rep-field-lbl">Close</span>
          <select
            onChange={(event) => onCloseWindowChange(event.target.value as CloseWindowFilter)}
            value={closeWindow}
          >
            <option value="">Any</option>
            <option value="30">≤ 30 days</option>
            <option value="60">≤ 60 days</option>
            <option value="90">≤ 90 days</option>
            <option value="month">This month</option>
          </select>
        </label>
        <label className="rep-field">
          <span className="rep-field-lbl">Approval</span>
          <select
            onChange={(event) => onApprovalFilterChange(event.target.value as ApprovalFilter)}
            value={approvalFilter}
          >
            <option value="">Any</option>
            <option value="none">None</option>
            <option value="pending">Pending</option>
            <option value="sent_back">Sent back</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <span
          className="rep-lock-chip"
          title="Visibility is enforced by the current user's role and backend access policy."
        >
          {scopeLockLabel}
        </span>
      </div>
      {hasActiveFilters ? (
        <div className="rep-filter-active">
          <span>Filters active</span>
          <button onClick={onResetFilters} type="button">
            Clear all
          </button>
        </div>
      ) : null}
    </>
  );
}

function OpportunityPreview({
  activities,
  activityTitle,
  customFields,
  isActivitySubmitting,
  isLoadingDetail,
  listItem,
  opportunity,
  stageLabels,
  stages,
  onActivityTitleChange,
  onOpenAccount,
  onOpenDetail,
  onSubmitActivity,
  onSubmitApproval,
}: {
  activities: ActivityListItem[];
  activityTitle: string;
  customFields: MetadataFieldDefinitionItem[];
  isActivitySubmitting: boolean;
  isLoadingDetail: boolean;
  listItem: OpportunityListItem | null;
  opportunity: OpportunityDetail | null;
  stageLabels: Map<string, string>;
  stages: MetadataStageDefinitionItem[];
  onActivityTitleChange: (value: string) => void;
  onOpenAccount: (accountId: string) => void;
  onOpenDetail: () => void;
  onSubmitActivity: () => void;
  onSubmitApproval: () => void;
}) {
  if (!listItem) {
    return (
      <section className="rep-panel rep-preview">
        <div className="rep-empty">
          <div className="icon">OP</div>
          <div className="ttl">Select an opportunity</div>
          <div>Click any row in the table to see its account, contact, activity and approval state.</div>
        </div>
      </section>
    );
  }

  const stageIndex = stages.findIndex((s) => s.stageKey === listItem.stageKey);
  const approvalKey = normalizeApproval(listItem.approvalState);
  const eligibleToSubmit = approvalKey === "none";
  const stageLabel = stageLabels.get(listItem.stageKey) ?? listItem.stageKey;

  return (
    <section className="rep-panel rep-preview">
      <div className="rep-preview-head">
        <div className="rep-preview-id">
          <span>OPPORTUNITY</span>
          <span>{listItem.id}</span>
        </div>
        <div className="rep-preview-title">{listItem.title}</div>
        <div className="rep-preview-acct">
          <span className="mono">{listItem.accountId}</span>
          <span style={{ color: "var(--line-2)" }}>·</span>
          <span>{listItem.accountName}</span>
          <button
            className="rep-btn rep-btn-ghost"
            style={{ marginLeft: "auto", fontSize: "0.7rem", padding: "2px 6px" }}
            onClick={() => onOpenAccount(listItem.accountId)}
            type="button"
          >
            Open account ›
          </button>
        </div>
      </div>

      <div className={`rep-approval-state p-${approvalKey}`}>
        {approvalKey === "none" ? (
          <>
            <span
              className="mono"
              style={{
                fontSize: "0.66rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              Approval
            </span>
            <span>No active request</span>
          </>
        ) : (
          <>
            <span className={`rep-pill p-${approvalKey}`}>
              <span className="dot" />
              {listItem.approvalState.replace(/_/g, " ")}
            </span>
            <span>Latest approval state for this opportunity</span>
          </>
        )}
      </div>

      <div className="rep-preview-grid">
        <div className="rep-pf">
          <div className="rep-pf-l">Stage</div>
          <div className="rep-pf-v">
            <StagePip activeIndex={stageIndex} total={stages.length || 5} />
            <span className="mono" style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.78rem" }}>
              {stageLabel}
            </span>
          </div>
        </div>
        <div className="rep-pf">
          <div className="rep-pf-l">Amount</div>
          <div className="rep-pf-v num">{formatCompactCurrency(listItem.expectedAmount)}</div>
        </div>
        <div className="rep-pf">
          <div className="rep-pf-l">Close date</div>
          <div className="rep-pf-v">
            <span className="mono" style={{ fontFamily: "ui-monospace, monospace" }}>
              {listItem.closeDate ?? "—"}
            </span>
          </div>
        </div>
        <div className="rep-pf">
          <div className="rep-pf-l">Owner</div>
          <div className="rep-pf-v" style={{ fontSize: "0.78rem" }}>
            {listItem.ownerName}
          </div>
        </div>
        {opportunity?.primaryContact ? (
          <div className="rep-pf" style={{ gridColumn: "1 / -1" }}>
            <div className="rep-pf-l">Primary contact</div>
            <div className="rep-pf-v" style={{ fontSize: "0.78rem" }}>
              {opportunity.primaryContact.fullName}
            </div>
          </div>
        ) : null}
        {customFields.slice(0, 4).map((field) => {
          const value = opportunity?.customFields[field.fieldKey];
          if (value === undefined || value === null || value === "") return null;
          return (
            <div className="rep-pf" key={field.id}>
              <div className="rep-pf-l">{field.label}</div>
              <div className="rep-pf-v" style={{ fontSize: "0.78rem" }}>
                {String(value)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rep-pf-block">
        <div className="rep-pf-block-title">
          <span>Recent activities</span>
          <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--muted-2)" }}>
            {activities.length}
          </span>
        </div>
        {isLoadingDetail ? (
          <div className="rep-empty" style={{ padding: 16 }}>
            Loading…
          </div>
        ) : activities.length === 0 ? (
          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>No activities yet.</div>
        ) : (
          activities.slice(0, 5).map((activity) => (
            <div className="rep-activity-row" key={activity.id}>
              <div>
                <strong>{activity.title}</strong>
                <span className="sub">
                  {activity.type} · {activity.status}
                </span>
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                {activity.dueDate ?? "no date"}
              </div>
            </div>
          ))
        )}
        <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
          <input
            className="rep-form-field"
            onChange={(event) => onActivityTitleChange(event.target.value)}
            placeholder="Quick add task…"
            style={{
              flex: 1,
              padding: "8px 10px",
              fontSize: "0.82rem",
              border: "1px solid var(--line)",
              borderRadius: 3,
              background: "var(--white)",
            }}
            value={activityTitle}
          />
          <button
            className={
              activityTitle.trim() ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"
            }
            disabled={isActivitySubmitting || !activityTitle.trim()}
            onClick={onSubmitActivity}
            type="button"
          >
            Add
          </button>
        </div>
      </div>

      {!eligibleToSubmit ? (
        <div className="rep-blocked">
          <div className="rep-blocked-title">Submit blocked</div>
          <ul className="rep-blocked-list">
            <li>
              An approval request is already in state <strong>{listItem.approvalState.replace(/_/g, " ")}</strong> for
              this opportunity.
            </li>
            <li>Wait for the current decision before resubmitting a different exception.</li>
          </ul>
        </div>
      ) : null}

      <div className="rep-preview-actions">
        <button className="rep-btn rep-btn-ghost" onClick={onOpenDetail} type="button">
          Open detail ›
        </button>
        <div className="right">
          <button
            className={
              eligibleToSubmit ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"
            }
            disabled={!eligibleToSubmit}
            onClick={onSubmitApproval}
            type="button"
          >
            Submit for approval
          </button>
        </div>
      </div>
    </section>
  );
}
