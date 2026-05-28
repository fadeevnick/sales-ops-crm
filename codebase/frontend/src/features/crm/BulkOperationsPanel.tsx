import { useEffect, useMemo, useState } from "react";
import {
  createExportJob,
  createImportPreview,
  executeImportJob,
  fetchImportJob,
} from "../../api/bulkOperations";
import { describeRequestError } from "../../api/session";
import type {
  CreateImportPreviewRequest,
  ExportJobResponse,
  ImportJobDetailResponse,
  ImportJobRowItem,
  ImportPreviewResponse,
  ImportPreviewRowItem,
} from "../../types/bulkOperations";
import type { CurrentUser } from "../../types/session";

type BulkOperationsPanelProps = {
  currentUser: CurrentUser;
  onAccountsChanged: () => Promise<void>;
};

type ImportEntityType = "account" | "contact" | "opportunity";
type ExportEntityType = "account" | "opportunity";
type BulkOpsTab = "import" | "export" | "history" | "errors";
type HistoryEntry = {
  id: string;
  mode: "import-preview" | "import-job" | "export-job";
  entityType: string;
  fileName: string;
  status: string;
  rowCount: number;
  createdAt: string;
  completedAt?: string | null;
};
type AuditEntry = {
  at: string;
  actor: string;
  type: string;
  description: string;
};

const defaultCsvByEntity: Record<ImportEntityType, string> = {
  account: "Account Name,Website\nPhase 6 UI Import Account,https://ui-import.example\n,https://missing-name.example",
  contact:
    "Full Name,Email,Phone,Account Name\nPhase 6 UI Import Contact,ui-contact@example.com,+15550199,Phase 6 UI Import Account\n,missing-name@example.com,+15550198,Phase 6 UI Import Account",
  opportunity:
    "Title,Account Name,Stage Key,Expected Amount,Close Date\nPhase 6 UI Import Opportunity,Phase 6 UI Import Account,qualification,78901.00,2026-10-12\n,Phase 6 UI Import Account,qualification,bad-amount,2026-10-13",
};

const defaultFileNameByEntity: Record<ImportEntityType, string> = {
  account: "accounts.csv",
  contact: "contacts.csv",
  opportunity: "opportunities.csv",
};

const importFieldOptions: Record<ImportEntityType, string[]> = {
  account: ["name", "website"],
  contact: ["fullName", "email", "phone", "accountName"],
  opportunity: ["title", "accountName", "stageKey", "expectedAmount", "closeDate"],
};

function extractSourceColumns(csvContent: string): string[] {
  const headerLine = csvContent.split(/\r?\n/)[0]?.trim() ?? "";
  if (!headerLine) {
    return [];
  }
  return headerLine.split(",").map((value) => value.trim()).filter(Boolean);
}

