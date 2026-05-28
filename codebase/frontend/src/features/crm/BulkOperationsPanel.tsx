import { useEffect, useState } from "react";
import {
  createExportJob,
  createImportPreview,
  executeImportJob,
  fetchImportJob,
} from "../../api/bulkOperations";
import { describeRequestError } from "../../api/session";
import type { ExportJobResponse, ImportJobDetailResponse, ImportPreviewResponse } from "../../types/bulkOperations";
import type { CurrentUser } from "../../types/session";

type BulkOperationsPanelProps = {
  currentUser: CurrentUser;
  onAccountsChanged: () => Promise<void>;
};

type ImportEntityType = "account" | "contact" | "opportunity";
type ExportEntityType = "account" | "opportunity";
type BulkOpsTab = "import" | "export";

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

export function BulkOperationsPanel({ currentUser, onAccountsChanged }: BulkOperationsPanelProps) {
  const [activeTab, setActiveTab] = useState<BulkOpsTab>("import");
  const [importEntityType, setImportEntityType] = useState<ImportEntityType>("account");
  const [csvContent, setCsvContent] = useState(defaultCsvByEntity.account);
  const [fileName, setFileName] = useState(defaultFileNameByEntity.account);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [importJob, setImportJob] = useState<ImportJobDetailResponse | null>(null);
  const [exportEntityType, setExportEntityType] = useState<ExportEntityType>("account");
  const [exportQuery, setExportQuery] = useState("");
  const [exportStageKey, setExportStageKey] = useState("");
  const [exportJob, setExportJob] = useState<ExportJobResponse | null>(null);
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [isExportSubmitting, setIsExportSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const visibleJob = importJob ?? preview;
  const importRows = importJob?.rows ?? preview?.rows ?? [];
  const canExecuteImport = visibleJob?.job.status === "previewed";

  useEffect(() => {
    if (!importJob || !["queued", "running"].includes(importJob.job.status)) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshImportJob(importJob.job.id, { silent: true });
    }, 1200);

    return () => window.clearInterval(timer);
  }, [importJob?.job.id, importJob?.job.status]);

  const handleCreatePreview = async () => {
    try {
      setIsImportSubmitting(true);
      setErrorMessage(null);
      setMessage(null);
      const response = await createImportPreview(currentUser.userId, {
        csvContent,
        entityType: importEntityType,
        fileName: fileName.trim() || defaultFileNameByEntity[importEntityType],
        mapping: mappingForEntity(importEntityType),
      });
      setPreview(response);
      setImportJob(null);
      setMessage("Import preview created");
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
      setMessage("Import execution queued");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsImportSubmitting(false);
    }
  };

  const refreshImportJob = async (
    importJobId: string,
    options: { silent?: boolean } = {},
  ) => {
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
      if (response.job.status === "executed") {
        await onAccountsChanged();
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
      setMessage("Export job created");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsExportSubmitting(false);
    }
  };

  const importingRows = visibleJob?.job.totalRows ?? 0;
  const rejectedRows = visibleJob ? (visibleJob.job.invalidRows ?? 0) + (visibleJob.job.skippedRows ?? 0) : 0;
  const exportRows = exportJob?.job.rowCount ?? 0;

  return (
    <section className="crm-section bulk-ops-section ieo-workspace">
      <div className="section-heading">
        <h3>Data Operations</h3>
        <span>RevOps · Import & Export</span>
      </div>

      <div className="ieo-kpi-band">
        <div className="ieo-kpi-cell">
          <div className="ieo-kpi-l">Import status</div>
          <div className="ieo-kpi-v mono">{visibleJob ? visibleJob.job.status : "idle"}</div>
          <div className="ieo-kpi-foot">{visibleJob ? visibleJob.job.id : "no job"}</div>
        </div>
        <div className="ieo-kpi-cell">
          <div className="ieo-kpi-l">Rows in batch</div>
          <div className="ieo-kpi-v mono">{importingRows}</div>
          <div className="ieo-kpi-foot">{visibleJob ? `${visibleJob.job.executedRows} executed` : "—"}</div>
        </div>
        <div className="ieo-kpi-cell">
          <div className="ieo-kpi-l">Rejected / skipped</div>
          <div className={`ieo-kpi-v mono${rejectedRows > 0 ? " alert" : ""}`}>{rejectedRows}</div>
          <div className="ieo-kpi-foot">{visibleJob ? `${visibleJob.job.invalidRows} invalid` : "—"}</div>
        </div>
        <div className="ieo-kpi-cell">
          <div className="ieo-kpi-l">Export ready</div>
          <div className="ieo-kpi-v mono">{exportJob ? exportRows : "—"}</div>
          <div className="ieo-kpi-foot">{exportJob ? exportJob.job.status : "no export"}</div>
        </div>
      </div>

      <div className="ieo-tab-strip" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "import"}
          className={`ieo-tab${activeTab === "import" ? " active" : ""}`}
          onClick={() => setActiveTab("import")}
        >
          Import
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "export"}
          className={`ieo-tab${activeTab === "export" ? " active" : ""}`}
          onClick={() => setActiveTab("export")}
        >
          Export
        </button>
      </div>

      {errorMessage ? <div className="error-box">{errorMessage}</div> : null}
      {message ? <div className="success-box">{message}</div> : null}

      <div className="bulk-ops-grid bulk-ops-grid--single">
        {activeTab === "import" ? <div className="action-group">
          <h4>Record Import</h4>
          <label>
            <span>Entity</span>
            <select
              value={importEntityType}
              onChange={(event) => {
                const nextEntity = event.target.value as ImportEntityType;
                setImportEntityType(nextEntity);
                setFileName(defaultFileNameByEntity[nextEntity]);
                setCsvContent(defaultCsvByEntity[nextEntity]);
                setPreview(null);
                setImportJob(null);
              }}
            >
              <option value="account">Account</option>
              <option value="contact">Contact</option>
              <option value="opportunity">Opportunity</option>
            </select>
          </label>
          <label>
            <span>File name</span>
            <input value={fileName} onChange={(event) => setFileName(event.target.value)} />
          </label>
          <label>
            <span>CSV</span>
            <textarea value={csvContent} onChange={(event) => setCsvContent(event.target.value)} />
          </label>
          <div className="button-row">
            <button
              className="primary-button compact-button"
              disabled={isImportSubmitting}
              onClick={handleCreatePreview}
              type="button"
            >
              Preview
            </button>
            <button
              className="secondary-button compact-button"
              disabled={!canExecuteImport || isImportSubmitting}
              onClick={handleExecuteImport}
              type="button"
            >
              Execute
            </button>
            <button
              className="secondary-button compact-button"
              disabled={!visibleJob || isImportSubmitting}
              onClick={() => visibleJob && void refreshImportJob(visibleJob.job.id)}
              type="button"
            >
              Refresh
            </button>
          </div>

          {visibleJob ? (
            <div className="job-summary">
              <strong>{visibleJob.job.status}</strong>
              <span>{visibleJob.job.id}</span>
              <span>
                {visibleJob.job.executedRows}/{visibleJob.job.totalRows} executed
              </span>
              <span>{visibleJob.job.skippedRows} skipped</span>
            </div>
          ) : null}

          {importRows.length ? (
            <div className="bulk-row-list">
              {importRows.map((row) => (
                <div className="bulk-row" key={row.rowNumber}>
                  <strong>Row {row.rowNumber}</strong>
                  <span>{formatRowLabel(row)}</span>
                  <span>{formatRowStatus(row)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div> : null}

        {activeTab === "export" ? <div className="action-group">
          <h4>Record Export</h4>
          <label>
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
          <label>
            <span>Search</span>
            <input value={exportQuery} onChange={(event) => setExportQuery(event.target.value)} />
          </label>
          {exportEntityType === "opportunity" ? (
            <label>
              <span>Stage key</span>
              <input value={exportStageKey} onChange={(event) => setExportStageKey(event.target.value)} />
            </label>
          ) : null}
          <button
            className="primary-button compact-button"
            disabled={isExportSubmitting}
            onClick={handleCreateExport}
            type="button"
          >
            Export
          </button>

          {exportJob ? (
            <>
              <div className="job-summary">
                <strong>{exportJob.job.status}</strong>
                <span>{exportJob.job.id}</span>
                <span>{exportJob.job.rowCount} rows</span>
              </div>
              <label>
                <span>CSV output</span>
                <textarea readOnly value={exportJob.csvContent} />
              </label>
            </>
          ) : null}
        </div> : null}
      </div>
    </section>
  );
}

function mappingForEntity(entityType: ImportEntityType): Record<string, string> {
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

function formatRowLabel(row: ImportPreviewResponse["rows"][number] | ImportJobDetailResponse["rows"][number]): string {
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

function formatRowStatus(row: ImportPreviewResponse["rows"][number] | ImportJobDetailResponse["rows"][number]): string {
  if ("executionStatus" in row) {
    const executionErrors = row.executionErrors.length ? `: ${row.executionErrors.join("; ")}` : "";
    return `${row.executionStatus}${executionErrors}`;
  }

  return row.valid ? "valid" : row.validationErrors.join("; ");
}
