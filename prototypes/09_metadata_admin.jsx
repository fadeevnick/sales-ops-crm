/* eslint-disable */
const { useState, useMemo } = React;

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
  { key:"workspace", label:"Workspace",      index:"01" },
  { key:"governance",label:"Governance",     index:"02" },
  { key:"data",      label:"Data & Quality", index:"03" },
  { key:"insights",  label:"Insights",       index:"04" },
];

const FIELDS = [
  { id:"f1", label:"Payment Risk Level",   key:"payment_risk_level",  entity:"Opportunity", type:"Select",     required:true,  active:true,  views:3, reports:2, stageRule:"Negotiation", status:"published",      values:["Low","Medium","High"] },
  { id:"f2", label:"Region",               key:"region",              entity:"Opportunity", type:"Select",     required:false, active:true,  views:0, reports:2, stageRule:"—",           status:"published",      values:["DACH-North","DACH-South","CEE","Baltics"] },
  { id:"f3", label:"Implementation Window",key:"impl_window",         entity:"Opportunity", type:"Date Range", required:false, active:true,  views:1, reports:0, stageRule:"—",           status:"published",      values:[] },
  { id:"f4", label:"Procurement Process",  key:"procurement_process", entity:"Opportunity", type:"Select",     required:false, active:true,  views:0, reports:0, stageRule:"Negotiation", status:"published",      values:["Direct","Tender","Framework"] },
  { id:"f5", label:"Legal Entity Code",    key:"legal_entity_code",   entity:"Opp / Account",type:"Text",     required:true,  active:true,  views:0, reports:1, stageRule:"Negotiation", status:"draft-modified", values:[] },
  { id:"f6", label:"Customer Tier",        key:"customer_tier",       entity:"Account",     type:"Select",     required:false, active:true,  views:2, reports:1, stageRule:"—",           status:"published",      values:["Strategic","Enterprise","SMB"] },
  { id:"f7", label:"Influence Level",      key:"influence_level",     entity:"Contact",     type:"Select",     required:false, active:true,  views:0, reports:0, stageRule:"—",           status:"published",      values:["Decision Maker","Influencer","Technical Evaluator","Legal Reviewer"] },
];

const STAGES = [
  { id:"s1", key:"qualification", label:"Qualification", prob:10,  active:true,  reqFields:0, approvalGate:false },
  { id:"s2", key:"discovery",     label:"Discovery",     prob:25,  active:true,  reqFields:0, approvalGate:false },
  { id:"s3", key:"proposal",      label:"Proposal",      prob:50,  active:true,  reqFields:3, approvalGate:true  },
  { id:"s4", key:"negotiation",   label:"Negotiation",   prob:75,  active:true,  reqFields:3, approvalGate:true  },
  { id:"s5", key:"closed_won",    label:"Closed Won",    prob:100, active:true,  reqFields:3, approvalGate:false },
  { id:"s6", key:"closed_lost",   label:"Closed Lost",   prob:0,   active:true,  reqFields:0, approvalGate:false },
];

const RULES = [
  { stage:"Proposal",    fields:["Expected Amount","Close Date","Primary Contact"] },
  { stage:"Negotiation", fields:["Legal Entity Code","Payment Risk Level","Procurement Process"] },
  { stage:"Closed Won",  fields:["Approval Resolved","Primary Contact","Close Date"] },
];

const HISTORY = [
  { v:"v42", by:"Irina Volkova", at:"2026-05-15 16:20", note:"Added Payment Risk Level + Procurement Process; updated Negotiation required rules", current:true },
  { v:"v41", by:"Irina Volkova", at:"2026-04-28 11:05", note:"Renamed stage Discovery — reverted in v42" },
  { v:"v40", by:"Irina Volkova", at:"2026-04-10 09:30", note:"Added Influence Level field to Contact entity" },
  { v:"v39", by:"L. Hassan",     at:"2026-03-22 14:00", note:"Initial custom fields: Region, Implementation Window" },
];

const VALIDATION = {
  warnings: [
    "W001 · Payment Risk Level referenced by 3 saved views and 2 reports — changing allowed values will affect filter results.",
    "W002 · Stage rename would update display labels across 14 open opportunities in Proposal and Negotiation.",
    "W003 · Draft includes 1 modified field definition — compatibility impact on existing imports is medium.",
  ],
  errors: [
    "E001 · Negotiation requires 'Legal Entity Code' but 14 open opportunities are missing this value — fill or skip before publishing.",
  ],
  info: "Draft changes are editable-only. Published version v42 remains runtime-active until you publish v43.",
};

/* ─────────── Helpers ─────────── */

function Pill({ kind, children }){
  return <span className={`pill p-${kind}`}><span className="pdot"></span>{children}</span>;
}
function BrandMark(){ return <span className="brand-mark" aria-hidden />; }
function VerBadge({ v, kind }){
  const cls = kind==="pub"?"ver-pub":kind==="draft"?"ver-draft":"ver-old";
  return <span className={`mono ver-badge ${cls}`}>{v}</span>;
}

/* ─────────── Shell ─────────── */

