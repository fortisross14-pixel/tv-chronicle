import { DEMOS, DAYS, DAYPARTS, SLOT_MULT, FORMAT_NEEDS, PALETTES, ART_STYLES, FONT_STYLES } from './constants.js';
import { addDays, affinity, avg, clamp, dayIndex, deepClone, seeded, uid } from './utils.js';
import { makeProgramDraft } from './seed.js';

export const getIP=(s,id)=>s.ips.find(x=>x.id===id);
export const getProgram=(s,id)=>s.programs.find(x=>x.id===id);
export const getEmployee=(s,id)=>s.employees.find(x=>x.id===id);
export const networkReachHouseholds=s=>s.states.reduce((sum,x)=>sum+x.households*x.coverage,0);
export const totalPotentialHouseholds=s=>s.states.reduce((sum,x)=>sum+x.households,0);
export const researched=(s,id)=>!!s.tech.find(t=>t.id===id)?.researched;

export function ipSeasonEffect(ip,change){
  const flexibility=ip.flexibility||50;
  const sweet=clamp(18+flexibility*.25,18,48);
  const noveltyGain=change<=sweet?change*.58:sweet*.58+(change-sweet)*.82;
  const identityPenalty=change<=sweet?Math.max(0,change-sweet*.65)*.08:(change-sweet)*(1.18-flexibility/180);
  const familiarityLoss=Math.max(0,sweet*.45-change)*.09;
  const retainedPopularity=clamp(ip.popularity-identityPenalty-familiarityLoss,0,100);
  const newNovelty=clamp(ip.novelty*.74+noveltyGain-(ip.fatigue||0)*.15,0,100);
  const fatigueChange=change<12?5:change>75?-2:-Math.min(4,change/22);
  return {retainedPopularity,newNovelty,newFatigue:clamp((ip.fatigue||0)+fatigueChange,0,100),sweet,identityPenalty};
}

export function effectiveAppeal(program,ip){
  const pop=ip?.popularity||35,nov=ip?.novelty||45,fatigue=ip?.fatigue||0;
  const popNov=pop*.52+nov*.28+Math.min(pop,nov)*.20;
  const quality=program.quality||60;
  const reception=(program.viewer||60)*.52+(program.critic||60)*.18+quality*.30;
  const marketing=Math.min(15,(program.marketing||0)*.12);
  return clamp(popNov*.48+reception*.42+(program.momentum||0)*.25-fatigue*.22+marketing,5,100);
}

function weightedAffinity(program,ip){
  return avg(DEMOS.map(([k])=>(program.target?.[k]||45)*.58+(ip?.affinity?.[k]||45)*.42));
}

export function calcAudience(s,program,slotKey,date){
  const ip=getIP(s,program.ipId);
  const reach=networkReachHouseholds(s);
  const rand=seeded(`${date}-${program.id}-${slotKey}-${program.airings||0}`);
  const demoFit=weightedAffinity(program,ip);
  const appeal=effectiveAppeal(program,ip);
  const awareness=clamp((program.awareness||25)+(s.network.prestige||20)*.25+(s.network.trust||20)*.12,5,100);
  const threat=avg((s.competitors||[]).map(c=>slotKey.startsWith('prime')?(c.prime||c.strength):['morning','daytime','fringe'].includes(slotKey)?(c.daytime||c.strength):(c.strength||60)));
  const competition=clamp(1.03-threat*.0027+rand()*.20,.68,1.08);
  const slot=SLOT_MULT[slotKey]||.6;
  const adPenalty=clamp(1-(Math.max(0,(program.adLoad??12)-12)*.012),.72,1);
  const streamingPenalty=s.streaming?.launched?(s.streaming.libraryWindow<=7?.955:s.streaming.libraryWindow<=30?.982:.993):1;
  const conversion=clamp((demoFit*.0022+appeal*.0025+awareness*.00125)*slot*competition*adPenalty*streamingPenalty,0.012,.42);
  const audience=reach*conversion;
  const demoShares={};
  const weights=DEMOS.map(([k])=>Math.max(1,(program.target?.[k]||40)*.58+(ip?.affinity?.[k]||40)*.42));
  const sum=weights.reduce((a,b)=>a+b,0);
  DEMOS.forEach(([k],i)=>demoShares[k]=audience*weights[i]/sum);
  return {audience,demoShares,conversion,appeal,demoFit};
}

function staffPower(s){
  const writers=s.employees.filter(e=>e.role.includes('Writer'));
  const producers=s.employees.filter(e=>['Producer','Showrunner','Director'].some(r=>e.role.includes(r)));
  const engineers=s.employees.filter(e=>e.dept==='Technology');
  return {
    writing:writers.length?avg(writers.map(e=>e.skills.writing||e.overall))*writers.length:40,
    production:producers.length?avg(producers.map(e=>e.skills.production||e.skills.management||e.overall))*Math.max(1,producers.length):45,
    tech:engineers.length?avg(engineers.map(e=>e.skills.technology||e.overall))*engineers.length:40
  };
}

function ensureScripts(p,date){
  if(!['Scripted','Reality'].includes(p.format)||p.acquired)return;
  p.scripts=p.scripts||[];
  const wanted=Math.min(p.episodes,Math.floor(p.pipeline.scripted));
  while(p.scripts.length<wanted){
    const n=p.scripts.length+1,r=seeded(`${p.id}-script-${n}-${date}`)();
    const base=p.scriptStars||3,stars=Math.round(clamp(base+(r-.5)*1.6,1,5)*2)/2;
    const notes=stars>=4.5?'Exceptional draft: distinctive and production-ready.':stars>=4?'Strong draft with minor rewrite opportunities.':stars>=3?'Solid structure; execution will matter heavily.':stars>=2?'Uneven draft; rewrite recommended before expensive production.':'Major structural problems; high risk to produce as written.';
    p.scripts.push({episode:n,title:`Episode ${n}`,stars,notes,status:'Ready'});
  }
}

