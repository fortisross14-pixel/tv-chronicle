import { affinity, uid } from './utils.js';
import { STATE_LAYOUT, STATE_HOUSEHOLDS, DAYS, DAYPARTS } from './constants.js';

const emp=(id,name,role,dept,overall,salary,skills={},ask=salary,extra={})=>({id,name,role,dept,overall,salary,ask,skills,morale:72,contractYears:2,popularity:overall*.45,preferences:{prestige:50,security:50,freedom:50,...extra.preferences},...extra});
const tech=(id,name,group,tier,researched,desc,cost=0)=>({id,name,group,tier,progress:researched?100:0,researched,desc,cost});
const program=(o)=>({season:1,status:'On Air',developmentProgress:100,developmentDays:0,awareness:35,momentum:0,marketing:25,adLoad:12,scriptStars:3.5,productionFocus:{writing:65,cast:65,design:55,vfx:20,music:45,sound:60,image:65},technical:{resolution:'1080p',audio:'Stereo',hdr:false},team:{showrunner:null,leadWriter:null,leadTalent:null,director:null},scripts:[],cast:[],chemistry:60,lastAudience:0,totalAudience:0,airings:0,rightsRuns:null,revenue:0,productionSpend:0,marketingSpend:0,licensingRevenue:0,merchRevenue:0,awards:[],...o});

