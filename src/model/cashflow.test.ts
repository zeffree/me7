import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '@/data/categories';
import { MS_ADD_ONS } from '@/data/msAddOns';
import { computeAssessment, DEFAULT_ASSUMPTIONS, buildWaterfall, MODEL_VERSION } from './engine';
import { DEFAULT_TEI_SETTINGS } from './tei';
import type { Assessment } from './types';

function fixture(): Assessment {
  return {
    schemaVersion: 2, orgName: 'Independent arithmetic fixture', seats: 100, currency: 'USD',
    baseline: 'm365e5',
    assumptions: {
      ...DEFAULT_ASSUMPTIONS, baselineUnitPupm: 60, e7ListPupm: 99,
      horizonYears: 4, transitionEnabled: true, transitionCost: 6_000,
      pricesConfirmed: false,
    },
    lines: [{
      categoryId: 'edr-xdr', vendor: 'Customer invoice', mode: 'annual', annual: 60_000,
      retainPct: 20, savingsDelayMonths: 6, amountSource: 'customer', assumptionConfirmed: false,
    }],
    addOns: [{
      addOnId: 'copilot', mode: 'annual', annual: 7_200, savingsDelayMonths: 3,
      amountSource: 'customer', assumptionConfirmed: false,
    }],
    plannedCapabilities: [], tei: { ...DEFAULT_TEI_SETTINGS },
  };
}

describe('shared monthly financial schedule', () => {
  it.each(['o365e3', 'm365e3', 'm365e5'] as const)('keeps the synthetic arithmetic and timing independent of baseline labels: %s', (baseline) => {
    const a = fixture();
    a.baseline = baseline;
    a.lines[0] = { ...a.lines[0], mode: 'pupm', pupm: 50, annual: undefined };
    a.addOns[0] = { ...a.addOns[0], mode: 'pupm', pupm: 6, annual: undefined };
    const r = computeAssessment(a);
    expect(r.currentAnnualTotal).toBe(139_200);
    expect(r.futureAnnualTotal).toBe(118_800);
    expect(r.year1NetBenefit).toBe(-17_400);
    expect(r.tcoNetBenefit).toBe(43_800);
    expect(r.paybackMonths).toBe(23);
  });

  it('reproduces the independently calculated golden fixture and waterfall', () => {
    const r = computeAssessment(fixture());
    expect(r.currentAnnualTotal).toBe(139_200);
    expect(r.futureAnnualTotal).toBe(118_800);
    expect(r.recurringAnnualBenefit).toBe(20_400);
    expect(r.year1NetBenefit).toBe(-17_400);
    expect(r.tcoNetBenefit).toBe(43_800);
    expect(r.paybackMonths).toBe(23);
    expect(r.paybackStatus).toBe('reached');
    expect(r.monthlyCashflow).toHaveLength(49);
    expect(r.monthlyCashflow[0].transitionCost).toBe(6_000);
    expect(r.monthlyCashflow.slice(1).every((row) => row.transitionCost === 0)).toBe(true);
    expect(r.monthlyCashflow[3].addOnSavings).toBe(0);
    expect(r.monthlyCashflow[4].addOnSavings).toBe(600);
    expect(r.monthlyCashflow[6].vendorSavings).toBe(0);
    expect(r.monthlyCashflow[7].vendorSavings).toBe(5_000);
    expect(r.monthlyCashflow.reduce((sum, row) => sum + row.netBenefit, 0)).toBe(43_800);
    expect(r.tco.map((year) => year.netBenefit)).toEqual([-17_400, 20_400, 20_400, 20_400]);
    const waterfall = buildWaterfall(r);
    expect(waterfall.slice(0, -1).reduce((sum, row) => sum + row.value, 0)).toBe(r.futureAnnualTotal);
  });

  it('does not invent payback beyond the selected horizon', () => {
    const a = fixture();
    a.assumptions.horizonYears = 1;
    const r = computeAssessment(a);
    expect(r.tcoNetBenefit).toBe(-17_400);
    expect(r.paybackMonths).toBeNull();
    expect(r.paybackStatus).toBe('not-reached');
  });

  it('simple mode ignores stored transition and timing settings without erasing them', () => {
    const a = fixture();
    a.assumptions.transitionEnabled = false;
    a.assumptions.migrationCostPerSeat = 500;
    a.assumptions.year1RealizationPct = 2;
    a.assumptions.conservative = { full: 0, partial: 0, strong: 0 };
    const r = computeAssessment(a);
    expect(r.year1NetBenefit).toBe(20_400);
    expect(r.tcoNetBenefit).toBe(81_600);
    expect(r.migrationTotal).toBe(0);
    expect(r.paybackStatus).toBe('no-investment');
    expect(r.paybackMonths).toBeNull();
    expect(a.assumptions.transitionCost).toBe(6_000);
  });

  it('zero delay starts in month one and outside-horizon delay earns nothing', () => {
    const a = fixture();
    a.lines[0].savingsDelayMonths = 0;
    a.addOns[0].savingsDelayMonths = 48;
    const r = computeAssessment(a);
    expect(r.monthlyCashflow[1].vendorSavings).toBe(5_000);
    expect(r.monthlyCashflow.every((m) => m.addOnSavings === 0)).toBe(true);
    expect(r.totalAnnualSavings).toBe(67_200);
    expect(r.year1NetBenefit).toBe(7_200);
  });

  it('fully absorbs a covered Microsoft add-on despite its legacy retained percentage', () => {
    const a = fixture();
    a.addOns[0].retainPct = 25;
    const r = computeAssessment(a);
    expect(r.addOnAnnualAbsorbed).toBe(7_200);
    expect(r.addOnAnnualRetained).toBe(0);
    expect(r.monthlyCashflow[4].addOnSavings).toBe(600);
    expect(r.currentAnnualTotal - r.futureAnnualTotal).toBe(r.recurringAnnualBenefit);
  });

  it('preserves fractional money through monthly and yearly reconciliation', () => {
    const a = fixture();
    a.lines[0].annual = 60_000.17;
    a.addOns[0].annual = 7_200.11;
    a.assumptions.transitionCost = 6_000.13;
    const r = computeAssessment(a);
    expect(r.monthlyCashflow.reduce((sum, row) => sum + row.netBenefit, 0)).toBeCloseTo(r.tcoNetBenefit, 6);
    expect(r.tco.reduce((sum, row) => sum + row.netBenefit, 0)).toBeCloseTo(r.tcoNetBenefit, 6);
    expect(r.currentAnnualTotal - r.futureAnnualTotal).toBeCloseTo(r.recurringAnnualBenefit, 6);
  });

  it('distinguishes cost increase and a genuine zero-cost break-even', () => {
    const a = fixture();
    a.lines = []; a.addOns = []; a.assumptions.transitionEnabled = false;
    expect(computeAssessment(a).paybackStatus).toBe('cost-increase');
    a.assumptions.e7ListPupm = a.assumptions.baselineUnitPupm;
    expect(computeAssessment(a).paybackStatus).toBe('break-even');
  });
});

