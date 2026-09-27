import { ArrowRight } from 'lucide-react';
import type { Category } from '@/data/categories';
import { DISCOVERY_QUESTIONS } from '@/data/sellerPlays';
import type { ScoredLine } from '@/model/types';
import { formatCurrency } from '@/lib/format';

export function CategoryDiscussion({ category, scored }: { category: Category; scored: ScoredLine | null }) {
  const covered = scored ? scored.coverage !== 'not-covered' : Object.values(category.coverage).some(value => value !== 'not-covered');
  return <details className="disclosure category-discussion no-print">
    <summary>Presenter discussion notes</summary>
    <div className="capability-route">
      <div><small>Current capability</small><strong>{scored?.line.vendor || category.name}</strong></div>
      <ArrowRight aria-hidden="true" />
      <div><small>{covered ? 'E7 capability to evaluate' : 'Keep as a separate service'}</small><strong>{category.e7Component}</strong></div>
    </div>
    <div className="discussion-columns">
      <section><h3>Lead with the workflow</h3><p>{category.talkTrack || category.whatItIs}</p></section>
      <section><h3>{covered ? 'Make the connection' : 'Protect the scope'}</h3><p>{category.whyReplaced}</p>
        <p>{scored ? scored.eligible ? `This scenario retires the full ${formatCurrency(scored.annualCredit, 'USD')} annual invoice. Use a pilot and contract exit plan to test that assumption before acting.` : 'This invoice currently contributes no retirement savings. Its cost remains in the comparison.' : 'Capture the actual invoice before discussing an offset to the E7 licence cost.'}</p>
      </section>
    </div>
    <div className="discussion-prompt"><h3>Ask, then agree an acceptance test</h3><p>{DISCOVERY_QUESTIONS[category.domain][0]}</p><p className="muted">Name the workload owner, demonstrate the required workflow, and agree the cutover date. A bundled capability alone does not cancel a contract.</p></div>
  </details>;
}
