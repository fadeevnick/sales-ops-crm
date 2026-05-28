/**
 * CrmReadWorkspace.tsx — Phase 2.1 rev2
 *
 * ── Capability audit ────────────────────────────────────────────────────
 *
 * 1. UNCHANGED — same behavior, same location
 *    All API calls: fetchAccounts, fetchOpportunities, fetchPublishedMetadata,
 *    fetchSavedOpportunityViews, fetchOpportunityDetail, fetchActivities,
 *    submitApproval, createActivity, moveOpportunityStage,
 *    reassignOpportunityOwner, updateOpportunity,
 *    createSavedOpportunityView, updateSavedOpportunityView,
 *    deleteSavedOpportunityView.
 *    Create opportunity / account / contact drawer behavior.
 *    Approval submission modal.
 *    Full OpportunityDetail view via "Open detail ›".
 *    Activity quick-add in preview.
 *    Role scoping: scopeLockLabel, canCreateSharedViews, canUseBulkOperations.
 *    RevOps bulk tools <details> block.
 *    Footer ruler (tenant / role / email).
 *    Flash toast, row flash animation on create, "Clear all" link.
 *    Stage / Search / Approval inline filters.
 *
 * 2. MOVED — behavior preserved, surface changed
 *    Saved views: inline chip row + create form
 *      → "Views ▾" dropdown at right of tab row.
 *        All operations still available: apply, create, overwrite,
 *        delete, view private/shared scope.
 *    New Account / New Contact: separate header buttons
 *      → split-button caret dropdown (same drawer).
 *    Account filter / Close date filter: inline filter row
 *      → "Filters ▾" popover.
 *    Submit for approval: page header button
 *      → preview panel footer.
 *        Justification: original button was disabled until an opportunity
 *        was selected anyway; Phase 2.1 requires the same precondition
 *        (row click opens preview). Net workflow steps unchanged.
 *
 * 3. DE-EMPHASIZED, NOT REMOVED
 *    Domain trail (roleKey / scopeLabel / tenantName): header subtitle
 *      → footer ruler. Informational context, not an interactive capability.
 *    "Closing this month" KPI: removed from strip.
 *      Justification: "Closing Soon" tab surfaces the same set as a
 *      workflow entry point. The metric was read-only.
 *    "Tenant scope" KPI tile: scope label moved into KPI foot text.
 *      Same justification.
 *    Preview: was always visible with an empty state on load
 *      → hidden until explicit row click. Empty state had no actionable
 *      content; hiding it gives the table full width by default.
 *
 * ── Data limitation ─────────────────────────────────────────────────────
 *    OpportunityListItem does not include per-opportunity activity data.
 *    "Needs Attention" therefore cannot detect overdue activities at
 *    list level. Currently flags:
 *      1. approvalState === "sent_back"
 *      2. closeDate ≤ 14 days AND approval !== "approved" AND open stage
 *    Add `hasOverdueActivity: boolean` to the list endpoint + crm.ts,
 *    then add `|| opp.hasOverdueActivity` in isNeedsAttention() below.
 */

import { useEffect, useMemo, useRef, useState } from "react";
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
import { BulkOperationsPanel } from "./BulkOperationsPanel";
import { CrmCreatePanel } from "./CrmCreatePanel";
import type { CreateMode } from "./CrmCreatePanel";
import { DuplicateReviewPanel } from "./DuplicateReviewPanel";
import { OpportunityDetail as OpportunityDetailView } from "./OpportunityDetail";
import {
  OpportunityList,
  formatCompactCurrency,
  normalizeApproval,
} from "./OpportunityList";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

type CrmReadWorkspaceProps = { currentUser: CurrentUser };
type CloseWindowFilter = "" | "30" | "60" | "90" | "month";
type ApprovalFilter = "" | "none" | "pending" | "sent_back" | "approved" | "rejected";
type ActiveTab = "attention" | "open" | "closing_soon" | "all";
type DrawerKind = null | { kind: "create"; mode: CreateMode };

// ─────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────

function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function daysUntil(dateStr: string): number {
  const d = parseDateOnly(dateStr);
  if (!d) return Infinity;
  return (d.getTime() - todayUtc().getTime()) / (1000 * 60 * 60 * 24);
}

function isNeedsAttention(opp: OpportunityListItem, closedStageKeys: Set<string>): boolean {
  const approval = normalizeApproval(opp.approvalState);
  if (approval === "sent_back") return true;
  // TODO: add `|| opp.hasOverdueActivity` once list endpoint exposes it
  if (opp.closeDate && !closedStageKeys.has(opp.stageKey)) {
    const days = daysUntil(opp.closeDate);
    if (days >= 0 && days <= 14 && approval !== "approved") return true;
  }
  return false;
}

function isClosingSoon(opp: OpportunityListItem): boolean {
  if (!opp.closeDate) return false;
  const days = daysUntil(opp.closeDate);
  return days >= 0 && days <= 30;
}

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────

