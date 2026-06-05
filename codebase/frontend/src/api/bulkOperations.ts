import { requestJson } from "./session";
import type {
  CreateExportJobRequest,
  CreateImportPreviewRequest,
  ExportJobResponse,
  ImportJobDetailResponse,
  ImportPreviewResponse,
} from "../types/bulkOperations";

export function createImportPreview(
  userId: string,
  request: CreateImportPreviewRequest,
): Promise<ImportPreviewResponse> {
  return requestJson<ImportPreviewResponse>("/api/import-jobs/preview", {
    body: request,
    method: "POST",
    userId,
  });
}

export function fetchImportJob(
  userId: string,
  importJobId: string,
): Promise<ImportJobDetailResponse> {
  return requestJson<ImportJobDetailResponse>(`/api/import-jobs/${importJobId}`, {
    userId,
  });
}

export function executeImportJob(
  userId: string,
  importJobId: string,
): Promise<ImportJobDetailResponse> {
  return requestJson<ImportJobDetailResponse>(`/api/import-jobs/${importJobId}/execute`, {
    method: "POST",
    userId,
  });
}

export function createExportJob(
  userId: string,
  request: CreateExportJobRequest,
): Promise<ExportJobResponse> {
  return requestJson<ExportJobResponse>("/api/export-jobs", {
    body: request,
    method: "POST",
    userId,
  });
}
