import type { OpportunityDetail as OpportunityDetailType } from "../../types/crm";
import {
  REQUEST_TYPE_CATALOG,
  compactId,
  describeApprovalSla,
  formatCurrency,
  type RequestTypeKey,
  type SubmitPhase,
  type Urgency,
  type ValidatedState,
} from "./OpportunityDetailShared";

const URGENCY_OPTIONS: { key: Urgency; name: string; sla: string }[] = [
  { key: "routine", name: "Routine", sla: "≥ 7d" },
  { key: "normal", name: "Normal", sla: "3–5d" },
  { key: "high", name: "High", sla: "48h" },
  { key: "critical", name: "Critical", sla: "24h" },
];

/** Inline status block shown in the Approval tab. The submit form itself now
 *  lives in a right-side drawer (see SubmitApprovalDrawer). */
export function ApprovalStatusBody({
  approvalKey,
  eligibleToSubmit,
  opportunity,
  submitFlowOpen,
  onCancelFlow,
  onOpenFlow,
}: {
  approvalKey: string;
  eligibleToSubmit: boolean;
  opportunity: OpportunityDetailType;
  submitFlowOpen: boolean;
  onCancelFlow: () => void;
  onOpenFlow: () => void;
}) {
  const hasActiveApproval = approvalKey === "pending" || opportunity.activeApproval !== null;
  const activeApproval = opportunity.activeApproval;
  const activeApprovalSla = describeApprovalSla(activeApproval?.activeStepDueAt);
  const activeApprovalLabel = activeApproval
    ? `REQ ${compactId(activeApproval.id)} · ${activeApproval.approverRoleKey.replace(/_/g, " ")}`
    : null;

  return (
    <>
      <div className={`opp-appr-banner ${approvalKey}`}>
        <div className="opp-appr-banner-mark">{approvalKey === "approved" ? "✓" : approvalKey === "rejected" ? "✕" : "!"}</div>
        <div className="opp-appr-banner-body">
          <div className="l">Approval state</div>
          <div className="v">{approvalKey === "none" ? "No active request" : opportunity.approvalState.replace(/_/g, " ")}</div>
          <div className="sub">
            {activeApproval
              ? `${activeApprovalLabel} · ${activeApprovalSla.label}`
              : hasActiveApproval
                ? "Active request — wait for the decision before resubmitting"
                : approvalKey === "approved"
                  ? "Decision recorded against this opportunity"
                  : approvalKey === "rejected"
                    ? "Rejected — review feedback and consider revised commercial terms"
                    : eligibleToSubmit
                      ? "Use “Submit for approval” to route this opportunity to Finance / Legal"
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
                  <strong>{activeApproval.id}</strong> is currently routed to <strong>{activeApproval.approverRoleKey.replace(/_/g, " ")}</strong> with SLA{" "}
                  <strong>{activeApprovalSla.label}</strong>. Policy does not allow more than one active request per opportunity. Wait for the current decision before resubmitting.
                </>
              ) : (
                <>
                  {opportunity.id} currently has an approval request in state <strong>{opportunity.approvalState.replace(/_/g, " ")}</strong>. Policy does not allow more than one active request per opportunity. Wait for the current decision, or — if you are the submitter and the backend supports it — withdraw and resubmit.
                </>
              )}
            </div>
          </div>
          <span style={{ fontFamily: "ui-monospace, monospace", color: "#9a3a2f", fontSize: "0.7rem" }}>HARD-BLOCK</span>
        </div>
      ) : null}
    </>
  );
}

