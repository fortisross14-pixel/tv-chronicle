export const DEMOS = [
  ['boys','Boys'],['girls','Girls'],['youngMen','Male Teens/YA'],['youngWomen','Female Teens/YA'],
  ['adultMen','Adult Men'],['adultWomen','Adult Women'],['seniorMen','Senior Men'],['seniorWomen','Senior Women']
];

export const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export const BROADCAST_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30',
  '20:00','20:30','21:00','21:30','22:00','22:30','23:00','23:30'
];

export const DURATION_OPTIONS = [30,60,120];

export function slotBand(time){
  const h=Number(time.slice(0,2));
  if(h>=20&&h<22)return 'prime';
  if(h>=22)return 'late';
  if(h>=18)return 'access';
  if(h>=15)return 'fringe';
  return 'morning';
}

export const SLOT_MULT = {morning:.62,fringe:.72,access:.88,prime:1.18,late:.72,overnight:.32};

export const FORMATS = {
  Scripted: ['Drama','Comedy','Kids','Limited Series','Crime','Medical','Historical','Fantasy','Science Fiction','Romance'],
  Reality: ['Survival','Dating','Competition','Lifestyle','Travel','Social Experiment','Talent','Documentary Reality'],
  Factual: ['News','Morning','Talk','Documentary','Cooking','Current Affairs','Weather','Investigative'],
  Live: ['Awards','Concert','Special','Event'],
  Sports: ['Live Sports','Pregame','Postgame','Highlights','Analysis']
};

export const FORMAT_EXPERTISE = Object.keys(FORMATS);

export const FORMAT_NEEDS = {
  Drama:{writing:1.25,cast:1.2,design:1.0,vfx:.55,music:.8,sound:.8,image:1.0},
  Comedy:{writing:1.35,cast:1.3,design:.65,vfx:.15,music:.45,sound:.7,image:.6},
  Kids:{writing:.9,cast:.9,design:1.05,vfx:.7,music:1.0,sound:.8,image:.8},
  Fantasy:{writing:1.05,cast:1.0,design:1.35,vfx:1.35,music:1.0,sound:1.0,image:1.15},
  'Science Fiction':{writing:1.0,cast:.95,design:1.3,vfx:1.45,music:1.0,sound:1.1,image:1.2},
  Historical:{writing:1.05,cast:1.0,design:1.45,vfx:.55,music:.85,sound:.8,image:1.15},
  Survival:{writing:.45,cast:1.0,design:.45,vfx:.1,music:.65,sound:.9,image:.9},
  Dating:{writing:.4,cast:1.2,design:.7,vfx:.1,music:.7,sound:.8,image:.85},
  Competition:{writing:.5,cast:1.05,design:.8,vfx:.2,music:.85,sound:.9,image:.9},
  News:{writing:.45,cast:1.2,design:.65,vfx:.1,music:.35,sound:1.15,image:1.0},
  Morning:{writing:.45,cast:1.25,design:.7,vfx:.1,music:.5,sound:1.0,image:.95},
  Talk:{writing:.65,cast:1.35,design:.55,vfx:.1,music:.45,sound:.9,image:.8},
  Documentary:{writing:1.0,cast:.45,design:.35,vfx:.25,music:.85,sound:.95,image:1.15},
  'Live Sports':{writing:.15,cast:1.0,design:.45,vfx:.25,music:.55,sound:1.3,image:1.25},
  default:{writing:1,cast:1,design:1,vfx:.6,music:.7,sound:.8,image:.9}
};

export const THEME_NOVELTY = {
  Contemporary:0,Local:-8,Workplace:-4,Family:-5,Medical:-5,Crime:-4,Historical:7,Fantasy:13,Space:22,
  'Remote Wilderness':10,'Extreme Environment':14,Celebrity:-2,'Social Experiment':12,'Near Future':16,
  International:8,'Small Town':-2,Urban:1,Romance:-3,Politics:0,Food:-4,Travel:5,Sports:-3,Music:2
};

export const CONCEPT_ANGLES = {
  Familiar:{novelty:-10,risk:-8,label:'Familiar'},
  Fresh:{novelty:5,risk:0,label:'Fresh'},
  Experimental:{novelty:18,risk:12,label:'Experimental'}
};

export const ART_STYLES = ['sun','grid','bars','ring','noise','split'];
export const FONT_STYLES = ['condensed','serif','wide','block'];
export const PALETTES = [
  ['#e16634','#1a2737'],['#efc84f','#3b244e'],['#52b7db','#152947'],['#db4e70','#211a36'],['#7bb95a','#14362e'],['#9272d1','#1b213d'],
  ['#e7e2d4','#252f3f'],['#f37c98','#4a234b']
];

export const STATE_LAYOUT = [
  ['WA',1,1],['MT',3,1],['ND',5,1],['MN',6,1],['WI',7,1],['MI',8,1],['VT',10,1],['ME',12,1],
  ['OR',1,2],['ID',2,2],['WY',3,2],['SD',5,2],['IA',6,2],['IL',7,2],['IN',8,2],['OH',9,2],['NY',10,2],['NH',11,2],['MA',12,2],
  ['CA',1,3],['NV',2,3],['UT',3,3],['CO',4,3],['NE',5,3],['MO',6,3],['KY',7,3],['WV',8,3],['PA',9,3],['NJ',10,3],['CT',11,3],['RI',12,3],
  ['AZ',2,4],['NM',3,4],['KS',4,4],['OK',5,4],['AR',6,4],['TN',7,4],['VA',8,4],['MD',9,4],['DE',10,4],
  ['TX',4,5],['LA',5,5],['MS',6,5],['AL',7,5],['NC',8,5],['SC',9,5],['AK',1,6],['HI',2,6],['GA',8,6],['FL',9,6]
];

export const STATE_HOUSEHOLDS = {
  CA:14500000,TX:11200000,FL:8400000,NY:7700000,PA:5100000,IL:4900000,OH:4700000,GA:4100000,NC:4100000,MI:4000000,
  NJ:3600000,VA:3400000,WA:3100000,AZ:2900000,MA:2800000,TN:2800000,IN:2700000,MO:2500000,MD:2400000,WI:2400000,CO:2300000,
  MN:2200000,SC:2100000,AL:2000000,LA:1800000,KY:1800000,OR:1700000,OK:1600000,CT:1500000,UT:1200000,IA:1300000,NV:1200000,
  AR:1200000,MS:1100000,KS:1100000,NM:850000,NE:800000,WV:700000,ID:700000,HI:550000,NH:540000,ME:570000,RI:440000,MT:450000,
  DE:390000,SD:350000,ND:330000,AK:280000,VT:260000,WY:230000
};

export const NAV = [
  ['dashboard','Inbox','✉'],['studio','Studio','◉'],['channel','Channel','▦'],['business','Business','◆'],['organization','Organization','⌂'],['qa','QA','⚙']
];
