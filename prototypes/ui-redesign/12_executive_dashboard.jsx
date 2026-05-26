/* eslint-disable */
const { useState } = React;

/* ─────────── User ─────────── */
const USER = { name:"Elena Morozova", role:"Executive", initials:"EM", color:"bg-f", roleCode:"EXE" };

/* ─────────── Pipeline  (128 opps · $8.72M) ─────────── */
const PIPELINE = [
  { stage:"Qualification", code:"Q", count:42, value:2800000, pct:100, stuck:1 },
  { stage:"Discovery",     code:"D", count:35, value:2200000, pct:79,  stuck:2 },
  { stage:"Proposal",      code:"P", count:28, value:2100000, pct:67,  stuck:4, warn:true },
  { stage:"Negotiation",   code:"N", count:23, value:1620000, pct:44,  stuck:2 },
];
const CLOSED_QTD = { code:"W", count:11, value:1040000 };

/* ─────────── Approval queues  (19 · Legal bottleneck · avg 36.4h) ─────────── */
const APPROVAL_QUEUES = [
  { dept:"Finance", abbr:"FIN", cls:"r-fin", pending:8,  overdue:1, avgH:"24h", sla:"48h" },
  { dept:"Legal",   abbr:"LEG", cls:"r-leg", pending:9,  overdue:3, avgH:"54h", sla:"72h", bottleneck:true },
  { dept:"Manager", abbr:"MGR", cls:"r-mgr", pending:2,  overdue:0, avgH:"8h",  sla:"24h" },
];
const APPR_TYPES = [
  { type:"Discount exception", count:8, value:2140000, detail:"avg 11.4% off list" },
  { type:"Payment terms",      count:4, value:1620000, detail:"NET-60 most common" },
  { type:"Legal / indemnity",  count:7, value:2960000, detail:"3 overdue in Legal queue" },
];

/* ─────────── Projection health ─────────── */
const PROJ = { refreshDuration:"12s", sourceEvents:"1,284", pendingImports:2, pendingMerges:5 };

