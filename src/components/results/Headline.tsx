import type { EngineResult } from '@/model/types';
import { formatCurrency, formatPupm } from '@/lib/format';
import { useAssessment } from '@/store/useAssessment';

export function Headline({ result: r, currency }: { result: EngineResult; currency: string }) {
  const s = useAssessment();
  const label = r.netAnnualConservative > 0 ? 'Lower recurring cost' : r.netAnnualConservative < 0 ? 'Higher recurring cost' : 'No recurring cost difference';
  const payback = r.paybackStatus === 'reached' ? `Month ${r.paybackMonths}` : r.paybackStatus === 'no-investment' ? 'No initial investment' : r.paybackStatus === 'break-even' ? 'Break-even' : `Not reached in ${s.assumptions.horizonYears} years`;
  return <>
    <div className="result-comparison">
      <section className="comparison-column"><h2>Stay as entered</h2><p className="money">{formatCurrency(r.currentAnnualTotal, currency)}</p><small>{currency} / year · captured current spend</small><div className="comparison-lines">
        <div><span>Baseline suite</span><strong>{formatCurrency(r.baselineAnnual, currency)}</strong></div><div><span>Microsoft add-ons</span><strong>{formatCurrency(r.addOnAnnualTotal, currency)}</strong></div><div><span>Third-party tools</span><strong>{formatCurrency(r.thirdPartyAnnual, currency)}</strong></div>
      </div></section>
      <section className="comparison-column"><h2>Move to E7</h2><p className="money">{formatCurrency(r.futureAnnualTotal, currency)}</p><small>{currency} / year · steady-state estimate</small><div className="comparison-lines">
        <div><span>E7 licences</span><strong>{formatCurrency(r.e7Annual, currency)}</strong></div><div><span>Retained Microsoft add-ons</span><strong>{formatCurrency(r.addOnAnnualRetained, currency)}</strong></div><div><span>Retained third-party spend</span><strong>{formatCurrency(r.thirdPartyAnnual - r.thirdPartyCreditConservative, currency)}</strong></div>
      </div></section>
    </div>
    <div className="net-strip"><div><strong>{label}</strong><p>{r.netAnnualConservative > 0 ? 'Only eligible retirement assumptions reduce this figure.' : r.netAnnualConservative < 0 ? 'The entered savings do not cover the additional licence cost.' : 'Current and future recurring totals are equal under these inputs.'}</p></div><span className={`money ${r.netAnnualConservative < 0 ? 'negative' : ''}`}>{formatCurrency(Math.abs(r.netAnnualConservative), currency)}<small style={{ fontSize: '.75rem', fontWeight: 400 }}> / year</small></span></div>
    <dl className="outcome-details">
      <div><dt>Year-one cash impact</dt><dd className={r.year1NetBenefit < 0 ? 'negative' : ''}>{r.year1NetBenefit === 0 ? 'No cost difference' : `${formatCurrency(Math.abs(r.year1NetBenefit), currency)} ${r.year1NetBenefit < 0 ? 'more' : 'less'}`}</dd><small>{s.assumptions.transitionEnabled ? 'Includes the one-time cost and entered savings delays.' : 'Immediate savings; no transition cost entered.'}</small></div>
      <div><dt>{s.assumptions.horizonYears}-year cumulative impact</dt><dd>{r.tcoNetBenefit === 0 ? 'No cost difference' : `${formatCurrency(Math.abs(r.tcoNetBenefit), currency)} ${r.tcoNetBenefit < 0 ? 'more' : 'less'}`}</dd><small>Difference between current-state and move-to-E7 TCO.</small></div>
      <div><dt>Cash payback</dt><dd>{payback}</dd><small>{r.paybackStatus === 'cost-increase' ? 'This scenario remains a cost increase over the horizon.' : 'Calculated from the same monthly cash-flow schedule.'}</small></div>
    </dl>
    <details className="disclosure"><summary>Licence price versus savings-offset comparison</summary><div className="detail-copy"><p>The E7 licence amount used is <strong>{formatPupm(r.e7NetPupm, currency)} / user / month</strong>. Subtracting eligible retirement credit across {r.seats.toLocaleString()} seats produces an offset-adjusted comparison of <strong>{formatPupm(r.effectiveNetPupmConservative, currency)} / user / month</strong>.</p><p>This is not Microsoft’s invoice price. A negative offset-adjusted figure is not a refund or a negative licence bill.</p></div></details>
  </>;
}
