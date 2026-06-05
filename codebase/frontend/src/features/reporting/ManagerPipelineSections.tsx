import { useState } from "react";
import { useModalChrome } from "../../hooks/useModalChrome";
import {
  NOTE_TEMPLATES,
  type ManagerActionKind,
  type PipelineOpportunity,
  type TeamMember,
  RiskTag,
  StagePip,
  approvalPillState,
  fmtDate,
  fmtMoney,
  riskMeta,
} from "./ManagerPipelineShared";

export function PipelineTable({
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
              {rows.map((o) => {
                const member = teamMembers.find((t) => t.id === o.ownerId);
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
                    </td>
                    <td>
                      <div className="rep-cell-truncate">{o.accountName}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {member?.initials ? (
                          <div className={`pipe-avatar${member.colorKey ? ` ${member.colorKey}` : ""}`}>{member.initials}</div>
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
                    <td className="num"><span className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{fmtMoney(o.expectedAmount)}</span></td>
                    <td><span className="mono" style={{ fontSize: 11.5 }}>{fmtDate(o.closeDate)}</span></td>
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
                    <td><div className="rep-cell-truncate" style={{ fontSize: 12 }}>{o.nextActivityNote ?? "—"}</div></td>
                    <td><RiskTag riskKey={o.riskKey} riskLabel={o.riskLabel} /></td>
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

export function OppPreviewPanel({
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
      { label: "Overdue approval", count: allOpps.filter((o) => o.approvalState === "overdue").length, color: "var(--neg)" },
      { label: "SLA at risk", count: allOpps.filter((o) => o.riskKey === "sla").length, color: "var(--accent-2)" },
      { label: "Stuck > 14 days", count: allOpps.filter((o) => o.riskKey === "stuck").length, color: "var(--accent-2)" },
      { label: "No next step", count: allOpps.filter((o) => o.riskKey === "nonext").length, color: "var(--muted)" },
    ];
    return (
      <div className="rep-panel pipe-preview">
        <div className="rep-panel-head"><div className="rep-panel-title">Opportunity detail</div></div>
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
              <span className="mono" style={{ color: r.count > 0 ? r.color : "var(--muted)", fontWeight: r.count > 0 ? 700 : 400 }}>
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
      <div className="pipe-pv-head">
        <div className="pipe-pv-id-row">
          {opp.approvalState && opp.approvalState !== "none" ? (
            <span className={`rep-pill p-${approvalPillState(opp.approvalState)}`}>
              <span className="dot" />
              {opp.approvalLabel ?? opp.approvalState}
            </span>
          ) : (
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>No approval</span>
          )}
        </div>
        <div className="pipe-pv-title">{opp.title}</div>
        <div className="pipe-pv-account">{opp.accountName}{opp.primaryContact ? ` · ${opp.primaryContact}` : ""}</div>
        {rm ? <div className="pipe-pv-risk-alert" style={{ color: rm.color, background: rm.bg, borderColor: rm.border }}>⚠ {opp.riskLabel}</div> : null}
      </div>

      <div className="pipe-pv-fields">
        {([
          ["Amount", fmtMoney(opp.expectedAmount), true],
          ["Close", fmtDate(opp.closeDate), true],
          ["Stage", opp.stageLabel ?? opp.stageKey, false],
          ["Owner", opp.ownerName, false],
        ] as [string, string, boolean][]).map(([l, v, isMono], i) => (
          <div key={i} className="pipe-pv-field">
            <div className="pipe-pv-fl">{l}</div>
            <div className={`pipe-pv-fv${isMono ? " mono" : ""}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="pipe-pv-section">
        <div className="pipe-pv-section-l">Next step</div>
        <div className="pipe-pv-section-v">{opp.nextActivityNote ?? "—"}</div>
      </div>

      {opp.approvalRequestId ? (
        <div className="pipe-pv-section pipe-pv-section-appr">
          <div className="pipe-pv-section-l">
            Linked approval
            <span className="pipe-pv-appr-caveat">Monitor only — cannot decide Finance / Legal</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
            <span className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{opp.approvalRequestId}</span>
            {onOpenApproval ? (
              <button className="rep-btn rep-btn-ghost" style={{ fontSize: 11, padding: "3px 8px" }} type="button" onClick={() => onOpenApproval(opp.approvalRequestId!)}>
                View ›
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {opp.managerNotes ? (
        <div className="pipe-pv-section">
          <div className="pipe-pv-section-l">Manager context</div>
          <div className="pipe-pv-notes">{opp.managerNotes}</div>
        </div>
      ) : null}

      <div className="pipe-pv-actions">
        <div className="pipe-pv-section-l" style={{ marginBottom: 8 }}>Manager actions</div>
        <button className="rep-btn rep-btn-primary" type="button" style={{ justifyContent: "center" }} onClick={() => onManagerAction("reassign", opp)}>→ Reassign owner</button>
        <button className="rep-btn" type="button" style={{ justifyContent: "center" }} onClick={() => onManagerAction("note", opp)}>✎ Add manager note</button>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="rep-btn" type="button" style={{ flex: 1, justifyContent: "center" }} onClick={() => onManagerAction("update", opp)}>↻ Request update</button>
          <button className="rep-btn rep-btn-ghost" type="button" style={{ flex: 1, justifyContent: "center" }} onClick={() => onManagerAction("detail", opp)}>Open detail ›</button>
        </div>
      </div>
    </div>
  );
}

export function TeamSummary({ teamMembers }: { teamMembers: TeamMember[]; opportunities: PipelineOpportunity[] }) {
  const totals = teamMembers.reduce(
    (acc, t) => ({
      opps: acc.opps + (t.openOppsCount ?? 0),
      pipeline: acc.pipeline + (t.pipelineTotal ?? 0),
      weighted: acc.weighted + (t.weightedPipeline ?? 0),
      appr: acc.appr + (t.pendingApprovals ?? 0),
      overdue: acc.overdue + (t.overdueActivities ?? 0),
      closing: acc.closing + (t.closingThisMonth ?? 0),
    }),
    { opps: 0, pipeline: 0, weighted: 0, appr: 0, overdue: 0, closing: 0 },
  );

  return (
    <div className="rep-panel pipe-team-summary">
      <div className="rep-panel-head">
        <div className="rep-panel-title">Team breakdown<em>{teamMembers.length} reps</em></div>
        <div className="rep-panel-actions">
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>Total {fmtMoney(totals.pipeline)} · weighted {fmtMoney(totals.weighted)}</span>
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
            {teamMembers.map((t) => (
              <tr key={t.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    {t.initials ? <div className={`pipe-avatar${t.colorKey ? ` ${t.colorKey}` : ""}`} style={{ flexShrink: 0 }}>{t.initials}</div> : null}
                    <span style={{ fontWeight: 500, fontSize: 12.5 }}>{t.displayName}</span>
                  </div>
                </td>
                <td className="num mono">{t.openOppsCount ?? "—"}</td>
                <td className="num mono">{fmtMoney(t.pipelineTotal)}</td>
                <td className="num mono">{fmtMoney(t.weightedPipeline)}</td>
                <td className="num">
                  <span className="mono" style={{ color: (t.pendingApprovals ?? 0) > 2 ? "var(--accent-2)" : "inherit", fontWeight: (t.pendingApprovals ?? 0) > 2 ? 700 : 400 }}>
                    {t.pendingApprovals ?? "—"}
                  </span>
                </td>
                <td className="num">
                  <span className="mono" style={{ color: (t.overdueActivities ?? 0) >= 4 ? "var(--neg)" : (t.overdueActivities ?? 0) >= 2 ? "var(--accent-2)" : "inherit", fontWeight: (t.overdueActivities ?? 0) >= 2 ? 700 : 400 }}>
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

export function ReassignModal({
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
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const ownerErr = touched && !newOwnerId;

  useModalChrome(onClose);

  function save() {
    setTouched(true);
    if (!newOwnerId) return;
    const member = teamMembers.find((t) => t.id === newOwnerId);
    onSave(newOwnerId, member?.displayName ?? newOwnerId, reason);
  }

  return (
    <>
      <div className="rep-scrim" onClick={onClose} />
      <div className="rep-modal" role="dialog" aria-label="Reassign owner">
        <div className="rep-modal-card" style={{ width: 500 }}>
          <div className="head"><h3>Reassign owner</h3><p>{opp.title} · currently {opp.ownerName}</p></div>
          <div className="body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div className="pipe-modal-lbl">New owner <span className="pipe-modal-required">*</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 5 }}>
                {teamMembers.filter((t) => t.id !== opp.ownerId).map((t) => (
                  <label key={t.id} className={`pipe-owner-option${newOwnerId === t.id ? " selected" : ""}`}>
                    <input type="radio" name="reassign-owner" value={t.id} checked={newOwnerId === t.id} onChange={() => setNewOwnerId(t.id)} style={{ accentColor: "var(--accent-2)" }} />
                    {t.initials ? <div className={`pipe-avatar${t.colorKey ? ` ${t.colorKey}` : ""}`}>{t.initials}</div> : null}
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{t.displayName}</div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{t.openOppsCount ?? "?"} open opps · {fmtMoney(t.pipelineTotal)} pipeline</div>
                    </div>
                  </label>
                ))}
              </div>
              {ownerErr ? <div className="pipe-modal-err">Select a new owner to continue</div> : null}
            </div>
            <div>
              <div className="pipe-modal-lbl">Reason / note <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span></div>
              <div className="pipe-modal-textarea" style={{ marginTop: 5 }}>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Anna at capacity · Jonas has DACH-North relationship" />
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

export function ManagerNoteModal({
  opp,
  onClose,
  onSave,
}: {
  opp: PipelineOpportunity;
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  useModalChrome(onClose);

  return (
    <>
      <div className="rep-scrim" onClick={onClose} />
      <div className="rep-modal" role="dialog" aria-label="Add manager note">
        <div className="rep-modal-card" style={{ width: 480 }}>
          <div className="head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div><h3>Add manager note</h3><p>{opp.title}</p></div>
            <button className="rep-btn rep-btn-ghost" type="button" onClick={onClose} style={{ fontSize: 14, padding: "3px 8px" }}>✕</button>
          </div>
          <div className="body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div className="pipe-modal-lbl">Note<span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 5 }}> · visible to manager and above only</span></div>
              <div className="pipe-modal-textarea" style={{ marginTop: 5 }}>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Discussed with rep — customer has given EOD deadline. Escalating to Finance today." />
              </div>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {NOTE_TEMPLATES.map((t, i) => (
                <button key={i} type="button" className="pipe-note-chip" onClick={() => setNote((n) => n ? `${n} · ${t}` : t)}>
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
