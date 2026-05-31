import type {
  OpportunityDetail as OpportunityDetailType,
} from "../../types/crm";
import type {
  MetadataFieldDefinitionItem,
  MetadataStageDefinitionItem,
} from "../../types/metadata";
import { useNavigate } from "react-router-dom";
import { useModalChrome } from "../../hooks/useModalChrome";
import { daysUntil, formatCurrency, normalizeApprovalState } from "./OpportunityDetailHelpers";
import { buildAccountPath } from "./routes/paths";

type StagePopAction = { label: string; tone: "primary" | "warn"; stageKey: string };

export function OpportunityHeader({
  eligibleToSubmit,
  hasActiveApproval,
  opportunity,
  showOwner,
  stageLabel,
  onMoveStageHint,
  onSubmitApproval,
}: {
  eligibleToSubmit: boolean;
  hasActiveApproval: boolean;
  opportunity: OpportunityDetailType;
  showOwner: boolean;
  stageLabel: string;
  onMoveStageHint: () => void;
  onSubmitApproval: () => void;
}) {
  const approvalKey = normalizeApprovalState(opportunity.approvalState);
  const navigate = useNavigate();
  return (
    <section className="opp-head">
      <div>
        <div className="opp-head-title-row">
          <span className="opp-kind">Opportunity</span>
          <h1 className="opp-title">{opportunity.title}</h1>

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
        <div className="opp-facts">
          <div className="opp-fact">
            <div className="l">Account</div>
            <div className="v">
              <button
                className="opp-fact-link"
                onClick={() => navigate(buildAccountPath(opportunity.account.id))}
                title="Open account"
                type="button"
              >
                {opportunity.account.name} ›
              </button>
            </div>
          </div>
          <div className="opp-fact">
            <div className="l">Primary contact</div>
            <div className="v">{opportunity.primaryContact?.fullName ?? "None"}</div>
          </div>
          {showOwner ? (
            <div className="opp-fact">
              <div className="l">Owner</div>
              <div className="v">{opportunity.owner.displayName}</div>
            </div>
          ) : null}
          <div className="opp-fact">
            <div className="l">Amount</div>
            <div className="v num">{formatCurrency(opportunity.expectedAmount)}</div>
          </div>
          <div className="opp-fact">
            <div className="l">Close date</div>
            <div className="v">
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.82rem" }}>{opportunity.closeDate ?? "—"}</span>
              {opportunity.closeDate ? <small>· {daysUntil(opportunity.closeDate)}</small> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="opp-aside">
        <div className="opp-actions">
          <button className="rep-btn" onClick={onMoveStageHint} type="button">Move stage</button>
          {hasActiveApproval ? (
            <button aria-disabled="true" className="rep-btn rep-btn-disabled" disabled title="An active approval request already exists for this opportunity" type="button">
              Submit for approval
            </button>
          ) : (
            <button className={eligibleToSubmit ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"} disabled={!eligibleToSubmit} onClick={onSubmitApproval} type="button">
              Submit for approval
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function StagePath({
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
  // Promotion to the next stage is blocked while a required custom field is empty —
  // anchor the lock to that exact boundary instead of a detached footer banner.
  const promotionLocked =
    missingRequiredCustom.length > 0 && currentIndex >= 0 && currentIndex + 1 < stages.length;
  const blockedFieldKeys = missingRequiredCustom.map((field) => field.fieldKey).join(", ");

  let popTone: "ok" | "warn" | "blocked" = "ok";
  let popMark = "•";
  let popTitle = "OK to move";
  let popDescription = "";
  let popList: string[] = [];
  let popAction: StagePopAction | null = null;

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
      popDescription = "Direct movement into Pending Approval isn't allowed — submit an approval request instead.";
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
      popList = missingRequiredCustom.map((field) => `Custom field ${field.fieldKey} is empty — required at later stage.`);
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
        <div className="opp-stages-title">Pipeline stage <em>{stages.length} stages</em></div>
      </div>
      <div className="opp-stages" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
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
            <button className={`opp-stage-cell ${cellState}`} key={stage.stageKey} onClick={() => onClickStage(stage.stageKey)} type="button">
              <div className="opp-stage-num">Step {String(index + 1).padStart(2, "0")}</div>
              <div className="opp-stage-label">{stage.displayName}</div>
              <div className="opp-stage-foot">
                {cellState === "current" ? "active" : cellState === "done" ? "✓ done" : cellState === "closed" ? "terminal" : "—"}
              </div>
            </button>
          );
        })}
        {promotionLocked ? (
          <span
            className="opp-stage-lock"
            style={{ left: `${((currentIndex + 1) / stages.length) * 100}%` }}
            title={`Locked — fill before promotion: ${blockedFieldKeys}`}
            role="img"
            aria-label={`Promotion to the next stage is locked. Required field empty: ${blockedFieldKeys}`}
          >
            <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true" focusable="false">
              <path d="M4.6 7V5.2a3.4 3.4 0 0 1 6.8 0V7" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <rect x="3.2" y="7" width="9.6" height="6.6" rx="1.4" fill="currentColor" />
            </svg>
          </span>
        ) : null}
      </div>
      {targetStage ? (
        <StageMoveModal
          isActionSubmitting={isActionSubmitting}
          popAction={popAction}
          popDescription={popDescription}
          popList={popList}
          popMark={popMark}
          popTitle={popTitle}
          popTone={popTone}
          targetIndex={targetIndex}
          targetStageName={targetStage.displayName}
          onClosePop={onClosePop}
          onConfirmMove={onConfirmMove}
        />
      ) : null}
    </section>
  );
}

function StageMoveModal({
  isActionSubmitting,
  popAction,
  popDescription,
  popList,
  popMark,
  popTitle,
  popTone,
  targetIndex,
  targetStageName,
  onClosePop,
  onConfirmMove,
}: {
  isActionSubmitting: boolean;
  popAction: StagePopAction | null;
  popDescription: string;
  popList: string[];
  popMark: string;
  popTitle: string;
  popTone: "ok" | "warn" | "blocked";
  targetIndex: number;
  targetStageName: string;
  onClosePop: () => void;
  onConfirmMove: (stageKey: string) => void;
}) {
  useModalChrome(onClosePop, { disabled: isActionSubmitting });
  return (
    <>
      <div className="rep-scrim" onClick={onClosePop} />
      <div className="rep-modal" role="dialog" aria-label="Stage move validation">
        <div className={`rep-modal-card opp-stage-modal ${popTone}`}>
          <div className="head opp-stage-modal-head">
            <div className="opp-stagepop-mark">{popMark}</div>
            <div>
              <h3>{popTitle}</h3>
              <p className="opp-stage-modal-step">
                {String(targetIndex + 1).padStart(2, "0")} · {targetStageName}
              </p>
            </div>
          </div>
          <div className="body">
            <div className="opp-stagepop-desc">{popDescription}</div>
            {popList.length > 0 ? (
              <ul className="opp-stagepop-list">{popList.map((item, i) => <li key={i}>{item}</li>)}</ul>
            ) : null}
          </div>
          <div className="foot">
            <button className="rep-btn" onClick={onClosePop} type="button">
              {popAction ? "Cancel" : "Close"}
            </button>
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
          </div>
        </div>
      </div>
    </>
  );
}
