import type { EngineResult } from '@/model/types';
import { formatCurrency } from '@/lib/format';
import { useAssessment } from '@/store/useAssessment';

export function TcoChart({ result, currency }: { result: EngineResult; currency: string }) {
  const s = useAssessment();
  const max = Math.max(1, ...result.tco.flatMap(y => [y.currentCost, y.e7Cost]));
  return <section className="section-block">
    <h2>Follow the cash over time</h2>
    <p className="muted" style={{ fontSize: '.83rem' }}>Same recurring inputs, {s.assumptions.transitionEnabled ? 'with your one-time cost and monthly retirement schedule' : 'with immediate eligible savings and no transition costs'}. No inflation or automatic renewal cancellation is assumed.</p>
    <div className="chart-key" aria-hidden="true"><span>Stay as entered</span><span>Move to E7</span></div>
    <div className="cash-chart" aria-hidden="true">{result.tco.map(y => <div className="cash-chart-row" key={y.year}><span>Year {y.year}</span><div className="cash-bars"><div className="cash-bar" style={{ width: `${y.currentCost / max * 100}%` }} /><div className="cash-bar future" style={{ width: `${y.e7Cost / max * 100}%` }} /></div><strong className="numeric">{formatCurrency(y.netBenefit, currency)}</strong></div>)}</div>
    <div className="table-scroll"><table><caption>Annual total cost and cash benefit. Negative benefit means the move costs more. All amounts in {currency}.</caption><thead><tr><th scope="col">Year</th><th scope="col" className="numeric">Stay as entered</th><th scope="col" className="numeric">Move to E7</th><th scope="col" className="numeric">Net benefit</th><th scope="col" className="numeric">Cumulative</th></tr></thead><tbody>{result.tco.map(y => <tr key={y.year}><th scope="row">{y.year}</th><td className="numeric">{formatCurrency(y.currentCost, currency)}</td><td className="numeric">{formatCurrency(y.e7Cost, currency)}</td><td className="numeric">{formatCurrency(y.netBenefit, currency)}</td><td className="numeric">{formatCurrency(y.cumulativeNetBenefit, currency)}</td></tr>)}</tbody></table></div>
    <details className="disclosure"><summary>Cash-flow formula & monthly working</summary><div className="detail-copy"><p>Monthly benefit = eligible vendor retirement + eligible add-on retirement − monthly licence uplift. The one-time transition cost is charged at month zero and included once in year-one TCO. Each line earns savings only after its delay.</p><p className="formula">Recurring annual benefit = {formatCurrency(result.currentAnnualTotal, currency)} − {formatCurrency(result.futureAnnualTotal, currency)} = {formatCurrency(result.recurringAnnualBenefit, currency)}</p></div>
      <div className="table-scroll" style={{ marginTop: 18 }}><table><caption>Monthly cash-flow schedule in {currency}</caption><thead><tr><th scope="col">Month</th><th scope="col" className="numeric">Cash retirement</th><th scope="col" className="numeric">Licence uplift</th><th scope="col" className="numeric">Transition</th><th scope="col" className="numeric">Cumulative</th></tr></thead><tbody>{result.monthlyCashflow.map(m => <tr key={m.month}><th scope="row">{m.month}</th><td className="numeric">{formatCurrency(m.cashSavings, currency, 2)}</td><td className="numeric">{formatCurrency(m.licenceUplift, currency, 2)}</td><td className="numeric">{formatCurrency(m.transitionCost, currency, 2)}</td><td className="numeric">{formatCurrency(m.cumulativeNetBenefit, currency, 2)}</td></tr>)}</tbody></table></div>
    </details>
  </section>;
}
