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
  ImportPreviewResponse,
} from "../../types/bulkOperations";
import type { CurrentUser } from "../../types/session";
import { AuditPanel, BulkOpsTabs, ErrorsTab, ExportTab, HistoryTab, ImportTab } from "./BulkOperationsSections";
import {
  type AuditEntry,
  type BulkOpsTab,
  type ExportEntityType,
  type HistoryEntry,
  type ImportEntityType,
  defaultCsvByEntity,
  defaultFileNameByEntity,
  extractSourceColumns,
  normalizeMapping,
  summarizeImportErrors,
} from "./BulkOperationsShared";

type BulkOperationsPanelProps = {
  currentUser: CurrentUser;
  onAccountsChanged: () => Promise<void>;
};

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

  const sourceColumns = useMemo(() => extractSourceColumns(csvContent), [csvContent]);
  const visibleJob = importJob ?? preview;
  const importRows = importJob?.rows ?? preview?.rows ?? [];
  const rowIssues = useMemo(() => summarizeImportErrors(importRows), [importRows]);
  const canExecuteImport = visibleJob?.job.status === "previewed";

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
          { label: "Exports ready", value: readyExports, foot: exportJob ? `Latest: ${exportJob.job.entityType} · ${exportJob.job.rowCount} rows` : "No export this session" },
          { label: "Jobs needing review", value: historyEntries.filter((entry) => ["failed", "previewed"].includes(entry.status)).length, foot: "Previewed or failed in this session" },
        ].map((metric) => (
          <div className="ieo-kpi-item" key={metric.label}>
            <div className="ieo-kpi-l">{metric.label}</div>
            <div className="ieo-kpi-v mono">{metric.value}</div>
            <div className="ieo-kpi-foot">{metric.foot}</div>
          </div>
        ))}
      </div>

      <BulkOpsTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        historyEntries={historyEntries}
        filteredErrorsLength={filteredErrors.length}
        readyExports={readyExports}
      />

      {errorMessage ? <div className="error-box">{errorMessage}</div> : null}
      {message ? <div className="success-box">{message}</div> : null}

      <div className="ieo-body">
        {activeTab === "import" ? (
          <ImportTab
            importStep={importStep}
            setImportStep={setImportStep}
            importEntityType={importEntityType}
            setImportEntityType={(nextEntity) => {
              setImportEntityType(nextEntity);
              setFileName(defaultFileNameByEntity[nextEntity]);
              setCsvContent(defaultCsvByEntity[nextEntity]);
              setMapping(normalizeMapping(nextEntity, extractSourceColumns(defaultCsvByEntity[nextEntity])));
              setPreview(null);
              setImportJob(null);
              setImportStep(1);
            }}
            csvContent={csvContent}
            setCsvContent={setCsvContent}
            fileName={fileName}
            setFileName={setFileName}
            sourceColumns={sourceColumns}
            mapping={mapping}
            setMapping={setMapping}
            preview={preview}
            importJob={importJob}
            visibleJob={visibleJob}
            rowIssues={rowIssues}
            isImportSubmitting={isImportSubmitting}
            canExecuteImport={canExecuteImport}
            onCreatePreview={handleCreatePreview}
            onExecuteImport={handleExecuteImport}
            onRefreshJob={refreshImportJob}
          />
        ) : null}

        {activeTab === "export" ? (
          <ExportTab
            exportEntityType={exportEntityType}
            setExportEntityType={(value) => {
              setExportEntityType(value);
              setExportJob(null);
            }}
            exportQuery={exportQuery}
            setExportQuery={setExportQuery}
            exportStageKey={exportStageKey}
            setExportStageKey={setExportStageKey}
            exportJob={exportJob}
            isExportSubmitting={isExportSubmitting}
            onCreateExport={handleCreateExport}
          />
        ) : null}

        {activeTab === "history" ? <HistoryTab filteredHistory={filteredHistory} /> : null}

        {activeTab === "errors" ? <ErrorsTab filteredErrors={filteredErrors} /> : null}
      </div>

      {auditOpen ? <AuditPanel auditEntries={auditEntries} /> : null}
    </section>
  );
}
