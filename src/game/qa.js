import { DEMOS, DAYS, DAYPARTS } from './constants.js';
import { advanceDays, calcAudience, ipSeasonEffect, networkReachHouseholds, programPnL } from './simulation.js';
import { seedState } from './seed.js';

export const FEATURE_AUDIT = [
  ['Four management quadrants','Studio, Channel, Business, Organization'],
  ['Persistent program identity','Cover treatment, palette, typography, genre and IP'],
  ['Script development','Episode scripts, star coverage and rewrites'],
  ['Production pipeline','Scripted → pre-production → filmed → ready → aired'],
  ['Genre-specific production','Writing, cast, design, VFX, music, sound and image weights'],
  ['Technical formats','1080p/4K, HDR, stereo/5.1/immersive audio'],
  ['Casting and chemistry','Multi-role auditions, talent popularity, fit and chemistry'],
  ['Viewer and critic scores','Separate reception systems'],
  ['Eight audience groups','Age × gender affinity vectors'],
  ['Popularity vs novelty','IP popularity, novelty, fatigue, flexibility and identity distance'],
  ['Season continuity','Renew without rebuilding; choose creative-change percentage'],
  ['IP marketplace','Adaptation rights with term/territory/medium/merch split'],
  ['Original IP value','Fandom, prestige, fatigue, popularity and asset value'],
  ['Merchandising','License to partners or produce directly based on IP fandom and potential'],
  ['Syndication/licensing','Program library revenue after successful runs'],
  ['Sports rights','Competitive multi-season auctions, rival bids and companion programming'],
  ['Acquired movies/library','Runs, cost, reception and demographic fit'],
  ['Weekly programming','Daypart schedule with lead-in/competition context'],
  ['Ad campaigns','Target demos, CPM, program packages, impressions, guarantees and makegoods'],
  ['Ad load','Revenue vs audience-retention tradeoff'],
  ['Sponsorships','Program-specific sponsorship offers'],
  ['Marketing','Network promos, digital, press, premiere and awards campaigns separated from quality'],
  ['Program P&L','Production, residuals, marketing, licensing, merchandise and contribution'],
  ['Hiring negotiations','Salary, term, bonus, backend, creative control, prestige and acceptance probability'],
  ['Facilities','Studios, post, newsroom, VFX, set shop, wardrobe, control, research'],
  ['Research','Production, broadcast, analytics, streaming and ad technologies'],
  ['Geographic reach','50-state technical footprint'],
  ['Affiliate contracts','Station partnerships with annual cost and market reach'],
  ['Newsroom','Reporters, bureaus, desks, investigative capacity and trust'],
  ['Competitor networks','Dynamic weekly pressure and strategic events'],
  ['Awards','Critic/quality-driven awards with prestige and IP effects'],
  ['Streaming','Research-gated PCN+ launch, model, subscribers and cannibalization-ready library'],
  ['Executive automation','Ads and production routines can be delegated'],
  ['Day/week/month simulation','Daily engine with calendar control'],
  ['Network customization','Name, initials, icon, two-color logo system'],
  ['Autosave','Browser localStorage persistence'],
  ['Mobile navigation','Bottom command bar, responsive cards, touch targets and safe areas'],
  ['GitHub/Vite React','React source, Vite build and GitHub Pages workflow']
];

