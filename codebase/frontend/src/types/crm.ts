export type AccountListItem = {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  openOpportunityCount: number;
};

export type AccountListResponse = {
  items: AccountListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type CreateAccountRequest = {
  name: string;
  website?: string;
};

export type CreateAccountResponse = {
  id: string;
};

export type ContactListItem = {
  id: string;
  accountId: string;
  accountName: string;
  fullName: string;
  email: string | null;
};

export type ContactListResponse = {
  items: ContactListItem[];
};

export type CreateContactRequest = {
  accountId: string;
  fullName: string;
  email?: string;
  phone?: string;
};

export type CreateContactResponse = {
  id: string;
};

export type OpportunityListItem = {
  id: string;
  title: string;
  accountId: string;
  accountName: string;
  ownerId: string;
  ownerName: string;
  stageKey: string;
  expectedAmount: number | null;
  closeDate: string | null;
  approvalState: string;
};

export type OpportunityListResponse = {
  items: OpportunityListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type CustomFieldValue = string | number | boolean | null;

export type OpportunitySavedViewFilters = {
  stageKey?: string;
  ownerId?: string;
  accountId?: string;
  query?: string;
  customFields?: Record<string, unknown>;
};

export type SavedOpportunityViewItem = {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  visibilityScope: "private" | "shared";
  canManage: boolean;
  filters: OpportunitySavedViewFilters;
  valid: boolean;
  invalidReasons: string[];
  createdAt: string;
  updatedAt: string;
};

export type SavedOpportunityViewListResponse = {
  views: SavedOpportunityViewItem[];
};

export type CreateSavedOpportunityViewRequest = {
  name: string;
  filters: OpportunitySavedViewFilters;
  visibilityScope?: "private" | "shared";
};

export type CreateSavedOpportunityViewResponse = {
  id: string;
};

export type UpdateSavedOpportunityViewRequest = {
  name?: string;
  filters?: OpportunitySavedViewFilters;
  visibilityScope?: "private" | "shared";
};

export type UpdateSavedOpportunityViewResponse = {
  id: string;
  updated: boolean;
};

export type DeleteSavedOpportunityViewResponse = {
  id: string;
  deleted: boolean;
};

export type CreateOpportunityRequest = {
  title: string;
  accountId: string;
  primaryContactId?: string;
  stageKey: string;
  expectedAmount?: number;
  closeDate?: string;
  customFields?: Record<string, CustomFieldValue>;
};

export type CreateOpportunityResponse = {
  id: string;
};

export type UpdateOpportunityRequest = {
  title?: string;
  expectedAmount?: number;
  closeDate?: string;
  customFields?: Record<string, CustomFieldValue>;
};

export type UpdateOpportunityResponse = {
  id: string;
  updated: boolean;
};

export type MoveOpportunityStageRequest = {
  targetStageKey: string;
};

export type MoveOpportunityStageResponse = {
  id: string;
  stageKey: string;
  updated: boolean;
};

export type ReassignOpportunityOwnerRequest = {
  newOwnerId: string;
};

export type ReassignOpportunityOwnerResponse = {
  id: string;
  ownerId: string;
  updated: boolean;
};

export type ActivityListItem = {
  id: string;
  type: string;
  title: string;
  dueDate: string | null;
  status: string;
};

export type ActivityListResponse = {
  items: ActivityListItem[];
};

export type CreateActivityRequest = {
  type: string;
  title: string;
  dueDate?: string;
};

export type CreateActivityResponse = {
  id: string;
};

export type OpportunityDetail = {
  id: string;
  title: string;
  account: {
    id: string;
    name: string;
  };
  primaryContact: {
    id: string;
    fullName: string;
  } | null;
  owner: {
    id: string;
    displayName: string;
  };
  stageKey: string;
  expectedAmount: number | null;
  closeDate: string | null;
  customFields: Record<string, CustomFieldValue>;
  approvalState: string;
  activeApproval: {
    id: string;
    status: string;
    policyKey: string;
    activeStepId: string;
    activeStepStatus: string;
    activeStepDueAt: string | null;
    approverRoleKey: string;
    submittedAt: string | null;
  } | null;
  timeline: unknown[];
};