/** The guided submit-for-approval form. Rendered inside a right-side drawer. */
export function SubmitApprovalFormBody({
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
  onCancelFlow,
  onChangeCompetition,
  onChangeCustomerImpact,
  onChangeJustification,
  onChangeRequestType,
  onChangeSupportingNotes,
  onChangeUrgency,
  onSubmit,
  onValidate,
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
  onCancelFlow: () => void;
  onChangeCompetition: (value: string) => void;
  onChangeCustomerImpact: (value: string) => void;
  onChangeJustification: (value: string) => void;
  onChangeRequestType: (value: RequestTypeKey) => void;
  onChangeSupportingNotes: (value: string) => void;
  onChangeUrgency: (value: Urgency) => void;
  onSubmit: () => void;
  onValidate: () => void;
}) {
  const selectedType = REQUEST_TYPE_CATALOG.find((type) => type.key === requestType) ?? REQUEST_TYPE_CATALOG[0];
  const requiresExceptionFields = requestType !== "stage_progression";
  const requiredCount = requiresExceptionFields ? 3 : 1;
  const filled = [
    justification.trim().length >= 40,
    requiresExceptionFields ? customerImpact.trim().length >= 20 : null,
    requiresExceptionFields ? competition.trim().length >= 20 : null,
  ].filter((value) => value !== null) as boolean[];
  const filledCount = filled.filter(Boolean).length;

  return (
    <>
      <div className="opp-process">
        <ProcessStep foot="type · justification · urgency" label="Fill request" num="01" phaseKey="draft" submitPhase={submitPhase} />
        <ProcessStep foot="required fields · policy preview" label="Validate policy" num="02" phaseKey="validate" submitPhase={submitPhase} />
        <ProcessStep foot="snapshot frozen · audit written" label="Submit & route" num="03" phaseKey="submit" submitPhase={submitPhase} />
        <ProcessStep foot="approve · reject · send back" label="Decision" num="04" phaseKey="decision" submitPhase={submitPhase} />
      </div>

      <div className="opp-section-sub">Frozen snapshot <span>captured at submit</span></div>
      <div className="opp-snap">
        <SnapCell label="Opportunity" value={opportunity.title} mono={opportunity.id} />
        <SnapCell label="Account" value={opportunity.account.name} mono={opportunity.account.id} />
        <SnapCell label="Primary contact" value={opportunity.primaryContact?.fullName ?? "None"} mono={opportunity.primaryContact?.id} />
        <SnapCell label="Owner" value={opportunity.owner.displayName} mono={opportunity.owner.id} />
        <SnapCell label="Stage at submit" value={stageLabel} mono={opportunity.stageKey} />
        <SnapCell label="Amount" num value={formatCurrency(opportunity.expectedAmount)} />
        <SnapCell label="Close date" mono={opportunity.closeDate ?? "—"} value={opportunity.closeDate ? daysUntil(opportunity.closeDate) : "—"} />
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
          {validationErrors.requestType ? <div className="err-msg" style={{ marginTop: 8 }}>! {validationErrors.requestType}</div> : null}
        </div>

        <div className={`opp-form-field ${validationErrors.justification ? "err" : ""}`}>
          <label>
            <span>Business justification <span className="req">*</span></span>
            <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--muted)" }}>{justification.length} / 1000</span>
          </label>
          <textarea maxLength={1000} onChange={(event) => onChangeJustification(event.target.value)} placeholder="Why is this exception necessary? Include strategic, competitive and customer-relationship context." value={justification} />
          {validationErrors.justification ? <div className="err-msg">! {validationErrors.justification}</div> : <div className="hint">Approvers will read this verbatim. Aim for ≥ 40 characters of business context.</div>}
        </div>

        {requestType !== "stage_progression" ? (
          <>
            <div className={`opp-form-field ${validationErrors.customerImpact ? "err" : ""}`}>
              <label><span>Customer impact <span className="req">*</span></span></label>
              <textarea onChange={(event) => onChangeCustomerImpact(event.target.value)} placeholder="What happens to the customer relationship if this exception is not granted?" value={customerImpact} />
              {validationErrors.customerImpact ? <div className="err-msg">! {validationErrors.customerImpact}</div> : null}
            </div>

            <div className={`opp-form-field ${validationErrors.competition ? "err" : ""}`}>
              <label><span>Competitive situation <span className="req">*</span></span></label>
              <textarea onChange={(event) => onChangeCompetition(event.target.value)} placeholder="Named competitor, observed offer / rebate, customer commitment, deal pressure." value={competition} />
              {validationErrors.competition ? <div className="err-msg">! {validationErrors.competition}</div> : null}
            </div>
          </>
        ) : null}

        <div className="opp-form-field">
          <label><span>Urgency <span className="req">*</span></span></label>
          <div className="opp-urgency-row">
            {URGENCY_OPTIONS.map((option) => (
              <button className={`opp-urgency-opt ${urgency === option.key ? "on" : ""}`} key={option.key} onClick={() => onChangeUrgency(option.key)} type="button">
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
          <textarea onChange={(event) => onChangeSupportingNotes(event.target.value)} placeholder="Internal context only. Not visible to the customer." value={supportingNotes} />
        </div>
      </div>

      {validated === "err" ? (
        <div className="opp-v-banner err" role="alert">
          <div className="opp-v-banner-mark">!</div>
          <div>
            <div className="t">Validation failed — {Object.keys(validationErrors).length} field{Object.keys(validationErrors).length === 1 ? "" : "s"} need attention</div>
            <div className="s">Fix the highlighted fields and run <strong>Validate request</strong> again. Submitting will be enabled only after validation passes.</div>
          </div>
          <span className="rep-pill p-rejected"><span className="dot" />blocked</span>
        </div>
      ) : null}
      {validated === "ok" && submitPhase !== "submitted" ? (
        <div className="opp-v-banner ok">
          <div className="opp-v-banner-mark">✓</div>
          <div>
            <div className="t">Ready to submit · {selectedType.code} policy matched</div>
            <div className="s">All required fields are populated. Submitting will freeze the snapshot, route to Finance, and lock stage promotion until a decision is made.</div>
          </div>
          <span className="rep-pill p-approved"><span className="dot" />ready</span>
        </div>
      ) : null}
      {submitPhase === "submitted" ? (
        <div className="opp-v-banner ok">
          <div className="opp-v-banner-mark">✓</div>
          <div>
            <div className="t">Approval request submitted · routed to Finance</div>
            <div className="s">Snapshot frozen at submit. The approval state on this opportunity will update when the chain decides.</div>
          </div>
          <span className="rep-pill p-pending"><span className="dot" />pending</span>
        </div>
      ) : null}

      <div className="opp-submit-foot">
        <div className="opp-submit-summary">
          <span><span style={{ fontFamily: "ui-monospace, monospace" }}>{filledCount}/{requiredCount}</span> required narrative blocks populated</span>
          <span className="sep">·</span>
          <span>Type <span style={{ fontFamily: "ui-monospace, monospace" }}>{selectedType.code}</span></span>
          <span className="sep">·</span>
          <span>Urgency <span style={{ fontFamily: "ui-monospace, monospace" }}>{urgency}</span></span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="rep-btn" onClick={onCancelFlow} type="button">Cancel</button>
          <button className="rep-btn" onClick={onValidate} type="button">Validate request</button>
          <button
            aria-disabled={validated !== "ok" || isApprovalSubmitting}
            className={validated === "ok" && submitPhase !== "submitted" ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
            disabled={validated !== "ok" || isApprovalSubmitting || submitPhase === "submitted"}
            onClick={onSubmit}
            title={validated === "ok" ? "Submit approval request" : "Validate first and fix any errors"}
            type="button"
          >
            {submitPhase === "submitted" ? "Submitted" : "Submit approval request"}
          </button>
        </div>
      </div>

      <div className="opp-section-sub">Approval chain · preview <span>sequential</span></div>
      <div className="opp-chain">
        <ChainStep badge="Submit" name="Submitted by you" status="done" step="01" sla="Snapshot is captured and request becomes immutable." who={`${opportunity.owner.displayName} · on submit`} />
        <ChainStep badge="In review" name="Finance review" status="cur" step="02" sla="Reviews requested change. May approve, reject, or send back with comments." who="Finance approver · SLA 24h" />
        <ChainStep badge={requestType === "terms_exception" ? "Required" : "Conditional"} name="Legal review" status="fut" step="03" sla="Cannot decide until Finance completes. Reviews terms and legal carve-outs." who="Legal approver · waits for FIN" />
        <ChainStep badge="Auto" name="Final decision" status="fut" step="04" sla="Outcome is auto-applied to this opportunity and written to the audit trail." who="auto · once all required steps decide" />
      </div>
    </>
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
      <div className="opp-process-num"><span className="dot" />{num} · {phaseKey.toUpperCase()}</div>
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
        {mono ? <small style={{ fontFamily: "ui-monospace, monospace" }}>· {mono}</small> : null}
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
