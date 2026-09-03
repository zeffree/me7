import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, ClipboardList, Lightbulb, Swords, TriangleAlert, X } from 'lucide-react';
import type { Category } from '@/data/categories';
import { findBattlecards, DISCOVERY_QUESTIONS } from '@/data/sellerPlays';
import { getBaseline } from '@/data/skus';
import { Badge, Card, Chip } from '@/components/ui/Primitives';
import {
  NumberField,
  Segmented,
  SliderField,
  TextField,
  VendorField,
} from '@/components/ui/Fields';
import { COVERAGE_META, CONFIDENCE_META } from '@/lib/coverage';
import { cx, formatCurrency, formatPupm } from '@/lib/format';
import { useAssessment } from '@/store/useAssessment';
import { annualiseLine } from '@/model/engine';
import type { SpendLine } from '@/model/types';

export function CategoryCard({
  category,
  headingLevel = 2,
}: {
  category: Category;
  /**
   * 2 when the card sits directly under the step's h1 (quick assessment), 3 when it is nested
   * inside a domain accordion whose own heading is an h2 (full catalog). Keeping this honest
   * is what stops the document outline skipping a level.
   */
  headingLevel?: 2 | 3;
}) {
  const {
    baseline,
    seats,
    currency,
    lines,
    dismissed,
    sellerMode,
    upsertLine,
    removeLine,
    dismissCategory,
    clearDismissal,
  } = useAssessment();

  const line = lines.find((l) => l.categoryId === category.id);
  const isDismissed = dismissed.includes(category.id);
  // Falls back to the catalog's own example products, so a seller sees the relevant battlecard
  // while probing a category, not only after a vendor name has been typed in.
  const sellerCard = sellerMode
    ? findBattlecards(line?.vendor ? [line.vendor] : category.examples)[0]
    : undefined;
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const detailId = `category-${category.id}-detail`;
  const spendId = `category-${category.id}-spend`;
  const Heading = headingLevel === 3 ? 'h3' : 'h2';

  const coverage = category.coverage[baseline];
  const covMeta = COVERAGE_META[coverage];
  const confMeta = CONFIDENCE_META[category.confidence];

  const enable = () => {
    const draft: SpendLine = {
      categoryId: category.id,
      vendor: '',
      mode: 'pupm',
      pupm: category.benchmarkPupm || 0,
      retainPct: 0,
    };
    upsertLine(draft);
  };

  const update = (patch: Partial<SpendLine>) => {
    if (!line) return;
    upsertLine({ ...line, ...patch });
  };

  const annual = line ? annualiseLine(line, seats) : 0;

  return (
    <Card
      className={cx(
        'overflow-hidden transition-colors',
        line && 'ring-1 ring-brand-500/40',
        isDismissed && 'opacity-55',
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Heading className="text-base font-bold">{category.name}</Heading>
              <Badge tone={covMeta.tone}>{covMeta.label}</Badge>
              {coverage !== 'not-covered' && (
                <Badge tone={confMeta.tone}>{confMeta.label}</Badge>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-secondary">{category.whatItIs}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!line && !isDismissed && (
              <>
                <button
                  type="button"
                  onClick={enable}
                  className="min-h-10 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-500"
                >
                  We pay for this
                </button>
                <button
                  type="button"
                  onClick={() => dismissCategory(category.id)}
                  className="min-h-10 rounded-lg border border-subtle px-3 py-2 text-xs font-semibold text-secondary transition-colors hover:text-[var(--text-primary)]"
                >
                  We don&apos;t
                </button>
              </>
            )}
            {isDismissed && (
              <button
                type="button"
                onClick={() => clearDismissal(category.id)}
                className="min-h-10 rounded-lg border border-subtle px-3 py-2 text-xs font-semibold text-secondary transition-colors hover:text-[var(--text-primary)]"
              >
                Undo
              </button>
            )}
            {line && (
              <button
                type="button"
                onClick={() => removeLine(category.id)}
                aria-label={`Remove ${category.name} spend`}
                className="grid min-h-10 min-w-10 place-items-center rounded-lg p-2 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- spend capture */}
        <AnimatePresence initial={false}>
          {line && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={reduceMotion ? { height: 'auto', opacity: 1 } : { height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
              className="overflow-hidden"
              id={spendId}
            >
              <div className="mt-4 rounded-xl border border-subtle bg-[var(--surface-sunken)] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <VendorField
                    label="Which product?"
                    value={line.vendor}
                    onChange={(vendor) => update({ vendor })}
                    suggestions={category.examples}
                  />
                  <div>
                    <span className="mb-1.5 block text-sm font-semibold">How is it priced?</span>
                    <Segmented
                      ariaLabel="Spend entry mode"
                      value={line.mode}
                      onChange={(mode) => update({ mode })}
                      options={[
                        { value: 'pupm', label: 'Per user / month' },
                        { value: 'annual', label: 'Annual total' },
                      ]}
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {line.mode === 'pupm' ? (
                    <>
                      <NumberField
                        label="Price per user / month"
                        value={line.pupm ?? 0}
                        onChange={(pupm) => update({ pupm })}
                        currency={currency}
                        step={0.5}
                        hint={`Tools in this category typically list around ${formatPupm(
                          category.benchmarkPupm,
                          currency,
                        )} per user per month. Use it as a starting point if you don't know your own number.`}
                      />
                      <NumberField
                        label="Licensed seats"
                        value={line.seats ?? seats}
                        onChange={(v) => update({ seats: v })}
                        hint="Often fewer than your total headcount — many tools are only licensed for a subset of staff."
                      />
                    </>
                  ) : (
                    <NumberField
                      label="Annual contract value"
                      value={line.annual ?? 0}
                      onChange={(annualValue) => update({ annual: annualValue })}
                      currency={currency}
                      step={1000}
                      className="sm:col-span-2"
                    />
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <SliderField
                    label="Spend you would keep"
                    value={line.retainPct}
                    onChange={(retainPct) => update({ retainPct })}
                    min={0}
                    max={100}
                    step={5}
                    format={(v) => `${v}%`}
                    hint="Set this above zero when you would keep a reduced footprint — a Mac-only Jamf estate, or a second mail filter kept deliberately for defence in depth."
                  />
                  <TextField
                    label="Contract renewal (optional)"
                    value={line.contractEnd ?? ''}
                    onChange={(contractEnd) => update({ contractEnd })}
                    placeholder="e.g. Mar 2027"
                    hint="Renewal timing drives how much of the saving is actually realisable in year one."
                  />
                </div>

                <div className="mt-4 flex items-baseline justify-between border-t border-subtle pt-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Annual spend captured
                  </span>
                  <span className="numeral text-lg font-bold">
                    {formatCurrency(annual, currency)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------------------------------------------- explainer */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={detailId}
          className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg text-xs font-bold text-brand-600 transition-colors hover:text-brand-500 dark:text-brand-300"
        >
          <ChevronDown
            className={cx(
              'h-3.5 w-3.5 transition-transform',
              expanded && 'rotate-180',
              reduceMotion && 'transition-none',
            )}
            aria-hidden
          />
          {expanded ? 'Hide detail' : 'What replaces this, and what does it cost?'}
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={reduceMotion ? { height: 'auto', opacity: 1 } : { height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
              className="overflow-hidden"
              id={detailId}
            >
              <div className="mt-3 space-y-4 border-t border-subtle pt-4 text-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    What covers it in E7
                  </p>
                  <p className="mt-1 font-semibold text-brand-500 dark:text-brand-300">
                    {category.e7Component}
                  </p>
                  <p className="mt-1.5 leading-relaxed text-secondary">{category.whyReplaced}</p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    Products people buy in this space
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {category.examples.map((e) => (
                      <Chip key={e}>{e}</Chip>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-subtle p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">
                      What tools like these cost
                    </p>
                    <p className="numeral mt-1 text-lg font-bold">
                      {category.benchmarkPupm > 0
                        ? `${formatPupm(category.benchmarkPupm, currency)}`
                        : 'Varies'}
                    </p>
                    <p className="text-xs text-muted">
                      {category.benchmarkPupm > 0
                        ? 'per user / month — typical list price for the products above, not the Microsoft component'
                        : 'not sold per user — priced by capacity, volume or robot'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-subtle p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">
                      For a {getBaseline(baseline).shortName} customer
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-secondary">{covMeta.blurb}</p>
                  </div>
                </div>

                {category.caveat && (
                  <div className="flex gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3">
                    <TriangleAlert
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                      aria-hidden
                    />
                    <p className="text-xs leading-relaxed text-secondary">
                      <span className="font-bold text-amber-700 dark:text-amber-300">
                        Worth knowing:{' '}
                      </span>
                      {category.caveat}
                    </p>
                  </div>
                )}

                {sellerMode && category.talkTrack && (
                  <div className="flex gap-2.5 rounded-xl border border-brand-500/30 bg-brand-500/8 p-3">
                    <Lightbulb
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-500 dark:text-brand-300"
                      aria-hidden
                    />
                    <p className="text-xs leading-relaxed text-secondary">
                      <span className="font-bold text-brand-600 dark:text-brand-300">
                        Talk track:{' '}
                      </span>
                      {category.talkTrack}
                    </p>
                  </div>
                )}

                {sellerMode && sellerCard && (
                  <div className="flex gap-2.5 rounded-xl border border-brand-500/30 bg-brand-500/8 p-3">
                    <Swords
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-500 dark:text-brand-300"
                      aria-hidden
                    />
                    <div className="min-w-0 space-y-1.5 text-xs leading-relaxed text-secondary">
                      <p>
                        <span className="font-bold text-brand-600 dark:text-brand-300">
                          {sellerCard.vendor} vs {sellerCard.counter}:{' '}
                        </span>
                        {sellerCard.wedge}
                      </p>
                      <p>
                        <span className="font-bold text-[var(--text-primary)]">
                          Where they win:{' '}
                        </span>
                        {sellerCard.theyWin}
                      </p>
                      <p>
                        <span className="font-bold text-rose-700 dark:text-rose-400">
                          Do not claim:{' '}
                        </span>
                        {sellerCard.trap}
                      </p>
                    </div>
                  </div>
                )}

                {sellerMode && (
                  <div className="flex gap-2.5 rounded-xl border border-subtle bg-[var(--surface-sunken)] p-3">
                    <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                    <p className="text-xs leading-relaxed text-secondary">
                      <span className="font-bold text-[var(--text-primary)]">Ask: </span>
                      {DISCOVERY_QUESTIONS[category.domain][0]}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
