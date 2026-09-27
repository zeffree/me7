import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, DOMAINS } from '@/data/categories';
import { getAddOnEvidence, getAddOnPriceEvidence, getCategoryEvidence, getSuiteEvidence } from '@/data/evidence';
import { MS_ADD_ONS } from '@/data/msAddOns';
import { BATTLECARDS, OBJECTIONS } from '@/data/sellerPlays';
import { BASELINE_SKUS, E7_SKU } from '@/data/skus';
import { EVIDENCE_REVIEW_DATE, SOURCE_VERSION, SOURCES } from '@/data/sources';
import { COPILOT_ENABLEMENT_SOURCE, TEI_STUDIES, perSeatRate } from '@/data/teiStudies';
import { DEFAULT_ASSUMPTIONS, MODEL_VERSION, computeAssessment } from '@/model/engine';
import { DEFAULT_TEI_SETTINGS, computeTei } from '@/model/tei';
import type { Assessment } from '@/model/types';
import { useAssessment } from '@/store/useAssessment';
import { AuditPage } from '@/components/audit/AuditPage';
import { buildAuditLog, matchesAuditQuery } from './audit';

function assessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    schemaVersion: 2,
    orgName: 'Audit fixture',
    seats: 100,
    currency: 'USD',
    baseline: 'm365e5',
    assumptions: structuredClone(DEFAULT_ASSUMPTIONS),
    lines: [],
    addOns: [],
    plannedCapabilities: [],
    tei: structuredClone(DEFAULT_TEI_SETTINGS),
    ...overrides,
  };
}

function freezeDeep(value: object): void {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') freezeDeep(child);
  }
  Object.freeze(value);
}

