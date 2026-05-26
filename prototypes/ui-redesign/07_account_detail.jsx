/* eslint-disable */
const { useState, useEffect, useRef } = React;

/* ─────────── Static shell data ─────────── */

const MODULES = [
  { key:"dashboard",  code:"DA", label:"Dashboard",      section:"workspace" },
  { key:"accounts",   code:"AC", label:"Accounts",       section:"workspace", count:412 },
  { key:"contacts",   code:"CO", label:"Contacts",       section:"workspace", count:1843 },
  { key:"opps",       code:"OP", label:"Opportunities",  section:"workspace", count:12 },
  { key:"approvals",  code:"AP", label:"Approvals",      section:"governance", count:3 },
  { key:"imports",    code:"IM", label:"Imports",        section:"data",      disabled:true },
  { key:"duplicates", code:"DU", label:"Duplicates",     section:"data",      disabled:true },
  { key:"metadata",   code:"MA", label:"Metadata Admin", section:"data",      disabled:true },
  { key:"reports",    code:"RE", label:"Reports",        section:"insights",  disabled:true },
  { key:"audit",      code:"AU", label:"Audit",          section:"insights",  disabled:true },
];
const SECTIONS = [
  { key:"workspace",  label:"Workspace",       index:"01" },
  { key:"governance", label:"Governance",      index:"02" },
  { key:"data",       label:"Data & Quality",  index:"03" },
  { key:"insights",   label:"Insights",        index:"04" },
];

const PERSONAS = {
  rep: { name:"Anna Petrova",   role:"Sales Representative", initials:"AP", color:"bg-c", roleCode:"REP" },
  mgr: { name:"Michael Chen",   role:"Sales Manager",        initials:"MC", color:"bg-b", roleCode:"MGR" },
};

/* ─────────── Account data ─────────── */

const ACCOUNT = {
  id:"AC-3318", name:"Acme Manufacturing",
  industry:"Industrial Equipment", website:"acme-manufacturing.example",
  status:"Active customer", owner:"Anna Petrova",
  region:"DACH-North", legalEntity:"ORN-DE-001",
  phone:"+49 211 88 77 00", since:"2021-03-14",
  lastActivity:"2026-05-15", openPipeline:612000, openOpps:4,
};

const CONTACTS = [
  {
    id:"CT-1001", name:"Taylor Brooks", title:"VP Operations",
    email:"t.brooks@acme-mfg.example", phone:"+49 211 88 77 01",
    influence:"Decision Maker", buyingRole:"Economic buyer",
    primary:true, linkedOpps:["OPP-2418","OPP-3142"],
    lastInteraction:"2026-05-14", lastInteractionDesc:"Discovery call · confirmed 2026-06-28 close date",
    notes:"Taylor is the final sign-off authority. Prefers direct communication. Has confirmed competitor offer (Sigma Castings) is real but relationship-dependent.",
    initials:"TB", color:"bg-b",
  },
  {
    id:"CT-1002", name:"Maya Chen", title:"Procurement Director",
    email:"m.chen@acme-mfg.example", phone:"+49 211 88 77 02",
    influence:"Influencer", buyingRole:"Procurement gatekeeper",
    primary:false, linkedOpps:["OPP-2418","OPP-4001"],
    lastInteraction:"2026-05-10", lastInteractionDesc:"Email · confirmed payment terms policy",
    notes:"Maya controls vendor onboarding and payment terms. NET-45 is her preferred standard.",
    initials:"MC", color:"bg-e",
  },
  {
    id:"CT-1003", name:"Brian Reyes", title:"Plant Manager",
    email:"b.reyes@acme-mfg.example", phone:"+49 211 88 77 03",
    influence:"Technical Evaluator", buyingRole:"Technical validator",
    primary:false, linkedOpps:["OPP-3142"],
    lastInteraction:"2026-04-28", lastInteractionDesc:"Site visit · specs reviewed",
    notes:"Brian evaluates technical fit. Needs compatibility doc for Cleveland expansion unit.",
    initials:"BR", color:"bg-d",
  },
  {
    id:"CT-1004", name:"Lena Hoffmann", title:"Legal Counsel",
    email:"l.hoffmann@acme-mfg.example", phone:"+49 211 88 77 04",
    influence:"Legal Reviewer", buyingRole:"Contract reviewer",
    primary:false, linkedOpps:["OPP-3142"],
    lastInteraction:"2026-05-02", lastInteractionDesc:"Email · contract redlines sent",
    notes:"Lena reviews contract terms. Has flagged indemnity clause in Cleveland deal. Expected to clear by month end.",
    initials:"LH", color:"bg-f",
  },
];

const OPPS = [
  {
    id:"OPP-2418", title:"Q3 Equipment Renewal",
    stage:"Proposal", stageCode:"P", stageIdx:2,
    amount:145000, close:"2026-06-28",
    owner:"Anna Petrova", approval:"pending", approvalLabel:"Pending Finance",
    nextActivity:"Awaiting finance approval · REQ-1182",
  },
  {
    id:"OPP-3142", title:"Cleveland Plant Expansion",
    stage:"Negotiation", stageCode:"N", stageIdx:3,
    amount:320000, close:"2026-07-15",
    owner:"Anna Petrova", approval:"legal", approvalLabel:"Legal Review",
    nextActivity:"Legal terms — Lena Hoffmann follow-up",
  },
  {
    id:"OPP-4001", title:"Service Uplift FY26",
    stage:"Discovery", stageCode:"D", stageIdx:1,
    amount:60000, close:"2026-08-30",
    owner:"Anna Petrova", approval:"none", approvalLabel:"—",
    nextActivity:"Scope call with Maya Chen · Thu",
  },
  {
    id:"OPP-4218", title:"Maintenance Renewal",
    stage:"Qualification", stageCode:"Q", stageIdx:0,
    amount:87000, close:"2026-09-10",
    owner:"Anna Petrova", approval:"none", approvalLabel:"—",
    nextActivity:"Qualify volume forecast · Next week",
  },
];

