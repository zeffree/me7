import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getBaseline } from '@/data/skus';
import { getDomain } from '@/data/categories';
import type { EvidenceAssessment } from '@/data/evidence';
import type { EvidenceStatus } from '@/data/sources';
import { buildAuditLog, matchesAuditQuery, type AuditInvoice, type AuditLog } from '@/lib/audit';
import { formatCurrency, formatNumber } from '@/lib/format';
import { toAssessment, useAssessment } from '@/store/useAssessment';
import { Evidence } from '@/components/ui/Evidence';
import { SelectField, TextField } from '@/components/ui/Fields';
import { Badge, Button, SectionHeading } from '@/components/ui/Primitives';
import { TeiMethod } from '@/components/results/TeiMethod';

type SectionId = 'all' | 'current' | 'sources' | 'suites' | 'categories' | 'addons' | 'studies' | 'benefits' | 'seller';

const money = (amount: number, currency = 'USD') => `${formatCurrency(amount, currency, 2)} ${currency}`;
const stored = (value: string | number | boolean | null | undefined): string =>
  value === undefined || value === null ? 'Not recorded' : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value);

function Facts({ rows }: { rows: ReadonlyArray<readonly [string, ReactNode]> }) {
  return <dl className="evidence-list">{rows.map(([label, value]) =>
    <div className="evidence-item" key={label}><dt><strong>{label}</strong></dt><dd>{value}</dd></div>,
  )}</dl>;
}

function Status({ status }: { status?: EvidenceStatus }) {
  return <Badge tone={status === 'unverified' ? 'warning' : 'neutral'}>
    {status ? `Evidence: ${status}` : 'Evidence status not recorded'}
  </Badge>;
}

function RecordDisclosure({ title, recordId, status, children, context }: {
  title: string; recordId: string; status?: EvidenceStatus; context?: string; children: ReactNode;
}) {
  return <details className="disclosure">
    <summary>{title}{context ? ` · ${context}` : ''}</summary>
    <div className="study-block">
      <h3>{title}</h3>
      <p>Record: {recordId}{status && <> · <Status status={status} /></>}</p>
      {children}
    </div>
  </details>;
}

function ReviewEvidence({ evidence, title }: { evidence: EvidenceAssessment; title: string }) {
  return <div className="section-block">
    <p><strong>{title}</strong> · <Status status={evidence.status} /></p>
    <p className="detail-copy">Reviewed {evidence.reviewedAt} · Customer review recommended by this evidence record: {stored(evidence.requiresConfirmation)}. This source recommendation is not an amount-confirmation gate in model v3.</p>
    <Evidence title={`${title}: source records and conditions`} sourceIds={evidence.sourceIds} conditions={evidence.conditions} />
  </div>;
}

function YearValues({ values, caption }: { values: readonly number[]; caption: string }) {
  return <div className="table-scroll"><table>
    <caption>{caption}</caption>
    <thead><tr><th scope="col">Year</th><th scope="col" className="numeric">Amount (USD)</th></tr></thead>
    <tbody>{values.map((amount, year) => <tr key={year}>
      <th scope="row">{year + 1}</th><td className="numeric">{money(amount)}</td>
    </tr>)}</tbody>
  </table></div>;
}

function Derivation({ published, divisor, normalized, caption }: {
  published: readonly number[]; divisor: readonly number[]; normalized: readonly number[]; caption: string;
}) {
  return <div className="table-scroll"><table>
    <caption>{caption}</caption>
    <thead><tr>
      <th scope="col">Study year</th><th scope="col" className="numeric">Stored published amount (USD)</th>
      <th scope="col" className="numeric">App population divisor</th><th scope="col" className="numeric">Derived USD / modeled seat / year</th>
    </tr></thead>
    <tbody>{published.map((amount, year) => <tr key={year}>
      <th scope="row">{year + 1}</th><td className="numeric">{money(amount)}</td>
      <td className="numeric">{formatNumber(divisor[year])}</td><td className="numeric">{money(normalized[year])}</td>
    </tr>)}</tbody>
  </table></div>;
}

