import { affinity, clamp, uid } from './utils.js';
import { STATE_LAYOUT, STATE_HOUSEHOLDS, STATE_MARKET_PRESETS, FORMAT_EXPERTISE } from './constants.js';

const emp=(id,name,role,dept,overall,ask,skills={},extra={})=>({
  id,name,role,dept,overall,salary:0,ask,marketAverage:extra.marketAverage||Math.round(ask*.92),skills,morale:72,contractYears:0,popularity:extra.popularity??overall*.32,
  demands:{salary:ask,years:extra.years||3,bonus:extra.bonus||Math.round(ask*.08),backend:extra.backend||0,creativeControl:extra.creativeControl||0},
  preferences:{prestige:50,security:50,freedom:50,...(extra.preferences||{})},projects:[],...extra
});
const tech=(id,name,group,tier,researched,desc,cost=0)=>({id,name,group,tier,progress:researched?100:0,researched,desc,cost});

export function rolesFor(format,genre){
  if(format==='Scripted')return [{id:'lead1',name:'Lead',kind:'Actor'},{id:'lead2',name:'Co-Lead',kind:'Actor'},{id:'support1',name:'Supporting',kind:'Actor'}];
  if(format==='Reality')return [{id:'host',name:'Host',kind:'Host'}];
  if(format==='Contests')return [{id:'host',name:'Host',kind:'Host'}];
  if(format==='News')return [{id:'anchor',name:genre.includes('News')?'Anchor':'Presenter',kind:'Anchor'}];
  if(format==='Documentaries')return [{id:'presenter',name:'Presenter / Narrator',kind:'Host'}];
  if(format==='Sports'&&genre!=='Live Sports')return [{id:'host',name:'Sports Host',kind:'Sports Host'}];
  if(format==='Live')return [{id:'host',name:'Host / Presenter',kind:'Host'}];
  return [];
}

export function marketCandidates(){
  return [
    emp('c1','Ari Monroe','Showrunner','Creative',88,1500000,{writing:91,vision:94,management:81,originality:88,drama:89},{creativeControl:70,backend:1.5,preferences:{prestige:80,freedom:85}}),
    emp('c2','Mila Hart','Writer','Creative',79,260000,{writing:86,dialogue:91,plotting:78,speed:65,originality:84}),
    emp('c3','June Foster','Writer','Creative',68,145000,{writing:72,dialogue:68,plotting:74,speed:78,originality:67}),
    emp('c4','Evan Pike','Writer','Creative',73,190000,{writing:79,dialogue:84,plotting:70,speed:72,originality:72}),
    emp('c5','Colin West','Director','Creative',81,460000,{direction:89,actors:84,visual:81,management:73}),
    emp('c6','Carla Ruiz','Director','Creative',76,300000,{direction:84,actors:80,visual:74,management:70}),
    emp('c7','Marcus Hale','Showrunner','Creative',72,320000,{writing:72,vision:75,management:82,originality:65,reality:79}),
    emp('c8','Naomi Cruz','Actor','Talent',88,780000,{acting:93,drama:95,charisma:89,comedy:72},{popularity:84,backend:1}),
    emp('c9','Miles Rowan','Actor','Talent',83,610000,{acting:87,drama:82,charisma:91,comedy:76},{popularity:77}),
    emp('c10','Ava Mercer','Actor','Talent',78,360000,{acting:84,drama:86,charisma:76,comedy:58},{popularity:49}),
    emp('c11','Theo Jameson','Actor','Talent',74,290000,{acting:79,drama:73,charisma:82,comedy:65},{popularity:43}),
    emp('c12','Rory Vale','Host','Talent',69,245000,{charisma:78,improv:74,reality:80,news:45,contest:72},{popularity:54}),
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
    emp('c25','Victor Hall','Chief Engineer','Technology',76,690000,{technology:86,management:67}),
    emp('c26','Dr. Amara Singh','Chief Innovation Officer','Executive',84,1120000,{technology:91,innovation:94,management:79,research:92},{years:4,bonus:125000}),
    emp('c27','Peter Lang','Chief Innovation Officer','Executive',70,650000,{technology:76,innovation:78,management:74,research:79}),
    emp('c28','Dani Brooks','Contest Producer','Creative',77,390000,{vision:80,management:84,originality:74,contest:91}),
    emp('c29','Eli Navarro','Documentary Producer','Creative',82,470000,{vision:88,management:76,originality:83,documentary:94}),
    emp('c30','Monica Reed','Sports Producer','Creative',80,510000,{vision:78,management:88,sports:93,live:86})
  ];
}

