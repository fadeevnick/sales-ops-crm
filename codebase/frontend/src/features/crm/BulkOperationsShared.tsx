import type {
  ExportJobResponse,
  ImportJobDetailResponse,
  ImportJobRowItem,
  ImportPreviewResponse,
  ImportPreviewRowItem,
} from "../../types/bulkOperations";

export type ImportEntityType = "account" | "contact" | "opportunity";
export type ExportEntityType = "account" | "opportunity";
export type BulkOpsTab = "import" | "export" | "history" | "errors";

export type HistoryEntry = {
  id: string;
  mode: "import-preview" | "import-job" | "export-job";
  entityType: string;
  fileName: string;
  status: string;
  rowCount: number;
  createdAt: string;
  completedAt?: string | null;
};

export type AuditEntry = {
  at: string;
  actor: string;
  type: string;
  description: string;
};

export const defaultCsvByEntity: Record<ImportEntityType, string> = {
  account: "Account Name,Website\nPhase 6 UI Import Account,https://ui-import.example\n,https://missing-name.example",
  contact:
    "Full Name,Email,Phone,Account Name\nPhase 6 UI Import Contact,ui-contact@example.com,+15550199,Phase 6 UI Import Account\n,missing-name@example.com,+15550198,Phase 6 UI Import Account",
  opportunity:
    "Title,Account Name,Stage Key,Expected Amount,Close Date\nPhase 6 UI Import Opportunity,Phase 6 UI Import Account,qualification,78901.00,2026-10-12\n,Phase 6 UI Import Account,qualification,bad-amount,2026-10-13",
};

export const defaultFileNameByEntity: Record<ImportEntityType, string> = {
  account: "accounts.csv",
  contact: "contacts.csv",
  opportunity: "opportunities.csv",
};

export const importFieldOptions: Record<ImportEntityType, string[]> = {
  account: ["name", "website"],
  contact: ["fullName", "email", "phone", "accountName"],
  opportunity: ["title", "accountName", "stageKey", "expectedAmount", "closeDate"],
};

export function extractSourceColumns(csvContent: string): string[] {
  const headerLine = csvContent.split(/\r?\n/)[0]?.trim() ?? "";
  if (!headerLine) return [];
  return headerLine.split(",").map((value) => value.trim()).filter(Boolean);
}

export function defaultMappingForEntity(entityType: ImportEntityType): Record<string, string> {
  if (entityType === "contact") {
    return {
      "Account Name": "accountName",
      Email: "email",
      "Full Name": "fullName",
      Phone: "phone",
    };
  }

  if (entityType === "opportunity") {
    return {
      "Account Name": "accountName",
      "Close Date": "closeDate",
      "Expected Amount": "expectedAmount",
      "Stage Key": "stageKey",
      Title: "title",
    };
  }

  return {
    "Account Name": "name",
    Website: "website",
  };
}

export function normalizeMapping(entityType: ImportEntityType, columns: string[]): Record<string, string> {
  const defaults = defaultMappingForEntity(entityType);
  return Object.fromEntries(columns.map((column) => [column, defaults[column] ?? ""]));
}

export function formatRowLabel(row: ImportPreviewRowItem | ImportJobRowItem): string {
  return String(
    row.previewData.title ??
      row.previewData.name ??
      row.previewData.fullName ??
      row.sourceData.Title ??
      row.sourceData["Account Name"] ??
      row.sourceData["Full Name"] ??
      "No primary value",
  );
}

export function summarizeImportErrors(rows: Array<ImportPreviewRowItem | ImportJobRowItem>) {
  return rows.flatMap((row) => {
    const previewErrors = row.validationErrors.map((issue) => ({
      rowNumber: row.rowNumber,
      field: "validation",
      severity: "error" as const,
      issue,
      source: formatRowLabel(row),
    }));
    const executionErrors =
      "executionErrors" in row
        ? row.executionErrors.map((issue) => ({
            rowNumber: row.rowNumber,
            field: "execution",
            severity: "error" as const,
            issue,
            source: formatRowLabel(row),
          }))
        : [];
    return [...previewErrors, ...executionErrors];
  });
}

export function statusClass(status: string): string {
  if (status === "executed" || status === "completed") return "p-approved";
  if (status === "failed") return "p-rejected";
  if (status === "queued" || status === "running") return "p-pending";
  if (status === "previewed") return "p-sent_back";
  return "p-none";
}

export type VisibleJob = ImportJobDetailResponse | ImportPreviewResponse | null;
