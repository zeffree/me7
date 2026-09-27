import { BASELINE_SKUS } from '@/data/skus';
import { useAssessment } from '@/store/useAssessment';
import { formatPupm } from '@/lib/format';
import { NumberField, TextField } from '@/components/ui/Fields';
import { SectionHeading } from '@/components/ui/Primitives';
import { StepFooter } from '@/components/layout/AppShell';

export function ProfileStep() {
  const s = useAssessment();
  return <>
    <SectionHeading title="Start with your organization." description="Set the scope of the comparison. All prices and results are in US dollars (USD)." />
    <div className="field-grid">
      <TextField label="Organization or assessment name" value={s.orgName} onChange={s.setOrgName} placeholder="e.g. Contoso · FY27 review" />
      <NumberField label="Seats moving to E7" value={s.seats} onChange={s.setSeats} min={1} max={5_000_000} hint="Use paid seats, not total company headcount." />
    </div>
    <section className="section-block">
      <h2>Which suite do you have today?</h2>
      <fieldset className="baseline-options"><legend className="sr-only">Current baseline suite</legend>
        {BASELINE_SKUS.map(sku => <label key={sku.id} className={`baseline-option ${s.baseline === sku.id ? 'selected' : ''}`}>
          <input type="radio" name="baseline" checked={s.baseline === sku.id} onChange={() => {
            if (s.baseline === sku.id || window.confirm('Change baseline? This updates the reference suite price and capability comparison.')) s.setBaseline(sku.id);
          }} /><span><strong>{sku.name}</strong><small>{sku.id === 'o365e3' ? 'Productivity baseline' : sku.id === 'm365e3' ? 'Productivity, identity & device baseline' : 'Advanced security & compliance baseline'}</small></span>
          <span className="baseline-price">USD {formatPupm(sku.listPricePupm, 'USD')}<br /><small>/ user / month reference</small></span>
        </label>)}
      </fieldset>
    </section>
    <section className="section-block">
      <h2>Use your prices</h2>
      <p className="muted" style={{ marginBottom: 20 }}>Start with the USD references below, or enter your agreed USD prices. Covered invoices are modeled as fully replaced.</p>
      <div className="field-grid">
        <NumberField label="Current suite / user / month" currency={s.currency} value={s.assumptions.baselineUnitPupm} max={100_000} step={0.01}
          onChange={v => s.setAssumptions({ baselineUnitPupm: v, baselinePriceSource: 'customer', pricesConfirmed: false })} />
        <NumberField label="E7 reference or quoted price / user / month" currency={s.currency} value={s.assumptions.e7ListPupm} max={100_000} step={0.01}
          onChange={v => s.setAssumptions({ e7ListPupm: v, e7PriceSource: 'customer', pricesConfirmed: false })} />
        <NumberField label="Discount from the E7 amount above" value={s.assumptions.e7DiscountPct} suffix="%" max={100} step={0.01}
          hint="Leave at zero if the amount is already your net quote." onChange={v => s.setAssumptions({ e7DiscountPct: v, pricesConfirmed: false })} />
      </div>
    </section>
    <StepFooter nextDisabled={s.seats < 1} nextLabel="Capture current spend" />
  </>;
}
