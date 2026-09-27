import type { EngineResult } from '@/model/types';
import { formatCurrency, formatPupm } from '@/lib/format';
import { useAssessment } from '@/store/useAssessment';
import { getBaseline } from '@/data/skus';
import { Sparkles } from 'lucide-react';
import { VerdictHero } from './VerdictHero';
import { MetricTiles } from './MetricTiles';
import { WhatWouldChange } from './WhatWouldChange';
import { CountUp } from './CountUp';

type Segment = { key: string; label: string; amount: number };

function Column({ title, total, unit, segments, scale, currency }: { title: string; total: number; unit: string; segments: Segment[]; scale: number; currency: string }) {
  const money = (value: number) => formatCurrency(value, currency);
  return <section className="comparison-column">
    <h2>{title}</h2>
    <p className="money"><CountUp value={total} format={money} /></p>
    <small>{unit}</small>
    <div className="composition" aria-hidden="true">
      {segments.filter(segment => segment.amount > 0).map(segment => <span key={segment.key} data-seg={segment.key} style={{ width: `${segment.amount / scale * 100}%` }} />)}
    </div>
    <div className="comparison-lines">
      {segments.map(segment => <div key={segment.key}><span><i className="seg-dot" data-seg={segment.key} aria-hidden="true" />{segment.label}</span><strong>{money(segment.amount)}</strong></div>)}
    </div>
  </section>;
}

export function Headline({ result: r, currency }: { result: EngineResult; currency: string }) {
  const s = useAssessment();
  const scale = Math.max(1, r.currentAnnualTotal, r.futureAnnualTotal);
  const baseline = getBaseline(s.baseline);
  return <>
    <VerdictHero result={r} currency={currency} orgName={s.orgName} />
    <MetricTiles result={r} currency={currency} horizonYears={s.assumptions.horizonYears} transitionEnabled={s.assumptions.transitionEnabled === true} entries={s.lines.length + s.addOns.length} />
    {r.netAnnualConservative <= 0 && <WhatWouldChange result={r} currency={currency} />}
    <div className="result-comparison">
      <Column title="Stay as entered" total={r.currentAnnualTotal} unit={`${currency} / year · captured current spend`} scale={scale} currency={currency} segments={[
        { key: 'suite', label: 'Baseline suite', amount: r.baselineAnnual },
        { key: 'addon', label: 'Microsoft add-ons', amount: r.addOnAnnualTotal },
        { key: 'third', label: 'Third-party tools', amount: r.thirdPartyAnnual },
      ]} />
      <Column title="Move to E7" total={r.futureAnnualTotal} unit={`${currency} / year · steady-state estimate`} scale={scale} currency={currency} segments={[
        { key: 'e7', label: 'E7 licences', amount: r.e7Annual },
        { key: 'addon', label: 'Retained Microsoft add-ons', amount: r.addOnAnnualRetained },
        { key: 'third', label: 'Retained third-party spend', amount: r.thirdPartyAnnual - r.thirdPartyCreditConservative },
      ]} />
    </div>
    {r.costAvoidance.capabilities.length > 0 && <div className="avoidance-strip">
      <span className="avoidance-strip-icon" aria-hidden="true"><Sparkles /></span>
      <div><strong>Capability cost avoided with E7 <span className="lens-badge">Separate lens</span></strong>
        {r.costAvoidance.annualAvoided > 0
          ? <p>What licensing the {r.costAvoidance.selectedCount === 1 ? 'capability' : `${r.costAvoidance.selectedCount} capabilities`} you plan to deploy separately would cost on top of {baseline.shortName}. Not an invoice you stop paying, so it is excluded from net impact, TCO and payback. <a href="#licence-cost-avoidance">See the capabilities</a></p>
          : <p>E7 includes capabilities {baseline.shortName} does not. Choose the ones you plan to deploy to see what licensing them separately would cost. <a href="#licence-cost-avoidance">Choose capabilities</a></p>}
      </div>
      {r.costAvoidance.annualAvoided > 0 && <span className="money"><CountUp value={r.costAvoidance.annualAvoided} format={v => formatCurrency(v, 'USD')} /><small> USD / year</small></span>}
    </div>}
    <details className="disclosure"><summary>Licence price versus savings-offset comparison</summary><div className="detail-copy"><p>The E7 licence amount used is <strong>{formatPupm(r.e7NetPupm, currency)} / user / month</strong>. Subtracting eligible retirement credit across {r.seats.toLocaleString()} seats produces an offset-adjusted comparison of <strong>{formatPupm(r.effectiveNetPupmConservative, currency)} / user / month</strong>.</p><p>This is not Microsoft’s invoice price. A negative offset-adjusted figure is not a refund or a negative licence bill.</p></div></details>
  </>;
}