export function CrmReadWorkspace({ currentUser }: CrmReadWorkspaceProps) {

  // ── Data ─────────────────────────────────────────────────────────────
  const [accounts,       setAccounts]       = useState<AccountListItem[]>([]);
  const [contacts,       setContacts]       = useState<ContactListItem[]>([]);
  const [activities,     setActivities]     = useState<ActivityListItem[]>([]);
  const [opportunities,  setOpportunities]  = useState<OpportunityListItem[]>([]);
  const [savedViews,     setSavedViews]     = useState<SavedOpportunityViewItem[]>([]);
  const [metadataFields, setMetadataFields] = useState<MetadataFieldDefinitionItem[]>([]);
  const [stages,         setStages]         = useState<MetadataStageDefinitionItem[]>([]);

  // ── Filters ───────────────────────────────────────────────────────────
  const [activeFilters,   setActiveFilters]   = useState<OpportunitySavedViewFilters>({});
  const [closeWindow,     setCloseWindow]     = useState<CloseWindowFilter>("");
  const [approvalFilter,  setApprovalFilter]  = useState<ApprovalFilter>("");
  const [activeTab,       setActiveTab]       = useState<ActiveTab>("attention");

  // ── Selection / UI ────────────────────────────────────────────────────
  const [activeSavedViewId,         setActiveSavedViewId]         = useState<string | null>(null);
  const [selectedAccountId,         setSelectedAccountId]         = useState<string | null>(null);
  const [selectedContactId,         setSelectedContactId]         = useState<string | null>(null);
  const [selectedOpportunityId,     setSelectedOpportunityId]     = useState<string | null>(null);
  const [selectedOpportunity,       setSelectedOpportunity]       = useState<OpportunityDetail | null>(null);
  const [previewVisible,            setPreviewVisible]            = useState(false);
  const [recentlyCreatedIds,        setRecentlyCreatedIds]        = useState<string[]>([]);
  const [drawer,                    setDrawer]                    = useState<DrawerKind>(null);
  const [submitModalOpp,            setSubmitModalOpp]            = useState<OpportunityListItem | null>(null);
  const [submitJustification,       setSubmitJustification]       = useState("");
  const [savedViewName,             setSavedViewName]             = useState("");
  const [savedViewVisibilityScope,  setSavedViewVisibilityScope]  = useState<"private" | "shared">("private");
  const [showDetailFull,            setShowDetailFull]            = useState(false);
  const [showFiltersPopover,        setShowFiltersPopover]        = useState(false);
  const [activityTitle,             setActivityTitle]             = useState("");

  // ── Loading / error ───────────────────────────────────────────────────
  const [isLoadingLists,       setIsLoadingLists]       = useState(true);
  const [isLoadingDetail,      setIsLoadingDetail]      = useState(false);
  const [isActionSubmitting,   setIsActionSubmitting]   = useState(false);
  const [isApprovalSubmitting, setIsApprovalSubmitting] = useState(false);
  const [isActivitySubmitting, setIsActivitySubmitting] = useState(false);
  const [isSavedViewSubmitting,setIsSavedViewSubmitting]= useState(false);
  const [errorMessage,         setErrorMessage]         = useState<string | null>(null);
  const [toast,                setToast]                = useState<string | null>(null);

  // ── Load: lists ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingLists(true);
      setErrorMessage(null);
      try {
        const [acctR, oppR, metaR, svR] = await Promise.all([
          fetchAccounts(currentUser.userId),
          fetchOpportunities(currentUser.userId, activeFilters),
          fetchPublishedMetadata(currentUser.userId),
          fetchSavedOpportunityViews(currentUser.userId),
        ]);
        if (cancelled) return;
        setAccounts(acctR.items);
        setOpportunities(oppR.items);
        setSavedViews(svR.views);
        setMetadataFields(metaR.fields);
        setStages(metaR.stages);
        setSelectedAccountId((c) => c ?? acctR.items[0]?.id ?? null);
        setSelectedOpportunityId((c) =>
          c && oppR.items.some((i) => i.id === c) ? c : null,
        );
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(describeRequestError(err));
        setAccounts([]); setContacts([]); setActivities([]);
        setOpportunities([]); setSavedViews([]); setMetadataFields([]); setStages([]);
        setSelectedAccountId(null); setSelectedContactId(null); setSelectedOpportunityId(null);
      } finally {
        if (!cancelled) setIsLoadingLists(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [activeFilters, currentUser.userId]);

  // ── Load: contacts ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedAccountId) { setContacts([]); setSelectedContactId(null); return; }
      try {
        const r = await fetchContacts(currentUser.userId, selectedAccountId);
        if (cancelled) return;
        setContacts(r.items);
        setSelectedContactId((c) => c ?? r.items[0]?.id ?? null);
      } catch (err) {
        if (cancelled) return;
        setContacts([]); setSelectedContactId(null);
        setErrorMessage(describeRequestError(err));
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [currentUser.userId, selectedAccountId]);

  // ── Load: opportunity detail ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedOpportunityId) { setSelectedOpportunity(null); return; }
      setIsLoadingDetail(true);
      try {
        const detail = await fetchOpportunityDetail(currentUser.userId, selectedOpportunityId);
        if (cancelled) return;
        setSelectedOpportunity(detail);
      } catch (err) {
        if (cancelled) return;
        setSelectedOpportunity(null);
        setErrorMessage(describeRequestError(err));
      } finally {
        if (!cancelled) setIsLoadingDetail(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [currentUser.userId, selectedOpportunityId]);

  // ── Load: activities ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedOpportunityId) { setActivities([]); return; }
      try {
        const r = await fetchActivities(currentUser.userId, selectedOpportunityId);
        if (cancelled) return;
        setActivities(r.items);
      } catch (err) {
        if (cancelled) return;
        setActivities([]);
        setErrorMessage(describeRequestError(err));
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [currentUser.userId, selectedOpportunityId]);

  // ── Derived ───────────────────────────────────────────────────────────
  const stageLabels = useMemo(
    () => new Map(stages.map((s) => [s.stageKey, s.displayName])),
    [stages],
  );
  const closedStageKeys = useMemo(
    () => new Set(stages.filter((s) => s.isClosed).map((s) => s.stageKey)),
    [stages],
  );
  const opportunityCustomFields = useMemo(
    () =>
      metadataFields
        .filter((f) => f.entityType === "opportunity" && f.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.fieldKey.localeCompare(b.fieldKey)),
    [metadataFields],
  );

  // Tabs and saved views are mutually exclusive filter surfaces.
  // When a saved view is active, tab filtering is bypassed entirely —
  // the saved view's own filters (in activeFilters) govern the result.
  // Clicking a tab exits saved view mode and clears its filters.
  const tabFiltered = useMemo(() => {
    if (activeSavedViewId !== null) return opportunities; // saved view governs
    switch (activeTab) {
      case "attention":    return opportunities.filter((o) => isNeedsAttention(o, closedStageKeys));
      case "open":         return opportunities.filter((o) => !closedStageKeys.has(o.stageKey));
      case "closing_soon": return opportunities.filter(isClosingSoon);
      default:             return opportunities;
    }
  }, [opportunities, activeTab, activeSavedViewId, closedStageKeys]);

  const tabCounts = useMemo(() => ({
    attention:    opportunities.filter((o) => isNeedsAttention(o, closedStageKeys)).length,
    open:         opportunities.filter((o) => !closedStageKeys.has(o.stageKey)).length,
    closing_soon: opportunities.filter(isClosingSoon).length,
    all:          opportunities.length,
  }), [opportunities, closedStageKeys]);

  const visibleOpportunities = useMemo(() => {
    return tabFiltered.filter((opp) => {
      if (approvalFilter && normalizeApproval(opp.approvalState) !== approvalFilter) return false;
      if (closeWindow) {
        if (!opp.closeDate) return false;
        if (closeWindow === "month") {
          const d = parseDateOnly(opp.closeDate);
          if (!d) return false;
          const t = new Date();
          if (d.getUTCFullYear() !== t.getUTCFullYear() || d.getUTCMonth() !== t.getUTCMonth()) return false;
        } else {
          const days = daysUntil(opp.closeDate);
          if (days < 0 || days > parseInt(closeWindow, 10)) return false;
        }
      }
      return true;
    });
  }, [tabFiltered, approvalFilter, closeWindow]);

  const kpis = useMemo(() => {
    const open     = opportunities.filter((o) => !closedStageKeys.has(o.stageKey)).length;
    const pipeline = opportunities.reduce((s, o) => s + (o.expectedAmount ?? 0), 0);
    const pending  = opportunities.filter((o) => {
      const a = normalizeApproval(o.approvalState);
      return a === "pending" || a === "sent_back";
    }).length;
    return { open, pipeline, pending };
  }, [opportunities, closedStageKeys]);

  // ── Permissions ───────────────────────────────────────────────────────
  const canCreateSharedViews = currentUser.roleKey === "sales_manager" || currentUser.roleKey === "revops_admin";
  const canUseBulkOperations = currentUser.roleKey === "revops_admin";
  const scopeLabel =
    currentUser.roleKey === "revops_admin" ? "Tenant-scoped" :
    currentUser.roleKey === "sales_manager" ? "Team-scoped" : "Owner-scoped";
  const scopeLockLabel =
    currentUser.roleKey === "revops_admin" ? "SCOPE · TENANT" :
    currentUser.roleKey === "sales_manager" ? "SCOPE · TEAM" :
    `OWNER · ${currentUser.displayName.toUpperCase()}`;

  const hasServerFilters = Boolean(
    activeFilters.stageKey || activeFilters.ownerId || activeFilters.accountId ||
    activeFilters.query ||
    Object.values(activeFilters.customFields ?? {}).some((v) => v !== undefined && v !== null && v !== ""),
  );
  const hasLocalFilters  = Boolean(closeWindow || approvalFilter);
  const hasActiveFilters = hasServerFilters || hasLocalFilters;

  const opportunityEmptyLabel =
    hasActiveFilters ? "No opportunities match the current filters" :
    activeTab === "attention" ? "You're all caught up — nothing needs attention" :
    activeTab === "closing_soon" ? "No opportunities closing in the next 30 days" :
    currentUser.roleKey === "sales_manager" ? "No opportunities in your team scope" :
    currentUser.roleKey === "revops_admin"  ? "No tenant opportunities" :
    "No opportunities in your workspace";

  // ── Helpers ───────────────────────────────────────────────────────────
  const flashToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2800);
  };

  const markRecentlyCreated = (id: string) => {
    setRecentlyCreatedIds((c) => Array.from(new Set([id, ...c])).slice(0, 5));
    setTimeout(() => setRecentlyCreatedIds((c) => c.filter((v) => v !== id)), 4000);
  };

  const resetFilters = () => {
    setActiveFilters({});
    setCloseWindow("");
    setApprovalFilter("");
    setActiveSavedViewId(null);
  };

  const refreshLists = async (nextId?: string) => {
    const [acctR, oppR] = await Promise.all([
      fetchAccounts(currentUser.userId),
      fetchOpportunities(currentUser.userId, activeFilters),
    ]);
    setAccounts(acctR.items);
    setOpportunities(oppR.items);
    setSelectedOpportunityId((c) => {
      if (nextId && oppR.items.some((i) => i.id === nextId)) return nextId;
      return c && oppR.items.some((i) => i.id === c) ? c : null;
    });
  };

  const refreshSavedViews = async () => {
    const r = await fetchSavedOpportunityViews(currentUser.userId);
    setSavedViews(r.views);
  };

  // ── Create handlers ───────────────────────────────────────────────────
  const handleAccountCreated = async (id: string) => {
    await refreshLists();
    setSelectedAccountId(id);
    setSelectedContactId(null);
    flashToast("Account created and selected");
  };

  const handleContactCreated = async (id: string) => {
    if (!selectedAccountId) return;
    const r = await fetchContacts(currentUser.userId, selectedAccountId);
    setContacts(r.items);
    setSelectedContactId(id);
    flashToast("Contact created and selected");
  };

  const handleOpportunityCreated = async (id: string) => {
    await refreshLists(id);
    markRecentlyCreated(id);
    setDrawer(null);
    setSelectedOpportunityId(id);
    setPreviewVisible(true);
    flashToast(`Opportunity ${id} created`);
  };

  // ── Opportunity actions ───────────────────────────────────────────────
  const refreshSelectedOpportunity = async (id = selectedOpportunityId) => {
    if (!id) return;
    const [oppR, detail] = await Promise.all([
      fetchOpportunities(currentUser.userId, activeFilters),
      fetchOpportunityDetail(currentUser.userId, id),
    ]);
    setOpportunities(oppR.items);
    setSelectedOpportunity(detail);
  };

  const runOppAction = async (action: () => Promise<void>, msg: string) => {
    try {
      setIsActionSubmitting(true);
      setErrorMessage(null);
      await action();
      await refreshSelectedOpportunity();
      flashToast(msg);
    } catch (err) {
      setErrorMessage(describeRequestError(err));
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleUpdateOpportunity = (req: { closeDate?: string; customFields?: Record<string, CustomFieldValue>; expectedAmount?: number; title?: string }) => {
    if (!selectedOpportunityId) return;
    return runOppAction(() => updateOpportunity(currentUser.userId, selectedOpportunityId, req).then(() => undefined), "Opportunity updated");
  };

  const handleMoveStage = (targetStageKey: string) => {
    if (!selectedOpportunityId) return;
    return runOppAction(() => moveOpportunityStage(currentUser.userId, selectedOpportunityId, { targetStageKey }).then(() => undefined), "Opportunity stage moved");
  };

  const handleReassignOwner = (newOwnerId: string) => {
    if (!selectedOpportunityId) return;
    return runOppAction(() => reassignOpportunityOwner(currentUser.userId, selectedOpportunityId, { newOwnerId }).then(() => undefined), "Opportunity owner reassigned");
  };

  const handleCreateActivity = async (req: { dueDate?: string; title: string; type: string }) => {
    if (!selectedOpportunityId) return;
    try {
      setIsActivitySubmitting(true);
      setErrorMessage(null);
      await createActivity(currentUser.userId, selectedOpportunityId, req);
      const r = await fetchActivities(currentUser.userId, selectedOpportunityId);
      setActivities(r.items);
      flashToast("Activity created");
    } catch (err) {
      setErrorMessage(describeRequestError(err));
    } finally {
      setIsActivitySubmitting(false);
    }
  };

  const submitInlineActivity = async () => {
    const t = activityTitle.trim();
    if (!t) return;
    await handleCreateActivity({ title: t, type: "task" });
    setActivityTitle("");
  };

  // ── Approval submission ───────────────────────────────────────────────
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
    } catch (err) {
      setErrorMessage(describeRequestError(err));
    } finally {
      setIsApprovalSubmitting(false);
    }
  };

  const handleSubmitApprovalFromDetail = async (req: { businessJustification?: string; requestType?: string }) => {
    if (!selectedOpportunityId) return;
    try {
      setIsApprovalSubmitting(true);
      setErrorMessage(null);
      await submitApproval(currentUser.userId, selectedOpportunityId, {
        businessJustification: req.businessJustification,
        requestType: req.requestType ?? "stage_progression",
      });
      await refreshSelectedOpportunity();
      flashToast("Approval submitted");
    } catch (err) {
      setErrorMessage(describeRequestError(err));
    } finally {
      setIsApprovalSubmitting(false);
    }
  };

  // ── Saved view handlers (all preserved) ──────────────────────────────
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
    flashToast(`View applied: ${view.name}`);
  };

  const handleResetView = () => {
    // Reset to the My Open tab in a clean filter state.
    // activeTab must be set explicitly so the tab row reflects the change.
    setActiveTab("open");
    setActiveSavedViewId(null);
    setActiveFilters({});
    setCloseWindow("");
    setApprovalFilter("");
  };

  const handleCreateSavedView = async () => {
    const name = savedViewName.trim();
    if (!name) { setErrorMessage("View name cannot be blank"); return; }
    try {
      setIsSavedViewSubmitting(true);
      setErrorMessage(null);
      await createSavedOpportunityView(currentUser.userId, {
        name,
        filters: activeFilters,
        visibilityScope: canCreateSharedViews ? savedViewVisibilityScope : "private",
      });
      await refreshSavedViews();
      setSavedViewName("");
      flashToast(`View created: ${name}`);
    } catch (err) {
      setErrorMessage(describeRequestError(err));
    } finally {
      setIsSavedViewSubmitting(false);
    }
  };

  const handleDeleteSavedView = async (view: SavedOpportunityViewItem) => {
    try {
      setIsSavedViewSubmitting(true);
      setErrorMessage(null);
      await deleteSavedOpportunityView(currentUser.userId, view.id);
      await refreshSavedViews();
      // If the deleted view was active, also reset its filters so the
      // workspace doesn't silently retain a filter set with no view attached.
      if (activeSavedViewId === view.id) {
        setActiveSavedViewId(null);
        setActiveFilters({});
        setCloseWindow("");
        setApprovalFilter("");
      }
      flashToast("View deleted");
    } catch (err) {
      setErrorMessage(describeRequestError(err));
    } finally {
      setIsSavedViewSubmitting(false);
    }
  };

  const handleUpdateSavedView = async (view: SavedOpportunityViewItem) => {
    try {
      setIsSavedViewSubmitting(true);
      setErrorMessage(null);
      // Overwrite updates filters only. visibilityScope is intentionally
      // omitted — scope must not change as a side-effect of overwriting.
      // A dedicated scope-change control would be the right place for that.
      await updateSavedOpportunityView(currentUser.userId, view.id, {
        filters: activeFilters,
      });
      await refreshSavedViews();
      flashToast(`View updated: ${view.name}`);
    } catch (err) {
      setErrorMessage(describeRequestError(err));
    } finally {
      setIsSavedViewSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  const selectedListItem = visibleOpportunities.find((o) => o.id === selectedOpportunityId) ?? null;
  const activeViewName   = savedViews.find((v) => v.id === activeSavedViewId)?.name ?? null;

  return (
    <div className="rep-workspace" data-screen-label="Sales Rep Workspace">

      {/* Header — title + split create button */}
      <header className="rep-page-head">
        <h1 className="rep-page-title">Opportunities</h1>
        <div className="rep-page-actions">
          <SplitCreateButton
            onNewOpportunity={() => setDrawer({ kind: "create", mode: "opportunity" })}
            onNewAccount={()      => setDrawer({ kind: "create", mode: "account" })}
            onNewContact={()      => setDrawer({ kind: "create", mode: "contact" })}
          />
        </div>
      </header>

      {errorMessage ? <div className="rep-form-error">{errorMessage}</div> : null}
      {isLoadingLists ? <div className="rep-empty">Loading workspace…</div> : null}

      {/* 3-metric KPI strip */}
      <KpisSimplified
        kpiOpen={kpis.open}
        kpiPipeline={kpis.pipeline}
        kpiPending={kpis.pending}
        scopeLabel={scopeLabel}
        tenantName={currentUser.tenantName}
      />

      {/* Tab row + Views dropdown — on the same line */}
      <div className="rep-tab-row">
        <ViewTabs
          activeTab={activeSavedViewId !== null ? null : activeTab}
          counts={tabCounts}
          onChangeTab={(tab) => {
            setActiveTab(tab as ActiveTab);
            // Exit saved view mode: clear the view identity and its filters.
            // This makes tabs and saved views mutually exclusive.
            setActiveSavedViewId(null);
            setActiveFilters({});
            setCloseWindow("");
            setApprovalFilter("");
            setPreviewVisible(false);
          }}
        />
        <SavedViewsDropdown
          activeSavedViewId={activeSavedViewId}
          activeViewName={activeViewName}
          canCreateSharedViews={canCreateSharedViews}
          hasActiveFilters={hasActiveFilters}
          isSavedViewSubmitting={isSavedViewSubmitting}
          savedViewName={savedViewName}
          savedViewVisibilityScope={savedViewVisibilityScope}
          savedViews={savedViews}
          onApplySavedView={handleApplySavedView}
          onCreateSavedView={handleCreateSavedView}
          onDeleteSavedView={handleDeleteSavedView}
          onResetView={handleResetView}
          onSavedViewNameChange={setSavedViewName}
          onSavedViewVisibilityScopeChange={setSavedViewVisibilityScope}
          onUpdateSavedView={handleUpdateSavedView}
        />
      </div>

      {/* Simplified filter row */}
      <SimplifiedFiltersRow
        accounts={accounts}
        approvalFilter={approvalFilter}
        closeWindow={closeWindow}
        filters={activeFilters}
        hasActiveFilters={hasActiveFilters}
        scopeLockLabel={scopeLockLabel}
        showFiltersPopover={showFiltersPopover}
        stages={stages}
        onApprovalFilterChange={setApprovalFilter}
        onCloseWindowChange={setCloseWindow}
        onFiltersChange={(next) => { setActiveFilters(next); setActiveSavedViewId(null); }}
        onResetFilters={resetFilters}
        onToggleFiltersPopover={() => setShowFiltersPopover((v) => !v)}
      />

      {/* Full-page opportunity detail */}
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
        <div className={`rep-grid ${previewVisible && selectedListItem ? "rep-grid--with-preview" : "rep-grid--no-preview"}`}>
          <OpportunityList
            emptyLabel={opportunityEmptyLabel}
            hasActiveFilters={hasActiveFilters}
            opportunities={visibleOpportunities}
            recentlyCreatedIds={recentlyCreatedIds}
            selectedOpportunityId={previewVisible ? selectedOpportunityId : null}
            stageLabels={stageLabels}
            stages={stages}
            totalRows={opportunities.length}
            onClearFilters={resetFilters}
            onSelectOpportunity={(id) => {
              if (id === selectedOpportunityId && previewVisible) {
                setPreviewVisible(false);
              } else {
                setSelectedOpportunityId(id);
                setPreviewVisible(true);
                const opp = opportunities.find((o) => o.id === id);
                if (opp) setSelectedAccountId(opp.accountId);
              }
            }}
          />
          {previewVisible && selectedListItem ? (
            <OpportunityPreview
              activities={activities}
              activityTitle={activityTitle}
              customFields={opportunityCustomFields}
              isActivitySubmitting={isActivitySubmitting}
              isLoadingDetail={isLoadingDetail}
              listItem={selectedListItem}
              opportunity={selectedOpportunity}
              stages={stages}
              onActivityTitleChange={setActivityTitle}
              onClosePreview={() => setPreviewVisible(false)}
              onOpenDetail={() => setShowDetailFull(true)}
              onSubmitActivity={submitInlineActivity}
              onSubmitApproval={() => { if (selectedListItem) setSubmitModalOpp(selectedListItem); }}
            />
          ) : null}
        </div>
      )}

      {/* RevOps bulk tools */}
      {canUseBulkOperations ? (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: "0.78rem", color: "var(--muted)", padding: "6px 0" }}>
            RevOps tools (bulk operations and duplicate review)
          </summary>
          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            <BulkOperationsPanel currentUser={currentUser} onAccountsChanged={() => refreshLists()} />
            <DuplicateReviewPanel currentUser={currentUser} />
          </div>
        </details>
      ) : null}

      {/* Footer ruler */}
      <div className="rep-foot-ruler">
        <span>SALES OPS CRM · {currentUser.tenantName.toUpperCase()} · LOCAL PILOT</span>
        <span>USER {currentUser.roleKey.toUpperCase()} · {currentUser.displayName}</span>
        <span>{currentUser.email}</span>
      </div>

      {/* Create drawer */}
      {drawer?.kind === "create" ? (
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
              <button aria-label="Close" className="rep-drawer-close" onClick={() => setDrawer(null)} type="button">×</button>
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
              onSelectAccount={(id) => { setSelectedAccountId(id); setSelectedContactId(null); }}
              onSelectContact={setSelectedContactId}
            />
          </aside>
        </>
      ) : null}

      {/* Submit approval modal */}
      {submitModalOpp ? (
        <>
          <div className="rep-scrim" onClick={() => { setSubmitModalOpp(null); setSubmitJustification(""); }} />
          <div className="rep-modal" role="dialog" aria-label="Submit for approval">
            <div className="rep-modal-card">
              <div className="head">
                <h3>Submit {submitModalOpp.id} for approval</h3>
                <p>This freezes the opportunity context at submission time. The approver will see this snapshot.</p>
              </div>
              <div className="body">
                <dl className="rep-snap">
                  <dt>Account</dt>
                  <dd>{submitModalOpp.accountId} · {submitModalOpp.accountName}</dd>
                  <dt>Opportunity</dt>
                  <dd>{submitModalOpp.id} · {submitModalOpp.title.length > 34 ? submitModalOpp.title.slice(0, 34) + "…" : submitModalOpp.title}</dd>
                  <dt>Amount</dt>
                  <dd>{formatCompactCurrency(submitModalOpp.expectedAmount)}</dd>
                  <dt>Stage</dt>
                  <dd>{stageLabels.get(submitModalOpp.stageKey) ?? submitModalOpp.stageKey}</dd>
                </dl>
                <div className="rep-form-field" style={{ marginTop: 14 }}>
                  <label>Business justification</label>
                  <textarea
                    onChange={(e) => setSubmitJustification(e.target.value)}
                    placeholder="Optional context for the approver"
                    rows={3}
                    value={submitJustification}
                  />
                </div>
              </div>
              <div className="foot">
                <button className="rep-btn" onClick={() => { setSubmitModalOpp(null); setSubmitJustification(""); }} type="button">Cancel</button>
                <button className="rep-btn rep-btn-primary" disabled={isApprovalSubmitting} onClick={() => void handleSubmitApproval()} type="button">Submit request</button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {toast ? <div className="rep-toast"><span className="ok">✓</span>{toast}</div> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// KPIs — 3-metric strip
// ─────────────────────────────────────────────────────────────────────────

function KpisSimplified({ kpiOpen, kpiPipeline, kpiPending, scopeLabel, tenantName }: {
  kpiOpen: number; kpiPipeline: number; kpiPending: number;
  scopeLabel: string; tenantName: string;
}) {
  return (
    <div className="rep-kpis rep-kpis--3col">
      <div className="rep-kpi">
        <div className="rep-kpi-label">Open opportunities</div>
        <div className="rep-kpi-value">{kpiOpen}</div>
        <div className="rep-kpi-foot">{scopeLabel} · {tenantName}</div>
      </div>
      <div className="rep-kpi">
        <div className="rep-kpi-label">Pipeline value</div>
        <div className="rep-kpi-value">{formatCompactCurrency(kpiPipeline)}</div>
        <div className="rep-kpi-foot">Sum of expected amount</div>
      </div>
      <div className={`rep-kpi${kpiPending > 0 ? " warn" : ""}`}>
        <div className="rep-kpi-label">Pending approvals</div>
        <div className="rep-kpi-value">{kpiPending}</div>
        <div className="rep-kpi-foot">Pending or sent back</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// View tabs
// ─────────────────────────────────────────────────────────────────────────

const TAB_DEFS: { key: ActiveTab; label: string }[] = [
  { key: "attention",    label: "Needs Attention" },
  { key: "open",         label: "My Open" },
  { key: "closing_soon", label: "Closing Soon" },
  { key: "all",          label: "All" },
];

// When activeSavedViewId is set, pass activeTab=null so no tab shows active.
function ViewTabs({ activeTab, counts, onChangeTab }: {
  activeTab: string | null;
  counts: Record<string, number>;
  onChangeTab: (tab: string) => void;
}) {
  return (
    <div className="rep-view-tabs">
      {TAB_DEFS.map((tab) => (
        <button
          key={tab.key}
          className={`rep-view-tab${activeTab === tab.key ? " active" : ""}`}
          onClick={() => onChangeTab(tab.key)}
          title={tab.key === "attention" ? "Flags sent-back approvals and deals closing within 14 days without approval. Overdue-activity signals require a backend field not yet available in the list endpoint." : undefined}
          type="button"
        >
          {tab.label}
          <span className="ct">{counts[tab.key] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Saved Views dropdown
// All saved-view operations exposed:
//   apply · create · overwrite · delete · see private/shared scope
// ─────────────────────────────────────────────────────────────────────────

function SavedViewsDropdown({
  activeSavedViewId,
  activeViewName,
  canCreateSharedViews,
  hasActiveFilters,
  isSavedViewSubmitting,
  savedViewName,
  savedViewVisibilityScope,
  savedViews,
  onApplySavedView,
  onCreateSavedView,
  onDeleteSavedView,
  onResetView,
  onSavedViewNameChange,
  onSavedViewVisibilityScopeChange,
  onUpdateSavedView,
}: {
  activeSavedViewId: string | null;
  activeViewName: string | null;
  canCreateSharedViews: boolean;
  hasActiveFilters: boolean;
  isSavedViewSubmitting: boolean;
  savedViewName: string;
  savedViewVisibilityScope: "private" | "shared";
  savedViews: SavedOpportunityViewItem[];
  onApplySavedView: (view: SavedOpportunityViewItem) => void;
  onCreateSavedView: () => void;
  onDeleteSavedView: (view: SavedOpportunityViewItem) => void;
  onResetView: () => void;
  onSavedViewNameChange: (name: string) => void;
  onSavedViewVisibilityScopeChange: (scope: "private" | "shared") => void;
  onUpdateSavedView: (view: SavedOpportunityViewItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const manageableViews = savedViews.filter((v) => v.canManage);
  const isViewActive    = activeSavedViewId !== null;

  return (
    <div className="rep-views-dropdown-wrap" ref={ref}>
      <button
        className={`rep-btn${isViewActive ? " rep-btn-filters-active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {isViewActive ? `Views · ${activeViewName ?? "…"}` : "Views"} ▾
      </button>

      {open ? (
        <div className="rep-views-panel" role="dialog" aria-label="Saved views">

          {/* Panel header */}
          <div className="rep-views-panel-head">
            <span>Saved views</span>
            <button className="rep-btn rep-btn-ghost" onClick={() => setOpen(false)} type="button">✕</button>
          </div>

          {/* View list */}
          <div className="rep-views-panel-list">

            {/* Reset to My Open — clears saved view + all filters, switches to My Open tab */}
            <div className={`rep-views-panel-row${!activeSavedViewId ? " active" : ""}`}>
              <button
                className="rep-views-row-apply"
                onClick={() => { onResetView(); setOpen(false); }}
                title="Clears the saved view and all filters. Switches to the My Open tab."
                type="button"
              >
                <span className="name">My Open — no view</span>
                <span className="scope-badge">reset</span>
              </button>
            </div>

            {savedViews.length === 0 ? (
              <div style={{ padding: "8px 12px", fontSize: "0.78rem", color: "var(--muted)" }}>
                No saved views yet.
              </div>
            ) : null}

            {savedViews.map((view) => (
              <div
                key={view.id}
                className={`rep-views-panel-row${view.id === activeSavedViewId ? " active" : ""}${!view.valid ? " invalid" : ""}`}
                title={!view.valid ? view.invalidReasons.join("; ") : undefined}
              >
                <button
                  className="rep-views-row-apply"
                  disabled={!view.valid}
                  onClick={() => { onApplySavedView(view); setOpen(false); }}
                  type="button"
                >
                  <span className="name">{view.name}</span>
                  <span className={`scope-badge ${view.visibilityScope}`}>
                    {view.visibilityScope === "shared" ? "shared" : "private"}
                  </span>
                  {!view.valid ? <span className="invalid-badge">invalid</span> : null}
                </button>
                {view.canManage ? (
                  <button
                    aria-label={`Delete view "${view.name}"`}
                    className="rep-views-row-delete"
                    disabled={isSavedViewSubmitting}
                    onClick={() => onDeleteSavedView(view)}
                    type="button"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* Create new view */}
          <div className="rep-views-panel-section">
            <div className="rep-views-section-label">Save current filters as view</div>
            <div className="rep-views-create-row">
              <input
                className="rep-views-name-input"
                onChange={(e) => onSavedViewNameChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && savedViewName.trim()) onCreateSavedView(); }}
                placeholder="View name…"
                value={savedViewName}
              />
              <select
                className="rep-views-scope-select"
                disabled={!canCreateSharedViews}
                onChange={(e) => onSavedViewVisibilityScopeChange(e.target.value === "shared" ? "shared" : "private")}
                title={!canCreateSharedViews ? "Shared views require manager or admin role" : undefined}
                value={savedViewVisibilityScope}
              >
                <option value="private">Private</option>
                <option value="shared">Shared</option>
              </select>
              <button
                className={savedViewName.trim() ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
                disabled={isSavedViewSubmitting || !savedViewName.trim()}
                onClick={onCreateSavedView}
                type="button"
              >
                Save
              </button>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 4 }}>
              Saves the current filter set{hasActiveFilters ? "" : " (no filters active — saves empty view)"}.
            </div>
          </div>

          {/* Overwrite section — only for views the user can manage */}
          {manageableViews.length > 0 ? (
            <div className="rep-views-panel-section">
              <div className="rep-views-section-label">Overwrite with current filters</div>
              {manageableViews.map((view) => (
                <div className="rep-views-overwrite-row" key={view.id}>
                  <span className="name">{view.name}</span>
                  <span className={`scope-badge ${view.visibilityScope}`}>
                    {view.visibilityScope === "shared" ? "shared" : "private"}
                  </span>
                  <button
                    className="rep-btn rep-btn-ghost"
                    disabled={isSavedViewSubmitting}
                    onClick={() => { onUpdateSavedView(view); }}
                    style={{ fontSize: "0.74rem", marginLeft: "auto" }}
                    type="button"
                  >
                    Overwrite
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

// ─────────────────────────────────────────────────────────────────────────
// Split create button
// ─────────────────────────────────────────────────────────────────────────

function SplitCreateButton({ onNewOpportunity, onNewAccount, onNewContact }: {
  onNewOpportunity: () => void;
  onNewAccount: () => void;
  onNewContact: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="rep-split-btn" ref={ref}>
      <button className="rep-split-main" onClick={() => { onNewOpportunity(); setOpen(false); }} type="button">
        New opportunity <span className="kbd">N</span>
      </button>
      <button aria-expanded={open} aria-label="More create options" className="rep-split-caret" onClick={() => setOpen((v) => !v)} type="button">▾</button>
      {open ? (
        <div className="rep-split-dropdown" role="menu">
          <div className="rep-split-dropdown-label">Create</div>
          <button className="rep-split-dropdown-item" onClick={() => { onNewAccount(); setOpen(false); }} role="menuitem" type="button">New Account</button>
          <button className="rep-split-dropdown-item" onClick={() => { onNewContact(); setOpen(false); }} role="menuitem" type="button">New Contact</button>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Simplified filter row: Search · Stage · Approval · Filters▾
// Account and Close date are in the Filters popover
// ─────────────────────────────────────────────────────────────────────────

function SimplifiedFiltersRow({
  accounts, approvalFilter, closeWindow, filters, hasActiveFilters,
  scopeLockLabel, showFiltersPopover, stages,
  onApprovalFilterChange, onCloseWindowChange, onFiltersChange, onResetFilters, onToggleFiltersPopover,
}: {
  accounts: AccountListItem[];
  approvalFilter: ApprovalFilter;
  closeWindow: CloseWindowFilter;
  filters: OpportunitySavedViewFilters;
  hasActiveFilters: boolean;
  scopeLockLabel: string;
  showFiltersPopover: boolean;
  stages: MetadataStageDefinitionItem[];
  onApprovalFilterChange: (v: ApprovalFilter) => void;
  onCloseWindowChange: (v: CloseWindowFilter) => void;
  onFiltersChange: (f: OpportunitySavedViewFilters) => void;
  onResetFilters: () => void;
  onToggleFiltersPopover: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!showFiltersPopover) return;
    function handler(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) onToggleFiltersPopover();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFiltersPopover, onToggleFiltersPopover]);

  const hasMoreFilters    = Boolean(filters.accountId || closeWindow);
  const moreFilterSummary = [filters.accountId && "Account", closeWindow && "Close date"].filter(Boolean).join(", ");

  return (
    <div>
      <div className="rep-filters-simple">
        <label className="rep-field rep-field-search">
          <svg aria-hidden="true" fill="none" height="12" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16" width="12">
            <circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" />
          </svg>
          <input
            onChange={(e) => onFiltersChange({ ...filters, query: e.target.value || undefined })}
            placeholder="Filter by title or account…"
            value={filters.query ?? ""}
          />
        </label>
        <label className="rep-field">
          <span className="rep-field-lbl">Stage</span>
          <select onChange={(e) => onFiltersChange({ ...filters, stageKey: e.target.value || undefined })} value={filters.stageKey ?? ""}>
            <option value="">All</option>
            {stages.map((s) => <option key={s.stageKey} value={s.stageKey}>{s.displayName}</option>)}
          </select>
        </label>
        <label className="rep-field">
          <span className="rep-field-lbl">Approval</span>
          <select onChange={(e) => onApprovalFilterChange(e.target.value as ApprovalFilter)} value={approvalFilter}>
            <option value="">Any</option>
            <option value="none">None</option>
            <option value="pending">Pending</option>
            <option value="sent_back">Sent back</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <div style={{ position: "relative" }}>
          <button
            ref={triggerRef}
            className={`rep-btn${hasMoreFilters ? " rep-btn-filters-active" : ""}`}
            onClick={onToggleFiltersPopover}
            type="button"
          >
            {hasMoreFilters ? `Filters · ${moreFilterSummary}` : "Filters ▾"}
          </button>
          {showFiltersPopover ? (
            <div className="rep-filters-popover" ref={popoverRef}>
              <div className="rep-filters-popover-head">
                <span>More filters</span>
                <button className="rep-btn rep-btn-ghost" onClick={onToggleFiltersPopover} type="button">✕</button>
              </div>
              <div className="rep-filters-popover-body">
                <div className="rep-filters-popover-field">
                  <label>Account</label>
                  <div className="rep-field">
                    <select onChange={(e) => onFiltersChange({ ...filters, accountId: e.target.value || undefined })} value={filters.accountId ?? ""}>
                      <option value="">All accounts</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="rep-filters-popover-field">
                  <label>Close date</label>
                  <div className="rep-field">
                    <select onChange={(e) => onCloseWindowChange(e.target.value as CloseWindowFilter)} value={closeWindow}>
                      <option value="">Any time</option>
                      <option value="30">≤ 30 days</option>
                      <option value="60">≤ 60 days</option>
                      <option value="90">≤ 90 days</option>
                      <option value="month">This month</option>
                    </select>
                  </div>
                </div>
                <div className="rep-filters-popover-field">
                  <label>Owner</label>
                  <div className="rep-field" style={{ background: "var(--paper-2)", color: "var(--muted)" }} title="Enforced by role policy">
                    <svg aria-hidden="true" fill="none" height="10" stroke="currentColor" strokeWidth="1.4" viewBox="0 0 12 12" width="10">
                      <rect height="5" rx="0.5" width="7" x="2.5" y="5.5" /><path d="M4 5.5V3.8a2 2 0 1 1 4 0V5.5" />
                    </svg>
                    <span style={{ fontSize: "0.78rem" }}>{scopeLockLabel} — locked by policy</span>
                  </div>
                </div>
              </div>
              <div className="rep-filters-popover-foot">
                <button className="rep-btn" onClick={() => { onFiltersChange({ ...filters, accountId: undefined }); onCloseWindowChange(""); }} type="button">Reset</button>
                {/* Filters apply immediately on change. "Done" closes the popover only. */}
                <button className="rep-btn rep-btn-primary" onClick={onToggleFiltersPopover} type="button">Done</button>
              </div>
            </div>
          ) : null}
        </div>
        <span className="rep-lock-chip" title="Visibility enforced by role and backend access policy">{scopeLockLabel}</span>
      </div>
      {hasActiveFilters ? (
        <div className="rep-filter-active">
          <span>Filters active</span>
          <button onClick={onResetFilters} type="button">Clear all</button>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Opportunity preview
// Removed from facts grid (already in selected table row): Amount, Close date
// Kept / added (new information): Owner, Primary contact, Activities
// Account shown once — in preview header as identity context
// ─────────────────────────────────────────────────────────────────────────

function OpportunityPreview({
  activities, activityTitle, customFields, isActivitySubmitting, isLoadingDetail,
  listItem, opportunity, stages, onActivityTitleChange, onClosePreview, onOpenDetail,
  onSubmitActivity, onSubmitApproval,
}: {
  activities: ActivityListItem[];
  activityTitle: string;
  customFields: MetadataFieldDefinitionItem[];
  isActivitySubmitting: boolean;
  isLoadingDetail: boolean;
  listItem: OpportunityListItem;
  opportunity: OpportunityDetail | null;
  stages: MetadataStageDefinitionItem[];
  onActivityTitleChange: (v: string) => void;
  onClosePreview: () => void;
  onOpenDetail: () => void;
  onSubmitActivity: () => void;
  onSubmitApproval: () => void;
}) {
  const approvalKey      = normalizeApproval(listItem.approvalState);
  const eligibleToSubmit = approvalKey === "none";

  return (
    <section className="rep-panel rep-preview">
      <div className="rep-preview-head">
        <div className="rep-preview-head-top">
          <div className="rep-preview-id"><span>OPPORTUNITY · {listItem.id}</span></div>
          <button aria-label="Close preview" className="rep-preview-close-btn" onClick={onClosePreview} type="button">✕</button>
        </div>
        <div className="rep-preview-title">{listItem.title}</div>
        {/* Account shown once — identity context, not repeated in facts grid */}
        <div className="rep-preview-acct">
          <span className="mono">{listItem.accountId}</span>
          <span style={{ color: "var(--line-2)" }}>·</span>
          <span>{listItem.accountName}</span>
        </div>
      </div>

      <div className={`rep-approval-state p-${approvalKey}`}>
        {approvalKey === "none" ? (
          <><span className="mono" style={{ fontSize: "0.66rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>Approval</span><span>No active request</span></>
        ) : (
          <><span className={`rep-pill p-${approvalKey}`}><span className="dot" />{listItem.approvalState.replace(/_/g, " ")}</span><span>Latest approval state</span></>
        )}
      </div>

      {/* Facts grid: only fields not already in the table */}
      <div className="rep-preview-grid">
        <div className="rep-pf" style={{ gridColumn: "1 / -1" }}>
          <div className="rep-pf-l">Owner</div>
          <div className="rep-pf-v" style={{ fontSize: "0.82rem" }}>{listItem.ownerName}</div>
        </div>
        {opportunity?.primaryContact ? (
          <div className="rep-pf" style={{ gridColumn: "1 / -1" }}>
            <div className="rep-pf-l">Primary contact</div>
            <div className="rep-pf-v" style={{ fontSize: "0.82rem" }}>{opportunity.primaryContact.fullName}</div>
          </div>
        ) : null}
        {customFields.slice(0, 3).map((field) => {
          const value = opportunity?.customFields[field.fieldKey];
          if (value === undefined || value === null || value === "") return null;
          return (
            <div className="rep-pf" key={field.id}>
              <div className="rep-pf-l">{field.label}</div>
              <div className="rep-pf-v" style={{ fontSize: "0.78rem" }}>{String(value)}</div>
            </div>
          );
        })}
      </div>

      <div className="rep-pf-block">
        <div className="rep-pf-block-title">
          <span>Next activity</span>
          <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--muted-2)" }}>{activities.length}</span>
        </div>
        {isLoadingDetail ? (
          <div className="rep-empty" style={{ padding: 16 }}>Loading…</div>
        ) : activities.length === 0 ? (
          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>No activities logged yet.</div>
        ) : (
          activities.slice(0, 3).map((a) => (
            <div className="rep-activity-row" key={a.id}>
              <div><strong>{a.title}</strong><span className="sub">{a.type} · {a.status}</span></div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{a.dueDate ?? "no date"}</div>
            </div>
          ))
        )}
        <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
          <input
            onChange={(e) => onActivityTitleChange(e.target.value)}
            placeholder="Quick add task…"
            style={{ flex: 1, padding: "7px 10px", fontSize: "0.82rem", border: "1px solid var(--line)", borderRadius: 3, background: "var(--white)", font: "inherit", color: "var(--ink)" }}
            value={activityTitle}
          />
          <button
            className={activityTitle.trim() ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
            disabled={isActivitySubmitting || !activityTitle.trim()}
            onClick={onSubmitActivity}
            type="button"
          >Add</button>
        </div>
      </div>

      <div className="rep-preview-actions">
        <button className="rep-btn rep-btn-ghost" onClick={onOpenDetail} type="button">Open detail ›</button>
        <div className="right">
          <button
            className={eligibleToSubmit ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
            disabled={!eligibleToSubmit}
            onClick={onSubmitApproval}
            title={eligibleToSubmit ? "Submit for approval" : "An active approval request already exists"}
            type="button"
          >Submit for approval</button>
        </div>
      </div>
    </section>
  );
}
