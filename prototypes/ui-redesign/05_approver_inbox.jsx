/* eslint-disable */
const { useState, useMemo, useEffect } = React;

/* ─────────── Static ─────────── */

const APPROVERS = {
  fin: { name:"Daria Smirnova", role:"Finance Approver", initials:"DS", color:"bg-a", roleCode:"FIN" },
  leg: { name:"Oleg Markov",    role:"Legal Approver",   initials:"OM", color:"bg-d", roleCode:"LEG" },
};

const MODULES = [
  { key:"dashboard",  code:"DA", label:"Dashboard",      section:"workspace", count:null },
  { key:"accounts",   code:"AC", label:"Accounts",       section:"workspace", count:412 },
  { key:"opps",       code:"OP", label:"Opportunities",  section:"workspace", count:46 },
  { key:"approvals",  code:"AP", label:"Approvals",      section:"governance" }, /* count overridden by role */
  { key:"audit",      code:"AU", label:"Audit",          section:"insights" },
  /* hidden-to-approver modules */
  { key:"contacts",   code:"CO", label:"Contacts",       section:"workspace", disabled:true },
  { key:"imports",    code:"IM", label:"Imports",        section:"data",      disabled:true },
  { key:"duplicates", code:"DU", label:"Duplicates",     section:"data",      disabled:true },
  { key:"metadata",   code:"MA", label:"Metadata Admin", section:"data",      disabled:true },
  { key:"reports",    code:"RE", label:"Reports",        section:"insights",  disabled:true },
];
const SECTIONS = [
  { key:"workspace",  label:"Workspace",      index:"01" },
  { key:"governance", label:"Governance",     index:"02" },
  { key:"data",       label:"Data & Quality", index:"03" },
  { key:"insights",   label:"Insights",       index:"04" },
];

/* Queue rows. `mine.fin` / `mine.leg` indicate which approver this request is currently
   assigned to (visible in their inbox). `step` is the current pipeline step on the
   approval chain (FIN/LEG/DONE). Decided rows are read-only. */