function defaultMappingForEntity(entityType: ImportEntityType): Record<string, string> {
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

function normalizeMapping(entityType: ImportEntityType, columns: string[]): Record<string, string> {
  const defaults = defaultMappingForEntity(entityType);
  return Object.fromEntries(columns.map((column) => [column, defaults[column] ?? ""]));
}

function formatRowLabel(row: ImportPreviewRowItem | ImportJobRowItem): string {
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

function summarizeImportErrors(rows: Array<ImportPreviewRowItem | ImportJobRowItem>) {
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

function statusClass(status: string): string {
  if (status === "executed" || status === "completed") {
    return "p-approved";
  }
  if (status === "failed") {
    return "p-rejected";
  }
  if (status === "queued" || status === "running") {
    return "p-pending";
  }
  if (status === "previewed") {
    return "p-sent_back";
  }
  return "p-none";
}

export function BulkOperationsPanel({ currentUser, onAccountsChanged }: BulkOperationsPanelProps) {
  const [activeTab, setActiveTab] = useState<BulkOpsTab>("import");
  const [importEntityType, setImportEntityType] = useState<ImportEntityType>("account");
  const [csvContent, setCsvContent] = useState(defaultCsvByEntity.account);
  const [fileName, setFileName] = useState(defaultFileNameByEntity.account);
  const [mapping, setMapping] = useState<Record<string, string>>(normalizeMapping("account", extractSourceColumns(defaultCsvByEntity.account)));
  const [importStep, setImportStep] = useState(1);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [importJob, setImportJob] = useState<ImportJobDetailResponse | null>(null);
  const [exportEntityType, setExportEntityType] = useState<ExportEntityType>("account");
  const [exportQuery, setExportQuery] = useState("");
  const [exportStageKey, setExportStageKey] = useState("");
  const [exportJob, setExportJob] = useState<ExportJobResponse | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [isExportSubmitting, setIsExportSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sourceColumns = useMemo(() => extractSourceColumns(csvContent), [csvContent]);
  const visibleJob = importJob ?? preview;
  const importRows = importJob?.rows ?? preview?.rows ?? [];
  const rowIssues = useMemo(() => summarizeImportErrors(importRows), [importRows]);
  const canExecuteImport = visibleJob?.job.status === "previewed";

  const flash = (nextMessage: string) => {
    setToast(nextMessage);
    window.setTimeout(() => {
      setToast((current) => (current === nextMessage ? null : current));
    }, 2800);
  };

  const appendAudit = (type: string, description: string) => {
    setAuditEntries((current) => [
      {
        actor: currentUser.displayName,
        at: new Date().toISOString(),
        description,
        type,
      },
      ...current,
    ]);
  };

  const upsertHistory = (entry: HistoryEntry) => {
    setHistoryEntries((current) => [entry, ...current.filter((existing) => existing.id !== entry.id)]);
  };

  useEffect(() => {
    if (!importJob || !["queued", "running"].includes(importJob.job.status)) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshImportJob(importJob.job.id, { silent: true });
    }, 1200);

    return () => window.clearInterval(timer);
  }, [importJob?.job.id, importJob?.job.status]);

  useEffect(() => {
    if (!sourceColumns.length) {
      setImportStep(1);
      return;
    }

    setMapping((current) => {
      const next = { ...normalizeMapping(importEntityType, sourceColumns), ...current };
      return Object.fromEntries(sourceColumns.map((column) => [column, next[column] ?? ""]));
    });
  }, [importEntityType, sourceColumns]);

  useEffect(() => {
    if (!sourceColumns.length) {
      return;
    }
    if (importJob?.job.status === "executed") {
      setImportStep(5);
      return;
    }
    if (importJob) {
      setImportStep(4);
      return;
    }
    if (preview) {
      setImportStep(3);
      return;
    }
    setImportStep((current) => Math.max(1, Math.min(current, 2)));
  }, [importJob, preview, sourceColumns.length]);

  const handleCreatePreview = async () => {
    try {
      setIsImportSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      const request: CreateImportPreviewRequest = {
        csvContent,
        entityType: importEntityType,
        fileName: fileName.trim() || defaultFileNameByEntity[importEntityType],
        mapping,
      };
      const response = await createImportPreview(currentUser.userId, request);
      setPreview(response);
      setImportJob(null);
      upsertHistory({
        id: response.job.id,
        mode: "import-preview",
        entityType: response.job.entityType,
        fileName: response.job.originalFileName,
        status: response.job.status,
        rowCount: response.job.totalRows,
        createdAt: response.job.createdAt,
      });
      appendAudit("preview", `Created import preview ${response.job.id} for ${response.job.originalFileName}`);
      setMessage("Import preview created");
      setImportStep(3);
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsImportSubmitting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!visibleJob) {
      return;
    }

    try {
      setIsImportSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      const response = await executeImportJob(currentUser.userId, visibleJob.job.id);
      setImportJob(response);
      setPreview(null);
      upsertHistory({
        id: response.job.id,
        mode: "import-job",
        entityType: response.job.entityType,
        fileName: response.job.originalFileName,
        status: response.job.status,
        rowCount: response.job.totalRows,
        createdAt: response.job.createdAt,
        completedAt: response.job.executedAt,
      });
      appendAudit("execute", `Queued import job ${response.job.id}`);
      setMessage("Import execution queued");
      setImportStep(4);
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsImportSubmitting(false);
    }
  };

  const refreshImportJob = async (importJobId: string, options: { silent?: boolean } = {}) => {
    try {
      if (!options.silent) {
        setIsImportSubmitting(true);
        setErrorMessage(null);
        setMessage(null);
      }
      const response = await fetchImportJob(currentUser.userId, importJobId);
      const wasPending = importJob ? ["queued", "running"].includes(importJob.job.status) : false;
      setImportJob(response);
      setPreview(null);
      upsertHistory({
        id: response.job.id,
        mode: "import-job",
        entityType: response.job.entityType,
        fileName: response.job.originalFileName,
        status: response.job.status,
        rowCount: response.job.totalRows,
        createdAt: response.job.createdAt,
        completedAt: response.job.executedAt,
      });
      if (response.job.status === "executed") {
        await onAccountsChanged();
        appendAudit("complete", `Completed import job ${response.job.id}`);
        setImportStep(5);
        if (!options.silent || wasPending) {
          setMessage("Import execution completed");
        }
      }
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      if (!options.silent) {
        setIsImportSubmitting(false);
      }
    }
  };

  const handleCreateExport = async () => {
    try {
      setIsExportSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      const response = await createExportJob(currentUser.userId, {
        entityType: exportEntityType,
        limit: 100,
        query: exportQuery.trim() || undefined,
        stageKey: exportEntityType === "opportunity" ? exportStageKey.trim() || undefined : undefined,
      });
      setExportJob(response);
      upsertHistory({
        id: response.job.id,
        mode: "export-job",
        entityType: response.job.entityType,
        fileName: `${response.job.entityType}-export.csv`,
        status: response.job.status,
        rowCount: response.job.rowCount,
        createdAt: response.job.createdAt,
        completedAt: response.job.completedAt,
      });
      appendAudit("export", `Created export job ${response.job.id}`);
      setMessage("Export job created");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsExportSubmitting(false);
    }
  };

  const filteredHistory = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return historyEntries.filter((entry) => {
      if (!normalized) {
        return true;
      }
      return [entry.id, entry.mode, entry.entityType, entry.fileName, entry.status].join(" ").toLowerCase().includes(normalized);
    });
  }, [historyEntries, searchQuery]);

  const filteredErrors = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return rowIssues.filter((issue) => {
      if (!normalized) {
        return true;
      }
      return [issue.rowNumber, issue.field, issue.issue, issue.source].join(" ").toLowerCase().includes(normalized);
    });
  }, [rowIssues, searchQuery]);

  const runningCount = historyEntries.filter((entry) => ["queued", "running"].includes(entry.status)).length;
  const rejectedRows = visibleJob ? (visibleJob.job.invalidRows ?? 0) + (visibleJob.job.skippedRows ?? 0) : 0;
  const readyExports = historyEntries.filter((entry) => entry.mode === "export-job").length;

  return (
    <section className="rep-workspace ieo-workspace crm-section bulk-ops-section">
      <div className="ieo-page-head">
        <div className="ieo-head-left">
          <div className="ieo-crumb">
            <span>Data &amp; Quality</span>
            <span className="sep">/</span>
            <strong>Import / Export Operations</strong>
            <span className="ieo-running-chip">
              <span className="ieo-pulse-dot" />
              <span className="mono">{runningCount} running</span>
            </span>
          </div>
        </div>
        <div className="ieo-head-right">
          <div className="ieo-search">
            <input
              placeholder="Search jobs, files, entities…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery ? (
              <button className="ieo-search-clear" type="button" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            ) : null}
          </div>
          <button className={`rep-btn rep-btn-ghost ieo-audit-toggle${auditOpen ? " active" : ""}`} type="button" onClick={() => setAuditOpen((current) => !current)}>
            {auditOpen ? "▲" : "▼"} Audit
          </button>
        </div>
      </div>

      <div className="ieo-kpi-band">
        {[
          { label: "Imports running", value: runningCount, foot: `${visibleJob?.job.totalRows ?? 0} rows in active job` },
          { label: "Rows rejected", value: rejectedRows, foot: rowIssues.length ? `${rowIssues.length} row issues visible` : "No row issues loaded" },
          { label: "Exports ready", value: readyExports, foot: exportJob ? exportJob.job.id : "No export this session" },
          { label: "Jobs needing review", value: historyEntries.filter((entry) => ["failed", "previewed"].includes(entry.status)).length, foot: "Previewed or failed in this session" },
        ].map((metric) => (
          <div className="ieo-kpi-item" key={metric.label}>
            <div className="ieo-kpi-l">{metric.label}</div>
            <div className="ieo-kpi-v mono">{metric.value}</div>
            <div className="ieo-kpi-foot">{metric.foot}</div>
          </div>
        ))}
      </div>

      <div className="ieo-tab-strip" role="tablist">
        {(["import", "export", "history", "errors"] as BulkOpsTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`ieo-tab${activeTab === tab ? " active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "import" ? "Import" : tab === "export" ? "Export" : tab === "history" ? "Job History" : "Row Errors"}
            <span className="ieo-tab-badge mono">
              {tab === "history" ? historyEntries.length : tab === "errors" ? filteredErrors.length : tab === "import" ? importStep : readyExports}
            </span>
          </button>
        ))}
      </div>

      {errorMessage ? <div className="error-box">{errorMessage}</div> : null}
      {message ? <div className="success-box">{message}</div> : null}

      <div className="ieo-body">
        {activeTab === "import" ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div className="ieo-step-bar">
              {[1, 2, 3, 4, 5].map((step) => (
                <button
                  key={step}
                  type="button"
                  className={`ieo-step${importStep === step ? " active" : ""}${importStep > step ? " done" : ""}`}
                  onClick={() => {
                    if (step <= 2 || (step === 3 && preview) || (step === 4 && visibleJob) || (step === 5 && importJob?.job.status === "executed")) {
                      setImportStep(step);
                    }
                  }}
                >
                  <span className="ieo-step-circle">{step}</span>
                  <span className="ieo-step-label">
                    {step === 1 ? "Upload" : step === 2 ? "Map" : step === 3 ? "Validate" : step === 4 ? "Execute" : "Results"}
                  </span>
                </button>
              ))}
            </div>

            {importStep === 1 ? (
              <div className="ieo-two-col">
                <section className="rep-panel ieo-upload-panel">
                  <div className="rep-panel-head">
                    <div className="rep-panel-title">Step 1 · Upload</div>
                  </div>
                  <label className="ieo-config-label">
                    <span>Entity</span>
                    <select
                      value={importEntityType}
                      onChange={(event) => {
                        const nextEntity = event.target.value as ImportEntityType;
                        setImportEntityType(nextEntity);
                        setFileName(defaultFileNameByEntity[nextEntity]);
                        setCsvContent(defaultCsvByEntity[nextEntity]);
                        setMapping(normalizeMapping(nextEntity, extractSourceColumns(defaultCsvByEntity[nextEntity])));
                        setPreview(null);
                        setImportJob(null);
                        setImportStep(1);
                      }}
                    >
                      <option value="account">Account</option>
                      <option value="contact">Contact</option>
                      <option value="opportunity">Opportunity</option>
                    </select>
                  </label>
                  <label className="ieo-config-label">
                    <span>File name</span>
                    <input value={fileName} onChange={(event) => setFileName(event.target.value)} />
                  </label>
                  <label className="ieo-config-label">
                    <span>CSV content</span>
                    <textarea value={csvContent} onChange={(event) => setCsvContent(event.target.value)} />
                  </label>
                  <div className="button-row">
                    <button className="rep-btn rep-btn-primary" type="button" onClick={() => setImportStep(2)} disabled={!sourceColumns.length}>
                      Continue to mapping
                    </button>
                  </div>
                </section>

                <section className="rep-panel">
                  <div className="rep-panel-head">
                    <div className="rep-panel-title">
                      File profile
                      <em>{sourceColumns.length} columns detected</em>
                    </div>
                  </div>
                  <div className="ieo-file-loaded">
                    <div className="ieo-file-icon mono">CSV</div>
                    <div>
                      <strong>{fileName}</strong>
                      <div className="ieo-kpi-foot">{csvContent.split(/\r?\n/).filter(Boolean).length - 1} rows in sample payload</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {sourceColumns.map((column) => (
                      <span className="ieo-col-chip mono" key={column}>
                        {column}
                      </span>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {importStep === 2 ? (
              <section className="rep-panel">
                <div className="rep-panel-head">
                  <div className="rep-panel-title">
                    Step 2 · Map columns
                    <em>{sourceColumns.length} source columns</em>
                  </div>
                </div>
                <div className="rep-table-scroll">
                  <table className="rep-table ieo-mapping-table">
                    <thead>
                      <tr>
                        <th>Source column</th>
                        <th>Target field</th>
                        <th>Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceColumns.map((column) => {
                        const target = mapping[column] ?? "";
                        return (
                          <tr key={column}>
                            <td className="mono">{column}</td>
                            <td>
                              <select
                                className="ieo-target-field-select"
                                value={target}
                                onChange={(event) =>
                                  setMapping((current) => ({
                                    ...current,
                                    [column]: event.target.value,
                                  }))
                                }
                              >
                                <option value="">— not mapped —</option>
                                {importFieldOptions[importEntityType].map((fieldKey) => (
                                  <option key={fieldKey} value={fieldKey}>
                                    {fieldKey}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="mono">{target || "—"}</td>
                            <td>
                              <span className="ieo-status-chip mono">{target ? "mapped" : "unmapped"}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="button-row">
                  <button className="rep-btn rep-btn-ghost" type="button" onClick={() => setImportStep(1)}>
                    Back to upload
                  </button>
                  <button className="rep-btn rep-btn-primary" type="button" disabled={isImportSubmitting} onClick={() => void handleCreatePreview()}>
                    Create preview
                  </button>
                </div>
              </section>
            ) : null}

            {importStep === 3 && visibleJob ? (
              <div style={{ display: "grid", gap: 14 }}>
                <div className="ieo-kpi-band">
                  <div className="ieo-kpi-item">
                    <div className="ieo-kpi-l">Valid rows</div>
                    <div className="ieo-kpi-v mono">{visibleJob.job.validRows}</div>
                  </div>
                  <div className="ieo-kpi-item">
                    <div className="ieo-kpi-l">Rejected rows</div>
                    <div className="ieo-kpi-v mono">{visibleJob.job.invalidRows}</div>
                  </div>
                  <div className="ieo-kpi-item">
                    <div className="ieo-kpi-l">Skipped rows</div>
                    <div className="ieo-kpi-v mono">{visibleJob.job.skippedRows}</div>
                  </div>
                  <div className="ieo-kpi-item">
                    <div className="ieo-kpi-l">Preview rows</div>
                    <div className="ieo-kpi-v mono">{visibleJob.job.totalRows}</div>
                  </div>
                </div>
                <section className="rep-panel">
                  <div className="rep-panel-head">
                    <div className="rep-panel-title">
                      Step 3 · Validation
                      <em>{rowIssues.length} issues</em>
                    </div>
                    <div className="rep-panel-actions">
                      <button className="rep-btn rep-btn-ghost" type="button" onClick={() => setImportStep(2)}>
                        Adjust mapping
                      </button>
                      <button className="rep-btn rep-btn-primary" type="button" onClick={() => setImportStep(4)}>
                        Continue to execute
                      </button>
                    </div>
                  </div>
                  <div className="rep-table-scroll">
                    <table className="rep-table">
                      <thead>
                        <tr>
                          <th className="num">Row</th>
                          <th>Record</th>
                          <th>Issue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowIssues.length ? (
                          rowIssues.map((issue) => (
                            <tr key={`${issue.rowNumber}-${issue.issue}`}>
                              <td className="num mono">{issue.rowNumber}</td>
                              <td>{issue.source}</td>
                              <td>{issue.issue}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="num mono">—</td>
                            <td colSpan={2}>No validation errors in the current preview.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ) : null}

            {importStep === 4 && visibleJob ? (
              <div className="ieo-two-col">
                <section className="rep-panel">
                  <div className="rep-panel-head">
                    <div className="rep-panel-title">Step 4 · Execute</div>
                  </div>
                  <div className="ieo-job-summary-grid">
                    <div>
                      <div className="ieo-kpi-l">Job ID</div>
                      <div className="mono">{visibleJob.job.id}</div>
                    </div>
                    <div>
                      <div className="ieo-kpi-l">Status</div>
                      <div className="mono">{visibleJob.job.status}</div>
                    </div>
                    <div>
                      <div className="ieo-kpi-l">Rows</div>
                      <div className="mono">{visibleJob.job.totalRows}</div>
                    </div>
                    <div>
                      <div className="ieo-kpi-l">File</div>
                      <div className="mono">{visibleJob.job.originalFileName}</div>
                    </div>
                  </div>
                  <div className="button-row">
                    <button className="rep-btn rep-btn-primary" disabled={!canExecuteImport || isImportSubmitting} onClick={() => void handleExecuteImport()} type="button">
                      Start job
                    </button>
                    <button className="rep-btn rep-btn-ghost" disabled={!visibleJob || isImportSubmitting} onClick={() => visibleJob && void refreshImportJob(visibleJob.job.id)} type="button">
                      Refresh
                    </button>
                  </div>
                </section>
                <section className="rep-panel ieo-config-panel">
                  <div className="rep-panel-head">
                    <div className="rep-panel-title">Live run state</div>
                  </div>
                  <div className="job-summary">
                    <span className={`rep-pill ${statusClass(visibleJob.job.status)}`}>
                      <span className="dot" />
                      {visibleJob.job.status}
                    </span>
                    <span>{visibleJob.job.executedRows}/{visibleJob.job.totalRows} executed</span>
                    <span>{visibleJob.job.skippedRows} skipped</span>
                  </div>
                  <div className="ieo-panel-foot">
                    Use refresh while the backend job is queued or running. Step 5 opens automatically after execution completes.
                  </div>
                </section>
              </div>
            ) : null}

            {importStep === 5 && importJob ? (
              <div style={{ display: "grid", gap: 14 }}>
                <section className="rep-panel">
                  <div className="rep-panel-head">
                    <div className="rep-panel-title">
                      Step 5 · Results
                      <em>{importJob.job.id}</em>
                    </div>
                  </div>
                  <div className="job-summary">
                    <span className={`rep-pill ${statusClass(importJob.job.status)}`}>
                      <span className="dot" />
                      {importJob.job.status}
                    </span>
                    <span>{importJob.job.executedRows} executed</span>
                    <span>{importJob.job.invalidRows} invalid</span>
                    <span>{importJob.job.skippedRows} skipped</span>
                  </div>
                  <div className="rep-table-scroll">
                    <table className="rep-table">
                      <thead>
                        <tr>
                          <th className="num">Row</th>
                          <th>Record</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importJob.rows.map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="num mono">{row.rowNumber}</td>
                            <td>{formatRowLabel(row)}</td>
                            <td>{row.executionStatus}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="button-row">
                    <button className="rep-btn" type="button" onClick={() => flash(`Rejected-row download is not wired yet for ${importJob.job.id} · CONSTRAINT`)}>
                      Download rejected rows
                    </button>
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "export" ? (
          <div className="ieo-two-col">
            <section className="rep-panel">
              <div className="rep-panel-head">
                <div className="rep-panel-title">Create export</div>
              </div>
              <label className="ieo-config-label">
                <span>Entity</span>
                <select
                  value={exportEntityType}
                  onChange={(event) => {
                    setExportEntityType(event.target.value as ExportEntityType);
                    setExportJob(null);
                  }}
                >
                  <option value="account">Account</option>
                  <option value="opportunity">Opportunity</option>
                </select>
              </label>
              <label className="ieo-config-label">
                <span>Search query</span>
                <input value={exportQuery} onChange={(event) => setExportQuery(event.target.value)} />
              </label>
              {exportEntityType === "opportunity" ? (
                <label className="ieo-config-label">
                  <span>Stage key</span>
                  <input value={exportStageKey} onChange={(event) => setExportStageKey(event.target.value)} />
                </label>
              ) : null}
              <div className="button-row">
                <button className="rep-btn rep-btn-primary" disabled={isExportSubmitting} onClick={() => void handleCreateExport()} type="button">
                  Create export job
                </button>
              </div>
            </section>
            <section className="rep-panel ieo-config-panel">
              <div className="rep-panel-head">
                <div className="rep-panel-title">Latest export</div>
              </div>
              {exportJob ? (
                <>
                  <div className="job-summary">
                    <span className={`rep-pill ${statusClass(exportJob.job.status)}`}>
                      <span className="dot" />
                      {exportJob.job.status}
                    </span>
                    <span>{exportJob.job.id}</span>
                    <span>{exportJob.job.rowCount} rows</span>
                  </div>
                  <label className="ieo-config-label">
                    <span>CSV output</span>
                    <textarea readOnly value={exportJob.csvContent} />
                  </label>
                </>
              ) : (
                <div className="ieo-panel-empty">No export generated in this session.</div>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === "history" ? (
          <section className="rep-panel ieo-jobs-panel">
            <div className="rep-panel-head">
              <div className="rep-panel-title">
                Job history
                <em>session-scoped without list endpoint</em>
              </div>
            </div>
            <div className="rep-table-scroll">
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Mode</th>
                    <th>Entity</th>
                    <th>File</th>
                    <th>Status</th>
                    <th className="num">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length ? (
                    filteredHistory.map((entry) => (
                      <tr key={entry.id}>
                        <td className="mono">{entry.id}</td>
                        <td>{entry.mode}</td>
                        <td>{entry.entityType}</td>
                        <td>{entry.fileName}</td>
                        <td>{entry.status}</td>
                        <td className="num mono">{entry.rowCount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No session jobs match the current search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === "errors" ? (
          <section className="rep-panel">
            <div className="rep-panel-head">
              <div className="rep-panel-title">
                Row errors
                <em>current preview / job only</em>
              </div>
            </div>
            <div className="rep-table-scroll">
              <table className="rep-table">
                <thead>
                  <tr>
                    <th className="num">Row</th>
                    <th>Field</th>
                    <th>Issue</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredErrors.length ? (
                    filteredErrors.map((issue) => (
                      <tr key={`${issue.rowNumber}-${issue.issue}`}>
                        <td className="num mono">{issue.rowNumber}</td>
                        <td>{issue.field}</td>
                        <td>{issue.issue}</td>
                        <td>{issue.source}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>No row issues are loaded for the current import state.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>

      {auditOpen ? (
        <section className="rep-panel">
          <div className="rep-panel-head">
            <div className="rep-panel-title">
              Audit
              <em>session log</em>
            </div>
          </div>
          <div className="rep-table-scroll">
            <table className="rep-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Actor</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.length ? (
                  auditEntries.map((entry) => (
                    <tr key={`${entry.at}-${entry.description}`}>
                      <td className="mono">{new Date(entry.at).toLocaleTimeString()}</td>
                      <td>{entry.type}</td>
                      <td>{entry.actor}</td>
                      <td>{entry.description}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>No audit events captured in this session.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="rep-foot-ruler">
        <span>SALES OPS CRM · {currentUser.tenantName.toUpperCase()} · LOCAL PILOT</span>
        <span>{currentUser.roleKey.toUpperCase()} · {currentUser.displayName}</span>
        <span>{historyEntries.length} SESSION JOBS · {rowIssues.length} CURRENT ISSUES</span>
      </div>

      {toast ? (
        <div className="rep-toast">
          <span className="ok">i</span>
          {toast}
        </div>
      ) : null}
    </section>
  );
}
