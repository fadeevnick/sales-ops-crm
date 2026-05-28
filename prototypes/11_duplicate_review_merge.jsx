/* eslint-disable */
const { useState, useEffect } = React;

/* ─────────── Data ─────────── */

const USER = { name:"Irina Volkova", role:"RevOps Administrator", initials:"IV", color:"bg-e" };

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

const CANDIDATES = [
  {
    id:"DUP-2042", type:"Account", score:0.87, status:"open",
    a:{ id:"AC-3318", name:"Acme Manufacturing",   source:"Manual · 2021-03-14" },
    b:{ id:"AC-4472", name:"ACME Mfg. Cleveland",  source:"Import · IMP-0239 · 2026-05-15" },
    reasons:["Similar company name","Same website domain","Same phone region","Same import batch"],
    source:"IMP-0239",
  },
  {
    id:"DUP-2043", type:"Contact", score:0.91, status:"open",
    a:{ id:"CT-1001", name:"Taylor Brooks",   source:"Manual · 2024-01-08" },
    b:{ id:"CT-5521", name:"T. Brooks",       source:"Import · IMP-0240 · 2026-05-17" },
    reasons:["Same email domain","Same phone number","Linked to Acme Manufacturing"],
    source:"IMP-0240",
  },
  {
    id:"DUP-2044", type:"Account", score:0.78, status:"open",
    a:{ id:"AC-3302", name:"Nordwerk Tooling AG", source:"Manual · 2022-08-11" },
    b:{ id:"AC-4481", name:"Nordwerk Tools",      source:"Import · IMP-0239 · 2026-05-15" },
    reasons:["Fuzzy name match","Same domain"],
    source:"IMP-0239",
  },
  {
    id:"DUP-2045", type:"Contact", score:0.74, status:"open",
    a:{ id:"CT-1002", name:"Maya Chen",   source:"Manual · 2024-03-20" },
    b:{ id:"CT-5534", name:"M. Chen",     source:"Import · IMP-0240 · 2026-05-17" },
    reasons:["Name initial match","Same company"],
    source:"IMP-0240",
  },
  {
    id:"DUP-2046", type:"Account", score:0.93, status:"open",
    a:{ id:"AC-3198", name:"Vetra Logistics",     source:"Manual · 2023-06-05" },
    b:{ id:"AC-4490", name:"Vetra Logistics OÜ",  source:"Import · IMP-0239 · 2026-05-15" },
    reasons:["Near-identical name","Same VAT region","Same domain"],
    source:"IMP-0239",
  },
];

const ACCOUNT_FIELDS = [
  { f:"Account name",    a:"Acme Manufacturing",          b:"ACME Mfg. Cleveland",      match:"conflict" },
  { f:"Website",         a:"acme-manufacturing.example",  b:"acme-mfg.example",         match:"similar"  },
  { f:"Phone",           a:"+49 211 88 77 00",            b:"+49 211 88 92 00",         match:"similar"  },
  { f:"Industry",        a:"Industrial Equipment",        b:"Industrial Equipment",     match:"exact"    },
  { f:"Owner",           a:"Anna Petrova",                b:"— (unassigned)",           match:"conflict" },
  { f:"Region",          a:"DACH-North",                  b:"DACH-North",               match:"exact"    },
  { f:"Created",         a:"2021-03-14",                  b:"2026-05-15",               match:"conflict" },
  { f:"Created source",  a:"Manual entry",                b:"Import IMP-0239",          match:"conflict" },
  { f:"Open opps",       a:"4",                           b:"1",                        match:"conflict" },
  { f:"Contacts",        a:"4",                           b:"1",                        match:"conflict" },
  { f:"Activities",      a:"6",                           b:"0",                        match:"conflict" },
  { f:"Approval reqs",   a:"REQ-1182 · REQ-1175",         b:"—",                        match:"conflict" },
];

const CONTACT_FIELDS = [
  { f:"Full name",  a:"Taylor Brooks",                       b:"T. Brooks",                     match:"similar"  },
  { f:"Email",      a:"t.brooks@acme-manufacturing.example", b:"t.brooks@acme-mfg.example",     match:"similar"  },
  { f:"Phone",      a:"+49 211 88 77 01",                    b:"+49 211 88 77 01",              match:"exact"    },
  { f:"Title",      a:"VP Operations",                       b:"VP Ops",                        match:"similar"  },
  { f:"Account",    a:"Acme Manufacturing",                   b:"Acme Manufacturing",            match:"exact"    },
  { f:"Influence",  a:"Decision Maker",                      b:"— (unmapped)",                  match:"conflict" },
  { f:"Created",    a:"2024-01-08",                          b:"2026-05-17",                    match:"conflict" },
  { f:"Created source",a:"Manual entry",                     b:"Import IMP-0240",               match:"conflict" },
];