function Sidebar(){
  const counts = { accounts:412, opps:46, approvals:7, imports:2, duplicates:24, metadata:3 };
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
                <div key={m.key} className={`nav-item ${m.key==="metadata"?"active":""}`} title={m.label}>
                  <span className="nav-mark mono">{m.code}</span>
                  <span className="nav-label">{m.label}</span>
                  <span className={`nav-count mono ${m.key==="metadata"?"alert":""}`}>{counts[m.key]||""}</span>
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
        <strong>Metadata Admin</strong>
        <span className="sep">·</span>
        <span className="mono" style={{fontSize:11,color:"var(--muted)"}}>Orion Industrial · tenant config</span>
      </div>
      <label className="search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="m11 11 3.5 3.5"/></svg>
        <input placeholder="Search fields, stages, rules…" />
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

/* ─────────── Scenario bar ─────────── */

function ScenarioBar({ scenario, setScenario }){
  const opts = [
    { key:"warnings", label:"Draft · Validation warnings" },
    { key:"ready",    label:"Draft · Ready to publish"    },
    { key:"errors",   label:"Draft · Blocking errors"     },
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

/* ─────────── Metadata status header ─────────── */

function StatusHeader({ scenario, onAction }){
  const publishEnabled = scenario === "ready";
  const draftStatus = scenario==="errors"?"Blocking errors":scenario==="ready"?"Validated · ready":"Validation warnings";
  const draftStatusKind = scenario==="errors"?"neg":scenario==="ready"?"approved":"pending";
  return (
    <div className="panel meta-header">
      <div style={{padding:"12px 16px",borderBottom:"1px solid var(--hairline)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
        {/* version strip */}
        <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <span style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)"}}>Published</span>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <VerBadge v="v42" kind="pub" />
              <span style={{fontSize:12.5,color:"var(--pos)",fontWeight:500}}>Runtime-active</span>
            </div>
            <span className="mono" style={{fontSize:10.5,color:"var(--muted)"}}>I. Volkova · 2026-05-15 16:20</span>
          </div>
          <div style={{color:"var(--line-2)",fontSize:18,alignSelf:"center"}}>→</div>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <span style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)"}}>Draft</span>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <VerBadge v="v43" kind="draft" />
              <Pill kind={draftStatusKind}>{draftStatus}</Pill>
            </div>
            <span className="mono" style={{fontSize:10.5,color:"var(--muted)"}}>Editable · not runtime-active</span>
          </div>
          <div style={{width:1,height:40,background:"var(--line-2)",alignSelf:"center"}} />
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <span style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)"}}>Entity scope</span>
            <div style={{display:"flex",gap:5}}>
              {["Opportunity","Account","Contact"].map(e=>(
                <span key={e} style={{fontSize:11,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em",background:"var(--paper-2)",border:"1px solid var(--line)",padding:"1px 6px",borderRadius:2,color:"var(--ink-2)"}}>{e}</span>
              ))}
            </div>
          </div>
        </div>
        {/* actions */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button className="btn btn-sm" onClick={()=>onAction("draft")}>+ Create draft</button>
          <button className="btn btn-sm" onClick={()=>onAction("validate")}>✓ Validate draft</button>
          <button
            className={`btn btn-sm ${publishEnabled?"btn-primary":"btn-disabled"}`}
            aria-disabled={!publishEnabled}
            onClick={()=>{ if(publishEnabled) onAction("publish"); }}
            title={!publishEnabled?"Resolve validation issues before publishing":"Publish draft v43 to runtime"}
          >Publish v43{!publishEnabled?" (blocked)":""}</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>onAction("rollback")}>↩ Rollback</button>
          <button className="btn btn-ghost btn-sm" style={{color:"var(--neg)"}} onClick={()=>onAction("discard")}>Discard draft</button>
        </div>
      </div>
      {/* validation notice */}
      {scenario!=="ready" && (
        <div style={{
          padding:"8px 16px",
          background: scenario==="errors"?"var(--neg-soft)":"var(--warn-soft)",
          borderBottom:"1px solid var(--hairline)",
          display:"flex",alignItems:"flex-start",gap:10,fontSize:12,
        }}>
          <span className="mono" style={{fontWeight:700,color:scenario==="errors"?"var(--neg)":"var(--accent-2)",flexShrink:0}}>
            {scenario==="errors"?"✕ 1 error · 3 warnings":"⚠ 3 warnings"}
          </span>
          <span style={{color:"var(--ink-2)"}}>
            {scenario==="errors"
              ? "Publishing blocked. Resolve E001 before proceeding."
              : "Publish allowed with warnings. Review impact before confirming."}
            <span style={{color:"var(--muted)",marginLeft:8,fontFamily:'"JetBrains Mono",monospace',fontSize:11}}>v42 remains runtime-active until you publish.</span>
          </span>
          <button className="btn btn-ghost btn-sm" style={{marginLeft:"auto",flexShrink:0}} onClick={()=>onAction("validate")}>Validate ›</button>
        </div>
      )}
      {scenario==="ready" && (
        <div style={{padding:"8px 16px",background:"var(--pos-soft)",borderBottom:"1px solid #B2C8A8",display:"flex",alignItems:"center",gap:10,fontSize:12,color:"var(--pos)"}}>
          <span className="mono" style={{fontWeight:700}}>✓ Validation passed</span>
          <span style={{color:"var(--ink-2)"}}>v43 draft is ready to publish. 3 warnings were acknowledged. Publishing will make v43 runtime-active and archive v42.</span>
        </div>
      )}
    </div>
  );
}

/* ─────────── Tab bar ─────────── */

function TabBar({ active, setActive }){
  const tabs = [
    { key:"fields",  label:"Custom Fields",      count:FIELDS.length },
    { key:"stages",  label:"Opportunity Stages", count:STAGES.length },
    { key:"rules",   label:"Required Rules",     count:RULES.length },
    { key:"history", label:"Publish History",    count:HISTORY.length },
    { key:"impact",  label:"Impact Review",      count:null },
  ];
  return (
    <div style={{display:"flex",gap:0,borderBottom:"1px solid var(--line)",marginBottom:14,background:"var(--white)",overflowX:"auto"}}>
      {tabs.map(t=>(
        <button key={t.key} onClick={()=>setActive(t.key)}
          style={{
            padding:"10px 16px",fontSize:13,fontWeight:active===t.key?600:400,
            color:active===t.key?"var(--ink)":"var(--muted)",
            borderBottom:active===t.key?"2px solid var(--accent)":"2px solid transparent",
            background:"none",border:0,borderBottomStyle:"solid",
            cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:7,
          }}>
          {t.label}
          {t.count!=null && <span className="mono" style={{fontSize:10.5,color:active===t.key?"var(--accent-2)":"var(--muted)"}}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ─────────── Custom fields tab ─────────── */

function FieldRow({ f, selected, onClick }){
  const statusColor = {
    "published":      { c:"var(--pos)",      bg:"var(--pos-soft)",   label:"Published" },
    "draft-modified": { c:"var(--warn)",      bg:"var(--warn-soft)",  label:"Modified in draft" },
    "draft-new":      { c:"var(--info)",      bg:"var(--info-soft)",  label:"New in draft" },
  };
  const sc = statusColor[f.status] || statusColor["published"];
  return (
    <tr className={selected?"selected":""} onClick={onClick} style={{cursor:"pointer"}}>
      <td><span style={{fontWeight:500}}>{f.label}</span>{f.status==="draft-modified" && <span className="mono" style={{fontSize:9,color:"var(--warn)",marginLeft:6,background:"var(--warn-soft)",border:"1px solid #E2C887",padding:"0 4px",borderRadius:2}}>MODIFIED</span>}</td>
      <td className="mono" style={{fontSize:11.5,color:"var(--muted-2)"}}>{f.key}</td>
      <td style={{fontSize:12}}>{f.entity}</td>
      <td><span className="mono" style={{fontSize:11,background:"var(--paper-2)",border:"1px solid var(--hairline)",padding:"1px 5px",borderRadius:2}}>{f.type}</span></td>
      <td style={{textAlign:"center"}}>{f.required ? <span style={{color:"var(--neg)",fontWeight:700}}>✓</span> : <span style={{color:"var(--muted)"}}>—</span>}</td>
      <td style={{textAlign:"center"}}><span style={{color:"var(--pos)"}}>●</span></td>
      <td className="mono" style={{textAlign:"center",fontSize:12,color:f.views>0?"var(--ink)":"var(--muted)"}}>{f.views||"—"}</td>
      <td className="mono" style={{textAlign:"center",fontSize:12,color:f.reports>0?"var(--ink)":"var(--muted)"}}>{f.reports||"—"}</td>
      <td style={{fontSize:12}}>{f.stageRule!=="—"?<span style={{fontSize:11,fontFamily:'"JetBrains Mono",monospace',color:"var(--accent-2)",background:"var(--accent-soft)",border:"1px solid #D9BFA0",padding:"1px 5px",borderRadius:2}}>{f.stageRule}</span>:<span style={{color:"var(--muted)"}}>—</span>}</td>
      <td><span style={{fontSize:10.5,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em",color:sc.c,background:sc.bg,padding:"1px 6px",borderRadius:2,textTransform:"uppercase"}}>{sc.label}</span></td>
    </tr>
  );
}

function FieldEditPanel({ field, onClose, onFlash }){
  const [showDeactivateWarn, setShowDeactivateWarn] = useState(false);
  if(!field) return (
    <div className="panel" style={{padding:"36px 16px",textAlign:"center",color:"var(--muted)",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
      <div style={{width:36,height:36,border:"1px dashed var(--line-2)",display:"grid",placeItems:"center",fontFamily:'"JetBrains Mono",monospace',fontSize:10,color:"var(--muted-2)"}}>MA</div>
      <div style={{fontWeight:500,color:"var(--ink)",fontSize:13}}>Select a field</div>
      <div style={{fontSize:12.5,lineHeight:1.5,maxWidth:220}}>Click any row to edit field properties, update allowed values, or review usage.</div>
    </div>
  );
  const inUse = field.views > 0 || field.reports > 0;
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Edit field <em className="mono">{field.key}</em></div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>
      {/* fields */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid var(--hairline)"}}>
        {[
          ["Label",   field.label,  ""],
          ["Entity",  field.entity, "mono"],
          ["Type",    field.type,   "mono"],
          ["Field key",field.key,   "mono small"],
        ].map(([l,v,t],i)=>(
          <div key={i} style={{padding:"9px 12px",borderRight:i%2===0?"1px solid var(--hairline)":"none",borderBottom:i<2?"1px solid var(--hairline)":"none"}}>
            <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:3}}>{l}</div>
            <div className={t.includes("mono")?"mono":""} style={{fontSize:t.includes("small")?11:12.5,fontWeight:t.includes("mono")&&!t.includes("small")?500:400,wordBreak:"break-all"}}>{v}</div>
          </div>
        ))}
      </div>
      {/* toggles */}
      <div style={{padding:"10px 12px",borderBottom:"1px solid var(--hairline)",display:"flex",gap:16}}>
        {[["Required",field.required],["Active",field.active]].map(([l,v],i)=>(
          <label key={i} style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontSize:13}}>
            <input type="checkbox" defaultChecked={v} style={{accentColor:"var(--accent-2)",width:14,height:14}} />
            {l}
          </label>
        ))}
      </div>
      {/* allowed values */}
      {field.values.length > 0 && (
        <div style={{padding:"10px 12px",borderBottom:"1px solid var(--hairline)"}}>
          <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:6}}>Allowed values <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:11}}>· select type</span></div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {field.values.map((v,i)=>(
              <span key={i} style={{fontSize:11.5,padding:"3px 8px",background:"var(--paper-2)",border:"1px solid var(--hairline)",borderRadius:2,display:"flex",alignItems:"center",gap:5}}>
                {v}<span style={{color:"var(--muted)",cursor:"pointer",fontSize:10}}>✕</span>
              </span>
            ))}
            <button className="btn btn-ghost btn-sm" style={{fontSize:11}}>+ Add value</button>
          </div>
        </div>
      )}
      {/* usage */}
      <div style={{padding:"10px 12px",borderBottom:"1px solid var(--hairline)"}}>
        <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:6}}>Usage</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12}}>
          <span>Saved views: <strong className="mono">{field.views}</strong></span>
          <span>Reports: <strong className="mono">{field.reports}</strong></span>
          <span>Stage rule: <strong style={{color:field.stageRule!=="—"?"var(--accent-2)":"var(--muted)"}}>{field.stageRule}</strong></span>
        </div>
      </div>
      {/* deactivate warning */}
      {showDeactivateWarn && inUse && (
        <div style={{padding:"10px 12px",background:"var(--neg-soft)",border:"1px solid #D6B0A8",borderLeft:"3px solid var(--neg)",margin:"10px 12px 0"}}>
          <div style={{fontWeight:600,fontSize:12.5,color:"var(--neg)",marginBottom:3}}>Deactivation blocked</div>
          <div style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.5}}>
            This field is used by <strong>{field.views} saved view{field.views!==1?"s":""}</strong> and <strong>{field.reports} report{field.reports!==1?"s":""}</strong>.
            Deactivating will break those views and remove the column from reports. Remove all usages first, or reassign them before deactivating.
          </div>
          <button className="btn btn-ghost btn-sm" style={{marginTop:6}} onClick={()=>setShowDeactivateWarn(false)}>Dismiss</button>
        </div>
      )}
      {/* actions */}
      <div style={{padding:"12px",display:"flex",gap:6,flexWrap:"wrap",marginTop:"auto"}}>
        <button className="btn btn-primary btn-sm" onClick={()=>onFlash(`Draft change saved — ${field.key}`)}>Save draft change</button>
        <button className="btn btn-sm" onClick={onClose}>Cancel</button>
        <span style={{flex:1}} />
        <button className="btn btn-ghost btn-sm" style={{color:"var(--neg)"}}
          onClick={()=>{ if(inUse) setShowDeactivateWarn(true); else onFlash(`${field.key} deactivated in draft`); }}>
          Deactivate
        </button>
      </div>
    </div>
  );
}

