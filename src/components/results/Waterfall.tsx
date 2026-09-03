import { buildWaterfall } from '@/model/engine';
import type { EngineResult } from '@/model/types';
import { Card } from '@/components/ui/Primitives';
import { formatCurrency } from '@/lib/format';

const KIND_STYLE = {
  total: 'bg-ink-500/70 dark:bg-ink-300/70',
  increase: 'bg-rose-600',
  decrease: 'bg-accent-600',
} as const;

// The two credit bars look interchangeable but answer different questions, and
// that distinction is the whole argument. Say it on the chart rather than
// leaving it to a tooltip nobody opens.
const HINT: Record<string, string> = {
  current: 'Your current licences, Microsoft add-ons and third-party tools.',
  uplift: 'What an E7 seat costs above your current suite — the only bar that adds cost.',
  addons: 'Microsoft add-ons you buy separately today that E7 includes.',
  already:
    'Your current suite already covers these. You are paying twice today — this is available without E7.',
  unlocked:
    'Your suite does not cover these; E7 newly includes them. This is what the upgrade itself earns.',
  upgrade: 'E7 raises your tier rather than replacing the product outright.',
  future: 'E7 licences plus every tool you keep.',
};

export function Waterfall({ result, currency }: { result: EngineResult; currency: string }) {
  const steps = buildWaterfall(result);

  let running = 0;
  const rows = steps
    .map((s) => {
      if (s.kind === 'total') {
        running = s.value;
        return { ...s, base: 0, delta: Math.abs(s.value), runningTotal: s.value };
      }
      const start = running;
      const end = running + s.value;
      running = end;
      return { ...s, base: Math.min(start, end), delta: Math.abs(s.value), runningTotal: end };
    })
    // A movement of exactly zero is noise, not information.
    .filter((r) => r.kind === 'total' || r.delta > 0.5);

  const max = Math.max(...rows.map((r) => r.base + r.delta), 1);

  // Spend E7 does not cover earns no credit, so it never becomes a bar — yet it
  // is still sitting inside the closing total. Account for it explicitly.
  const notCovered = result.buckets.find((b) => b.bucket === 'not-covered')?.grossSpend ?? 0;

  return (
    <Card className="print-keep p-6">
      <h2 className="text-base font-bold">From today&apos;s run-rate to your future run-rate</h2>
      <p className="mt-1 text-sm text-secondary">
        Every bar is a real line item. Red adds cost, teal removes it.
      </p>

      <div className="mt-6 space-y-2">
        {rows.map((r) => {
          const isTotal = r.kind === 'total';
          return (
            <div
              key={r.key}
              className="grid grid-cols-1 items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(200px,1.3fr)_2fr_minmax(110px,auto)]"
            >
              <span className={isTotal ? 'text-sm font-bold' : 'text-sm text-secondary'}>
                {r.label}
                {HINT[r.key] && (
                  <span className="mt-0.5 block text-xs font-normal leading-snug text-muted">
                    {HINT[r.key]}
                  </span>
                )}
              </span>
              <div
                className="relative h-7 overflow-hidden rounded-md bg-ink-500/[0.08]"
                aria-hidden
              >
                <div
                  className={`absolute inset-y-0 rounded-md transition-[left,width] duration-500 ${KIND_STYLE[r.kind]}`}
                  style={{
                    left: `${(r.base / max) * 100}%`,
                    width: `${Math.max((r.delta / max) * 100, 0.7)}%`,
                  }}
                />
              </div>
              <span
                className={`numeral text-right text-sm tabular-nums ${
                  isTotal
                    ? 'font-extrabold'
                    : r.kind === 'increase'
                      ? 'font-semibold text-rose-700 dark:text-rose-400'
                      : 'font-semibold text-accent-700 dark:text-accent-300'
                }`}
              >
                {isTotal
                  ? formatCurrency(r.value, currency)
                  : `${r.value >= 0 ? '+' : '−'}${formatCurrency(Math.abs(r.value), currency)}`}
              </span>
            </div>
          );
        })}
      </div>

      {notCovered > 0 && (
        <p className="mt-5 border-t border-subtle pt-4 text-xs leading-relaxed text-muted">
          <span className="font-semibold">No bar for {formatCurrency(notCovered, currency)}.</span>{' '}
          That is spend on tools E7 does not cover, so it claims no credit and stays in your future
          run-rate.
        </p>
      )}
    </Card>
  );
}
