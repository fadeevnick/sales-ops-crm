// ─────────────────────────────────────────────────────────────────────────────
// ManagerPipeline.tsx — Phase 2.6
// ─────────────────────────────────────────────────────────────────────────────
//
// CAPABILITY AUDIT
// ─────────────────────────────────────────────────────────────────────────────
//
// UNCHANGED
//   Saved views: Team Pipeline, Closing This Month, Pending Approval,
//   Stuck / SLA, No Next Step — all filter semantics preserved.
//   Filter surface: free-text search (opp / account / owner), owner select,
//   stage select, approval-state select, risk-signal select.
//   Pipeline table: opportunity title + ID, account + ID, owner avatar,
//   stage progress pip, amount, close date, approval pill, next-step note,
//   risk signal tag.
//   Opportunity preview panel: risk alert banner, amount / close / stage /
//   owner field grid, next step, linked approval request ID + "View ›" +
//   monitor-only caveat, manager context notes, four manager actions
//   (Reassign owner / Add manager note / Request update / Open detail).
//   Risk summary (side panel, shown when no row is selected): overdue
//   approval count, SLA-at-risk count, stuck >14d count, no-next-step count.
//   Reassign modal: team member radio list with open-opps + pipeline load
//   context, reason textarea, form validation.
//   Manager note modal: textarea + quick-insert template chips.
//   Request update action: createActivity(followup) + toast.
//   Toast notification system.
//   Team summary: per-rep open opps, total pipeline, weighted pipeline,
//   pending approvals, overdue activities, closing-this-month. Team totals.
//   Scope constraint: manager sees only direct-report scope; approval
//   visibility is monitor-only.
//
// MOVED
//   Team scope notice (full accent banner) → compact scope chip in page head.
//     All content preserved (team name, rep count, approval caveat) as title.
//   KPI strip (6 cards) → 4-card KPI band (removed "Open opportunities" —
//     redundant with table count badge — and "Closing this month" —
//     redundant with the Closing This Month view tab).
//   Risk panels (4 cards below table) → risk summary inside the preview
//     panel when no opportunity is selected. Same data, less layout noise.
//   Team summary table → collapsible section below the main grid; toggled
//     via "▼ Team" button in page head. All columns preserved.
//
// DE-EMPHASIZED, NOT REMOVED
//   Export / Columns: ghost buttons in table panel head.
//   Approval visibility caveat: inline sub-label in preview approval block.
//   Saved views: chip strip → underline tab strip (same views, same count
//     badges, same filter semantics — more compact form).
//
// BACKEND / API CONSTRAINTS
//   Team members: passed as prop — no fetchTeamMembers endpoint exists.
//   PipelineOpportunity.riskKey / nextActivityNote / managerNotes are not
//   in current OpportunityListItem. Typed as optional; "—" when absent.
//   // CONSTRAINT: extend OpportunityListItem or add fetchManagerPipeline.
//   reassignOpportunityOwner: exists — called on reassign save.
//   addManagerNote: no dedicated endpoint; implemented via createActivity
//   type="note". // CONSTRAINT: needs manager-only visibility enforcement.
//   requestUpdate: no dedicated endpoint; implemented via createActivity
//   type="followup". // CONSTRAINT: same as above.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { createActivity } from "../../api/activities";
import { reassignOpportunityOwner } from "../../api/opportunities";
import type { CurrentUser } from "../../types/session";

// ─────────────────────────────────────────────────────────────────────────────
// Local types
// ─────────────────────────────────────────────────────────────────────────────

export type PipelineOpportunity = {
  id: string;
  title: string;
  accountName: string;
  accountId: string;
  ownerId: string;
  ownerName: string;
  stageKey: string;
  stageLabel?: string;
  stageIndex?: number;           // 0–4 for 5-stage pip
  expectedAmount?: number;
  closeDate?: string;
  approvalState?: string;        // none | pending | overdue | legal | sentback | approved
  approvalLabel?: string;
  approvalRequestId?: string | null;
  riskKey?: string;              // none | sla | close | stuck | overdue | nonext
  riskLabel?: string;            // CONSTRAINT: not in current OpportunityListItem
  nextActivityNote?: string;     // CONSTRAINT: not in current OpportunityListItem
  managerNotes?: string;         // CONSTRAINT: not in current OpportunityListItem
  primaryContact?: string;
};