function InvoiceRecord({ record, currency }: { record: AuditInvoice; currency: string }) {
  const line = record.input;
  return <RecordDisclosure title={record.title} recordId={record.id} status={record.evidence.status}
    context={!record.catalogKnown ? 'Recovered unknown invoice' : record.eligible ? 'Full replacement scenario' : 'No retirement credit'}>
    <Facts rows={[
      ['Kind / catalog identifier', `${record.kind} / ${record.catalogId}`],
      ['Catalog identity', record.catalogKnown ? 'Known in this model version' : 'Unknown; retained in full, with no retirement credit'],
      ['Entered amount', record.amountKnown
        ? `${money(line.mode === 'annual' ? line.annual! : line.pupm!, currency)} ${line.mode === 'annual' ? '/ year' : '/ user / month'}`
        : 'Unknown — not a confirmed zero'],
      ['Amount provenance', line.amountSource ?? 'Not recorded'],
      ['Invoice seats', line.seats === undefined ? 'Uses assessment workforce seats' : formatNumber(line.seats)],
      ['Legacy retained share (%) — not applied', line.retainPct ?? 'Not recorded'],
      ['Legacy customer confirmation — not applied', stored(line.assumptionConfirmed)],
      ['Current engine retirement eligibility', record.eligible ? 'Eligible under the current assumptions' : 'Not eligible'],
      ['Amount/retirement confirmation gate', 'Removed in model v3; full replacement is assumed, not verified'],
      ['Exclusion reason', record.exclusionReason ?? 'No exclusion reason returned by the engine'],
      ['Selected-baseline coverage', record.coverage ?? 'Not a category coverage record'],
      ['Annual spend contribution', `${money(record.annualSpend, currency)}${record.amountKnown ? '' : ' (numeric contribution only; amount remains unknown)'}`],
      ['Annual retirement credit', money(record.annualCredit, currency)],
      ['Annual retained spend', `${money(record.annualRetained, currency)}${record.amountKnown ? '' : ' (amount remains unknown)'}`],
      ['Stored savings delay (months)', stored(line.savingsDelayMonths)],
      ['Applied savings delay (months)', record.effectiveSavingsDelayMonths],
      ['Contract-end note (informational only)', 'contractEnd' in line ? line.contractEnd || 'Not recorded' : 'Not recorded'],
    ]} />
    <ReviewEvidence title="Replacement applicability" evidence={record.evidence} />
    <ReviewEvidence title="Reference amount provenance" evidence={record.priceEvidence} />
  </RecordDisclosure>;
}

function SourceRecord({ record }: { record: AuditLog['sources'][number] }) {
  const source = record.source;
  return <RecordDisclosure title={source.title} recordId={source.id} status={source.status} context={source.publisher}>
    <Facts rows={[
      ['Publisher', source.publisher],
      ['URL', source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.url} ↗</a> : 'No external source URL retained'],
      ['Reviewed claim / section', source.section],
      ['Published date', source.publishedDate ?? 'Not recorded'],
      ['Effective date', source.effectiveDate ?? 'Not recorded'],
      ['Review date', source.reviewedAt],
      ['Source currency', source.currency ?? 'Not specified / non-monetary record'],
      ['Units', source.unit], ['Commercial term', source.term], ['Region / offer scope', source.region],
    ]} />
    <div className="detail-copy section-block"><h4>Conditions and limitations</h4><ul>{source.conditions.map(condition => <li key={condition}>{condition}</li>)}</ul></div>
  </RecordDisclosure>;
}

function SuiteRecord({ record }: { record: AuditLog['suites'][number] }) {
  const sku = record.sku;
  return <RecordDisclosure title={sku.name} recordId={sku.id} status={record.evidence.status}
    context={record.selectedBaseline ? 'Selected baseline' : sku.id === 'm365e7' ? 'Target suite' : 'Other baseline'}>
    <p>{sku.tagline}</p>
    <Facts rows={[
      ['Stored list reference', `${money(sku.listPricePupm, sku.referenceCurrency)} / user / month`],
      ['Reference source IDs', sku.sourceIds.join(', ')],
      ...('generalAvailability' in sku ? [
        ['General availability', sku.generalAvailability], ['Published variant choices', sku.teamsVariants.join(', ')],
      ] as const : []),
    ]} />
    {'includes' in sku && <div className="detail-copy section-block">
      <h4>Catalog inclusion claims</h4><ul>{sku.includes.map(item => <li key={item}>{item}</li>)}</ul>
      <h4>Not included in this baseline</h4><ul>{sku.notIncluded.map(item => <li key={item}>{item}</li>)}</ul>
    </div>}
    {'deltaOverE5' in sku && <div className="detail-copy section-block"><h4>Recorded additions over E5</h4>
      <ul>{sku.deltaOverE5.map(item => <li key={item.name}><strong>{item.name}:</strong> {item.detail}</li>)}</ul>
    </div>}
    <ReviewEvidence title="Suite price and applicability review" evidence={record.evidence} />
    <Evidence title="All linked suite sources" sourceIds={record.sourceIds} />
  </RecordDisclosure>;
}

