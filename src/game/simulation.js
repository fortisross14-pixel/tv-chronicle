import { BROADCAST_SLOTS, CONCEPT_ANGLES, DEMOS, DAYS, FORMAT_NEEDS, SLOT_MULT, THEME_NOVELTY, slotBand } from './constants.js';
import { addDays, affinity, avg, clamp, dayIndex, deepClone, seeded, uid } from './utils.js';
import { makeProgramDraft, rolesFor } from './seed.js';

export const getIP=(s,id)=>s.ips.find(x=>x.id===id);
export const getProgram=(s,id)=>s.programs.find(x=>x.id===id);
export const getEmployee=(s,id)=>s.employees.find(x=>x.id===id);
export const networkReachHouseholds=s=>s.states.reduce((sum,x)=>sum+x.households*x.coverage,0);
export const totalPotentialHouseholds=s=>s.states.reduce((sum,x)=>sum+x.households,0);
export const researched=(s,id)=>!!s.tech.find(t=>t.id===id)?.researched;

function sendMail(s,from,subject,body,category='info',meta={}){
  s.emails=s.emails||[];
  s.emails.unshift({id:uid('mail'),date:s.date,from,subject,body,read:false,category,...meta});
  s.emails=s.emails.slice(0,250);
}

export function markMailRead(state,id){const s=deepClone(state),m=s.emails.find(x=>x.id===id);if(m)m.read=true;return s;}
export function markAllMailRead(state){const s=deepClone(state);s.emails.forEach(m=>m.read=true);return s;}

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
  const pop=ip?.popularity||8,nov=ip?.novelty||35,fatigue=ip?.fatigue||0;
  const popNov=pop*.52+nov*.28+Math.min(pop,nov)*.20;
  const quality=program.quality||((program.scriptStars||2.5)*16);
  const viewer=program.premiered?(program.viewer||50):quality;
  const critic=program.premiered?(program.critic||50):quality;
  const reception=viewer*.52+critic*.18+quality*.30;
  const marketing=Math.min(15,(program.marketing||0)*.12);
  return clamp(popNov*.48+reception*.42+(program.momentum||0)*.25-fatigue*.22+marketing,5,100);
}

function weightedAffinity(program,ip){return avg(DEMOS.map(([k])=>(program.target?.[k]||45)*.58+(ip?.affinity?.[k]||45)*.42));}

export function calcAudience(s,program,slotKeyOrTime,date){
  const ip=getIP(s,program.ipId);
  const reach=networkReachHouseholds(s);
  const band=SLOT_MULT[slotKeyOrTime]?slotKeyOrTime:slotBand(slotKeyOrTime||'20:00');
  const rand=seeded(`${date}-${program.id}-${slotKeyOrTime}-${program.airings||0}`);
  const demoFit=weightedAffinity(program,ip),appeal=effectiveAppeal(program,ip);
  const awareness=clamp((program.awareness||8)+(s.network.prestige||5)*.22+(s.network.trust||5)*.08,3,100);
  const threat=avg((s.competitors||[]).map(c=>band==='prime'?(c.prime||c.strength):['morning','fringe'].includes(band)?(c.daytime||c.strength):(c.strength||60)));
  const competition=clamp(1.03-threat*.0027+rand()*.20,.68,1.08);
  const slot=SLOT_MULT[band]||.6;
  const adPenalty=clamp(1-(Math.max(0,(program.adLoad??12)-12)*.012),.72,1);
  const streamingPenalty=s.streaming?.launched?(s.streaming.libraryWindow<=7 ? .955 : s.streaming.libraryWindow<=30 ? .982 : .993):1;
  const conversion=clamp((demoFit*.0022+appeal*.0025+awareness*.00125)*slot*competition*adPenalty*streamingPenalty,0.004,.42);
  const audience=reach*conversion;
  const demoShares={},weights=DEMOS.map(([k])=>Math.max(1,(program.target?.[k]||40)*.58+(ip?.affinity?.[k]||40)*.42)),sum=weights.reduce((a,b)=>a+b,0);
  DEMOS.forEach(([k],i)=>demoShares[k]=audience*weights[i]/sum);
  return {audience,demoShares,conversion,appeal,demoFit};
}

export function executionQuality(s,p,focus=p.productionFocus){
  const needs=FORMAT_NEEDS[p.genre]||FORMAT_NEEDS.default;
  let weighted=0,total=0;Object.keys(needs).forEach(k=>{weighted+=(focus?.[k]??50)*needs[k];total+=needs[k]});
  const dept=weighted/Math.max(1,total),sr=getEmployee(s,p.team?.showrunner),wr=getEmployee(s,p.team?.leadWriter),director=getEmployee(s,p.team?.director);
  const castPeople=(p.cast||[]).map(id=>getEmployee(s,id)).filter(Boolean),castQuality=castPeople.length?avg(castPeople.map(t=>t.skills?.acting||t.skills?.charisma||t.overall)):48;
  const team=(sr?.skills?.vision||sr?.overall||45)*.22+(wr?.skills?.writing||wr?.overall||45)*.18+castQuality*.19+(director?.skills?.direction||director?.overall||45)*.12;
  const scripts=(p.scriptStars||2.5)*6.4,chemistry=(p.chemistry||50)*.08;
  let tech=0;if(p.technical?.resolution==='4K')tech+=2.5;if(p.technical?.hdr)tech+=1.7;if(p.technical?.audio==='5.1')tech+=1;if(p.technical?.audio==='Immersive')tech+=2;if(researched(s,'t_vfx')&&(needs.vfx||0)>.9)tech+=3.2;
  return clamp(dept*.48+team+scripts+chemistry+tech-23,20,97);
}

function formatBaseNovelty(format,genre){
  // Format choice sets the floor, but creative people create most of the upside.
  if(genre==='News'||genre==='Morning')return 6;
  if(format==='Reality')return genre==='Survival'?22:genre==='Social Experiment'?30:18;
  if(format==='Scripted')return ['Science Fiction','Fantasy'].includes(genre)?28:['Medical','Crime'].includes(genre)?14:20;
  if(format==='Live')return 12;
  return 16;
}

function conceptNovelty(s,d,writer){
  const base=formatBaseNovelty(d.format,d.genre);
  const theme=(THEME_NOVELTY[d.theme]??0)*.65;
  const angle=(CONCEPT_ANGLES[d.angle]?.novelty??0)*.65;
  const originality=(writer?.skills?.originality||writer?.skills?.writing||writer?.overall||50)-50;
  const craft=(writer?.skills?.writing||writer?.overall||50)-60;
  const expertise=(s.network.expertise?.[d.format]||0)-4;
  const r=seeded(`novelty-${d.id}-${s.date}`)();
  return clamp(base+theme+angle+originality*.58+craft*.16+expertise*.4+(r-.5)*10,4,96);
}

