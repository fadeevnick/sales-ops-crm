import { useEffect, useMemo, useState } from "react";
import {
  approveApproval,
  fetchApprovalDetail,
  fetchApprovalInbox,
  rejectApproval,
  sendBackApproval,
} from "../../api/approvals";
import { describeRequestError } from "../../api/session";
import type { ApprovalDetailResponse, ApprovalInboxItem, ApprovalStepItem } from "../../types/approvals";
import type { CurrentUser } from "../../types/session";
import {
  SAVED_VIEWS,
  type DecisionKind,
  applyFilter,
  parseSnapshot,
  type SavedViewKey,
  type StatusFilter,
  viewCount,
} from "./ApproverInboxShared";

export function useApproverInboxController(currentUser: CurrentUser) {
  const [items, setItems] = useState<ApprovalInboxItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApprovalDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [view, setView] = useState<SavedViewKey>("mine_pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [typeFilter, setTypeFilter] = useState("");

  const [decisionKind, setDecisionKind] = useState<DecisionKind | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionTouched, setDecisionTouched] = useState(false);

  const loadInbox = async (preserveSelectionId: string | null = null) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetchApprovalInbox(currentUser.userId);
      setItems(response.items);
      if (preserveSelectionId) {
        setSelectedRequestId(preserveSelectionId);
      } else if (response.items.length > 0) {
        setSelectedRequestId((current) => current ?? response.items[0].id);
      } else {
        setSelectedRequestId(null);
      }
    } catch (error) {
      setItems([]);
      setSelectedRequestId(null);
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.userId]);

  useEffect(() => {
    if (!selectedRequestId) {
      setDetail(null);
      setDetailErrorMessage(null);
      return;
    }
    let cancelled = false;
    const loadDetail = async () => {
      setIsDetailLoading(true);
      setDetailErrorMessage(null);
      try {
        const response = await fetchApprovalDetail(currentUser.userId, selectedRequestId);
        if (!cancelled) setDetail(response);
      } catch (error) {
        if (!cancelled) {
          setDetail(null);
          setDetailErrorMessage(describeRequestError(error));
        }
      } finally {
        if (!cancelled) setIsDetailLoading(false);
      }
    };
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [currentUser.userId, selectedRequestId]);

  // KPIs over the entire inbox response
  const kpis = useMemo(() => {
    const isMine = (item: ApprovalInboxItem) => item.approverRoleKey === currentUser.roleKey;
    return {
      assignedToMe: items.filter((it) => isMine(it) && it.status === "pending_step").length,
      awaitingOther: items.filter((it) => !isMine(it) && it.status === "pending_step").length,
      sentBack: items.filter((it) => it.status === "sent_back").length,
      decided: items.filter((it) => it.status === "approved" || it.status === "rejected").length,
      total: items.length,
    };
  }, [items, currentUser.roleKey]);

  const viewCounts = useMemo(() => {
    const counts = {} as Record<SavedViewKey, number>;
    for (const v of SAVED_VIEWS) {
      counts[v.key] = viewCount(items, v.key, currentUser.roleKey);
    }
    return counts;
  }, [items, currentUser.roleKey]);

  const requestTypes = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (it.requestType) set.add(it.requestType);
    }
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (!applyFilter(item, view, currentUser.roleKey)) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (typeFilter && item.requestType !== typeFilter) return false;
      if (q) {
        const haystack = [
          item.id,
          item.opportunityId,
          item.opportunityTitle,
          item.accountName,
          item.submittedByName,
          item.requestType,
          item.policyKey,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, view, statusFilter, typeFilter, searchQuery, currentUser.roleKey]);

  // Keep selection inside the filtered set when possible
  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedRequestId(null);
      return;
    }
    if (selectedRequestId && filteredItems.some((it) => it.id === selectedRequestId)) return;
    setSelectedRequestId(filteredItems[0].id);
  }, [filteredItems, selectedRequestId]);

  const activeStep: ApprovalStepItem | null = detail?.steps.find((step) => step.status === "active") ?? null;
  const isMineActive =
    !!detail && detail.status === "pending_step" && activeStep?.approverRoleKey === currentUser.roleKey;
  const isLockedForMe =
    !!detail &&
    detail.status === "pending_step" &&
    !!activeStep &&
    activeStep.approverRoleKey !== currentUser.roleKey;
  const isDecided = detail?.status === "approved" || detail?.status === "rejected";

  const flashToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 3200);
  };

  const openDecision = (kind: DecisionKind) => {
    if (!isMineActive || isDeciding) return;
    setDecisionKind(kind);
    setDecisionComment("");
    setDecisionTouched(false);
  };

  const closeDecision = () => {
    if (isDeciding) return;
    setDecisionKind(null);
    setDecisionComment("");
    setDecisionTouched(false);
  };

  const submitDecision = async () => {
    if (!detail || !decisionKind) return;
    const trimmed = decisionComment.trim();
    setDecisionTouched(true);
    if (trimmed.length < 10) return;
    const request = { comment: trimmed };
    try {
      setIsDeciding(true);
      setDetailErrorMessage(null);
      if (decisionKind === "approve") {
        await approveApproval(currentUser.userId, detail.id, request);
        flashToast(`Approved ${detail.id}`);
      } else if (decisionKind === "reject") {
        await rejectApproval(currentUser.userId, detail.id, request);
        flashToast(`Rejected ${detail.id} · decision is immutable`);
      } else {
        await sendBackApproval(currentUser.userId, detail.id, request);
        flashToast(`Sent back ${detail.id} · owner notified`);
      }
      const refreshed = await fetchApprovalDetail(currentUser.userId, detail.id);
      setDetail(refreshed);
      await loadInbox(detail.id);
      setDecisionKind(null);
      setDecisionComment("");
      setDecisionTouched(false);
    } catch (error) {
      setDetailErrorMessage(describeRequestError(error));
    } finally {
      setIsDeciding(false);
    }
  };

  const selectedItem = filteredItems.find((it) => it.id === selectedRequestId) ?? null;
  const snapshot = parseSnapshot(detail?.opportunitySnapshotJson);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setTypeFilter("");
  };

  const filtersActive = !!searchQuery || !!statusFilter || !!typeFilter;

  return {
    items,
    selectedRequestId,
    setSelectedRequestId,
    detail,
    isLoading,
    isDetailLoading,
    isDeciding,
    errorMessage,
    detailErrorMessage,
    toast,
    view,
    setView,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    decisionKind,
    decisionComment,
    setDecisionComment,
    decisionTouched,
    setDecisionTouched,
    loadInbox,
    kpis,
    viewCounts,
    requestTypes,
    filteredItems,
    activeStep,
    isMineActive,
    isLockedForMe,
    isDecided,
    openDecision,
    closeDecision,
    submitDecision,
    selectedItem,
    snapshot,
    resetFilters,
    filtersActive,
  };
}
