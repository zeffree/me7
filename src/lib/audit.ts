import { CATEGORIES, DOMAINS } from '@/data/categories';
import {
  getAddOnEvidence, getAddOnPriceEvidence, getBenchmarkEvidence, getCategoryEvidence,
  getSuiteEvidence, getTeiEvidence,
} from '@/data/evidence';
import { MS_ADD_ONS } from '@/data/msAddOns';
import { BATTLECARDS, DISCOVERY_QUESTIONS, GAP_PROBES, OBJECTIONS, type DealContext } from '@/data/sellerPlays';
import { BASELINE_SKUS, E7_SKU, PACKAGING_UPDATE, PRICING_AS_OF } from '@/data/skus';
import { EVIDENCE_REVIEW_DATE, EVIDENCE_VERSION, SOURCE_VERSION, SOURCES, getSource } from '@/data/sources';
import {
  COPILOT_ENABLEMENT_PER_SEAT, COPILOT_ENABLEMENT_SOURCE, TEI_DISCOUNT_RATE,
  TEI_STUDIES, isLineOnByDefault, perSeatRate,
} from '@/data/teiStudies';
import { MODEL_VERSION, annualiseLine, computeAssessment } from '@/model/engine';
import { computeTei, isLineIncluded } from '@/model/tei';
import type { AddOnLine, Assessment, ScoredAddOn, ScoredLine, SpendLine } from '@/model/types';

interface LinkedRecord {
  id: string;
  title: string;
  sourceIds: readonly string[];
}

function searchable<T extends LinkedRecord>(record: T) {
  return {
    ...record,
    searchText: JSON.stringify([record, record.sourceIds.map(getSource)]).toLocaleLowerCase(),
  };
}

const sourceIds = (...groups: ReadonlyArray<readonly string[]>) => [...new Set(groups.flat())];

export function matchesAuditQuery(record: { searchText: string }, query: string): boolean {
  return query.trim().toLocaleLowerCase().split(/\s+/).every(term => record.searchText.includes(term));
}

type AssumptionValue = string | number | boolean | null | undefined;

function assumption(id: string, title: string, entries: ReadonlyArray<readonly [string, AssumptionValue]>, sources: string[] = []) {
  return searchable({ id, title, entries, sourceIds: sources });
}

function invoice(
  input: SpendLine | AddOnLine,
  index: number,
  assessment: Assessment,
  scored: ScoredLine | ScoredAddOn | undefined,
) {
  const thirdParty = 'categoryId' in input;
  const catalogId = thirdParty ? input.categoryId : input.addOnId;
  const metadata = thirdParty
    ? CATEGORIES.find(category => category.id === catalogId)
    : MS_ADD_ONS.find(addOn => addOn.id === catalogId);
  const evidence = thirdParty ? getCategoryEvidence(catalogId, assessment.baseline) : getAddOnEvidence(catalogId);
  const priceEvidence = thirdParty ? getBenchmarkEvidence(catalogId, input.vendor) : getAddOnPriceEvidence(catalogId);
  const annualSpend = scored?.annualSpend ?? annualiseLine(input, assessment.seats);
  const annualCredit = scored?.annualCredit ?? 0;
  return searchable({
    id: `${thirdParty ? 'third-party' : 'add-on'}:${index}:${catalogId}`,
    title: thirdParty ? input.vendor || metadata?.name || catalogId : metadata?.name || catalogId,
    kind: thirdParty ? 'Third-party invoice' : 'Microsoft add-on invoice',
    catalogId,
    catalogKnown: !!metadata,
    input,
    amountKnown: input.mode === 'annual' ? input.annual !== undefined : input.pupm !== undefined,
    customerConfirmed: input.assumptionConfirmed === true,
    evidence,
    priceEvidence,
    sourceIds: sourceIds(evidence.sourceIds, priceEvidence.sourceIds),
    annualSpend,
    annualCredit,
    annualRetained: annualSpend - annualCredit,
    eligible: scored?.eligible ?? false,
    requiresConfirmation: scored?.requiresConfirmation ?? false,
    exclusionReason: scored?.exclusionReason ?? (!metadata
      ? 'Unknown catalog invoice retained at full cost and excluded from retirement savings.'
      : undefined),
    coverage: scored && 'coverage' in scored ? scored.coverage : undefined,
    effectiveSavingsDelayMonths: assessment.assumptions.transitionEnabled
      ? Math.round(Math.max(0, input.savingsDelayMonths ?? 0))
      : 0,
  });
}

