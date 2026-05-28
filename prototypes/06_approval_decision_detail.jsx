/* eslint-disable */
const { useState, useEffect, useRef } = React;

/* ─────────── Static data ─────────── */

const MODULES = [
  { key:"dashboard",  code:"DA", label:"Dashboard",       section:"workspace" },
  { key:"accounts",   code:"AC", label:"Accounts",        section:"workspace" },
  { key:"opps",       code:"OP", label:"Opportunities",   section:"workspace" },
  { key:"approvals",  code:"AP", label:"Approvals",       section:"governance" },
  { key:"audit",      code:"AU", label:"Audit",           section:"insights" },
  { key:"contacts",   code:"CO", label:"Contacts",        section:"workspace", disabled:true },
  { key:"imports",    code:"IM", label:"Imports",         section:"data",      disabled:true },
  { key:"duplicates", code:"DU", label:"Duplicates",      section:"data",      disabled:true },
  { key:"metadata",   code:"MA", label:"Metadata Admin",  section:"data",      disabled:true },
  { key:"reports",    code:"RE", label:"Reports",         section:"insights",  disabled:true },
];
const SECTIONS = [
  { key:"workspace",  label:"Workspace",       index:"01" },
  { key:"governance", label:"Governance",      index:"02" },
  { key:"data",       label:"Data & Quality",  index:"03" },
  { key:"insights",   label:"Insights",        index:"04" },
];
const APPROVERS = {
  fin: { name:"Daria Smirnova", role:"Finance Approver",  initials:"DS", color:"bg-a", roleCode:"FIN" },
  leg: { name:"Oleg Markov",    role:"Legal Approver",    initials:"OM", color:"bg-d", roleCode:"LEG" },
};

const REQ = {
  id:"REQ-1182", type:"Discount Exception", kind:"discount",
  opp:{ id:"OPP-2418", title:"Q3 Equipment Renewal" },
  account:{ name:"Acme Manufacturing", id:"AC-3318" },
  contact:{ name:"Taylor Brooks", title:"VP Operations" },
  rep:{ name:"Anna Petrova", initials:"AP", color:"bg-c" },
  submittedAt:"2026-05-15 09:14",
  age:"2d 04h",
  sla:{ pct:84, label:"23h left", state:"warn", total:"48h chain", deadline:"2026-05-16 09:15" },
  priority:"normal",
  snap:{
    amount:145000,
    stage:"Proposal", close:"2026-06-28",
    discCurrent:"4%", discRequested:"8%",
    terms:"NET-45 requested",
    region:"DACH-North", risk:"Medium",
    implWindow:"Q3 2026",
    procurement:"Direct · single-approver",
    legalEntity:"ORN-DE-001",
  },
  justification:"Strategic renewal account with 5-year tenure at Orion Industrial. Competitor (Sigma Castings, DACH-North incumbent) approached customer with an aggressive 9% rebate on functionally equivalent equipment. The 8% discount is the minimum required to preserve the account relationship and protect a FY26 service uplift valued at $38K attached to this renewal contract. Margin floor is maintained at the requested discount level for this account tier.",
  competitive:"Sigma Castings (DACH-North incumbent) offered 9% flat-rate discount with NET-30 terms. Customer VP Operations verbally confirmed the competitor approach on 2026-05-13. Competitor offer letter on file as competitor_offer_summary.xlsx.",
  customerImpact:"Account represents $420K ARR across service and hardware. Loss of renewal would trigger service contract cancellation in Q4 2026. Customer has expansion potential in Baltic region — pipeline OPP-2501 currently at Discovery stage.",
  supportingNotes:"Taylor Brooks (VP Ops) verbally committed to sign upon finance approval. Close date 2026-06-28 is firm — customer procurement cycle closes end of month. No further price negotiation is expected.",
  policyReason:"Requested discount (8%) exceeds the standard policy threshold of 6% for the $100K–$250K amount band. This triggers Discount Governance v18, requiring sequential Finance then Legal review before the exception can be applied.",
  attachments:[
    { name:"competitor_offer_summary.xlsx", size:"44 KB",  by:"A. Petrova", date:"2026-05-14" },
    { name:"acme_account_history_5yr.pdf",  size:"218 KB", by:"A. Petrova", date:"2026-05-15" },
  ],
  baseActivity:[
    { t:"2026-05-15 09:14", who:"Anna Petrova", type:"submit",  initials:"AP", color:"bg-c",
      title:"Request submitted",
      desc:"Snapshot frozen: amount $145,000, stage Proposal, discount 4% → 8%. Routed by policy engine to Discount Governance v18 chain." },
    { t:"2026-05-15 09:14", who:"System",       type:"policy",  initials:"SY", color:"bg-f",
      title:"Policy resolved — Discount Governance v18",
      desc:"Trigger: discount > 6%. Amount band $100K–$250K. Required chain: Finance Approver (D. Smirnova) → Legal Approver (O. Markov). SLA: 24h Finance, 48h total." },
    { t:"2026-05-15 09:15", who:"System",       type:"route",   initials:"SY", color:"bg-f",
      title:"Finance review opened · step 02",
      desc:"Step activated for D. Smirnova. SLA clock started — Finance deadline: 2026-05-16 09:15." },
  ],
};

/* ─────────── Helpers ─────────── */

function fmtMoney(n){
  if(n>=1_000_000) return `$${(n/1_000_000).toFixed(2)}M`;
  if(n>=1_000) return `$${(n/1_000).toFixed(0)}K`;
  return `$${n}`;
}

function Pill({ kind, children }){
  return <span className={`pill p-${kind}`}><span className="pdot"></span>{children}</span>;
}

function SLABar({ data, width }){
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div className="sla-bar" style={{width:width||100}}>
        <div className={`fill ${data.state}`} style={{width:Math.min(100,data.pct)+"%"}} />
      </div>
      <span className={`sla-text mono ${data.state}`}>{data.label}</span>
    </div>
  );
}

/* ─────────── App shell ─────────── */

function BrandMark(){ return <span className="brand-mark" aria-hidden />; }

