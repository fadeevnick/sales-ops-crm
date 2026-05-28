// ─────────────────────────────────────────────────────────────────────────────
// MetadataAdmin.tsx — Phase 2.7
// ─────────────────────────────────────────────────────────────────────────────
//
// CAPABILITY AUDIT
// ─────────────────────────────────────────────────────────────────────────────
//
// UNCHANGED
//   Version management: published version (runtime-active badge), draft version,
//   create draft, validate draft, publish (blocked or allowed by state),
//   rollback to prior version, discard draft actions.
//   Validation display: blocking errors (E-prefix, red), warnings (W-prefix,
//   amber), info notice — all preserved in compact banner strip.
//   Custom fields table: all 10 columns — label, key, entity, type, required,
//   active, views, reports, stage rule, status (published / modified in draft /
//   new in draft). MODIFIED badge on modified rows.
//   Field edit panel: label, entity, type, field key (read-only), required /
//   active toggles, allowed-values editor (add + remove per value), usage
//   block (views / reports / stage rule), deactivate with in-use guard.
//   Stages table: order #, label, key, probability, active, req-fields count,
//   approval-gate badge. Up/down reorder arrows, changes queued in draft.
//   Stage edit panel: 2×2 key fields, required-fields-at-stage block, save /
//   deactivate.
//   Required rules: per-stage rule lists with remove; rule builder (stage +
//   field selects + live preview + "Add rule to draft").
//   Publish history: version timeline (v39–v42), rollback action on prior
//   versions, rollback policy notice.
//   Impact review: 6 entity impact cards — open opps, saved views, reports,
//   import schemas, approval policies, forms — each with count + risk level.
//   Publish modal: validation summary row, changes row, affected-entities row,
//   rollback-available row, acknowledgement checkbox, guarded publish action.
//   Add field modal: label, auto-generated key, entity, type.
//   Search: free-text across fields, stages, rules.
//   Toast notification system.
//   Entity scope display: Opportunity / Account / Contact.
//
// MOVED
//   Scenario switcher (prototype demo control) → compact chip in page head.
//   StatusHeader (full-bleed section) → ma-version-band (compact strip in
//   page head area). All version data and actions preserved.
//   Validation full panel (above tabs) → ma-validation-banner (compact
//   dismissible strip below version band). Collapses when no issues.
//   Impact review 3-col card grid → same tab, same cards, same risk data.
//
// DE-EMPHASIZED, NOT REMOVED
//   Publish History: accessible as "History" tab.
//   Impact Review: accessible as "Impact" tab.
//   Field key: present in table column and in edit panel key field.
//   Rollback notice: in-panel hint in History tab.
//
// BACKEND / API CONSTRAINTS
//   No fetchMetadataConfig endpoint — config is passed as prop; field /
//   stage / rule mutations are handled via publishDraftConfig (not yet
//   implemented in API). // CONSTRAINT: implement config CRUD endpoints.
//   Field deactivation guard checks views/reports counts locally — backend
//   should enforce this at the API level. // CONSTRAINT: add server-side guard.
//   saveFieldDraft / saveStageDraft: no dedicated endpoints; changes are
//   queued locally and sent on publish. // CONSTRAINT: add draft patch endpoint.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import type { CurrentUser } from "../../types/session";

// ─────────────────────────────────────────────────────────────────────────────
// Local types
// ─────────────────────────────────────────────────────────────────────────────

export type MetadataField = {
  id: string;
  label: string;
  key: string;
  entity: string;
  type: string;
  required: boolean;
  active: boolean;
  views: number;
  reports: number;
  stageRule: string;
  status: "published" | "draft-modified" | "draft-new";
  values: string[];
};

export type MetadataStage = {
  id: string;
  key: string;
  label: string;
  prob: number;
  active: boolean;
  reqFields: number;
  approvalGate: boolean;
};

export type RequiredRule = {
  stage: string;
  fields: string[];
};

export type PublishHistoryEntry = {
  version: string;
  by: string;
  at: string;
  note: string;
  current: boolean;
};

