import { useState } from 'react';
import { ArrowRight, Copy } from 'lucide-react';
import type { Assessment, EngineResult } from '@/model/types';
import { useAssessment, toAssessment } from '@/store/useAssessment';
import { formatCurrency } from '@/lib/format';
import { copyToClipboard } from '@/lib/export';
import { buildPresenterCase } from '@/lib/presenter';
import { Button } from '@/components/ui/Primitives';
import { DISCOVERY_QUESTIONS, findBattlecards, OBJECTIONS, type DealContext } from '@/data/sellerPlays';
import { DOMAINS } from '@/data/categories';
import { E7_SKU, getBaseline } from '@/data/skus';
import { CostComparisonBars } from './CostComparisonBars';
import { APP_ROUTES } from '@/components/layout/appRoute';

export function PresenterContent({ assessment, result }: { assessment: Assessment; result: EngineResult }) {
  const [message, setMessage] = useState('');
  const money = (value: number) => formatCurrency(value, assessment.currency);
  const story = buildPresenterCase(assessment, result);
  const vendorGuides = findBattlecards(assessment.lines.map(line => line.vendor));
  const context: DealContext = {
    baseline: assessment.baseline, seats: assessment.seats, netAnnual: result.recurringAnnualBenefit,
    upliftAnnual: result.uplift, redundantToday: story.baselineOpportunity,
    notCoveredAnnual: result.buckets.find(bucket => bucket.bucket === 'not-covered')?.grossSpend ?? 0,
    capturedLines: assessment.lines.length, avoidedLicenceAnnual: result.costAvoidance.annualAvoided,
  };
  const payback = result.paybackStatus === 'reached' ? `Month ${result.paybackMonths}`
    : result.paybackStatus === 'no-investment' ? 'No initial cash deficit'
      : result.paybackStatus === 'break-even' ? 'Break-even'
        : `Not reached in ${result.tco.length} years`;
  const activeDomains = new Set(result.scoredLines.map(line => line.category.domain));
  return <section className="presenter-content presenter-workspace">
    <header className="presenter-heading"><h2>Lead the E7 decision, not just the price discussion.</h2><p>Use the customer’s workflows, the actual cost bridge and a staged migration plan. Presenter guidance is optional and is not private or access-controlled.</p></header>
    <div className="presenter-case">
      <section><h3>{story.verdict}</h3>
        <p>{result.recurringAnnualBenefit > 0 ? `Retiring the eligible invoices releases ${money(result.totalAnnualSavings)} a year. Use that existing budget to explain the move, rather than treating E7 as another tool on top.` : 'Do not present an increase as savings. Complete the invoice inventory, test the required capabilities and establish whether the additional investment is justified.'}</p>
        <dl className="presenter-bridge">
          <div><dt>Full annual invoice retirement</dt><dd>{money(result.totalAnnualSavings)}</dd></div>
          <div><dt>{result.uplift >= 0 ? 'Less: suite licence uplift' : 'Plus: suite licence reduction'}</dt><dd>{money(Math.abs(result.uplift))}</dd></div>
          <div><dt>Net annual {story.change}</dt><dd>{money(Math.abs(result.recurringAnnualBenefit))}</dd></div>
        </dl>
      </section>
      <CostComparisonBars current={result.currentAnnualTotal} future={result.futureAnnualTotal} currency={assessment.currency} />
    </div>
    <section className="presenter-section">
      <h3>Explain what changes in the operating model</h3>
      <div className="capability-route estate-route">
        <div><small>Today</small><strong>{getBaseline(assessment.baseline).shortName} + separate contracts</strong><p>{assessment.lines.length} third-party and {assessment.addOns.length} add-on invoice lines in this assessment.</p></div>
        <ArrowRight aria-hidden="true" />
        <div><small>Proposed</small><strong>Microsoft 365 E7 + specialist services</strong><p>{story.retirementCandidates.length} invoice retirement candidates. {money(story.retainedAnnual)} a year stays outside the E7 licence.</p></div>
      </div>
      <div className="e7-capability-map">
        <div className="suite-foundation"><h4>Microsoft 365 E5 foundation</h4><p>Productivity, advanced security and compliance. {assessment.baseline === 'm365e5' ? 'Already part of the current baseline; do not sell it as new.' : 'Compare the higher-tier controls with the workflows and tools in use today.'}</p></div>
        <dl>{E7_SKU.deltaOverE5.map(component => <div key={component.name}><dt>{component.name}</dt><dd>{component.name === 'Microsoft 365 Copilot' ? 'Ground assistance in work data and bring it into the applications employees already use. Demonstrate one repeatable job, not a generic chat demo.' : component.name === 'Agent 365' ? 'Give the agent rollout an identity, policy and oversight plan. Governance is not a substitute for separately priced agent execution.' : 'Connect workforce access and identity lifecycle decisions. Demonstrate the required private access, internet access and governance paths.'}</dd></div>)}</dl>
      </div>
      <p className="architecture-entry no-print"><a href={APP_ROUTES.architecture.href}>Explore the interactive E7 architecture<ArrowRight aria-hidden="true" /></a></p>
    </section>
    <section className="presenter-section">
      <h3>Start with the invoices that matter most</h3>
      <p>Lead with the largest funding opportunities, then connect each one to a workload demonstration.</p>
      {story.retirementCandidates.length ? <div className="table-scroll"><table className="presenter-priorities">
        <caption>Largest modeled retirements · full replacement assumed · USD / year</caption>
        <thead><tr><th scope="col">Current paid tool</th><th scope="col">E7 route to evaluate</th><th scope="col" className="numeric">Annual retirement</th></tr></thead>
        <tbody>{story.retirementCandidates.slice(0, 5).map(item => <tr key={item.id}><td><strong>{item.name}</strong>{item.baselineOpportunity && <small>Also a current-suite optimization opportunity</small>}</td><td>{item.capability}</td><td className="numeric">{money(item.annualCredit)}</td></tr>)}</tbody>
      </table></div> : <p className="discussion-prompt">No retirement savings are captured yet. Start with an invoice, the users it covers and the workflow it supports; an unused capability is not a cash saving.</p>}
      {story.baselineOpportunity > 0 && <p className="discussion-prompt"><strong>Separate cleanup from the upgrade.</strong> {money(story.baselineOpportunity)} of the third-party retirement maps to capabilities already in {getBaseline(assessment.baseline).shortName}. That opportunity is part of the consolidation case, but is not unique to E7.</p>}
    </section>
    <section className="presenter-section">
      <h3>Show the path from purchase to payback</h3>
      <ol className="migration-timeline">
        <li><strong>Start</strong><span>{money(result.migrationTotal)} transition investment</span><small>E7 licence cost begins immediately.</small></li>
        <li><strong>{story.firstSavingsMonth === null ? 'No retirement in horizon' : `Month ${story.firstSavingsMonth}`}</strong><span>{story.firstSavingsMonth === null ? 'No invoice savings begin in this window.' : 'First modeled invoice savings begin'}</span><small>{assessment.assumptions.transitionEnabled ? 'Individual cancellation delays set the schedule.' : 'Simple mode assumes immediate retirement.'}</small></li>
        <li><strong>{payback}</strong><span>{result.paybackStatus === 'reached' ? 'Cumulative cash position recovers' : 'Cash recovery outcome'}</span><small>Year-one net benefit: {money(result.year1NetBenefit)}.</small></li>
      </ol>
      <div className="table-scroll"><table className="presenter-actions"><caption>Turn the discussion into a decision</caption><thead><tr><th scope="col">Owner</th><th scope="col">Bring to the workshop</th><th scope="col">Decision to leave with</th></tr></thead><tbody>
        <tr><th scope="row">Finance &amp; procurement</th><td>Licence quote, invoice scope, renewal dates and termination terms.</td><td>Agreed cost baseline and the dates savings can start.</td></tr>
        <tr><th scope="row">IT &amp; security</th><td>Required integrations, supported devices, policy and operational workflows.</td><td>A representative pilot and measurable acceptance criteria.</td></tr>
        <tr><th scope="row">Business sponsor</th><td>Two or three everyday jobs where Copilot should earn adoption.</td><td>A named owner, adoption plan and funded cutover milestone.</td></tr>
      </tbody></table></div>
    </section>
    <section className="presenter-section"><h3>A concise executive readout</h3><p className="presenter-readout">{story.summary}</p>
      <Button className="no-print" variant="secondary" size="sm" onClick={async () => setMessage(await copyToClipboard(story.summary) ? 'Summary copied.' : 'Copy failed. Select and copy the summary text above.')}><Copy />Copy discussion summary</Button>{message && <p role="status">{message}</p>}
    </section>
    <details className="disclosure print-expand"><summary>Vendor-specific discussion guides · {vendorGuides.length} matches</summary>
      {vendorGuides.length ? vendorGuides.map(guide => <article className="presenter-guide" key={guide.vendor}><h3>{guide.vendor}</h3><dl className="discussion-guide">
        <div><dt>Evaluate</dt><dd>{guide.counter}</dd></div><div><dt>Open with</dt><dd>{guide.wedge}</dd></div>
        <div><dt>Test the fit</dt><dd>{guide.theyWin}</dd></div><div><dt>Avoid the overclaim</dt><dd>{guide.trap}</dd></div>
      </dl></article>) : <p>Enter actual product names in the inventory to match targeted guides. For this case, use the capability routes and workshop plan above.</p>}
    </details>
    <details className="disclosure print-expand"><summary>Handle the questions this case is likely to raise</summary>{OBJECTIONS.filter(item => !item.when || item.when(context)).map(item => <article className="presenter-guide" key={item.id}><h3>{item.objection}</h3><dl className="discussion-guide"><div><dt>Acknowledge</dt><dd>{item.concede}</dd></div><div><dt>Explore</dt><dd>{item.answer}</dd></div></dl></article>)}</details>
    <details className="disclosure print-expand"><summary>Discovery prompts for the areas in this assessment</summary>{DOMAINS.filter(domain => activeDomains.size === 0 || activeDomains.has(domain.id)).map(domain => <section className="presenter-guide" key={domain.id}><h3>{domain.name}</h3><ul>{DISCOVERY_QUESTIONS[domain.id].map(question => <li key={question}>{question}</li>)}</ul></section>)}</details>
  </section>;
}

export function SellerWorkspace({ result }: { result: EngineResult }) {
  const assessment = toAssessment(useAssessment());
  return <PresenterContent assessment={assessment} result={result} />;
}
