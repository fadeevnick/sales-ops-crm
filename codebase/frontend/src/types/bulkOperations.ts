export type ImportJobItem = {
  id: string;
  entityType: string;
  status: string;
  originalFileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  executedRows: number;
  skippedRows: number;
  createdAt: string;
  startedAt: string | null;
  executedAt: string | null;
};

export type ImportPreviewRowItem = {
  rowNumber: number;
  sourceData: Record<string, string>;
  previewData: Record<string, unknown>;
  valid: boolean;
  validationErrors: string[];
};

export type ImportJobRowItem = ImportPreviewRowItem & {
  executionStatus: string;
  createdRecordId: string | null;
  executionErrors: string[];
};

export type CreateImportPreviewRequest = {
  entityType: "account" | "contact" | "opportunity";
  fileName: string;
  csvContent: string;
  mapping: Record<string, string>;
};

export type ImportPreviewResponse = {
  job: ImportJobItem;
  sourceColumns: string[];
  rows: ImportPreviewRowItem[];
};

export type ImportJobDetailResponse = {
  job: ImportJobItem;
  sourceColumns: string[];
  rows: ImportJobRowItem[];
};

export type CreateExportJobRequest = {
  entityType: "account" | "opportunity";
  query?: string;
  stageKey?: string;
  limit?: number;
};

export type ExportJobItem = {
  id: string;
  entityType: string;
  status: string;
  criteria: Record<string, unknown>;
  rowCount: number;
  createdAt: string;
  completedAt: string | null;
};

export type ExportJobResponse = {
  job: ExportJobItem;
  csvContent: string;
};