function Sidebar({ user }){
  const counts = { approvals:user.roleCode==="FIN"?9:4, opps:46, accounts:412 };
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
                  <div key={m.key}
                    className={`nav-item ${m.key==="approvals"?"active":""} ${m.disabled?"disabled":""}`}
                    title={m.disabled?`${m.label} — not visible to ${user.role}`:m.label}
                  >
                    <span className="nav-mark mono">{m.code}</span>
                    <span className="nav-label">{m.label}</span>
                    <span className={`nav-count mono ${alert?"alert":""}`}>{c!=null&&c>0?c:""}</span>
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

function TopBar({ user }){
  return (
    <div className="topbar">
      <div className="crumb">
        <span className="pulse"><span className="pulse-dot" /> LOCAL PILOT</span>
        <span>Approvals</span>
        <span className="sep">/</span>
        <span>{user.roleCode==="FIN"?"Finance inbox":"Legal inbox"}</span>
        <span className="sep">/</span>
        <strong>{REQ.id}</strong>
        <span className="sep">·</span>
        <span style={{color:"var(--muted)"}}>Request detail</span>
      </div>
      <label className="search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="m11 11 3.5 3.5"/></svg>
        <input placeholder="Search requests, opportunities, accounts…" />
        <kbd>⌘K</kbd>
      </label>
      <div className="top-actions">
        <button className="icon-btn" aria-label="Notifications">
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

/* ─────────── Scenario bar ─────────── */

function ScenarioBar({ scenario, setScenario }){
  const opts = [
    { key:"active",       label:"Finance · Pending decision" },
    { key:"decided",      label:"Finance · Already decided"  },
    { key:"legal-locked", label:"Legal · Step locked"        },
  ];
  return (
    <div style={{display:"flex",alignItems:"center",gap:0,background:"var(--paper-2)",border:"1px solid var(--line-2)",borderRadius:18,padding:3,width:"fit-content",marginBottom:14}}>
      <span className="mono" style={{fontSize:9.5,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)",padding:"0 10px 0 6px",borderRight:"1px solid var(--line-2)",height:24,display:"inline-flex",alignItems:"center"}}>Scenario</span>
      {opts.map(o=>(
        <button key={o.key}
          className={`scenario-opt ${scenario===o.key?"on":""}`}
          onClick={()=>setScenario(o.key)}
        >{o.label}</button>
      ))}
    </div>
  );
}

/* ─────────── Request header ─────────── */

function RequestHeader({ scenario, user, onDecide }){
  const isDecided = scenario==="decided";
  const isLocked  = scenario==="legal-locked";
  return (
    <div className="panel req-header">
      {/* nav row */}
      <div className="req-header-nav">
        <button className="btn btn-ghost btn-sm" style={{gap:5}}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7.5 2 3 6l4.5 4"/></svg>
          Back to inbox
        </button>
        <span style={{color:"var(--line-2)"}}>·</span>
        <button className="btn btn-ghost btn-sm">Copy link</button>
        <span style={{color:"var(--line-2)"}}>·</span>
        <button className="btn btn-ghost btn-sm">View opportunity snapshot ›</button>
        <span style={{flex:1}} />
        <span className="mono" style={{fontSize:10,letterSpacing:".06em",color:"var(--muted-2)"}}>
          Policy: Discount Governance v18 · SLA {REQ.sla.total}
        </span>
      </div>
      {/* main body */}
      <div className="req-header-body">
        <div style={{flex:1,minWidth:0}}>
          {/* id + type + status row */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            <span className="mono" style={{fontSize:11.5,color:"var(--muted)",letterSpacing:".06em"}}>{REQ.id}</span>
            <span className="kind-tag discount mono">{REQ.type}</span>
            <span className="mono" style={{fontSize:10,color:"var(--muted-2)",background:"var(--paper-2)",border:"1px solid var(--hairline)",padding:"1px 6px",borderRadius:2,letterSpacing:".06em"}}>STEP 02 · FINANCE</span>
            {isDecided
              ? <Pill kind="approved">Finance approved</Pill>
              : isLocked
              ? <Pill kind="locked">Locked · awaiting Finance</Pill>
              : <Pill kind="pending">Pending Finance Approval</Pill>
            }
          </div>
          {/* title */}
          <h1 style={{margin:"0 0 7px",fontSize:20,fontWeight:600,letterSpacing:"-.015em",lineHeight:1.2}}>{REQ.opp.title}</h1>
          {/* meta row */}
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",fontSize:12.5,color:"var(--muted)",marginBottom:10}}>
            <span className="mono" style={{color:"var(--ink-2)"}}>{REQ.opp.id}</span>
            <span style={{color:"var(--line-2)"}}>·</span>
            <span style={{color:"var(--ink)",fontWeight:500}}>{REQ.account.name}</span>
            <span style={{color:"var(--line-2)"}}>·</span>
            <span>{REQ.contact.name}, {REQ.contact.title}</span>
            <span style={{color:"var(--line-2)"}}>·</span>
            <span>Submitted by <strong>{REQ.rep.name}</strong></span>
            <span style={{color:"var(--line-2)"}}>·</span>
            <span className="mono" style={{fontSize:11.5,color:"var(--muted)"}}>{REQ.submittedAt}</span>
            <span style={{color:"var(--line-2)"}}>·</span>
            <span className="mono" style={{fontSize:11.5,color:"var(--muted)"}}>{REQ.age} in review</span>
          </div>
          {/* SLA + step + amount strip */}
          <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",fontSize:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span className="mono" style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)"}}>SLA</span>
              <SLABar data={REQ.sla} width={116} />
              <span className="mono" style={{fontSize:11,color:"var(--muted)"}}>{REQ.sla.total}</span>
            </div>
            <div style={{width:1,height:14,background:"var(--line-2)"}} />
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span className="mono" style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)"}}>Step</span>
              <span style={{fontWeight:500}}>Finance Review</span>
              <span style={{color:"var(--muted)"}}>→</span>
              <span style={{color:"var(--muted)"}}>Legal · O. Markov</span>
            </div>
            <div style={{width:1,height:14,background:"var(--line-2)"}} />
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span className="mono" style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)"}}>Amount</span>
              <span className="mono" style={{fontWeight:600,fontSize:14}}>{fmtMoney(REQ.snap.amount)}</span>
            </div>
            <div style={{width:1,height:14,background:"var(--line-2)"}} />
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span className="mono" style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"var(--muted)"}}>Requested</span>
              <span className="mono" style={{textDecoration:"line-through",color:"var(--muted)"}}>{REQ.snap.discCurrent}</span>
              <span style={{color:"var(--muted)"}}>→</span>
              <span className="mono" style={{fontWeight:700,color:"var(--accent-2)"}}>{REQ.snap.discRequested}</span>
              <span style={{color:"var(--muted)"}}>discount</span>
            </div>
          </div>
        </div>
        {/* right: primary actions or state badge */}
        <div style={{flexShrink:0}}>
          {isDecided ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,background:"var(--pos-soft)",border:"1px solid #B2C8A8",padding:"14px 18px",textAlign:"center",minWidth:130}}>
              <span style={{fontSize:22,color:"var(--pos)"}}>✓</span>
              <span style={{fontSize:12.5,fontWeight:600,color:"var(--pos)"}}>Finance Approved</span>
              <span style={{fontSize:11,color:"var(--muted)"}}>Decision immutable</span>
            </div>
          ) : isLocked ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,background:"var(--paper-2)",border:"1px solid var(--line-2)",padding:"14px 18px",textAlign:"center",minWidth:130}}>
              <span style={{fontSize:22,color:"var(--muted)"}}>🔒</span>
              <span style={{fontSize:12.5,fontWeight:500,color:"var(--muted)"}}>Step Locked</span>
              <span style={{fontSize:11,color:"var(--muted)",maxWidth:110,lineHeight:1.4}}>Finance must approve first</span>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <button className="btn btn-pos btn-lg" style={{justifyContent:"center",minWidth:148}} onClick={()=>onDecide("approve")}>✓ Approve</button>
              <button className="btn btn-info btn-lg" style={{justifyContent:"center"}} onClick={()=>onDecide("sendback")}>↩ Send Back</button>
              <button className="btn btn-neg btn-lg" style={{justifyContent:"center"}} onClick={()=>onDecide("reject")}>✕ Reject</button>
              <div style={{fontSize:10.5,color:"var(--muted)",textAlign:"center",fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em"}}>COMMENT REQUIRED</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Access boundary box ─────────── */

function AccessBox({ user }){
  const isFin = user.roleCode==="FIN";
  return (
    <div className="accbox">
      <div className="mk mono">i</div>
      <div>
        <div className="t">Approval context only — you are not editing the opportunity</div>
        <div className="s">
          {isFin
            ? <>You see only deal context relevant to this approval decision. The underlying opportunity is owned by <strong>Anna Petrova</strong> and remains unmodified. You can decide the <strong>Finance step only (step 02)</strong>. The Legal step is handled by <span className="mono">O. Markov</span> after Finance completes.</>
            : <>You see only deal context relevant to this approval decision. <strong>Finance (D. Smirnova)</strong> must approve before Legal can decide — Finance has not yet approved. This step is locked for you until the Finance step closes.</>
          }
        </div>
      </div>
    </div>
  );
}

/* ─────────── Deal snapshot ─────────── */

function DealSnapshot(){
  const s = REQ.snap;
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          Deal Snapshot
          <span style={{
            fontSize:10,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".1em",textTransform:"uppercase",
            color:"var(--accent-2)",background:"var(--warn-soft)",border:"1px solid #D9BFA0",padding:"1px 7px",borderRadius:2,fontWeight:400
          }}>FROZEN AT SUBMISSION</span>
        </div>
        <div className="panel-actions">
          <span style={{fontSize:11.5,color:"var(--muted)"}}>Snapshot · not live CRM data · read-only</span>
        </div>
      </div>
      <div className="snapshot-grid">
        {/* row 1 */}
        <div className="snap-cell">
          <div className="snap-label">Opportunity amount</div>
          <div className="snap-value mono" style={{fontSize:16,fontWeight:600}}>{fmtMoney(s.amount)}</div>
        </div>
        <div className="snap-cell">
          <div className="snap-label">Stage at submit</div>
          <div className="snap-value"><Pill kind="pending">{s.stage}</Pill></div>
        </div>
        {/* row 2 */}
        <div className="snap-cell">
          <div className="snap-label">Close date</div>
          <div className="snap-value mono">{s.close}</div>
        </div>
        <div className="snap-cell">
          <div className="snap-label">Sales owner</div>
          <div className="snap-value">
            <span className={`avatar ${REQ.rep.color}`} style={{width:18,height:18,fontSize:8,borderRadius:"50%",flexShrink:0}}>{REQ.rep.initials}</span>
            {REQ.rep.name}
          </div>
        </div>
        {/* row 3 — discount span 2 */}
        <div className="snap-cell" style={{gridColumn:"span 2"}}>
          <div className="snap-label">Discount (current → requested)</div>
          <div className="snap-value">
            <span className="mono" style={{textDecoration:"line-through",color:"var(--muted)",fontSize:14}}>{s.discCurrent}</span>
            <span style={{color:"var(--line-2)",margin:"0 6px",fontSize:16}}>→</span>
            <span className="mono" style={{fontWeight:700,color:"var(--accent-2)",fontSize:16}}>{s.discRequested}</span>
            <span style={{fontSize:12,color:"var(--muted)"}}>requested · +4pp above current</span>
          </div>
        </div>
        {/* row 4 */}
        <div className="snap-cell">
          <div className="snap-label">Payment terms</div>
          <div className="snap-value mono">{s.terms}</div>
        </div>
        <div className="snap-cell">
          <div className="snap-label">Region</div>
          <div className="snap-value mono">{s.region}</div>
        </div>
        {/* row 5 */}
        <div className="snap-cell">
          <div className="snap-label">Payment risk level <span className="ctxchip mono">POLICY FIELD</span></div>
          <div className="snap-value">
            <Pill kind="pending">{s.risk}</Pill>
          </div>
        </div>
        <div className="snap-cell">
          <div className="snap-label">Implementation window <span className="ctxchip mono">POLICY FIELD</span></div>
          <div className="snap-value mono">{s.implWindow}</div>
        </div>
        {/* row 6 */}
        <div className="snap-cell">
          <div className="snap-label">Procurement process <span className="ctxchip mono">POLICY FIELD</span></div>
          <div className="snap-value">{s.procurement}</div>
        </div>
        <div className="snap-cell">
          <div className="snap-label">Legal entity code <span className="ctxchip mono">POLICY FIELD</span></div>
          <div className="snap-value mono">{s.legalEntity}</div>
        </div>
        {/* row 7 */}
        <div className="snap-cell">
          <div className="snap-label">Account</div>
          <div className="snap-value"><strong>{REQ.account.name}</strong> <small style={{color:"var(--muted)",fontWeight:400}}>· {REQ.account.id}</small></div>
        </div>
        <div className="snap-cell">
          <div className="snap-label">Primary contact</div>
          <div className="snap-value">{REQ.contact.name} <small style={{color:"var(--muted)"}}>· {REQ.contact.title}</small></div>
        </div>
      </div>
    </section>
  );
}

/* ─────────── Request details ─────────── */

function RequestDetails(){
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">Request Details</div>
        <div className="panel-actions">
          <span className="mono" style={{fontSize:10.5,color:"var(--muted-2)",letterSpacing:".04em"}}>{REQ.id} · {REQ.type}</span>
        </div>
      </div>
      <div>
        <div className="detail-block">
          <div className="detail-block-title">
            Business justification
            <span className="mono" style={{fontSize:10,color:"var(--muted-2)",letterSpacing:".06em",fontWeight:400}}>· {REQ.rep.name} · frozen at submit</span>
          </div>
          <div className="just-body">{REQ.justification}</div>
        </div>
        <div className="detail-block">
          <div className="detail-block-title">Competitive situation</div>
          <div className="just-body" style={{borderLeft:"2px solid var(--accent)",background:"var(--accent-soft)"}}>{REQ.competitive}</div>
        </div>
        <div className="detail-block">
          <div className="detail-block-title">Customer impact</div>
          <div className="just-body">{REQ.customerImpact}</div>
        </div>
        <div className="detail-block">
          <div className="detail-block-title">Supporting notes</div>
          <div className="just-body">{REQ.supportingNotes}</div>
        </div>
        <div className="detail-block">
          <div className="detail-block-title">Policy reason</div>
          <div className="just-body" style={{borderLeft:"2px solid var(--line-2)",color:"var(--ink-2)"}}>{REQ.policyReason}</div>
        </div>
        <div className="detail-block" style={{borderBottom:0}}>
          <div className="detail-block-title">
            Attachments
            <em style={{fontStyle:"normal",fontFamily:'"JetBrains Mono",monospace',fontSize:11,color:"var(--muted)",fontWeight:400}}>· {REQ.attachments.length} files</em>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {REQ.attachments.map((a,i)=>(
              <div key={i} className="attach-row">
                <svg width="13" height="14" viewBox="0 0 13 14" fill="none" stroke="currentColor" strokeWidth="1.4" style={{flexShrink:0,color:"var(--muted)"}}><rect x="1.5" y="1" width="9" height="12" rx="1"/><path d="M3.5 4.5h5M3.5 7h5M3.5 9.5h3"/></svg>
                <span className="mono" style={{fontSize:12,flex:1}}>{a.name}</span>
                <span style={{fontSize:11,color:"var(--muted)"}}>{a.size}</span>
                <span style={{fontSize:11,color:"var(--muted)"}}>· by {a.by}</span>
                <span style={{fontSize:11,color:"var(--muted)"}}>· {a.date}</span>
                <button className="btn btn-ghost btn-sm" style={{marginLeft:4}}>Download</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────── Policy and approval chain ─────────── */

function PolicyChain({ scenario }){
  const finDone  = scenario==="decided" || scenario==="legal-locked";
  const legActive= scenario==="legal-locked";

  const steps = [
    { n:"01", label:"Submitted",
      who:REQ.rep.name, role:"Sales Rep", when:"2026-05-15 09:14",
      cls:"done", badge:"Done" },
    { n:"02", label:"Finance Review",
      who:"Daria Smirnova", role:"Finance Approver",
      when: finDone ? "Approved · 2026-05-16 14:22" : "In review · 23h SLA remaining",
      cls: finDone?"done":"cur", badge: finDone?"Done":"In review",
      yours: scenario==="active" },
    { n:"03", label:"Legal Review",
      who:"Oleg Markov", role:"Legal Approver",
      when: legActive?"In review · SLA 21h remaining": finDone?"Pending assignment":"Waiting for Finance",
      cls: legActive?"cur": finDone?"fut":"lock",
      badge: legActive?"In review": finDone?"Pending":"Locked",
      locked: !legActive && !finDone,
      yours: legActive },
    { n:"04", label:"Final Decision",
      who:"System", role:"Auto-applied to opportunity",
      when:"After Legal approves",
      cls:"fut", badge:"Auto" },
  ];

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">Policy &amp; Approval Chain</div>
        <div className="panel-actions">
          <span className="mono" style={{fontSize:10.5,color:"var(--muted)"}}>Discount Governance v18</span>
        </div>
      </div>
      {/* policy meta */}
      <div style={{padding:"12px 14px",borderBottom:"1px solid var(--hairline)",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px 16px"}}>
        <div>
          <div className="snap-label">Policy name</div>
          <div style={{fontSize:12.5,fontWeight:500}}>Discount Governance v18</div>
        </div>
        <div>
          <div className="snap-label">Trigger</div>
          <div style={{fontSize:12.5}}>Discount &gt; 6%</div>
        </div>
        <div>
          <div className="snap-label">Amount band</div>
          <div className="mono" style={{fontSize:12.5}}>$100K – $250K</div>
        </div>
        <div style={{gridColumn:"span 2"}}>
          <div className="snap-label">Required chain</div>
          <div style={{fontSize:12.5}}>Finance Approver <span style={{color:"var(--muted)",margin:"0 5px"}}>→</span> Legal Approver</div>
        </div>
        <div>
          <div className="snap-label">Final outcome</div>
          <div style={{fontSize:12.5,color:"var(--muted)"}}>Auto-applied to opportunity</div>
        </div>
      </div>
      {/* chain timeline */}
      <div style={{padding:"12px 14px"}}>
        <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--muted)",marginBottom:10}}>Chain timeline</div>
        <div className="chain">
          {steps.map((s,i)=>(
            <div key={i} className={`chain-step ${s.cls}`}>
              <div className="chain-mk">{s.n}</div>
              <div>
                <div className="nm">
                  {s.label}
                  {s.yours && <Pill kind={s.cls==="cur"?"pending":"approved"}>your step</Pill>}
                  {s.locked && <Pill kind="locked">locked</Pill>}
                </div>
                <div className="who mono">{s.who} · {s.role}</div>
                <div className="who mono" style={{color:"var(--muted-2)"}}>{s.when}</div>
              </div>
              <span className="badge mono">{s.badge}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────── Audit history ─────────── */

function AuditTimeline({ extraEvents }){
  const events = [...REQ.baseActivity, ...extraEvents];
  const iconMap = { submit:"→", policy:"P", route:"W", approve:"✓", reject:"✕", sendback:"↩", view:"·" };
  const colorMap = {
    approve: { bg:"var(--pos-soft)",  border:"var(--pos)",  c:"var(--pos)"  },
    reject:  { bg:"var(--neg-soft)",  border:"var(--neg)",  c:"var(--neg)"  },
    sendback:{ bg:"var(--info-soft)", border:"var(--info)", c:"var(--info)" },
    submit:  { bg:"var(--paper-2)",   border:"var(--ink-2)",c:"var(--ink-2)"},
    policy:  { bg:"var(--warn-soft)", border:"var(--warn)", c:"var(--warn)" },
    route:   { bg:"var(--paper-2)",   border:"var(--line)",  c:"var(--muted)"},
    view:    { bg:"var(--paper-2)",   border:"var(--line)",  c:"var(--muted)"},
  };
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">Decision history <em>{events.length} events</em></div>
        <div className="panel-actions">
          <span style={{fontSize:11.5,color:"var(--muted)"}}>Immutable audit trail · append-only</span>
        </div>
      </div>
      <div style={{padding:"6px 14px 14px"}}>
        {events.map((e,i)=>{
          const col = colorMap[e.type] || colorMap.view;
          return (
            <div key={i} style={{
              display:"grid",gridTemplateColumns:"72px 22px 1fr",gap:"0 10px",
              padding:"10px 0",
              borderBottom: i<events.length-1 ? "1px dashed var(--hairline)" : "none",
              alignItems:"start",position:"relative"
            }}>
              {i<events.length-1 && (
                <div style={{position:"absolute",left:"82px",top:34,bottom:-10,width:1.5,background:"var(--line-2)",zIndex:0}} />
              )}
              <div className="mono" style={{fontSize:10.5,color:"var(--muted)",lineHeight:1.35,paddingTop:2}}>
                {e.t.slice(11)}
                <div style={{fontSize:10,color:"var(--muted-2)"}}>{e.t.slice(0,10)}</div>
              </div>
              <div style={{
                width:22,height:22,borderRadius:"50%",
                background:col.bg,border:`1.5px solid ${col.border}`,
                display:"grid",placeItems:"center",
                fontFamily:'"JetBrains Mono",monospace',fontSize:9,fontWeight:600,color:col.c,
                position:"relative",zIndex:1,flexShrink:0,marginTop:1,
              }}>{iconMap[e.type]||"·"}</div>
              <div>
                <div style={{fontSize:12.5,fontWeight:500,lineHeight:1.35}}>
                  {e.title}
                  <span className="mono" style={{fontSize:10,color:"var(--muted-2)",letterSpacing:".04em",marginLeft:6}}>· {e.who}</span>
                </div>
                <div style={{fontSize:11.5,color:"var(--muted)",marginTop:3,lineHeight:1.5}}>{e.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────── Decision panel (right col) ─────────── */

function DecisionPanel({ scenario, user, mode, setMode, onSubmit }){
  const [comment,  setComment]  = useState("");
  const [touched,  setTouched]  = useState(false);
  const [submitted, setSubmit]  = useState(false);
  const [doneKind, setDoneKind] = useState(null);

  const isDecided  = scenario==="decided" || submitted;
  const isLocked   = scenario==="legal-locked";
  const empty      = comment.trim().length < 10;
  const showErr    = touched && empty && !submitted;

  /* Reset local state when scenario switches */
  useEffect(()=>{
    setComment("");
    setTouched(false);
    setSubmit(false);
    setDoneKind(null);
    setMode(null);
  }, [scenario]);

  /* Reset comment when mode changes */
  useEffect(()=>{
    setComment("");
    setTouched(false);
  }, [mode]);

  const CONF = {
    approve:{
      color:"var(--pos)", bg:"var(--pos-soft)", border:"#B2C8A8",
      title:"Approve this request",
      desc:"Confirms Finance step approval. The request advances to Legal · O. Markov (step 03). Decision is audited and immutable.",
      btnCls:"btn-pos", btnLabel:"Confirm Approval",
      placeholder:"e.g. Within policy — competitor evidence on file. Discount preserves margin floor. Handed to Legal.",
      impact:{ kind:"info", label:"Next", text:"Request routed to Legal · O. Markov for step 03 review." },
      reasons:["Within policy · standard","Competitor pressure confirmed","Margin floor preserved","Strategic account — retention risk"],
    },
    reject:{
      color:"var(--neg)", bg:"var(--neg-soft)", border:"#D6B0A8",
      title:"Reject this request",
      desc:"Ends the approval chain. Opportunity returns to prior commercial baseline. Decision is immutable and audit-logged.",
      btnCls:"btn-neg", btnLabel:"Confirm Rejection",
      placeholder:"e.g. Discount exceeds policy band for this region and risk tier. Reduce to 6% and resubmit with stronger margin justification.",
      impact:{ kind:"neg", label:"Effect", text:"Opportunity returns to prior commercial baseline. Owner notified. Decision immutable." },
      reasons:["Discount exceeds policy band","Insufficient margin justification","Competitive pressure not substantiated","Risk level too high for this region"],
    },
    sendback:{
      color:"var(--info)", bg:"var(--info-soft)", border:"#A4C0C8",
      title:"Send back to owner",
      desc:"Returns the request to Anna Petrova with your comment. The request stays open — owner may revise and resubmit.",
      btnCls:"btn-info", btnLabel:"Send Back",
      placeholder:"e.g. Attach historic payment record and signed NDA. Strengthen justification with account growth trajectory before resubmitting.",
      impact:{ kind:"info", label:"Effect", text:"Returned to A. Petrova. SLA clock paused until resubmit." },
      reasons:["Justification too thin","Missing competitive evidence","Need payment history","Attach signed NDA first"],
    },
  };

  function handleSubmit(){
    setTouched(true);
    if(empty) return;
    setDoneKind(mode);
    setSubmit(true);
    onSubmit(mode, comment);
  }

  /* ── Locked ── */
  if(isLocked){
    return (
      <div className="panel decision-panel">
        <div className="panel-head">
          <div className="panel-title">Decision · Step 03 · Legal</div>
          <Pill kind="locked">Locked</Pill>
        </div>
        <div style={{padding:"20px 16px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <div style={{width:46,height:46,borderRadius:"50%",background:"var(--paper-2)",border:"2px dashed var(--line-2)",display:"grid",placeItems:"center",fontSize:22}}>🔒</div>
          <div style={{fontWeight:600,fontSize:13.5,color:"var(--ink-2)"}}>Legal step locked</div>
          <div style={{fontSize:12.5,color:"var(--muted)",lineHeight:1.55,maxWidth:272}}>Finance (D. Smirnova) must approve this request before Legal can decide. The chain is sequential — Legal cannot act before step 02 closes.</div>
          <div style={{fontSize:12,background:"var(--paper-2)",border:"1px solid var(--line-2)",padding:"10px 12px",width:"100%",textAlign:"left",lineHeight:1.5}}>
            <div className="mono" style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)",marginBottom:3}}>Current step</div>
            <div style={{fontWeight:500}}>Finance Review · D. Smirnova</div>
            <div className="mono" style={{fontSize:11,color:"var(--muted)",marginTop:2}}>SLA: 23h remaining · deadline 2026-05-16 09:15</div>
          </div>
          <div style={{fontSize:11,color:"var(--muted-2)",fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em"}}>Legal step: O. Markov · step 03</div>
        </div>
      </div>
    );
  }

  /* ── Already decided (scenario="decided" or just submitted) ── */
  if(isDecided){
    const kind   = doneKind || "approve";
    const dcols  = {
      approve: { c:"var(--pos)",  bg:"var(--pos-soft)",  b:"#B2C8A8", icon:"✓", label:"Finance Approved" },
      reject:  { c:"var(--neg)",  bg:"var(--neg-soft)",  b:"#D6B0A8", icon:"✕", label:"Finance Rejected" },
      sendback:{ c:"var(--info)", bg:"var(--info-soft)", b:"#A4C0C8", icon:"↩", label:"Sent Back to Owner" },
    };
    const dc = dcols[kind];
    const pillKind = kind==="approve"?"approved":kind==="reject"?"rejected":"sentback";
    const resolvedComment = comment || (scenario==="decided" ? "Within policy — competitor evidence on file. Discount preserves margin floor. Handing to Legal · O. Markov for step 03." : "");
    return (
      <div className="panel decision-panel">
        <div className="panel-head">
          <div className="panel-title">Decision recorded</div>
          <Pill kind={pillKind}>{dc.label}</Pill>
        </div>
        <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:dc.bg,border:`2px solid ${dc.b}`,display:"grid",placeItems:"center",fontSize:22,color:dc.c}}>{dc.icon}</div>
          <div style={{fontWeight:600,fontSize:14,color:dc.c}}>{dc.label}</div>
          <div style={{fontSize:12,color:"var(--muted)"}}>2026-05-16 14:22 · D. Smirnova</div>
          {resolvedComment && (
            <div style={{fontSize:12.5,background:"var(--paper-2)",border:"1px solid var(--line-2)",borderLeft:`3px solid ${dc.c}`,padding:"9px 11px",color:"var(--ink-2)",width:"100%",lineHeight:1.5}}>
              <div className="mono" style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)",marginBottom:3}}>Decision comment</div>
              {resolvedComment}
            </div>
          )}
          {kind==="approve" && (
            <div style={{fontSize:12,color:"var(--info)",background:"var(--info-soft)",border:"1px solid #A4C0C8",padding:"8px 10px",width:"100%",textAlign:"left",lineHeight:1.45}}>
              <span className="mono" style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",display:"block",marginBottom:2}}>Next</span>
              Request handed to Legal · O. Markov for step 03.
            </div>
          )}
          <div style={{fontSize:10.5,color:"var(--muted-2)",fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em",marginTop:4,textAlign:"center"}}>
            DECISION AUDITED · IMMUTABLE · AUDIT TRAIL UPDATED
          </div>
        </div>
      </div>
    );
  }

  /* ── Active (Finance can decide) ── */
  const conf = mode ? CONF[mode] : null;
  return (
    <div className="panel decision-panel">
      <div className="panel-head">
        <div className="panel-title">
          Decision · Finance step
          <span style={{fontSize:10,fontFamily:'"JetBrains Mono",monospace',letterSpacing:".1em",textTransform:"uppercase",color:"var(--accent-2)",background:"var(--warn-soft)",border:"1px solid #D9BFA0",padding:"1px 6px",borderRadius:2,fontWeight:400}}>COMMENT REQ'D</span>
        </div>
        <Pill kind="pending">Your step</Pill>
      </div>

      {/* mode selector */}
      {!mode && (
        <div style={{padding:"14px 14px 16px",display:"flex",flexDirection:"column",gap:7}}>
          <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.5,marginBottom:2}}>
            Select a decision below. A comment is required before submitting — all decisions are audited.
          </div>
          <button className="btn btn-pos btn-lg dec-mode-btn" onClick={()=>setMode("approve")}>
            <span style={{fontSize:16,lineHeight:1}}>✓</span>
            <span style={{flex:1,textAlign:"left"}}>Approve</span>
            <span style={{fontSize:11,opacity:.7,fontWeight:400}}>Advance to Legal ›</span>
          </button>
          <button className="btn btn-info btn-lg dec-mode-btn" onClick={()=>setMode("sendback")}>
            <span style={{fontSize:16,lineHeight:1}}>↩</span>
            <span style={{flex:1,textAlign:"left"}}>Send Back</span>
            <span style={{fontSize:11,opacity:.7,fontWeight:400}}>Return to owner ›</span>
          </button>
          <button className="btn btn-neg btn-lg dec-mode-btn" onClick={()=>setMode("reject")}>
            <span style={{fontSize:16,lineHeight:1}}>✕</span>
            <span style={{flex:1,textAlign:"left"}}>Reject</span>
            <span style={{fontSize:11,opacity:.7,fontWeight:400}}>End chain ›</span>
          </button>
          <div style={{fontSize:10.5,color:"var(--muted)",textAlign:"center",fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em",marginTop:2,paddingTop:8,borderTop:"1px solid var(--hairline)"}}>
            SLA · {REQ.sla.label} · {REQ.sla.deadline}
          </div>
        </div>
      )}

      {/* mode selected */}
      {mode && conf && (
        <div>
          {/* mode header */}
          <div style={{padding:"12px 14px",background:conf.bg,borderBottom:`1px solid ${conf.border}`,display:"flex",gap:10,alignItems:"flex-start",justifyContent:"space-between"}}>
            <div>
              <div style={{fontWeight:600,fontSize:13,color:conf.color,marginBottom:3}}>{conf.title}</div>
              <div style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.45}}>{conf.desc}</div>
            </div>
            <button onClick={()=>setMode(null)} className="btn btn-ghost btn-sm" style={{flexShrink:0,fontSize:13}}>✕</button>
          </div>

          {/* comment textarea */}
          <div style={{padding:"12px 14px",borderBottom:"1px solid var(--hairline)"}}>
            <label style={{fontSize:11,color:"var(--muted)",fontWeight:500,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
              <span>Decision comment <span style={{color:"var(--accent-2)",fontFamily:'"JetBrains Mono",monospace',fontSize:10}}>*</span></span>
              <span className="mono" style={{fontSize:10,color:"var(--muted)"}}>{comment.length} chars · min 10</span>
            </label>
            <div style={{border:showErr?"1px solid var(--neg)":"1px solid var(--line)",borderRadius:3,background:"var(--white)"}}>
              <textarea
                style={{border:0,outline:"none",padding:"8px 10px",font:"inherit",fontSize:12.5,color:"var(--ink)",resize:"vertical",minHeight:88,lineHeight:1.5,background:"transparent",width:"100%",display:"block"}}
                value={comment}
                onChange={e=>setComment(e.target.value)}
                onBlur={()=>setTouched(true)}
                placeholder={conf.placeholder}
              />
            </div>
            {showErr && (
              <div style={{fontSize:11.5,color:"var(--neg)",display:"flex",alignItems:"flex-start",gap:6,marginTop:5,lineHeight:1.4}}>
                <span style={{width:14,height:14,border:"1.5px solid var(--neg)",borderRadius:"50%",display:"grid",placeItems:"center",fontSize:8,fontWeight:700,flexShrink:0,marginTop:1}}>!</span>
                Comment required (min 10 chars). Approvers cannot decide silently — this is logged to the audit trail.
              </div>
            )}
            {/* quick templates */}
            <div style={{marginTop:8,display:"flex",gap:5,flexWrap:"wrap"}}>
              {conf.reasons.map((r,i)=>(
                <span key={i}
                  style={{fontSize:11,padding:"3px 8px",border:"1px solid var(--line-2)",background:"var(--paper-2)",borderRadius:14,color:"var(--ink-2)",cursor:"pointer"}}
                  onClick={()=>{ setComment(c=>c?c+" · "+r:r); setTouched(true); }}
                >+ {r}</span>
              ))}
            </div>
          </div>

          {/* impact notice */}
          <div style={{
            padding:"9px 12px",
            background: conf.impact.kind==="neg" ? "var(--neg-soft)" : "var(--info-soft)",
            borderBottom:"1px solid var(--hairline)",
            fontSize:12,color:"var(--ink-2)",lineHeight:1.4,
          }}>
            <span className="mono" style={{
              fontSize:10,letterSpacing:".1em",textTransform:"uppercase",marginRight:7,
              color: conf.impact.kind==="neg"?"var(--neg)":"var(--info)",
            }}>{conf.impact.label}</span>
            {conf.impact.text}
          </div>

          {/* actions */}
          <div style={{padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <button onClick={()=>{setMode(null);setTouched(false);setComment("");}} className="btn btn-ghost btn-sm">← Cancel</button>
            <button className={`btn ${conf.btnCls} btn-lg`} onClick={handleSubmit}>{conf.btnLabel}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── SLA context panel (right col) ─────────── */

function SLAContext({ scenario }){
  return (
    <div className="panel" style={{marginTop:14}}>
      <div className="panel-head">
        <div className="panel-title">SLA &amp; context</div>
        <div className="panel-actions"><Pill kind={REQ.sla.state}>{REQ.sla.state}</Pill></div>
      </div>
      <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
        <div>
          <div className="snap-label" style={{marginBottom:5}}>Finance SLA</div>
          <SLABar data={REQ.sla} width={160} />
          <div className="mono" style={{fontSize:10.5,color:"var(--muted)",marginTop:4}}>Deadline: {REQ.sla.deadline}</div>
        </div>
        <div style={{borderTop:"1px solid var(--hairline)",paddingTop:10,display:"flex",flexDirection:"column",gap:6}}>
          {[
            ["Request age",    REQ.age,                          "mono"],
            ["Amount",         fmtMoney(REQ.snap.amount),        "mono bold"],
            ["Opp close date", REQ.snap.close,                   "mono"],
            ["Region",         REQ.snap.region,                  "mono"],
            ["Payment risk",   null,                             "pill-pending"],
            ["Priority",       REQ.priority,                     "mono"],
          ].map(([label, val, type],i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12}}>
              <span style={{color:"var(--muted)"}}>{label}</span>
              {type==="pill-pending"
                ? <Pill kind="pending">{REQ.snap.risk}</Pill>
                : <span className="mono" style={type==="mono bold"?{fontWeight:600,fontSize:13}:{}}>{val}</span>
              }
            </div>
          ))}
        </div>
        <div style={{borderTop:"1px solid var(--hairline)",paddingTop:10}}>
          <div className="snap-label" style={{marginBottom:5}}>Requested change</div>
          <div style={{fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8}}>
            <span className="mono" style={{textDecoration:"line-through",color:"var(--muted)"}}>{REQ.snap.discCurrent}</span>
            <span style={{color:"var(--line-2)"}}>→</span>
            <span className="mono" style={{color:"var(--accent-2)",fontWeight:700}}>{REQ.snap.discRequested}</span>
          </div>
          <div style={{fontSize:11.5,color:"var(--muted)",marginTop:3}}>{REQ.snap.terms}</div>
        </div>
        <div style={{borderTop:"1px solid var(--hairline)",paddingTop:10,fontSize:11,color:"var(--muted-2)",fontFamily:'"JetBrains Mono",monospace',letterSpacing:".04em",lineHeight:1.6}}>
          <div>CHAIN: FIN → LEG</div>
          <div>FIN SLA: 24h · LEG SLA: 48h total</div>
          <div>POLICY: DISCOUNT-GOV-V18</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── App ─────────── */

function App(){
  const [scenario,    setScenario]    = useState("active");
  const [decisionMode, setDecisionMode] = useState(null);
  const [extraEvents, setExtraEvents] = useState([]);
  const [toast,       setToast]       = useState(null);
  const [toastKind,   setToastKind]   = useState("ok");

  const user = scenario==="legal-locked" ? APPROVERS.leg : APPROVERS.fin;

  /* Reset when scenario changes */
  useEffect(()=>{
    setDecisionMode(null);
    setExtraEvents([]);
  }, [scenario]);

  function handleDecide(mode){
    setDecisionMode(mode);
  }

  function handleSubmit(kind, comment){
    const now = new Date();
    const ts  = now.toISOString().replace("T"," ").slice(0,16);
    const descMap = {
      approve:  `Comment: ${comment} · Request handed to Legal · O. Markov for step 03.`,
      reject:   `Comment: ${comment} · Opportunity returns to prior commercial baseline. Owner notified.`,
      sendback: `Comment: ${comment} · Returned to A. Petrova for revision. SLA clock paused.`,
    };
    const titleMap = {
      approve:  "Finance approved — REQ-1182",
      reject:   "Finance rejected — REQ-1182",
      sendback: "Sent back to owner — REQ-1182",
    };
    setExtraEvents(evs=>[...evs, {
      t: ts, who:"Daria Smirnova", type:kind,
      initials:"DS", color:"bg-a",
      title: titleMap[kind],
      desc:  descMap[kind],
    }]);
    const toasts = {
      approve:  `✓  REQ-1182 approved · handed to Legal · O. Markov`,
      reject:   `✕  REQ-1182 rejected · owner notified · decision audited`,
      sendback: `↩  REQ-1182 sent back · A. Petrova notified to revise`,
    };
    setToast(toasts[kind]);
    setToastKind("ok");
    setTimeout(()=>setToast(null), 3200);
  }

  /* Pre-populated decided state for scenario="decided" */
  const decidedExtra = scenario==="decided" ? [{
    t:"2026-05-16 14:22", who:"Daria Smirnova", type:"approve", initials:"DS", color:"bg-a",
    title:"Finance approved — REQ-1182",
    desc:"Comment: Within policy — competitor evidence on file. Discount preserves margin floor. Handed to Legal · O. Markov for step 03.",
  }] : [];

  const allExtra = [...decidedExtra, ...extraEvents];

  return (
    <div className="app" data-screen-label="06 Approval Decision Detail">
      <Sidebar user={user} />
      <div className="main">
        <TopBar user={user} />
        <div className="content">
          <ScenarioBar scenario={scenario} setScenario={setScenario} />
          <RequestHeader scenario={scenario} user={user} onDecide={handleDecide} />
          <div style={{height:12}} />
          <AccessBox user={user} />
          <div style={{height:12}} />
          <div className="detail-grid">
            {/* left column */}
            <div className="detail-left">
              <DealSnapshot />
              <div style={{height:12}} />
              <RequestDetails />
              <div style={{height:12}} />
              <PolicyChain scenario={scenario} />
              <div style={{height:12}} />
              <AuditTimeline extraEvents={allExtra} />
            </div>
            {/* right column (sticky) */}
            <div className="detail-right">
              <DecisionPanel
                scenario={scenario}
                user={user}
                mode={decisionMode}
                setMode={setDecisionMode}
                onSubmit={handleSubmit}
              />
              <SLAContext scenario={scenario} />
            </div>
          </div>
          <div className="foot-ruler">
            <span>SALES OPS CRM · ORION INDUSTRIAL · LOCAL PILOT</span>
            <span>USER {user.roleCode} · {user.initials} · APPROVER SCOPE</span>
            <span>POLICY DISCOUNT-GOV-V18 · REQ-1182 · METADATA v42</span>
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast">
          <span className="ok">✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
