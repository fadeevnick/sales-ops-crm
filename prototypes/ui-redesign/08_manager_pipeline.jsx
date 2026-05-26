/* eslint-disable */
const { useState, useMemo, useEffect } = React;

/* ─────────── Shell data ─────────── */

const MODULES = [
  { key:"dashboard",  code:"DA", label:"Dashboard",      section:"workspace" },
  { key:"accounts",   code:"AC", label:"Accounts",       section:"workspace", count:412 },
  { key:"contacts",   code:"CO", label:"Contacts",       section:"workspace", count:1843 },
  { key:"opps",       code:"OP", label:"Opportunities",  section:"workspace", count:46 },
  { key:"approvals",  code:"AP", label:"Approvals",      section:"governance", count:7 },
  { key:"imports",    code:"IM", label:"Imports",        section:"data",      disabled:true },
  { key:"duplicates", code:"DU", label:"Duplicates",     section:"data",      disabled:true },
  { key:"metadata",   code:"MA", label:"Metadata Admin", section:"data",      disabled:true },
  { key:"reports",    code:"RE", label:"Reports",        section:"insights" },
  { key:"audit",      code:"AU", label:"Audit",          section:"insights",  disabled:true },
];
const SECTIONS = [
  { key:"workspace",  label:"Workspace",       index:"01" },
  { key:"governance", label:"Governance",      index:"02" },
  { key:"data",       label:"Data & Quality",  index:"03" },
  { key:"insights",   label:"Insights",        index:"04" },
];

const USER = { name:"Michael Chen", role:"Sales Manager", initials:"MC", color:"bg-b", roleCode:"MGR" };

/* ─────────── Pipeline data ─────────── */

const TEAM = [
  { id:"u1", name:"Anna Petrova",  initials:"AP", color:"bg-c", opps:12, pipeline:1430000, weighted:612000, pendingAppr:3, overdueAct:3, closing:4 },
  { id:"u2", name:"Jonas Berg",    initials:"JB", color:"bg-a", opps:14, pipeline:1820000, weighted:780000, pendingAppr:2, overdueAct:4, closing:5 },
  { id:"u3", name:"Eva Vogel",     initials:"EV", color:"bg-e", opps:9,  pipeline:920000,  weighted:380000, pendingAppr:1, overdueAct:2, closing:3 },
  { id:"u4", name:"Mark Weber",    initials:"MW", color:"bg-f", opps:11, pipeline:1240000, weighted:520000, pendingAppr:1, overdueAct:2, closing:2 },
];

const OPPS = [
  {
    id:"OPP-2418", title:"Q3 Equipment Renewal",
    account:"Acme Manufacturing",   accountId:"AC-3318",
    ownerKey:"u1", owner:"Anna Petrova",
    stage:"Proposal", stageCode:"P", stageIdx:2,
    amount:145000, close:"2026-06-12",
    approval:"pending", approvalLabel:"Pending Finance", approvalId:"REQ-1182",
    risk:"sla",  riskLabel:"SLA at risk · 23h left",
    nextActivity:"Awaiting finance approval · REQ-1182",
    notes:"Strategic renewal. Competitor (Sigma Castings) offered 9% rebate. Discount exception in Finance queue — SLA runs out tomorrow.",
    contact:"Taylor Brooks, VP Operations",
  },
  {
    id:"OPP-2410", title:"Nordwerk Plant Retooling",
    account:"Nordwerk Tooling AG",  accountId:"AC-3302",
    ownerKey:"u1", owner:"Anna Petrova",
    stage:"Negotiation", stageCode:"N", stageIdx:3,
    amount:412500, close:"2026-05-30",
    approval:"pending", approvalLabel:"Pending Finance", approvalId:"REQ-1186",
    risk:"close", riskLabel:"Closing in 13 days · approval pending",
    nextActivity:"Confirm payment terms with customer",
    notes:"Customer treasury policy requires NET-60 terms. Terms exception in Finance queue. Close date is firm — needs fast decision.",
    contact:"B. Kessler, CFO",
  },
  {
    id:"OPP-2502", title:"Sigma Castings Capital Order",
    account:"Sigma Castings GmbH",  accountId:"AC-3140",
    ownerKey:"u2", owner:"Jonas Berg",
    stage:"Proposal", stageCode:"P", stageIdx:2,
    amount:580000, close:"2026-05-29",
    approval:"overdue", approvalLabel:"Approval overdue", approvalId:"REQ-1190",
    risk:"overdue", riskLabel:"SLA breach · 5h past Finance deadline",
    nextActivity:"Escalate — approval overdue, customer waiting",
    notes:"Largest Q3 deal. Finance SLA breached 5h ago. Jonas needs to escalate. Customer has given a deadline of EOD today.",
    contact:"K. Lindqvist, Plant Director",
  },
  {
    id:"OPP-2360", title:"Vetra Logistics Pricing Model",
    account:"Vetra Logistics OÜ",   accountId:"AC-3198",
    ownerKey:"u3", owner:"Eva Vogel",
    stage:"Proposal", stageCode:"P", stageIdx:2,
    amount:192000, close:"2026-06-28",
    approval:"legal", approvalLabel:"Legal Review", approvalId:"REQ-1180",
    risk:"none", riskLabel:"—",
    nextActivity:"Legal review in progress · O. Markov",
    notes:"Indemnity language carve-out under legal review. Oleg Markov handling. Expected to clear this week. Eva monitoring.",
    contact:"T. Kallas, COO",
  },
  {
    id:"OPP-2170", title:"Schwarz Maschinenbau Renewal",
    account:"Schwarz Maschinenbau", accountId:"AC-3098",
    ownerKey:"u4", owner:"Mark Weber",
    stage:"Negotiation", stageCode:"N", stageIdx:3,
    amount:204000, close:"2026-05-20",
    approval:"approved", approvalLabel:"Approved", approvalId:"REQ-1170",
    risk:"none", riskLabel:"—",
    nextActivity:"Send final contract — on track",
    notes:"Finance approved 9% discount. Standard terms. Contract being prepared. Closing on track for 2026-05-20.",
    contact:"F. Braun, Procurement",
  },
  {
    id:"OPP-2385", title:"Carpathia Steel NET-90 Terms",
    account:"Carpathia Steel S.A.", accountId:"AC-3242",
    ownerKey:"u1", owner:"Anna Petrova",
    stage:"Negotiation", stageCode:"N", stageIdx:3,
    amount:264000, close:"2026-05-22",
    approval:"sentback", approvalLabel:"Sent Back", approvalId:"REQ-1175",
    risk:"stuck", riskLabel:"Stuck 22d · owner must resubmit",
    nextActivity:"Anna must revise and resubmit REQ-1175",
    notes:"Finance sent back — justification insufficient. Needs payment record + NDA. Anna has not yet resubmitted. Close date slipped 8 days.",
    contact:"M. Horvat, CFO",
  },
  {
    id:"OPP-2298", title:"Renvik Industri Pilot to Prod.",
    account:"Renvik Industri AB",   accountId:"AC-3071",
    ownerKey:"u3", owner:"Eva Vogel",
    stage:"Discovery", stageCode:"D", stageIdx:1,
    amount:118000, close:"2026-08-20",
    approval:"none", approvalLabel:"—", approvalId:null,
    risk:"nonext", riskLabel:"No next step · 18d idle",
    nextActivity:"No activity logged — schedule follow-up",
    notes:"Promising discovery — pilot went well. No follow-up activity logged in 18 days. Eva needs to schedule next step or close/qualify out.",
    contact:"J. Lindqvist, VP Ops",
  },
];

