// ─────────────────────────────────────────────────────────────────────────────
// ImportExportOperations.tsx — Phase 2.8 (revised)
// ─────────────────────────────────────────────────────────────────────────────
//
// REVISIONS FROM ORIGINAL PHASE 2.8
// ─────────────────────────────────────────────────────────────────────────────
//
//  FIX 1 — Step 1 Upload now reachable
//    Added "upload" to Scenario type and to the scenario switcher strip.
//    importStep resolves to 1 when scenario === "upload".
//    Default scenario changed to "upload" so the wizard starts at step 1.
//
//  FIX 2 — Column mapping target field now editable
//    Step2_Map: mappingTargets[] local state initialised from mapping prop.
//    Target field cell renders a real <select> bound to mappingTargets state.
//    onChange updates state at the correct row index.
//    Effective status chip reflects "unmapped" when target is "— not mapped —".
//
//  FIX 3 — "Full audit ›" wired
//    AuditSection accepts an onFullAudit?: () => void prop.
//    The control is now a <button> that calls onFullAudit (not a bare <a>).
//    Main component owns auditFullOpen state; clicking opens AuditFullModal.
//    AuditFullModal shows all events in a scrollable table with a close action.
//
//  FIX 4 — Top search drives real filtering
//    searchQuery state added to main component, bound to the head <input>.
//    Passed as prop to JobHistoryTab, RowErrorsTab, ExportTab, and Step2_Map.
//    Each tab applies client-side filtering against its own dataset:
//      JobHistoryTab  → id, type, entity, file, by, status
//      RowErrorsTab   → row, entity, field, src, issue
//      ExportTab      → preset label, entity, access description
//      Step2_Map      → source column, target field
//
// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITY AUDIT
// ─────────────────────────────────────────────────────────────────────────────
//
// UNCHANGED
//   KPI band: imports running, rows rejected, exports ready, jobs needing review.
//   Import wizard — all 5 steps preserved:
//     Step 1 Upload, Step 2 Map Columns, Step 3 Validate, Step 4 Execute, Step 5 Results.
//   Export tab: saved-view presets, field inclusion, access-aware notice, recent exports.
//   Job History tab: jobs table, filters, job detail panel.
//   Row Errors tab: full table, severity filter, download CSV.
//   Audit log: collapsible section, full audit modal.
//   Toast notifications. Scenario switcher.
//
// BACKEND / API CONSTRAINTS (unchanged)
//   File upload: no actual upload endpoint. File state is simulated locally.
//   startImportJob / cancelJob / retryJob: not yet implemented in API.
//   downloadJobArtifact: no signed URL endpoint. Simulated via toast.
//   fetchExportPresets: no endpoint. Presets come from saved-views list.
//   createExportJob: no endpoint. Simulated locally.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import type { CurrentUser } from "../../types/session";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ImportJob = {
  id: string;
  type: "import" | "export";
  entity: string;
  file: string;
  status: "processing" | "partial" | "completed" | "failed" | "ready" | "queued";
  pct: number;
  rows: number;
  created: number;
  updated: number;
  rejected: number;
  by: string;
  at: string;
  fin?: string;
  eta?: string;
  error?: string;
};

export type MappingRow = {
  src: string;
  target: string;
  type: string;
  required: boolean;
  status: "mapped" | "custom" | "unmapped" | "missing";
  sample: string;
};

export type RowError = {
  row: number;
  sev: "error" | "warning";
  entity: string;
  field: string;
  src: string;
  issue: string;
  fix: string;
};

export type ExportPreset = {
  id: string;
  label: string;
  entity: string;
  rows: number;
  access: string;
};

export type AuditEvent = {
  t: string;
  who: string;
  type: "create" | "complete" | "export" | "fail";
  desc: string;
};