function scriptRating(s,d,writer){
  const writing=writer?.skills?.writing||writer?.overall||45,plot=writer?.skills?.plotting||writing,dialogue=writer?.skills?.dialogue||writing,originality=writer?.skills?.originality||writing;
  const expertise=s.network.expertise?.[d.format]||0,r=seeded(`script-${d.id}-${s.date}`)();
  const angleRisk=CONCEPT_ANGLES[d.angle]?.risk??0;
  const raw=(writing*.42+plot*.25+dialogue*.18+originality*.15)+expertise*1.2-angleRisk*.18+(r-.5)*16;
  return Math.round(clamp(1+(raw-38)/15,1,5)*2)/2;
}

export function commissionScript(state,form){
  const s=deepClone(state),writer=getEmployee(s,form.writerId);if(!writer||!writer.role.includes('Writer'))return s;
  const episodes=Number(form.episodes),duration=Number(form.duration),speed=writer.skills.speed||65;
  const totalDays=Math.max(4,Math.round(episodes*(duration/30)*(8.5-speed/18)*(form.format==='Scripted'?1:form.format==='Reality' ? .72 : .45)));
  const cost=Math.round(episodes*(duration/30)*(form.format==='Scripted'?13000:form.format==='Reality'?7500:4500));if(s.cash<cost*.25)return s;
  const d={id:uid('dev'),title:form.title,format:form.format,genre:form.genre,theme:form.theme||'Contemporary',topic:form.topic||'',angle:form.angle||'Fresh',episodes,duration,writerId:writer.id,status:'Writing',daysRemaining:totalDays,totalDays,cost,spent:cost*.25,scriptStars:null,novelty:null,target:form.target||affinity(),art:form.art,font:form.font,p1:form.p1,p2:form.p2,ipId:form.ipId||'new',created:s.date};
  s.developments.push(d);s.cash-=cost*.25;s.totalExpense+=cost*.25;
  sendMail(s,'Development Office',`Script commissioned: ${d.title}`,`${writer.name} has started a ${episodes}-episode, ${duration}-minute ${d.genre} project. Estimated writing time: ${totalDays} days. Theme: ${d.theme}.`, 'development',{developmentId:d.id});
  return s;
}

export function rewriteDevelopment(state,id){
  const s=deepClone(state),d=s.developments.find(x=>x.id===id),writer=d&&getEmployee(s,d.writerId);if(!d||d.status!=='Complete'||!writer)return s;
  d.status='Rewrite';d.daysRemaining=Math.max(3,Math.round(d.totalDays*.28));d.totalDays=d.daysRemaining;d.rewriteCount=(d.rewriteCount||0)+1;const cost=Math.max(12000,d.cost*.18);if(s.cash<cost)return state;s.cash-=cost;s.totalExpense+=cost;d.spent+=cost;
  sendMail(s,'Development Office',`Rewrite started: ${d.title}`,`${writer.name} has begun rewrite ${d.rewriteCount}. Expected turnaround: ${d.daysRemaining} days.`, 'development',{developmentId:d.id});return s;
}

function developmentDay(s){
  s.developments.forEach(d=>{
    if(!['Writing','Rewrite'].includes(d.status))return;
    d.daysRemaining--;
    if(d.daysRemaining>0)return;
    const writer=getEmployee(s,d.writerId);d.status='Complete';d.scriptStars=scriptRating(s,d,writer);d.novelty=conceptNovelty(s,d,writer);
    const remaining=Math.max(0,d.cost-(d.spent||0));s.cash-=remaining;s.totalExpense+=remaining;d.spent=(d.spent||0)+remaining;
    const qualityText=d.scriptStars>=4.5?'Exceptional':d.scriptStars>=4?'Strong':d.scriptStars>=3?'Solid':d.scriptStars>=2?'Uneven':'Weak';
    sendMail(s,writer?.name||'Writers Room',`Script finalized: ${d.title}`,`${qualityText} script package completed.\n\nEpisodes: ${d.episodes}\nDuration: ${d.duration} minutes\nFormat: ${d.format} / ${d.genre}\nTheme: ${d.theme}${d.topic?`\nTopic: ${d.topic}`:''}\nWriter: ${writer?.name||'Unknown'}\nCoverage rating: ${d.scriptStars.toFixed(1)} / 5 stars\nCreative novelty estimate: ${Math.round(d.novelty)} / 100\n\nThe script can remain on the shelf, be rewritten, or move into pre-production.`, 'script',{developmentId:d.id});
  });
}

export function greenlightDevelopment(state,id,{showrunnerId,directorId,budgetPerEpisode}={}){
  const s=deepClone(state),d=s.developments.find(x=>x.id===id);if(!d||d.status!=='Complete')return s;
  const showrunner=getEmployee(s,showrunnerId),director=getEmployee(s,directorId);if(!showrunner||!director)return s;
  if(d.seasonRenewalFor){
    const p=getProgram(s,d.seasonRenewalFor),ip=p&&getIP(s,p.ipId);if(!p||!ip)return s;
    p.season=d.nextSeason||p.season+1;p.status='Pre-production';p.scriptStars=d.scriptStars;p.scripts=Array.from({length:d.episodes},(_,i)=>({episode:i+1,title:`Episode ${i+1}`,stars:d.scriptStars,notes:'Approved season draft',status:'Ready'}));p.pipeline={scripted:d.episodes,pre:0,filmed:0,ready:0,aired:0};p.airings=0;p.totalAudience=0;p.lastAudience=0;p.premiered=false;p.viewer=0;p.critic=0;p.quality=0;p.team.leadWriter=d.writerId;p.team.showrunner=showrunnerId;p.team.director=directorId;p.budgetPerEpisode=Number(budgetPerEpisode)||p.budgetPerEpisode;p.baseBudgetPerEpisode=p.budgetPerEpisode;p.developmentId=d.id;p.productionNoveltyBoost=((showrunner.skills.vision||showrunner.overall)-60)*.30+((showrunner.skills.originality||showrunner.skills.vision||60)-60)*.22+(d.creativeChange||0)*.08;
    d.status='Greenlit';d.programId=p.id;sendMail(s,'Studio Office',`Season ${p.season} greenlit: ${p.title}`,`The new season script package has moved into pre-production. Established visual identity and IP remain intact. Recast only if desired, then begin the next production cycle.`, 'production',{programId:p.id});return s;
  }
  let ipId=d.ipId;
  if(!ipId||ipId==='new'){
    const ip={id:uid('ip'),name:d.title,origin:'Original',genre:d.genre,popularity:4,novelty:d.novelty,fatigue:0,prestige:5,fandom:3,flexibility:clamp(48+((showrunner.skills.vision||showrunner.overall)-60)*.3,25,85),value:Math.max(150000,d.cost*1.4),affinity:{...d.target},seasons:1,identity:[d.genre,d.theme,d.angle],merchPotential:d.format==='Scripted'?40:d.format==='Reality'?35:10};s.ips.push(ip);ipId=ip.id;
  }
  const p=makeProgramDraft({title:d.title,format:d.format,genre:d.genre,episodes:d.episodes,duration:d.duration,target:d.target,art:d.art,font:d.font,p1:d.p1,p2:d.p2,ipId});
  p.scriptStars=d.scriptStars;p.scripts=Array.from({length:d.episodes},(_,i)=>({episode:i+1,title:`Episode ${i+1}`,stars:d.scriptStars,notes:'Approved production draft',status:'Ready'}));p.team.leadWriter=d.writerId;p.team.showrunner=showrunnerId;p.team.director=directorId;p.budgetPerEpisode=Number(budgetPerEpisode)||p.budgetPerEpisode;p.baseBudgetPerEpisode=p.budgetPerEpisode;p.developmentId=d.id;p.productionNoveltyBoost=((showrunner.skills.vision||showrunner.overall)-60)*.30+((showrunner.skills.originality||showrunner.skills.vision||60)-60)*.22;
  d.status='Greenlit';d.programId=p.id;s.programs.push(p);
  sendMail(s,'Studio Office',`Greenlight approved: ${p.title}`,`${p.title} has moved into pre-production. Showrunner: ${showrunner.name}. Director: ${director.name}. Cast the required roles and secure a soundstage before principal production can begin.`, 'production',{programId:p.id});return s;
}