function CustomFieldsTab({ selectedId, onSelect, onAdd, onFlash }){
  const field = FIELDS.find(f=>f.id===selectedId);
  return (
    <div className="two-col">
      <div style={{minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:12.5,color:"var(--muted)"}}>Showing {FIELDS.length} custom fields across Opportunity, Account, Contact entities</span>
          <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Add field</button>
        </div>
        <section className="panel">
          <div style={{overflowX:"auto"}}>
            <table className="t" style={{minWidth:900}}>
              <colgroup>
                <col style={{width:160}}/><col style={{width:160}}/><col style={{width:100}}/>
                <col style={{width:90}}/><col style={{width:60}}/><col style={{width:50}}/>
                <col style={{width:50}}/><col style={{width:60}}/><col style={{width:110}}/>
                <col style={{width:110}}/>
              </colgroup>
              <thead><tr>
                <th>Field label</th><th>Field key</th><th>Entity</th>
                <th>Type</th><th style={{textAlign:"center"}}>Req.</th><th style={{textAlign:"center"}}>Active</th>
                <th style={{textAlign:"center"}}>Views</th><th style={{textAlign:"center"}}>Reports</th>
                <th>Stage rule</th><th>Status</th>
              </tr></thead>
              <tbody>
                {FIELDS.map(f=>(
                  <FieldRow key={f.id} f={f} selected={selectedId===f.id} onClick={()=>onSelect(selectedId===f.id?null:f.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <div className="right-sticky">
        <FieldEditPanel field={field} onClose={()=>onSelect(null)} onFlash={onFlash} />
      </div>
    </div>
  );
}

/* ─────────── Stages tab ─────────── */

function StagesTab({ selectedId, onSelect }){
  const [stagesOrder, setStagesOrder] = useState(STAGES);
  const stage = stagesOrder.find(s=>s.id===selectedId);

  function moveUp(idx){
    if(idx===0) return;
    const arr=[...stagesOrder];
    [arr[idx-1],arr[idx]]=[arr[idx],arr[idx-1]];
    setStagesOrder(arr);
  }
  function moveDown(idx){
    if(idx>=stagesOrder.length-1) return;
    const arr=[...stagesOrder];
    [arr[idx],arr[idx+1]]=[arr[idx+1],arr[idx]];
    setStagesOrder(arr);
  }

  return (
    <div className="two-col">
      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Pipeline stages <em>{stagesOrder.length}</em></div>
          <div className="panel-actions"><span style={{fontSize:11.5,color:"var(--muted)"}}>Drag or use arrows to reorder · changes queued in draft</span></div>
        </div>
        <table className="t">
          <colgroup><col style={{width:36}}/><col style={{width:28}}/><col/><col style={{width:120}}/><col style={{width:70}}/><col style={{width:70}}/><col style={{width:90}}/><col style={{width:80}}/></colgroup>
          <thead><tr>
            <th></th><th>#</th><th>Stage</th><th>Key</th>
            <th className="num">Probability</th><th style={{textAlign:"center"}}>Active</th>
            <th style={{textAlign:"center"}}>Req. fields</th><th>Approval gate</th>
          </tr></thead>
          <tbody>
            {stagesOrder.map((s,i)=>(
              <tr key={s.id} className={selectedId===s.id?"selected":""} onClick={()=>onSelect(s.id===selectedId?null:s.id)} style={{cursor:"pointer"}}>
                <td style={{padding:"6px 4px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:1}}>
                    <button className="btn btn-ghost btn-sm" style={{padding:"1px 4px",fontSize:10}} onClick={e=>{e.stopPropagation();moveUp(i);}}>▲</button>
                    <button className="btn btn-ghost btn-sm" style={{padding:"1px 4px",fontSize:10}} onClick={e=>{e.stopPropagation();moveDown(i);}}>▼</button>
                  </div>
                </td>
                <td className="mono" style={{fontSize:12,color:"var(--muted)"}}>{i+1}</td>
                <td style={{fontWeight:500}}>{s.label}</td>
                <td className="mono" style={{fontSize:11.5,color:"var(--muted-2)"}}>{s.key}</td>
                <td className="num mono">{s.prob}%</td>
                <td style={{textAlign:"center"}}><span style={{color:"var(--pos)"}}>●</span></td>
                <td style={{textAlign:"center"}}><span className="mono" style={{fontWeight:s.reqFields>0?700:400,color:s.reqFields>0?"var(--accent-2)":"var(--muted)"}}>{s.reqFields||"—"}</span></td>
                <td>{s.approvalGate ? <span style={{fontSize:11,fontFamily:'"JetBrains Mono",monospace',color:"var(--info)",background:"var(--info-soft)",border:"1px solid #A4C0C8",padding:"1px 5px",borderRadius:2}}>Gate</span> : <span style={{color:"var(--muted)",fontSize:12}}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="right-sticky">
        {stage ? (
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Stage detail</div>
              <button className="btn btn-ghost btn-sm" onClick={()=>onSelect(null)}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid var(--hairline)"}}>
              {[["Label",stage.label,""],["Stage key",stage.key,"mono"],["Probability",stage.prob+"%","mono"],["Approval gate",stage.approvalGate?"Yes":"No",""]].map(([l,v,t],i)=>(
                <div key={i} style={{padding:"9px 12px",borderRight:i%2===0?"1px solid var(--hairline)":"none",borderBottom:i<2?"1px solid var(--hairline)":"none"}}>
                  <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:3}}>{l}</div>
                  <div className={t==="mono"?"mono":""} style={{fontSize:12.5,fontWeight:500}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{padding:"10px 12px",borderBottom:"1px solid var(--hairline)"}}>
              <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:6}}>Required fields at this stage</div>
              {RULES.find(r=>r.stage===stage.label) ? (
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {(RULES.find(r=>r.stage===stage.label)?.fields||[]).map((f,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",background:"var(--paper-2)",border:"1px solid var(--hairline)"}}>
                      <span style={{color:"var(--neg)",fontSize:11,fontWeight:700}}>✓</span>
                      <span style={{fontSize:12.5}}>{f}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{fontSize:12.5,color:"var(--muted)"}}>No required fields configured for this stage</span>
              )}
            </div>
            <div style={{padding:"10px 12px",display:"flex",gap:6}}>
              <button className="btn btn-primary btn-sm">Save changes</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>onSelect(null)}>Cancel</button>
              {!["closed_won","closed_lost"].includes(stage.key) && (
                <button className="btn btn-ghost btn-sm" style={{marginLeft:"auto",color:"var(--neg)"}}>Deactivate stage</button>
              )}
            </div>
          </div>
        ) : (
          <div className="panel" style={{padding:"36px 16px",textAlign:"center",color:"var(--muted)",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,border:"1px dashed var(--line-2)",display:"grid",placeItems:"center",fontFamily:'"JetBrains Mono",monospace',fontSize:10}}>ST</div>
            <div style={{fontWeight:500,color:"var(--ink)",fontSize:13}}>Select a stage</div>
            <div style={{fontSize:12.5,lineHeight:1.5,maxWidth:200}}>Click any row to edit stage properties, probability, and required fields.</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── Required rules tab ─────────── */

function RequiredRulesTab({ onFlash }){
  const [newStage, setNewStage] = useState("Proposal");
  const [newField, setNewField] = useState("");
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:14,alignItems:"start"}}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {RULES.map((r,i)=>(
          <section key={i} className="panel">
            <div className="panel-head">
              <div className="panel-title">Required at: {r.stage} <em>{r.fields.length} rules</em></div>
              <button className="btn btn-ghost btn-sm">+ Add rule</button>
            </div>
            <div>
              {r.fields.map((f,j)=>(
                <div key={j} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:10,padding:"9px 14px",borderBottom:j<r.fields.length-1?"1px solid var(--hairline)":"none",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{color:"var(--neg)",fontWeight:700,fontSize:11}}>REQ</span>
                    <span style={{fontWeight:500}}>{f}</span>
                  </div>
                  <span style={{fontSize:11,fontFamily:'"JetBrains Mono",monospace',color:"var(--muted)"}}>Stage entry: {r.stage}</span>
                  <button className="btn btn-ghost btn-sm" style={{color:"var(--neg)"}}>Remove</button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {/* rule builder */}
      <div className="panel" style={{position:"sticky",top:72}}>
        <div className="panel-head"><div className="panel-title">Rule builder</div></div>
        <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
          <div>
            <div style={{fontSize:11,color:"var(--muted)",fontWeight:500,marginBottom:5}}>Stage</div>
            <div style={{border:"1px solid var(--line)",borderRadius:3,background:"var(--white)",padding:"7px 10px",display:"flex",alignItems:"center",gap:8}}>
              <select style={{border:0,outline:"none",width:"100%",font:"inherit",fontSize:13,background:"transparent",appearance:"none"}} value={newStage} onChange={e=>setNewStage(e.target.value)}>
                {STAGES.slice(0,5).map(s=><option key={s.id}>{s.label}</option>)}
              </select>
              <span style={{color:"var(--muted)",fontSize:12,flexShrink:0}}>▾</span>
            </div>
          </div>
          <div>
            <div style={{fontSize:11,color:"var(--muted)",fontWeight:500,marginBottom:5}}>Required field</div>
            <div style={{border:"1px solid var(--line)",borderRadius:3,background:"var(--white)",padding:"7px 10px",display:"flex",alignItems:"center",gap:8}}>
              <select style={{border:0,outline:"none",width:"100%",font:"inherit",fontSize:13,background:"transparent",appearance:"none"}} value={newField} onChange={e=>setNewField(e.target.value)}>
                <option value="">— Select field —</option>
                {FIELDS.map(f=><option key={f.id} value={f.label}>{f.label}</option>)}
              </select>
              <span style={{color:"var(--muted)",fontSize:12,flexShrink:0}}>▾</span>
            </div>
          </div>
          <div style={{padding:"9px 10px",background:"var(--paper-2)",border:"1px solid var(--hairline)",fontSize:12,color:"var(--ink-2)",lineHeight:1.5}}>
            <span className="mono" style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)",display:"block",marginBottom:3}}>Preview</span>
            {newField ? `Stage "${newStage}" will require "${newField}" to be filled before the opportunity can advance.` : "Select a stage and field to preview the validation rule."}
          </div>
          <button className="btn btn-primary btn-sm" disabled={!newField}
            style={{opacity:!newField?.5:1}}
            onClick={()=>{ if(newField) onFlash(`Rule added: ${newField} required at ${newStage}`); }}>
            Add rule to draft
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Publish history tab ─────────── */

function PublishHistoryTab(){
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14,alignItems:"start"}}>
      <section className="panel">
        <div className="panel-head"><div className="panel-title">Publish history <em>{HISTORY.length} versions</em></div></div>
        {HISTORY.map((h,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"70px 22px 1fr auto",gap:"0 10px",padding:"12px 14px",borderBottom:i<HISTORY.length-1?"1px solid var(--hairline)":"none",alignItems:"start",position:"relative"}}>
            {i<HISTORY.length-1&&<div style={{position:"absolute",left:"81px",top:36,bottom:-12,width:1.5,background:"var(--line-2)",zIndex:0}} />}
            <div className="mono" style={{fontSize:11,color:"var(--muted)",lineHeight:1.35}}>{h.at.slice(11)}<div style={{fontSize:10,color:"var(--muted-2)"}}>{h.at.slice(0,10)}</div></div>
            <div style={{width:22,height:22,borderRadius:"50%",background:h.current?"var(--pos-soft)":"var(--paper-2)",border:`1.5px solid ${h.current?"var(--pos)":"var(--line)"}`,display:"grid",placeItems:"center",fontSize:9,fontWeight:700,fontFamily:'"JetBrains Mono",monospace',color:h.current?"var(--pos)":"var(--muted)",position:"relative",zIndex:1}}>{h.current?"✓":"·"}</div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <VerBadge v={h.v} kind={h.current?"pub":"old"} />
                {h.current&&<span style={{fontSize:11,color:"var(--pos)",fontWeight:500}}>Runtime-active</span>}
                <span style={{fontSize:11.5,color:"var(--muted)"}}>by {h.by}</span>
              </div>
              <div style={{fontSize:12.5,color:"var(--ink-2)",lineHeight:1.5}}>{h.note}</div>
            </div>
            {!h.current&&<button className="btn btn-ghost btn-sm" style={{flexShrink:0,fontSize:11}}>Roll back ›</button>}
          </div>
        ))}
      </section>
      <div className="panel" style={{position:"sticky",top:72,padding:"14px"}}>
        <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:10}}>Rollback notice</div>
        <div style={{fontSize:12.5,color:"var(--ink-2)",lineHeight:1.6}}>Rolling back creates a new draft from the selected version. The published v42 remains active until the rollback draft is validated and published as a new version (e.g. v44).</div>
        <div style={{marginTop:10,padding:"8px 10px",background:"var(--warn-soft)",border:"1px solid #D9BFA0",fontSize:12,color:"var(--ink-2)"}}>
          <span className="mono" style={{fontSize:10,letterSpacing:".1em",color:"var(--accent-2)",display:"block",marginBottom:2}}>IMPORTANT</span>
          Rollback does not revert data — only the field and stage configuration schema.
        </div>
      </div>
    </div>
  );
}

/* ─────────── Impact review tab ─────────── */

function ImpactReviewTab(){
  const impacts = [
    { entity:"Open opportunities", count:46,  risk:"high",   desc:"14 missing Legal Entity Code value — will need backfill before Negotiation advancement", icon:"OP" },
    { entity:"Saved views",        count:3,   risk:"medium", desc:"Payment Risk Level referenced — changing allowed values breaks filter conditions",        icon:"VW" },
    { entity:"Reports",            count:2,   risk:"medium", desc:"2 reports use Payment Risk Level as a dimension — column may change",                     icon:"RE" },
    { entity:"Import schemas",     count:1,   risk:"low",    desc:"1 import template references payment_risk_level — may need schema update post-publish",    icon:"IM" },
    { entity:"Approval policies",  count:2,   risk:"medium", desc:"2 approval policies check payment_risk_level and procurement_process field values",        icon:"AP" },
    { entity:"Forms & UI",         count:4,   risk:"low",    desc:"4 field labels updated in opportunity form and account sidebar",                          icon:"FO" },
  ];
  const riskColor = { high:"var(--neg)", medium:"var(--accent-2)", low:"var(--pos)" };
  const riskBg    = { high:"var(--neg-soft)", medium:"var(--warn-soft)", low:"var(--pos-soft)" };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{padding:"10px 14px",background:"var(--info-soft)",border:"1px solid #A4C0C8",borderLeft:"3px solid var(--info)",fontSize:12,color:"var(--ink-2)"}}>
        <strong>Draft v43 impact summary</strong> — This review shows what will change when v43 is published. Publishing v43 replaces v42 as the runtime-active configuration. No data is deleted; only schema and validation rules change.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {impacts.map((item,i)=>(
          <div key={i} className="panel">
            <div style={{padding:"12px 14px",borderBottom:"1px solid var(--hairline)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:28,height:28,background:"var(--paper-2)",border:"1px solid var(--line)",display:"grid",placeItems:"center",fontFamily:'"JetBrains Mono",monospace',fontSize:10,fontWeight:700,color:"var(--ink-2)"}}>{item.icon}</div>
                <span style={{fontWeight:600,fontSize:13}}>{item.entity}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span className="mono" style={{fontSize:20,fontWeight:700,color:riskColor[item.risk]}}>{item.count}</span>
                <span style={{fontSize:10,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".08em",textTransform:"uppercase",color:riskColor[item.risk],background:riskBg[item.risk],padding:"1px 6px",borderRadius:2}}>{item.risk}</span>
              </div>
            </div>
            <div style={{padding:"10px 14px",fontSize:12.5,color:"var(--ink-2)",lineHeight:1.5}}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Validation panel ─────────── */

function ValidationPanel({ scenario }){
  const msgs = scenario==="errors"
    ? [...VALIDATION.errors, ...VALIDATION.warnings]
    : VALIDATION.warnings;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
      {scenario==="errors" && VALIDATION.errors.map((e,i)=>(
        <div key={i} style={{padding:"9px 12px",background:"var(--neg-soft)",border:"1px solid #D6B0A8",borderLeft:"3px solid var(--neg)",fontSize:12.5,color:"var(--ink-2)",lineHeight:1.5,display:"flex",gap:10}}>
          <span className="mono" style={{fontWeight:700,color:"var(--neg)",flexShrink:0}}>E</span>
          {e}
        </div>
      ))}
      {VALIDATION.warnings.map((w,i)=>(
        <div key={i} style={{padding:"9px 12px",background:"var(--warn-soft)",border:"1px solid #D9BFA0",borderLeft:"3px solid var(--accent)",fontSize:12.5,color:"var(--ink-2)",lineHeight:1.5,display:"flex",gap:10}}>
          <span className="mono" style={{fontWeight:700,color:"var(--accent-2)",flexShrink:0}}>W</span>
          {w}
        </div>
      ))}
      <div style={{padding:"7px 12px",background:"var(--info-soft)",border:"1px solid #A4C0C8",fontSize:12,color:"var(--info)",lineHeight:1.5}}>
        <span className="mono" style={{fontWeight:700,marginRight:8}}>i</span>{VALIDATION.info}
      </div>
    </div>
  );
}

/* ─────────── Publish modal ─────────── */

function PublishModal({ onClose, onConfirm }){
  const [confirmed, setConfirmed] = useState(false);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog">
        <div className="modal-card" style={{width:520}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--hairline)",background:"var(--paper-2)",display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:"var(--pos-soft)",border:"1.5px solid var(--pos)",display:"grid",placeItems:"center",color:"var(--pos)",fontSize:16,flexShrink:0}}>↑</div>
            <div>
              <h3 style={{margin:0,fontSize:15,fontWeight:600}}>Publish draft v43</h3>
              <p style={{margin:"2px 0 0",fontSize:12,color:"var(--muted)"}}>v43 will become runtime-active. v42 will be archived and available for rollback.</p>
            </div>
          </div>
          <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
            {[
              ["Validation","Passed · 3 warnings acknowledged","pos"],
              ["Changes","1 field modified · 1 stage rule updated",""],
              ["Affected entities","46 opportunities · 3 views · 2 reports","warn"],
              ["Rollback available","Yes — v42 available for immediate rollback",""],
            ].map(([l,v,c],i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<3?"1px solid var(--hairline)":"none"}}>
                <span style={{fontSize:12.5,color:"var(--muted)"}}>{l}</span>
                <span style={{fontSize:12.5,fontWeight:500,color:c==="pos"?"var(--pos)":c==="warn"?"var(--accent-2)":"var(--ink)"}}>{v}</span>
              </div>
            ))}
            <label style={{display:"flex",alignItems:"flex-start",gap:8,marginTop:4,cursor:"pointer",fontSize:12.5,lineHeight:1.5}}>
              <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} style={{accentColor:"var(--accent-2)",width:14,height:14,marginTop:2,flexShrink:0}} />
              I have reviewed the impact summary and acknowledge that publishing v43 will update the runtime configuration for all Orion Industrial users.
            </label>
          </div>
          <div style={{padding:"11px 18px",borderTop:"1px solid var(--hairline)",background:"var(--paper-2)",display:"flex",justifyContent:"space-between"}}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className={`btn btn-sm ${confirmed?"btn-primary":"btn-disabled"}`} aria-disabled={!confirmed} onClick={()=>{ if(confirmed) onConfirm(); }}>
              Publish v43 →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── Add field modal ─────────── */

function AddFieldModal({ onClose, onSave }){
  const [label, setLabel] = useState("");
  const [entity, setEntity] = useState("Opportunity");
  const [type, setType] = useState("Select");
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog">
        <div className="modal-card" style={{width:480}}>
          <div style={{padding:"13px 18px",borderBottom:"1px solid var(--hairline)",background:"var(--paper-2)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div><h3 style={{margin:0,fontSize:14.5,fontWeight:600}}>Add custom field</h3><p style={{margin:"2px 0 0",fontSize:12,color:"var(--muted)"}}>Added to draft v43 — not live until published</p></div>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{fontSize:14}}>✕</button>
          </div>
          <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
            {[["Field label",label,setLabel,"e.g. Contract Value Band"],["Field key","",null,"auto-generated from label · read-only"]].map(([l,v,s,ph],i)=>(
              <div key={i}>
                <label style={{fontSize:11,color:"var(--muted)",fontWeight:500,display:"block",marginBottom:4}}>{l}</label>
                <div style={{border:"1px solid var(--line)",borderRadius:3,background:s?"var(--white)":"var(--paper-2)",padding:"7px 10px"}}>
                  <input style={{border:0,outline:"none",width:"100%",font:"inherit",fontSize:13,color:s?"var(--ink)":"var(--muted)",background:"transparent"}}
                    value={s?v:label.toLowerCase().replace(/[^a-z0-9]+/g,"_")||""}
                    onChange={s?e=>s(e.target.value):undefined}
                    readOnly={!s}
                    placeholder={ph} />
                </div>
              </div>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Entity",entity,setEntity,["Opportunity","Account","Contact","Opp / Account"]],["Type",type,setType,["Select","Text","Number","Date","Date Range","Boolean"]]].map(([l,v,s,opts],i)=>(
                <div key={i}>
                  <label style={{fontSize:11,color:"var(--muted)",fontWeight:500,display:"block",marginBottom:4}}>{l}</label>
                  <div style={{border:"1px solid var(--line)",borderRadius:3,background:"var(--white)",padding:"7px 10px",display:"flex",alignItems:"center"}}>
                    <select style={{border:0,outline:"none",width:"100%",font:"inherit",fontSize:13,background:"transparent",appearance:"none"}} value={v} onChange={e=>s(e.target.value)}>
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                    <span style={{color:"var(--muted)",fontSize:12}}>▾</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{padding:"11px 18px",borderTop:"1px solid var(--hairline)",background:"var(--paper-2)",display:"flex",justifyContent:"space-between"}}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-lg" onClick={()=>onSave(label)}>Add to draft</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── App ─────────── */

function App(){
  const [scenario,       setScenario]       = useState("warnings");
  const [activeTab,      setActiveTab]       = useState("fields");
  const [selectedField,  setSelectedField]   = useState(null);
  const [selectedStage,  setSelectedStage]   = useState(null);
  const [showPublish,    setShowPublish]      = useState(false);
  const [showAddField,   setShowAddField]    = useState(false);
  const [showValidation, setShowValidation]  = useState(false);
  const [toast,          setToast]           = useState(null);

  function flash(msg){ setToast(msg); setTimeout(()=>setToast(null),2800); }

  function onAction(type){
    if(type==="publish"){ if(scenario==="ready") setShowPublish(true); else flash("Resolve validation issues before publishing"); }
    else if(type==="validate"){ setShowValidation(true); flash(scenario==="errors"?"✕ Validation failed — 1 blocking error":"⚠ Validation complete — 3 warnings, no blocking errors"); }
    else if(type==="draft") flash("New draft created from v42");
    else if(type==="rollback") flash("Rollback — select version from Publish History tab");
    else if(type==="discard") flash("Draft v43 discarded — reverted to v42");
  }

  return (
    <div className="app" data-screen-label="09 Metadata Admin">
      <Sidebar />
      <div className="main">
        <TopBar />
        <div className="content">
          <ScenarioBar scenario={scenario} setScenario={v=>{ setScenario(v); setShowValidation(false); }} />
          <StatusHeader scenario={scenario} onAction={onAction} />
          <div style={{height:12}} />
          {showValidation && <ValidationPanel scenario={scenario} />}
          <TabBar active={activeTab} setActive={v=>{ setActiveTab(v); setSelectedField(null); setSelectedStage(null); }} />
          {activeTab==="fields"  && <CustomFieldsTab selectedId={selectedField} onSelect={setSelectedField} onAdd={()=>setShowAddField(true)} onFlash={flash} />}
          {activeTab==="stages"  && <StagesTab selectedId={selectedStage} onSelect={setSelectedStage} />}
          {activeTab==="rules"   && <RequiredRulesTab onFlash={flash} />}
          {activeTab==="history" && <PublishHistoryTab />}
          {activeTab==="impact"  && <ImpactReviewTab />}
          <div className="foot-ruler">
            <span>SALES OPS CRM · ORION INDUSTRIAL · LOCAL PILOT</span>
            <span>USER OPS · IV · METADATA ADMIN</span>
            <span>PUBLISHED v42 · DRAFT v43 · METADATA CONFIG</span>
          </div>
        </div>
      </div>
      {showPublish  && <PublishModal onClose={()=>setShowPublish(false)} onConfirm={()=>{ setShowPublish(false); flash("✓ v43 published — now runtime-active. v42 archived."); }} />}
      {showAddField && <AddFieldModal onClose={()=>setShowAddField(false)} onSave={name=>{ setShowAddField(false); flash(`✓ Field "${name}" added to draft v43`); }} />}
      {toast && <div className="toast"><span className="ok">·</span>{toast}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