function makeAreas(code,households){
  const preset=STATE_MARKET_PRESETS[code];
  const defs=preset||(
    households>6000000?[['Primary Metro','Huge Urban',.48],['Secondary Metro','Urban',.24],['Regional / Rural','Rural',.28]]:
    households>2500000?[['Primary Metro','Large Urban',.48],['Secondary Metro','Urban',.27],['Rural Region','Rural',.25]]:
    households>900000?[['Main Metro','Urban',.58],['Rural Region','Rural',.42]]:[['Statewide Market','Mixed',1]]
  );
  return defs.map(([name,type,share],i)=>({id:`${code}-${i+1}`,name,type,share,households:Math.round(households*share),rightsOwned:false,rightsPending:false,antennaLevel:0,antennaPending:false,reachPct:0,awareness:0}));
}

const moviePackages=[
  ['Dinosaur Nights','Adventure / Dinosaurs',10,78,64,['Cretaceous Run','Valley of Giants','Raptor Moon','Fossil Hunters','Lost Plateau','Thunder Lizard','Amber Code','Jurassic Coast','Bone Wars','Last Nest']],
  ['Cape & Cowl Vault','Superheroes',50,75,58,['Steel Sentinel','Night Falcon','Solar Girl','The Union','Crimson Cape','Quantum Kid']],
  ['Prestige Drama Collection','Drama',10,81,88,['Winter House','The Last Letter','River Without Bridges','A Quiet Empire','The Orchard','Northbound']],
  ['Agent Seven Marathon','Spy / Espionage',10,84,71,['Double Meridian','Night Embassy','Cipher Black','Golden Trigger','The Vienna File','Zero Protocol']],
  ['Back to the 80s','1980s Nostalgia',50,72,61,['Arcade Summer','Neon High','Mall Rats 84','Cassette Hearts','Midnight Convertible','Video Store Kids']],
  ['Silver Screen Classics','Black & White Classics',50,65,89,['The Long Platform','Midnight Telegram','A Woman in Rain','Third Street','The Brass Key','Tomorrow at Dawn']],
  ['Monster Matinee','Classic Monsters',50,68,62,['The Mire','Castle Below','Creature at Noon','The Pale Visitor','Wolf Road','The Hollow Man']],
  ['Family Adventure Sundays','Family Adventure',10,79,72,['Treasure Camp','Flight of the Red Kite','The Secret Lighthouse','River Quest','Mountain Dog','Island Summer']],
  ['Rom-Com Rotation','Romantic Comedy',10,77,59,['Meet Me Tuesday','Second Coffee','Apartment 9B','Almost December','Plus One','The Wrong Wedding']],
  ['Crime After Dark','Crime Thriller',50,73,70,['Cold Avenue','Evidence Room','The Informant','City of Ash','Night Witness','Red Line']],
  ['Space Frontier Library','Science Fiction',50,76,74,['Europa Wake','Signal Nine','Red Orbit','The Far Colony','Vacuum','Moonfall Station']],
  ['Holiday Movie Factory','Holiday',50,80,48,['Snowbound Hearts','Christmas at Cedar Inn','Mistletoe Contract','December Recipe','Home by Friday','A Very Local Christmas']],
  ['World Cinema Select','International Drama',10,69,92,['The Blue Bicycle','Spring Market','Under Lisbon Rain','Silent Harbor','A Map of Kyoto','The Long Siesta']],
  ['Saturday Action Pack','Action',50,78,51,['Terminal Force','Hard Harbor','Fireline','Steel Pursuit','Highway Siege','Red Sector']],
  ['Young Hearts Collection','Teen / YA',10,82,63,['Last Summer First','Hallway 17','The Lake House Party','Before Graduation','New Kid','Friday Lights']],
  ['Nature Feature Films','Nature / Documentary',10,70,86,['Ocean Kingdom','Wild North','Desert Bloom','Migration','Forest Giants','Ice World']],
  ['Laugh Track Legends','Classic Comedy',50,71,77,['Roommates','The Neighbor','Office Hours','Family Business','Wrong Number','Weekend Dad']],
  ['Western Heritage','Westerns',50,62,78,['Dry County','Sundown Trail','The Marshal','Copper Canyon','Three Riders','High Desert']],
  ['Mystery Movie Wheel','Mystery',10,75,68,['The Locked Room','Green Umbrella','House on Crane Street','Last Passenger','Black Notebook','The Vanishing Clock']],
  ['Animation Family Vault','Animated Family',50,86,73,['Rocket Pup','Princess Pixel','Jungle Pals','Cloud City Kids','Dino School','Moon Rabbit']]
];

