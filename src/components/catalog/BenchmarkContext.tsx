import type { Category } from '@/data/categories';
import { formatCurrency } from '@/lib/format';

export function BenchmarkContext({ category, seats }: { category: Category; seats: number }) {
  return <dl className="estimate-context">
    <div><dt>Product used for this price</dt><dd>No single product. This is an app-set category planning estimate, not a vendor list price or quote.</dd></div>
    <div><dt>Comparable products</dt><dd>e.g. {category.examples.slice(0, 5).join(' · ')}. These illustrate the category; their editions and prices differ.</dd></div>
    {category.benchmarkPupm > 0 ? <>
      <div><dt>How the figure is calculated</dt><dd className="numeric">{formatCurrency(category.benchmarkPupm, 'USD', 2)} per modeled user per month × {seats.toLocaleString()} users × 12 = <strong>{formatCurrency(category.benchmarkPupm * seats * 12, 'USD')} / year</strong>.</dd></div>
      <div><dt>Use the right population</dt><dd>For an invoice estimate, use the users who need this product, not automatically every employee. Consumption, specialist roles and separately priced services can require a different basis.</dd></div>
    </> : <div><dt>Amount to use</dt><dd>No comparable per-user figure is provided. Enter a USD invoice or annual estimate; this does not mean the service is free.</dd></div>}
  </dl>;
}
