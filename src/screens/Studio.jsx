import React, { useMemo, useState } from 'react';
import { Card, Drawer, Empty, Pipeline, Pill, ProgramCard, ProgramPoster, Score, SectionTitle, StatBar, Tabs, MoneyStat } from '../components/UI.jsx';
import { ART_STYLES, DEMOS, FONT_STYLES, FORMATS, PALETTES } from '../game/constants.js';
import { affinity, money, pct } from '../game/utils.js';
import { audition, castTalent, createLicenseDeal, createMerchDeal, createProgram, createSpinOff, getEmployee, getIP, programPnL, renewProgram, rewriteScript, runPromotion, setMarketing, updateProductionPlan } from '../game/simulation.js';

const focusKeys=[['writing','Writing'],['cast','Cast'],['design','Production Design'],['vfx','VFX'],['music','Music'],['sound','Sound'],['image','Image / Camera']];

export default function Studio({state,setState}){
  const [tab,setTab]=useState('slate');
  const [selected,setSelected]=useState(null);
  const p=selected?state.programs.find(x=>x.id===selected):null;
  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">QUADRANT I</span><h1>Studio</h1><p>Develop, cast, produce and grow television properties.</p></div><button className="primary" onClick={()=>setTab('create')}>+ Develop Program</button></div>
    <Tabs value={tab} onChange={setTab} items={[["slate","Production Slate"],["create","Create"],["ip","IP Library"],["casting","Casting"],["scripts","Scripts"]]}/>
    {tab==='slate'&&<Slate state={state} onOpen={setSelected}/>} 
    {tab==='create'&&<CreateShow state={state} setState={setState} onDone={()=>setTab('slate')}/>} 
    {tab==='ip'&&<IPLibrary state={state} setState={setState}/>} 
    {tab==='casting'&&<Casting state={state} setState={setState}/>} 
    {tab==='scripts'&&<Scripts state={state} setState={setState}/>} 
    <ProgramDrawer state={state} setState={setState} p={p} onClose={()=>setSelected(null)}/>
  </div>
}

function Slate({state,onOpen}){
  const sorted=[...state.programs].sort((a,b)=>Math.floor(a.pipeline.ready-a.pipeline.aired)-Math.floor(b.pipeline.ready-b.pipeline.aired));
  return <div className="program-grid">{sorted.map(p=><ProgramCard key={p.id} state={state} p={p} onOpen={()=>onOpen(p.id)}/>)}</div>
}

