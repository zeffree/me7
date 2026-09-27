import { BadgePercent, ListPlus, Sparkles } from 'lucide-react';
import type { EngineResult } from '@/model/types';
import { useAssessment } from '@/store/useAssessment';
import { CATEGORIES } from '@/data/categories';
import { formatPupm } from '@/lib/format';
import { Button } from '@/components/ui/Primitives';
import { answeredCategoryCount } from '@/components/catalog/inventory';

/** Constructive next steps when the cash result is not a saving. Never reframes it as one. */
export function WhatWouldChange({ result: r, currency }: { result: EngineResult; currency: string }) {
  const s = useAssessment();
  const answered = answeredCategoryCount(s.lines, s.dismissed);
  const discount = s.assumptions.e7DiscountPct;
  return <section className="change-panel" aria-labelledby="what-would-change">
    <div className="change-intro">
      <h2 id="what-would-change">What could change this picture</h2>
      <p>This is not a saving under the current inputs, and that is a useful answer. A higher cost can still be a sound decision when the capabilities are needed. These are the levers worth checking.</p>
    </div>
    <div className="change-cards">
      <article className="change-card" data-accent="spend">
        <span className="change-icon" aria-hidden="true"><ListPlus /></span>
        <h3>Capture more spend</h3>
        <p>{answered} of {CATEGORIES.length} spend categories answered. Paid tools that E7 covers are what fund the move.</p>
        <Button variant="secondary" size="sm" onClick={() => s.setStep('catalog')}>Add more spend</Button>
      </article>
      <article className="change-card" data-accent="price">
        <span className="change-icon" aria-hidden="true"><BadgePercent /></span>
        <h3>Check the licence price</h3>
        <p>Using {formatPupm(r.e7NetPupm, currency)} / user / month for E7{discount > 0 ? ` after a ${discount}% discount` : ', with no discount'}. Use your quoted price if you have one.</p>
        <Button variant="secondary" size="sm" onClick={() => s.setStep('assumptions')}>Review assumptions</Button>
      </article>
      <article className="change-card" data-accent="lens">
        <span className="change-icon" aria-hidden="true"><Sparkles /></span>
        <h3>Weigh the capabilities</h3>
        <p>See what licensing the capabilities you plan to deploy would cost without E7. It is a separate lens and does not change this cash result.</p>
        <a className="button button-secondary button-sm" href="#licence-cost-avoidance">Choose capabilities</a>
      </article>
    </div>
  </section>;
}
