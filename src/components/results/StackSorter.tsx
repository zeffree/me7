import type { ReactNode } from 'react';
import { CircleHelp, Layers3, LockKeyhole, PackageCheck } from 'lucide-react';
import type { DomainId } from '@/data/categories';
import type { Assessment, EngineResult } from '@/model/types';
import { formatCurrency } from '@/lib/format';
import { useAssessment } from '@/store/useAssessment';
import { DomainSymbol } from '@/components/ui/DomainSymbol';
import { recoveredInvoices } from '@/components/catalog/inventory';
import { hasAmount } from '@/components/catalog/SpendEditor';

export interface StackItem { key: string; name: string; detail: string; amount: number; domain?: DomainId }
export interface SortedStack { retired: StackItem[]; retained: StackItem[]; unknown: StackItem[] }

/** Groups every entered invoice by what the scenario does with it. Nothing is dropped. */
export function sortStack(r: EngineResult, assessment: Pick<Assessment, 'lines' | 'addOns' | 'seats'>): SortedStack {
  const retired: StackItem[] = [];
  const retained: StackItem[] = [];
  const unknown: StackItem[] = [];
  r.scoredLines.forEach((item, index) => {
    const base = { key: `line:${item.line.categoryId}:${index}`, name: item.line.vendor || item.category.name, domain: item.category.domain };
    if (!hasAmount(item.line)) { unknown.push({ ...base, detail: item.category.name, amount: 0 }); return; }
    if (item.annualCredit > 0) retired.push({ ...base, detail: item.category.name, amount: item.annualCredit });
    const kept = item.annualSpend - item.annualCredit;
    if (kept > 0) retained.push({ ...base, key: `${base.key}:kept`, detail: item.coverage === 'not-covered' ? 'Not covered by E7' : item.exclusionReason || 'Retained', amount: kept });
  });
  recoveredInvoices(assessment).filter(item => item.kind === 'third-party').forEach((item, index) => {
    const base = { key: `recovered:${item.id}:${index}`, name: item.name, detail: 'Outside the catalog' };
    if (item.annual === undefined) unknown.push({ ...base, amount: 0 });
    else if (item.annual > 0) retained.push({ ...base, amount: item.annual });
  });
  r.scoredAddOns.forEach((item, index) => {
    const base = { key: `addon:${item.addOnId}:${index}`, name: item.name };
    if (!hasAmount(item.line)) { unknown.push({ ...base, detail: 'Microsoft add-on', amount: 0 }); return; }
    if (item.annualCredit > 0) retired.push({ ...base, detail: 'Microsoft add-on', amount: item.annualCredit });
    const kept = item.annualSpend - item.annualCredit;
    if (kept > 0) retained.push({ ...base, key: `${base.key}:kept`, detail: item.exclusionReason || 'Microsoft add-on · retained', amount: kept });
  });
  const byAmount = (a: StackItem, b: StackItem) => b.amount - a.amount;
  return { retired: retired.sort(byAmount), retained: retained.sort(byAmount), unknown };
}

const LIMIT = 10;

function Pile({ title, tone, icon, items, total, currency, empty }: { title: string; tone: 'retired' | 'retained' | 'unknown'; icon: ReactNode; items: StackItem[]; total?: number; currency: string; empty: string }) {
  const shown = items.slice(0, LIMIT);
  return <section className={`stack-pile pile-${tone}`}>
    <header><span className="pile-icon" aria-hidden="true">{icon}</span><div><h3>{title}</h3><p>{items.length} {items.length === 1 ? 'entry' : 'entries'}{total !== undefined && ` · ${formatCurrency(total, currency)} / year`}</p></div></header>
    {items.length ? <ul>
      {shown.map(item => <li key={item.key} data-domain={item.domain}>
        {item.domain ? <DomainSymbol domain={item.domain} /> : <span className="domain-symbol" data-seg="addon" aria-hidden="true"><Layers3 /></span>}
        <span className="pile-name"><strong>{item.name}</strong><small>{item.detail}</small></span>
        <span className="pile-amount">{tone === 'unknown' ? 'Unknown' : formatCurrency(item.amount, currency)}</span>
      </li>)}
    </ul> : <p className="pile-empty">{empty}</p>}
    {items.length > LIMIT && <p className="pile-more">+{items.length - LIMIT} more in the invoice-level working below.</p>}
  </section>;
}

export function StackSorter({ result, currency }: { result: EngineResult; currency: string }) {
  const s = useAssessment();
  const stack = sortStack(result, s);
  const sum = (items: StackItem[]) => items.reduce((total, item) => total + item.amount, 0);
  return <section className="section-block" aria-labelledby="stack-sorted">
    <div className="bc-heading"><span className="bc-icon" data-tone="stack" aria-hidden="true"><PackageCheck /></span><div>
      <h2 id="stack-sorted">Your stack, sorted</h2>
      <p>Every entered invoice, grouped by what the E7 scenario does with it.</p>
    </div></div>
    <div className="stack-piles">
      <Pile title="Retired with E7" tone="retired" icon={<PackageCheck />} items={stack.retired} total={sum(stack.retired)} currency={currency} empty="No invoice is retired yet. Add the paid tools E7 could replace." />
      <Pile title="Stays paid" tone="retained" icon={<LockKeyhole />} items={stack.retained} total={sum(stack.retained)} currency={currency} empty="Nothing entered stays paid alongside E7." />
    </div>
    {stack.unknown.length > 0 && <Pile title="Needs an amount" tone="unknown" icon={<CircleHelp />} items={stack.unknown} currency={currency} empty="" />}
  </section>;
}