function CategoryRecord({ record, baselineName }: { record: AuditLog['categories'][number]; baselineName: string }) {
  const category = record.category;
  return <RecordDisclosure title={category.name} recordId={category.id} status={record.evidence.status} context={record.coverage}>
    <p>{category.whatItIs}</p>
    <Facts rows={[
      ['Domain', getDomain(category.domain).name],
      [`Coverage for ${baselineName}`, record.coverage],
      ['All baseline mappings', Object.entries(category.coverage).map(([id, coverage]) => `${id}: ${coverage}`).join(' · ')],
      ['E7 component', category.e7Component], ['Replacement rationale', category.whyReplaced],
      ['Catalog caveat', category.caveat ?? 'No additional category caveat recorded; evidence conditions still apply'],
      ['Example products (not edition equivalence)', `e.g. ${category.examples.join(' · ')}`],
      ['Legacy editorial suitability label (not a financial multiplier)', category.confidence],
      ['Illustrative benchmark', category.benchmarkPupm === 0
        ? '0 USD stored — no reference estimate; not free service'
        : `${money(category.benchmarkPupm)} / modeled user / month`],
      ['Stored typical adoption fraction', category.typicalAdoptionPct ?? 'Not specified; the engine defaults to the whole workforce'],
      ['Modeled adoption used for third-party context', `${record.modeledAdoption * 100}% of workforce (illustrative, not verified)`],
      ['Planned for deployment', stored(record.plannedForDeployment)],
      ['Capability cost avoided with E7', !record.currentAvoidedCapability
        ? 'Not a capability gap for the selected baseline'
        : !record.currentAvoidedCapability.priced
          ? 'No standalone Microsoft licence is priced for this capability; not valued'
          : `On its own: ${record.currentAvoidedCapability.standaloneLicenceNames.join(' + ') || 'already licensed'} for ${formatNumber(record.currentAvoidedCapability.users)} users, ${money(record.currentAvoidedCapability.standaloneAnnual)} / year${record.currentAvoidedLicence ? `; in the lowest-cost set via ${record.currentAvoidedLicence.licence.name} (${money(record.currentAvoidedLicence.annual)} / year for the licence)` : '; not selected'}; outside cash`],
      ['Seller talk track', category.talkTrack ?? 'No category-specific talk track recorded'],
    ]} />
    <ReviewEvidence title="Category applicability" evidence={record.evidence} />
    <ReviewEvidence title="Illustrative benchmark and adoption" evidence={record.benchmarkEvidence} />
  </RecordDisclosure>;
}

function AddOnRecord({ record }: { record: AuditLog['addOns'][number] }) {
  const addOn = record.addOn;
  return <RecordDisclosure title={addOn.name} recordId={addOn.id} status={record.evidence.status}
    context={addOn.absorbedByE7 ? 'Candidate entitlement overlap' : 'Not absorbed by E7'}>
    <p>{addOn.description}</p>
    <Facts rows={[
      ['Stored list reference', `${money(addOn.listPricePupm)} / user / month reference${addOn.listPricePupm === 0 ? ' — zero seed does not mean free' : ''}`],
      ['Absorbed by E7 in the catalog', stored(addOn.absorbedByE7)],
      ['Discovery relevance hints', addOn.relevantFor.map(id => getBaseline(id).name).join(', ')],
      ['Suggested for the selected baseline', `${stored(record.relevantToBaseline)}; this does not hide or discard entered invoices`],
      ['Pricing / unit note', addOn.note ?? 'No additional pricing note recorded; source review still applies'],
      ['Suite / component overlap hint', addOn.supersededBy ?? 'No superseding catalog SKU recorded'],
      ['Purchased capability overlap identifiers', addOn.capabilityIds?.join(', ') || 'No capability identifiers recorded'],
    ]} />
    <ReviewEvidence title="Add-on applicability" evidence={record.evidence} />
    <ReviewEvidence title="Add-on price reference" evidence={record.priceEvidence} />
  </RecordDisclosure>;
}

