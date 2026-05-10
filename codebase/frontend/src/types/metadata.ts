export type MetadataConfigVersionItem = {
  id: string;
  tenantId: string;
  versionNumber: number;
  status: string;
  notes: string | null;
  createdAt: string;
  publishedAt: string | null;
  createdByUserId: string;
  publishedByUserId: string | null;
};

export type MetadataSelectOptionItem = {
  value: string;
  label: string;
};

export type MetadataFieldDefinitionItem = {
  id: string;
  entityType: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  isRequiredDefault: boolean;
  selectOptions: MetadataSelectOptionItem[];
  sortOrder: number;
  isActive: boolean;
};

export type MetadataStageDefinitionItem = {
  id: string;
  stageKey: string;
  displayName: string;
  sortOrder: number;
  isClosed: boolean;
};

export type MetadataStageRequiredFieldItem = {
  id: string;
  stageKey: string;
  entityType: string;
  fieldKey: string;
};

export type PublishedMetadataResponse = {
  configVersion: MetadataConfigVersionItem;
  fields: MetadataFieldDefinitionItem[];
  stages: MetadataStageDefinitionItem[];
  requiredFields: MetadataStageRequiredFieldItem[];
};

export type MetadataConfigVersionListResponse = {
  configVersions: MetadataConfigVersionItem[];
};

export type CreateMetadataDraftRequest = {
  notes?: string;
};

export type SaveMetadataFieldDefinitionRequest = {
  entityType: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  isRequiredDefault?: boolean;
  selectOptions?: MetadataSelectOptionItem[];
  sortOrder: number;
  isActive?: boolean;
};

export type SaveMetadataStageDefinitionRequest = {
  stageKey: string;
  displayName: string;
  sortOrder: number;
  isClosed?: boolean;
};

export type CreateMetadataStageRequiredFieldRequest = {
  stageKey: string;
  entityType?: string;
  fieldKey: string;
};

export type MetadataValidationIssueItem = {
  code: string;
  message: string;
  path: string;
};

export type MetadataValidationResponse = {
  configVersionId: string;
  valid: boolean;
  errors: MetadataValidationIssueItem[];
  warnings: MetadataValidationIssueItem[];
};

export type MetadataPublishResponse = {
  configVersion: MetadataConfigVersionItem;
  validation: MetadataValidationResponse;
};
