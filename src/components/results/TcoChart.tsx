import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EngineResult } from '@/model/types';
import { Card } from '@/components/ui/Primitives';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';

const CURRENT = '#f43f5e';
const FUTURE = '#0f766e';
const CUMULATIVE = '#8b5cf6';

export function TcoChart({ result, currency }: { result: EngineResult; currency: string }) {
  const data = result.tco.map((y) => ({
    name: `Year ${y.year}`,
    'Stay as-is': Math.round(y.currentCost),
    'Move to E7': Math.round(y.e7Cost),
    'Cumulative benefit': Math.round(y.cumulativeNetBenefit),
  }));

  return (
    <Card className="print-keep p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">
            {result.tco.length}-year total cost of ownership
          </h2>
          <p className="mt-1 text-sm text-secondary">
            Year one is throttled to your realisation rate and carries the migration cost — which is
            why the curve starts slow and steepens.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Cumulative benefit
          </p>
          <p
            className={`numeral text-2xl font-extrabold ${
              result.tcoNetBenefit >= 0
                ? 'text-accent-600 dark:text-accent-300'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(result.tcoNetBenefit, currency)}
          </p>
        </div>
      </div>

      <div
        className="mt-6 h-72 w-full overflow-hidden"
        role="img"
        aria-label={`${result.tco.length}-year total cost of ownership chart comparing staying as-is, moving to E7, and cumulative benefit.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-500/15" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'currentColor' }}
              className="text-muted"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={70}
              tick={{ fontSize: 12, fill: 'currentColor' }}
              className="text-muted"
              tickFormatter={(v) => formatCompactCurrency(Number(v), currency)}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value), currency)}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid rgba(127,127,127,0.25)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="Stay as-is" fill={CURRENT} radius={[6, 6, 0, 0]} maxBarSize={54} />
            <Bar dataKey="Move to E7" fill={FUTURE} radius={[6, 6, 0, 0]} maxBarSize={54} />
            <Line
              type="monotone"
              dataKey="Cumulative benefit"
              stroke={CUMULATIVE}
              strokeWidth={2.5}
              dot={{ r: 4, fill: CUMULATIVE }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