/** Read-only snapshot of the registries and the existing engines; never confirms or changes inputs. */
export function buildAuditLog(input: Assessment) {
  const assessment = structuredClone(input);
  const engine = computeAssessment(assessment);
  const tei = computeTei(assessment, engine);
  const a = assessment.assumptions;
  const baselineEvidence = getSuiteEvidence(assessment.baseline);
  const e7Evidence = getSuiteEvidence('m365e7');
  const sources = SOURCES.map(source => searchable({
    id: source.id, title: source.title, sourceIds: [source.id], source,
  }));
  const suites = [...BASELINE_SKUS, E7_SKU].map(sku => {
    const evidence = getSuiteEvidence(sku.id);
    return searchable({
      id: sku.id, title: sku.name, sku, evidence,
      sourceIds: sourceIds(sku.sourceIds, evidence.sourceIds),
      selectedBaseline: assessment.baseline === sku.id,
    });
  });
  const categories = CATEGORIES.map(category => {
    const evidence = getCategoryEvidence(category.id, assessment.baseline);
    const benchmarkEvidence = getBenchmarkEvidence(category.id);
    return searchable({
      id: category.id, title: category.name, category, evidence, benchmarkEvidence,
      sourceIds: sourceIds(evidence.sourceIds, benchmarkEvidence.sourceIds),
      coverage: category.coverage[assessment.baseline],
      benchmarkCurrency: 'USD' as const,
      modeledAdoption: category.typicalAdoptionPct ?? 1,
      plannedForDeployment: (assessment.plannedCapabilities ?? []).includes(category.id),
      currentAvoidedCapability: engine.costAvoidance.capabilities.find(cap => cap.category.id === category.id),
      currentAvoidedLicence: engine.costAvoidance.lines.find(line => line.capabilities.some(c => c.id === category.id)),
    });
  });
  const addOns = MS_ADD_ONS.map(addOn => {
    const evidence = getAddOnEvidence(addOn.id);
    const priceEvidence = getAddOnPriceEvidence(addOn.id);
    return searchable({
      id: addOn.id, title: addOn.name, addOn, evidence, priceEvidence,
      sourceIds: sourceIds(evidence.sourceIds, priceEvidence.sourceIds),
      relevantToBaseline: addOn.relevantFor.includes(assessment.baseline),
    });
  });
  const studies = TEI_STUDIES.map(study => {
    const evidence = getTeiEvidence(study.id);
    return searchable({
      id: study.id, title: study.title, study, evidence,
      sourceIds: sourceIds(study.sourceIds ?? [], evidence.sourceIds),
      current: tei.studies.find(summary => summary.studyId === study.id)!,
    });
  });
  const benefits = TEI_STUDIES.flatMap(study => study.lines.map(line => {
    const evidence = getTeiEvidence(study.id, line.id);
    return searchable({
      id: line.id, title: line.name, studyId: study.id, studyTitle: study.title, line, evidence,
      sourceIds: sourceIds(study.sourceIds ?? [], line.sourceIds ?? [], evidence.sourceIds),
      normalizedByYear: line.published.map((_, year) => perSeatRate(line, year)),
      defaultIncluded: isLineOnByDefault(line),
      override: assessment.tei.lineOverrides[line.id],
      selected: isLineIncluded(line, assessment.tei),
      current: tei.scoredLines.find(row => row.lineId === line.id)!,
      studyExclusionReason: tei.studies.find(row => row.studyId === study.id)?.notApplicableReason,
    });
  }));
  const invoices = [
    ...assessment.lines.map((line, index) => invoice(
      line, index, assessment, engine.scoredLines.find(row => row.line === line),
    )),
    ...assessment.addOns.map((line, index) => invoice(line, index, assessment, engine.scoredAddOns[index])),
  ];
  const context: DealContext = {
    baseline: assessment.baseline,
    seats: assessment.seats,
    netAnnual: engine.recurringAnnualBenefit,
    upliftAnnual: engine.uplift,
    redundantToday: engine.buckets.find(bucket => bucket.bucket === 'already-redundant')?.conservativeCredit ?? 0,
    notCoveredAnnual: engine.buckets.find(bucket => bucket.bucket === 'not-covered')?.grossSpend ?? 0,
    capturedLines: assessment.lines.length,
    avoidedLicenceAnnual: engine.costAvoidance.annualAvoided,
  };
  const battlecards = BATTLECARDS.map(card => searchable({
    id: `vendor:${card.vendor}`,
    title: card.vendor,
    card,
    sourceIds: [...(card.sourceIds ?? [])],
    matchPattern: card.match.toString(),
    matchesCurrentInvoice: assessment.lines.some(line => new RegExp(card.match.source, card.match.flags).test(line.vendor)),
  }));
  const objections = OBJECTIONS.map(objection => searchable({
    id: objection.id, title: objection.objection, objection,
    sourceIds: [...(objection.sourceIds ?? [])],
    relevantToCurrentCase: !objection.when || objection.when(context),
    condition: objection.when ? 'Condition evaluated against the current deal context.' : 'No case filter specified.',
  }));
  const discovery = DOMAINS.map(domain => searchable({
    id: `discovery:${domain.id}`, title: domain.name, domain,
    sourceIds: [],
    questions: DISCOVERY_QUESTIONS[domain.id],
    gapProbe: GAP_PROBES[domain.id],
  }));
  const assumptions = [
    assumption('profile', 'Assessment profile and review state', [
      ['Organization', assessment.orgName || 'Not entered'],
      ['Workforce seats', assessment.seats], ['Assessment currency', assessment.currency],
      ['Selected baseline', assessment.baseline], ['Saved schema version', assessment.schemaVersion],
      ['Demo assessment', assessment.isDemo], ['Microsoft add-on review confirmed', assessment.addOnsReviewed],
      ['USD cash-model inputs ready (not customer verification)', engine.cashEstimateReady],
    ]),
    assumption('suite-prices', 'Suite prices and provenance', [
      ['Baseline unit price / user / month', a.baselineUnitPupm], ['Baseline price source', a.baselinePriceSource],
      ['E7 comparison price / user / month', a.e7ListPupm], ['E7 price source', a.e7PriceSource],
      ['E7 discount (%)', a.e7DiscountPct], ['E7 net price / user / month', engine.e7NetPupm],
      ['Legacy price confirmation stored (not applied)', a.pricesConfirmed], ['Customer currency', assessment.currency],
      ['Published reference currency (not converted)', engine.referenceCurrency],
    ], sourceIds(baselineEvidence.sourceIds, e7Evidence.sourceIds)),
    assumption('timing', 'Transition cost and savings timing', [
      ['Horizon (years)', a.horizonYears], ['Transition timing enabled', a.transitionEnabled],
      ['Stored transition budget', a.transitionCost], ['Applied one-time transition cost', engine.migrationTotal],
      ['Currency', assessment.currency],
      ['Delay treatment', 'Invoice savings delays apply only when transition timing is enabled. Contract-end notes do not schedule savings.'],
    ]),
    assumption('legacy-assumptions', 'Legacy fields retained for compatibility', [
      ['Migration cost per seat (deprecated; not applied)', a.migrationCostPerSeat],
      ['Year-one realization (%) (deprecated; not applied)', a.year1RealizationPct],
      ['Conservative factors (deprecated; not applied)', JSON.stringify(a.conservative)],
      ['Best-case factors (deprecated; not applied)', JSON.stringify(a.bestCase)],
      ['Credit policy', 'Model v3 assumes full replacement of known USD amounts for covered invoices. Stored retained percentages, price confirmations and invoice confirmation flags do not alter credit. Unknown/not-covered invoices and unresolved duplicates or bundle overlaps earn no retirement credit. Source review status is unchanged.'],
    ]),
    assumption('licence-cost-avoidance', 'Capability cost avoided with E7 — outside cash', [
      ['Capabilities planned for deployment', engine.costAvoidance.capabilities.filter(cap => cap.selected).map(cap => cap.category.id).join(', ') || 'None'],
      ['Licences in the lowest-cost set', engine.costAvoidance.lines.map(line => `${line.licence.id} × ${line.paidQuantity}`).join(', ') || 'None'],
      ['User overrides by capability', JSON.stringify(assessment.costAvoidance?.users ?? {})],
      ['Unit price overrides (USD / user / month)', JSON.stringify(assessment.costAvoidance?.unitPrices ?? {})],
      ['E7 discount applied to list references (%)', a.e7DiscountPct],
      ['Annual cost avoided (lowest-cost licence set)', engine.costAvoidance.annualAvoided],
      ['Sum of each selected capability licensed on its own', engine.costAvoidance.standaloneSumAnnual],
      ['Capabilities not valued', engine.costAvoidance.unpriced.map(c => c.id).join(', ') || 'None'],
      ['Reference currency', 'USD'],
      ['Treatment', 'Licence counterfactual: for the capabilities the customer plans to deploy, the lowest-cost set of standalone Microsoft licences that would provide them on top of the current suite, at list reference less the E7 discount unless entered. A licence covering several selected capabilities is counted once, for the largest user count. Purchased Microsoft add-ons are not counted again. Never included in cash savings, TCO or payback, and never added to third-party retirement credit for the same capability. Step-up prices are approximated as suite list differences.'],
    ], sourceIds(...engine.costAvoidance.lines.map(line => line.licence.sourceIds))),
    assumption('tei-settings', 'Experimental study settings and confirmations', [
      ['Experimental studies enabled', assessment.tei.enabled],
      ['Benefit overlap and implementation-cost review confirmed', assessment.tei.combinedReviewed],
      ['Exact omitted training-cost overlap reviewed', assessment.tei.enablementOverlapReviewed],
      ['Copilot active adoption (%)', assessment.tei.copilotAdoptionPct],
      ['Scenario realization (%)', assessment.tei.confidencePct],
      ['Include published training-cost normalization', assessment.tei.includeEnablementCost],
      ['Saved benefit-line overrides', JSON.stringify(assessment.tei.lineOverrides)],
      ['Combination permitted by the existing engine', tei.canCombine],
      ['Study reference currency', tei.referenceCurrency],
    ], TEI_STUDIES.flatMap(study => study.sourceIds ?? [])),
    assumption('confirmation-provenance', 'Limits of the input and legacy confirmation trace', [
      ['Recorded evidence', 'Amount-source labels and legacy flags only. Full replacement is an application scenario assumption, not customer confirmation, source verification or proof of entitlement.'],
      ['Not recorded', 'The assessment has no confirmation timestamp, reviewer identity, invoice attachment, change history or authoritative currency conversion.'],
      ['Legacy behavior', 'Stored retained percentages and confirmation flags are preserved for reference but ignored in the full-replacement model. Existing non-USD saved inputs remain recoverable without conversion; new non-USD imports are rejected.'],
    ]),
  ];
  const warnings = [
    ...engine.warnings.map((message, index) => searchable({
      id: `engine:${index}`, title: message, message, origin: 'Live cash engine', sourceIds: [],
    })),
    ...(assessment.reviewWarnings ?? []).map((message, index) => searchable({
      id: `review:${index}`, title: message, message, origin: 'Saved/import review warning', sourceIds: [],
    })),
    ...tei.combinationWarnings.map((message, index) => searchable({
      id: `combination:${index}`, title: message, message, origin: 'Study combination gate', sourceIds: [],
    })),
  ];
  const records = [
    ...sources, ...suites, ...categories, ...addOns, ...studies, ...benefits,
    ...invoices, ...battlecards, ...objections, ...discovery, ...assumptions,
  ];
  return {
    metadata: {
      modelVersion: MODEL_VERSION, sourceVersion: SOURCE_VERSION, evidenceVersion: EVIDENCE_VERSION,
      reviewedAt: EVIDENCE_REVIEW_DATE, pricingAsOf: PRICING_AS_OF,
    },
    assessment, engine, tei, sources, suites, categories, addOns, studies, benefits, invoices,
    unknownInvoices: invoices.filter(record => !record.catalogKnown),
    assumptions, warnings, battlecards, objections, discovery, sellerContext: context,
    packaging: PACKAGING_UPDATE,
    training: {
      source: COPILOT_ENABLEMENT_SOURCE, normalizedByYear: COPILOT_ENABLEMENT_PER_SEAT,
      discountRate: TEI_DISCOUNT_RATE,
    },
    missingSourceIds: sourceIds(...records.map(record => record.sourceIds)).filter(id => !getSource(id)),
  };
}

export type AuditLog = ReturnType<typeof buildAuditLog>;
export type AuditInvoice = AuditLog['invoices'][number];
