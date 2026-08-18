import React, { useMemo, useState } from 'react';
import { Card, Metric, Pill, SectionTitle } from '../components/UI.jsx';
import { alerts, markAllMailRead, markMailRead, networkReachHouseholds } from '../game/simulation.js';
import { fmtDate, money, num } from '../game/utils.js';

export default function Dashboard({state,setState,onNavigate}){
  const [selected,setSelected]=useState(state.emails?.[0]?.id||null);
  const mails=state.emails||[],mail=mails.find(x=>x.id===selected)||mails[0],a=alerts(state),unread=mails.filter(x=>!x.read).length;
  const open=id=>{setSelected(id);setState(markMailRead(state,id));};
  return <div className="page-stack">
    <div className="hero-panel inbox-hero"><div><span className="eyebrow">EXECUTIVE INBOX · {fmtDate(state.date)}</span><h1>{state.network.initials} Network Office</h1><p>Processes finish here. Advance time, read the mail, make the next decision.</p></div><div className="hero-mail-count"><b>{unread}</b><span>unread</span></div></div>

    <div className="metric-grid">
      <Metric label="Cash" value={money(state.cash)} sub="starting capital funds every process" tone={state.cash<3000000?'danger':''}/>
      <Metric label="Technical Reach" value={num(networkReachHouseholds(state))} sub="households with access"/>
      <Metric label="Owned Programs" value={state.programs.length} sub={`${state.developments.filter(d=>d.status==='Complete').length} scripts on shelf`}/>
      <Metric label="Staff" value={state.employees.length} sub={`${state.staffSearches.filter(x=>x.status==='Searching').length} searches active`}/>
      <Metric label="Production" value={state.programs.filter(p=>p.status==='Production').length} sub={`${state.facilityProjects.length} facility projects`}/>
      <Metric label="Unread Mail" value={unread} sub={`${a.length} active alerts`} tone={unread?'warn':''}/>
    </div>

    <div className="inbox-layout">
      <Card className="inbox-list-card">
        <div className="inbox-toolbar"><div><b>Inbox</b><span>{mails.length} messages</span></div><button disabled={!unread} onClick={()=>setState(markAllMailRead(state))}>Mark all read</button></div>
        <div className="mail-list">{mails.map(m=><button key={m.id} className={`mail-row ${!m.read?'unread':''} ${mail?.id===m.id?'active':''}`} onClick={()=>open(m.id)}><i className={`mail-type ${m.category||'info'}`}/><div><b>{m.from}</b><strong>{m.subject}</strong><span>{m.body.split('\n')[0]}</span></div><time>{m.date.slice(5)}</time></button>)}</div>
      </Card>
      <Card className="mail-reader">{mail?<><div className="mail-reader-head"><span className="eyebrow">{mail.category||'MESSAGE'} · {mail.date}</span><h2>{mail.subject}</h2><p>From: <b>{mail.from}</b></p></div><div className="mail-body">{mail.body.split('\n').map((line,i)=><p key={i}>{line||' '}</p>)}</div><div className="mail-actions">{mail.developmentId&&<button className="primary" onClick={()=>onNavigate('studio')}>Open Studio</button>}{mail.programId&&<button className="primary" onClick={()=>onNavigate('studio')}>Open Program</button>}{mail.searchId&&<button className="primary" onClick={()=>onNavigate('organization')}>Open Hiring</button>}</div></>:<div className="empty">No messages yet.</div>}</Card>
    </div>

    <div className="dashboard-grid">
      <Card className="pad span-2"><SectionTitle title="Process Monitor" sub="Nothing important happens instantly."/><div className="process-board">
        {state.developments.filter(d=>['Writing','Rewrite'].includes(d.status)).map(d=><Process key={d.id} label={`Writing · ${d.title}`} days={d.daysRemaining} total={d.totalDays}/>) }
        {state.staffSearches.filter(x=>x.status==='Searching').map(x=><Process key={x.id} label={`Search · ${x.role}`} days={x.daysRemaining} total={x.totalDays}/>) }
        {state.negotiations.filter(x=>x.status==='Negotiating').map(x=><Process key={x.id} label={`Negotiation · ${state.candidateMarket.find(c=>c.id===x.candidateId)?.name||'Candidate'}`} days={x.daysRemaining} total={x.totalDays}/>) }
        {state.facilityProjects.map(x=><Process key={x.id} label={`Construction · ${x.name}`} days={x.daysRemaining} total={x.totalDays}/>) }
        {state.programs.filter(p=>p.status==='Production').map(p=><div className="process-line" key={p.id}><div><b>Production · {p.title}</b><span>{Math.floor(p.pipeline.ready)} / {p.episodes} episodes delivered</span></div><div className="progress-mini"><i style={{width:`${p.pipeline.ready/p.episodes*100}%`}}/></div></div>)}
        {!state.developments.some(d=>['Writing','Rewrite'].includes(d.status))&&!state.staffSearches.some(x=>x.status==='Searching')&&!state.negotiations.some(x=>x.status==='Negotiating')&&!state.facilityProjects.length&&!state.programs.some(p=>p.status==='Production')&&<div className="empty">No active processes. Commission, hire, build or produce something.</div>}
      </div></Card>
      <Card className="pad"><SectionTitle title="Alerts" sub="What blocks the next move"/><div className="alert-list">{a.map((x,i)=><div className="alert-row" key={i}><i className={`dot ${x.sev}`}/><div><b>{x.title}</b><span>{x.sub}</span></div></div>)}</div></Card>
      <Card className="pad span-3"><SectionTitle title="Opening Playbook" sub="The network starts empty by design."/><div className="opening-steps"><button onClick={()=>onNavigate('business')}><b>1</b><span><strong>Fill dead air</strong>License movies or syndicated packages immediately.</span></button><button onClick={()=>onNavigate('organization')}><b>2</b><span><strong>Hire a writer</strong>Create a position, wait for a shortlist, negotiate, then hire.</span></button><button onClick={()=>onNavigate('studio')}><b>3</b><span><strong>Commission a script</strong>Episodes and duration determine the writing calendar.</span></button><button onClick={()=>onNavigate('organization')}><b>4</b><span><strong>Build production capacity</strong>A soundstage takes time to construct.</span></button><button onClick={()=>onNavigate('studio')}><b>5</b><span><strong>Greenlight & produce</strong>Only after the script exists do you hire/assign the production team and cast.</span></button><button onClick={()=>onNavigate('channel')}><b>6</b><span><strong>Schedule the premiere</strong>Program blocks consume real time on the broadcast day.</span></button></div></Card>
    </div>
  </div>
}
function Process({label,days,total}){const done=Math.max(0,100-days/Math.max(1,total)*100);return <div className="process-line"><div><b>{label}</b><span>{days} day{days===1?'':'s'} remaining</span></div><div className="progress-mini"><i style={{width:`${done}%`}}/></div></div>}
