import { useEffect, useMemo, useState } from "react";
import type {
  ActivityListItem,
  CustomFieldValue,
  OpportunityDetail as OpportunityDetailType,
} from "../../types/crm";
import type {
  MetadataFieldDefinitionItem,
  MetadataStageDefinitionItem,
  MetadataStageRequiredFieldItem,
} from "../../types/metadata";
import type { CurrentUser } from "../../types/session";
import {
  REQUEST_TYPE_CATALOG,
  formatCustomFieldsForForm,
  isActivityCompleted,
  isActivityOverdue,
  isEmpty,
  normalizeApprovalState,
  parseCustomFields,
  parseTimeline,
} from "./OpportunityDetailSections";
import type {
  RequestTypeKey,
  SubmitPhase,
  Urgency,
  ValidatedState,
} from "./OpportunityDetailSections";

type UseOpportunityDetailControllerArgs = {
  fields: MetadataFieldDefinitionItem[];
  opportunity: OpportunityDetailType | null;
  stages: MetadataStageDefinitionItem[];
  onCreateActivity: (request: { dueDate?: string; title: string; type: string }) => void;
  onMoveStage: (targetStageKey: string) => void;
  onReassignOwner: (newOwnerId: string) => void;
  onSubmitApproval: (request: { businessJustification?: string; requestType?: string }) => void;
  onUpdateOpportunity: (request: {
    closeDate?: string;
    customFields?: Record<string, CustomFieldValue>;
    expectedAmount?: number;
    title?: string;
  }) => void;
};