const ACTIVITIES = [
  { id:"ACT-1", t:"2026-05-10 09:30", type:"meeting",  who:"Anna Petrova",   title:"Discovery call · Taylor Brooks",     status:"done",    sub:"Confirmed close date · competitor noted" },
  { id:"ACT-2", t:"2026-05-14 11:00", type:"email",    who:"Anna Petrova",   title:"Quote sent to Taylor Brooks",         status:"done",    sub:"Q3 Equipment Renewal · $145K draft" },
  { id:"ACT-3", t:"2026-05-17 00:00", type:"followup", who:"Anna Petrova",   title:"Follow-up: finance approval status",  status:"overdue", sub:"REQ-1182 pending · SLA at risk" },
  { id:"ACT-4", t:"2026-05-22 14:00", type:"meeting",  who:"Anna Petrova",   title:"Procurement review · Maya Chen",      status:"planned", sub:"Payment terms discussion · OPP-4001" },
  { id:"ACT-5", t:"2026-05-23 00:00", type:"followup", who:"Anna Petrova",   title:"Legal terms follow-up · Lena Hoffmann",status:"planned",sub:"Cleveland contract redlines · OPP-3142" },
  { id:"ACT-6", t:"2026-05-13 16:00", type:"note",     who:"Michael Chen",   title:"Manager note: flag for QBR review",   status:"done",    sub:"Cleveland deal size warrants exec attention" },
];

const AUDIT = [
  { t:"2021-03-14 10:02", who:"System",        type:"create",   desc:"Account created via import · legacy CRM migration" },
  { t:"2024-01-08 14:30", who:"Anna Petrova",  type:"contact",  desc:"Contact added: Taylor Brooks · VP Operations · set as primary" },
  { t:"2025-11-12 09:20", who:"Anna Petrova",  type:"opp",      desc:"Opportunity linked: OPP-2418 · Q3 Equipment Renewal · Proposal" },
  { t:"2026-02-04 11:45", who:"System",        type:"owner",    desc:"Owner updated: assigned to Anna Petrova (DACH-North team)" },
  { t:"2026-04-29 08:12", who:"System",        type:"duplicate",desc:"Duplicate candidate generated: ACME Mfg. Cleveland · score 0.87" },
  { t:"2026-05-15 09:14", who:"Anna Petrova",  type:"approval", desc:"Approval submitted: REQ-1182 · Discount Exception · OPP-2418" },
];

/* ─────────── Helpers ─────────── */

function fmtMoney(n){ return n>=1_000_000?`$${(n/1_000_000).toFixed(2)}M`:n>=1_000?`$${(n/1_000).toFixed(0)}K`:`$${n}`; }

function Pill({ kind, children }){
  return <span className={`pill p-${kind}`}><span className="pdot"></span>{children}</span>;
}

function StagePip({ idx }){
  const stages=["Q","D","P","N","W"];
  return (
    <span className="stage-pip">
      {stages.map((s,i)=><i key={s} className={i<=idx?i===idx?"flag":"on":""} />)}
    </span>
  );
}

function BrandMark(){ return <span className="brand-mark" aria-hidden />; }

/* ─────────── Sidebar ─────────── */