const CONFLICTS_ACCOUNT = [
  { f:"Account name",   a:"Acme Manufacturing",  b:"ACME Mfg. Cleveland",  risk:"low",  decision:"master" },
  { f:"Owner",          a:"Anna Petrova",         b:"— (unassigned)",       risk:"medium",decision:"master"},
  { f:"Created date",   a:"2021-03-14",           b:"2026-05-15",           risk:"low",  decision:"master" },
  { f:"Website",        a:"acme-manufacturing.example",b:"acme-mfg.example",risk:"low", decision:"secondary"},
];

/* ─────────── Helpers ─────────── */

function Pill({ kind, children }){ return <span className={`pill p-${kind}`}><span className="pdot"></span>{children}</span>; }
function BrandMark(){ return <span className="brand-mark" aria-hidden />; }

function ScoreBar({ score }){
  const color = score>=0.90?"var(--pos)":score>=0.80?"var(--accent-2)":"var(--warn)";
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:6,background:"var(--paper-2)",border:"1px solid var(--hairline)",borderRadius:1,overflow:"hidden"}}>
        <div style={{width:`${score*100}%`,height:"100%",background:color}} />
      </div>
      <span className="mono" style={{fontSize:13,fontWeight:700,color,width:38,textAlign:"right"}}>{score.toFixed(2)}</span>
    </div>
  );
}

