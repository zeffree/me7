import { Check, Info } from 'lucide-react';
import { BASELINE_SKUS, PACKAGING_UPDATE, PRICING_AS_OF, type BaselineSkuId } from '@/data/skus';
import { SectionHeading } from '@/components/ui/Primitives';
import { NumberField, SelectField, TextField } from '@/components/ui/Fields';
import { StepContainer, StepFooter } from '@/components/layout/AppShell';
import { ImportButton } from '@/components/ui/ImportButton';
import { useAssessment } from '@/store/useAssessment';
import { CURRENCIES, cx, formatCurrency } from '@/lib/format';

export function ProfileStep() {
  const {
    orgName,
    seats,
    currency,
    baseline,
    assumptions,
    setOrgName,
    setSeats,
    setCurrency,
    setBaseline,
    setAssumptions,
  } = useAssessment();

  const annualBaseline = seats * assumptions.baselineUnitPupm * 12;

  return (
    <StepContainer>
      <SectionHeading
        eyebrow="Step 1"
        title="Where are you today?"
        description="Your current suite decides everything downstream. A capability that is a brand-new benefit for an Office 365 E3 customer may be something an E5 customer already owns — and is quietly paying a second vendor for."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <TextField
          label="Organisation"
          value={orgName}
          onChange={setOrgName}
          placeholder="Contoso Ltd"
        />
        <NumberField
          label="Licensed seats"
          value={seats}
          onChange={setSeats}
          min={1}
          step={50}
          hint="The number of users on your main Microsoft suite."
        />
        <SelectField
          label="Currency"
          value={currency}
          onChange={setCurrency}
          options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` }))}
          hint="Display only. Enter every figure in this currency; no conversion is applied."
        />
      </div>

      <h2 className="mt-10 text-lg font-bold">Which suite are you on today?</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {BASELINE_SKUS.map((sku) => (
          <SkuCard
            key={sku.id}
            id={sku.id}
            selected={baseline === sku.id}
            onSelect={() => setBaseline(sku.id)}
          />
        ))}
      </div>

      <div className="mt-4 flex gap-3 rounded-xl border border-brand-500/30 bg-brand-500/[0.07] p-4">
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300"
          aria-hidden
        />
        <div className="text-sm leading-relaxed text-secondary">
          <p>
            <span className="font-bold text-brand-700 dark:text-brand-300">
              {PACKAGING_UPDATE.label}:
            </span>{' '}
            {PACKAGING_UPDATE.summary}
          </p>
          <p className="mt-2 text-xs text-muted">{PACKAGING_UPDATE.impact}</p>
        </div>
      </div>

      <div className="surface-raised mt-8 rounded-2xl border p-6">
        <h2 className="text-base font-bold">What do you actually pay?</h2>
        <p className="mt-1.5 text-sm text-secondary">
          Prefilled with {PRICING_AS_OF} list price. Enterprise Agreement and CSP deals typically
          land 10–20% below list, so override this with your real number for a credible result.
        </p>
        <div className="mt-4 grid items-end gap-4 sm:grid-cols-2">
          <NumberField
            label="Your price per user / month"
            value={assumptions.baselineUnitPupm}
            onChange={(baselineUnitPupm) => setAssumptions({ baselineUnitPupm })}
            currency={currency}
            step={0.5}
          />
          <div className="rounded-xl border border-subtle bg-[var(--surface-sunken)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Current suite spend
            </p>
            <p className="numeral mt-1 text-2xl font-extrabold">
              {formatCurrency(annualBaseline, currency)}
              <span className="ml-1.5 text-sm font-medium text-muted">/ year</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-subtle bg-[var(--surface-sunken)] px-5 py-4">
        <div className="min-w-[16rem] flex-1">
          <h2 className="text-sm font-bold">Picking up where you left off?</h2>
          <p className="mt-1 text-sm text-secondary">
            Load a JSON file you exported earlier to restore every figure and assumption. It is read
            in this browser only.
          </p>
        </div>
        <ImportButton />
      </div>

      <StepFooter nextLabel="Start the quick scan" nextDisabled={seats <= 0} />
    </StepContainer>
  );
}

function SkuCard({
  id,
  selected,
  onSelect,
}: {
  id: BaselineSkuId;
  selected: boolean;
  onSelect: () => void;
}) {
  const sku = BASELINE_SKUS.find((s) => s.id === id)!;
  const { currency } = useAssessment();

  // The selected card is the one the user is reasoning about, so it shows the full
  // composition. Collapsed cards stay scannable but must never hide content silently —
  // the July 2026 additions pushed real entitlements past the old fixed truncation.
  const shownIncludes = selected ? sku.includes : sku.includes.slice(0, 4);
  const shownExcludes = selected ? sku.notIncluded : sku.notIncluded.slice(0, 3);
  const moreIncludes = sku.includes.length - shownIncludes.length;
  const moreExcludes = sku.notIncluded.length - shownExcludes.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(
        'surface-raised flex h-full flex-col rounded-2xl border p-5 text-left transition-all',
        selected
          ? 'border-brand-600 ring-2 ring-brand-500/40'
          : 'hover:border-brand-400/60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold">{sku.name}</p>
          <p className="numeral mt-0.5 text-2xl font-extrabold text-brand-500 dark:text-brand-300">
            {formatCurrency(sku.listPricePupm, currency)}
            <span className="ml-1 text-xs font-medium text-muted">/user/mo list</span>
          </p>
        </div>
        {selected && (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
            <Check className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-secondary">{sku.tagline}</p>

      <div className="mt-4 border-t border-subtle pt-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Includes</p>
        <ul className="mt-1.5 space-y-1">
          {shownIncludes.map((i) => (
            <li key={i} className="flex gap-1.5 text-xs text-secondary">
              <span aria-hidden className="text-accent-500">
                ✓
              </span>
              {i}
            </li>
          ))}
        </ul>
        {moreIncludes > 0 && (
          <p className="mt-1.5 pl-[18px] text-xs font-medium text-muted">
            +{moreIncludes} more — select to see all
          </p>
        )}
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Does not include</p>
        <ul className="mt-1.5 space-y-1">
          {shownExcludes.map((i) => (
            <li key={i} className="flex gap-1.5 text-xs text-muted">
              <span aria-hidden>·</span>
              {i}
            </li>
          ))}
        </ul>
        {moreExcludes > 0 && (
          <p className="mt-1.5 pl-[18px] text-xs font-medium text-muted">
            +{moreExcludes} more — select to see all
          </p>
        )}
      </div>
    </button>
  );
}
