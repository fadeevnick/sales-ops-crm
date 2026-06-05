import type { OpportunityDetail as OpportunityDetailType } from "../../types/crm";
import { useModalChrome } from "../../hooks/useModalChrome";
import {
  type RequestTypeKey,
  type SubmitPhase,
  type Urgency,
  type ValidatedState,
} from "./OpportunityDetailShared";
import { ApprovalStatusBody, SubmitApprovalFormBody } from "./OpportunityDetailApprovalSections";

/** Approval tab content: just the status (banner / active request / blocked
 *  notice) plus the "Start submission" trigger. The guided form itself opens in
 *  the right-side SubmitApprovalDrawer. */
export function ApprovalPanel({
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
  return (
    <ApprovalStatusBody
      approvalKey={approvalKey}
      eligibleToSubmit={eligibleToSubmit}
      opportunity={opportunity}
      submitFlowOpen={submitFlowOpen}
      onCancelFlow={onCancelFlow}
      onOpenFlow={onOpenFlow}
    />
  );
}

export function SubmitApprovalDrawer({
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
  onClose,
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
  onChangeCompetition: (value: string) => void;
  onChangeCustomerImpact: (value: string) => void;
  onChangeJustification: (value: string) => void;
  onChangeRequestType: (value: RequestTypeKey) => void;
  onChangeSupportingNotes: (value: string) => void;
  onChangeUrgency: (value: Urgency) => void;
  onClose: () => void;
  onSubmit: () => void;
  onValidate: () => void;
}) {
  useModalChrome(onClose, { disabled: isApprovalSubmitting });
  return (
    <>
      <div className="rep-scrim" onClick={isApprovalSubmitting ? undefined : onClose} />
      <aside className="rep-drawer opp-submit-drawer" role="dialog" aria-label="Submit for approval">
        <div className="rep-drawer-head">
          <div>
            <div className="rep-drawer-title">Submit {opportunity.id} for approval</div>
            <div className="rep-drawer-sub">Routes to Finance / Legal · snapshot frozen at submit</div>
          </div>
          <button aria-label="Close" className="rep-drawer-close" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="rep-drawer-body">
          <SubmitApprovalFormBody
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
            onCancelFlow={onClose}
            onChangeCompetition={onChangeCompetition}
            onChangeCustomerImpact={onChangeCustomerImpact}
            onChangeJustification={onChangeJustification}
            onChangeRequestType={onChangeRequestType}
            onChangeSupportingNotes={onChangeSupportingNotes}
            onChangeUrgency={onChangeUrgency}
            onSubmit={onSubmit}
            onValidate={onValidate}
          />
        </div>
      </aside>
    </>
  );
}