export function executionQuality(s,p,focus=p.productionFocus){
  const needs=FORMAT_NEEDS[p.genre]||FORMAT_NEEDS.default;
  let weighted=0,total=0;
  Object.keys(needs).forEach(k=>{weighted+=(focus?.[k]??50)*needs[k];total+=needs[k]});
  const dept=weighted/Math.max(1,total);
  const sr=getEmployee(s,p.team?.showrunner),wr=getEmployee(s,p.team?.leadWriter),director=getEmployee(s,p.team?.director);
  const castPeople=(p.cast||[]).map(id=>getEmployee(s,id)).filter(Boolean);const castQuality=castPeople.length?avg(castPeople.map(t=>t.skills?.acting||t.skills?.charisma||t.overall)):55;
  const team=(sr?.skills?.vision||sr?.overall||55)*.22+(wr?.skills?.writing||wr?.overall||55)*.18+castQuality*.19+(director?.skills?.direction||director?.overall||55)*.12;
  const scripts=(p.scriptStars||3)*6.4;
  const chemistry=(p.chemistry||50)*.08;
  let tech=0;
  if(p.technical?.resolution==='4K')tech+=2.5;if(p.technical?.hdr)tech+=1.7;if(p.technical?.audio==='5.1')tech+=1;if(p.technical?.audio==='Immersive')tech+=2;
  if(researched(s,'t_vfx')&&(needs.vfx||0)>.9)tech+=3.2;
  return clamp(dept*.48+team+scripts+chemistry+tech-23,25,97);
}

function advanceProduction(s){
  const power=staffPower(s),cloud=researched(s,'t_cloud')?1.22:1;
  s.programs.forEach(p=>{
    if(p.acquired)return;
    if(p.status==='Development'){
      const sr=getEmployee(s,p.team?.showrunner),wr=getEmployee(s,p.team?.leadWriter);
      const creative=((sr?.skills?.vision||sr?.overall||55)+(wr?.skills?.writing||wr?.overall||55))/110;
      p.developmentProgress=clamp((p.developmentProgress||0)+(100/Math.max(5,p.developmentDays||20))*clamp(creative,.65,1.45),0,100);
      const dailyDev=(p.baseBudgetPerEpisode||p.budgetPerEpisode||80000)*p.episodes*.08/Math.max(5,p.developmentDays||20);
      s.cash-=dailyDev;s.totalExpense+=dailyDev;p.productionSpend=(p.productionSpend||0)+dailyDev;
      if(p.developmentProgress>=100){p.status='Ordered';s.news.unshift({date:s.date,type:'green',text:`Development complete on ${p.title}. The writers' room is now producing episodes.`});}
      return;
    }
    if(!['On Air','Production','Ordered'].includes(p.status))return;
    const target=p.episodes,dailyMode=['News','Morning','Talk'].includes(p.genre),durationScale=Math.max(.5,(p.duration||60)/60);
    const scheduledPerWeek=DAYS.reduce((n,d)=>n+DAYPARTS.filter(([k])=>s.schedule[d]?.[k]===p.id).length,0);
    const operationalNeed=Math.max(.9,scheduledPerWeek/7*1.14);
    const writeRate=dailyMode?operationalNeed:(power.writing/1500)*(p.format==='Scripted'?1:p.format==='Reality'?.55:.35)/durationScale;
    const beforeWrite=p.pipeline.scripted;
    if(p.pipeline.scripted<target)p.pipeline.scripted=clamp(p.pipeline.scripted+writeRate,0,target);
    ensureScripts(p,s.date);
    const preRate=dailyMode?operationalNeed*1.03:(power.production/1900)*(p.format==='Scripted'?.85:p.format==='Reality'?1:.55)/Math.sqrt(durationScale);
    const beforePre=p.pipeline.pre;
    if(p.pipeline.pre<Math.min(target,p.pipeline.scripted))p.pipeline.pre=clamp(p.pipeline.pre+preRate,0,Math.min(target,p.pipeline.scripted));
    const studioFactor=Math.max(.5,s.facilities.studios/2);
    const travelFactor=p.travel==='High'?(researched(s,'t_remote')?.86:.72):p.travel==='Medium'?(researched(s,'t_remote')?.96:.86):1;const filmRate=dailyMode?operationalNeed*1.01:(power.production/2100)*studioFactor*(p.format==='Scripted'?.72:p.format==='Reality'?.88:.65)*travelFactor/durationScale;
    const beforeFilm=p.pipeline.filmed;
    if(p.pipeline.filmed<Math.min(target,p.pipeline.pre))p.pipeline.filmed=clamp(p.pipeline.filmed+filmRate,0,Math.min(target,p.pipeline.pre));
    const postFactor=(1+s.facilities.post*.16)*cloud;
    const postRate=dailyMode?operationalNeed:(power.production/2500)*postFactor*(p.format==='Scripted'?.72:p.format==='Reality'?.62:.85)/durationScale;
    const beforeReady=p.pipeline.ready;
    if(p.pipeline.ready<Math.min(target,p.pipeline.filmed))p.pipeline.ready=clamp(p.pipeline.ready+postRate,0,Math.min(target,p.pipeline.filmed));
    const writeDelta=p.pipeline.scripted-beforeWrite,filmDelta=p.pipeline.filmed-beforeFilm,readyDelta=p.pipeline.ready-beforeReady;
    const spend=(writeDelta*.08+filmDelta*.72+readyDelta*.20)*(p.budgetPerEpisode||0);
    p.productionSpend=(p.productionSpend||0)+spend;
    s.cash-=spend;s.totalExpense+=spend;
    if(p.pipeline.ready>=1&&p.status==='Ordered')p.status='Production';
  });
}

function researchDay(s){
  if(!s.research)return;
  const t=s.tech.find(x=>x.id===s.research.techId);if(!t){s.research=null;return}
  const staff=s.employees.filter(e=>e.dept==='Technology');
  const speed=Math.max(.18,avg(staff.map(e=>e.skills.technology||e.overall))/130)*(1+s.facilities.research*.08);
  t.progress=clamp((t.progress||0)+speed,0,100);
  const cost=Math.max(1500,(t.cost||500000)/180);s.cash-=cost;s.totalExpense+=cost;
  if(t.progress>=100){t.researched=true;s.research=null;s.news.unshift({date:s.date,type:'green',text:`Research completed: ${t.name}.`});if(t.id==='t_stream')s.streaming.unlocked=true;}
}

function dailyOverhead(s){
  const payroll=s.employees.reduce((sum,e)=>sum+(e.salary||0),0)/365;
  const f=s.facilities;
  const facilities=(f.studios*260000+f.post*180000+f.newsroom*240000+f.vfx*300000+f.wardrobe*90000+f.setShop*120000+f.control*150000+f.archive*70000+f.research*110000)/365;
  const rights=s.contracts.filter(c=>['sports','affiliate','ip'].includes(c.type)).reduce((sum,c)=>sum+(c.annualCost||0)/365,0);
  const newsroom=(s.newsroom?.budget||0)/365;
  const marketing=s.programs.reduce((sum,p)=>sum+(p.marketing||0)*85,0)/30;
  const streaming=s.streaming?.launched?18000:0;
  const expense=payroll+facilities+rights+newsroom+marketing+streaming+5500;
  s.cash-=expense;s.totalExpense+=expense;s.lastDayExpense=expense;
}

