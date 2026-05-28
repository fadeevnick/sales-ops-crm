/**
 * OpportunityDetail.tsx — Phase 2.2
 *
 * ── Capability audit ────────────────────────────────────────────────────
 *
 * UNCHANGED — same behavior, same location:
 *   All callbacks: onCreateActivity, onMoveStage, onReassignOwner,
 *   onSubmitApproval, onUpdateOpportunity.
 *   Stage path: all 7 validation conditions (backward, skip,
 *   pending_approval block, pending block, rejected block,
 *   missing required, ok). Stage pop dialog + confirm.
 *   Field editing: title, expectedAmount, closeDate, all custom
 *   field types (long_text, single_select, boolean, date,
 *   currency, number, text). Required-field hints.
 *   Activity composer: type, dueDate, title.
 *   Activity sections: overdue / upcoming / completed. ActivityRow
 *   pills (overdue, today).
 *   Full guided approval submission: 3 request types
 *   (stage_progression supported, 2 PLANNED), justification
 *   40-char min, customerImpact, competition, supportingNotes,
 *   urgency. Submit phases draft → validated → submitted.
 *   Process step strip, snapshot grid, approval chain preview.
 *   Approval state banner with SLA, active approval detail.
 *   Blocked submission explanation.
 *   Audit timeline (parseTimeline, best-effort parsing).
 *   Manager panel: reassign owner (locked/unlocked by role),
 *   planned actions visible.
 *   Footer ruler. All 16 helper functions.
 *
 * MOVED — behavior preserved, surface changed:
 *   Edit fields (DealFields) → 680px right drawer.
 *     Opens from "Edit fields" header button.
 *   Submit approval form → 700px right drawer.
 *     Opens from "Submit for approval" header button.
 *   opp-facts 5-cell grid + opp-meta row → single compact
 *     sub-header line. One canonical location per fact.
 *   States strip (4-tile bar) → contextual badges only when
 *     issues exist (stage-blocked only if blocked; overdue count
 *     in activities header; approval state in title pill).
 *
 * DE-EMPHASIZED, NOT REMOVED:
 *   Completed activities: collapsed by default, toggle to expand.
 *   Audit timeline: <details> accordion at page bottom.
 *   Custom fields > 4: "Show all N fields" toggle.
 *   Manager panel: last in right column; locked state shown to rep.
 *
 * BACKEND CONSTRAINTS (unchanged):
 *   discount_exception and terms_exception shown as PLANNED.
 *   Approval chain preview hardcoded; real routing API not yet
 *   available in local pilot.
 */

