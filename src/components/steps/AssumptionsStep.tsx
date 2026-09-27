import { CATEGORIES } from '@/data/categories';
import { MS_ADD_ONS } from '@/data/msAddOns';
import { useAssessment, toAssessment } from '@/store/useAssessment';
import { computeAssessment } from '@/model/engine';
import { formatCurrency } from '@/lib/format';
import { Button, Note, SectionHeading } from '@/components/ui/Primitives';
import { NumberField, Toggle } from '@/components/ui/Fields';
import { StepFooter } from '@/components/layout/AppShell';
import { hasAmount } from '@/components/catalog/SpendEditor';
import { answeredCategoryCount, isKnownCategory, isKnownAddOn } from '@/components/catalog/inventory';
import { RecoveredInvoices } from '@/components/catalog/RecoveredInvoices';

export function AssumptionsStep() {
  const s = useAssessment();
  const result = computeAssessment(toAssessment(s));
  const answered = answeredCategoryCount(s.lines, s.dismissed);
  const unknown = [...s.lines, ...s.addOns].filter(l => !hasAmount(l)).length;
  const excluded = result.scoredLines.filter(l => !l.eligible && l.coverage !== 'not-covered').length
    + result.scoredAddOns.filter(l => !l.eligible && MS_ADD_ONS.find(item => item.id === l.addOnId)?.absorbedByE7).length;
  const currentHasExtras = s.lines.some(line => isKnownCategory(line.categoryId)) || s.addOns.some(line => isKnownAddOn(line.addOnId));
  return <>
    <SectionHeading title="Review before you rely on it." description="A partial assessment can still be useful. Keep missing inputs and customer assumptions explicit, then choose a simple run-rate or a timed cash-flow model." />
    <ul className="review-list">
      <li><span><strong>Suite prices · USD</strong><small>Uses your entered prices or the starting USD references. No currency conversion or extra confirmation step.</small></span><Button variant="ghost" size="sm" onClick={() => s.setStep('profile')}>Review prices</Button></li>
      <li><span><strong>{answered} of {CATEGORIES.length} spend categories answered</strong><small>{CATEGORIES.length - answered} unreviewed · {s.dismissed.length} no purchase · {unknown} entered lines without an amount.</small></span><Button variant="ghost" size="sm" onClick={() => s.setStep('catalog')}>Review spend</Button></li>
      <li><span><strong>{s.addOns.length} Microsoft add-on invoice lines</strong><small>{s.addOnsReviewed ? 'Add-on inventory explicitly reviewed.' : 'Add-on review is not complete; results will say so.'}</small></span><Button variant="ghost" size="sm" onClick={() => s.setStep('addons')}>Review add-ons</Button></li>
      <li><span><strong>Full replacement scenario</strong><small>Covered invoices are retired in full. Not-covered services remain. {excluded > 0 ? `${excluded} candidate entries need an amount or an overlap resolved before savings can count.` : 'All entered retirement candidates with usable amounts are included.'}</small></span><Button variant="ghost" size="sm" onClick={() => s.setStep('catalog')}>Inspect entries</Button></li>
    </ul>
    <RecoveredInvoices />
    <section className="section-block">
      <h2>Cash-flow settings</h2>
      <div className="field-grid" style={{ marginTop: 22 }}>
        <NumberField label="Comparison horizon" value={s.assumptions.horizonYears} onChange={v => s.setAssumptions({ horizonYears: v })} min={1} max={50} suffix="years" />
      </div>
      <Toggle checked={s.assumptions.transitionEnabled === true} onChange={v => s.setAssumptions({ transitionEnabled: v })}
        label="Add transition costs and savings timing"
        description="Optional. Simple mode starts all eligible savings in month one and assumes no transition cost. The steady-state comparison is unchanged." />
      {s.assumptions.transitionEnabled ? <div className="stack" style={{ marginTop: 18 }}>
        <NumberField label="One-time transition cost" value={s.assumptions.transitionCost ?? 0} currency={s.currency} step={0.01} onChange={v => s.setAssumptions({ transitionCost: v })}
          hint="Implementation, migration and other incremental one-time costs. Charged once at the start, not once per year." />
        <Note>Enter whole months before savings begin. <strong>0 = month 1; 6 = month 7.</strong> A delay outside the horizon earns no credit within that horizon. Legacy renewal notes do not set timing.</Note>
        <div>{s.lines.filter(line => isKnownCategory(line.categoryId)).map(line => <div className="timing-row" key={line.categoryId}><span><strong>{line.vendor || CATEGORIES.find(c => c.id === line.categoryId)?.name}</strong><small>Third-party invoice · applies only to eligible credit</small></span><NumberField label="Delay in months" value={line.savingsDelayMonths ?? 0} max={600} onChange={v => s.upsertLine({ ...line, savingsDelayMonths: v })} /></div>)}
          {s.addOns.filter(line => isKnownAddOn(line.addOnId)).map(line => <div className="timing-row" key={line.addOnId}><span><strong>{MS_ADD_ONS.find(a => a.id === line.addOnId)?.name}</strong><small>Microsoft add-on · confirm cancellation terms</small></span><NumberField label="Delay in months" value={line.savingsDelayMonths ?? 0} max={600} onChange={v => s.upsertAddOn({ ...line, savingsDelayMonths: v })} /></div>)}
          {!currentHasExtras && <p className="muted">Add a catalog invoice to set its retirement timing.</p>}
        </div>
      </div> : <Note>Simple mode: eligible savings begin immediately; one-time costs are zero. This is a run-rate scenario, not a promise that contracts can end immediately.</Note>}
    </section>
    <section className="section-block">
      <h2>What the estimate includes</h2>
      <p className="detail-copy">Your current annual spend of <strong>{formatCurrency(result.currentAnnualTotal, s.currency)}</strong> includes the baseline and entered invoices. Eligible retirement credit equals the full annual invoice. No retained percentage or confidence multiplier applies. Missing amounts, not-covered services and unresolved duplicate allocations do not create savings. Cost avoidance and TEI benefits stay outside cash totals.</p>
    </section>
    <StepFooter nextLabel="View provisional business case" />
  </>;
}
