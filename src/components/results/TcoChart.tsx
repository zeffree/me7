import { useId, type CSSProperties } from 'react';
import { ChartSpline, MapPin } from 'lucide-react';
import type { EngineResult } from '@/model/types';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';
import { useSeen } from '@/lib/motion';
import { useAssessment } from '@/store/useAssessment';
import { toneOf } from './tone';

const W = 1000;
const H = 300;

export function curveGeometry(result: EngineResult) {
  const months = result.monthlyCashflow.length ? result.monthlyCashflow : [{ month: 0, cumulativeNetBenefit: 0 }];
  const last = months[months.length - 1].month || 1;
  const values = months.map(m => m.cumulativeNetBenefit);
  let lo = Math.min(0, ...values);
  let hi = Math.max(0, ...values);
  if (hi - lo < 1) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.14;
  hi += pad; lo -= pad;
  const x = (month: number) => month / last * W;
  const y = (value: number) => (hi - value) / (hi - lo) * H;
  const points = months.map(m => [x(m.month), y(m.cumulativeNetBenefit)] as const);
  const line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const zeroY = y(0);
  const area = `${line} L${W},${zeroY.toFixed(1)} L0,${zeroY.toFixed(1)} Z`;
  const lowest = months.reduce((min, m) => m.cumulativeNetBenefit < min.cumulativeNetBenefit ? m : min, months[0]);
  return { months, last, x, y, line, area, zeroY, lowest, end: months[months.length - 1] };
}

type Pos = CSSProperties & { '--x': string; '--y': string };
const at = (x: number, y: number): Pos => ({ '--x': `${x / W * 100}%`, '--y': `${y / H * 100}%` });