function StudyRecord({ record, enabled }: { record: AuditLog['studies'][number]; enabled: boolean }) {
  const study = record.study;
  return <RecordDisclosure title={study.title} recordId={study.id} status={record.evidence.status} context={study.published}>
    <Facts rows={[
      ['Original study', <a href={study.url} target="_blank" rel="noreferrer">{study.title} ↗</a>],
      ['Publication', study.published], ['Composite', study.composite], ['Prior state', study.priorState],
      ['Research base', study.researchBase], ['App divisor rationale', study.divisorNote],
      ['Normalization limitation', study.normalizationNote ?? 'No additional normalization note recorded'],
      ['Omitted cost limitation', study.omittedCostNote ?? 'No additional omitted-cost note recorded'],
      ['Baseline applicability filter', study.appliesTo.map(id => getBaseline(id).name).join(', ')],
      ['Adoption-scaled population', study.adoptionScaled ? 'Copilot active-adoption seats' : 'Assessment workforce seats'],
      ['Stored published benefits PV', money(study.publishedBenefitsPv)],
      ['Stored published costs PV', money(study.publishedCostsPv)],
      ['Stored published NPV', money(study.publishedNpv)],
      ['Stored published ROI', `${study.publishedRoiPct}%`], ['Stored published payback', study.publishedPayback],
      ['Current study treatment', !enabled ? 'Experiment switched off' : record.current.applies ? 'Study applies under current model inputs' : 'Not applicable to current inputs'],
      ['Current applicability reason', record.current.notApplicableReason ?? 'No baseline / existing-add-on exclusion returned'],
    ]} />
    <p className="detail-copy">These stored published figures belong to the source composite, not this assessment. The evidence status applies to the figures as well as the population.</p>
    {enabled && <div className="section-block">
      <p>{record.current.includedLineCount} benefit lines currently included · modeled benefit PV {money(record.current.presentValue)} · undiscounted total {money(record.current.total)}. This is not customer cash.</p>
      <YearValues values={record.current.byYear} caption="Current modeled study benefit by assessment year (USD; excluded lines contribute zero)" />
    </div>}
    <div className="section-block"><h4>Published cost lines and app treatment</h4>
      {study.publishedCostLines?.length ? <>
        <div className="table-scroll"><table>
          <caption>Stored original composite costs (USD), not a customer invoice</caption>
          <thead><tr><th scope="col">Reference / cost</th><th scope="col" className="numeric">Initial</th>
            <th scope="col" className="numeric">Year 1</th><th scope="col" className="numeric">Year 2</th>
            <th scope="col" className="numeric">Year 3</th><th scope="col" className="numeric">Published PV</th>
          </tr></thead><tbody>{study.publishedCostLines.map(cost => <tr key={cost.ref}>
            <th scope="row">{cost.ref} · {cost.name}</th><td className="numeric">{money(cost.initial)}</td>
            {cost.published.map((amount, year) => <td className="numeric" key={year}>{money(amount)}</td>)}
            <td className="numeric">{money(cost.publishedPv)}</td>
          </tr>)}</tbody>
        </table></div>
        <div className="detail-copy"><ul>{study.publishedCostLines.map(cost => <li key={cost.ref}>
          <strong>{cost.ref} · {cost.treatment}:</strong> {cost.reviewCondition}
        </li>)}</ul></div>
      </> : <p>Individual original cost lines are not retained in this registry. The stored headline costs do not establish a complete or verified cost model.</p>}
    </div>
    <div className="section-block"><h4>Source benefit lines deliberately not modeled</h4>
      {study.excluded?.length ? <div className="detail-copy"><ul>{study.excluded.map(line => <li key={line.name}>
        <strong>{line.name} · published PV {money(line.publishedPv)}:</strong> {line.reason}
      </li>)}</ul></div> : <p>No separately excluded source lines are recorded. This is not a claim that every original source line was verified or reproduced.</p>}
    </div>
    <ReviewEvidence title="Study source and normalization" evidence={record.evidence} />
  </RecordDisclosure>;
}