function matchIcon(m){
  if(m==="exact")    return { icon:"=", c:"var(--pos)",     bg:"var(--pos-soft)" };
  if(m==="similar")  return { icon:"≈", c:"var(--accent-2)",bg:"var(--accent-soft)" };
  return                    { icon:"≠", c:"var(--neg)",     bg:"var(--neg-soft)" };
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
                <div key={m.key} className={`nav-item ${m.key==="duplicates"?"active":""}`} title={m.label}>
                  <span className="nav-mark mono">{m.code}</span>
                  <span className="nav-label">{m.label}</span>
                  <span className={`nav-count mono ${(m.key==="duplicates"||m.key==="imports")&&counts[m.key]>0?"alert":""}`}>{counts[m.key]||""}</span>
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

function TopBar({ selectedId }){
  return (
    <div className="topbar">
      <div className="crumb">
        <span className="pulse"><span className="pulse-dot" /> LOCAL PILOT</span>
        <span>Data &amp; Quality</span>
        <span className="sep">/</span>
        <strong>Duplicate Review</strong>
        {selectedId && <><span className="sep">·</span><span className="mono" style={{fontSize:11,color:"var(--muted)"}}>{selectedId}</span></>}
      </div>
      <label className="search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="m11 11 3.5 3.5"/></svg>
        <input placeholder="Search candidates, records…" />
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
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",border:"1px solid var(--line)",background:"var(--white)",marginBottom:12}}>
      {[
        { l:"Open candidates",      v:"24", f:"17 Account · 7 Contact",     alert:false },
        { l:"High confidence ≥0.85",v:"8",  f:"5 Account · 3 Contact",      alert:false },
        { l:"Accounts pending",     v:"17", f:"3 from today's import",       alert:false },
        { l:"Contacts pending",     v:"7",  f:"7 from contacts_legacy import",alert:false },
        { l:"Merges this week",     v:"6",  f:"4 Account · 2 Contact",       alert:false },
        { l:"False positives",      v:"3",  f:"Rejected with reason",        alert:false },
      ].map((k,i)=>(
        <div key={i} style={{padding:"11px 13px",borderRight:i<5?"1px solid var(--hairline)":"none"}}>
          <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)"}}>{k.l}</div>
          <div className="mono" style={{fontSize:20,fontWeight:600,marginTop:3,color:k.alert?"var(--neg)":"var(--ink)"}}>{k.v}</div>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:1}}>{k.f}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────── Queue ─────────── */

function Queue({ candidates, selectedId, onSelect, activeView, setActiveView }){
  const views = ["All Open","High Confidence","Accounts","Contacts","From Imports","Needs Review"];
  const filtered = candidates.filter(c=>{
    if(activeView==="Accounts") return c.type==="Account";
    if(activeView==="Contacts") return c.type==="Contact";
    if(activeView==="High Confidence") return c.score>=0.85;
    if(activeView==="From Imports") return !!c.source;
    return true;
  });
  return (
    <div className="panel queue-panel">
      <div className="panel-head"><div className="panel-title">Duplicate queue <em>{filtered.length}</em></div></div>
      <div style={{padding:"8px 12px",borderBottom:"1px solid var(--hairline)",display:"flex",gap:5,flexWrap:"wrap"}}>
        {views.map(v=>(
          <button key={v} className={`filterchip ${activeView===v?"on":""}`} onClick={()=>setActiveView(v)}>{v}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {filtered.map(c=>{
          const scoreColor = c.score>=0.90?"var(--pos)":c.score>=0.80?"var(--accent-2)":"var(--warn)";
          return (
            <div key={c.id}
              className={`queue-row ${selectedId===c.id?"selected":""}`}
              onClick={()=>onSelect(c.id)}
            >
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:4}}>
                <div>
                  <span className="mono" style={{fontSize:10.5,color:"var(--muted)",letterSpacing:".06em"}}>{c.id}</span>
                  <span style={{fontSize:10.5,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em",textTransform:"uppercase",marginLeft:8,color:c.type==="Account"?"var(--accent-2)":"var(--info)",background:c.type==="Account"?"var(--accent-soft)":"var(--info-soft)",border:`1px solid ${c.type==="Account"?"#D9BFA0":"#A4C0C8"}`,padding:"0 5px",borderRadius:2}}>{c.type}</span>
                </div>
                <span className="mono" style={{fontSize:13,fontWeight:700,color:scoreColor,flexShrink:0}}>{c.score.toFixed(2)}</span>
              </div>
              <div style={{fontSize:12.5,fontWeight:500,marginBottom:2}}>{c.a.name}</div>
              <div style={{fontSize:12,color:"var(--muted)"}}>vs <span style={{fontWeight:500,color:"var(--ink-2)"}}>{c.b.name}</span></div>
              <div style={{marginTop:5,display:"flex",gap:4,flexWrap:"wrap"}}>
                {c.reasons.slice(0,2).map((r,i)=>(
                  <span key={i} style={{fontSize:10.5,padding:"1px 6px",background:"var(--paper-2)",border:"1px solid var(--hairline)",borderRadius:2,color:"var(--muted-2)"}}>{r}</span>
                ))}
                {c.reasons.length>2 && <span style={{fontSize:10.5,color:"var(--muted)"}}>+{c.reasons.length-2}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Match header ─────────── */

function MatchHeader({ cand }){
  const scoreColor = cand.score>=0.90?"var(--pos)":cand.score>=0.80?"var(--accent-2)":"var(--warn)";
  const scoreBg    = cand.score>=0.90?"var(--pos-soft)":cand.score>=0.80?"var(--accent-soft)":"var(--warn-soft)";
  const scoreConf  = cand.score>=0.90?"High confidence":cand.score>=0.80?"Medium confidence":"Low confidence";

  const components = [
    { l:"Name similarity",  v:cand.type==="Account"?0.82:0.78 },
    { l:"Domain / email",   v:cand.type==="Account"?0.76:0.88 },
    { l:"Phone region",     v:cand.type==="Account"?0.90:0.97 },
    { l:"Import source",    v:cand.type==="Account"?0.95:0.91 },
  ];

  return (
    <div className="panel" style={{marginBottom:12}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid var(--hairline)",display:"flex",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}>
        {/* score badge */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"12px 16px",background:scoreBg,border:`2px solid ${scoreColor}`,minWidth:80,flexShrink:0}}>
          <span className="mono" style={{fontSize:28,fontWeight:800,color:scoreColor,lineHeight:1}}>{cand.score.toFixed(2)}</span>
          <span style={{fontSize:10.5,color:scoreColor,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".06em",textTransform:"uppercase",marginTop:3}}>{scoreConf}</span>
        </div>
        {/* components */}
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",marginBottom:8}}>Score breakdown</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {components.map((c,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"130px 1fr 40px",gap:8,alignItems:"center"}}>
                <span style={{fontSize:12}}>{c.l}</span>
                <div style={{height:5,background:"var(--paper-2)",border:"1px solid var(--hairline)",borderRadius:1,overflow:"hidden"}}>
                  <div style={{width:`${c.v*100}%`,height:"100%",background:c.v>=0.85?"var(--pos)":c.v>=0.75?"var(--accent-2)":"var(--warn)"}} />
                </div>
                <span className="mono" style={{fontSize:11,color:"var(--muted)",textAlign:"right"}}>{c.v.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        {/* explanation */}
        <div style={{flex:1,minWidth:220,padding:"10px 12px",background:"var(--info-soft)",border:"1px solid #A4C0C8",borderLeft:"3px solid var(--info)"}}>
          <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--info)",marginBottom:5}}>System interpretation</div>
          <div style={{fontSize:12.5,color:"var(--ink-2)",lineHeight:1.55}}>
            {cand.type==="Account"
              ? "Likely the same account — one created manually (2021) and one imported via CSV (2026). Strong phone region and domain match. Recommend merge with AC-3318 as master record."
              : "Likely the same contact — imported with abbreviated name. Identical phone and same company. Recommend merge with CT-1001 as master, preserving full name and influence classification."}
          </div>
          <div style={{marginTop:8,display:"flex",gap:6}}>
            {cand.reasons.map((r,i)=>(
              <span key={i} style={{fontSize:11,fontFamily:'"JetBrains Mono",monospace',background:"var(--white)",border:"1px solid #A4C0C8",padding:"1px 6px",borderRadius:2,color:"var(--info)"}}>{r}</span>
            ))}
          </div>
        </div>
      </div>
      {/* secondary actions */}
      <div style={{padding:"8px 14px",display:"flex",gap:8,alignItems:"center"}}>
        <button className="btn btn-ghost btn-sm">Open {cand.a.id} ›</button>
        <button className="btn btn-ghost btn-sm">Open {cand.b.id} ›</button>
        <button className="btn btn-ghost btn-sm">View related opportunities</button>
        <button className="btn btn-ghost btn-sm">View audit preview</button>
        <span style={{flex:1}} />
        <button className="btn btn-ghost btn-sm">Skip →</button>
      </div>
    </div>
  );
}

/* ─────────── Side-by-side comparison ─────────── */

function SideBySide({ cand, master, fields }){
  return (
    <div className="panel" style={{marginBottom:12}}>
      <div className="panel-head">
        <div className="panel-title">Field comparison</div>
        <div className="panel-actions">
          <span style={{fontSize:11.5,color:"var(--muted)"}}>
            <span style={{color:"var(--pos)"}}>= exact</span>
            <span style={{margin:"0 8px",color:"var(--line-2)"}}>·</span>
            <span style={{color:"var(--accent-2)"}}>≈ similar</span>
            <span style={{margin:"0 8px",color:"var(--line-2)"}}>·</span>
            <span style={{color:"var(--neg)"}}>≠ conflict</span>
          </span>
        </div>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
          <colgroup><col style={{width:130}}/><col/><col/></colgroup>
          <thead>
            <tr style={{background:"var(--paper-2)"}}>
              <th style={{padding:"7px 12px",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)",fontWeight:500,borderBottom:"1px solid var(--line)",textAlign:"left"}}>Field</th>
              <th style={{padding:"7px 12px",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",fontWeight:500,borderBottom:"1px solid var(--line)",textAlign:"left",color:master==="a"?"var(--pos)":"var(--muted)"}}>
                {cand.a.id} · {cand.a.name} {master==="a"&&<span style={{fontSize:9,background:"var(--pos-soft)",border:"1px solid #B2C8A8",padding:"0 5px",borderRadius:2,color:"var(--pos)"}}>MASTER</span>}
              </th>
              <th style={{padding:"7px 12px",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",fontWeight:500,borderBottom:"1px solid var(--line)",textAlign:"left",color:master==="b"?"var(--pos)":"var(--muted)"}}>
                {cand.b.id} · {cand.b.name} {master==="b"&&<span style={{fontSize:9,background:"var(--pos-soft)",border:"1px solid #B2C8A8",padding:"0 5px",borderRadius:2,color:"var(--pos)"}}>MASTER</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f,i)=>{
              const mi = matchIcon(f.match);
              return (
                <tr key={i} style={{background:i%2===0?"var(--white)":"var(--paper)"}}>
                  <td style={{padding:"8px 12px",borderBottom:"1px solid var(--hairline)",fontSize:12,color:"var(--muted)",fontWeight:500}}>{f.f}</td>
                  <td style={{padding:"8px 12px",borderBottom:"1px solid var(--hairline)",fontSize:12.5,background:master==="a"?"rgba(63,107,58,.04)":"inherit"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{width:18,height:18,borderRadius:"50%",background:mi.bg,border:`1px solid ${mi.c}`,display:"grid",placeItems:"center",fontSize:9,fontWeight:700,color:mi.c,flexShrink:0}}>{mi.icon}</span>
                      <span>{f.a}</span>
                    </div>
                  </td>
                  <td style={{padding:"8px 12px",borderBottom:"1px solid var(--hairline)",fontSize:12.5,background:master==="b"?"rgba(63,107,58,.04)":"inherit",color:f.match==="conflict"?"var(--muted)":"inherit"}}>{f.b}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────── Master selector ─────────── */

function MasterSelector({ cand, master, setMaster }){
  return (
    <div className="panel" style={{marginBottom:12}}>
      <div className="panel-head"><div className="panel-title">Master record selection</div><div className="panel-actions"><span style={{fontSize:11.5,color:"var(--muted)"}}>Master record's data wins all conflicts by default</span></div></div>
      <div style={{padding:"12px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[{key:"a",rec:cand.a},{key:"b",rec:cand.b}].map(({key,rec})=>(
          <label key={key} style={{
            display:"flex",alignItems:"flex-start",gap:10,padding:"12px",
            border:`2px solid ${master===key?"var(--pos)":"var(--line)"}`,
            background:master===key?"var(--pos-soft)":"var(--white)",
            cursor:"pointer",
          }}>
            <input type="radio" name="master" checked={master===key} onChange={()=>setMaster(key)} style={{accentColor:"var(--pos)",marginTop:2,flexShrink:0}} />
            <div>
              <div style={{fontWeight:600,fontSize:13.5,marginBottom:2}}>{rec.name}</div>
              <div className="mono" style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>{rec.id}</div>
              <div style={{fontSize:12,color:"var(--muted)"}}>{rec.source}</div>
              {key==="a" && master===key && <div style={{marginTop:5,fontSize:11.5,color:"var(--pos)"}}>✓ Recommended master — more linked records</div>}
              {key==="b" && master===key && <div style={{marginTop:5,fontSize:11.5,color:"var(--accent-2)"}}>⚠ Secondary has fewer linked records</div>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Conflict resolution ─────────── */

function ConflictTable({ conflicts, decisions, setDecision }){
  const riskColor = { low:"var(--muted)", medium:"var(--accent-2)", high:"var(--neg)" };
  return (
    <div className="panel" style={{marginBottom:12}}>
      <div className="panel-head">
        <div className="panel-title">Field conflicts <em>{conflicts.length}</em></div>
        <div className="panel-actions"><span style={{fontSize:11.5,color:"var(--muted)"}}>Master wins by default · override for low-risk fields</span></div>
      </div>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <colgroup><col style={{width:130}}/><col/><col/><col style={{width:80}}/><col style={{width:180}}/></colgroup>
        <thead>
          <tr style={{background:"var(--paper-2)"}}>
            {["Field","Master value","Secondary value","Risk","Decision"].map((h,i)=>(
              <th key={i} style={{padding:"6px 12px",fontSize:10,textTransform:"uppercase",letterSpacing:".1em",color:"var(--muted)",fontWeight:500,borderBottom:"1px solid var(--line)",textAlign:"left"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {conflicts.map((c,i)=>(
            <tr key={i}>
              <td style={{padding:"9px 12px",borderBottom:"1px solid var(--hairline)",fontSize:12.5,fontWeight:500}}>{c.f}</td>
              <td style={{padding:"9px 12px",borderBottom:"1px solid var(--hairline)",fontSize:12.5,color:"var(--pos)"}}>{c.a}</td>
              <td style={{padding:"9px 12px",borderBottom:"1px solid var(--hairline)",fontSize:12.5,color:"var(--muted)"}}>{c.b}</td>
              <td style={{padding:"9px 12px",borderBottom:"1px solid var(--hairline)"}}><span style={{fontSize:11,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em",textTransform:"uppercase",color:riskColor[c.risk]}}>{c.risk}</span></td>
              <td style={{padding:"9px 12px",borderBottom:"1px solid var(--hairline)"}}>
                <div style={{display:"flex",gap:5}}>
                  <button
                    style={{fontSize:11.5,padding:"3px 8px",border:`1px solid ${(decisions[i]||c.decision)==="master"?"var(--pos)":"var(--line)"}`,background:(decisions[i]||c.decision)==="master"?"var(--pos-soft)":"var(--white)",borderRadius:2,cursor:"pointer",color:(decisions[i]||c.decision)==="master"?"var(--pos)":"var(--muted)"}}
                    onClick={()=>setDecision(i,"master")}>Master</button>
                  {c.risk!=="high" && <button
                    style={{fontSize:11.5,padding:"3px 8px",border:`1px solid ${(decisions[i]||c.decision)==="secondary"?"var(--accent-2)":"var(--line)"}`,background:(decisions[i]||c.decision)==="secondary"?"var(--accent-soft)":"var(--white)",borderRadius:2,cursor:"pointer",color:(decisions[i]||c.decision)==="secondary"?"var(--accent-2)":"var(--muted)"}}
                    onClick={()=>setDecision(i,"secondary")}>Secondary</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────── Impact preview ─────────── */

function ImpactPreview({ type }){
  const items = type==="Account" ? [
    { l:"Contacts reassigned to master",        v:4, icon:"CO", c:"var(--info)"     },
    { l:"Opportunities reassigned to master",   v:2, icon:"OP", c:"var(--accent-2)" },
    { l:"Activities retained on master",        v:6, icon:"AT", c:"var(--muted)"    },
    { l:"Approval requests preserved",          v:1, icon:"AP", c:"var(--warn)"     },
    { l:"Reporting projections refreshed",      v:3, icon:"RE", c:"var(--muted)"    },
    { l:"Secondary record archived",            v:1, icon:"AR", c:"var(--neg)"      },
  ] : [
    { l:"Primary contact role reassigned",      v:1, icon:"CO", c:"var(--info)"     },
    { l:"Linked opportunities updated",         v:2, icon:"OP", c:"var(--accent-2)" },
    { l:"Activities retained on master",        v:3, icon:"AT", c:"var(--muted)"    },
    { l:"Secondary record archived",            v:1, icon:"AR", c:"var(--neg)"      },
  ];
  return (
    <div className="panel" style={{marginBottom:12}}>
      <div className="panel-head"><div className="panel-title">Merge impact preview</div><div className="panel-actions"><span style={{fontSize:11.5,color:"var(--muted)"}}>These changes are permanent and audited</span></div></div>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${type==="Account"?3:4},1fr)`,padding:"12px 14px",gap:10}}>
        {items.map((item,i)=>(
          <div key={i} style={{padding:"10px 12px",background:"var(--paper-2)",border:"1px solid var(--hairline)",display:"flex",flexDirection:"column",gap:4}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:10,fontFamily:'"JetBrains Mono",monospace',fontWeight:700,background:"var(--white)",border:"1px solid var(--line)",padding:"1px 4px",borderRadius:2,color:"var(--muted-2)"}}>{item.icon}</span>
              <span style={{fontSize:10.5,color:"var(--muted)",lineHeight:1.3}}>{item.l}</span>
            </div>
            <span className="mono" style={{fontSize:20,fontWeight:700,color:item.c}}>{item.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Merge actions ─────────── */

function MergeActions({ cand, master, onMerge, onReject, merged }){
  const [reason, setReason]   = useState("");
  const [touched, setTouched] = useState(false);
  const empty = reason.trim().length < 10;
  const err   = touched && empty;
  const TEMPLATES = ["Same customer — manual + CSV import duplicate","Confirmed by account owner","Name abbreviation — same legal entity"];

  if(merged) return (
    <div className="panel" style={{background:"var(--pos-soft)",border:"1px solid #B2C8A8"}}>
      <div style={{padding:"16px 18px",display:"flex",alignItems:"flex-start",gap:14}}>
        <span style={{fontSize:28,color:"var(--pos)",lineHeight:1}}>✓</span>
        <div>
          <div style={{fontWeight:600,fontSize:14,color:"var(--pos)",marginBottom:3}}>Merge completed — {cand.id}</div>
          <div style={{fontSize:12.5,color:"var(--ink-2)",lineHeight:1.6}}>
            {cand.b.id} ({cand.b.name}) has been merged into {cand.a.id} ({cand.a.name}) as master.
            All linked records reassigned. Secondary record archived. Audit event written.
          </div>
          <div className="mono" style={{fontSize:11,color:"var(--muted)",marginTop:4}}>Decision is immutable · audit trail updated · reporting refresh queued</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="panel" style={{marginBottom:12}}>
      <div className="panel-head">
        <div className="panel-title">Merge decision <span style={{fontSize:10,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".1em",textTransform:"uppercase",color:"var(--accent-2)",background:"var(--warn-soft)",border:"1px solid #D9BFA0",padding:"1px 6px",borderRadius:2,fontWeight:400}}>REASON REQ'D</span></div>
      </div>
      <div style={{padding:"12px 14px",borderBottom:"1px solid var(--hairline)"}}>
        <label style={{fontSize:11,color:"var(--muted)",fontWeight:500,display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span>Merge reason <span style={{color:"var(--accent-2)",fontFamily:'"JetBrains Mono",monospace',fontSize:10}}>*</span></span>
          <span className="mono" style={{fontSize:10,color:"var(--muted)"}}>{reason.length} chars · min 10</span>
        </label>
        <div style={{border:err?"1px solid var(--neg)":"1px solid var(--line)",borderRadius:3,background:"var(--white)"}}>
          <textarea style={{border:0,outline:"none",padding:"8px 10px",font:"inherit",fontSize:12.5,color:"var(--ink)",resize:"vertical",minHeight:70,lineHeight:1.5,background:"transparent",width:"100%",display:"block"}}
            value={reason} onChange={e=>setReason(e.target.value)} onBlur={()=>setTouched(true)}
            placeholder="e.g. Same customer account — created manually then imported via CSV open_opportunities_q3.csv" />
        </div>
        {err && <div style={{fontSize:11.5,color:"var(--neg)",marginTop:4,display:"flex",alignItems:"center",gap:5}}><span style={{width:14,height:14,border:"1.5px solid var(--neg)",borderRadius:"50%",display:"grid",placeItems:"center",fontSize:8,fontWeight:700}}>!</span>Reason required (min 10 chars) — merge decisions are audit-logged.</div>}
        <div style={{marginTop:7,display:"flex",gap:5,flexWrap:"wrap"}}>
          {TEMPLATES.map((t,i)=>(
            <span key={i} onClick={()=>{ setReason(r=>r?r+" · "+t:t); setTouched(true); }}
              style={{fontSize:11,padding:"3px 8px",border:"1px solid var(--line-2)",background:"var(--paper-2)",borderRadius:14,color:"var(--ink-2)",cursor:"pointer"}}>+ {t}</span>
          ))}
        </div>
      </div>
      <div style={{padding:"12px 14px",display:"flex",gap:8,alignItems:"center"}}>
        <button className={`btn btn-sm ${!empty?"btn-primary":"btn-disabled"}`} aria-disabled={empty}
          onClick={()=>{ setTouched(true); if(!empty) onMerge(reason); }}>
          Merge records →
        </button>
        <button className="btn btn-neg btn-sm" onClick={onReject}>Reject as false positive</button>
        <button className="btn btn-ghost btn-sm" style={{marginLeft:"auto"}}>Skip</button>
      </div>
    </div>
  );
}

/* ─────────── Audit preview ─────────── */

function AuditPreview({ cand, merged, reason, master }){
  const now = new Date().toISOString().replace("T"," ").slice(0,16);
  const events = merged ? [
    { t:now,                   who:"Irina Volkova", icon:"✓", c:"var(--pos)",  desc:`Merge committed — ${cand.id} · master ${cand[master].id} (${cand[master].name}) · secondary archived` },
    { t:now,                   who:"System",        icon:"R", c:"var(--info)", desc:`Reporting projections queued for refresh · 3 projections affected` },
    { t:"2026-05-17 08:12",    who:"System",        icon:"D", c:"var(--warn)", desc:`Duplicate candidate ${cand.id} generated · score ${cand.score} · sources manual + IMP-0239` },
  ] : [
    { t:"2026-05-17 08:12",    who:"System",        icon:"D", c:"var(--warn)", desc:`Duplicate candidate ${cand.id} generated · score ${cand.score} · sources manual + ${cand.source}` },
    { t:"2026-05-17 07:50",    who:"I. Volkova",    icon:"→", c:"var(--muted)",desc:"Review queue opened · 24 candidates pending" },
  ];
  return (
    <div className="panel">
      <div className="panel-head"><div className="panel-title">Audit preview {merged&&<Pill kind="approved">Post-merge</Pill>}</div></div>
      <div style={{padding:"6px 14px 12px"}}>
        {events.map((e,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"72px 18px 1fr",gap:"0 8px",padding:"8px 0",borderBottom:i<events.length-1?"1px dashed var(--hairline)":"none",alignItems:"start"}}>
            <div className="mono" style={{fontSize:10.5,color:"var(--muted)",lineHeight:1.35}}>{e.t.slice(11)}<div style={{fontSize:10,color:"var(--muted-2)"}}>{e.t.slice(0,10)}</div></div>
            <div style={{width:18,height:18,borderRadius:"50%",background:"var(--paper-2)",border:"1px solid var(--line)",display:"grid",placeItems:"center",fontSize:9,fontWeight:700,fontFamily:'"JetBrains Mono",monospace',color:e.c,marginTop:1}}>{e.icon}</div>
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

/* ─────────── Reject modal ─────────── */

function RejectModal({ cand, onClose, onConfirm }){
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const empty = reason.trim().length < 5;
  useEffect(()=>{ const h=e=>{if(e.key==="Escape")onClose();}; document.addEventListener("keydown",h); return()=>document.removeEventListener("keydown",h); },[onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog">
        <div className="modal-card" style={{width:480}}>
          <div style={{padding:"13px 18px",borderBottom:"1px solid var(--hairline)",background:"var(--paper-2)",display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"var(--info-soft)",border:"1.5px solid var(--info)",display:"grid",placeItems:"center",color:"var(--info)",fontSize:14,flexShrink:0}}>✕</div>
            <div>
              <h3 style={{margin:0,fontSize:14.5,fontWeight:600}}>Reject as false positive</h3>
              <p style={{margin:"2px 0 0",fontSize:12,color:"var(--muted)"}}>{cand.id} · {cand.a.name} vs {cand.b.name}</p>
            </div>
          </div>
          <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:12.5,color:"var(--ink-2)",lineHeight:1.55}}>Rejecting this candidate marks it as a false positive. The two records will remain separate. This decision is audit-logged and can be reviewed in the audit trail.</div>
            <div>
              <label style={{fontSize:11,color:"var(--muted)",fontWeight:500,display:"block",marginBottom:5}}>Reason <span style={{color:"var(--accent-2)",fontFamily:'"JetBrains Mono",monospace',fontSize:10}}>*</span></label>
              <div style={{border:touched&&empty?"1px solid var(--neg)":"1px solid var(--line)",borderRadius:3,background:"var(--white)"}}>
                <textarea style={{border:0,outline:"none",padding:"8px 10px",font:"inherit",fontSize:13,color:"var(--ink)",resize:"vertical",minHeight:70,lineHeight:1.5,background:"transparent",width:"100%",display:"block"}}
                  value={reason} onChange={e=>setReason(e.target.value)} onBlur={()=>setTouched(true)}
                  placeholder="e.g. Verified with account owner — different legal entities in different cities" />
              </div>
              {touched&&empty&&<div style={{fontSize:11.5,color:"var(--neg)",marginTop:4}}>Reason required for audit trail</div>}
            </div>
          </div>
          <div style={{padding:"11px 18px",borderTop:"1px solid var(--hairline)",background:"var(--paper-2)",display:"flex",justifyContent:"space-between"}}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-sm" style={{background:"var(--info)",color:"var(--paper)",borderColor:"var(--info)"}}
              onClick={()=>{ setTouched(true); if(!empty) onConfirm(reason); }}>Confirm false positive</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── App ─────────── */

function App(){
  const [selectedId,   setSelectedId]   = useState("DUP-2042");
  const [activeView,   setActiveView]   = useState("All Open");
  const [master,       setMaster]       = useState("a");
  const [decisions,    setDecisions]    = useState({});
  const [mergeReason,  setMergeReason]  = useState("");
  const [merged,       setMerged]       = useState(false);
  const [showReject,   setShowReject]   = useState(false);
  const [toast,        setToast]        = useState(null);

  const cand = CANDIDATES.find(c=>c.id===selectedId);
  const isAccount = cand?.type==="Account";
  const fields = isAccount ? ACCOUNT_FIELDS : CONTACT_FIELDS;
  const conflicts = isAccount ? CONFLICTS_ACCOUNT : CONFLICTS_ACCOUNT.slice(0,2);

  // Reset state when candidate changes
  useEffect(()=>{ setMaster("a"); setDecisions({}); setMerged(false); setMergeReason(""); }, [selectedId]);

  function flash(msg){ setToast(msg); setTimeout(()=>setToast(null),2800); }

  function setDecision(i, d){
    setDecisions(prev=>({...prev,[i]:d}));
  }

  function onMerge(reason){
    setMergeReason(reason);
    setMerged(true);
    flash(`✓ ${cand.id} merged — ${cand[master==="a"?"a":"b"].name} is master · ${cand[master==="a"?"b":"a"].name} archived`);
  }

  function onRejectConfirm(reason){
    setShowReject(false);
    flash(`${cand.id} rejected as false positive · reason recorded`);
  }

  return (
    <div className="app" data-screen-label="11 Duplicate Review Merge">
      <Sidebar />
      <div className="main">
        <TopBar selectedId={selectedId} />
        <div className="content">
          <KPIStrip />
          <div className="dup-grid">
            {/* Queue — left sticky */}
            <Queue candidates={CANDIDATES} selectedId={selectedId} onSelect={id=>{setSelectedId(id);}} activeView={activeView} setActiveView={setActiveView} />
            {/* Comparison — right scrollable */}
            <div style={{minWidth:0,display:"flex",flexDirection:"column",gap:0}}>
              {cand && <>
                <MatchHeader cand={cand} />
                <SideBySide cand={cand} master={master} fields={fields} />
                {conflicts.length>0 && <ConflictTable conflicts={conflicts} decisions={decisions} setDecision={setDecision} />}
                <MasterSelector cand={cand} master={master} setMaster={setMaster} />
                <ImpactPreview type={cand.type} />
                <div style={{height:12}} />
                <MergeActions cand={cand} master={master} onMerge={onMerge} onReject={()=>setShowReject(true)} merged={merged} />
                <div style={{height:12}} />
                <AuditPreview cand={cand} merged={merged} reason={mergeReason} master={master} />
              </>}
            </div>
          </div>
          <div className="foot-ruler">
            <span>SALES OPS CRM · ORION INDUSTRIAL · LOCAL PILOT</span>
            <span>USER OPS · IV · DUPLICATE REVIEW</span>
            <span>24 CANDIDATES OPEN · 6 MERGES THIS WEEK</span>
          </div>
        </div>
      </div>
      {showReject && cand && <RejectModal cand={cand} onClose={()=>setShowReject(false)} onConfirm={onRejectConfirm} />}
      {toast && <div className="toast"><span className="ok">✓</span>{toast}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