function deliverAds(s,program,audienceByDemo,slotKey){
  let rev=0;
  const active=s.adCampaigns.filter(a=>a.status==='Active'&&a.days>0&&(!a.programIds?.length||a.programIds.includes(program.id)));
  active.forEach(a=>{
    const targetImps=(audienceByDemo[a.target]||0)+(audienceByDemo[a.secondary]||0)*.42;
    const fitBoost=a.fit?.some(f=>program.genre.includes(f)||program.format.includes(f))?1.12:1;
    const slotQuality=SLOT_MULT[slotKey]||.6;
    const adInventory=clamp((program.adLoad??12)/12,.65,1.7);
    const deliver=Math.min(targetImps*slotQuality*fitBoost*adInventory,a.goal-a.delivered);
    if(deliver<=0)return;
    const analytics=researched(s,'t_analytics')?1.08:1;
    const value=deliver/1000*a.cpm*5*analytics;
    const capped=Math.min(value,a.remaining);const actual=value>0?deliver*(capped/value):0;
    a.delivered+=actual;a.remaining-=capped;rev+=capped;
    if(a.delivered>=a.goal*.995||a.remaining<100)a.status='Delivered';
  });
  return rev;
}

function sponsorRevenue(s,p){
  return s.sponsorships.filter(x=>x.status==='Active'&&x.programId===p.id&&x.weeks>0).reduce((sum,x)=>sum+x.offer/(x.totalWeeks||x.weeks||10)/7,0);
}

function airDay(s){
  const d=DAYS[dayIndex(s.date)],schedule=s.schedule[d]||{};let totalAudience=0,revenue=0;
  DAYPARTS.forEach(([slotKey])=>{
    const p=getProgram(s,schedule[slotKey]);if(!p)return;
    const available=Math.floor(p.pipeline.ready)-Math.floor(p.pipeline.aired),seasonComplete=Math.floor(p.pipeline.aired)>=p.episodes;
    if(available<=0&&!seasonComplete&&!['News','Morning','Talk','Live Sports'].includes(p.genre)){
      p.momentum=clamp((p.momentum||0)-5,-30,30);s.news.unshift({date:s.date,type:'warning',text:`${p.title} missed ${slotKey}: no broadcast-ready episode.`});return;
    }
    const r=calcAudience(s,p,slotKey,s.date);if(seasonComplete){r.audience*=.72;Object.keys(r.demoShares).forEach(k=>r.demoShares[k]*=.72)}
    p.lastAudience=r.audience;p.totalAudience=(p.totalAudience||0)+r.audience;p.airings=(p.airings||0)+1;totalAudience+=r.audience;
    if(Math.floor(p.pipeline.aired)<p.episodes)p.pipeline.aired=Math.min(p.episodes,p.pipeline.aired+1);
    const ip=getIP(s,p.ipId);
    if(ip){
      const reception=((p.viewer||60)+(p.critic||60))/2;
      const buzz=(reception-62)/38+(r.audience/Math.max(1,networkReachHouseholds(s))-.06)*4;
      p.momentum=clamp((p.momentum||0)*.82+buzz,-30,30);ip.popularity=clamp(ip.popularity+buzz*.11,0,100);ip.novelty=clamp(ip.novelty-.045,0,100);
      if(ip.novelty<25)ip.fatigue=clamp((ip.fatigue||0)+.025,0,100);
      ip.value=Math.max(100000,ip.value*(1+buzz*.0018));
    }
    p.awareness=clamp((p.awareness||20)+.035+r.audience/Math.max(1,networkReachHouseholds(s))*.4,0,100);
    const strength=clamp(r.audience/Math.max(1,networkReachHouseholds(s))*.12,0,.035);s.network.brand=s.network.brand||{};
    if(p.format==='Scripted'&&p.critic>70)s.network.brand.prestige=clamp((s.network.brand.prestige??s.network.prestige)+strength*(p.critic-60),0,100);
    if(['News','Morning','Current Affairs'].includes(p.genre))s.network.brand.trust=clamp((s.network.brand.trust??s.network.trust)+strength*(p.viewer-55)*.5,0,100);
    if(p.format==='Sports')s.network.brand.sports=clamp((s.network.brand.sports??s.network.sports)+strength*25,0,100);
    if(p.genre==='Kids')s.network.brand.family=clamp((s.network.brand.family??s.network.family)+strength*25,0,100);
    if((p.target?.youngMen||0)+(p.target?.youngWomen||0)>130)s.network.brand.youth=clamp((s.network.brand.youth??s.network.youth)+strength*18,0,100);
    const adRev=deliverAds(s,p,r.demoShares,slotKey),spRev=sponsorRevenue(s,p),localSpot=r.audience/1000*18*clamp((p.adLoad??12)/12,.7,1.6);
    const showRev=adRev+spRev+localSpot;p.revenue=(p.revenue||0)+showRev;revenue+=showRev;
    if(p.format==='Scripted'&&(p.airings||0)>1){const residual=(p.baseBudgetPerEpisode||0)*.006*Math.max(1,(p.cast||[]).length);p.residualSpend=(p.residualSpend||0)+residual;s.cash-=residual;s.totalExpense+=residual;}
    s.ratingsLog.push({date:s.date,day:d,slot:slotKey,programId:p.id,audience:r.audience,viewer:p.viewer,critic:p.critic});
  });
  if(s.streaming?.launched){
    const libraryAppeal=avg(s.programs.map(p=>effectiveAppeal(p,getIP(s,p.ipId))));
    const growth=Math.max(-80,Math.round((libraryAppeal-50)*4+s.network.prestige*1.5));
    s.streaming.subscribers=Math.max(0,s.streaming.subscribers+growth);
    const dailySubs=s.streaming.model==='Advertising'?0:s.streaming.subscribers*s.streaming.price/30*(s.streaming.model==='Hybrid'?.8:1);
    const streamAds=s.streaming.model==='Subscription'?0:s.streaming.subscribers*(s.streaming.adLoad||5)*.018;
    revenue+=dailySubs+streamAds;
  }
  s.cash+=revenue;s.totalRevenue+=revenue;s.lastDayRevenue=revenue;s.lastDayAudience=totalAudience;s.weeklyAudience=(s.weeklyAudience||0)*.78+totalAudience*.22;
  s.ratingsLog=s.ratingsLog.slice(-1200);
}

