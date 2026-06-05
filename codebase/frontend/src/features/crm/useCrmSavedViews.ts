import { useState } from "react";
import {
  createSavedOpportunityView,
  deleteSavedOpportunityView,
  fetchSavedOpportunityViews,
  updateSavedOpportunityView,
} from "../../api/savedViews";
import { describeRequestError } from "../../api/session";
import type {
  OpportunitySavedViewFilters,
  SavedOpportunityViewItem,
} from "../../types/crm";
import type { CurrentUser } from "../../types/session";
import type { ApprovalFilter, CloseWindowFilter } from "./useCrmWorkspaceController";

type UseCrmSavedViewsArgs = {
  currentUser: CurrentUser;
  activeFilters: OpportunitySavedViewFilters;
  canCreateSharedViews: boolean;
  setSavedViews: (views: SavedOpportunityViewItem[]) => void;
  setActiveFilters: (filters: OpportunitySavedViewFilters) => void;
  setCloseWindow: (value: CloseWindowFilter) => void;
  setApprovalFilter: (value: ApprovalFilter) => void;
  setErrorMessage: (message: string | null) => void;
  flashToast: (text: string) => void;
};

export function useCrmSavedViews({
  currentUser,
  activeFilters,
  canCreateSharedViews,
  setSavedViews,
  setActiveFilters,
  setCloseWindow,
  setApprovalFilter,
  setErrorMessage,
  flashToast,
}: UseCrmSavedViewsArgs) {
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const [savedViewFormOpen, setSavedViewFormOpen] = useState(false);
  const [savedViewName, setSavedViewName] = useState("");
  const [savedViewVisibilityScope, setSavedViewVisibilityScope] = useState<"private" | "shared">("private");
  const [isSavedViewSubmitting, setIsSavedViewSubmitting] = useState(false);

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

  return {
    activeSavedViewId,
    isSavedViewSubmitting,
    savedViewFormOpen,
    savedViewName,
    savedViewVisibilityScope,
    setActiveSavedViewId,
    setSavedViewFormOpen,
    setSavedViewName,
    setSavedViewVisibilityScope,
    handleApplySavedView,
    handleCreateSavedView,
    handleDeleteSavedView,
    handleUpdateSavedView,
  };
}
