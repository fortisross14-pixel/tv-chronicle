import { BROADCAST_SLOTS, DEMOS, DAYS, DURATION_OPTIONS, FORMAT_EXPERTISE } from './constants.js';
import { advanceDays, audition, beginProduction, canStartProduction, castTalent, commissionScript, greenlightDevelopment, ipSeasonEffect, networkReachHouseholds, programPnL, scheduleProgram, startFacilityBuild, startNegotiation, startStaffSearch } from './simulation.js';
import { seedState } from './seed.js';
import { affinity, dayIndex } from './utils.js';

export const FEATURE_AUDIT = [
  ['Empty-network start','Career starts with cash, local rights, zero programs, zero staff and an empty schedule'],
  ['Three save slots','Three independent localStorage careers with network creation before play'],
  ['Network creator','Name, initials, icon, logo shape/colors, home state and starting expertise'],
  ['Format expertise','0–10 expertise by format; one chosen format begins at two stars'],
  ['Process-first hiring','Create position → wait for shortlist → negotiate → wait for response → hire'],
  ['Process-first facilities','Soundstages and other facilities require construction days'],
  ['Script-first creative flow','Commission script before showrunner/director/casting/production'],
  ['Script shelf','Completed scripts can remain unproduced, be rewritten or be greenlit later'],
  ['Script completion mail','Inbox reports episodes, duration, theme/topic, writer and 1–5 star coverage'],
  ['Emergent starting novelty','No novelty slider; format/genre/theme/angle/writer determine novelty'],
  ['30/60/120 originals','Original episode duration constrained to 30m, 1h or 2h'],
  ['Pre-production gate','Showrunner, director, cast and soundstage required before production starts'],
  ['Casting & chemistry','Role auditions, chemistry reads, casting and recasting after greenlight'],
  ['Production over time','Episodes progress through pre-production, filming and post-production'],
  ['Delivery mail','First delivered episode and full-season delivery produce inbox events'],
  ['Premiere mail','First airing reveals IMDb-style viewer and Rotten-style critic scores by email'],
  ['Outlook-style programming','Half-hour calendar blocks from 9–12 and 3–12'],
  ['Duration consumes schedule','30m/60m/120m programs occupy 1/2/4 cells; sports may run 3h into overnight'],
  ['Acquired movie/library packages','Finished rights packages are schedulable immediately'],
  ['Popularity vs novelty','IP tracks popularity, novelty, fatigue, fandom and flexibility'],
  ['Season continuity','Next season reuses IP/identity while creative-change choice affects popularity/novelty'],
  ['Viewer vs critics','Separate reception scores from audience size'],
  ['Eight audience groups','Age × gender affinity vectors'],
  ['Sports rights auctions','Multi-year rights bidding and three-hour live programming'],
  ['IP marketplace','Granular adaptation rights and IP value'],
  ['Advertising & sponsorship','Audience-targeted commercial systems retained'],
  ['Program P&L','Production, marketing, licensing and contribution tracking'],
  ['Research','Technology capabilities develop over time'],
  ['Geographic reach','50-state footprint with local starting rights and expansion'],
  ['Affiliates','Station partnerships can extend reach'],
  ['Mobile-first navigation','Bottom nav, responsive inbox, calendars, cards and safe areas'],
  ['Vite + React + GitHub','Modular React source, Vite scripts and GitHub Pages workflow']
];

const mins=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};