function campaignsDay(s){
  s.adCampaigns.forEach(a=>{
    if(a.status==='Active'){
      a.days--;
      if(a.days<=0){
        if(a.delivered<a.goal*.9){const shortfall=(a.goal-a.delivered)/Math.max(1,a.goal),makegood=Math.min(a.budget*.25,a.budget*shortfall*.35);s.cash-=makegood;s.totalExpense+=makegood;s.news.unshift({date:s.date,type:'warning',text:`${a.brand} ended short; makegood cost applied.`})}
        a.status='Closed';
      }
    }
  });
  s.sponsorships.forEach(x=>{if(x.status==='Active'){x.dayCounter=(x.dayCounter||0)+1;if(x.dayCounter%7===0)x.weeks--;if(x.weeks<=0)x.status='Closed'}});
  s.sports.forEach(x=>{if(x.owned||x.bidEnds<=0)return;x.bidEnds=Math.max(0,x.bidEnds-1);if(x.bidEnds===0&&x.leader==='PCN')awardSport(s,x,x.currentBid||x.cost);});
}

function maybeGenerateCommercial(s){
  const epoch=Math.floor(new Date(`${s.date}T12:00:00`).getTime()/86400000),r=seeded(`market-${s.date}-${s.network.initials}`);
  if(epoch%12===0&&s.adCampaigns.filter(a=>a.status==='Available').length<6){
    const brands=['Orbit Wireless','BluePeak Insurance','Northstar Coffee','Cobalt Auto','Sprout Snacks','Lumen Mobile','Vista Travel','Granite Bank','Firefly Games','Cedar Home'];
    const brand=brands[Math.floor(r()*brands.length)]+' '+String.fromCharCode(65+Math.floor(r()*20));const target=DEMOS[Math.floor(r()*DEMOS.length)][0],secondary=DEMOS[Math.floor(r()*DEMOS.length)][0];
    const reach=networkReachHouseholds(s),goal=Math.max(900000,reach*(2.2+r()*3.6)),cpm=Math.round(14+r()*19),budget=goal/1000*cpm*5.15;
    s.adCampaigns.push({id:uid('a'),brand,target,secondary,budget,remaining:budget,goal,delivered:0,cpm,status:'Available',days:Math.round(28+r()*35),fit:[]});
  }
  if(epoch%20===0&&s.sponsorships.filter(x=>x.status==='Available').length<5){
    const brand=['Cobalt Auto','Lumen Mobile','Orchid Coffee','Atlas Insurance'][Math.floor(r()*4)];const types=['Drama','Reality','News','Morning','Sports'];
    s.sponsorships.push({id:uid('sp'),brand,offer:250000+r()*650000,programType:types[Math.floor(r()*types.length)],target:DEMOS[Math.floor(r()*DEMOS.length)][0],weeks:8+Math.floor(r()*9),status:'Available'});
  }
}

function competitorDay(s){
  const epoch=Math.floor(new Date(`${s.date}T12:00:00`).getTime()/86400000);if(epoch%7!==0)return;
  s.competitors.forEach(c=>{
    const r=seeded(`${s.date}-${c.id}`),swing=(r()-.48)*5;c.momentum=clamp((c.momentum||0)*.6+swing,-10,10);c.prime=clamp(c.prime+c.momentum*.08,35,96);c.daytime=clamp(c.daytime+(r()-.5)*1.5,30,90);
    if(r()>.83)s.news.unshift({date:s.date,type:'info',text:`${c.name} announced a major ${r()>.5?'scripted development':'sports push'}, increasing competitive pressure.`});
  });
  s.sports.filter(x=>!x.owned&&x.bidEnds>0&&x.leader==='PCN').forEach(x=>{const r=seeded(`sports-bid-${s.date}-${x.id}`);if(r()>.58){const rival=s.competitors.sort((a,b)=>b.sports-a.sports)[Math.floor(r()*Math.min(3,s.competitors.length))];x.currentBid=Math.round((x.currentBid||x.cost)*1.08/10000)*10000;x.leader=rival.name;s.news.unshift({date:s.date,type:'warning',text:`${rival.name} outbid PCN for ${x.name}.`});}});
}

function newsroomDay(s){
  const n=s.newsroom;if(!n)return;
  const quality=clamp(35+n.reporters*3+n.bureaus*4+n.investigative*5+s.facilities.newsroom*4+(s.network.trust||40)*.15,20,95);
  n.trust=clamp(n.trust+(quality-55)*.002,0,100);s.network.newsTrust=n.trust;s.network.trust=clamp(s.network.trust+(n.trust-s.network.trust)*.001,0,100);
  const epoch=Math.floor(new Date(`${s.date}T12:00:00`).getTime()/86400000),r=seeded(`news-${s.date}`);
  if(epoch%17===0&&r()>.4){const newsProg=s.programs.find(p=>p.genre==='News');if(newsProg){newsProg.momentum=clamp(newsProg.momentum+5,-30,30);newsProg.awareness=clamp(newsProg.awareness+2,0,100);s.news.unshift({date:s.date,type:'green',text:'A major local story boosted PCN News awareness and trust.'})}}
}

function awardsDay(s){
  const d=new Date(`${s.date}T12:00:00`),month=d.getMonth()+1,day=d.getDate();
  if(day!==15)return;
  s.awards.filter(a=>a.month===month).forEach(award=>{
    const key=`${d.getFullYear()}-${award.id}`;if(s.yearly.awardsProcessed.includes(key))return;
    s.yearly.awardsProcessed.push(key);
    const eligible=s.programs.filter(p=>p.airings>0&&p.critic>=70);
    eligible.forEach(p=>{
      const r=seeded(`${key}-${p.id}`),chance=clamp((p.critic-65)/60+(p.quality-65)/100+(p.awardsCampaign||0)/140,0,.68);
      if(r()<chance){const category=award.categories.find(c=>p.genre.includes(c))||award.categories[Math.floor(r()*award.categories.length)];p.awards.push({year:d.getFullYear(),award:award.name,category});const ip=getIP(s,p.ipId);if(ip){ip.prestige=clamp(ip.prestige+4,0,100);ip.value*=1.04}s.network.prestige=clamp(s.network.prestige+1.2,0,100);s.awardHistory.unshift({date:s.date,program:p.title,award:award.name,category});s.news.unshift({date:s.date,type:'green',text:`${p.title} won ${category} at the ${award.name}.`})}
    });
  });
}

