import { ShieldAlert } from 'lucide-react';
import type { EngineResult } from '@/model/types';
import { getDomain } from '@/data/categories';
import { Card, Badge, EmptyState } from '@/components/ui/Primitives';
import { BUCKET_META, CONFIDENCE_META } from '@/lib/coverage';
import { formatCurrency, formatPercent } from '@/lib/format';

export function BucketBreakdown({
  result,
  currency,
}: {
  result: EngineResult;
  currency: string;
}) {
  const buckets = result.buckets.filter((b) => b.lineCount > 0);
  if (buckets.length === 0) return null;

  return (
    <div className="print-detail grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {buckets.map((b) => {
        const meta = BUCKET_META[b.bucket];
        return (
          <Card key={b.bucket} className="p-5">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <p className="numeral mt-3 text-xl font-extrabold">
              {formatCurrency(b.conservativeCredit, currency)}
            </p>
            <p className="mt-1 text-xs text-muted">
              recoverable of {formatCurrency(b.grossSpend, currency)} across {b.lineCount}{' '}
              {b.lineCount === 1 ? 'line' : 'lines'}
            </p>
            <p className="mt-2.5 text-xs leading-relaxed text-secondary">{meta.blurb}</p>
          </Card>
        );
      })}
    </div>
  );
}