export function runStateQA(s){
  const results=[],check=(name,ok,detail='')=>results.push({name,ok:!!ok,detail});
  check('Version is v0.3',s.version==='0.3.0',s.version);
  check('Cash is numeric',Number.isFinite(s.cash),String(s.cash));
  check('50-state footprint represented',s.states.length===50,`${s.states.length} states`);
  check('State coverage bounded',s.states.every(x=>x.coverage>=0&&x.coverage<=1));
  check('All programs reference an IP',s.programs.every(p=>s.ips.some(ip=>ip.id===p.ipId)));
  check('Schedule blocks resolve',DAYS.every(d=>(s.scheduleBlocks[d]||[]).every(b=>s.programs.some(p=>p.id===b.programId))));
  check('Schedule start times are valid',DAYS.every(d=>(s.scheduleBlocks[d]||[]).every(b=>BROADCAST_SLOTS.includes(b.start))));
  check('Schedule has no overlaps',DAYS.every(d=>{const bs=s.scheduleBlocks[d]||[];return bs.every((b,i)=>bs.every((c,j)=>i===j||!(mins(b.start)<mins(c.start)+(s.programs.find(p=>p.id===c.programId)?.duration||c.duration)&&mins(c.start)<mins(b.start)+(s.programs.find(p=>p.id===b.programId)?.duration||b.duration))))}));
  check('No program crosses noon blackout',DAYS.every(d=>(s.scheduleBlocks[d]||[]).every(b=>{const p=s.programs.find(x=>x.id===b.programId),a=mins(b.start),e=a+(p?.duration||b.duration||30);return !(a<720&&e>720)})));
  check('Production pipeline ordering',s.programs.every(p=>p.pipeline.scripted+1e-5>=p.pipeline.pre&&p.pipeline.pre+1e-5>=p.pipeline.filmed&&p.pipeline.filmed+1e-5>=p.pipeline.ready&&p.pipeline.ready+1e-5>=p.pipeline.aired));
  check('Production counters nonnegative',s.programs.every(p=>Object.values(p.pipeline).every(v=>v>=0)));
  check('Original development durations valid',s.developments.every(d=>DURATION_OPTIONS.includes(Number(d.duration))));
  check('No user-set starting novelty field',s.developments.every(d=>!('startingNovelty' in d)));
  check('Writing projects hide novelty until complete',s.developments.filter(d=>['Writing','Rewrite'].includes(d.status)).every(d=>d.novelty===null||Number.isFinite(d.novelty)));
  check('Completed scripts have 1–5 star rating',s.developments.filter(d=>['Complete','Greenlit'].includes(d.status)).every(d=>d.scriptStars>=1&&d.scriptStars<=5));
  check('All eight audience segments exist',s.developments.every(d=>DEMOS.every(([k])=>Number.isFinite(d.target?.[k])))&&s.programs.every(p=>DEMOS.every(([k])=>Number.isFinite(p.target?.[k]))));
  check('IP scores bounded',s.ips.every(ip=>['popularity','novelty','fatigue','prestige','fandom','flexibility'].every(k=>(ip[k]??50)>=0&&(ip[k]??50)<=100)));
  check('Format expertise configured',FORMAT_EXPERTISE.every(f=>Number.isFinite(s.network.expertise?.[f])&&s.network.expertise[f]>=0&&s.network.expertise[f]<=10));
  check('Hiring process arrays configured',Array.isArray(s.staffSearches)&&Array.isArray(s.candidateShortlists)&&Array.isArray(s.negotiations));
  check('Candidate market configured',Array.isArray(s.candidateMarket)&&s.candidateMarket.length>=0);
  check('Facility projects configured',Array.isArray(s.facilityProjects));
  check('Inbox configured',Array.isArray(s.emails)&&s.emails.every(m=>m.id&&m.subject&&typeof m.read==='boolean'));
  check('Technology tree populated',s.tech.length>=8);
  check('Rights markets populated',s.ipMarket.length>0&&s.sports.length>0);
  check('Affiliate market configured',Array.isArray(s.affiliates)&&s.affiliates.length>0);
  check('Streaming state configured',s.streaming&&['Hybrid','Subscription','Advertising'].includes(s.streaming.model));
  check('Program P&Ls are numeric',s.programs.every(p=>Number.isFinite(programPnL(s,p).contribution)));
  const hit={popularity:92,novelty:34,fatigue:12,flexibility:62},safe=ipSeasonEffect(hit,25),radical=ipSeasonEffect(hit,90);
  check('Moderate refresh preserves hit popularity',safe.retainedPopularity>80,`${safe.retainedPopularity.toFixed(1)}`);
  check('Radical reinvention gains novelty',radical.newNovelty>safe.newNovelty,`${safe.newNovelty.toFixed(1)} → ${radical.newNovelty.toFixed(1)}`);
  check('Radical reinvention risks popularity',radical.retainedPopularity<safe.retainedPopularity-20,`${safe.retainedPopularity.toFixed(1)} → ${radical.retainedPopularity.toFixed(1)}`);
  return results;
}

function recruit(state,role,count=1){
  let s=startStaffSearch(state,role);s=advanceDays(s,10);const sl=[...s.candidateShortlists].reverse().find(x=>x.role===role);if(!sl)return s;
  sl.candidateIds.slice(0,count).forEach(id=>{const c=s.candidateMarket.find(x=>x.id===id);if(c)s=startNegotiation(s,id,c.ask*1.5,5,0,2,80)});s=advanceDays(s,5);return s;
}