describe('full-replacement scenario and USD cash readiness', () => {
  it('version 3 readiness is not a claim of human confirmation', () => {
    const a = fixture();
    const before = JSON.stringify(a);
    const r = computeAssessment(a);
    expect(MODEL_VERSION).toBe(3);
    expect(a.schemaVersion).toBe(2);
    expect(r.cashEstimateReady).toBe(true);
    expect(r.cashEstimateConfirmed).toBe(r.cashEstimateReady);
    expect([...r.scoredLines, ...r.scoredAddOns].every((line) => !line.requiresConfirmation)).toBe(true);
    expect(JSON.stringify(a)).toBe(before);
    expect(a.assumptions.pricesConfirmed).toBe(false);
    expect(a.lines[0].assumptionConfirmed).toBe(false);
    expect(a.addOns[0].assumptionConfirmed).toBe(false);
  });

  it.each([
    ['addon', 'EUR'], ['vendor', 'EUR'], ['addon', 'USD'], ['vendor', 'USD'],
  ] as const)('keeps the non-covered %s fully retained in %s regardless of legacy confirmation', (kind, currency) => {
    const a = fixture();
    a.currency = currency;
    a.assumptions.transitionEnabled = false;
    a.lines = kind === 'vendor' ? [{
      categoryId: 'siem-soar', vendor: 'Unverified retained vendor amount',
      mode: 'pupm', pupm: 41, retainPct: 0, amountSource: 'benchmark', assumptionConfirmed: false,
    }] : [];
    a.addOns = kind === 'addon' ? [{
      addOnId: 'windows-365', mode: 'pupm', pupm: 41,
      amountSource: 'benchmark', assumptionConfirmed: false,
    }] : [];
    const raw = JSON.stringify(a);
    const r = computeAssessment(a);
    expect(r.currentAnnualTotal).toBe(121_200);
    expect(r.futureAnnualTotal).toBe(168_000);
    expect(r.cashEstimateReady).toBe(currency === 'USD');
    expect(r.warnings.join(' ')).not.toContain('Confirm this');
    if (currency !== 'USD') expect(r.warnings.join(' ')).toContain('No FX conversion');
    expect(r.totalAnnualSavings).toBe(0);
    expect([...r.scoredLines, ...r.scoredAddOns][0].requiresConfirmation).toBe(false);
    expect(JSON.stringify(a)).toBe(raw);

    const entry = a.lines[0] ?? a.addOns[0];
    entry.assumptionConfirmed = true;
    const confirmed = computeAssessment(a);
    expect(confirmed.cashEstimateReady).toBe(currency === 'USD');
    expect(confirmed.totalAnnualSavings).toBe(0);
    expect(confirmed.currentAnnualTotal).toBe(r.currentAnnualTotal);
    expect(confirmed.futureAnnualTotal).toBe(r.futureAnnualTotal);

    entry.assumptionConfirmed = false;
    entry.amountSource = 'customer';
    expect(computeAssessment(a).cashEstimateReady).toBe(currency === 'USD');
    expect(computeAssessment(a).totalAnnualSavings).toBe(0);
  });

  it.each(['legacy', undefined] as const)('accepts usable retained USD invoices with %s provenance', (amountSource) => {
    const a = fixture();
    a.lines = [{
      categoryId: 'siem-soar', vendor: 'Retained invoice', mode: 'annual', annual: 49_200,
      retainPct: 0, amountSource, assumptionConfirmed: false,
    }];
    a.addOns = [];
    const r = computeAssessment(a);
    expect(r.cashEstimateReady).toBe(true);
    expect(r.warnings.join(' ')).not.toContain('provenance');
    expect(r.thirdPartyAnnual).toBe(49_200);
    expect(r.thirdPartyCreditConservative).toBe(0);
  });

  it.each(['benchmark', 'legacy', 'customer', undefined] as const)('credits known covered USD amounts with %s provenance without confirmation', (amountSource) => {
    const a = fixture();
    a.lines[0].amountSource = amountSource;
    a.addOns[0].amountSource = amountSource;
    a.lines[0].assumptionConfirmed = false;
    const before = computeAssessment(a);
    expect(before.thirdPartyAnnual).toBe(60_000);
    expect(before.thirdPartyCreditConservative).toBe(60_000);
    expect(before.addOnAnnualAbsorbed).toBe(7_200);
    expect(before.cashEstimateReady).toBe(true);
    expect(before.scoredLines[0].requiresConfirmation).toBe(false);
    a.lines[0].assumptionConfirmed = true;
    expect(computeAssessment(a).thirdPartyCreditConservative).toBe(60_000);
    a.lines[0].assumptionConfirmed = false;
    expect(computeAssessment(a).thirdPartyCreditConservative).toBe(60_000);
  });

  it('never lets confirmation turn a not-covered capability into savings', () => {
    const a = fixture();
    a.lines[0].categoryId = 'siem-soar';
    a.lines[0].amountSource = 'benchmark';
    const r = computeAssessment(a);
    expect(r.scoredLines[0].requiresConfirmation).toBe(false);
    expect(r.scoredLines[0].annualCredit).toBe(0);
  });

  it.each(['o365e3', 'm365e3', 'm365e5'] as const)('uses mapping, not evidence review gates, for every category on %s', (baseline) => {
    for (const category of CATEGORIES) {
      const a = fixture();
      a.baseline = baseline;
      a.lines[0].categoryId = category.id;
      a.lines[0].retainPct = 100;
      a.lines[0].amountSource = 'benchmark';
      const r = computeAssessment(a);
      expect(r.scoredLines[0].annualCredit, category.id)
        .toBe(category.coverage[baseline] === 'not-covered' ? 0 : 60_000);
      expect(r.cashEstimateReady, category.id).toBe(true);
    }
  });

  it.each(MS_ADD_ONS)('fully credits only absorbed add-on $id without confirmation', (meta) => {
    const a = fixture();
    a.addOns = [{
      addOnId: meta.id, mode: 'annual', annual: 1_200, retainPct: 100,
      amountSource: 'benchmark', assumptionConfirmed: false,
    }];
    const r = computeAssessment(a);
    expect(r.addOnAnnualAbsorbed).toBe(meta.absorbedByE7 ? 1_200 : 0);
    expect(r.cashEstimateReady).toBe(true);
  });

  it.each([
    ...MS_ADD_ONS.filter((meta) => meta.supersededBy).map((meta) => [meta.id, meta.supersededBy!] as const),
    ['entra-id-governance', 'entra-suite'],
    ['entra-id-p2', 'entra-suite'],
    ['entra-id-p1', 'entra-id-p2'],
    ['entra-id-p2', 'm365-e5-security'],
    ['entra-id-p1', 'm365-e5-security'],
    ['defender-endpoint-p1', 'defender-endpoint-p2'],
    ['defender-o365-p1', 'defender-o365-p2'],
  ] as const)('withholds %s / %s bundle credit until overlapping entries are removed', (member, bundle) => {
    const a = fixture();
    a.addOns = [
      { addOnId: member, mode: 'annual', annual: 1_200, amountSource: 'customer', assumptionConfirmed: false },
      { addOnId: bundle, mode: 'annual', annual: 2_400, amountSource: 'customer', assumptionConfirmed: false },
    ];
    const r = computeAssessment(a);
    expect(r.addOnAnnualTotal).toBe(3_600);
    expect(r.addOnAnnualAbsorbed).toBe(0);
    expect(r.cashEstimateReady).toBe(false);
    expect(r.scoredAddOns.every((line) => line.exclusionReason?.includes('Remove the duplicate'))).toBe(true);
    a.addOns = a.addOns.map((line) => ({ ...line, assumptionConfirmed: true }));
    a.assumptions.pricesConfirmed = true;
    expect(computeAssessment(a).addOnAnnualAbsorbed).toBe(0);
    expect(computeAssessment(a).cashEstimateReady).toBe(false);
    a.addOns = [a.addOns[1]];
    expect(computeAssessment(a).addOnAnnualAbsorbed).toBe(2_400);
    expect(computeAssessment(a).cashEstimateReady).toBe(true);
  });

  it('does not infer duplicated invoices just from shared capabilities or licence prerequisites', () => {
    const a = fixture();
    a.addOns = [
      { addOnId: 'intune-plan1', mode: 'annual', annual: 1_200 },
      { addOnId: 'intune-suite', mode: 'annual', annual: 2_400 },
      { addOnId: 'entra-id-governance', mode: 'annual', annual: 3_600 },
      { addOnId: 'defender-endpoint-p2', mode: 'annual', annual: 4_800 },
    ];
    expect(computeAssessment(a).addOnAnnualAbsorbed).toBe(12_000);
    expect(computeAssessment(a).cashEstimateReady).toBe(true);
    a.addOns = [
      { addOnId: 'entra-id-p1', mode: 'annual', annual: 1_200 },
      { addOnId: 'entra-suite', mode: 'annual', annual: 2_400 },
    ];
    expect(computeAssessment(a).addOnAnnualAbsorbed).toBe(3_600);
    expect(computeAssessment(a).cashEstimateReady).toBe(true);
  });

  it.each([undefined, 0, 1_200])('excludes both sides of duplicates even when the other amount is %s', (annual) => {
    const a = fixture();
    a.lines.push({ ...a.lines[0], annual, assumptionConfirmed: true });
    a.addOns.push({ ...a.addOns[0], annual, assumptionConfirmed: true });
    a.lines[0].assumptionConfirmed = true;
    a.addOns[0].assumptionConfirmed = true;
    const r = computeAssessment(a);
    expect(r.thirdPartyAnnual).toBe(60_000 + (annual ?? 0));
    expect(r.addOnAnnualTotal).toBe(7_200 + (annual ?? 0));
    expect(r.totalAnnualSavings).toBe(0);
    expect(r.cashEstimateReady).toBe(false);
    expect(r.futureAnnualTotal).toBe(r.e7Annual + r.thirdPartyAnnual + r.addOnAnnualTotal);
  });

  it('detects identical object references and legacy aliases as duplicate add-ons', () => {
    const a = fixture();
    a.addOns.push(a.addOns[0]);
    expect(computeAssessment(a).addOnAnnualAbsorbed).toBe(0);
    a.addOns[1] = { ...a.addOns[0], addOnId: 'copilot-m365' };
    expect(computeAssessment(a).addOnAnnualAbsorbed).toBe(0);
    a.addOns.pop();
    expect(computeAssessment(a).addOnAnnualAbsorbed).toBe(7_200);
  });

  it.each([false, true])('keeps non-USD inputs excluded even with legacy confirmations set to %s', (confirmed) => {
    const a = fixture();
    a.currency = 'EUR';
    a.lines[0].amountSource = 'customer'; a.lines[0].assumptionConfirmed = confirmed;
    a.addOns[0].assumptionConfirmed = confirmed;
    a.assumptions.pricesConfirmed = confirmed;
    a.plannedCapabilities = ['ztna', 'genai-assistant'];
    const r = computeAssessment(a);
    expect(r.scoredLines[0].annualCredit).toBe(0);
    expect(r.cashEstimateReady).toBe(false);
    expect(r.totalAnnualSavings).toBe(0);
    expect(r.referenceCurrency).toBe('USD');
    expect(r.costAvoidance.currency).toBe('USD');
    expect(r.costAvoidance.lines.length).toBeGreaterThan(0);
    expect(r.costAvoidance.lines.every((row) => row.currency === 'USD')).toBe(true);
  });

  it('keeps unknown invoice amounts distinct from explicit zero', () => {
    const a = fixture();
    a.lines[0].annual = undefined;
    const unknown = computeAssessment(a);
    expect(unknown.cashEstimateReady).toBe(false);
    expect(unknown.warnings.join(' ')).toContain('unknown, not explicit zeros');
    a.lines[0].annual = 0;
    const zero = computeAssessment(a);
    expect(zero.cashEstimateReady).toBe(true);
    expect(zero.thirdPartyAnnual).toBe(0);
    expect(zero.scoredLines[0].eligible).toBe(true);
  });

  it.each([null, -1, NaN, Infinity, '60000'])('does not present invalid invoice amount %s as a usable zero', (annual) => {
    const a = fixture();
    a.lines[0].annual = annual as number;
    const r = computeAssessment(a);
    expect(r.scoredLines[0].eligible).toBe(false);
    expect(r.scoredLines[0].annualCredit).toBe(0);
    expect(r.cashEstimateReady).toBe(false);
    expect(r.cashEstimateConfirmed).toBe(false);
  });

  it.each([
    { baselineUnitPupm: NaN }, { e7ListPupm: Infinity }, { e7DiscountPct: 101 },
    { horizonYears: 0 }, { transitionCost: undefined },
  ])('withholds readiness for unusable active assumptions: %j', (patch) => {
    const a = fixture();
    Object.assign(a.assumptions, patch);
    expect(computeAssessment(a).cashEstimateReady).toBe(false);
  });

  it('requires known identities, but not covered identities, for cash readiness', () => {
    const a = fixture();
    a.lines[0].categoryId = 'legacy-unknown-category';
    a.addOns[0].addOnId = 'legacy-unknown-addon';
    const r = computeAssessment(a);
    expect(r.cashEstimateReady).toBe(false);
    expect(r.totalAnnualSavings).toBe(0);
    expect(r.thirdPartyAnnual).toBe(60_000);
    expect(r.addOnAnnualRetained).toBe(7_200);
  });

  it('does not count capability cost avoidance for add-ons already purchased', () => {
    const a = fixture();
    a.addOns = [{ addOnId: 'entra-suite', mode: 'annual', annual: 12_000 }];
    a.plannedCapabilities = ['ztna'];
    const r = computeAssessment(a);
    const ztna = r.costAvoidance.capabilities.find((c) => c.category.id === 'ztna')!;
    expect(ztna.selected).toBe(true);
    expect(ztna.ownedVia.length).toBeGreaterThan(0);
    expect(r.costAvoidance.lines.reduce((acc, row) => acc + row.annual, 0)).toBe(0);
    expect(r.costAvoidance.annualAvoided).toBe(0);
  });
});