function BenefitRecord({ record, enabled }: { record: AuditLog['benefits'][number]; enabled: boolean }) {
  const line = record.line;
  return <RecordDisclosure title={`${line.ref} · ${line.name}`} recordId={line.id} status={record.evidence.status} context={record.studyId}>
    <p>{record.studyTitle}</p><p>{line.detail}</p>
    <Facts rows={[
      ['Benefit kind', line.kind], ['Study risk adjustment already in published values', line.riskAdjustmentPct === undefined ? 'Not recorded on this line' : `${line.riskAdjustmentPct}%`],
      ['Default selection', record.defaultIncluded ? 'On' : 'Off'],
      ['Saved customer override', record.override === undefined ? 'None; using default' : record.override ? 'On' : 'Off'],
      ['Selection before study applicability', record.selected ? 'On' : 'Off'],
      ['Current engine inclusion', enabled && record.current.included ? 'Included in the experiment only' : 'Not included'],
      ['Study exclusion reason', record.studyExclusionReason ?? 'No baseline / ownership exclusion returned'],
      ['Overlap review group', line.overlapGroup ?? 'Not recorded'],
      ['Potential cash duplication', line.doubleCounts ?? 'No line-specific duplication note recorded; combination gates still apply'],
      ['Caution', line.caution ?? 'No additional line-specific caution recorded'],
      ['Applied population when scaling', `${formatNumber(record.current.appliedSeats)} modeled seats`],
    ]} />
    <Derivation published={line.published} divisor={line.divisor} normalized={record.normalizedByYear}
      caption="Original stored annual values ÷ app normalization population. Derived rates are not published customer forecasts; source review status applies." />
    {enabled ? <div className="section-block">
      <YearValues values={record.current.byYear} caption="Current scaled contribution after selection, applicability, adoption and scenario realization (USD; not cash)" />
      <p>Modeled PV: {money(record.current.presentValue)} · Undiscounted modeled total: {money(record.current.total)}.</p>
    </div> : <p>The experiment is switched off. No scaled contribution is active; the original review record remains available.</p>}
    <ReviewEvidence title="Benefit-line evidence and limitations" evidence={record.evidence} />
  </RecordDisclosure>;
}

function TrainingRecord({ log }: { log: AuditLog }) {
  const training = log.training;
  return <details className="disclosure"><summary>Published Copilot training cost normalization and current treatment</summary>
    <div className="study-block">
      <Status status={training.source.evidenceStatus} /><p>{training.source.conditions}</p>
      <Derivation published={training.source.published} divisor={training.source.divisor} normalized={training.normalizedByYear}
        caption="Training and employee discovery only (Copilot source Ftr); not all implementation or administration costs" />
      <Facts rows={[
        ['Training-cost inclusion setting', stored(log.assessment.tei.includeEnablementCost)],
        ['Omitted training overlap confirmation', stored(log.assessment.tei.enablementOverlapReviewed)],
        ['Current Copilot adoption population', formatNumber(log.tei.copilotSeats)],
        ['Combined simulation availability', log.tei.canCombine ? 'Allowed by the current engine gates' : 'Withheld; see current study-combination warnings'],
        ['Combined simulation training total', log.tei.canCombine ? money(log.tei.enablementTotal) : 'Withheld, not a zero-cost conclusion'],
        ['Discount rate', `${training.discountRate * 100}% annually`],
      ]} />
      <Evidence sourceIds={training.source.sourceIds} conditions={[training.source.conditions]} />
    </div>
  </details>;
}