export function runOpeningScenario(){
  let s=seedState({name:'QA Network',initials:'QAN',focus:'Scripted',home:'VA'}),steps=[];const check=(name,ok,detail='')=>steps.push({name,ok:!!ok,detail});
  check('Starts with zero programs',s.programs.length===0,String(s.programs.length));
  check('Starts with zero staff',s.employees.length===0,String(s.employees.length));
  check('Starts with empty schedule',DAYS.every(d=>s.scheduleBlocks[d].length===0));
  check('Selected expertise starts at two stars',s.network.expertise.Scripted===4,`${s.network.expertise.Scripted}/10`);

  s=recruit(s,'Writer',1);const writer=s.employees.find(e=>e.role==='Writer');check('Writer recruited through process',!!writer,writer?.name||'none');
  if(writer){s=commissionScript(s,{title:'Orbit House',format:'Reality',genre:'Survival',episodes:2,duration:30,theme:'Space',topic:'Contestants survive together on an orbital habitat',angle:'Experimental',primary:'youngMen',secondary:'youngWomen',writerId:writer.id,target:affinity({youngMen:90,youngWomen:72}),ipId:'new',art:'ring',font:'condensed',p1:'#efc84f',p2:'#3b244e'});check('Commission creates writing process',s.developments.some(d=>d.title==='Orbit House'&&d.status==='Writing'));s=advanceDays(s,100);}
  const dev=s.developments.find(d=>d.title==='Orbit House');check('Script completes with rating',dev?.status==='Complete'&&dev.scriptStars>=1&&dev.scriptStars<=5,dev?`${dev.scriptStars}★`:'none');check('Novelty emerged from creative inputs',Number.isFinite(dev?.novelty)&&dev.novelty>30,dev?String(Math.round(dev.novelty)):'none');check('Script-finalized email sent',s.emails.some(m=>m.subject==='Script finalized: Orbit House'));

  s=startFacilityBuild(s,'studios');check('Stage construction is not instant',s.facilities.studios===0&&s.facilityProjects.some(x=>x.key==='studios'));s=advanceDays(s,61);check('Stage completes after time',s.facilities.studios>=1,String(s.facilities.studios));
  s=recruit(s,'Showrunner',1);s=recruit(s,'Director',1);s=recruit(s,'Actor',3);
  const sr=s.employees.find(e=>e.role==='Showrunner'),dir=s.employees.find(e=>e.role==='Director');check('Creative leaders recruited',!!sr&&!!dir,`${sr?.name||'none'} / ${dir?.name||'none'}`);
  if(dev&&sr&&dir){s=greenlightDevelopment(s,dev.id,{showrunnerId:sr.id,directorId:dir.id,budgetPerEpisode:250000});}
  const p=s.programs.find(x=>x.title==='Orbit House');check('Greenlight creates pre-production, not instant show',p?.status==='Pre-production',p?.status||'none');
  if(p){const actors=s.employees.filter(e=>e.role==='Actor');p.roles.forEach((role,i)=>{if(actors[i]){s=audition(s,p.id,actors[i].id,role.id);s=castTalent(s,p.id,actors[i].id,role.id)}});const before=canStartProduction(s,s.programs.find(x=>x.id===p.id));check('Production gate opens only after stage/team/cast',before.ok,before.reason);s=beginProduction(s,p.id);check('Begin production changes status',s.programs.find(x=>x.id===p.id)?.status==='Production');s=advanceDays(s,60);const produced=s.programs.find(x=>x.id===p.id);check('Production delivers episodes over time',Math.floor(produced.pipeline.ready)>=1,`${produced.pipeline.ready.toFixed(1)} ready`);const day=DAYS[dayIndex(s.date)];s=scheduleProgram(s,day,'20:00',p.id);check('30m show occupies calendar block',s.scheduleBlocks[day].some(b=>b.programId===p.id&&b.start==='20:00'));s=advanceDays(s,1);const aired=s.programs.find(x=>x.id===p.id);check('Premiere reveals viewer/critic scores',aired.premiered&&aired.viewer>0&&aired.critic>0,`${aired.viewer/10} / ${aired.critic}%`);check('Premiere ratings email sent',s.emails.some(m=>m.subject===`Premiere report: ${p.title}`));}
  return {state:s,steps};
}

export function runBalanceQA(days=180){
  const idle=advanceDays(seedState(),days),scenario=runOpeningScenario(),checks=[...runStateQA(scenario.state),...scenario.steps];return {days,date:idle.date,cash:idle.cash,reach:networkReachHouseholds(idle),audience:scenario.state.weeklyAudience,programs:scenario.state.programs.length,passed:checks.filter(x=>x.ok).length,total:checks.length,checks};
}
