import React, { useState } from 'react';
import { Card, Empty, Pill, SectionTitle, StatBar, Tabs } from '../components/UI.jsx';
import { expandFacility, expandState, fireEmployee, hireCandidate, networkReachHouseholds, setAutomation, signAffiliate, startResearch, updateNetwork, updateNewsroom } from '../game/simulation.js';
import { money, num, pct } from '../game/utils.js';

export default function Organization({state,setState}){
  const [tab,setTab]=useState('people');
  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">QUADRANT IV</span><h1>Organization</h1><p>Build the people, technology, facilities and distribution system behind the network.</p></div></div>
    <Tabs value={tab} onChange={setTab} items={[["people","People"],["research","Research"],["facilities","Facilities"],["distribution","Distribution"],["news","Newsroom"],["automation","Automation"],["network","Network"]]}/>
    {tab==='people'&&<People state={state} setState={setState}/>} 
    {tab==='research'&&<Research state={state} setState={setState}/>} 
    {tab==='facilities'&&<Facilities state={state} setState={setState}/>} 
    {tab==='distribution'&&<Distribution state={state} setState={setState}/>} 
    {tab==='news'&&<Newsroom state={state} setState={setState}/>} 
    {tab==='automation'&&<Automation state={state} setState={setState}/>} 
    {tab==='network'&&<NetworkSettings state={state} setState={setState}/>} 
  </div>
}

function People({state,setState}){
  const [offers,setOffers]=useState({});
  const updateOffer=(id,k,v)=>setOffers(o=>({...o,[id]:{salary:o[id]?.salary||state.candidates.find(c=>c.id===id)?.ask||0,years:o[id]?.years||3,bonus:o[id]?.bonus||0,backend:o[id]?.backend||0,creativeControl:o[id]?.creativeControl||40,[k]:Number(v)}}));
  return <div className="dashboard-grid"><Card className="pad span-2"><SectionTitle title="Current Staff" sub={`${state.employees.length} named key personnel; routine crew is abstracted as capacity.`}/><div className="candidate-grid">{state.employees.map(e=><Card className="candidate-card" key={e.id}><span className="eyebrow">{e.dept}</span><h3>{e.name}</h3><p>{e.role} · Overall {e.overall}</p><div className="mini-stats"><span>Salary <b>{money(e.salary)}</b></span><span>Morale <b>{Math.round(e.morale)}</b></span><span>Term <b>{e.contractYears}y</b></span></div><div className="chips">{Object.entries(e.skills).slice(0,3).map(([k,v])=><Pill key={k}>{k} {v}</Pill>)}</div><button className="danger-btn" onClick={()=>setState(fireEmployee(state,e.id))}>Release</button></Card>)}</div></Card>
  <Card className="pad"><SectionTitle title="Talent Market" sub="Hiring is negotiated. Prestige and security affect acceptance."/>{state.candidates.map(c=>{const o=offers[c.id]||{salary:c.ask,years:3,bonus:0,backend:0,creativeControl:40};return <div className="hire-card" key={c.id}><div><b>{c.name}</b><span>{c.role} · OVR {c.overall}</span><small>Agent ask {money(c.ask)}</small></div><label>Salary<input type="number" step="10000" value={o.salary} onChange={e=>updateOffer(c.id,'salary',e.target.value)}/></label><label>Years<input type="number" min="1" max="5" value={o.years} onChange={e=>updateOffer(c.id,'years',e.target.value)}/></label><label>Signing bonus<input type="number" step="10000" value={o.bonus} onChange={e=>updateOffer(c.id,'bonus',e.target.value)}/></label><label>Backend %<input type="number" min="0" max="10" step="0.5" value={o.backend} onChange={e=>updateOffer(c.id,'backend',e.target.value)}/></label><label>Creative control<input type="number" min="0" max="100" step="10" value={o.creativeControl} onChange={e=>updateOffer(c.id,'creativeControl',e.target.value)}/></label><button onClick={()=>{const r=hireCandidate(state,c.id,o.salary,o.years,o.bonus,o.backend,o.creativeControl);setState(r.state);if(!r.accepted)alert(`${c.name}'s agent rejected the offer.`)}}>Negotiate</button></div>})}</Card></div>
}

