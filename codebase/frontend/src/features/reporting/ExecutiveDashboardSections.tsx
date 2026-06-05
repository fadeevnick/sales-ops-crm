import { useState } from "react";
import {
  ApprPill,
  KpiTile,
  QUEUE_DRILL_KEY,
  StagePip,
  approvalPillState,
  fmtMoney,
  nextScheduled,
  riskColor,
  type ApprovalQueue,
  type ClosedQtd,
  type DrillOpportunity,
  type ExceptionType,
  type PipelineStage,
  type ProjectionHealth,
} from "./ExecutiveDashboardShared";

export function PipelineFunnel({
  stages,
  closedQtd,
  drillKey,
  onDrill,
  periodLabel,
}: {
  stages: PipelineStage[];
  closedQtd: ClosedQtd;
  drillKey: string;
  onDrill: (key: string) => void;
  periodLabel: string;
}) {
  const openTotal = stages.reduce((s, st) => s + st.value, 0);
  const weighted = openTotal * 0.365;
  const openCount = stages.reduce((s, st) => s + st.count, 0);

  return (
    <div className="rep-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">Pipeline by stage<em>{openCount} open</em></div>
        <div className="rep-panel-actions">
          <span className="exe-context-label">ALL TEAMS</span>
          <span className="exe-context-label">{periodLabel}</span>
          <button className="rep-btn rep-btn-ghost exe-link-btn" type="button" onClick={() => onDrill("pipeline")}>
            All opportunities ›
          </button>
        </div>
      </div>

      <div>
        <div className="exe-funnel-col-hd">
          <div className="exe-fhd">Stage</div>
          <div className="exe-fhd">Distribution</div>
          <div className="exe-fhd exe-fhd--num">Deals</div>
          <div className="exe-fhd exe-fhd--num">Value</div>
        </div>

        {stages.map((s) => {
          const key = `stage${s.code}`;
          const active = drillKey === key;
          return (
            <div
              key={s.code}
              className={["exe-funnel-row", active ? "exe-funnel-row--active" : ""].filter(Boolean).join(" ")}
              onClick={() => onDrill(key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDrill(key); } }}
              aria-pressed={active}
            >
              <div className="exe-funnel-stage">
                <span className="exe-funnel-code mono">{s.code}</span>
                <div className="exe-funnel-stage-name">
                  <span>{s.stage}</span>
                  {s.stuck > 0 ? <span className="exe-stuck-badge">{s.stuck} stuck</span> : null}
                </div>
              </div>
              <div className="exe-bar-track">
                <div className="exe-bar-fill" style={{ width: `${s.pct}%`, background: s.warn ? "var(--warn)" : "var(--ink)" }} />
              </div>
              <div className="exe-funnel-num mono">{s.count}</div>
              <div className="exe-funnel-num mono">{fmtMoney(s.value)}</div>
            </div>
          );
        })}

        {/* Closed Won QTD has no backing data in the current API — only render it
            when a real figure exists, so it isn't a permanent fake $0 row. */}
        {closedQtd.count > 0 || closedQtd.value > 0 ? (
          <div
            className={["exe-funnel-row", "exe-funnel-row--won", drillKey === "stageW" ? "exe-funnel-row--active" : ""].filter(Boolean).join(" ")}
            onClick={() => onDrill("stageW")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDrill("stageW"); } }}
            aria-pressed={drillKey === "stageW"}
          >
            <div className="exe-funnel-stage" style={{ color: "var(--pos)" }}>
              <span className="exe-funnel-code mono">W</span>
              <span>Closed Won QTD</span>
            </div>
            <div className="exe-bar-track">
              <div className="exe-bar-fill" style={{ width: `${closedQtd.pctOfMax}%`, background: "var(--pos)" }} />
            </div>
            <div className="exe-funnel-num mono" style={{ color: "var(--pos)" }}>{closedQtd.count}</div>
            <div className="exe-funnel-num mono" style={{ color: "var(--pos)" }}>{fmtMoney(closedQtd.value)}</div>
          </div>
        ) : null}
      </div>

      <div className="exe-funnel-foot">
        <span>Open: <strong className="mono">{fmtMoney(openTotal)}</strong></span>
        <span>Weighted: <strong className="mono" style={{ color: "var(--accent-2)" }}>{fmtMoney(weighted)}</strong></span>
      </div>
    </div>
  );
}

