import type { TeiResult } from '@/model/types';
import { TEI_STUDIES } from '@/data/teiStudies';
import { useAssessment } from '@/store/useAssessment';
import { formatCurrency, formatPercent } from '@/lib/format';
import { NumberField, Toggle } from '@/components/ui/Fields';
import { Note } from '@/components/ui/Primitives';

export function TeiPanel({ tei, currency }: { tei: TeiResult; currency: string }) {
  const s = useAssessment();
  return <section className="section-block">
    <details className="disclosure" open={s.tei.enabled || undefined}><summary>Optional · experimental TEI studies</summary>
      <h2>Explore the studies separately</h2>
      <p className="detail-copy" style={{ margin: '12px 0' }}>Commissioned Forrester studies can help frame a discussion about productivity and risk. They are not an E7 forecast, a customer promise or additional cash savings.</p>
      <Toggle checked={s.tei.enabled} onChange={s.toggleTei} label="Enable experimental study estimates" description="Off by default. Each study stays in USD and separate from the cash business case." />
      {tei.enabled && <>
        <Note tone="warning">All study amounts are <strong>USD</strong>. {currency !== 'USD' ? `Your assessment is ${currency}; combined cash ROI and NPV are withheld. No FX conversion is supplied.` : 'Do not add standalone study totals together without resolving overlapping benefits.'}</Note>
        <div className="field-grid" style={{ margin: '22px 0' }}>
          <NumberField label="Active Copilot adoption" value={s.tei.copilotAdoptionPct} onChange={s.setTeiAdoption} max={100} suffix="%" hint="Share of assessment seats expected to actively use Copilot." />
          <NumberField label="Study benefit realization scenario" value={s.tei.confidencePct} onChange={s.setTeiConfidence} max={100} suffix="%" hint="Experimental scaling only; never applied to invoice savings." />
        </div>
        {TEI_STUDIES.map(study => {
          const summary = tei.studies.find(x => x.studyId === study.id);
          const lines = tei.scoredLines.filter(x => x.studyId === study.id);
          return <article className="study-block" key={study.id}>
            <h3>{study.title}</h3><p>{study.published} · Microsoft-commissioned Forrester study</p>
            {!summary?.applies ? <p className="note" style={{ marginTop: 16 }}>{summary?.notApplicableReason || 'Not incremental to the selected baseline.'}</p> : <>
              <p className="study-total">USD {formatCurrency(summary.presentValue, 'USD')} <small style={{ fontWeight: 400 }}>benefit present value</small></p>
              <p>{summary.includedLineCount} benefit lines selected · {s.assumptions.horizonYears}-year scenario · no per-study ROI</p>
              <details className="disclosure"><summary>Select benefits for this scenario</summary>
                {lines.map(item => <div className="study-line" key={item.lineId}>
                  <Toggle checked={item.included} onChange={v => s.setTeiLineOverride(item.lineId, v)} label={`${item.line.ref} · ${item.line.name}`} description={item.line.detail} />
                  {(item.suppressedReason || item.line.doubleCounts) && <p>{item.suppressedReason || item.line.doubleCounts}</p>}
                  {item.line.overlapGroup && <p>Overlap group: {item.line.overlapGroup}. Retain at most one distinct benefit in this group before combining.</p>}
                  <p>Year-one scenario estimate: USD {formatCurrency(item.byYear[0] ?? 0, 'USD')}{item.included ? '' : ' (not included)'}</p>
                </div>)}
              </details>
            </>}
          </article>;
        })}
        <details className="disclosure"><summary>Optional combined experiment · overlap review required</summary>
          <div className="detail-copy"><p>First inspect every selected line above. Remove overlapping productivity, risk, IT administration and invoice-retirement benefits. A checked warning is not an allocation.</p></div>
          <Toggle checked={s.tei.includeEnablementCost} onChange={() => {
            const excludingTraining = s.tei.includeEnablementCost;
            if (excludingTraining && !window.confirm('Exclude the study’s training cost only if you have explicitly accounted for the same training in the transition budget. This may not cover all implementation costs. Confirm that you reviewed this exact overlap.')) return;
            s.toggleTeiEnablementCost();
            if (excludingTraining) s.setTeiEnablementOverlapReviewed(true);
          }} label="Include the Copilot study’s training / enablement cost" description="On by default. A migration-cost entry alone is not proof this cost is already included. Other implementation costs still need review." />
          <Toggle checked={s.tei.combinedReviewed === true} onChange={s.setTeiCombinedReviewed} label="I have reviewed selected benefit and implementation-cost overlaps" description="This explicit review does not bypass incompatible currencies or unresolved overlap groups. Changing the selected study benefits requires a new review." />
          {!tei.canCombine ? <Note tone="warning"><strong>Combined ROI / NPV withheld.</strong><ul>{tei.combinationWarnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></Note> : <>
            <Note>Experimental combined scenario only. Common cash benefits and common investment are included once. It does not change your cash business case.</Note>
            <dl className="outcome-details"><div><dt>Combined benefit PV · USD</dt><dd>{formatCurrency(tei.totalBenefitPv, 'USD')}</dd></div><div><dt>Combined investment PV · USD</dt><dd>{formatCurrency(tei.costPv, 'USD')}</dd></div><div><dt>Experimental NPV · USD</dt><dd>{tei.npv === null ? 'Not available' : formatCurrency(tei.npv, 'USD')}</dd><small>ROI: {tei.roiPct === null ? 'Not meaningful for this cost basis' : formatPercent(tei.roiPct)}</small></div></dl>
            <div className="table-scroll"><table><caption>Experimental combined annual flows, USD.</caption><thead><tr><th scope="col">Year</th><th scope="col" className="numeric">Study value</th><th scope="col" className="numeric">Cash retirement</th><th scope="col" className="numeric">Cost</th><th scope="col" className="numeric">Net</th></tr></thead><tbody>{tei.years.map(y => <tr key={y.year}><th scope="row">{y.year}</th><td className="numeric">{formatCurrency(y.teiBenefit, 'USD')}</td><td className="numeric">{formatCurrency(y.cashBenefit, 'USD')}</td><td className="numeric">{formatCurrency(y.cost, 'USD')}</td><td className="numeric">{formatCurrency(y.net, 'USD')}</td></tr>)}</tbody></table></div>
          </>}
        </details>
      </>}
    </details>
  </section>;
}