function Research({state,setState}){
  const active=state.research&&state.tech.find(t=>t.id===state.research.techId);
  return <div className="dashboard-grid"><Card className="pad"><SectionTitle title="R&D Department" sub="Research represents organizational capability, not magically inventing existing technology."/>{active?<><h3>{active.name}</h3><StatBar label="Progress" value={active.progress}/><p>{active.desc}</p></>:<Empty>No active project.</Empty>}</Card><Card className="pad span-2"><SectionTitle title="Technology Roadmap"/><div className="candidate-grid">{state.tech.map(t=><Card className="candidate-card" key={t.id}><span className="eyebrow">{t.group} · Tier {t.tier}</span><h3>{t.name}</h3><p>{t.desc}</p>{t.researched?<Pill tone="ok">Operational</Pill>:<><StatBar label="Progress" value={t.progress}/><button className="primary" disabled={!!state.research||state.cash<t.cost*.1} onClick={()=>setState(startResearch(state,t.id))}>Research · {money(t.cost)}</button></>}</Card>)}</div></Card></div>
}

function Facilities({state,setState}){
  const defs={studios:['Soundstages',1800000,'Scripted and reality filming capacity'],post:['Post Suites',900000,'Editing and finishing throughput'],newsroom:['Newsroom Facility',1200000,'Daily news operational capacity'],vfx:['VFX Facility',2400000,'High-end effects capability'],wardrobe:['Wardrobe',500000,'Costume-heavy production support'],setShop:['Set Construction',800000,'Production design and physical set capacity'],control:['Broadcast Control',1000000,'Reliable live playout and network operations'],archive:['Archive',420000,'Library preservation and reuse'],research:['Research Lab',750000,'Technology development speed']};
  return <div className="facility-grid">{Object.entries(defs).map(([k,[name,base,desc]])=>{const lvl=state.facilities[k]||0,cost=base*(lvl+1);return <Card className="pad" key={k}><span className="eyebrow">LEVEL {lvl}</span><h2>{name}</h2><p>{desc}</p><div className="facility-level">{Array.from({length:5}).map((_,i)=><i className={i<lvl?'on':''} key={i}/>)}</div><button disabled={state.cash<cost} onClick={()=>setState(expandFacility(state,k))}>Expand · {money(cost)}</button></Card>})}</div>
}

function Distribution({state,setState}){
  const reach=networkReachHouseholds(state);
  return <div className="page-stack"><div className="metric-grid"><div className="metric"><span>Technical Reach</span><strong>{num(reach)}</strong><small>households</small></div><div className="metric"><span>Owned States</span><strong>{state.states.filter(x=>x.coverage>.05).length}</strong></div><div className="metric"><span>Active Affiliates</span><strong>{state.affiliates.filter(x=>x.status==='Active').length}</strong></div></div>
    <Card className="pad"><SectionTitle title="U.S. Broadcast Footprint" sub="Technical availability does not guarantee audience. Click a state to expand owned transmission coverage."/><div className="us-map">{state.states.map(st=><button title={`${st.code}: ${pct(st.coverage*100)} coverage`} onClick={()=>setState(expandState(state,st.code))} key={st.code} style={{gridColumn:st.col,gridRow:st.row,'--cov':st.coverage}} className={st.coverage>.7?'high':st.coverage>.15?'mid':''}><b>{st.code}</b><span>{Math.round(st.coverage*100)}%</span></button>)}</div></Card>
    <Card className="pad"><SectionTitle title="Affiliate Market" sub="Affiliates expand reach without requiring PCN to own every local station."/><div className="candidate-grid">{state.affiliates.map(af=><Card className="candidate-card" key={af.id}><span className="eyebrow">{af.market} · Local partner</span><h3>{af.station}</h3><p>{num(af.households)} households · {af.term} years · keeps {af.localMinutes} local ad min/hr</p><StatBar label="Station quality" value={af.quality}/>{af.status==='Active'?<Pill tone="ok">PCN Affiliate</Pill>:<button className="primary" disabled={state.cash<af.ask*.25} onClick={()=>setState(signAffiliate(state,af.id))}>Sign · {money(af.ask)}/yr</button>}</Card>)}</div></Card>
  </div>
}

