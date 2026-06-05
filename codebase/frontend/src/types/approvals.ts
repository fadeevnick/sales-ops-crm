export type SubmitApprovalRequest = {
  requestType: string;
  businessJustification?: string;
};

export type SubmitApprovalResponse = {
  id: string;
  status: string;
};

export type ApprovalDecisionRequest = {
  comment?: string;
};

export type ApprovalDecisionResponse = {
  id: string;
  status: string;
  updated: boolean;
};

export type ApprovalActor = {
  id: string;
  displayName: string;
};

export type ApprovalInboxItem = {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  accountName: string;
  requestType: string;
  policyKey: string;
  status: string;
  activeStepId: string;
  activeStepStatus: string;
  activeStepDueAt: string | null;
  approverRoleKey: string;
  submittedByName: string;
  submittedAt: string | null;
};

export type ApprovalInboxResponse = {
  items: ApprovalInboxItem[];
};

export type ApprovalStepItem = {
  id: string;
  stepOrder: number;
  approverRoleKey: string;
  assignedApprover: ApprovalActor | null;
  status: string;
  isRequired: boolean;
  activatedAt: string | null;
  decidedAt: string | null;
  dueAt: string | null;
};

export type ApprovalHistoryItem = {
  id: string;
  stepId: string | null;
  actor: ApprovalActor;
  eventType: string;
  fromStatus: string | null;
  toStatus: string;
  comment: string | null;
  decisionPayloadJson: string;
  createdAt: string;
};

export type ApprovalDetailResponse = {
  id: string;
  opportunityId: string;
  requestType: string;
  policyKey: string;
  policyVersion: number;
  status: string;
  businessJustification: string | null;
  opportunitySnapshotJson: string;
  submittedBy: ApprovalActor;
  submittedAt: string | null;
  resolvedAt: string | null;
  steps: ApprovalStepItem[];
  history: ApprovalHistoryItem[];
};

export type ApprovalSummary = {
  id: string;
  status: string;
  policyKey: string;
  activeStepId: string | null;
};