export function DomainTable({ result, currency }: { result: EngineResult; currency: string }) {
  const domains = result.domains.filter((d) => d.lineCount > 0);

  if (domains.length === 0) {
    return (
      <EmptyState title="No third-party spend captured yet">
        Head back to the quick scan or the full catalog and tell us what you pay for today — that is
        where the savings story comes from.
      </EmptyState>
    );
  }

  return (
    <Card className="print-keep overflow-hidden">
      <div className="border-b border-subtle p-6">
        <h2 className="text-base font-bold">Where the money sits</h2>
        <p className="mt-1 text-sm text-secondary">
          Captured spend by domain, and the share of it you can recover after what you said you
          would retain.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[42rem] w-full text-sm">
          <caption className="sr-only">Captured third-party spend by domain</caption>
          <thead>
            <tr className="border-b border-subtle text-left text-[11px] uppercase tracking-wide text-muted">
              <th scope="col" className="px-6 py-3 font-bold">Domain</th>
              <th scope="col" className="px-6 py-3 text-right font-bold">Lines</th>
              <th scope="col" className="px-6 py-3 text-right font-bold">Annual spend</th>
              <th scope="col" className="px-6 py-3 text-right font-bold">Recoverable</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((d) => (
              <tr key={d.domain} className="border-b border-subtle last:border-0">
                <th scope="row" className="px-6 py-3.5 text-left font-semibold">
                  {getDomain(d.domain)?.name ?? d.domain}
                </th>
                <td className="numeral px-6 py-3.5 text-right tabular-nums text-secondary">
                  {d.lineCount}
                </td>
                <td className="numeral px-6 py-3.5 text-right tabular-nums">
                  {formatCurrency(d.grossSpend, currency)}
                </td>
                <td className="numeral px-6 py-3.5 text-right font-bold tabular-nums text-accent-700 dark:text-accent-300">
                  {formatCurrency(d.conservativeCredit, currency)}
                  <span className="ml-1.5 text-xs font-medium text-muted">
                    {d.grossSpend > 0
                      ? formatPercent((d.conservativeCredit / d.grossSpend) * 100)
                      : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[var(--surface-sunken)] font-bold">
              <th scope="row" className="px-6 py-3.5 text-left">Total</th>
              <td className="numeral px-6 py-3.5 text-right tabular-nums">
                {domains.reduce((a, d) => a + d.lineCount, 0)}
              </td>
              <td className="numeral px-6 py-3.5 text-right tabular-nums">
                {formatCurrency(result.thirdPartyAnnual, currency)}
              </td>
              <td className="numeral px-6 py-3.5 text-right tabular-nums text-accent-700 dark:text-accent-300">
                {formatCurrency(result.thirdPartyCreditConservative, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

export function LineDetail({ result, currency }: { result: EngineResult; currency: string }) {
  const lines = [...result.scoredLines]
    .filter((l) => l.bucket !== 'not-covered')
    .sort((a, b) => b.conservativeCredit - a.conservativeCredit);

  if (lines.length === 0) return null;

  return (
    <Card className="overflow-hidden print-detail">
      <div className="border-b border-subtle p-6">
        <h2 className="text-base font-bold">Line-by-line</h2>
        <p className="mt-1 text-sm text-secondary">
          Ranked by recoverable spend. The confidence badge is what drives the credit — nothing here
          is a black box.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[48rem] w-full text-sm">
          <caption className="sr-only">Captured spend lines ranked by recoverable amount</caption>
          <thead>
            <tr className="border-b border-subtle text-left text-[11px] uppercase tracking-wide text-muted">
              <th scope="col" className="px-6 py-3 font-bold">Category</th>
              <th scope="col" className="px-6 py-3 font-bold">Vendor</th>
              <th scope="col" className="px-6 py-3 font-bold">Story</th>
              <th scope="col" className="px-6 py-3 text-right font-bold">Annual</th>
              <th scope="col" className="px-6 py-3 text-right font-bold">Recoverable</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.category.id} className="border-b border-subtle last:border-0">
                <th scope="row" className="px-6 py-3.5 text-left font-semibold">
                  {l.category.name}
                </th>
                <td className="px-6 py-3.5 text-secondary">{l.line.vendor || '—'}</td>
                <td className="px-6 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={BUCKET_META[l.bucket].tone}>{BUCKET_META[l.bucket].label}</Badge>
                    <Badge tone={CONFIDENCE_META[l.effectiveConfidence].tone}>
                      {CONFIDENCE_META[l.effectiveConfidence].label}
                    </Badge>
                  </div>
                </td>
                <td className="numeral px-6 py-3.5 text-right tabular-nums">
                  {formatCurrency(l.annualSpend, currency)}
                </td>
                <td className="numeral px-6 py-3.5 text-right font-bold tabular-nums text-accent-700 dark:text-accent-300">
                  {formatCurrency(l.conservativeCredit, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function NotCoveredPanel({ result, currency }: { result: EngineResult; currency: string }) {
  const lines = result.scoredLines.filter((l) => l.bucket === 'not-covered');
  const addOns = result.scoredAddOns.filter((a) => !a.absorbed);

  if (lines.length === 0 && addOns.length === 0) return null;

  const total =
    lines.reduce((a, l) => a + l.annualSpend, 0) + addOns.reduce((a, x) => a + x.annualSpend, 0);

  return (
    <Card className="border-rose-500/25 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" aria-hidden />
          <div>
            <h2 className="text-base font-bold">What E7 does not cover</h2>
            <p className="mt-1 max-w-2xl text-sm text-secondary">
              This spend continues after the move and earns zero credit in the model. Bring it to the
              conversation before someone else does — a business case that quietly omits it does not
              survive its first serious review.
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Continuing</p>
          <p className="numeral text-xl font-extrabold text-rose-600 dark:text-rose-400">
            {formatCurrency(total, currency)}
          </p>
        </div>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {lines.map((l) => (
          <li
            key={l.category.id}
            // min-w-0: grid items default to min-width:auto, so a long category name
            // widens the track past the viewport instead of truncating.
            className="flex min-w-0 items-baseline justify-between gap-3 rounded-xl border border-subtle px-4 py-2.5"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{l.category.name}</span>
              {l.line.vendor && (
                <span className="block truncate text-xs text-muted">{l.line.vendor}</span>
              )}
            </span>
            <span className="numeral shrink-0 text-sm font-bold tabular-nums">
              {formatCurrency(l.annualSpend, currency)}
            </span>
          </li>
        ))}
        {addOns.map((a) => (
          <li
            key={a.addOnId}
            className="flex min-w-0 items-baseline justify-between gap-3 rounded-xl border border-subtle px-4 py-2.5"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{a.name}</span>
              <span className="block text-xs text-muted">Microsoft add-on</span>
            </span>
            <span className="numeral shrink-0 text-sm font-bold tabular-nums">
              {formatCurrency(a.annualSpend, currency)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
