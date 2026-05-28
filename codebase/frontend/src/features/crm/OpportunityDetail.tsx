import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ActivityListItem,
  CustomFieldValue,
  OpportunityDetail as OpportunityDetailType,
} from "../../types/crm";
import type { MetadataFieldDefinitionItem, MetadataStageDefinitionItem } from "../../types/metadata";
import type { CurrentUser } from "../../types/session";

type Urgency = "routine" | "normal" | "high" | "critical";
type RequestTypeKey = "stage_progression" | "discount_exception" | "terms_exception";
type SubmitPhase = "draft" | "validated" | "submitted";
type ValidatedState = null | "ok" | "err";

type OpportunityDetailProps = {
  activities: ActivityListItem[];
  fields: MetadataFieldDefinitionItem[];
  opportunity: OpportunityDetailType | null;
  stages: MetadataStageDefinitionItem[];
  isLoading: boolean;
  isActionSubmitting: boolean;
  isApprovalSubmitting: boolean;
  isActivitySubmitting: boolean;
  currentUser?: CurrentUser;
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

const REQUEST_TYPE_CATALOG: {
  key: RequestTypeKey;
  code: string;
  name: string;
  description: string;
  supported: boolean;
}[] = [
  {
    key: "stage_progression",
    code: "STAGE-A",
    name: "Stage progression",
    description: "Promote the opportunity past a stage that policy gates behind approval.",
    supported: true,
  },
  {
    key: "discount_exception",
    code: "DISCOUNT-A",
    name: "Discount exception",
    description: "Planned policy path. The current local pilot backend accepts stage progression only.",
    supported: false,
  },
  {
    key: "terms_exception",
    code: "TERMS-A",
    name: "Terms / NET-X exception",
    description: "Planned policy path. The current local pilot backend accepts stage progression only.",
    supported: false,
  },
];

const URGENCY_OPTIONS: { key: Urgency; name: string; sla: string }[] = [
  { key: "routine", name: "Routine", sla: "≥ 7d" },
  { key: "normal", name: "Normal", sla: "3–5d" },
  { key: "high", name: "High", sla: "48h" },
  { key: "critical", name: "Critical", sla: "24h" },
];

export function OpportunityDetail({
  activities,
  fields,
  opportunity,
  stages,
  isActionSubmitting,
  isApprovalSubmitting,
  isActivitySubmitting,
  isLoading,
  currentUser,
  onCreateActivity,
  onMoveStage,
  onReassignOwner,
  onSubmitApproval,
  onUpdateOpportunity,
}: OpportunityDetailProps) {
  const approvalPanelRef = useRef<HTMLDivElement | null>(null);

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

  if (isLoading) {
    return (
      <section className="opp-detail">
        <div className="rep-empty">Loading opportunity…</div>
      </section>
    );
  }

  if (!opportunity) {
    return (
      <section className="opp-detail">
        <div className="rep-empty">
          <div className="ttl">No opportunity selected</div>
          <div>Pick an opportunity from the list to inspect its detail.</div>
        </div>
      </section>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────
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
  const missingRequiredCustom = fields.filter(
    (field) =>
      field.isRequiredDefault &&
      isEmpty(opportunity.customFields[field.fieldKey]),
  );
  const timelineEvents = parseTimeline(opportunity.timeline);

  const roleKey = currentUser?.roleKey ?? "sales_rep";
  const canReassignOwner = roleKey === "sales_manager" || roleKey === "revops_admin";

  // ── Handlers ────────────────────────────────────────────────────────────
  const startEditMode = () => {
    setDraftTitle(opportunity.title ?? "");
    setDraftAmount(opportunity.expectedAmount?.toString() ?? "");
    setDraftClose(opportunity.closeDate ?? "");
    setDraftCustom(formatCustomFieldsForForm(fields, opportunity.customFields));
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
    if (stageKey === opportunity.stageKey) {
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
    setSubmitFlowOpen(true);
    setSubmitPhase("draft");
    setValidated(null);
    setValidationErrors({});
    window.requestAnimationFrame(() => {
      approvalPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <section className="opp-detail" data-screen-label="Opportunity Detail">
      <OpportunityHeader
        eligibleToSubmit={eligibleToSubmit}
        hasActiveApproval={hasActiveApproval}
        opportunity={opportunity}
        stageLabel={stageLabel}
        onEdit={startEditMode}
        onMoveStageHint={() => {
          const nextStage = stages[currentStageIndex + 1];
          if (nextStage) setStagePopKey(nextStage.stageKey);
        }}
        onSubmitApproval={openSubmitFlow}
        onToggleAddActivity={() => setComposerOpen((value) => !value)}
      />

      <StatesStrip
        eligibleToSubmit={eligibleToSubmit}
        hasActiveApproval={hasActiveApproval}
        missingRequiredCustom={missingRequiredCustom}
        opportunity={opportunity}
        overdueCount={overdueActivities.length}
        roleKey={roleKey}
      />

      <StagePath
        approvalKey={approvalKey}
        currentStageKey={opportunity.stageKey}
        isActionSubmitting={isActionSubmitting}
        missingRequiredCustom={missingRequiredCustom}
        popKey={stagePopKey}
        stages={stages}
        onClickStage={handleStageClick}
        onConfirmMove={confirmStageMove}
        onClosePop={() => setStagePopKey(null)}
      />

      <div className="opp-work">
        <div>
          <DealFields
            customFields={fields}
            draftAmount={draftAmount}
            draftClose={draftClose}
            draftCustom={draftCustom}
            draftTitle={draftTitle}
            editError={editError}
            editMode={editMode}
            isActionSubmitting={isActionSubmitting}
            opportunity={opportunity}
            stageLabel={stageLabel}
            standardFieldCount={standardFieldCount}
            customFieldCount={customFieldCount}
            onCancel={cancelEditMode}
            onChangeAmount={setDraftAmount}
            onChangeClose={setDraftClose}
            onChangeCustom={(fieldKey, value) =>
              setDraftCustom((current) => ({ ...current, [fieldKey]: value }))
            }
            onChangeTitle={setDraftTitle}
            onEdit={startEditMode}
            onSave={saveEdits}
          />

          <ActivitiesPanel
            activities={activities}
            composerDueDate={composerDueDate}
            composerKind={composerKind}
            composerOpen={composerOpen}
            composerTitle={composerTitle}
            completedActivities={completedActivities}
            isActivitySubmitting={isActivitySubmitting}
            opportunity={opportunity}
            overdueActivities={overdueActivities}
            upcomingActivities={upcomingActivities}
            onChangeComposerDueDate={setComposerDueDate}
            onChangeComposerKind={setComposerKind}
            onChangeComposerTitle={setComposerTitle}
            onCloseComposer={() => setComposerOpen(false)}
            onOpenComposer={() => setComposerOpen(true)}
            onSubmitActivity={submitActivity}
          />

          <div ref={approvalPanelRef}>
            <ApprovalPanel
              approvalKey={approvalKey}
              eligibleToSubmit={eligibleToSubmit}
              isApprovalSubmitting={isApprovalSubmitting}
              opportunity={opportunity}
              requestType={requestType}
              stageLabel={stageLabel}
              submitFlowOpen={submitFlowOpen}
              submitPhase={submitPhase}
              urgency={urgency}
              justification={justification}
              customerImpact={customerImpact}
              competition={competition}
              supportingNotes={supportingNotes}
              validated={validated}
              validationErrors={validationErrors}
              onCancelFlow={() => {
                setSubmitFlowOpen(false);
                setSubmitPhase("draft");
                setValidated(null);
                setValidationErrors({});
              }}
              onChangeCompetition={setCompetition}
              onChangeCustomerImpact={setCustomerImpact}
              onChangeJustification={setJustification}
              onChangeRequestType={(value) => {
                setRequestType(value);
                setValidated(null);
                setValidationErrors({});
                setSubmitPhase("draft");
              }}
              onChangeSupportingNotes={setSupportingNotes}
              onChangeUrgency={setUrgency}
              onOpenFlow={openSubmitFlow}
              onSubmit={submitApprovalRequest}
              onValidate={runValidation}
            />
          </div>

          <AuditTimeline events={timelineEvents} />
        </div>

        <div>
          <AccountContactPanel opportunity={opportunity} />
          <ManagerPanel
            canReassignOwner={canReassignOwner}
            isActionSubmitting={isActionSubmitting}
            newOwnerId={newOwnerId}
            roleKey={roleKey}
            onChangeNewOwnerId={setNewOwnerId}
            onReassign={() => {
              const trimmed = newOwnerId.trim();
              if (!trimmed) return;
              onReassignOwner(trimmed);
              setNewOwnerId("");
            }}
          />
        </div>
      </div>

      <div className="rep-foot-ruler">
        <span>
          SALES OPS CRM · {currentUser?.tenantName?.toUpperCase() ?? "LOCAL PILOT"} · LOCAL PILOT
        </span>
        <span>
          {opportunity.id} · OWNER {opportunity.owner.displayName.toUpperCase()} · ROLE {roleKey.toUpperCase()}
        </span>
        <span>METADATA · {fields.length} CUSTOM FIELDS · {stages.length} STAGES</span>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────

function OpportunityHeader({
  eligibleToSubmit,
  hasActiveApproval,
  opportunity,
  stageLabel,
  onEdit,
  onMoveStageHint,
  onSubmitApproval,
  onToggleAddActivity,
}: {
  eligibleToSubmit: boolean;
  hasActiveApproval: boolean;
  opportunity: OpportunityDetailType;
  stageLabel: string;
  onEdit: () => void;
  onMoveStageHint: () => void;
  onSubmitApproval: () => void;
  onToggleAddActivity: () => void;
}) {
  const approvalKey = normalizeApprovalState(opportunity.approvalState);
  return (
    <section className="opp-head">
      <div>
        <div className="opp-head-title-row">
          <span className="opp-kind">Opportunity</span>
          <h1 className="opp-title">{opportunity.title}</h1>
          <span className="opp-id">{opportunity.id}</span>
          <span className="rep-pill">
            <span className="dot" />
            Stage · {stageLabel}
          </span>
          {approvalKey === "none" ? null : (
            <span className={`rep-pill p-${approvalKey}`}>
              <span className="dot" />
              Approval · {opportunity.approvalState.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <div className="opp-meta">
          <span>Owner</span>
          <span>{opportunity.owner.displayName}</span>
          <span className="sep">·</span>
          <span>Account</span>
          <span>{opportunity.account.name}</span>
          {opportunity.primaryContact ? (
            <>
              <span className="sep">·</span>
              <span>Primary contact</span>
              <span>{opportunity.primaryContact.fullName}</span>
            </>
          ) : null}
        </div>

        <div className="opp-facts">
          <div className="opp-fact">
            <div className="l">Account</div>
            <div className="v">
              {opportunity.account.name}
              <small>· {opportunity.account.id}</small>
            </div>
          </div>
          <div className="opp-fact">
            <div className="l">Primary contact</div>
            <div className="v">
              {opportunity.primaryContact?.fullName ?? "None"}
            </div>
          </div>
          <div className="opp-fact">
            <div className="l">Owner</div>
            <div className="v">{opportunity.owner.displayName}</div>
          </div>
          <div className="opp-fact">
            <div className="l">Amount</div>
            <div className="v num">{formatCurrency(opportunity.expectedAmount)}</div>
          </div>
          <div className="opp-fact">
            <div className="l">Close date</div>
            <div className="v">
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.82rem" }}>
                {opportunity.closeDate ?? "—"}
              </span>
              {opportunity.closeDate ? (
                <small>· {daysUntil(opportunity.closeDate)}</small>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="opp-aside">
        <div className="opp-actions">
          <button className="rep-btn" onClick={onEdit} type="button">
            Edit fields
          </button>
          <button className="rep-btn" onClick={onMoveStageHint} type="button">
            Move stage
          </button>
          <button className="rep-btn" onClick={onToggleAddActivity} type="button">
            + Add activity
          </button>
          {hasActiveApproval ? (
            <button
              aria-disabled="true"
              className="rep-btn rep-btn-disabled"
              disabled
              title="An active approval request already exists for this opportunity"
              type="button"
            >
              Submit for approval
            </button>
          ) : (
            <button
              className={eligibleToSubmit ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
              disabled={!eligibleToSubmit}
              onClick={onSubmitApproval}
              type="button"
            >
              Submit for approval
            </button>
          )}
        </div>
        <div className="opp-meta" style={{ justifyContent: "flex-end" }}>
          <span>{opportunity.id}</span>
          <span className="sep">·</span>
          <span>LOCAL PILOT</span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// States strip
// ─────────────────────────────────────────────────────────────────────────

function StatesStrip({
  eligibleToSubmit,
  hasActiveApproval,
  missingRequiredCustom,
  opportunity,
  overdueCount,
  roleKey,
}: {
  eligibleToSubmit: boolean;
  hasActiveApproval: boolean;
  missingRequiredCustom: MetadataFieldDefinitionItem[];
  opportunity: OpportunityDetailType;
  overdueCount: number;
  roleKey: string;
}) {
  const approvalKey = normalizeApprovalState(opportunity.approvalState);
  const approvalTone: string =
    approvalKey === "pending" || approvalKey === "sent_back"
      ? "warn"
      : approvalKey === "rejected"
        ? "neg"
        : approvalKey === "approved"
          ? "ok"
          : "";
  const stageBlocked = missingRequiredCustom.length > 0 || hasActiveApproval;

  return (
    <div className="opp-states">
      <div className={`opp-state-tile ${approvalTone}`}>
        <div className="l">
          Approval{" "}
          {approvalKey === "none" ? (
            <span style={{ fontFamily: "ui-monospace, monospace" }}>—</span>
          ) : (
            <span className={`rep-pill p-${approvalKey}`}>
              <span className="dot" />
              {opportunity.approvalState.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <div className="v">
          {approvalKey === "none"
            ? eligibleToSubmit
              ? "Eligible to submit"
              : "No active request"
            : approvalKey === "pending"
              ? "Review in progress"
              : approvalKey === "sent_back"
                ? "Sent back to owner"
                : approvalKey === "approved"
                  ? "Approved"
                  : "Rejected"}
        </div>
        <div className="s">{opportunity.id}</div>
      </div>
      <div className={`opp-state-tile ${stageBlocked ? "warn" : "ok"}`}>
        <div className="l">
          Stage move{" "}
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              color: stageBlocked ? "#9a3a2f" : "var(--pos)",
            }}
          >
            {stageBlocked ? "BLOCKED" : "READY"}
          </span>
        </div>
        <div className="v">
          {stageBlocked
            ? "Cannot promote to next stage"
            : "Promotion validations pass"}
        </div>
        <div className="s">
          {missingRequiredCustom.length > 0
            ? `Required: ${missingRequiredCustom.map((f) => f.fieldKey).join(", ")}`
            : hasActiveApproval
              ? "Waiting on active approval decision"
              : "—"}
        </div>
      </div>
      <div className={`opp-state-tile ${overdueCount > 0 ? "neg" : ""}`}>
        <div className="l">
          Activity{" "}
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              color: overdueCount > 0 ? "#9a3a2f" : "var(--muted)",
            }}
          >
            {overdueCount > 0 ? "OVERDUE" : "—"}
          </span>
        </div>
        <div className="v">
          {overdueCount > 0
            ? `${overdueCount} task${overdueCount === 1 ? "" : "s"} overdue`
            : "All caught up"}
        </div>
        <div className="s">Linked to {opportunity.id}</div>
      </div>
      <div className="opp-state-tile">
        <div className="l">
          Permissions <span style={{ fontFamily: "ui-monospace, monospace" }}>{roleKey.toUpperCase()}</span>
        </div>
        <div className="v">
          {roleKey === "sales_rep"
            ? "Manager actions restricted"
            : roleKey === "sales_manager"
              ? "Manager actions enabled"
              : roleKey === "revops_admin"
                ? "Admin actions enabled"
                : "Read-visible only"}
        </div>
        <div className="s">
          {roleKey === "sales_rep" ? "Reassign owner / manager note locked" : "Reassign owner unlocked"}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Stage path
// ─────────────────────────────────────────────────────────────────────────

function StagePath({
  approvalKey,
  currentStageKey,
  isActionSubmitting,
  missingRequiredCustom,
  popKey,
  stages,
  onClickStage,
  onClosePop,
  onConfirmMove,
}: {
  approvalKey: string;
  currentStageKey: string;
  isActionSubmitting: boolean;
  missingRequiredCustom: MetadataFieldDefinitionItem[];
  popKey: string | null;
  stages: MetadataStageDefinitionItem[];
  onClickStage: (stageKey: string) => void;
  onClosePop: () => void;
  onConfirmMove: (stageKey: string) => void;
}) {
  const currentIndex = stages.findIndex((s) => s.stageKey === currentStageKey);
  const targetStage = popKey ? stages.find((s) => s.stageKey === popKey) : null;
  const targetIndex = targetStage ? stages.indexOf(targetStage) : -1;

  let popTone: "ok" | "warn" | "blocked" = "ok";
  let popMark = "•";
  let popTitle = "OK to move";
  let popDescription = "";
  let popList: string[] = [];
  let popAction: { label: string; tone: "primary" | "warn"; stageKey: string } | null = null;

  if (targetStage) {
    if (targetStage.stageKey === currentStageKey) {
      popTone = "ok";
      popMark = "•";
      popTitle = `Currently in ${targetStage.displayName}`;
      popDescription = "This is the active stage. No move needed.";
    } else if (targetIndex < currentIndex) {
      popTone = "warn";
      popMark = "↺";
      popTitle = `Move backward to ${targetStage.displayName}?`;
      popDescription = "Reverting to an earlier stage is allowed but will be audit-logged.";
      popList = ["Active approval requests may be auto-cancelled by policy."];
      popAction = { label: "Move backward", tone: "warn", stageKey: targetStage.stageKey };
    } else if (targetIndex > currentIndex + 1) {
      popTone = "blocked";
      popMark = "!";
      popTitle = `Cannot skip to ${targetStage.displayName}`;
      popDescription = "Stages must be promoted one at a time. Move through the next stage first.";
    } else if (targetStage.stageKey === "pending_approval") {
      popTone = "blocked";
      popMark = "!";
      popTitle = `Move to ${targetStage.displayName} requires approval`;
      popDescription =
        "The local pilot backend blocks direct movement into Pending Approval. Submit an approval request instead.";
      popList = ["Use the Approval request panel to route the opportunity through Finance / Legal."];
    } else if (approvalKey === "pending") {
      popTone = "blocked";
      popMark = "!";
      popTitle = `Move to ${targetStage.displayName} is blocked`;
      popDescription = "Backend policy blocks stage movement while an approval request is pending.";
    } else if (approvalKey === "rejected") {
      popTone = "blocked";
      popMark = "!";
      popTitle = `Move to ${targetStage.displayName} is blocked`;
      popDescription = "Backend policy blocks stage movement after rejection until the approval workflow is resolved.";
    } else if (missingRequiredCustom.length > 0) {
      popTone = "blocked";
      popMark = "!";
      popTitle = `Move to ${targetStage.displayName} is blocked`;
      popDescription = "Tenant policy requires the following before this stage transition can be saved:";
      popList = missingRequiredCustom.map(
        (field) => `Custom field ${field.fieldKey} is empty — required at later stage.`,
      );
    } else {
      popTone = "ok";
      popMark = "✓";
      popTitle = `Promote to ${targetStage.displayName}`;
      popDescription = "Validations passed. Promoting saves the new stage and writes an audit event.";
      popAction = { label: `Move to ${targetStage.displayName}`, tone: "primary", stageKey: targetStage.stageKey };
    }
  }

  return (
    <section className="opp-stages-panel">
      <div className="opp-stages-head">
        <div className="opp-stages-title">
          Pipeline stage <em>{stages.length} stages · tenant pipeline</em>
        </div>
        <div className="opp-stages-meta">
          <span>CURRENT · {stages[currentIndex]?.displayName?.toUpperCase() ?? "—"}</span>
        </div>
      </div>
      <div
        className="opp-stages"
        style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
      >
        {stages.map((stage, index) => {
          const cellState =
            stage.stageKey === currentStageKey
              ? "current"
              : stage.isClosed && index < currentIndex
                ? "done"
                : stage.isClosed
                  ? "closed"
                  : index < currentIndex
                    ? "done"
                    : "future";
          return (
            <button
              className={`opp-stage-cell ${cellState}`}
              key={stage.stageKey}
              onClick={() => onClickStage(stage.stageKey)}
              type="button"
            >
              <div className="opp-stage-num">
                {String(index + 1).padStart(2, "0")} · {stage.stageKey}
              </div>
              <div className="opp-stage-label">{stage.displayName}</div>
              <div className="opp-stage-foot">
                {cellState === "current"
                  ? "active"
                  : cellState === "done"
                    ? "✓ done"
                    : cellState === "closed"
                      ? "terminal"
                      : "—"}
              </div>
            </button>
          );
        })}
      </div>
      {targetStage ? (
        <div className={`opp-stagepop ${popTone}`} role="dialog" aria-label="Stage move validation">
          <div className="opp-stagepop-mark">{popMark}</div>
          <div>
            <div className="opp-stagepop-title">
              {popTitle}
              <small>
                {String(targetIndex + 1).padStart(2, "0")} · {targetStage.displayName}
              </small>
            </div>
            <div className="opp-stagepop-desc">{popDescription}</div>
            {popList.length > 0 ? (
              <ul className="opp-stagepop-list">
                {popList.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="opp-stagepop-actions">
            {popAction ? (
              <button
                className={
                  popAction.tone === "primary" ? "rep-btn rep-btn-primary" : "rep-btn"
                }
                disabled={isActionSubmitting}
                onClick={() => onConfirmMove(popAction.stageKey)}
                type="button"
              >
                {popAction.label}
              </button>
            ) : null}
            <button className="rep-btn" onClick={onClosePop} type="button">
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Deal fields
// ─────────────────────────────────────────────────────────────────────────

function DealFields({
  customFieldCount,
  customFields,
  draftAmount,
  draftClose,
  draftCustom,
  draftTitle,
  editError,
  editMode,
  isActionSubmitting,
  opportunity,
  stageLabel,
  standardFieldCount,
  onCancel,
  onChangeAmount,
  onChangeClose,
  onChangeCustom,
  onChangeTitle,
  onEdit,
  onSave,
}: {
  customFieldCount: number;
  customFields: MetadataFieldDefinitionItem[];
  draftAmount: string;
  draftClose: string;
  draftCustom: Record<string, string>;
  draftTitle: string;
  editError: string | null;
  editMode: boolean;
  isActionSubmitting: boolean;
  opportunity: OpportunityDetailType;
  stageLabel: string;
  standardFieldCount: number;
  onCancel: () => void;
  onChangeAmount: (value: string) => void;
  onChangeClose: (value: string) => void;
  onChangeCustom: (fieldKey: string, value: string) => void;
  onChangeTitle: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
}) {
  return (
    <section className="opp-panel">
      <div className="opp-panel-head">
        <div className="opp-panel-title">
          Deal fields <em>{standardFieldCount} standard · {customFieldCount} tenant custom</em>
        </div>
        <div className="opp-panel-actions">
          {editMode ? (
            <>
              <button className="rep-btn" onClick={onCancel} type="button">
                Cancel
              </button>
              <button
                className="rep-btn rep-btn-primary"
                disabled={isActionSubmitting}
                onClick={onSave}
                type="button"
              >
                Save changes
              </button>
            </>
          ) : (
            <button className="rep-btn" onClick={onEdit} type="button">
              Edit fields ›
            </button>
          )}
        </div>
      </div>

      <div className="opp-section-sub">
        Standard fields <span>{standardFieldCount}</span>
      </div>

      <div className="opp-fields">
        <FieldRow editing={editMode} label="Title">
          {editMode ? (
            <input
              className="opp-field-input"
              onChange={(event) => onChangeTitle(event.target.value)}
              value={draftTitle}
            />
          ) : (
            <span style={{ fontFamily: "inherit" }}>{opportunity.title}</span>
          )}
        </FieldRow>
        <FieldRow editing={editMode} label="Expected amount">
          {editMode ? (
            <input
              className="opp-field-input"
              inputMode="decimal"
              onChange={(event) => onChangeAmount(event.target.value)}
              value={draftAmount}
            />
          ) : (
            <>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.92rem" }}>
                {formatCurrency(opportunity.expectedAmount)}
              </span>
              <small>USD</small>
            </>
          )}
        </FieldRow>
        <FieldRow editing={editMode} label="Close date">
          {editMode ? (
            <input
              className="opp-field-input"
              onChange={(event) => onChangeClose(event.target.value)}
              placeholder="YYYY-MM-DD"
              type="date"
              value={draftClose}
            />
          ) : (
            <>
              <span style={{ fontFamily: "ui-monospace, monospace" }}>
                {opportunity.closeDate ?? "—"}
              </span>
              {opportunity.closeDate ? (
                <small>· {daysUntil(opportunity.closeDate)}</small>
              ) : null}
            </>
          )}
        </FieldRow>
        <FieldRow label="Stage">
          <span className="rep-pill">
            <span className="dot" />
            {stageLabel}
          </span>
          <small>· {opportunity.stageKey}</small>
        </FieldRow>
        <FieldRow label="Owner">
          {opportunity.owner.displayName}
          <small>· {opportunity.owner.id}</small>
        </FieldRow>
        <FieldRow label="Primary contact">
          {opportunity.primaryContact ? (
            <>
              {opportunity.primaryContact.fullName}
              <small>· {opportunity.primaryContact.id}</small>
            </>
          ) : (
            <small>None</small>
          )}
        </FieldRow>
      </div>

      {customFields.length > 0 ? (
        <>
          <div className="opp-section-sub">
            Tenant custom fields <span>{customFieldCount}</span>
          </div>
          <div className="opp-fields">
            {customFields.map((field) => {
              const value = opportunity.customFields[field.fieldKey];
              const missing = field.isRequiredDefault && isEmpty(value);
              return (
                <FieldRow
                  editing={editMode}
                  hint={
                    missing
                      ? "Required by tenant policy — populate before later-stage promotion."
                      : undefined
                  }
                  key={field.id}
                  label={field.label}
                  missing={missing}
                  tag={field.isRequiredDefault ? "required" : "custom"}
                >
                  {editMode ? (
                    <CustomFieldEditor
                      field={field}
                      onChange={(value) => onChangeCustom(field.fieldKey, value)}
                      value={draftCustom[field.fieldKey] ?? ""}
                    />
                  ) : (
                    <FieldValue field={field} value={value} />
                  )}
                </FieldRow>
              );
            })}
          </div>
        </>
      ) : null}

      {editError ? <div className="rep-form-error" style={{ margin: "10px 14px" }}>{editError}</div> : null}

      <div className="opp-fields-foot">
        <div>
          <span className="legend">
            <span className="opp-field-tag cust">CUSTOM</span> tenant-defined
          </span>
          <span className="legend">
            <span className="opp-field-tag req">REQUIRED</span> populate before promote
          </span>
        </div>
        <span style={{ fontFamily: "ui-monospace, monospace" }}>
          metadata · {customFieldCount} custom fields · changes audit-logged
        </span>
      </div>
    </section>
  );
}

function FieldRow({
  children,
  editing,
  hint,
  label,
  missing,
  tag,
}: {
  children: React.ReactNode;
  editing?: boolean;
  hint?: string;
  label: string;
  missing?: boolean;
  tag?: "custom" | "required";
}) {
  return (
    <div className={`opp-field ${editing ? "editing" : ""} ${missing ? "missing" : ""}`}>
      <div className="opp-field-l">
        {label}
        {tag === "custom" ? <span className="opp-field-tag cust">CUSTOM</span> : null}
        {tag === "required" ? <span className="opp-field-tag req">REQUIRED</span> : null}
      </div>
      <div className="opp-field-v">{children}</div>
      {hint ? <div className="opp-field-hint">{hint}</div> : null}
    </div>
  );
}

function CustomFieldEditor({
  field,
  onChange,
  value,
}: {
  field: MetadataFieldDefinitionItem;
  onChange: (value: string) => void;
  value: string;
}) {
  if (field.fieldType === "long_text") {
    return (
      <textarea
        className="opp-field-input"
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        style={{ fontFamily: "inherit" }}
        value={value}
      />
    );
  }
  if (field.fieldType === "single_select") {
    return (
      <select
        className="opp-field-input"
        onChange={(event) => onChange(event.target.value)}
        style={{ fontFamily: "inherit" }}
        value={value}
      >
        <option value="">None</option>
        {field.selectOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.fieldType === "boolean") {
    return (
      <select
        className="opp-field-input"
        onChange={(event) => onChange(event.target.value)}
        style={{ fontFamily: "inherit" }}
        value={value}
      >
        <option value="">None</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  const type = field.fieldType === "date" ? "date" : "text";
  return (
    <input
      className="opp-field-input"
      inputMode={field.fieldType === "number" || field.fieldType === "currency" ? "decimal" : undefined}
      onChange={(event) => onChange(event.target.value)}
      type={type}
      value={value}
    />
  );
}

function FieldValue({
  field,
  value,
}: {
  field: MetadataFieldDefinitionItem;
  value: CustomFieldValue | undefined;
}) {
  if (value === null || value === undefined || value === "") {
    return <small>— empty</small>;
  }
  if (field.fieldType === "boolean") {
    return <>{value === true ? "Yes" : "No"}</>;
  }
  if (field.fieldType === "currency" && typeof value === "number") {
    return (
      <span style={{ fontFamily: "ui-monospace, monospace" }}>{formatCurrency(value)}</span>
    );
  }
  if (field.fieldType === "single_select") {
    const match = field.selectOptions.find((option) => option.value === value);
    return <>{match ? match.label : String(value)}</>;
  }
  return <>{String(value)}</>;
}

// ─────────────────────────────────────────────────────────────────────────
// Activities panel
// ─────────────────────────────────────────────────────────────────────────

function ActivitiesPanel({
  activities,
  composerDueDate,
  composerKind,
  composerOpen,
  composerTitle,
  completedActivities,
  isActivitySubmitting,
  opportunity,
  overdueActivities,
  upcomingActivities,
  onChangeComposerDueDate,
  onChangeComposerKind,
  onChangeComposerTitle,
  onCloseComposer,
  onOpenComposer,
  onSubmitActivity,
}: {
  activities: ActivityListItem[];
  composerDueDate: string;
  composerKind: string;
  composerOpen: boolean;
  composerTitle: string;
  completedActivities: ActivityListItem[];
  isActivitySubmitting: boolean;
  opportunity: OpportunityDetailType;
  overdueActivities: ActivityListItem[];
  upcomingActivities: ActivityListItem[];
  onChangeComposerDueDate: (value: string) => void;
  onChangeComposerKind: (value: string) => void;
  onChangeComposerTitle: (value: string) => void;
  onCloseComposer: () => void;
  onOpenComposer: () => void;
  onSubmitActivity: () => void;
}) {
  return (
    <section className="opp-panel">
      <div className="opp-panel-head">
        <div className="opp-panel-title">
          Activities &amp; next steps{" "}
          <em>
            {activities.length} total · {overdueActivities.length} overdue
          </em>
        </div>
        <div className="opp-panel-actions">
          <button className="rep-btn" onClick={composerOpen ? onCloseComposer : onOpenComposer} type="button">
            {composerOpen ? "Close composer" : "+ Add activity"}
          </button>
        </div>
      </div>

      {composerOpen ? (
        <div className="opp-composer">
          <div className="opp-composer-row">
            <select
              className="ctl"
              onChange={(event) => onChangeComposerKind(event.target.value)}
              value={composerKind}
            >
              <option value="task">Task</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="note">Note</option>
              <option value="meeting">Meeting</option>
            </select>
            <input
              className="ctl"
              onChange={(event) => onChangeComposerDueDate(event.target.value)}
              placeholder="YYYY-MM-DD"
              type="date"
              value={composerDueDate}
            />
            <input
              autoFocus
              className="ctl"
              onChange={(event) => onChangeComposerTitle(event.target.value)}
              placeholder="e.g. Send revised pricing sheet"
              value={composerTitle}
            />
          </div>
          <div className="opp-composer-foot">
            <span style={{ fontFamily: "ui-monospace, monospace" }}>
              Linked to {opportunity.id} · {opportunity.account.id}
              {opportunity.primaryContact ? ` · ${opportunity.primaryContact.id}` : ""}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="rep-btn" onClick={onCloseComposer} type="button">
                Cancel
              </button>
              <button
                className={
                  composerTitle.trim() ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"
                }
                disabled={isActivitySubmitting || !composerTitle.trim()}
                onClick={onSubmitActivity}
                type="button"
              >
                Save activity
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {overdueActivities.length > 0 ? (
        <>
          <div className="opp-section-sub">
            Overdue <span>{overdueActivities.length}</span>
          </div>
          <div className="opp-acts">
            {overdueActivities.map((activity) => (
              <ActivityRow activity={activity} key={activity.id} state="over" />
            ))}
          </div>
        </>
      ) : null}

      <div className="opp-section-sub">
        Upcoming &amp; today <span>{upcomingActivities.length}</span>
      </div>
      <div className="opp-acts">
        {upcomingActivities.length === 0 ? (
          <div className="rep-empty" style={{ padding: "20px 14px" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
              No upcoming activities. Use “+ Add activity” to log next steps.
            </div>
          </div>
        ) : (
          upcomingActivities.map((activity) => (
            <ActivityRow activity={activity} key={activity.id} state="upcoming" />
          ))
        )}
      </div>

      {completedActivities.length > 0 ? (
        <>
          <div className="opp-section-sub">
            Completed <span>{completedActivities.length}</span>
          </div>
          <div className="opp-acts">
            {completedActivities.map((activity) => (
              <ActivityRow activity={activity} key={activity.id} state="done" />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ActivityRow({
  activity,
  state,
}: {
  activity: ActivityListItem;
  state: "over" | "upcoming" | "done";
}) {
  const today = isToday(activity.dueDate);
  const timeClass = state === "over" ? "over" : today ? "today" : "";
  return (
    <div className="opp-act">
      <div className={`opp-act-time ${timeClass}`}>
        {state === "over" ? (
          <>
            OVERDUE
            <br />
          </>
        ) : null}
        {activity.dueDate ?? "no date"}
      </div>
      <div>
        <div className="opp-act-title">
          <span className="opp-act-kind">{activity.type}</span>
          {activity.title}
          {state === "over" ? (
            <span className="rep-pill p-overdue">
              <span className="dot" />
              overdue
            </span>
          ) : null}
          {today && state === "upcoming" ? (
            <span className="rep-pill p-pending">
              <span className="dot" />
              today
            </span>
          ) : null}
        </div>
        <div className="opp-act-meta">
          {activity.type} · {activity.status}
        </div>
      </div>
      <div className="opp-act-actions">
        {state === "done" ? (
          <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--pos)", fontSize: "0.7rem" }}>
            ✓ DONE
          </span>
        ) : (
          <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--muted)", fontSize: "0.7rem" }}>
            {activity.status}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Approval panel + guided submit flow
// ─────────────────────────────────────────────────────────────────────────

function ApprovalPanel({
  approvalKey,
  competition,
  customerImpact,
  eligibleToSubmit,
  isApprovalSubmitting,
  justification,
  opportunity,
  requestType,
  stageLabel,
  submitFlowOpen,
  submitPhase,
  supportingNotes,
  urgency,
  validated,
  validationErrors,
  onCancelFlow,
  onChangeCompetition,
  onChangeCustomerImpact,
  onChangeJustification,
  onChangeRequestType,
  onChangeSupportingNotes,
  onChangeUrgency,
  onOpenFlow,
  onSubmit,
  onValidate,
}: {
  approvalKey: string;
  competition: string;
  customerImpact: string;
  eligibleToSubmit: boolean;
  isApprovalSubmitting: boolean;
  justification: string;
  opportunity: OpportunityDetailType;
  requestType: RequestTypeKey;
  stageLabel: string;
  submitFlowOpen: boolean;
  submitPhase: SubmitPhase;
  supportingNotes: string;
  urgency: Urgency;
  validated: ValidatedState;
  validationErrors: Record<string, string>;
  onCancelFlow: () => void;
  onChangeCompetition: (value: string) => void;
  onChangeCustomerImpact: (value: string) => void;
  onChangeJustification: (value: string) => void;
  onChangeRequestType: (value: RequestTypeKey) => void;
  onChangeSupportingNotes: (value: string) => void;
  onChangeUrgency: (value: Urgency) => void;
  onOpenFlow: () => void;
  onSubmit: () => void;
  onValidate: () => void;
}) {
  const hasActiveApproval = approvalKey === "pending" || opportunity.activeApproval !== null;
  const selectedType = REQUEST_TYPE_CATALOG.find((type) => type.key === requestType) ?? REQUEST_TYPE_CATALOG[0];
  const activeApproval = opportunity.activeApproval;
  const activeApprovalSla = describeApprovalSla(activeApproval?.activeStepDueAt);
  const activeApprovalLabel = activeApproval
    ? `REQ ${compactId(activeApproval.id)} · ${activeApproval.approverRoleKey.replace(/_/g, " ")}`
    : null;

  const requiresExceptionFields = requestType !== "stage_progression";
  const requiredCount = requiresExceptionFields ? 3 : 1;
  const filled = [
    justification.trim().length >= 40,
    requiresExceptionFields ? customerImpact.trim().length >= 20 : null,
    requiresExceptionFields ? competition.trim().length >= 20 : null,
  ].filter((value) => value !== null) as boolean[];
  const filledCount = filled.filter(Boolean).length;

  return (
    <section className="opp-panel">
      <div className="opp-panel-head">
        <div className="opp-panel-title">
          Approval request{" "}
          <em>
            {approvalKey === "none" ? "no active request" : opportunity.approvalState.replace(/_/g, " ")}
          </em>
        </div>
        <div className="opp-panel-actions">
          {!submitFlowOpen && eligibleToSubmit ? (
            <button className="rep-btn rep-btn-primary" onClick={onOpenFlow} type="button">
              Start submission
            </button>
          ) : null}
          {submitFlowOpen ? (
            <button className="rep-btn" onClick={onCancelFlow} type="button">
              Close flow
            </button>
          ) : null}
        </div>
      </div>

      <div className={`opp-appr-banner ${approvalKey}`}>
        <div className="opp-appr-banner-mark">
          {approvalKey === "approved" ? "✓" : approvalKey === "rejected" ? "✕" : "!"}
        </div>
        <div className="opp-appr-banner-body">
          <div className="l">Approval state</div>
          <div className="v">
            {approvalKey === "none" ? "No active request" : opportunity.approvalState.replace(/_/g, " ")}
          </div>
          <div className="sub">
            {activeApproval
              ? `${activeApprovalLabel} · ${activeApprovalSla.label}`
              : hasActiveApproval
                ? `Active on ${opportunity.id} — wait for the decision before resubmitting`
              : approvalKey === "approved"
                ? "Decision recorded against this opportunity"
                : approvalKey === "rejected"
                  ? "Rejected — review feedback and consider revised commercial terms"
                  : eligibleToSubmit
                    ? "Open the guided submission below to route to Finance / Legal"
                    : "—"}
          </div>
        </div>
        <span className={`rep-pill p-${approvalKey === "none" ? "none" : approvalKey}`}>
          <span className="dot" />
          {approvalKey === "none" ? "none" : opportunity.approvalState.replace(/_/g, " ")}
        </span>
      </div>

      {activeApproval ? (
        <div className="opp-appr-summary">
          <span className="mono">REQ {activeApproval.id}</span>
          <span>Current approver · {activeApproval.approverRoleKey.replace(/_/g, " ")}</span>
          <span>Status · {activeApproval.activeStepStatus.replace(/_/g, " ")}</span>
          <span title={activeApproval.activeStepDueAt ?? ""}>SLA · {activeApprovalSla.label}</span>
        </div>
      ) : null}

      {hasActiveApproval && !submitFlowOpen ? (
        <div className="opp-blocked" style={{ margin: 14 }}>
          <div className="opp-blocked-mark">!</div>
          <div>
            <div className="l">Submission blocked</div>
            <div className="t">An active approval request already exists on this opportunity</div>
            <div className="ds">
              {activeApproval ? (
                <>
                  <strong>{activeApproval.id}</strong> is currently routed to{" "}
                  <strong>{activeApproval.approverRoleKey.replace(/_/g, " ")}</strong> with SLA{" "}
                  <strong>{activeApprovalSla.label}</strong>. Policy does not allow more than one active request per
                  opportunity. Wait for the current decision before resubmitting.
                </>
              ) : (
                <>
                  {opportunity.id} currently has an approval request in state{" "}
                  <strong>{opportunity.approvalState.replace(/_/g, " ")}</strong>. Policy does not allow more than one
                  active request per opportunity. Wait for the current decision, or — if you are the submitter and the
                  backend supports it — withdraw and resubmit.
                </>
              )}
            </div>
          </div>
          <span style={{ fontFamily: "ui-monospace, monospace", color: "#9a3a2f", fontSize: "0.7rem" }}>
            HARD-BLOCK
          </span>
        </div>
      ) : null}

      {submitFlowOpen ? (
        <>
          <div className="opp-process">
            <ProcessStep label="Fill request" foot="type · justification · urgency" num="01" phaseKey="draft" submitPhase={submitPhase} />
            <ProcessStep label="Validate policy" foot="required fields · policy preview" num="02" phaseKey="validate" submitPhase={submitPhase} />
            <ProcessStep label="Submit & route" foot="snapshot frozen · audit written" num="03" phaseKey="submit" submitPhase={submitPhase} />
            <ProcessStep label="Decision" foot="approve · reject · send back" num="04" phaseKey="decision" submitPhase={submitPhase} />
          </div>

          <div className="opp-section-sub">
            Frozen snapshot <span>captured at submit</span>
          </div>
          <div className="opp-snap">
            <SnapCell label="Opportunity" value={opportunity.title} mono={opportunity.id} />
            <SnapCell label="Account" value={opportunity.account.name} mono={opportunity.account.id} />
            <SnapCell
              label="Primary contact"
              value={opportunity.primaryContact?.fullName ?? "None"}
              mono={opportunity.primaryContact?.id}
            />
            <SnapCell label="Owner" value={opportunity.owner.displayName} mono={opportunity.owner.id} />
            <SnapCell label="Stage at submit" value={stageLabel} mono={opportunity.stageKey} />
            <SnapCell label="Amount" num value={formatCurrency(opportunity.expectedAmount)} />
            <SnapCell
              label="Close date"
              mono={opportunity.closeDate ?? "—"}
              value={opportunity.closeDate ? daysUntil(opportunity.closeDate) : "—"}
            />
            <SnapCell label="Type" value={selectedType.name} mono={selectedType.code} />
          </div>

          <div className="opp-submit-form">
            <div>
              <div className="opp-section-sub" style={{ marginBottom: 8, background: "transparent", border: 0, padding: 0 }}>
                Request type <span>{selectedType.code}</span>
              </div>
              <div className="opp-submit-types">
                {REQUEST_TYPE_CATALOG.map((type) => (
                  <button
                    aria-pressed={requestType === type.key}
                    className={`opp-submit-type ${requestType === type.key ? "on" : ""} ${type.supported ? "" : "disabled"}`}
                    disabled={!type.supported}
                    key={type.key}
                    onClick={() => onChangeRequestType(type.key)}
                    title={type.supported ? type.name : "Planned for a later backend policy slice"}
                    type="button"
                  >
                    <div className="code">{type.code}</div>
                    <div className="nm">{type.name}</div>
                    <div className="ds">{type.description}</div>
                    {!type.supported ? <div className="planned">PLANNED</div> : null}
                  </button>
                ))}
              </div>
              {validationErrors.requestType ? (
                <div className="err-msg" style={{ marginTop: 8 }}>
                  ! {validationErrors.requestType}
                </div>
              ) : null}
            </div>

            <div
              className={`opp-form-field ${validationErrors.justification ? "err" : ""}`}
            >
              <label>
                <span>
                  Business justification <span className="req">*</span>
                </span>
                <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--muted)" }}>
                  {justification.length} / 1000
                </span>
              </label>
              <textarea
                maxLength={1000}
                onChange={(event) => onChangeJustification(event.target.value)}
                placeholder="Why is this exception necessary? Include strategic, competitive and customer-relationship context."
                value={justification}
              />
              {validationErrors.justification ? (
                <div className="err-msg">! {validationErrors.justification}</div>
              ) : (
                <div className="hint">Approvers will read this verbatim. Aim for ≥ 40 characters of business context.</div>
              )}
            </div>

            {requiresExceptionFields ? (
              <>
                <div className={`opp-form-field ${validationErrors.customerImpact ? "err" : ""}`}>
                  <label>
                    <span>
                      Customer impact <span className="req">*</span>
                    </span>
                  </label>
                  <textarea
                    onChange={(event) => onChangeCustomerImpact(event.target.value)}
                    placeholder="What happens to the customer relationship if this exception is not granted?"
                    value={customerImpact}
                  />
                  {validationErrors.customerImpact ? (
                    <div className="err-msg">! {validationErrors.customerImpact}</div>
                  ) : null}
                </div>

                <div className={`opp-form-field ${validationErrors.competition ? "err" : ""}`}>
                  <label>
                    <span>
                      Competitive situation <span className="req">*</span>
                    </span>
                  </label>
                  <textarea
                    onChange={(event) => onChangeCompetition(event.target.value)}
                    placeholder="Named competitor, observed offer / rebate, customer commitment, deal pressure."
                    value={competition}
                  />
                  {validationErrors.competition ? (
                    <div className="err-msg">! {validationErrors.competition}</div>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className="opp-form-field">
              <label>
                <span>
                  Urgency <span className="req">*</span>
                </span>
              </label>
              <div className="opp-urgency-row">
                {URGENCY_OPTIONS.map((option) => (
                  <button
                    className={`opp-urgency-opt ${urgency === option.key ? "on" : ""}`}
                    key={option.key}
                    onClick={() => onChangeUrgency(option.key)}
                    type="button"
                  >
                    <span className="nm">{option.name}</span>
                    <span className="lbl">SLA · {option.sla}</span>
                  </button>
                ))}
              </div>
              <div className="hint">Approver SLA target adjusts to urgency. Critical alerts approvers immediately.</div>
            </div>

            <div className="opp-form-field">
              <label>
                <span>Supporting notes</span>
                <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--muted)" }}>optional</span>
              </label>
              <textarea
                onChange={(event) => onChangeSupportingNotes(event.target.value)}
                placeholder="Internal context only. Not visible to the customer."
                value={supportingNotes}
              />
            </div>
          </div>

          {validated === "err" ? (
            <div className="opp-v-banner err" role="alert">
              <div className="opp-v-banner-mark">!</div>
              <div>
                <div className="t">
                  Validation failed — {Object.keys(validationErrors).length} field
                  {Object.keys(validationErrors).length === 1 ? "" : "s"} need attention
                </div>
                <div className="s">
                  Fix the highlighted fields and run <strong>Validate request</strong> again. Submitting will be
                  enabled only after validation passes.
                </div>
              </div>
              <span className="rep-pill p-rejected">
                <span className="dot" />
                blocked
              </span>
            </div>
          ) : null}
          {validated === "ok" && submitPhase !== "submitted" ? (
            <div className="opp-v-banner ok">
              <div className="opp-v-banner-mark">✓</div>
              <div>
                <div className="t">Ready to submit · {selectedType.code} policy matched</div>
                <div className="s">
                  All required fields are populated. Submitting will freeze the snapshot, route to Finance, and
                  lock stage promotion until a decision is made.
                </div>
              </div>
              <span className="rep-pill p-approved">
                <span className="dot" />
                ready
              </span>
            </div>
          ) : null}
          {submitPhase === "submitted" ? (
            <div className="opp-v-banner ok">
              <div className="opp-v-banner-mark">✓</div>
              <div>
                <div className="t">Approval request submitted · routed to Finance</div>
                <div className="s">
                  Snapshot frozen at submit. The approval state on this opportunity will update when the chain
                  decides.
                </div>
              </div>
              <span className="rep-pill p-pending">
                <span className="dot" />
                pending
              </span>
            </div>
          ) : null}

          <div className="opp-submit-foot">
            <div className="opp-submit-summary">
              <span>
                <span style={{ fontFamily: "ui-monospace, monospace" }}>
                  {filledCount}/{requiredCount}
                </span>{" "}
                required narrative blocks populated
              </span>
              <span className="sep">·</span>
              <span>
                Type{" "}
                <span style={{ fontFamily: "ui-monospace, monospace" }}>{selectedType.code}</span>
              </span>
              <span className="sep">·</span>
              <span>
                Urgency{" "}
                <span style={{ fontFamily: "ui-monospace, monospace" }}>{urgency}</span>
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="rep-btn" onClick={onCancelFlow} type="button">
                Cancel
              </button>
              <button className="rep-btn" onClick={onValidate} type="button">
                Validate request
              </button>
              <button
                aria-disabled={validated !== "ok" || isApprovalSubmitting}
                className={
                  validated === "ok" && submitPhase !== "submitted"
                    ? "rep-btn rep-btn-primary"
                    : "rep-btn rep-btn-disabled"
                }
                disabled={validated !== "ok" || isApprovalSubmitting || submitPhase === "submitted"}
                onClick={onSubmit}
                title={
                  validated === "ok"
                    ? "Submit approval request"
                    : "Validate first and fix any errors"
                }
                type="button"
              >
                {submitPhase === "submitted" ? "Submitted" : "Submit approval request"}
              </button>
            </div>
          </div>

          <div className="opp-section-sub">
            Approval chain · preview <span>sequential</span>
          </div>
          <div className="opp-chain">
            <ChainStep
              badge="Submit"
              name="Submitted by you"
              status="done"
              step="01"
              sla="Snapshot is captured and request becomes immutable."
              who={`${opportunity.owner.displayName} · on submit`}
            />
            <ChainStep
              badge="In review"
              name="Finance review"
              status="cur"
              step="02"
              sla="Reviews requested change. May approve, reject, or send back with comments."
              who="Finance approver · SLA 24h"
            />
            <ChainStep
              badge={requestType === "terms_exception" ? "Required" : "Conditional"}
              name="Legal review"
              status="fut"
              step="03"
              sla="Cannot decide until Finance completes. Reviews terms and legal carve-outs."
              who="Legal approver · waits for FIN"
            />
            <ChainStep
              badge="Auto"
              name="Final decision"
              status="fut"
              step="04"
              sla="Outcome is auto-applied to this opportunity and written to the audit trail."
              who="auto · once all required steps decide"
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

function ProcessStep({
  foot,
  label,
  num,
  phaseKey,
  submitPhase,
}: {
  foot: string;
  label: string;
  num: string;
  phaseKey: "draft" | "validate" | "submit" | "decision";
  submitPhase: SubmitPhase;
}) {
  const cls =
    submitPhase === "submitted"
      ? phaseKey === "decision"
        ? "cur"
        : "done"
      : submitPhase === "validated"
        ? phaseKey === "draft"
          ? "done"
          : phaseKey === "validate"
            ? "cur"
            : "fut"
        : phaseKey === "draft"
          ? "cur"
          : "fut";
  return (
    <div className={`opp-process-step ${cls}`}>
      <div className="opp-process-num">
        <span className="dot" />
        {num} · {phaseKey.toUpperCase()}
      </div>
      <div className="opp-process-label">{label}</div>
      <div className="opp-process-foot">{foot}</div>
    </div>
  );
}

function SnapCell({
  label,
  mono,
  num,
  value,
}: {
  label: string;
  mono?: string;
  num?: boolean;
  value: string;
}) {
  return (
    <div className="opp-snap-cell">
      <div className="l">{label}</div>
      <div className={`v${num ? " num" : ""}`}>
        {value}
        {mono ? (
          <small style={{ fontFamily: "ui-monospace, monospace" }}>· {mono}</small>
        ) : null}
      </div>
    </div>
  );
}

function ChainStep({
  badge,
  name,
  sla,
  status,
  step,
  who,
}: {
  badge: string;
  name: string;
  sla: string;
  status: "done" | "cur" | "fut";
  step: string;
  who: string;
}) {
  return (
    <div className={`opp-chain-step ${status}`}>
      <div className="opp-chain-mark">{step}</div>
      <div className="opp-chain-body">
        <div className="nm">{name}</div>
        <div className="who">{who}</div>
        <div className="sla">{sla}</div>
      </div>
      <span className="opp-chain-badge">{badge}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Audit timeline (best-effort over opportunity.timeline)
// ─────────────────────────────────────────────────────────────────────────

type AuditEvent = {
  at: string;
  actor: string;
  type: string;
  code: string;
  title: string;
  description: string;
};

function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <section className="opp-panel">
      <div className="opp-panel-head">
        <div className="opp-panel-title">
          Business audit timeline <em>{events.length} event{events.length === 1 ? "" : "s"}</em>
        </div>
      </div>
      {events.length === 0 ? (
        <div className="rep-empty" style={{ padding: "20px 14px" }}>
          <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
            No audit events available for this opportunity in the current API response.
          </div>
        </div>
      ) : (
        <div className="opp-timeline">
          {events.map((event, index) => (
            <div className="opp-tl-item" key={`${event.at}-${index}`}>
              <div className="opp-tl-time">
                {event.at.slice(11, 16) || event.at}
                {event.at.length >= 10 ? <small>{event.at.slice(0, 10)}</small> : null}
              </div>
              <div className={`opp-tl-node ${event.type}`} />
              <div>
                <div className="opp-tl-title">
                  {event.title}
                  <span className="opp-tl-code">{event.code}</span>
                </div>
                <div className="opp-tl-desc">{event.description}</div>
              </div>
              <div className="opp-tl-by">{event.actor}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Account / Contact context (right column)
// ─────────────────────────────────────────────────────────────────────────

function AccountContactPanel({ opportunity }: { opportunity: OpportunityDetailType }) {
  return (
    <section className="opp-panel">
      <div className="opp-ctx-head">
        <div className="opp-ctx-row">
          <span>Account</span>
          <span className="id">{opportunity.account.id}</span>
        </div>
        <div className="opp-ctx-name">{opportunity.account.name}</div>
        <div className="opp-ctx-sub">Owner {opportunity.owner.displayName}</div>
      </div>

      <div className="opp-ctx-rel">
        <div className="mark">AC</div>
        <div>
          <div className="l">Account</div>
          <div className="v">{opportunity.account.name}</div>
        </div>
        <span className="arrow">›</span>
      </div>
      <div className="opp-ctx-rel">
        <div className="mark">CT</div>
        <div>
          <div className="l">Primary contact</div>
          <div className="v">{opportunity.primaryContact?.fullName ?? "None"}</div>
        </div>
        <span className="arrow">›</span>
      </div>
      <div className="opp-ctx-rel current">
        <div className="mark">OP</div>
        <div>
          <div className="l">This opportunity</div>
          <div className="v">
            {opportunity.id} · {opportunity.title}
          </div>
        </div>
        <span className="arrow" style={{ color: "var(--accent)" }}>●</span>
      </div>

      <div className="opp-ctx-stats">
        <div className="opp-ctx-stat">
          <div className="l">Account ID</div>
          <div className="v" style={{ fontSize: "0.86rem" }}>{opportunity.account.id}</div>
          <div className="s">tenant-scoped</div>
        </div>
        <div className="opp-ctx-stat">
          <div className="l">Owner</div>
          <div className="v" style={{ fontSize: "0.86rem", fontFamily: "inherit", fontWeight: 600 }}>
            {opportunity.owner.displayName}
          </div>
          <div className="s">role · current opp owner</div>
        </div>
        <div className="opp-ctx-stat">
          <div className="l">Amount</div>
          <div className="v">{formatCurrency(opportunity.expectedAmount)}</div>
          <div className="s">expected close</div>
        </div>
        <div className="opp-ctx-stat">
          <div className="l">Approval</div>
          <div className="v" style={{ fontSize: "0.86rem", fontFamily: "inherit", fontWeight: 600 }}>
            {opportunity.approvalState.replace(/_/g, " ")}
          </div>
          <div className="s">current state</div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Manager actions panel (locked for sales reps)
// ─────────────────────────────────────────────────────────────────────────

function ManagerPanel({
  canReassignOwner,
  isActionSubmitting,
  newOwnerId,
  roleKey,
  onChangeNewOwnerId,
  onReassign,
}: {
  canReassignOwner: boolean;
  isActionSubmitting: boolean;
  newOwnerId: string;
  roleKey: string;
  onChangeNewOwnerId: (value: string) => void;
  onReassign: () => void;
}) {
  return (
    <section className="opp-mgr-block">
      <div className="opp-mgr-head">
        <div className="opp-panel-title">
          Manager actions <em>role · {roleKey.toUpperCase()}</em>
        </div>
        {canReassignOwner ? (
          <span className="rep-pill p-approved">
            <span className="dot" />
            unlocked
          </span>
        ) : (
          <span className="rep-pill p-pending">
            <span className="dot" />
            locked
          </span>
        )}
      </div>

      {!canReassignOwner ? (
        <div className="opp-mgr-locked">
          <div className="opp-mgr-lock-mark">🔒</div>
          <div>
            <div className="t">Available only to Sales Manager / RevOps Admin</div>
            <div className="s">
              Your role ({roleKey.toUpperCase()}) can view these actions but cannot execute them. A manager must
              reassign ownership.
            </div>
          </div>
        </div>
      ) : null}

      <div className="opp-mgr-actions">
        <div className={`opp-mgr-action ${canReassignOwner ? "" : "locked"}`}>
          <div className="mark">RO</div>
          <div>
            <div className="nm">Reassign owner</div>
            <div className="ds">
              Move this opportunity to a different rep. Updates ownership-based visibility and writes an audit
              event.
            </div>
            {canReassignOwner ? (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input
                  onChange={(event) => onChangeNewOwnerId(event.target.value)}
                  placeholder="user id of new owner"
                  value={newOwnerId}
                />
                <button
                  className={
                    newOwnerId.trim() ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"
                  }
                  disabled={isActionSubmitting || !newOwnerId.trim()}
                  onClick={onReassign}
                  type="button"
                >
                  Reassign
                </button>
              </div>
            ) : null}
          </div>
          <div className="lock">{canReassignOwner ? "MGR" : "MGR ONLY"}</div>
        </div>
        <div className="opp-mgr-action locked">
          <div className="mark">MN</div>
          <div>
            <div className="nm">Add manager note</div>
            <div className="ds">Internal note · not visible to approvers (planned for Phase 4).</div>
          </div>
          <div className="lock">PLANNED</div>
        </div>
        <div className="opp-mgr-action locked">
          <div className="mark">RU</div>
          <div>
            <div className="nm">Request update from owner</div>
            <div className="ds">Notify owner to refresh stage / next step (planned for Phase 4).</div>
          </div>
          <div className="lock">PLANNED</div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function normalizeApprovalState(state: string): string {
  return state.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function isEmpty(value: CustomFieldValue | undefined): boolean {
  return value === null || value === undefined || value === "";
}

function isActivityCompleted(activity: ActivityListItem): boolean {
  const status = activity.status.toLowerCase();
  return status === "completed" || status === "done" || status === "closed";
}

function isActivityOverdue(activity: ActivityListItem): boolean {
  if (!activity.dueDate) return false;
  const dueMs = Date.parse(activity.dueDate);
  if (Number.isNaN(dueMs)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueMs < today.getTime();
}

function isToday(value: string | null): boolean {
  if (!value) return false;
  const dueMs = Date.parse(value);
  if (Number.isNaN(dueMs)) return false;
  const today = new Date();
  const due = new Date(dueMs);
  return (
    today.getFullYear() === due.getFullYear() &&
    today.getMonth() === due.getMonth() &&
    today.getDate() === due.getDate()
  );
}

function daysUntil(value: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((ms - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days < 0) return `${Math.abs(days)} d ago`;
  return `${days} d`;
}

function describeApprovalSla(value: string | null | undefined): { label: string } {
  if (!value) {
    return { label: "No SLA set" };
  }
  const dueMs = Date.parse(value);
  if (Number.isNaN(dueMs)) {
    return { label: "SLA invalid" };
  }
  const diffMs = dueMs - Date.now();
  const absHours = Math.max(1, Math.round(Math.abs(diffMs) / 3_600_000));
  if (diffMs < 0) {
    return { label: `Overdue by ${absHours}h` };
  }
  if (diffMs <= 24 * 3_600_000) {
    return { label: `Due in ${absHours}h` };
  }
  const days = Math.max(1, Math.round(diffMs / 86_400_000));
  return { label: `Due in ${days}d` };
}

function compactId(value: string): string {
  return value.slice(0, 8);
}

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatCustomFieldsForForm(
  fields: MetadataFieldDefinitionItem[],
  values: Record<string, CustomFieldValue>,
): Record<string, string> {
  return fields.reduce<Record<string, string>>((result, field) => {
    const value = values[field.fieldKey];
    result[field.fieldKey] = value === null || value === undefined ? "" : String(value);
    return result;
  }, {});
}

function parseCustomFields(
  fields: MetadataFieldDefinitionItem[],
  values: Record<string, string>,
): Record<string, CustomFieldValue> {
  return fields.reduce<Record<string, CustomFieldValue>>((result, field) => {
    const rawValue = values[field.fieldKey];
    if (rawValue === undefined || rawValue === "") {
      return result;
    }
    if (field.fieldType === "number" || field.fieldType === "currency") {
      result[field.fieldKey] = Number(rawValue);
      return result;
    }
    if (field.fieldType === "boolean") {
      result[field.fieldKey] = rawValue === "true";
      return result;
    }
    result[field.fieldKey] = rawValue;
    return result;
  }, {});
}

function parseTimeline(timeline: unknown[]): AuditEvent[] {
  if (!Array.isArray(timeline)) return [];
  return timeline
    .map((raw): AuditEvent | null => {
      if (!raw || typeof raw !== "object") return null;
      const event = raw as Record<string, unknown>;
      const at =
        typeof event.at === "string"
          ? event.at
          : typeof event.createdAt === "string"
            ? event.createdAt
            : typeof event.timestamp === "string"
              ? event.timestamp
              : "";
      const actorRaw = event.actor ?? event.by ?? event.user;
      const actor =
        typeof actorRaw === "string"
          ? actorRaw
          : actorRaw && typeof actorRaw === "object" && "displayName" in actorRaw
            ? String((actorRaw as { displayName: unknown }).displayName ?? "")
            : "";
      const type =
        typeof event.type === "string"
          ? event.type
          : typeof event.eventType === "string"
            ? event.eventType
            : "";
      const code =
        typeof event.code === "string"
          ? event.code
          : typeof event.eventCode === "string"
            ? event.eventCode
            : type
              ? type.toUpperCase()
              : "";
      const title =
        typeof event.title === "string"
          ? event.title
          : typeof event.summary === "string"
            ? event.summary
            : code || "Event";
      const description =
        typeof event.description === "string"
          ? event.description
          : typeof event.message === "string"
            ? event.message
            : "";
      return {
        actor: actor || "system",
        at,
        code: code || "EVENT",
        description,
        title,
        type: classifyEventType(type, code),
      };
    })
    .filter((event): event is AuditEvent => event !== null)
    .sort((left, right) => (left.at < right.at ? 1 : -1));
}

function classifyEventType(type: string, code: string): string {
  const haystack = `${type} ${code}`.toLowerCase();
  if (haystack.includes("stage")) return "stage";
  if (haystack.includes("appr")) return "appr";
  if (haystack.includes("field") || haystack.includes("update")) return "field";
  if (haystack.includes("activity") || haystack.includes("act")) return "act";
  if (haystack.includes("create")) return "create";
  return "";
}
