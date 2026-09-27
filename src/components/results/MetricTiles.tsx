import type { ReactNode } from 'react';
import { CalendarClock, Layers3, Target, TrendingDown, TrendingUp } from 'lucide-react';
import type { EngineResult } from '@/model/types';
import { formatCurrency } from '@/lib/format';
import { CountUp } from './CountUp';
import { toneOf, type Tone } from './tone';

function Tile({ tone, icon, label, children, note }: { tone: Tone | 'info'; icon: ReactNode; label: string; children: ReactNode; note: string }) {
  return <div className={`metric-tile tone-${tone}`}>
    <span className="metric-icon" aria-hidden="true">{icon}</span>
    <dt>{label}</dt>
    <dd>{children}</dd>
    <small>{note}</small>
  </div>;
}

function Signed({ value, currency }: { value: number; currency: string }) {
  if (value === 0) return <>No cost difference</>;
  return <><CountUp value={Math.abs(value)} format={v => formatCurrency(v, currency)} /> <span className="metric-suffix">{value < 0 ? 'more' : 'less'}</span></>;
}

export function MetricTiles({ result: r, currency, horizonYears, transitionEnabled, entries }: { result: EngineResult; currency: string; horizonYears: number; transitionEnabled: boolean; entries: number }) {
  const horizonMonths = Math.max(1, horizonYears * 12);
  const reached = r.paybackStatus === 'reached' && r.paybackMonths !== null;
  const payback = reached ? `Month ${r.paybackMonths}` : r.paybackStatus === 'no-investment' ? 'No initial investment' : r.paybackStatus === 'break-even' ? 'Break-even' : `Not reached in ${horizonYears} years`;
  const paybackTone: Tone | 'info' = reached || r.paybackStatus === 'no-investment' ? 'gain' : r.paybackStatus === 'break-even' ? 'even' : 'loss';
  const progress = reached ? Math.min(100, (r.paybackMonths ?? 0) / horizonMonths * 100) : r.paybackStatus === 'no-investment' ? 0 : 100;
  const retired = r.scoredLines.filter(line => line.annualCredit > 0).length + r.scoredAddOns.filter(line => line.annualCredit > 0).length;
  const cumulativeTone = toneOf(r.tcoNetBenefit);
  return <dl className="metric-tiles">
    <Tile tone={toneOf(r.year1NetBenefit)} icon={<CalendarClock />} label="Year-one cash impact" note={transitionEnabled ? 'Includes the one-time cost and entered savings delays.' : 'Immediate savings; no transition cost entered.'}>
      <Signed value={r.year1NetBenefit} currency={currency} />
    </Tile>
    <Tile tone={cumulativeTone} icon={cumulativeTone === 'loss' ? <TrendingUp /> : <TrendingDown />} label={`${horizonYears}-year cumulative impact`} note="Difference between current-state and move-to-E7 TCO.">
      <Signed value={r.tcoNetBenefit} currency={currency} />
    </Tile>
    <Tile tone={paybackTone} icon={<Target />} label="Cash payback" note={r.paybackStatus === 'cost-increase' ? 'This scenario remains a cost increase over the horizon.' : reached ? `Within a ${horizonMonths}-month horizon.` : 'Calculated from the same monthly cash-flow schedule.'}>
      {payback}
      {reached && <span className="payback-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></span>}
    </Tile>
    <Tile tone="info" icon={<Layers3 />} label="Invoices retired" note={retired ? `${formatCurrency(r.totalAnnualSavings, currency)} / year of entered spend retired.` : 'No entered invoice is retired in this scenario.'}>
      {retired} <span className="metric-suffix">of {entries} {entries === 1 ? 'entry' : 'entries'}</span>
    </Tile>
  </dl>;
}