export type MetadataConfig = {
  publishedVersion: string;
  publishedAt: string;
  publishedBy: string;
  draftVersion: string;
  draftState: "warnings" | "errors" | "ready" | "clean";
  entities: string[];
  fields: MetadataField[];
  stages: MetadataStage[];
  rules: RequiredRule[];
  history: PublishHistoryEntry[];
  validation: {
    errors: string[];
    warnings: string[];
    info: string;
  };
  impact: {
    entity: string;
    icon: string;
    count: number;
    risk: "high" | "medium" | "low";
    desc: string;
  }[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

type MetadataAdminProps = {
  currentUser: CurrentUser;
  config: MetadataConfig;
  onBack?: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const RISK_COLOR: Record<string, string> = {
  high: "var(--neg)", medium: "var(--accent-2)", low: "var(--pos)",
};
const RISK_BG: Record<string, string> = {
  high: "var(--neg-soft)", medium: "var(--warn-soft)", low: "var(--pos-soft)",
};

function fieldStatusMeta(s: MetadataField["status"]) {
  if (s === "draft-modified") return { color: "var(--accent-2)", bg: "var(--warn-soft)", label: "Modified" };
  if (s === "draft-new")      return { color: "var(--info,#2D5B6B)", bg: "var(--info-soft,#DDE9ED)", label: "New in draft" };
  return { color: "var(--pos)", bg: "var(--pos-soft)", label: "Published" };
}

// ─────────────────────────────────────────────────────────────────────────────
// MetadataAdmin — main component
// ─────────────────────────────────────────────────────────────────────────────

export function MetadataAdmin({ currentUser, config, onBack }: MetadataAdminProps) {
  const [activeTab,    setActiveTab]    = useState<"fields" | "stages" | "rules" | "history" | "impact">("fields");
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [modal,         setModal]         = useState<"publish" | "add-field" | null>(null);
  const [toast,         setToast]         = useState<string | null>(null);
  const [validationOpen, setValidationOpen] = useState(true);
  // Prototype scenario selector
  const [scenario, setScenario] = useState<MetadataConfig["draftState"]>(config.draftState);
  // Local stage order (draft reorder queued locally)
  const [stageOrder, setStageOrder] = useState<MetadataStage[]>(config.stages);
  // Local rules — draft edits queued in state until publish.
  const [localRules, setLocalRules] = useState<RequiredRule[]>(config.rules);

  function removeRule(stage: string, fieldName: string) {
    setLocalRules(prev => prev.map(r =>
      r.stage === stage ? { ...r, fields: r.fields.filter(f => f !== fieldName) } : r
    ));
    flash(`Rule removed: "${fieldName}" no longer required at ${stage}`);
  }

  function addRule(stage: string, fieldName: string) {
    setLocalRules(prev => prev.map(r =>
      r.stage === stage ? { ...r, fields: r.fields.includes(fieldName) ? r.fields : [...r.fields, fieldName] } : r
    ));
    flash(`Rule added: "${fieldName}" required at ${stage}`);
  }

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(c => (c === msg ? null : c)), 2800);
  }

  const draftBlocked  = scenario === "errors";
  const draftReady    = scenario === "ready";
  const hasIssues     = scenario === "errors" || scenario === "warnings";

  const filteredFields = useMemo(() => {
    if (!search || activeTab !== "fields") return config.fields;
    const q = search.toLowerCase();
    return config.fields.filter(f =>
      f.label.toLowerCase().includes(q) ||
      f.key.toLowerCase().includes(q) ||
      f.entity.toLowerCase().includes(q)
    );
  }, [config.fields, search, activeTab]);

  const filteredStages = useMemo(() => {
    if (!search || activeTab !== "stages") return stageOrder;
    const q = search.toLowerCase();
    return stageOrder.filter(s => s.label.toLowerCase().includes(q) || s.key.toLowerCase().includes(q));
  }, [stageOrder, search, activeTab]);

  function moveStage(idx: number, dir: -1 | 1) {
    const arr = [...stageOrder];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setStageOrder(arr);
    flash("Stage order queued in draft — publish to apply");
  }

  const fieldForPanel = selectedField ? config.fields.find(f => f.id === selectedField) ?? null : null;
  const stageForPanel = selectedStage ? stageOrder.find(s => s.id === selectedStage) ?? null : null;

  // Tab counts
  const tabCounts: Record<string, number> = {
    fields:  config.fields.length,
    stages:  config.stages.length,
    rules:   localRules.reduce((s, r) => s + r.fields.length, 0),
    history: config.history.length,
    impact:  config.impact.length,
  };

  return (
    <section className="rep-workspace ma-workspace">

      {/* Page head */}
      <div className="ma-page-head">
        <div className="ma-head-left">
          {onBack ? (
            <button className="ma-back-btn" type="button" onClick={onBack}>← Back</button>
          ) : null}
          <div className="ma-crumb">
            <span>Data &amp; Quality</span>
            <span className="sep">/</span>
            <strong>Metadata Admin</strong>
            <span className="sep">·</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              {currentUser.tenantName} · tenant config
            </span>
          </div>
          {/* Version badges */}
          <div className="ma-version-strip">
            <div className="ma-ver-block">
              <span className="ma-ver-label">Published</span>
              <span className="ma-ver-badge pub mono">{config.publishedVersion}</span>
              <span className="ma-ver-sub">Runtime-active</span>
            </div>
            <span className="ma-ver-arrow">→</span>
            <div className="ma-ver-block">
              <span className="ma-ver-label">Draft</span>
              <span className="ma-ver-badge draft mono">{config.draftVersion}</span>
              <span className={`ma-ver-sub ${scenario === "errors" ? "neg" : scenario === "ready" ? "pos" : "warn"}`}>
                {scenario === "errors" ? "Blocking errors" : scenario === "ready" ? "Validated · ready" : "Has warnings"}
              </span>
            </div>
          </div>
        </div>

        <div className="ma-head-right">
          {/* Prototype scenario chip */}
          <div className="ma-scenario-strip">
            {(["warnings", "ready", "errors"] as const).map(s => (
              <button
                key={s}
                type="button"
                className={`ma-scenario-opt${scenario === s ? " on" : ""}`}
                onClick={() => setScenario(s)}
              >
                {s === "warnings" ? "Warnings" : s === "ready" ? "Ready" : "Errors"}
              </button>
            ))}
          </div>
          {/* Primary actions */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <div className="ma-search">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" />
              </svg>
              <input
                placeholder="Search fields, stages, rules…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="rep-btn" type="button" onClick={() => flash("Draft validated")}>✓ Validate</button>
            <button
              className={`rep-btn${draftReady ? " rep-btn-primary" : ""}`}
              type="button"
              disabled={draftBlocked}
              aria-disabled={draftBlocked}
              onClick={() => { if (!draftBlocked) setModal("publish"); }}
              title={draftBlocked ? `Resolve errors before publishing` : `Publish ${config.draftVersion} to runtime`}
              style={draftBlocked ? { opacity: 0.45, cursor: "not-allowed" } : {}}
            >
              Publish {config.draftVersion}{draftBlocked ? " (blocked)" : ""}
            </button>
            <button className="rep-btn rep-btn-ghost" type="button" onClick={() => flash("Rollback draft created")}>↩ Rollback</button>
            <button className="rep-btn rep-btn-ghost" type="button" style={{ color: "var(--neg)" }} onClick={() => flash("Draft discarded")}>
              Discard draft
            </button>
          </div>
        </div>
      </div>

      {/* Validation banner */}
      {hasIssues && validationOpen ? (
        <div className={`ma-validation-banner${scenario === "errors" ? " error" : ""}`}>
          <span className="ma-vb-badge mono">
            {scenario === "errors" ? "✕ 1 error · 3 warnings" : "⚠ 3 warnings"}
          </span>
          <span className="ma-vb-text">
            {scenario === "errors"
              ? "Publishing blocked. Resolve E001 before proceeding."
              : "Publish allowed with warnings. Review impact before confirming."}
            <span className="ma-vb-sub mono">
              {config.publishedVersion} remains runtime-active until you publish.
            </span>
          </span>
          <button className="rep-btn rep-btn-ghost ma-vb-detail" type="button" onClick={() => setActiveTab("impact")}>
            Impact ›
          </button>
          <button className="ma-vb-close" type="button" onClick={() => setValidationOpen(false)}>✕</button>
        </div>
      ) : null}

      {/* Validation messages (errors/warnings) */}
      {hasIssues && validationOpen ? (
        <div className="ma-val-msgs">
          {scenario === "errors" ? config.validation.errors.map((e, i) => (
            <div key={i} className="ma-val-msg error">
              <span className="mono ma-val-code">E</span>
              {e}
            </div>
          )) : null}
          {config.validation.warnings.map((w, i) => (
            <div key={i} className="ma-val-msg warn">
              <span className="mono ma-val-code">W</span>
              {w}
            </div>
          ))}
          <div className="ma-val-msg info">
            <span className="mono ma-val-code">i</span>
            {config.validation.info}
          </div>
        </div>
      ) : null}

      {/* Tab strip */}
      <div className="ma-tab-strip">
        {(["fields", "stages", "rules", "history", "impact"] as const).map(t => (
          <button
            key={t}
            type="button"
            className={`ma-tab${activeTab === t ? " active" : ""}`}
            onClick={() => { setActiveTab(t); setSelectedField(null); setSelectedStage(null); }}
          >
            {t === "fields"  ? "Custom Fields"
             : t === "stages" ? "Opportunity Stages"
             : t === "rules"  ? "Required Rules"
             : t === "history"? "History"
             :                  "Impact Review"}
            {tabCounts[t] != null ? (
              <span className="ma-tab-ct">{tabCounts[t]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="ma-body">
        {activeTab === "fields" ? (
          <div className="ma-body-grid">
            <CustomFieldsTab
              fields={filteredFields}
              selectedId={selectedField}
              onSelect={id => setSelectedField(prev => prev === id ? null : id)}
              onAdd={() => setModal("add-field")}
            />
            <FieldEditPanel
              field={fieldForPanel}
              onClose={() => setSelectedField(null)}
              onFlash={flash}
            />
          </div>
        ) : activeTab === "stages" ? (
          <div className="ma-body-grid">
            <StagesTab
              stages={filteredStages}
              selectedId={selectedStage}
              onSelect={id => setSelectedStage(prev => prev === id ? null : id)}
              onMove={moveStage}
            />
            <StageEditPanel
              stage={stageForPanel}
              rules={config.rules}
              onClose={() => setSelectedStage(null)}
              onFlash={flash}
            />
          </div>
        ) : activeTab === "rules" ? (
          <RequiredRulesTab
            fields={config.fields}
            rules={localRules}
            stages={config.stages}
            onFlash={flash}
            onRemoveRule={removeRule}
            onAddRule={addRule}
          />
        ) : activeTab === "history" ? (
          <PublishHistoryTab history={config.history} onFlash={flash} />
        ) : (
          <ImpactReviewTab impact={config.impact} draftVersion={config.draftVersion} />
        )}
      </div>

      {/* Footer */}
      <div className="rep-foot-ruler">
        <span>SALES OPS CRM · {currentUser.tenantName.toUpperCase()} · LOCAL PILOT</span>
        <span>{currentUser.roleKey.toUpperCase()} · {currentUser.displayName}</span>
        <span>
          {config.fields.length} FIELDS · {config.stages.length} STAGES ·{" "}
          {config.publishedVersion} ACTIVE
        </span>
      </div>

      {/* Modals */}
      {modal === "publish" ? (
        <PublishModal
          config={config}
          tenantName={currentUser.tenantName}
          onClose={() => setModal(null)}
          onConfirm={() => { setModal(null); flash(`✓ ${config.draftVersion} published — now runtime-active`); }}
        />
      ) : null}
      {modal === "add-field" ? (
        <AddFieldModal
          onClose={() => setModal(null)}
          onSave={(label) => { setModal(null); flash(`Draft field "${label}" added`); }}
        />
      ) : null}

      {toast ? (
        <div className="rep-toast"><span className="ok">✓</span>{toast}</div>
      ) : null}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomFieldsTab
// ─────────────────────────────────────────────────────────────────────────────

function CustomFieldsTab({
  fields,
  selectedId,
  onSelect,
  onAdd,
}: {
  fields: MetadataField[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="rep-panel ma-list-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Custom fields
          <em>{fields.length}</em>
          <span className="ma-entity-scope">
            Opportunity · Account · Contact
          </span>
        </div>
        <div className="rep-panel-actions">
          <button className="rep-btn rep-btn-primary" type="button" style={{ fontSize: 12 }} onClick={onAdd}>
            + Add field
          </button>
        </div>
      </div>
      <div className="rep-table-scroll">
        <table className="rep-table ma-fields-table">
          <colgroup>
            <col style={{ width: "18%" }} /><col style={{ width: "15%" }} />
            <col style={{ width: "11%" }} /><col style={{ width: "9%" }} />
            <col style={{ width: "6%" }} /><col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} /><col style={{ width: "6%" }} />
            <col style={{ width: "11%" }} /><col />
          </colgroup>
          <thead>
            <tr>
              <th>Field label</th><th>Field key</th><th>Entity</th>
              <th>Type</th>
              <th className="num" title="Required">Req.</th>
              <th className="num" title="Active">Act.</th>
              <th className="num" title="Saved views">Views</th>
              <th className="num" title="Reports">Rep.</th>
              <th>Stage rule</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(f => {
              const sm = fieldStatusMeta(f.status);
              return (
                <tr
                  key={f.id}
                  className={selectedId === f.id ? "selected" : ""}
                  style={{ cursor: "pointer" }}
                  onClick={() => onSelect(f.id)}
                >
                  <td>
                    <div className="rep-cell-truncate" style={{ fontWeight: 500 }}>{f.label}</div>
                    {f.status === "draft-modified" ? (
                      <span className="ma-modified-badge">MODIFIED</span>
                    ) : null}
                  </td>
                  <td>
                    <span className="mono rep-cell-sub" style={{ fontSize: 11 }}>{f.key}</span>
                  </td>
                  <td style={{ fontSize: 12 }}>{f.entity}</td>
                  <td>
                    <span className="ma-type-chip mono">{f.type}</span>
                  </td>
                  <td className="num">
                    {f.required
                      ? <span style={{ color: "var(--neg)", fontWeight: 700, fontSize: 13 }}>✓</span>
                      : <span style={{ color: "var(--muted)" }}>—</span>}
                  </td>
                  <td className="num">
                    <span style={{ color: "var(--pos)", fontSize: 13 }}>●</span>
                  </td>
                  <td className="num mono" style={{ fontSize: 12, color: f.views > 0 ? "var(--ink)" : "var(--muted)" }}>
                    {f.views || "—"}
                  </td>
                  <td className="num mono" style={{ fontSize: 12, color: f.reports > 0 ? "var(--ink)" : "var(--muted)" }}>
                    {f.reports || "—"}
                  </td>
                  <td>
                    {f.stageRule !== "—" ? (
                      <span className="ma-stage-rule-chip">{f.stageRule}</span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className="ma-status-chip mono" style={{ color: sm.color, background: sm.bg }}>
                      {sm.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FieldEditPanel
// ─────────────────────────────────────────────────────────────────────────────

function FieldEditPanel({
  field,
  onClose,
  onFlash,
}: {
  field: MetadataField | null;
  onClose: () => void;
  onFlash: (msg: string) => void;
}) {
  const [showDeactivateWarn, setShowDeactivateWarn] = useState(false);
  // Local editable values — draft state, not persisted until publish.
  const [localValues, setLocalValues] = useState<string[]>(field?.values ?? []);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newValue, setNewValue] = useState("");

  // Reset all local state when selected field changes.
  useEffect(() => {
    setShowDeactivateWarn(false);
    setLocalValues(field?.values ?? []);
    setShowAddInput(false);
    setNewValue("");
  }, [field?.id]);

  if (!field) {
    return (
      <div className="rep-panel ma-edit-panel">
        <div className="ma-ep-empty">
          <div className="ma-ep-empty-icon">MA</div>
          <div className="ma-ep-empty-title">Select a field</div>
          <div>Click any row to edit field properties, update allowed values, or review usage.</div>
        </div>
      </div>
    );
  }

  const inUse = field.views > 0 || field.reports > 0;

  return (
    <div className="rep-panel ma-edit-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Edit field
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>{field.key}</span>
        </div>
        <button className="rep-btn rep-btn-ghost" type="button" onClick={onClose} style={{ fontSize: 12, padding: "3px 7px" }}>✕</button>
      </div>

      {/* 2×2 key fields */}
      <div className="ma-ep-fields">
        {([
          ["Label",     field.label,  false],
          ["Entity",    field.entity, true],
          ["Type",      field.type,   true],
          ["Field key", field.key,    true],
        ] as [string, string, boolean][]).map(([l, v, isMono], i) => (
          <div key={i} className="ma-ep-field">
            <div className="ma-ep-fl">{l}</div>
            <div className={`ma-ep-fv${isMono ? " mono" : ""}`}>{v}</div>
          </div>
        ))}
      </div>

      {/* Toggles */}
      <div className="ma-ep-section ma-ep-toggles">
        {([["Required", field.required], ["Active", field.active]] as [string, boolean][]).map(([l, v], i) => (
          <label key={i} className="ma-ep-toggle">
            <input type="checkbox" defaultChecked={v} style={{ accentColor: "var(--accent-2)" }} />
            {l}
          </label>
        ))}
      </div>

      {/* Allowed values — fully editable in local draft state */}
      {(localValues.length > 0 || field.type === "Select" || showAddInput) ? (
        <div className="ma-ep-section">
          <div className="ma-ep-sl">
            Allowed values
            <span className="ma-ep-sl-sub">select type</span>
          </div>
          <div className="ma-ep-values">
            {localValues.map((v, i) => (
              <span key={i} className="ma-ep-value-chip">
                {v}
                <span
                  className="ma-ep-value-rm"
                  role="button"
                  title={`Remove "${v}"`}
                  onClick={() => setLocalValues(prev => prev.filter((_, j) => j !== i))}
                >✕</span>
              </span>
            ))}
            {showAddInput ? (
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  autoFocus
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newValue.trim()) {
                      setLocalValues(prev => [...prev, newValue.trim()]);
                      setNewValue("");
                      setShowAddInput(false);
                    }
                    if (e.key === "Escape") { setShowAddInput(false); setNewValue(""); }
                  }}
                  placeholder="New value"
                  style={{
                    border: "1px solid var(--line)", borderRadius: 2,
                    padding: "3px 7px", font: "inherit", fontSize: 12,
                    color: "var(--ink)", outline: 0, width: 110,
                  }}
                />
                <button
                  className="rep-btn rep-btn-primary"
                  type="button"
                  style={{ fontSize: 11, padding: "3px 8px" }}
                  disabled={!newValue.trim()}
                  onClick={() => {
                    if (newValue.trim()) {
                      setLocalValues(prev => [...prev, newValue.trim()]);
                      setNewValue("");
                      setShowAddInput(false);
                    }
                  }}
                >Add</button>
                <button
                  className="rep-btn rep-btn-ghost"
                  type="button"
                  style={{ fontSize: 11, padding: "3px 8px" }}
                  onClick={() => { setShowAddInput(false); setNewValue(""); }}
                >Cancel</button>
              </div>
            ) : (
              <button
                className="rep-btn rep-btn-ghost"
                type="button"
                style={{ fontSize: 11, padding: "2px 7px" }}
                onClick={() => setShowAddInput(true)}
              >+ Add value</button>
            )}
          </div>
        </div>
      ) : null}

      {/* Usage */}
      <div className="ma-ep-section">
        <div className="ma-ep-sl">Usage</div>
        <div className="ma-ep-usage">
          <span>Saved views: <strong className="mono">{field.views}</strong></span>
          <span>Reports: <strong className="mono">{field.reports}</strong></span>
          <span style={{ color: field.stageRule !== "—" ? "var(--accent-2)" : "var(--muted)" }}>
            Stage rule: <strong>{field.stageRule}</strong>
          </span>
        </div>
      </div>

      {/* Deactivation in-use guard */}
      {showDeactivateWarn && inUse ? (
        <div className="ma-ep-section ma-ep-warn">
          <div className="ma-ep-warn-title">Deactivation blocked</div>
          <div className="ma-ep-warn-body">
            This field is used by <strong>{field.views} saved view{field.views !== 1 ? "s" : ""}</strong> and{" "}
            <strong>{field.reports} report{field.reports !== 1 ? "s" : ""}</strong>.
            Remove all usages first, or reassign them before deactivating.
          </div>
          <button className="rep-btn rep-btn-ghost" type="button" style={{ fontSize: 11, marginTop: 6 }}
            onClick={() => setShowDeactivateWarn(false)}>Dismiss</button>
        </div>
      ) : null}

      {/* Actions */}
      <div className="ma-ep-actions">
        <button className="rep-btn rep-btn-primary" type="button" onClick={() => onFlash(`Draft change saved — ${field.key}`)}>
          Save draft change
        </button>
        <button className="rep-btn rep-btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <span style={{ flex: 1 }} />
        <button
          className="rep-btn rep-btn-ghost"
          type="button"
          style={{ color: "var(--neg)" }}
          onClick={() => {
            if (inUse) setShowDeactivateWarn(true);
            else onFlash(`${field.key} deactivated in draft`);
          }}
        >
          Deactivate
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StagesTab
// ─────────────────────────────────────────────────────────────────────────────

function StagesTab({
  stages,
  selectedId,
  onSelect,
  onMove,
}: {
  stages: MetadataStage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
}) {
  return (
    <div className="rep-panel ma-list-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Pipeline stages
          <em>{stages.length}</em>
        </div>
        <div className="rep-panel-actions">
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Use arrows to reorder · changes queued in draft</span>
        </div>
      </div>
      <div className="rep-table-scroll">
        <table className="rep-table">
          <colgroup>
            <col style={{ width: 40 }} /><col style={{ width: 28 }} />
            <col /><col style={{ width: 140 }} />
            <col style={{ width: 80 }} /><col style={{ width: 60 }} />
            <col style={{ width: 90 }} /><col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr>
              <th></th><th>#</th><th>Stage</th><th>Key</th>
              <th className="num">Probability</th>
              <th className="num" title="Active">Active</th>
              <th className="num">Req. fields</th>
              <th>Approval gate</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s, i) => (
              <tr
                key={s.id}
                className={selectedId === s.id ? "selected" : ""}
                style={{ cursor: "pointer" }}
                onClick={() => onSelect(s.id)}
              >
                <td style={{ padding: "4px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <button
                      className="ma-order-btn"
                      type="button"
                      onClick={e => { e.stopPropagation(); onMove(i, -1); }}
                      disabled={i === 0}
                    >▲</button>
                    <button
                      className="ma-order-btn"
                      type="button"
                      onClick={e => { e.stopPropagation(); onMove(i, 1); }}
                      disabled={i === stages.length - 1}
                    >▼</button>
                  </div>
                </td>
                <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{s.label}</td>
                <td><span className="mono rep-cell-sub" style={{ fontSize: 11 }}>{s.key}</span></td>
                <td className="num mono">{s.prob}%</td>
                <td className="num"><span style={{ color: "var(--pos)" }}>●</span></td>
                <td className="num">
                  <span className="mono" style={{
                    fontWeight: s.reqFields > 0 ? 700 : 400,
                    color: s.reqFields > 0 ? "var(--accent-2)" : "var(--muted)",
                  }}>
                    {s.reqFields || "—"}
                  </span>
                </td>
                <td>
                  {s.approvalGate ? (
                    <span className="ma-gate-chip">Gate</span>
                  ) : (
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StageEditPanel
// ─────────────────────────────────────────────────────────────────────────────

function StageEditPanel({
  stage,
  rules,
  onClose,
  onFlash,
}: {
  stage: MetadataStage | null;
  rules: RequiredRule[];
  onClose: () => void;
  onFlash: (msg: string) => void;
}) {
  if (!stage) {
    return (
      <div className="rep-panel ma-edit-panel">
        <div className="ma-ep-empty">
          <div className="ma-ep-empty-icon">ST</div>
          <div className="ma-ep-empty-title">Select a stage</div>
          <div>Click any row to edit stage properties, probability, and required fields.</div>
        </div>
      </div>
    );
  }

  const stageRules = rules.find(r => r.stage === stage.label);
  const isTerminal = stage.key === "closed_won" || stage.key === "closed_lost";

  return (
    <div className="rep-panel ma-edit-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">Stage detail</div>
        <button className="rep-btn rep-btn-ghost" type="button" onClick={onClose} style={{ fontSize: 12, padding: "3px 7px" }}>✕</button>
      </div>

      <div className="ma-ep-fields">
        {([
          ["Label",           stage.label,                  false],
          ["Stage key",       stage.key,                    true],
          ["Probability",     `${stage.prob}%`,             true],
          ["Approval gate",   stage.approvalGate ? "Yes" : "No", false],
        ] as [string, string, boolean][]).map(([l, v, isMono], i) => (
          <div key={i} className="ma-ep-field">
            <div className="ma-ep-fl">{l}</div>
            <div className={`ma-ep-fv${isMono ? " mono" : ""}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="ma-ep-section">
        <div className="ma-ep-sl">Required fields at this stage</div>
        {stageRules ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
            {stageRules.fields.map((f, i) => (
              <div key={i} className="ma-stage-req-row">
                <span className="ma-req-badge">REQ</span>
                <span style={{ fontSize: 12.5 }}>{f}</span>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 5, display: "block" }}>
            No required fields configured for this stage
          </span>
        )}
      </div>

      <div className="ma-ep-actions">
        <button className="rep-btn rep-btn-primary" type="button" onClick={() => onFlash(`Stage "${stage.label}" changes queued in draft`)}>
          Save changes
        </button>
        <button className="rep-btn rep-btn-ghost" type="button" onClick={onClose}>Cancel</button>
        {!isTerminal ? (
          <>
            <span style={{ flex: 1 }} />
            <button className="rep-btn rep-btn-ghost" type="button" style={{ color: "var(--neg)" }}
              onClick={() => onFlash(`Stage "${stage.label}" deactivated in draft`)}>
              Deactivate stage
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RequiredRulesTab
// ─────────────────────────────────────────────────────────────────────────────

function RequiredRulesTab({
  fields,
  rules,
  stages,
  onFlash,
  onRemoveRule,
  onAddRule,
}: {
  fields: MetadataField[];
  rules: RequiredRule[];
  stages: MetadataStage[];
  onFlash: (msg: string) => void;
  onRemoveRule: (stage: string, fieldName: string) => void;
  onAddRule: (stage: string, fieldName: string) => void;
}) {
  const [newStage, setNewStage] = useState(stages[0]?.label ?? "");
  const [newField, setNewField] = useState("");

  return (
    <div className="ma-rules-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rules.map((r, i) => (
          <div key={i} className="rep-panel">
            <div className="rep-panel-head">
              <div className="rep-panel-title">
                Required at: {r.stage}
                <em>{r.fields.length}</em>
              </div>
              <button
                className="rep-btn rep-btn-ghost"
                type="button"
                style={{ fontSize: 11.5 }}
                onClick={() => setNewStage(r.stage)}
                title="Pre-select this stage in the rule builder below"
              >+ Add rule</button>
            </div>
            <div>
              {r.fields.map((f, j) => (
                <div key={j} className="ma-rule-row">
                  <span className="ma-req-badge">REQ</span>
                  <span style={{ fontWeight: 500, flex: 1 }}>{f}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>Stage entry: {r.stage}</span>
                  <button
                    className="rep-btn rep-btn-ghost"
                    type="button"
                    style={{ fontSize: 11, color: "var(--neg)", padding: "2px 7px" }}
                    onClick={() => onRemoveRule(r.stage, f)}
                  >Remove</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Rule builder */}
      <div className="rep-panel ma-rule-builder">
        <div className="rep-panel-head">
          <div className="rep-panel-title">Rule builder</div>
        </div>
        <div className="ma-rb-body">
          <div className="ma-rb-field">
            <div className="ma-rb-label">Stage</div>
            <div className="ma-rb-select">
              <select value={newStage} onChange={e => setNewStage(e.target.value)}>
                {stages.slice(0, 5).map(s => <option key={s.id}>{s.label}</option>)}
              </select>
              <span className="ma-rb-caret">▾</span>
            </div>
          </div>
          <div className="ma-rb-field">
            <div className="ma-rb-label">Required field</div>
            <div className="ma-rb-select">
              <select value={newField} onChange={e => setNewField(e.target.value)}>
                <option value="">— Select field —</option>
                {fields.map(f => <option key={f.id} value={f.label}>{f.label}</option>)}
              </select>
              <span className="ma-rb-caret">▾</span>
            </div>
          </div>
          <div className="ma-rb-preview">
            <div className="ma-rb-preview-lbl">Preview</div>
            <div className="ma-rb-preview-body">
              {newField
                ? `Stage "${newStage}" will require "${newField}" to be filled before the opportunity can advance.`
                : "Select a stage and field to preview the validation rule."}
            </div>
          </div>
          <button
            className="rep-btn rep-btn-primary"
            type="button"
            disabled={!newField}
            style={{ opacity: !newField ? 0.5 : 1 }}
            onClick={() => {
              if (newField) {
                onAddRule(newStage, newField);
                setNewField("");
              }
            }}
          >
            Add rule to draft
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PublishHistoryTab
// ─────────────────────────────────────────────────────────────────────────────

function PublishHistoryTab({
  history,
  onFlash,
}: {
  history: PublishHistoryEntry[];
  onFlash: (msg: string) => void;
}) {
  return (
    <div className="ma-history-grid">
      <div className="rep-panel">
        <div className="rep-panel-head">
          <div className="rep-panel-title">Publish history <em>{history.length} versions</em></div>
        </div>
        {history.map((h, i) => (
          <div key={i} className="ma-history-row">
            <div className="ma-history-time">
              <span className="mono">{h.at.slice(11)}</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--muted-2)" }}>{h.at.slice(0, 10)}</span>
            </div>
            <div className={`ma-history-dot${h.current ? " current" : ""}`}>{h.current ? "✓" : "·"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                <span className={`ma-ver-badge ${h.current ? "pub" : "old"} mono`}>{h.version}</span>
                {h.current ? <span style={{ fontSize: 11, color: "var(--pos)", fontWeight: 500 }}>Runtime-active</span> : null}
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>by {h.by}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{h.note}</div>
            </div>
            {!h.current ? (
              <button
                className="rep-btn rep-btn-ghost"
                type="button"
                style={{ fontSize: 11, flexShrink: 0 }}
                onClick={() => onFlash(`Rollback draft created from ${h.version}`)}
              >
                Roll back ›
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="rep-panel ma-rollback-notice">
        <div className="ma-ep-sl" style={{ marginBottom: 8 }}>Rollback notice</div>
        <p style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 10px" }}>
          Rolling back creates a new draft from the selected version. The published version
          remains active until the rollback draft is validated and published as a new version.
        </p>
        <div className="ma-info-block">
          <span className="mono ma-info-lbl">IMPORTANT</span>
          Rollback does not revert data — only the field and stage configuration schema.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ImpactReviewTab
// ─────────────────────────────────────────────────────────────────────────────

function ImpactReviewTab({
  impact,
  draftVersion,
}: {
  impact: MetadataConfig["impact"];
  draftVersion: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="ma-info-block ma-impact-intro">
        <strong>Draft {draftVersion} impact summary</strong> — This review shows what will change when{" "}
        {draftVersion} is published. No data is deleted; only schema and validation rules change.
      </div>
      <div className="ma-impact-grid">
        {impact.map((item, i) => (
          <div key={i} className="rep-panel ma-impact-card">
            <div className="ma-impact-head">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="ma-impact-icon">{item.icon}</div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{item.entity}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: RISK_COLOR[item.risk] }}>
                  {item.count}
                </span>
                <span className="ma-risk-chip mono" style={{ color: RISK_COLOR[item.risk], background: RISK_BG[item.risk] }}>
                  {item.risk}
                </span>
              </div>
            </div>
            <div className="ma-impact-desc">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PublishModal
// ─────────────────────────────────────────────────────────────────────────────

function PublishModal({
  config,
  tenantName,
  onClose,
  onConfirm,
}: {
  config: MetadataConfig;
  tenantName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div className="rep-scrim" onClick={onClose} />
      <div className="rep-modal" role="dialog" aria-label="Publish draft">
        <div className="rep-modal-card" style={{ width: 520 }}>
          <div className="head">
            <h3>Publish draft {config.draftVersion}</h3>
            <p>
              {config.draftVersion} will become runtime-active.{" "}
              {config.publishedVersion} will be archived and available for rollback.
            </p>
          </div>
          <div className="body">
            {([
              ["Validation",         "Passed · 3 warnings acknowledged",           "pos"],
              ["Changes",            "1 field modified · 1 stage rule updated",    ""],
              ["Affected entities",  "46 opportunities · 3 views · 2 reports",     "warn"],
              ["Rollback available", `Yes — ${config.publishedVersion} available`, ""],
            ] as [string, string, string][]).map(([l, v, c], i) => (
              <div key={i} className="ma-pub-row">
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{l}</span>
                <span style={{
                  fontSize: 12.5, fontWeight: 500,
                  color: c === "pos" ? "var(--pos)" : c === "warn" ? "var(--accent-2)" : "var(--ink)",
                }}>
                  {v}
                </span>
              </div>
            ))}
            <label className="ma-pub-ack">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                style={{ accentColor: "var(--accent-2)", width: 14, height: 14, flexShrink: 0 }}
              />
              I have reviewed the impact summary and acknowledge that publishing {config.draftVersion} will
              update the runtime configuration for all {tenantName} users.
            </label>
          </div>
          <div className="foot">
            <button className="rep-btn rep-btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button
              className={`rep-btn${confirmed ? " rep-btn-primary" : ""}`}
              type="button"
              disabled={!confirmed}
              style={!confirmed ? { opacity: 0.45, cursor: "not-allowed" } : {}}
              onClick={() => { if (confirmed) onConfirm(); }}
            >
              Publish {config.draftVersion} →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddFieldModal
// ─────────────────────────────────────────────────────────────────────────────

function AddFieldModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (label: string) => void;
}) {
  const [label,  setLabel]  = useState("");
  const [entity, setEntity] = useState("Opportunity");
  const [type,   setType]   = useState("Select");

  const autoKey = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div className="rep-scrim" onClick={onClose} />
      <div className="rep-modal" role="dialog" aria-label="Add custom field">
        <div className="rep-modal-card" style={{ width: 480 }}>
          <div className="head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3>Add custom field</h3>
              <p>Added to draft — not live until published</p>
            </div>
            <button className="rep-btn rep-btn-ghost" type="button" onClick={onClose} style={{ fontSize: 14, padding: "3px 8px" }}>✕</button>
          </div>
          <div className="body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label className="ma-modal-lbl">Field label</label>
              <input
                className="ma-modal-input"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Contract Value Band"
              />
            </div>
            <div>
              <label className="ma-modal-lbl">Field key <span style={{ color: "var(--muted)", fontWeight: 400 }}>(auto-generated)</span></label>
              <input className="ma-modal-input" value={autoKey || ""} readOnly style={{ background: "var(--paper-2)", color: "var(--muted)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {([
                ["Entity", entity, setEntity, ["Opportunity", "Account", "Contact", "Opp / Account"]],
                ["Type",   type,   setType,   ["Select", "Text", "Number", "Date", "Date Range", "Boolean"]],
              ] as [string, string, (v: string) => void, string[]][]).map(([l, v, s, opts], i) => (
                <div key={i}>
                  <label className="ma-modal-lbl">{l}</label>
                  <div className="ma-modal-select">
                    <select value={v} onChange={e => s(e.target.value)}>
                      {opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                    <span className="ma-rb-caret">▾</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="foot">
            <button className="rep-btn rep-btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button
              className={`rep-btn${label.trim() ? " rep-btn-primary" : ""}`}
              type="button"
              disabled={!label.trim()}
              style={!label.trim() ? { opacity: 0.45, cursor: "not-allowed" } : {}}
              onClick={() => { if (label.trim()) onSave(label.trim()); }}
            >
              Add to draft
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