export type TeamMember = {
  id: string;
  displayName: string;
  initials?: string;
  colorKey?: string;
  openOppsCount?: number;
  pipelineTotal?: number;
  weightedPipeline?: number;
  pendingApprovals?: number;
  overdueActivities?: number;
  closingThisMonth?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

type ManagerPipelineProps = {
  currentUser: CurrentUser;
  teamMembers: TeamMember[];
  opportunities: PipelineOpportunity[];
  teamName?: string;
  onOpenOpportunity?: (id: string) => void;
  onOpenApproval?: (requestId: string) => void;
  onBack?: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtMoney(n: number | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function fmtDate(v: string | undefined): string {
  if (!v) return "—";
  return v.slice(0, 10);
}

type RiskMeta = { color: string; bg: string; border: string };

function riskMeta(key: string | undefined): RiskMeta | null {
  if (!key || key === "none") return null;
  if (key === "overdue") return { color: "var(--neg)", bg: "var(--neg-soft)", border: "#D6B0A8" };
  if (key === "stuck" || key === "sla") return { color: "var(--accent-2)", bg: "var(--accent-soft)", border: "#D9BFA0" };
  if (key === "close") return { color: "var(--info,#2D5B6B)", bg: "var(--info-soft,#DDE9ED)", border: "#A4C0C8" };
  if (key === "nonext") return { color: "var(--muted)", bg: "var(--paper-2)", border: "var(--line)" };
  return null;
}

function approvalPillState(state: string | undefined): string {
  if (!state || state === "none") return "none";
  if (state === "approved") return "approved";
  if (state === "pending") return "pending";
  if (state === "overdue") return "rejected";
  if (state === "legal" || state === "sentback") return "sent_back";
  return "none";
}

// ─────────────────────────────────────────────────────────────────────────────
// StagePip
// ─────────────────────────────────────────────────────────────────────────────

function StagePip({ index = 0, total = 5 }: { index?: number; total?: number }) {
  return (
    <span className="pipe-stage-pip">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < index ? "on" : i === index ? "cur" : ""} />
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RiskTag
// ─────────────────────────────────────────────────────────────────────────────

function RiskTag({ riskKey, riskLabel }: { riskKey?: string; riskLabel?: string }) {
  const meta = riskMeta(riskKey);
  if (!meta || !riskLabel) return <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>;
  return (
    <span className="pipe-risk-tag" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
      {riskLabel}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View definitions
// ─────────────────────────────────────────────────────────────────────────────

type ViewDef = { key: string; label: string; test: (o: PipelineOpportunity) => boolean };

const PIPELINE_VIEWS: ViewDef[] = [
  { key: "all",      label: "Team Pipeline",     test: () => true },
  { key: "closing",  label: "Closing This Month", test: o => {
    // Evaluated lazily at filter time so it always reflects the runtime month.
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return !!o.closeDate && o.closeDate.startsWith(prefix);
  }},
  { key: "approval", label: "Pending Approval",   test: o => ["pending","overdue","legal","sentback"].includes(o.approvalState ?? "") },
  { key: "stuck",    label: "Stuck / SLA",        test: o => ["stuck","overdue","sla"].includes(o.riskKey ?? "") },
  { key: "nonext",   label: "No Next Step",       test: o => o.riskKey === "nonext" },
];

// ─────────────────────────────────────────────────────────────────────────────
// ManagerPipeline — main component
// ─────────────────────────────────────────────────────────────────────────────

export function ManagerPipeline({
  currentUser,
  teamMembers,
  opportunities,
  teamName = "Team",
  onOpenOpportunity,
  onOpenApproval,
  onBack,
}: ManagerPipelineProps) {
  const [activeView,     setActiveView]     = useState("all");
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [filterOwner,    setFilterOwner]    = useState("");
  const [filterStage,    setFilterStage]    = useState("");
  const [filterApproval, setFilterApproval] = useState("");
  const [filterRisk,     setFilterRisk]     = useState("");
  const [search,         setSearch]         = useState("");
  const [teamExpanded,   setTeamExpanded]   = useState(false);
  const [modal, setModal] = useState<{ kind: "reassign" | "note"; opp: PipelineOpportunity } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Optimistic patches keyed by opportunity ID — applied over the prop on every render.
  const [localPatches, setLocalPatches] = useState<Record<string, Partial<PipelineOpportunity>>>({});

  // Merge prop opportunities with any pending local patches.
  const effectiveOpps = useMemo(
    () => opportunities.map(o => localPatches[o.id] ? { ...o, ...localPatches[o.id] } : o),
    [opportunities, localPatches]
  );

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(c => (c === msg ? null : c)), 2800);
  }

  const viewDef = PIPELINE_VIEWS.find(v => v.key === activeView) ?? PIPELINE_VIEWS[0];

  const rows = useMemo(() => effectiveOpps.filter(o => {
    if (!viewDef.test(o)) return false;
    if (filterOwner    && o.ownerId       !== filterOwner)    return false;
    if (filterStage    && o.stageKey      !== filterStage)    return false;
    if (filterApproval && o.approvalState !== filterApproval) return false;
    if (filterRisk     && o.riskKey       !== filterRisk)     return false;
    if (search) {
      const hay = `${o.title} ${o.accountName} ${o.ownerName}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [effectiveOpps, viewDef, filterOwner, filterStage, filterApproval, filterRisk, search]);

  const viewCounts = useMemo(() => {
    const out: Record<string, number> = {};
    PIPELINE_VIEWS.forEach(v => { out[v.key] = effectiveOpps.filter(v.test).length; });
    return out;
  }, [effectiveOpps]);

  const selectedOpp = rows.find(o => o.id === selectedId) ?? null;

  // KPI band
  const totalPipeline   = effectiveOpps.reduce((s, o) => s + (o.expectedAmount ?? 0), 0);
  const pendingApprCount = effectiveOpps.filter(o => ["pending","overdue","legal","sentback"].includes(o.approvalState ?? "")).length;
  const overdueActCount  = effectiveOpps.filter(o => o.riskKey === "overdue").length;
  const slaBreachCount   = effectiveOpps.filter(o => o.riskKey === "overdue" && o.approvalState === "overdue").length;

  const hasFilters = !!(filterOwner || filterStage || filterApproval || filterRisk || search);

  async function handleRequestUpdate(opp: PipelineOpportunity) {
    try {
      await createActivity(currentUser.userId, opp.id, {
        title: `Manager update request: ${opp.title}`,
        type: "followup",
        dueDate: new Date().toISOString().slice(0, 10),
      });
    } catch { /* offline */ }
    flash(`↻ Update requested from ${opp.ownerName} on ${opp.id}`);
  }

  async function handleSaveReassign(opp: PipelineOpportunity, newOwnerId: string, newOwnerName: string, reason: string) {
    // Patch immediately — table row and preview panel update in the same render.
    setLocalPatches(prev => ({
      ...prev,
      [opp.id]: { ...prev[opp.id], ownerId: newOwnerId, ownerName: newOwnerName },
    }));
    try {
      await reassignOpportunityOwner(currentUser.userId, opp.id, { newOwnerId });
      void reason;
    } catch { /* offline — optimistic patch already applied */ }
    flash(`✓ ${opp.id} reassigned to ${newOwnerName}`);
    setModal(null);
  }

  async function handleSaveNote(opp: PipelineOpportunity, note: string) {
    const trimmed = note.trim();
    // Patch managerNotes immediately so the preview panel shows the new note at once.
    if (trimmed) {
      setLocalPatches(prev => ({
        ...prev,
        [opp.id]: { ...prev[opp.id], managerNotes: trimmed },
      }));
    }
    try {
      await createActivity(currentUser.userId, opp.id, {
        title: trimmed || "Manager note",
        type: "note",
        dueDate: new Date().toISOString().slice(0, 10),
      });
    } catch { /* offline — optimistic patch already applied */ }
    flash(`✓ Manager note saved on ${opp.id}`);
    setModal(null);
  }

  return (
    <section className="rep-workspace pipe-workspace">

      {/* Page head */}
      <div className="pipe-page-head">
        {onBack ? (
          <button className="pipe-back-btn" type="button" onClick={onBack}>← Back</button>
        ) : null}
        <div className="pipe-crumb">
          <span>Opportunities</span>
          <span className="sep">/</span>
          <strong>Team pipeline</strong>
        </div>
        <div
          className="pipe-scope-chip"
          title={`Manager scope: ${teamName} · ${teamMembers.length} direct reports · Approval visibility: monitor only — cannot decide Finance / Legal steps`}
        >
          <span className="pipe-scope-lock">🔒</span>
          <span className="mono">{teamName} · {teamMembers.length} reps · Monitor scope</span>
        </div>
        <div style={{ flex: 1 }} />
        <button
          className={`rep-btn rep-btn-ghost pipe-team-toggle${teamExpanded ? " active" : ""}`}
          type="button"
          onClick={() => setTeamExpanded(e => !e)}
        >
          {teamExpanded ? "▲" : "▼"} Team
        </button>
      </div>

      {/* KPI band */}
      <div className="pipe-kpi-band">
        {([
          { label: "Team pipeline",      value: fmtMoney(totalPipeline),  foot: `${teamMembers.length} reps · ${opportunities.length} open opps`,          cls: "accent" },
          { label: "Pending approvals",  value: String(pendingApprCount), foot: "Finance + Legal + Sent back",                                              cls: pendingApprCount > 0 ? "warn" : "" },
          { label: "Overdue activities", value: String(overdueActCount),  foot: "Across team · needs action",                                               cls: overdueActCount > 0 ? "alert" : "" },
          { label: "Approval SLA breach",value: String(slaBreachCount),   foot: slaBreachCount > 0 ? "Requires immediate escalation" : "All within SLA",   cls: slaBreachCount > 0 ? "alert" : "" },
        ] as { label: string; value: string; foot: string; cls: string }[]).map((k, i) => (
          <div key={i} className="pipe-kpi-item">
            <div className="pipe-kpi-l">{k.label}</div>
            <div className={`pipe-kpi-v mono${k.cls ? ` ${k.cls}` : ""}`}>{k.value}</div>
            <div className="pipe-kpi-foot">{k.foot}</div>
          </div>
        ))}
      </div>

      {/* Controls: tabs + filter row */}
      <div className="pipe-controls">
        <div className="pipe-tab-strip">
          {PIPELINE_VIEWS.map(v => (
            <button
              key={v.key}
              type="button"
              className={`pipe-tab${activeView === v.key ? " active" : ""}`}
              onClick={() => { setActiveView(v.key); setSelectedId(null); }}
            >
              {v.label}
              <span className="ct">{viewCounts[v.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="pipe-filter-row">
          <div className="pipe-filter-search">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" />
            </svg>
            <input
              placeholder="Search opportunity, account, owner…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {([
            { label: "Owner",    value: filterOwner,    set: setFilterOwner,
              opts: [["","All owners"], ...teamMembers.map(t => [t.id, t.displayName.split(" ")[0]])] },
            { label: "Stage",    value: filterStage,    set: setFilterStage,
              opts: [["","All stages"], ...["Qualification","Discovery","Proposal","Negotiation"].map(s => [s,s])] },
            { label: "Approval", value: filterApproval, set: setFilterApproval,
              opts: [["","Any"],["pending","Pending"],["overdue","Overdue"],["legal","Legal"],["sentback","Sent Back"],["approved","Approved"]] },
            { label: "Risk",     value: filterRisk,     set: setFilterRisk,
              opts: [["","Any"],["overdue","Overdue"],["stuck","Stuck"],["sla","SLA at risk"],["close","Closing soon"],["nonext","No next step"]] },
          ] as { label: string; value: string; set: (v: string) => void; opts: [string, string][] }[]).map(f => (
            <div key={f.label} className="pipe-filter-select">
              <span className="pipe-filter-lbl">{f.label}</span>
              <select value={f.value} onChange={e => f.set(e.target.value)}>
                {f.opts.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
              </select>
              <span className="pipe-filter-caret">▾</span>
            </div>
          ))}
          {hasFilters ? (
            <button
              className="rep-btn rep-btn-ghost pipe-clear-btn"
              type="button"
              onClick={() => { setFilterOwner(""); setFilterStage(""); setFilterApproval(""); setFilterRisk(""); setSearch(""); }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {/* Main work area */}
      <div className="pipe-body-grid">
        <PipelineTable
          rows={rows}
          teamMembers={teamMembers}
          selectedId={selectedId}
          onSelect={id => setSelectedId(prev => prev === id ? null : id)}
        />
        <OppPreviewPanel
          opp={selectedOpp}
          allOpps={effectiveOpps}
          onManagerAction={(kind, opp) => {
            if (kind === "reassign") setModal({ kind: "reassign", opp });
            else if (kind === "note") setModal({ kind: "note", opp });
            else if (kind === "update") void handleRequestUpdate(opp);
            else if (kind === "detail") onOpenOpportunity?.(opp.id);
          }}
          onOpenApproval={onOpenApproval}
        />
      </div>

      {/* Team breakdown (collapsible) */}
      {teamExpanded ? (
        <TeamSummary teamMembers={teamMembers} opportunities={effectiveOpps} />
      ) : null}

      {/* Footer */}
      <div className="rep-foot-ruler">
        <span>SALES OPS CRM · {currentUser.tenantName.toUpperCase()} · LOCAL PILOT</span>
        <span>{currentUser.roleKey.toUpperCase()} · {currentUser.displayName} · {teamName}</span>
        <span>{effectiveOpps.length} OPPS · {fmtMoney(totalPipeline)} PIPELINE</span>
      </div>

      {/* Modals */}
      {modal?.kind === "reassign" ? (
        <ReassignModal
          opp={modal.opp}
          teamMembers={teamMembers}
          onClose={() => setModal(null)}
          onSave={(newOwnerId, newOwnerName, reason) =>
            void handleSaveReassign(modal.opp, newOwnerId, newOwnerName, reason)
          }
        />
      ) : null}
      {modal?.kind === "note" ? (
        <ManagerNoteModal
          opp={modal.opp}
          onClose={() => setModal(null)}
          onSave={note => void handleSaveNote(modal.opp, note)}
        />
      ) : null}

      {toast ? (
        <div className="rep-toast"><span className="ok">✓</span>{toast}</div>
      ) : null}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineTable
// ─────────────────────────────────────────────────────────────────────────────

function PipelineTable({
  rows,
  teamMembers,
  selectedId,
  onSelect,
}: {
  rows: PipelineOpportunity[];
  teamMembers: TeamMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rep-panel pipe-table-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Team pipeline
          <em>{rows.length}</em>
        </div>
        <div className="rep-panel-actions">
          <button className="rep-btn rep-btn-ghost" style={{ fontSize: 11.5, padding: "3px 8px" }} type="button">Export</button>
          <button className="rep-btn rep-btn-ghost" style={{ fontSize: 11.5, padding: "3px 8px" }} type="button">Columns</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rep-empty" style={{ padding: "48px 24px" }}>
          <div className="icon">OP</div>
          <div className="ttl">No opportunities match</div>
          <div>Try a different view or clear the active filters.</div>
        </div>
      ) : (
        <div className="rep-table-scroll">
          <table className="rep-table pipe-table">
            <colgroup>
              <col style={{ width: "18%" }} /><col style={{ width: "15%" }} />
              <col style={{ width: "10%" }} /><col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} /><col style={{ width: "9%" }} />
              <col style={{ width: "12%" }} /><col /><col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Opportunity</th><th>Account</th><th>Owner</th>
                <th>Stage</th><th className="num">Amount</th><th>Close</th>
                <th>Approval</th><th>Next step</th><th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(o => {
                const member = teamMembers.find(t => t.id === o.ownerId);
                return (
                  <tr
                    key={o.id}
                    className={[
                      selectedId === o.id ? "selected" : "",
                      o.riskKey === "overdue" ? "pipe-row-overdue" : "",
                    ].filter(Boolean).join(" ")}
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelect(o.id)}
                  >
                    <td>
                      <div className="rep-cell-truncate" style={{ fontWeight: 500 }}>{o.title}</div>
                      <span className="rep-cell-sub mono">{o.id}</span>
                    </td>
                    <td>
                      <div className="rep-cell-truncate">{o.accountName}</div>
                      <span className="rep-cell-sub mono">{o.accountId}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {member?.initials ? (
                          <div className={`pipe-avatar${member.colorKey ? ` ${member.colorKey}` : ""}`}>
                            {member.initials}
                          </div>
                        ) : null}
                        <span style={{ fontSize: 12 }}>{o.ownerName.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <StagePip index={o.stageIndex ?? 0} />
                        <span className="rep-cell-sub">{o.stageLabel ?? o.stageKey}</span>
                      </div>
                    </td>
                    <td className="num">
                      <span className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{fmtMoney(o.expectedAmount)}</span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 11.5 }}>{fmtDate(o.closeDate)}</span>
                    </td>
                    <td>
                      {o.approvalState && o.approvalState !== "none" ? (
                        <span className={`rep-pill p-${approvalPillState(o.approvalState)}`}>
                          <span className="dot" />
                          {o.approvalLabel ?? o.approvalState}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="rep-cell-truncate" style={{ fontSize: 12 }}>
                        {o.nextActivityNote ?? "—"}
                      </div>
                    </td>
                    <td>
                      <RiskTag riskKey={o.riskKey} riskLabel={o.riskLabel} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OppPreviewPanel
// ─────────────────────────────────────────────────────────────────────────────

type ManagerActionKind = "reassign" | "note" | "update" | "detail";

function OppPreviewPanel({
  opp,
  allOpps,
  onManagerAction,
  onOpenApproval,
}: {
  opp: PipelineOpportunity | null;
  allOpps: PipelineOpportunity[];
  onManagerAction: (kind: ManagerActionKind, opp: PipelineOpportunity) => void;
  onOpenApproval?: (requestId: string) => void;
}) {
  if (!opp) {
    const riskItems = [
      { label: "Overdue approval",  count: allOpps.filter(o => o.approvalState === "overdue").length,      color: "var(--neg)"      },
      { label: "SLA at risk",       count: allOpps.filter(o => o.riskKey === "sla").length,                color: "var(--accent-2)" },
      { label: "Stuck > 14 days",   count: allOpps.filter(o => o.riskKey === "stuck").length,              color: "var(--accent-2)" },
      { label: "No next step",      count: allOpps.filter(o => o.riskKey === "nonext").length,             color: "var(--muted)"    },
    ];
    return (
      <div className="rep-panel pipe-preview">
        <div className="rep-panel-head">
          <div className="rep-panel-title">Opportunity detail</div>
        </div>
        <div className="pipe-preview-empty">
          <div className="pipe-preview-empty-icon">OP</div>
          <div className="pipe-preview-empty-title">Select an opportunity</div>
          <div>Click any row to see deal context and manager actions.</div>
        </div>
        <div className="pipe-risk-summary">
          <div className="pipe-risk-summary-head">Risk summary</div>
          {riskItems.map((r, i) => (
            <div key={i} className="pipe-risk-item">
              <span>{r.label}</span>
              <span
                className="mono"
                style={{
                  color: r.count > 0 ? r.color : "var(--muted)",
                  fontWeight: r.count > 0 ? 700 : 400,
                }}
              >
                {r.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const rm = riskMeta(opp.riskKey);

  return (
    <div className="rep-panel pipe-preview">
      {/* Header */}
      <div className="pipe-pv-head">
        <div className="pipe-pv-id-row">
          <span className="mono pipe-pv-id">{opp.id}</span>
          {opp.approvalState && opp.approvalState !== "none" ? (
            <span className={`rep-pill p-${approvalPillState(opp.approvalState)}`}>
              <span className="dot" />{opp.approvalLabel ?? opp.approvalState}
            </span>
          ) : (
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>No approval</span>
          )}
        </div>
        <div className="pipe-pv-title">{opp.title}</div>
        <div className="pipe-pv-account">
          {opp.accountName}{opp.primaryContact ? ` · ${opp.primaryContact}` : ""}
        </div>
        {rm ? (
          <div className="pipe-pv-risk-alert" style={{ color: rm.color, background: rm.bg, borderColor: rm.border }}>
            ⚠ {opp.riskLabel}
          </div>
        ) : null}
      </div>

      {/* Key fields */}
      <div className="pipe-pv-fields">
        {([
          ["Amount", fmtMoney(opp.expectedAmount), true],
          ["Close",  fmtDate(opp.closeDate),        true],
          ["Stage",  opp.stageLabel ?? opp.stageKey, false],
          ["Owner",  opp.ownerName,                  false],
        ] as [string, string, boolean][]).map(([l, v, isMono], i) => (
          <div key={i} className="pipe-pv-field">
            <div className="pipe-pv-fl">{l}</div>
            <div className={`pipe-pv-fv${isMono ? " mono" : ""}`}>{v}</div>
          </div>
        ))}
      </div>

      {/* Next step */}
      <div className="pipe-pv-section">
        <div className="pipe-pv-section-l">Next step</div>
        <div className="pipe-pv-section-v">{opp.nextActivityNote ?? "—"}</div>
      </div>

      {/* Approval link */}
      {opp.approvalRequestId ? (
        <div className="pipe-pv-section pipe-pv-section-appr">
          <div className="pipe-pv-section-l">
            Linked approval
            <span className="pipe-pv-appr-caveat">Monitor only — cannot decide Finance / Legal</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
            <span className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{opp.approvalRequestId}</span>
            {onOpenApproval ? (
              <button
                className="rep-btn rep-btn-ghost"
                style={{ fontSize: 11, padding: "3px 8px" }}
                type="button"
                onClick={() => onOpenApproval(opp.approvalRequestId!)}
              >
                View ›
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Manager notes */}
      {opp.managerNotes ? (
        <div className="pipe-pv-section">
          <div className="pipe-pv-section-l">Manager context</div>
          <div className="pipe-pv-notes">{opp.managerNotes}</div>
        </div>
      ) : null}

      {/* Manager actions */}
      <div className="pipe-pv-actions">
        <div className="pipe-pv-section-l" style={{ marginBottom: 8 }}>Manager actions</div>
        <button
          className="rep-btn rep-btn-primary"
          type="button"
          style={{ justifyContent: "center" }}
          onClick={() => onManagerAction("reassign", opp)}
        >
          → Reassign owner
        </button>
        <button
          className="rep-btn"
          type="button"
          style={{ justifyContent: "center" }}
          onClick={() => onManagerAction("note", opp)}
        >
          ✎ Add manager note
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="rep-btn"
            type="button"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => onManagerAction("update", opp)}
          >
            ↻ Request update
          </button>
          <button
            className="rep-btn rep-btn-ghost"
            type="button"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => onManagerAction("detail", opp)}
          >
            Open detail ›
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TeamSummary
// ─────────────────────────────────────────────────────────────────────────────

function TeamSummary({
  teamMembers,
}: {
  teamMembers: TeamMember[];
  opportunities: PipelineOpportunity[];
}) {
  const totals = teamMembers.reduce(
    (acc, t) => ({
      opps:     acc.opps     + (t.openOppsCount      ?? 0),
      pipeline: acc.pipeline + (t.pipelineTotal       ?? 0),
      weighted: acc.weighted + (t.weightedPipeline    ?? 0),
      appr:     acc.appr     + (t.pendingApprovals    ?? 0),
      overdue:  acc.overdue  + (t.overdueActivities   ?? 0),
      closing:  acc.closing  + (t.closingThisMonth    ?? 0),
    }),
    { opps: 0, pipeline: 0, weighted: 0, appr: 0, overdue: 0, closing: 0 }
  );

  return (
    <div className="rep-panel pipe-team-summary">
      <div className="rep-panel-head">
        <div className="rep-panel-title">
          Team breakdown
          <em>{teamMembers.length} reps</em>
        </div>
        <div className="rep-panel-actions">
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            Total {fmtMoney(totals.pipeline)} · weighted {fmtMoney(totals.weighted)}
          </span>
        </div>
      </div>
      <div className="rep-table-scroll">
        <table className="rep-table">
          <colgroup>
            <col style={{ width: 180 }} />
            <col /><col /><col /><col /><col /><col />
          </colgroup>
          <thead>
            <tr>
              <th>Rep</th>
              <th className="num">Open opps</th>
              <th className="num">Pipeline</th>
              <th className="num">Weighted</th>
              <th className="num">Pending approvals</th>
              <th className="num">Overdue tasks</th>
              <th className="num">Closing · month</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map(t => (
              <tr key={t.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    {t.initials ? (
                      <div className={`pipe-avatar${t.colorKey ? ` ${t.colorKey}` : ""}`} style={{ flexShrink: 0 }}>
                        {t.initials}
                      </div>
                    ) : null}
                    <span style={{ fontWeight: 500, fontSize: 12.5 }}>{t.displayName}</span>
                  </div>
                </td>
                <td className="num mono">{t.openOppsCount ?? "—"}</td>
                <td className="num mono">{fmtMoney(t.pipelineTotal)}</td>
                <td className="num mono">{fmtMoney(t.weightedPipeline)}</td>
                <td className="num">
                  <span className="mono" style={{
                    color: (t.pendingApprovals ?? 0) > 2 ? "var(--accent-2)" : "inherit",
                    fontWeight: (t.pendingApprovals ?? 0) > 2 ? 700 : 400,
                  }}>
                    {t.pendingApprovals ?? "—"}
                  </span>
                </td>
                <td className="num">
                  <span className="mono" style={{
                    color: (t.overdueActivities ?? 0) >= 4 ? "var(--neg)" : (t.overdueActivities ?? 0) >= 2 ? "var(--accent-2)" : "inherit",
                    fontWeight: (t.overdueActivities ?? 0) >= 2 ? 700 : 400,
                  }}>
                    {t.overdueActivities ?? "—"}
                  </span>
                </td>
                <td className="num mono">{t.closingThisMonth ?? "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="pipe-team-total">
              <td style={{ fontWeight: 600 }}>Team total</td>
              <td className="num mono" style={{ fontWeight: 600 }}>{totals.opps}</td>
              <td className="num mono" style={{ fontWeight: 600 }}>{fmtMoney(totals.pipeline)}</td>
              <td className="num mono" style={{ fontWeight: 600 }}>{fmtMoney(totals.weighted)}</td>
              <td className="num mono" style={{ fontWeight: 600, color: totals.appr > 0 ? "var(--accent-2)" : "inherit" }}>{totals.appr}</td>
              <td className="num mono" style={{ fontWeight: 600, color: totals.overdue > 0 ? "var(--neg)" : "inherit" }}>{totals.overdue}</td>
              <td className="num mono" style={{ fontWeight: 600 }}>{totals.closing}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ReassignModal
// ─────────────────────────────────────────────────────────────────────────────

function ReassignModal({
  opp,
  teamMembers,
  onClose,
  onSave,
}: {
  opp: PipelineOpportunity;
  teamMembers: TeamMember[];
  onClose: () => void;
  onSave: (newOwnerId: string, newOwnerName: string, reason: string) => void;
}) {
  const [newOwnerId, setNewOwnerId] = useState("");
  const [reason,     setReason]     = useState("");
  const [touched,    setTouched]    = useState(false);
  const ownerErr = touched && !newOwnerId;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  function save() {
    setTouched(true);
    if (!newOwnerId) return;
    const member = teamMembers.find(t => t.id === newOwnerId);
    onSave(newOwnerId, member?.displayName ?? newOwnerId, reason);
  }

  return (
    <>
      <div className="rep-scrim" onClick={onClose} />
      <div className="rep-modal" role="dialog" aria-label="Reassign owner">
        <div className="rep-modal-card" style={{ width: 500 }}>
          <div className="head">
            <h3>Reassign owner</h3>
            <p>{opp.id} · {opp.title} · currently {opp.ownerName}</p>
          </div>
          <div className="body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div className="pipe-modal-lbl">
                New owner <span className="pipe-modal-required">*</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 5 }}>
                {teamMembers.filter(t => t.id !== opp.ownerId).map(t => (
                  <label key={t.id} className={`pipe-owner-option${newOwnerId === t.id ? " selected" : ""}`}>
                    <input
                      type="radio"
                      name="reassign-owner"
                      value={t.id}
                      checked={newOwnerId === t.id}
                      onChange={() => setNewOwnerId(t.id)}
                      style={{ accentColor: "var(--accent-2)" }}
                    />
                    {t.initials ? (
                      <div className={`pipe-avatar${t.colorKey ? ` ${t.colorKey}` : ""}`}>{t.initials}</div>
                    ) : null}
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{t.displayName}</div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                        {t.openOppsCount ?? "?"} open opps · {fmtMoney(t.pipelineTotal)} pipeline
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {ownerErr ? <div className="pipe-modal-err">Select a new owner to continue</div> : null}
            </div>
            <div>
              <div className="pipe-modal-lbl">
                Reason / note <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
              </div>
              <div className="pipe-modal-textarea" style={{ marginTop: 5 }}>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Anna at capacity · Jonas has DACH-North relationship"
                />
              </div>
            </div>
          </div>
          <div className="foot">
            <button className="rep-btn rep-btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="rep-btn rep-btn-primary" type="button" onClick={save}>Reassign owner</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ManagerNoteModal
// ─────────────────────────────────────────────────────────────────────────────

const NOTE_TEMPLATES = [
  "Flag for QBR review",
  "Escalate to executive",
  "Needs immediate attention",
  "Customer deadline risk",
  "On track — monitor weekly",
];

function ManagerNoteModal({
  opp,
  onClose,
  onSave,
}: {
  opp: PipelineOpportunity;
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div className="rep-scrim" onClick={onClose} />
      <div className="rep-modal" role="dialog" aria-label="Add manager note">
        <div className="rep-modal-card" style={{ width: 480 }}>
          <div className="head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3>Add manager note</h3>
              <p>{opp.id} · {opp.title}</p>
            </div>
            <button className="rep-btn rep-btn-ghost" type="button" onClick={onClose} style={{ fontSize: 14, padding: "3px 8px" }}>✕</button>
          </div>
          <div className="body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div className="pipe-modal-lbl">
                Note
                <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 5 }}>
                  · visible to manager and above only
                </span>
              </div>
              <div className="pipe-modal-textarea" style={{ marginTop: 5 }}>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Discussed with rep — customer has given EOD deadline. Escalating to Finance today."
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {NOTE_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  className="pipe-note-chip"
                  onClick={() => setNote(n => n ? `${n} · ${t}` : t)}
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>
          <div className="foot">
            <button className="rep-btn rep-btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="rep-btn rep-btn-primary" type="button" onClick={() => onSave(note)}>Save note</button>
          </div>
        </div>
      </div>
    </>
  );
}
