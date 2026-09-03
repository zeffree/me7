import { memo, useMemo } from 'react';
import { Check, TriangleAlert, X } from 'lucide-react';
import { addOnsForBaseline, type MsAddOn } from '@/data/msAddOns';
import { SectionHeading, Badge, Card } from '@/components/ui/Primitives';
import { NumberField, Segmented } from '@/components/ui/Fields';
import { StepContainer, StepFooter } from '@/components/layout/AppShell';
import { useAssessment } from '@/store/useAssessment';
import { cx, formatCurrency } from '@/lib/format';

export function AddOnsStep() {
  const baseline = useAssessment((s) => s.baseline);
  const seats = useAssessment((s) => s.seats);
  const currency = useAssessment((s) => s.currency);
  const addOns = useAssessment((s) => s.addOns);

  // Memoised so the `relevant` prop keeps a stable identity — otherwise every render
  // hands AddOnRow a new array and defeats its memo().
  const relevant = useMemo(() => addOnsForBaseline(baseline), [baseline]);
  const absorbed = useMemo(() => relevant.filter((a) => a.absorbedByE7), [relevant]);
  const retained = useMemo(() => relevant.filter((a) => !a.absorbedByE7), [relevant]);

  const absorbedTotal = addOns
    .filter((l) => absorbed.some((a) => a.id === l.addOnId))
    .reduce((acc, l) => acc + annual(l.mode, l.annual, l.pupm, l.seats ?? seats), 0);

  return (
    <StepContainer>
      <SectionHeading
        eyebrow="Step 4"
        title="Microsoft add-ons you buy today"
        description="These are Microsoft SKUs sitting on top of your suite. Most are folded straight into E7 and simply stop being a line item — that is the cleanest, least arguable saving in the whole model."
      />

      <div className="surface-raised mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5">
        <div>
          <p className="text-sm font-semibold">Add-on spend E7 absorbs</p>
          <p className="mt-0.5 text-xs text-secondary">
            Cancelled the day you move — no migration project required.
          </p>
        </div>
        <p className="numeral text-2xl font-extrabold text-accent-700 dark:text-accent-300">
          {formatCurrency(absorbedTotal, currency)}
          <span className="ml-1.5 text-sm font-medium text-muted">/ year</span>
        </p>
      </div>

      <h2 className="mt-10 flex items-center gap-2 text-lg font-bold">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-500/15 text-accent-700 dark:text-accent-300">
          <Check className="h-3.5 w-3.5" aria-hidden />
        </span>
        Absorbed by E7
      </h2>
      <p className="mt-1.5 text-sm text-secondary">
        Only add-ons that make sense alongside your current suite are listed — there is no point
        asking an E5 customer whether they buy Entra ID P2.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {absorbed.map((a) => (
          <AddOnRow key={a.id} addOn={a} relevant={relevant} />
        ))}
      </div>

      <h2 className="mt-10 flex items-center gap-2 text-lg font-bold">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-500/15 text-rose-500">
          <X className="h-3.5 w-3.5" aria-hidden />
        </span>
        Not absorbed — this spend continues
      </h2>
      <p className="mt-1.5 text-sm text-secondary">
        Capture these so the future-state total is honest. No saving is claimed against any of them.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {retained.map((a) => (
          <AddOnRow key={a.id} addOn={a} relevant={relevant} />
        ))}
      </div>

      <StepFooter nextLabel="Review assumptions" />
    </StepContainer>
  );
}

/**
 * Declared at module scope on purpose. This used to live inside AddOnsStep, which gave it a
 * fresh function identity on every render — React treated each render as a different component
 * type, unmounted the whole subtree and rebuilt it. One keystroke destroyed the input you were
 * typing into, threw focus back to <body> and lost your place on the page.
 */