function buildContentMarket(){
  return moviePackages.map((x,i)=>{const [title,genre,size,viewer,critic,sample]=x;const movies=Array.from({length:size},(_,j)=>sample[j%sample.length]+(j>=sample.length?` ${Math.floor(j/sample.length)+1}`:'')).map((name,j)=>({id:`cm${i+1}-m${j+1}`,name,viewer:clamp(viewer+(j%7)-3,45,94),critic:clamp(critic+(j%9)-4,35,98)}));return {id:`cm${i+1}`,title,type:'Movie Library',genre,packageSize:size,duration:120,fullCost:Math.round(size*(size===50?62000:90000)*(0.8+i*.01)),viewer,critic,popularity:clamp((viewer+critic)/2-10,25,85),affinity:affinity(genre.includes('Teen')?{youngWomen:85,youngMen:72}:genre.includes('Family')||genre.includes('Animation')?{girls:80,boys:78,adultWomen:56}:genre.includes('Action')||genre.includes('Spy')?{youngMen:78,adultMen:82}:genre.includes('Drama')?{adultWomen:78,adultMen:62}:{}),movies};});
}

const sportDefs=[
  ['Local High School Football','Football','local',26,180000,42,'youngMen',24,'Fri'],['State High School Basketball','Basketball','state',34,260000,38,'youngMen',30,'Tue/Fri'],
  ['Regional Wrestling Circuit','Wrestling','regional',32,420000,46,'youngMen',36,'Sat'],['State College Basketball','College Basketball','state',38,720000,54,'youngMen',34,'Wed/Sat'],
  ['Atlantic College Football','College Football','regional',34,1800000,68,'youngMen',24,'Sat'],['National College Basketball Package','College Basketball','national',52,6800000,79,'youngMen',48,'Tue/Sat'],
  ['National Pro Basketball - Package B','Basketball','national',74,42000000,94,'youngMen',62,'Tue/Thu/Sat'],['National Pro Football - Sunday Package','Football','national',72,78000000,98,'adultMen',22,'Sun'],
  ['National Baseball Saturday','Baseball','national',66,18000000,78,'adultMen',28,'Sat'],['National Hockey Nights','Hockey','national',55,9200000,67,'adultMen',38,'Wed/Fri'],
  ['Women’s Pro Basketball','Basketball','national',48,3400000,58,'youngWomen',32,'Sun'],['National Figure Skating Tour','Figure Skating','national',44,1900000,52,'adultWomen',18,'Sun'],
  ['Pro Tennis Summer Series','Tennis','national',57,7200000,66,'adultWomen',30,'Sat/Sun'],['National Soccer League','Soccer','national',61,12500000,72,'youngMen',42,'Sat/Sun'],
  ['International Soccer Cup','Soccer','international',83,48000000,92,'youngMen',26,'Varies'],['Combat Sports Friday','Combat Sports','national',64,9800000,71,'youngMen',24,'Fri'],
  ['Motorsport Touring Championship','Motorsport','national',58,6400000,63,'adultMen',20,'Sun'],['Extreme Sports Tour','Extreme Sports','national',51,3400000,57,'youngMen',22,'Sat'],
  ['National Golf Weekends','Golf','national',53,6200000,62,'seniorMen',28,'Sat/Sun'],['Beach Volleyball Series','Volleyball','regional',35,620000,39,'youngWomen',24,'Sun']
];
function buildSports(){return sportDefs.map((x,i)=>{const [name,sport,scope,events,cost,pop,target,prestige,schedule]=x,eventDuration=['Football','Baseball','Golf'].includes(sport)?180:['Basketball','Hockey'].includes(sport)?150:['Soccer','Figure Skating','Tennis','Motorsport'].includes(sport)?120:90;return {id:`s${i+1}`,name,sport,scope,events,cost,eventDuration,currentBid:Math.round(cost*.78),leader:null,term:cost>20000000?5:cost>5000000?3:2,owned:false,bidEnds:8+(i%6)*3,prestige,schedule,exclusivity:scope==='local'?'Local':scope==='state'?'State':scope==='regional'?'Regional':'National',popularity:pop,target,demo:target};});}

