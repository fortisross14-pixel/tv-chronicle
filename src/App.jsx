import React, { useEffect, useMemo, useState } from 'react';
import Dashboard from './screens/Dashboard.jsx';
import Studio from './screens/Studio.jsx';
import Channel from './screens/Channel.jsx';
import Business from './screens/Business.jsx';
import Organization from './screens/Organization.jsx';
import QA from './screens/QA.jsx';
import { NAV } from './game/constants.js';
import { seedState } from './game/seed.js';
import { advanceDays } from './game/simulation.js';
import { fmtDate, money } from './game/utils.js';

const SAVE_KEY='tvEmpireSim_v02_react';

function load(){
  try{const raw=localStorage.getItem(SAVE_KEY);if(raw){const s=JSON.parse(raw);if(s?.version==='0.2.0')return s}}catch{}
  return seedState();
}

export default function App(){
  const [state,setStateRaw]=useState(load);
  const [page,setPage]=useState('dashboard');
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState('');

  const setState=(next)=>setStateRaw(typeof next==='function'?next:next);
  useEffect(()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(state))}catch{}},[state]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2400);return()=>clearTimeout(t)},[toast]);

  const advance=(days,label)=>{
    setBusy(true);
    setTimeout(()=>{
      setStateRaw(s=>advanceDays(s,days));setBusy(false);setToast(`Advanced ${label}`);
    },20);
  };

  const reset=()=>{if(confirm('Reset this save and start a fresh PCN game?')){setStateRaw(seedState());setPage('dashboard')}};
  const screen={dashboard:<Dashboard state={state} onNavigate={setPage}/>,studio:<Studio state={state} setState={setState}/>,channel:<Channel state={state} setState={setState}/>,business:<Business state={state} setState={setState}/>,organization:<Organization state={state} setState={setState}/>,qa:<QA state={state}/>} [page];

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand-button" onClick={()=>setPage('dashboard')}>
        <span className="brand-mark" style={{'--primary':state.network.primary,'--secondary':state.network.secondary}}>{state.network.icon}</span>
        <span><b>{state.network.initials}</b><small>TV EMPIRE</small></span>
      </button>
      <nav>{NAV.map(([id,label,icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><i>{icon}</i><span>{label}</span></button>)}</nav>
      <div className="sidebar-foot"><small>{fmtDate(state.date)}</small><b>{money(state.cash)}</b><button onClick={reset}>Reset save</button></div>
    </aside>

    <div className="main-shell">
      <header className="topbar">
        <div className="mobile-brand"><span className="brand-mark" style={{'--primary':state.network.primary,'--secondary':state.network.secondary}}>{state.network.icon}</span><b>{state.network.initials}</b></div>
        <div className="date-block"><span>SIMULATION DATE</span><b>{fmtDate(state.date)}</b></div>
        <div className="top-metrics"><span>Cash <b>{money(state.cash)}</b></span><span>Last day <b>{money(state.lastDayRevenue)}</b></span></div>
        <div className="time-controls"><button disabled={busy} onClick={()=>advance(1,'1 day')}>+ Day</button><button disabled={busy} onClick={()=>advance(7,'1 week')}>+ Week</button><button className="primary" disabled={busy} onClick={()=>advance(30,'1 month')}>+ Month</button></div>
      </header>
      <main className={busy?'simulating':''}>{screen}</main>
    </div>

    <nav className="bottom-nav">{NAV.filter(([id])=>id!=='qa').map(([id,label,icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><i>{icon}</i><span>{label}</span></button>)}<button className={page==='qa'?'active':''} onClick={()=>setPage('qa')}><i>⚙</i><span>QA</span></button></nav>
    {busy&&<div className="sim-overlay"><div className="spinner"/><b>Simulating network…</b></div>}
    {toast&&<div className="toast">{toast}</div>}
  </div>
}
