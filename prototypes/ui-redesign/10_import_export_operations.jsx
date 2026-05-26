/* eslint-disable */
const { useState, useEffect, useRef } = React;

/* ─────────── Data ─────────── */

const USER = { name:"Irina Volkova", role:"RevOps Administrator", initials:"IV", color:"bg-e", roleCode:"OPS" };

const MODULES = [
  { key:"dashboard",  code:"DA", label:"Dashboard",      section:"workspace" },
  { key:"accounts",   code:"AC", label:"Accounts",       section:"workspace" },
  { key:"opps",       code:"OP", label:"Opportunities",  section:"workspace" },
  { key:"approvals",  code:"AP", label:"Approvals",      section:"governance" },
  { key:"imports",    code:"IM", label:"Imports",        section:"data" },
  { key:"duplicates", code:"DU", label:"Duplicates",     section:"data" },
  { key:"metadata",   code:"MA", label:"Metadata Admin", section:"data" },
  { key:"reports",    code:"RE", label:"Reports",        section:"insights" },
  { key:"audit",      code:"AU", label:"Audit",          section:"insights" },
];
const SECTIONS = [
  { key:"workspace",  label:"Workspace",       index:"01" },
  { key:"governance", label:"Governance",      index:"02" },
  { key:"data",       label:"Data & Quality",  index:"03" },
  { key:"insights",   label:"Insights",        index:"04" },
];

const MAPPING = [
  { src:"Account Name",       target:"Account.name",                type:"Text",   req:true,  status:"mapped",   sample:"Acme Manufacturing" },
  { src:"Contact Email",      target:"Contact.email",               type:"Email",  req:false, status:"mapped",   sample:"t.brooks@acme-mfg.example" },
  { src:"Opportunity Title",  target:"Opportunity.title",           type:"Text",   req:true,  status:"mapped",   sample:"Q3 Equipment Renewal" },
  { src:"Expected Amount",    target:"Opportunity.expectedAmount",  type:"Number", req:true,  status:"mapped",   sample:"145000" },
  { src:"Close Date",         target:"Opportunity.closeDate",       type:"Date",   req:true,  status:"mapped",   sample:"2026-06-28" },
  { src:"Stage",              target:"Opportunity.stage",           type:"Select", req:true,  status:"mapped",   sample:"Proposal" },
  { src:"Region",             target:"region (custom)",             type:"Select", req:false, status:"custom",   sample:"DACH-North" },
  { src:"Payment Risk Level", target:"payment_risk_level (custom)", type:"Select", req:false, status:"custom",   sample:"Medium" },
  { src:"Internal Notes",     target:"— not mapped —",              type:"Text",   req:false, status:"unmapped", sample:"Q3 renewal budget confirmed" },
];

const ERRORS = [
  { row:14,  sev:"error",   entity:"Opportunity", field:"closeDate",      src:"28/06/2026",          issue:"Invalid date format — expected YYYY-MM-DD",       fix:"2026-06-28" },
  { row:27,  sev:"error",   entity:"Opportunity", field:"stage",          src:"Pre-Proposal",        issue:"Unknown stage value — not in allowed list",        fix:"Proposal" },
  { row:89,  sev:"error",   entity:"Account",     field:"name",           src:"(empty)",             issue:"Required field is empty",                          fix:"Provide account name" },
  { row:103, sev:"warning", entity:"Contact",     field:"email",          src:"no-email",            issue:"Email format invalid — field will be skipped",     fix:"Verify and correct email" },
  { row:201, sev:"warning", entity:"Opportunity", field:"expectedAmount", src:"(empty)",             issue:"Numeric field empty — will import as null",         fix:"Add expected amount" },
  { row:312, sev:"error",   entity:"Opportunity", field:"closeDate",      src:"TBD",                 issue:"Invalid date value",                              fix:"Provide valid date (YYYY-MM-DD)" },
  { row:445, sev:"warning", entity:"Contact",     field:"email",          src:"invalid@",            issue:"Email format invalid",                            fix:"Correct email format" },
  { row:601, sev:"error",   entity:"Opportunity", field:"stage",          src:"Tender",              issue:"Unknown stage value",                             fix:"Qualification / Discovery / Proposal / Negotiation" },
];

const JOBS = [
  { id:"IMP-0241", type:"import", entity:"Account",     file:"orion_accounts_may.csv",    status:"processing", pct:68, rows:4128, created:2720, updated:0,  rejected:0,  by:"I. Volkova", at:"08:12", eta:"~09:40" },
  { id:"IMP-0240", type:"import", entity:"Contact",     file:"contacts_legacy_q1.csv",    status:"processing", pct:22, rows:12602,created:2772, updated:0,  rejected:18, by:"I. Volkova", at:"08:04", eta:"~10:15" },
  { id:"IMP-0239", type:"import", entity:"Opportunity", file:"open_opps_pipeline.csv",    status:"partial",   pct:100,rows:812,  created:798,  updated:0,  rejected:14, by:"L. Hassan",  at:"yest 14:30", fin:"yest 14:52" },
  { id:"IMP-0238", type:"import", entity:"Account",     file:"accounts_de_region.csv",    status:"failed",    pct:54, rows:1940, created:0,    updated:0,  rejected:0,  by:"I. Volkova", at:"yest 11:00", fin:"yest 11:08", error:"Schema mismatch — required field 'name' not mapped" },
  { id:"EXP-0041", type:"export", entity:"Opportunity", file:"Team Open Pipeline",        status:"ready",     pct:100,rows:46,   created:0,    updated:0,  rejected:0,  by:"I. Volkova", at:"07:50", fin:"07:51" },
];

const EXPORT_PRESETS = [
  { id:"ep1", label:"My Team Open Opportunities", entity:"Opportunity", rows:46,  access:"DACH-North scope · 46 open opps" },
  { id:"ep2", label:"Accounts with Duplicate Warning", entity:"Account", rows:24, access:"All accounts with duplicate flag" },
  { id:"ep3", label:"Contacts Missing Email",     entity:"Contact",     rows:312, access:"Contacts where email is null" },
  { id:"ep4", label:"Opportunities Pending Approval", entity:"Opportunity", rows:7,access:"Approval status = pending or legal" },
];