export function canStartProduction(s,p){
  if(!p||p.status!=='Pre-production')return {ok:false,reason:'Not in pre-production'};
  if((s.facilities.studios||0)<1)return {ok:false,reason:'Build at least one soundstage'};
  if(!getEmployee(s,p.team?.showrunner))return {ok:false,reason:'Hire/assign a showrunner'};
  if(!getEmployee(s,p.team?.director))return {ok:false,reason:'Hire/assign a director'};
  const missing=(p.roles||[]).filter(r=>!p.castAssignments?.[r.id]);if(missing.length)return {ok:false,reason:`Cast ${missing.map(x=>x.name).join(', ')}`};
  return {ok:true,reason:'Ready'};
}

export function beginProduction(state,programId){
  const s=deepClone(state),p=getProgram(s,programId),check=canStartProduction(s,p);if(!check.ok)return s;
  p.status='Production';p.productionStart=s.date;p.pipeline.pre=0;p.pipeline.filmed=0;p.pipeline.ready=0;
  sendMail(s,'Production Office',`Principal production started: ${p.title}`,`${p.title} is now in active production. Episodes will move through pre-production, filming and post over time.`, 'production',{programId:p.id});return s;
}

export function startFacilityBuild(state,key){
  const s=deepClone(state);if(s.facilityProjects.some(x=>x.key===key))return s;
  const defs={studios:{name:'Soundstage',days:60,cost:1800000},post:{name:'Post-production Suite',days:40,cost:900000},newsroom:{name:'Newsroom',days:45,cost:1200000},vfx:{name:'VFX Facility',days:75,cost:2400000},wardrobe:{name:'Wardrobe Department',days:28,cost:500000},setShop:{name:'Set Construction Shop',days:35,cost:800000},archive:{name:'Archive',days:24,cost:420000},research:{name:'Research Lab',days:42,cost:750000}};
  const d=defs[key];if(!d)return s;const level=(s.facilities[key]||0)+1,cost=d.cost*level;if(s.cash<cost*.25)return s;
  s.cash-=cost*.25;s.totalExpense+=cost*.25;s.facilityProjects.push({id:uid('fac'),key,name:`${d.name} L${level}`,daysRemaining:d.days,totalDays:d.days,cost,paid:cost*.25});
  sendMail(s,'Facilities',`Construction started: ${d.name}`,`Level ${level} construction is underway. Estimated completion: ${d.days} days.`, 'facility');return s;
}

function facilityDay(s){s.facilityProjects.forEach(p=>{p.daysRemaining--;if(p.daysRemaining<=0){s.facilities[p.key]=(s.facilities[p.key]||0)+1;const rem=p.cost-p.paid;s.cash-=rem;s.totalExpense+=rem;sendMail(s,'Facilities',`Construction complete: ${p.name}`,`${p.name} is operational and available to the studio.`, 'facility')}});s.facilityProjects=s.facilityProjects.filter(x=>x.daysRemaining>0);}

export function startStaffSearch(state,role){
  const s=deepClone(state);if(!role)return s;const fee=12000,days=3+Math.round(seeded(`${s.date}-${role}`)()*5);if(s.cash<fee)return s;
  s.cash-=fee;s.totalExpense+=fee;s.staffSearches.push({id:uid('search'),role,status:'Searching',daysRemaining:days,totalDays:days});
  sendMail(s,'Talent & HR',`Search opened: ${role}`,`Recruiters have started sourcing candidates for ${role}. Expected shortlist: ${days} days.`, 'hiring');return s;
}

function searchDay(s){
  s.staffSearches.forEach(x=>{if(x.status!=='Searching')return;x.daysRemaining--;if(x.daysRemaining>0)return;x.status='Complete';const exact=s.candidateMarket.filter(c=>c.role===x.role),near=s.candidateMarket.filter(c=>c.role.includes(x.role)||x.role.includes(c.role));const pool=(exact.length?exact:near).slice().sort((a,b)=>b.overall-a.overall);const shortlist=pool.slice(0,4).map(c=>c.id);s.candidateShortlists.push({id:uid('short'),searchId:x.id,role:x.role,candidateIds:shortlist,date:s.date});const names=shortlist.map(id=>s.candidateMarket.find(c=>c.id===id)?.name).filter(Boolean);sendMail(s,'Talent & HR',`Candidate shortlist ready: ${x.role}`,names.length?`Recruiting has completed the search. Candidates: ${names.join(', ')}. Open Organization → People to negotiate.`:'No suitable candidates were found in this search. Try again later.', 'hiring',{searchId:x.id});});
}

export function startNegotiation(state,candidateId,offerSalary,years=3,bonus=0,backend=0,creativeControl=0){
  const s=deepClone(state),c=s.candidateMarket.find(x=>x.id===candidateId);if(!c||s.negotiations.some(n=>n.candidateId===candidateId&&n.status==='Negotiating'))return s;
  const days=2+Math.floor(seeded(`${s.date}-${candidateId}-neg` )()*3);s.negotiations.push({id:uid('neg'),candidateId,status:'Negotiating',daysRemaining:days,totalDays:days,offerSalary:Number(offerSalary),years:Number(years),bonus:Number(bonus),backend:Number(backend),creativeControl:Number(creativeControl)});
  sendMail(s,'Business Affairs',`Offer submitted: ${c.name}`,`${c.name}'s representatives are reviewing your ${years}-year offer at $${Math.round(Number(offerSalary)).toLocaleString()}/year. Expected response in ${days} days.`, 'hiring');return s;
}

