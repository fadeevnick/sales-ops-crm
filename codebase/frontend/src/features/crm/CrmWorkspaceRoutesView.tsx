import type { ComponentProps } from "react";
import type { ActivityListItem, OpportunityListItem } from "../../types/crm";
import type { MetadataStageDefinitionItem } from "../../types/metadata";
import type { CurrentUser } from "../../types/session";
import { AccountDetail, type AccountOpportunity, type AccountRecord } from "./AccountDetail";
import { OpportunityDetail as OpportunityDetailView } from "./OpportunityDetail";
import { normalizeApproval } from "./OpportunityList";

export function CrmAccountDetailScreen({
  accountActivities,
  accountDetailId,
  accounts,
  currentUser,
  opportunities,
  stages,
  onBack,
  onNewOpportunity,
  onOpenOpportunity,
}: {
  accountActivities: ActivityListItem[];
  accountDetailId: string;
  accounts: Array<{
    id: string;
    name: string;
    ownerId: string;
    ownerName: string;
    openOpportunityCount: number;
  }>;
  currentUser: CurrentUser;
  opportunities: OpportunityListItem[];
  stages: MetadataStageDefinitionItem[];
  onBack: () => void;
  onNewOpportunity: () => void;
  onOpenOpportunity: (id: string) => void;
}) {
  const accountRecord = accounts.find((account) => account.id === accountDetailId);
  if (!accountRecord) {
    return null;
  }

  const stageLabelLookup = new Map(stages.map((stage) => [stage.stageKey, stage.displayName]));
  const accountDetailRecord: AccountRecord = {
    id: accountRecord.id,
    name: accountRecord.name,
    ownerId: accountRecord.ownerId,
    ownerName: accountRecord.ownerName,
    openOppsCount: accountRecord.openOpportunityCount,
  };
  const accountOpps: AccountOpportunity[] = opportunities
    .filter((opportunity) => opportunity.accountId === accountDetailId)
    .map((opportunity) => {
      const stageIndex = stages.findIndex((stage) => stage.stageKey === opportunity.stageKey);
      return {
        id: opportunity.id,
        title: opportunity.title,
        stageKey: opportunity.stageKey,
        stageLabel: stageLabelLookup.get(opportunity.stageKey) ?? opportunity.stageKey,
        stageIndex: stageIndex >= 0 ? stageIndex : undefined,
        expectedAmount: opportunity.expectedAmount ?? undefined,
        closeDate: opportunity.closeDate ?? undefined,
        approvalState: normalizeApproval(opportunity.approvalState),
        approvalLabel: opportunity.approvalState?.replace(/_/g, " "),
        ownerName: opportunity.ownerName,
      };
    });
  const openPipeline = accountOpps.reduce((sum, opportunity) => sum + (opportunity.expectedAmount ?? 0), 0);
  const inFlightApprovals = accountOpps.filter(
    (opportunity) => opportunity.approvalState === "pending" || opportunity.approvalState === "sent_back",
  ).length;
  accountDetailRecord.openPipeline = openPipeline;
  accountDetailRecord.inFlightApprovals = inFlightApprovals;

  const mappedActivities = accountActivities.map((activity) => ({
    id: activity.id,
    timestamp: activity.dueDate ?? new Date().toISOString().slice(0, 10) + "T00:00:00",
    type: activity.type,
    title: activity.title,
    status: (
      activity.status === "completed" || activity.status === "done"
        ? "done"
        : activity.status === "overdue"
          ? "overdue"
          : "planned"
    ) as "done" | "overdue" | "planned",
  }));

  return (
    <AccountDetail
      currentUser={currentUser}
      account={accountDetailRecord}
      opportunities={accountOpps}
      activities={mappedActivities}
      auditEvents={[]}
      onBack={onBack}
      onOpenOpportunity={onOpenOpportunity}
      onNewOpportunity={onNewOpportunity}
    />
  );
}

export function CrmOpportunityDetailScreen({
  activities,
  currentUser,
  fields,
  isActionSubmitting,
  isActivitySubmitting,
  isApprovalSubmitting,
  isLoading,
  opportunity,
  reassignOwners,
  stages,
  stageRequiredFields,
  onBack,
  onCreateActivity,
  onMoveStage,
  onReassignOwner,
  onSubmitApproval,
  onUpdateOpportunity,
}: ComponentProps<typeof OpportunityDetailView> & {
  onBack: () => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <button className="rep-btn" onClick={onBack} type="button">
          ← Back to opportunities
        </button>
      </div>
      <OpportunityDetailView
        activities={activities}
        currentUser={currentUser}
        fields={fields}
        isActionSubmitting={isActionSubmitting}
        isActivitySubmitting={isActivitySubmitting}
        isApprovalSubmitting={isApprovalSubmitting}
        isLoading={isLoading}
        opportunity={opportunity}
        reassignOwners={reassignOwners}
        stages={stages}
        stageRequiredFields={stageRequiredFields}
        onCreateActivity={onCreateActivity}
        onMoveStage={onMoveStage}
        onReassignOwner={onReassignOwner}
        onSubmitApproval={onSubmitApproval}
        onUpdateOpportunity={onUpdateOpportunity}
      />
    </div>
  );
}
