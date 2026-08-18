import fs from 'node:fs';
import { runBalanceQA } from './src/game/qa.js';

const r=runBalanceQA(180);
const repoChecks=[];
const check=(name,ok,detail='')=>repoChecks.push({name,ok:!!ok,detail});
const css=fs.readFileSync('./src/styles.css','utf8');
const html=fs.readFileSync('./index.html','utf8');
const pkg=JSON.parse(fs.readFileSync('./package.json','utf8'));
const workflow=fs.readFileSync('./.github/workflows/deploy.yml','utf8');
check('Vite build script present',pkg.scripts?.build==='vite build');
check('React dependency present',!!pkg.dependencies?.react&&!!pkg.dependencies?.['react-dom']);
check('Vite React plugin present',!!pkg.dependencies?.['@vitejs/plugin-react']||!!pkg.devDependencies?.['@vitejs/plugin-react']);
check('Mobile viewport configured',html.includes('width=device-width')&&html.includes('viewport-fit=cover'));
check('Phone breakpoint configured',css.includes('@media(max-width:840px)'));
check('Mobile bottom navigation configured',css.includes('.bottom-nav')&&css.includes('position:fixed'));
check('Safe-area support configured',css.includes('safe-area-inset-bottom'));
check('Tables have mobile overflow',css.includes('.table-wrap{overflow:auto}'));
check('Touch-friendly mobile controls',css.includes('min-height:43px')||css.includes('min-height:42px'));
check('GitHub Pages workflow present',workflow.includes('actions/deploy-pages@v4')&&workflow.includes('npm run build'));

console.log(`TV Empire simulation QA: ${r.passed}/${r.total} checks passed after ${r.days} simulated days.`);
console.log(`Cash: $${Math.round(r.cash).toLocaleString()} | Programs: ${r.programs} | Date: ${r.date}`);
for(const c of r.checks) console.log(`${c.ok?'PASS':'FAIL'}  ${c.name}${c.detail?` — ${c.detail}`:''}`);
const repoPass=repoChecks.filter(x=>x.ok).length;
console.log(`\nRepository/mobile QA: ${repoPass}/${repoChecks.length} checks passed.`);
for(const c of repoChecks) console.log(`${c.ok?'PASS':'FAIL'}  ${c.name}${c.detail?` — ${c.detail}`:''}`);
if(r.passed!==r.total||repoPass!==repoChecks.length) process.exit(1);
