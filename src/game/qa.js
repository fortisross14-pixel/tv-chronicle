import { BROADCAST_SLOTS, DAYS, DURATION_OPTIONS, FORMATS, FORMAT_EXPERTISE } from './constants.js';
import {
  advanceDays, audition, beginProduction, canStartProduction, castTalent, commissionScript,
  currentProgramRankings, greenlightDevelopment, historicalRecords, ipSeasonEffect, licenseContent,
  networkReachHouseholds, programPnL, scheduleRecurring, signAdAgency, signNegotiation,
  startAntennaBuild, startEmissionRights, startNegotiation, startResearch, startStageBuild,
  startStaffSearch, audienceRankings, setPreProductionPlan, setNetworkLaunchDate, refineDevelopment, isMovieLicenseAvailable
} from './simulation.js';
import { seedState } from './seed.js';

export const FEATURE_AUDIT = [
  ['Empty-network start','Cash + one local broadcast foothold; no programs, staff or soundstage'],
  ['Seven-format taxonomy','Scripted, Reality, Sports, News, Documentaries, Live and Contests'],
  ['Sports ecosystem','Live rights plus news, pregame, postgame, talk, highlights and analysis'],
  ['Process-first hiring','Search → shortlist → negotiate → inbox agreement → sign/break'],
  ['Script-first production','Writer commissions script before showrunner/director/casting/stage production'],
  ['Inbox operations','Process completions and negotiated agreements create actionable mail'],
  ['Persistent mobile saves','localStorage with IndexedDB fallback before session-only mode'],
  ['Transaction safety','Costly acquisitions and projects use confirm steps and rights lock after purchase'],
  ['Rolling script delivery','Episode scripts arrive progressively and can feed production before the full season is written'],
  ['Season refinement','Completed season packages can spend seven days on an optional quality polish'],
  ['Launch-date planning','Scheduling is locked until an initial air date is committed; prelaunch has no broadcast revenue/ops'],
  ['Unified pre-production','Greenlight/budget → production plan → casting → promotion → finalize'],
  ['Individual typed stages','Small, Regular, Large and Exterior stages are exclusive production assets'],
  ['Premiere reveal','First airing creates a reveal interaction; later airings roll into a daily ratings report'],
  ['Generated pitches','Writers return a title, synopsis, script rating and suggested episode budget'],
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
  check('Version is v0.5',s.version==='0.5.0',s.version);
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
  const locals=s.competitors.filter(x=>x.scope==='Local').map(x=>x.revenue),nationals=s.competitors.filter(x=>x.scope==='National').map(x=>x.revenue),states=s.competitors.filter(x=>x.scope==='State').map(x=>x.revenue);
  check('Local competitor revenue plausible',Math.max(...locals)<250000000,`max ${Math.round(Math.max(...locals)/1e6)}m`);
  check('State competitor revenue below national',Math.max(...states)<1500000000,`max ${Math.round(Math.max(...states)/1e6)}m`);
  check('National competitor revenue multi-billion',Math.min(...nationals)>3000000000,`min ${(Math.min(...nationals)/1e9).toFixed(1)}b`);
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
  check('Career starts empty',s.programs.length===0&&s.employees.length===0&&s.stages.length===0&&s.network.launchDate===null);
  const prelaunch=advanceDays(s,14);check('Prelaunch has no broadcast revenue',prelaunch.totalRevenue===0,String(prelaunch.totalRevenue));
  const beforeResearch=s.research;s=startResearch(s,'t_4k');check('Research blocked without CIO',s.research===beforeResearch);
  for(const role of ['Writer','Showrunner','Director','Host'])s=forceRecruit(s,role);
  check('Negotiated four-person starter team',['Writer','Showrunner','Director','Host'].every(role=>s.employees.some(e=>e.role===role)),s.employees.map(e=>e.role).join(', '));
  s=forceRecruit(s,'Chief Innovation Officer');check('CIO can be recruited',s.employees.some(e=>e.role==='Chief Innovation Officer'));
  s=startResearch(s,'t_4k');check('CIO unlocks research',!!s.research);
  const writer=s.employees.find(e=>e.role==='Writer');
  s=commissionScript(s,{title:'QA Tonight',format:'Live',genre:'Talk Show',theme:'Contemporary',angle:'Fresh',episodes:8,duration:30,writerId:writer?.id});
  let d=s.developments.find(x=>x.title==='QA Tonight'),interval=d?.episodeInterval||1;s=advanceDays(s,interval+1);d=s.developments.find(x=>x.title==='QA Tonight');
  check('Scripts arrive progressively',(d?.scriptedEpisodes||0)>=1&&(d?.scriptedEpisodes||0)<d.episodes,`${d?.scriptedEpisodes}/${d?.episodes}`);
  const sr=s.employees.find(e=>e.role==='Showrunner'),dir=s.employees.find(e=>e.role==='Director'),host=s.employees.find(e=>e.role==='Host');
  s=greenlightDevelopment(s,d.id,{budgetPerEpisode:d.suggestedBudgetPerEpisode});let p=s.programs.find(x=>x.developmentId===d.id);check('Greenlight allowed after first script',!!p&&p.pipeline.scripted>=1,`${p?.pipeline.scripted||0}`);
  s=startStageBuild(s,'small');s=advanceDays(s,40);check('Typed stage construction completes',s.stages.some(x=>x.type==='small'),s.stages.map(x=>x.type).join(','));
  p=s.programs.find(x=>x.id===p.id);if(p&&host){s=audition(s,p.id,host.id,p.roles[0]?.id);s=castTalent(s,p.id,host.id,p.roles[0]?.id);}check('Casting occurs inside pre-production',!!p&&Object.keys(s.programs.find(x=>x.id===p.id)?.castAssignments||{}).length>0);
  const stage=s.stages.find(x=>x.type==='small');s=setPreProductionPlan(s,p.id,{allocation:{set:2,vfx:0,sound:2,music:1,extras:2,camera:2,costume:1},technical:{resolution:'1080p',audio:'Stereo',hdr:false},commercialsEnabled:true,promotionPlan:'Light',showrunnerId:sr?.id,directorId:dir?.id,stageId:stage?.id});p=s.programs.find(x=>x.id===p.id);
  check('Pre-production wizard can finalize',p?.preProductionFinalized===true);check('Production gate can clear',canStartProduction(s,p).ok,canStartProduction(s,p).reason);
  s=beginProduction(s,p.id);s=advanceDays(s,35);p=s.programs.find(x=>x.id===p.id);d=s.developments.find(x=>x.id===d.id);check('Production respects rolling script cap',p.pipeline.ready<=p.pipeline.scripted+1e-5,`${p.pipeline.ready.toFixed(1)}/${p.pipeline.scripted}`);
  s=advanceDays(s,90);p=s.programs.find(x=>x.id===p.id);d=s.developments.find(x=>x.id===d.id);check('Full season scripts complete',d.status==='Complete'&&d.scriptedEpisodes===d.episodes,d.status);
  const priorStars=d.scriptStars;s=refineDevelopment(s,d.id);s=advanceDays(s,8);d=s.developments.find(x=>x.id===d.id);check('Season refinement takes time and improves quality',d.refined&&d.scriptStars>=priorStars,`${priorStars?.toFixed(1)}→${d.scriptStars?.toFixed(1)}`);
  s=setNetworkLaunchDate(s,s.date);check('Launch date can be committed',!!s.network.launchDate,s.network.launchDate);
  p=s.programs.find(x=>x.id===p.id);if((p.pipeline.ready||0)<1)s=advanceDays(s,45);p=s.programs.find(x=>x.id===p.id);const today=DAYS[(new Date(s.date+'T00:00:00').getDay()+6)%7];s=scheduleRecurring(s,{programId:p.id,start:'20:00',recurrence:'weekly',primaryDay:today,weeks:3});check('Recurring schedule rule created',s.scheduleRules.length===1);
  s=signAdAgency(s,s.agencies[3].id);check('Advertising agency contract signs',!!s.adAgencyContract);
  s=advanceDays(s,10);check('15 rivals generate scoped ratings',s.competitorRatings.length>0&&s.competitorRatings.every(x=>Number.isFinite(x.stateAudience)&&Number.isFinite(x.localAudience)));
  const ranks=audienceRankings(s,'yesterday','national');check('Network rankings return 16 networks',ranks.length===16);check('Audience ranking has total + average',ranks.every(x=>Number.isFinite(x.totalAudience)&&Number.isFinite(x.audience)));
  check('Current-year program rankings include total + average',currentProgramRankings(s,{scope:'local'}).every(x=>Number.isFinite(x.audience)&&Number.isFinite(x.totalAudience)));
  check('Historical record query works',Array.isArray(historicalRecords(s,{format:'all',metric:'audience'})));
  const market=s.states.find(x=>x.code==='CA'),area=market.areas[0];let e=startEmissionRights(s,'CA',area.id);check('Emission rights start as process',e.distributionProjects.some(x=>x.kind==='rights'&&x.state==='CA'));e=advanceDays(e,20);const ca=e.states.find(x=>x.code==='CA'),caArea=ca.areas[0];check('Emission rights complete over time',caArea.rightsOwned);e=startAntennaBuild(e,'CA',caArea.id,1);check('Antenna requires rights and starts process',e.distributionProjects.some(x=>x.kind==='antenna'&&x.state==='CA'));
  let lib=seedState({home:'VA'}),pack=lib.contentMarket[0],movie=pack.movies[0];check('Movie rights initially available',isMovieLicenseAvailable(lib,pack.id,'single',movie.id));lib=licenseContent(lib,pack.id,'single',movie.id);const n=lib.programs.length;check('Movie rights lock after purchase',!isMovieLicenseAvailable(lib,pack.id,'single',movie.id));lib=licenseContent(lib,pack.id,'single',movie.id);check('Duplicate rights purchase blocked',lib.programs.length===n,String(lib.programs.length));
  let neg=seedState({home:'VA'}),cand=neg.candidateMarket.find(x=>x.role==='Writer');neg=startNegotiation(neg,cand.id,cand.ask*.94,cand.demands?.years||3,cand.demands?.bonus||0,cand.demands?.backend||0,cand.demands?.creativeControl||0);neg=advanceDays(neg,6);const nn=neg.negotiations.find(x=>x.candidateId===cand.id);check('Close employment offer gets counter/accept, not hard reject',['Countered','Agreed'].includes(nn?.status),nn?.status);
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
