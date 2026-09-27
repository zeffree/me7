import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './categories';
import { ADD_ON_CAPABILITY_IDS, MS_ADD_ONS, getAddOn, getAddOnCapabilityIds } from './msAddOns';
import { BATTLECARDS, OBJECTIONS } from './sellerPlays';
import { BASELINE_SKUS, E7_SKU, PACKAGING_UPDATE } from './skus';
import {
  ADD_ON_EVIDENCE, CATEGORY_EVIDENCE, getAddOnEvidence, getAddOnPriceEvidence,
  getBenchmarkEvidence, getCategoryEvidence, getSuiteEvidence, getTeiEvidence,
} from './evidence';
import { EVIDENCE_REVIEW_DATE, SECURITY_COPILOT_ALLOWANCE, SOURCES, getSource } from './sources';
import { COPILOT_ENABLEMENT_PER_SEAT, COPILOT_ENABLEMENT_SOURCE, TEI_OVERLAP_GROUPS, TEI_STUDIES, isLineOnByDefault } from './teiStudies';

describe('source-linked evidence registry', () => {
  it('assigns explicit review outcomes to every current category and add-on, with no stale IDs', () => {
    expect(Object.keys(CATEGORY_EVIDENCE).sort()).toEqual(CATEGORIES.map((item) => item.id).sort());
    expect(Object.keys(ADD_ON_EVIDENCE).sort()).toEqual(MS_ADD_ONS.map((item) => item.id).sort());
    for (const record of [...Object.values(CATEGORY_EVIDENCE), ...Object.values(ADD_ON_EVIDENCE)]) {
      expect(['verified', 'conditional', 'unverified']).toContain(record.status);
      expect(record.reviewedAt).toBe(EVIDENCE_REVIEW_DATE);
      expect(record.sourceIds.length).toBeGreaterThan(0);
      expect(record.conditions.length).toBeGreaterThan(0);
      for (const id of record.sourceIds) expect(getSource(id), id).toBeDefined();
    }
  });

  it('records source identity, review scope, currency and applicability without invented URLs', () => {
    expect(new Set(SOURCES.map((item) => item.id)).size).toBe(SOURCES.length);
    for (const source of SOURCES) {
      if (source.url !== null) expect(source.url).toMatch(/^https:\/\//);
      else expect(source.status).toBe('unverified');
      expect(source.conditions.length).toBeGreaterThan(0);
      for (const field of ['publisher', 'title', 'section', 'unit', 'term', 'region'] as const) {
        expect(source[field].length).toBeGreaterThan(0);
      }
      expect(source.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(source.reviewedAt).toISOString().slice(0, 10)).toBe(source.reviewedAt);
    }
    expect(getSource('not-a-source')).toBeUndefined();
  });

  it('keeps architecture source reviews separate from existing commercial evidence', () => {
    expect(getSource('architecture-zero-trust')?.reviewedAt).toBe('2026-09-10');
    expect(getSource('e7-announcement')?.reviewedAt).toBe('2026-09-06');
    expect(getSource('catalog-assumptions')?.reviewedAt).toBe('2026-09-06');
    expect(getCategoryEvidence('sso-mfa').reviewedAt).toBe('2026-09-06');
  });

  it('requires customer review rather than treating entitlement as vendor replacement', () => {
    for (const category of CATEGORIES) {
      for (const baseline of BASELINE_SKUS) {
        const evidence = getCategoryEvidence(category.id, baseline.id);
        expect(evidence.requiresConfirmation).toBe(true);
        expect(category.requiresConfirmation).toBe(evidence.requiresConfirmation);
        expect(evidence.status).not.toBe('verified');
        if (category.coverage[baseline.id] === 'already') {
          expect(evidence.conditions.join(' ')).toContain('not necessarily double payment');
        }
        if (category.coverage[baseline.id] === 'not-covered') {
          expect(evidence.conditions.join(' ')).toContain('excluded even after customer confirmation');
        }
      }
    }
    for (const addOn of MS_ADD_ONS) {
      expect(getAddOnEvidence(addOn.id).requiresConfirmation).toBe(true);
      expect(addOn.requiresConfirmation).toBe(getAddOnEvidence(addOn.id).requiresConfirmation);
    }
  });

  it('makes purchased add-on overlap explicit for planned-capability review', () => {
    expect(Object.keys(ADD_ON_CAPABILITY_IDS).sort()).toEqual(MS_ADD_ONS.map((item) => item.id).sort());
    const categoryIds = new Set(CATEGORIES.map((item) => item.id));
    for (const addOn of MS_ADD_ONS) {
      expect(addOn.capabilityIds).toEqual(getAddOnCapabilityIds(addOn.id));
      expect(new Set(addOn.capabilityIds).size).toBe(addOn.capabilityIds!.length);
      for (const id of addOn.capabilityIds!) expect(categoryIds.has(id), `${addOn.id}: ${id}`).toBe(true);
    }
    expect(getAddOnCapabilityIds('copilot')).toContain('genai-assistant');
    expect(getAddOnCapabilityIds('entra-suite')).toContain('ztna');
    expect(getAddOnCapabilityIds('missing')).toEqual([]);
    expect(getAddOnCapabilityIds('__proto__')).toEqual([]);
  });

  it('keeps every benchmark explicitly unverified and denominated in USD', () => {
    for (const category of CATEGORIES) {
      const record = getBenchmarkEvidence(category.id);
      expect(record.status).toBe('unverified');
      expect(record.requiresConfirmation).toBe(true);
      expect(record.sourceIds).toEqual(['catalog-assumptions']);
      expect(record.conditions.join(' ')).toMatch(/USD/);
    }
    expect(getSource('catalog-assumptions')?.currency).toBe('USD');
    expect(getBenchmarkEvidence('genai-assistant', 'Unknown enterprise offer').status).toBe('unverified');
  });

  it('does not certify legacy add-on price seeds or unknown IDs', () => {
    for (const id of ['windows-365', 'purview-ediscovery-audit', 'power-platform-premium']) {
      expect(getAddOnPriceEvidence(id).status).toBe('unverified');
    }
    expect(getCategoryEvidence('missing').requiresConfirmation).toBe(true);
    expect(getAddOnEvidence('missing').status).toBe('unverified');
    expect(getBenchmarkEvidence('missing').status).toBe('unverified');
  });

  it('records baseline and E7 evidence with USD references and separate rollout dates', () => {
    for (const sku of [...BASELINE_SKUS, E7_SKU]) {
      expect(sku.referenceCurrency).toBe('USD');
      for (const id of sku.sourceIds) expect(getSource(id), id).toBeDefined();
      expect(getSuiteEvidence(sku.id).requiresConfirmation).toBe(true);
    }
    expect(PACKAGING_UPDATE.pricingEffectiveDate).toBe('2026-07-01');
    expect(PACKAGING_UPDATE.rolloutCompleteDate).toBe('2026-08-01');
    expect(E7_SKU.teamsVariants).toEqual(['with Teams', 'without Teams']);
    expect(getSource('teams-choice-2025')?.effectiveDate).toBe('2025-11-01');
  });
});

describe('bounded audit corrections', () => {
  it('uses one precise Security Copilot allowance across category and add-on copy', () => {
    const category = CATEGORIES.find((item) => item.id === 'secops-ai')!;
    const addOn = getAddOn('security-copilot')!;
    expect(category.caveat).toContain(SECURITY_COPILOT_ALLOWANCE.summary);
    expect(addOn.description).toContain(SECURITY_COPILOT_ALLOWANCE.summary);
    expect(addOn.note).toContain('not to delete');
    expect(addOn.relevantFor).toContain('m365e5');
    expect(getAddOnEvidence(addOn.id).conditions.join(' ')).toMatch(/no rollover/);
  });

  it('does not credit paid Purview data governance as a suite-funded replacement', () => {
    const category = CATEGORIES.find((item) => item.id === 'data-catalog')!;
    expect(Object.values(category.coverage)).toEqual(['not-covered', 'not-covered', 'not-covered']);
    expect(getCategoryEvidence(category.id).sourceIds).toContain('purview-governance-billing');
  });

  it('does not equate E3 foundational identity or patching with E5 feature scope', () => {
    for (const id of ['sso-mfa', 'patch-config', 'edr-xdr']) {
      expect(CATEGORIES.find((item) => item.id === id)?.coverage.m365e3).toBe('upgrade');
    }
    expect(CATEGORIES.find((item) => item.id === 'verified-id')?.coverage.m365e5).toBe('upgrade');
  });

  it('retires the false multicloud CIEM seller promise and qualifies all seller hypotheses', () => {
    const card = BATTLECARDS.find((item) => item.vendor.startsWith('CyberArk'))!;
    expect(card.counter).not.toContain('Permissions Management');
    expect(card.wedge).toContain('retired on October 1, 2025');
    expect(card.sourceIds).toContain('permissions-management-retirement');
    for (const record of [...BATTLECARDS, ...OBJECTIONS]) {
      expect(record.evidenceStatus).toBeDefined();
      expect(record.sourceIds?.length).toBeGreaterThan(0);
      for (const id of record.sourceIds ?? []) expect(getSource(id), id).toBeDefined();
    }
  });

  it('describes temporary contract lock-in with a savings delay, not permanent retention', () => {
    const objection = OBJECTIONS.find((item) => item.id === 'contracts')!;
    expect(objection.answer).toContain('savings delay');
    expect(objection.answer).toContain('not a temporary contract lock-in');
  });
});

describe('TEI source data versus app normalization', () => {
  it('gives every benefit explicit source review and an overlap-review group', () => {
    const lines = TEI_STUDIES.flatMap((study) => study.lines);
    expect(Object.keys(TEI_OVERLAP_GROUPS).sort()).toEqual(lines.map((line) => line.id).sort());
    for (const study of TEI_STUDIES) {
      expect(study.normalizationNote).toMatch(/app/i);
      expect(study.omittedCostNote).toBeTruthy();
      for (const line of study.lines) {
        expect(line.evidenceStatus).toBeDefined();
        expect(line.overlapGroup).toBeTruthy();
        for (const id of line.sourceIds ?? []) expect(getSource(id), id).toBeDefined();
        expect(getTeiEvidence(study.id, line.id).requiresConfirmation).toBe(true);
      }
    }
  });

  it('keeps the unextracted E5 PDF assumptions off by default with a visible reason', () => {
    const study = TEI_STUDIES.find((item) => item.id === 'm365e5')!;
    expect(study.evidenceStatus).toBe('unverified');
    for (const line of study.lines) {
      expect(isLineOnByDefault(line)).toBe(false);
      expect(line.caution ?? line.doubleCounts).toBeTruthy();
    }
    expect(getSource('tei-e5-2023')?.conditions.join(' ')).toContain('not independently extracted');
  });

  it('documents source population inconsistency without silently endorsing a denominator', () => {
    const study = TEI_STUDIES.find((item) => item.id === 'entra-suite')!;
    expect(study.normalizationNote).toContain('85,000 employees');
    expect(study.normalizationNote).toContain('50,000 employees');
    expect(study.normalizationNote).toContain('24,000');
  });

  it('preserves source cost rows and makes omitted implementation costs reviewable', () => {
    for (const study of TEI_STUDIES.filter((item) => item.id !== 'm365e5')) {
      expect(study.publishedCostLines).toHaveLength(3);
      const pv = study.publishedCostLines!.reduce((sum, line) => sum + line.publishedPv, 0);
      expect(Math.abs(pv - study.publishedCostsPv)).toBeLessThanOrEqual(1);
      for (const line of study.publishedCostLines!) expect(line.reviewCondition.length).toBeGreaterThan(30);
    }
    for (let index = 0; index < 3; index++) {
      expect(COPILOT_ENABLEMENT_PER_SEAT[index]).toBe(
        COPILOT_ENABLEMENT_SOURCE.published[index] / COPILOT_ENABLEMENT_SOURCE.divisor[index],
      );
    }
  });
});
