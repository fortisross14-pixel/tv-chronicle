import React, { useState } from 'react';
import { Card, Pill, SectionTitle } from '../components/UI.jsx';
import { FEATURE_AUDIT, runBalanceQA, runStateQA } from '../game/qa.js';
import { money, num } from '../game/utils.js';

export default function QA({state}){
  const checks=runStateQA(state);const [balance,setBalance]=useState(null);
  const pass=checks.filter(x=>x.ok).length;
  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">DEVELOPER TOOLS</span><h1>QA & Balance Lab</h1><p>Regression checks, design-document coverage and cloned long-run simulation.</p></div><button className="primary" onClick={()=>setBalance(runBalanceQA(180))}>Run 180-Day Balance</button></div>
    <div className="metric-grid"><div className="metric"><span>Live State QA</span><strong>{pass}/{checks.length}</strong><small>checks passing</small></div><div className="metric"><span>GDD Coverage</span><strong>{FEATURE_AUDIT.length}</strong><small>implemented feature groups</small></div>{balance&&<><div className="metric"><span>Balance Cash</span><strong>{money(balance.cash)}</strong><small>after 180 unattended days</small></div><div className="metric"><span>Balance QA</span><strong>{balance.passed}/{balance.total}</strong><small>{balance.date}</small></div></>}</div>
    <div className="dashboard-grid">
      <Card className="pad"><SectionTitle title="Integrity Suite" sub="Current live save"/><div className="qa-list">{checks.map(c=><div className="qa-row" key={c.name}><Pill tone={c.ok?'ok':'danger'}>{c.ok?'PASS':'FAIL'}</Pill><div><b>{c.name}</b>{c.detail&&<span>{c.detail}</span>}</div></div>)}</div></Card>
      <Card className="pad span-2"><SectionTitle title="Design Document Audit" sub="Everything below has a playable surface or underlying simulation in this build."/><div className="audit-grid">{FEATURE_AUDIT.map(([name,detail])=><div className="audit-row" key={name}><i>✓</i><div><b>{name}</b><span>{detail}</span></div></div>)}</div></Card>
      {balance&&<Card className="pad span-3"><SectionTitle title="180-Day Clone Result" sub="Runs against a fresh cloned network and never mutates your active save."/><div className="metric-grid compact-metrics"><div className="metric"><span>Date</span><strong>{balance.date}</strong></div><div className="metric"><span>Cash</span><strong>{money(balance.cash)}</strong></div><div className="metric"><span>Reach</span><strong>{num(balance.reach)}</strong></div><div className="metric"><span>Programs</span><strong>{balance.programs}</strong></div></div></Card>}
    </div>
  </div>
}
