// ─────────────────────────────────────────────────────────────────────────────
// DuplicateReviewMerge.tsx — Phase 2.9 (revised)
// ─────────────────────────────────────────────────────────────────────────────
//
// REVISIONS FROM PHASE 2.9
// ─────────────────────────────────────────────────────────────────────────────
//
//  FIX 1 — False-positive reason now preserved
//    CandLocalStatus stores rejectReason per candidate in localStatuses state.
//    onConfirm(reason) in RejectModal call site now passes reason to
//    handleRejectConfirm(reason), which writes it into localStatuses.
//    AuditContent reads localStatus.rejectReason and surfaces it in the
//    rejection audit event, so the reason is visible and carried through.
//
//  FIX 2 — Merge / reject / skip update queue state immediately
//    localStatuses: Record<string, CandLocalStatus> replaces the bare `merged`
//    boolean. Each action mutates localStatuses for the acted-upon candidate.
//    filteredQueue, KPI counts, and queue row rendering all derive from
//    localStatuses, so changes reflect immediately. Merged and rejected
//    candidates disappear from all queue filters. Deferred (skipped) candidates
//    stay visible under "All Open" and "Needs Review". After each action the
//    screen auto-advances (800ms delay) to the next actionable candidate.
//    KPI band: "Open candidates" decrements on merge/reject; "False positives"
//    increments on reject; "Merges this week" increments on merge.
//
//  FIX 3 — Secondary navigation wired honestly
//    Open A ›, Open B ›, Related opps buttons now call onFlash with a
//    plain-language constraint message (record deep-link not yet wired in
//    LOCAL PILOT). Controls are no longer silent/dead — they respond and
//    surface the backend constraint. onFlash is passed from the main component
//    to MatchBar as a prop.
//
//  FIX 4 — All 6 queue filters now have distinct, coherent logic
//    All Open     → open or deferred (all pending candidates)
//    High Confidence → open only, score ≥ 0.85
//    Accounts     → Account type (open or deferred)
//    Contacts     → Contact type (open or deferred)
//    From Imports → a or b record came from an import batch (checks source string)
//    Needs Review → score < 0.85 OR deferred (low-confidence + skipped items)
//    Added DUP-2047 (manual-vs-manual Account) so From Imports is genuinely
//    distinct from All Open (5 of 6 candidates match From Imports).
//    Merged and rejected candidates are excluded from all filters.
//
// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITY AUDIT (unchanged capabilities)
// ─────────────────────────────────────────────────────────────────────────────
//
// UNCHANGED
//   KPI band (6 metrics), candidate queue (6 filter views), score badge +
//   breakdown, system interpretation, match reason tags. Full field comparison
//   (Account 12 fields, Contact 8 fields). Master selection. Per-field
//   conflict resolution. Merge impact preview. Merge reason + templates.
//   Primary merge CTA. Post-merge confirmation. Reject as false positive (modal).
//   Skip/defer. Audit timeline. Toast notifications.
//
// BACKEND / API CONSTRAINTS
//   Merge, reject, skip: simulated locally — no endpoint.
//   Record deep-link (Open A ›, Open B ›): no navigation endpoint in LOCAL PILOT.
//   Score/breakdown: static sample data.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import type { CurrentUser } from "../../types/session";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type DupRecord = {
  id: string;
  name: string;
  source: string;
};

export type DupCandidate = {
  id: string;
  type: "Account" | "Contact";
  score: number;
  status: "open" | "merged" | "rejected";
  a: DupRecord;
  b: DupRecord;
  reasons: string[];
  source: string;
};

export type FieldRow = {
  f: string;
  a: string;
  b: string;
  match: "exact" | "similar" | "conflict";
  risk?: "low" | "medium" | "high";
};

// FIX 1 + FIX 2: local per-candidate resolution state
type CandLocalStatus =
  | { status: "merged";   masterId: string; mergeReason: string }
  | { status: "rejected"; rejectReason: string }
  | { status: "deferred" };

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