export function useOpportunityDetailController({
  fields,
  opportunity,
  stages,
  onCreateActivity,
  onMoveStage,
  onReassignOwner,
  onSubmitApproval,
  onUpdateOpportunity,
}: UseOpportunityDetailControllerArgs) {
  // ── Edit-fields state ──────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftClose, setDraftClose] = useState("");
  const [draftCustom, setDraftCustom] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState<string | null>(null);

  // ── Stage move state ────────────────────────────────────────────────────
  const [stagePopKey, setStagePopKey] = useState<string | null>(null);

  // ── Activity composer ──────────────────────────────────────────────────
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerKind, setComposerKind] = useState("task");
  const [composerTitle, setComposerTitle] = useState("");
  const [composerDueDate, setComposerDueDate] = useState("");

  // ── Approval submit flow ────────────────────────────────────────────────
  const [submitFlowOpen, setSubmitFlowOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestTypeKey>("stage_progression");
  const [justification, setJustification] = useState("");
  const [customerImpact, setCustomerImpact] = useState("");
  const [competition, setCompetition] = useState("");
  const [supportingNotes, setSupportingNotes] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [validated, setValidated] = useState<ValidatedState>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("draft");

  // ── Manager reassign ────────────────────────────────────────────────────
  const [newOwnerId, setNewOwnerId] = useState("");

  // Reset drafts when opportunity changes
  useEffect(() => {
    setEditMode(false);
    setEditError(null);
    setStagePopKey(null);
    setComposerOpen(false);
    setComposerKind("task");
    setComposerTitle("");
    setComposerDueDate("");
    setNewOwnerId("");
    setSubmitFlowOpen(false);
    setRequestType("stage_progression");
    setJustification("");
    setCustomerImpact("");
    setCompetition("");
    setSupportingNotes("");
    setUrgency("normal");
    setValidated(null);
    setValidationErrors({});
    setSubmitPhase("draft");
    if (opportunity) {
      setDraftTitle(opportunity.title ?? "");
      setDraftAmount(opportunity.expectedAmount?.toString() ?? "");
      setDraftClose(opportunity.closeDate ?? "");
      setDraftCustom(formatCustomFieldsForForm(fields, opportunity.customFields));
    }
  }, [opportunity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep draftCustom in sync when fields are reloaded but opportunity id is stable
  useEffect(() => {
    if (opportunity && !editMode) {
      setDraftCustom(formatCustomFieldsForForm(fields, opportunity.customFields));
    }
  }, [fields, opportunity?.customFields, editMode, opportunity]);

  const stageOrder = useMemo(
    () => new Map(stages.map((stage, index) => [stage.stageKey, index])),
    [stages],
  );

  const currentStageIndex = opportunity ? stageOrder.get(opportunity.stageKey) ?? -1 : -1;

  // ── Handlers ────────────────────────────────────────────────────────────
  const startEditMode = () => {
    setDraftTitle(opportunity?.title ?? "");
    setDraftAmount(opportunity?.expectedAmount?.toString() ?? "");
    setDraftClose(opportunity?.closeDate ?? "");
    setDraftCustom(formatCustomFieldsForForm(fields, opportunity?.customFields ?? {}));
    setEditError(null);
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setEditError(null);
  };

  const saveEdits = () => {
    if (!draftTitle.trim()) {
      setEditError("Title is required");
      return;
    }
    let parsedAmount: number | undefined;
    if (draftAmount.trim()) {
      const value = Number(draftAmount);
      if (Number.isNaN(value)) {
        setEditError("Expected amount must be a number");
        return;
      }
      parsedAmount = value;
    }

    onUpdateOpportunity({
      closeDate: draftClose || undefined,
      customFields: parseCustomFields(fields, draftCustom),
      expectedAmount: parsedAmount,
      title: draftTitle.trim(),
    });
    setEditMode(false);
    setEditError(null);
  };

  const changeCustom = (fieldKey: string, value: string) => {
    setDraftCustom((current) => ({ ...current, [fieldKey]: value }));
  };

  const toggleAddActivity = () => setComposerOpen((value) => !value);

  const submitActivity = () => {
    const trimmed = composerTitle.trim();
    if (!trimmed) return;
    onCreateActivity({
      dueDate: composerDueDate || undefined,
      title: trimmed,
      type: composerKind,
    });
    setComposerOpen(false);
    setComposerKind("task");
    setComposerTitle("");
    setComposerDueDate("");
  };

  const handleStageClick = (stageKey: string) => {
    if (stageKey === opportunity?.stageKey) {
      setStagePopKey(stagePopKey === stageKey ? null : stageKey);
      return;
    }
    if (stagePopKey === stageKey) {
      setStagePopKey(null);
      return;
    }
    setStagePopKey(stageKey);
  };

  const confirmStageMove = (stageKey: string) => {
    onMoveStage(stageKey);
    setStagePopKey(null);
  };

  const moveStageHint = () => {
    const nextStage = stages[currentStageIndex + 1];
    if (nextStage) setStagePopKey(nextStage.stageKey);
  };

  const runValidation = (): boolean => {
    const errors: Record<string, string> = {};
    const selectedType = REQUEST_TYPE_CATALOG.find((type) => type.key === requestType);
    if (!selectedType?.supported) {
      errors.requestType = "This approval request type is planned but not supported by the local pilot backend yet.";
    }
    if (!justification.trim() || justification.trim().length < 40) {
      errors.justification =
        "Provide at least 40 characters of business justification — approvers cannot review an empty case.";
    }
    if (requestType !== "stage_progression") {
      if (!customerImpact.trim() || customerImpact.trim().length < 20) {
        errors.customerImpact =
          "Describe what happens to the customer relationship if the exception is not granted.";
      }
      if (!competition.trim() || competition.trim().length < 20) {
        errors.competition = "Name the competitor and the offer or pressure. ‘N/A’ is not accepted by policy.";
      }
    }
    setValidationErrors(errors);
    const ok = Object.keys(errors).length === 0;
    setValidated(ok ? "ok" : "err");
    setSubmitPhase(ok ? "validated" : "draft");
    return ok;
  };

  const submitApprovalRequest = () => {
    const ok = runValidation();
    if (!ok) return;
    const justificationParts = [
      justification.trim(),
      customerImpact.trim() ? `Customer impact: ${customerImpact.trim()}` : null,
      competition.trim() ? `Competitive situation: ${competition.trim()}` : null,
      supportingNotes.trim() ? `Notes: ${supportingNotes.trim()}` : null,
      `Urgency: ${urgency}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    onSubmitApproval({
      businessJustification: justificationParts || undefined,
      requestType,
    });
    setSubmitPhase("submitted");
  };

  const openSubmitFlow = () => {
    // The guided form opens in a right-side drawer (SubmitApprovalDrawer), so no
    // in-page scroll is needed anymore.
    setSubmitFlowOpen(true);
    setSubmitPhase("draft");
    setValidated(null);
    setValidationErrors({});
  };

  const cancelSubmitFlow = () => {
    setSubmitFlowOpen(false);
    setSubmitPhase("draft");
    setValidated(null);
    setValidationErrors({});
  };

  const changeRequestType = (value: RequestTypeKey) => {
    setRequestType(value);
    setValidated(null);
    setValidationErrors({});
    setSubmitPhase("draft");
  };

  const reassignOwner = () => {
    const trimmed = newOwnerId.trim();
    if (!trimmed) return;
    onReassignOwner(trimmed);
    setNewOwnerId("");
  };

  return {
    editMode,
    draftTitle,
    setDraftTitle,
    draftAmount,
    setDraftAmount,
    draftClose,
    setDraftClose,
    draftCustom,
    editError,
    stagePopKey,
    setStagePopKey,
    composerOpen,
    setComposerOpen,
    composerKind,
    setComposerKind,
    composerTitle,
    setComposerTitle,
    composerDueDate,
    setComposerDueDate,
    submitFlowOpen,
    requestType,
    justification,
    customerImpact,
    competition,
    supportingNotes,
    urgency,
    setUrgency,
    validated,
    validationErrors,
    submitPhase,
    newOwnerId,
    setNewOwnerId,
    startEditMode,
    cancelEditMode,
    saveEdits,
    changeCustom,
    toggleAddActivity,
    submitActivity,
    handleStageClick,
    confirmStageMove,
    moveStageHint,
    runValidation,
    submitApprovalRequest,
    openSubmitFlow,
    cancelSubmitFlow,
    changeRequestType,
    setJustification,
    setCustomerImpact,
    setCompetition,
    setSupportingNotes,
    reassignOwner,
  };
}

export function deriveOpportunityDetailView(
  opportunity: OpportunityDetailType,
  fields: MetadataFieldDefinitionItem[],
  stages: MetadataStageDefinitionItem[],
  activities: ActivityListItem[],
  stageRequiredFields: MetadataStageRequiredFieldItem[],
  currentUser: CurrentUser | undefined,
) {
  const approvalKey = normalizeApprovalState(opportunity.approvalState);
  const hasActiveApproval = approvalKey === "pending" || opportunity.activeApproval !== null;
  const eligibleToSubmit = approvalKey === "none" && opportunity.activeApproval === null;
  const stageLabel =
    stages.find((stage) => stage.stageKey === opportunity.stageKey)?.displayName ?? opportunity.stageKey;
  const standardFieldCount = 6; // Title, amount, close, stage, owner, primary contact
  const customFieldCount = fields.length;
  const overdueActivities = activities.filter(
    (activity) => isActivityOverdue(activity) && !isActivityCompleted(activity),
  );
  const upcomingActivities = activities.filter(
    (activity) => !isActivityOverdue(activity) && !isActivityCompleted(activity),
  );
  const completedActivities = activities.filter((activity) => isActivityCompleted(activity));
  const missingRequiredCustom = fields.filter((field) => {
    if (isEmpty(opportunity.customFields[field.fieldKey])) {
      // Globally required
      if (field.isRequiredDefault) return true;
      // Required by any stage rule for a future/next stage
      const currentIndex = stages.findIndex((s) => s.stageKey === opportunity.stageKey);
      return stageRequiredFields.some(
        (rule) =>
          rule.fieldKey === field.fieldKey &&
          stages.findIndex((s) => s.stageKey === rule.stageKey) > currentIndex,
      );
    }
    return false;
  });
  const timelineEvents = parseTimeline(opportunity.timeline);

  const roleKey = currentUser?.roleKey ?? "sales_rep";
  const canReassignOwner = roleKey === "sales_manager" || roleKey === "revops_admin";

  return {
    approvalKey,
    hasActiveApproval,
    eligibleToSubmit,
    stageLabel,
    standardFieldCount,
    customFieldCount,
    overdueActivities,
    upcomingActivities,
    completedActivities,
    missingRequiredCustom,
    timelineEvents,
    roleKey,
    canReassignOwner,
  };
}
