import { BROADCAST_SLOTS, DAYS, DURATION_OPTIONS, FORMATS, FORMAT_EXPERTISE } from './constants.js';
import {
  advanceDays, audition, beginProduction, canStartProduction, castTalent, commissionScript,
  currentProgramRankings, greenlightDevelopment, historicalRecords, ipSeasonEffect, licenseContent,
  networkReachHouseholds, programPnL, scheduleRecurring, signAdAgency, signNegotiation,
  startAntennaBuild, startEmissionRights, startFacilityBuild, startNegotiation, startResearch,
  startStaffSearch, audienceRankings
} from './simulation.js';
import { seedState } from './seed.js';

export const FEATURE_AUDIT = [
  ['Empty-network start','Cash + one local broadcast foothold; no programs, staff or soundstage'],
  ['Seven-format taxonomy','Scripted, Reality, Sports, News, Documentaries, Live and Contests'],
  ['Sports ecosystem','Live rights plus news, pregame, postgame, talk, highlights and analysis'],
  ['Process-first hiring','Search → shortlist → negotiate → inbox agreement → sign/break'],
  ['Script-first production','Writer commissions script before showrunner/director/casting/stage production'],
  ['Inbox operations','Process completions and negotiated agreements create actionable mail'],
  ['Expanded libraries','20 themed movie libraries; license 1, 4, or full 10/50-title package'],
  ['Expanded rights','20 sports properties from local/high-school through national majors'],
  ['Expanded IP market','20 adaptation-rights opportunities with audience affinities'],
  ['Recurring programming','One-off, selected-day recurrence, X weeks or season-run rules'],
  ['CIO-gated research','Research cannot begin without a Chief Innovation Officer'],
  ['Market-area expansion','State → emission rights → antenna by area or all-state rights'],
  ['15-network ecosystem','4 national + 4 state + 3 local + 4 specialist rivals'],
  ['Audience scopes','National, home-state and original-local-market audience views'],
  ['Network rankings','Yesterday, current month and current year plus prestige/revenue ranking'],
  ['Program rankings','Current-year filters by format, slot and audience/viewer/critic score'],
  ['Historical records','Top-10 audience/viewer/critic record books archived at year end'],
  ['Program profiles','Overview, episode audience/scores, IP identity and finance'],
  ['People profiles','Skills, specialties, project history, salary and contract detail'],
  ['Agency advertising','Base ad revenue requires an ad-sales agency contract'],
  ['Brand sponsorships','Named sponsor offers have term + fixed + audience-variable economics'],
  ['Mobile-first UI','Bottom navigation, drawers, large tap targets and responsive tables/cards'],
  ['Vite + React + GitHub','Modular React source and GitHub Pages workflow']
];

const mins=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
const okRange=(v,a=0,b=100)=>Number.isFinite(v)&&v>=a&&v<=b;