function licensingDay(s){
  s.licenses.forEach(l=>{if(l.status==='Active'){const daily=l.annualRevenue/365;s.cash+=daily;s.totalRevenue+=daily;const p=getProgram(s,l.programId);if(p)p.licensingRevenue=(p.licensingRevenue||0)+daily;}});
  s.merchDeals.forEach(m=>{if(m.status==='Active'){const ip=getIP(s,m.ipId);if(!ip)return;const daily=(m.baseAnnual||0)/365*(.6+ip.fandom/100*.6);s.cash+=daily;s.totalRevenue+=daily;const p=s.programs.find(x=>x.ipId===m.ipId);if(p)p.merchRevenue=(p.merchRevenue||0)+daily;}});
}

function automationDay(s){
  if(s.automation.ads){s.adCampaigns.filter(a=>a.status==='Available').sort((a,b)=>b.cpm-a.cpm).slice(0,1).forEach(a=>{a.status='Active'})}
  if(s.automation.production){s.programs.forEach(p=>{const runway=Math.floor(p.pipeline.ready-p.pipeline.aired);if(runway<2&&['On Air','Production','Ordered'].includes(p.status))p.productionFocus.writing=clamp((p.productionFocus.writing||60)+1,0,100)})}
  const epoch=Math.floor(new Date(`${s.date}T12:00:00`).getTime()/86400000);
  if(s.automation.schedule&&epoch%7===0){
    DAYS.forEach(d=>['prime1','prime2'].forEach(slot=>{const choices=s.programs.filter(p=>Math.floor(p.pipeline.ready-p.pipeline.aired)>0||['News','Morning','Talk','Live Sports'].includes(p.genre)).map(p=>({p,a:calcAudience(s,p,slot,s.date).audience})).sort((a,b)=>b.a-a.a);if(choices[0])s.schedule[d][slot]=choices[0].p.id;}));
  }
  if(s.automation.affiliates&&epoch%30===0&&s.cash>7000000){const af=s.affiliates.filter(x=>x.status==='Available').sort((a,b)=>(b.households/b.ask)-(a.households/a.ask))[0];if(af){const st=s.states.find(x=>x.code===af.market);af.status='Active';af.start=s.date;st.affiliate=af.station;st.coverage=clamp(Math.max(st.coverage,af.households/st.households*.8),0,1);st.awareness=clamp(st.awareness+12,0,100);s.contracts.push({id:uid('ct'),name:af.station,type:'affiliate',annualCost:af.ask,term:af.term,start:s.date});s.cash-=af.ask*.1;s.totalExpense+=af.ask*.1;s.news.unshift({date:s.date,type:'green',text:`Distribution team signed ${af.station} as a PCN affiliate.`});}}
}

export function runOneDay(s,{silent=false}={}){
  s.lastDayRevenue=0;s.lastDayAudience=0;
  automationDay(s);advanceProduction(s);researchDay(s);dailyOverhead(s);airDay(s);licensingDay(s);campaignsDay(s);newsroomDay(s);competitorDay(s);awardsDay(s);maybeGenerateCommercial(s);
  s.financeLog.push({date:s.date,cash:s.cash,revenue:s.lastDayRevenue,expense:s.lastDayExpense||0});s.financeLog=s.financeLog.slice(-730);
  s.date=addDays(s.date,1);
  if(!silent&&s.cash<0)s.news.unshift({date:s.date,type:'warning',text:'Cash is negative. Financing or cost action is required.'});
  s.news=s.news.slice(0,160);
}

export function advanceDays(state,n){const s=deepClone(state);for(let i=0;i<n;i++)runOneDay(s,{silent:true});return s;}

export function alerts(s){
  const out=[];
  s.programs.forEach(p=>{
    const runway=Math.floor(p.pipeline.ready-p.pipeline.aired),daily=['News','Morning','Talk'].includes(p.genre),threshold=daily?4:2;
    if(runway<=0)out.push({sev:'red',title:`${p.title}: no ready episodes`,sub:'Production pipeline can no longer support the schedule.'});
    else if(runway<=threshold)out.push({sev:'orange',title:`${p.title} runway: ${runway}`,sub:'Increase production or reduce scheduled airings.'});
    const scriptGap=Math.floor(p.pipeline.scripted-p.pipeline.aired);if(scriptGap<=2&&p.pipeline.aired<p.episodes)out.push({sev:'orange',title:`${p.title}: writing runway low`,sub:`${Math.max(0,scriptGap)} unaired scripts remain.`});
  });
  s.adCampaigns.filter(a=>a.status==='Active').forEach(a=>{const pace=a.delivered/Math.max(1,a.goal);if(a.days<10&&pace<.7)out.push({sev:'orange',title:`${a.brand} under-delivering`,sub:`${Math.round(pace*100)}% delivered, ${a.days} days left.`})});
  if(s.cash<3000000)out.push({sev:'red',title:'Cash reserve dangerously low',sub:'Reduce commitments or improve monetization.'});
  if(s.research){const t=s.tech.find(x=>x.id===s.research.techId);if(t)out.push({sev:'green',title:`Research: ${t.name}`,sub:`${Math.round(t.progress)}% complete.`})}
  return out.slice(0,10);
}

export function renewProgram(state,programId,change){
  const s=deepClone(state),p=getProgram(s,programId),ip=getIP(s,p.ipId);if(!p||!ip)return s;
  const e=ipSeasonEffect(ip,Number(change));ip.popularity=e.retainedPopularity;ip.novelty=e.newNovelty;ip.fatigue=e.newFatigue;ip.seasons=(ip.seasons||0)+1;
  p.season=(p.season||1)+1;p.pipeline={scripted:0,pre:0,filmed:0,ready:0,aired:0};p.scripts=[];p.airings=0;p.totalAudience=0;p.momentum=0;p.status='Ordered';p.awareness=clamp(p.awareness*.82+ip.popularity*.18,5,100);
  s.news.unshift({date:s.date,type:'green',text:`${p.title} renewed for Season ${p.season} with ${change}% creative change.`});return s;
}

