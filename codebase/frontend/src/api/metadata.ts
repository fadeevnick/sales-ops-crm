import { requestJson } from "./session";
import type {
  CreateMetadataStageRequiredFieldRequest,
  CreateMetadataDraftRequest,
  MetadataConfigVersionListResponse,
  MetadataPublishResponse,
  MetadataValidationResponse,
  PublishedMetadataResponse,
  SaveMetadataFieldDefinitionRequest,
  SaveMetadataStageDefinitionRequest,
} from "../types/metadata";

export function fetchPublishedMetadata(userId: string): Promise<PublishedMetadataResponse> {
  return requestJson<PublishedMetadataResponse>("/api/metadata/published", { userId });
}

export function fetchMetadataConfigVersions(userId: string): Promise<MetadataConfigVersionListResponse> {
  return requestJson<MetadataConfigVersionListResponse>("/api/metadata/config-versions", { userId });
}

export function fetchCurrentMetadataDraft(userId: string): Promise<PublishedMetadataResponse> {
  return requestJson<PublishedMetadataResponse>("/api/metadata/drafts/current", { userId });
}

export function createMetadataDraft(
  userId: string,
  request: CreateMetadataDraftRequest,
): Promise<PublishedMetadataResponse> {
  return requestJson<PublishedMetadataResponse>("/api/metadata/drafts", {
    body: request,
    method: "POST",
    userId,
  });
}

export function validateMetadataDraft(
  userId: string,
  configVersionId: string,
): Promise<MetadataValidationResponse> {
  return requestJson<MetadataValidationResponse>(
    `/api/metadata/drafts/${configVersionId}/validate`,
    {
      method: "POST",
      userId,
    },
  );
}

export function publishMetadataDraft(
  userId: string,
  configVersionId: string,
): Promise<MetadataPublishResponse> {
  return requestJson<MetadataPublishResponse>(
    `/api/metadata/drafts/${configVersionId}/publish`,
    {
      method: "POST",
      userId,
    },
  );
}

export function discardMetadataDraft(
  userId: string,
  configVersionId: string,
): Promise<MetadataConfigVersionListResponse> {
  return requestJson<MetadataConfigVersionListResponse>(
    `/api/metadata/drafts/${configVersionId}`,
    {
      method: "DELETE",
      userId,
    },
  );
}

export function rollbackMetadataConfigVersion(
  userId: string,
  configVersionId: string,
): Promise<PublishedMetadataResponse> {
  return requestJson<PublishedMetadataResponse>(
    `/api/metadata/config-versions/${configVersionId}/rollback`,
    {
      method: "POST",
      userId,
    },
  );
}

export function createMetadataFieldDefinition(
  userId: string,
  configVersionId: string,
  request: SaveMetadataFieldDefinitionRequest,
): Promise<PublishedMetadataResponse> {
  return requestJson<PublishedMetadataResponse>(
    `/api/metadata/drafts/${configVersionId}/fields`,
    {
      body: request,
      method: "POST",
      userId,
    },
  );
}

export function updateMetadataFieldDefinition(
  userId: string,
  configVersionId: string,
  fieldDefinitionId: string,
  request: SaveMetadataFieldDefinitionRequest,
): Promise<PublishedMetadataResponse> {
  return requestJson<PublishedMetadataResponse>(
    `/api/metadata/drafts/${configVersionId}/fields/${fieldDefinitionId}`,
    {
      body: request,
      method: "PUT",
      userId,
    },
  );
}

export function deleteMetadataFieldDefinition(
  userId: string,
  configVersionId: string,
  fieldDefinitionId: string,
): Promise<PublishedMetadataResponse> {
  return requestJson<PublishedMetadataResponse>(
    `/api/metadata/drafts/${configVersionId}/fields/${fieldDefinitionId}`,
    {
      method: "DELETE",
      userId,
    },
  );
}

export function createMetadataStageDefinition(
  userId: string,
  configVersionId: string,
  request: SaveMetadataStageDefinitionRequest,
): Promise<PublishedMetadataResponse> {
  return requestJson<PublishedMetadataResponse>(
    `/api/metadata/drafts/${configVersionId}/stages`,
    {
      body: request,
      method: "POST",
      userId,
    },
  );
}

export function updateMetadataStageDefinition(
  userId: string,
  configVersionId: string,
  stageDefinitionId: string,
  request: SaveMetadataStageDefinitionRequest,
): Promise<PublishedMetadataResponse> {
  return requestJson<PublishedMetadataResponse>(
    `/api/metadata/drafts/${configVersionId}/stages/${stageDefinitionId}`,
    {
      body: request,
      method: "PUT",
      userId,
    },
  );
}

export function deleteMetadataStageDefinition(
  userId: string,
  configVersionId: string,
  stageDefinitionId: string,
): Promise<PublishedMetadataResponse> {
  return requestJson<PublishedMetadataResponse>(
    `/api/metadata/drafts/${configVersionId}/stages/${stageDefinitionId}`,
    {
      method: "DELETE",
      userId,
    },
  );
}

export function createMetadataRequiredField(
  userId: string,
  configVersionId: string,
  request: CreateMetadataStageRequiredFieldRequest,
): Promise<PublishedMetadataResponse> {
  return requestJson<PublishedMetadataResponse>(
    `/api/metadata/drafts/${configVersionId}/required-fields`,
    {
      body: request,
      method: "POST",
      userId,
    },
  );
}

export function deleteMetadataRequiredField(
  userId: string,
  configVersionId: string,
  requiredFieldId: string,
): Promise<PublishedMetadataResponse> {
  return requestJson<PublishedMetadataResponse>(
    `/api/metadata/drafts/${configVersionId}/required-fields/${requiredFieldId}`,
    {
      method: "DELETE",
      userId,
    },
  );
}