export function runStateQA(s){
  const r=[],check=(name,ok,detail='')=>r.push({name,ok:!!ok,detail});
  check('Version is v0.4',s.version==='0.4.0',s.version);
  check('Starting cash numeric',Number.isFinite(s.cash),String(s.cash));
  check('50 states represented',s.states.length===50,`${s.states.length}`);
  check('State areas exist',s.states.every(x=>Array.isArray(x.areas)&&x.areas.length>=1));
  check('Area rights/antenna schema',s.states.every(x=>x.areas.every(a=>'rightsOwned' in a&&'antennaLevel' in a&&'reachPct' in a)));
  check('Reach nonnegative',Number.isFinite(networkReachHouseholds(s))&&networkReachHouseholds(s)>=0);
  check('Seven content formats',Object.keys(FORMATS).length===7,Object.keys(FORMATS).join(', '));
  check('Sports subformats complete',['Live Sports','Sports News','Pregame','Postgame','Sports Talk','Highlights','Analysis'].every(x=>FORMATS.Sports.includes(x)));
  check('Format expertise configured',FORMAT_EXPERTISE.every(f=>okRange(s.network.expertise?.[f],0,10)));
  check('Original duration options 30/60/120',DURATION_OPTIONS.join(',')==='30,60,120',DURATION_OPTIONS.join(','));
  check('Schedule starts valid',DAYS.every(d=>(s.scheduleBlocks[d]||[]).every(b=>BROADCAST_SLOTS.includes(b.start))));
  check('No schedule overlap',DAYS.every(d=>{const bs=s.scheduleBlocks[d]||[];return bs.every((b,i)=>bs.every((c,j)=>i===j||!(mins(b.start)<mins(c.start)+(s.programs.find(p=>p.id===c.programId)?.duration||c.duration||30)&&mins(c.start)<mins(b.start)+(s.programs.find(p=>p.id===b.programId)?.duration||b.duration||30))))}));
  check('No noon-blackout crossing',DAYS.every(d=>(s.scheduleBlocks[d]||[]).every(b=>{const p=s.programs.find(x=>x.id===b.programId),a=mins(b.start),e=a+(p?.duration||b.duration||30);return !(a<720&&e>720)})));
  check('Schedule rules configured',Array.isArray(s.scheduleRules));
  check('Programs reference IPs',s.programs.every(p=>s.ips.some(ip=>ip.id===p.ipId)));
  check('Pipeline ordering',s.programs.every(p=>p.pipeline.scripted+1e-5>=p.pipeline.pre&&p.pipeline.pre+1e-5>=p.pipeline.filmed&&p.pipeline.filmed+1e-5>=p.pipeline.ready&&p.pipeline.ready+1e-5>=p.pipeline.aired));
  check('Development durations valid',s.developments.every(d=>!d.duration||DURATION_OPTIONS.includes(Number(d.duration))));
  check('No novelty slider field',s.developments.every(d=>!('startingNovelty' in d)));
  check('Completed scripts rated 1–5',s.developments.filter(d=>['Complete','Greenlit'].includes(d.status)).every(d=>d.scriptStars>=1&&d.scriptStars<=5));
  check('Hiring process arrays',Array.isArray(s.staffSearches)&&Array.isArray(s.candidateShortlists)&&Array.isArray(s.negotiations));
  check('Candidate demands + averages',s.candidateMarket.every(c=>Number.isFinite(c.marketAverage)&&c.demands));
  check('CIO candidates available',s.candidateMarket.some(c=>c.role==='Chief Innovation Officer')||s.employees.some(c=>c.role==='Chief Innovation Officer'));
  check('Inbox structured',Array.isArray(s.emails)&&s.emails.every(m=>m.id&&m.subject&&typeof m.read==='boolean'));
  check('20 movie packages',(s.contentMarket?.length||0)>=20,`${s.contentMarket?.length||0}`);
  check('Movie package sizes 10/50',s.contentMarket.every(x=>[10,50].includes(x.packageSize)&&x.movies.length===x.packageSize));
  check('20 sports rights',(s.sports?.length||0)>=20,`${s.sports?.length||0}`);
  check('20 IP opportunities',(s.ipMarket?.length||0)>=20,`${s.ipMarket?.length||0}`);
  check('15 persistent competitors',(s.competitors?.length||0)===15,`${s.competitors?.length||0}`);
  check('Competitor mix',s.competitors.filter(x=>x.scope==='National').length===4&&s.competitors.filter(x=>x.scope==='State').length===4&&s.competitors.filter(x=>x.scope==='Local').length===3&&s.competitors.filter(x=>x.scope==='Specialist').length===4);
  check('Four ad agencies',(s.agencies?.length||0)>=4);
  check('Sponsor marketplace',(s.sponsorships?.length||0)>=12);
  check('Audience history arrays',Array.isArray(s.networkAudienceHistory)&&Array.isArray(s.competitorRatings));
  check('Program record book configured',Array.isArray(s.programRecords));
  check('Program P&Ls numeric',s.programs.every(p=>Number.isFinite(programPnL(s,p).contribution)));
  const hit={popularity:92,novelty:34,fatigue:12,flexibility:62},safe=ipSeasonEffect(hit,25),radical=ipSeasonEffect(hit,90);
  check('Moderate refresh preserves popularity',safe.retainedPopularity>80,safe.retainedPopularity.toFixed(1));
  check('Radical refresh gains novelty',radical.newNovelty>safe.newNovelty,`${safe.newNovelty.toFixed(1)}→${radical.newNovelty.toFixed(1)}`);
  check('Radical refresh risks popularity',radical.retainedPopularity<safe.retainedPopularity-20,`${safe.retainedPopularity.toFixed(1)}→${radical.retainedPopularity.toFixed(1)}`);
  return r;
}

function forceRecruit(s,role){
  let x=startStaffSearch(s,role);x=advanceDays(x,10);
  const sl=[...x.candidateShortlists].reverse().find(v=>v.role===role);
  if(!sl?.candidateIds?.length)return x;
  const c=x.candidateMarket.find(v=>v.id===sl.candidateIds[0]);
  x=startNegotiation(x,c.id,c.ask*1.7,4,0,Math.max(0,c.demands?.backend||0),Math.max(0,c.demands?.creativeControl||0));
  x=advanceDays(x,5);
  const n=[...x.negotiations].reverse().find(v=>v.candidateId===c.id);
  return n?.status==='Agreed'?signNegotiation(x,n.id):x;
}