export function rewriteScript(state,programId,episode){
  const s=deepClone(state),p=getProgram(s,programId),sc=p?.scripts?.find(x=>x.episode===episode);if(!sc)return s;
  const cost=(p.budgetPerEpisode||100000)*.035;s.cash-=cost;s.totalExpense+=cost;const r=seeded(`${s.date}-${p.id}-${episode}-rewrite-${sc.stars}`)();sc.stars=clamp(Math.round((sc.stars+.5+r*.75)*2)/2,1,5);sc.notes=sc.stars>=4?'Rewrite landed strongly; draft is ready to produce.':'Rewrite improved the material, though execution remains important.';return s;
}

export function updateProductionPlan(state,programId,focus,technical){
  const s=deepClone(state),p=getProgram(s,programId);if(!p)return s;p.productionFocus={...focus};p.technical={...technical};p.quality=executionQuality(s,p,focus);const ip=getIP(s,p.ipId);const mean=avg(Object.values(focus));p.budgetPerEpisode=(p.baseBudgetPerEpisode||p.budgetPerEpisode||100000)*(.52+mean/100*.72+(technical.resolution==='4K'?.08:0)+(technical.hdr?.04:0)+(technical.audio==='Immersive'?.05:technical.audio==='5.1'?.02:0));p.viewer=clamp(38+p.quality*.54+(focus.cast||50)*.08+(p.chemistry||50)*.03,40,96);p.critic=clamp(25+p.quality*.62+(p.scriptStars||3)*3+(ip?.novelty||50)*.05,25,98);return s;
}

export function createProgram(state,form){
  const s=deepClone(state);let ipId=form.ipId;
  if(!ipId||ipId==='new'){
    ipId=uid('ip');s.ips.push({id:ipId,name:form.title,origin:'Original',genre:form.genre,popularity:8,novelty:Number(form.novelty||72),fatigue:0,prestige:10,fandom:8,flexibility:Number(form.flexibility||60),value:250000,affinity:{...form.target},seasons:1,merchPotential:Number(form.merchPotential||35),identity:[form.genre.toLowerCase()]});
  }
  const p=makeProgramDraft({...form,ipId});p.scriptStars=Number(form.scriptStars||3);p.marketing=Number(form.marketing||15);p.locationScale=form.locationScale||'Regional';p.travel=form.travel||'Low';const scaleMult={Regional:1,National:1.14,International:1.34}[p.locationScale]||1;const travelMult={Low:1,Medium:1.12,High:1.28}[p.travel]||1;p.baseBudgetPerEpisode*=scaleMult*travelMult;p.budgetPerEpisode=p.baseBudgetPerEpisode;p.developmentDays=Math.round(p.developmentDays*({Regional:1,National:1.08,International:1.2}[p.locationScale]||1)*({Low:1,Medium:1.08,High:1.18}[p.travel]||1));p.team={showrunner:form.showrunner||null,leadWriter:form.leadWriter||null,leadTalent:form.leadTalent||null,director:form.director||null};
  p.roles=form.format==='Scripted'?[{id:'leadA',name:'Principal Lead',importance:100},{id:'leadB',name:'Second Lead',importance:85},{id:'support',name:'Supporting Role',importance:55}]:form.format==='Reality'?[{id:'host',name:'Host / Presenter',importance:90}]:[{id:'presenter',name:form.genre==='News'?'Lead Anchor':'Lead Presenter',importance:90}];
  p.castAssignments={};if(form.leadTalent){p.castAssignments[p.roles[0].id]=form.leadTalent;p.cast=[form.leadTalent];}else p.cast=[];p.chemistry=form.leadTalent?55:50;
  const devCost=Math.min(350000,p.budgetPerEpisode*p.episodes*.012);s.cash-=devCost;s.totalExpense+=devCost;s.programs.push(p);s.news.unshift({date:s.date,type:'green',text:`Development started on ${p.title}.`});return s;
}

export function acquireContent(state,id){
  const s=deepClone(state),i=s.contentMarket.findIndex(x=>x.id===id);if(i<0)return s;const m=s.contentMarket.splice(i,1)[0];s.cash-=m.cost;s.totalExpense+=m.cost;const ipId=uid('ip');s.ips.push({id:ipId,name:m.title,origin:'Acquired Programming',genre:m.genre,popularity:m.popularity,novelty:28,fatigue:8,prestige:m.critic*.55,fandom:m.popularity*.55,flexibility:35,value:m.cost*.35,affinity:m.affinity,seasons:1,merchPotential:10});const c=PALETTES[s.programs.length%PALETTES.length];const p=makeProgramDraft({title:m.title,format:'Acquired',genre:m.genre,episodes:m.runs,duration:m.duration,target:m.affinity,art:ART_STYLES[s.programs.length%ART_STYLES.length],font:FONT_STYLES[s.programs.length%FONT_STYLES.length],p1:c[0],p2:c[1],ipId});Object.assign(p,{status:'Library',pipeline:{scripted:m.runs,pre:m.runs,filmed:m.runs,ready:m.runs,aired:0},viewer:m.viewer,critic:m.critic,quality:(m.viewer+m.critic)/2,budgetPerEpisode:0,baseBudgetPerEpisode:0,rightsRuns:m.runs,acquired:true,awareness:m.popularity*.45});s.programs.push(p);return s;
}

export function acquireIP(state,id){
  const s=deepClone(state),i=s.ipMarket.findIndex(x=>x.id===id);if(i<0)return s;const m=s.ipMarket.splice(i,1)[0];s.cash-=m.cost;s.totalExpense+=m.cost;s.ips.push({id:uid('ip'),name:m.name,origin:`Licensed ${m.type}`,genre:m.type,popularity:m.popularity,novelty:m.novelty,fatigue:0,prestige:m.prestige,fandom:m.fandom,flexibility:m.flexibility,value:m.cost*.95,affinity:m.affinity,seasons:0,merchPotential:m.merchPotential,rights:m.rights});s.contracts.push({id:uid('ct'),name:m.name,type:'ip',annualCost:m.cost/(m.rights?.term||5),term:m.rights?.term||5,start:s.date});return s;
}