const ipDefs=[
 ['The Ash Crown','Fantasy Novel',61,73,77,68,46,3800000,81,'youngWomen'],['Neon Runner','Video Game',74,57,44,86,58,6100000,92,'youngMen'],['Sunset Letters','Romance Books',58,66,51,72,64,2700000,46,'youngWomen'],['Galaxy Patrol','Classic TV',69,24,63,83,35,4900000,88,'adultMen'],
 ['Dino Frontier','Novel Series',53,70,48,74,62,2900000,90,'boys'],['Metro Knights','Comic Books',77,39,56,91,42,7400000,96,'youngMen'],['The Hollow School','YA Books',67,78,64,84,55,5200000,72,'youngWomen'],['Kitchen Kingdom','Lifestyle Brand',44,58,38,52,78,1400000,67,'adultWomen'],
 ['Red Planet Colony','Science Fiction Novels',48,83,75,62,66,3600000,78,'youngMen'],['Casebook 47','Crime Novels',71,35,69,77,41,4100000,43,'adultWomen'],['Princess Astra','Kids Books',63,69,51,82,70,3300000,98,'girls'],['Titan Arena','Video Game',81,44,39,95,38,9200000,99,'youngMen'],
 ['The Old Hotel','Mystery Novels',42,72,81,58,76,2100000,38,'seniorWomen'],['River County','Classic TV Drama',65,21,72,79,32,3500000,54,'seniorWomen'],['Zero Hour Files','Podcast',55,88,66,71,82,1700000,34,'youngWomen'],['Sky Pirates','Graphic Novels',59,80,62,78,69,3900000,89,'boys'],
 ['Second Chance Summer','Romance Novel',73,51,58,88,51,5600000,64,'youngWomen'],['Ancient Earth','Nonfiction Books',47,67,86,60,88,1800000,55,'adultMen'],['The Arcade Years','Retro Game Brand',70,26,45,89,44,4400000,93,'adultMen'],['Moon Rabbit','Children’s Character',76,55,61,94,72,6800000,100,'girls']
];
function buildIPMarket(){return ipDefs.map((x,i)=>{const [name,type,popularity,novelty,prestige,fandom,flexibility,cost,merchPotential,target]=x;return {id:`m${i+1}`,name,type,popularity,novelty,prestige,fandom,flexibility,cost,merchPotential,affinity:affinity({[target]:92}),rights:{term:3+i%4,territory:'United States',medium:'Television adaptation',merchSplit:25+(i%6)*5}};});}

function buildCompetitors(home){
  const nat=[['Crown Broadcasting','National',86,'Mass-market generalist'],['Federal Network','National',82,'News + broad entertainment'],['American Star Television','National',79,'Sports + scripted'],['United Channel','National',76,'Family + procedural']];
  const state=[['State One','State',58,`${home} established broadcaster`],['Metro State TV','State',54,`${home} urban commercial network`],['Commonwealth Network','State',49,`${home} news-heavy broadcaster`],['Heritage Television','State',45,`${home} older-skewing network`]];
  const local=[['Channel 8 Local','Local',43,'Home-market incumbent'],['Metro 12','Local',40,'Local entertainment'],['CityView 5','Local',38,'Local news + syndicated']];
  const specialist=[['WorldNews 24','Specialist',71,'24-hour news'],['Arena Sports','Specialist',74,'Sports network'],['EarthScope','Specialist',59,'Documentary network'],['Premium One','Specialist',69,'Movies + premium shows']];
  return [...nat,...state,...local,...specialist].map((x,i)=>({id:`n${i+1}`,name:x[0],scope:x[1],strength:x[2],identity:x[3],prestige:clamp(x[2]+(i%5)-5,25,92),revenue:(x[2]**2)*900000,monthlyAudience:[],audience:{yesterday:0,month:0,year:0},programs:[],formats:{Scripted:50,Reality:50,Sports:50,News:50,Documentaries:50,Live:50,Contests:50},specialty:x[1]==='Specialist'?(i===11?'News':i===12?'Sports':i===13?'Documentaries':'Scripted'):null}));
}

