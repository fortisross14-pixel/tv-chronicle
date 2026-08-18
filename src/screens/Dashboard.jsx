import React from 'react';
import { Card, Metric, ProgramPoster, SectionTitle, Pill } from '../components/UI.jsx';
import { alerts, networkReachHouseholds } from '../game/simulation.js';
import { fmtDate, money, num } from '../game/utils.js';

export default function Dashboard({state,onNavigate}){
  const top=[...state.programs].sort((a,b)=>(b.lastAudience||0)-(a.lastAudience||0)).slice(0,5);
  const prodRisk=state.programs.filter(p=>Math.floor(p.pipeline.ready-p.pipeline.aired)<=2);
  const activeAds=state.adCampaigns.filter(a=>a.status==='Active');
  const atRiskAds=activeAds.filter(a=>a.days<10&&a.delivered/Math.max(1,a.goal)<.7);
  const a=alerts(state);
  return <div className="page-stack">
    <div className="hero-panel">
      <div><span className="eyebrow">EXECUTIVE BRIEFING · {fmtDate(state.date)}</span><h1>{state.network.initials} Network Command</h1><p>Build audience, protect the production runway, monetize attention and grow the IP portfolio.</p></div>
      <div className="network-seal" style={{'--primary':state.network.primary,'--secondary':state.network.secondary}}><i>{state.network.icon}</i><b>{state.network.initials}</b></div>
    </div>

    <div className="metric-grid">
      <Metric label="Cash" value={money(state.cash)} sub={`Debt ${money(state.debt)}`} tone={state.cash<3000000?'danger':''}/>
      <Metric label="Technical Reach" value={num(networkReachHouseholds(state))} sub="households"/>
      <Metric label="Yesterday" value={num(state.lastDayAudience)} sub="total scheduled audience"/>
      <Metric label="Network Prestige" value={`${Math.round(state.network.prestige)}`} sub={`News trust ${Math.round(state.network.newsTrust||0)}`}/>
      <Metric label="Programs" value={state.programs.length} sub={`${state.ips.length} IP assets`}/>
      <Metric label="Active Campaigns" value={activeAds.length} sub={`${atRiskAds.length} at risk`} tone={atRiskAds.length?'warn':''}/>
    </div>

    <div className="dashboard-grid">
      <Card className="pad span-2">
        <SectionTitle title="Tonight's Slate" sub="Your strongest scheduled windows" actions={<button onClick={()=>onNavigate('channel')}>Open schedule</button>}/>
        <div className="tonight-list">
          {['prime1','prime2','late'].map(slot=>{
            const p=state.programs.find(x=>x.id===state.schedule[['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][(new Date(`${state.date}T12:00:00`).getDay()+6)%7]]?.[slot]);
            return p?<div className="tonight-item" key={slot}><ProgramPoster p={p} compact/><div><span>{slot==='prime1'?'8 PM':slot==='prime2'?'9 PM':'10 PM'}</span><h3>{p.title}</h3><small>{p.genre} · Viewer {(p.viewer/10).toFixed(1)} · Critics {Math.round(p.critic)}%</small></div></div>:null;
          })}
        </div>
      </Card>

      <Card className="pad">
        <SectionTitle title="Alerts" sub={`${a.length} items need attention`}/>
        <div className="alert-list">{a.length?a.map((x,i)=><div className="alert-row" key={i}><i className={`dot ${x.sev}`}/><div><b>{x.title}</b><span>{x.sub}</span></div></div>):<div className="empty">No urgent issues.</div>}</div>
      </Card>

      <Card className="pad span-2">
        <SectionTitle title="Ratings Board" sub="Latest audience by program"/>
        <div className="ratings-board">{top.map((p,i)=><div className="rating-row" key={p.id}><b className="rank">#{i+1}</b><div className="rating-title"><strong>{p.title}</strong><small>{p.genre}</small></div><span>{num(p.lastAudience||0)}</span><Pill tone={(p.momentum||0)>2?'ok':(p.momentum||0)<-2?'danger':''}>{(p.momentum||0)>=0?'+':''}{(p.momentum||0).toFixed(1)} buzz</Pill></div>)}</div>
      </Card>

      <Card className="pad">
        <SectionTitle title="Production Pulse" sub="Shows close to the edge" actions={<button onClick={()=>onNavigate('studio')}>Studio</button>}/>
        {prodRisk.slice(0,5).map(p=><div className="compact-line" key={p.id}><span>{p.title}</span><b>{Math.max(0,Math.floor(p.pipeline.ready-p.pipeline.aired))} ready</b></div>)}
        {!prodRisk.length&&<div className="empty">All production runways are healthy.</div>}
      </Card>

      <Card className="pad span-3">
        <SectionTitle title="Network Pulse" sub="Recent company events"/>
        <div className="news-grid">{state.news.slice(0,9).map((n,i)=><div className="news-card" key={`${n.date}-${i}`}><i className={`dot ${n.type==='warning'?'orange':n.type==='green'?'green':'blue'}`}/><div><b>{n.text}</b><span>{n.date}</span></div></div>)}</div>
      </Card>
    </div>
  </div>
}
