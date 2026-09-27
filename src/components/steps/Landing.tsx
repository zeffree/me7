import { ArrowRight } from 'lucide-react';
import { useAssessment } from '@/store/useAssessment';
import { Button } from '@/components/ui/Primitives';
import { ImportButton } from '@/components/ui/ImportButton';
import { createDemoAssessment, DEMO_STORY } from '@/data/demo';
import { computeAssessment } from '@/model/engine';
import { formatCurrency } from '@/lib/format';
import { StackPlayground } from './StackPlayground';

const demo = createDemoAssessment();
const example = computeAssessment(demo);
const money = (value: number) => formatCurrency(value, 'USD');

export function Landing({ onResume }: { onResume: () => void }) {
  const state = useAssessment();
  return <div className="landing">
    <div className="landing-main">
      <section className="landing-copy">
        <h1 tabIndex={-1}>A stronger workspace.<br />A <span className="marked-word">leaner</span> toolset.</h1>
        <p className="landing-lede">Bring AI, identity and security into one Microsoft 365 E7 plan. See how retiring overlapping tools could fund the move — with your invoices, not a promised saving.</p>
        <div className="button-row">
          <Button size="lg" onClick={() => { if (!state.started) state.start(); onResume(); }}>{state.started ? 'Resume assessment' : 'Start your assessment'}<ArrowRight /></Button>
          <Button variant="ghost" onClick={() => {
            if (!state.started || window.confirm('Replace your current assessment with an illustrative example? Export your work first if you want to keep it.')) {
              state.loadDemo(); onResume();
            }
          }}>Explore an example</Button>
        </div>
        <p className="landing-small">A few numbers. A clearer picture.<br />Start with what you know — fill in the gaps as you go.</p>
        <div className="section-block">
          <ImportButton label="Restore a saved assessment" onImported={onResume} />
        </div>
      </section>
      <section className="landing-folio" aria-label="Illustrative Northstar financial comparison">
        <div className="folio-title"><h2>Less juggling.<br />More working together.</h2></div>
        <div className="folio-example">
          <p className="example-story"><strong>{DEMO_STORY.name} · {demo.seats.toLocaleString()} seats</strong>{DEMO_STORY.description}</p>
          <StackPlayground result={example} />
          <div className="example-outcome"><strong>{money(example.recurringAnnualBenefit)} less per year</strong><span>{Math.round(example.recurringAnnualBenefit / example.currentAnnualTotal * 100)}% lower recurring cost, with no E7 discount assumed.</span></div>
          <div className="example-row"><span>{demo.assumptions.horizonYears}-year net cash benefit</span><strong>{money(example.tcoNetBenefit)}</strong></div>
          <div className="example-row"><span>Modeled payback</span><strong>Month {example.paybackMonths}</strong></div>
        </div>
        <p className="folio-footnote"><strong>Built from a scenario, not a sales claim.</strong> Synthetic USD inputs assume full replacement of {example.scoredLines.filter(line => line.annualCredit > 0).length + example.scoredAddOns.filter(line => line.annualCredit > 0).length} paid tools, {money(example.migrationTotal)} transition cost and two months before retirement savings. Backup and e-signature stay paid. Explore the example to see every amount.</p>
      </section>
    </div>
    <div className="landing-path">
      <section><h2>Find the budget already there</h2><p>Capture the AI, identity, security and productivity tools you buy today. See which invoices could offset the E7 upgrade.</p></section>
      <section><h2>Build a realistic path</h2><p>Model full replacement for covered tools. Keep specialist services separate, and allow for migration costs and renewal dates.</p></section>
      <section><h2>Make the decision together</h2><p>Take finance a reconciled cash case and IT a focused evaluation plan. Save, share or present the numbers — even when they show a cost increase.</p></section>
    </div>
  </div>;
}
