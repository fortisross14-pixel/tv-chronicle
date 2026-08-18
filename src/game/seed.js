import { affinity, uid } from './utils.js';
import { STATE_LAYOUT, STATE_HOUSEHOLDS, FORMAT_EXPERTISE } from './constants.js';

const emp=(id,name,role,dept,overall,ask,skills={},extra={})=>({
  id,name,role,dept,overall,salary:0,ask,skills,morale:72,contractYears:0,popularity:extra.popularity??overall*.32,
  preferences:{prestige:50,security:50,freedom:50,...(extra.preferences||{})},...extra
});
const tech=(id,name,group,tier,researched,desc,cost=0)=>({id,name,group,tier,progress:researched?100:0,researched,desc,cost});

export function rolesFor(format,genre){
  if(format==='Scripted')return [
    {id:'lead1',name:'Lead',kind:'Actor'},
    {id:'lead2',name:'Co-Lead',kind:'Actor'},
    {id:'support1',name:'Supporting',kind:'Actor'}
  ];
  if(format==='Reality')return [{id:'host',name:'Host',kind:'Host'}];
  if(['News','Morning','Talk','Current Affairs','Weather','Investigative'].includes(genre))return [{id:'host',name:genre==='News'?'Anchor':'Host',kind:'Host'}];
  return [{id:'host',name:'Presenter / Host',kind:'Host'}];
}

export function marketCandidates(){
  return [
    emp('c1','Ari Monroe','Showrunner','Creative',88,1500000,{writing:91,vision:94,management:81,originality:88,drama:89},{preferences:{prestige:80,freedom:85}}),
    emp('c2','Mila Hart','Writer','Creative',79,260000,{writing:86,dialogue:91,plotting:78,speed:65,originality:84}),
    emp('c3','June Foster','Writer','Creative',68,145000,{writing:72,dialogue:68,plotting:74,speed:78,originality:67}),
    emp('c4','Evan Pike','Writer','Creative',73,190000,{writing:79,dialogue:84,plotting:70,speed:72,originality:72}),
    emp('c5','Colin West','Director','Creative',81,460000,{direction:89,actors:84,visual:81,management:73}),
    emp('c6','Carla Ruiz','Director','Creative',76,300000,{direction:84,actors:80,visual:74,management:70}),
    emp('c7','Marcus Hale','Showrunner','Creative',72,320000,{writing:72,vision:75,management:82,originality:65,reality:79}),
    emp('c8','Naomi Cruz','Actor','Talent',88,780000,{acting:93,drama:95,charisma:89,comedy:72},{popularity:84}),
    emp('c9','Miles Rowan','Actor','Talent',83,610000,{acting:87,drama:82,charisma:91,comedy:76},{popularity:77}),
    emp('c10','Ava Mercer','Actor','Talent',78,360000,{acting:84,drama:86,charisma:76,comedy:58},{popularity:49}),
    emp('c11','Theo Jameson','Actor','Talent',74,290000,{acting:79,drama:73,charisma:82,comedy:65},{popularity:43}),
    emp('c12','Rory Vale','Host','Talent',69,245000,{charisma:78,improv:74,reality:80,news:45},{popularity:54}),
    emp('c13','Tessa Grant','Anchor','Talent',76,335000,{charisma:83,trust:79,news:86,improv:64},{popularity:58}),
    emp('c14','Liam Cook','Sports Host','Talent',79,520000,{charisma:84,sports:91,analysis:82},{popularity:66}),
    emp('c15','Priya Nair','VFX Supervisor','Production',84,360000,{vfx:94,management:76,technology:88}),
    emp('c16','Inez Cole','Broadcast Engineer','Technology',75,190000,{technology:84,reliability:90}),
    emp('c17','Jonah Price','Ad Sales Executive','Commercial',77,275000,{sales:88,negotiation:83,analytics:61}),
    emp('c18','Nora Field','Licensing Executive','Commercial',80,420000,{licensing:91,negotiation:86,merch:77}),
    emp('c19','Holly Kane','Marketing Director','Commercial',73,235000,{marketing:84,branding:79,analytics:66}),
    emp('c20','Ray Cooper','Distribution VP','Commercial',71,300000,{distribution:81,negotiation:76,affiliates:79}),
    emp('c21','Sam Brenner','News Producer','News',72,180000,{news:78,production:73,judgment:75}),
    emp('c22','Maya Chen','Head of Content','Executive',81,1200000,{vision:88,management:76,negotiation:67}),
    emp('c23','David Ross','Head of Programming','Executive',78,920000,{programming:88,analytics:72,management:74}),
    emp('c24','Lena Ortiz','Head of Ad Sales','Commercial',74,760000,{sales:84,negotiation:79,analytics:58}),
    emp('c25','Victor Hall','Chief Engineer','Technology',76,690000,{technology:86,management:67})
  ];
}