function Sidebar({ user }){
  const counts = { accounts:412, contacts:1843, opps:12, approvals:3 };
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
                return (
                  <div key={m.key}
                    className={`nav-item ${m.key==="accounts"?"active":""} ${m.disabled?"disabled":""}`}
                    title={m.disabled?`${m.label} — not visible to ${user.role}`:m.label}
                  >
                    <span className="nav-mark mono">{m.code}</span>
                    <span className="nav-label">{m.label}</span>
                    <span className={`nav-count mono ${m.key==="approvals"&&c>0?"alert":""}`}>{c||""}</span>
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

/* ─────────── Top bar ─────────── */

function TopBar({ user }){
  return (
    <div className="topbar">
      <div className="crumb">
        <span className="pulse"><span className="pulse-dot" /> LOCAL PILOT</span>
        <span>Accounts</span>
        <span className="sep">/</span>
        <strong>{ACCOUNT.name}</strong>
        <span className="sep">·</span>
        <span className="mono" style={{color:"var(--muted)",fontSize:11.5}}>{ACCOUNT.id}</span>
      </div>
      <label className="search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="m11 11 3.5 3.5"/></svg>
        <input placeholder="Search accounts, contacts, opportunities…" />
        <kbd>⌘K</kbd>
      </label>
      <div className="top-actions">
        <button className="icon-btn" aria-label="Notifications">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3.5 12h9l-1-1.5V7a3.5 3.5 0 0 0-7 0v3.5L3.5 12Z"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/></svg>
          <span className="dot-badge mono">4</span>
        </button>
        <button className="role-pill">
          <span className={`avatar ${user.color}`}>{user.initials}</span>
          <span className="who"><b>{user.name.split(" ")[0]} {user.name.split(" ")[1][0]}.</b><span>{user.role}</span></span>
          <span className="chev">▾</span>
        </button>
      </div>
    </div>
  );
}

/* ─────────── Scenario bar ─────────── */

function ScenarioBar({ scenario, setScenario }){
  const opts = [
    { key:"rep",      label:"Sales Rep · Anna Petrova" },
    { key:"mgr",      label:"Manager · Michael Chen"   },
    { key:"nocontacts", label:"No contacts state"      },
  ];
  return (
    <div style={{display:"flex",alignItems:"center",gap:0,background:"var(--paper-2)",border:"1px solid var(--line-2)",borderRadius:18,padding:3,width:"fit-content",marginBottom:14}}>
      <span className="mono" style={{fontSize:9.5,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",padding:"0 10px 0 6px",borderRight:"1px solid var(--line-2)",height:24,display:"inline-flex",alignItems:"center"}}>Scenario</span>
      {opts.map(o=>(
        <button key={o.key} className={`scenario-opt ${scenario===o.key?"on":""}`} onClick={()=>setScenario(o.key)}>{o.label}</button>
      ))}
    </div>
  );
}

/* ─────────── Account header ─────────── */

function AccountHeader({ user, onAction }){
  const isOwner = user.roleCode === "REP";
  return (
    <div className="panel acct-header">
      <div className="acct-header-body">
        <div style={{flex:1,minWidth:0}}>
          {/* title row */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:7,flexWrap:"wrap"}}>
            <div className="acct-logo-mark">{ACCOUNT.name.slice(0,2)}</div>
            <h1 style={{margin:0,fontSize:21,fontWeight:600,letterSpacing:"-.02em"}}>{ACCOUNT.name}</h1>
            <span className="mono" style={{fontSize:11.5,color:"var(--muted)",letterSpacing:".06em"}}>{ACCOUNT.id}</span>
            <Pill kind="approved">Active customer</Pill>
            <span className="kind-tag commercial mono">Industrial Equipment</span>
          </div>
          {/* meta row */}
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",fontSize:12.5,color:"var(--muted)",marginBottom:10}}>
            <span>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" style={{verticalAlign:-1,marginRight:4}}><circle cx="6" cy="6" r="5"/><path d="M1 6h10M6 1a8 8 0 0 1 0 10M6 1a8 8 0 0 0 0 10"/></svg>
              {ACCOUNT.website}
            </span>
            <span style={{color:"var(--line-2)"}}>·</span>
            <span>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" style={{verticalAlign:-1,marginRight:4}}><path d="M2 2h3l1.5 3L5 6.5a7 7 0 0 0 2.5 2.5L9 7.5l3 1.5v3c0 .5-.5 1-1 1C5 13 -1 7-1 1c0-.5.5-1 1-1z" transform="scale(.85)"/></svg>
              {ACCOUNT.phone}
            </span>
            <span style={{color:"var(--line-2)"}}>·</span>
            <span>Owner: <strong style={{color:"var(--ink)"}}>{ACCOUNT.owner}</strong></span>
            <span style={{color:"var(--line-2)"}}>·</span>
            <span>Region: <span className="mono" style={{color:"var(--ink-2)"}}>{ACCOUNT.region}</span></span>
            <span style={{color:"var(--line-2)"}}>·</span>
            <span>Customer since <span className="mono" style={{color:"var(--ink-2)"}}>{ACCOUNT.since}</span></span>
            <span style={{color:"var(--line-2)"}}>·</span>
            <span>Last activity <span className="mono" style={{color:"var(--ink-2)"}}>{ACCOUNT.lastActivity}</span></span>
          </div>
          {/* KPI strip */}
          <div style={{display:"flex",gap:0,border:"1px solid var(--hairline)",background:"var(--paper-2)",width:"fit-content"}}>
            {[
              { label:"Open pipeline", value:fmtMoney(ACCOUNT.openPipeline), mono:true, accent:true },
              { label:"Open opportunities", value:ACCOUNT.openOpps, mono:true },
              { label:"Contacts", value:CONTACTS.length, mono:true },
              { label:"In-flight approvals", value:"2", mono:true, warn:true },
            ].map((k,i)=>(
              <div key={i} style={{padding:"8px 16px",borderRight:i<3?"1px solid var(--hairline)":"none",minWidth:120}}>
                <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:3}}>{k.label}</div>
                <div className={k.mono?"mono":""} style={{fontSize:18,fontWeight:600,color:k.accent?"var(--accent-2)":k.warn?"var(--neg)":"var(--ink)"}}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>
        {/* actions column */}
        <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0,alignItems:"stretch",minWidth:148}}>
          <button className="btn btn-primary btn-lg" style={{justifyContent:"center"}} onClick={()=>onAction("new-opp")}>+ New Opportunity</button>
          <button className="btn btn-lg" style={{justifyContent:"center"}} onClick={()=>onAction("add-contact")}>+ Add Contact</button>
          <button className="btn btn-lg" style={{justifyContent:"center"}} onClick={()=>onAction("add-activity")}>+ Add Activity</button>
          <div style={{borderTop:"1px solid var(--hairline)",marginTop:2,paddingTop:6,display:"flex",flexDirection:"column",gap:4}}>
            <button className="btn btn-ghost btn-sm" style={{justifyContent:"flex-start"}}>Edit account</button>
            <button className="btn btn-ghost btn-sm" style={{justifyContent:"flex-start"}}>Mark duplicate</button>
            <button className="btn btn-ghost btn-sm" style={{justifyContent:"flex-start"}}>View audit ›</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Relationship map ─────────── */

function RelationshipMap(){
  const nodes = [
    { label:"Account",       sub:"1 company",         icon:"AC", active:true },
    { label:"Contacts",      sub:`${CONTACTS.length} people`,        icon:"CO" },
    { label:"Opportunities", sub:`${OPPS.length} deals · $612K`,    icon:"OP" },
    { label:"Activities",    sub:`${ACTIVITIES.length} tasks`,       icon:"AT" },
    { label:"Approvals",     sub:"2 in-flight",       icon:"AP", alert:true },
  ];
  return (
    <div className="panel" style={{marginBottom:12}}>
      <div className="panel-head">
        <div className="panel-title">Account relationships</div>
        <div className="panel-actions"><span style={{fontSize:11.5,color:"var(--muted)"}}>Account is the central record — contacts, opportunities, and approvals all belong to it</span></div>
      </div>
      <div style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:0,overflowX:"auto"}}>
        {nodes.map((n,i)=>(
          <React.Fragment key={i}>
            <div style={{
              display:"flex",flexDirection:"column",alignItems:"center",gap:6,
              padding:"10px 18px",minWidth:110,
              background: n.active?"var(--ink)":"var(--paper)",
              border: n.active?"1px solid var(--ink)":"1px solid var(--line)",
              position:"relative",
            }}>
              <div style={{
                width:32,height:32,border:`1.5px solid ${n.active?"var(--accent)":"var(--line-2)"}`,
                background:n.active?"var(--accent-2)":"var(--paper-2)",
                display:"grid",placeItems:"center",
                fontFamily:'"JetBrains Mono",monospace',fontSize:10,fontWeight:700,
                color:n.active?"var(--paper)":n.alert?"var(--accent-2)":"var(--ink-2)",
              }}>{n.icon}</div>
              <div style={{fontSize:12,fontWeight:600,color:n.active?"var(--paper)":"var(--ink)",whiteSpace:"nowrap"}}>{n.label}</div>
              <div style={{fontSize:10.5,color:n.active?"var(--paper-3)":n.alert?"var(--accent-2)":"var(--muted)",fontFamily:'"JetBrains Mono",monospace',letterSpacing:".02em",whiteSpace:"nowrap"}}>{n.sub}</div>
              {n.alert && <div style={{position:"absolute",top:-4,right:-4,width:8,height:8,borderRadius:"50%",background:"var(--accent)",border:"1.5px solid var(--paper)"}} />}
            </div>
            {i<nodes.length-1 && (
              <div style={{display:"flex",alignItems:"center",padding:"0 4px",color:"var(--line-2)"}}>
                <svg width="20" height="10" viewBox="0 0 20 10"><path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
              </div>
            )}
          </React.Fragment>
        ))}
        <div style={{flex:1}} />
        <div style={{fontSize:11,color:"var(--muted)",fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em",alignSelf:"flex-end",paddingBottom:2}}>
          AC-3318 · Acme Manufacturing · DACH-North
        </div>
      </div>
    </div>
  );
}

/* ─────────── Duplicate warning ─────────── */

function DuplicateWarning({ onDismiss, onReview }){
  return (
    <div className="dup-warning">
      <div style={{display:"flex",alignItems:"center",gap:10,flex:1,flexWrap:"wrap"}}>
        <div className="dup-icon mono">!</div>
        <div>
          <div style={{fontWeight:600,fontSize:12.5}}>Possible duplicate detected: <span className="mono">ACME Mfg. Cleveland</span></div>
          <div style={{fontSize:11.5,color:"var(--ink-2)",marginTop:2}}>
            Match reasons: similar name · same email domain · same phone region (DACH-North) · confidence score <span className="mono" style={{fontWeight:600}}>0.87</span>.
            Duplicate review is handled by RevOps — you can flag it or review the context.
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap"}}>
        <button className="btn btn-sm" onClick={onReview}>Review candidate ›</button>
        <button className="btn btn-ghost btn-sm" onClick={onDismiss}>Ignore for now</button>
      </div>
    </div>
  );
}

/* ─────────── Contacts section ─────────── */

function ContactsSection({ contacts, selectedId, onSelect, onAdd, emptyState }){
  const influenceColor = {
    "Decision Maker":      { c:"var(--pos)",      bg:"var(--pos-soft)",  b:"#B2C8A8" },
    "Influencer":          { c:"var(--info)",      bg:"var(--info-soft)", b:"#A4C0C8" },
    "Technical Evaluator": { c:"var(--accent-2)",  bg:"var(--accent-soft)",b:"#D9BFA0" },
    "Legal Reviewer":      { c:"var(--neg)",       bg:"var(--neg-soft)",  b:"#D6B0A8" },
  };
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          Contacts
          <em>{contacts.length}</em>
          <span style={{fontSize:10.5,color:"var(--muted)",fontFamily:'"JetBrains Mono",monospace',fontWeight:400,letterSpacing:".04em",textTransform:"none"}}>people at Acme Manufacturing</span>
        </div>
        <div className="panel-actions">
          <button className="btn btn-sm" onClick={onAdd}>+ Add contact</button>
        </div>
      </div>
      {emptyState ? (
        <div style={{padding:"42px 22px",textAlign:"center",color:"var(--muted)",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <div style={{width:44,height:44,border:"1px dashed var(--line-2)",background:"var(--paper-2)",display:"grid",placeItems:"center",fontFamily:'"JetBrains Mono",monospace',fontSize:10,color:"var(--muted-2)"}}>CO</div>
          <div style={{fontWeight:500,fontSize:13.5,color:"var(--ink)"}}>No contacts yet</div>
          <div style={{maxWidth:340,lineHeight:1.6}}>
            Contacts are people inside Acme Manufacturing. Add at least one contact to track who you're speaking with, their role in the buying committee, and which deals they're connected to.
          </div>
          <button className="btn btn-primary btn-sm" style={{marginTop:4}} onClick={onAdd}>+ Add first contact</button>
        </div>
      ) : (
        <table className="t" style={{tableLayout:"auto"}}>
          <colgroup>
            <col style={{width:220}} />
            <col style={{width:160}} />
            <col />
            <col style={{width:130}} />
            <col style={{width:120}} />
          </colgroup>
          <thead><tr>
            <th>Name · title</th>
            <th>Influence</th>
            <th>Last interaction</th>
            <th>Linked opportunities</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            {contacts.map(c=>{
              const ic = influenceColor[c.influence] || {};
              return (
                <tr key={c.id}
                  className={selectedId===c.id?"selected":""}
                  onClick={()=>onSelect(c.id)}
                  style={{cursor:"pointer"}}
                >
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div className={`avatar ${c.color}`} style={{width:24,height:24,fontSize:9,flexShrink:0}}>{c.initials}</div>
                      <div>
                        <div style={{fontWeight:500,display:"flex",alignItems:"center",gap:5}}>
                          {c.name}
                          {c.primary && (
                            <span style={{fontSize:9,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".08em",color:"var(--accent-2)",background:"var(--accent-soft)",border:"1px solid #D9BFA0",padding:"0 4px",borderRadius:2}}>PRIMARY</span>
                          )}
                        </div>
                        <span style={{fontSize:11,color:"var(--muted)"}}>{c.title}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontSize:10.5,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em",
                      color:ic.c,background:ic.bg,border:`1px solid ${ic.b}`,
                      padding:"1px 6px",borderRadius:2,whiteSpace:"nowrap",textTransform:"uppercase"
                    }}>{c.influence}</span>
                  </td>
                  <td>
                    <div style={{fontSize:12.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.lastInteractionDesc}</div>
                    <span style={{fontSize:11,color:"var(--muted)",fontFamily:'"JetBrains Mono",monospace'}}>{c.lastInteraction}</span>
                  </td>
                  <td>
                    <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                      {c.linkedOpps.map(o=>(
                        <span key={o} className="mono" style={{fontSize:10.5,color:"var(--muted-2)",background:"var(--paper-2)",border:"1px solid var(--hairline)",padding:"1px 5px",borderRadius:2}}>{o}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{display:"flex",gap:4}}>
                      <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();}}>Email</button>
                      <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();}}>Log call</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

/* ─────────── Contact detail panel ─────────── */

function ContactDetailPanel({ contact }){
  if(!contact){
    return (
      <div className="panel" style={{textAlign:"center",padding:"32px 18px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,color:"var(--muted)"}}>
        <div style={{width:36,height:36,border:"1px dashed var(--line-2)",display:"grid",placeItems:"center",fontFamily:'"JetBrains Mono",monospace',fontSize:10,color:"var(--muted-2)"}}>CO</div>
        <div style={{fontWeight:500,color:"var(--ink)",fontSize:13}}>Select a contact</div>
        <div style={{fontSize:12.5,lineHeight:1.5}}>Click any row to see their full profile, linked deals, and contact history.</div>
      </div>
    );
  }
  const influenceColor = {
    "Decision Maker":      { c:"var(--pos)",      bg:"var(--pos-soft)"  },
    "Influencer":          { c:"var(--info)",      bg:"var(--info-soft)" },
    "Technical Evaluator": { c:"var(--accent-2)",  bg:"var(--accent-soft)"},
    "Legal Reviewer":      { c:"var(--neg)",       bg:"var(--neg-soft)"  },
  };
  const ic = influenceColor[contact.influence] || {};
  const linkedOpps = OPPS.filter(o=>contact.linkedOpps.includes(o.id));
  return (
    <div className="panel">
      {/* header */}
      <div style={{padding:"12px 14px",borderBottom:"1px solid var(--hairline)",background:"var(--paper-2)"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div className={`avatar ${contact.color}`} style={{width:36,height:36,fontSize:12,flexShrink:0}}>{contact.initials}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              <span style={{fontWeight:600,fontSize:14}}>{contact.name}</span>
              {contact.primary && <span style={{fontSize:9,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".08em",color:"var(--accent-2)",background:"var(--accent-soft)",border:"1px solid #D9BFA0",padding:"0 4px",borderRadius:2}}>PRIMARY</span>}
            </div>
            <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{contact.title}</div>
            <div style={{marginTop:5}}>
              <span style={{fontSize:10.5,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em",color:ic.c,background:ic.bg,padding:"1px 6px",borderRadius:2,textTransform:"uppercase"}}>{contact.influence}</span>
              <span style={{fontSize:11.5,color:"var(--muted)",marginLeft:8}}>{contact.buyingRole}</span>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginTop:10}}>
          <button className="btn btn-sm" style={{flex:1,justifyContent:"center"}}>Email</button>
          <button className="btn btn-sm" style={{flex:1,justifyContent:"center"}}>Log call</button>
          <button className="btn btn-sm" style={{flex:1,justifyContent:"center"}}>Add note</button>
          {!contact.primary && <button className="btn btn-ghost btn-sm">Set primary</button>}
        </div>
      </div>
      {/* fields */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid var(--hairline)"}}>
        {[
          ["Email",  contact.email,  "link"],
          ["Phone",  contact.phone,  "mono"],
          ["Last interaction", contact.lastInteraction, "mono"],
          ["Linked opps", contact.linkedOpps.length + " deals", ""],
        ].map(([l,v,t],i)=>(
          <div key={i} style={{padding:"9px 12px",borderRight:i%2===0?"1px solid var(--hairline)":"none",borderBottom: i<2?"1px solid var(--hairline)":"none"}}>
            <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:3}}>{l}</div>
            <div className={t==="mono"?"mono":""} style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:t==="link"?"var(--info)":"inherit"}}>{v}</div>
          </div>
        ))}
      </div>
      {/* linked opps */}
      {linkedOpps.length>0 && (
        <div style={{borderBottom:"1px solid var(--hairline)"}}>
          <div style={{padding:"8px 12px 4px",fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)"}}>Linked opportunities</div>
          {linkedOpps.map(o=>(
            <div key={o.id} style={{padding:"7px 12px",borderBottom:"1px solid var(--hairline)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
              <div>
                <div style={{fontSize:12.5,fontWeight:500}}>{o.title}</div>
                <div className="mono" style={{fontSize:11,color:"var(--muted)"}}>{o.id} · {o.stage} · {o.close}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                <span className="mono" style={{fontSize:12,fontWeight:600}}>{fmtMoney(o.amount)}</span>
                {o.approval!=="none" && <Pill kind={o.approval==="pending"?"pending":"sentback"}>{o.approvalLabel}</Pill>}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* notes */}
      <div style={{padding:"10px 12px"}}>
        <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:5}}>Notes</div>
        <div style={{fontSize:12.5,color:"var(--ink-2)",lineHeight:1.6,padding:"8px 10px",background:"var(--paper-2)",borderLeft:"2px solid var(--line-2)"}}>{contact.notes}</div>
      </div>
    </div>
  );
}

/* ─────────── Opportunities section ─────────── */

function OpportunitiesSection({ selectedOppId, onSelectOpp }){
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">Opportunities <em>{OPPS.length}</em></div>
        <div className="panel-actions">
          <span style={{fontSize:11.5,color:"var(--muted)",fontFamily:'"JetBrains Mono",monospace"'}}>Open pipeline {fmtMoney(ACCOUNT.openPipeline)}</span>
          <button className="btn btn-sm">+ New</button>
        </div>
      </div>
      <table className="t">
        <colgroup>
          <col style={{width:90}} /><col /><col style={{width:80}} /><col style={{width:100}} />
          <col style={{width:110}} /><col style={{width:140}} />
        </colgroup>
        <thead><tr>
          <th>ID</th><th>Title · stage</th><th className="num">Amount</th>
          <th>Close</th><th>Approval</th><th>Next step</th>
        </tr></thead>
        <tbody>
          {OPPS.map(o=>(
            <tr key={o.id}
              className={selectedOppId===o.id?"selected":""}
              onClick={()=>onSelectOpp(o.id===selectedOppId?null:o.id)}
              style={{cursor:"pointer"}}
            >
              <td className="mono" style={{fontSize:11.5}}>{o.id}</td>
              <td>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <StagePip idx={o.stageIdx} />
                  <span style={{fontWeight:500}}>{o.title}</span>
                </div>
                <span style={{fontSize:11,color:"var(--muted)"}}>Stage {o.stage}</span>
              </td>
              <td className="num mono">{fmtMoney(o.amount)}</td>
              <td className="mono" style={{fontSize:11.5}}>{o.close}</td>
              <td>
                {o.approval==="none"
                  ? <span style={{color:"var(--muted)",fontSize:12}}>—</span>
                  : <Pill kind={o.approval==="pending"?"pending":"sentback"}>{o.approvalLabel}</Pill>
                }
              </td>
              <td>
                <div className="truncate" style={{fontSize:12}}>{o.nextActivity}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/* ─────────── Activities section ─────────── */

function ActivitiesSection({ onAdd }){
  const typeIcon = { meeting:"●", email:"✉", followup:"→", note:"✎" };
  const statusColor = { done:"var(--pos)", overdue:"var(--neg)", planned:"var(--muted)" };
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">Activities <em>{ACTIVITIES.length}</em></div>
        <div className="panel-actions">
          <span className="filterchip on mono">ALL</span>
          <span className="filterchip mono">MINE</span>
          <button className="btn btn-sm" onClick={onAdd}>+ Add</button>
        </div>
      </div>
      <div>
        {ACTIVITIES.map((a,i)=>(
          <div key={a.id} style={{
            display:"grid",gridTemplateColumns:"64px 18px 1fr auto",gap:"0 10px",
            padding:"9px 14px",
            borderBottom: i<ACTIVITIES.length-1?"1px solid var(--hairline)":"none",
            alignItems:"start",
            background: a.status==="overdue"?"#FBEFE8":"inherit",
          }}>
            <div className="mono" style={{fontSize:10.5,color:"var(--muted)",lineHeight:1.35}}>
              {a.t.slice(11)||"—"}
              <div style={{fontSize:10,color:"var(--muted-2)"}}>{a.t.slice(0,10)}</div>
            </div>
            <div style={{
              width:18,height:18,borderRadius:"50%",
              background: a.status==="done"?"var(--pos-soft)":a.status==="overdue"?"var(--neg-soft)":"var(--paper-2)",
              border:`1.5px solid ${a.status==="done"?"var(--pos)":a.status==="overdue"?"var(--neg)":"var(--line)"}`,
              display:"grid",placeItems:"center",
              fontSize:8,color:statusColor[a.status],
              marginTop:2,
            }}>{a.status==="done"?"✓":a.status==="overdue"?"!":"·"}</div>
            <div>
              <div style={{fontWeight:500,fontSize:12.5,display:"flex",alignItems:"center",gap:6}}>
                {a.title}
                {a.status==="overdue" && <span style={{fontSize:10,fontFamily:'"JetBrains Mono",monospace',color:"var(--neg)",letterSpacing:".08em",textTransform:"uppercase"}}>OVERDUE</span>}
              </div>
              <div style={{fontSize:11.5,color:"var(--muted)",marginTop:2}}>{a.sub} · {a.who}</div>
            </div>
            <div>
              <button className="btn btn-ghost btn-sm" style={{fontSize:11}}>{a.status==="done"?"View":"Action"}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────── Manager controls ─────────── */

function ManagerControls({ user }){
  const isMgr = user.roleCode === "MGR";
  return (
    <div className="panel" style={{marginBottom:14}}>
      <div className="panel-head">
        <div className="panel-title">Manager controls</div>
        {!isMgr && (
          <div style={{fontSize:10.5,fontFamily:'"JetBrains Mono",monospace',color:"var(--muted)",letterSpacing:".06em",background:"var(--paper-2)",border:"1px solid var(--hairline)",padding:"1px 6px",borderRadius:2}}>MGR ONLY</div>
        )}
      </div>
      <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:6}}>
        {[
          { label:"Reassign account owner",   icon:"→", desc:"Transfer ownership to another rep" },
          { label:"Add manager note",          icon:"✎", desc:"Internal note visible to manager and above" },
          { label:"Request account update",    icon:"↻", desc:"Flag this account for rep update within 48h" },
        ].map((a,i)=>(
          <div key={i} style={{
            display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
            background:isMgr?"var(--paper-2)":"var(--paper)",
            border:"1px solid var(--hairline)",
            opacity:isMgr?1:.5,
            cursor:isMgr?"pointer":"not-allowed",
            position:"relative",
          }} title={!isMgr?`Manager only — not available to ${user.role}`:a.desc}>
            <span className="mono" style={{fontSize:14,color:"var(--muted)",width:18,textAlign:"center"}}>{a.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:500,color:isMgr?"var(--ink)":"var(--muted)"}}>{a.label}</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>{a.desc}</div>
            </div>
            {!isMgr && <span style={{fontSize:10,fontFamily:'"JetBrains Mono",monospace',color:"var(--muted-2)",letterSpacing:".06em"}}>🔒 MGR</span>}
          </div>
        ))}
        {!isMgr && (
          <div style={{fontSize:11,color:"var(--muted)",marginTop:2,fontStyle:"italic",lineHeight:1.5}}>
            These actions require Sales Manager or above. Switch to Manager view to enable.
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── Audit preview ─────────── */

function AuditPreview(){
  const typeColors = {
    create:    { c:"var(--ink-2)",    icon:"+" },
    contact:   { c:"var(--info)",     icon:"C" },
    opp:       { c:"var(--accent-2)", icon:"O" },
    owner:     { c:"var(--muted)",    icon:"→" },
    duplicate: { c:"var(--warn)",     icon:"!" },
    approval:  { c:"var(--pos)",      icon:"✓" },
  };
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Audit preview <em>{AUDIT.length} events</em></div>
        <div className="panel-actions"><a style={{fontSize:11.5,cursor:"pointer"}}>Full audit ›</a></div>
      </div>
      <div style={{padding:"6px 14px 12px"}}>
        {AUDIT.map((e,i)=>{
          const tc = typeColors[e.type]||{c:"var(--muted)",icon:"·"};
          return (
            <div key={i} style={{display:"grid",gridTemplateColumns:"18px 1fr",gap:"0 8px",padding:"7px 0",borderBottom:i<AUDIT.length-1?"1px dashed var(--hairline)":"none",alignItems:"start"}}>
              <div style={{
                width:18,height:18,borderRadius:"50%",background:"var(--paper-2)",
                border:"1px solid var(--line)",display:"grid",placeItems:"center",
                fontSize:8,fontWeight:700,fontFamily:'"JetBrains Mono",monospace',color:tc.c,marginTop:1,
              }}>{tc.icon}</div>
              <div>
                <div style={{fontSize:12,fontWeight:500,lineHeight:1.3}}>{e.desc}</div>
                <div className="mono" style={{fontSize:10.5,color:"var(--muted)",marginTop:2}}>{e.t.slice(0,10)} · {e.who}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Add contact modal ─────────── */

function AddContactModal({ onClose, onSave }){
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [influence, setInfluence] = useState("Influencer");
  const [primary, setPrimary] = useState(false);
  const [touched, setTouched] = useState(false);
  const nameErr = touched && name.trim().length < 2;

  useEffect(()=>{
    const h = e => { if(e.key==="Escape") onClose(); };
    document.addEventListener("keydown", h);
    return ()=>document.removeEventListener("keydown", h);
  },[onClose]);

  function save(){
    setTouched(true);
    if(name.trim().length < 2) return;
    onSave({ name, title, email, influence, primary });
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Add contact">
        <div className="modal-card" style={{width:520}}>
          <div className="head appr" style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",borderBottom:"1px solid var(--hairline)",background:"var(--paper-2)"}}>
            <div className="mk" style={{width:34,height:34,borderRadius:"50%",background:"var(--info-soft)",border:"1.5px solid var(--info)",display:"grid",placeItems:"center",color:"var(--info)",fontWeight:700,fontSize:14}}>C</div>
            <div>
              <h3 style={{margin:0,fontSize:15,fontWeight:600}}>Add contact</h3>
              <p style={{margin:"2px 0 0",fontSize:12,color:"var(--muted)"}}>Adding contact to Acme Manufacturing · AC-3318</p>
            </div>
          </div>
          <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
            {[
              { label:"Full name", val:name, set:setName, placeholder:"e.g. Jordan Smith", req:true, err:nameErr },
              { label:"Title / role", val:title, set:setTitle, placeholder:"e.g. Head of Procurement" },
              { label:"Work email", val:email, set:setEmail, placeholder:"e.g. jsmith@acme-mfg.example" },
            ].map((f,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={{fontSize:11,color:"var(--muted)",fontWeight:500}}>
                  {f.label} {f.req && <span style={{color:"var(--accent-2)",fontFamily:'"JetBrains Mono",monospace',fontSize:10}}>*</span>}
                </label>
                <div style={{border:f.err?"1px solid var(--neg)":"1px solid var(--line)",borderRadius:3,background:"var(--white)",padding:"7px 10px"}}>
                  <input style={{border:0,outline:"none",width:"100%",font:"inherit",fontSize:13,color:"var(--ink)",background:"transparent"}}
                    value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.placeholder} />
                </div>
                {f.err && <div style={{fontSize:11.5,color:"var(--neg)"}}>Name is required</div>}
              </div>
            ))}
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
                <label style={{fontSize:11,color:"var(--muted)",fontWeight:500}}>Influence level</label>
                <div style={{border:"1px solid var(--line)",borderRadius:3,background:"var(--white)",padding:"7px 10px",display:"flex",alignItems:"center"}}>
                  <select style={{border:0,outline:"none",width:"100%",font:"inherit",fontSize:13,color:"var(--ink)",background:"transparent",appearance:"none"}}
                    value={influence} onChange={e=>setInfluence(e.target.value)}>
                    <option>Decision Maker</option>
                    <option>Influencer</option>
                    <option>Technical Evaluator</option>
                    <option>Legal Reviewer</option>
                  </select>
                  <span style={{color:"var(--muted)",fontSize:12}}>▾</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4,justifyContent:"flex-end"}}>
                <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12.5,cursor:"pointer"}}>
                  <input type="checkbox" checked={primary} onChange={e=>setPrimary(e.target.checked)} style={{accentColor:"var(--accent-2)",width:14,height:14}} />
                  Set as primary contact
                </label>
              </div>
            </div>
          </div>
          <div style={{padding:"11px 18px",borderTop:"1px solid var(--hairline)",background:"var(--paper-2)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-lg" onClick={save}>Add contact</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── Add activity composer ─────────── */

function AddActivityDrawer({ onClose, onSave }){
  const [type, setType] = useState("followup");
  const [note, setNote] = useState("");
  useEffect(()=>{
    const h = e => { if(e.key==="Escape") onClose(); };
    document.addEventListener("keydown", h);
    return ()=>document.removeEventListener("keydown", h);
  },[onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Add activity">
        <div className="modal-card" style={{width:460}}>
          <div style={{padding:"13px 18px",borderBottom:"1px solid var(--hairline)",background:"var(--paper-2)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <h3 style={{margin:0,fontSize:14.5,fontWeight:600}}>Add activity</h3>
              <p style={{margin:"2px 0 0",fontSize:12,color:"var(--muted)"}}>Logged to Acme Manufacturing · AC-3318</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{fontSize:14}}>✕</button>
          </div>
          <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",gap:6}}>
              {[["followup","Follow-up"],["meeting","Meeting"],["email","Email"],["note","Note"]].map(([k,l])=>(
                <button key={k} onClick={()=>setType(k)}
                  className={`btn btn-sm ${type===k?"btn-primary":""}`}>{l}</button>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:11,color:"var(--muted)",fontWeight:500}}>Notes / description</label>
              <div style={{border:"1px solid var(--line)",borderRadius:3,background:"var(--white)"}}>
                <textarea style={{border:0,outline:"none",padding:"8px 10px",font:"inherit",fontSize:13,color:"var(--ink)",resize:"vertical",minHeight:80,lineHeight:1.5,background:"transparent",width:"100%",display:"block"}}
                  value={note} onChange={e=>setNote(e.target.value)} placeholder="Describe the interaction or next step…" />
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Date","2026-05-17"],["Linked opportunity","OPP-2418"]].map(([l,v],i)=>(
                <div key={i} style={{display:"flex",flexDirection:"column",gap:4}}>
                  <label style={{fontSize:11,color:"var(--muted)",fontWeight:500}}>{l}</label>
                  <div style={{border:"1px solid var(--line)",borderRadius:3,background:"var(--white)",padding:"7px 10px",fontSize:13,color:"var(--ink)"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{padding:"11px 18px",borderTop:"1px solid var(--hairline)",background:"var(--paper-2)",display:"flex",justifyContent:"space-between"}}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-lg" onClick={()=>{onSave({type,note});}}>Log activity</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── App ─────────── */

function App(){
  const [scenario,         setScenario]         = useState("rep");
  const [selectedContact,  setSelectedContact]   = useState("CT-1001");
  const [selectedOpp,      setSelectedOpp]       = useState(null);
  const [showDuplicate,    setShowDuplicate]      = useState(true);
  const [showAddContact,   setShowAddContact]     = useState(false);
  const [showAddActivity,  setShowAddActivity]    = useState(false);
  const [toast,            setToast]             = useState(null);

  const user = scenario === "mgr" ? PERSONAS.mgr : PERSONAS.rep;
  const emptyContacts = scenario === "nocontacts";
  const contacts = emptyContacts ? [] : CONTACTS;
  const contact = CONTACTS.find(c=>c.id===selectedContact);

  function flash(msg){ setToast(msg); setTimeout(()=>setToast(null),2800); }

  function onAction(type){
    if(type==="add-contact") setShowAddContact(true);
    else if(type==="add-activity") setShowAddActivity(true);
    else if(type==="new-opp") flash("New opportunity form — opens in this screen");
  }

  function onSaveContact(data){
    setShowAddContact(false);
    flash(`✓ Contact "${data.name}" added to Acme Manufacturing`);
  }

  function onSaveActivity(data){
    setShowAddActivity(false);
    flash(`✓ ${data.type.charAt(0).toUpperCase()+data.type.slice(1)} logged to Acme Manufacturing`);
  }

  return (
    <div className="app" data-screen-label="07 Account Detail">
      <Sidebar user={user} />
      <div className="main">
        <TopBar user={user} />
        <div className="content">
          <ScenarioBar scenario={scenario} setScenario={setScenario} />
          <AccountHeader user={user} onAction={onAction} />
          <div style={{height:12}} />
          <RelationshipMap />
          {showDuplicate && (
            <DuplicateWarning
              onDismiss={()=>{ setShowDuplicate(false); flash("Duplicate flag dismissed — you can re-enable from account settings"); }}
              onReview={()=>flash("Opening duplicate review — ACME Mfg. Cleveland vs AC-3318")}
            />
          )}
          {/* main body grid */}
          <div className="acct-grid">
            {/* left column */}
            <div className="acct-left">
              <ContactsSection
                contacts={contacts}
                selectedId={selectedContact}
                onSelect={id=>setSelectedContact(id===selectedContact?null:id)}
                onAdd={()=>setShowAddContact(true)}
                emptyState={emptyContacts}
              />
              <div style={{height:12}} />
              <OpportunitiesSection selectedOppId={selectedOpp} onSelectOpp={setSelectedOpp} />
              <div style={{height:12}} />
              <ActivitiesSection onAdd={()=>setShowAddActivity(true)} />
            </div>
            {/* right column */}
            <div className="acct-right">
              <ContactDetailPanel contact={contact} />
              <div style={{height:12}} />
              <ManagerControls user={user} />
              <AuditPreview />
            </div>
          </div>
          <div className="foot-ruler">
            <span>SALES OPS CRM · ORION INDUSTRIAL · LOCAL PILOT</span>
            <span>USER {user.roleCode} · {user.initials} · ACCOUNT DETAIL</span>
            <span>AC-3318 · ACME MANUFACTURING · DACH-NORTH</span>
          </div>
        </div>
      </div>

      {showAddContact && <AddContactModal onClose={()=>setShowAddContact(false)} onSave={onSaveContact} />}
      {showAddActivity && <AddActivityDrawer onClose={()=>setShowAddActivity(false)} onSave={onSaveActivity} />}

      {toast && (
        <div className="toast"><span className="ok">✓</span>{toast}</div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