function negotiationDay(s){
  s.negotiations.forEach(n=>{if(n.status!=='Negotiating')return;n.daysRemaining--;if(n.daysRemaining>0)return;const c=s.candidateMarket.find(x=>x.id===n.candidateId);if(!c){n.status='Closed';return}const ratio=n.offerSalary/(c.ask||1),prestige=s.network.prestige||5,r=seeded(`${s.date}-${c.id}-${n.offerSalary}-${n.years}-${n.backend}-${n.creativeControl}`)();const acceptance=ratio*.60+prestige/100*.12+n.years/5*.06+n.backend*.018+n.creativeControl/100*.08+r*.14;
    if(acceptance>=.72){n.status='Accepted';c.salary=n.offerSalary;c.contractYears=n.years;c.backend=n.backend;c.creativeControl=n.creativeControl;s.employees.push(c);s.candidateMarket=s.candidateMarket.filter(x=>x.id!==c.id);s.cash-=n.bonus;s.totalExpense+=n.bonus;sendMail(s,c.name,`Offer accepted — ${c.name} joins ${s.network.initials}`,`${c.name} has accepted your offer and joins as ${c.role}. Salary: $${Math.round(c.salary).toLocaleString()}/year. Contract: ${c.contractYears} years.`, 'hiring',{employeeId:c.id});}
    else {n.status='Rejected';sendMail(s,c.name,`Offer declined — ${c.name}`,`${c.name}'s representatives declined the current offer. You can reopen negotiations with improved terms after another search/shortlist.`, 'hiring');}
  });
}

export function audition(state,programId,talentId,roleId=null){
  const s=deepClone(state),p=getProgram(s,programId),talent=getEmployee(s,talentId);if(!p||!talent||talent.dept!=='Talent')return s;const role=roleId||p.roles?.[0]?.id||'lead';const r=seeded(`${p.id}-${role}-${talent.id}-chemistry`),fit=(talent.skills.acting||talent.skills.charisma||talent.overall)*.65+(talent.popularity||30)*.15+r()*20;p.auditions=p.auditions||[];p.auditions=p.auditions.filter(x=>!(x.talentId===talentId&&x.roleId===role));p.auditions.push({talentId,roleId:role,fit:clamp(fit,20,98),chemistry:clamp(40+r()*55,20,98)});return s;
}
export function castTalent(state,programId,talentId,roleId=null){const s=deepClone(state),p=getProgram(s,programId);if(!p)return s;const role=roleId||p.roles?.[0]?.id||'lead',a=p.auditions?.find(x=>x.talentId===talentId&&x.roleId===role);if(a){p.castAssignments=p.castAssignments||{};p.castAssignments[role]=talentId;p.cast=Object.values(p.castAssignments);p.team.leadTalent=p.castAssignments[p.roles?.[0]?.id]||p.cast[0]||null;const aud=p.cast.map(id=>p.auditions?.find(x=>x.talentId===id)).filter(Boolean);p.chemistry=aud.length?avg(aud.map(x=>x.chemistry)):50;}return s;}

function productionDay(s){
  const active=s.programs.filter(p=>p.status==='Production');if(!active.length)return;
  active.forEach(p=>{
    const sr=getEmployee(s,p.team.showrunner),director=getEmployee(s,p.team.director),durationScale=p.duration/60,stageShare=Math.max(.45,(s.facilities.studios||1)/active.length);
    const management=((sr?.skills.management||sr?.overall||55)+(director?.skills.management||director?.overall||55))/120;
    const travel=p.travel==='High'?(researched(s,'t_remote') ? .9 : .72):p.travel==='Medium'? .86:1;
    const preRate=.12*management/durationScale,filmRate=.085*management*stageShare*travel/durationScale,postRate=.10*(1+s.facilities.post*.25)*(researched(s,'t_cloud')?1.2:1)/durationScale;
    const beforeReady=p.pipeline.ready;
    if(p.pipeline.pre<p.episodes)p.pipeline.pre=clamp(p.pipeline.pre+preRate,0,p.episodes);
    if(p.pipeline.filmed<Math.min(p.episodes,p.pipeline.pre))p.pipeline.filmed=clamp(p.pipeline.filmed+filmRate,0,Math.min(p.episodes,p.pipeline.pre));
    if(p.pipeline.ready<Math.min(p.episodes,p.pipeline.filmed))p.pipeline.ready=clamp(p.pipeline.ready+postRate,0,Math.min(p.episodes,p.pipeline.filmed));
    const deltaReady=p.pipeline.ready-beforeReady,daily=Math.max(500,(p.budgetPerEpisode*p.episodes)/(Math.max(20,p.episodes*6*durationScale)));s.cash-=daily;s.totalExpense+=daily;p.productionSpend+=daily;
    if(Math.floor(beforeReady)<1&&Math.floor(p.pipeline.ready)>=1)sendMail(s,'Production Office',`First episode delivered: ${p.title}`,`Episode 1 of ${p.title} is broadcast-ready. The season remains in production, but you can now schedule the premiere.`, 'production',{programId:p.id});
    if(p.pipeline.ready>=p.episodes-.001){p.pipeline.ready=p.episodes;p.status='Ready';p.quality=executionQuality(s,p);const ip=getIP(s,p.ipId);if(ip)ip.novelty=clamp(ip.novelty+(p.productionNoveltyBoost||0),0,100);const gain=.15+(p.quality/100)*.2;s.network.expertise[p.format]=clamp((s.network.expertise[p.format]||0)+gain,0,10);sendMail(s,'Production Office',`Season delivered: ${p.title}`,`All ${p.episodes} episodes are broadcast-ready. Final production execution: ${Math.round(p.quality)}/100. ${p.format} expertise increased to ${s.network.expertise[p.format].toFixed(1)}/10.`, 'production',{programId:p.id});}
  });
}

function revealReception(s,p){
  if(p.premiered)return;const ip=getIP(s,p.ipId),sr=getEmployee(s,p.team?.showrunner),director=getEmployee(s,p.team?.director);p.quality=p.quality||executionQuality(s,p);const r=seeded(`premiere-${p.id}-${s.date}`),viewer=clamp(p.quality*.55+(p.scriptStars*20)*.18+(p.chemistry||50)*.11+(ip?.popularity||5)*.08+(ip?.novelty||30)*.08+(r()-.5)*10,25,96),critic=clamp(p.quality*.48+(p.scriptStars*20)*.30+(sr?.skills?.vision||60)*.10+(director?.skills?.direction||60)*.08+(ip?.novelty||30)*.08+(r()-.5)*12-8,12,99);p.viewer=Math.round(viewer);p.critic=Math.round(critic);p.premiered=true;
  sendMail(s,'Audience Research',`Premiere report: ${p.title}`,`${p.title} has aired for the first time.\n\nViewer score (IMDb-style): ${(p.viewer/10).toFixed(1)} / 10\nCritic score (Rotten-style): ${p.critic}%\nScript: ${p.scriptStars.toFixed(1)} / 5 stars\nExecution: ${Math.round(p.quality)} / 100\n\nPopularity and word of mouth will now evolve from actual audience response.`, 'ratings',{programId:p.id});
}