const adAgencies=[
 {id:'ag1',name:'Omnicom Media Group',baseShare:0.19,cpm:19,minimumReach:0,term:2,quality:91,description:'Premium national sales relationships and strong yield; higher commission.'},
 {id:'ag2',name:'Interpublic Media',baseShare:0.16,cpm:17,minimumReach:0,term:2,quality:84,description:'Balanced agency contract with good local-to-national scaling.'},
 {id:'ag3',name:'Horizon Media Partners',baseShare:0.13,cpm:15,minimumReach:0,term:1,quality:74,description:'Lower commission and approachable for small networks.'},
 {id:'ag4',name:'Community Ad Exchange',baseShare:0.10,cpm:12,minimumReach:0,term:1,quality:61,description:'Local-first sales house; weaker CPM but easy starting contract.'}
];
const sponsorDefs=[
 ['General Motors','Automotive','adultMen',26],['Ford','Automotive','adultMen',25],['Toyota','Automotive','adultWomen',24],['Nike','Sportswear','youngMen',28],['Adidas','Sportswear','youngWomen',27],['Coca-Cola','Beverage','youngWomen',23],['Pepsi','Beverage','youngMen',22],['Target','Retail','adultWomen',20],['Walmart','Retail','adultWomen',18],['Verizon','Telecom','adultMen',25],['T-Mobile','Telecom','youngWomen',24],['Apple','Technology','youngWomen',31],['Samsung','Technology','youngMen',27],['State Farm','Insurance','adultMen',21],['Disney Consumer Products','Family','girls',28]
];
function buildSponsors(){return sponsorDefs.map((x,i)=>({id:`sp${i+1}`,brand:x[0],category:x[1],target:x[2],cpm:x[3],status:'Available',programId:null,weeks:8+(i%5)*4,fixed:120000+(i%6)*70000,variablePerMillion:25000+(i%5)*12000,minimumAudience:80000+(i%4)*70000}));}