function Newsroom({state,setState}){
  const n=state.newsroom;const controls=[['reporters','Reporters'],['bureaus','Bureaus'],['weather','Weather Unit'],['sportsDesk','Sports Desk'],['investigative','Investigative Team']];
  return <div className="split-layout"><Card className="pad"><SectionTitle title="PCN News" sub="Trust compounds slowly and can become a durable network asset."/><div className="newsroom-score"><b>{Math.round(n.trust)}</b><span>Trust</span></div><StatBar label="Network trust" value={state.network.trust}/><MoneyStatLike label="Annual newsroom budget" value={money(n.budget)}/></Card><Card className="pad"><SectionTitle title="News Operation" sub="Expand permanent reporting capability."/>{controls.map(([k,l])=><div className="capacity-row" key={k}><div><b>{l}</b><span>Capacity {n[k]}</span></div><div><button disabled={n[k]<=0} onClick={()=>setState(updateNewsroom(state,k,-1))}>−</button><button onClick={()=>setState(updateNewsroom(state,k,1))}>+</button></div></div>)}</Card></div>
}
function MoneyStatLike({label,value}){return <div className="money-stat"><span>{label}</span><b>{value}</b></div>}

function Automation({state,setState}){
  const rows=[['ads','Ad Sales','Automatically accept the strongest available ad campaign when inventory is free.'],['production','Production Triage','Automatically nudge writing priority upward when episode runway becomes dangerous.'],['schedule','Schedule Assistant','Prepared for future smart slot optimization; keeps the setting persistent now.'],['affiliates','Distribution Assistant','Prepared for future affiliate deal triage; keeps the setting persistent now.']];
  return <Card className="pad"><SectionTitle title="Executive Delegation" sub="The player manages priorities and exceptions; strong departments can absorb routine work."/><div className="automation-list">{rows.map(([k,l,d])=><label className="toggle-row" key={k}><div><b>{l}</b><span>{d}</span></div><input type="checkbox" checked={!!state.automation[k]} onChange={e=>setState(setAutomation(state,k,e.target.checked))}/></label>)}</div></Card>
}

function NetworkSettings({state,setState}){
  const [f,setF]=useState({...state.network});const set=(k,v)=>setF(x=>({...x,[k]:v}));
  return <div className="split-layout"><Card className="pad"><SectionTitle title="Network Identity" sub="Create a recognizable mark that survives from local station to national network."/><div className="form-grid"><label className="full">Network name<input value={f.name} onChange={e=>set('name',e.target.value)}/></label><label>Initials<input value={f.initials} maxLength="5" onChange={e=>set('initials',e.target.value.toUpperCase())}/></label><label>Icon<select value={f.icon} onChange={e=>set('icon',e.target.value)}>{['★','●','◆','▲','✦','✚','☀','⚡','♣','♥','⬟','◉','🐦'].map(x=><option key={x}>{x}</option>)}</select></label><label>Shape color<input type="color" value={f.primary} onChange={e=>set('primary',e.target.value)}/></label><label>Icon color<input type="color" value={f.secondary} onChange={e=>set('secondary',e.target.value)}/></label><button className="primary full" onClick={()=>setState(updateNetwork(state,{name:f.name,initials:f.initials,icon:f.icon,primary:f.primary,secondary:f.secondary}))}>Apply Rebrand</button></div></Card><Card className="pad"><SectionTitle title="Live Preview"/><div className="brand-seal-large" style={{'--primary':f.primary,'--secondary':f.secondary}}><i>{f.icon}</i><b>{f.initials}</b><span>{f.name}</span></div></Card></div>
}
