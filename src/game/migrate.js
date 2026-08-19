import { ART_BY_FORMAT } from './constants.js';

export function migrateState(input){
  if(!input)return input;
  const s=typeof structuredClone==='function'?structuredClone(input):JSON.parse(JSON.stringify(input));
  s.version='0.5.0';
  s.network=s.network||{};
  if(!('launchDate' in s.network))s.network.launchDate=null;
  s.contentLicenses=s.contentLicenses||[];
  s.pendingTransactions=s.pendingTransactions||[];
  s.stages=s.stages||[];
  s.stageProjects=s.stageProjects||[];
  s.staffSearches=s.staffSearches||[];
  s.staffSearches.forEach(x=>{if(x.status==='Complete'&&!x.completedDate)x.completedDate=s.date});
  s.competitors=(s.competitors||[]).map((c,i)=>({...c,revenueYTD:c.revenueYTD||0,revenue:rebalanceRevenue(c,i)}));
  s.developments=(s.developments||[]).map(d=>{
    const episodes=Number(d.episodes||1),total=Number(d.totalDays||d.daysRemaining||episodes*4),done=d.status==='Complete'||d.status==='Greenlit';
    return {...d,summary:d.summary||'',scriptedEpisodes:d.scriptedEpisodes??(done?episodes:0),episodeInterval:d.episodeInterval||Math.max(1,Math.round(total/episodes)),elapsedDays:d.elapsedDays||0,scripts:d.scripts||[],greenlit:!!d.greenlit||d.status==='Greenlit',refined:!!d.refined,suggestedBudgetPerEpisode:d.suggestedBudgetPerEpisode||null};
  });
  s.programs=(s.programs||[]).map(p=>({...p,art:p.art||ART_BY_FORMAT[p.format]||'cinematic',commercialsEnabled:p.commercialsEnabled!==false,productionAllocation:p.productionAllocation||{set:2,vfx:1,sound:2,music:1,extras:2,camera:2,costume:1},preProductionStep:p.preProductionStep||1,preProductionFinalized:p.preProductionFinalized??(p.status!=='Pre-production'),suggestedBudgetPerEpisode:p.suggestedBudgetPerEpisode||p.baseBudgetPerEpisode||p.budgetPerEpisode,stageId:p.stageId||null,recommendedStage:p.recommendedStage||'regular',stageFit:p.stageFit||1,promotionPlan:p.promotionPlan||'Standard'}));
  return s;
}
function rebalanceRevenue(c,i){
  const st=c.strength||50;
  if(c.scope==='National')return 4200000000+(st-70)*210000000+i*130000000;
  if(c.scope==='State')return 180000000+(st-40)*14500000+(i%4)*22000000;
  if(c.scope==='Local')return 28000000+(st-35)*6500000+(i%3)*9000000;
  return 1200000000+(st-55)*125000000+(i%4)*160000000;
}