describe('administrative audit reference', () => {
  it('retains the complete authoritative catalog, versions and identifiers without visibility filters', () => {
    const log = buildAuditLog(assessment());
    expect(log.metadata).toMatchObject({
      modelVersion: MODEL_VERSION, sourceVersion: SOURCE_VERSION, reviewedAt: EVIDENCE_REVIEW_DATE,
    });
    expect(log.sources.map(record => record.id)).toEqual(SOURCES.map(source => source.id));
    expect(log.suites.map(record => record.id)).toEqual([...BASELINE_SKUS, E7_SKU].map(sku => sku.id));
    expect(log.categories).toHaveLength(54);
    expect(log.categories.map(record => record.id)).toEqual(CATEGORIES.map(category => category.id));
    expect(log.addOns).toHaveLength(31);
    expect(log.addOns.map(record => record.id)).toEqual(MS_ADD_ONS.map(addOn => addOn.id));
    expect(log.studies.map(record => record.id)).toEqual(TEI_STUDIES.map(study => study.id));
    expect(log.benefits).toHaveLength(18);
    expect(log.benefits.map(record => record.id)).toEqual(TEI_STUDIES.flatMap(study => study.lines.map(line => line.id)));
    for (const records of [log.sources, log.suites, log.categories, log.addOns, log.studies, log.benefits]) {
      expect(new Set(records.map(record => record.id)).size).toBe(records.length);
    }
    expect(log.battlecards).toHaveLength(BATTLECARDS.length);
    expect(log.objections.map(record => record.id)).toEqual(OBJECTIONS.map(item => item.id));
    expect(log.discovery).toHaveLength(DOMAINS.length);
  });

  it('links every evidence record to the source registry without promoting unverified status', () => {
    const log = buildAuditLog(assessment());
    expect(log.missingSourceIds).toEqual([]);
    const sourceIds = new Set(SOURCES.map(source => source.id));
    for (const record of [
      ...log.suites, ...log.categories, ...log.addOns, ...log.studies, ...log.benefits,
      ...log.battlecards, ...log.objections,
    ]) {
      expect(record.sourceIds.length).toBeGreaterThan(0);
      expect(record.sourceIds.every(id => sourceIds.has(id))).toBe(true);
    }
    for (const record of log.sources) expect(record.source).toEqual(SOURCES.find(source => source.id === record.id));
    for (const record of log.suites) expect(record.evidence).toEqual(getSuiteEvidence(record.sku.id));
    for (const record of log.categories) {
      expect(record.evidence).toEqual(getCategoryEvidence(record.id, 'm365e5'));
      expect(record.coverage).toBe(record.category.coverage.m365e5);
      expect(record.benchmarkEvidence.status).toBe('unverified');
      expect(record.benchmarkEvidence.sourceIds).toContain('catalog-assumptions');
    }
    for (const record of log.addOns) {
      expect(record.evidence).toEqual(getAddOnEvidence(record.id));
      expect(record.priceEvidence).toEqual(getAddOnPriceEvidence(record.id));
    }
    expect(log.sources.find(record => record.id === 'catalog-assumptions')?.source.url).toBeNull();
    expect(log.categories.find(record => record.id === 'edr-xdr')?.evidence.status).toBe('unverified');
    expect(log.addOns.find(record => record.id === 'windows-365')).toMatchObject({
      addOn: { absorbedByE7: false }, priceEvidence: { status: 'unverified' },
    });
  });

  it('retains all unverified E5 records, source costs and excluded original study benefits while TEI is off', () => {
    const log = buildAuditLog(assessment());
    const e5 = log.studies.find(record => record.id === 'm365e5')!;
    expect(e5.evidence.status).toBe('unverified');
    expect(e5.study.normalizationNote).toContain('Unverified');
    const lines = log.benefits.filter(record => record.studyId === 'm365e5');
    expect(lines).toHaveLength(8);
    expect(lines.every(record => !record.defaultIncluded && !record.current.included)).toBe(true);
    expect(lines.every(record => record.evidence.status === 'unverified')).toBe(true);
    for (const record of log.benefits) {
      expect(record.normalizedByYear).toEqual(record.line.published.map((_, year) => perSeatRate(record.line, year)));
      expect(record.current.byYear.every(value => value === 0)).toBe(true);
    }
    expect(log.studies.find(record => record.id === 'copilot')?.study.excluded?.[0]).toMatchObject({
      name: 'Business transformation: Go to market', publishedPv: 14_801_002,
    });
    expect(log.studies.find(record => record.id === 'copilot')?.study.publishedCostLines).toHaveLength(3);
    expect(log.studies.find(record => record.id === 'entra-suite')?.study.publishedCostLines).toHaveLength(3);
    expect(log.training.source).toEqual(COPILOT_ENABLEMENT_SOURCE);
  });

  it('uses live scoring for selected benefits without mutating source review or eligibility', () => {
    const input = assessment({
      baseline: 'm365e3',
      tei: {
        ...DEFAULT_TEI_SETTINGS,
        enabled: true,
        lineOverrides: { 'e5-endpoint': true, 'copilot-people': false },
      },
    });
    const log = buildAuditLog(input);
    const expected = computeTei(input, computeAssessment(input));
    expect(log.tei).toEqual(expected);
    expect(log.benefits.find(record => record.id === 'e5-endpoint')).toMatchObject({
      override: true, defaultIncluded: false, selected: true,
      evidence: { status: 'unverified' },
      current: { included: true },
    });
    expect(log.benefits.find(record => record.id === 'copilot-people')?.current.included).toBe(false);
    expect(log.benefits.find(record => record.id === 'e5-endpoint')?.current.byYear)
      .toEqual(expected.scoredLines.find(record => record.lineId === 'e5-endpoint')?.byYear);
    const owned = buildAuditLog(assessment({
      tei: { ...DEFAULT_TEI_SETTINGS, enabled: true },
      addOns: [{ addOnId: 'copilot', mode: 'annual', annual: 36000 }],
    }));
    expect(owned.studies.find(record => record.id === 'copilot')?.current.applies).toBe(false);
    expect(owned.studies.find(record => record.id === 'copilot')?.current.notApplicableReason).toContain('already bought');
    expect(owned.benefits.filter(record => record.studyId === 'copilot')).toHaveLength(2);
  });

  it('preserves confirmation provenance, duplicate entries, unknown invoices and all warning origins', () => {
    const input = assessment({
      currency: 'EUR',
      reviewWarnings: ['Imported old model; review the actual quote.'],
      assumptions: {
        ...DEFAULT_ASSUMPTIONS, pricesConfirmed: false,
        transitionEnabled: true, transitionCost: 5000,
      },
      lines: [
        { categoryId: 'edr-xdr', vendor: 'Falcon', mode: 'annual', annual: 10000, retainPct: 20, amountSource: 'customer', assumptionConfirmed: true, savingsDelayMonths: 4 },
        { categoryId: 'edr-xdr', vendor: 'Other endpoint', mode: 'annual', annual: 4000, retainPct: 0, amountSource: 'benchmark', assumptionConfirmed: false },
        { categoryId: 'retired-category', vendor: 'Recovered contract', mode: 'annual', annual: 3000, retainPct: 0, amountSource: 'legacy', assumptionConfirmed: true },
      ],
      addOns: [
        { addOnId: 'unknown-addon', mode: 'annual', annual: 2000, amountSource: 'legacy' },
        { addOnId: 'sentinel', mode: 'annual', amountSource: 'customer', assumptionConfirmed: true },
      ],
      tei: { ...DEFAULT_TEI_SETTINGS, enabled: true, combinedReviewed: true },
    });
    const log = buildAuditLog(input);
    expect(log.invoices).toHaveLength(5);
    expect(new Set(log.invoices.map(record => record.id)).size).toBe(5);
    expect(log.unknownInvoices.map(record => record.catalogId)).toEqual(['retired-category', 'unknown-addon']);
    expect(log.unknownInvoices.map(record => record.annualRetained)).toEqual([3000, 2000]);
    expect(log.unknownInvoices.every(record => record.annualCredit === 0 && !record.eligible)).toBe(true);
    expect(log.invoices[0]).toMatchObject({
      customerConfirmed: true, eligible: false, annualCredit: 0, annualRetained: 10000,
      effectiveSavingsDelayMonths: 4, input: { amountSource: 'customer' }, evidence: { status: 'unverified' },
    });
    expect(log.invoices[1]).toMatchObject({ customerConfirmed: false, eligible: false, annualCredit: 0 });
    expect(log.invoices[4]).toMatchObject({ amountKnown: false, customerConfirmed: true, eligible: false });
    expect(log.engine).toEqual(computeAssessment(input));
    expect(log.warnings.filter(record => record.origin === 'Live cash engine').map(record => record.message))
      .toEqual(log.engine.warnings);
    expect(log.warnings.filter(record => record.origin === 'Saved/import review warning').map(record => record.message))
      .toEqual(input.reviewWarnings);
    expect(log.warnings.filter(record => record.origin === 'Study combination gate').map(record => record.message))
      .toEqual(log.tei.combinationWarnings);
    expect(log.tei.combinationWarnings.some(message => message.includes('currency'))).toBe(true);
    expect(log.assumptions.find(record => record.id === 'suite-prices')?.entries)
      .toContainEqual(['Legacy price confirmation stored (not applied)', false]);
    expect(log.assumptions.find(record => record.id === 'confirmation-provenance')?.searchText)
      .toContain('no confirmation timestamp');
  });

  it('retains seller source status, limitations and records outside current relevance filters', () => {
    const log = buildAuditLog(assessment({
      lines: [{ categoryId: 'edr-xdr', vendor: 'CrowdStrike Falcon', mode: 'annual', annual: 12000, retainPct: 0 }],
    }));
    const crowdstrike = log.battlecards.find(record => record.title === 'CrowdStrike')!;
    expect(crowdstrike.matchesCurrentInvoice).toBe(true);
    expect(crowdstrike.card.evidenceStatus).toBe('unverified');
    expect(crowdstrike.card.trap).toContain('like-for-like');
    expect(log.battlecards.some(record => !record.matchesCurrentInvoice)).toBe(true);
    expect(log.battlecards.find(record => record.title === 'CyberArk / BeyondTrust / Delinea')?.card.evidenceStatus)
      .toBe('conditional');
    expect(log.objections.some(record => !record.relevantToCurrentCase)).toBe(true);
    expect(log.objections.find(record => record.id === 'already-e5')?.relevantToCurrentCase).toBe(true);
  });

  it('searches identifiers, source conditions, statuses, stored amounts and all query terms', () => {
    const log = buildAuditLog(assessment());
    expect(log.categories.filter(record => matchesAuditQuery(record, 'edr-xdr'))).toHaveLength(1);
    expect(log.categories.some(record => matchesAuditQuery(record, 'unverified'))).toBe(true);
    expect(log.categories.some(record => matchesAuditQuery(record, 'permissions-management-retirement vaulting'))).toBe(true);
    expect(log.benefits.some(record => matchesAuditQuery(record, '1_755_000'))).toBe(false);
    expect(log.benefits.some(record => matchesAuditQuery(record, '1755000 10000'))).toBe(true);
    expect(log.sources.every(record => matchesAuditQuery(record, '   '))).toBe(true);
    expect(log.categories.filter(record => matchesAuditQuery(record, 'not-a-real-query'))).toEqual([]);
  });

  it('does not mutate frozen input, source registries or financial model outcomes', () => {
    const input = assessment({
      lines: [{ categoryId: 'edr-xdr', vendor: 'Invoice', mode: 'annual', annual: 9000, retainPct: 10, assumptionConfirmed: false }],
      tei: { ...DEFAULT_TEI_SETTINGS, lineOverrides: { 'copilot-people': true } },
    });
    const original = structuredClone(input);
    const registryBefore = JSON.stringify([SOURCES, CATEGORIES, MS_ADD_ONS, TEI_STUDIES, BATTLECARDS, OBJECTIONS]);
    const expected = computeAssessment(input);
    freezeDeep(input);
    const log = buildAuditLog(input);
    expect(input).toEqual(original);
    expect(log.engine).toEqual(expected);
    expect(JSON.stringify([SOURCES, CATEGORIES, MS_ADD_ONS, TEI_STUDIES, BATTLECARDS, OBJECTIONS])).toBe(registryBefore);
    expect(buildAuditLog(input)).toEqual(log);
    log.assessment.tei.lineOverrides['copilot-people'] = false;
    expect(input.tei.lineOverrides['copilot-people']).toBe(true);
  });

  it('renders one heading, a public read-only notice and reference controls without assessment writes', () => {
    const before = useAssessment.getState();
    const html = renderToStaticMarkup(createElement(AuditPage, { onBack: () => {} }));
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(html).toContain('Back to assessment');
    expect(html).toContain('Client-only and not access-controlled');
    expect(html).toContain('Search reference records');
    expect(html).toContain('Reference section');
    expect(html).toContain('Browse 54 of 54 records');
    expect(html).toContain('Browse 31 of 31 records');
    expect(html).toContain('Browse 18 of 18 records');
    expect(html).toContain('tei-e5-2023');
    expect(html).toContain('No external source URL retained');
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain('type="number"');
    expect(useAssessment.getState()).toBe(before);
  });
});
