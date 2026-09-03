import { useMemo, useState } from 'react';
import { Gift, Check } from 'lucide-react';
import type { AvoidedCost, EngineResult } from '@/model/types';
import { Card, Badge, Button, EmptyState } from '@/components/ui/Primitives';
import { getDomain } from '@/data/categories';
import { formatCurrency, formatPupm, cx } from '@/lib/format';
import { useAssessment } from '@/store/useAssessment';

const COLLAPSED_COUNT = 8;

/**
 * The other half of the business case.
 *
 * Everything else on this page answers "what do you stop paying". This answers "what would you
 * have had to buy". Those are different currencies of value and the panel keeps them visibly
 * apart: the total here is never added to net annual impact, and the copy says so plainly.
 * Overstating this is the single easiest way to lose a finance audience, so the default is
 * nothing selected except capabilities the user explicitly told us they have no vendor for.
 */
export function CostAvoidancePanel({
  result,
  currency,
}: {
  result: EngineResult;
  currency: string;
}) {
  const { togglePlannedCapability, setPlannedCapabilities, dismissed } = useAssessment();
  const [expanded, setExpanded] = useState(false);

  const dismissedSet = useMemo(() => new Set(dismissed), [dismissed]);
  const candidates = result.avoidedCosts;

  if (candidates.length === 0) return null;

  const selected = candidates.filter((c) => c.selected);
  const visible = expanded ? candidates : candidates.slice(0, COLLAPSED_COUNT);
  const hiddenSelected = expanded
    ? 0
    : candidates.slice(COLLAPSED_COUNT).filter((c) => c.selected).length;

  return (
    <Card className="print-keep border-accent-500/25 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <Gift className="mt-0.5 h-5 w-5 shrink-0 text-accent-600 dark:text-accent-400" aria-hidden />
          <div>
            <h2 className="text-base font-bold">Capability you no longer have to buy</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-secondary">
              These are things you pay nothing for today because you do not have them. E7 includes
              them, so switching one on costs you nothing extra — but standing it up any other way
              would have meant a new line on the budget. Tick what you would actually deploy.
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Value gained
          </p>
          <p className="numeral text-xl font-extrabold text-accent-700 dark:text-accent-300">
            {formatCurrency(result.avoidedAnnualSelected, currency)}
          </p>
          <p className="text-[11px] text-muted">a year, at third-party list prices</p>
        </div>
      </div>

      <p className="mt-4 rounded-xl border border-subtle bg-[var(--surface-sunken)] px-4 py-3 text-xs leading-relaxed text-secondary">
        <span className="font-semibold text-[var(--text-primary)]">This is not cash.</span> It is
        deliberately kept out of your net annual impact, your effective per-user price and your
        TCO, because no invoice disappears. Present it as avoided future cost, separately from the
        savings — a finance reviewer will make that distinction anyway, so make it first. Each row
        is priced at what the third-party tools in that category list for, against the share of
        staff who would realistically hold a seat — not against all {result.seats.toLocaleString()}{' '}
        of them.
      </p>

      <div className="no-print mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => setPlannedCapabilities(candidates.map((c) => c.category.id))}
        >
          Select all {candidates.length}
        </Button>
        <Button variant="ghost" onClick={() => setPlannedCapabilities([])}>
          Clear
        </Button>
        <span className="text-xs text-muted">
          {selected.length} of {candidates.length} selected
          {result.avoidedAnnualAll > 0 && (
            <>
              {' · '}all of them would be{' '}
              <span className="numeral font-semibold">
                {formatCurrency(result.avoidedAnnualAll, currency)}
              </span>
            </>
          )}
        </span>
      </div>

      {selected.length === 0 && (
        <div className="mt-4">
          <EmptyState title="Nothing counted yet">
            Tick a capability below to add it. We only pre-select the ones you told us you have no
            vendor for.
          </EmptyState>
        </div>
      )}

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {visible.map((c) => (
          <CapabilityRow
            key={c.category.id}
            item={c}
            currency={currency}
            confirmedGap={dismissedSet.has(c.category.id)}
            onToggle={() => togglePlannedCapability(c.category.id)}
          />
        ))}
      </ul>

      {candidates.length > COLLAPSED_COUNT && (
        <div className="no-print mt-4">
          <Button variant="ghost" onClick={() => setExpanded((v) => !v)}>
            {expanded
              ? 'Show fewer'
              : `Show ${candidates.length - COLLAPSED_COUNT} more${
                  hiddenSelected > 0 ? ` (${hiddenSelected} selected)` : ''
                }`}
          </Button>
        </div>
      )}
    </Card>
  );
}

function CapabilityRow({
  item,
  currency,
  confirmedGap,
  onToggle,
}: {
  item: AvoidedCost;
  currency: string;
  confirmedGap: boolean;
  onToggle: () => void;
}) {
  const { category, selected, benchmarkPupm, avoidedAnnual, adoptionPct, licensedSeats } = item;

  return (
    <li className="min-w-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={onToggle}
        className={cx(
          'flex min-h-11 w-full min-w-0 items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
          selected
            ? 'border-accent-500/40 bg-accent-500/[0.07]'
            : 'border-subtle hover:bg-[var(--surface-sunken)]',
        )}
      >
        <span
          className={cx(
            'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors',
            selected
              ? 'border-accent-600 bg-accent-600 text-white'
              : 'border-ink-500/40',
          )}
          aria-hidden
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold">{category.name}</span>
            {confirmedGap && (
              <Badge tone="positive">You said you have no vendor</Badge>
            )}
            {item.coverage === 'upgrade' && <Badge tone="muted">Tier upgrade</Badge>}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-secondary">
            {getDomain(category.domain)?.name} · {category.e7Component}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="numeral block text-sm font-bold tabular-nums">
            {formatCurrency(avoidedAnnual, currency)}
          </span>
          <span className="numeral block text-[11px] text-muted">
            {formatPupm(benchmarkPupm, currency)}
            {adoptionPct < 1 && ` × ${licensedSeats.toLocaleString()} seats`}
          </span>
        </span>
      </button>
    </li>
  );
}
