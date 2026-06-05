import { useState } from "react";
import type {
  ActivityListItem,
  CustomFieldValue,
  OpportunityDetail as OpportunityDetailType,
} from "../../types/crm";
import type { MetadataFieldDefinitionItem, MetadataStageDefinitionItem, MetadataStageRequiredFieldItem } from "../../types/metadata";
import type { CurrentUser } from "../../types/session";
import {
  ActivitiesPanel,
  ApprovalPanel,
  AuditTimeline,
  DealFields,
  ManagerPanel,
  OpportunityHeader,
  StagePath,
  SubmitApprovalDrawer,
} from "./OpportunityDetailSections";
import {
  deriveOpportunityDetailView,
  useOpportunityDetailController,
} from "./useOpportunityDetailController";

type OpportunityDetailProps = {
  activities: ActivityListItem[];
  fields: MetadataFieldDefinitionItem[];
  opportunity: OpportunityDetailType | null;
  reassignOwners?: { id: string; name: string }[];
  stages: MetadataStageDefinitionItem[];
  stageRequiredFields?: MetadataStageRequiredFieldItem[];
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

export function OpportunityDetail({
  activities,
  fields,
  opportunity,
  reassignOwners = [],
  stages,
  stageRequiredFields = [],
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
  const ctrl = useOpportunityDetailController({
    fields,
    opportunity,
    stages,
    onCreateActivity,
    onMoveStage,
    onReassignOwner,
    onSubmitApproval,
    onUpdateOpportunity,
  });

  const [workTab, setWorkTab] = useState<"activities" | "approval" | "audit">("activities");

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

  const view = deriveOpportunityDetailView(
    opportunity,
    fields,
    stages,
    activities,
    stageRequiredFields,
    currentUser,
  );

  return (
    <section className="opp-detail" data-screen-label="Opportunity Detail">
      <OpportunityHeader
        eligibleToSubmit={view.eligibleToSubmit}
        hasActiveApproval={view.hasActiveApproval}
        opportunity={opportunity}
        showOwner={currentUser?.roleKey !== "sales_rep"}
        stageLabel={view.stageLabel}
        onMoveStageHint={ctrl.moveStageHint}
        onSubmitApproval={ctrl.openSubmitFlow}
      />

      <StagePath
        approvalKey={view.approvalKey}
        currentStageKey={opportunity.stageKey}
        isActionSubmitting={isActionSubmitting}
        missingRequiredCustom={view.missingRequiredCustom}
        popKey={ctrl.stagePopKey}
        stages={stages}
        onClickStage={ctrl.handleStageClick}
        onConfirmMove={ctrl.confirmStageMove}
        onClosePop={() => ctrl.setStagePopKey(null)}
      />

      <div className={view.canReassignOwner ? "opp-work" : "opp-work opp-work-solo"}>
        <div>
          <DealFields
            customFields={fields}
            draftAmount={ctrl.draftAmount}
            draftClose={ctrl.draftClose}
            draftCustom={ctrl.draftCustom}
            draftTitle={ctrl.draftTitle}
            editError={ctrl.editError}
            editMode={ctrl.editMode}
            isActionSubmitting={isActionSubmitting}
            opportunity={opportunity}
            onCancel={ctrl.cancelEditMode}
            onChangeAmount={ctrl.setDraftAmount}
            onChangeClose={ctrl.setDraftClose}
            onChangeCustom={ctrl.changeCustom}
            onChangeTitle={ctrl.setDraftTitle}
            onEdit={ctrl.startEditMode}
            onSave={ctrl.saveEdits}
          />

          <section className="opp-panel">
            <div className="opp-work-head">
              <div className="opp-work-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={workTab === "activities"}
                  className={`opp-work-tab${workTab === "activities" ? " active" : ""}`}
                  onClick={() => setWorkTab("activities")}
                >
                  Activities
                  {view.overdueActivities.length > 0 ? (
                    <span className="opp-work-tab-ct neg">{view.overdueActivities.length}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={workTab === "approval"}
                  className={`opp-work-tab${workTab === "approval" ? " active" : ""}`}
                  onClick={() => setWorkTab("approval")}
                >
                  Approval
                  {view.approvalKey !== "none" ? (
                    <span
                      className={`opp-work-tab-dot ${
                        view.approvalKey === "pending" || view.approvalKey === "sent_back"
                          ? "warn"
                          : view.approvalKey === "approved"
                            ? "ok"
                            : view.approvalKey === "rejected"
                              ? "neg"
                              : ""
                      }`}
                    />
                  ) : null}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={workTab === "audit"}
                  className={`opp-work-tab${workTab === "audit" ? " active" : ""}`}
                  onClick={() => setWorkTab("audit")}
                >
                  Audit
                  <span className="opp-work-tab-ct">{view.timelineEvents.length}</span>
                </button>
              </div>
              {workTab === "activities" ? (
                <div className="opp-work-head-actions">
                  <button className="rep-btn" onClick={ctrl.toggleAddActivity} type="button">
                    {ctrl.composerOpen ? "Close composer" : "+ Add activity"}
                  </button>
                </div>
              ) : null}
            </div>

            {workTab === "activities" ? (
              <ActivitiesPanel
                activities={activities}
                composerDueDate={ctrl.composerDueDate}
                composerKind={ctrl.composerKind}
                composerOpen={ctrl.composerOpen}
                composerTitle={ctrl.composerTitle}
                completedActivities={view.completedActivities}
                isActivitySubmitting={isActivitySubmitting}
                opportunity={opportunity}
                overdueActivities={view.overdueActivities}
                upcomingActivities={view.upcomingActivities}
                onChangeComposerDueDate={ctrl.setComposerDueDate}
                onChangeComposerKind={ctrl.setComposerKind}
                onChangeComposerTitle={ctrl.setComposerTitle}
                onCloseComposer={() => ctrl.setComposerOpen(false)}
                onSubmitActivity={ctrl.submitActivity}
              />
            ) : null}

            {workTab === "approval" ? (
              <ApprovalPanel
                approvalKey={view.approvalKey}
                eligibleToSubmit={view.eligibleToSubmit}
                opportunity={opportunity}
                submitFlowOpen={ctrl.submitFlowOpen}
                onCancelFlow={ctrl.cancelSubmitFlow}
                onOpenFlow={ctrl.openSubmitFlow}
              />
            ) : null}

            {workTab === "audit" ? <AuditTimeline events={view.timelineEvents} /> : null}
          </section>
        </div>

        {view.canReassignOwner ? (
          <div>
            <ManagerPanel
              isActionSubmitting={isActionSubmitting}
              newOwnerId={ctrl.newOwnerId}
              owners={reassignOwners.filter((owner) => owner.id !== opportunity.owner.id)}
              onChangeNewOwnerId={ctrl.setNewOwnerId}
              onReassign={ctrl.reassignOwner}
            />
          </div>
        ) : null}
      </div>

      {ctrl.submitFlowOpen ? (
        <SubmitApprovalDrawer
          competition={ctrl.competition}
          customerImpact={ctrl.customerImpact}
          isApprovalSubmitting={isApprovalSubmitting}
          justification={ctrl.justification}
          opportunity={opportunity}
          requestType={ctrl.requestType}
          stageLabel={view.stageLabel}
          submitPhase={ctrl.submitPhase}
          supportingNotes={ctrl.supportingNotes}
          urgency={ctrl.urgency}
          validated={ctrl.validated}
          validationErrors={ctrl.validationErrors}
          onChangeCompetition={ctrl.setCompetition}
          onChangeCustomerImpact={ctrl.setCustomerImpact}
          onChangeJustification={ctrl.setJustification}
          onChangeRequestType={ctrl.changeRequestType}
          onChangeSupportingNotes={ctrl.setSupportingNotes}
          onChangeUrgency={ctrl.setUrgency}
          onClose={ctrl.cancelSubmitFlow}
          onSubmit={ctrl.submitApprovalRequest}
          onValidate={ctrl.runValidation}
        />
      ) : null}
    </section>
  );
}
