import React, { useEffect, useState } from 'react';
import Dashboard from './screens/Dashboard.jsx';
import Studio from './screens/Studio.jsx';
import Channel from './screens/Channel.jsx';
import Business from './screens/Business.jsx';
import Organization from './screens/Organization.jsx';
import QA from './screens/QA.jsx';
import { FORMAT_EXPERTISE, NAV, STATE_LAYOUT } from './game/constants.js';
import { seedState } from './game/seed.js';
import { advanceDays } from './game/simulation.js';
import { fmtDate, money } from './game/utils.js';

const SAVE_PREFIX='tvEmpireSim_v04_slot_';
const slotKey=n=>`${SAVE_PREFIX}${n}`;
function readFrom(storage,n){try{const raw=storage?.getItem(slotKey(n));if(raw){const s=JSON.parse(raw);if(s?.version==='0.4.0')return s}}catch{}return null;}
function readSlot(n){
  try{const s=readFrom(window.localStorage,n);if(s)return s}catch{}
  try{const s=readFrom(window.sessionStorage,n);if(s)return s}catch{}
  return null;
}
function persistSlot(n,state){
  const raw=JSON.stringify(state);
  try{window.localStorage.setItem(slotKey(n),raw);return {ok:true,persistent:true}}catch(localError){
    try{window.sessionStorage.setItem(slotKey(n),raw);return {ok:true,persistent:false,error:localError}}catch(sessionError){
      console.warn('TV Empire save storage unavailable',localError,sessionError);
      return {ok:false,persistent:false,error:sessionError||localError};
    }
  }
}
function removeSlot(n){try{window.localStorage.removeItem(slotKey(n))}catch{}try{window.sessionStorage.removeItem(slotKey(n))}catch{}}
function slotSummaries(){return [1,2,3].map(n=>({n,state:readSlot(n)}));}