export function seedState(){
  const states=STATE_LAYOUT.map(([code,col,row])=>({
    code,col,row,households:STATE_HOUSEHOLDS[code]||500000,
    coverage:code==='VA'?.32:0,awareness:code==='VA'?28:0,owned:code==='VA',
    affiliate:null,carriage:code==='VA'?35:0,adValue:50+((STATE_HOUSEHOLDS[code]||500000)/14500000)*35
  }));

  const ips=[
    {id:'ip_city',name:'City Hospital',origin:'Original',genre:'Drama',popularity:54,novelty:48,fatigue:12,prestige:45,fandom:43,flexibility:42,value:4100000,affinity:affinity({adultWomen:82,adultMen:60,seniorWomen:66}),seasons:2,identity:['medical','ensemble','emotional'],merchPotential:18},
    {id:'ip_home',name:'No Way Home',origin:'Original',genre:'Survival',popularity:36,novelty:82,fatigue:4,prestige:20,fandom:35,flexibility:70,value:1300000,affinity:affinity({youngMen:84,youngWomen:72,adultMen:62}),seasons:1,identity:['survival','competition','remote'],merchPotential:38},
    {id:'ip_morning',name:'PCN Morning',origin:'Original',genre:'Morning',popularity:48,novelty:22,fatigue:19,prestige:28,fandom:25,flexibility:62,value:850000,affinity:affinity({adultWomen:72,seniorWomen:68,adultMen:56}),seasons:5,identity:['warm','daily','local'],merchPotential:8},
    {id:'ip_court',name:'Common Ground',origin:'Original',genre:'Talk',popularity:39,novelty:39,fatigue:15,prestige:22,fandom:23,flexibility:60,value:620000,affinity:affinity({adultWomen:66,seniorWomen:58}),seasons:3,identity:['issues','audience','host'],merchPotential:5},
    {id:'ip_local',name:'Virginia Tonight',origin:'Original',genre:'News',popularity:51,novelty:18,fatigue:9,prestige:41,fandom:20,flexibility:40,value:900000,affinity:affinity({adultMen:70,adultWomen:70,seniorMen:74,seniorWomen:76}),seasons:9,identity:['trusted','local','evening'],merchPotential:3}
  ];

  const programs=[
    program({id:'p_city',title:'City Hospital',format:'Scripted',genre:'Drama',ipId:'ip_city',episodes:13,duration:60,pipeline:{scripted:10,pre:7,filmed:5,ready:4,aired:2},viewer:78,critic:82,quality:74,budgetPerEpisode:420000,baseBudgetPerEpisode:420000,target:affinity({adultWomen:82,adultMen:62,seniorWomen:58}),art:'ring',font:'serif',p1:'#3b6597',p2:'#192338',team:{showrunner:'e5',leadWriter:'e6',leadTalent:'e11',director:'e13'},cast:['e11','e12'],chemistry:81,marketing:48}),
    program({id:'p_home',title:'No Way Home',format:'Reality',genre:'Survival',ipId:'ip_home',episodes:10,duration:60,pipeline:{scripted:10,pre:10,filmed:10,ready:8,aired:1},viewer:70,critic:48,quality:66,budgetPerEpisode:260000,baseBudgetPerEpisode:260000,target:affinity({youngMen:88,youngWomen:78,adultMen:62}),art:'sun',font:'condensed',p1:'#e5ad32',p2:'#39431e',team:{showrunner:'e8',leadWriter:'e7',leadTalent:'e10'},cast:['e10'],chemistry:70,marketing:42}),
    program({id:'p_morning',title:'PCN Morning',format:'Factual',genre:'Morning',ipId:'ip_morning',episodes:260,duration:180,pipeline:{scripted:134,pre:130,filmed:127,ready:124,aired:121},viewer:65,critic:45,quality:60,budgetPerEpisode:6000,baseBudgetPerEpisode:6000,target:affinity({adultWomen:74,adultMen:55,seniorWomen:68}),art:'grid',font:'wide',p1:'#d6673f',p2:'#222b46',team:{showrunner:'e8',leadWriter:'e7',leadTalent:'e9'},cast:['e9'],marketing:18}),
    program({id:'p_court',title:'Common Ground',format:'Factual',genre:'Talk',ipId:'ip_court',episodes:520,duration:60,pipeline:{scripted:72,pre:65,filmed:59,ready:54,aired:47},viewer:62,critic:38,quality:57,budgetPerEpisode:5000,baseBudgetPerEpisode:5000,target:affinity({adultWomen:68,seniorWomen:57,adultMen:43}),art:'bars',font:'condensed',p1:'#a85ca8',p2:'#24203c',team:{showrunner:'e8',leadWriter:'e6',leadTalent:'e10'},cast:['e10'],marketing:14}),
    program({id:'p_news',title:'Virginia Tonight',format:'Factual',genre:'News',ipId:'ip_local',episodes:780,duration:60,pipeline:{scripted:194,pre:190,filmed:187,ready:184,aired:182},viewer:68,critic:61,quality:65,budgetPerEpisode:4000,baseBudgetPerEpisode:4000,target:affinity({adultMen:72,adultWomen:72,seniorMen:76,seniorWomen:79}),art:'grid',font:'wide',p1:'#3f8aa5',p2:'#172840',team:{showrunner:'e8',leadWriter:'e7',leadTalent:'e9'},cast:['e9'],marketing:12}),
    program({id:'p_movie',title:'Friday Movie',format:'Acquired',genre:'Drama',ipId:'ip_local',episodes:52,duration:120,pipeline:{scripted:52,pre:52,filmed:52,ready:34,aired:17},viewer:57,critic:51,quality:54,budgetPerEpisode:0,baseBudgetPerEpisode:0,target:affinity({adultMen:55,adultWomen:58,seniorMen:60,seniorWomen:64}),art:'noise',font:'serif',p1:'#ba6146',p2:'#312437',rightsRuns:52,acquired:true,marketing:8})
  ];

  const schedule={};
  DAYS.forEach((d,di)=>{
    schedule[d]={};
    DAYPARTS.forEach(([k])=>schedule[d][k]='p_court');
    schedule[d].morning='p_morning';schedule[d].fringe='p_news';schedule[d].access='p_news';
    schedule[d].prime1=di===4?'p_movie':di===1?'p_home':'p_city';schedule[d].prime2=di===4?'p_movie':di===1?'p_home':'p_city';
    schedule[d].late='p_news';schedule[d].overnight='p_court';
  });

  const employees=[
    emp('e1','Maya Chen','Head of Content','Executive',81,1200000,{vision:88,management:76,negotiation:67}),
    emp('e2','David Ross','Head of Programming','Executive',78,920000,{programming:88,analytics:72,management:74}),
    emp('e3','Lena Ortiz','Head of Ad Sales','Commercial',74,760000,{sales:84,negotiation:79,analytics:58}),
    emp('e4','Victor Hall','Chief Engineer','Technology',76,690000,{technology:86,management:67}),
    emp('e5','Nina Bell','Showrunner','Creative',82,850000,{writing:84,vision:88,management:72,drama:91}),
    emp('e6','Evan Pike','Writer','Creative',73,185000,{writing:79,dialogue:84,speed:72}),
    emp('e7','June Foster','Writer','Creative',68,142000,{writing:72,plotting:74,speed:78}),
    emp('e8','Marcus Hale','Producer','Production',71,215000,{production:80,budget:77,management:70}),
    emp('e9','Tessa Grant','Anchor','Talent',76,330000,{charisma:83,trust:79,news:76},{}, {popularity:58}),
    emp('e10','Rory Vale','Host','Talent',69,240000,{charisma:78,improv:74,reality:64},{}, {popularity:54}),
    emp('e11','Ava Mercer','Actor','Talent',78,320000,{acting:84,drama:86,charisma:76,comedy:58},{}, {popularity:42}),
    emp('e12','Theo Jameson','Actor','Talent',74,275000,{acting:79,drama:73,charisma:82,comedy:65},{}, {popularity:38}),
    emp('e13','Carla Ruiz','Director','Creative',76,290000,{direction:84,actors:80,visual:74}),
    emp('e14','Sam Brenner','News Producer','News',72,180000,{news:78,production:73,judgment:75}),
    emp('e15','Holly Kane','Marketing Director','Commercial',73,235000,{marketing:84,branding:79,analytics:66}),
    emp('e16','Ray Cooper','Distribution VP','Commercial',71,300000,{distribution:81,negotiation:76,affiliates:79})
  ];

  const candidates=[
    emp('c1','Ari Monroe','Showrunner','Creative',88,0,{writing:91,vision:94,management:81,drama:89},1500000,{preferences:{prestige:80,freedom:85}}),
    emp('c2','Mila Hart','Writer','Creative',79,0,{writing:86,dialogue:91,speed:65},260000),
    emp('c3','Colin West','Director','Creative',81,0,{direction:89,actors:84,visual:81},460000),
    emp('c4','Priya Nair','VFX Supervisor','Production',84,0,{vfx:94,management:76,technology:88},360000),
    emp('c5','Jonah Price','Ad Sales Executive','Commercial',77,0,{sales:88,negotiation:83,analytics:61},275000),
    emp('c6','Inez Cole','Broadcast Engineer','Technology',75,0,{technology:84,reliability:90},190000),
    emp('c7','Naomi Cruz','Actor','Talent',88,0,{acting:93,drama:95,charisma:89,comedy:72},780000,{popularity:84}),
    emp('c8','Miles Rowan','Actor','Talent',83,0,{acting:87,drama:82,charisma:91,comedy:76},610000,{popularity:77}),
    emp('c9','Liam Cook','Sports Host','Talent',79,0,{charisma:84,sports:91,analysis:82},520000,{popularity:66}),
    emp('c10','Nora Field','Licensing Executive','Commercial',80,0,{licensing:91,negotiation:86,merch:77},420000)
  ];

  const technologies=[
    tech('t_hd','Integrated HD Workflow','Broadcast',1,true,'Baseline digital HD production and playout.'),
    tech('t_4k','4K Production','Production',2,false,'Capture, edit and finish premium originals in 4K.',1300000),
    tech('t_hdr','HDR Mastering','Production',2,false,'Higher dynamic range for premium drama, nature and sports.',950000),
    tech('t_cloud','Cloud Editing','Operations',2,false,'Faster distributed post-production and lower turnaround.',1200000),
    tech('t_vfx','Advanced VFX Pipeline','Production',3,false,'Makes VFX-heavy genres materially more viable.',2400000),
    tech('t_remote','Remote Production','Broadcast',2,false,'Reduce travel and live-event production costs.',1700000),
    tech('t_next','Next-Gen Broadcast','Distribution',4,false,'Advanced broadcast features and future distribution capabilities.',5200000),
    tech('t_analytics','Audience Analytics II','Commercial',2,false,'Improves targeting, forecasting and ad yields.',1100000),
    tech('t_stream','Streaming Platform','Distribution',4,false,'Launch a direct digital service and FAST channels.',6500000),
    tech('t_virtual','Virtual Production','Production',4,false,'Efficient high-end worlds with real-time stages.',7200000),
    tech('t_dynamicAds','Dynamic Ad Insertion','Commercial',4,false,'Higher digital ad yield and better targeting.',4500000)
  ];

  const adCampaigns=[
    {id:'a1',brand:'Raptor Energy',target:'youngMen',secondary:'youngWomen',budget:680000,remaining:680000,goal:5200000,delivered:0,cpm:24,status:'Available',days:42,fit:['Sports','Reality']},
    {id:'a2',brand:'Meadow Home',target:'adultWomen',secondary:'seniorWomen',budget:520000,remaining:520000,goal:6100000,delivered:0,cpm:17,status:'Active',days:50,fit:['Drama','Talk']},
    {id:'a3',brand:'Titan Motors',target:'adultMen',secondary:'youngMen',budget:950000,remaining:950000,goal:6200000,delivered:0,cpm:29,status:'Available',days:35,fit:['Sports','Drama']}
  ];

  const sponsorships=[
    {id:'sp1',brand:'Harbor Bank',offer:420000,programType:'News',target:'adultMen',weeks:13,status:'Available'},
    {id:'sp2',brand:'Firefly Games',offer:610000,programType:'Reality',target:'youngMen',weeks:10,status:'Available'},
    {id:'sp3',brand:'Lark Family Foods',offer:350000,programType:'Morning',target:'adultWomen',weeks:12,status:'Available'}
  ];

  const sports=[
    {id:'s1',name:'Atlantic College Basketball',popularity:56,target:'youngMen',events:34,cost:3200000,currentBid:2500000,leader:null,term:2,owned:false,bidEnds:18,prestige:43,schedule:'Tue/Sat',exclusivity:'Regional'},
    {id:'s2',name:'Regional Baseball Saturday',popularity:43,target:'adultMen',events:22,cost:1600000,currentBid:1250000,leader:null,term:1,owned:false,bidEnds:9,prestige:31,schedule:'Sat',exclusivity:'Local'},
    {id:'s3',name:'Women’s National Volleyball',popularity:37,target:'youngWomen',events:28,cost:950000,currentBid:720000,leader:null,term:2,owned:false,bidEnds:27,prestige:35,schedule:'Fri/Sun',exclusivity:'Regional'}
  ];

  const competitors=[
    {id:'n1',name:'Union Broadcasting',strength:82,prime:88,daytime:74,sports:61,identity:'Mass-market incumbent',cash:520000000,prestige:72,momentum:0},
    {id:'n2',name:'Sterling Network',strength:71,prime:86,daytime:52,sports:24,identity:'Prestige scripted',cash:310000000,prestige:88,momentum:0},
    {id:'n3',name:'Velocity TV',strength:64,prime:58,daytime:42,sports:93,identity:'Sports & live events',cash:290000000,prestige:58,momentum:0},
    {id:'n4',name:'Pulse',strength:57,prime:65,daytime:55,sports:18,identity:'Young reality & music',cash:170000000,prestige:44,momentum:0}
  ];

  const ipMarket=[
    {id:'m1',name:'The Ash Crown',type:'Fantasy Novel',popularity:61,novelty:73,prestige:77,fandom:68,flexibility:46,cost:3800000,merchPotential:81,affinity:affinity({youngMen:75,youngWomen:78,adultWomen:60}),rights:{term:5,territory:'North America',medium:'Live-action TV',merchSplit:35}},
    {id:'m2',name:'Neon Runner',type:'Video Game',popularity:74,novelty:57,prestige:44,fandom:86,flexibility:58,cost:6100000,merchPotential:92,affinity:affinity({youngMen:93,youngWomen:57,adultMen:47}),rights:{term:4,territory:'North America',medium:'TV',merchSplit:45}},
    {id:'m3',name:'Sunset Letters',type:'Romance Books',popularity:58,novelty:66,prestige:51,fandom:72,flexibility:64,cost:2700000,merchPotential:46,affinity:affinity({youngWomen:94,adultWomen:72}),rights:{term:5,territory:'US',medium:'TV',merchSplit:30}},
    {id:'m4',name:'Galaxy Patrol',type:'Classic TV',popularity:69,novelty:24,prestige:63,fandom:83,flexibility:35,cost:4900000,merchPotential:88,affinity:affinity({adultMen:79,seniorMen:70,youngMen:54}),rights:{term:3,territory:'US',medium:'TV reboot',merchSplit:50}}
  ];

  const contentMarket=[
    {id:'cm1',title:'Night Train to Mercury',type:'Movie Package',genre:'Science Fiction',runs:6,duration:120,cost:420000,viewer:74,critic:81,popularity:44,affinity:affinity({youngMen:72,adultMen:63,youngWomen:48})},
    {id:'cm2',title:'Hearts on Harbor Street',type:'Movie Package',genre:'Romance',runs:8,duration:120,cost:350000,viewer:78,critic:62,popularity:52,affinity:affinity({youngWomen:80,adultWomen:84,seniorWomen:55})},
    {id:'cm3',title:'Metro Precinct',type:'Syndicated Series',genre:'Crime',runs:52,duration:60,cost:780000,viewer:70,critic:67,popularity:61,affinity:affinity({adultMen:74,adultWomen:67,seniorMen:61})},
    {id:'cm4',title:'Tiny Explorers',type:'Kids Library',genre:'Kids',runs:65,duration:30,cost:520000,viewer:76,critic:71,popularity:55,affinity:affinity({boys:82,girls:88,adultWomen:38})}
  ];

  const affiliates=[
    {id:'af1',station:'WRED-TV',market:'OH',households:890000,asking:620000,term:4,localMinutes:6,status:'Available',quality:66},
    {id:'af2',station:'KPHL-12',market:'PA',households:1250000,asking:910000,term:3,localMinutes:7,status:'Available',quality:72},
    {id:'af3',station:'WJBY',market:'NC',households:780000,asking:490000,term:4,localMinutes:8,status:'Available',quality:58},
    {id:'af4',station:'MNTV-8',market:'MD',households:640000,asking:510000,term:3,localMinutes:6,status:'Available',quality:69}
  ];

  const awards=[
    {id:'aw1',name:'National Screen Awards',month:9,categories:['Drama','Comedy','Reality','News','Acting','Writing','Directing','Technical']},
    {id:'aw2',name:'Critics Guild Television Prizes',month:2,categories:['Drama','Comedy','Limited Series','Reality','Acting','Writing']}
  ];

  return {
    version:'0.2.0',date:'2026-09-01',cash:18000000,debt:4000000,totalRevenue:0,totalExpense:0,lastDayRevenue:0,lastDayAudience:0,weeklyAudience:0,
    network:{name:'Prebost Community Network',initials:'PCN',icon:'★',primary:'#f1c232',secondary:'#c8222f',home:'VA',prestige:31,trust:43,sports:12,youth:28,family:18,innovation:22,newsTrust:46,brand:{prestige:31,trust:43,youth:28,family:18,sports:12,innovation:22}},
    states,ips,programs,schedule,employees,candidates,tech:technologies,adCampaigns,sponsorships,sports,competitors,ipMarket,contentMarket,affiliates,awards,
    contracts:[],licenses:[],merchDeals:[],distributionDeals:[],awardHistory:[],research:null,
    facilities:{studios:2,post:1,newsroom:1,vfx:0,wardrobe:1,setShop:1,control:1,archive:1,research:1},
    newsroom:{bureaus:1,reporters:3,weather:1,sportsDesk:1,investigative:0,budget:3800000,trust:49},
    streaming:{unlocked:false,launched:false,name:'PCN+',model:'Hybrid',subscribers:0,price:7.99,adLoad:5,libraryWindow:30},
    automation:{ads:false,schedule:false,production:false,affiliates:false},
    ratingsLog:[],financeLog:[],news:[{date:'2026-09-01',type:'green',text:'PCN begins a new season. Build the network you want America to watch.'}],
    settings:{autosave:true},ui:{page:'dashboard',studioTab:'slate',channelTab:'schedule',businessTab:'ads',orgTab:'people'},
    seasonYear:2026,yearly:{awardsProcessed:[]}
  };
}

export function makeProgramDraft({title='Untitled',format='Scripted',genre='Drama',episodes=10,duration=60,target=affinity(),art='ring',font='condensed',p1='#efc84f',p2='#3b244e',ipId=null}){
  return program({
    id:uid('p'),title,format,genre,ipId,episodes:Number(episodes),duration:Number(duration),status:'Development',developmentProgress:0,developmentDays:Math.max(5,Math.round(6+Number(episodes)*(Number(duration)/60)*(format==='Scripted'?2.2:format==='Reality'?1.15:.45))),pipeline:{scripted:0,pre:0,filmed:0,ready:0,aired:0},
    viewer:55,critic:50,quality:55,budgetPerEpisode:format==='Scripted'?420000:format==='Reality'?240000:['News','Morning','Talk'].includes(genre)?6000:90000,
    baseBudgetPerEpisode:format==='Scripted'?420000:format==='Reality'?240000:['News','Morning','Talk'].includes(genre)?6000:90000,
    target,art,font,p1,p2,awareness:8,marketing:0,chemistry:50
  });
}