const SAVED_VIEWS = [
  { key:"all",      label:"Team Open Pipeline",  test:()=>true },
  { key:"closing",  label:"Closing This Month",  test:o=>["2026-05","2026-06"].some(m=>o.close.startsWith(m)) },
  { key:"approval", label:"Pending Approval",    test:o=>["pending","overdue","legal","sentback"].includes(o.approval) },
  { key:"stuck",    label:"Stuck Deals",         test:o=>["stuck","overdue"].includes(o.risk) },
  { key:"nonext",   label:"No Next Step",        test:o=>o.risk==="nonext" },
];

/* ─────────── Helpers ─────────── */

function fmtMoney(n){ return n>=1_000_000?`$${(n/1_000_000).toFixed(2)}M`:n>=1_000?`$${(n/1_000).toFixed(0)}K`:`$${n}`; }

function Pill({ kind, children }){
  return <span className={`pill p-${kind}`}><span className="pdot"></span>{children}</span>;
}
function StagePip({ idx }){
  return (
    <span className="stage-pip">
      {["Q","D","P","N","W"].map((s,i)=><i key={s} className={i<=idx?i===idx?"flag":"on":""} />)}
    </span>
  );
}
function BrandMark(){ return <span className="brand-mark" aria-hidden />; }

function approvalPillKind(a){
  return a==="approved"?"approved":a==="pending"?"pending":a==="overdue"?"rejected":a==="legal"?"sentback":a==="sentback"?"sentback":"none";
}
function riskColor(r){
  if(r==="overdue") return { c:"var(--neg)", bg:"var(--neg-soft)", b:"#D6B0A8" };
  if(r==="stuck"||r==="sla") return { c:"var(--warn)", bg:"var(--warn-soft)", b:"#E2C887" };
  if(r==="close") return { c:"var(--accent-2)", bg:"var(--accent-soft)", b:"#D9BFA0" };
  if(r==="nonext") return { c:"var(--muted)", bg:"var(--paper-2)", b:"var(--line)" };
  return null;
}

/* ─────────── Sidebar ─────────── */

