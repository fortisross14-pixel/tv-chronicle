import { ART_BY_FORMAT } from './constants.js';

const genders={c8:'Female',c9:'Male',c10:'Female',c11:'Male',c12:'Male',c13:'Female',c14:'Male'};
const awards=[
  {id:'local-awards',name:'Local Television Honors',scope:'Local',date:'11-15'},
  {id:'state-awards',name:'State Television Awards',scope:'State',date:'12-01'},
  {id:'national-awards',name:'National Television Awards',scope:'National',date:'12-20'}
];
export function migrateState(input){
  if(!input)return input;
  const s=typeof structuredClone==='function'?structuredClone(input):JSON.parse(JSON.stringify(input));
  s.version='0.6.0';
  s.network=s.network||{};if(!('launchDate' in s.network))s.network.launchDate=null;
  s.contentLicenses=s.contentLicenses||[];s.pendingTransactions=s.pendingTransactions||[];s.stages=s.stages||[];s.stageProjects=s.stageProjects||[];
  s.staffSearches=s.staffSearches||[];s.staffSearches.forEach(x=>{if(x.status==='Complete'&&!x.completedDate)x.completedDate=s.date});
  s.candidateMarket=(s.candidateMarket||[]).map(c=>({...c,gender:c.gender||genders[c.id]||null}));
  s.employees=(s.employees||[]).map(e=>({...e,gender:e.gender||genders[e.id]||null,projects:e.projects||[]}));
  s.negotiations=(s.negotiations||[]).map(n=>{const offer={offerSalary:Number(n.latestOffer?.offerSalary??n.offerSalary??0),years:Number(n.latestOffer?.years??n.years??3),bonus:Number(n.latestOffer?.bonus??n.bonus??0),backend:Number(n.latestOffer?.backend??n.backend??0),creativeControl:Number(n.latestOffer?.creativeControl??n.creativeControl??0)};return {...n,latestOffer:n.latestOffer||offer,offerHistory:n.offerHistory?.length?n.offerHistory:[{date:s.date,round:n.round||1,...offer}]};});
  s.competitors=(s.competitors||[]).map((c,i)=>({...c,revenueYTD:c.revenueYTD||0,revenue:rebalanceRevenue(c,i)}));
  s.developments=(s.developments||[]).map(d=>{const episodes=Number(d.episodes||1),total=Number(d.totalDays||d.daysRemaining||episodes*4),done=d.status==='Complete'||d.status==='Greenlit',writerIds=(d.writerIds||[d.writerId]).filter(Boolean);return {...d,qualityTier:d.qualityTier||'normal',writerIds,writerId:d.writerId||writerIds[0]||null,summary:d.summary||'',scriptedEpisodes:d.scriptedEpisodes??(done?episodes:0),episodeInterval:d.episodeInterval||Math.max(1,Math.round(total/episodes)),elapsedDays:d.elapsedDays||0,scripts:d.scripts||[],greenlit:!!d.greenlit||d.status==='Greenlit',refined:!!d.refined,suggestedBudgetPerEpisode:d.suggestedBudgetPerEpisode||null};});
  s.programs=(s.programs||[]).map(p=>{const writers=(p.team?.writers||[p.team?.leadWriter]).filter(Boolean);return {...p,qualityTier:p.qualityTier||'normal',team:{...(p.team||{}),writers},art:p.art||ART_BY_FORMAT[p.format]||'cinematic',commercialsEnabled:p.commercialsEnabled!==false,productionAllocation:p.productionAllocation||{set:2,vfx:1,sound:2,music:1,extras:2,camera:2,costume:1},preProductionStep:p.preProductionStep||1,preProductionFinalized:p.preProductionFinalized??(p.status!=='Pre-production'),suggestedBudgetPerEpisode:p.suggestedBudgetPerEpisode||p.baseBudgetPerEpisode||p.budgetPerEpisode,stageId:p.stageId||null,recommendedStage:p.recommendedStage||'regular',stageFit:p.stageFit||1,promotionPlan:p.promotionPlan||'Standard',awards:p.awards||[]};});
  s.awards=awards;s.awardHistory=s.awardHistory||[];s.yearly=s.yearly||{};s.yearly.recordsProcessed=!!s.yearly.recordsProcessed;s.yearly.awardsProcessed=s.yearly.awardsProcessed||[];
  return s;
}
function rebalanceRevenue(c,i){const st=c.strength||50;if(c.scope==='National')return 4200000000+(st-70)*210000000+i*130000000;if(c.scope==='State')return 180000000+(st-40)*14500000+(i%4)*22000000;if(c.scope==='Local')return 28000000+(st-35)*6500000+(i%3)*9000000;return 1200000000+(st-55)*125000000+(i%4)*160000000;}
