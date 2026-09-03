import { SectionHeading, Card } from '@/components/ui/Primitives';
import { NumberField, SliderField } from '@/components/ui/Fields';
import { StepContainer, StepFooter } from '@/components/layout/AppShell';
import { useAssessment } from '@/store/useAssessment';
import { E7_SKU } from '@/data/skus';
import { formatCurrency, formatPupm } from '@/lib/format';

export function AssumptionsStep() {
  const { assumptions, currency, seats, setAssumptions } = useAssessment();
  const netPupm = assumptions.e7ListPupm * (1 - assumptions.e7DiscountPct / 100);

  return (
    <StepContainer>
      <SectionHeading
        eyebrow="Step 5"
        title="Assumptions you can argue with"
        description="Every lever behind the result is here and editable. There are no confidence factors or year-one haircuts quietly discounting your numbers — what you enter is what gets counted, and the only thing that reduces a vendor's credit is the share you told us you'll retain."
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-base font-bold">Your E7 deal</h2>
          <p className="mt-1 text-sm text-secondary">
            {E7_SKU.name} lists at {formatPupm(E7_SKU.listPricePupm, currency)} per user per month.
            Enterprise agreements rarely pay list.
          </p>
          <div className="mt-5 space-y-5">
            <NumberField
              label="E7 list price / user / month"
              value={assumptions.e7ListPupm}
              onChange={(e7ListPupm) => setAssumptions({ e7ListPupm })}
              currency={currency}
              step={1}
            />
            <SliderField
              label="Negotiated discount off list"
              value={assumptions.e7DiscountPct}
              onChange={(e7DiscountPct) => setAssumptions({ e7DiscountPct })}
              min={0}
              max={40}
              format={(v) => `${v}%`}
              hint="Volume and term drive this. 10–20% is common at enterprise scale."
            />
            <div className="rounded-xl border border-subtle bg-[var(--surface-sunken)] p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">
                  Your E7 price
                </span>
                <span className="numeral text-xl font-extrabold">
                  {formatPupm(netPupm, currency)}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between border-t border-subtle pt-2">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">
                  Annual for {seats.toLocaleString()} seats
                </span>
                <span className="numeral text-sm font-bold">
                  {formatCurrency(netPupm * seats * 12, currency)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-bold">How far out to model</h2>
          <p className="mt-1 text-sm text-secondary">
            The total-cost comparison runs over this many years. Three matches a typical enterprise
            agreement term.
          </p>
          <div className="mt-5 space-y-5">
            <NumberField
              label="Analysis horizon (years)"
              value={assumptions.horizonYears}
              onChange={(horizonYears) => setAssumptions({ horizonYears })}
              min={1}
              max={5}
              suffix="yrs"
            />
            <div className="rounded-xl border border-subtle bg-[var(--surface-sunken)] p-4 text-sm leading-relaxed text-secondary">
              <p className="font-semibold text-[var(--text-primary)]">
                How a vendor line is credited
              </p>
              <p className="mt-2">
                Credit is simply the annual spend you entered, less the share you said you would
                keep. Nothing else scales it down.
              </p>
              <p className="mt-2">
                Categories E7 does not cover are credited at zero, whatever you enter against them —
                those stay visible in the exclusions panel on the results page.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <StepFooter nextLabel="See the results" />
    </StepContainer>
  );
}
