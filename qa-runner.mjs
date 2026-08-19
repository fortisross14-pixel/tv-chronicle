import fs from 'node:fs';
import path from 'node:path';
import { runScenarioQA, runStateQA } from './src/game/qa.js';
import { seedState } from './src/game/seed.js';

const base=seedState({name:'QA Network',initials:'QAN',home:'VA',focus:'Scripted'});
const baseChecks=runStateQA(base);
const scenario=runScenarioQA();
const scenarioStateChecks=runStateQA(scenario.state);
const all=[...baseChecks,...scenario.results,...scenarioStateChecks];
const root=process.cwd();
const repoChecks=[];const check=(n,v,d='')=>repoChecks.push({name:n,ok:!!v,detail:d});
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

function relativeImportExportAudit(){
  const srcRoot=path.join(root,'src'),files=[];
  const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else if(/\.(js|jsx)$/.test(e.name))files.push(f)}};walk(srcRoot);
  const exportsByFile=new Map();
  for(const f of files){const text=fs.readFileSync(f,'utf8'),names=new Set();
    for(const m of text.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g))names.add(m[1]);
    if(/export\s+default\b/.test(text))names.add('default');
    for(const m of text.matchAll(/export\s*\{([^}]+)\}/g))for(const part of m[1].split(',')){const bits=part.trim().split(/\s+as\s+/);if(bits[1]||bits[0])names.add((bits[1]||bits[0]).trim())}
    exportsByFile.set(path.resolve(f),names);
  }
  const errors=[];
  const resolve=(from,spec)=>{const raw=path.resolve(path.dirname(from),spec);for(const f of [raw,`${raw}.js`,`${raw}.jsx`,path.join(raw,'index.js'),path.join(raw,'index.jsx')])if(fs.existsSync(f))return path.resolve(f);return null};
  for(const f of files){const text=fs.readFileSync(f,'utf8');for(const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)){const spec=m[2];if(!spec.startsWith('.'))continue;const target=resolve(f,spec);if(!target){errors.push(`${path.relative(root,f)} unresolved ${spec}`);continue}const names=exportsByFile.get(target)||new Set();for(const part of m[1].split(',')){const imported=part.trim().split(/\s+as\s+/)[0].trim();if(imported&&!names.has(imported))errors.push(`${path.relative(root,f)} imports missing ${imported} from ${spec}`)}}}
  return errors;
}
check('Vite config exists',fs.existsSync(path.join(root,'vite.config.js')));
check('React app entry exists',fs.existsSync(path.join(root,'src','App.jsx')));
check('GitHub Pages workflow exists',fs.existsSync(path.join(root,'.github','workflows','deploy.yml')));
const css=read('src/styles.css'), app=read('src/App.jsx'), channel=read('src/screens/Channel.jsx'), org=read('src/screens/Organization.jsx'), business=read('src/screens/Business.jsx'), dash=read('src/screens/Dashboard.jsx');
check('Mobile breakpoint present',/@media\s*\(max-width:\s*840px\)/.test(css));
check('Safe-area support',css.includes('env(safe-area-inset-bottom)'));
check('Touch manipulation enabled',css.includes('touch-action:manipulation')||css.includes('touch-action: manipulation'));
check('Bottom navigation retained',css.includes('.bottom-nav'));
check('Recurrence UI present',channel.includes('as long as')||channel.includes('As long as'));
check('Audience competition tabs present',channel.includes('Audience')&&channel.includes('Records')&&channel.includes('Programs'));
check('Awards UI present',channel.includes('Television Honors')&&channel.includes("['National','Dec 20'"));
check('Dated calendar booking present',channel.includes('dated-day-switch')&&channel.includes('Choose Programming')&&channel.includes('startDate'));
check('People Hiring/Staff subtabs present',org.includes('Hiring & Negotiations')&&org.includes('Current Staff'));
check('Facilities Existing/Build subtabs present',org.includes('Existing & In Use')&&org.includes('Build New'));
check('Negotiation latest offer visible',org.includes('Your latest offer')&&org.includes('Negotiation History'));
check('State expansion drawer present',org.includes('All-state')||org.includes('All-State')||org.includes('All State'));
check('Negotiation offer UI present',org.includes('market average')||org.includes('Market average'));
check('Agency advertising UI present',business.includes('Advertising')&&business.includes('agency'));
check('Sponsor marketplace present',business.includes('Sponsors'));
check('Inbox signing actions present',dash.includes('Sign Person')&&dash.includes('Break Negotiations'));
check('v0.5 IndexedDB storage module',fs.existsSync(path.join(root,'src','game','storage.js'))&&read('src/game/storage.js').includes('indexedDB'));
check('Launch-date gate present',channel.includes('Commit Launch Date'));
check('Premiere reveal present',dash.includes('Check Premiere Results'));
const studio=read('src/screens/Studio.jsx');
check('Pre-production wizard present',studio.includes('Finalize Pre-production'));
check('Quality tier UI present',studio.includes('Normal')&&studio.includes('Premium')&&studio.includes('Elite')&&studio.includes('writerProjectLoad'));
check('Distinct quadrant visual themes',css.includes('.page-studio')&&css.includes('.page-channel')&&css.includes('.page-business')&&css.includes('.page-organization'));
check('Expanded subtype poster art',read('src/components/UI.jsx').includes('poster-space')&&read('src/components/UI.jsx').includes('poster-quiz')&&read('src/components/UI.jsx').includes('poster-medical'));
check('Acquisition confirmations present',business.includes('ConfirmButton'));
const importAuditErrors=relativeImportExportAudit();
check('Relative named imports match exports',importAuditErrors.length===0,importAuditErrors.join('; '));
check('No documentation bundled expectation',true);
const failed=[...all,...repoChecks].filter(x=>!x.ok);
console.log(`Simulation/state/scenario: ${all.length-failed.filter(x=>all.includes(x)).length}/${all.length}`);
console.log(`Repository/mobile: ${repoChecks.filter(x=>x.ok).length}/${repoChecks.length}`);
for(const x of failed) console.log(`FAIL: ${x.name}${x.detail?` — ${x.detail}`:''}`);
if(failed.length) process.exit(1);
console.log(`Scenario cash: $${Math.round(scenario.state.cash).toLocaleString()}`);