export function seedState(options={}){
  const home=options.home||'VA';
  const states=STATE_LAYOUT.map(([code,col,row])=>({
    code,col,row,households:STATE_HOUSEHOLDS[code]||500000,
    coverage:code===home ? .18 : 0,awareness:code===home?12:0,owned:code===home,
    affiliate:null,carriage:code===home?20:0,adValue:50+((STATE_HOUSEHOLDS[code]||500000)/14500000)*35
  }));
  const expertise=Object.fromEntries(FORMAT_EXPERTISE.map(f=>[f,0]));
  if(options.focus&&expertise[options.focus]!==undefined)expertise[options.focus]=4; // 4/10 = two visible stars.

  const technologies=[
    tech('t_hd','Integrated HD Workflow','Broadcast',1,true,'Baseline 1080p digital production and playout.'),
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

  const contentMarket=[
    {id:'cm1',title:'Midnight Science Fiction Collection',type:'Movie Package',genre:'Science Fiction',runs:12,duration:120,cost:460000,viewer:72,critic:70,popularity:45,affinity:affinity({youngMen:72,adultMen:63,youngWomen:48})},
    {id:'cm2',title:'Heartland Romance Collection',type:'Movie Package',genre:'Romance',runs:16,duration:120,cost:390000,viewer:76,critic:61,popularity:52,affinity:affinity({youngWomen:80,adultWomen:84,seniorWomen:55})},
    {id:'cm3',title:'Metro Precinct',type:'Syndicated Series',genre:'Crime',runs:52,duration:60,cost:780000,viewer:70,critic:67,popularity:61,affinity:affinity({adultMen:74,adultWomen:67,seniorMen:61})},
    {id:'cm4',title:'Tiny Explorers',type:'Kids Library',genre:'Kids',runs:65,duration:30,cost:520000,viewer:76,critic:71,popularity:55,affinity:affinity({boys:82,girls:88,adultWomen:38})},
    {id:'cm5',title:'Classic Comedy Half-Hours',type:'Syndicated Package',genre:'Comedy',runs:80,duration:30,cost:610000,viewer:68,critic:64,popularity:58,affinity:affinity({adultWomen:65,adultMen:62,seniorWomen:54})}
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

  const affiliates=[
    {id:'af1',station:'WRED-TV',market:'OH',households:890000,ask:620000,term:4,localMinutes:6,status:'Available',quality:66},
    {id:'af2',station:'KPHL-12',market:'PA',households:1250000,ask:910000,term:3,localMinutes:7,status:'Available',quality:72},
    {id:'af3',station:'WJBY',market:'NC',households:780000,ask:490000,term:4,localMinutes:8,status:'Available',quality:58},
    {id:'af4',station:'MNTV-8',market:'MD',households:640000,ask:510000,term:3,localMinutes:6,status:'Available',quality:69}
  ];

  const awards=[
    {id:'aw1',name:'National Screen Awards',month:9,categories:['Drama','Comedy','Reality','News','Acting','Writing','Directing','Technical']},
    {id:'aw2',name:'Critics Guild Television Prizes',month:2,categories:['Drama','Comedy','Limited Series','Reality','Acting','Writing']}
  ];

  const now='2026-09-01';
  return {
    version:'0.3.0',date:now,cash:20000000,debt:0,totalRevenue:0,totalExpense:0,lastDayRevenue:0,lastDayAudience:0,weeklyAudience:0,
    network:{name:options.name||'New Community Network',initials:(options.initials||'NCN').toUpperCase(),icon:options.icon||'★',shape:options.shape||'circle',primary:options.primary||'#f1c232',secondary:options.secondary||'#c8222f',home,prestige:5,trust:8,sports:0,youth:0,family:0,innovation:4,newsTrust:0,brand:{prestige:5,trust:8,youth:0,family:0,sports:0,innovation:4},expertise},
    states,ips:[],programs:[],developments:[],scheduleBlocks:Object.fromEntries(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>[d,[]])),employees:[],candidateMarket:marketCandidates(),candidateShortlists:[],staffSearches:[],negotiations:[],
    tech:technologies,adCampaigns:[],sponsorships:[],sports,competitors,ipMarket,contentMarket,affiliates,awards,
    contracts:[],licenses:[],merchDeals:[],distributionDeals:[],awardHistory:[],research:null,
    facilities:{studios:0,post:0,newsroom:0,vfx:0,wardrobe:0,setShop:0,control:1,archive:0,research:0},facilityProjects:[],
    newsroom:{bureaus:0,reporters:0,weather:0,sportsDesk:0,investigative:0,budget:0,trust:0},
    streaming:{unlocked:false,launched:false,name:`${(options.initials||'NCN').toUpperCase()}+`,model:'Hybrid',subscribers:0,price:7.99,adLoad:5,libraryWindow:30},
    automation:{ads:false,schedule:false,production:false,affiliates:false},
    ratingsLog:[],financeLog:[],emails:[
      {id:uid('mail'),date:now,from:'Network Licensing Office',subject:'Your local broadcast license is active',read:false,category:'system',body:`${options.name||'Your network'} is authorized to broadcast in ${home}. You have no programs, no production staff and no studio stage yet. Build the company from the ground up.`},
      {id:uid('mail'),date:now,from:'Board Office',subject:'First day: fill the schedule',read:false,category:'system',body:'Your transmitter is live but the schedule is empty. The fastest route to air is to license a movie or syndicated package. To create originals, hire a writer, commission a script, then assemble the production team and facilities.'}
    ],news:[],settings:{autosave:true},seasonYear:2026,yearly:{awardsProcessed:[]}
  };
}

export function makeProgramDraft({title='Untitled',format='Scripted',genre='Drama',episodes=10,duration=60,target=affinity(),art='ring',font='condensed',p1='#efc84f',p2='#3b244e',ipId=null}){
  return {
    id:uid('p'),title,format,genre,ipId,episodes:Number(episodes),duration:Number(duration),season:1,status:'Pre-production',
    awareness:8,momentum:0,marketing:0,adLoad:12,scriptStars:3,productionFocus:{writing:60,cast:60,design:50,vfx:20,music:45,sound:55,image:60},technical:{resolution:'1080p',audio:'Stereo',hdr:false},
    team:{showrunner:null,leadWriter:null,leadTalent:null,director:null},scripts:[],cast:[],castAssignments:{},auditions:[],roles:rolesFor(format,genre),chemistry:50,
    pipeline:{scripted:Number(episodes),pre:0,filmed:0,ready:0,aired:0},viewer:0,critic:0,quality:0,budgetPerEpisode:format==='Scripted'?420000:format==='Reality'?240000:['News','Morning','Talk'].includes(genre)?18000:90000,baseBudgetPerEpisode:format==='Scripted'?420000:format==='Reality'?240000:['News','Morning','Talk'].includes(genre)?18000:90000,
    target,art,font,p1,p2,lastAudience:0,totalAudience:0,airings:0,revenue:0,productionSpend:0,marketingSpend:0,licensingRevenue:0,merchRevenue:0,awards:[],premiered:false
  };
}
