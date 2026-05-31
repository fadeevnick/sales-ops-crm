import type { ExportJobResponse, ImportJobDetailResponse, ImportPreviewResponse } from "../../types/bulkOperations";
import {
  type AuditEntry,
  type BulkOpsTab,
  type ExportEntityType,
  type HistoryEntry,
  type ImportEntityType,
  defaultCsvByEntity,
  defaultFileNameByEntity,
  formatRowLabel,
  importFieldOptions,
  statusClass,
  type VisibleJob,
} from "./BulkOperationsShared";

export function BulkOpsTabs({
  activeTab,
  setActiveTab,
  historyEntries,
  filteredErrorsLength,
  readyExports,
}: {
  activeTab: BulkOpsTab;
  setActiveTab: (tab: BulkOpsTab) => void;
  historyEntries: HistoryEntry[];
  filteredErrorsLength: number;
  readyExports: number;
}) {
  // Import is a wizard, not a collection — no count badge. The rest show their item counts.
  const badgeFor = (tab: BulkOpsTab): number | null =>
    tab === "history" ? historyEntries.length : tab === "errors" ? filteredErrorsLength : tab === "export" ? readyExports : null;

  return (
    <div className="ieo-tab-strip" role="tablist">
      {(["import", "export", "history", "errors"] as BulkOpsTab[]).map((tab) => {
        const badge = badgeFor(tab);
        return (
          <button key={tab} type="button" className={`ieo-tab${activeTab === tab ? " active" : ""}`} onClick={() => setActiveTab(tab)}>
            {tab === "import" ? "Import" : tab === "export" ? "Export" : tab === "history" ? "Job History" : "Row Errors"}
            {badge === null ? null : <span className="ieo-tab-badge mono">{badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function ImportTab({
  importStep,
  setImportStep,
  importEntityType,
  setImportEntityType,
  csvContent,
  setCsvContent,
  fileName,
  setFileName,
  sourceColumns,
  mapping,
  setMapping,
  preview,
  importJob,
  visibleJob,
  rowIssues,
  isImportSubmitting,
  canExecuteImport,
  onCreatePreview,
  onExecuteImport,
  onRefreshJob,
}: {
  importStep: number;
  setImportStep: (step: number) => void;
  importEntityType: ImportEntityType;
  setImportEntityType: (value: ImportEntityType) => void;
  csvContent: string;
  setCsvContent: (value: string) => void;
  fileName: string;
  setFileName: (value: string) => void;
  sourceColumns: string[];
  mapping: Record<string, string>;
  setMapping: (next: Record<string, string> | ((current: Record<string, string>) => Record<string, string>)) => void;
  preview: ImportPreviewResponse | null;
  importJob: ImportJobDetailResponse | null;
  visibleJob: VisibleJob;
  rowIssues: Array<{ rowNumber: number; field: string; severity: "error"; issue: string; source: string }>;
  isImportSubmitting: boolean;
  canExecuteImport: boolean;
  onCreatePreview: () => Promise<void> | void;
  onExecuteImport: () => Promise<void> | void;
  onRefreshJob: (jobId: string) => Promise<void> | void;
}) {
  return (
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
            <span className="ieo-step-label">{step === 1 ? "Upload" : step === 2 ? "Map" : step === 3 ? "Validate" : step === 4 ? "Execute" : "Results"}</span>
          </button>
        ))}
      </div>

      {importStep === 1 ? (
        <div className="ieo-two-col">
          <section className="rep-panel ieo-upload-panel">
            <div className="rep-panel-head"><div className="rep-panel-title">Step 1 · Upload</div></div>
            <label className="ieo-config-label">
              <span>Entity</span>
              <select
                value={importEntityType}
                onChange={(event) => {
                  const nextEntity = event.target.value as ImportEntityType;
                  setImportEntityType(nextEntity);
                  setFileName(defaultFileNameByEntity[nextEntity]);
                  setCsvContent(defaultCsvByEntity[nextEntity]);
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
            <div className="rep-panel-head"><div className="rep-panel-title">File profile<em>{sourceColumns.length} columns detected</em></div></div>
            <div className="ieo-file-loaded">
              <div className="ieo-file-icon mono">CSV</div>
              <div>
                <strong>{fileName}</strong>
                <div className="ieo-kpi-foot">{csvContent.split(/\r?\n/).filter(Boolean).length - 1} rows in sample payload</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {sourceColumns.map((column) => <span className="ieo-col-chip mono" key={column}>{column}</span>)}
            </div>
          </section>
        </div>
      ) : null}

      {importStep === 2 ? (
        <section className="rep-panel">
          <div className="rep-panel-head"><div className="rep-panel-title">Step 2 · Map columns<em>{sourceColumns.length} source columns</em></div></div>
          <div className="rep-table-scroll">
            <table className="rep-table ieo-mapping-table">
              <thead>
                <tr><th>Source column</th><th>Target field</th><th>Type</th><th>Status</th></tr>
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
                            setMapping((current) => ({ ...current, [column]: event.target.value }))
                          }
                        >
                          <option value="">— not mapped —</option>
                          {importFieldOptions[importEntityType].map((fieldKey) => (
                            <option key={fieldKey} value={fieldKey}>{fieldKey}</option>
                          ))}
                        </select>
                      </td>
                      <td className="mono">{target || "—"}</td>
                      <td><span className="ieo-status-chip mono">{target ? "mapped" : "unmapped"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="button-row">
            <button className="rep-btn rep-btn-ghost" type="button" onClick={() => setImportStep(1)}>Back to upload</button>
            <button className="rep-btn rep-btn-primary" type="button" disabled={isImportSubmitting} onClick={() => void onCreatePreview()}>Create preview</button>
          </div>
        </section>
      ) : null}

      {importStep === 3 && visibleJob ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="ieo-kpi-band">
            <div className="ieo-kpi-item"><div className="ieo-kpi-l">Valid rows</div><div className="ieo-kpi-v mono">{visibleJob.job.validRows}</div></div>
            <div className="ieo-kpi-item"><div className="ieo-kpi-l">Rejected rows</div><div className="ieo-kpi-v mono">{visibleJob.job.invalidRows}</div></div>
            <div className="ieo-kpi-item"><div className="ieo-kpi-l">Skipped rows</div><div className="ieo-kpi-v mono">{visibleJob.job.skippedRows}</div></div>
            <div className="ieo-kpi-item"><div className="ieo-kpi-l">Preview rows</div><div className="ieo-kpi-v mono">{visibleJob.job.totalRows}</div></div>
          </div>
          <section className="rep-panel">
            <div className="rep-panel-head">
              <div className="rep-panel-title">Step 3 · Validation<em>{rowIssues.length} issues</em></div>
              <div className="rep-panel-actions">
                <button className="rep-btn rep-btn-ghost" type="button" onClick={() => setImportStep(2)}>Adjust mapping</button>
                <button className="rep-btn rep-btn-primary" type="button" onClick={() => setImportStep(4)}>Continue to execute</button>
              </div>
            </div>
            <div className="rep-table-scroll">
              <table className="rep-table">
                <thead><tr><th className="num">Row</th><th>Record</th><th>Issue</th></tr></thead>
                <tbody>
                  {rowIssues.length ? rowIssues.map((issue) => (
                    <tr key={`${issue.rowNumber}-${issue.issue}`}>
                      <td className="num mono">{issue.rowNumber}</td>
                      <td>{issue.source}</td>
                      <td>{issue.issue}</td>
                    </tr>
                  )) : (
                    <tr><td className="num mono">—</td><td colSpan={2}>No validation errors in the current preview.</td></tr>
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
            <div className="rep-panel-head"><div className="rep-panel-title">Step 4 · Execute</div></div>
            <div className="ieo-job-summary-grid">
              <div><div className="ieo-kpi-l">Job ID</div><div className="mono">{visibleJob.job.id}</div></div>
              <div><div className="ieo-kpi-l">Status</div><div className="mono">{visibleJob.job.status}</div></div>
              <div><div className="ieo-kpi-l">Rows</div><div className="mono">{visibleJob.job.totalRows}</div></div>
              <div><div className="ieo-kpi-l">File</div><div className="mono">{visibleJob.job.originalFileName}</div></div>
            </div>
            <div className="button-row">
              <button className="rep-btn rep-btn-primary" disabled={!canExecuteImport || isImportSubmitting} onClick={() => void onExecuteImport()} type="button">Start job</button>
              <button className="rep-btn rep-btn-ghost" disabled={!visibleJob || isImportSubmitting} onClick={() => visibleJob && void onRefreshJob(visibleJob.job.id)} type="button">Refresh</button>
            </div>
          </section>
          <section className="rep-panel ieo-config-panel">
            <div className="rep-panel-head"><div className="rep-panel-title">Live run state</div></div>
            <div className="job-summary">
              <span className={`rep-pill ${statusClass(visibleJob.job.status)}`}><span className="dot" />{visibleJob.job.status}</span>
              <span>{visibleJob.job.executedRows}/{visibleJob.job.totalRows} executed</span>
              <span>{visibleJob.job.skippedRows} skipped</span>
            </div>
            <div className="ieo-panel-foot">Use refresh while the backend job is queued or running. Step 5 opens automatically after execution completes.</div>
          </section>
        </div>
      ) : null}

      {importStep === 5 && importJob ? (
        <div style={{ display: "grid", gap: 14 }}>
          <section className="rep-panel">
            <div className="rep-panel-head"><div className="rep-panel-title">Step 5 · Results<em>{importJob.job.id}</em></div></div>
            <div className="job-summary">
              <span className={`rep-pill ${statusClass(importJob.job.status)}`}><span className="dot" />{importJob.job.status}</span>
              <span>{importJob.job.executedRows} executed</span>
              <span>{importJob.job.invalidRows} invalid</span>
              <span>{importJob.job.skippedRows} skipped</span>
            </div>
            <div className="rep-table-scroll">
              <table className="rep-table">
                <thead><tr><th className="num">Row</th><th>Record</th><th>Status</th></tr></thead>
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
          </section>
        </div>
      ) : null}
    </div>
  );
}

export function ExportTab({
  exportEntityType,
  setExportEntityType,
  exportQuery,
  setExportQuery,
  exportStageKey,
  setExportStageKey,
  exportJob,
  isExportSubmitting,
  onCreateExport,
}: {
  exportEntityType: ExportEntityType;
  setExportEntityType: (value: ExportEntityType) => void;
  exportQuery: string;
  setExportQuery: (value: string) => void;
  exportStageKey: string;
  setExportStageKey: (value: string) => void;
  exportJob: ExportJobResponse | null;
  isExportSubmitting: boolean;
  onCreateExport: () => Promise<void> | void;
}) {
  return (
    <div className="ieo-two-col">
      <section className="rep-panel">
        <div className="rep-panel-head"><div className="rep-panel-title">Create export</div></div>
        <label className="ieo-config-label">
          <span>Entity</span>
          <select value={exportEntityType} onChange={(event) => setExportEntityType(event.target.value as ExportEntityType)}>
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
          <button className="rep-btn rep-btn-primary" disabled={isExportSubmitting} onClick={() => void onCreateExport()} type="button">Create export job</button>
        </div>
      </section>
      <section className="rep-panel ieo-config-panel">
        <div className="rep-panel-head"><div className="rep-panel-title">Latest export</div></div>
        {exportJob ? (
          <>
            <div className="job-summary">
              <span className={`rep-pill ${statusClass(exportJob.job.status)}`}><span className="dot" />{exportJob.job.status}</span>
              <span>{exportJob.job.entityType}-export.csv</span>
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
  );
}

const HISTORY_MODE_LABEL: Record<HistoryEntry["mode"], string> = {
  "import-preview": "Import preview",
  "import-job": "Import",
  "export-job": "Export",
};

export function HistoryTab({ filteredHistory }: { filteredHistory: HistoryEntry[] }) {
  return (
    <section className="rep-panel ieo-jobs-panel">
      <div className="rep-panel-head"><div className="rep-panel-title">Job history<em>session-scoped without list endpoint</em></div></div>
      <div className="rep-table-scroll">
        <table className="rep-table">
          <thead><tr><th>ID</th><th>Mode</th><th>Entity</th><th>File</th><th>Status</th><th className="num">Rows</th></tr></thead>
          <tbody>
            {filteredHistory.length ? filteredHistory.map((entry) => (
              <tr key={entry.id}>
                <td className="mono">{entry.id}</td>
                <td>{HISTORY_MODE_LABEL[entry.mode]}</td>
                <td>{entry.entityType}</td>
                <td>{entry.fileName}</td>
                <td>{entry.status}</td>
                <td className="num mono">{entry.rowCount}</td>
              </tr>
            )) : (
              <tr><td colSpan={6}>No session jobs match the current search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ErrorsTab({
  filteredErrors,
}: {
  filteredErrors: Array<{ rowNumber: number; field: string; severity: "error"; issue: string; source: string }>;
}) {
  return (
    <section className="rep-panel">
      <div className="rep-panel-head"><div className="rep-panel-title">Row errors<em>current preview / job only</em></div></div>
      <div className="rep-table-scroll">
        <table className="rep-table">
          <thead><tr><th className="num">Row</th><th>Field</th><th>Issue</th><th>Source</th></tr></thead>
          <tbody>
            {filteredErrors.length ? filteredErrors.map((issue) => (
              <tr key={`${issue.rowNumber}-${issue.issue}`}>
                <td className="num mono">{issue.rowNumber}</td>
                <td>{issue.field}</td>
                <td>{issue.issue}</td>
                <td>{issue.source}</td>
              </tr>
            )) : (
              <tr><td colSpan={4}>No row issues are loaded for the current import state.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AuditPanel({ auditEntries }: { auditEntries: AuditEntry[] }) {
  return (
    <section className="rep-panel">
      <div className="rep-panel-head"><div className="rep-panel-title">Audit<em>session log</em></div></div>
      <div className="rep-table-scroll">
        <table className="rep-table">
          <thead><tr><th>Time</th><th>Type</th><th>Actor</th><th>Description</th></tr></thead>
          <tbody>
            {auditEntries.length ? auditEntries.map((entry) => (
              <tr key={`${entry.at}-${entry.description}`}>
                <td className="mono">{new Date(entry.at).toLocaleTimeString()}</td>
                <td>{entry.type}</td>
                <td>{entry.actor}</td>
                <td>{entry.description}</td>
              </tr>
            )) : (
              <tr><td colSpan={4}>No audit events captured in this session.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
