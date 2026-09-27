import type { EngineResult } from '@/model/types';
import { useAssessment } from '@/store/useAssessment';
import { getBaseline } from '@/data/skus';
import { formatCurrency, formatPupm } from '@/lib/format';
import { Layers3, ListTree } from 'lucide-react';
import { Button } from '@/components/ui/Primitives';
import { DomainSymbol } from '@/components/ui/DomainSymbol';
import { isKnownAddOn, recoveredInvoices } from '@/components/catalog/inventory';
import { hasAmount } from '@/components/catalog/SpendEditor';

type Status = 'retired' | 'kept' | 'unknown';
const STATUS_LABEL: Record<Status, string> = { retired: 'Retired', kept: 'Stays paid', unknown: 'Amount unknown' };
const Pill = ({ status }: { status: Status }) => <span className={`status-pill pill-${status}`}>{STATUS_LABEL[status]}</span>;
const statusOf = (known: boolean, credit: number): Status => !known ? 'unknown' : credit > 0 ? 'retired' : 'kept';

export function LineDetail({ result: r, currency }: { result: EngineResult; currency: string }) {
  const s = useAssessment();
  const baseline = getBaseline(s.baseline);
  const recoveredThirdParty = recoveredInvoices(s).filter(invoice => invoice.kind === 'third-party');
  const entries = s.lines.length + s.addOns.length;
  return <section className="section-block trace-section">
    <div className="bc-heading"><span className="bc-icon" data-tone="trace" aria-hidden="true"><ListTree /></span><div>
      <h2>Trace the comparison</h2>
      <p>Current cost counts captured amounts. Eligible invoices are fully replaced in the scenario. Every other entered cost remains in future spend.</p>
    </div></div>
    <details className="disclosure print-expand"><summary>Invoice-level working · {entries} {entries === 1 ? 'entry' : 'entries'} · {formatCurrency(r.totalAnnualSavings, currency)} retired / year</summary>
      <div className="table-scroll"><table><caption>Known annual amounts and eligible steady-state retirement credit, {currency}. Unknown amounts are not included in totals and are not zero.</caption><thead><tr><th scope="col">Input</th><th scope="col" className="numeric">Current / year</th><th scope="col" className="numeric">Retirement credit</th><th scope="col" className="numeric">Retained / year</th></tr></thead><tbody>
        {r.scoredLines.map((item, index) => <tr key={`${item.line.categoryId}:${index}`}><td><span className="trace-name"><DomainSymbol domain={item.category.domain} /><span className="print-only">{item.line.vendor || item.category.name}</span><Button variant="ghost" size="sm" onClick={() => s.setStep('catalog')}>{item.line.vendor || item.category.name}</Button><Pill status={statusOf(hasAmount(item.line), item.annualCredit)} /></span><small>{item.category.name}</small><small>{item.coverage === 'not-covered' ? 'Retained spend' : item.eligible ? 'Full replacement assumed' : item.exclusionReason || 'Not included in retirement savings'}{item.coverage === 'already' ? ' · Potential saving also available in baseline' : ''}</small></td><td className="numeric">{hasAmount(item.line) ? formatCurrency(item.annualSpend, currency) : 'Unknown'}</td><td className="numeric">{formatCurrency(item.annualCredit, currency)}</td><td className="numeric">{hasAmount(item.line) ? formatCurrency(item.annualSpend - item.annualCredit, currency) : 'Unknown'}</td></tr>)}
        {recoveredThirdParty.map((item, index) => <tr key={`recovered:${item.id}:${index}`}><td><span className="trace-name"><span className="print-only">{item.name}</span><Button variant="ghost" size="sm" onClick={() => s.setStep('assumptions')}>{item.name}</Button><Pill status={item.annual === undefined ? 'unknown' : 'kept'} /></span><small>Recovered identifier: {item.id} · outside catalog, fully retained. Review to remove or replace.</small></td><td className="numeric">{item.annual === undefined ? 'Unknown' : formatCurrency(item.annual, currency)}</td><td className="numeric">{formatCurrency(0, currency)}</td><td className="numeric">{item.annual === undefined ? 'Unknown' : formatCurrency(item.annual, currency)}</td></tr>)}
        {r.scoredAddOns.map((item, index) => <tr key={`${item.addOnId}:${index}`}><td><span className="trace-name"><span className="domain-symbol" data-seg="addon" aria-hidden="true"><Layers3 /></span><span className="print-only">{item.name}</span><Button variant="ghost" size="sm" onClick={() => s.setStep(isKnownAddOn(item.addOnId) ? 'addons' : 'assumptions')}>{item.name}</Button><Pill status={statusOf(hasAmount(item.line), item.annualCredit)} /></span><small>Microsoft add-on · {item.eligible ? 'Full replacement assumed' : item.exclusionReason || 'Retained spend'}</small></td><td className="numeric">{hasAmount(item.line) ? formatCurrency(item.annualSpend, currency) : 'Unknown'}</td><td className="numeric">{formatCurrency(item.annualCredit, currency)}</td><td className="numeric">{hasAmount(item.line) ? formatCurrency(item.annualSpend - item.annualCredit, currency) : 'Unknown'}</td></tr>)}
        {!s.lines.length && !s.addOns.length && <tr><td colSpan={4}>No third-party or add-on invoices entered. This does not establish that you have none.</td></tr>}
        <tr><th scope="row">Total entered invoices</th><td className="numeric">{formatCurrency(r.thirdPartyAnnual + r.addOnAnnualTotal, currency)}</td><td className="numeric">{formatCurrency(r.totalAnnualSavings, currency)}</td><td className="numeric">{formatCurrency(r.thirdPartyAnnual + r.addOnAnnualTotal - r.totalAnnualSavings, currency)}</td></tr>
      </tbody></table></div>
    </details>
    <details className="disclosure print-expand"><summary>Licence calculations & attribution</summary><div className="detail-copy">
      <p className="formula">Current suite: {s.seats.toLocaleString()} × {formatPupm(s.assumptions.baselineUnitPupm, currency)} × 12 = {formatCurrency(r.baselineAnnual, currency)} / year.</p>
      <p className="formula">E7: {s.seats.toLocaleString()} × {formatPupm(s.assumptions.e7ListPupm, currency)} × (1 − {s.assumptions.e7DiscountPct}%) × 12 = {formatCurrency(r.e7Annual, currency)} / year.</p>
      <p>Eligible retirement = the full annual input. No retained percentage or confidence multiplier applies. Missing amounts, not-covered items and unresolved duplicate allocations earn no retirement credit.</p>
      <p><strong>{formatCurrency(r.buckets.find(b => b.bucket === 'already-redundant')?.conservativeCredit ?? 0, currency)}</strong> of eligible vendor retirement has potential overlap with {baseline.name} today. Do not attribute that portion solely to moving to E7. This comparison is “stay as entered,” not an optimized baseline alternative.</p>
    </div></details>
  </section>;
}
