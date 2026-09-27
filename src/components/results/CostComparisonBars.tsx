import { formatCurrency } from '@/lib/format';

export function CostComparisonBars({ current, future, currency = 'USD' }: { current: number; future: number; currency?: string }) {
  const scale = Math.max(current, future, 1);
  return <figure className="cost-comparison-bars">
    <figcaption>Annual recurring cost · {currency}</figcaption>
    {[{ label: 'Today', amount: current, future: false }, { label: 'With E7', amount: future, future: true }].map(row => <div className="cost-comparison-row" key={row.label}>
      <div><span>{row.label}</span><strong className="numeric">{formatCurrency(row.amount, currency)}</strong></div>
      <div className="cost-comparison-track" aria-hidden="true"><span className={row.future ? 'future' : ''} style={{ width: `${row.amount / scale * 100}%` }} /></div>
    </div>)}
  </figure>;
}