export type ValidationSummary = {
  valid: number;
  warnings: number;
  rejected: number;
  duplicates: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

type ImportExportOperationsProps = {
  currentUser: CurrentUser;
  jobs: ImportJob[];
  mapping?: MappingRow[];
  errors?: RowError[];
  exportPresets?: ExportPreset[];
  auditEvents?: AuditEvent[];
  validationSummary?: ValidationSummary;
  onBack?: () => void;
  onDownload?: (jobId: string, kind: "rejected" | "export") => void;
  onRetryJob?: (jobId: string) => void;
  onCancelJob?: (jobId: string) => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtRows(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function statusPillClass(s: string): string {
  if (s === "processing") return "p-running";
  if (s === "partial")    return "p-sent_back";
  if (s === "completed" || s === "ready") return "p-approved";
  if (s === "failed")     return "p-rejected";
  if (s === "queued")     return "p-pending";
  return "p-none";
}

function statusLabel(s: string): string {
  if (s === "processing") return "Processing";
  if (s === "partial")    return "Partial";
  if (s === "completed")  return "Completed";
  if (s === "failed")     return "Failed";
  if (s === "ready")      return "Ready";
  if (s === "queued")     return "Queued";
  return s;
}

function ProgressBar({ pct, status }: { pct: number; status: string }) {
  const color = status === "failed" ? "var(--neg)"
    : status === "partial"    ? "var(--accent-2)"
    : status === "ready" || status === "completed" ? "var(--pos)"
    : "var(--info,#2D5B6B)";
  return (
    <div className="ieo-progress-track">
      <div className="ieo-progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

function SevChip({ sev }: { sev: string }) {
  return (
    <span className="ieo-sev-chip" style={{
      color:       sev === "error" ? "var(--neg)" : "var(--accent-2)",
      background:  sev === "error" ? "var(--neg-soft)" : "var(--warn-soft)",
      borderColor: sev === "error" ? "#D6B0A8" : "#D9BFA0",
    }}>
      {sev.toUpperCase()}
    </span>
  );
}

// Available target fields for column mapping select
const MAPPING_FIELD_GROUPS: { label: string; fields: string[] }[] = [
  {
    label: "Opportunity",
    fields: [
      "Opportunity.title",
      "Opportunity.expectedAmount",
      "Opportunity.closeDate",
      "Opportunity.stage",
      "Opportunity.owner",
      "Opportunity.description",
    ],
  },
  {
    label: "Account",
    fields: ["Account.name", "Account.region", "Account.industry", "Account.owner"],
  },
  {
    label: "Contact",
    fields: ["Contact.name", "Contact.email", "Contact.phone", "Contact.accountId"],
  },
  {
    label: "Custom fields",
    fields: [
      "region (custom)",
      "payment_risk_level (custom)",
      "procurement_process (custom)",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

// FIX 1: "upload" added as first scenario so Step 1 is reachable.
type Scenario = "upload" | "mapping" | "validated" | "processing" | "completed";

export function ImportExportOperations({
  currentUser,
  jobs,
  mapping = [],
  errors = [],
  exportPresets = [],
  auditEvents = [],
  validationSummary = { valid: 780, warnings: 24, rejected: 8, duplicates: 12 },
  onBack,
  onDownload,
  onRetryJob,
  onCancelJob,
}: ImportExportOperationsProps) {
  const [activeTab,     setActiveTab]     = useState<"import" | "export" | "history" | "errors">("import");
  // FIX 1: default changed to "upload" so wizard starts at step 1.
  const [scenario,      setScenario]      = useState<Scenario>("upload");
  const [auditOpen,     setAuditOpen]     = useState(false);
  // FIX 3: controls AuditFullModal visibility.
  const [auditFullOpen, setAuditFullOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  // FIX 4: drives real filtering across all tabs.
  const [searchQuery,   setSearchQuery]   = useState("");
  const [toast,         setToast]         = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(c => (c === msg ? null : c)), 2800);
  }

  // FIX 1: scenario "upload" now resolves to step 1.
  const importStep = scenario === "upload"     ? 1
    : scenario === "mapping"    ? 2
    : scenario === "validated"  ? 3
    : scenario === "processing" ? 4
    : 5;
  const isRunning = scenario === "processing";

  // KPI band derivations
  const running      = jobs.filter(j => j.status === "processing").length;
  const rowsInFlight = jobs.filter(j => j.status === "processing").reduce((s, j) => s + j.rows, 0);
  const rowsToday    = jobs.reduce((s, j) => s + j.created, 0);
  const rejected     = jobs.reduce((s, j) => s + j.rejected, 0);
  const exportsReady = jobs.filter(j => j.type === "export" && j.status === "ready").length;
  const needsReview  = jobs.filter(j => j.status === "failed" || j.status === "partial").length;

  return (
    <section className="rep-workspace ieo-workspace">

      {/* Page head */}
      <div className="ieo-page-head">
        <div className="ieo-head-left">
          {onBack ? <button className="ieo-back-btn" type="button" onClick={onBack}>← Back</button> : null}
          <div className="ieo-crumb">
            <span>Data &amp; Quality</span>
            <span className="sep">/</span>
            <strong>Imports &amp; Exports</strong>
            {running > 0 ? (
              <span className="ieo-running-chip">
                <span className="ieo-pulse-dot" />
                <span className="mono">{running} job{running > 1 ? "s" : ""} running</span>
              </span>
            ) : null}
          </div>
        </div>
        <div className="ieo-head-right">
          {/* FIX 1: "upload" added to scenario strip */}
          <div className="ieo-scenario-strip">
            {(["upload", "mapping", "validated", "processing", "completed"] as Scenario[]).map(s => (
              <button
                key={s}
                type="button"
                className={`ieo-scenario-opt${scenario === s ? " on" : ""}`}
                onClick={() => setScenario(s)}
              >
                {s === "upload"     ? "Upload"
                  : s === "mapping"    ? "Mapping"
                  : s === "validated"  ? "Validated"
                  : s === "processing" ? "Processing"
                  : "Completed"}
              </button>
            ))}
          </div>
          {/* FIX 4: search input bound to searchQuery state */}
          <div className="ieo-search">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" />
            </svg>
            <input
              placeholder="Search jobs, files, entities…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button
                className="ieo-search-clear"
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : null}
          </div>
          <button
            className={`rep-btn rep-btn-ghost ieo-audit-toggle${auditOpen ? " active" : ""}`}
            type="button"
            onClick={() => setAuditOpen(v => !v)}
          >
            {auditOpen ? "▲" : "▼"} Audit
          </button>
        </div>
      </div>

      {/* KPI band */}
      <div className="ieo-kpi-band">
        {([
          { label: "Imports running",     value: String(running),      foot: `${fmtRows(rowsInFlight)} rows in flight · ${fmtRows(rowsToday)} processed today`, alert: false },
          { label: "Rows rejected",       value: String(rejected),     foot: "Across all jobs today",                                                            alert: rejected > 0 },
          { label: "Exports ready",       value: String(exportsReady), foot: exportsReady > 0 ? "Ready for download" : "None pending",                          alert: false },
          { label: "Jobs needing review", value: String(needsReview),  foot: needsReview > 0 ? "Failed or partial — action required" : "All jobs nominal",      alert: needsReview > 0 },
        ] as { label: string; value: string; foot: string; alert: boolean }[]).map((k, i) => (
          <div key={i} className="ieo-kpi-item">
            <div className="ieo-kpi-l">{k.label}</div>
            <div className={`ieo-kpi-v mono${k.alert ? " alert" : ""}`}>{k.value}</div>
            <div className="ieo-kpi-foot">{k.foot}</div>
          </div>
        ))}
      </div>

      {/* Tab strip */}
      <div className="ieo-tab-strip">
        {(["import", "export", "history", "errors"] as const).map(t => (
          <button
            key={t}
            type="button"
            className={`ieo-tab${activeTab === t ? " active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {t === "import" ? "Import" : t === "export" ? "Export" : t === "history" ? "Job History" : "Row Errors"}
            <span className="ieo-tab-badge mono">
              {t === "import" ? "IM" : t === "export" ? "EX" : t === "history" ? jobs.length : errors.length}
            </span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="ieo-body">
        {activeTab === "import" ? (
          <ImportTab
            step={importStep}
            running={isRunning}
            mapping={mapping}
            errors={errors}
            validationSummary={validationSummary}
            searchQuery={searchQuery}
            onFlash={flash}
            onDownload={onDownload}
            onCancelJob={onCancelJob}
          />
        ) : activeTab === "export" ? (
          <ExportTab
            presets={exportPresets}
            jobs={jobs}
            searchQuery={searchQuery}
            onFlash={flash}
            onDownload={onDownload}
          />
        ) : activeTab === "history" ? (
          <JobHistoryTab
            jobs={jobs}
            selectedId={selectedJobId}
            searchQuery={searchQuery}
            onSelect={id => setSelectedJobId(prev => prev === id ? null : id)}
            onFlash={flash}
            onDownload={onDownload}
            onRetry={onRetryJob}
          />
        ) : (
          <RowErrorsTab errors={errors} searchQuery={searchQuery} onFlash={flash} />
        )}
      </div>

      {/* Audit log (collapsible) */}
      {auditOpen ? (
        // FIX 3: pass real onFullAudit handler
        <AuditSection events={auditEvents} onFullAudit={() => setAuditFullOpen(true)} />
      ) : null}

      {/* FIX 3: Full audit modal — real surface, not a dead link */}
      {auditFullOpen ? (
        <AuditFullModal events={auditEvents} onClose={() => setAuditFullOpen(false)} />
      ) : null}

      {/* Footer */}
      <div className="rep-foot-ruler">
        <span>SALES OPS CRM · {currentUser.tenantName.toUpperCase()} · LOCAL PILOT</span>
        <span>{currentUser.roleKey.toUpperCase()} · {currentUser.displayName}</span>
        <span>{jobs.length} JOBS · {running} RUNNING</span>
      </div>

      {toast ? <div className="rep-toast"><span className="ok">✓</span>{toast}</div> : null}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ImportTab
// ─────────────────────────────────────────────────────────────────────────────

function ImportTab({
  step, running, mapping, errors, validationSummary, searchQuery, onFlash, onDownload, onCancelJob,
}: {
  step: number; running: boolean; mapping: MappingRow[]; errors: RowError[];
  validationSummary: ValidationSummary; searchQuery: string;
  onFlash: (msg: string) => void;
  onDownload?: (jobId: string, kind: "rejected" | "export") => void;
  onCancelJob?: (id: string) => void;
}) {
  const [entity, setEntity] = useState("Opportunity");
  const [mode,   setMode]   = useState("Create only");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <StepBar step={step} />
      {step === 1 ? <Step1_Upload entity={entity} setEntity={setEntity} mode={mode} setMode={setMode} /> : null}
      {step === 2 ? <Step2_Map mapping={mapping} searchQuery={searchQuery} /> : null}
      {step === 3 ? <Step3_Validate summary={validationSummary} errors={errors} /> : null}
      {step === 4 ? <Step4_Execute running={running} onFlash={onFlash} onCancelJob={onCancelJob} /> : null}
      {step === 5 ? (
        <Step5_Results
          errors={errors}
          onFlash={msg => { onFlash(msg); onDownload?.("IMP-0239", "rejected"); }}
        />
      ) : null}
    </div>
  );
}

// ─── StepBar ────────────────────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  const steps = ["Upload", "Map Columns", "Validate", "Execute", "Results"];
  return (
    <div className="ieo-step-bar">
      {steps.map((s, i) => {
        const n    = i + 1;
        const done = n < step;
        const cur  = n === step;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? "1 1 auto" : undefined }}>
            <div className={`ieo-step-node${done ? " done" : cur ? " cur" : ""}`}>
              <span className="ieo-step-circle">{done ? "✓" : n}</span>
              <span className="ieo-step-label">{s}</span>
            </div>
            {i < steps.length - 1 ? <div className="ieo-step-line" /> : null}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Upload ──────────────────────────────────────────────────────────

function Step1_Upload({ entity, setEntity, mode, setMode }: {
  entity: string; setEntity: (v: string) => void;
  mode: string;   setMode:   (v: string) => void;
}) {
  const cols = ["Account Name", "Contact Email", "Opportunity Title", "Expected Amount", "Close Date", "Stage", "Region", "Payment Risk Level", "Internal Notes"];
  return (
    <div className="ieo-two-col">
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <div className="rep-panel ieo-upload-panel">
          <div className="rep-panel-head">
            <div className="rep-panel-title">CSV file <span className="ieo-loaded-badge">✓ File loaded</span></div>
          </div>
          <div className="ieo-file-loaded">
            <div className="ieo-file-icon mono">CSV</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 2 }}>open_opportunities_q3.csv</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>812 rows · 8 columns detected · 44.2 KB</div>
            </div>
            <button className="rep-btn rep-btn-ghost" type="button" style={{ marginLeft: "auto", fontSize: 12 }}>Replace file</button>
          </div>
          <div style={{ padding: "0 14px 14px" }}>
            <div className="ieo-section-label">Detected columns</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
              {cols.map(c => <span key={c} className="ieo-col-chip mono">{c}</span>)}
            </div>
          </div>
        </div>
        <div className="rep-panel">
          <div className="rep-panel-head">
            <div className="rep-panel-title">Sample rows <em>first 3 of 812</em></div>
          </div>
          <div className="rep-table-scroll">
            <table className="rep-table" style={{ fontSize: 11.5 }}>
              <thead>
                <tr>{["Account Name", "Opp Title", "Amount", "Close Date", "Stage", "Region"].map(c => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {[
                  ["Acme Manufacturing",   "Q3 Equipment Renewal", "145,000", "2026-06-28", "Proposal",    "DACH-North"],
                  ["Nordwerk Tooling AG",  "Plant Retooling",      "412,500", "2026-05-30", "Negotiation", "DACH-North"],
                  ["Sigma Castings GmbH",  "Capital Order",        "580,000", "2026-05-29", "Proposal",    "DACH-North"],
                ].map((r, i) => (
                  <tr key={i}>{r.map((v, j) => <td key={j} className={j === 2 ? "num mono" : ""}>{v}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="rep-panel ieo-config-panel">
        <div className="rep-panel-head"><div className="rep-panel-title">Import configuration</div></div>
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="ieo-config-label">Target entity</div>
            {["Account", "Contact", "Opportunity"].map(e => (
              <label key={e} className={`ieo-radio-row${entity === e ? " selected" : ""}`}>
                <input type="radio" name="entity" checked={entity === e} onChange={() => setEntity(e)} style={{ accentColor: "var(--accent-2)" }} />
                <span style={{ fontWeight: entity === e ? 600 : 400, fontSize: 13 }}>{e}</span>
              </label>
            ))}
          </div>
          <div>
            <div className="ieo-config-label">Import mode</div>
            {([
              ["Create only",  "Skip rows matching existing records"],
              ["Basic update", "Update matching records in-place"],
            ] as [string, string][]).map(([m, sub]) => (
              <label key={m} className={`ieo-radio-row${mode === m ? " selected" : ""}`} style={{ flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} style={{ accentColor: "var(--accent-2)" }} />
                  <span style={{ fontWeight: mode === m ? 600 : 400, fontSize: 13 }}>{m}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginLeft: 20, marginTop: 2 }}>{sub}</div>
              </label>
            ))}
          </div>
          <div className="ieo-info-block">
            Import runs as an async job — you can close this screen and check progress in Job History.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Map Columns ─────────────────────────────────────────────────────

function Step2_Map({ mapping, searchQuery }: { mapping: MappingRow[]; searchQuery: string }) {
  // FIX 2: real editable state for each row's target field.
  const [mappingTargets, setMappingTargets] = useState<string[]>(() => mapping.map(m => m.target));

  const statusMeta: Record<string, { color: string; bg: string; border: string; label: string }> = {
    mapped:   { color: "var(--pos)",          bg: "var(--pos-soft)",  border: "#B2C8A8", label: "Mapped" },
    custom:   { color: "var(--info,#2D5B6B)", bg: "#DDE9ED",          border: "#A4C0C8", label: "Custom field" },
    unmapped: { color: "var(--muted)",         bg: "var(--paper-2)",   border: "var(--line)", label: "Unmapped" },
    missing:  { color: "var(--neg)",           bg: "var(--neg-soft)",  border: "#D6B0A8", label: "Missing required" },
  };

  // FIX 4: filter mapping rows by search query.
  const q = searchQuery.toLowerCase().trim();
  const visibleRows = mapping
    .map((m, origIdx) => ({ ...m, currentTarget: mappingTargets[origIdx] ?? m.target, origIdx }))
    .filter(m => !q || m.src.toLowerCase().includes(q) || m.currentTarget.toLowerCase().includes(q));

  return (
    <div className="rep-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Column mapping <em>open_opportunities_q3.csv → Opportunity</em>
        </div>
        <div className="rep-panel-actions">
          {q ? (
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
              {visibleRows.length} of {mapping.length} columns match
            </span>
          ) : (
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
              8 of 9 columns mapped · 1 unmapped optional
            </span>
          )}
        </div>
      </div>
      <div className="rep-table-scroll">
        <table className="rep-table ieo-mapping-table">
          <colgroup>
            <col style={{ width: 160 }} /><col /><col style={{ width: 90 }} />
            <col style={{ width: 50 }} /><col style={{ width: 130 }} /><col style={{ width: 170 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Source column</th>
              <th>Target field</th>
              <th>Type</th>
              <th className="num">Req.</th>
              <th>Status</th>
              <th>Sample value</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 28, color: "var(--muted)", fontSize: 13 }}>
                  No columns match "{searchQuery}"
                </td>
              </tr>
            ) : visibleRows.map((m) => {
              // FIX 2: effective status — if user cleared the target, treat as unmapped.
              const effectiveStatus = m.currentTarget === "— not mapped —" ? "unmapped" : m.status;
              const sm = statusMeta[effectiveStatus] ?? statusMeta.unmapped;
              return (
                <tr key={m.origIdx}>
                  <td className="mono" style={{ fontSize: 12 }}>{m.src}</td>
                  <td>
                    {/* FIX 2: real <select> bound to mappingTargets state */}
                    <select
                      className="ieo-target-field-select"
                      value={m.currentTarget}
                      onChange={e => {
                        const next = [...mappingTargets];
                        next[m.origIdx] = e.target.value;
                        setMappingTargets(next);
                      }}
                    >
                      <option value="— not mapped —">— not mapped —</option>
                      {MAPPING_FIELD_GROUPS.map(group => (
                        <optgroup key={group.label} label={group.label}>
                          {group.fields.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                  <td><span className="ieo-type-chip mono">{m.type}</span></td>
                  <td className="num">
                    {m.required
                      ? <span style={{ color: "var(--neg)", fontWeight: 700 }}>✓</span>
                      : <span style={{ color: "var(--muted)" }}>—</span>}
                  </td>
                  <td>
                    <span className="ieo-status-chip mono" style={{ color: sm.color, background: sm.bg, borderColor: sm.border }}>
                      {sm.label}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{m.sample}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="ieo-table-note warn">
        <span className="mono ieo-note-label">Note</span>
        "Internal Notes" is unmapped and will be ignored. 2 custom field mappings detected (Region → region, Payment Risk Level → payment_risk_level). Review before proceeding.
      </div>
    </div>
  );
}

// ─── Step 3: Validate ────────────────────────────────────────────────────────

function Step3_Validate({ summary, errors }: { summary: ValidationSummary; errors: RowError[] }) {
  const [sevFilter, setSevFilter] = useState<"all" | "error" | "warning">("all");
  const total    = summary.valid + summary.warnings + summary.rejected;
  const filtered = sevFilter === "all" ? errors : errors.filter(e => e.sev === sevFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="ieo-kpi-band">
        {([
          { l: "Valid rows",           v: summary.valid,      c: "var(--pos)" },
          { l: "Warning rows",         v: summary.warnings,   c: "var(--accent-2)" },
          { l: "Rejected rows",        v: summary.rejected,   c: "var(--neg)" },
          { l: "Duplicate candidates", v: summary.duplicates, c: "var(--info,#2D5B6B)" },
        ] as { l: string; v: number; c: string }[]).map((s, i) => (
          <div key={i} className="ieo-kpi-item">
            <div className="ieo-kpi-l">{s.l}</div>
            <div className="ieo-kpi-v mono" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div className="rep-panel" style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 5 }}>
          <span>Validation coverage</span>
          <span className="mono">
            {((summary.valid / total) * 100).toFixed(1)}% valid · {(((summary.warnings + summary.rejected) / total) * 100).toFixed(1)}% flagged
          </span>
        </div>
        <div className="ieo-progress-stacked">
          <div style={{ flex: summary.valid,    background: "var(--pos)",       opacity: 0.85 }} />
          <div style={{ flex: summary.warnings, background: "var(--accent-2)" }} />
          <div style={{ flex: summary.rejected, background: "var(--neg)" }} />
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 7, fontSize: 11 }}>
          {([["var(--pos)", "Valid", summary.valid], ["var(--accent-2)", "Warnings", summary.warnings], ["var(--neg)", "Rejected", summary.rejected]] as [string, string, number][]).map(([c, l, v], i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, background: String(c), display: "inline-block", flexShrink: 0 }} />
              {l} ({v})
            </span>
          ))}
        </div>
      </div>
      <div className="rep-panel">
        <div className="rep-panel-head">
          <div className="rep-panel-title">Row-level validation results <em>{filtered.length} issues</em></div>
          <div className="rep-panel-actions">
            {(["all", "error", "warning"] as const).map(s => (
              <button key={s} type="button" className={`ieo-filter-chip mono${sevFilter === s ? " on" : ""}`} onClick={() => setSevFilter(s)}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="rep-table-scroll">
          <table className="rep-table">
            <colgroup>
              <col style={{ width: 50 }} /><col style={{ width: 80 }} /><col style={{ width: 90 }} />
              <col style={{ width: 120 }} /><col style={{ width: 120 }} /><col /><col style={{ width: 160 }} />
            </colgroup>
            <thead>
              <tr><th>Row</th><th>Severity</th><th>Entity</th><th>Field</th><th>Source value</th><th>Issue</th><th>Suggested fix</th></tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={i} style={{ background: e.sev === "error" ? "#FBEFE8" : "inherit" }}>
                  <td className="num mono" style={{ fontSize: 12 }}>{e.row}</td>
                  <td><SevChip sev={e.sev} /></td>
                  <td style={{ fontSize: 12 }}>{e.entity}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{e.field}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{e.src}</td>
                  <td style={{ fontSize: 12 }}>{e.issue}</td>
                  <td style={{ fontSize: 12, color: "var(--info,#2D5B6B)" }}>{e.fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ieo-table-note info">
          <span className="mono ieo-note-label">Note</span>
          {summary.rejected} rows will be rejected. {summary.valid} valid rows will be imported. Rejected rows are downloadable after the job completes.
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Execute ─────────────────────────────────────────────────────────

const PREFLIGHT = [
  { ok: true,  label: "File uploaded and validated" },
  { ok: true,  label: "All required columns mapped" },
  { ok: true,  label: "780 valid rows ready" },
  { ok: false, label: "8 rejected rows — will be skipped" },
  { ok: true,  label: "Mode: Create only — no overwrites" },
  { ok: true,  label: "Custom fields validated" },
  { ok: true,  label: "Duplicate detection: active" },
];

function Step4_Execute({ running, onFlash, onCancelJob }: {
  running: boolean; onFlash: (m: string) => void;
  onCancelJob?: (id: string) => void;
}) {
  return (
    <div className="ieo-two-col">
      <div className="rep-panel">
        <div className="rep-panel-head">
          <div className="rep-panel-title">Import job {running ? "— running" : "— ready to start"}</div>
          {running ? <span className="rep-pill p-running"><span className="dot" />Processing</span> : null}
        </div>
        <div className="ieo-job-summary-grid">
          {([
            ["Job ID",          "IMP-0242 (queued)"],
            ["Entity",          "Opportunity"],
            ["File",            "open_opportunities_q3.csv"],
            ["Mode",            "Create only"],
            ["Valid rows",      "780"],
            ["Warning rows",    "24 (will import)"],
            ["Rejected rows",   "8 (will skip)"],
            ["Submitted by",    "I. Volkova"],
          ] as [string, string][]).map(([l, v], i) => (
            <div key={i}>
              <div className="ieo-kpi-l">{l}</div>
              <div className="mono" style={{ fontSize: 12.5 }}>{v}</div>
            </div>
          ))}
        </div>
        {running ? (
          <div style={{ padding: "12px 14px", borderTop: "1px solid var(--hairline)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
              <span>Progress</span>
              <span className="mono">412 / 804 rows · ETA ~09:40</span>
            </div>
            <ProgressBar pct={51} status="processing" />
            <div className="ieo-live-stats">
              {([["Created", "412", "pos"], ["Updated", "0", ""], ["Rejected", "6", "neg"], ["Remaining", "392", ""]] as [string, string, string][]).map(([l, v, c], i) => (
                <div key={i} className="ieo-live-stat">
                  <div className="ieo-kpi-l">{l}</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: c === "pos" ? "var(--pos)" : c === "neg" ? "var(--neg)" : "var(--muted)" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="ieo-panel-foot">
          {!running ? (
            <button className="rep-btn rep-btn-primary" type="button" style={{ flex: 1, justifyContent: "center" }} onClick={() => onFlash("Import job IMP-0242 started")}>
              Start import job
            </button>
          ) : (
            <button className="rep-btn rep-btn-ghost" type="button" style={{ color: "var(--neg)" }} onClick={() => { onCancelJob?.("IMP-0242"); onFlash("Job IMP-0242 cancelled"); }}>
              Cancel job
            </button>
          )}
        </div>
      </div>
      <div className="rep-panel ieo-config-panel">
        <div className="rep-panel-head"><div className="rep-panel-title">Pre-flight checklist</div></div>
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
          {PREFLIGHT.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              <span style={{ color: c.ok ? "var(--pos)" : "var(--accent-2)", fontWeight: 700, fontSize: 11, width: 14, flexShrink: 0 }}>{c.ok ? "✓" : "⚠"}</span>
              <span style={{ color: c.ok ? "var(--ink-2)" : "var(--accent-2)" }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Results ─────────────────────────────────────────────────────────

function Step5_Results({ errors, onFlash }: { errors: RowError[]; onFlash: (m: string) => void }) {
  const rejected = errors.filter(e => e.sev === "error");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="ieo-result-banner warn">
        <span className="ieo-result-icon">⚠</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Import completed with partial errors</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>798 rows created · 0 updated · 14 rejected · Job IMP-0239 · open_opps_pipeline.csv · Opportunity</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Started 2026-05-16 14:30 · Completed 14:52 · Duration 22 min</div>
        </div>
      </div>
      <div className="ieo-kpi-band">
        {([["Rows in file", "812", ""], ["Created", "798", "pos"], ["Rejected", "14", "neg"], ["Duplicate skips", "0", ""]] as [string, string, string][]).map(([l, v, c], i) => (
          <div key={i} className="ieo-kpi-item">
            <div className="ieo-kpi-l">{l}</div>
            <div className={`ieo-kpi-v mono${c === "pos" ? " pos" : c === "neg" ? " alert" : ""}`}>{v}</div>
          </div>
        ))}
      </div>
      <div className="rep-panel">
        <div className="rep-panel-head">
          <div className="rep-panel-title">Rejected rows <em>{rejected.length}</em></div>
          <button className="rep-btn rep-btn-primary" type="button" style={{ fontSize: 12 }} onClick={() => onFlash("Downloading rejected-rows-IMP-0239.csv…")}>
            Download rejected rows CSV
          </button>
        </div>
        <div className="rep-table-scroll">
          <table className="rep-table">
            <colgroup>
              <col style={{ width: 50 }} /><col style={{ width: 90 }} /><col style={{ width: 120 }} /><col /><col style={{ width: 140 }} />
            </colgroup>
            <thead><tr><th>Row</th><th>Entity</th><th>Field</th><th>Issue</th><th>Source value</th></tr></thead>
            <tbody>
              {rejected.map((e, i) => (
                <tr key={i} style={{ background: "#FBEFE8" }}>
                  <td className="num mono" style={{ fontSize: 12 }}>{e.row}</td>
                  <td style={{ fontSize: 12 }}>{e.entity}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{e.field}</td>
                  <td style={{ fontSize: 12 }}>{e.issue}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{e.src}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExportTab
// ─────────────────────────────────────────────────────────────────────────────

function ExportTab({ presets, jobs, searchQuery, onFlash, onDownload }: {
  presets: ExportPreset[]; jobs: ImportJob[]; searchQuery: string;
  onFlash: (m: string) => void; onDownload?: (id: string, kind: "export") => void;
}) {
  const [selected, setSelected] = useState(presets[0]?.id ?? "");
  const [created,  setCreated]  = useState(false);

  // FIX 4: filter presets by search query.
  const q = searchQuery.toLowerCase().trim();
  const visiblePresets = presets.filter(p =>
    !q ||
    p.label.toLowerCase().includes(q) ||
    p.entity.toLowerCase().includes(q) ||
    p.access.toLowerCase().includes(q)
  );

  const preset       = presets.find(p => p.id === selected);
  const recentExports = jobs
    .filter(j => j.type === "export")
    .filter(j => !q || j.file.toLowerCase().includes(q) || j.entity.toLowerCase().includes(q) || j.id.toLowerCase().includes(q))
    .slice(0, 4);

  return (
    <div className="ieo-two-col">
      <div className="rep-panel">
        <div className="rep-panel-head">
          <div className="rep-panel-title">Export configuration</div>
          {q ? (
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
              {visiblePresets.length} of {presets.length} views match
            </span>
          ) : null}
        </div>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--hairline)" }}>
          <div className="ieo-config-label">Export from saved view</div>
          {visiblePresets.length === 0 ? (
            <div style={{ padding: "16px 0", fontSize: 12.5, color: "var(--muted)" }}>No saved views match "{searchQuery}"</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {visiblePresets.map(p => (
                <label key={p.id} className={`ieo-radio-row${selected === p.id ? " selected" : ""}`} style={{ alignItems: "flex-start" }}>
                  <input type="radio" name="preset" checked={selected === p.id} onChange={() => { setSelected(p.id); setCreated(false); }} style={{ accentColor: "var(--accent-2)", marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: selected === p.id ? 600 : 400, fontSize: 13 }}>{p.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                      <span className="mono" style={{ marginRight: 8 }}>{p.entity}</span>
                      {p.access}
                      <span className="mono" style={{ marginLeft: 8, color: "var(--ink-2)" }}>{p.rows} rows</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--hairline)" }}>
          <div className="ieo-config-label">Field inclusion</div>
          {([
            ["Standard fields",           "ID, name, stage, amount, close date, owner",               true],
            ["Custom fields (allowed)",   "Region, Payment Risk Level, Procurement Process",          true],
            ["Internal audit fields",     "Created by, modified at, import source",                   false],
          ] as [string, string, boolean][]).map(([l, sub, checked], i) => (
            <label key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 12.5, marginBottom: 8 }}>
              <input type="checkbox" defaultChecked={checked} style={{ accentColor: "var(--accent-2)", width: 14, height: 14, marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 500 }}>{l}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="ieo-table-note info" style={{ margin: 0, border: 0, borderBottom: "1px solid #A4C0C8" }}>
          <span className="mono ieo-note-label">Access-aware</span>
          Export respects your access boundaries. Export is a tracked job, not an untracked download.
        </div>
        <div style={{ padding: "12px 14px" }}>
          {!created ? (
            <button className="rep-btn rep-btn-primary" type="button" style={{ width: "100%", justifyContent: "center" }} onClick={() => setCreated(true)}>
              Create export job — {preset?.label}
            </button>
          ) : (
            <div className="ieo-result-banner pos">
              <span className="ieo-result-icon">✓</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Export job created — EXP-0042</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Processing · {preset?.rows} rows · ready in ~1 min</div>
              </div>
              <button className="rep-btn" type="button" onClick={() => onFlash("Downloading export — EXP-0042.csv")}>
                Download when ready
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="rep-panel ieo-config-panel">
        <div className="rep-panel-head">
          <div className="rep-panel-title">Recent exports <em>{recentExports.length}</em></div>
        </div>
        {recentExports.length === 0 ? (
          <div className="ieo-panel-empty">{q ? `No exports match "${searchQuery}"` : "No recent exports"}</div>
        ) : recentExports.map((j, i) => (
          <div key={i} style={{ padding: "10px 12px", borderBottom: "1px solid var(--hairline)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
              <div>
                <div className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{j.id}</div>
                <div style={{ fontSize: 12.5, fontWeight: 500, margin: "2px 0" }}>{j.file}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{j.entity} · {j.rows} rows · {j.at}</div>
              </div>
              <span className={`rep-pill ${statusPillClass(j.status)}`}><span className="dot" />{statusLabel(j.status)}</span>
            </div>
            <button className="rep-btn" type="button" style={{ fontSize: 11.5 }} onClick={() => { onFlash(`Downloading ${j.id}.csv`); onDownload?.(j.id, "export"); }}>
              Download CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JobHistoryTab
// ─────────────────────────────────────────────────────────────────────────────

function JobHistoryTab({ jobs, selectedId, searchQuery, onSelect, onFlash, onDownload, onRetry }: {
  jobs: ImportJob[]; selectedId: string | null; searchQuery: string;
  onSelect: (id: string) => void; onFlash: (m: string) => void;
  onDownload?: (id: string, kind: "rejected" | "export") => void;
  onRetry?: (id: string) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<"all" | "import" | "export" | "failed">("all");

  // FIX 4: apply both type filter and search query.
  const q = searchQuery.toLowerCase().trim();
  const filtered = jobs.filter(j => {
    const matchesType = typeFilter === "all"    ? true
      : typeFilter === "failed" ? (j.status === "failed" || j.status === "partial")
      : j.type === typeFilter;
    if (!matchesType) return false;
    if (!q) return true;
    return (
      j.id.toLowerCase().includes(q)     ||
      j.type.toLowerCase().includes(q)   ||
      j.entity.toLowerCase().includes(q) ||
      j.file.toLowerCase().includes(q)   ||
      j.by.toLowerCase().includes(q)     ||
      j.status.toLowerCase().includes(q)
    );
  });

  const selectedJob = jobs.find(j => j.id === selectedId) ?? null;

  return (
    <div className="ieo-two-col">
      <div className="rep-panel ieo-jobs-panel">
        <div className="rep-panel-head">
          <div className="rep-panel-title">
            All jobs <em>{filtered.length}{q ? ` of ${jobs.length}` : ""}</em>
          </div>
          <div className="rep-panel-actions">
            {(["all", "import", "export", "failed"] as const).map(f => (
              <button key={f} type="button" className={`ieo-filter-chip mono${typeFilter === f ? " on" : ""}`} onClick={() => setTypeFilter(f)}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="rep-table-scroll">
          <table className="rep-table">
            <colgroup>
              <col style={{ width: 96 }} /><col style={{ width: 70 }} /><col style={{ width: 90 }} />
              <col /><col style={{ width: 70 }} /><col style={{ width: 110 }} />
              <col style={{ width: 80 }} /><col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr><th>Job ID</th><th>Type</th><th>Entity</th><th>File / View</th><th className="num">Rows</th><th>Status</th><th>By</th><th>Started</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)", fontSize: 13 }}>
                  {q ? `No jobs match "${searchQuery}"` : "No jobs match this filter"}
                </td></tr>
              ) : filtered.map(j => (
                <tr
                  key={j.id}
                  className={selectedId === j.id ? "selected" : ""}
                  style={{ cursor: "pointer", background: j.status === "failed" ? "#FBEFE8" : j.status === "partial" ? "#FBF7EB" : "inherit" }}
                  onClick={() => onSelect(j.id)}
                >
                  <td className="mono" style={{ fontSize: 12 }}>{j.id}</td>
                  <td>
                    <span className="ieo-type-badge mono" style={{ color: j.type === "export" ? "var(--info,#2D5B6B)" : "var(--accent-2)" }}>
                      {j.type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{j.entity}</td>
                  <td><div className="rep-cell-truncate" style={{ fontSize: 12 }}>{j.file}</div></td>
                  <td className="num mono" style={{ fontSize: 12 }}>{fmtRows(j.rows)}</td>
                  <td><span className={`rep-pill ${statusPillClass(j.status)}`}><span className="dot" />{statusLabel(j.status)}</span></td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{j.by}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{j.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <JobDetailPanel job={selectedJob} onFlash={onFlash} onDownload={onDownload} onRetry={onRetry} />
    </div>
  );
}

function JobDetailPanel({ job, onFlash, onDownload, onRetry }: {
  job: ImportJob | null; onFlash: (m: string) => void;
  onDownload?: (id: string, kind: "rejected" | "export") => void;
  onRetry?: (id: string) => void;
}) {
  if (!job) {
    return (
      <div className="rep-panel ieo-detail-panel">
        <div className="ieo-panel-empty">
          <div className="ieo-empty-icon mono">JB</div>
          <div className="ieo-empty-title">Select a job</div>
          <div>Click any row to see job details, progress, and row results.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rep-panel ieo-detail-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title mono">{job.id}</div>
        <span className={`rep-pill ${statusPillClass(job.status)}`}><span className="dot" />{statusLabel(job.status)}</span>
      </div>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--hairline)" }}>
        {([
          ["Type",        job.type.toUpperCase()],
          ["Entity",      job.entity],
          ["File / view", job.file],
          ["Mode",        "Create only"],
          ["Rows",        fmtRows(job.rows)],
          ["Started",     job.at],
          ["Finished",    job.fin ?? job.eta ?? "In progress"],
        ] as [string, string][]).map(([l, v], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid var(--hairline)", fontSize: 12 }}>
            <span style={{ color: "var(--muted)" }}>{l}</span>
            <span className="mono" style={{ fontWeight: 500, maxWidth: "60%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--hairline)" }}>
        <ProgressBar pct={job.pct} status={job.status} />
        <div className="ieo-live-stats" style={{ marginTop: 10 }}>
          {([["Created", job.created, "pos"], ["Rejected", job.rejected, "neg"]] as [string, number, string][]).map(([l, v, c], i) => (
            <div key={i} className="ieo-live-stat">
              <div className="ieo-kpi-l">{l}</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: c === "pos" ? "var(--pos)" : (v > 0 ? "var(--neg)" : "var(--muted)") }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {job.error ? (
        <div style={{ padding: "8px 12px", background: "var(--neg-soft)", borderBottom: "1px solid #D6B0A8", fontSize: 12, color: "var(--neg)", lineHeight: 1.5 }}>
          {job.error}
        </div>
      ) : null}
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {job.rejected > 0 ? (
          <button className="rep-btn rep-btn-primary" type="button" onClick={() => { onFlash(`Downloading rejected rows for ${job.id}`); onDownload?.(job.id, "rejected"); }}>
            Download rejected rows
          </button>
        ) : null}
        {job.type === "export" && (job.status === "ready" || job.status === "completed") ? (
          <button className="rep-btn rep-btn-primary" type="button" onClick={() => { onFlash(`Downloading ${job.id}.csv`); onDownload?.(job.id, "export"); }}>
            Download export CSV
          </button>
        ) : null}
        {job.status === "failed" && onRetry ? (
          <button className="rep-btn" type="button" onClick={() => { onRetry(job.id); onFlash(`Retry queued for ${job.id}`); }}>
            Retry job
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RowErrorsTab
// ─────────────────────────────────────────────────────────────────────────────

function RowErrorsTab({ errors, searchQuery, onFlash }: {
  errors: RowError[]; searchQuery: string; onFlash: (m: string) => void;
}) {
  const [sev, setSev] = useState<"all" | "error" | "warning">("all");

  // FIX 4: apply both severity filter and search query.
  const q = searchQuery.toLowerCase().trim();
  const rows = errors
    .filter(e => sev === "all" || e.sev === sev)
    .filter(e =>
      !q ||
      String(e.row).includes(q)           ||
      e.entity.toLowerCase().includes(q)  ||
      e.field.toLowerCase().includes(q)   ||
      e.src.toLowerCase().includes(q)     ||
      e.issue.toLowerCase().includes(q)
    );

  return (
    <div className="rep-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Row errors <em>{rows.length}{q ? ` of ${errors.length}` : ` of ${errors.length}`}</em>
        </div>
        <div className="rep-panel-actions">
          {(["all", "error", "warning"] as const).map(s => (
            <button key={s} type="button" className={`ieo-filter-chip mono${sev === s ? " on" : ""}`} onClick={() => setSev(s)}>
              {s.toUpperCase()}
            </button>
          ))}
          <button className="rep-btn rep-btn-ghost" type="button" style={{ fontSize: 11.5 }} onClick={() => onFlash("Downloading row-errors.csv…")}>
            Download CSV
          </button>
        </div>
      </div>
      <div className="rep-table-scroll">
        <table className="rep-table">
          <colgroup>
            <col style={{ width: 50 }} /><col style={{ width: 90 }} /><col style={{ width: 80 }} /><col style={{ width: 90 }} />
            <col style={{ width: 120 }} /><col style={{ width: 120 }} /><col /><col style={{ width: 160 }} />
          </colgroup>
          <thead>
            <tr><th>Row</th><th>Job</th><th>Severity</th><th>Entity</th><th>Field</th><th>Source value</th><th>Issue</th><th>Suggested fix</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 36, color: "var(--muted)", fontSize: 13 }}>
                {q ? `No errors match "${searchQuery}"` : "No rows match this filter"}
              </td></tr>
            ) : rows.map((e, i) => (
              <tr key={i} style={{ background: e.sev === "error" ? "#FBEFE8" : "inherit" }}>
                <td className="num mono" style={{ fontSize: 12 }}>{e.row}</td>
                <td className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>IMP-0239</td>
                <td><SevChip sev={e.sev} /></td>
                <td style={{ fontSize: 12 }}>{e.entity}</td>
                <td className="mono" style={{ fontSize: 11.5 }}>{e.field}</td>
                <td className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{e.src}</td>
                <td style={{ fontSize: 12 }}>{e.issue}</td>
                <td style={{ fontSize: 12, color: "var(--info,#2D5B6B)" }}>{e.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuditSection (collapsible)
// ─────────────────────────────────────────────────────────────────────────────

const AUDIT_ICON: Record<string, string>  = { create: "→", complete: "✓", export: "↑", fail: "✕" };
const AUDIT_COLOR: Record<string, string> = {
  create: "var(--info,#2D5B6B)", complete: "var(--pos)", export: "var(--accent-2)", fail: "var(--neg)",
};

function AuditSection({ events, onFullAudit }: {
  events: AuditEvent[];
  // FIX 3: real callback — no longer optional/dead; component requires a handler.
  onFullAudit: () => void;
}) {
  return (
    <div className="rep-panel ieo-audit-section">
      <div className="rep-panel-head">
        <div className="rep-panel-title">Audit log <em>today</em></div>
        <div className="rep-panel-actions">
          {/* FIX 3: real <button> with real onClick — not a bare <a> */}
          <button
            type="button"
            className="rep-btn rep-btn-ghost ieo-full-audit-btn"
            onClick={onFullAudit}
          >
            Full audit ›
          </button>
        </div>
      </div>
      <div style={{ padding: "4px 14px 12px" }}>
        {events.map((e, i) => (
          <div key={i} className="ieo-audit-row">
            <span className="mono ieo-audit-time">{e.t}</span>
            <span className="ieo-audit-dot" style={{ color: AUDIT_COLOR[e.type] ?? "var(--muted)" }}>
              {AUDIT_ICON[e.type] ?? "·"}
            </span>
            <span style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{e.desc}</span>
            <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto", flexShrink: 0 }}>{e.who}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuditFullModal (FIX 3: new component — replaces the dead "Full audit ›" link)
// ─────────────────────────────────────────────────────────────────────────────

function AuditFullModal({ events, onClose }: { events: AuditEvent[]; onClose: () => void }) {
  return (
    <div className="ieo-audit-modal-scrim" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ieo-audit-modal-card" onClick={e => e.stopPropagation()}>
        <div className="rep-panel-head ieo-audit-modal-head">
          <div className="rep-panel-title">Audit log — Imports &amp; Exports <em>today · {events.length} events</em></div>
          <div className="rep-panel-actions">
            <span className="ieo-table-note info" style={{ margin: 0, padding: "2px 10px", border: "1px solid #A4C0C8", fontSize: 11, borderRadius: 2 }}>
              <span className="mono ieo-note-label" style={{ marginRight: 6 }}>Scope</span>
              Full historical audit available in Insights › Audit
            </span>
            <button type="button" className="rep-btn rep-btn-ghost" onClick={onClose}>✕ Close</button>
          </div>
        </div>
        <div className="rep-table-scroll ieo-audit-modal-body">
          <table className="rep-table">
            <colgroup>
              <col style={{ width: 70 }} /><col style={{ width: 90 }} /><col style={{ width: 110 }} /><col />
            </colgroup>
            <thead>
              <tr><th>Time</th><th>Event type</th><th>Actor</th><th>Description</th></tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i}>
                  <td className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{e.t}</td>
                  <td>
                    <span className="ieo-sev-chip" style={{
                      color:       AUDIT_COLOR[e.type] ?? "var(--muted)",
                      background:  "var(--paper-2)",
                      borderColor: "var(--line)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}>
                      {AUDIT_ICON[e.type] ?? "·"} {e.type}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{e.who}</td>
                  <td style={{ fontSize: 12.5, lineHeight: 1.5 }}>{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
