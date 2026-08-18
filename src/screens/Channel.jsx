import React, { useMemo, useState } from 'react';
import { Card, Empty, Pill, ProgramPoster, SectionTitle, StatBar, Tabs } from '../components/UI.jsx';
import { DAYS, DAYPARTS, DEMOS } from '../game/constants.js';
import { calcAudience, getIP, networkReachHouseholds, setSchedule } from '../game/simulation.js';
import { num, pct } from '../game/utils.js';

export default function Channel({state,setState}){
  const [tab,setTab]=useState('schedule');
  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">QUADRANT II</span><h1>Channel</h1><p>Program the network, cultivate audiences and shape what PCN means to viewers.</p></div></div>
    <Tabs value={tab} onChange={setTab} items={[["schedule","Programming"],["audience","Audience"],["brand","Network Brand"],["awards","Awards"],["competition","Competition"]]}/>
    {tab==='schedule'&&<Schedule state={state} setState={setState}/>} 
    {tab==='audience'&&<Audience state={state}/>} 
    {tab==='brand'&&<Brand state={state}/>} 
    {tab==='awards'&&<Awards state={state}/>} 
    {tab==='competition'&&<Competition state={state}/>} 
  </div>
}

function Schedule({state,setState}){
  const [day,setDay]=useState(DAYS[(new Date(`${state.date}T12:00:00`).getDay()+6)%7]);
  const reach=networkReachHouseholds(state);
  return <div className="schedule-layout">
    <Card className="pad span-2"><SectionTitle title="Weekly Schedule" sub="Half-hour/detail granularity is abstracted into strategically distinct dayparts on this pass."/>
      <div className="day-switch">{DAYS.map(d=><button key={d} className={day===d?'active':''} onClick={()=>setDay(d)}>{d}</button>)}</div>
      <div className="schedule-list">{DAYPARTS.map(([slot,label,time])=>{
        const pid=state.schedule[day]?.[slot],p=state.programs.find(x=>x.id===pid),preview=p?calcAudience(state,p,slot,state.date):null;
        return <div className="schedule-row" key={slot}><div className="schedule-time"><b>{time}</b><span>{label}</span></div><div className="schedule-show">{p&&<ProgramPoster p={p} compact/>}<select value={pid||''} onChange={e=>setState(setSchedule(state,day,slot,e.target.value))}>{state.programs.map(x=><option value={x.id} key={x.id}>{x.title}</option>)}</select></div><div className="schedule-forecast"><b>{preview?num(preview.audience):'—'}</b><span>forecast</span></div></div>
      })}</div>
    </Card>
    <Card className="pad"><SectionTitle title="Programming Logic" sub="Quality is only one input."/><div className="logic-list"><div><b>Reach</b><span>{num(reach)} households can receive PCN.</span></div><div><b>Lead-in & daypart</b><span>Prime windows offer more available viewers but face stronger competition.</span></div><div><b>Awareness</b><span>Marketing and network reputation create sampling.</span></div><div><b>IP attraction</b><span>Popularity and novelty pull different ways.</span></div><div><b>Ad load</b><span>More minutes sell more inventory but increase switching.</span></div></div></Card>
  </div>
}

