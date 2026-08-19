import React, { useState } from 'react';
import { money, num, pct } from '../game/utils.js';
import { getIP, programPnL } from '../game/simulation.js';

export function Card({children,className='',onClick}){return <section className={`card ${className}`} onClick={onClick}>{children}</section>}
export function SectionTitle({title,sub,actions}){return <div className="section-title"><div><h2>{title}</h2>{sub&&<p>{sub}</p>}</div>{actions&&<div className="section-actions">{actions}</div>}</div>}
export function Metric({label,value,sub,tone=''}){return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>}
export function Pill({children,tone=''}){return <span className={`pill ${tone}`}>{children}</span>}
export function Progress({value,max=100,label}){const p=Math.max(0,Math.min(100,(Number(value||0)/Math.max(1,max))*100));return <div className="progress-wrap">{label&&<div className="progress-label"><span>{label}</span><b>{Math.round(value||0)}{max===100?'%':''}</b></div>}<div className="progress"><i style={{width:`${p}%`}} /></div></div>}
export function Tabs({items,value,onChange}){return <div className="tabs" role="tablist">{items.map(([id,label])=><button key={id} className={value===id?'active':''} onClick={()=>onChange(id)}>{label}</button>)}</div>}
export function Empty({children}){return <div className="empty">{children}</div>}
export function Score({label,value,kind=''}){const known=typeof value==='number'&&Number.isFinite(value);return <div className={`score ${kind}`}><span>{label}</span><b>{known?`${label.includes('Critic')?Math.round(value):Number(value).toFixed(1)}${label.includes('Critic')?'%':'/10'}`:'Unrated'}</b></div>}

const posterMotif=p=>{
  const a=p.art||'';
  if(a==='portrait')return <div className="poster-portrait"><i/><b/></div>;
  if(a==='newsdesk')return <div className="poster-news"><i/><i/><b>NEWS</b></div>;
  if(a==='stadium')return <div className="poster-stadium"><i/><b/></div>;
  if(a==='microphone')return <div className="poster-symbol">◉</div>;
  if(a==='music-note')return <div className="poster-symbol musical">♪</div>;
  if(a==='trophy')return <div className="poster-symbol trophy">★</div>;
  if(a==='documentary')return <div className="poster-doc"><i/><b/></div>;
  if(a==='city')return <div className="poster-city"><i/><i/><i/><i/></div>;
  if(a==='cinematic')return <div className="poster-cinematic"><i/><b/></div>;
  return null;
};
export function ProgramPoster({p,compact=false}){
  return <div className={`poster art-${p.art||'cinematic'} font-${p.font||'modern'} ${compact?'compact':''}`} style={{'--p1':p.p1||'#e16634','--p2':p.p2||'#1a2737'}}>
    {posterMotif(p)}<div className="poster-kicker">{p.format} · {p.genre}</div><div className="poster-title">{p.title}</div><div className="poster-season">S{p.season||1}</div>
  </div>
}


export function ProgramCard({state,p,onOpen}){
  const ip=getIP(state,p.ipId),runway=Math.max(0,Math.floor(p.pipeline.ready-p.pipeline.aired)),pnl=programPnL(state,p);
  return <Card className="program-card" onClick={onOpen}>
    <ProgramPoster p={p} compact />
    <div className="program-card-body">
      <div className="program-card-head"><div><h3>{p.title}</h3><span>{p.format} · {p.genre} · S{p.season} · {p.status}</span></div><Pill tone={p.status==='Pre-production'?'warn':runway<=1?'danger':runway<=3?'warn':'ok'}>{p.status==='Pre-production'?'PRE':`${runway} ready`}</Pill></div>
      <div className="score-row"><Score label="Viewer" value={p.premiered?(p.viewer||0)/10:null}/><Score label="Critics" value={p.premiered?p.critic:null}/></div>
      <div className="mini-stats"><span>Popularity <b>{Math.round(ip?.popularity||0)}</b></span><span>Novelty <b>{Math.round(ip?.novelty||0)}</b></span><span>P&L <b className={pnl.contribution>=0?'positive':'negative'}>{money(pnl.contribution)}</b></span></div>
    </div>
  </Card>
}

export function Pipeline({p}){
  const rows=[['Scripts',p.pipeline.scripted],['Pre',p.pipeline.pre],['Filmed',p.pipeline.filmed],['Ready',p.pipeline.ready],['Aired',p.pipeline.aired]];
  return <div className="pipeline">{rows.map(([l,v])=><div key={l}><span>{l}</span><b>{Math.floor(v)} / {p.episodes}</b><div className="progress"><i style={{width:`${Math.min(100,(v/Math.max(1,p.episodes))*100)}%`}}/></div></div>)}</div>
}

export function StatBar({label,value}){return <div className="statbar"><span>{label}</span><div className="progress"><i style={{width:`${Math.max(0,Math.min(100,value||0))}%`}} /></div><b>{Math.round(value||0)}</b></div>}

export function MoneyStat({label,value}){return <div className="money-stat"><span>{label}</span><b className={value>=0?'positive':'negative'}>{money(value)}</b></div>}
export function AudienceStat({label,value}){return <div className="money-stat"><span>{label}</span><b>{num(value)}</b></div>}
export function PercentStat({label,value}){return <div className="money-stat"><span>{label}</span><b>{pct(value)}</b></div>}


export function ConfirmButton({label,confirmLabel='Confirm',onConfirm,disabled=false,className=''}){
  const [armed,setArmed]=useState(false);
  if(!armed)return <button className={className} disabled={disabled} onClick={e=>{e.stopPropagation();setArmed(true)}}>{label}</button>;
  return <span className="confirm-action"><button className="primary" disabled={disabled} onClick={e=>{e.stopPropagation();setArmed(false);onConfirm?.()}}>{confirmLabel}</button><button onClick={e=>{e.stopPropagation();setArmed(false)}}>Cancel</button></span>;
}

export function Drawer({open,title,onClose,children,wide=false}){
  if(!open)return null;
  return <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><aside className={`drawer ${wide?'wide':''}`}><header><h2>{title}</h2><button className="icon-btn" onClick={onClose}>×</button></header><div className="drawer-body">{children}</div></aside></div>
}