function Sidebar(){
  const counts = { accounts:412, contacts:1843, opps:46, approvals:7, reports:0 };
  return (
    <aside className="sidebar">
      <div className="brand"><BrandMark /><div className="brand-name">Sales Ops CRM<span>v2.4</span></div></div>
      <div className="tenant">
        <div className="tenant-label">Tenant</div>
        <div className="tenant-row"><div className="tenant-name">Orion Industrial</div><div className="tenant-env mono">LOCAL PILOT</div></div>
        <div className="tenant-meta"><span className="mono">EU-CENTRAL-1</span><span className="dot">·</span><span>184 seats</span></div>
      </div>
      <nav className="nav">
        {SECTIONS.map(sec=>{
          const items = MODULES.filter(m=>m.section===sec.key);
          return (
            <div key={sec.key} className="nav-section">
              <div className="nav-title">{sec.label}<em>{sec.index}</em></div>
              {items.map(m=>{
                const c=counts[m.key];
                const alert=(m.key==="approvals"&&c>0)||(m.key==="opps"&&c>0);
                return (
                  <div key={m.key} className={`nav-item ${m.key==="opps"?"active":""} ${m.disabled?"disabled":""}`} title={m.label}>
                    <span className="nav-mark mono">{m.code}</span>
                    <span className="nav-label">{m.label}</span>
                    <span className={`nav-count mono ${alert?"alert":""}`}>{c||""}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="user-block">
        <div className={`avatar ${USER.color}`}>{USER.initials}</div>
        <div className="user-meta"><div className="user-name">{USER.name}</div><div className="user-role">{USER.role}</div></div>
        <button className="switch-btn">Switch</button>
      </div>
    </aside>
  );
}

/* ─────────── TopBar ─────────── */

function TopBar({ title }){
  return (
    <div className="topbar">
      <div className="crumb">
        <span className="pulse"><span className="pulse-dot" /> LOCAL PILOT</span>
        <span>Opportunities</span>
        <span className="sep">/</span>
        <strong>Team pipeline</strong>
        <span className="sep">·</span>
        <span className="mono" style={{fontSize:11,color:"var(--muted)"}}>DACH-North · 4 reps</span>
      </div>
      <label className="search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="m11 11 3.5 3.5"/></svg>
        <input placeholder="Search opportunities, accounts, reps…" />
        <kbd>⌘K</kbd>
      </label>
      <div className="top-actions">
        <button className="icon-btn" aria-label="Notifications">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3.5 12h9l-1-1.5V7a3.5 3.5 0 0 0-7 0v3.5L3.5 12Z"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/></svg>
          <span className="dot-badge mono">7</span>
        </button>
        <button className="role-pill">
          <span className={`avatar ${USER.color}`}>{USER.initials}</span>
          <span className="who"><b>{USER.name.split(" ")[0]} {USER.name.split(" ")[1][0]}.</b><span>{USER.role}</span></span>
          <span className="chev">▾</span>
        </button>
      </div>
    </div>
  );
}

/* ─────────── KPI strip ─────────── */

function KPIStrip(){
  const kpis = [
    { label:"Team pipeline",    value:"$3.84M", foot:"Weighted $2.29M · vs commit $2.1M", delta:"+3.1%", dir:"up" },
    { label:"Open opportunities",value:"46",    foot:"DACH-North · 4 reps",              delta:"+2 wk", dir:"up" },
    { label:"Closing this month",value:"14",    foot:"$1.16M at risk of slipping",        delta:null, alert:false },
    { label:"Pending approvals", value:"7",     foot:"4 Finance · 3 Legal · 1 overdue",   delta:"+2", dir:"up", alert:true },
    { label:"Overdue activities",value:"11",    foot:"Anna ×3 · Jonas ×4 · Eva ×2 · Mark ×2", delta:"-3", dir:"dn", warn:true },
    { label:"Approval SLA breach",value:"1",   foot:"REQ-1190 · Jonas Berg · Sigma Castings", delta:null, alert:true },
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",border:"1px solid var(--line)",background:"var(--white)",marginBottom:12}}>
      {kpis.map((k,i)=>(
        <div key={i} style={{padding:"12px 14px",borderRight:i<5?"1px solid var(--hairline)":"none"}}>
          <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>{k.label}</span>
            {k.delta && <span className="mono" style={{letterSpacing:0,textTransform:"none",fontSize:10.5,color:k.dir==="up"?"var(--pos)":"var(--neg)"}}>{k.dir==="up"?"▲":"▼"} {k.delta}</span>}
          </div>
          <div className="mono" style={{fontSize:22,fontWeight:600,marginTop:4,color:k.alert?"var(--neg)":k.warn?"var(--accent-2)":"var(--ink)"}}>{k.value}</div>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{k.foot}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────── Team scope notice ─────────── */

function TeamScopeNotice(){
  return (
    <div style={{
      background:"var(--info-soft)",border:"1px solid #A4C0C8",borderLeft:"3px solid var(--info)",
      padding:"9px 14px",display:"flex",alignItems:"center",gap:12,marginBottom:12,flexWrap:"wrap",fontSize:12
    }}>
      <div style={{width:22,height:22,borderRadius:"50%",background:"var(--white)",border:"1px solid var(--info)",display:"grid",placeItems:"center",flexShrink:0,fontFamily:'"JetBrains Mono",monospace',fontSize:10,fontWeight:700,color:"var(--info)"}}>i</div>
      <div style={{flex:1}}>
        <span style={{fontWeight:600}}>Team scope: DACH-North</span>
        <span style={{color:"var(--ink-2)",marginLeft:8}}>You see opportunities owned by your direct reports — Anna Petrova, Jonas Berg, Eva Vogel, Mark Weber. Full tenant visibility requires RevOps or Executive role.</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,fontFamily:'"JetBrains Mono",monospace',fontSize:10.5,color:"var(--info)"}}>
        <span>4 reps · 46 opps · $3.84M pipeline</span>
        <span style={{color:"var(--line-2)"}}>·</span>
        <span style={{color:"var(--muted)"}}>Approval visibility: monitor only — cannot decide Finance / Legal steps</span>
      </div>
    </div>
  );
}

/* ─────────── Saved views + Filters ─────────── */

function SavedViews({ active, onSet, counts }){
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:8}}>
      <span style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--muted)",marginRight:4}}>Saved views</span>
      {SAVED_VIEWS.map(v=>(
        <button key={v.key} className={`view-chip ${active===v.key?"active":""}`} onClick={()=>onSet(v.key)}>
          {v.label} <span className="ct mono">{counts[v.key]||0}</span>
        </button>
      ))}
      <span style={{flex:1}}/>
      <button className="btn btn-ghost btn-sm">+ Save view</button>
    </div>
  );
}

function FiltersRow({ owner, setOwner, stage, setStage, approval, setApproval, risk, setRisk, search, setSearch }){
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 130px 110px auto",gap:8,marginBottom:10}}>
      <label className="field-ctl">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="m11 11 3.5 3.5"/></svg>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search opportunity, account, owner…" />
      </label>
      <label className="field-ctl">
        <span className="lbl">Owner</span>
        <select value={owner} onChange={e=>setOwner(e.target.value)}>
          <option value="">All</option>
          {TEAM.map(t=><option key={t.id} value={t.id}>{t.name.split(" ")[0]}</option>)}
        </select>
        <span className="chev">▾</span>
      </label>
      <label className="field-ctl">
        <span className="lbl">Stage</span>
        <select value={stage} onChange={e=>setStage(e.target.value)}>
          <option value="">All</option>
          {["Qualification","Discovery","Proposal","Negotiation"].map(s=><option key={s}>{s}</option>)}
        </select>
        <span className="chev">▾</span>
      </label>
      <label className="field-ctl">
        <span className="lbl">Approval</span>
        <select value={approval} onChange={e=>setApproval(e.target.value)}>
          <option value="">Any</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="legal">Legal</option>
          <option value="sentback">Sent Back</option>
          <option value="approved">Approved</option>
          <option value="none">None</option>
        </select>
        <span className="chev">▾</span>
      </label>
      <label className="field-ctl">
        <span className="lbl">Risk</span>
        <select value={risk} onChange={e=>setRisk(e.target.value)}>
          <option value="">Any</option>
          <option value="overdue">Overdue</option>
          <option value="stuck">Stuck</option>
          <option value="sla">SLA at risk</option>
          <option value="close">Closing soon</option>
          <option value="nonext">No next step</option>
        </select>
        <span className="chev">▾</span>
      </label>
      <span className="lock-chip mono" title="Manager scope — DACH-North team only">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2.5" y="5.5" width="7" height="5" rx="0.5"/><path d="M4 5.5V3.8a2 2 0 1 1 4 0V5.5"/></svg>
        MGR · DACH-N
      </span>
    </div>
  );
}

/* ─────────── Pipeline table ─────────── */

function PipelineTable({ rows, selectedId, onSelect }){
  return (
    <section className="panel" style={{flex:1}}>
      <div className="panel-head">
        <div className="panel-title">Team pipeline <em>{rows.length}</em></div>
        <div className="panel-actions">
          <span className="filterchip on mono">SORTED · RISK ↑</span>
          <a>Export</a>
          <a>Columns</a>
        </div>
      </div>
      {rows.length===0 ? (
        <div style={{padding:"48px 24px",textAlign:"center",color:"var(--muted)",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,border:"1px dashed var(--line-2)",display:"grid",placeItems:"center",fontFamily:'"JetBrains Mono",monospace',fontSize:10,color:"var(--muted-2)"}}>OP</div>
          <div style={{fontWeight:500,color:"var(--ink)",fontSize:13.5}}>No opportunities match this view</div>
          <div>Try a different saved view or clear one of the active filters.</div>
        </div>
      ) : (
        <div style={{overflowX:"auto"}}>
        <table className="t" style={{minWidth:1060}}>
          <colgroup>
            <col style={{width:200}}/><col style={{width:160}}/><col style={{width:100}}/>
            <col style={{width:90}}/><col style={{width:80}}/><col style={{width:90}}/>
            <col style={{width:130}}/><col/><col style={{width:140}}/>
          </colgroup>
          <thead><tr>
            <th>Opportunity</th><th>Account</th><th>Owner</th>
            <th>Stage</th><th className="num">Amount</th><th>Close</th>
            <th>Approval</th><th>Next step</th><th>Risk signal</th>
          </tr></thead>
          <tbody>
            {rows.map(o=>{
              const rc = riskColor(o.risk);
              const isOverdue = o.risk==="overdue";
              return (
                <tr key={o.id}
                  className={`${selectedId===o.id?"selected":""} ${isOverdue?"over":""}`}
                  onClick={()=>onSelect(o.id===selectedId?null:o.id)}
                  style={{cursor:"pointer"}}
                >
                  <td>
                    <div style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.title}</div>
                    <span style={{display:"block",fontSize:11,color:"var(--muted)",fontFamily:'"JetBrains Mono",monospace'}}>{o.id}</span>
                  </td>
                  <td>
                    <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.account}</div>
                    <span style={{display:"block",fontSize:11,color:"var(--muted)",fontFamily:'"JetBrains Mono",monospace'}}>{o.accountId}</span>
                  </td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {(() => { const t=TEAM.find(x=>x.id===o.ownerKey); return t ? <div className={`avatar ${t.color}`} style={{width:20,height:20,fontSize:8,flexShrink:0}}>{t.initials}</div> : null; })()}
                      <span style={{fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{o.owner.split(" ")[0]}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <StagePip idx={o.stageIdx} />
                      <span style={{fontSize:12,color:"var(--muted)"}}>{o.stageCode}</span>
                    </div>
                  </td>
                  <td className="num mono" style={{fontWeight:600}}>{fmtMoney(o.amount)}</td>
                  <td className="mono" style={{fontSize:11.5}}>{o.close}</td>
                  <td>
                    {o.approval==="none"
                      ? <span style={{color:"var(--muted)",fontSize:12}}>—</span>
                      : <Pill kind={approvalPillKind(o.approval)}>{o.approvalLabel}</Pill>
                    }
                  </td>
                  <td>
                    <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12,color:"var(--ink-2)"}}>{o.nextActivity}</div>
                  </td>
                  <td>
                    {rc
                      ? <span style={{fontSize:10.5,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".03em",color:rc.c,background:rc.bg,border:`1px solid ${rc.b}`,padding:"2px 6px",borderRadius:2,whiteSpace:"nowrap"}}>{o.riskLabel}</span>
                      : <span style={{color:"var(--muted)",fontSize:12}}>—</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </section>
  );
}

/* ─────────── Opportunity side panel ─────────── */

function OppSidePanel({ opp, onManagerAction }){
  if(!opp){
    return (
      <div className="panel side-panel" style={{display:"flex",flexDirection:"column"}}>
        <div className="panel-head"><div className="panel-title">Opportunity detail</div></div>
        <div style={{padding:"36px 16px",textAlign:"center",color:"var(--muted)",display:"flex",flexDirection:"column",alignItems:"center",gap:10,flex:1}}>
          <div style={{width:40,height:40,border:"1px dashed var(--line-2)",display:"grid",placeItems:"center",fontFamily:'"JetBrains Mono",monospace',fontSize:10,color:"var(--muted-2)"}}>OP</div>
          <div style={{fontWeight:500,color:"var(--ink)",fontSize:13}}>Select an opportunity</div>
          <div style={{fontSize:12.5,lineHeight:1.6,maxWidth:250}}>Click any row to see deal context, approval status, and manager actions.</div>
        </div>
        {/* Risk summary when nothing selected */}
        <div style={{borderTop:"1px solid var(--hairline)",padding:"12px 14px"}}>
          <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:10}}>Risk summary</div>
          {[
            { label:"Overdue approval", count:1, c:"var(--neg)",      bg:"var(--neg-soft)" },
            { label:"Stuck > 14 days",  count:2, c:"var(--warn)",     bg:"var(--warn-soft)" },
            { label:"No next step",     count:1, c:"var(--muted)",    bg:"var(--paper-2)" },
            { label:"SLA at risk",      count:1, c:"var(--accent-2)", bg:"var(--accent-soft)" },
          ].map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<3?"1px solid var(--hairline)":"none"}}>
              <span style={{fontSize:12.5}}>{r.label}</span>
              <span style={{fontSize:13,fontWeight:700,fontFamily:'"JetBrains Mono",monospace',color:r.c,background:r.bg,padding:"1px 8px",borderRadius:2}}>{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const rc = riskColor(opp.risk);
  const t = TEAM.find(x=>x.id===opp.ownerKey);
  return (
    <div className="panel side-panel">
      {/* header */}
      <div style={{padding:"12px 14px",borderBottom:"1px solid var(--hairline)",background:"var(--paper-2)"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:6}}>
          <span className="mono" style={{fontSize:11,color:"var(--muted)",letterSpacing:".06em"}}>{opp.id}</span>
          {opp.approval!=="none"
            ? <Pill kind={approvalPillKind(opp.approval)}>{opp.approvalLabel}</Pill>
            : <span style={{fontSize:12,color:"var(--muted)"}}>No approval</span>}
        </div>
        <div style={{fontWeight:600,fontSize:14.5,letterSpacing:"-.01em",lineHeight:1.25,marginBottom:5}}>{opp.title}</div>
        <div style={{fontSize:12,color:"var(--muted)"}}>{opp.account} · {opp.contact}</div>
        {rc && (
          <div style={{marginTop:8,padding:"6px 10px",background:rc.bg,border:`1px solid ${rc.b}`,fontSize:12,color:rc.c,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".03em"}}>
            ⚠ {opp.riskLabel}
          </div>
        )}
      </div>

      {/* key fields */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid var(--hairline)"}}>
        {[
          ["Amount",    fmtMoney(opp.amount), "mono-bold"],
          ["Close",     opp.close,            "mono"],
          ["Stage",     opp.stage,            ""],
          ["Owner",     opp.owner,            ""],
        ].map(([l,v,t],i)=>(
          <div key={i} style={{padding:"9px 12px",borderRight:i%2===0?"1px solid var(--hairline)":"none",borderBottom:i<2?"1px solid var(--hairline)":"none"}}>
            <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:3}}>{l}</div>
            <div className={t==="mono"||t==="mono-bold"?"mono":""} style={{fontSize:t==="mono-bold"?15:12.5,fontWeight:t==="mono-bold"?700:500}}>{v}</div>
          </div>
        ))}
      </div>

      {/* next step */}
      <div style={{padding:"9px 12px",borderBottom:"1px solid var(--hairline)"}}>
        <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:3}}>Next step</div>
        <div style={{fontSize:12.5,color:"var(--ink-2)"}}>{opp.nextActivity}</div>
      </div>

      {/* approval link */}
      {opp.approvalId && (
        <div style={{padding:"9px 12px",borderBottom:"1px solid var(--hairline)",background:"var(--warn-soft)"}}>
          <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:3}}>Linked approval request</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span className="mono" style={{fontSize:12.5,fontWeight:600}}>{opp.approvalId}</span>
            <button className="btn btn-ghost btn-sm">View ›</button>
          </div>
          <div style={{fontSize:11.5,color:"var(--muted)",marginTop:2}}>Manager visibility only — cannot decide Finance / Legal steps</div>
        </div>
      )}

      {/* notes */}
      <div style={{padding:"10px 12px",borderBottom:"1px solid var(--hairline)"}}>
        <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:5}}>Manager context</div>
        <div style={{fontSize:12.5,color:"var(--ink-2)",lineHeight:1.6,padding:"8px 10px",background:"var(--paper-2)",borderLeft:"2px solid var(--line-2)"}}>{opp.notes}</div>
      </div>

      {/* manager actions */}
      <div style={{padding:"12px 14px"}}>
        <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:8}}>Manager actions</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <button className="btn btn-primary btn-sm" style={{justifyContent:"center"}} onClick={()=>onManagerAction("reassign",opp)}>→ Reassign owner</button>
          <button className="btn btn-sm" style={{justifyContent:"center"}} onClick={()=>onManagerAction("note",opp)}>✎ Add manager note</button>
          <div style={{display:"flex",gap:6}}>
            <button className="btn btn-sm" style={{flex:1,justifyContent:"center"}} onClick={()=>onManagerAction("update",opp)}>↻ Request update</button>
            <button className="btn btn-ghost btn-sm" style={{flex:1,justifyContent:"center"}} onClick={()=>onManagerAction("detail",opp)}>Open detail ›</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Risk panels ─────────── */

function RiskPanels({ allOpps }){
  const panels = [
    { title:"Stuck > 14 days", items: allOpps.filter(o=>["stuck","overdue"].includes(o.risk)), kind:"warn" },
    { title:"Overdue approvals", items: allOpps.filter(o=>o.approval==="overdue"), kind:"neg" },
    { title:"No next activity", items: allOpps.filter(o=>o.risk==="nonext"), kind:"muted" },
    { title:"SLA at risk", items: allOpps.filter(o=>o.risk==="sla"), kind:"warn" },
  ];
  const kindColor = { warn:"var(--warn)", neg:"var(--neg)", muted:"var(--muted)" };
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
      {panels.map((p,i)=>(
        <div key={i} className="panel">
          <div className="panel-head" style={{padding:"8px 12px"}}>
            <div className="panel-title" style={{fontSize:11}}>
              {p.title}
              <em style={{color: p.items.length>0?kindColor[p.kind]:"var(--muted)"}}>{p.items.length}</em>
            </div>
          </div>
          {p.items.length===0 ? (
            <div style={{padding:"12px",fontSize:12,color:"var(--muted)",textAlign:"center"}}>None · all clear</div>
          ) : (
            <div>
              {p.items.map((o,j)=>(
                <div key={j} style={{padding:"8px 12px",borderBottom:j<p.items.length-1?"1px solid var(--hairline)":"none"}}>
                  <div style={{fontSize:12.5,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.title}</div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:2,display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span className="mono">{o.id}</span>
                    <span style={{color:"var(--line-2)"}}>·</span>
                    <span>{o.owner.split(" ")[0]}</span>
                    <span style={{color:"var(--line-2)"}}>·</span>
                    <span className="mono">{fmtMoney(o.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────── Team summary ─────────── */

function TeamSummary(){
  return (
    <section className="panel" style={{marginBottom:14}}>
      <div className="panel-head">
        <div className="panel-title">Team · DACH-North <em>4 reps</em></div>
        <div className="panel-actions">
          <span className="mono" style={{fontSize:11,color:"var(--muted)"}}>Total pipeline $3.84M · weighted $2.29M</span>
        </div>
      </div>
      <table className="t">
        <colgroup>
          <col style={{width:160}}/><col/><col/><col/><col style={{width:110}}/><col style={{width:110}}/><col style={{width:110}}/>
        </colgroup>
        <thead><tr>
          <th>Rep</th>
          <th className="num">Open opps</th>
          <th className="num">Pipeline</th>
          <th className="num">Weighted</th>
          <th className="num">Pending approvals</th>
          <th className="num">Overdue tasks</th>
          <th className="num">Closing · month</th>
        </tr></thead>
        <tbody>
          {TEAM.map(t=>(
            <tr key={t.id} style={{cursor:"default"}}>
              <td>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div className={`avatar ${t.color}`} style={{width:22,height:22,fontSize:9,flexShrink:0}}>{t.initials}</div>
                  <span style={{fontWeight:500}}>{t.name}</span>
                </div>
              </td>
              <td className="num mono">{t.opps}</td>
              <td className="num mono">{fmtMoney(t.pipeline)}</td>
              <td className="num mono">{fmtMoney(t.weighted)}</td>
              <td className="num">
                <span className="mono" style={{color:t.pendingAppr>2?"var(--accent-2)":"inherit",fontWeight:t.pendingAppr>2?700:400}}>{t.pendingAppr}</span>
              </td>
              <td className="num">
                <span className="mono" style={{color:t.overdueAct>=4?"var(--neg)":t.overdueAct>=3?"var(--accent-2)":"inherit",fontWeight:t.overdueAct>=3?700:400}}>{t.overdueAct}</span>
              </td>
              <td className="num mono">{t.closing}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{background:"var(--paper-2)"}}>
            <td style={{fontWeight:600,fontSize:12}}>Team total</td>
            <td className="num mono" style={{fontWeight:600}}>46</td>
            <td className="num mono" style={{fontWeight:600}}>$3.84M</td>
            <td className="num mono" style={{fontWeight:600}}>$2.29M</td>
            <td className="num mono" style={{fontWeight:600,color:"var(--accent-2)"}}>7</td>
            <td className="num mono" style={{fontWeight:600,color:"var(--neg)"}}>11</td>
            <td className="num mono" style={{fontWeight:600}}>14</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

/* ─────────── Reassign modal ─────────── */

function ReassignModal({ opp, onClose, onSave }){
  const [newOwner, setNewOwner] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const err = touched && !newOwner;

  useEffect(()=>{
    const h=e=>{if(e.key==="Escape") onClose();};
    document.addEventListener("keydown",h);
    return ()=>document.removeEventListener("keydown",h);
  },[onClose]);

  function save(){
    setTouched(true);
    if(!newOwner) return;
    const rep = TEAM.find(t=>t.id===newOwner);
    onSave(rep?.name);
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog">
        <div className="modal-card" style={{width:500}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--hairline)",background:"var(--paper-2)",display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:"var(--paper-2)",border:"1.5px solid var(--ink)",display:"grid",placeItems:"center",fontSize:14,flexShrink:0}}>→</div>
            <div>
              <h3 style={{margin:0,fontSize:15,fontWeight:600}}>Reassign owner</h3>
              <p style={{margin:"2px 0 0",fontSize:12,color:"var(--muted)"}}>{opp.id} · {opp.title} · currently {opp.owner}</p>
            </div>
          </div>
          <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <label style={{fontSize:11,color:"var(--muted)",fontWeight:500,display:"block",marginBottom:5}}>
                New owner <span style={{color:"var(--accent-2)",fontFamily:'"JetBrains Mono",monospace',fontSize:10}}>*</span>
              </label>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {TEAM.filter(t=>t.id!==opp.ownerKey).map(t=>(
                  <label key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",border:`1.5px solid ${newOwner===t.id?"var(--ink)":"var(--line)"}`,background:newOwner===t.id?"var(--select)":"var(--white)",cursor:"pointer"}}>
                    <input type="radio" name="owner" value={t.id} checked={newOwner===t.id} onChange={()=>setNewOwner(t.id)} style={{accentColor:"var(--accent-2)"}} />
                    <div className={`avatar ${t.color}`} style={{width:24,height:24,fontSize:9}}>{t.initials}</div>
                    <div>
                      <div style={{fontWeight:500,fontSize:13}}>{t.name}</div>
                      <div className="mono" style={{fontSize:11,color:"var(--muted)"}}>{t.opps} open opps · pipeline {fmtMoney(t.pipeline)}</div>
                    </div>
                  </label>
                ))}
              </div>
              {err && <div style={{fontSize:11.5,color:"var(--neg)",marginTop:4}}>Select a new owner to continue</div>}
            </div>
            <div>
              <label style={{fontSize:11,color:"var(--muted)",fontWeight:500,display:"block",marginBottom:5}}>Reason / note (optional)</label>
              <div style={{border:"1px solid var(--line)",borderRadius:3,background:"var(--white)"}}>
                <textarea style={{border:0,outline:"none",padding:"8px 10px",font:"inherit",fontSize:13,color:"var(--ink)",resize:"vertical",minHeight:70,lineHeight:1.5,background:"transparent",width:"100%",display:"block"}}
                  value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Anna at capacity · Jonas has DACH-North relationship" />
              </div>
            </div>
          </div>
          <div style={{padding:"11px 18px",borderTop:"1px solid var(--hairline)",background:"var(--paper-2)",display:"flex",justifyContent:"space-between"}}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-lg" onClick={save}>Reassign owner</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── Manager note modal ─────────── */

function ManagerNoteModal({ opp, onClose, onSave }){
  const [note, setNote] = useState("");
  const TEMPLATES = ["Flag for QBR review","Escalate to executive","Needs immediate attention","Customer deadline risk","On track — monitor weekly"];
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape") onClose();};
    document.addEventListener("keydown",h);
    return ()=>document.removeEventListener("keydown",h);
  },[onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog">
        <div className="modal-card" style={{width:480}}>
          <div style={{padding:"13px 18px",borderBottom:"1px solid var(--hairline)",background:"var(--paper-2)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <h3 style={{margin:0,fontSize:14.5,fontWeight:600}}>Add manager note</h3>
              <p style={{margin:"2px 0 0",fontSize:12,color:"var(--muted)"}}>{opp.id} · {opp.title} · {opp.owner}</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{fontSize:14}}>✕</button>
          </div>
          <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:11,color:"var(--muted)",fontWeight:500}}>Note <span style={{fontSize:10.5,color:"var(--muted)",fontWeight:400}}>· visible to manager and above only</span></label>
              <div style={{border:"1px solid var(--line)",borderRadius:3,background:"var(--white)"}}>
                <textarea style={{border:0,outline:"none",padding:"8px 10px",font:"inherit",fontSize:13,color:"var(--ink)",resize:"vertical",minHeight:90,lineHeight:1.5,background:"transparent",width:"100%",display:"block"}}
                  value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Discussed with Jonas — customer has given EOD deadline. Escalating to Finance today." />
              </div>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {TEMPLATES.map((t,i)=>(
                <span key={i} onClick={()=>setNote(n=>n?n+" · "+t:t)}
                  style={{fontSize:11,padding:"3px 8px",border:"1px solid var(--line-2)",background:"var(--paper-2)",borderRadius:14,color:"var(--ink-2)",cursor:"pointer"}}>+ {t}</span>
              ))}
            </div>
          </div>
          <div style={{padding:"11px 18px",borderTop:"1px solid var(--hairline)",background:"var(--paper-2)",display:"flex",justifyContent:"space-between"}}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-lg" onClick={()=>onSave(note)}>Save note</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── App ─────────── */

function App(){
  const [activeView,    setActiveView]    = useState("all");
  const [selectedId,    setSelectedId]    = useState("OPP-2502");
  const [owner,         setOwner]         = useState("");
  const [stage,         setStage]         = useState("");
  const [approval,      setApproval]      = useState("");
  const [risk,          setRisk]          = useState("");
  const [search,        setSearch]        = useState("");
  const [modal,         setModal]         = useState(null); // { kind, opp }
  const [toast,         setToast]         = useState(null);

  function flash(msg){ setToast(msg); setTimeout(()=>setToast(null),2800); }

  const viewFn = SAVED_VIEWS.find(v=>v.key===activeView)?.test || (()=>true);

  const rows = useMemo(()=>OPPS.filter(o=>{
    if(!viewFn(o)) return false;
    if(owner && o.ownerKey!==owner) return false;
    if(stage && o.stage!==stage) return false;
    if(approval && o.approval!==approval) return false;
    if(risk && o.risk!==risk) return false;
    if(search){
      const s=(o.title+o.account+o.owner).toLowerCase();
      if(!s.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [activeView, owner, stage, approval, risk, search]);

  const viewCounts = useMemo(()=>{
    const out={};
    SAVED_VIEWS.forEach(v=>{ out[v.key]=OPPS.filter(v.test).length; });
    return out;
  }, []);

  const selectedOpp = OPPS.find(o=>o.id===selectedId) || null;

  function onManagerAction(kind, opp){
    if(kind==="reassign") setModal({ kind:"reassign", opp });
    else if(kind==="note") setModal({ kind:"note", opp });
    else if(kind==="update") flash(`↻ Update requested from ${opp.owner} on ${opp.id}`);
    else if(kind==="detail") flash(`Opening ${opp.id} · ${opp.title} in detail view`);
  }

  function onReassign(newOwnerName){
    setModal(null);
    flash(`✓ ${modal.opp.id} reassigned to ${newOwnerName}`);
  }
  function onNote(note){
    setModal(null);
    flash(`✓ Manager note saved on ${modal.opp.id}`);
  }

  useEffect(()=>{
    if(rows.length && !rows.find(r=>r.id===selectedId)){
      setSelectedId(rows[0]?.id || null);
    }
  }, [rows, selectedId]);

  return (
    <div className="app" data-screen-label="08 Manager Pipeline">
      <Sidebar />
      <div className="main">
        <TopBar />
        <div className="content">
          <KPIStrip />
          <TeamScopeNotice />
          <SavedViews active={activeView} onSet={v=>{setActiveView(v);}} counts={viewCounts} />
          <FiltersRow
            owner={owner} setOwner={setOwner}
            stage={stage} setStage={setStage}
            approval={approval} setApproval={setApproval}
            risk={risk} setRisk={setRisk}
            search={search} setSearch={setSearch}
          />
          {/* main work area */}
          <div className="work">
            <PipelineTable rows={rows} selectedId={selectedId} onSelect={setSelectedId} />
            <OppSidePanel opp={selectedOpp} onManagerAction={onManagerAction} />
          </div>
          <div style={{height:14}} />
          <RiskPanels allOpps={OPPS} />
          <TeamSummary />
          <div className="foot-ruler">
            <span>SALES OPS CRM · ORION INDUSTRIAL · LOCAL PILOT</span>
            <span>USER MGR · MC · DACH-NORTH SCOPE</span>
            <span>46 OPPS · $3.84M PIPELINE · METADATA v42</span>
          </div>
        </div>
      </div>

      {modal?.kind==="reassign" && (
        <ReassignModal opp={modal.opp} onClose={()=>setModal(null)} onSave={onReassign} />
      )}
      {modal?.kind==="note" && (
        <ManagerNoteModal opp={modal.opp} onClose={()=>setModal(null)} onSave={onNote} />
      )}
      {toast && <div className="toast"><span className="ok">✓</span>{toast}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