export function runScenarioQA(){
  let s=seedState({name:'QA Community Network',initials:'QCN',home:'VA',focus:'Live'}),out=[],check=(name,ok,detail='')=>out.push({name,ok:!!ok,detail});
  check('Career starts empty',s.programs.length===0&&s.employees.length===0&&s.facilities.studios===0);
  const beforeResearch=s.research;s=startResearch(s,'t_4k');check('Research blocked without CIO',s.research===beforeResearch);
  for(const role of ['Writer','Showrunner','Director','Host'])s=forceRecruit(s,role);
  check('Negotiated four-person starter team',['Writer','Showrunner','Director','Host'].every(role=>s.employees.some(e=>e.role===role)),s.employees.map(e=>e.role).join(', '));
  s=forceRecruit(s,'Chief Innovation Officer');check('CIO can be recruited',s.employees.some(e=>e.role==='Chief Innovation Officer'));
  s=startResearch(s,'t_4k');check('CIO unlocks research',!!s.research);
  const writer=s.employees.find(e=>e.role==='Writer');
  s=commissionScript(s,{title:'QA Tonight',format:'Live',genre:'Talk Show',theme:'Contemporary',angle:'Fresh',episodes:4,duration:30,writerId:writer?.id});
  s=advanceDays(s,60);const d=s.developments.find(x=>x.title==='QA Tonight');check('Script completes over time',d?.status==='Complete'&&d.scriptStars>=1&&d.scriptStars<=5,d?.status);
  s=startFacilityBuild(s,'studios');s=advanceDays(s,65);check('Stage construction completes',s.facilities.studios>=1,String(s.facilities.studios));
  const sr=s.employees.find(e=>e.role==='Showrunner'),dir=s.employees.find(e=>e.role==='Director'),host=s.employees.find(e=>e.role==='Host');
  s=greenlightDevelopment(s,d.id,{showrunnerId:sr?.id,directorId:dir?.id});const p=s.programs.find(x=>x.title==='QA Tonight');check('Greenlight creates program',!!p);
  if(p&&host){s=audition(s,p.id,host.id,p.roles[0]?.id);s=castTalent(s,p.id,host.id,p.roles[0]?.id);}check('Casting occurs after greenlight',!!p&&Object.keys(s.programs.find(x=>x.id===p.id)?.castAssignments||{}).length>0);
  check('Production gate can clear',p?canStartProduction(s,s.programs.find(x=>x.id===p.id)).ok:false);
  if(p)s=beginProduction(s,p.id);s=advanceDays(s,80);const produced=p&&s.programs.find(x=>x.id===p.id);check('Production delivers episodes',(produced?.pipeline.ready||0)>=1,produced?.pipeline.ready?.toFixed?.(1)||'0');
  if(produced){s=scheduleRecurring(s,{programId:produced.id,start:'20:00',recurrence:'weekly',primaryDay:DAYS[(new Date(s.date+'T00:00:00').getDay()+6)%7],weeks:3});check('Recurring schedule rule created',s.scheduleRules.length===1);}
  s=signAdAgency(s,s.agencies[3].id);check('Advertising agency contract signs',!!s.adAgencyContract);
  s=advanceDays(s,10);check('15 rivals generate scoped ratings',s.competitorRatings.length>0&&s.competitorRatings.every(x=>Number.isFinite(x.stateAudience)&&Number.isFinite(x.localAudience)));
  check('Network rankings return 16 networks',audienceRankings(s,'yesterday','national').length===16);
  check('Current-year program rankings work',currentProgramRankings(s,{scope:'local'}).length>0);
  check('Historical record query works',Array.isArray(historicalRecords(s,{format:'all',metric:'audience'})));
  const market=s.states.find(x=>x.code==='CA'),area=market.areas[0];let e=startEmissionRights(s,'CA',area.id);check('Emission rights start as process',e.distributionProjects.some(x=>x.kind==='rights'&&x.state==='CA'));e=advanceDays(e,20);const ca=e.states.find(x=>x.code==='CA'),caArea=ca.areas[0];check('Emission rights complete over time',caArea.rightsOwned);e=startAntennaBuild(e,'CA',caArea.id,1);check('Antenna requires rights and starts process',e.distributionProjects.some(x=>x.kind==='antenna'&&x.state==='CA'));
  let lib=seedState({home:'VA'}),pack=lib.contentMarket[0];lib=licenseContent(lib,pack.id,'four',pack.movies[0].id);check('Four-movie cycle licenses four titles',lib.programs.length===4,String(lib.programs.length));
  return {state:s,results:out};
}


export function runBalanceQA(days=180){
  const idle=advanceDays(seedState({name:'Balance Test Network',initials:'BTN',home:'VA',focus:'Scripted'}),days);
  const scenario=runScenarioQA();
  const checks=[...runStateQA(scenario.state),...scenario.results];
  return {
    days,
    date:idle.date,
    cash:idle.cash,
    reach:networkReachHouseholds(idle),
    programs:scenario.state.programs.length,
    passed:checks.filter(x=>x.ok).length,
    total:checks.length,
    checks
  };
}