function Audience({state}){
  const latest=[...state.programs].sort((a,b)=>(b.lastAudience||0)-(a.lastAudience||0));
  const totals={};DEMOS.forEach(([k])=>totals[k]=0);
  latest.forEach(p=>{const ip=getIP(state,p.ipId);DEMOS.forEach(([k])=>totals[k]+=(p.lastAudience||0)*(((p.target?.[k]||40)*.58+(ip?.affinity?.[k]||40)*.42)/500))});
  const max=Math.max(1,...Object.values(totals));
  return <div className="dashboard-grid">
    <Card className="pad span-2"><SectionTitle title="Program Performance" sub="Viewership, viewer love and critical reception stay separate."/><div className="table-wrap"><table><thead><tr><th>Program</th><th>Audience</th><th>TV Rating</th><th>Share</th><th>Viewer</th><th>Critics</th><th>Popularity</th><th>Novelty</th><th>Buzz</th></tr></thead><tbody>{latest.map(p=>{const ip=getIP(state,p.ipId),reach=Math.max(1,networkReachHouseholds(state)),rating=(p.lastAudience||0)/reach*100,share=(p.lastAudience||0)/(reach*.55)*100;return <tr key={p.id}><td><b>{p.title}</b><small>{p.genre}</small></td><td>{num(p.lastAudience)}</td><td>{rating.toFixed(1)}</td><td>{share.toFixed(1)}</td><td>{(p.viewer/10).toFixed(1)}</td><td>{Math.round(p.critic)}%</td><td>{Math.round(ip?.popularity||0)}</td><td>{Math.round(ip?.novelty||0)}</td><td><Pill tone={p.momentum>2?'ok':p.momentum<-2?'danger':''}>{p.momentum>=0?'+':''}{(p.momentum||0).toFixed(1)}</Pill></td></tr>})}</tbody></table></div></Card>
    <Card className="pad"><SectionTitle title="Audience Shape" sub="Relative strength across the eight core groups."/>{DEMOS.map(([k,l])=><StatBar key={k} label={l} value={totals[k]/max*100}/>)}</Card>
  </div>
}

function Brand({state}){
  const b=state.network.brand||state.network;
  return <div className="split-layout"><Card className="pad"><SectionTitle title="Network Identity" sub="This profile emerges from years of programming decisions."/><div className="brand-seal-large" style={{'--primary':state.network.primary,'--secondary':state.network.secondary}}><i>{state.network.icon}</i><b>{state.network.initials}</b><span>{state.network.name}</span></div></Card><Card className="pad"><SectionTitle title="Audience Associations" sub="A strong identity helps the right shows sample faster."/><StatBar label="Prestige" value={b.prestige||state.network.prestige}/><StatBar label="Trust" value={b.trust||state.network.trust}/><StatBar label="Youth" value={b.youth||state.network.youth}/><StatBar label="Family" value={b.family||state.network.family}/><StatBar label="Sports" value={b.sports||state.network.sports}/><StatBar label="Innovation" value={b.innovation||state.network.innovation}/></Card></div>
}

function Awards({state}){
  return <div className="dashboard-grid"><Card className="pad span-2"><SectionTitle title="Awards Calendar" sub="Critical acclaim and craft can convert into prestige, talent attraction and IP value."/><div className="candidate-grid">{state.awards.map(a=><Card className="candidate-card" key={a.id}><h3>{a.name}</h3><span>Month {a.month}</span><div className="chips">{a.categories.map(c=><Pill key={c}>{c}</Pill>)}</div></Card>)}</div></Card><Card className="pad"><SectionTitle title="PCN Trophy Case" sub={`${state.awardHistory.length} wins recorded`}/>{state.awardHistory.length?state.awardHistory.slice(0,12).map((x,i)=><div className="compact-line" key={i}><span>{x.program}<small>{x.award}</small></span><b>{x.category}</b></div>):<Empty>Build acclaimed television and the awards will come.</Empty>}</Card></div>
}

function Competition({state}){
  return <div className="program-grid">{state.competitors.map(c=><Card className="pad competitor-card" key={c.id}><span className="eyebrow">{c.identity}</span><h2>{c.name}</h2><StatBar label="Prime" value={c.prime}/><StatBar label="Daytime" value={c.daytime}/><StatBar label="Sports" value={c.sports}/><StatBar label="Prestige" value={c.prestige}/><div className="chips"><Pill tone={(c.momentum||0)>2?'danger':''}>Momentum {(c.momentum||0)>=0?'+':''}{(c.momentum||0).toFixed(1)}</Pill></div></Card>)}</div>
}
