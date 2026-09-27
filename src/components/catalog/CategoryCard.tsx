import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { Category } from '@/data/categories';
import { useAssessment, toAssessment } from '@/store/useAssessment';
import { scoreLine } from '@/model/engine';
import { formatCurrency } from '@/lib/format';
import { Badge, Button, Note } from '@/components/ui/Primitives';
import { TextField, VendorField } from '@/components/ui/Fields';
import { SpendEditor, hasAmount, lineAnnual } from './SpendEditor';
import { BenchmarkContext } from './BenchmarkContext';
import { CategoryDiscussion } from './CategoryDiscussion';
import { DomainSymbol } from '@/components/ui/DomainSymbol';

const COVERAGE_LABELS = { already: 'Potential baseline overlap', unlocked: 'Potential E7 addition', upgrade: 'Partial / higher-tier coverage', 'not-covered': 'Not covered by E7' };
export function CategoryCard({ category, focusRequest = 0, onFocusHandled }: { category: Category; focusRequest?: number; onFocusHandled?: () => void }) {
  const s = useAssessment();
  const id = useId();
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focusRequest > 0) {
      setOpen(true);
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
      onFocusHandled?.();
    }
  }, [focusRequest, onFocusHandled]);
  const line = s.lines.find(l => l.categoryId === category.id);
  const dismissed = s.dismissed.includes(category.id);
  const coverage = category.coverage[s.baseline];
  const scored = line ? scoreLine(line, toAssessment(s)) : null;
  const status = dismissed ? 'No purchase' : !line ? 'Unreviewed' : !hasAmount(line) ? 'Amount unknown' : coverage === 'not-covered' ? 'Retained · not covered' : scored?.eligible ? 'Full replacement' : 'Resolve entry';
  return <article className="inventory-row" data-category={category.id}>
    <button ref={heading} className="inventory-heading" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}>
      <span className="inventory-title"><DomainSymbol domain={category.domain} /><span className="inventory-title-copy"><strong>{category.name}</strong>{line?.vendor && <small>{line.vendor}</small>}<small className="product-examples">e.g. {category.examples.slice(0, 5).join(' · ')}</small></span></span>
      <span className="inventory-amount"><strong>{line && hasAmount(line) ? formatCurrency(lineAnnual(line, s.seats), s.currency) : '—'}</strong><Badge tone={scored?.eligible ? 'brand' : 'neutral'}>{status}</Badge></span><ChevronDown aria-hidden="true" />
    </button>
    {open && <div id={id} className="inventory-body">
      <p>{category.whatItIs}</p>
      <div className="button-row"><Badge tone={coverage === 'not-covered' ? 'neutral' : 'brand'}>{COVERAGE_LABELS[coverage]}</Badge><span className="muted" style={{ fontSize: '.76rem' }}>{category.e7Component}</span></div>
      {!line ? <div className="button-row" style={{ margin: '20px 0' }}>
        <Button variant="secondary" onClick={() => s.upsertLine({ categoryId: category.id, vendor: '', mode: 'annual', retainPct: 0, amountSource: 'customer', assumptionConfirmed: false })}><Plus />Add an invoice or estimate</Button>
        {!dismissed ? <Button variant="ghost" onClick={() => s.dismissCategory(category.id)}>We don’t buy this</Button> : <Button variant="ghost" onClick={() => s.clearDismissal(category.id)}>Mark as unreviewed</Button>}
      </div> : <>
        <div style={{ marginTop: 22 }}><VendorField value={line.vendor} onChange={vendor => s.upsertLine({ ...line, vendor, assumptionConfirmed: false })} suggestions={category.examples} /></div>
        <SpendEditor label={category.name} line={line} onChange={s.upsertLine} canRetire={coverage !== 'not-covered'} />
        {scored && <Note><strong>{formatCurrency(scored.annualCredit, s.currency)} / year</strong> modeled retirement credit. {scored.eligible ? 'The full invoice is replaced in this scenario.' : scored.exclusionReason || 'This spend stays in future cost.'}</Note>}
        <details className="disclosure"><summary>Renewal note</summary><TextField label="Contract or renewal note" value={line.contractEnd ?? ''} onChange={contractEnd => s.upsertLine({ ...line, contractEnd })} hint="Informational only. Set computable savings delay in Review → Transition timing." /></details>
        <Button variant="danger" size="sm" onClick={() => {
          if (!hasAmount(line) || window.confirm('Remove this entered line? The category will become unreviewed.')) s.removeLine(category.id);
        }}>Remove entry</Button>
      </>}
      <details className="disclosure"><summary>Illustrative estimate</summary><div className="detail-copy">
        <BenchmarkContext category={category} seats={line?.seats ?? s.seats} />
        {category.benchmarkPupm > 0 && s.currency === 'USD' && <Button variant="secondary" size="sm" onClick={() => {
          if (!line || !hasAmount(line) || window.confirm('Replace this amount with an illustrative USD estimate?')) s.upsertLine({ categoryId: category.id, vendor: line?.vendor ?? '', ...line, mode: 'pupm', pupm: category.benchmarkPupm, seats: line?.seats ?? s.seats, retainPct: line?.retainPct ?? 0, amountSource: 'benchmark', assumptionConfirmed: false });
        }}>Use illustrative USD estimate</Button>}
      </div></details>
      {s.sellerMode && <CategoryDiscussion category={category} scored={scored} />}
    </div>}
  </article>;
}