import { useEffect, useMemo, useState } from "react";
import type {
  ActivityListItem,
  CustomFieldValue,
  OpportunityDetail as OpportunityDetailType,
} from "../../types/crm";
import type { MetadataFieldDefinitionItem, MetadataStageDefinitionItem } from "../../types/metadata";
import type { CurrentUser } from "../../types/session";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────
// Catalogs (unchanged from Phase 2)
// ─────────────────────────────────────────────────────────────────────────

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
  { key: "normal",  name: "Normal",  sla: "3–5d" },
  { key: "high",    name: "High",    sla: "48h" },
  { key: "critical",name: "Critical",sla: "24h" },
];

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────

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

  // ── Edit fields state ──────────────────────────────────────────────────
  const [editDrawerOpen,  setEditDrawerOpen]  = useState(false);
  const [draftTitle,      setDraftTitle]      = useState("");
  const [draftAmount,     setDraftAmount]     = useState("");
  const [draftClose,      setDraftClose]      = useState("");
  const [draftCustom,     setDraftCustom]     = useState<Record<string, string>>({});
  const [editError,       setEditError]       = useState<string | null>(null);

  // ── Stage move state ───────────────────────────────────────────────────
  const [stagePopKey, setStagePopKey] = useState<string | null>(null);

  // ── Activity composer ──────────────────────────────────────────────────
  const [composerOpen,    setComposerOpen]    = useState(false);
  const [composerKind,    setComposerKind]    = useState("task");
  const [composerTitle,   setComposerTitle]   = useState("");
  const [composerDueDate, setComposerDueDate] = useState("");
  const [showCompleted,   setShowCompleted]   = useState(false);

  // ── Approval submit drawer ─────────────────────────────────────────────
  const [approvalDrawerOpen, setApprovalDrawerOpen] = useState(false);
  const [requestType,        setRequestType]         = useState<RequestTypeKey>("stage_progression");
  const [justification,      setJustification]       = useState("");
  const [customerImpact,     setCustomerImpact]      = useState("");
  const [competition,        setCompetition]         = useState("");
  const [supportingNotes,    setSupportingNotes]     = useState("");
  const [urgency,            setUrgency]             = useState<Urgency>("normal");
  const [validated,          setValidated]           = useState<ValidatedState>(null);
  const [validationErrors,   setValidationErrors]    = useState<Record<string, string>>({});
  const [submitPhase,        setSubmitPhase]         = useState<SubmitPhase>("draft");

  // ── Manager reassign ───────────────────────────────────────────────────
  const [newOwnerId, setNewOwnerId] = useState("");

  // ── Custom fields show-all toggle ─────────────────────────────────────
  const [showAllCustomFields, setShowAllCustomFields] = useState(false);

  // ── Reset on opportunity change ────────────────────────────────────────
  useEffect(() => {
    setEditDrawerOpen(false);
    setEditError(null);
    setStagePopKey(null);
    setComposerOpen(false);
    setComposerKind("task");
    setComposerTitle("");
    setComposerDueDate("");
    setShowCompleted(false);
    setApprovalDrawerOpen(false);
    setRequestType("stage_progression");
    setJustification("");
    setCustomerImpact("");
    setCompetition("");
    setSupportingNotes("");
    setUrgency("normal");
    setValidated(null);
    setValidationErrors({});
    setSubmitPhase("draft");
    setNewOwnerId("");
    setShowAllCustomFields(false);
    if (opportunity) {
      setDraftTitle(opportunity.title ?? "");
      setDraftAmount(opportunity.expectedAmount?.toString() ?? "");
      setDraftClose(opportunity.closeDate ?? "");
      setDraftCustom(formatCustomFieldsForForm(fields, opportunity.customFields));
    }
  }, [opportunity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (opportunity && !editDrawerOpen) {
      setDraftCustom(formatCustomFieldsForForm(fields, opportunity.customFields));
    }
  }, [fields, opportunity?.customFields, editDrawerOpen, opportunity]);

  // ── Derived values ─────────────────────────────────────────────────────
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

  const approvalKey         = normalizeApprovalState(opportunity.approvalState);
  const hasActiveApproval   = approvalKey === "pending" || opportunity.activeApproval !== null;
  const eligibleToSubmit    = approvalKey === "none" && opportunity.activeApproval === null;
  const stageLabel          = stages.find((s) => s.stageKey === opportunity.stageKey)?.displayName ?? opportunity.stageKey;
  const customFieldCount    = fields.length;
  const overdueActivities   = activities.filter((a) => isActivityOverdue(a) && !isActivityCompleted(a));
  const upcomingActivities  = activities.filter((a) => !isActivityOverdue(a) && !isActivityCompleted(a));
  const completedActivities = activities.filter((a) => isActivityCompleted(a));
  const missingRequiredCustom = fields.filter(
    (f) => f.isRequiredDefault && isEmpty(opportunity.customFields[f.fieldKey]),
  );
  const timelineEvents      = parseTimeline(opportunity.timeline);
  const roleKey             = currentUser?.roleKey ?? "sales_rep";
  const canReassignOwner    = roleKey === "sales_manager" || roleKey === "revops_admin";
  const stageBlocked        = missingRequiredCustom.length > 0 || hasActiveApproval;

  // ── Handlers ───────────────────────────────────────────────────────────
  const openEditDrawer = () => {
    setDraftTitle(opportunity.title ?? "");
    setDraftAmount(opportunity.expectedAmount?.toString() ?? "");
    setDraftClose(opportunity.closeDate ?? "");
    setDraftCustom(formatCustomFieldsForForm(fields, opportunity.customFields));
    setEditError(null);
    setEditDrawerOpen(true);
  };

  const closeEditDrawer = () => {
    setEditDrawerOpen(false);
    setEditError(null);
  };

  const saveEdits = () => {
    if (!draftTitle.trim()) { setEditError("Title is required"); return; }
    let parsedAmount: number | undefined;
    if (draftAmount.trim()) {
      const v = Number(draftAmount);
      if (Number.isNaN(v)) { setEditError("Expected amount must be a number"); return; }
      parsedAmount = v;
    }
    onUpdateOpportunity({
      closeDate: draftClose || undefined,
      customFields: parseCustomFields(fields, draftCustom),
      expectedAmount: parsedAmount,
      title: draftTitle.trim(),
    });
    setEditDrawerOpen(false);
    setEditError(null);
  };

  const submitActivity = () => {
    const trimmed = composerTitle.trim();
    if (!trimmed) return;
    onCreateActivity({ dueDate: composerDueDate || undefined, title: trimmed, type: composerKind });
    setComposerOpen(false);
    setComposerKind("task");
    setComposerTitle("");
    setComposerDueDate("");
  };

  const handleStageClick = (stageKey: string) => {
    setStagePopKey(stagePopKey === stageKey ? null : stageKey);
  };

  const confirmStageMove = (stageKey: string) => {
    onMoveStage(stageKey);
    setStagePopKey(null);
  };

  const openApprovalDrawer = () => {
    setApprovalDrawerOpen(true);
    setSubmitPhase("draft");
    setValidated(null);
    setValidationErrors({});
  };

  const closeApprovalDrawer = () => {
    setApprovalDrawerOpen(false);
    setSubmitPhase("draft");
    setValidated(null);
    setValidationErrors({});
  };

  const runValidation = (): boolean => {
    const errors: Record<string, string> = {};
    const selectedType = REQUEST_TYPE_CATALOG.find((t) => t.key === requestType);
    if (!selectedType?.supported) {
      errors.requestType = "This request type is planned but not supported by the local pilot backend yet.";
    }
    if (!justification.trim() || justification.trim().length < 40) {
      errors.justification = "Provide at least 40 characters of business justification — approvers cannot review an empty case.";
    }
    if (requestType !== "stage_progression") {
      if (!customerImpact.trim() || customerImpact.trim().length < 20)
        errors.customerImpact = "Describe what happens to the customer relationship if the exception is not granted.";
      if (!competition.trim() || competition.trim().length < 20)
        errors.competition = "Name the competitor and the offer or pressure. 'N/A' is not accepted by policy.";
    }
    setValidationErrors(errors);
    const ok = Object.keys(errors).length === 0;
    setValidated(ok ? "ok" : "err");
    setSubmitPhase(ok ? "validated" : "draft");
    return ok;
  };

  const submitApprovalRequest = () => {
    if (!runValidation()) return;
    const parts = [
      justification.trim(),
      customerImpact.trim() ? `Customer impact: ${customerImpact.trim()}` : null,
      competition.trim()    ? `Competitive situation: ${competition.trim()}` : null,
      supportingNotes.trim()? `Notes: ${supportingNotes.trim()}` : null,
      `Urgency: ${urgency}`,
    ].filter(Boolean).join("\n\n");
    onSubmitApproval({ businessJustification: parts || undefined, requestType });
    setSubmitPhase("submitted");
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <section className="opp-detail" data-screen-label="Opportunity Detail">

      {/* Compact header — one canonical place per fact */}
      <OppHeader
        approvalKey={approvalKey}
        canSubmit={eligibleToSubmit}
        hasActiveApproval={hasActiveApproval}
        opportunity={opportunity}
        overdueCount={overdueActivities.length}
        stageBlocked={stageBlocked}
        stageLabel={stageLabel}
        onAddActivity={() => setComposerOpen(true)}
        onEditFields={openEditDrawer}
        onMoveStage={() => {
          const next = stages[currentStageIndex + 1];
          if (next) setStagePopKey(next.stageKey);
        }}
        onSubmitApproval={openApprovalDrawer}
      />

      {/* Two-column layout */}
      <div className="opp-layout">

        {/* ── Main column ── */}
        <div className="opp-main">

          {/* Stage path */}
          <StagePath
            approvalKey={approvalKey}
            currentStageKey={opportunity.stageKey}
            isActionSubmitting={isActionSubmitting}
            missingRequiredCustom={missingRequiredCustom}
            popKey={stagePopKey}
            stages={stages}
            onClickStage={handleStageClick}
            onClosePop={() => setStagePopKey(null)}
            onConfirmMove={confirmStageMove}
          />

          {/* Read-only deal overview — editable standard fields + custom fields.
              Inspection must not require entering the Edit drawer. */}
          <DealOverview
            customFields={fields}
            missingRequiredCustom={missingRequiredCustom}
            opportunity={opportunity}
            showAllCustomFields={showAllCustomFields}
            onEditFields={openEditDrawer}
            onToggleShowAll={() => setShowAllCustomFields((v) => !v)}
          />

          {/* Activities */}
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
            showCompleted={showCompleted}
            upcomingActivities={upcomingActivities}
            onChangeComposerDueDate={setComposerDueDate}
            onChangeComposerKind={setComposerKind}
            onChangeComposerTitle={setComposerTitle}
            onCloseComposer={() => setComposerOpen(false)}
            onOpenComposer={() => setComposerOpen(true)}
            onSubmitActivity={submitActivity}
            onToggleCompleted={() => setShowCompleted((v) => !v)}
          />

          {/* Approval summary (compact — full form is in drawer) */}
          <ApprovalSummary
            approvalKey={approvalKey}
            eligibleToSubmit={eligibleToSubmit}
            hasActiveApproval={hasActiveApproval}
            opportunity={opportunity}
            onOpenDrawer={openApprovalDrawer}
          />

          {/* Audit timeline — collapsed by default */}
          <details className="opp-audit-collapse">
            <summary className="opp-audit-summary">
              <span className="opp-audit-summary-label">Audit timeline</span>
              <span className="opp-audit-summary-ct">{timelineEvents.length} event{timelineEvents.length === 1 ? "" : "s"}</span>
            </summary>
            <AuditTimeline events={timelineEvents} />
          </details>

        </div>

        {/* ── Context column ── */}
        <div className="opp-ctx-col">

          {/* Account / contact context — no duplicate facts */}
          <AccountContextPanel opportunity={opportunity} />

          {/* Manager actions — role-aware */}
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

      {/* Footer ruler */}
      <div className="rep-foot-ruler">
        <span>SALES OPS CRM · {currentUser?.tenantName?.toUpperCase() ?? "LOCAL PILOT"} · LOCAL PILOT</span>
        <span>{opportunity.id} · OWNER {opportunity.owner.displayName.toUpperCase()} · ROLE {roleKey.toUpperCase()}</span>
        <span>METADATA · {customFieldCount} CUSTOM FIELDS · {stages.length} STAGES</span>
      </div>

      {/* ── Edit fields drawer ── */}
      {editDrawerOpen ? (
        <>
          <div className="rep-scrim" onClick={closeEditDrawer} />
          <aside className="rep-drawer opp-drawer-wide" role="dialog" aria-label="Edit opportunity fields">
            <div className="rep-drawer-head">
              <div>
                <div className="rep-drawer-title">Edit fields</div>
                <div className="rep-drawer-sub">
                  {opportunity.id} · {opportunity.title.length > 44 ? opportunity.title.slice(0, 44) + "…" : opportunity.title}
                </div>
              </div>
              <button aria-label="Close" className="rep-drawer-close" onClick={closeEditDrawer} type="button">×</button>
            </div>
            <EditFieldsBody
              customFields={fields}
              customFieldCount={customFieldCount}
              draftAmount={draftAmount}
              draftClose={draftClose}
              draftCustom={draftCustom}
              draftTitle={draftTitle}
              editError={editError}
              isActionSubmitting={isActionSubmitting}
              opportunity={opportunity}
              showAllCustomFields={showAllCustomFields}
              stageLabel={stageLabel}
              onChangeAmount={setDraftAmount}
              onChangeClose={setDraftClose}
              onChangeCustom={(key, v) => setDraftCustom((c) => ({ ...c, [key]: v }))}
              onChangeTitle={setDraftTitle}
              onToggleShowAll={() => setShowAllCustomFields((v) => !v)}
            />
            <div className="rep-drawer-foot">
              <div className="rep-drawer-foot hint">
                Changes are audit-logged · {customFieldCount} custom field{customFieldCount === 1 ? "" : "s"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="rep-btn" onClick={closeEditDrawer} type="button">Cancel</button>
                <button
                  className="rep-btn rep-btn-primary"
                  disabled={isActionSubmitting}
                  onClick={saveEdits}
                  type="button"
                >
                  Save changes
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}

      {/* ── Submit approval drawer ── */}
      {approvalDrawerOpen ? (
        <>
          <div className="rep-scrim" onClick={closeApprovalDrawer} />
          <aside className="rep-drawer opp-drawer-wide" role="dialog" aria-label="Submit for approval">
            <div className="rep-drawer-head">
              <div>
                <div className="rep-drawer-title">Submit for approval</div>
                <div className="rep-drawer-sub">
                  {opportunity.id} · {opportunity.title.length > 44 ? opportunity.title.slice(0, 44) + "…" : opportunity.title}
                </div>
              </div>
              <button aria-label="Close" className="rep-drawer-close" onClick={closeApprovalDrawer} type="button">×</button>
            </div>
            <ApprovalForm
              competition={competition}
              customerImpact={customerImpact}
              isApprovalSubmitting={isApprovalSubmitting}
              justification={justification}
              opportunity={opportunity}
              requestType={requestType}
              stageLabel={stageLabel}
              submitPhase={submitPhase}
              supportingNotes={supportingNotes}
              urgency={urgency}
              validated={validated}
              validationErrors={validationErrors}
              onChangeCompetition={setCompetition}
              onChangeCustomerImpact={setCustomerImpact}
              onChangeJustification={setJustification}
              onChangeRequestType={(v) => {
                setRequestType(v);
                setValidated(null);
                setValidationErrors({});
                setSubmitPhase("draft");
              }}
              onChangeSupportingNotes={setSupportingNotes}
              onChangeUrgency={setUrgency}
            />
            <div className="opp-appr-drawer-foot">
              <div className="summary">
                <span className="mono">
                  {[
                    justification.trim().length >= 40,
                    requestType !== "stage_progression" ? customerImpact.trim().length >= 20 : null,
                    requestType !== "stage_progression" ? competition.trim().length >= 20 : null,
                  ].filter(Boolean).filter((v) => v !== null).length}
                  /{requestType !== "stage_progression" ? 3 : 1}
                </span> required blocks populated
                <span className="sep">·</span>
                <span className="mono">{REQUEST_TYPE_CATALOG.find((t) => t.key === requestType)?.code}</span>
                <span className="sep">·</span>
                Urgency <span className="mono">{urgency}</span>
              </div>
              <div className="actions">
                <button className="rep-btn" onClick={closeApprovalDrawer} type="button">Cancel</button>
                <button className="rep-btn" onClick={runValidation} type="button">Validate</button>
                <button
                  className={validated === "ok" && submitPhase !== "submitted" ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
                  disabled={validated !== "ok" || isApprovalSubmitting || submitPhase === "submitted"}
                  onClick={submitApprovalRequest}
                  title={validated === "ok" ? "Submit approval request" : "Validate first and fix any errors"}
                  type="button"
                >
                  {submitPhase === "submitted" ? "Submitted" : "Submit request"}
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}

    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Header — simplified; one canonical place per fact
// ─────────────────────────────────────────────────────────────────────────

function OppHeader({
  approvalKey,
  canSubmit,
  hasActiveApproval,
  opportunity,
  overdueCount,
  stageBlocked,
  stageLabel,
  onAddActivity,
  onEditFields,
  onMoveStage,
  onSubmitApproval,
}: {
  approvalKey: string;
  canSubmit: boolean;
  hasActiveApproval: boolean;
  opportunity: OpportunityDetailType;
  overdueCount: number;
  stageBlocked: boolean;
  stageLabel: string;
  onAddActivity: () => void;
  onEditFields: () => void;
  onMoveStage: () => void;
  onSubmitApproval: () => void;
}) {
  return (
    <section className="opp-head-v2">
      <div className="opp-head-v2-main">
        {/* Title row */}
        <div className="opp-head-title-row">
          <span className="opp-kind">Opportunity</span>
          <h1 className="opp-title">{opportunity.title}</h1>
          <span className="opp-id">{opportunity.id}</span>
          <span className="rep-pill">
            <span className="dot" />
            {stageLabel}
          </span>
          {approvalKey !== "none" ? (
            <span className={`rep-pill p-${approvalKey}`}>
              <span className="dot" />
              {opportunity.approvalState.replace(/_/g, " ")}
            </span>
          ) : null}
          {/* Contextual alert badges — only shown when there is an issue */}
          {stageBlocked && approvalKey === "none" ? (
            <span className="opp-alert-badge warn">Stage locked</span>
          ) : null}
          {overdueCount > 0 ? (
            <span className="opp-alert-badge neg">{overdueCount} overdue</span>
          ) : null}
        </div>

        {/* Sub-header — CANONICAL location for owner / account / amount / close / contact
            These facts do not appear anywhere else in the main view. */}
        <div className="opp-head-sub">
          <span className="item">
            <span className="lbl">Owner</span>
            <span>{opportunity.owner.displayName}</span>
          </span>
          <span className="sep">·</span>
          <span className="item">
            <span className="lbl">Account</span>
            <span>{opportunity.account.name}</span>
          </span>
          <span className="sep">·</span>
          <span className="item">
            <span className="lbl">Amount</span>
            <span className="mono">{formatCurrency(opportunity.expectedAmount)}</span>
          </span>
          <span className="sep">·</span>
          <span className="item">
            <span className="lbl">Close</span>
            <span className="mono">{opportunity.closeDate ?? "—"}</span>
            {opportunity.closeDate ? (
              <span className="sub">({daysUntil(opportunity.closeDate)})</span>
            ) : null}
          </span>
          {opportunity.primaryContact ? (
            <>
              <span className="sep">·</span>
              <span className="item">
                <span className="lbl">Contact</span>
                <span>{opportunity.primaryContact.fullName}</span>
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Action bar */}
      <div className="opp-head-actions">
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
            className={canSubmit ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
            disabled={!canSubmit}
            onClick={onSubmitApproval}
            type="button"
          >
            Submit for approval
          </button>
        )}
        <button className="rep-btn" onClick={onEditFields} type="button">Edit fields</button>
        <button className="rep-btn" onClick={onMoveStage} type="button">Move stage</button>
        <button className="rep-btn" onClick={onAddActivity} type="button">+ Add activity</button>
        <div className="opp-head-env">
          <span>LOCAL PILOT</span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Stage path (logic unchanged)
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
  const targetStage  = popKey ? stages.find((s) => s.stageKey === popKey) : null;
  const targetIndex  = targetStage ? stages.indexOf(targetStage) : -1;

  let popTone: "ok" | "warn" | "blocked" = "ok";
  let popMark = "•";
  let popTitle = "OK to move";
  let popDescription = "";
  let popList: string[] = [];
  let popAction: { label: string; tone: "primary" | "warn"; stageKey: string } | null = null;

  if (targetStage) {
    if (targetStage.stageKey === currentStageKey) {
      popTone = "ok"; popMark = "•";
      popTitle = `Currently in ${targetStage.displayName}`;
      popDescription = "This is the active stage. No move needed.";
    } else if (targetIndex < currentIndex) {
      popTone = "warn"; popMark = "↺";
      popTitle = `Move backward to ${targetStage.displayName}?`;
      popDescription = "Reverting to an earlier stage is allowed but will be audit-logged.";
      popList = ["Active approval requests may be auto-cancelled by policy."];
      popAction = { label: "Move backward", tone: "warn", stageKey: targetStage.stageKey };
    } else if (targetIndex > currentIndex + 1) {
      popTone = "blocked"; popMark = "!";
      popTitle = `Cannot skip to ${targetStage.displayName}`;
      popDescription = "Stages must be promoted one at a time. Move through the next stage first.";
    } else if (targetStage.stageKey === "pending_approval") {
      popTone = "blocked"; popMark = "!";
      popTitle = `Move to ${targetStage.displayName} requires approval`;
      popDescription = "The local pilot backend blocks direct movement into Pending Approval. Submit an approval request instead.";
      popList = ["Use the approval drawer to route the opportunity through Finance / Legal."];
    } else if (approvalKey === "pending") {
      popTone = "blocked"; popMark = "!";
      popTitle = `Move to ${targetStage.displayName} is blocked`;
      popDescription = "Backend policy blocks stage movement while an approval request is pending.";
    } else if (approvalKey === "rejected") {
      popTone = "blocked"; popMark = "!";
      popTitle = `Move to ${targetStage.displayName} is blocked`;
      popDescription = "Backend policy blocks stage movement after rejection until the approval workflow is resolved.";
    } else if (missingRequiredCustom.length > 0) {
      popTone = "blocked"; popMark = "!";
      popTitle = `Move to ${targetStage.displayName} is blocked`;
      popDescription = "Tenant policy requires the following before this stage transition can be saved:";
      popList = missingRequiredCustom.map((f) => `Custom field ${f.fieldKey} is empty — required at later stage.`);
    } else {
      popTone = "ok"; popMark = "✓";
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
      <div className="opp-stages" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map((stage, index) => {
          const cellState =
            stage.stageKey === currentStageKey ? "current" :
            stage.isClosed && index < currentIndex ? "done" :
            stage.isClosed ? "closed" :
            index < currentIndex ? "done" : "future";
          return (
            <button
              className={`opp-stage-cell ${cellState}`}
              key={stage.stageKey}
              onClick={() => onClickStage(stage.stageKey)}
              type="button"
            >
              <div className="opp-stage-num">{String(index + 1).padStart(2, "0")} · {stage.stageKey}</div>
              <div className="opp-stage-label">{stage.displayName}</div>
              <div className="opp-stage-foot">
                {cellState === "current" ? "active" : cellState === "done" ? "✓ done" : cellState === "closed" ? "terminal" : "—"}
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
              <small>{String(targetIndex + 1).padStart(2, "0")} · {targetStage.displayName}</small>
            </div>
            <div className="opp-stagepop-desc">{popDescription}</div>
            {popList.length > 0 ? (
              <ul className="opp-stagepop-list">
                {popList.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            ) : null}
          </div>
          <div className="opp-stagepop-actions">
            {popAction ? (
              <button
                className={popAction.tone === "primary" ? "rep-btn rep-btn-primary" : "rep-btn"}
                disabled={isActionSubmitting}
                onClick={() => onConfirmMove(popAction.stageKey)}
                type="button"
              >
                {popAction.label}
              </button>
            ) : null}
            <button className="rep-btn" onClick={onClosePop} type="button">Close</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Activities panel (logic unchanged; completed collapsed by default)
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
  showCompleted,
  upcomingActivities,
  onChangeComposerDueDate,
  onChangeComposerKind,
  onChangeComposerTitle,
  onCloseComposer,
  onOpenComposer,
  onSubmitActivity,
  onToggleCompleted,
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
  showCompleted: boolean;
  upcomingActivities: ActivityListItem[];
  onChangeComposerDueDate: (v: string) => void;
  onChangeComposerKind: (v: string) => void;
  onChangeComposerTitle: (v: string) => void;
  onCloseComposer: () => void;
  onOpenComposer: () => void;
  onSubmitActivity: () => void;
  onToggleCompleted: () => void;
}) {
  return (
    <section className="opp-panel">
      <div className="opp-panel-head">
        <div className="opp-panel-title">
          Activities
          <em>{activities.length} total{overdueActivities.length > 0 ? ` · ${overdueActivities.length} overdue` : ""}</em>
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
            <select className="ctl" onChange={(e) => onChangeComposerKind(e.target.value)} value={composerKind}>
              <option value="task">Task</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="note">Note</option>
              <option value="meeting">Meeting</option>
            </select>
            <input className="ctl" onChange={(e) => onChangeComposerDueDate(e.target.value)} placeholder="YYYY-MM-DD" type="date" value={composerDueDate} />
            <input autoFocus className="ctl" onChange={(e) => onChangeComposerTitle(e.target.value)} placeholder="e.g. Send revised pricing sheet" value={composerTitle} />
          </div>
          <div className="opp-composer-foot">
            <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
              Linked to {opportunity.id} · {opportunity.account.id}
              {opportunity.primaryContact ? ` · ${opportunity.primaryContact.id}` : ""}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="rep-btn" onClick={onCloseComposer} type="button">Cancel</button>
              <button
                className={composerTitle.trim() ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
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
          <div className="opp-section-sub">Overdue <span>{overdueActivities.length}</span></div>
          <div className="opp-acts">
            {overdueActivities.map((a) => <ActivityRow activity={a} key={a.id} state="over" />)}
          </div>
        </>
      ) : null}

      <div className="opp-section-sub">Upcoming &amp; today <span>{upcomingActivities.length}</span></div>
      <div className="opp-acts">
        {upcomingActivities.length === 0 ? (
          <div className="rep-empty" style={{ padding: "20px 14px" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
              No upcoming activities. Use "+ Add activity" to log next steps.
            </div>
          </div>
        ) : (
          upcomingActivities.map((a) => <ActivityRow activity={a} key={a.id} state="upcoming" />)
        )}
      </div>

      {completedActivities.length > 0 ? (
        <div className="opp-section-sub">
          <button
            className="opp-collapse-toggle"
            onClick={onToggleCompleted}
            type="button"
          >
            {showCompleted ? "▾" : "▸"} Completed
          </button>
          <span>{completedActivities.length}</span>
        </div>
      ) : null}
      {showCompleted && completedActivities.length > 0 ? (
        <div className="opp-acts">
          {completedActivities.map((a) => <ActivityRow activity={a} key={a.id} state="done" />)}
        </div>
      ) : null}
    </section>
  );
}

function ActivityRow({ activity, state }: { activity: ActivityListItem; state: "over" | "upcoming" | "done" }) {
  const today = isToday(activity.dueDate);
  const timeClass = state === "over" ? "over" : today ? "today" : "";
  return (
    <div className="opp-act">
      <div className={`opp-act-time ${timeClass}`}>
        {state === "over" ? <><span>OVERDUE</span><br /></> : null}
        {activity.dueDate ?? "no date"}
      </div>
      <div>
        <div className="opp-act-title">
          <span className="opp-act-kind">{activity.type}</span>
          {activity.title}
          {state === "over" ? <span className="rep-pill p-overdue"><span className="dot" />overdue</span> : null}
          {today && state === "upcoming" ? <span className="rep-pill p-pending"><span className="dot" />today</span> : null}
        </div>
        <div className="opp-act-meta">{activity.type} · {activity.status}</div>
      </div>
      <div className="opp-act-actions">
        {state === "done"
          ? <span style={{ fontFamily: "ui-monospace,monospace", color: "var(--pos)", fontSize: "0.7rem" }}>✓ DONE</span>
          : <span style={{ fontFamily: "ui-monospace,monospace", color: "var(--muted)", fontSize: "0.7rem" }}>{activity.status}</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Approval summary — compact inline; full form is in the drawer
// ─────────────────────────────────────────────────────────────────────────

function ApprovalSummary({
  approvalKey,
  eligibleToSubmit,
  hasActiveApproval,
  opportunity,
  onOpenDrawer,
}: {
  approvalKey: string;
  eligibleToSubmit: boolean;
  hasActiveApproval: boolean;
  opportunity: OpportunityDetailType;
  onOpenDrawer: () => void;
}) {
  const activeApproval     = opportunity.activeApproval;
  const activeApprovalSla  = describeApprovalSla(activeApproval?.activeStepDueAt);

  return (
    <section className="opp-panel">
      <div className="opp-panel-head">
        <div className="opp-panel-title">
          Approval
          <em>{approvalKey === "none" ? "no active request" : opportunity.approvalState.replace(/_/g, " ")}</em>
        </div>
        <div className="opp-panel-actions">
          {eligibleToSubmit ? (
            <button className="rep-btn rep-btn-primary" onClick={onOpenDrawer} type="button">
              Submit for approval →
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
              ? `REQ ${compactId(activeApproval.id)} · ${activeApproval.approverRoleKey.replace(/_/g, " ")} · ${activeApprovalSla.label}`
              : hasActiveApproval
                ? `Active on ${opportunity.id} — wait for decision before resubmitting`
                : approvalKey === "approved"
                  ? "Decision recorded against this opportunity"
                  : approvalKey === "rejected"
                    ? "Rejected — review feedback and consider revised terms"
                    : eligibleToSubmit
                      ? "Open the submission drawer to route to Finance / Legal"
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

      {hasActiveApproval ? (
        <div className="opp-blocked" style={{ margin: 14 }}>
          <div className="opp-blocked-mark">!</div>
          <div>
            <div className="l">Submission blocked</div>
            <div className="t">An active approval request already exists on this opportunity</div>
            <div className="ds">
              {activeApproval ? (
                <>
                  <strong>{activeApproval.id}</strong> is routed to <strong>{activeApproval.approverRoleKey.replace(/_/g, " ")}</strong> with SLA{" "}
                  <strong>{activeApprovalSla.label}</strong>. Policy does not allow more than one active request. Wait for the current decision before resubmitting.
                </>
              ) : (
                <>
                  {opportunity.id} has an approval request in state <strong>{opportunity.approvalState.replace(/_/g, " ")}</strong>. Wait for the current decision.
                </>
              )}
            </div>
          </div>
          <span style={{ fontFamily: "ui-monospace,monospace", color: "#9a3a2f", fontSize: "0.7rem" }}>HARD-BLOCK</span>
        </div>
      ) : null}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Audit timeline — used inside <details> accordion
// ─────────────────────────────────────────────────────────────────────────

function AuditTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rep-empty" style={{ padding: "20px 14px" }}>
        <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
          No audit events available for this opportunity in the current API response.
        </div>
      </div>
    );
  }
  return (
    <div className="opp-timeline">
      {events.map((event, i) => (
        <div className="opp-tl-item" key={`${event.at}-${i}`}>
          <div className="opp-tl-time">
            {event.at.slice(11, 16) || event.at}
            {event.at.length >= 10 ? <small>{event.at.slice(0, 10)}</small> : null}
          </div>
          <div className={`opp-tl-node ${event.type}`} />
          <div>
            <div className="opp-tl-title">{event.title}<span className="opp-tl-code">{event.code}</span></div>
            <div className="opp-tl-desc">{event.description}</div>
          </div>
          <div className="opp-tl-by">{event.actor}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Edit fields drawer body
// ─────────────────────────────────────────────────────────────────────────

function EditFieldsBody({
  customFields,
  customFieldCount,
  draftAmount,
  draftClose,
  draftCustom,
  draftTitle,
  editError,
  isActionSubmitting,
  opportunity,
  showAllCustomFields,
  stageLabel,
  onChangeAmount,
  onChangeClose,
  onChangeCustom,
  onChangeTitle,
  onToggleShowAll,
}: {
  customFields: MetadataFieldDefinitionItem[];
  customFieldCount: number;
  draftAmount: string;
  draftClose: string;
  draftCustom: Record<string, string>;
  draftTitle: string;
  editError: string | null;
  isActionSubmitting: boolean;
  opportunity: OpportunityDetailType;
  showAllCustomFields: boolean;
  stageLabel: string;
  onChangeAmount: (v: string) => void;
  onChangeClose: (v: string) => void;
  onChangeCustom: (key: string, v: string) => void;
  onChangeTitle: (v: string) => void;
  onToggleShowAll: () => void;
}) {
  const VISIBLE_CUSTOM = 4;
  const visibleCustom = showAllCustomFields ? customFields : customFields.slice(0, VISIBLE_CUSTOM);
  const hiddenCount = customFields.length - VISIBLE_CUSTOM;

  return (
    <div className="rep-drawer-body">
      {editError ? <div className="rep-form-error" style={{ marginBottom: 12 }}>{editError}</div> : null}

      <div className="opp-section-sub">Standard fields <span>6</span></div>
      <div className="opp-fields">
        <FieldRow editing label="Title">
          <input className="opp-field-input" onChange={(e) => onChangeTitle(e.target.value)} value={draftTitle} />
        </FieldRow>
        <FieldRow editing label="Expected amount">
          <input className="opp-field-input" inputMode="decimal" onChange={(e) => onChangeAmount(e.target.value)} value={draftAmount} />
        </FieldRow>
        <FieldRow editing label="Close date">
          <input className="opp-field-input" onChange={(e) => onChangeClose(e.target.value)} placeholder="YYYY-MM-DD" type="date" value={draftClose} />
        </FieldRow>
        <FieldRow label="Stage">
          <span className="rep-pill"><span className="dot" />{stageLabel}</span>
          <small>· use Move stage to change</small>
        </FieldRow>
        <FieldRow label="Owner">
          {opportunity.owner.displayName}
          <small>· {opportunity.owner.id}</small>
        </FieldRow>
        <FieldRow label="Primary contact">
          {opportunity.primaryContact ? (
            <>{opportunity.primaryContact.fullName}<small>· {opportunity.primaryContact.id}</small></>
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
            {visibleCustom.map((field) => {
              const value   = opportunity.customFields[field.fieldKey];
              const missing = field.isRequiredDefault && isEmpty(value);
              return (
                <FieldRow
                  editing
                  hint={missing ? "Required by tenant policy — populate before later-stage promotion." : undefined}
                  key={field.id}
                  label={field.label}
                  missing={missing}
                  tag={field.isRequiredDefault ? "required" : "custom"}
                >
                  <CustomFieldEditor
                    field={field}
                    onChange={(v) => onChangeCustom(field.fieldKey, v)}
                    value={draftCustom[field.fieldKey] ?? ""}
                  />
                </FieldRow>
              );
            })}
          </div>
          {hiddenCount > 0 ? (
            <div style={{ padding: "8px 14px", borderTop: "1px solid var(--hairline)" }}>
              <button className="rep-btn rep-btn-ghost" onClick={onToggleShowAll} type="button" style={{ fontSize: "0.78rem" }}>
                {showAllCustomFields ? `Show fewer fields` : `Show all ${customFieldCount} fields (+${hiddenCount} more)`}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="opp-fields-foot">
        <div>
          <span className="legend"><span className="opp-field-tag cust">CUSTOM</span> tenant-defined</span>
          <span className="legend"><span className="opp-field-tag req">REQUIRED</span> populate before promote</span>
        </div>
        <span className="mono" style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
          changes audit-logged
        </span>
      </div>
    </div>
  );
}

function FieldRow({
  children, editing, hint, label, missing, tag,
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
        {tag === "custom"   ? <span className="opp-field-tag cust">CUSTOM</span>    : null}
        {tag === "required" ? <span className="opp-field-tag req">REQUIRED</span> : null}
      </div>
      <div className="opp-field-v">{children}</div>
      {hint ? <div className="opp-field-hint">{hint}</div> : null}
    </div>
  );
}

function CustomFieldEditor({ field, onChange, value }: {
  field: MetadataFieldDefinitionItem;
  onChange: (v: string) => void;
  value: string;
}) {
  if (field.fieldType === "long_text")
    return <textarea className="opp-field-input" onChange={(e) => onChange(e.target.value)} rows={3} style={{ fontFamily: "inherit" }} value={value} />;
  if (field.fieldType === "single_select")
    return (
      <select className="opp-field-input" onChange={(e) => onChange(e.target.value)} style={{ fontFamily: "inherit" }} value={value}>
        <option value="">None</option>
        {field.selectOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  if (field.fieldType === "boolean")
    return (
      <select className="opp-field-input" onChange={(e) => onChange(e.target.value)} style={{ fontFamily: "inherit" }} value={value}>
        <option value="">None</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  return (
    <input
      className="opp-field-input"
      inputMode={field.fieldType === "number" || field.fieldType === "currency" ? "decimal" : undefined}
      onChange={(e) => onChange(e.target.value)}
      type={field.fieldType === "date" ? "date" : "text"}
      value={value}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Approval drawer — full guided submission form
// ─────────────────────────────────────────────────────────────────────────

function ApprovalForm({
  competition,
  customerImpact,
  isApprovalSubmitting,
  justification,
  opportunity,
  requestType,
  stageLabel,
  submitPhase,
  supportingNotes,
  urgency,
  validated,
  validationErrors,
  onChangeCompetition,
  onChangeCustomerImpact,
  onChangeJustification,
  onChangeRequestType,
  onChangeSupportingNotes,
  onChangeUrgency,
}: {
  competition: string;
  customerImpact: string;
  isApprovalSubmitting: boolean;
  justification: string;
  opportunity: OpportunityDetailType;
  requestType: RequestTypeKey;
  stageLabel: string;
  submitPhase: SubmitPhase;
  supportingNotes: string;
  urgency: Urgency;
  validated: ValidatedState;
  validationErrors: Record<string, string>;
  onChangeCompetition: (v: string) => void;
  onChangeCustomerImpact: (v: string) => void;
  onChangeJustification: (v: string) => void;
  onChangeRequestType: (v: RequestTypeKey) => void;
  onChangeSupportingNotes: (v: string) => void;
  onChangeUrgency: (v: Urgency) => void;
}) {
  const selectedType          = REQUEST_TYPE_CATALOG.find((t) => t.key === requestType) ?? REQUEST_TYPE_CATALOG[0];
  const requiresExceptionFields = requestType !== "stage_progression";

  return (
    <div className="rep-drawer-body">
      {/* Process step strip */}
      <div className="opp-process">
        <ProcessStep label="Fill request"    foot="type · justification · urgency"         num="01" phaseKey="draft"    submitPhase={submitPhase} />
        <ProcessStep label="Validate policy" foot="required fields · policy preview"        num="02" phaseKey="validate" submitPhase={submitPhase} />
        <ProcessStep label="Submit & route"  foot="snapshot frozen · audit written"         num="03" phaseKey="submit"   submitPhase={submitPhase} />
        <ProcessStep label="Decision"        foot="approve · reject · send back"            num="04" phaseKey="decision" submitPhase={submitPhase} />
      </div>

      {/* Frozen snapshot */}
      <div className="opp-section-sub">Frozen snapshot <span>captured at submit</span></div>
      <div className="opp-snap">
        <SnapCell label="Opportunity"     value={opportunity.title}                        mono={opportunity.id} />
        <SnapCell label="Account"         value={opportunity.account.name}                 mono={opportunity.account.id} />
        <SnapCell label="Primary contact" value={opportunity.primaryContact?.fullName ?? "None"} mono={opportunity.primaryContact?.id} />
        <SnapCell label="Owner"           value={opportunity.owner.displayName}            mono={opportunity.owner.id} />
        <SnapCell label="Stage at submit" value={stageLabel}                               mono={opportunity.stageKey} />
        <SnapCell label="Amount"          num value={formatCurrency(opportunity.expectedAmount)} />
        <SnapCell label="Close date"      mono={opportunity.closeDate ?? "—"}              value={opportunity.closeDate ? daysUntil(opportunity.closeDate) : "—"} />
        <SnapCell label="Type"            value={selectedType.name}                        mono={selectedType.code} />
      </div>

      {/* Form */}
      <div className="opp-submit-form">
        {/* Request type */}
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
          {validationErrors.requestType ? <div className="err-msg" style={{ marginTop: 8 }}>! {validationErrors.requestType}</div> : null}
        </div>

        {/* Justification */}
        <div className={`opp-form-field ${validationErrors.justification ? "err" : ""}`}>
          <label>
            <span>Business justification <span className="req">*</span></span>
            <span style={{ fontFamily: "ui-monospace,monospace", color: "var(--muted)" }}>{justification.length} / 1000</span>
          </label>
          <textarea maxLength={1000} onChange={(e) => onChangeJustification(e.target.value)} placeholder="Why is this exception necessary? Include strategic, competitive and customer-relationship context." value={justification} />
          {validationErrors.justification
            ? <div className="err-msg">! {validationErrors.justification}</div>
            : <div className="hint">Approvers will read this verbatim. Aim for ≥ 40 characters of business context.</div>}
        </div>

        {/* Exception-only fields */}
        {requiresExceptionFields ? (
          <>
            <div className={`opp-form-field ${validationErrors.customerImpact ? "err" : ""}`}>
              <label><span>Customer impact <span className="req">*</span></span></label>
              <textarea onChange={(e) => onChangeCustomerImpact(e.target.value)} placeholder="What happens to the customer relationship if this exception is not granted?" value={customerImpact} />
              {validationErrors.customerImpact ? <div className="err-msg">! {validationErrors.customerImpact}</div> : null}
            </div>
            <div className={`opp-form-field ${validationErrors.competition ? "err" : ""}`}>
              <label><span>Competitive situation <span className="req">*</span></span></label>
              <textarea onChange={(e) => onChangeCompetition(e.target.value)} placeholder="Named competitor, observed offer / rebate, customer commitment, deal pressure." value={competition} />
              {validationErrors.competition ? <div className="err-msg">! {validationErrors.competition}</div> : null}
            </div>
          </>
        ) : null}

        {/* Urgency */}
        <div className="opp-form-field">
          <label><span>Urgency <span className="req">*</span></span></label>
          <div className="opp-urgency-row">
            {URGENCY_OPTIONS.map((opt) => (
              <button className={`opp-urgency-opt ${urgency === opt.key ? "on" : ""}`} key={opt.key} onClick={() => onChangeUrgency(opt.key)} type="button">
                <span className="nm">{opt.name}</span>
                <span className="lbl">SLA · {opt.sla}</span>
              </button>
            ))}
          </div>
          <div className="hint">Approver SLA target adjusts to urgency. Critical alerts approvers immediately.</div>
        </div>

        {/* Supporting notes */}
        <div className="opp-form-field">
          <label><span>Supporting notes</span><span style={{ fontFamily: "ui-monospace,monospace", color: "var(--muted)" }}>optional</span></label>
          <textarea onChange={(e) => onChangeSupportingNotes(e.target.value)} placeholder="Internal context only. Not visible to the customer." value={supportingNotes} />
        </div>
      </div>

      {/* Validation banners */}
      {validated === "err" ? (
        <div className="opp-v-banner err" role="alert">
          <div className="opp-v-banner-mark">!</div>
          <div>
            <div className="t">Validation failed — {Object.keys(validationErrors).length} field{Object.keys(validationErrors).length === 1 ? "" : "s"} need attention</div>
            <div className="s">Fix the highlighted fields and run Validate again.</div>
          </div>
          <span className="rep-pill p-rejected"><span className="dot" />blocked</span>
        </div>
      ) : null}
      {validated === "ok" && submitPhase !== "submitted" ? (
        <div className="opp-v-banner ok">
          <div className="opp-v-banner-mark">✓</div>
          <div>
            <div className="t">Ready to submit · {selectedType.code} policy matched</div>
            <div className="s">All required fields populated. Submitting will freeze the snapshot, route to Finance, and lock stage promotion.</div>
          </div>
          <span className="rep-pill p-approved"><span className="dot" />ready</span>
        </div>
      ) : null}
      {submitPhase === "submitted" ? (
        <div className="opp-v-banner ok">
          <div className="opp-v-banner-mark">✓</div>
          <div>
            <div className="t">Approval request submitted · routed to Finance</div>
            <div className="s">Snapshot frozen at submit. Approval state will update when the chain decides.</div>
          </div>
          <span className="rep-pill p-pending"><span className="dot" />pending</span>
        </div>
      ) : null}

      {/* Approval chain preview */}
      <div className="opp-section-sub">Approval chain · preview <span>sequential</span></div>
      <div className="opp-chain">
        <ChainStep badge="Submit"   name="Submitted by you"  status="done" step="01" sla="Snapshot is captured and request becomes immutable."                                                          who={`${opportunity.owner.displayName} · on submit`} />
        <ChainStep badge="In review" name="Finance review"   status="cur"  step="02" sla="Reviews requested change. May approve, reject, or send back with comments."                                   who="Finance approver · SLA 24h" />
        <ChainStep badge={requestType === "terms_exception" ? "Required" : "Conditional"} name="Legal review" status="fut" step="03" sla="Cannot decide until Finance completes. Reviews terms and legal carve-outs." who="Legal approver · waits for FIN" />
        <ChainStep badge="Auto"     name="Final decision"    status="fut"  step="04" sla="Outcome is auto-applied to this opportunity and written to the audit trail."                                   who="auto · once all required steps decide" />
      </div>
    </div>
  );
}

function ProcessStep({ foot, label, num, phaseKey, submitPhase }: {
  foot: string; label: string; num: string;
  phaseKey: "draft" | "validate" | "submit" | "decision";
  submitPhase: SubmitPhase;
}) {
  const cls =
    submitPhase === "submitted" ? (phaseKey === "decision" ? "cur" : "done") :
    submitPhase === "validated" ? (phaseKey === "draft" ? "done" : phaseKey === "validate" ? "cur" : "fut") :
    phaseKey === "draft" ? "cur" : "fut";
  return (
    <div className={`opp-process-step ${cls}`}>
      <div className="opp-process-num"><span className="dot" />{num} · {phaseKey.toUpperCase()}</div>
      <div className="opp-process-label">{label}</div>
      <div className="opp-process-foot">{foot}</div>
    </div>
  );
}

function SnapCell({ label, mono, num, value }: { label: string; mono?: string; num?: boolean; value: string }) {
  return (
    <div className="opp-snap-cell">
      <div className="l">{label}</div>
      <div className={`v${num ? " num" : ""}`}>
        {value}
        {mono ? <small style={{ fontFamily: "ui-monospace,monospace" }}>· {mono}</small> : null}
      </div>
    </div>
  );
}

function ChainStep({ badge, name, sla, status, step, who }: {
  badge: string; name: string; sla: string;
  status: "done" | "cur" | "fut"; step: string; who: string;
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
// Read-only deal overview — essential + custom fields, no editing
// Standard editable fields shown here (title/amount/close) since the header
// sub-row is compact inline text; this gives a structured inspection surface.
// Stage/owner/account/contact NOT repeated — they are in the header.
// ─────────────────────────────────────────────────────────────────────────

function DealOverview({
  customFields,
  missingRequiredCustom,
  opportunity,
  showAllCustomFields,
  onEditFields,
  onToggleShowAll,
}: {
  customFields: MetadataFieldDefinitionItem[];
  missingRequiredCustom: MetadataFieldDefinitionItem[];
  opportunity: OpportunityDetailType;
  showAllCustomFields: boolean;
  onEditFields: () => void;
  onToggleShowAll: () => void;
}) {
  const VISIBLE_CUSTOM = 4;
  const visibleCustom  = showAllCustomFields ? customFields : customFields.slice(0, VISIBLE_CUSTOM);
  const hiddenCount    = Math.max(0, customFields.length - VISIBLE_CUSTOM);

  return (
    <section className="opp-panel">
      <div className="opp-panel-head">
        <div className="opp-panel-title">
          Deal fields
          <em>3 standard · {customFields.length} custom</em>
        </div>
        <div className="opp-panel-actions">
          <button className="rep-btn" onClick={onEditFields} type="button">Edit fields ›</button>
        </div>
      </div>

      {missingRequiredCustom.length > 0 ? (
        <div className="opp-missing-banner">
          <span className="mark">!</span>
          <span>
            {missingRequiredCustom.length} required field{missingRequiredCustom.length === 1 ? "" : "s"} empty —
            populate before later-stage promotion:{" "}
            <span className="mono">{missingRequiredCustom.map((f) => f.fieldKey).join(", ")}</span>
          </span>
        </div>
      ) : null}

      {/* Standard editable fields — title/amount/close in structured form.
          Stage is read-only (stage path). Owner/account/contact are in header. */}
      <div className="opp-section-sub">Standard <span>editable</span></div>
      <div className="opp-ov-fields">
        <div className="opp-ov-row">
          <span className="l">Title</span>
          <span className="v">{opportunity.title}</span>
        </div>
        <div className="opp-ov-row">
          <span className="l">Amount</span>
          <span className="v mono">{formatCurrency(opportunity.expectedAmount)}</span>
        </div>
        <div className="opp-ov-row">
          <span className="l">Close date</span>
          <span className="v">
            <span className="mono">{opportunity.closeDate ?? "—"}</span>
            {opportunity.closeDate ? <small> · {daysUntil(opportunity.closeDate)}</small> : null}
          </span>
        </div>
      </div>

      {customFields.length > 0 ? (
        <>
          <div className="opp-section-sub">Custom fields <span>{customFields.length}</span></div>
          <div className="opp-ov-fields">
            {visibleCustom.map((field) => {
              const value   = opportunity.customFields[field.fieldKey];
              const missing = field.isRequiredDefault && isEmpty(value);
              return (
                <div className={`opp-ov-row${missing ? " missing" : ""}`} key={field.id}>
                  <span className="l">
                    {field.label}
                    {field.isRequiredDefault
                      ? <span className="opp-field-tag req">REQ</span>
                      : <span className="opp-field-tag cust">C</span>}
                  </span>
                  <span className={`v${missing ? " empty" : ""}`}>
                    <FieldValue field={field} value={value} />
                  </span>
                </div>
              );
            })}
          </div>
          {hiddenCount > 0 ? (
            <div style={{ padding: "8px 14px", borderTop: "1px solid var(--hairline)" }}>
              <button className="rep-btn rep-btn-ghost" onClick={onToggleShowAll} type="button" style={{ fontSize: "0.78rem" }}>
                {showAllCustomFields
                  ? "Show fewer fields"
                  : `Show all ${customFields.length} fields (+${hiddenCount} more)`}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Account context panel — IDs only; names are in the header (one canonical
// location per fact). This panel adds only reference IDs not shown elsewhere.
// ─────────────────────────────────────────────────────────────────────────

function AccountContextPanel({ opportunity }: { opportunity: OpportunityDetailType }) {
  return (
    <section className="opp-panel">
      <div className="opp-panel-head">
        <div className="opp-panel-title">Record IDs <em>reference</em></div>
      </div>
      <div className="opp-ctx-ids">
        <div className="opp-ctx-id-row">
          <div className="mark">AC</div>
          <div>
            <div className="l">Account</div>
            <div className="v mono">{opportunity.account.id}</div>
          </div>
        </div>
        {opportunity.primaryContact ? (
          <div className="opp-ctx-id-row">
            <div className="mark">CT</div>
            <div>
              <div className="l">Primary contact</div>
              <div className="v mono">{opportunity.primaryContact.id}</div>
            </div>
          </div>
        ) : null}
        <div className="opp-ctx-id-row current">
          <div className="mark">OP</div>
          <div>
            <div className="l">Opportunity</div>
            <div className="v mono">{opportunity.id}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Manager panel (unchanged — role-aware, rep sees locked state)
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
  onChangeNewOwnerId: (v: string) => void;
  onReassign: () => void;
}) {
  return (
    <section className="opp-mgr-block">
      <div className="opp-mgr-head">
        <div className="opp-panel-title">Manager actions <em>role · {roleKey.toUpperCase()}</em></div>
        {canReassignOwner
          ? <span className="rep-pill p-approved"><span className="dot" />unlocked</span>
          : <span className="rep-pill p-pending"><span className="dot" />locked</span>}
      </div>
      {!canReassignOwner ? (
        <div className="opp-mgr-locked">
          <div className="opp-mgr-lock-mark">🔒</div>
          <div>
            <div className="t">Available only to Sales Manager / RevOps Admin</div>
            <div className="s">Your role ({roleKey.toUpperCase()}) can view these actions but cannot execute them.</div>
          </div>
        </div>
      ) : null}
      <div className="opp-mgr-actions">
        <div className={`opp-mgr-action ${canReassignOwner ? "" : "locked"}`}>
          <div className="mark">RO</div>
          <div>
            <div className="nm">Reassign owner</div>
            <div className="ds">Move this opportunity to a different rep. Updates ownership visibility and writes an audit event.</div>
            {canReassignOwner ? (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input onChange={(e) => onChangeNewOwnerId(e.target.value)} placeholder="user id of new owner" value={newOwnerId} />
                <button
                  className={newOwnerId.trim() ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
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
          <div><div className="nm">Add manager note</div><div className="ds">Internal note · not visible to approvers (planned for Phase 4).</div></div>
          <div className="lock">PLANNED</div>
        </div>
        <div className="opp-mgr-action locked">
          <div className="mark">RU</div>
          <div><div className="nm">Request update from owner</div><div className="ds">Notify owner to refresh stage / next step (planned for Phase 4).</div></div>
          <div className="lock">PLANNED</div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers (all unchanged)
// ─────────────────────────────────────────────────────────────────────────

type AuditEvent = { at: string; actor: string; type: string; code: string; title: string; description: string };

function normalizeApprovalState(state: string): string {
  return state.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function isEmpty(value: CustomFieldValue | undefined): boolean {
  return value === null || value === undefined || value === "";
}

function isActivityCompleted(activity: ActivityListItem): boolean {
  const s = activity.status.toLowerCase();
  return s === "completed" || s === "done" || s === "closed";
}

function isActivityOverdue(activity: ActivityListItem): boolean {
  if (!activity.dueDate) return false;
  const dueMs = Date.parse(activity.dueDate);
  if (Number.isNaN(dueMs)) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return dueMs < today.getTime();
}

function isToday(value: string | null): boolean {
  if (!value) return false;
  const dueMs = Date.parse(value);
  if (Number.isNaN(dueMs)) return false;
  const today = new Date();
  const due   = new Date(dueMs);
  return today.getFullYear() === due.getFullYear() && today.getMonth() === due.getMonth() && today.getDate() === due.getDate();
}

function daysUntil(value: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return "—";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days  = Math.round((ms - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days < 0)  return `${Math.abs(days)} d ago`;
  return `${days} d`;
}

function describeApprovalSla(value: string | null | undefined): { label: string } {
  if (!value)                    return { label: "No SLA set" };
  const dueMs = Date.parse(value);
  if (Number.isNaN(dueMs))       return { label: "SLA invalid" };
  const diffMs  = dueMs - Date.now();
  const absHours = Math.max(1, Math.round(Math.abs(diffMs) / 3_600_000));
  if (diffMs < 0)                return { label: `Overdue by ${absHours}h` };
  if (diffMs <= 24 * 3_600_000)  return { label: `Due in ${absHours}h` };
  const days = Math.max(1, Math.round(diffMs / 86_400_000));
  return { label: `Due in ${days}d` };
}

function compactId(value: string): string { return value.slice(0, 8); }

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" }).format(value);
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
    if (rawValue === undefined || rawValue === "") return result;
    if (field.fieldType === "number" || field.fieldType === "currency") { result[field.fieldKey] = Number(rawValue); return result; }
    if (field.fieldType === "boolean") { result[field.fieldKey] = rawValue === "true"; return result; }
    result[field.fieldKey] = rawValue;
    return result;
  }, {});
}

function parseTimeline(timeline: unknown[]): AuditEvent[] {
  if (!Array.isArray(timeline)) return [];
  return timeline.map((raw): AuditEvent | null => {
    if (!raw || typeof raw !== "object") return null;
    const e = raw as Record<string, unknown>;
    const at     = typeof e.at === "string" ? e.at : typeof e.createdAt === "string" ? e.createdAt : typeof e.timestamp === "string" ? e.timestamp : "";
    const actorRaw = e.actor ?? e.by ?? e.user;
    const actor  = typeof actorRaw === "string" ? actorRaw : actorRaw && typeof actorRaw === "object" && "displayName" in actorRaw ? String((actorRaw as { displayName: unknown }).displayName ?? "") : "";
    const type   = typeof e.type === "string" ? e.type : typeof e.eventType === "string" ? e.eventType : "";
    const code   = typeof e.code === "string" ? e.code : typeof e.eventCode === "string" ? e.eventCode : type ? type.toUpperCase() : "";
    const title  = typeof e.title === "string" ? e.title : typeof e.summary === "string" ? e.summary : code || "Event";
    const description = typeof e.description === "string" ? e.description : typeof e.message === "string" ? e.message : "";
    return { actor: actor || "system", at, code: code || "EVENT", description, title, type: classifyEventType(type, code) };
  }).filter((e): e is AuditEvent => e !== null).sort((a, b) => (a.at < b.at ? 1 : -1));
}

function classifyEventType(type: string, code: string): string {
  const h = `${type} ${code}`.toLowerCase();
  if (h.includes("stage"))                          return "stage";
  if (h.includes("appr"))                           return "appr";
  if (h.includes("field") || h.includes("update"))  return "field";
  if (h.includes("activity") || h.includes("act"))  return "act";
  if (h.includes("create"))                         return "create";
  return "";
}
