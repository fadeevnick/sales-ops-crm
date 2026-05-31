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

import { useMemo, useState } from "react";
import { createActivity } from "../../api/activities";
import { reassignOpportunityOwner } from "../../api/opportunities";
import type { CurrentUser } from "../../types/session";
import { ManagerNoteModal, OppPreviewPanel, PipelineTable, ReassignModal, TeamSummary } from "./ManagerPipelineSections";
import {
  PIPELINE_VIEWS,
  type PipelineOpportunity,
  type TeamMember,
  fmtMoney,
} from "./ManagerPipelineShared";

export type { PipelineOpportunity, TeamMember } from "./ManagerPipelineShared";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

type ManagerPipelineProps = {
  currentUser: CurrentUser;
  teamMembers: TeamMember[];
  opportunities: PipelineOpportunity[];
  teamName?: string;
  total?: number;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onOpenOpportunity?: (id: string) => void;
  onOpenApproval?: (requestId: string) => void;
  onBack?: () => void;
};


// ─────────────────────────────────────────────────────────────────────────────
// ManagerPipeline — main component
// ─────────────────────────────────────────────────────────────────────────────

export function ManagerPipeline({
  currentUser,
  teamMembers,
  opportunities,
  teamName = "Team",
  total,
  isLoadingMore = false,
  onLoadMore,
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

  // Stage filter options come from the actual loaded opportunities (real stageKeys),
  // not a hardcoded list — otherwise the filter compares a display name against
  // stageKey and silently matches nothing.
  const stageOptions = useMemo<[string, string][]>(() => {
    const map = new Map<string, { label: string; index: number }>();
    for (const o of effectiveOpps) {
      if (!map.has(o.stageKey)) {
        map.set(o.stageKey, { label: o.stageLabel ?? o.stageKey, index: o.stageIndex ?? 999 });
      }
    }
    return [...map.entries()]
      .sort((a, b) => a[1].index - b[1].index)
      .map(([key, v]) => [key, v.label] as [string, string]);
  }, [effectiveOpps]);

  const selectedOpp = rows.find(o => o.id === selectedId) ?? null;

  // KPI band
  const totalPipeline   = effectiveOpps.reduce((s, o) => s + (o.expectedAmount ?? 0), 0);
  const pendingApprCount = effectiveOpps.filter(o => ["pending","overdue","legal","sentback"].includes(o.approvalState ?? "")).length;
  const overdueActCount  = effectiveOpps.filter(o => o.riskKey === "overdue").length;
  const slaBreachCount   = effectiveOpps.filter(o => o.riskKey === "overdue" && o.approvalState === "overdue").length;

  const hasFilters = !!(filterOwner || filterStage || filterApproval || filterRisk || search);

  // Restore a per-opp patch to its previous value (used to roll back failed optimistic writes).
  function restorePatch(oppId: string, prevPatch: Partial<PipelineOpportunity> | undefined) {
    setLocalPatches(prev => {
      const next = { ...prev };
      if (prevPatch === undefined) delete next[oppId];
      else next[oppId] = prevPatch;
      return next;
    });
  }

  async function handleRequestUpdate(opp: PipelineOpportunity) {
    try {
      await createActivity(currentUser.userId, opp.id, {
        title: `Manager update request: ${opp.title}`,
        type: "followup",
        dueDate: new Date().toISOString().slice(0, 10),
      });
      flash(`↻ Update requested from ${opp.ownerName} on ${opp.id}`);
    } catch {
      flash(`✗ Update request failed for ${opp.id} — not sent`);
    }
  }

  async function handleSaveReassign(opp: PipelineOpportunity, newOwnerId: string, newOwnerName: string, reason: string) {
    // Patch immediately — table row and preview panel update in the same render.
    const prevPatch = localPatches[opp.id];
    setLocalPatches(prev => ({
      ...prev,
      [opp.id]: { ...prev[opp.id], ownerId: newOwnerId, ownerName: newOwnerName },
    }));
    try {
      await reassignOpportunityOwner(currentUser.userId, opp.id, { newOwnerId });
      void reason;
      flash(`✓ ${opp.id} reassigned to ${newOwnerName}`);
      setModal(null);
    } catch {
      restorePatch(opp.id, prevPatch);
      flash(`✗ Reassign failed for ${opp.id} — change reverted`);
    }
  }

  async function handleSaveNote(opp: PipelineOpportunity, note: string) {
    const trimmed = note.trim();
    // Patch managerNotes immediately so the preview panel shows the new note at once.
    const prevPatch = localPatches[opp.id];
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
      flash(`✓ Manager note saved on ${opp.id}`);
      setModal(null);
    } catch {
      if (trimmed) restorePatch(opp.id, prevPatch);
      flash(`✗ Note failed to save on ${opp.id} — reverted`);
    }
  }

  return (
    <section className="rep-workspace pipe-workspace">

      {/* Page head */}
      <div className="pipe-page-head">
        {onBack ? (
          <button className="pipe-back-btn" type="button" onClick={onBack}>← Back</button>
        ) : null}
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

      {total != null && total > opportunities.length ? (
        <div className="rep-kpi-note">
          Showing {opportunities.length} of {total} team opportunities — these KPIs and the team breakdown
          cover the loaded subset only. Load more below to include the rest.
        </div>
      ) : null}

      {/* Team breakdown (collapsible) — sits in the summary zone, right under the
          KPIs and its own toggle, so expanding it is visible immediately. */}
      {teamExpanded ? (
        <TeamSummary teamMembers={teamMembers} opportunities={effectiveOpps} />
      ) : null}

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
              opts: [["","All stages"] as [string, string], ...stageOptions] },
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

      {total != null && opportunities.length < total && onLoadMore ? (
        <div className="rep-load-more">
          <button className="rep-btn" disabled={isLoadingMore} onClick={onLoadMore} type="button">
            {isLoadingMore ? "Loading…" : `Load more — showing ${opportunities.length} of ${total}`}
          </button>
        </div>
      ) : null}

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
        <div className="rep-toast">{toast}</div>
      ) : null}
    </section>
  );
}