export default function App(){
  const [activeSlot,setActiveSlot]=useState(null);
  const [state,setStateRaw]=useState(null);
  const [page,setPage]=useState('dashboard');
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState('');
  const [storageWarning,setStorageWarning]=useState('');
  const [slots,setSlots]=useState(slotSummaries);

  const setState=next=>setStateRaw(typeof next==='function'?next(state):next);
  useEffect(()=>{if(activeSlot&&state){const saved=persistSlot(activeSlot,state);if(saved.ok){setSlots(slotSummaries());if(!saved.persistent)setStorageWarning('Temporary session save only — this browser is blocking persistent storage.')}else setStorageWarning('Autosave is unavailable in this browser. The current game will keep running, but leaving the page may lose progress.')}},[state,activeSlot]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2400);return()=>clearTimeout(t)},[toast]);

  const openSlot=n=>{const s=readSlot(n);if(s){setActiveSlot(n);setStateRaw(s);setPage('dashboard')}};
  const createSlot=(n,form)=>{
    try{
      const s=seedState(form);
      // Enter the career first. Mobile privacy/storage restrictions must never block Launch Network.
      setActiveSlot(n);setStateRaw(s);setPage('dashboard');
      const saved=persistSlot(n,s);
      if(saved.ok){setSlots(slotSummaries());if(!saved.persistent){setStorageWarning('Temporary session save only — this browser is blocking persistent storage.');setToast('Network launched — temporary save mode')}}
      else{setStorageWarning('Autosave is unavailable in this browser. The current game will keep running, but leaving the page may lose progress.');setToast('Network launched — autosave unavailable')}
      return {ok:true,persistent:saved.persistent};
    }catch(error){
      console.error('Unable to launch network',error);
      return {ok:false,error:'The network could not be created. Please try again; no save data was changed.'};
    }
  };
  const deleteSlot=n=>{if(confirm(`Delete save slot ${n}?`)){removeSlot(n);setSlots(slotSummaries())}};
  const backToSlots=()=>{setActiveSlot(null);setStateRaw(null);setPage('dashboard');setSlots(slotSummaries())};

  if(!activeSlot||!state)return <SaveLobby slots={slots} onOpen={openSlot} onCreate={createSlot} onDelete={deleteSlot}/>;

  const advance=(days,label)=>{setBusy(true);setTimeout(()=>{setStateRaw(s=>advanceDays(s,days));setBusy(false);setToast(`Advanced ${label}`)},20)};
  const screen={dashboard:<Dashboard state={state} setState={setStateRaw} onNavigate={setPage}/>,studio:<Studio state={state} setState={setStateRaw}/>,channel:<Channel state={state} setState={setStateRaw}/>,business:<Business state={state} setState={setStateRaw}/>,organization:<Organization state={state} setState={setStateRaw}/>,qa:<QA state={state}/>} [page];

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand-button" onClick={()=>setPage('dashboard')}>
        <span className={`brand-mark shape-${state.network.shape||'circle'}`} style={{'--primary':state.network.primary,'--secondary':state.network.secondary}}>{state.network.icon}</span>
        <span><b>{state.network.initials}</b><small>TV EMPIRE</small></span>
      </button>
      <nav>{NAV.map(([id,label,icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><i>{icon}</i><span>{label}</span>{id==='dashboard'&&state.emails?.some(m=>!m.read)&&<em className="nav-badge">{state.emails.filter(m=>!m.read).length}</em>}</button>)}</nav>
      <div className="sidebar-foot"><small>Save Slot {activeSlot}</small><small>{fmtDate(state.date)}</small><b>{money(state.cash)}</b><button onClick={backToSlots}>Save menu</button></div>
    </aside>

    <div className="main-shell">
      <header className="topbar">
        <div className="mobile-brand"><span className={`brand-mark shape-${state.network.shape||'circle'}`} style={{'--primary':state.network.primary,'--secondary':state.network.secondary}}>{state.network.icon}</span><b>{state.network.initials}</b></div>
        <div className="date-block"><span>SIMULATION DATE</span><b>{fmtDate(state.date)}</b></div>
        <div className="top-metrics"><span>Cash <b>{money(state.cash)}</b></span><span>Unread <b>{state.emails.filter(m=>!m.read).length}</b></span></div>
        <div className="time-controls"><button disabled={busy} onClick={()=>advance(1,'1 day')}>+ Day</button><button disabled={busy} onClick={()=>advance(7,'1 week')}>+ Week</button><button className="primary" disabled={busy} onClick={()=>advance(30,'1 month')}>+ Month</button></div>
      </header>
      <main className={busy?'simulating':''}>{screen}</main>
    </div>

    <nav className="bottom-nav">{NAV.filter(([id])=>id!=='qa').map(([id,label,icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><i>{icon}</i><span>{label}</span>{id==='dashboard'&&state.emails?.some(m=>!m.read)&&<em className="nav-badge">{Math.min(99,state.emails.filter(m=>!m.read).length)}</em>}</button>)}<button className={page==='qa'?'active':''} onClick={()=>setPage('qa')}><i>⚙</i><span>QA</span></button></nav>
    {storageWarning&&<div className="storage-warning" role="status">{storageWarning}</div>}
    {busy&&<div className="sim-overlay"><div className="spinner"/><b>Advancing the network…</b></div>}
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}

function SaveLobby({slots,onOpen,onCreate,onDelete}){
  const [creating,setCreating]=useState(null);
  return <div className="save-lobby"><div className="save-hero"><span className="eyebrow">TV EMPIRE SIMULATOR</span><h1>Build a network from dead air.</h1><p>Three independent careers. Each begins with a local license, capital, an empty schedule and no staff.</p></div><div className="save-grid">{slots.map(({n,state})=><div className={`save-card ${state?'occupied':'empty'}`} key={n}><span className="eyebrow">SAVE SLOT {n}</span>{state?<><div className={`brand-mark big shape-${state.network.shape||'circle'}`} style={{'--primary':state.network.primary,'--secondary':state.network.secondary}}>{state.network.icon}</div><h2>{state.network.name}</h2><p>{state.network.initials} · {fmtDate(state.date)}</p><div className="save-stats"><span>Cash <b>{money(state.cash)}</b></span><span>Programs <b>{state.programs.length}</b></span><span>Staff <b>{state.employees.length}</b></span></div><button className="primary" onClick={()=>onOpen(n)}>Continue</button><button className="danger-btn" onClick={()=>onDelete(n)}>Delete</button></>:<><div className="empty-slot-icon">＋</div><h2>Empty career</h2><p>Create a new local network.</p><button className="primary" onClick={()=>setCreating(n)}>Create Network</button></>}</div>)}</div>{creating&&<NetworkSetup slot={creating} onClose={()=>setCreating(null)} onCreate={f=>onCreate(creating,f)}/>}</div>
}

function NetworkSetup({slot,onClose,onCreate}){
  const [f,setF]=useState({name:'Prebost Community Network',initials:'PCN',icon:'🐦',shape:'circle',primary:'#f1c232',secondary:'#c8222f',focus:'Scripted',home:'VA'});
  const [launchError,setLaunchError]=useState('');
  const [launching,setLaunching]=useState(false);
  const set=(k,v)=>setF(x=>({...x,[k]:v}));
  const launch=()=>{
    if(launching||!f.name.trim()||!f.initials.trim())return;
    setLaunchError('');setLaunching(true);
    try{const result=onCreate(f);if(!result?.ok){setLaunching(false);setLaunchError(result?.error||'Unable to launch this network. Please try again.')}}
    catch(error){console.error('Launch Network failed',error);setLaunching(false);setLaunchError('Unable to launch this network. Please try again.')}
  };
  return <div className="modal-backdrop"><div className="setup-modal"><button type="button" className="drawer-close" onClick={onClose} aria-label="Close network setup">×</button><span className="eyebrow">NEW CAREER · SLOT {slot}</span><h1>Create your network</h1><p>You receive $20M, a basic local transmitter/control room and no staff or programming. Choose one format in which the founders have two stars of starting expertise.</p><div className="setup-grid"><div className="form-grid"><label className="full">Network name<input value={f.name} onChange={e=>set('name',e.target.value)}/></label><label>Initials<input maxLength="5" value={f.initials} onChange={e=>set('initials',e.target.value.toUpperCase())}/></label><label>Home state<select value={f.home} onChange={e=>set('home',e.target.value)}>{STATE_LAYOUT.map(([code])=><option key={code}>{code}</option>)}</select></label><label>Logo icon<select value={f.icon} onChange={e=>set('icon',e.target.value)}>{['★','●','◆','▲','✦','☀','⚡','♣','♥','⬟','◉','🐦','📺'].map(x=><option key={x}>{x}</option>)}</select></label><label>Logo shape<select value={f.shape} onChange={e=>set('shape',e.target.value)}><option value="circle">Circle</option><option value="square">Square</option><option value="diamond">Diamond</option><option value="shield">Shield</option></select></label><label>Shape color<input type="color" value={f.primary} onChange={e=>set('primary',e.target.value)}/></label><label>Icon color<input type="color" value={f.secondary} onChange={e=>set('secondary',e.target.value)}/></label><label className="full">Starting expertise<select value={f.focus} onChange={e=>set('focus',e.target.value)}>{FORMAT_EXPERTISE.map(x=><option key={x}>{x}</option>)}</select><small>{f.focus}: 4/10 · ★★☆☆☆. All other formats begin at 0/10.</small></label></div><div className="network-create-preview"><div className={`brand-seal-large shape-${f.shape}`} style={{'--primary':f.primary,'--secondary':f.secondary}}><i>{f.icon}</i><b>{f.initials}</b><span>{f.name}</span></div><div className="start-conditions"><b>Opening conditions</b><span>$20.0M cash</span><span>Local emission rights: {f.home}</span><span>0 programs</span><span>0 employees</span><span>0 soundstages</span><span>Empty schedule</span></div></div></div>{launchError&&<div className="launch-error" role="alert"><b>Launch failed</b><span>{launchError}</span></div>}<button type="button" className="primary big full launch-network-btn" disabled={launching||!f.name.trim()||!f.initials.trim()} onClick={launch}>{launching?'Launching…':'Launch Network'}</button></div></div>
}