const AddOnRow = memo(function AddOnRow({
  addOn,
  relevant,
}: {
  addOn: MsAddOn;
  relevant: MsAddOn[];
}) {
  const seats = useAssessment((s) => s.seats);
  const currency = useAssessment((s) => s.currency);
  const upsertAddOn = useAssessment((s) => s.upsertAddOn);
  const removeAddOn = useAssessment((s) => s.removeAddOn);
  // `.find` returns the existing element reference, so this stays referentially stable
  // until this specific line actually changes.
  const line = useAssessment((s) => s.addOns.find((l) => l.addOnId === addOn.id));
  const suiteAlsoSelected = useAssessment((s) =>
    addOn.supersededBy ? s.addOns.some((l) => l.addOnId === addOn.supersededBy) : false,
  );

  const isOn = Boolean(line);

  // Microsoft folded these standalone SKUs into the Defender/Purview suites. Counting the
  // suite and its constituents both as cancellable spend inflates the saving, so say so
  // at the point the user is making the mistake rather than burying it in a footnote.
  const supersedingSuite = addOn.supersededBy
    ? relevant.find((a) => a.id === addOn.supersededBy)
    : undefined;
  const conflictsWithSuite = isOn && Boolean(supersedingSuite) && suiteAlsoSelected;

  return (
    <Card
      className={cx(
        'p-4 transition-colors',
        isOn && (addOn.absorbedByE7 ? 'ring-1 ring-accent-500/40' : 'ring-1 ring-rose-500/30'),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold">{addOn.name}</p>
            {addOn.absorbedByE7 ? (
              <Badge tone="positive">Absorbed</Badge>
            ) : (
              <Badge tone="danger">Stays</Badge>
            )}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-secondary">{addOn.description}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            isOn
              ? removeAddOn(addOn.id)
              : upsertAddOn({
                  addOnId: addOn.id,
                  mode: addOn.listPricePupm > 0 ? 'pupm' : 'annual',
                  pupm: addOn.listPricePupm,
                  annual: 0,
                  seats,
                })
          }
          aria-pressed={isOn}
          className={cx(
            'min-h-10 shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-colors',
            isOn
              ? 'border border-subtle text-secondary hover:text-[var(--text-primary)]'
              : 'bg-brand-600 text-white hover:bg-brand-500',
          )}
        >
          {isOn ? 'Remove' : 'We buy this'}
        </button>
      </div>

      {addOn.note && (
        <p className="mt-2 flex gap-1.5 text-[11px] leading-relaxed text-muted">
          <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          {addOn.note}
        </p>
      )}

      {conflictsWithSuite && (
        <p
          role="alert"
          className="mt-2 flex gap-1.5 rounded-lg bg-amber-500/10 p-2 text-[11px] font-semibold leading-relaxed text-amber-600 dark:text-amber-400"
        >
          <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>
            You have also selected {supersedingSuite?.name}, which now includes this. Counting both
            double-counts the saving — keep whichever line actually appears on your bill.
          </span>
        </p>
      )}

      {line && (
        <div className="mt-3 space-y-3 border-t border-subtle pt-3">
          <Segmented
            size="sm"
            ariaLabel={`${addOn.name} pricing mode`}
            value={line.mode}
            onChange={(mode) => upsertAddOn({ ...line, mode })}
            options={[
              { value: 'pupm', label: 'Per user / month' },
              { value: 'annual', label: 'Annual total' },
            ]}
          />
          {line.mode === 'pupm' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Price / user / month"
                value={line.pupm ?? 0}
                onChange={(pupm) => upsertAddOn({ ...line, pupm })}
                currency={currency}
                step={0.5}
              />
              <NumberField
                label="Licensed seats"
                value={line.seats ?? seats}
                onChange={(v) => upsertAddOn({ ...line, seats: v })}
              />
            </div>
          ) : (
            <NumberField
              label="Annual total"
              value={line.annual ?? 0}
              onChange={(v) => upsertAddOn({ ...line, annual: v })}
              currency={currency}
              step={1000}
            />
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Annual</span>
            <span className="numeral text-sm font-bold">
              {formatCurrency(
                annual(line.mode, line.annual, line.pupm, line.seats ?? seats),
                currency,
              )}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
});

function annual(
  mode: 'pupm' | 'annual',
  annualValue: number | undefined,
  pupm: number | undefined,
  seats: number,
): number {
  return mode === 'annual' ? (annualValue ?? 0) : (pupm ?? 0) * seats * 12;
}