function awardSport(s,x,annualPrice){
  if(!x||x.owned)return;x.owned=true;x.cost=annualPrice;x.leader='PCN';s.contracts.push({id:uid('ct'),name:x.name,type:'sports',annualCost:annualPrice,term:x.term,start:s.date});s.network.sports=clamp(s.network.sports+x.popularity*.12,0,100);
  const ipId=uid('ip');s.ips.push({id:ipId,name:x.name,origin:'Sports Rights',genre:'Sports',popularity:x.popularity,novelty:35,fatigue:4,prestige:x.prestige,fandom:x.popularity*.7,flexibility:30,value:annualPrice*x.term*.75,affinity:affinity({[x.target]:88}),seasons:1,merchPotential:20});
  const p=makeProgramDraft({title:x.name,format:'Sports',genre:'Live Sports',episodes:x.events,duration:150,target:affinity({[x.target]:90}),art:'split',font:'block',p1:'#4bb3fd',p2:'#17213c',ipId});Object.assign(p,{status:'On Air',developmentProgress:100,pipeline:{scripted:x.events,pre:x.events,filmed:x.events,ready:x.events,aired:0},viewer:68,critic:55,quality:72,budgetPerEpisode:Math.max(25000,annualPrice/x.events*.18),baseBudgetPerEpisode:Math.max(25000,annualPrice/x.events*.18),sportsRightsId:x.id});s.programs.push(p);s.news.unshift({date:s.date,type:'green',text:`PCN won the ${x.name} rights auction at ${Math.round(annualPrice/1000)}K per year.`});
}

export function placeSportBid(state,id){const s=deepClone(state),x=s.sports.find(y=>y.id===id);if(!x||x.owned||x.bidEnds<=0)return s;const next=Math.round(((x.currentBid||x.cost*.75)*(x.leader?1.1:1.06))/10000)*10000;if(s.cash<next*.12)return s;x.currentBid=next;x.leader='PCN';s.news.unshift({date:s.date,type:'green',text:`PCN leads the bidding for ${x.name} at ${Math.round(next/1000)}K/year.`});return s;}

export function acquireSport(state,id){const s=deepClone(state),x=s.sports.find(y=>y.id===id);if(!x||x.owned)return s;awardSport(s,x,x.cost);return s;}

export function createSportsCompanion(state,sportId,type='Pregame'){
  const s=deepClone(state),sp=s.sports.find(x=>x.id===sportId&&x.owned);if(!sp)return s;const parent=s.programs.find(p=>p.sportsRightsId===sp.id),ipId=parent?.ipId;const p=makeProgramDraft({title:`${sp.name}: ${type}`,format:'Sports',genre:type,episodes:40,duration:type==='Highlights'?30:60,target:affinity({[sp.target]:82}),art:'grid',font:'wide',p1:'#db4e70',p2:'#211a36',ipId});p.budgetPerEpisode=35000;p.baseBudgetPerEpisode=35000;p.status='Ordered';s.programs.push(p);return s;
}

export function signAd(state,id,programIds=[]){const s=deepClone(state),a=s.adCampaigns.find(x=>x.id===id);if(a){a.status='Active';a.programIds=[...programIds];}return s;}
export function signSponsor(state,id,programId){const s=deepClone(state),x=s.sponsorships.find(y=>y.id===id),p=getProgram(s,programId);if(x&&p){x.status='Active';x.programId=p.id;x.totalWeeks=x.weeks;p.sponsor=x.brand}s.cash+=x?.offer*.08||0;return s;}
export function setSchedule(state,day,slot,programId){const s=deepClone(state);s.schedule[day][slot]=programId;return s;}
export function setAdLoad(state,programId,minutes){const s=deepClone(state),p=getProgram(s,programId);if(p)p.adLoad=Number(minutes);return s;}
export function setMarketing(state,programId,level){const s=deepClone(state),p=getProgram(s,programId);if(p){p.marketing=Number(level);p.marketingSpend=(p.marketingSpend||0)+Number(level)*4500;s.cash-=Number(level)*4500;s.totalExpense+=Number(level)*4500;p.awareness=clamp(p.awareness+Number(level)*.08,0,100)}return s;}

export function hireCandidate(state,id,offerSalary,years=3,bonus=0,backend=0,creativeControl=0){
  const s=deepClone(state),i=s.candidates.findIndex(x=>x.id===id);if(i<0)return {state:s,accepted:false};const c=s.candidates[i],prestige=s.network.prestige||30,ratio=Number(offerSalary)/(c.ask||1),r=seeded(`${s.date}-${id}-${offerSalary}-${years}-${backend}-${creativeControl}`)();const acceptance=ratio*.57+prestige/100*.16+years/5*.07+Number(backend)*.018+Number(creativeControl)/100*.08+r*.15;
  if(acceptance<.73)return {state:s,accepted:false};s.candidates.splice(i,1);c.salary=Number(offerSalary);c.contractYears=Number(years);c.backend=Number(backend);c.creativeControl=Number(creativeControl);s.employees.push(c);s.cash-=Number(bonus);s.totalExpense+=Number(bonus);return {state:s,accepted:true};
}
export function fireEmployee(state,id){const s=deepClone(state),i=s.employees.findIndex(x=>x.id===id);if(i<0)return s;const e=s.employees.splice(i,1)[0],sev=(e.salary||0)*.25;s.cash-=sev;s.totalExpense+=sev;return s;}
export function startResearch(state,id){const s=deepClone(state),t=s.tech.find(x=>x.id===id);if(t&&!t.researched&&!s.research)s.research={techId:id,start:s.date};return s;}
export function expandFacility(state,key){const s=deepClone(state),base={studios:1800000,post:900000,newsroom:1200000,vfx:2400000,wardrobe:500000,setShop:800000,control:1000000,archive:420000,research:750000}[key];if(!base)return s;const cost=base*((s.facilities[key]||0)+1);if(s.cash<cost)return s;s.cash-=cost;s.totalExpense+=cost;s.facilities[key]=(s.facilities[key]||0)+1;return s;}
export function expandState(state,code){const s=deepClone(state),st=s.states.find(x=>x.code===code);if(!st)return s;const next=clamp(st.coverage+.2,0,1),cost=st.households*(next-st.coverage)*1.35;if(s.cash<cost)return s;st.coverage=next;st.awareness=clamp(st.awareness+8,0,100);s.cash-=cost;s.totalExpense+=cost;return s;}
export function signAffiliate(state,id){const s=deepClone(state),af=s.affiliates.find(x=>x.id===id);if(!af||af.status!=='Available')return s;const st=s.states.find(x=>x.code===af.market),cost=af.ask;if(s.cash<cost*.25)return s;af.status='Active';af.start=s.date;st.affiliate=af.station;st.coverage=clamp(Math.max(st.coverage,af.households/st.households*.8),0,1);st.awareness=clamp(st.awareness+12,0,100);s.contracts.push({id:uid('ct'),name:af.station,type:'affiliate',annualCost:cost,term:af.term,start:s.date});s.cash-=cost*.1;s.totalExpense+=cost*.1;return s;}