export function ApprovalPanel({
  queues,
  exceptionTypes,
  drillKey,
  onDrill,
  onOpenApprovals,
}: {
  queues: ApprovalQueue[];
  exceptionTypes: ExceptionType[];
  drillKey: string;
  onDrill: (key: string) => void;
  onOpenApprovals?: () => void;
}) {
  const [exceptOpen, setExceptOpen] = useState(false);
  const totalPending = queues.reduce((s, q) => s + q.pending, 0);
  const totalOverdue = queues.reduce((s, q) => s + q.overdue, 0);
  const exceptTotal = exceptionTypes.reduce((s, t) => s + t.count, 0);

  return (
    <div className="rep-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">Approval queues<em>{totalPending} pending</em></div>
        <div className="rep-panel-actions">
          {onOpenApprovals ? (
            <button className="rep-btn rep-btn-ghost exe-link-btn" type="button" onClick={onOpenApprovals}>Approvals ›</button>
          ) : (
            <span className="exe-panel-link-label">Approvals</span>
          )}
        </div>
      </div>

      {queues.map((q, i) => {
        const key = QUEUE_DRILL_KEY[q.dept] ?? "approvals";
        const active = drillKey === key;
        return (
          <div
            key={q.dept}
            className={["exe-appr-row", active ? "exe-appr-row--active" : "", q.bottleneck ? "exe-appr-row--bottleneck" : ""].filter(Boolean).join(" ")}
            style={i < queues.length - 1 ? { borderBottom: "1px solid var(--hairline)" } : undefined}
            onClick={() => onDrill(key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDrill(key); } }}
            aria-pressed={active}
          >
            <span className={`role-badge ${q.badgeCls}`}>{q.abbr}</span>
            <div className="exe-appr-meta">
              <div className="exe-appr-dept">
                {q.dept}
                {q.bottleneck ? <span className="exe-bottleneck-badge">BOTTLENECK</span> : null}
              </div>
              {/* avg turnaround isn't in the API (always "n/a") — only show it when real. */}
              <div className="exe-appr-sla">SLA {q.sla}{q.avgH && q.avgH !== "n/a" ? ` · avg ${q.avgH}` : ""}</div>
            </div>
            <div className="exe-appr-counts">
              <span className="exe-appr-pending mono">{q.pending}</span>
              {q.overdue > 0 ? <span className="exe-overdue-badge">{q.overdue} OD</span> : <span className="exe-ontime-badge">ON TIME</span>}
            </div>
          </div>
        );
      })}

      <div className="exe-appr-foot">
        <span>Total: <strong className="mono">{totalPending}</strong></span>
        {totalOverdue > 0 ? (
          <span style={{ color: "var(--neg)", fontWeight: 600 }}>▲ {totalOverdue} past SLA</span>
        ) : (
          <span style={{ color: "var(--muted)" }}>None past SLA</span>
        )}
      </div>

      {exceptionTypes.length > 0 ? (
        <div style={{ borderTop: "1px solid var(--hairline)" }}>
          <button className="exe-accordion-hd" type="button" onClick={() => setExceptOpen((o) => !o)} aria-expanded={exceptOpen}>
            <span className="exe-accordion-label">Exception types</span>
            <em className="exe-accordion-count mono">{exceptTotal}</em>
            <span className="exe-accordion-chev" aria-hidden="true">{exceptOpen ? "▲" : "▼"}</span>
          </button>

          {exceptOpen ? (
            <div className="exe-accordion-body">
              {exceptionTypes.map((t, i) => (
                <div key={t.type} className="exe-except-row" style={i < exceptionTypes.length - 1 ? { borderBottom: "1px solid var(--hairline)" } : undefined}>
                  <div className="exe-except-copy">
                    <div className="exe-except-type">{t.type}</div>
                    <div className="exe-except-detail">{t.count} req · {fmtMoney(t.value)} · {t.detail}</div>
                  </div>
                  <span className="exe-except-n mono">{t.count}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectionHealthAccordion({
  health,
  lastRefresh,
}: {
  health: ProjectionHealth;
  lastRefresh: string;
}) {
  const [open, setOpen] = useState(false);
  const hasPending = health.pendingImports > 0 || health.pendingMerges > 0;

  const rows: Array<{ label: string; value: string; warn: boolean }> = [
    { label: "Last refresh", value: lastRefresh, warn: false },
    { label: "Refresh duration", value: health.refreshDuration, warn: false },
    { label: "Source events included", value: health.sourceEvents, warn: false },
    { label: "Pending imports", value: String(health.pendingImports), warn: health.pendingImports > 0 },
    { label: "Pending merge refresh", value: String(health.pendingMerges), warn: health.pendingMerges > 0 },
    { label: "Next scheduled", value: nextScheduled(lastRefresh), warn: false },
  ];

  return (
    <div className="rep-panel exe-proj-accordion">
      <button className="exe-accordion-hd exe-proj-hd" type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="exe-accordion-label">Data freshness</span>
        <span className="exe-proj-meta mono">
          Last: {lastRefresh}
          {hasPending ? <span className="exe-proj-warn-flag"> · {health.pendingImports + health.pendingMerges} pending</span> : null}
        </span>
        <span className="exe-accordion-chev" aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="exe-accordion-body">
          {rows.map((r, i) => (
            <div key={r.label} className="exe-proj-row" style={i < rows.length - 1 ? { borderBottom: "1px solid var(--hairline)" } : undefined}>
              <span className="exe-proj-lbl">{r.label}</span>
              <span className="mono exe-proj-val" style={r.warn ? { color: "var(--accent-2)", fontWeight: 600 } : undefined}>{r.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DrillTable({
  rows,
  drillLabel,
  emptyNote,
  onOpenOpportunity,
}: {
  rows: DrillOpportunity[];
  drillLabel: string;
  emptyNote?: string;
  onOpenOpportunity: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rep-panel">
        <div className="rep-panel-head">
          <div className="rep-panel-title">Drill-down <em>0 results</em></div>
          <div className="rep-panel-actions">
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{drillLabel}</span>
          </div>
        </div>
        <div className="exe-empty">
          <div className="exe-empty-icon mono">∅</div>
          <div className="exe-empty-title">No records match this filter</div>
          <div className="exe-empty-sub">{emptyNote ?? "The selected view returned no permitted drill-down records. Try a different metric, stage, or queue."}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rep-panel">
      <div className="rep-panel-head">
        <div className="rep-panel-title">Drill-down<em>{rows.length} result{rows.length !== 1 ? "s" : ""}</em></div>
        <div className="rep-panel-actions">
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{drillLabel}</span>
        </div>
      </div>
      <div className="rep-table-scroll">
        <table className="rep-table exe-drill-table">
          <colgroup>
            <col style={{ width: "17%" }} /><col style={{ width: "13%" }} />
            <col style={{ width: "8%" }} /><col style={{ width: "9%" }} />
            <col style={{ width: "5%" }} /><col style={{ width: "7%" }} />
            <col style={{ width: "8%" }} /><col style={{ width: "11%" }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>Opportunity</th><th>Account</th><th>Owner</th><th>Team</th>
              <th>Stage</th><th className="num">Amount</th><th>Close</th>
              <th>Approval</th><th>Risk Signal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} style={{ cursor: "pointer" }} onClick={() => onOpenOpportunity(o.id)} title="Open opportunity">
                <td><div className="rep-cell-truncate" style={{ fontWeight: 500 }}>{o.title}</div></td>
                <td className="rep-cell-truncate">{o.account}</td>
                <td style={{ fontSize: 12 }}>{o.owner}</td>
                <td style={{ fontSize: 11.5, color: "var(--muted)" }}>{o.team}</td>
                <td style={{ textAlign: "center" }}><StagePip idx={o.stageIdx} /></td>
                <td className="num"><span className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{fmtMoney(o.amount)}</span></td>
                <td><span className="mono" style={{ fontSize: 12 }}>{o.close}</span></td>
                <td><ApprPill status={o.approvalStatus} label={o.approvalLabel} /></td>
                <td><span className="mono exe-risk-label" style={{ color: riskColor(o.riskSev) }}>{o.riskLabel || "—"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

