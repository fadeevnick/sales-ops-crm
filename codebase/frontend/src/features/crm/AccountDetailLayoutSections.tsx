import {
  type AccountActivity,
  type AccountAuditEvent,
  type AccountOpportunity,
  type AccountRecord,
  StagePip,
  auditDotIcon,
  fmtDate,
  fmtMoney,
} from "./AccountDetailShared";

export function AccountHeader({
  account,
  contactCount,
  showOwner,
  onEditAccount,
  onViewFullAudit,
}: {
  account: AccountRecord;
  contactCount: number;
  showOwner: boolean;
  onEditAccount?: () => void;
  onViewFullAudit?: () => void;
}) {
  const hasMeta = Boolean(
    account.website ||
      account.phone ||
      (showOwner && account.ownerName) ||
      account.region ||
      account.customerSince ||
      account.lastActivity,
  );
  return (
    <>
      <div className="acct-headline">
        <div className="acct-logo-mark">{account.name.slice(0, 2).toUpperCase()}</div>
        <h1 className="acct-header-name">{account.name}</h1>
        {account.status ? (
          <span className="rep-pill p-approved">
            <span className="dot" />
            {account.status}
          </span>
        ) : null}
        {account.industry ? (
          <span
            className="mono"
            style={{ fontSize: 10.5, color: "var(--muted)", background: "var(--paper-2)", border: "1px solid var(--line-2)", padding: "1px 6px", borderRadius: 2 }}
          >
            {account.industry}
          </span>
        ) : null}
        {onEditAccount || onViewFullAudit ? (
          <div className="acct-headline-actions">
            {onEditAccount ? <button className="rep-btn rep-btn-ghost" type="button" onClick={onEditAccount}>Edit account</button> : null}
            {onViewFullAudit ? <button className="rep-btn rep-btn-ghost" type="button" onClick={onViewFullAudit}>View audit ›</button> : null}
          </div>
        ) : null}
      </div>

      {hasMeta ? (
        <div className="acct-header-meta">
          {account.website ? <span>{account.website}</span> : null}
          {account.website && account.phone ? <span className="sep">·</span> : null}
          {account.phone ? <span>{account.phone}</span> : null}
          {showOwner && account.ownerName ? (
            <>
              {account.website || account.phone ? <span className="sep">·</span> : null}
              <span>Owner: <strong>{account.ownerName}</strong></span>
            </>
          ) : null}
          {account.region ? (
            <>
              <span className="sep">·</span>
              <span>Region: <span className="mono" style={{ color: "var(--ink-2)" }}>{account.region}</span></span>
            </>
          ) : null}
          {account.customerSince ? (
            <>
              <span className="sep">·</span>
              <span>Customer since <span className="mono" style={{ color: "var(--ink-2)" }}>{fmtDate(account.customerSince)}</span></span>
            </>
          ) : null}
          {account.lastActivity ? (
            <>
              <span className="sep">·</span>
              <span>Last activity <span className="mono" style={{ color: "var(--ink-2)" }}>{fmtDate(account.lastActivity)}</span></span>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="acct-kpi-strip">
        <div className="acct-kpi-item"><div className="acct-kpi-l">Open pipeline</div><div className="acct-kpi-v accent">{fmtMoney(account.openPipeline)}</div></div>
        <div className="acct-kpi-item"><div className="acct-kpi-l">Open opportunities</div><div className="acct-kpi-v">{account.openOppsCount ?? "—"}</div></div>
        <div className="acct-kpi-item"><div className="acct-kpi-l">Contacts</div><div className="acct-kpi-v">{contactCount}</div></div>
        {typeof account.inFlightApprovals === "number" ? (
          <div className="acct-kpi-item">
            <div className="acct-kpi-l">In-flight approvals</div>
            <div className={`acct-kpi-v${account.inFlightApprovals > 0 ? " alert" : ""}`}>{account.inFlightApprovals}</div>
          </div>
        ) : null}
      </div>
    </>
  );
}

export function DuplicateWarning({
  candidate,
  onDismiss,
  onReview,
}: {
  candidate: NonNullable<AccountRecord["duplicateCandidate"]>;
  onDismiss: () => void;
  onReview: () => void;
}) {
  return (
    <div className="acct-dup-warning">
      <div className="acct-dup-icon">!</div>
      <div className="acct-dup-body">
        <div className="acct-dup-title">Possible duplicate detected: <span className="mono">{candidate.name}</span></div>
        <div className="acct-dup-sub">
          {candidate.reasons} · confidence score <span className="mono" style={{ fontWeight: 600 }}>{candidate.confidence}</span>. Duplicate review is handled by RevOps.
        </div>
      </div>
      <div className="acct-dup-actions">
        <button className="rep-btn" type="button" onClick={onReview}>Review candidate ›</button>
        <button className="rep-btn rep-btn-ghost" type="button" onClick={onDismiss}>Ignore for now</button>
      </div>
    </div>
  );
}

export function OpportunitiesBlock({
  opportunities,
  onNewOpportunity,
  onOpenOpportunity,
}: {
  opportunities: AccountOpportunity[];
  onNewOpportunity?: () => void;
  onOpenOpportunity?: (id: string) => void;
}) {
  return (
    <div className="rep-panel acct-section">
      <div className="rep-panel-head">
        <div className="rep-panel-title">Opportunities<em>{opportunities.length}</em></div>
        <div className="rep-panel-actions">
          <button className="rep-btn" style={{ fontSize: 11.5, padding: "4px 9px" }} type="button" onClick={onNewOpportunity}>+ New</button>
        </div>
      </div>
      {opportunities.length === 0 ? (
        <div className="rep-empty" style={{ padding: "32px 20px" }}>
          <div className="icon">OP</div>
          <div className="ttl">No opportunities</div>
          <div>Create an opportunity to track a deal with this account.</div>
        </div>
      ) : (
        <div className="rep-table-scroll">
          <table className="rep-table">
            <colgroup>
              <col /><col style={{ width: "11%" }} /><col style={{ width: "12%" }} /><col style={{ width: "15%" }} /><col style={{ width: "22%" }} />
            </colgroup>
            <thead>
              <tr><th>Title · stage</th><th className="num">Amount</th><th>Close</th><th>Approval</th><th>Next step</th></tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.id} style={{ cursor: onOpenOpportunity ? "pointer" : "default" }} onClick={() => onOpenOpportunity?.(o.id)}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <StagePip index={o.stageIndex ?? 0} />
                      <span style={{ fontWeight: 500 }}>{o.title}</span>
                    </div>
                    <span className="rep-cell-sub">{o.stageLabel ?? o.stageKey}</span>
                  </td>
                  <td className="num"><span className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{fmtMoney(o.expectedAmount)}</span></td>
                  <td><span className="mono" style={{ fontSize: 11.5 }}>{fmtDate(o.closeDate)}</span></td>
                  <td>
                    {o.approvalState && o.approvalState !== "none" ? (
                      <span className={`rep-pill p-${o.approvalState === "pending" ? "pending" : "sent_back"}`}><span className="dot" />{o.approvalLabel ?? o.approvalState}</span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td><div className="rep-cell-truncate" style={{ fontSize: 12 }}>{o.nextActivityNote ?? "—"}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ActivitiesBlock({
  activities,
  allCount,
  filter,
  onFilter,
  onAddActivity,
}: {
  activities: AccountActivity[];
  allCount: number;
  filter: "all" | "mine";
  onFilter: (f: "all" | "mine") => void;
  onAddActivity: () => void;
}) {
  return (
    <div className="rep-panel acct-section">
      <div className="rep-panel-head">
        <div className="rep-panel-title">Activities<em>{allCount}</em></div>
        <div className="rep-panel-actions" style={{ alignItems: "center", gap: 6 }}>
          <div className="acct-activity-filter">
            {(["all", "mine"] as const).map((f) => (
              <button key={f} className={`acct-filter-chip${filter === f ? " active" : ""}`} type="button" onClick={() => onFilter(f)}>{f.toUpperCase()}</button>
            ))}
          </div>
          <button className="rep-btn" style={{ fontSize: 11.5, padding: "4px 9px" }} type="button" onClick={onAddActivity}>+ Add</button>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="rep-empty" style={{ padding: "28px 20px" }}>
          <div className="icon">AT</div>
          <div className="ttl">No activities</div>
          <div>Log a call, meeting, email, or follow-up.</div>
        </div>
      ) : (
        activities.map((a) => (
          <div key={a.id} className={`acct-activity-item${a.status === "overdue" ? " overdue" : ""}`}>
            <div className="acct-activity-time">{a.timestamp.slice(11, 16) || "—"}<small>{a.timestamp.slice(0, 10)}</small></div>
            <div className={`acct-activity-dot ${a.status}`}>{a.status === "done" ? "✓" : a.status === "overdue" ? "!" : "·"}</div>
            <div>
              <div className="acct-activity-title">{a.title}{a.status === "overdue" ? <span className="acct-activity-overdue-tag">OVERDUE</span> : null}</div>
              <div className="acct-activity-sub">{[a.description, a.actor].filter(Boolean).join(" · ")}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function AccountSidebar({
  auditEvents,
  onViewFullAudit,
}: {
  auditEvents: AccountAuditEvent[];
  onViewFullAudit?: () => void;
}) {
  return (
    <div className="rep-panel acct-section">
      <div className="rep-panel-head">
        <div className="rep-panel-title">Audit<em>{auditEvents.length} events</em></div>
        <div className="rep-panel-actions">{onViewFullAudit ? <button className="rep-btn rep-btn-ghost" style={{ fontSize: 11.5 }} type="button" onClick={onViewFullAudit}>Full audit ›</button> : null}</div>
      </div>
      <div style={{ padding: "6px 12px 10px" }}>
        {auditEvents.slice(0, 6).map((e, i) => (
          <div key={i} className="acct-audit-item">
            <div className="acct-audit-dot">{auditDotIcon(e.eventType)}</div>
            <div>
              <div className="acct-audit-desc">{e.description}</div>
              <div className="acct-audit-meta">{e.timestamp.slice(0, 10)} · {e.actor}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