function CreateShow({state,setState,onDone}){
  const [form,setForm]=useState({title:'',format:'Scripted',genre:'Drama',episodes:10,duration:60,primary:'adultWomen',secondary:'adultMen',art:'ring',font:'condensed',p1:PALETTES[1][0],p2:PALETTES[1][1],ipId:'new',scriptStars:3,novelty:72,flexibility:60,merchPotential:35,marketing:15,locationScale:'Regional',travel:'Low',showrunner:'',leadWriter:'',leadTalent:'',director:''});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const genres=FORMATS[form.format]||[];
  const preview={title:form.title||'UNTITLED',format:form.format,genre:form.genre,season:1,art:form.art,font:form.font,p1:form.p1,p2:form.p2};
  const employees=state.employees;
  const submit=e=>{e.preventDefault();const target=affinity({[form.primary]:90,[form.secondary]:68});setState(createProgram(state,{...form,target}));onDone();};
  return <div className="split-layout">
    <Card className="pad">
      <SectionTitle title="Development Brief" sub="A show begins as a creative and operational commitment."/>
      <form className="form-grid" onSubmit={submit}>
        <label className="full">Title<input value={form.title} onChange={e=>set('title',e.target.value)} required placeholder="e.g. The Long Night"/></label>
        <label>Format<select value={form.format} onChange={e=>{set('format',e.target.value);set('genre',FORMATS[e.target.value][0])}}>{Object.keys(FORMATS).map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Genre<select value={form.genre} onChange={e=>set('genre',e.target.value)}>{genres.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Episodes<input type="number" min="1" max="780" value={form.episodes} onChange={e=>set('episodes',e.target.value)}/></label>
        <label>Minutes<input type="number" min="15" max="240" step="15" value={form.duration} onChange={e=>set('duration',e.target.value)}/></label>
        <label>Production Scale<select value={form.locationScale} onChange={e=>set('locationScale',e.target.value)}><option>Regional</option><option>National</option><option>International</option></select></label>
        <label>Travel / Location Load<select value={form.travel} onChange={e=>set('travel',e.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label>
        <label>Primary Audience<select value={form.primary} onChange={e=>set('primary',e.target.value)}>{DEMOS.map(([k,l])=><option value={k} key={k}>{l}</option>)}</select></label>
        <label>Secondary Audience<select value={form.secondary} onChange={e=>set('secondary',e.target.value)}>{DEMOS.map(([k,l])=><option value={k} key={k}>{l}</option>)}</select></label>
        <label>Use IP<select value={form.ipId} onChange={e=>set('ipId',e.target.value)}><option value="new">Create original IP</option>{state.ips.map(ip=><option value={ip.id} key={ip.id}>{ip.name}</option>)}</select></label>
        <label>Draft Quality Target<select value={form.scriptStars} onChange={e=>set('scriptStars',e.target.value)}>{[2,2.5,3,3.5,4,4.5].map(x=><option key={x} value={x}>{x} stars</option>)}</select></label>
        {form.ipId==='new'&&<><label>Starting Novelty<input type="range" min="10" max="95" value={form.novelty} onChange={e=>set('novelty',e.target.value)}/><small>{form.novelty}</small></label><label>Format Flexibility<input type="range" min="10" max="95" value={form.flexibility} onChange={e=>set('flexibility',e.target.value)}/><small>{form.flexibility}</small></label></>}
        <label>Showrunner<select value={form.showrunner} onChange={e=>set('showrunner',e.target.value)}><option value="">Unassigned</option>{employees.filter(x=>x.role.includes('Showrunner')||x.role.includes('Producer')).map(x=><option value={x.id} key={x.id}>{x.name} ({x.overall})</option>)}</select></label>
        <label>Lead Writer<select value={form.leadWriter} onChange={e=>set('leadWriter',e.target.value)}><option value="">Unassigned</option>{employees.filter(x=>x.role.includes('Writer')).map(x=><option value={x.id} key={x.id}>{x.name} ({x.overall})</option>)}</select></label>
        <label>Lead Talent<select value={form.leadTalent} onChange={e=>set('leadTalent',e.target.value)}><option value="">Unassigned</option>{employees.filter(x=>x.dept==='Talent').map(x=><option value={x.id} key={x.id}>{x.name} ({x.overall})</option>)}</select></label>
        <label>Director<select value={form.director} onChange={e=>set('director',e.target.value)}><option value="">Unassigned</option>{employees.filter(x=>x.role.includes('Director')).map(x=><option value={x.id} key={x.id}>{x.name} ({x.overall})</option>)}</select></label>
        <div className="full form-divider"><b>Visual identity</b><span>Program art is part of the product, not decoration.</span></div>
        <label>Composition<select value={form.art} onChange={e=>set('art',e.target.value)}>{ART_STYLES.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Typography<select value={form.font} onChange={e=>set('font',e.target.value)}>{FONT_STYLES.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Primary color<input type="color" value={form.p1} onChange={e=>set('p1',e.target.value)}/></label>
        <label>Secondary color<input type="color" value={form.p2} onChange={e=>set('p2',e.target.value)}/></label>
        <button className="primary full" type="submit">Start Development</button>
      </form>
    </Card>
    <Card className="pad sticky-preview"><SectionTitle title="Key Art Preview" sub="Generated from your creative package"/><ProgramPoster p={preview}/><div className="creative-note"><b>{form.primary===form.secondary?'Broad target':'Targeted strategy'}</b><p>Marketing can create sampling, but quality, popularity and novelty determine whether the audience stays.</p></div></Card>
  </div>
}

function IPLibrary({state,setState}){
  const [spin,setSpin]=useState('');
  return <div className="ip-grid">{state.ips.map(ip=><Card className="pad ip-card" key={ip.id}><div className="section-title"><div><span className="eyebrow">{ip.origin}</span><h3>{ip.name}</h3></div><b>{money(ip.value)}</b></div><StatBar label="Popularity" value={ip.popularity}/><StatBar label="Novelty" value={ip.novelty}/><StatBar label="Fandom" value={ip.fandom}/><StatBar label="Fatigue" value={ip.fatigue}/><div className="chips"><Pill>Flex {Math.round(ip.flexibility)}</Pill><Pill>Prestige {Math.round(ip.prestige)}</Pill><Pill>Merch {Math.round(ip.merchPotential||0)}</Pill></div><div className="button-row"><button disabled={ip.fandom<35||state.merchDeals.some(x=>x.ipId===ip.id&&x.status==='Active')} onClick={()=>setState(createMerchDeal(state,ip.id))}>License Merch</button><button onClick={()=>setState(createSpinOff(state,ip.id,`${ip.name}: Aftershow`))}>Create Spin-off</button></div>{ip.rights&&<div className="rights-note"><b>Licensed rights</b><span>{ip.rights.medium} · {ip.rights.territory} · {ip.rights.term}y · Merch split {ip.rights.merchSplit}%</span></div>}</Card>)}</div>
}

function Casting({state,setState}){
  const [pid,setPid]=useState(state.programs.find(p=>['Scripted','Reality','Factual'].includes(p.format))?.id||'');
  const p=state.programs.find(x=>x.id===pid);const [role,setRole]=useState(p?.roles?.[0]?.id||'lead');
  React.useEffect(()=>{setRole(state.programs.find(x=>x.id===pid)?.roles?.[0]?.id||'lead')},[pid]);
  const candidates=[...state.employees.filter(x=>x.dept==='Talent'),...state.candidates.filter(x=>x.dept==='Talent')];
  return <Card className="pad"><SectionTitle title="Casting Office" sub="Cast individual roles. Star power helps sampling; role fit and chemistry help execution."/><div className="form-grid casting-selects"><label>Program<select value={pid} onChange={e=>setPid(e.target.value)}>{state.programs.filter(x=>['Scripted','Reality','Factual'].includes(x.format)).map(x=><option value={x.id} key={x.id}>{x.title}</option>)}</select></label>{p&&<label>Role<select value={role} onChange={e=>setRole(e.target.value)}>{(p.roles||[{id:'lead',name:'Lead'}]).map(r=><option value={r.id} key={r.id}>{r.name}</option>)}</select></label>}</div>{p?<><div className="cast-strip">{(p.roles||[]).map(r=>{const id=p.castAssignments?.[r.id],person=id&&(state.employees.find(x=>x.id===id)||state.candidates.find(x=>x.id===id));return <button className={role===r.id?'active':''} key={r.id} onClick={()=>setRole(r.id)}><span>{r.name}</span><b>{person?.name||'Uncast'}</b></button>})}</div><div className="candidate-grid">{candidates.map(c=>{const a=p.auditions?.find(x=>x.talentId===c.id&&x.roleId===role);return <Card className="candidate-card" key={c.id}><div><h3>{c.name}</h3><span>{c.role} · Overall {c.overall}</span></div><div className="mini-stats"><span>Popularity <b>{Math.round(c.popularity||0)}</b></span><span>Acting <b>{c.skills.acting||'—'}</b></span><span>Charisma <b>{c.skills.charisma||'—'}</b></span></div>{a?<><StatBar label="Role Fit" value={a.fit}/><StatBar label="Chemistry" value={a.chemistry}/><button className="primary" onClick={()=>setState(castTalent(state,p.id,c.id,role))}>Cast in Role</button></>:<button onClick={()=>setState(audition(state,p.id,c.id,role))}>Audition / Chemistry Read</button>}</Card>})}</div></>:<Empty>No program selected.</Empty>}</Card>
}
function Scripts({state,setState}){
  const scripted=state.programs.filter(p=>p.scripts?.length);
  const [pid,setPid]=useState(scripted[0]?.id||'');const p=state.programs.find(x=>x.id===pid);
  return <Card className="pad"><SectionTitle title="Writers' Room" sub="Coverage is guidance, not destiny. Production can elevate or ruin a draft."/><label className="inline-label">Program<select value={pid} onChange={e=>setPid(e.target.value)}>{scripted.map(x=><option value={x.id} key={x.id}>{x.title}</option>)}</select></label>{p?<div className="script-list">{p.scripts.map(sc=><div className="script-row" key={sc.episode}><div><b>E{sc.episode}: {sc.title}</b><span>{'★'.repeat(Math.floor(sc.stars))}{sc.stars%1?'½':''} · {sc.notes}</span></div><button onClick={()=>setState(rewriteScript(state,p.id,sc.episode))}>Request Rewrite</button></div>)}</div>:<Empty>No completed scripts yet. Advance time to let writers work.</Empty>}</Card>
}

function ProgramDrawer({state,setState,p,onClose}){
  const [change,setChange]=useState(25);
  const [focus,setFocus]=useState(p?.productionFocus||{});
  const [technical,setTechnical]=useState(p?.technical||{});
  React.useEffect(()=>{if(p){setFocus({...p.productionFocus});setTechnical({...p.technical})}},[p?.id]);
  if(!p)return null;const ip=getIP(state,p.ipId),pnl=programPnL(state,p);const teamNames=Object.values(p.team||{}).filter(Boolean).map(id=>getEmployee(state,id)?.name).filter(Boolean);
  const can4k=state.tech.find(x=>x.id==='t_4k')?.researched,canHdr=state.tech.find(x=>x.id==='t_hdr')?.researched;
  return <Drawer open title={p.title} onClose={onClose} wide>
    <div className="detail-hero"><ProgramPoster p={p}/><div className="detail-hero-stats"><span className="eyebrow">{p.format} · {p.genre} · Season {p.season}</span><div className="score-row"><Score label="Viewer" value={p.viewer/10}/><Score label="Critics" value={p.critic}/></div><StatBar label="IP Popularity" value={ip?.popularity}/><StatBar label="IP Novelty" value={ip?.novelty}/><StatBar label="Fatigue" value={ip?.fatigue}/><div className="chips"><Pill>{teamNames.join(' · ')||'Team incomplete'}</Pill><Pill>Chemistry {Math.round(p.chemistry||0)}</Pill></div></div></div>
    <SectionTitle title="Episode Pipeline" sub={`${Math.max(0,Math.floor(p.pipeline.ready-p.pipeline.aired))} broadcast-ready episodes in reserve`}/><Pipeline p={p}/>
    <div className="two-col">
      <Card className="subcard"><h3>Production Plan</h3>{focusKeys.map(([k,l])=><label className="range-row" key={k}><span>{l}</span><input type="range" min="0" max="100" value={focus[k]??50} onChange={e=>setFocus(f=>({...f,[k]:Number(e.target.value)}))}/><b>{focus[k]??50}</b></label>)}<div className="form-grid"><label>Resolution<select value={technical.resolution} onChange={e=>setTechnical(t=>({...t,resolution:e.target.value}))}><option>1080p</option><option disabled={!can4k}>4K</option></select></label><label>Audio<select value={technical.audio} onChange={e=>setTechnical(t=>({...t,audio:e.target.value}))}><option>Stereo</option><option>5.1</option><option>Immersive</option></select></label><label className="check full"><input type="checkbox" checked={!!technical.hdr} disabled={!canHdr} onChange={e=>setTechnical(t=>({...t,hdr:e.target.checked}))}/> HDR master {!canHdr&&'(research required)'}</label></div><button className="primary" onClick={()=>setState(updateProductionPlan(state,p.id,focus,technical))}>Apply Production Plan</button></Card>
      <Card className="subcard"><h3>Commercial & IP</h3><label className="range-row"><span>Marketing push</span><input type="range" min="0" max="100" defaultValue={p.marketing||0} onMouseUp={e=>setState(setMarketing(state,p.id,e.currentTarget.value))} onTouchEnd={e=>setState(setMarketing(state,p.id,e.currentTarget.value))}/><b>{Math.round(p.marketing||0)}</b></label><MoneyStat label="Show revenue" value={pnl.revenue}/><MoneyStat label="Production" value={-pnl.production}/><MoneyStat label="Marketing" value={-pnl.marketing}/><MoneyStat label="Contribution" value={pnl.contribution}/><div className="promotion-grid"><button onClick={()=>setState(runPromotion(state,p.id,'network'))}>Network Promos</button><button onClick={()=>setState(runPromotion(state,p.id,'digital'))}>Digital</button><button onClick={()=>setState(runPromotion(state,p.id,'press'))}>Press Tour</button><button onClick={()=>setState(runPromotion(state,p.id,'premiere'))}>Premiere</button><button onClick={()=>setState(runPromotion(state,p.id,'awards'))}>Awards Push</button></div><button disabled={p.airings<2||state.licenses.some(x=>x.programId===p.id&&x.status==='Active')} onClick={()=>setState(createLicenseDeal(state,p.id))}>Create Syndication Deal</button></Card>
    </div>
    <Card className="subcard renewal-card"><div><h3>Renew Season</h3><p>Keep the established identity or refresh it. Too little change raises fatigue; too much can destroy the popularity you already paid to build.</p></div><label className="range-row"><span>Creative change</span><input type="range" min="0" max="100" value={change} onChange={e=>setChange(Number(e.target.value))}/><b>{change}%</b></label><div className="renew-preview"><span>Current popularity <b>{Math.round(ip?.popularity||0)}</b></span><span>Current novelty <b>{Math.round(ip?.novelty||0)}</b></span><span>IP flexibility <b>{Math.round(ip?.flexibility||0)}</b></span></div><button className="primary" onClick={()=>{setState(renewProgram(state,p.id,change));onClose()}}>Order Season {p.season+1}</button></Card>
  </Drawer>
}
