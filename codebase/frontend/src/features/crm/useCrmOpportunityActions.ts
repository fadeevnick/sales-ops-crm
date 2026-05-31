import { useState } from "react";
import { createActivity } from "../../api/activities";
import { submitApproval } from "../../api/approvals";
import {
  moveOpportunityStage,
  reassignOpportunityOwner,
  updateOpportunity,
} from "../../api/opportunities";
import { describeRequestError } from "../../api/session";
import type { CustomFieldValue, OpportunityListItem } from "../../types/crm";
import type { CurrentUser } from "../../types/session";

type UseCrmOpportunityActionsArgs = {
  currentUser: CurrentUser;
  selectedOpportunityId: string | null;
  refreshSelectedOpportunity: (opportunityId?: string) => Promise<void>;
  refreshSelectedOpportunityActivities: (opportunityId?: string) => Promise<void>;
  setSelectedOpportunityId: (id: string | null) => void;
  setErrorMessage: (message: string | null) => void;
  flashToast: (text: string) => void;
};

export function useCrmOpportunityActions({
  currentUser,
  selectedOpportunityId,
  refreshSelectedOpportunity,
  refreshSelectedOpportunityActivities,
  setSelectedOpportunityId,
  setErrorMessage,
  flashToast,
}: UseCrmOpportunityActionsArgs) {
  const [submitModalOpp, setSubmitModalOpp] = useState<OpportunityListItem | null>(null);
  const [submitJustification, setSubmitJustification] = useState("");
  const [activityTitle, setActivityTitle] = useState("");
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [isApprovalSubmitting, setIsApprovalSubmitting] = useState(false);
  const [isActivitySubmitting, setIsActivitySubmitting] = useState(false);

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
      () => moveOpportunityStage(currentUser.userId, selectedOpportunityId, { targetStageKey }).then(() => undefined),
      "Opportunity stage moved",
    );
  };

  const handleReassignOwner = async (newOwnerId: string) => {
    if (!selectedOpportunityId) return;
    await runOpportunityAction(
      () => reassignOpportunityOwner(currentUser.userId, selectedOpportunityId, { newOwnerId }).then(() => undefined),
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
      await refreshSelectedOpportunityActivities(selectedOpportunityId);
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

  return {
    activityTitle,
    isActionSubmitting,
    isActivitySubmitting,
    isApprovalSubmitting,
    submitJustification,
    submitModalOpp,
    setActivityTitle,
    setSubmitJustification,
    setSubmitModalOpp,
    handleCreateActivity,
    handleMoveStage,
    handleReassignOwner,
    handleSubmitApproval,
    handleSubmitApprovalFromDetail,
    handleUpdateOpportunity,
    submitInlineActivity,
  };
}