export function launchStreaming(state){const s=deepClone(state);if(!s.streaming.unlocked||s.streaming.launched||s.cash<3500000)return s;s.cash-=3500000;s.totalExpense+=3500000;s.streaming.launched=true;s.streaming.subscribers=2500;s.news.unshift({date:s.date,type:'green',text:`${s.streaming.name} launched nationally.`});return s;}
export function updateStreaming(state,patch){const s=deepClone(state);Object.assign(s.streaming,patch);return s;}
export function updateNewsroom(state,key,delta){const s=deepClone(state);if(['bureaus','reporters','weather','sportsDesk','investigative'].includes(key)){const cost={bureaus:650000,reporters:140000,weather:280000,sportsDesk:320000,investigative:450000}[key]*delta;if(delta>0&&s.cash<cost)return s;s.newsroom[key]=Math.max(0,s.newsroom[key]+delta);s.cash-=cost;s.totalExpense+=Math.max(0,cost)}return s;}
export function setAutomation(state,key,value){const s=deepClone(state);s.automation[key]=value;return s;}
export function updateNetwork(state,patch){const s=deepClone(state);Object.assign(s.network,patch);return s;}

export function audition(state,programId,talentId,roleId=null){
  const s=deepClone(state),p=getProgram(s,programId),talent=getEmployee(s,talentId)||s.candidates.find(x=>x.id===talentId);if(!p||!talent)return s;const role=roleId||p.roles?.[0]?.id||'lead';const r=seeded(`${p.id}-${role}-${talent.id}-chemistry`);const fit=(talent.skills.acting||talent.skills.charisma||talent.overall)*.65+(talent.popularity||30)*.15+r()*20;p.auditions=p.auditions||[];p.auditions=p.auditions.filter(x=>!(x.talentId===talentId&&x.roleId===role));p.auditions.push({talentId,roleId:role,fit:clamp(fit,20,98),chemistry:clamp(40+r()*55,20,98)});return s;
}
export function castTalent(state,programId,talentId,roleId=null){const s=deepClone(state),p=getProgram(s,programId);if(!p)return s;const role=roleId||p.roles?.[0]?.id||'lead',a=p.auditions?.find(x=>x.talentId===talentId&&x.roleId===role);if(a){p.castAssignments=p.castAssignments||{};p.castAssignments[role]=talentId;p.cast=Object.values(p.castAssignments);p.team.leadTalent=p.castAssignments[p.roles?.[0]?.id]||p.cast[0]||null;const auditions=p.cast.map(id=>p.auditions?.find(x=>x.talentId===id&&x.roleId===Object.keys(p.castAssignments).find(k=>p.castAssignments[k]===id))).filter(Boolean);p.chemistry=auditions.length?avg(auditions.map(x=>x.chemistry)):50;p.awareness=clamp(p.awareness+(getEmployee(s,talentId)?.popularity||20)*.08,0,100)}return s;}

export function createLicenseDeal(state,programId){
  const s=deepClone(state),p=getProgram(s,programId),ip=p&&getIP(s,p.ipId);if(!p||!ip||p.airings<2)return s;const annual=Math.max(80000,(p.viewer*.4+p.critic*.25+ip.popularity*.35)*12000);s.licenses.push({id:uid('lic'),programId:p.id,name:`${p.title} Syndication`,annualRevenue:annual,term:3,status:'Active'});return s;
}
export function createMerchDeal(state,ipId,mode='License'){
  const s=deepClone(state),ip=getIP(s,ipId);if(!ip||ip.fandom<35)return s;let annual=Math.max(50000,(ip.fandom*.5+ip.popularity*.25+(ip.merchPotential||20)*.25)*9000);if(mode==='Direct'){const upfront=450000;if(s.cash<upfront)return s;s.cash-=upfront;s.totalExpense+=upfront;annual*=1.6;}s.merchDeals.push({id:uid('merch'),ipId,partner:mode==='Direct'?'PCN Consumer Products':'Licensed Consumer Products',mode,baseAnnual:annual,status:'Active'});return s;
}

export function runPromotion(state,programId,type){
  const s=deepClone(state),p=getProgram(s,programId);if(!p)return s;const options={network:{name:'Network Promos',cost:50000,awareness:3,momentum:.5},digital:{name:'Digital Campaign',cost:80000,awareness:5,momentum:.7},outdoor:{name:'Outdoor Campaign',cost:150000,awareness:4,momentum:.4},press:{name:'Press Tour',cost:120000,awareness:4,momentum:1.2},premiere:{name:'Premiere Event',cost:220000,awareness:6,momentum:1.5},awards:{name:'Awards Campaign',cost:350000,awareness:1,momentum:.2,awards:12}};const o=options[type];if(!o||s.cash<o.cost)return s;s.cash-=o.cost;s.totalExpense+=o.cost;p.marketingSpend=(p.marketingSpend||0)+o.cost;p.awareness=clamp((p.awareness||0)+o.awareness,0,100);p.momentum=clamp((p.momentum||0)+o.momentum,-30,30);p.awardsCampaign=clamp((p.awardsCampaign||0)+(o.awards||0),0,40);s.news.unshift({date:s.date,type:'green',text:`${o.name} launched for ${p.title}.`});return s;
}

export function programPnL(s,p){
  const production=(p.productionSpend||0)+(p.residualSpend||0);return {revenue:(p.revenue||0)+(p.licensingRevenue||0)+(p.merchRevenue||0),production,marketing:p.marketingSpend||0,residuals:p.residualSpend||0,contribution:(p.revenue||0)+(p.licensingRevenue||0)+(p.merchRevenue||0)-production-(p.marketingSpend||0)};
}

export function createSpinOff(state,ipId,title){
  const s=deepClone(state),ip=getIP(s,ipId);if(!ip)return s;const p=makeProgramDraft({title:title||`${ip.name}: After Hours`,format:'Factual',genre:'Talk',episodes:26,duration:30,target:{...ip.affinity},art:'bars',font:'wide',p1:'#9272d1',p2:'#1b213d',ipId});p.awareness=ip.popularity*.45;p.marketing=10;s.programs.push(p);ip.fatigue=clamp(ip.fatigue+2,0,100);return s;
}
