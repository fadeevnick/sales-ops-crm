export type DuplicateCandidateEntityType = "account" | "contact";

export type DuplicateCandidateItem = {
  id: string;
  entityType: DuplicateCandidateEntityType;
  status: "open" | "rejected" | "merged";
  leftRecordId: string;
  leftRecordLabel: string;
  rightRecordId: string;
  rightRecordLabel: string;
  matchScore: number;
  reasonSummary: string;
  reviewReason: string | null;
  generatedAt: string;
};

export type GenerateDuplicateCandidatesRequest = {
  entityType?: DuplicateCandidateEntityType;
  limit?: number;
};

export type DuplicateCandidateGenerationResponse = {
  generatedCount: number;
  candidates: DuplicateCandidateItem[];
};

export type DuplicateCandidateListResponse = {
  candidates: DuplicateCandidateItem[];
};

export type RejectDuplicateCandidateRequest = {
  reviewReason?: string;
};

export type MergeDuplicateCandidateRequest = {
  masterRecordId: string;
  mergeReason?: string;
};

export type AccountDuplicateCandidateMergeResponse = {
  candidate: DuplicateCandidateItem;
  masterRecordId: string;
  duplicateRecordId: string;
  reassignedContacts: number;
  reassignedOpportunities: number;
};

export type ContactDuplicateCandidateMergeResponse = {
  candidate: DuplicateCandidateItem;
  masterRecordId: string;
  duplicateRecordId: string;
  reassignedPrimaryContactOpportunities: number;
};