const REQUESTS = [
  {
    id:"REQ-1182", oppId:"OPP-2418", oppTitle:"Q3 Equipment Renewal",
    account:"Acme Manufacturing", accountId:"AC-3318",
    kind:"discount", kindLabel:"Discount Exception",
    change:"Discount 8%", changeDetail:"from 4% to 8%",
    amount:145000, submittedBy:"Anna Petrova", submittedAt:"2026-05-12 09:14", age:"2d 04h",
    step:"FIN", nextStep:"Legal · O. Markov", status:"pending",
    sla:{ pct:84, label:"23h left · finance", state:"warn", total:"48h" },
    priority:"normal", region:"DACH-North", risk:"Medium", stage:"Proposal", close:"2026-06-28",
    justification:"Strategic renewal account. Competitor approached customer with an aggressive 9% rebate on equivalent equipment. 8% discount preserves margin floor and protects FY26 service uplift attached to this contract.",
    mine:{ fin:true, leg:false },
    activity:[
      { t:"2026-05-12 09:14", who:"A. Petrova",  type:"submit",  title:"Request submitted",      desc:"Snapshot frozen at amount $145,000, stage Proposal. Routed by policy DISCOUNT-A." },
      { t:"2026-05-12 09:14", who:"system",      type:"route",   title:"Policy resolved",        desc:"DISCOUNT-A · trigger discount > 6%. Chain Finance → Legal." },
      { t:"2026-05-11 17:42", who:"A. Petrova",  type:"note",    title:"Linked competitor email", desc:"Attached competitor_offer_summary.xlsx" },
    ],
  },
  {
    id:"REQ-1186", oppId:"OPP-2410", oppTitle:"Nordwerk plant retooling — discount + terms",
    account:"Nordwerk Tooling AG", accountId:"AC-3302",
    kind:"terms", kindLabel:"Payment Terms Exception",
    change:"NET-60 terms", changeDetail:"from NET-30 (regional default)",
    amount:412500, submittedBy:"Anna Petrova", submittedAt:"2026-05-11 14:20", age:"22h",
    step:"FIN", nextStep:"Legal · O. Markov", status:"pending",
    sla:{ pct:42, label:"36h left · finance", state:"ok", total:"48h" },
    priority:"high", region:"DACH-North", risk:"Medium", stage:"Negotiation", close:"2026-05-30",
    justification:"Customer treasury policy locks payment cycles at 60 days. Without the terms exception we lose the deal to Sigma Castings (DACH-North incumbent).",
    mine:{ fin:true, leg:false },
    activity:[
      { t:"2026-05-11 14:20", who:"A. Petrova", type:"submit", title:"Request submitted", desc:"Snapshot frozen at amount $412,500, stage Negotiation." },
    ],
  },
  {
    id:"REQ-1175", oppId:"OPP-2385", oppTitle:"Carpathia Steel — NET-90 terms exception",
    account:"Carpathia Steel", accountId:"AC-3242",
    kind:"legal", kindLabel:"Legal Exception",
    change:"NET-90 + indemnity carve-out", changeDetail:"non-standard terms · legal review required",
    amount:264000, submittedBy:"Anna Petrova", submittedAt:"2026-05-09 11:08", age:"3d 22h",
    step:"FIN", nextStep:"Legal · O. Markov", status:"sentback",
    sla:{ pct:0, label:"awaiting rep · 3h", state:"cold", total:"paused" },
    priority:"normal", region:"CEE", risk:"High", stage:"Negotiation", close:"2026-05-22",
    justification:"NET-90 is non-negotiable for Carpathia CFO. Margin protection is via service uplift, not pricing.",
    mine:{ fin:true, leg:false },
    sentbackNote:"Justification insufficient — please attach historic payment record and signed NDA before resubmit.",
    activity:[
      { t:"2026-05-12 09:14", who:"D. Smirnova", type:"sendback", title:"Sent back by you", desc:"Justification insufficient — see comment." },
      { t:"2026-05-09 11:08", who:"A. Petrova",  type:"submit",   title:"Request submitted", desc:"Initial submission · routed Finance → Legal" },
    ],
  },
  {
    id:"REQ-1190", oppId:"OPP-2502", oppTitle:"Sigma Castings — Q3 capital order",
    account:"Sigma Castings GmbH", accountId:"AC-3140",
    kind:"discount", kindLabel:"Discount Exception",
    change:"Discount 12%", changeDetail:"flat-rate request · above 10% tier",
    amount:580000, submittedBy:"Jonas Berg", submittedAt:"2026-05-09 16:31", age:"3d 16h",
    step:"FIN", nextStep:"Legal · O. Markov", status:"pending",
    sla:{ pct:118, label:"OVERDUE · 5h past finance SLA", state:"over", total:"48h" },
    priority:"high", region:"DACH-North", risk:"Medium", stage:"Proposal", close:"2026-05-29",
    justification:"Largest single deal of Q3. Customer has matched competitor pricing — without 12% we lose multi-year footprint.",
    mine:{ fin:true, leg:false },
    activity:[
      { t:"2026-05-10 07:01", who:"system",   type:"escalate", title:"SLA breach warning", desc:"24h finance SLA passed without decision." },
      { t:"2026-05-09 16:31", who:"J. Berg",  type:"submit",   title:"Request submitted", desc:"Snapshot frozen at amount $580,000." },
    ],
  },
  {
    id:"REQ-1177", oppId:"OPP-2331", oppTitle:"AltaWerk Maschinen — pricing floor breach",
    account:"AltaWerk Maschinen", accountId:"AC-3155",
    kind:"commercial", kindLabel:"Commercial Exception",
    change:"Price floor breach · −1.4pp", changeDetail:"renewal under standard floor",
    amount:142000, submittedBy:"Anna Petrova", submittedAt:"2026-05-10 18:11", age:"2d 11h",
    step:"FIN", nextStep:"Legal · O. Markov", status:"pending",
    sla:{ pct:64, label:"17h left · finance", state:"warn", total:"48h" },
    priority:"normal", region:"DACH-North", risk:"Low", stage:"Negotiation", close:"2026-06-05",
    justification:"Strategic account. Flat renewal would risk losing 30% of scope to a regional competitor. Floor breach is bounded and recovered via service uplift Q4.",
    mine:{ fin:true, leg:false },
    activity:[
      { t:"2026-05-10 18:11", who:"A. Petrova", type:"submit", title:"Request submitted", desc:"Snapshot frozen at $142,000 · stage Negotiation." },
    ],
  },
  {
    id:"REQ-1170", oppId:"OPP-2275", oppTitle:"Schwarz Maschinenbau — annual renewal",
    account:"Schwarz Maschinenbau", accountId:"AC-3098",
    kind:"discount", kindLabel:"Discount Exception",
    change:"Discount 9%", changeDetail:"approved by you 4d ago",
    amount:204000, submittedBy:"Anna Petrova", submittedAt:"2026-05-06 10:02", age:"6d",
    step:"DONE", nextStep:"—", status:"approved",
    sla:{ pct:38, label:"decided · 1d 06h", state:"ok", total:"closed" },
    priority:"normal", region:"DACH-North", risk:"Low", stage:"Negotiation", close:"2026-05-20",
    justification:"Strategic account. Approved within policy. Net-30, standard terms.",
    mine:{ fin:true, leg:false }, decided:true, decidedBy:"D. Smirnova", decidedAt:"2026-05-08 16:14",
    activity:[
      { t:"2026-05-08 16:14", who:"D. Smirnova", type:"approve", title:"Approved by you", desc:"Comment: within policy, no Legal step required for standard terms." },
      { t:"2026-05-06 10:02", who:"A. Petrova",  type:"submit",  title:"Request submitted", desc:"Snapshot frozen at $204,000." },
    ],
  },
  /* Awaiting Legal — visible in Finance inbox as locked, actionable in Legal inbox */
  {
    id:"REQ-1180", oppId:"OPP-2360", oppTitle:"Vetra Logistics — Q2 pricing model",
    account:"Vetra Logistics", accountId:"AC-3198",
    kind:"legal", kindLabel:"Legal Exception",
    change:"Indemnity language carve-out", changeDetail:"finance approved · waiting legal review",
    amount:192000, submittedBy:"Anna Petrova", submittedAt:"2026-05-08 12:00", age:"4d",
    step:"LEG", nextStep:"—", status:"pending",
    sla:{ pct:55, label:"21h left · legal", state:"warn", total:"48h" },
    priority:"normal", region:"Baltics", risk:"Low", stage:"Proposal", close:"2026-06-28",
    justification:"Customer legal team requires limitation of liability carve-out for installation phase.",
    mine:{ fin:false, leg:true },
    activity:[
      { t:"2026-05-10 09:30", who:"D. Smirnova", type:"approve", title:"Finance approved", desc:"Within policy — handed off to Legal." },
      { t:"2026-05-08 12:00", who:"A. Petrova",  type:"submit",  title:"Request submitted", desc:"Routed Finance → Legal" },
    ],
  },
];

const SAVED_VIEWS = {
  fin: [
    { key:"pending",  label:"My Pending Reviews", test:(r)=> r.mine.fin && !r.decided && r.status !== "sentback" },
    { key:"today",    label:"Due Today",          test:(r)=> r.mine.fin && r.sla.state === "warn" },
    { key:"hivalue",  label:"High Value",         test:(r)=> r.mine.fin && r.amount >= 300000 },
    { key:"sentback", label:"Sent Back",          test:(r)=> r.mine.fin && r.status === "sentback" },
    { key:"legal",    label:"Awaiting Legal",     test:(r)=> r.step === "LEG" && r.mine.fin === false },
  ],
  leg: [
    { key:"pending",  label:"My Pending Reviews", test:(r)=> r.mine.leg && !r.decided },
    { key:"today",    label:"Due Today",          test:(r)=> r.mine.leg && r.sla.state === "warn" },
    { key:"hivalue",  label:"High Value",         test:(r)=> r.mine.leg && r.amount >= 300000 },
    { key:"sentback", label:"Sent Back",          test:(r)=> r.mine.leg && r.status === "sentback" },
    { key:"legal",    label:"Awaiting Legal",     test:(r)=> r.step === "LEG" },
  ],
};