export function AuditPage({ onBack }: { onBack: () => void }) {
  const pageRef = useRef<HTMLDivElement>(null);
  const state = useAssessment();
  const log = useMemo(() => buildAuditLog(toAssessment(state)), [state]);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<SectionId>('all');
  useEffect(() => {
    pageRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }, []);
  const baselineName = getBaseline(log.assessment.baseline).name;
  const select = <T extends { searchText: string },>(records: readonly T[]) => records.filter(record => matchesAuditQuery(record, query));
  const currentCount = log.assumptions.length + log.invoices.length + log.warnings.length;
  const sellerCount = log.battlecards.length + log.objections.length + log.discovery.length;
  const sections: Array<{ id: Exclude<SectionId, 'all'>; title: string; total: number; matched: number; content: ReactNode }> = [
    {
      id: 'current', title: 'Current assessment and scenario trace', total: currentCount,
      matched: select(log.assumptions).length + select(log.invoices).length + select(log.warnings).length,
      content: <>
        <p>This is the current input snapshot, not a historical audit trail. {log.unknownInvoices.length} recovered unknown invoice records remain retained by the engine. Source flags never change merely because a customer confirms an assumption.</p>
        <h3>Warnings and model gates</h3>
        {select(log.warnings).length ? <div className="detail-copy"><ul>{select(log.warnings).map(warning =>
          <li key={warning.id}><strong>{warning.origin}:</strong> {warning.message}</li>,
        )}</ul></div> : <p>{query.trim() ? 'No warnings match this search.' : 'No current engine, saved-review or study-combination warnings.'}</p>}
        <div className="section-block"><h3>Stored assumptions and provenance</h3>
          {select(log.assumptions).map(record => <RecordDisclosure key={record.id} title={record.title} recordId={record.id}>
            <Facts rows={record.entries.map(([label, value]) => [label, stored(value)] as const)} />
            {record.sourceIds.length > 0 && <Evidence sourceIds={record.sourceIds} />}
          </RecordDisclosure>)}
        </div>
        <div className="section-block"><h3>Invoice-level scenario and legacy input trace</h3>
          {select(log.invoices).map(record => <InvoiceRecord key={record.id} record={record} currency={log.assessment.currency} />)}
          {!log.invoices.length && <p>No third-party or Microsoft add-on invoices are entered. An empty inventory is not evidence of zero spend.</p>}
          {!!log.invoices.length && !select(log.invoices).length && <p>No invoice records match this search.</p>}
        </div>
      </>,
    },
    {
      id: 'sources', title: 'Source registry', total: log.sources.length, matched: select(log.sources).length,
      content: <><p>A status covers only the recorded claim or section, not every statement on the linked page. Missing dates and URLs are shown explicitly.</p>
        {select(log.sources).map(record => <SourceRecord key={record.id} record={record} />)}</>,
    },
    {
      id: 'suites', title: 'Baseline and E7 suite references', total: log.suites.length, matched: select(log.suites).length,
      content: <><p>{log.packaging.summary}</p><p>{log.packaging.impact}</p>
        <Facts rows={[
          ['Reference pricing period', log.metadata.pricingAsOf], ['Price effective date', log.packaging.pricingEffectiveDate],
          ['Stated packaging rollout completion', log.packaging.rolloutCompleteDate],
        ]} />
        <Evidence title="Packaging update sources" sourceIds={log.packaging.sourceIds} />
        {select(log.suites).map(record => <SuiteRecord key={record.id} record={record} />)}</>,
    },
    {
      id: 'categories', title: 'Category applicability and illustrative benchmarks', total: log.categories.length, matched: select(log.categories).length,
      content: <><p>Coverage is shown against {baselineName}. “Already” means relevant baseline capability, not proven duplicate spend. Benchmarks and adoption remain illustrative USD model assumptions.</p>
        {select(log.categories).map(record => <CategoryRecord key={record.id} record={record} baselineName={baselineName} />)}</>,
    },
    {
      id: 'addons', title: 'Microsoft add-on applicability and price references', total: log.addOns.length, matched: select(log.addOns).length,
      content: <><p>All add-ons are retained here, including those not suggested for {baselineName} and those not absorbed by E7. Discovery relevance is not financial eligibility.</p>
        {select(log.addOns).map(record => <AddOnRecord key={record.id} record={record} />)}</>,
    },
    {
      id: 'studies', title: 'TEI study reviews, source costs and exclusions', total: log.studies.length, matched: select(log.studies).length,
      content: <><p>Original study records are visible even when the experiment is off or a study is not applicable. This is not an E7 study or a customer forecast.</p>
        <TeiMethod /><TrainingRecord log={log} />
        {select(log.studies).map(record => <StudyRecord key={record.id} record={record} enabled={log.tei.enabled} />)}</>,
    },
    {
      id: 'benefits', title: 'TEI benefit-line review and derivation', total: log.benefits.length, matched: select(log.benefits).length,
      content: <><p>Every stored benefit line, including unverified E5 records, remains reviewable. Published values and app population divisors stay separate from current simulated contributions.</p>
        {select(log.benefits).map(record => <BenefitRecord key={record.id} record={record} enabled={log.tei.enabled} />)}</>,
    },
    {
      id: 'seller', title: 'Seller guidance, source status and limitations', total: sellerCount,
      matched: select(log.battlecards).length + select(log.objections).length + select(log.discovery).length,
      content: <><p>All guidance is retained, not only current vendor matches or relevant objections. These are discussion hypotheses, not independently verified product comparisons. Comparative statements must be validated for the actual workload. Reference amounts in this guidance are USD, not converted quotes.</p>
        <h3>Vendor discussion records</h3>
        {select(log.battlecards).map(record => <RecordDisclosure key={record.id} title={record.title} recordId={record.id}
          status={record.card.evidenceStatus} context={record.matchesCurrentInvoice ? 'Matches an entered invoice' : 'No current vendor match'}>
          <Facts rows={[
            ['Candidate capability', record.card.counter], ['Evaluation opportunity', record.card.wedge],
            ['Reasons to retain the incumbent', record.card.theyWin], ['Overclaim to avoid', record.card.trap],
            ['Vendor matching pattern', record.matchPattern],
          ]} /><Evidence sourceIds={record.sourceIds} title="Seller guidance source context (not proof of product parity)" />
        </RecordDisclosure>)}
        <div className="section-block"><h3>Objection records</h3>
          {select(log.objections).map(record => <RecordDisclosure key={record.id} title={record.title} recordId={record.id}
            status={record.objection.evidenceStatus} context={record.relevantToCurrentCase ? 'Relevant to current case' : 'Outside current case filter'}>
            <Facts rows={[
              ['Acknowledge', record.objection.concede], ['Discussion response', record.objection.answer],
              ['Applicability', record.condition],
            ]} /><Evidence sourceIds={record.sourceIds} title="Objection source context and limitations" />
          </RecordDisclosure>)}
        </div>
        <div className="section-block"><h3>Discovery questions and uncaptured-spend prompts</h3>
          {select(log.discovery).map(record => <RecordDisclosure key={record.id} title={record.title} recordId={record.id}>
            <p>No source IDs, evidence status or independent review date are supplied for these editorial prompts.</p>
            <div className="detail-copy"><ul>{record.questions.map(question => <li key={question}>{question}</li>)}</ul></div>
            <p><strong>When no spend is captured:</strong> {record.gapProbe}</p>
          </RecordDisclosure>)}
        </div>
      </>,
    },
  ];
  const available = sections.filter(item => section === 'all' || section === item.id);
  const shown = available.filter(item => item.matched > 0);
  const matchCount = shown.reduce((count, item) => count + item.matched, 0);
  const options: Array<{ value: SectionId; label: string }> = [
    { value: 'all', label: 'All reference sections' },
    ...sections.map(item => ({ value: item.id, label: `${item.title} (${item.total})` })),
  ];

  return <div className="audit-page" ref={pageRef}>
    <Button variant="secondary" onClick={onBack}>Back to assessment</Button>
    <SectionHeading title="Administrative evidence reference"
      description="Sources, applicability, model limitations and the current assessment’s assumption trace — separate from the customer-facing business case." />
    <p><strong>Client-only and not access-controlled.</strong> Anyone using this assessment can open this page. It is a read-only reference, not a private administration area or a historical audit system. Search and section filters do not change the assessment.</p>
    <p className="detail-copy">Model version {log.metadata.modelVersion} · Source version {log.metadata.sourceVersion} · Evidence version {log.metadata.evidenceVersion} · Reviewed {log.metadata.reviewedAt} · Pricing reference {log.metadata.pricingAsOf}. These are registry review dates, not a live check or a customer confirmation date.</p>
    {log.missingSourceIds.length > 0 && <p role="alert">Missing source records: {log.missingSourceIds.join(', ')}. No verified evidence can be inferred for these links.</p>}
    <div className="field-grid section-block">
      <TextField label="Search reference records" value={query} onChange={setQuery} placeholder="Product, source ID, condition or amount"
        hint="Searches every record and its linked source text; all entered search terms must match." />
      <SelectField label="Reference section" value={section} onChange={setSection} options={options}
        hint="Filtering changes this reference view only, never the selected baseline or assessment step." />
    </div>
    <p role="status" aria-live="polite">{matchCount} matching records in {shown.length} sections.</p>
    {(query || section !== 'all') && <Button variant="ghost" size="sm" onClick={() => { setQuery(''); setSection('all'); }}>Clear reference filters</Button>}
    {!shown.length && <div className="section-block"><h2>No matching reference records</h2><p>Try a shorter product name or source ID, choose another section, or clear the reference filters.</p></div>}
    {shown.map(item => <section className="section-block" key={item.id} aria-labelledby={`audit-${item.id}`}>
      <h2 id={`audit-${item.id}`}>{item.title}</h2>
      <details className="disclosure" open={query.trim() !== '' || section !== 'all' || item.id === 'current' ? true : undefined}>
        <summary>Browse {item.matched} of {item.total} records</summary>
        {item.content}
      </details>
    </section>)}
  </div>;
}