/* ─────────── Helpers ─────────── */

function fmtRows(n){ return n>=1000?`${(n/1000).toFixed(1)}K`:String(n); }
function Pill({ kind, children }){ return <span className={`pill p-${kind}`}><span className="pdot"></span>{children}</span>; }
function BrandMark(){ return <span className="brand-mark" aria-hidden />; }

function ProgressBar({ pct, kind }){
  const color = kind==="failed"?"var(--neg)":kind==="partial"?"var(--accent-2)":kind==="ready"?"var(--pos)":"var(--info)";
  return (
    <div style={{height:6,background:"var(--paper-2)",border:"1px solid var(--hairline)",borderRadius:1,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${Math.min(100,pct)}%`,background:color,transition:"width .4s ease"}} />
    </div>
  );
}

function statusPill(s){
  if(s==="processing") return <Pill kind="running">Processing</Pill>;
  if(s==="partial")    return <Pill kind="warn">Partial success</Pill>;
  if(s==="completed")  return <Pill kind="approved">Completed</Pill>;
  if(s==="failed")     return <Pill kind="rejected">Failed</Pill>;
  if(s==="ready")      return <Pill kind="approved">Ready</Pill>;
  if(s==="queued")     return <Pill kind="pending">Queued</Pill>;
  return <Pill kind="none">{s}</Pill>;
}

/* ─────────── Shell ─────────── */

function Sidebar(){
  const counts = { imports:2, duplicates:24, metadata:3, approvals:7 };
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
              {items.map(m=>(
                <div key={m.key} className={`nav-item ${m.key==="imports"?"active":""}`} title={m.label}>
                  <span className="nav-mark mono">{m.code}</span>
                  <span className="nav-label">{m.label}</span>
                  <span className={`nav-count mono ${(m.key==="imports"||m.key==="duplicates")&&counts[m.key]>0?"alert":""}`}>{counts[m.key]||""}</span>
                </div>
              ))}
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

function TopBar(){
  return (
    <div className="topbar">
      <div className="crumb">
        <span className="pulse"><span className="pulse-dot" /> LOCAL PILOT</span>
        <span>Data &amp; Quality</span>
        <span className="sep">/</span>
        <strong>Imports &amp; Exports</strong>
        <span className="sep">·</span>
        <span className="mono" style={{fontSize:11,color:"var(--muted)"}}>2 jobs running</span>
      </div>
      <label className="search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="m11 11 3.5 3.5"/></svg>
        <input placeholder="Search jobs, files, entities…" />
        <kbd>⌘K</kbd>
      </label>
      <div className="top-actions">
        <button className="icon-btn"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3.5 12h9l-1-1.5V7a3.5 3.5 0 0 0-7 0v3.5L3.5 12Z"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/></svg><span className="dot-badge mono">3</span></button>
        <button className="role-pill">
          <span className={`avatar ${USER.color}`}>{USER.initials}</span>
          <span className="who"><b>Irina V.</b><span>{USER.role}</span></span>
          <span className="chev">▾</span>
        </button>
      </div>
    </div>
  );
}

/* ─────────── KPI strip ─────────── */

function KPIStrip(){
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",border:"1px solid var(--line)",background:"var(--white)",marginBottom:12}}>
      {[
        { l:"Imports running",    v:"2",      f:"14,730 rows in flight",       alert:false },
        { l:"Rows processed today",v:"15,022", f:"2 jobs · est. 3h remaining", alert:false },
        { l:"Rows rejected",      v:"32",     f:"14 from IMP-0239 · 18 pending",alert:true  },
        { l:"Exports ready",      v:"1",      f:"EXP-0041 · Team Opps · 46 rows",alert:false },
        { l:"Jobs needing review",v:"2",      f:"1 partial · 1 failed",        alert:true  },
      ].map((k,i)=>(
        <div key={i} style={{padding:"12px 14px",borderRight:i<4?"1px solid var(--hairline)":"none"}}>
          <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)"}}>{k.l}</div>
          <div className="mono" style={{fontSize:22,fontWeight:600,marginTop:4,color:k.alert?"var(--neg)":"var(--ink)"}}>{k.v}</div>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{k.f}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────── Scenario + Tab bars ─────────── */

function ScenarioBar({ scenario, setScenario }){
  const opts = [
    { key:"mapping",   label:"Import · Mapping" },
    { key:"validated", label:"Import · Validated" },
    { key:"processing",label:"Import · Processing" },
    { key:"completed", label:"Import · Completed" },
  ];
  return (
    <div style={{display:"flex",alignItems:"center",gap:0,background:"var(--paper-2)",border:"1px solid var(--line-2)",borderRadius:18,padding:3,width:"fit-content",marginBottom:12}}>
      <span className="mono" style={{fontSize:9.5,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",padding:"0 10px 0 6px",borderRight:"1px solid var(--line-2)",height:24,display:"inline-flex",alignItems:"center"}}>Scenario</span>
      {opts.map(o=>(
        <button key={o.key} className={`scenario-opt ${scenario===o.key?"on":""}`} onClick={()=>setScenario(o.key)}>{o.label}</button>
      ))}
    </div>
  );
}

function TabBar({ active, setActive }){
  const tabs = [
    { key:"import",  label:"Import",      badge:"IM" },
    { key:"export",  label:"Export",      badge:"EX" },
    { key:"history", label:"Job History", badge:null },
    { key:"errors",  label:"Row Errors",  badge:null },
  ];
  return (
    <div style={{display:"flex",gap:0,borderBottom:"1px solid var(--line)",marginBottom:14,background:"var(--white)"}}>
      {tabs.map(t=>(
        <button key={t.key} onClick={()=>setActive(t.key)}
          style={{padding:"10px 18px",fontSize:13,fontWeight:active===t.key?600:400,color:active===t.key?"var(--ink)":"var(--muted)",borderBottom:active===t.key?"2px solid var(--accent)":"2px solid transparent",background:"none",border:0,borderBottomStyle:"solid",cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:7}}>
          {t.label}
          {t.badge && <span className="mono" style={{fontSize:10,padding:"0 5px",background:"var(--paper-2)",border:"1px solid var(--line)",borderRadius:2,color:"var(--muted)"}}>{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

/* ─────────── Import step bar ─────────── */

function StepBar({ step }){
  const steps = ["Upload","Map Columns","Validate","Execute","Results"];
  return (
    <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:16,background:"var(--white)",border:"1px solid var(--line)",padding:"10px 16px",overflowX:"auto"}}>
      {steps.map((s,i)=>{
        const n = i+1;
        const done = n < step;
        const cur  = n === step;
        return (
          <React.Fragment key={i}>
            <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
              <div style={{
                width:22,height:22,borderRadius:"50%",
                background:done?"var(--pos)":cur?"var(--ink)":"var(--paper-2)",
                border:`1.5px solid ${done?"var(--pos)":cur?"var(--ink)":"var(--line)"}`,
                display:"grid",placeItems:"center",
                fontFamily:'"JetBrains Mono",monospace',fontSize:9.5,fontWeight:700,
                color:done||cur?"var(--paper)":"var(--muted)",
              }}>{done?"✓":n}</div>
              <span style={{fontSize:12.5,fontWeight:cur?600:400,color:cur?"var(--ink)":done?"var(--muted-2)":"var(--muted)",whiteSpace:"nowrap"}}>{s}</span>
            </div>
            {i<steps.length-1 && <div style={{flex:1,minWidth:16,height:1,background:"var(--line-2)",margin:"0 8px"}} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─────────── Import steps ─────────── */

function Step1_Upload({ entity, setEntity, mode, setMode }){
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:14,alignItems:"start"}}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* dropzone */}
        <div className="panel">
          <div className="panel-head"><div className="panel-title">CSV file <span style={{color:"var(--pos)",fontFamily:'"JetBrains Mono",monospace',fontSize:10,fontWeight:400,textTransform:"none",letterSpacing:0}}>✓ File loaded</span></div></div>
          <div style={{padding:"20px",background:"var(--pos-soft)",border:"1px dashed var(--pos)",margin:"14px",display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:40,height:40,background:"var(--white)",border:"1px solid var(--line)",display:"grid",placeItems:"center",fontFamily:'"JetBrains Mono",monospace',fontSize:9,color:"var(--muted-2)"}}>CSV</div>
            <div>
              <div style={{fontWeight:600,fontSize:13.5,marginBottom:2}}>open_opportunities_q3.csv</div>
              <div className="mono" style={{fontSize:11,color:"var(--muted)"}}>812 rows · 8 columns detected · 44.2 KB</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{marginLeft:"auto"}}>Replace file</button>
          </div>
          <div style={{padding:"0 14px 14px"}}>
            <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:6}}>Detected columns</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {["Account Name","Contact Email","Opportunity Title","Expected Amount","Close Date","Stage","Region","Payment Risk Level","Internal Notes"].map(c=>(
                <span key={c} style={{fontSize:11.5,fontFamily:'"JetBrains Mono",monospace',background:"var(--paper-2)",border:"1px solid var(--hairline)",padding:"2px 7px",borderRadius:2,color:"var(--ink-2)"}}>{c}</span>
              ))}
            </div>
          </div>
        </div>
        {/* sample rows */}
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Sample rows <em>first 3 of 812</em></div></div>
          <div style={{overflowX:"auto"}}>
            <table className="t" style={{fontSize:11.5,minWidth:700}}>
              <thead><tr>
                {["Account Name","Opp Title","Amount","Close Date","Stage","Region"].map(c=><th key={c}>{c}</th>)}
              </tr></thead>
              <tbody>
                {[
                  ["Acme Manufacturing","Q3 Equipment Renewal","145000","2026-06-28","Proposal","DACH-North"],
                  ["Nordwerk Tooling AG","Plant Retooling","412500","2026-05-30","Negotiation","DACH-North"],
                  ["Sigma Castings GmbH","Capital Order","580000","2026-05-29","Proposal","DACH-North"],
                ].map((r,i)=>(
                  <tr key={i}>{r.map((v,j)=><td key={j} className={j===2?"mono":""}>{v}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* config panel */}
      <div className="panel" style={{position:"sticky",top:72}}>
        <div className="panel-head"><div className="panel-title">Import configuration</div></div>
        <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
          <div>
            <div style={{fontSize:11,color:"var(--muted)",fontWeight:500,marginBottom:5}}>Target entity</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {["Account","Contact","Opportunity"].map(e=>(
                <label key={e} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",border:`1.5px solid ${entity===e?"var(--ink)":"var(--line)"}`,background:entity===e?"var(--select)":"var(--white)",cursor:"pointer"}}>
                  <input type="radio" name="entity" checked={entity===e} onChange={()=>setEntity(e)} style={{accentColor:"var(--accent-2)"}} />
                  <span style={{fontWeight:entity===e?600:400,fontSize:13}}>{e}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:11,color:"var(--muted)",fontWeight:500,marginBottom:5}}>Import mode</div>
            {["Create only","Basic update"].map(m=>(
              <label key={m} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",border:`1.5px solid ${mode===m?"var(--ink)":"var(--line)"}`,background:mode===m?"var(--select)":"var(--white)",cursor:"pointer",marginBottom:4}}>
                <input type="radio" name="mode" checked={mode===m} onChange={()=>setMode(m)} style={{accentColor:"var(--accent-2)"}} />
                <div>
                  <div style={{fontWeight:mode===m?600:400,fontSize:13}}>{m}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>{m==="Create only"?"Skip rows matching existing records":"Update matching records in-place"}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{fontSize:11.5,color:"var(--muted)",padding:"8px 10px",background:"var(--info-soft)",border:"1px solid #A4C0C8",lineHeight:1.5}}>
            Import runs as an async job — you can close this screen and check progress in Job History.
          </div>
        </div>
      </div>
    </div>
  );
}

function Step2_Map(){
  const statusStyle = {
    mapped:   { c:"var(--pos)",  bg:"var(--pos-soft)",  b:"#B2C8A8", l:"Mapped" },
    custom:   { c:"var(--info)", bg:"var(--info-soft)", b:"#A4C0C8", l:"Custom field" },
    unmapped: { c:"var(--muted)",bg:"var(--paper-2)",   b:"var(--line)", l:"Unmapped" },
    missing:  { c:"var(--neg)",  bg:"var(--neg-soft)",  b:"#D6B0A8", l:"Missing required" },
  };
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">Column mapping <em>open_opportunities_q3.csv → Opportunity</em></div>
        <div className="panel-actions"><span style={{fontSize:11.5,color:"var(--muted)"}}>8 of 9 columns mapped · 1 unmapped optional</span></div>
      </div>
      <div style={{overflowX:"auto"}}>
        <table className="t" style={{minWidth:860}}>
          <colgroup><col style={{width:160}}/><col/><col style={{width:90}}/><col style={{width:50}}/><col style={{width:120}}/><col style={{width:160}}/></colgroup>
          <thead><tr><th>Source column</th><th>Target field</th><th>Type</th><th style={{textAlign:"center"}}>Req.</th><th>Status</th><th>Sample value</th></tr></thead>
          <tbody>
            {MAPPING.map((m,i)=>{
              const sc = statusStyle[m.status];
              return (
                <tr key={i}>
                  <td className="mono" style={{fontSize:12}}>{m.src}</td>
                  <td>
                    <div style={{border:"1px solid var(--line)",borderRadius:3,background:"var(--white)",padding:"5px 8px",display:"flex",alignItems:"center",fontSize:12.5}}>
                      <span className="mono" style={{flex:1,color:m.status==="unmapped"?"var(--muted)":"var(--ink-2)"}}>{m.target}</span>
                      <span style={{color:"var(--muted)",fontSize:11}}>▾</span>
                    </div>
                  </td>
                  <td><span className="mono" style={{fontSize:11,background:"var(--paper-2)",border:"1px solid var(--hairline)",padding:"1px 5px",borderRadius:2}}>{m.type}</span></td>
                  <td style={{textAlign:"center"}}>{m.req?<span style={{color:"var(--neg)",fontWeight:700}}>✓</span>:<span style={{color:"var(--muted)"}}>—</span>}</td>
                  <td><span style={{fontSize:10.5,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em",color:sc.c,background:sc.bg,border:`1px solid ${sc.b}`,padding:"1px 6px",borderRadius:2,textTransform:"uppercase"}}>{sc.l}</span></td>
                  <td className="mono" style={{fontSize:11.5,color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.sample}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{padding:"10px 14px",background:"var(--warn-soft)",borderTop:"1px solid #D9BFA0",fontSize:12,color:"var(--ink-2)"}}>
        <span className="mono" style={{color:"var(--accent-2)",fontWeight:700,marginRight:8}}>Note</span>
        "Internal Notes" is unmapped — it will be ignored during import. 2 custom field mappings detected (Region → region, Payment Risk Level → payment_risk_level). Review before proceeding.
      </div>
    </section>
  );
}

function Step3_Validate(){
  const stats = [
    { l:"Valid rows",       v:780, c:"var(--pos)",     bg:"var(--pos-soft)"  },
    { l:"Warning rows",     v:24,  c:"var(--warn)",    bg:"var(--warn-soft)" },
    { l:"Rejected rows",    v:8,   c:"var(--neg)",     bg:"var(--neg-soft)"  },
    { l:"Duplicate candidates",v:12,c:"var(--info)",   bg:"var(--info-soft)" },
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",border:"1px solid var(--line)",background:"var(--white)"}}>
        {stats.map((s,i)=>(
          <div key={i} style={{padding:"12px 16px",borderRight:i<3?"1px solid var(--hairline)":"none"}}>
            <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)"}}>{s.l}</div>
            <div className="mono" style={{fontSize:28,fontWeight:700,marginTop:4,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>
      {/* progress */}
      <div style={{padding:"10px 14px",background:"var(--white)",border:"1px solid var(--line)"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12,color:"var(--muted)"}}>
          <span>Validation coverage</span>
          <span className="mono">96.1% valid · 3.9% flagged</span>
        </div>
        <div style={{height:10,background:"var(--paper-2)",border:"1px solid var(--hairline)",display:"flex",overflow:"hidden"}}>
          <div style={{width:"96%",background:"var(--pos)",opacity:.8}} />
          <div style={{width:"2.9%",background:"var(--warn)"}} />
          <div style={{flex:1,background:"var(--neg)"}} />
        </div>
        <div style={{display:"flex",gap:14,marginTop:6,fontSize:11}}>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,background:"var(--pos)",display:"inline-block"}} />Valid (780)</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,background:"var(--warn)",display:"inline-block"}} />Warnings (24)</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,background:"var(--neg)",display:"inline-block"}} />Rejected (8)</span>
        </div>
      </div>
      {/* error table */}
      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Row-level validation results <em>{ERRORS.length} issues</em></div>
          <div className="panel-actions"><span className="filterchip on mono">ALL</span><span className="filterchip mono">ERRORS</span><span className="filterchip mono">WARNINGS</span></div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table className="t" style={{minWidth:800}}>
            <colgroup><col style={{width:60}}/><col style={{width:80}}/><col style={{width:100}}/><col style={{width:130}}/><col style={{width:130}}/><col/><col style={{width:160}}/></colgroup>
            <thead><tr><th>Row</th><th>Severity</th><th>Entity</th><th>Field</th><th>Source value</th><th>Issue</th><th>Suggested fix</th></tr></thead>
            <tbody>
              {ERRORS.map((e,i)=>(
                <tr key={i} style={{background:e.sev==="error"?"#FBEFE8":"inherit"}}>
                  <td className="mono" style={{fontSize:12}}>{e.row}</td>
                  <td>
                    <span style={{fontSize:10.5,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em",textTransform:"uppercase",color:e.sev==="error"?"var(--neg)":"var(--accent-2)",background:e.sev==="error"?"var(--neg-soft)":"var(--warn-soft)",border:`1px solid ${e.sev==="error"?"#D6B0A8":"#D9BFA0"}`,padding:"1px 5px",borderRadius:2}}>{e.sev}</span>
                  </td>
                  <td style={{fontSize:12}}>{e.entity}</td>
                  <td className="mono" style={{fontSize:11.5}}>{e.field}</td>
                  <td className="mono" style={{fontSize:11.5,color:"var(--muted)"}}>{e.src}</td>
                  <td style={{fontSize:12}}>{e.issue}</td>
                  <td style={{fontSize:12,color:"var(--info)"}}>{e.fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{padding:"9px 14px",background:"var(--info-soft)",borderTop:"1px solid #A4C0C8",fontSize:12,color:"var(--ink-2)"}}>
          <span className="mono" style={{color:"var(--info)",fontWeight:700,marginRight:8}}>Note</span>
          8 rows will be rejected. 780 valid rows will be imported. Import can proceed with errors — rejected rows will be available for download after job completes.
        </div>
      </section>
    </div>
  );
}

function Step4_Execute({ running, onStart, onComplete }){
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:14,alignItems:"start"}}>
      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Import job {running?"— running":"— ready to start"}</div>
          {running && <Pill kind="running">Processing</Pill>}
        </div>
        <div style={{padding:"12px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 24px",borderBottom:"1px solid var(--hairline)"}}>
          {[
            ["Job ID","IMP-0242 (queued)"],["Entity","Opportunity"],
            ["File","open_opportunities_q3.csv"],["Mode","Create only"],
            ["Valid rows","780"],["Warning rows","24 (will import)"],
            ["Rejected rows","8 (will skip)"],["Submitted by","I. Volkova"],
          ].map(([l,v],i)=>(
            <div key={i}>
              <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:2}}>{l}</div>
              <div className="mono" style={{fontSize:12.5}}>{v}</div>
            </div>
          ))}
        </div>
        {running && (
          <div style={{padding:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--muted)",marginBottom:6}}>
              <span>Progress</span><span className="mono">412 / 804 rows · ETA ~09:40</span>
            </div>
            <ProgressBar pct={51} kind="processing" />
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginTop:14}}>
              {[["Created","412","pos"],["Updated","0","muted"],["Rejected","6","neg"],["Remaining","392","muted"]].map(([l,v,c],i)=>(
                <div key={i} style={{textAlign:"center",padding:"10px",background:"var(--paper-2)",border:"1px solid var(--hairline)"}}>
                  <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)",marginBottom:4}}>{l}</div>
                  <div className="mono" style={{fontSize:20,fontWeight:700,color:c==="pos"?"var(--pos)":c==="neg"?"var(--neg)":"var(--muted)"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{padding:"12px 14px",borderTop:"1px solid var(--hairline)",display:"flex",gap:8}}>
          {!running
            ? <button className="btn btn-primary btn-lg" style={{flex:1,justifyContent:"center"}} onClick={onStart}>Start import job</button>
            : <>
                <button className="btn btn-ghost btn-sm" style={{color:"var(--neg)"}}>Cancel job</button>
                <button className="btn btn-sm btn-primary" style={{marginLeft:"auto"}} onClick={onComplete}>Simulate → Completed</button>
              </>
          }
        </div>
      </section>
      <div className="panel" style={{position:"sticky",top:72}}>
        <div className="panel-head"><div className="panel-title">Pre-flight checklist</div></div>
        <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:6}}>
          {[
            { ok:true,  l:"File uploaded and validated" },
            { ok:true,  l:"All required columns mapped" },
            { ok:true,  l:"780 valid rows ready" },
            { ok:false, l:"8 rejected rows — will be skipped" },
            { ok:true,  l:"Mode: Create only — no overwrites" },
            { ok:true,  l:"Custom fields validated" },
            { ok:true,  l:"Duplicate detection: active" },
          ].map((c,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12.5}}>
              <span style={{color:c.ok?"var(--pos)":"var(--accent-2)",fontWeight:700,fontSize:11,width:14,textAlign:"center"}}>{c.ok?"✓":"⚠"}</span>
              <span style={{color:c.ok?"var(--ink-2)":"var(--accent-2)"}}>{c.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step5_Results({ onFlash }){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{padding:"14px 18px",background:"var(--warn-soft)",border:"1px solid #D9BFA0",borderLeft:"3px solid var(--accent)",display:"flex",alignItems:"flex-start",gap:14}}>
        <div style={{fontSize:22,color:"var(--accent-2)"}}>⚠</div>
        <div>
          <div style={{fontWeight:600,fontSize:14,color:"var(--accent-2)",marginBottom:3}}>Import completed with partial errors</div>
          <div style={{fontSize:12.5,color:"var(--ink-2)",lineHeight:1.6}}>798 rows created · 0 updated · 14 rejected · Job IMP-0239 · open_opps_pipeline.csv · Opportunity</div>
          <div className="mono" style={{fontSize:11,color:"var(--muted)",marginTop:4}}>Started 2026-05-16 14:30 · Completed 14:52 · Duration 22 min</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",border:"1px solid var(--line)",background:"var(--white)"}}>
        {[["Rows in file","812",""],["Created","798","pos"],["Rejected","14","neg"],["Duplicate skips","0","muted"]].map(([l,v,c],i)=>(
          <div key={i} style={{padding:"14px 16px",borderRight:i<3?"1px solid var(--hairline)":"none"}}>
            <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)"}}>{l}</div>
            <div className="mono" style={{fontSize:26,fontWeight:700,marginTop:4,color:c==="pos"?"var(--pos)":c==="neg"?"var(--neg)":"var(--ink)"}}>{v}</div>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Rejected rows <em>14</em></div>
          <button className="btn btn-sm btn-primary" onClick={()=>onFlash("Downloading rejected-rows-IMP-0239.csv…")}>Download rejected rows CSV</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table className="t" style={{minWidth:700}}>
            <colgroup><col style={{width:60}}/><col style={{width:100}}/><col style={{width:130}}/><col/><col style={{width:160}}/></colgroup>
            <thead><tr><th>Row</th><th>Entity</th><th>Field</th><th>Issue</th><th>Source value</th></tr></thead>
            <tbody>
              {ERRORS.filter(e=>e.sev==="error").map((e,i)=>(
                <tr key={i} style={{background:"#FBEFE8"}}>
                  <td className="mono" style={{fontSize:12}}>{e.row}</td>
                  <td style={{fontSize:12}}>{e.entity}</td>
                  <td className="mono" style={{fontSize:11.5}}>{e.field}</td>
                  <td style={{fontSize:12}}>{e.issue}</td>
                  <td className="mono" style={{fontSize:11.5,color:"var(--muted)"}}>{e.src}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ─────────── Export tab ─────────── */

function ExportTab({ onFlash }){
  const [selected, setSelected] = useState("ep1");
  const [created, setCreated]   = useState(false);
  const preset = EXPORT_PRESETS.find(p=>p.id===selected);
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:14,alignItems:"start"}}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <section className="panel">
          <div className="panel-head"><div className="panel-title">Export configuration</div></div>
          <div style={{padding:"12px 14px",borderBottom:"1px solid var(--hairline)"}}>
            <div style={{fontSize:11,color:"var(--muted)",fontWeight:500,marginBottom:8}}>Export from saved view</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {EXPORT_PRESETS.map(p=>(
                <label key={p.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 12px",border:`1.5px solid ${selected===p.id?"var(--ink)":"var(--line)"}`,background:selected===p.id?"var(--select)":"var(--white)",cursor:"pointer"}}>
                  <input type="radio" name="preset" checked={selected===p.id} onChange={()=>{ setSelected(p.id); setCreated(false); }} style={{accentColor:"var(--accent-2)",marginTop:2}} />
                  <div>
                    <div style={{fontWeight:selected===p.id?600:400,fontSize:13}}>{p.label}</div>
                    <div style={{fontSize:11.5,color:"var(--muted)",marginTop:2}}>
                      <span className="mono" style={{marginRight:8}}>{p.entity}</span>{p.access}
                      <span className="mono" style={{marginLeft:8,color:"var(--ink-2)"}}>{p.rows} rows</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div style={{padding:"12px 14px",borderBottom:"1px solid var(--hairline)"}}>
            <div style={{fontSize:11,color:"var(--muted)",fontWeight:500,marginBottom:7}}>Field inclusion</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[["Standard fields","ID, name, stage, amount, close date, owner","checked"],["Custom fields (allowed)","Region, Payment Risk Level, Procurement Process","checked"],["Internal audit fields","Created by, modified at, import source","unchecked"]].map(([l,sub,ch],i)=>(
                <label key={i} style={{display:"flex",alignItems:"flex-start",gap:8,cursor:"pointer",fontSize:12.5}}>
                  <input type="checkbox" defaultChecked={ch==="checked"} style={{accentColor:"var(--accent-2)",width:14,height:14,marginTop:2,flexShrink:0}} />
                  <div><div style={{fontWeight:500}}>{l}</div><div style={{fontSize:11,color:"var(--muted)"}}>{sub}</div></div>
                </label>
              ))}
            </div>
          </div>
          <div style={{padding:"10px 14px",background:"var(--info-soft)",borderBottom:"1px solid #A4C0C8",fontSize:12,color:"var(--ink-2)"}}>
            <span className="mono" style={{color:"var(--info)",fontWeight:700,marginRight:8}}>Access-aware</span>
            Export respects your access boundaries — you will only receive records and fields you have permission to see. Export is a tracked job, not an untracked download.
          </div>
          <div style={{padding:"12px 14px"}}>
            {!created
              ? <button className="btn btn-primary btn-lg" style={{justifyContent:"center",width:"100%"}} onClick={()=>{ setCreated(true); }}>Create export job — {preset?.label}</button>
              : (
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--pos-soft)",border:"1px solid #B2C8A8"}}>
                  <span style={{fontSize:20,color:"var(--pos)"}}>✓</span>
                  <div>
                    <div style={{fontWeight:600,fontSize:13,color:"var(--pos)"}}>Export job created — EXP-0042</div>
                    <div style={{fontSize:12,color:"var(--muted)"}}>Processing · {preset?.rows} rows · will be ready in ~1 min</div>
                  </div>
                  <button className="btn btn-sm" style={{marginLeft:"auto"}} onClick={()=>onFlash("Downloading export — EXP-0042.csv")}>Download when ready</button>
                </div>
              )
            }
          </div>
        </section>
      </div>
      {/* recent exports */}
      <div className="panel" style={{position:"sticky",top:72}}>
        <div className="panel-head"><div className="panel-title">Recent exports</div></div>
        {[JOBS[4], { id:"EXP-0040", type:"export", entity:"Contact", file:"Contacts Missing Email", status:"ready", pct:100, rows:312, by:"I. Volkova", at:"yest" }].map((j,i)=>(
          <div key={i} style={{padding:"10px 12px",borderBottom:"1px solid var(--hairline)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div>
                <div className="mono" style={{fontSize:11.5,fontWeight:600}}>{j.id}</div>
                <div style={{fontSize:12.5,fontWeight:500,margin:"2px 0"}}>{j.file}</div>
                <div className="mono" style={{fontSize:11,color:"var(--muted)"}}>{j.entity} · {j.rows} rows · {j.at}</div>
              </div>
              {statusPill(j.status)}
            </div>
            <div style={{marginTop:6,display:"flex",gap:6}}>
              <button className="btn btn-sm" onClick={()=>onFlash(`Downloading ${j.id}.csv`)}>Download CSV</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Job history tab ─────────── */

function JobHistoryTab({ selectedId, onSelect }){
  const job = JOBS.find(j=>j.id===selectedId);
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:14,alignItems:"start"}}>
      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">All jobs <em>{JOBS.length}</em></div>
          <div className="panel-actions"><span className="filterchip on mono">ALL</span><span className="filterchip mono">IMPORT</span><span className="filterchip mono">EXPORT</span><span className="filterchip mono">FAILED</span></div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table className="t" style={{minWidth:860}}>
            <colgroup><col style={{width:96}}/><col style={{width:70}}/><col style={{width:90}}/><col/><col style={{width:70}}/><col style={{width:120}}/><col style={{width:80}}/><col style={{width:100}}/></colgroup>
            <thead><tr><th>Job ID</th><th>Type</th><th>Entity</th><th>File / View</th><th className="num">Rows</th><th>Status</th><th>By</th><th>Started</th></tr></thead>
            <tbody>
              {JOBS.map(j=>(
                <tr key={j.id} className={selectedId===j.id?"selected":""} onClick={()=>onSelect(j.id===selectedId?null:j.id)} style={{cursor:"pointer",background:j.status==="failed"?"#FBEFE8":j.status==="partial"?"#FBF7EB":"inherit"}}>
                  <td className="mono" style={{fontSize:12}}>{j.id}</td>
                  <td><span style={{fontSize:11,fontFamily:'"JetBrains Mono",monospace',textTransform:"uppercase",letterSpacing:".04em",color:j.type==="export"?"var(--info)":"var(--accent-2)"}}>{j.type}</span></td>
                  <td style={{fontSize:12}}>{j.entity}</td>
                  <td className="truncate" style={{fontSize:12}}>{j.file}</td>
                  <td className="num mono" style={{fontSize:12}}>{fmtRows(j.rows)}</td>
                  <td>{statusPill(j.status)}</td>
                  <td style={{fontSize:12,color:"var(--muted)"}}>{j.by}</td>
                  <td className="mono" style={{fontSize:11.5,color:"var(--muted)"}}>{j.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="panel" style={{position:"sticky",top:72}}>
        {job ? (
          <>
            <div className="panel-head">
              <div className="panel-title mono">{job.id}</div>
              {statusPill(job.status)}
            </div>
            <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
              {[["Type",job.type.toUpperCase()],["Entity",job.entity],["File / view",job.file],["Mode","Create only"],["Rows",fmtRows(job.rows)],["Started",job.at],["Finished",job.fin||job.eta||"In progress"]].map(([l,v],i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",borderBottom:"1px solid var(--hairline)",paddingBottom:6,fontSize:12}}>
                  <span style={{color:"var(--muted)"}}>{l}</span>
                  <span className="mono" style={{fontWeight:500}}>{v}</span>
                </div>
              ))}
              <ProgressBar pct={job.pct} kind={job.status} />
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
                {[["Created",job.created,"pos"],["Rejected",job.rejected,"neg"]].map(([l,v,c],i)=>(
                  <div key={i} style={{textAlign:"center",padding:"8px",background:"var(--paper-2)",border:"1px solid var(--hairline)"}}>
                    <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)"}}>{l}</div>
                    <div className="mono" style={{fontSize:18,fontWeight:700,color:c==="pos"?"var(--pos)":c==="neg"&&v>0?"var(--neg)":"var(--muted)"}}>{v}</div>
                  </div>
                ))}
              </div>
              {job.error && <div style={{padding:"8px 10px",background:"var(--neg-soft)",border:"1px solid #D6B0A8",fontSize:12,color:"var(--neg)",lineHeight:1.5}}>{job.error}</div>}
              {job.rejected>0 && <button className="btn btn-sm btn-primary">Download rejected rows</button>}
            </div>
          </>
        ) : (
          <div style={{padding:"36px 16px",textAlign:"center",color:"var(--muted)",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,border:"1px dashed var(--line-2)",display:"grid",placeItems:"center",fontFamily:'"JetBrains Mono",monospace',fontSize:10}}>JB</div>
            <div style={{fontWeight:500,color:"var(--ink)",fontSize:13}}>Select a job</div>
            <div style={{fontSize:12.5,lineHeight:1.5,maxWidth:200}}>Click any row to see job details, progress, and row results.</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── Row errors tab ─────────── */

function RowErrorsTab(){
  const [sev, setSev] = useState("all");
  const rows = sev==="all"?ERRORS:ERRORS.filter(e=>e.sev===sev);
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">Row errors <em>{rows.length} of {ERRORS.length}</em></div>
        <div className="panel-actions">
          {["all","error","warning"].map(s=>(
            <button key={s} className={`filterchip mono ${sev===s?"on":""}`} onClick={()=>setSev(s)}>{s.toUpperCase()}</button>
          ))}
          <button className="btn btn-ghost btn-sm">Download CSV</button>
        </div>
      </div>
      <div style={{overflowX:"auto"}}>
        <table className="t" style={{minWidth:800}}>
          <colgroup><col style={{width:60}}/><col style={{width:80}}/><col style={{width:80}}/><col style={{width:90}}/><col style={{width:130}}/><col style={{width:120}}/><col/><col style={{width:160}}/></colgroup>
          <thead><tr><th>Row</th><th>Job</th><th>Severity</th><th>Entity</th><th>Field</th><th>Source value</th><th>Issue</th><th>Suggested fix</th></tr></thead>
          <tbody>
            {rows.length===0 ? (
              <tr><td colSpan={8} style={{textAlign:"center",padding:"36px",color:"var(--muted)"}}>No rows match this filter</td></tr>
            ) : rows.map((e,i)=>(
              <tr key={i} style={{background:e.sev==="error"?"#FBEFE8":"inherit"}}>
                <td className="mono" style={{fontSize:12}}>{e.row}</td>
                <td className="mono" style={{fontSize:11,color:"var(--muted)"}}>IMP-0239</td>
                <td>
                  <span style={{fontSize:10.5,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em",textTransform:"uppercase",color:e.sev==="error"?"var(--neg)":"var(--accent-2)",background:e.sev==="error"?"var(--neg-soft)":"var(--warn-soft)",border:`1px solid ${e.sev==="error"?"#D6B0A8":"#D9BFA0"}`,padding:"1px 5px",borderRadius:2}}>{e.sev}</span>
                </td>
                <td style={{fontSize:12}}>{e.entity}</td>
                <td className="mono" style={{fontSize:11.5}}>{e.field}</td>
                <td className="mono" style={{fontSize:11.5,color:"var(--muted)"}}>{e.src}</td>
                <td style={{fontSize:12}}>{e.issue}</td>
                <td style={{fontSize:12,color:"var(--info)"}}>{e.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ─────────── Audit panel ─────────── */

function AuditPanel(){
  const events = [
    { t:"08:12", who:"I. Volkova", type:"create",   desc:"Import job IMP-0241 created · Account · orion_accounts_may.csv · 4,128 rows" },
    { t:"08:04", who:"I. Volkova", type:"create",   desc:"Import job IMP-0240 created · Contact · contacts_legacy_q1.csv · 12,602 rows" },
    { t:"07:51", who:"System",     type:"complete",  desc:"Export job EXP-0041 completed · Team Open Pipeline · 46 rows ready for download" },
    { t:"07:50", who:"I. Volkova", type:"export",   desc:"Export job EXP-0041 created · Opportunity · Team Open Pipeline view" },
    { t:"yest 14:52", who:"System",type:"complete",  desc:"Import job IMP-0239 completed with partial errors · 798 created · 14 rejected" },
    { t:"yest 11:08", who:"System",type:"fail",      desc:"Import job IMP-0238 failed · schema mismatch · required field 'name' not mapped" },
  ];
  const icon = { create:"→", complete:"✓", export:"↑", fail:"✕" };
  const color = { create:"var(--info)", complete:"var(--pos)", export:"var(--accent-2)", fail:"var(--neg)" };
  return (
    <div className="panel" style={{marginTop:14}}>
      <div className="panel-head"><div className="panel-title">Audit log <em>today</em></div><div className="panel-actions"><a style={{fontSize:11.5,cursor:"pointer"}}>Full audit ›</a></div></div>
      <div style={{padding:"4px 14px 12px"}}>
        {events.map((e,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"58px 18px 1fr",gap:"0 8px",padding:"7px 0",borderBottom:i<events.length-1?"1px dashed var(--hairline)":"none",alignItems:"start"}}>
            <div className="mono" style={{fontSize:10.5,color:"var(--muted)",lineHeight:1.35}}>{e.t}</div>
            <div style={{width:18,height:18,borderRadius:"50%",background:"var(--paper-2)",border:"1px solid var(--line)",display:"grid",placeItems:"center",fontSize:8,fontWeight:700,fontFamily:'"JetBrains Mono",monospace',color:color[e.type],marginTop:1}}>{icon[e.type]}</div>
            <div>
              <div style={{fontSize:12.5,color:"var(--ink-2)",lineHeight:1.4}}>{e.desc}</div>
              <div className="mono" style={{fontSize:10.5,color:"var(--muted)",marginTop:2}}>by {e.who}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── App ─────────── */

function App(){
  const [scenario,    setScenario]    = useState("validated");
  const [activeTab,   setActiveTab]   = useState("import");
  const [entity,      setEntity]      = useState("Opportunity");
  const [mode,        setMode]        = useState("Create only");
  const [running,     setRunning]     = useState(false);
  const [selectedJob, setSelectedJob] = useState("IMP-0239");
  const [toast,       setToast]       = useState(null);

  const stepMap = { mapping:2, validated:3, processing:4, completed:5 };
  const step = stepMap[scenario] || 3;

  function flash(msg){ setToast(msg); setTimeout(()=>setToast(null),2800); }

  // scenario change → reset running state
  useEffect(()=>{ setRunning(scenario==="processing"); }, [scenario]);

  const navBtns = (
    <div style={{display:"flex",justifyContent:"space-between",marginTop:14}}>
      {step > 1 && <button className="btn btn-ghost btn-sm" onClick={()=>setScenario(Object.keys(stepMap).find(k=>stepMap[k]===step-1)||"mapping")}>← Back</button>}
      {step < 5 && step!==4 && (
        <button className="btn btn-primary btn-sm" style={{marginLeft:"auto"}} onClick={()=>setScenario(Object.keys(stepMap).find(k=>stepMap[k]===step+1)||"completed")}>Next →</button>
      )}
    </div>
  );

  return (
    <div className="app" data-screen-label="10 Import Export Operations">
      <Sidebar />
      <div className="main">
        <TopBar />
        <div className="content">
          <ScenarioBar scenario={scenario} setScenario={setScenario} />
          <KPIStrip />
          <TabBar active={activeTab} setActive={v=>{ setActiveTab(v); }} />

          {activeTab==="import" && (
            <>
              <StepBar step={step} />
              {step===1 && <Step1_Upload entity={entity} setEntity={setEntity} mode={mode} setMode={setMode} />}
              {step===2 && <Step2_Map />}
              {step===3 && <Step3_Validate />}
              {step===4 && <Step4_Execute running={running} onStart={()=>setRunning(true)} onComplete={()=>setScenario("completed")} />}
              {step===5 && <Step5_Results onFlash={flash} />}
              {step!==4 && navBtns}
            </>
          )}
          {activeTab==="export"  && <ExportTab onFlash={flash} />}
          {activeTab==="history" && <JobHistoryTab selectedId={selectedJob} onSelect={setSelectedJob} />}
          {activeTab==="errors"  && <RowErrorsTab />}

          {(activeTab==="history" || activeTab==="import") && <AuditPanel />}

          <div className="foot-ruler">
            <span>SALES OPS CRM · ORION INDUSTRIAL · LOCAL PILOT</span>
            <span>USER OPS · IV · IMPORTS &amp; EXPORTS</span>
            <span>2 JOBS RUNNING · 14,730 ROWS IN FLIGHT</span>
          </div>
        </div>
      </div>
      {toast && <div className="toast"><span className="ok">✓</span>{toast}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