export function TcoChart({ result, currency }: { result: EngineResult; currency: string }) {
  const s = useAssessment();
  const [ref, seen] = useSeen<HTMLDivElement>();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const g = curveGeometry(result);
  const money = (value: number) => formatCurrency(value, currency);
  const reached = result.paybackStatus === 'reached' && result.paybackMonths !== null;
  const endTone = toneOf(g.end.cumulativeNetBenefit);
  const years = Math.max(1, Math.round(g.last / 12));
  const summary = `Cumulative cash position against staying as entered: ${money(g.months[0].cumulativeNetBenefit)} at the start, ${money(g.end.cumulativeNetBenefit)} after ${years} ${years === 1 ? 'year' : 'years'}.${reached ? ` Payback in month ${result.paybackMonths}.` : ''}`;
  return <section className="section-block cash-section" aria-labelledby="cash-over-time">
    <div className="bc-heading"><span className="bc-icon" data-tone="cash" aria-hidden="true"><ChartSpline /></span><div>
      <h2 id="cash-over-time">Follow the cash over time</h2>
      <p>{s.assumptions.transitionEnabled ? 'With your one-time cost and monthly retirement schedule.' : 'With immediate eligible savings and no transition costs.'} No inflation or automatic renewal cancellation is assumed.</p>
    </div></div>
    <figure className="cash-curve-figure">
      <div ref={ref} className={`cash-curve ${seen ? 'is-seen' : ''}`} role="img" aria-label={summary}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <clipPath id={`${id}-above`}><rect x="0" y="0" width={W} height={Math.max(0, g.zeroY)} /></clipPath>
            <clipPath id={`${id}-below`}><rect x="0" y={g.zeroY} width={W} height={Math.max(0, H - g.zeroY)} /></clipPath>
          </defs>
          {Array.from({ length: Math.max(0, years - 1) }, (_, i) => <line key={i} className="curve-grid" x1={g.x((i + 1) * 12)} x2={g.x((i + 1) * 12)} y1="0" y2={H} />)}
          <path className="curve-area gain" d={g.area} clipPath={`url(#${id}-above)`} />
          <path className="curve-area loss" d={g.area} clipPath={`url(#${id}-below)`} />
          <line className="curve-zero" x1="0" x2={W} y1={g.zeroY} y2={g.zeroY} />
          <path className="curve-line gain" d={g.line} clipPath={`url(#${id}-above)`} />
          <path className="curve-line loss" d={g.line} clipPath={`url(#${id}-below)`} />
        </svg>
        <span className="curve-label" style={at(W, g.zeroY)} aria-hidden="true">Break-even</span>
        {g.lowest.cumulativeNetBenefit < 0 && g.lowest.month < g.last && <span className="curve-dot low" style={at(g.x(g.lowest.month), g.y(g.lowest.cumulativeNetBenefit))} aria-hidden="true"><span>Lowest {formatCompactCurrency(g.lowest.cumulativeNetBenefit, currency)}</span></span>}
        {reached && <span className="curve-pin" style={at(g.x(result.paybackMonths ?? 0), g.zeroY)} aria-hidden="true"><span><MapPin />Paid back · month {result.paybackMonths}</span></span>}
        <span className={`curve-dot end tone-${endTone}`} style={at(W, g.y(g.end.cumulativeNetBenefit))} aria-hidden="true"><span>{formatCompactCurrency(g.end.cumulativeNetBenefit, currency)}</span></span>
      </div>
      <div className="curve-axis" aria-hidden="true">{Array.from({ length: years }, (_, i) => <span key={i} style={{ left: `${g.x((i + 1) * 12) / W * 100}%` }}>Year {i + 1}</span>)}</div>
      <figcaption className="curve-key"><span className="key-gain">Ahead of staying as entered</span><span className="key-loss">Behind staying as entered</span></figcaption>
    </figure>
    <ul className="year-chips" aria-label="Net benefit by year">
      {result.tco.map(y => <li key={y.year} className={`tone-${toneOf(y.netBenefit)}`}><small>Year {y.year}</small><strong>{y.netBenefit === 0 ? 'No difference' : `${money(Math.abs(y.netBenefit))} ${y.netBenefit < 0 ? 'more' : 'less'}`}</strong><small>Cumulative {money(y.cumulativeNetBenefit)}</small></li>)}
    </ul>
    <details className="disclosure print-expand"><summary>Year-by-year totals</summary>
      <div className="table-scroll"><table><caption>Annual total cost and cash benefit. Negative benefit means the move costs more. All amounts in {currency}.</caption><thead><tr><th scope="col">Year</th><th scope="col" className="numeric">Stay as entered</th><th scope="col" className="numeric">Move to E7</th><th scope="col" className="numeric">Net benefit</th><th scope="col" className="numeric">Cumulative</th></tr></thead><tbody>{result.tco.map(y => <tr key={y.year}><th scope="row">{y.year}</th><td className="numeric">{money(y.currentCost)}</td><td className="numeric">{money(y.e7Cost)}</td><td className="numeric">{money(y.netBenefit)}</td><td className="numeric">{money(y.cumulativeNetBenefit)}</td></tr>)}</tbody></table></div>
    </details>
    <details className="disclosure"><summary>Cash-flow formula & monthly working</summary><div className="detail-copy"><p>Monthly benefit = eligible vendor retirement + eligible add-on retirement − monthly licence uplift. The one-time transition cost is charged at month zero and included once in year-one TCO. Each line earns savings only after its delay.</p><p className="formula">Recurring annual benefit = {money(result.currentAnnualTotal)} − {money(result.futureAnnualTotal)} = {money(result.recurringAnnualBenefit)}</p></div>
      <div className="table-scroll" style={{ marginTop: 18 }}><table><caption>Monthly cash-flow schedule in {currency}</caption><thead><tr><th scope="col">Month</th><th scope="col" className="numeric">Cash retirement</th><th scope="col" className="numeric">Licence uplift</th><th scope="col" className="numeric">Transition</th><th scope="col" className="numeric">Cumulative</th></tr></thead><tbody>{result.monthlyCashflow.map(m => <tr key={m.month}><th scope="row">{m.month}</th><td className="numeric">{formatCurrency(m.cashSavings, currency, 2)}</td><td className="numeric">{formatCurrency(m.licenceUplift, currency, 2)}</td><td className="numeric">{formatCurrency(m.transitionCost, currency, 2)}</td><td className="numeric">{formatCurrency(m.cumulativeNetBenefit, currency, 2)}</td></tr>)}</tbody></table></div>
    </details>
  </section>;
}