export function seedState(options={}){
  const home=options.home||'VA';
  const states=STATE_LAYOUT.map(([code,col,row])=>{const households=STATE_HOUSEHOLDS[code]||500000,areas=makeAreas(code,households);if(code===home){areas[0].rightsOwned=true;areas[0].antennaLevel=1;areas[0].reachPct=.68;areas[0].awareness=10;}const coverage=areas.reduce((sum,a)=>sum+a.share*a.reachPct,0);return {code,col,row,households,coverage,awareness:code===home?8:0,owned:code===home,allStateRights:false,areas,affiliate:null,carriage:code===home?10:0,adValue:50+(households/14500000)*35};});
  const expertise=Object.fromEntries(FORMAT_EXPERTISE.map(f=>[f,0]));if(options.focus&&expertise[options.focus]!==undefined)expertise[options.focus]=4;
  const technologies=[
    tech('t_hd','Integrated HD Workflow','Broadcast',1,true,'Baseline 1080p digital production and playout.'),tech('t_4k','4K Production','Production',2,false,'Capture, edit and finish premium originals in 4K.',1300000),tech('t_hdr','HDR Mastering','Production',2,false,'Higher dynamic range for premium drama, nature and sports.',950000),tech('t_cloud','Cloud Editing','Operations',2,false,'Faster distributed post-production and lower turnaround.',1200000),tech('t_vfx','Advanced VFX Pipeline','Production',3,false,'Makes VFX-heavy genres materially more viable.',2400000),tech('t_remote','Remote Production','Broadcast',2,false,'Reduce travel and live-event production costs.',1700000),tech('t_next','Next-Gen Broadcast','Distribution',4,false,'Advanced broadcast features and future distribution capabilities.',5200000),tech('t_analytics','Audience Analytics II','Commercial',2,false,'Improves targeting, forecasting and ad yields.',1100000),tech('t_stream','Streaming Platform','Distribution',4,false,'Launch a direct digital service and FAST channels.',6500000),tech('t_virtual','Virtual Production','Production',4,false,'Efficient high-end worlds with real-time stages.',7200000),tech('t_dynamicAds','Dynamic Ad Insertion','Commercial',4,false,'Higher digital ad yield and better targeting.',4500000)
  ];
  const now='2026-09-01';
  return {
    version:'0.4.0',date:now,cash:20000000,debt:0,totalRevenue:0,totalExpense:0,lastDayRevenue:0,lastDayAudience:0,weeklyAudience:0,
    network:{name:options.name||'New Community Network',initials:(options.initials||'NCN').toUpperCase(),icon:options.icon||'★',shape:options.shape||'circle',primary:options.primary||'#f1c232',secondary:options.secondary||'#c8222f',home,prestige:5,trust:8,sports:0,youth:0,family:0,innovation:4,newsTrust:0,brand:{prestige:5,trust:8,youth:0,family:0,sports:0,innovation:4},expertise},
    states,ips:[],programs:[],developments:[],scheduleBlocks:Object.fromEntries(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>[d,[]])),scheduleRules:[],employees:[],candidateMarket:marketCandidates(),candidateShortlists:[],staffSearches:[],negotiations:[],
    tech:technologies,sponsorships:buildSponsors(),sports:buildSports(),competitors:buildCompetitors(home),ipMarket:buildIPMarket(),contentMarket:buildContentMarket(),awards:[{id:'aw1',name:'National Screen Awards',month:9,categories:['Drama','Comedy','Reality','News','Acting','Writing','Directing','Technical']},{id:'aw2',name:'Critics Guild Television Prizes',month:2,categories:['Drama','Comedy','Limited Series','Reality','Acting','Writing']}],
    agencies:adAgencies,adAgencyContract:null,contracts:[],licenses:[],merchDeals:[],distributionDeals:[],awardHistory:[],research:null,
    facilities:{studios:0,post:0,newsroom:0,vfx:0,wardrobe:0,setShop:0,control:1,archive:0,research:0},facilityProjects:[],distributionProjects:[],
    newsroom:{bureaus:0,reporters:0,weather:0,sportsDesk:0,investigative:0,budget:0,trust:0},
    streaming:{unlocked:false,launched:false,name:`${(options.initials||'NCN').toUpperCase()}+`,model:'Hybrid',subscribers:0,price:7.99,adLoad:5,libraryWindow:30},
    automation:{ads:false,schedule:false,production:false,affiliates:false},ratingsLog:[],competitorRatings:[],networkAudienceHistory:[],programRecords:[],financeLog:[],emails:[
      {id:uid('mail'),date:now,from:'Network Licensing Office',subject:'Your local broadcast license is active',read:false,category:'system',body:`${options.name||'Your network'} is authorized to broadcast in the home market of ${home}. Your first local market has emission rights and a small antenna. You have no programs, no staff and no soundstage.`},
      {id:uid('mail'),date:now,from:'Board Office',subject:'First day: dead air',read:false,category:'system',body:'The schedule is empty. License a movie package to get on air quickly, or hire a writer and begin the longer original-production process. Base advertising revenue requires an advertising agency contract.'}
    ],news:[],settings:{autosave:true},seasonYear:2026,yearly:{awardsProcessed:[],recordsProcessed:false}
  };
}

export function makeProgramDraft({title='Untitled',format='Scripted',genre='Drama',episodes=10,duration=60,target=affinity(),art='ring',font='condensed',p1='#efc84f',p2='#3b244e',ipId=null}){
  return {id:uid('p'),title,format,genre,ipId,episodes:Number(episodes),duration:Number(duration),season:1,status:'Pre-production',awareness:8,momentum:0,marketing:0,adLoad:12,scriptStars:3,productionFocus:{writing:60,cast:60,design:50,vfx:20,music:45,sound:55,image:60},technical:{resolution:'1080p',audio:'Stereo',hdr:false},team:{showrunner:null,leadWriter:null,leadTalent:null,director:null},scripts:[],cast:[],castAssignments:{},auditions:[],roles:rolesFor(format,genre),chemistry:50,pipeline:{scripted:Number(episodes),pre:0,filmed:0,ready:0,aired:0},viewer:0,critic:0,quality:0,budgetPerEpisode:format==='Scripted'?420000:format==='Reality'?240000:format==='News'?22000:format==='Documentaries'?180000:format==='Contests'?160000:90000,baseBudgetPerEpisode:format==='Scripted'?420000:format==='Reality'?240000:format==='News'?22000:format==='Documentaries'?180000:format==='Contests'?160000:90000,target,art,font,p1,p2,lastAudience:0,totalAudience:0,airings:0,revenue:0,productionSpend:0,marketingSpend:0,licensingRevenue:0,merchRevenue:0,awards:[],premiered:false,episodeHistory:[]};
}