function blockEnd(start,duration){const [h,m]=start.split(':').map(Number),mins=h*60+m+duration,dayShift=Math.floor(mins/1440),end=mins%1440;return `${dayShift?'+1 ':''}${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;}
function startMinutes(t){const [h,m]=t.split(':').map(Number);return h*60+m;}
export function isSchedulable(p){return !!p&&(p.acquired||Math.floor(p.pipeline.ready-p.pipeline.aired)>0||p.genre==='Live Sports');}
export function scheduleProgram(state,day,start,programId){
  const s=deepClone(state),p=getProgram(s,programId);if(!p||!isSchedulable(p))return s;const startM=startMinutes(start),endM=startM+p.duration;
  if(startM<720&&endM>720)return s; // no crossing the 12:00-15:00 dark window
  const blocks=s.scheduleBlocks[day]||[],overlap=blocks.some(b=>{const bp=getProgram(s,b.programId),a=startM,c=endM,x=startMinutes(b.start),y=x+(bp?.duration||b.duration||30);return a<y&&c>x});if(overlap)return s;
  blocks.push({id:uid('slot'),programId:p.id,start,duration:p.duration});blocks.sort((a,b)=>startMinutes(a.start)-startMinutes(b.start));s.scheduleBlocks[day]=blocks;return s;
}
export function removeScheduleBlock(state,day,blockId){const s=deepClone(state);s.scheduleBlocks[day]=(s.scheduleBlocks[day]||[]).filter(x=>x.id!==blockId);return s;}
export const scheduleBlockEnd=(b,p)=>blockEnd(b.start,p?.duration||b.duration||30);

function deliverAds(s,program,audienceByDemo,band){let rev=0;const active=s.adCampaigns.filter(a=>a.status==='Active'&&a.days>0&&(!a.programIds?.length||a.programIds.includes(program.id)));active.forEach(a=>{const targetImps=(audienceByDemo[a.target]||0)+(audienceByDemo[a.secondary]||0)*.42,slotQuality=SLOT_MULT[band]||.6,adInventory=clamp((program.adLoad??12)/12,.65,1.7),deliver=Math.min(targetImps*slotQuality*adInventory,a.goal-a.delivered);if(deliver<=0)return;const value=deliver/1000*a.cpm*5*(researched(s,'t_analytics')?1.08:1),capped=Math.min(value,a.remaining),actual=value>0?deliver*(capped/value):0;a.delivered+=actual;a.remaining-=capped;rev+=capped;if(a.delivered>=a.goal*.995||a.remaining<100)a.status='Delivered'});return rev;}
function sponsorRevenue(s,p){return s.sponsorships.filter(x=>x.status==='Active'&&x.programId===p.id&&x.weeks>0).reduce((sum,x)=>sum+x.offer/(x.totalWeeks||x.weeks||10)/7,0);}

function airDay(s){
  const d=DAYS[dayIndex(s.date)],blocks=s.scheduleBlocks?.[d]||[];let totalAudience=0,revenue=0;
  blocks.forEach(b=>{const p=getProgram(s,b.programId);if(!p)return;const available=Math.floor(p.pipeline.ready)-Math.floor(p.pipeline.aired),seasonComplete=Math.floor(p.pipeline.aired)>=p.episodes;if(available<=0&&!seasonComplete&&p.genre!=='Live Sports'){sendMail(s,'Master Control',`Missed airing: ${p.title}`,`${p.title} could not air at ${b.start}: no broadcast-ready episode/run remained.`, 'warning',{programId:p.id});return}revealReception(s,p);const band=slotBand(b.start),r=calcAudience(s,p,b.start,s.date);if(seasonComplete){r.audience*=.72;Object.keys(r.demoShares).forEach(k=>r.demoShares[k]*=.72)}p.lastAudience=r.audience;p.totalAudience=(p.totalAudience||0)+r.audience;p.airings=(p.airings||0)+1;totalAudience+=r.audience;if(Math.floor(p.pipeline.aired)<p.episodes)p.pipeline.aired=Math.min(p.episodes,p.pipeline.aired+1);const ip=getIP(s,p.ipId);if(ip){const reception=(p.viewer+p.critic)/2,buzz=(reception-62)/38+(r.audience/Math.max(1,networkReachHouseholds(s))-.06)*4;p.momentum=clamp((p.momentum||0)*.82+buzz,-30,30);ip.popularity=clamp(ip.popularity+buzz*.14,0,100);ip.novelty=clamp(ip.novelty-.06,0,100);if(ip.novelty<25)ip.fatigue=clamp((ip.fatigue||0)+.04,0,100);ip.value=Math.max(100000,ip.value*(1+buzz*.002))}p.awareness=clamp((p.awareness||8)+.04+r.audience/Math.max(1,networkReachHouseholds(s))*.4,0,100);const adRev=deliverAds(s,p,r.demoShares,band),spRev=sponsorRevenue(s,p),localSpot=r.audience/1000*18*clamp((p.adLoad??12)/12,.7,1.6),showRev=adRev+spRev+localSpot;p.revenue+=showRev;revenue+=showRev;s.ratingsLog.push({date:s.date,day:d,start:b.start,programId:p.id,audience:r.audience,viewer:p.viewer,critic:p.critic});});
  s.cash+=revenue;s.totalRevenue+=revenue;s.lastDayRevenue=revenue;s.lastDayAudience=totalAudience;s.weeklyAudience=(s.weeklyAudience||0)*.78+totalAudience*.22;s.ratingsLog=s.ratingsLog.slice(-1200);
}

function researchDay(s){if(!s.research)return;const t=s.tech.find(x=>x.id===s.research.techId);if(!t){s.research=null;return}const staff=s.employees.filter(e=>e.dept==='Technology'),speed=Math.max(.12,avg(staff.map(e=>e.skills.technology||e.overall))/150)*(1+s.facilities.research*.08);t.progress=clamp((t.progress||0)+speed,0,100);const cost=Math.max(1200,(t.cost||500000)/180);s.cash-=cost;s.totalExpense+=cost;if(t.progress>=100){t.researched=true;s.research=null;sendMail(s,'Technology',`Research completed: ${t.name}`,`${t.name} is now an operational network capability.`, 'research');if(t.id==='t_stream')s.streaming.unlocked=true;}}
function dailyOverhead(s){const payroll=s.employees.reduce((sum,e)=>sum+(e.salary||0),0)/365,f=s.facilities,facilities=(f.studios*260000+f.post*180000+f.newsroom*240000+f.vfx*300000+f.wardrobe*90000+f.setShop*120000+f.control*150000+f.archive*70000+f.research*110000)/365,rights=s.contracts.reduce((sum,c)=>sum+(c.annualCost||0)/365,0),expense=payroll+facilities+rights+2500;s.cash-=expense;s.totalExpense+=expense;s.lastDayExpense=expense;}
function commercialDay(s){const epoch=Math.floor(new Date(`${s.date}T12:00:00`).getTime()/86400000),r=seeded(`market-${s.date}-${s.network.initials}`);s.adCampaigns.forEach(a=>{if(a.status==='Active'){a.days--;if(a.days<=0)a.status='Closed'}});if(epoch%12===0&&s.adCampaigns.filter(a=>a.status==='Available').length<5){const brands=['Orbit Wireless','BluePeak Insurance','Northstar Coffee','Cobalt Auto','Sprout Snacks'],target=DEMOS[Math.floor(r()*DEMOS.length)][0],secondary=DEMOS[Math.floor(r()*DEMOS.length)][0],reach=Math.max(200000,networkReachHouseholds(s)),goal=Math.max(400000,reach*(1.4+r()*2.2)),cpm=Math.round(14+r()*18),budget=goal/1000*cpm*4;s.adCampaigns.push({id:uid('a'),brand:brands[Math.floor(r()*brands.length)],target,secondary,budget,remaining:budget,goal,delivered:0,cpm,status:'Available',days:28+Math.round(r()*28),fit:[]})}}
function competitorDay(s){const epoch=Math.floor(new Date(`${s.date}T12:00:00`).getTime()/86400000);if(epoch%7!==0)return;s.competitors.forEach(c=>{const r=seeded(`${s.date}-${c.id}`),swing=(r()-.48)*5;c.momentum=clamp((c.momentum||0)*.6+swing,-10,10);c.prime=clamp(c.prime+c.momentum*.08,35,96);c.daytime=clamp(c.daytime+(r()-.5)*1.5,30,90)});s.sports.filter(x=>!x.owned&&x.bidEnds>0&&x.leader==='PCN').forEach(x=>{const r=seeded(`sports-bid-${s.date}-${x.id}`);if(r()>.58){const rival=[...s.competitors].sort((a,b)=>b.sports-a.sports)[Math.floor(r()*Math.min(3,s.competitors.length))];x.currentBid=Math.round((x.currentBid||x.cost)*1.08/10000)*10000;x.leader=rival.name;sendMail(s,'Rights Desk',`${x.name}: you have been outbid`,`${rival.name} now leads at $${Math.round(x.currentBid).toLocaleString()}/year.`, 'rights')}});s.sports.forEach(x=>{if(x.owned||x.bidEnds<=0)return;x.bidEnds--;if(x.bidEnds===0&&x.leader==='PCN')awardSport(s,x,x.currentBid||x.cost)});}
function licensingDay(s){s.licenses.forEach(l=>{if(l.status==='Active'){const daily=l.annualRevenue/365;s.cash+=daily;s.totalRevenue+=daily;const p=getProgram(s,l.programId);if(p)p.licensingRevenue=(p.licensingRevenue||0)+daily}});s.merchDeals.forEach(m=>{if(m.status==='Active'){const ip=getIP(s,m.ipId);if(!ip)return;const daily=(m.baseAnnual||0)/365*(.6+ip.fandom/100*.6);s.cash+=daily;s.totalRevenue+=daily}});}

export function runOneDay(s,{silent=false}={}){s.lastDayRevenue=0;s.lastDayAudience=0;developmentDay(s);searchDay(s);negotiationDay(s);facilityDay(s);productionDay(s);researchDay(s);dailyOverhead(s);airDay(s);licensingDay(s);commercialDay(s);competitorDay(s);s.financeLog.push({date:s.date,cash:s.cash,revenue:s.lastDayRevenue,expense:s.lastDayExpense||0});s.financeLog=s.financeLog.slice(-730);s.date=addDays(s.date,1);if(!silent&&s.cash<0)sendMail(s,'CFO','Cash balance is negative','The network needs financing, rights sales or immediate cost action.','warning');}
export function advanceDays(state,n){const s=deepClone(state);for(let i=0;i<n;i++)runOneDay(s,{silent:true});return s;}

export function alerts(s){const out=[];if(!s.programs.length)out.push({sev:'orange',title:'No programming owned',sub:'License content or commission an original script.'});if(!s.employees.length)out.push({sev:'orange',title:'No staff',sub:'Open a role search in Organization.'});s.programs.forEach(p=>{if(p.status==='Pre-production'){const c=canStartProduction(s,p);if(!c.ok)out.push({sev:'orange',title:`${p.title}: pre-production blocked`,sub:c.reason})}const runway=Math.floor(p.pipeline.ready-p.pipeline.aired);if(['Production','Ready','On Air'].includes(p.status)&&runway<=1)out.push({sev:'orange',title:`${p.title} runway: ${Math.max(0,runway)}`,sub:'Production/delivery is close to the schedule.'})});if(s.cash<3000000)out.push({sev:'red',title:'Cash reserve dangerously low',sub:'Reduce commitments or improve monetization.'});return out.slice(0,10);}

export function acquireContent(state,id){const s=deepClone(state),i=s.contentMarket.findIndex(x=>x.id===id);if(i<0)return s;const m=s.contentMarket[i];if(s.cash<m.cost)return s;s.cash-=m.cost;s.totalExpense+=m.cost;const ip={id:uid('ip'),name:m.title,origin:'Licensed',genre:m.genre,popularity:m.popularity,novelty:18,fatigue:10,prestige:m.critic*.5,fandom:m.popularity*.45,flexibility:30,value:m.cost*.85,affinity:{...m.affinity},seasons:0,identity:[m.genre,'library'],merchPotential:4};s.ips.push(ip);const p=makeProgramDraft({title:m.title,format:'Acquired',genre:m.genre,episodes:m.runs,duration:m.duration,target:{...m.affinity},ipId:ip.id,art:'noise',font:'serif',p1:'#ba6146',p2:'#312437'});p.acquired=true;p.status='Ready';p.pipeline={scripted:m.runs,pre:m.runs,filmed:m.runs,ready:m.runs,aired:0};p.viewer=m.viewer;p.critic=m.critic;p.quality=(m.viewer+m.critic)/2;p.premiered=true;p.rightsRuns=m.runs;p.productionSpend=0;s.programs.push(p);s.contentMarket.splice(i,1);sendMail(s,'Acquisitions',`Rights acquired: ${m.title}`,`${m.type} licensed for ${m.runs} runs. Each airing occupies ${m.duration} minutes. It is ready to schedule immediately.`, 'rights',{programId:p.id});return s;}
export function acquireIP(state,id){const s=deepClone(state),i=s.ipMarket.findIndex(x=>x.id===id);if(i<0)return s;const m=s.ipMarket[i];if(s.cash<m.cost)return s;s.cash-=m.cost;s.totalExpense+=m.cost;s.ips.push({...m,id:uid('ip'),origin:'Licensed IP',value:m.cost,rights:{...m.rights},seasons:0,fatigue:8});s.contracts.push({id:uid('ct'),name:m.name,type:'ip',annualCost:m.cost/m.rights.term,term:m.rights.term,start:s.date});s.ipMarket.splice(i,1);return s;}
function awardSport(s,x,annualPrice){if(x.owned)return;x.owned=true;x.cost=annualPrice;x.leader='PCN';s.contracts.push({id:uid('ct'),name:x.name,type:'sports',annualCost:annualPrice,term:x.term,start:s.date});const ip={id:uid('ip'),name:x.name,origin:'Sports Rights',genre:'Sports',popularity:x.popularity,novelty:14,fatigue:6,prestige:x.prestige,fandom:x.popularity*.55,flexibility:25,value:annualPrice*x.term*.8,affinity:affinity({[x.target]:90}),seasons:0,identity:['sports','live'],merchPotential:15};s.ips.push(ip);const p=makeProgramDraft({title:x.name,format:'Sports',genre:'Live Sports',episodes:x.events,duration:180,target:{...ip.affinity},ipId:ip.id,art:'grid',font:'wide',p1:'#db4e70',p2:'#211a36'});p.acquired=true;p.status='Ready';p.pipeline={scripted:x.events,pre:x.events,filmed:x.events,ready:x.events,aired:0};p.viewer=70;p.critic=55;p.quality=72;p.premiered=true;p.budgetPerEpisode=Math.max(25000,annualPrice/x.events*.18);p.baseBudgetPerEpisode=p.budgetPerEpisode;p.sportsRightsId=x.id;s.programs.push(p);sendMail(s,'Rights Desk',`Rights won: ${x.name}`,`The ${x.name} package is now available for scheduling. Live events occupy approximately 3 hours and may run into overnight programming.`, 'rights',{programId:p.id});}
export function placeSportBid(state,id){const s=deepClone(state),x=s.sports.find(y=>y.id===id);if(!x||x.owned||x.bidEnds<=0)return s;const next=Math.round(((x.currentBid||x.cost*.75)*(x.leader?1.1:1.06))/10000)*10000;if(s.cash<next*.12)return s;x.currentBid=next;x.leader='PCN';return s;}
export function acquireSport(state,id){const s=deepClone(state),x=s.sports.find(y=>y.id===id);if(!x||x.owned)return s;awardSport(s,x,x.cost);return s;}
export function createSportsCompanion(state,sportId,type='Pregame'){const s=deepClone(state),sp=s.sports.find(x=>x.id===sportId&&x.owned);if(!sp)return s;const parent=s.programs.find(p=>p.sportsRightsId===sp.id),ipId=parent?.ipId,p=makeProgramDraft({title:`${sp.name}: ${type}`,format:'Sports',genre:type,episodes:40,duration:type==='Highlights'?30:60,target:affinity({[sp.target]:82}),art:'grid',font:'wide',p1:'#db4e70',p2:'#211a36',ipId});p.status='Pre-production';s.programs.push(p);return s;}

export function signAd(state,id,programIds=[]){const s=deepClone(state),a=s.adCampaigns.find(x=>x.id===id);if(a){a.status='Active';a.programIds=[...programIds]}return s;}
export function signSponsor(state,id,programId){const s=deepClone(state),x=s.sponsorships.find(y=>y.id===id),p=getProgram(s,programId);if(x&&p){x.status='Active';x.programId=p.id;x.totalWeeks=x.weeks;p.sponsor=x.brand}s.cash+=x?.offer*.08||0;return s;}
export function setAdLoad(state,programId,minutes){const s=deepClone(state),p=getProgram(s,programId);if(p)p.adLoad=Number(minutes);return s;}
export function setMarketing(state,programId,level){const s=deepClone(state),p=getProgram(s,programId);if(p){const cost=Number(level)*2500;if(s.cash<cost)return s;p.marketing=Number(level);p.marketingSpend+=cost;s.cash-=cost;s.totalExpense+=cost;p.awareness=clamp(p.awareness+Number(level)*.08,0,100)}return s;}
export function hireCandidate(state,id,offerSalary,years=3,bonus=0,backend=0,creativeControl=0){return {state:startNegotiation(state,id,offerSalary,years,bonus,backend,creativeControl),accepted:null};}
export function fireEmployee(state,id){const s=deepClone(state),i=s.employees.findIndex(x=>x.id===id);if(i<0)return s;const e=s.employees.splice(i,1)[0],sev=(e.salary||0)*.20;s.cash-=sev;s.totalExpense+=sev;sendMail(s,'HR',`${e.name} released`,`${e.name} has left the network. Severance: $${Math.round(sev).toLocaleString()}.`,'hiring');return s;}
export function startResearch(state,id){const s=deepClone(state),t=s.tech.find(x=>x.id===id);if(t&&!t.researched&&!s.research)s.research={techId:id,start:s.date};return s;}
export function expandFacility(state,key){return startFacilityBuild(state,key);}
export function expandState(state,code){const s=deepClone(state),st=s.states.find(x=>x.code===code);if(!st)return s;const next=clamp(st.coverage+.2,0,1),cost=st.households*(next-st.coverage)*1.35;if(s.cash<cost)return s;st.coverage=next;st.awareness=clamp(st.awareness+8,0,100);s.cash-=cost;s.totalExpense+=cost;return s;}
export function signAffiliate(state,id){const s=deepClone(state),af=s.affiliates.find(x=>x.id===id);if(!af||af.status!=='Available')return s;const st=s.states.find(x=>x.code===af.market),cost=af.ask;if(s.cash<cost*.25)return s;af.status='Active';af.start=s.date;st.affiliate=af.station;st.coverage=clamp(Math.max(st.coverage,af.households/st.households*.8),0,1);st.awareness=clamp(st.awareness+12,0,100);s.contracts.push({id:uid('ct'),name:af.station,type:'affiliate',annualCost:cost,term:af.term,start:s.date});s.cash-=cost*.1;s.totalExpense+=cost*.1;return s;}
export function launchStreaming(state){const s=deepClone(state);if(!s.streaming.unlocked||s.streaming.launched||s.cash<3500000)return s;s.cash-=3500000;s.totalExpense+=3500000;s.streaming.launched=true;s.streaming.subscribers=2500;return s;}
export function updateStreaming(state,patch){const s=deepClone(state);Object.assign(s.streaming,patch);return s;}
export function updateNewsroom(state,key,delta){const s=deepClone(state);if(['bureaus','reporters','weather','sportsDesk','investigative'].includes(key)){const cost={bureaus:650000,reporters:140000,weather:280000,sportsDesk:320000,investigative:450000}[key]*delta;if(delta>0&&s.cash<cost)return s;s.newsroom[key]=Math.max(0,s.newsroom[key]+delta);s.cash-=cost;s.totalExpense+=Math.max(0,cost)}return s;}
export function setAutomation(state,key,value){const s=deepClone(state);s.automation[key]=value;return s;}
export function updateNetwork(state,patch){const s=deepClone(state);Object.assign(s.network,patch);if(patch.initials)s.streaming.name=`${patch.initials}+`;return s;}
export function updateProductionPlan(state,programId,focus,technical){const s=deepClone(state),p=getProgram(s,programId);if(p){p.productionFocus={...focus};p.technical={...technical}}return s;}
export function rewriteScript(state,programId,episode){const s=deepClone(state),p=getProgram(s,programId),sc=p?.scripts?.find(x=>x.episode===episode);if(sc){const writer=getEmployee(s,p.team.leadWriter),r=seeded(`${s.date}-${p.id}-${episode}-rewrite`)();sc.stars=Math.round(clamp(sc.stars+(writer?.skills.writing||60)/100*.6+(r-.5)*.5,1,5)*2)/2;p.scriptStars=avg(p.scripts.map(x=>x.stars));}return s;}
export function renewProgram(state,programId,change){
  const s=deepClone(state),p=getProgram(s,programId),ip=p&&getIP(s,p.ipId),writer=p&&getEmployee(s,p.team?.leadWriter);if(!p||!ip)return s;if(!writer){sendMail(s,'Studio Office',`Season ${p.season+1} blocked: ${p.title}`,'The previous lead writer is no longer under contract. Hire/assign a writer before scripting the next season.','warning',{programId:p.id});return s;}
  if(s.developments.some(d=>d.seasonRenewalFor===p.id&&['Writing','Rewrite','Complete'].includes(d.status)))return s;
  const e=ipSeasonEffect(ip,Number(change));ip.popularity=e.retainedPopularity;ip.novelty=e.newNovelty;ip.fatigue=e.newFatigue;ip.seasons=(ip.seasons||0)+1;
  const speed=writer.skills.speed||65,totalDays=Math.max(4,Math.round(p.episodes*(p.duration/30)*(8.5-speed/18)*.72)),cost=Math.round(p.episodes*(p.duration/30)*(p.format==='Scripted'?11000:p.format==='Reality'?6500:4000));
  const d={id:uid('dev'),title:p.title,format:p.format,genre:p.genre,theme:ip.identity?.[1]||'Contemporary',topic:`Season ${p.season+1}`,angle:Number(change)>70?'Experimental':Number(change)<15?'Familiar':'Fresh',episodes:p.episodes,duration:p.duration,writerId:writer.id,status:'Writing',daysRemaining:totalDays,totalDays,cost,spent:cost*.25,scriptStars:null,novelty:null,target:{...p.target},art:p.art,font:p.font,p1:p.p1,p2:p.p2,ipId:ip.id,seasonRenewalFor:p.id,nextSeason:p.season+1,creativeChange:Number(change),created:s.date};
  if(s.cash<cost*.25)return state;s.cash-=cost*.25;s.totalExpense+=cost*.25;s.developments.push(d);sendMail(s,'Writers Room',`Season ${p.season+1} scripting started: ${p.title}`,`The existing format, characters and visual identity carry forward. Creative change target: ${change}%. Writing is expected to take ${totalDays} days. Popularity retained at ${Math.round(ip.popularity)}; novelty now ${Math.round(ip.novelty)}.`, 'development',{developmentId:d.id});return s;
}
export function createProgram(state,form){return commissionScript(state,form);}
export function setSchedule(state,day,slot,programId){return scheduleProgram(state,day,slot,programId);}
export function runPromotion(state,programId,type){const s=deepClone(state),p=getProgram(s,programId);if(!p)return s;const options={network:{cost:50000,awareness:3},digital:{cost:80000,awareness:5},press:{cost:120000,awareness:4},premiere:{cost:220000,awareness:6},awards:{cost:350000,awareness:1}};const o=options[type];if(!o||s.cash<o.cost)return s;s.cash-=o.cost;s.totalExpense+=o.cost;p.marketingSpend+=o.cost;p.awareness=clamp(p.awareness+o.awareness,0,100);return s;}
export function createLicenseDeal(state,programId){const s=deepClone(state),p=getProgram(s,programId),ip=p&&getIP(s,p.ipId);if(!p||!ip||p.airings<2)return s;const annual=Math.max(80000,(p.viewer*.4+p.critic*.25+ip.popularity*.35)*12000);s.licenses.push({id:uid('lic'),programId:p.id,name:`${p.title} Syndication`,annualRevenue:annual,term:3,status:'Active'});return s;}
export function createMerchDeal(state,ipId,mode='License'){const s=deepClone(state),ip=getIP(s,ipId);if(!ip||ip.fandom<35)return s;let annual=Math.max(50000,(ip.fandom*.5+ip.popularity*.25+(ip.merchPotential||20)*.25)*9000);if(mode==='Direct'){const upfront=450000;if(s.cash<upfront)return s;s.cash-=upfront;s.totalExpense+=upfront;annual*=1.6}s.merchDeals.push({id:uid('merch'),ipId,partner:mode==='Direct'?'Network Consumer Products':'Licensed Consumer Products',mode,baseAnnual:annual,status:'Active'});return s;}
export function programPnL(s,p){const production=(p.productionSpend||0)+(p.residualSpend||0);return {revenue:(p.revenue||0)+(p.licensingRevenue||0)+(p.merchRevenue||0),production,marketing:p.marketingSpend||0,residuals:p.residualSpend||0,contribution:(p.revenue||0)+(p.licensingRevenue||0)+(p.merchRevenue||0)-production-(p.marketingSpend||0)};}
export function createSpinOff(state,ipId,title){const s=deepClone(state),ip=getIP(s,ipId);if(!ip)return s;const d={id:uid('dev'),title:title||`${ip.name}: After Hours`,format:'Factual',genre:'Talk',theme:'Contemporary',topic:`Companion to ${ip.name}`,angle:'Familiar',episodes:26,duration:30,writerId:null,status:'Idea',daysRemaining:0,totalDays:0,cost:0,spent:0,scriptStars:null,novelty:null,target:{...ip.affinity},art:'bars',font:'wide',p1:'#9272d1',p2:'#1b213d',ipId};s.developments.push(d);return s;}