function nextScheduled(last){
  const [date, time] = last.split(" ");
  const [h, m] = time.split(":").map(Number);
  return `${date} ${String((h+1)%24).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

/* ─────────── Drill-down opportunities ─────────── */
const ALL_OPPS = [
  {
    id:"OPP-2418", title:"Q3 Equipment Renewal",
    account:"Acme Manufacturing",    owner:"A. Petrova", team:"DACH-North",
    stageCode:"P", stageIdx:2, amount:145000, close:"2026-06-12",
    approvalStatus:"pending",  approvalLabel:"Finance",
    riskLabel:"SLA at risk · 23h left", riskSev:"warn",
    notes:"Strategic renewal. Competitor offered 9% rebate. Finance discount exception SLA expires tomorrow. Needs fast decision to protect close date.",
  },
  {
    id:"OPP-2502", title:"Sigma Castings Capital Order",
    account:"Sigma Castings GmbH",   owner:"J. Berg",    team:"DACH-North",
    stageCode:"P", stageIdx:2, amount:580000, close:"2026-05-29",
    approvalStatus:"overdue",  approvalLabel:"Finance OD",
    riskLabel:"Approval overdue · 5h past SLA", riskSev:"neg",
    notes:"Largest Q3 deal. Finance SLA breached 5h ago. Customer has given an EOD deadline today. Escalation required immediately.",
  },
  {
    id:"OPP-2385", title:"Carpathia Steel NET-90 Terms",
    account:"Carpathia Steel S.A.",  owner:"A. Petrova", team:"DACH-North",
    stageCode:"N", stageIdx:3, amount:264000, close:"2026-05-22",
    approvalStatus:"sentback", approvalLabel:"Sent Back",
    riskLabel:"Send-back 22d · no resubmit", riskSev:"neg",
    notes:"Finance sent back — justification insufficient. Needs payment record + NDA. Owner has not resubmitted. Close date slipped 8 days.",
  },
  {
    id:"OPP-2410", title:"Nordwerk Plant Retooling",
    account:"Nordwerk Tooling AG",   owner:"A. Petrova", team:"DACH-North",
    stageCode:"N", stageIdx:3, amount:412500, close:"2026-05-30",
    approvalStatus:"pending",  approvalLabel:"Finance",
    riskLabel:"Closing 13d · approval pending", riskSev:"warn",
    notes:"Customer treasury requires NET-60 terms. Terms exception in Finance queue. Close date is firm — fast decision needed.",
  },
  {
    id:"OPP-2360", title:"Vetra Logistics Pricing Model",
    account:"Vetra Logistics OÜ",   owner:"E. Vogel",   team:"DACH-North",
    stageCode:"P", stageIdx:2, amount:192000, close:"2026-06-28",
    approvalStatus:"legal",    approvalLabel:"Legal Review",
    riskLabel:"—", riskSev:"none",
    notes:"Indemnity carve-out under legal review by O. Markov. Expected to clear this week. Eva monitoring closely.",
  },
  {
    id:"OPP-2170", title:"Schwarz Maschinenbau Renewal",
    account:"Schwarz Maschinenbau",  owner:"M. Weber",   team:"DACH-South",
    stageCode:"N", stageIdx:3, amount:204000, close:"2026-05-20",
    approvalStatus:"approved", approvalLabel:"Approved",
    riskLabel:"—", riskSev:"none",
    notes:"Finance approved 9% discount. Standard terms. Contract prepared. On track to close 2026-05-20.",
  },
  {
    id:"OPP-2298", title:"Renvik Industri Pilot to Prod.",
    account:"Renvik Industri AB",    owner:"E. Vogel",   team:"DACH-North",
    stageCode:"D", stageIdx:1, amount:118000, close:"2026-08-20",
    approvalStatus:"none",     approvalLabel:"—",
    riskLabel:"No next step · 18d idle", riskSev:"warn",
    notes:"Promising discovery — pilot went well. No follow-up activity logged in 18 days. Owner must schedule next step or qualify out.",
  },
];

/* ─────────── Drill presets ─────────── */
const DP = {
  all:       { label:"All opportunities",          f:()=>true },
  pipeline:  { label:"Open pipeline · all stages", f:()=>true },
  approvals: { label:"Pending approvals",          f:o=>["pending","overdue","sentback","legal"].includes(o.approvalStatus) },
  turnover:  { label:"Active approval requests",   f:o=>["pending","overdue","sentback","legal"].includes(o.approvalStatus) },
  closingQ2: { label:"Closing Q2 2026",            f:o=>o.close<"2026-07-01" },
  stageQ:    { label:"Stage: Qualification",       f:o=>o.stageCode==="Q" },
  stageD:    { label:"Stage: Discovery",           f:o=>o.stageCode==="D" },
  stageP:    { label:"Stage: Proposal",            f:o=>o.stageCode==="P" },
  stageN:    { label:"Stage: Negotiation",         f:o=>o.stageCode==="N" },
  stageW:    { label:"Stage: Closed Won",          f:()=>false },
  apprFin:   { label:"Finance approval queue",     f:o=>o.approvalLabel.startsWith("Finance") },
  apprLeg:   { label:"Legal Review queue",         f:o=>o.approvalLabel.includes("Legal") },
  apprMgr:   { label:"Manager approval queue",     f:()=>false },
  risk:      { label:"Deals with risk signals",    f:o=>o.riskSev!=="none" },
};

/* ─────────── Helpers ─────────── */
function fmtMoney(n){
  if(n>=1_000_000) return `$${(n/1_000_000).toFixed(2)}M`;
  if(n>=1_000)     return `$${(n/1_000).toFixed(0)}K`;
  return `$${n}`;
}
function pillKind(s){
  return s==="approved"?"approved":s==="pending"?"pending":s==="overdue"?"rejected":s==="none"?"none":"sentback";
}
function riskColor(sev){
  return sev==="neg"?"var(--neg)":sev==="warn"?"var(--warn)":"var(--muted-2)";
}
const STAGE_NAMES = ["Qualification","Discovery","Proposal","Negotiation","Closed Won"];

/* ─────────── Primitives ─────────── */
function BrandMark(){ return <span className="brand-mark" aria-hidden />; }

function StagePip({ idx }){
  return (
    <span className="stage-pip">
      {["Q","D","P","N","W"].map((s,i)=>(
        <i key={s} className={i<idx?"on":i===idx?"flag":""} />
      ))}
    </span>
  );
}

function Pill({ kind, children }){
  return <span className={`pill p-${kind}`}><span className="pdot"></span>{children}</span>;
}

function Panel({ title, count, actions, filters, children }){
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">{title}{count!==undefined&&<em>{count}</em>}</div>
        <div className="panel-actions">{filters}{actions}</div>
      </div>
      {children}
    </section>
  );
}

/* ─────────── Sidebar ─────────── */
function Sidebar(){
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
        <div className="nav-section">
          <div className="nav-title">Workspace<em>01</em></div>
          <div className="nav-item active">
            <span className="nav-mark mono">DA</span>
            <span className="nav-label">Dashboard</span>
            <span className="nav-count"></span>
          </div>
        </div>
        <div className="nav-section">
          <div className="nav-title">Insights<em>04</em></div>
          <div className="nav-item">
            <span className="nav-mark mono">RE</span>
            <span className="nav-label">Reports</span>
            <span className="nav-count"></span>
          </div>
        </div>
      </nav>
      <div className="user-block">
        <div className={`avatar ${USER.color}`}>{USER.initials}</div>
        <div className="user-meta">
          <div className="user-name">{USER.name}</div>
          <div className="user-role">{USER.role}</div>
        </div>
        <span className="role-badge r-exe">{USER.roleCode}</span>
      </div>
    </aside>
  );
}

/* ─────────── TopBar ─────────── */
function TopBar(){
  return (
    <div className="topbar">
      <div className="crumb">
        <span className="pulse"><span className="pulse-dot" /> LOCAL PILOT</span>
        <span>Orion Industrial</span>
        <span className="sep">/</span>
        <strong>Executive Dashboard</strong>
      </div>
      <label className="search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="7" cy="7" r="5"/><path d="m11 11 3.5 3.5"/>
        </svg>
        <input placeholder="Search opportunities, accounts, approval requests…" />
        <kbd>⌘K</kbd>
      </label>
      <div className="top-actions">
        <button className="icon-btn" title="Notifications">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M3.5 12h9l-1-1.5V7a3.5 3.5 0 0 0-7 0v3.5L3.5 12Z"/>
            <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/>
          </svg>
          <span className="dot-badge mono">3</span>
        </button>
        <div className="role-pill">
          <span className={`avatar ${USER.color}`}>{USER.initials}</span>
          <span className="who"><b>Elena M.</b><span>{USER.role}</span></span>
          <span className="chev">▾</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Kpi tile ─────────── */
function Kpi({ label, value, unit, delta, foot, alert, active, onClick }){
  return (
    <div
      className={`kpi${onClick?" kpi-btn":""}${active?" kpi-active":""}`}
      onClick={onClick}
      role={onClick?"button":undefined}
      title={onClick?"Click to drill down":undefined}
    >
      <div className="kpi-label">
        <span>{label}</span>
        {delta&&<span className={`delta ${delta.dir}`}>{delta.dir==="up"?"▲":"▼"} {delta.v}</span>}
      </div>
      <div className="kpi-value" style={alert?{color:"var(--neg)"}:{}}>
        {value}{unit&&<small>{unit}</small>}
      </div>
      <div className="kpi-foot">{foot}</div>
    </div>
  );
}

/* ─────────── PipelineFunnel ─────────── */
function PipelineFunnel({ drillKey, onStage }){
  const maxVal = PIPELINE[0].value;
  return (
    <Panel
      title="Pipeline by stage"
      count="128 open"
      filters={<><span className="filterchip on">ALL TEAMS</span><span className="filterchip">Q2 2026</span></>}
      actions={<a onClick={()=>onStage("pipeline")} style={{cursor:"pointer"}}>All opportunities ›</a>}
    >
      <div className="funnel">
        <div style={{display:"grid",gridTemplateColumns:"132px 1fr 54px 88px 56px",gap:10,padding:"4px 0 8px",borderBottom:"1px solid var(--line)",marginBottom:2}}>
          {["Stage","Distribution","Deals","Value","Stuck"].map((h,i)=>(
            <div key={h} style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)",textAlign:i>=2?"right":"left"}}>{h}</div>
          ))}
        </div>
        {PIPELINE.map(s=>{
          const active = drillKey===`stage${s.code}`;
          return (
            <div
              key={s.code}
              onClick={()=>onStage(`stage${s.code}`)}
              style={{
                display:"grid",gridTemplateColumns:"132px 1fr 54px 88px 56px",
                gap:10,alignItems:"center",padding:"7px 0",
                borderBottom:"1px solid var(--hairline)",
                cursor:"pointer",
                background:active?"var(--accent-soft)":"transparent",
                transition:"background .12s",
              }}
            >
              <div style={{fontSize:12,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10.5,color:active?"var(--accent-2)":"var(--muted)",width:18,flexShrink:0}}>{s.code}</span>
                {s.stage}
              </div>
              <div style={{height:14,position:"relative",background:"var(--paper-2)",border:"1px solid var(--hairline)"}}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${s.pct}%`,background:s.warn?"var(--warn)":"var(--ink)"}} />
              </div>
              <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,textAlign:"right"}}>{s.count}</div>
              <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,textAlign:"right"}}>{fmtMoney(s.value)}</div>
              <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,textAlign:"right",color:s.stuck>3?"var(--neg)":s.stuck>1?"var(--warn)":"var(--muted)"}}>{s.stuck>0?s.stuck:"—"}</div>
            </div>
          );
        })}
        <div
          onClick={()=>onStage("stageW")}
          style={{display:"grid",gridTemplateColumns:"132px 1fr 54px 88px 56px",gap:10,alignItems:"center",padding:"7px 0",borderTop:"1px solid var(--line)",cursor:"pointer"}}
        >
          <div style={{fontSize:12,display:"flex",alignItems:"center",gap:8,color:"var(--pos)"}}>
            <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10.5,width:18,flexShrink:0}}>W</span>
            Closed Won QTD
          </div>
          <div style={{height:14,position:"relative",background:"var(--paper-2)",border:"1px solid var(--hairline)"}}>
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${Math.round(CLOSED_QTD.value/maxVal*100)}%`,background:"var(--pos)"}} />
          </div>
          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,textAlign:"right",color:"var(--pos)"}}>{CLOSED_QTD.count}</div>
          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,textAlign:"right",color:"var(--pos)"}}>{fmtMoney(CLOSED_QTD.value)}</div>
          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,textAlign:"right",color:"var(--muted)"}}>—</div>
        </div>
      </div>
      <div style={{borderTop:"1px solid var(--hairline)",padding:"9px 14px",display:"flex",gap:20,flexWrap:"wrap",fontSize:11.5,color:"var(--muted)"}}>
        <span>Open: <strong className="mono" style={{color:"var(--ink)"}}>$8.72M</strong></span>
        <span>Weighted: <strong className="mono" style={{color:"var(--accent-2)"}}>$3.18M</strong></span>
        <span>Stuck: <strong className="mono" style={{color:"var(--neg)"}}>9</strong></span>
      </div>
    </Panel>
  );
}

/* ─────────── Approval section ─────────── */
const QUEUE_KEY = { Finance:"apprFin", Legal:"apprLeg", Manager:"apprMgr" };

function ApprovalSection({ drillKey, onQueue }){
  const total   = APPROVAL_QUEUES.reduce((s,q)=>s+q.pending,0);
  const overdue = APPROVAL_QUEUES.reduce((s,q)=>s+q.overdue,0);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,minWidth:0}}>
      <Panel title="Approval queues" count={`${total} pending`} actions={<a style={{cursor:"pointer"}}>Approvals ›</a>}>
        {APPROVAL_QUEUES.map((q,i)=>{
          const key = QUEUE_KEY[q.dept];
          const active = drillKey===key;
          return (
            <div
              key={i}
              onClick={()=>onQueue(key)}
              style={{
                display:"grid",gridTemplateColumns:"56px 1fr auto",
                gap:12,alignItems:"center",padding:"10px 14px",
                borderBottom:i<APPROVAL_QUEUES.length-1?"1px solid var(--hairline)":"none",
                cursor:"pointer",
                background:active?"var(--accent-soft)":q.bottleneck?"#FBFAF0":"transparent",
                transition:"background .12s",
              }}
            >
              <span className={`role-badge ${q.cls}`}>{q.abbr}</span>
              <div>
                <div style={{fontSize:12.5,fontWeight:q.bottleneck?600:400,display:"flex",alignItems:"center",gap:7}}>
                  {q.dept}
                  {q.bottleneck&&(
                    <span style={{fontSize:9.5,fontFamily:"JetBrains Mono,monospace",color:"var(--accent-2)",border:"1px solid var(--accent)",borderRadius:2,padding:"1px 5px",letterSpacing:".05em"}}>BOTTLENECK</span>
                  )}
                </div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>SLA {q.sla} · avg {q.avgH} decision</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:16,fontVariantNumeric:"tabular-nums"}}>{q.pending}</span>
                {q.overdue>0?(
                  <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"var(--neg)",border:"1px solid #D6B0A8",background:"var(--neg-soft)",borderRadius:2,padding:"1px 5px"}}>{q.overdue} OD</span>
                ):(
                  <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"var(--pos)",border:"1px solid #B2C8A8",background:"var(--pos-soft)",borderRadius:2,padding:"1px 5px"}}>ON TIME</span>
                )}
              </div>
            </div>
          );
        })}
        <div style={{borderTop:"1px solid var(--hairline)",padding:"8px 14px",display:"flex",gap:16,fontSize:11.5,color:"var(--muted)"}}>
          <span>Total: <strong className="mono" style={{color:"var(--ink)"}}>{total}</strong></span>
          <span style={{color:"var(--neg)",fontWeight:600}}>▲ {overdue} past SLA</span>
          <span>Avg: <strong className="mono" style={{color:"var(--ink)"}}>36.4h</strong></span>
        </div>
      </Panel>

      <Panel title="Exception types" count="19">
        {APPR_TYPES.map((t,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"center",padding:"9px 14px",borderBottom:i<APPR_TYPES.length-1?"1px solid var(--hairline)":"none"}}>
            <div>
              <div style={{fontSize:12.5}}>{t.type}</div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{t.count} req · {fmtMoney(t.value)} · {t.detail}</div>
            </div>
            <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:15,color:"var(--muted)"}}>{t.count}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

/* ─────────── Projection health ─────────── */
function ProjectionHealth({ lastRefresh }){
  const rows = [
    ["Last refresh",          lastRefresh,              false],
    ["Refresh duration",      PROJ.refreshDuration,     false],
    ["Source events included",PROJ.sourceEvents,        false],
    ["Pending imports",       String(PROJ.pendingImports),  PROJ.pendingImports>0],
    ["Pending merge refresh", String(PROJ.pendingMerges),   PROJ.pendingMerges>0],
    ["Next scheduled",        nextScheduled(lastRefresh), false],
  ];
  return (
    <Panel title="Projection health">
      {rows.map(([label,val,warn],i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center",padding:"7px 14px",borderBottom:i<rows.length-1?"1px solid var(--hairline)":"none"}}>
          <span style={{fontSize:11.5,color:"var(--muted)"}}>{label}</span>
          <span className="mono" style={{fontSize:11.5,color:warn?"var(--accent-2)":"var(--ink)",fontWeight:warn?600:400}}>{val}</span>
        </div>
      ))}
    </Panel>
  );
}

/* ─────────── Access note ─────────── */
function AccessNote(){
  return (
    <div style={{
      display:"flex",alignItems:"flex-start",gap:10,
      background:"var(--paper-2)",border:"1px solid var(--hairline)",
      padding:"10px 14px",margin:"18px 0 0",
      fontSize:12,color:"var(--muted-2)",lineHeight:1.55,
    }}>
      <span style={{flexShrink:0,marginTop:1,fontSize:14,color:"var(--info)"}}>ⓘ</span>
      <span>
        <strong style={{color:"var(--ink-2)"}}>Executive access</strong> — aggregate metrics and permitted drill-down records only.
        Drill-down respects role access and field visibility rules.{" "}
        <strong style={{color:"var(--ink-2)"}}>Sensitive fields may be hidden even when the aggregate includes them.</strong>
      </span>
    </div>
  );
}

/* ─────────── Drill-down table ─────────── */
function DrillDown({ rows, drillLabel, selectedId, onSelect }){
  if(rows.length===0){
    return (
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Drill-down <em>0 results</em></div>
          <div className="panel-actions">
            <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:"var(--muted)"}}>{drillLabel}</span>
          </div>
        </div>
        <div style={{padding:"52px 24px",textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:14,fontFamily:"JetBrains Mono,monospace",color:"var(--line)"}}>∅</div>
          <div style={{fontSize:13,fontWeight:500,color:"var(--ink-2)",marginBottom:6}}>No records match this filter</div>
          <div style={{fontSize:12,color:"var(--muted)",maxWidth:320,margin:"0 auto",lineHeight:1.55}}>
            The selected view returned no permitted drill-down records.<br />
            Try a different metric, stage, or queue.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          Drill-down <em>{rows.length} result{rows.length!==1?"s":""}</em>
        </div>
        <div className="panel-actions">
          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:"var(--muted)"}}>{drillLabel}</span>
        </div>
      </div>
      <div style={{overflowX:"auto"}}>
        <table className="t" style={{minWidth:860}}>
          <colgroup>
            <col style={{width:"162px"}}/>
            <col style={{width:"130px"}}/>
            <col style={{width:"82px"}}/>
            <col style={{width:"82px"}}/>
            <col style={{width:"52px"}}/>
            <col style={{width:"72px"}}/>
            <col style={{width:"88px"}}/>
            <col style={{width:"100px"}}/>
            <col />
          </colgroup>
          <thead><tr>
            <th>Opportunity</th>
            <th>Account</th>
            <th>Owner</th>
            <th>Team</th>
            <th>Stage</th>
            <th className="num">Amount</th>
            <th>Close Date</th>
            <th>Approval Status</th>
            <th>Risk Signal</th>
          </tr></thead>
          <tbody>
            {rows.map(o=>(
              <tr
                key={o.id}
                className={selectedId===o.id?"selected":""}
                onClick={()=>onSelect(o.id===selectedId?null:o.id)}
                style={{cursor:"pointer"}}
              >
                <td className="truncate">
                  {o.title}
                  <span className="sub mono">{o.id}</span>
                </td>
                <td className="truncate">{o.account}</td>
                <td style={{fontSize:12}}>{o.owner}</td>
                <td style={{fontSize:11.5,color:"var(--muted)"}}>{o.team}</td>
                <td style={{textAlign:"center"}}><StagePip idx={o.stageIdx} /></td>
                <td className="num">{fmtMoney(o.amount)}</td>
                <td className="mono" style={{fontSize:12}}>{o.close}</td>
                <td><Pill kind={pillKind(o.approvalStatus)}>{o.approvalLabel}</Pill></td>
                <td className="truncate">
                  <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:riskColor(o.riskSev)}}>{o.riskLabel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────── Opportunity preview ─────────── */
function OppPreview({ opp }){
  if(!opp){
    return (
      <div className="panel" style={{padding:"40px 20px",textAlign:"center",minHeight:200}}>
        <div style={{fontSize:26,color:"var(--line)",marginBottom:12,fontFamily:"JetBrains Mono,monospace"}}>↗</div>
        <div style={{fontSize:12.5,fontWeight:500,color:"var(--ink-2)",marginBottom:8}}>Opportunity preview</div>
        <div style={{fontSize:11.5,color:"var(--muted)",lineHeight:1.6}}>
          Select a row in the<br />drill-down table to preview.
        </div>
      </div>
    );
  }
  const meta = [
    ["Account", opp.account],
    ["Owner",   `${opp.owner} · ${opp.team}`],
    ["Amount",  fmtMoney(opp.amount)],
    ["Close",   opp.close],
  ];
  return (
    <div className="panel">
      <div className="panel-head" style={{flexDirection:"column",alignItems:"flex-start",gap:3}}>
        <div className="panel-title" style={{fontSize:12.5,fontWeight:600}}>{opp.title}</div>
        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:"var(--muted)"}}>{opp.id}</div>
      </div>

      <div style={{padding:"10px 14px",borderBottom:"1px solid var(--hairline)",display:"flex",alignItems:"center",gap:10}}>
        <StagePip idx={opp.stageIdx} />
        <span style={{fontSize:12,color:"var(--muted)"}}>Stage</span>
        <span style={{fontWeight:500,fontSize:12}}>{STAGE_NAMES[opp.stageIdx]}</span>
      </div>

      {meta.map(([l,v])=>(
        <div key={l} style={{display:"grid",gridTemplateColumns:"64px 1fr",gap:10,padding:"7px 14px",borderBottom:"1px solid var(--hairline)",alignItems:"start"}}>
          <span style={{fontSize:10.5,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".08em",paddingTop:1}}>{l}</span>
          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,color:"var(--ink)",wordBreak:"break-word"}}>{v}</span>
        </div>
      ))}

      <div style={{padding:"8px 14px",borderBottom:"1px solid var(--hairline)",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:10.5,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".08em",width:64,flexShrink:0}}>Approval</span>
        <Pill kind={pillKind(opp.approvalStatus)}>{opp.approvalLabel}</Pill>
      </div>

      {opp.riskSev!=="none"&&(
        <div style={{padding:"8px 14px",borderBottom:"1px solid var(--hairline)",display:"flex",alignItems:"flex-start",gap:8}}>
          <span style={{fontSize:10.5,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".08em",width:64,flexShrink:0,paddingTop:1}}>Risk</span>
          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:riskColor(opp.riskSev),lineHeight:1.5}}>{opp.riskLabel}</span>
        </div>
      )}

      <div style={{padding:"10px 14px",borderBottom:"1px solid var(--hairline)"}}>
        <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)",marginBottom:6}}>Context</div>
        <div style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.6}}>{opp.notes}</div>
      </div>

      <div style={{padding:"8px 14px",background:"var(--paper-2)",fontSize:11,color:"var(--muted-2)",lineHeight:1.5}}>
        ⓘ Sensitive fields may be hidden per role access and field visibility policy.
      </div>
    </div>
  );
}

/* ─────────── App ─────────── */
function App(){
  const [drillKey,    setDrillKey]    = useState("all");
  const [selectedId,  setSelectedId]  = useState(null);
  const [refreshMsg,  setRefreshMsg]  = useState(null);
  const [lastRefresh, setLastRefresh] = useState("2026-05-17 08:40");

  const drillRows   = ALL_OPPS.filter(DP[drillKey].f);
  const drillLabel  = DP[drillKey].label;
  const selectedOpp = selectedId ? ALL_OPPS.find(o=>o.id===selectedId) : null;
  const isLoading   = refreshMsg==="loading";
  const isSuccess   = refreshMsg&&refreshMsg!=="loading";

  function selectDrill(key){
    setDrillKey(key);
    setSelectedId(null);
  }

  function handleRefresh(){
    if(isLoading) return;
    setRefreshMsg("loading");
    setTimeout(()=>{
      setLastRefresh("2026-05-17 08:41");
      setRefreshMsg("Updated 08:41");
      setTimeout(()=>setRefreshMsg(null), 3500);
    }, 1800);
  }

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <TopBar />
        <div className="content">

          {/* Page head */}
          <div className="page-head">
            <div>
              <h1 className="page-title">Executive Dashboard</h1>
              <div className="page-sub">
                <span className="mono">Q2 2026</span>
                <span className="sep">·</span>
                <span>All teams · Orion Industrial</span>
                <span className="sep">·</span>
                <span>Projection: <span className="mono">{lastRefresh}</span></span>
                <span className="sep">·</span>
                <span className="mono" style={{color:"var(--muted-2)"}}>LOCAL PILOT</span>
              </div>
            </div>
            <div className="page-actions">
              <button
                className={`btn${isLoading?" btn-busy":""}`}
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh reporting projection"
              >
                {isLoading?(
                  <><span className="spin">↻</span>Refreshing…</>
                ):isSuccess?(
                  <><span style={{color:"var(--pos)"}}>✓</span>{refreshMsg}</>
                ):(
                  <>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 8A6 6 0 1 1 8 2"/><path d="M14 2v4h-4"/>
                    </svg>
                    Refresh Projection
                  </>
                )}
              </button>
              <button className="btn">Export Summary</button>
            </div>
          </div>

          {/* KPI strip */}
          <div className="kpis">
            <Kpi
              label="Open pipeline"
              value="$8.72" unit="M"
              foot="128 open opportunities · weighted $3.18M"
              delta={{dir:"up",v:"+2.4%"}}
              active={drillKey==="pipeline"} onClick={()=>selectDrill("pipeline")}
            />
            <Kpi
              label="Pending approvals"
              value="19"
              foot="Bottleneck: Legal Review · 3 overdue"
              delta={{dir:"up",v:"3 OD"}} alert
              active={drillKey==="approvals"} onClick={()=>selectDrill("approvals")}
            />
            <Kpi
              label="Avg approval turnaround"
              value="36.4" unit="h"
              foot="Target 48h SLA · Legal queue avg 54h"
              active={drillKey==="turnover"} onClick={()=>selectDrill("turnover")}
            />
            <Kpi
              label="Weighted forecast"
              value="$3.18" unit="M"
              foot={`Q2 2026 · projection ${lastRefresh}`}
              active={drillKey==="closingQ2"} onClick={()=>selectDrill("closingQ2")}
            />
          </div>

          {/* Row 1 */}
          <div className="row r-2-1">
            <PipelineFunnel drillKey={drillKey} onStage={selectDrill} />
            <div style={{display:"flex",flexDirection:"column",gap:14,minWidth:0}}>
              <ApprovalSection drillKey={drillKey} onQueue={selectDrill} />
              <ProjectionHealth lastRefresh={lastRefresh} />
            </div>
          </div>

          {/* Access note */}
          <AccessNote />

          {/* Drill-down + preview */}
          <div style={{height:18}} />
          <div className="work">
            <DrillDown
              rows={drillRows}
              drillLabel={drillLabel}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <div className="side-panel">
              <OppPreview opp={selectedOpp} />
            </div>
          </div>

          {/* Footer */}
          <div className="foot-ruler">
            <span>12 · Executive Dashboard</span>
            <span>Orion Industrial · LOCAL PILOT · EU-CENTRAL-1</span>
            <span className="mono">Projection {lastRefresh} · access-controlled aggregate</span>
          </div>

        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