/* ─────────── Helpers ─────────── */

function fmtMoney(n){
  if(n>=1_000_000) return `$${(n/1_000_000).toFixed(2)}M`;
  if(n>=1_000) return `$${(n/1_000).toFixed(0)}K`;
  return `$${n}`;
}
function Pill({ kind, children }){
  return <span className={`pill p-${kind}`}><span className="pdot" />{children}</span>;
}

/* ─────────── Sidebar / Topbar ─────────── */

function BrandMark(){ return <span className="brand-mark" aria-hidden /> }

function Sidebar({ user }){
  const counts = { opps:46, accounts:412, approvals: user.roleCode==="FIN" ? 9 : 4, audit:0 };
  return (
    <aside className="sidebar">
      <div className="brand">
        <BrandMark />
        <div className="brand-name">Sales Ops CRM<span>v2.4</span></div>
      </div>
      <div className="tenant">
        <div className="tenant-label">Tenant</div>
        <div className="tenant-row">
          <div className="tenant-name">Orion Industrial</div>
          <div className="tenant-env mono">LOCAL PILOT</div>
        </div>
        <div className="tenant-meta">
          <span className="mono">EU-CENTRAL-1</span>
          <span className="dot">·</span>
          <span>184 seats</span>
        </div>
      </div>

      <nav className="nav">
        {SECTIONS.map(sec=>{
          const items = MODULES.filter(m=>m.section===sec.key);
          return (
            <div key={sec.key} className="nav-section">
              <div className="nav-title">{sec.label}<em>{sec.index}</em></div>
              {items.map(m=>{
                const c = counts[m.key];
                const alert = m.key==="approvals" && c>0;
                return (
                  <div
                    key={m.key}
                    className={`nav-item ${m.key==="approvals"?"active":""} ${m.disabled?"disabled":""}`}
                    title={m.disabled ? `${m.label} — not visible to ${user.role}` : m.label}
                  >
                    <span className="nav-mark mono">{m.code}</span>
                    <span className="nav-label">{m.label}</span>
                    <span className={`nav-count mono ${alert?"alert":""}`}>{c===undefined||c===null?"":(c||"")}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="user-block">
        <div className={`avatar ${user.color}`}>{user.initials}</div>
        <div className="user-meta">
          <div className="user-name">{user.name}</div>
          <div className="user-role">{user.role}</div>
        </div>
        <button className="switch-btn">Switch</button>
      </div>
    </aside>
  );
}

function TopBar({ user, selectedReq }){
  return (
    <div className="topbar">
      <div className="crumb">
        <span className="pulse"><span className="pulse-dot" /> LOCAL PILOT</span>
        <span>Approvals</span>
        <span className="sep">/</span>
        <strong>{user.roleCode === "FIN" ? "Finance inbox" : "Legal inbox"}</strong>
        {selectedReq && <>
          <span className="sep">·</span>
          <span className="mono" style={{color:"var(--ink-2)"}}>{selectedReq.id}</span>
        </>}
      </div>
      <label className="search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="m11 11 3.5 3.5"/></svg>
        <input placeholder="Search requests, opportunities, accounts…" />
        <kbd>⌘K</kbd>
      </label>
      <div className="top-actions">
        <button className="icon-btn" aria-label="Notifications" title="Notifications">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3.5 12h9l-1-1.5V7a3.5 3.5 0 0 0-7 0v3.5L3.5 12Z"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/></svg>
          <span className="dot-badge mono">{user.roleCode==="FIN"?9:4}</span>
        </button>
        <button className="role-pill">
          <span className={`avatar ${user.color}`}>{user.initials}</span>
          <span className="who">
            <b>{user.name.split(" ")[0]} {user.name.split(" ")[1][0]}.</b>
            <span>{user.role}</span>
          </span>
          <span className="chev">▾</span>
        </button>
      </div>
    </div>
  );
}

/* ─────────── KPIs ─────────── */

function KPIs({ user, rows }){
  const assigned = rows.filter(r=> (user.roleCode==="FIN" ? r.mine.fin : r.mine.leg) && !r.decided).length;
  const dueToday = rows.filter(r=> r.sla.state==="warn" && !r.decided).length;
  const overdue  = rows.filter(r=> r.sla.state==="over" && !r.decided).length;
  const highValue= rows.filter(r=> r.amount >= 300000 && !r.decided).length;
  const sentback = rows.filter(r=> r.status==="sentback").length;

  return (
    <div className="kpis">
      <div className="kpi">
        <div className="kpi-label">Assigned to me <span className="delta dn mono">▼ -1 24h</span></div>
        <div className="kpi-value mono">{assigned}</div>
        <div className="kpi-foot">{user.roleCode==="FIN" ? "Finance queue · D. Smirnova" : "Legal queue · O. Markov"}</div>
      </div>
      <div className="kpi warn">
        <div className="kpi-label">Due today <span className="delta up mono">▲ +2</span></div>
        <div className="kpi-value mono">{dueToday}</div>
        <div className="kpi-foot">SLA &lt; 24h remaining</div>
      </div>
      <div className="kpi alert">
        <div className="kpi-label">Overdue</div>
        <div className="kpi-value mono">{overdue}</div>
        <div className="kpi-foot">{overdue>0 ? "REQ-1190 · 5h past finance SLA" : "All within SLA"}</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">High value <span className="delta up mono">▲ +1</span></div>
        <div className="kpi-value mono">{highValue}</div>
        <div className="kpi-foot">≥ $300K · escalated routing</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">Sent back this week</div>
        <div className="kpi-value mono">{sentback}</div>
        <div className="kpi-foot">Returned to owner for revision</div>
      </div>
    </div>
  );
}

/* ─────────── Saved views & filters ─────────── */

function ViewsRow({ user, active, onPick, counts }){
  return (
    <div className="views">
      <span className="views-label">Saved views</span>
      {SAVED_VIEWS[user.roleCode === "FIN" ? "fin" : "leg"].map(v=>(
        <button key={v.key} className={`view-chip ${active===v.key?"active":""}`} onClick={()=>onPick(v.key)}>
          {v.label} <span className="ct mono">{counts[v.key]}</span>
        </button>
      ))}
      <span style={{flex:1}} />
      <button className="btn btn-ghost btn-sm">+ Save view</button>
    </div>
  );
}

function FiltersRow({ q, setQ, type, setType, sla, setSla, prio, setPrio, amount, setAmount, status, setStatus, user }){
  return (
    <div className="filters">
      <label className="field-ctl">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="m11 11 3.5 3.5"/></svg>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by request, opportunity or account…" />
      </label>
      <label className="field-ctl">
        <span className="lbl">Type</span>
        <select value={type} onChange={e=>setType(e.target.value)}>
          <option value="">All</option>
          <option value="discount">Discount</option>
          <option value="terms">Terms</option>
          <option value="legal">Legal</option>
          <option value="commercial">Commercial</option>
        </select>
        <span className="chev">▾</span>
      </label>
      <label className="field-ctl">
        <span className="lbl">SLA</span>
        <select value={sla} onChange={e=>setSla(e.target.value)}>
          <option value="">Any</option>
          <option value="over">Overdue</option>
          <option value="warn">≤ 24h</option>
          <option value="ok">≥ 24h</option>
        </select>
        <span className="chev">▾</span>
      </label>
      <label className="field-ctl">
        <span className="lbl">Priority</span>
        <select value={prio} onChange={e=>setPrio(e.target.value)}>
          <option value="">Any</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
        </select>
        <span className="chev">▾</span>
      </label>
      <label className="field-ctl">
        <span className="lbl">Amount</span>
        <select value={amount} onChange={e=>setAmount(e.target.value)}>
          <option value="">Any</option>
          <option value="100">≥ $100K</option>
          <option value="200">≥ $200K</option>
          <option value="500">≥ $500K</option>
        </select>
        <span className="chev">▾</span>
      </label>
      <label className="field-ctl">
        <span className="lbl">Status</span>
        <select value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Any</option>
          <option value="pending">Pending</option>
          <option value="sentback">Sent back</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="chev">▾</span>
      </label>
      <span className="lock-chip mono" title={`Approver scope · ${user.role}. You only see requests routed to your approver group.`}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2.5" y="5.5" width="7" height="5" rx="0.5"/><path d="M4 5.5V3.8a2 2 0 1 1 4 0V5.5"/></svg>
        APPROVER · {user.roleCode}
      </span>
    </div>
  );
}

/* ─────────── Queue table ─────────── */

function SLA({ data }){
  const cls = data.state;
  return (
    <div className="sla">
      <div className="sla-bar"><div className={`fill ${cls}`} style={{width: Math.min(100, data.pct) + "%"}} /></div>
      <span className={`sla-text mono ${cls}`}>{data.label}</span>
    </div>
  );
}

function Queue({ rows, selectedId, onSelect, totalRows, user }){
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">Approval queue<em>{rows.length} of {totalRows} · {user.roleCode === "FIN" ? "Finance" : "Legal"}</em></div>
        <div className="panel-actions">
          <span className="filterchip mono">SORTED · SLA ↑</span>
          <a>Density</a>
          <a>Columns</a>
        </div>
      </div>
      <div style={{overflowX:"auto"}}>
      <table className="t" style={{minWidth:1040}}>
        <colgroup>
          <col style={{width:96}}/>
          <col/>
          <col/>
          <col style={{width:120}}/>
          <col style={{width:128}}/>
          <col style={{width:96}}/>
          <col style={{width:110}}/>
          <col style={{width:128}}/>
          <col style={{width:108}}/>
        </colgroup>
        <thead><tr>
          <th>Request</th>
          <th>Opportunity</th>
          <th>Account</th>
          <th>Type</th>
          <th>Requested change</th>
          <th className="num">Amount</th>
          <th>Submitted by</th>
          <th>SLA</th>
          <th>Status · step</th>
        </tr></thead>
        <tbody>
          {rows.map(r=>{
            const isMine = user.roleCode === "FIN" ? r.mine.fin : r.mine.leg;
            /* Locked if the row's step is not mine, or already decided */
            const locked = !isMine || r.decided;
            const rowCls = [
              selectedId===r.id ? "selected" : "",
              locked ? "locked" : "",
              r.decided ? "decided" : "",
              r.sla.state === "over" && !r.decided ? "over" : "",
            ].filter(Boolean).join(" ");
            return (
              <tr key={r.id} className={rowCls} onClick={()=>!locked && onSelect(r.id)}>
                <td className="mono">{r.id}<span className="sub mono">{r.age}</span></td>
                <td>
                  <div className="truncate">{r.oppTitle}</div>
                  <span className="sub mono">{r.oppId}</span>
                </td>
                <td>
                  <div className="truncate">{r.account}</div>
                  <span className="sub mono">{r.accountId}</span>
                </td>
                <td>
                  <span className={`kind-tag ${r.kind} mono`}>{r.kind}</span>
                  <span style={{fontSize:11.5}}>{r.kindLabel.split(" ")[0]}</span>
                </td>
                <td>
                  <div className="truncate">{r.change}</div>
                  <span className="sub">{r.changeDetail}</span>
                </td>
                <td className="num">{fmtMoney(r.amount)}</td>
                <td>
                  <div className="truncate">{r.submittedBy}</div>
                  <span className="sub mono">{r.submittedAt.slice(0,10)}</span>
                </td>
                <td><SLA data={r.sla} /></td>
                <td>
                  {r.decided ? <Pill kind="decided">{r.status}</Pill>
                    : r.status === "sentback" ? <Pill kind="sentback">sent back</Pill>
                    : !isMine ? <Pill kind="locked">awaits {r.step === "LEG" ? "legal" : "fin"}</Pill>
                    : <Pill kind="pending">{r.step.toLowerCase()}</Pill>}
                  <span className="sub mono">{r.step === "LEG" ? "step 03 · legal" : r.step === "DONE" ? "closed" : "step 02 · finance"}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {rows.length === 0 && (
        <div style={{padding:"36px 18px",textAlign:"center",color:"var(--muted)"}}>
          <div style={{fontSize:13.5,color:"var(--ink)",fontWeight:500,marginBottom:4}}>No requests match this view</div>
          <div>Try a different saved view or clear filters.</div>
        </div>
      )}
    </section>
  );
}

/* ─────────── Preview ─────────── */

function Preview({ req, user, onAct, onMore }){
  if(!req) return (
    <section className="panel preview">
      <div style={{padding:"38px 22px",textAlign:"center",color:"var(--muted)"}}>
        <div style={{margin:"0 auto 12px",width:42,height:42,border:"1px dashed var(--line-2)",display:"grid",placeItems:"center",color:"var(--muted-2)",fontFamily:'"JetBrains Mono",monospace',fontSize:10}}>AP</div>
        <div style={{color:"var(--ink)",fontWeight:500,fontSize:13.5,marginBottom:4}}>Pick a request from the queue</div>
        <div>The preview will show snapshot, justification, chain and SLA — enough context to decide without leaving the inbox.</div>
      </div>
    </section>
  );
  const isMine = user.roleCode === "FIN" ? req.mine.fin : req.mine.leg;
  const decided = !!req.decided;
  const locked = !isMine && !decided;

  /* Banner */
  let bannerCls = "warn", bannerMk = "!", bannerL = "Status", bannerV = "Pending Finance Approval", bannerS = req.age + " in review · SLA " + req.sla.total;
  if(req.sla.state === "over"){ bannerCls="over"; bannerL="SLA breach"; bannerV="Overdue · past finance SLA"; bannerS=req.sla.label; }
  if(req.status === "sentback"){ bannerCls="info"; bannerMk="↩"; bannerL="Sent back"; bannerV="Returned to owner for revision"; bannerS="awaits Anna Petrova resubmit"; }
  if(decided){ bannerCls="pos"; bannerMk="✓"; bannerL="Decided"; bannerV="Approved by " + req.decidedBy; bannerS=req.decidedAt + " · decision is immutable"; }
  if(locked){ bannerCls="lock"; bannerMk="🔒"; bannerL="Step locked"; bannerV=`This is currently with ${req.step === "LEG" ? "Legal" : "Finance"}`; bannerS = (user.roleCode === "FIN" ? "Finance step is closed for this request" : "Finance must approve before Legal can decide"); }

  return (
    <section className="panel preview">
      <div className="pv-head">
        <div className="pv-kind">
          <span className={`pill p-none`} style={{textTransform:"uppercase"}}>
            <span className="pdot" style={{background:"var(--ink)"}} />
            <span className="mono" style={{color:"var(--accent-2)"}}>{req.kindLabel}</span>
          </span>
          <span className="id mono">{req.id}</span>
        </div>
        <div className="pv-title">{req.oppTitle}</div>
        <div className="pv-meta">
          <span className="mono">{req.oppId}</span>
          <span style={{color:"var(--line-2)"}}>·</span>
          <span>{req.account}</span>
          <span style={{color:"var(--line-2)"}}>·</span>
          <span className="mono">{req.accountId}</span>
        </div>
      </div>

      <div className={`pv-banner ${bannerCls}`}>
        <div className="mk mono">{bannerMk}</div>
        <div className="body">
          <div className="l">{bannerL}</div>
          <div className="v">{bannerV}</div>
          <div className="s">{bannerS}</div>
        </div>
        {!decided && !locked && req.status !== "sentback" && <Pill kind="pending">{req.step.toLowerCase()}</Pill>}
        {req.status === "sentback" && <Pill kind="sentback">sent back</Pill>}
        {decided && <Pill kind="approved">approved</Pill>}
        {locked && <Pill kind="locked">locked</Pill>}
      </div>

      <div className="pv-grid">
        <div className="pv-cell"><div className="pv-l">Submitted by</div><div className="pv-v"><span className="avatar bg-c" style={{width:18,height:18,fontSize:9,borderRadius:"50%"}}>AP</span>{req.submittedBy}</div></div>
        <div className="pv-cell"><div className="pv-l">Submitted at</div><div className="pv-v"><span className="mono" style={{fontSize:12}}>{req.submittedAt}</span></div></div>
        <div className="pv-cell"><div className="pv-l">Requested change<span className="ctxchip mono">SCOPE</span></div><div className="pv-v">{req.change}<small>· {req.changeDetail}</small></div></div>
        <div className="pv-cell"><div className="pv-l">Amount<span className="ctxchip mono">SNAPSHOT</span></div><div className="pv-v num">{fmtMoney(req.amount)}</div></div>
        <div className="pv-cell"><div className="pv-l">Stage</div><div className="pv-v"><Pill kind="pending">{req.stage}</Pill></div></div>
        <div className="pv-cell"><div className="pv-l">Close date</div><div className="pv-v"><span className="mono" style={{fontSize:12}}>{req.close}</span></div></div>
        <div className="pv-cell"><div className="pv-l">Region</div><div className="pv-v"><span className="mono">{req.region}</span></div></div>
        <div className="pv-cell"><div className="pv-l">Payment risk</div><div className="pv-v"><Pill kind={req.risk === "High" ? "rejected" : req.risk === "Medium" ? "pending" : "approved"}>{req.risk}</Pill></div></div>
      </div>

      <div className="pv-block">
        <div className="pv-block-title">Business justification<span className="mono" style={{color:"var(--muted-2)"}}>frozen at submit</span></div>
        <div className="just-body">{req.justification}</div>
        {req.sentbackNote && (
          <div className="just-body" style={{marginTop:8,borderLeft:"2px solid var(--info)",background:"var(--info-soft)"}}>
            <span className="mono" style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--info)",marginRight:6}}>Your last comment</span>
            {req.sentbackNote}
          </div>
        )}
      </div>

      <div className="pv-block">
        <div className="pv-block-title">Approval chain<span className="mono" style={{color:"var(--muted-2)"}}>sequential · {req.kind === "legal" ? "Legal-led" : "Finance → Legal"}</span></div>
        <div className="chain">
          <div className="chain-step done">
            <div className="chain-mk">01</div>
            <div>
              <div className="nm">Submitted</div>
              <div className="who mono">{req.submittedBy} · {req.submittedAt}</div>
            </div>
            <span className="badge mono">Done</span>
          </div>
          <div className={`chain-step ${req.step === "FIN" ? "cur" : req.step === "LEG" || req.step === "DONE" ? "done" : "fut"}`}>
            <div className="chain-mk">02</div>
            <div>
              <div className="nm">Finance Review · Daria Smirnova {user.roleCode==="FIN" && !decided && <Pill kind="approved">you</Pill>}</div>
              <div className="who mono">FIN · {req.step === "FIN" ? "in review" : req.step === "LEG" ? "approved · 2026-05-10 09:30" : "approved"}</div>
            </div>
            <span className="badge mono">{req.step === "FIN" ? "In review" : "Done"}</span>
          </div>
          <div className={`chain-step ${req.step === "LEG" ? "cur" : req.step === "DONE" ? "done" : "fut"} ${user.roleCode === "FIN" && req.step !== "LEG" ? "lock" : ""}`}>
            <div className="chain-mk">03</div>
            <div>
              <div className="nm">Legal Review · Oleg Markov {user.roleCode==="LEG" && req.step==="LEG" && <Pill kind="approved">you</Pill>}{user.roleCode==="FIN" && req.step==="FIN" && <Pill kind="locked">locked for you</Pill>}</div>
              <div className="who mono">LEG · {req.step === "LEG" ? "in review" : req.step === "FIN" ? "waits for finance" : "—"}</div>
            </div>
            <span className="badge mono">{req.step === "LEG" ? "In review" : req.step === "FIN" ? "Waiting" : "Done"}</span>
          </div>
          <div className={`chain-step ${req.step === "DONE" ? "done" : "fut"}`}>
            <div className="chain-mk">04</div>
            <div>
              <div className="nm">Final decision</div>
              <div className="who mono">auto · applied to {req.oppId}</div>
            </div>
            <span className="badge mono">Auto</span>
          </div>
        </div>
      </div>

      <div className="pv-block">
        <div className="pv-block-title">Activity log<span className="mono" style={{color:"var(--muted-2)"}}>{req.activity.length} events</span></div>
        <div className="actlog">
          {req.activity.map((a,i)=>(
            <div className="actlog-row" key={i}>
              <div className="actlog-when mono">{a.t.slice(11)}<small>{a.t.slice(0,10)}</small></div>
              <div className="actlog-body">
                <div className="nm">{a.title} <span className="mono" style={{fontSize:10,color:"var(--muted-2)",letterSpacing:".06em"}}>· {a.who}</span></div>
                <div className="ds">{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pv-actions">
        <div className="primary">
          {decided ? (
            <button className="btn btn-disabled" aria-disabled="true" title="This request has already been decided. Decisions are immutable." style={{gridColumn:"1 / span 3"}}>
              ✓ Decision recorded · cannot be re-decided
            </button>
          ) : locked ? (
            <button className="btn btn-disabled" aria-disabled="true" title={user.roleCode === "FIN" ? "Finance has already approved — wait for Legal." : "Finance has not approved yet — Legal cannot decide first."} style={{gridColumn:"1 / span 3"}}>
              🔒 Step not assigned to you
            </button>
          ) : (
            <>
              <button className="btn btn-pos btn-lg" onClick={()=>onAct("approve")}>Approve</button>
              <button className="btn btn-info btn-lg" onClick={()=>onAct("sendback")}>Send Back</button>
              <button className="btn btn-neg btn-lg" onClick={()=>onAct("reject")}>Reject</button>
            </>
          )}
        </div>
        <div className="secondary">
          <button className="btn btn-sm" onClick={()=>onMore("detail")}>Open full detail ›</button>
          <button className={`btn btn-sm ${decided||locked?"btn-disabled":""}`} onClick={()=>!(decided||locked) && onMore("info")} aria-disabled={decided||locked}>Request more info</button>
          <button className="btn btn-sm" onClick={()=>onMore("copy")}>Copy request link</button>
        </div>
      </div>
    </section>
  );
}

/* ─────────── Decision modal ─────────── */

function DecisionModal({ req, kind, onClose, onConfirm }){
  const conf = {
    approve:  { headCls:"appr", mk:"✓", title:"Approve request", btn:"btn-pos", btnLabel:"Confirm approval", reasons:["Within policy · standard","Account size justifies","Confirmed competitor pressure","Margin floor preserved"] },
    reject:   { headCls:"rej",  mk:"✕", title:"Reject request",  btn:"btn-neg", btnLabel:"Confirm rejection", reasons:["Out of policy band","Not justified by competitive pressure","Insufficient margin","Risk too high"] },
    sendback: { headCls:"sb",   mk:"↩", title:"Send back to owner", btn:"btn-info", btnLabel:"Send back", reasons:["Justification too thin","Missing competitive context","Need supporting documents","Update payment terms first"] },
  }[kind];

  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);
  const empty = comment.trim().length < 10;
  const err = touched && empty;

  useEffect(()=>{
    const onKey = (e)=>{ if(e.key==="Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return ()=>document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-label={conf.title}>
        <div className="modal-card">
          <div className={`head ${conf.headCls}`}>
            <div className="mk">{conf.mk}</div>
            <div>
              <h3>{conf.title}</h3>
              <p>{kind === "approve"
                ? "Confirms approval of this request. Decision will be auto-applied to the opportunity and audit-logged."
                : kind === "reject"
                ? "Rejects this request. The opportunity returns to its prior commercial baseline. Decision is immutable."
                : "Returns the request to the owner with comments. The request stays open until the owner revises and resubmits."}
              </p>
            </div>
            <span className="id mono">{req.id}</span>
          </div>

          <div className="body">
            <dl className="snap">
              <dt>Opportunity</dt><dd>{req.oppId} · {req.oppTitle.length>32?req.oppTitle.slice(0,32)+"…":req.oppTitle}</dd>
              <dt>Account</dt><dd>{req.accountId} · {req.account}</dd>
              <dt>Type</dt><dd>{req.kindLabel}</dd>
              <dt>Requested</dt><dd>{req.change}</dd>
              <dt>Amount</dt><dd>{fmtMoney(req.amount)}</dd>
              <dt>Submitted</dt><dd>{req.submittedBy} · {req.submittedAt}</dd>
              <dt>Routes</dt><dd>Finance · D. Smirnova → Legal · O. Markov</dd>
            </dl>

            <div className="modal-field">
              <label>
                <span>Decision comment <span className="req">*</span></span>
                <span className="mono" style={{fontSize:10.5,color:"var(--muted)"}}>{comment.length} · min 10 chars</span>
              </label>
              <div className={`ctl ${err?"err":""}`}>
                <textarea
                  value={comment}
                  onChange={e=>setComment(e.target.value)}
                  onBlur={()=>setTouched(true)}
                  placeholder={kind === "approve"
                    ? "e.g. Within policy — competitor offer evidence on file. Discount preserves margin floor."
                    : kind === "reject"
                    ? "e.g. Discount exceeds policy band for this region/risk. Reduce to 6% and resubmit if needed."
                    : "e.g. Attach historic payment record and signed NDA, then resubmit with updated justification."} />
              </div>
              {err && <div className="err-msg"><span className="x">!</span>Comment is required (at least 10 characters). Approvers cannot decide silently — this is logged to the audit trail.</div>}
              <div className="quick-reasons">
                {conf.reasons.map((r,i)=>(<span key={i} className="qr" onClick={()=>{ setComment(c => c ? c + " · " + r : r); setTouched(true); }}>+ {r}</span>))}
              </div>
            </div>

            {kind === "approve" && (
              <div style={{fontSize:11.5,color:"var(--info)",background:"var(--info-soft)",border:"1px solid #A4C0C8",padding:"7px 10px",borderRadius:3}}>
                <span className="mono" style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",marginRight:6,color:"var(--info)"}}>Next</span>
                Approval hands the request to <span className="mono">Legal · O. Markov</span> for step 03 of the chain.
              </div>
            )}
            {kind === "reject" && (
              <div style={{fontSize:11.5,color:"var(--neg)",background:"var(--neg-soft)",border:"1px solid #D6B0A8",padding:"7px 10px",borderRadius:3}}>
                <span className="mono" style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",marginRight:6,color:"var(--neg)"}}>Effect</span>
                The opportunity returns to its prior commercial baseline. Owner is notified. Decision is immutable.
              </div>
            )}
            {kind === "sendback" && (
              <div style={{fontSize:11.5,color:"var(--info)",background:"var(--info-soft)",border:"1px solid #A4C0C8",padding:"7px 10px",borderRadius:3}}>
                <span className="mono" style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",marginRight:6,color:"var(--info)"}}>Effect</span>
                The request stays open. Owner sees your comment in their workspace and may revise and resubmit.
              </div>
            )}
          </div>
          <div className="foot">
            <span className="hint">DECISION AUDITED · COMMENT IMMUTABLE</span>
            <div style={{display:"flex",gap:8}}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className={`btn ${conf.btn} btn-lg`} onClick={()=>{
                setTouched(true);
                if(empty) return;
                onConfirm(comment);
              }}>{conf.btnLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── Access boundary banner ─────────── */

function AccessBox({ user, onSwitch }){
  return (
    <div className="accbox">
      <div className="mk mono">i</div>
      <div>
        <div className="t">Approval context only — you are not editing the opportunity</div>
        <div className="s">
          {user.roleCode === "FIN"
            ? <>You see only the deal context needed to decide on this approval. You can <strong>Approve</strong>, <strong>Send Back</strong> or <strong>Reject</strong> for the Finance step only. <strong>Legal</strong> steps are locked for you and decided by <span className="mono">O. Markov</span>.</>
            : <>You see only the deal context needed to decide on this approval. Legal decisions only become active after <strong>Finance</strong> has approved the request — earlier rows are read-only.</>}
        </div>
      </div>
      <button className="btn btn-sm" onClick={onSwitch}>View as {user.roleCode === "FIN" ? "Legal · O. Markov" : "Finance · D. Smirnova"} ›</button>
    </div>
  );
}

/* ─────────── App ─────────── */

function App(){
  const [roleKey, setRoleKey] = useState("fin");
  const user = APPROVERS[roleKey];

  const [view, setView] = useState("pending");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [sla, setSla] = useState("");
  const [prio, setPrio] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState("REQ-1182");
  const [decisionKind, setDecisionKind] = useState(null);
  const [decisions, setDecisions] = useState({});   /* local mock of new decisions */
  const [toast, setToast] = useState(null);
  const [toastKind, setToastKind] = useState("ok");

  /* effective rows after applying local decisions */
  const allRows = useMemo(()=>{
    return REQUESTS.map(r=>{
      const d = decisions[r.id];
      if(!d) return r;
      if(d.kind === "approve"){
        return {...r, decided:true, status:"approved", decidedBy:user.name.split(" ").map(s=>s[0]).join(". ")+".",
                decidedAt: new Date().toISOString().replace("T"," ").slice(0,16), step:"DONE"};
      }
      if(d.kind === "reject"){
        return {...r, decided:true, status:"rejected", decidedBy:user.name.split(" ").map(s=>s[0]).join(". ")+".",
                decidedAt: new Date().toISOString().replace("T"," ").slice(0,16), step:"DONE"};
      }
      if(d.kind === "sendback"){
        return {...r, status:"sentback", sentbackNote:d.comment};
      }
      return r;
    });
  }, [decisions, user.name]);

  /* saved view counts */
  const viewCounts = useMemo(()=>{
    const out = {};
    SAVED_VIEWS[roleKey].forEach(v=>{ out[v.key] = allRows.filter(v.test).length; });
    return out;
  }, [allRows, roleKey]);

  /* filtered rows */
  const rows = useMemo(()=>{
    const v = SAVED_VIEWS[roleKey].find(x=>x.key===view) || SAVED_VIEWS[roleKey][0];
    return allRows.filter(r=>{
      if(v && !v.test(r)) return false;
      if(q){
        const s = (r.id + " " + r.oppId + " " + r.oppTitle + " " + r.account).toLowerCase();
        if(!s.includes(q.toLowerCase())) return false;
      }
      if(type && r.kind !== type) return false;
      if(sla && r.sla.state !== sla) return false;
      if(prio && r.priority !== prio) return false;
      if(status && r.status !== status) return false;
      if(amount){
        const min = parseInt(amount) * 1000;
        if(r.amount < min) return false;
      }
      return true;
    });
  }, [allRows, view, q, type, sla, prio, amount, status, roleKey]);

  /* keep selection valid */
  useEffect(()=>{
    if(rows.length && !rows.find(r=>r.id===selectedId)){
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  const selected = allRows.find(r=>r.id===selectedId);

  function flashToast(text, kind="ok"){
    setToast(text); setToastKind(kind);
    setTimeout(()=>setToast(null), 2800);
  }

  function onAct(kind){
    setDecisionKind(kind);
  }
  function onConfirm(comment){
    if(!selected) return;
    setDecisions(d => ({...d, [selected.id]: { kind: decisionKind, comment } }));
    const msg = decisionKind === "approve" ? `Approved ${selected.id} · routed to Legal · O. Markov`
              : decisionKind === "reject"  ? `Rejected ${selected.id} · owner notified · decision audited`
              : `Sent back ${selected.id} · A. Petrova notified to revise`;
    flashToast(msg);
    setDecisionKind(null);
  }
  function onMore(kind){
    if(kind === "copy") flashToast(`Link to ${selected?.id} copied`);
    else if(kind === "detail") flashToast(`Would open ${selected?.oppId} detail in approval-context mode`);
    else if(kind === "info") flashToast(`Question routed to ${selected?.submittedBy}`);
  }

  return (
    <div className="app" data-screen-label="05 Approver Inbox">
      <Sidebar user={user} />
      <div className="main">
        <TopBar user={user} selectedReq={selected} />

        <div className="content" data-screen-label="05 Approver Inbox">
          <div className="page-head">
            <div style={{minWidth:0}}>
              <h1 className="page-title">
                Approver inbox
                <Pill kind={user.roleCode==="FIN"?"pending":"sentback"}>{user.role}</Pill>
              </h1>
              <div className="page-sub">
                <span className="mono">{user.roleCode}</span>
                <span className="sep">/</span>
                <span>{user.name}</span>
                <span className="sep">·</span>
                <span>Orion Industrial · Local Pilot</span>
                <span className="sep">·</span>
                <span className="mono">approver scope · {user.roleCode==="FIN"?"finance step":"legal step"}</span>
              </div>
            </div>
            <div className="page-actions">
              <div className="scenario" role="radiogroup" aria-label="Role view">
                <span className="scenario-label">View as</span>
                <button className={`scenario-opt ${roleKey==="fin"?"on":""}`} onClick={()=>{ setRoleKey("fin"); setSelectedId("REQ-1182"); }}>
                  Finance · D. Smirnova
                </button>
                <button className={`scenario-opt ${roleKey==="leg"?"on":""}`} onClick={()=>{ setRoleKey("leg"); setSelectedId("REQ-1180"); }}>
                  Legal · O. Markov
                </button>
              </div>
              <button className="btn">Export queue</button>
            </div>
          </div>

          <AccessBox user={user} onSwitch={()=>{ setRoleKey(roleKey === "fin" ? "leg" : "fin"); setSelectedId(roleKey === "fin" ? "REQ-1180" : "REQ-1182"); }} />

          <KPIs user={user} rows={allRows} />
          <ViewsRow user={user} active={view} onPick={setView} counts={viewCounts} />
          <FiltersRow
            q={q} setQ={setQ}
            type={type} setType={setType}
            sla={sla} setSla={setSla}
            prio={prio} setPrio={setPrio}
            amount={amount} setAmount={setAmount}
            status={status} setStatus={setStatus}
            user={user}
          />

          <div className="work">
            <Queue rows={rows} selectedId={selectedId} onSelect={setSelectedId} totalRows={allRows.length} user={user} />
            <Preview req={selected} user={user} onAct={onAct} onMore={onMore} />
          </div>

          <div className="foot-ruler">
            <span>SALES OPS CRM · ORION INDUSTRIAL · LOCAL PILOT</span>
            <span>USER {user.roleCode} · {user.initials} · APPROVER SCOPE</span>
            <span>POLICY v18 · METADATA v42 · SHELL v2.4</span>
          </div>
        </div>
      </div>

      {decisionKind && selected && (
        <DecisionModal
          req={selected}
          kind={decisionKind}
          onClose={()=>setDecisionKind(null)}
          onConfirm={onConfirm}
        />
      )}

      {toast && (
        <div className="toast"><span className={toastKind === "err" ? "err" : "ok"}>{toastKind === "err" ? "!" : "✓"}</span>{toast}</div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