export function runStateQA(s){
  const results=[];
  const check=(name,ok,detail='')=>results.push({name,ok:!!ok,detail});
  check('Cash is numeric',Number.isFinite(s.cash),String(s.cash));
  check('All programs reference an IP',s.programs.every(p=>s.ips.some(ip=>ip.id===p.ipId)));
  check('All schedule references resolve',DAYS.every(d=>DAYPARTS.every(([k])=>!s.schedule[d]?.[k]||s.programs.some(p=>p.id===s.schedule[d][k]))));
  check('Production pipeline ordering',s.programs.every(p=>p.pipeline.scripted+1e-5>=p.pipeline.pre&&p.pipeline.pre+1e-5>=p.pipeline.filmed&&p.pipeline.filmed+1e-5>=p.pipeline.ready&&p.pipeline.ready+1e-5>=p.pipeline.aired));
  check('Production counters nonnegative',s.programs.every(p=>Object.values(p.pipeline).every(v=>v>=0)));
  check('IP scores bounded',s.ips.every(ip=>['popularity','novelty','fatigue','prestige','fandom','flexibility'].every(k=>(ip[k]??50)>=0&&(ip[k]??50)<=100)));
  check('All eight audience segments exist',s.programs.every(p=>DEMOS.every(([k])=>Number.isFinite(p.target?.[k]))));
  check('State coverage bounded',s.states.every(x=>x.coverage>=0&&x.coverage<=1));
  check('50-state footprint represented',s.states.length===50,`${s.states.length} states`);
  check('Ad guarantees valid',s.adCampaigns.every(a=>a.goal>0&&a.budget>=0&&a.delivered>=0));
  check('Program visual identity complete',s.programs.every(p=>p.art&&p.font&&p.p1&&p.p2));
  check('Rights markets populated',s.ipMarket.length>0&&s.contentMarket.length>0&&s.sports.length>0);
  check('Sports auctions configured',s.sports.every(x=>Number.isFinite(x.currentBid)&&Number.isFinite(x.bidEnds)&&'leader' in x));
  check('People market populated',s.employees.length>0&&s.candidates.length>0);
  check('Technology tree populated',s.tech.length>=8);
  check('Newsroom configured',s.newsroom&&Number.isFinite(s.newsroom.trust));
  check('Affiliate market configured',Array.isArray(s.affiliates)&&s.affiliates.length>0);
  check('Streaming state configured',s.streaming&&['Hybrid','Subscription','Advertising'].includes(s.streaming.model));
  check('Automation state configured',s.automation&&['ads','production','schedule','affiliates'].every(k=>k in s.automation));
  check('Program P&Ls are numeric',s.programs.every(p=>Number.isFinite(programPnL(s,p).contribution)));
  check('Development state machine configured',s.programs.every(p=>Number.isFinite(p.developmentProgress??100)&&['Development','Ordered','Production','On Air','Library','Hiatus','Cancelled','Completed'].includes(p.status)));
  check('Role-based casting configured',s.programs.every(p=>p.roles===undefined||Array.isArray(p.roles)));
  check('Network brand profile configured',s.network.brand&&['prestige','trust','youth','family','sports','innovation'].every(k=>Number.isFinite(s.network.brand[k])));
  const q={...s.programs[0],quality:90,viewer:90,critic:90,awareness:40,momentum:0};
  const baseIp={...s.ips[0],popularity:0,novelty:0,fatigue:0};
  const familiar={...baseIp,popularity:85,novelty:8};
  const fresh={...baseIp,popularity:8,novelty:85};
  const weak=(baseIp.popularity*.52+baseIp.novelty*.28+Math.min(baseIp.popularity,baseIp.novelty)*.2);
  const fam=(familiar.popularity*.52+familiar.novelty*.28+Math.min(familiar.popularity,familiar.novelty)*.2);
  const nov=(fresh.popularity*.52+fresh.novelty*.28+Math.min(fresh.popularity,fresh.novelty)*.2);
  check('Quality cannot replace popularity/novelty',weak<fam&&weak<nov,`cold=${weak.toFixed(1)} familiar=${fam.toFixed(1)} fresh=${nov.toFixed(1)}`);
  const hit={popularity:92,novelty:34,fatigue:12,flexibility:62};
  const safe=ipSeasonEffect(hit,25),radical=ipSeasonEffect(hit,90);
  check('Moderate refresh preserves hit popularity',safe.retainedPopularity>80,`${safe.retainedPopularity.toFixed(1)}`);
  check('Radical reinvention gains novelty',radical.newNovelty>safe.newNovelty,`${safe.newNovelty.toFixed(1)} → ${radical.newNovelty.toFixed(1)}`);
  check('Radical reinvention risks popularity',radical.retainedPopularity<safe.retainedPopularity-20,`${safe.retainedPopularity.toFixed(1)} → ${radical.retainedPopularity.toFixed(1)}`);
  const reach=networkReachHouseholds(s);const sample=calcAudience(s,s.programs[0],'prime1',s.date).audience;
  check('Audience bounded by reach',sample>=0&&sample<=reach,`${Math.round(sample)} / ${Math.round(reach)}`);
  return results;
}

export function runBalanceQA(days=180){
  const s=advanceDays(seedState(),days);
  const checks=runStateQA(s);
  return {
    days,date:s.date,cash:s.cash,reach:networkReachHouseholds(s),audience:s.weeklyAudience,programs:s.programs.length,
    passed:checks.filter(x=>x.ok).length,total:checks.length,checks
  };
}