type DuplicateReviewMergeProps = {
  currentUser: CurrentUser;
  candidates?: DupCandidate[];
  onBack?: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Static sample data
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_CANDIDATES: DupCandidate[] = [
  {
    id: "DUP-2042", type: "Account", score: 0.87, status: "open",
    a: { id: "AC-3318", name: "Acme Manufacturing",  source: "Manual · 2021-03-14" },
    b: { id: "AC-4472", name: "ACME Mfg. Cleveland", source: "Import · IMP-0239 · 2026-05-15" },
    reasons: ["Similar company name", "Same website domain", "Same phone region", "Same import batch"],
    source: "IMP-0239",
  },
  {
    id: "DUP-2043", type: "Contact", score: 0.91, status: "open",
    a: { id: "CT-1001", name: "Taylor Brooks", source: "Manual · 2024-01-08" },
    b: { id: "CT-5521", name: "T. Brooks",      source: "Import · IMP-0240 · 2026-05-17" },
    reasons: ["Same email domain", "Same phone number", "Linked to Acme Manufacturing"],
    source: "IMP-0240",
  },
  {
    id: "DUP-2044", type: "Account", score: 0.78, status: "open",
    a: { id: "AC-3302", name: "Nordwerk Tooling AG", source: "Manual · 2022-08-11" },
    b: { id: "AC-4481", name: "Nordwerk Tools",      source: "Import · IMP-0239 · 2026-05-15" },
    reasons: ["Fuzzy name match", "Same domain"],
    source: "IMP-0239",
  },
  {
    id: "DUP-2045", type: "Contact", score: 0.74, status: "open",
    a: { id: "CT-1002", name: "Maya Chen", source: "Manual · 2024-03-20" },
    b: { id: "CT-5534", name: "M. Chen",   source: "Import · IMP-0240 · 2026-05-17" },
    reasons: ["Name initial match", "Same company"],
    source: "IMP-0240",
  },
  {
    id: "DUP-2046", type: "Account", score: 0.93, status: "open",
    a: { id: "AC-3198", name: "Vetra Logistics",    source: "Manual · 2023-06-05" },
    b: { id: "AC-4490", name: "Vetra Logistics OÜ", source: "Import · IMP-0239 · 2026-05-15" },
    reasons: ["Near-identical name", "Same VAT region", "Same domain"],
    source: "IMP-0239",
  },
  // FIX 4: manual-vs-manual candidate so "From Imports" is a proper subset of "All Open"
  {
    id: "DUP-2047", type: "Account", score: 0.69, status: "open",
    a: { id: "AC-2200", name: "Sigma Castings",      source: "Manual · 2020-11-03" },
    b: { id: "AC-2201", name: "Sigma Castings GmbH", source: "Manual · 2023-02-14" },
    reasons: ["Fuzzy name match", "Same address region"],
    source: "",
  },
];

const FIELDS_ACCOUNT: FieldRow[] = [
  { f: "Account name",   a: "Acme Manufacturing",          b: "ACME Mfg. Cleveland",      match: "conflict", risk: "low"    },
  { f: "Owner",          a: "Anna Petrova",                b: "— (unassigned)",            match: "conflict", risk: "medium" },
  { f: "Approval reqs",  a: "REQ-1182 · REQ-1175",         b: "—",                         match: "conflict", risk: "medium" },
  { f: "Open opps",      a: "4",                           b: "1",                         match: "conflict", risk: "low"    },
  { f: "Contacts",       a: "4",                           b: "1",                         match: "conflict", risk: "low"    },
  { f: "Activities",     a: "6",                           b: "0",                         match: "conflict", risk: "low"    },
  { f: "Created",        a: "2021-03-14",                  b: "2026-05-15",                match: "conflict", risk: "low"    },
  { f: "Created source", a: "Manual entry",                b: "Import IMP-0239",           match: "conflict", risk: "low"    },
  { f: "Website",        a: "acme-manufacturing.example",  b: "acme-mfg.example",          match: "similar",  risk: "low"    },
  { f: "Phone",          a: "+49 211 88 77 00",            b: "+49 211 88 92 00",          match: "similar",  risk: "low"    },
  { f: "Industry",       a: "Industrial Equipment",        b: "Industrial Equipment",      match: "exact"                   },
  { f: "Region",         a: "DACH-North",                  b: "DACH-North",                match: "exact"                   },
];

const FIELDS_CONTACT: FieldRow[] = [
  { f: "Influence",      a: "Decision Maker",                       b: "— (unmapped)",                  match: "conflict", risk: "medium" },
  { f: "Created",        a: "2024-01-08",                           b: "2026-05-17",                    match: "conflict", risk: "low"    },
  { f: "Created source", a: "Manual entry",                         b: "Import IMP-0240",               match: "conflict", risk: "low"    },
  { f: "Full name",      a: "Taylor Brooks",                        b: "T. Brooks",                     match: "similar",  risk: "low"    },
  { f: "Email",          a: "t.brooks@acme-manufacturing.example",  b: "t.brooks@acme-mfg.example",     match: "similar",  risk: "low"    },
  { f: "Title",          a: "VP Operations",                        b: "VP Ops",                        match: "similar",  risk: "low"    },
  { f: "Phone",          a: "+49 211 88 77 01",                     b: "+49 211 88 77 01",              match: "exact"                   },
  { f: "Account",        a: "Acme Manufacturing",                   b: "Acme Manufacturing",            match: "exact"                   },
];

const SCORE_BREAKDOWN: Record<"Account" | "Contact", { l: string; v: number }[]> = {
  Account: [
    { l: "Name similarity", v: 0.82 },
    { l: "Domain match",    v: 0.76 },
    { l: "Phone region",    v: 0.90 },
    { l: "Import source",   v: 0.95 },
  ],
  Contact: [
    { l: "Name similarity", v: 0.78 },
    { l: "Email domain",    v: 0.88 },
    { l: "Phone",           v: 0.97 },
    { l: "Company link",    v: 0.91 },
  ],
};

const IMPACT: Record<"Account" | "Contact", { label: string; v: number; code: string; tone: string }[]> = {
  Account: [
    { label: "Contacts reassigned to master",   v: 4, code: "CO", tone: "info"    },
    { label: "Opportunities reassigned",        v: 2, code: "OP", tone: "accent"  },
    { label: "Activities retained on master",   v: 6, code: "AC", tone: "neutral" },
    { label: "Approval requests preserved",     v: 1, code: "AP", tone: "warn"    },
    { label: "Reporting projections refreshed", v: 3, code: "RE", tone: "neutral" },
    { label: "Secondary record archived",       v: 1, code: "AR", tone: "neg"     },
  ],
  Contact: [
    { label: "Primary contact role reassigned", v: 1, code: "CO", tone: "info"    },
    { label: "Linked opportunities updated",    v: 2, code: "OP", tone: "accent"  },
    { label: "Activities retained on master",   v: 3, code: "AC", tone: "neutral" },
    { label: "Secondary record archived",       v: 1, code: "AR", tone: "neg"     },
  ],
};

const REASON_TEMPLATES = [
  "Same customer — manual entry and CSV import duplicate",
  "Confirmed by account owner — same legal entity",
  "Name abbreviation — same person, same company",
];

const QUEUE_FILTERS = ["All Open", "High Confidence", "Accounts", "Contacts", "From Imports", "Needs Review"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  return s >= 0.90 ? "var(--pos)" : s >= 0.80 ? "var(--accent-2)" : "var(--warn,#A36A11)";
}

function scoreLabel(s: number): string {
  return s >= 0.90 ? "High confidence" : s >= 0.80 ? "Medium confidence" : "Low confidence";
}

function riskColor(r?: string): string {
  if (r === "high")   return "var(--neg)";
  if (r === "medium") return "var(--accent-2)";
  return "var(--muted)";
}

function matchMeta(m: "exact" | "similar" | "conflict"): { icon: string; color: string } {
  if (m === "exact")   return { icon: "=", color: "var(--pos)"      };
  if (m === "similar") return { icon: "≈", color: "var(--accent-2)" };
  return                      { icon: "≠", color: "var(--neg)"      };
}

function effectiveDec(
  field: string,
  decisions: Record<string, "a" | "b">,
  master: "a" | "b"
): "a" | "b" {
  return decisions[field] ?? master;
}

function toneColor(tone: string): string {
  if (tone === "info")   return "var(--info,#2D5B6B)";
  if (tone === "accent") return "var(--accent-2)";
  if (tone === "warn")   return "var(--warn,#A36A11)";
  if (tone === "neg")    return "var(--neg)";
  if (tone === "pos")    return "var(--pos)";
  return "var(--muted)";
}

// FIX 4: all 6 filters have distinct, coherent logic
function matchesFilter(
  c: DupCandidate,
  filter: string,
  ls: Record<string, CandLocalStatus>
): boolean {
  const localStatus = ls[c.id];
  // Merged and rejected candidates leave all queue views immediately
  if (localStatus?.status === "merged" || localStatus?.status === "rejected") return false;
  const isDeferred = localStatus?.status === "deferred";
  const fromImport = c.a.source.includes("Import") || c.b.source.includes("Import");

  switch (filter) {
    case "All Open":        return true;                            // open + deferred
    case "High Confidence": return !isDeferred && c.score >= 0.85; // open high-conf only
    case "Accounts":        return c.type === "Account";            // type filter, any pending
    case "Contacts":        return c.type === "Contact";            // type filter, any pending
    case "From Imports":    return fromImport;                      // at least one import record
    case "Needs Review":    return c.score < 0.85 || isDeferred;   // borderline + previously skipped
    default:                return true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function DuplicateReviewMerge({
  currentUser,
  candidates: propCandidates,
  onBack,
}: DuplicateReviewMergeProps) {
  const candidates = propCandidates ?? SAMPLE_CANDIDATES;

  const [selectedId,     setSelectedId]     = useState(candidates[0]?.id ?? "");
  const [queueFilter,    setQueueFilter]    = useState<string>("All Open");
  const [master,         setMaster]         = useState<"a" | "b">("a");
  const [fieldDecisions, setFieldDecisions] = useState<Record<string, "a" | "b">>({});
  const [mergeReason,    setMergeReason]    = useState("");
  const [reasonTouched,  setReasonTouched]  = useState(false);
  // FIX 1 + FIX 2: replace bare `merged` boolean with per-candidate local state
  const [localStatuses,  setLocalStatuses]  = useState<Record<string, CandLocalStatus>>({});
  const [showReject,     setShowReject]     = useState(false);
  const [expandScore,    setExpandScore]    = useState(false);
  const [expandImpact,   setExpandImpact]   = useState(false);
  const [expandAudit,    setExpandAudit]    = useState(false);
  const [showExact,      setShowExact]      = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [toast,          setToast]          = useState<string | null>(null);

  const cand = candidates.find(c => c.id === selectedId) ?? candidates[0];

  // Derive resolved state for the current candidate
  const candLocalStatus = cand ? localStatuses[cand.id] : undefined;
  const isMerged   = candLocalStatus?.status === "merged";
  const isRejected = candLocalStatus?.status === "rejected";

  // Reset per-candidate interaction state when navigating to a new candidate
  useEffect(() => {
    setMaster("a");
    setFieldDecisions({});
    setMergeReason("");
    setReasonTouched(false);
    setExpandScore(false);
    setExpandImpact(false);
    setExpandAudit(false);
    setShowExact(false);
  }, [selectedId]);

  function handleMasterChange(m: "a" | "b") {
    setMaster(m);
    setFieldDecisions({});
  }

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(c => (c === msg ? null : c)), 2800);
  }

  // Advance to the next open/deferred candidate after resolving the current one
  function advanceToNext(
    excludeId: string,
    updatedStatuses: Record<string, CandLocalStatus>
  ) {
    const next = candidates.find(c => {
      if (c.id === excludeId) return false;
      const ls = updatedStatuses[c.id];
      return ls?.status !== "merged" && ls?.status !== "rejected";
    });
    if (next) {
      window.setTimeout(() => setSelectedId(next.id), 900);
    }
  }

  // FIX 2: merge updates local status + queue advances
  function handleMerge() {
    const sec = master === "a" ? "b" : "a";
    const updated: Record<string, CandLocalStatus> = {
      ...localStatuses,
      [cand.id]: { status: "merged", masterId: cand[master].id, mergeReason },
    };
    setLocalStatuses(updated);
    flash(`✓ ${cand.id} merged — ${cand[master].name} is master · ${cand[sec].name} archived`);
    advanceToNext(cand.id, updated);
  }

  // FIX 1 + FIX 2: reject stores reason in local state, queue removes candidate
  function handleRejectConfirm(reason: string) {
    const updated: Record<string, CandLocalStatus> = {
      ...localStatuses,
      [cand.id]: { status: "rejected", rejectReason: reason },
    };
    setLocalStatuses(updated);
    setShowReject(false);
    flash(`${cand.id} rejected as false positive · reason recorded`);
    advanceToNext(cand.id, updated);
  }

  // FIX 2: skip sets deferred status — candidate stays in queue under "Needs Review"
  function handleSkip() {
    const updated: Record<string, CandLocalStatus> = {
      ...localStatuses,
      [cand.id]: { status: "deferred" },
    };
    setLocalStatuses(updated);
    flash(`${cand.id} deferred — will appear under Needs Review`);
    advanceToNext(cand.id, updated);
  }

  const q = searchQuery.toLowerCase().trim();

  // FIX 2 + FIX 4: queue filter uses localStatuses + fixed filter logic
  const filteredQueue = candidates
    .filter(c => matchesFilter(c, queueFilter, localStatuses))
    .filter(c =>
      !q ||
      c.a.name.toLowerCase().includes(q) ||
      c.b.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );

  const allFields      = cand.type === "Account" ? FIELDS_ACCOUNT : FIELDS_CONTACT;
  const nonExactFields = allFields.filter(f => f.match !== "exact");
  const overriddenCount = nonExactFields.filter(f => f.f in fieldDecisions).length;
  const reasonValid    = mergeReason.trim().length >= 10;

  // FIX 2: KPI counts derive from localStatuses
  const resolvedMerged   = Object.values(localStatuses).filter(s => s.status === "merged").length;
  const resolvedRejected = Object.values(localStatuses).filter(s => s.status === "rejected").length;
  const openCount   = candidates.filter(c => {
    const ls = localStatuses[c.id];
    return ls?.status !== "merged" && ls?.status !== "rejected";
  }).length;
  const highConfCount = candidates.filter(c => {
    const ls = localStatuses[c.id];
    return c.score >= 0.85 && ls?.status !== "merged" && ls?.status !== "rejected";
  }).length;
  const acctPending = candidates.filter(c => {
    const ls = localStatuses[c.id];
    return c.type === "Account" && ls?.status !== "merged" && ls?.status !== "rejected";
  }).length;
  const contPending = candidates.filter(c => {
    const ls = localStatuses[c.id];
    return c.type === "Contact" && ls?.status !== "merged" && ls?.status !== "rejected";
  }).length;
  const mergesThisWeek  = 6 + resolvedMerged;
  const falsePositives  = 3 + resolvedRejected;

  return (
    <section className="rep-workspace drm-workspace">

      {/* Page head */}
      <div className="drm-page-head">
        <div className="drm-head-left">
          {onBack ? (
            <button className="drm-back-btn" type="button" onClick={onBack}>← Back</button>
          ) : null}
          <div className="drm-crumb">
            <span>Data &amp; Quality</span>
            <span className="sep">/</span>
            <strong>Duplicate Review</strong>
            {openCount > 0 ? (
              <span className="drm-live-chip">
                <span className="drm-pulse-dot" />
                <span className="mono">{openCount} open</span>
              </span>
            ) : null}
            {cand ? (
              <>
                <span className="sep">·</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{cand.id}</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="drm-head-right">
          <div className="drm-search">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" />
            </svg>
            <input
              placeholder="Search candidates, records…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button className="drm-search-clear" type="button" onClick={() => setSearchQuery("")}>✕</button>
            ) : null}
          </div>
        </div>
      </div>

      {/* KPI band — FIX 2: all counts now live */}
      <div className="drm-kpi-band">
        {([
          { label: "Open candidates",       value: String(openCount),       foot: `${acctPending} Account · ${contPending} Contact` },
          { label: "High confidence ≥0.85", value: String(highConfCount),   foot: "Review first" },
          { label: "Accounts pending",      value: String(acctPending),     foot: "3 from today's import" },
          { label: "Contacts pending",      value: String(contPending),     foot: "7 from contacts_legacy" },
          { label: "Merges this week",      value: String(mergesThisWeek),  foot: `${resolvedMerged} in this session` },
          { label: "False positives",       value: String(falsePositives),  foot: `${resolvedRejected} in this session` },
        ] as { label: string; value: string; foot: string }[]).map((k, i) => (
          <div key={i} className="drm-kpi-item">
            <div className="drm-kpi-l">{k.label}</div>
            <div className="drm-kpi-v mono">{k.value}</div>
            <div className="drm-kpi-foot">{k.foot}</div>
          </div>
        ))}
      </div>

      {/* Main 3-column grid */}
      <div className="drm-main-grid">

        {/* Left: candidate queue */}
        <CandidateQueue
          candidates={filteredQueue}
          selectedId={cand?.id ?? ""}
          onSelect={setSelectedId}
          activeFilter={queueFilter}
          onFilter={setQueueFilter}
          localStatuses={localStatuses}
        />

        {/* Center: comparison workspace */}
        {cand ? (
          <div className="drm-comparison">
            {/* FIX 3: pass flash so navigation buttons can surface constraint message */}
            <MatchBar
              cand={cand}
              expandScore={expandScore}
              onToggleScore={() => setExpandScore(v => !v)}
              onFlash={flash}
            />
            <FieldComparisonTable
              cand={cand}
              allFields={allFields}
              master={master}
              fieldDecisions={fieldDecisions}
              onDecide={(field, dec) => setFieldDecisions(prev => ({ ...prev, [field]: dec }))}
              showExact={showExact}
              onToggleExact={() => setShowExact(v => !v)}
              merged={isMerged}
            />
            <CollapsibleSection
              label={`Merge impact · ${cand.type}`}
              badge={`${IMPACT[cand.type].length} items`}
              expanded={expandImpact}
              onToggle={() => setExpandImpact(v => !v)}
            >
              <ImpactContent type={cand.type} />
            </CollapsibleSection>
            {/* FIX 1: AuditContent receives full localStatus so it shows reason */}
            <CollapsibleSection
              label="Audit timeline"
              badge={isMerged ? "post-merge" : isRejected ? "rejected" : "pre-merge"}
              expanded={expandAudit}
              onToggle={() => setExpandAudit(v => !v)}
            >
              <AuditContent cand={cand} localStatus={candLocalStatus} master={master} />
            </CollapsibleSection>
          </div>
        ) : (
          <div className="drm-empty-workspace">
            <div className="drm-empty-icon mono">DU</div>
            <div className="drm-empty-title">Queue resolved</div>
            <div>All candidates in this filter have been actioned.</div>
          </div>
        )}

        {/* Right: merge action panel */}
        {cand ? (
          <MergeActionPanel
            cand={cand}
            master={master}
            onMasterChange={handleMasterChange}
            nonExactFields={nonExactFields}
            overriddenCount={overriddenCount}
            mergeReason={mergeReason}
            onReasonChange={setMergeReason}
            reasonTouched={reasonTouched}
            onReasonBlur={() => setReasonTouched(true)}
            reasonValid={reasonValid}
            merged={isMerged}
            rejected={isRejected}
            localStatus={candLocalStatus}
            onMerge={handleMerge}
            onSkip={handleSkip}
            onReject={() => setShowReject(true)}
          />
        ) : null}
      </div>

      {/* Footer */}
      <div className="rep-foot-ruler">
        <span>SALES OPS CRM · {currentUser.tenantName.toUpperCase()} · LOCAL PILOT</span>
        <span>{currentUser.roleKey.toUpperCase()} · {currentUser.displayName}</span>
        <span>{openCount} CANDIDATES OPEN · DUPLICATE REVIEW</span>
      </div>

      {/* Reject modal — FIX 1: onConfirm now receives and stores reason */}
      {showReject && cand ? (
        <RejectModal
          cand={cand}
          onClose={() => setShowReject(false)}
          onConfirm={handleRejectConfirm}
        />
      ) : null}

      {toast ? <div className="rep-toast"><span className="ok">✓</span>{toast}</div> : null}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CandidateQueue
// ─────────────────────────────────────────────────────────────────────────────

function CandidateQueue({ candidates, selectedId, onSelect, activeFilter, onFilter, localStatuses }: {
  candidates: DupCandidate[];
  selectedId: string;
  onSelect: (id: string) => void;
  activeFilter: string;
  onFilter: (f: string) => void;
  localStatuses: Record<string, CandLocalStatus>;
}) {
  return (
    <div className="rep-panel drm-queue">
      <div className="rep-panel-head">
        <div className="rep-panel-title">Duplicate queue <em>{candidates.length}</em></div>
      </div>
      <div className="drm-queue-filter">
        {QUEUE_FILTERS.map(f => (
          <button
            key={f}
            type="button"
            className={`drm-filter-chip mono${activeFilter === f ? " on" : ""}`}
            onClick={() => onFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="drm-queue-list">
        {candidates.length === 0 ? (
          <div className="drm-queue-empty">No candidates match this filter</div>
        ) : candidates.map(c => {
          const sc          = scoreColor(c.score);
          const typeIsAcct  = c.type === "Account";
          // FIX 2: show deferred state in queue row
          const isDeferred  = localStatuses[c.id]?.status === "deferred";
          return (
            <div
              key={c.id}
              className={`drm-queue-row${selectedId === c.id ? " selected" : ""}${isDeferred ? " deferred" : ""}`}
              onClick={() => onSelect(c.id)}
            >
              <div className="drm-qrow-header">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="mono drm-qrow-id">{c.id}</span>
                  <span
                    className="drm-type-badge mono"
                    style={{
                      color:       typeIsAcct ? "var(--accent-2)" : "var(--info,#2D5B6B)",
                      background:  typeIsAcct ? "var(--accent-soft)" : "#DDE9ED",
                      borderColor: typeIsAcct ? "#D9BFA0" : "#A4C0C8",
                    }}
                  >
                    {c.type}
                  </span>
                  {isDeferred ? (
                    <span className="drm-deferred-tag mono">deferred</span>
                  ) : null}
                </div>
                <span className="mono drm-qrow-score" style={{ color: sc }}>{c.score.toFixed(2)}</span>
              </div>
              <div className="drm-qrow-names">
                <span className="drm-qrow-a">{c.a.name}</span>
                <span className="drm-qrow-sep">vs</span>
                <span className="drm-qrow-b">{c.b.name}</span>
              </div>
              <div className="drm-qrow-reasons">
                {c.reasons.slice(0, 2).map((r, i) => (
                  <span key={i} className="drm-reason-chip">{r}</span>
                ))}
                {c.reasons.length > 2 ? (
                  <span className="drm-reason-more">+{c.reasons.length - 2}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MatchBar — FIX 3: accepts onFlash, navigation buttons wired
// ─────────────────────────────────────────────────────────────────────────────

function MatchBar({ cand, expandScore, onToggleScore, onFlash }: {
  cand: DupCandidate;
  expandScore: boolean;
  onToggleScore: () => void;
  onFlash: (msg: string) => void;  // FIX 3
}) {
  const sc = scoreColor(cand.score);
  const sl = scoreLabel(cand.score);
  const breakdown = SCORE_BREAKDOWN[cand.type];
  const interp = cand.type === "Account"
    ? `Likely the same account — one created manually and one imported via CSV. Strong phone region and domain match. Recommend merge with ${cand.a.id} as master record.`
    : `Likely the same contact — imported with abbreviated name. Identical phone and same company. Recommend merge with ${cand.a.id} as master, preserving full name and influence classification.`;

  return (
    <div className="rep-panel drm-match-bar">
      <div className="drm-match-top">
        <div className="drm-score-badge" style={{ borderColor: sc }}>
          <span className="mono drm-score-num" style={{ color: sc }}>{cand.score.toFixed(2)}</span>
          <span className="drm-score-conf mono" style={{ color: sc }}>{sl}</span>
        </div>
        <div className="drm-interpretation">
          <div className="drm-interp-label mono">System interpretation</div>
          <div className="drm-interp-text">{interp}</div>
          <div className="drm-reasons-row">
            {cand.reasons.map((r, i) => (
              <span key={i} className="drm-reason-tag mono">{r}</span>
            ))}
          </div>
        </div>
        <div className="drm-match-actions">
          <button
            type="button"
            className="rep-btn rep-btn-ghost drm-expand-btn"
            onClick={onToggleScore}
          >
            {expandScore ? "▲" : "▼"} Score detail
          </button>
          {/* FIX 3: wired to flash with constraint message — no longer dead */}
          <button
            type="button"
            className="rep-btn rep-btn-ghost"
            style={{ fontSize: 11.5 }}
            onClick={() => onFlash(`Open ${cand.a.id} — record deep-link not wired in LOCAL PILOT · CONSTRAINT: implement /records/${cand.a.id}`)}
          >
            Open {cand.a.id} ›
          </button>
          <button
            type="button"
            className="rep-btn rep-btn-ghost"
            style={{ fontSize: 11.5 }}
            onClick={() => onFlash(`Open ${cand.b.id} — record deep-link not wired in LOCAL PILOT · CONSTRAINT: implement /records/${cand.b.id}`)}
          >
            Open {cand.b.id} ›
          </button>
          <button
            type="button"
            className="rep-btn rep-btn-ghost"
            style={{ fontSize: 11.5 }}
            onClick={() => onFlash(`Related opportunities for ${cand.id} — not wired in LOCAL PILOT · CONSTRAINT: implement related-records surface`)}
          >
            Related opps
          </button>
        </div>
      </div>
      {expandScore ? (
        <div className="drm-score-breakdown">
          {breakdown.map((row, i) => {
            const bc = row.v >= 0.85 ? "var(--pos)" : row.v >= 0.75 ? "var(--accent-2)" : "var(--warn,#A36A11)";
            return (
              <div key={i} className="drm-breakdown-row">
                <span className="drm-breakdown-label">{row.l}</span>
                <div className="drm-breakdown-track">
                  <div className="drm-breakdown-fill" style={{ width: `${row.v * 100}%`, background: bc }} />
                </div>
                <span className="mono drm-breakdown-val">{row.v.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FieldComparisonTable (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function FieldComparisonTable({ cand, allFields, master, fieldDecisions, onDecide, showExact, onToggleExact, merged }: {
  cand: DupCandidate;
  allFields: FieldRow[];
  master: "a" | "b";
  fieldDecisions: Record<string, "a" | "b">;
  onDecide: (field: string, dec: "a" | "b") => void;
  showExact: boolean;
  onToggleExact: () => void;
  merged: boolean;
}) {
  const conflictRows = allFields.filter(f => f.match === "conflict");
  const similarRows  = allFields.filter(f => f.match === "similar");
  const exactRows    = allFields.filter(f => f.match === "exact");

  function DecisionCell({ f }: { f: FieldRow }) {
    const dec = effectiveDec(f.f, fieldDecisions, master);
    if (merged) {
      return <span className="mono drm-decided">→ {dec === "a" ? cand.a.id : cand.b.id}</span>;
    }
    return (
      <div className="drm-decision-toggle">
        <button type="button" className={`drm-dt-btn${dec === "a" ? " on" : ""}`} onClick={() => onDecide(f.f, "a")} title={`Use ${cand.a.name}`}>{cand.a.id}</button>
        <button type="button" className={`drm-dt-btn${dec === "b" ? " on" : ""}`} onClick={() => onDecide(f.f, "b")} title={`Use ${cand.b.name}`}>{cand.b.id}</button>
      </div>
    );
  }

  function FieldRow_({ f, rowClass }: { f: FieldRow; rowClass: string }) {
    const mm  = matchMeta(f.match);
    const dec = effectiveDec(f.f, fieldDecisions, master);
    return (
      <tr className={rowClass}>
        <td className="drm-field-name">
          {f.f}
          {f.risk ? <span className="drm-risk-badge" style={{ color: riskColor(f.risk) }}>{f.risk}</span> : null}
        </td>
        <td className="drm-match-icon" title={f.match} style={{ color: mm.color }}>{mm.icon}</td>
        <td className={`drm-field-val${dec === "a" ? " surviving" : " receding"}`}>{f.a}</td>
        <td className={`drm-field-val${dec === "b" ? " surviving" : " receding"}`}>{f.b}</td>
        <td className="drm-decision-cell"><DecisionCell f={f} /></td>
      </tr>
    );
  }

  return (
    <div className="rep-panel drm-field-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">Field comparison</div>
        <div className="rep-panel-actions">
          <span className="drm-legend">
            <span style={{ color: "var(--pos)" }}>= same</span>
            <span className="drm-legend-sep">·</span>
            <span style={{ color: "var(--accent-2)" }}>≈ similar</span>
            <span className="drm-legend-sep">·</span>
            <span style={{ color: "var(--neg)" }}>≠ conflict</span>
          </span>
        </div>
      </div>
      <div className="rep-table-scroll">
        <table className="rep-table drm-cmp-table">
          <colgroup>
            <col style={{ width: 136 }} /><col style={{ width: 24 }} /><col /><col /><col style={{ width: 148 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Field</th><th></th>
              <th>
                <span className="drm-col-id">{cand.a.id}</span>
                <span className="drm-col-name">{cand.a.name}</span>
                {master === "a" ? <span className="drm-master-badge">MASTER</span> : null}
              </th>
              <th>
                <span className="drm-col-id">{cand.b.id}</span>
                <span className="drm-col-name">{cand.b.name}</span>
                {master === "b" ? <span className="drm-master-badge">MASTER</span> : null}
              </th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {conflictRows.length > 0 ? (
              <tr className="drm-section-row">
                <td colSpan={5}>Conflicts<span className="mono drm-section-count">{conflictRows.length}</span></td>
              </tr>
            ) : null}
            {conflictRows.map((f, i) => <FieldRow_ key={`cf-${i}`} f={f} rowClass="drm-conflict-row" />)}

            {similarRows.length > 0 ? (
              <tr className="drm-section-row">
                <td colSpan={5}>Similar values<span className="mono drm-section-count">{similarRows.length}</span><span className="drm-section-note">master wins by default</span></td>
              </tr>
            ) : null}
            {similarRows.map((f, i) => <FieldRow_ key={`sm-${i}`} f={f} rowClass="drm-similar-row" />)}

            {exactRows.length > 0 ? (
              <tr className="drm-section-row drm-exact-toggle-row">
                <td colSpan={5}>
                  <button type="button" className="drm-exact-toggle" onClick={onToggleExact}>
                    {showExact ? "▲" : "▼"} {exactRows.length} matching field{exactRows.length !== 1 ? "s" : ""} — no decision required
                  </button>
                </td>
              </tr>
            ) : null}
            {showExact ? exactRows.map((f, i) => (
              <tr key={`ex-${i}`} className="drm-exact-row">
                <td className="drm-field-name">{f.f}</td>
                <td className="drm-match-icon" style={{ color: "var(--pos)" }}>=</td>
                <td className="drm-field-val">{f.a}</td>
                <td className="drm-field-val" style={{ color: "var(--muted)" }}>— same</td>
                <td><span style={{ fontSize: 11, color: "var(--muted)" }}>—</span></td>
              </tr>
            )) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CollapsibleSection (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function CollapsibleSection({ label, badge, expanded, onToggle, children }: {
  label: string; badge?: string; expanded: boolean;
  onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rep-panel drm-collapsible">
      <button type="button" className="drm-collapsible-hd" onClick={onToggle}>
        <span className="drm-collapsible-label">{label}</span>
        {badge ? <span className="mono drm-collapsible-badge">{badge}</span> : null}
        <span className="drm-collapsible-chevron">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded ? <div className="drm-collapsible-body">{children}</div> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ImpactContent (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function ImpactContent({ type }: { type: "Account" | "Contact" }) {
  const items = IMPACT[type];
  return (
    <div className="drm-impact-list">
      {items.map((item, i) => (
        <div key={i} className="drm-impact-row">
          <span className="drm-impact-code mono">{item.code}</span>
          <span className="drm-impact-label">{item.label}</span>
          <span className="mono drm-impact-val" style={{ color: toneColor(item.tone) }}>{item.v}</span>
        </div>
      ))}
      <div className="drm-impact-note">
        <span className="mono" style={{ fontWeight: 700, fontSize: 10.5, color: "var(--info,#2D5B6B)", letterSpacing: ".04em", marginRight: 8 }}>NOTE</span>
        Changes are permanent and audited. Secondary record is archived, not deleted.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuditContent — FIX 1: accepts localStatus, surfaces rejectReason
// ─────────────────────────────────────────────────────────────────────────────

function AuditContent({ cand, localStatus, master }: {
  cand: DupCandidate;
  localStatus?: CandLocalStatus;
  master: "a" | "b";
}) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 16);

  type AuditEvent = { t: string; who: string; icon: string; c: string; desc: string };
  let events: AuditEvent[];

  if (localStatus?.status === "merged") {
    const truncReason = (localStatus.mergeReason ?? "").slice(0, 80);
    events = [
      { t: now,                  who: "I. Volkova", icon: "✓", c: "var(--pos)",          desc: `Merge committed — ${cand.id} · master ${localStatus.masterId} · secondary archived` },
      { t: now,                  who: "I. Volkova", icon: "R", c: "var(--info,#2D5B6B)", desc: `Reason recorded: "${truncReason}"` },
      { t: now,                  who: "System",     icon: "↺", c: "var(--info,#2D5B6B)", desc: "Reporting projections queued for refresh · 3 projections affected" },
      { t: "2026-05-17 08:12",   who: "System",     icon: "D", c: "var(--warn,#A36A11)", desc: `Duplicate candidate ${cand.id} generated · score ${cand.score.toFixed(2)} · sources manual + ${cand.source}` },
    ];
  } else if (localStatus?.status === "rejected") {
    // FIX 1: rejectReason is now carried and shown here
    const truncReason = (localStatus.rejectReason ?? "").slice(0, 100);
    events = [
      { t: now,                  who: "I. Volkova", icon: "✕", c: "var(--neg)",          desc: `Rejected as false positive — ${cand.id} · records remain separate` },
      { t: now,                  who: "I. Volkova", icon: "R", c: "var(--muted)",         desc: `Reason: "${truncReason}"` },
      { t: "2026-05-17 08:12",   who: "System",     icon: "D", c: "var(--warn,#A36A11)", desc: `Duplicate candidate ${cand.id} generated · score ${cand.score.toFixed(2)}` },
    ];
  } else if (localStatus?.status === "deferred") {
    events = [
      { t: now,                  who: "I. Volkova", icon: "→", c: "var(--muted)",         desc: `${cand.id} deferred — will appear under Needs Review for future resolution` },
      { t: "2026-05-17 08:12",   who: "System",     icon: "D", c: "var(--warn,#A36A11)", desc: `Duplicate candidate ${cand.id} generated · score ${cand.score.toFixed(2)} · sources manual + ${cand.source}` },
    ];
  } else {
    events = [
      { t: "2026-05-17 08:12",   who: "System",     icon: "D", c: "var(--warn,#A36A11)", desc: `Duplicate candidate ${cand.id} generated · score ${cand.score.toFixed(2)} · sources manual + ${cand.source}` },
      { t: "2026-05-17 07:50",   who: "I. Volkova", icon: "→", c: "var(--muted)",        desc: "Review queue opened · 24 candidates pending" },
    ];
  }

  return (
    <div className="drm-audit-list">
      {events.map((e, i) => (
        <div key={i} className="drm-audit-row">
          <div className="mono drm-audit-time">
            {e.t.slice(11)}
            <div style={{ fontSize: 10, color: "var(--muted-2)" }}>{e.t.slice(0, 10)}</div>
          </div>
          <div className="drm-audit-icon" style={{ color: e.c }}>{e.icon}</div>
          <div>
            <div className="drm-audit-desc">{e.desc}</div>
            <div className="mono drm-audit-by">by {e.who}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MergeActionPanel — FIX 2: handles rejected state display
// ─────────────────────────────────────────────────────────────────────────────

function MergeActionPanel({
  cand, master, onMasterChange, nonExactFields, overriddenCount,
  mergeReason, onReasonChange, reasonTouched, onReasonBlur,
  reasonValid, merged, rejected, localStatus, onMerge, onSkip, onReject,
}: {
  cand: DupCandidate;
  master: "a" | "b";
  onMasterChange: (m: "a" | "b") => void;
  nonExactFields: FieldRow[];
  overriddenCount: number;
  mergeReason: string;
  onReasonChange: (v: string) => void;
  reasonTouched: boolean;
  onReasonBlur: () => void;
  reasonValid: boolean;
  merged: boolean;
  rejected: boolean;
  localStatus?: CandLocalStatus;
  onMerge: () => void;
  onSkip: () => void;
  onReject: () => void;
}) {
  const reasonErr = reasonTouched && !reasonValid;

  if (merged && localStatus?.status === "merged") {
    return (
      <div className="rep-panel drm-action-panel">
        <div className="drm-merge-complete">
          <span className="drm-complete-icon">✓</span>
          <div>
            <div className="drm-complete-title">Merge completed</div>
            <div className="drm-complete-id mono">{cand.id} resolved</div>
            <div className="drm-complete-detail">
              {cand[master].name} ({cand[master].id}) is the master record.
              {" "}{cand[master === "a" ? "b" : "a"].name} archived.
            </div>
            <div className="mono drm-complete-note">
              Decision immutable · audit trail updated · reporting refresh queued
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FIX 2: show rejected state clearly in action panel
  if (rejected && localStatus?.status === "rejected") {
    return (
      <div className="rep-panel drm-action-panel">
        <div className="drm-merge-complete" style={{ background: "var(--info-soft,#D6E1E4)", borderBottom: "1px solid #A4C0C8" }}>
          <span className="drm-complete-icon" style={{ color: "var(--info,#2D5B6B)" }}>✕</span>
          <div>
            <div className="drm-complete-title" style={{ color: "var(--info,#2D5B6B)" }}>Rejected as false positive</div>
            <div className="drm-complete-id mono">{cand.id} resolved</div>
            <div className="drm-complete-detail">{cand.a.name} and {cand.b.name} confirmed as separate records.</div>
            <div className="drm-complete-detail" style={{ marginTop: 4, fontStyle: "italic", color: "var(--muted)" }}>
              "{localStatus.rejectReason}"
            </div>
            <div className="mono drm-complete-note">Reason logged · records remain separate · audit trail updated</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rep-panel drm-action-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">Merge decision</div>
      </div>

      <div className="drm-action-section">
        <div className="drm-action-label">Master record</div>
        <div className="drm-master-options">
          {(["a", "b"] as const).map(side => {
            const rec      = cand[side];
            const selected = master === side;
            return (
              <label key={side} className={`drm-master-opt${selected ? " selected" : ""}`}>
                <input type="radio" name={`master-${cand.id}`} checked={selected} onChange={() => onMasterChange(side)} style={{ accentColor: "var(--pos)" }} />
                <div className="drm-master-opt-body">
                  <div className="drm-master-name">{rec.name}</div>
                  <div className="mono drm-master-id">{rec.id}</div>
                  <div className="drm-master-src">{rec.source}</div>
                  {side === "a" && selected ? (
                    <div className="drm-master-rec">✓ Recommended — more linked records</div>
                  ) : side === "b" && selected ? (
                    <div className="drm-master-warn">⚠ Fewer linked records</div>
                  ) : null}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {nonExactFields.length > 0 ? (
        <div className="drm-action-section">
          <div className="drm-action-label">Field overrides</div>
          <div className="drm-override-status">
            <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: overriddenCount > 0 ? "var(--ink)" : "var(--muted)" }}>{overriddenCount}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>of {nonExactFields.length} overridden · master wins remaining</span>
          </div>
        </div>
      ) : null}

      <div className="drm-action-section">
        <div className="drm-action-label-row">
          <span className="drm-action-label">
            Merge reason
            <span style={{ color: "var(--accent-2)", fontFamily: "ui-monospace,monospace", fontSize: 10, marginLeft: 3 }}>*</span>
          </span>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{mergeReason.length} · min 10</span>
        </div>
        <div className={`drm-reason-wrap${reasonErr ? " err" : ""}`}>
          <textarea
            className="drm-reason-textarea"
            value={mergeReason}
            onChange={e => onReasonChange(e.target.value)}
            onBlur={onReasonBlur}
            placeholder="e.g. Same customer account — created manually then imported via CSV"
          />
        </div>
        {reasonErr ? (
          <div className="drm-reason-error">Reason required (min 10 chars) — merge decisions are audit-logged.</div>
        ) : null}
        <div className="drm-reason-templates">
          {REASON_TEMPLATES.map((t, i) => (
            <span key={i} className="drm-template-chip" onClick={() => onReasonChange(mergeReason ? `${mergeReason} · ${t}` : t)}>
              + {t}
            </span>
          ))}
        </div>
      </div>

      <div className="drm-action-footer">
        <button
          type="button"
          className={`drm-merge-cta${reasonValid ? " active" : " disabled"}`}
          onClick={() => { if (reasonValid) onMerge(); else onReasonBlur(); }}
        >
          Merge records →
        </button>
        <div className="drm-defer-actions">
          <button type="button" className="rep-btn rep-btn-ghost" style={{ fontSize: 11.5 }} onClick={onReject}>
            Reject as false positive
          </button>
          <button type="button" className="rep-btn rep-btn-ghost" style={{ fontSize: 11.5 }} onClick={onSkip}>
            Skip →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RejectModal (unchanged — already passes reason to onConfirm)
// ─────────────────────────────────────────────────────────────────────────────

function RejectModal({ cand, onClose, onConfirm }: {
  cand: DupCandidate;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason,  setReason]  = useState("");
  const [touched, setTouched] = useState(false);
  const valid = reason.trim().length >= 5;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div className="drm-scrim" onClick={onClose} />
      <div className="drm-modal-shell" role="dialog" aria-modal="true">
        <div className="drm-modal-card">
          <div className="drm-modal-head">
            <div className="drm-modal-title">Reject as false positive</div>
            <div className="drm-modal-sub">{cand.id} · {cand.a.name} vs {cand.b.name}</div>
          </div>
          <div className="drm-modal-body">
            <div className="drm-modal-notice">
              Rejecting this candidate marks it as a false positive. Both records remain separate.
              This decision is audit-logged and reviewable in the audit trail.
            </div>
            <div>
              <div className="drm-action-label" style={{ marginBottom: 5 }}>
                Reason
                <span style={{ color: "var(--accent-2)", fontFamily: "ui-monospace,monospace", fontSize: 10, marginLeft: 3 }}>*</span>
              </div>
              <div className={`drm-reason-wrap${touched && !valid ? " err" : ""}`}>
                <textarea
                  className="drm-reason-textarea"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="e.g. Verified with account owner — different legal entities in different cities"
                />
              </div>
              {touched && !valid ? (
                <div className="drm-reason-error">Reason required for audit trail</div>
              ) : null}
            </div>
          </div>
          <div className="drm-modal-foot">
            <button type="button" className="rep-btn rep-btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="rep-btn"
              style={{ background: "var(--info,#2D5B6B)", color: "var(--white,#FBFAF6)", borderColor: "var(--info,#2D5B6B)" }}
              onClick={() => { setTouched(true); if (valid) onConfirm(reason); }}
            >
              Confirm false positive
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
