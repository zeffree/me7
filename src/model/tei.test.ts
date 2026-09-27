/**
 * These tests are the reason the TEI feature can be shipped at all.
 *
 * The whole model rests on one division: a published benefit divided by the seat population that
 * earned it. If that division is wrong, or if a figure is transcribed wrongly, every number the
 * panel shows is quietly wrong too — and it would look exactly as confident as a correct one.
 *
 * So the core tests below run the division backwards. They take each stored line, re-multiply it
 * by that study's own composite seat count, and assert the result reproduces the figures Forrester
 * actually printed: the year values, the line totals, and the three-year present value of the
 * study as a whole.
 */

import { describe, expect, it } from 'vitest';
import {
  COPILOT_ENABLEMENT_PER_SEAT,
  TEI_DISCOUNT_RATE,
  TEI_STUDIES,
  getStudy,
  isLineOnByDefault,
  perSeatRate,
  studiesForBaseline,
} from '@/data/teiStudies';
import { DEFAULT_TEI_SETTINGS, computeTei, discountYear, isLineIncluded } from './tei';
import { DEFAULT_ASSUMPTIONS, computeAssessment } from './engine';
import type { Assessment, TeiSettings } from './types';

/** Forrester rounds inside its own tables, so exact equality is not available. */
const TOLERANCE_PCT = 0.001;

function closeTo(actual: number, expected: number) {
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThan(TOLERANCE_PCT);
}

function assessment(over: Partial<Assessment> = {}): Assessment {
  return {
    orgName: 'Test',
    seats: 10_000,
    currency: 'USD',
    baseline: 'm365e5',
    assumptions: { ...DEFAULT_ASSUMPTIONS },
    lines: [],
    addOns: [],
    plannedCapabilities: [],
    tei: { ...DEFAULT_TEI_SETTINGS, enabled: true },
    ...over,
  };
}

function tei(over: Partial<TeiSettings>): TeiSettings {
  return { ...DEFAULT_TEI_SETTINGS, enabled: true, ...over };
}

function combinedAssessment(over: Partial<Assessment> = {}): Assessment {
  const a = assessment(over);
  const lineOverrides = Object.fromEntries(TEI_STUDIES.flatMap((study) =>
    study.lines.map((line) => [line.id, line.id === 'copilot-operations'])));
  return {
    ...a,
    tei: { ...a.tei, lineOverrides, combinedReviewed: true, enablementOverlapReviewed: true },
  };
}

describe('separate-study and combined simulation policy', () => {
  it('uses USD cash readiness rather than legacy amount or price confirmations', () => {
    const a = combinedAssessment({
      lines: [{
        categoryId: 'edr-xdr', vendor: 'Illustrative invoice', mode: 'annual', annual: 60_000,
        retainPct: 100, amountSource: 'benchmark', assumptionConfirmed: false,
      }],
    });
    const cash = computeAssessment(a);
    expect(a.assumptions.pricesConfirmed).toBe(false);
    expect(cash.cashEstimateReady).toBe(true);
    expect(computeTei(a, { ...cash, cashEstimateConfirmed: false }).canCombine).toBe(true);
    expect(computeTei(a, { ...cash, cashEstimateReady: false, cashEstimateConfirmed: true }).canCombine).toBe(false);
  });

  it('does not let combined review or legacy confirmations bypass duplicate cash invoices', () => {
    const a = combinedAssessment({
      addOns: [
        { addOnId: 'entra-suite', mode: 'annual', annual: 2_400, assumptionConfirmed: true },
        { addOnId: 'entra-id-governance', mode: 'annual', annual: 1_200, assumptionConfirmed: true },
      ],
    });
    a.assumptions.pricesConfirmed = true;
    const r = computeTei(a, computeAssessment(a));
    expect(r.canCombine).toBe(false);
    expect(r.combinationWarnings.join(' ')).toContain('ambiguous USD cash-model inputs');
    expect(r.cashBenefitPv).toBe(0);
    expect(r.npv).toBeNull();
    a.addOns.pop();
    expect(computeTei(a, computeAssessment(a)).canCombine).toBe(true);
  });

  it('distinguishes a profitable combination with no initial investment from unreached payback', () => {
    const a = combinedAssessment({
      seats: 100,
      assumptions: { ...DEFAULT_ASSUMPTIONS, baselineUnitPupm: 60, e7ListPupm: 99 },
      tei: tei({ copilotAdoptionPct: 100, confidencePct: 100, includeEnablementCost: true }),
    });
    const r = computeTei(a, computeAssessment(a));
    expect(r.canCombine).toBe(true);
    expect(r.scoredLines.filter((line) => line.included).map((line) => line.lineId)).toEqual(['copilot-operations']);
    expect(r.migrationTotal).toBe(0);
    expect(r.years[0].net).toBeGreaterThan(0);
    expect(r.paybackMonths).toBeNull();
    expect(r.paybackStatus).toBe('no-investment');

    a.assumptions.transitionEnabled = true;
    a.assumptions.transitionCost = 1e12;
    const unreached = computeTei(a, computeAssessment(a));
    expect(unreached.canCombine).toBe(true);
    expect(unreached.paybackMonths).toBeNull();
    expect(unreached.paybackStatus).toBe('not-reached');
  });

  it('requires a persisted specific training-cost review, not merely a transition budget', () => {
    const a = combinedAssessment({
      assumptions: { ...DEFAULT_ASSUMPTIONS, transitionEnabled: true, transitionCost: 1_000_000 },
      tei: tei({ includeEnablementCost: false }),
    });
    a.tei.enablementOverlapReviewed = false;
    const unreviewed = computeTei(a, computeAssessment(a));
    expect(unreviewed.canCombine).toBe(false);
    expect(unreviewed.combinationWarnings.join(' ')).toContain('exact excluded Copilot training cost');
    a.tei.enablementOverlapReviewed = true;
    expect(computeTei(a, computeAssessment(a)).canCombine).toBe(true);
  });
  it('shows standalone USD benefits without assigning common investment to each study', () => {
    const a = assessment();
    const r = computeTei(a, computeAssessment(a));
    expect(r.enabled).toBe(true);
    expect(r.canCombine).toBe(false);
    expect(r.paybackStatus).toBe('withheld');
    expect(r.referenceCurrency).toBe('USD');
    expect(r.studies.some((study) => study.presentValue > 0)).toBe(true);
    for (const study of r.studies) {
      expect(study.total).toBeCloseTo(study.byYear.reduce((sum, value) => sum + value, 0), 6);
    }
    expect(r.npv).toBeNull();
    expect(r.roiPct).toBeNull();
    expect(r.totalBenefitPv).toBe(0);
    expect(r.costPv).toBe(0);
    expect(r.years).toEqual([]);
    expect(r.combinationWarnings.join(' ')).toContain('review');
  });

  it('withholds mixed-currency ROI even after an explicit review', () => {
    const a = combinedAssessment({ currency: 'EUR' });
    const r = computeTei(a, computeAssessment(a));
    expect(r.canCombine).toBe(false);
    expect(r.teiBenefitPv).toBeGreaterThan(0);
    expect(r.cashBenefitPv).toBe(0);
    expect(r.npv).toBeNull();
    expect(r.combinationWarnings.join(' ')).toContain('non-USD');
  });

  it('a blanket review cannot legitimate active overlapping benefits', () => {
    const groups = new Map<string, string[]>();
    for (const study of TEI_STUDIES) for (const line of study.lines) {
      const group = (line as typeof line & { overlapGroup?: string }).overlapGroup;
      if (group) groups.set(group, [...(groups.get(group) ?? []), line.id]);
    }
    const duplicate = [...groups.values()].find((ids) => ids.length > 1);
    expect(duplicate).toBeDefined();
    const a = combinedAssessment({ baseline: 'm365e3' });
    for (const id of duplicate!) a.tei.lineOverrides[id] = true;
    const r = computeTei(a, computeAssessment(a));
    expect(r.canCombine).toBe(false);
    expect(r.combinationWarnings.join(' ')).toContain('overlapping benefit group');
    expect(r.npv).toBeNull();
  });

  it('requires cash-consolidation study lines to remain excluded in a combined simulation', () => {
    const a = combinedAssessment({ baseline: 'm365e3' });
    a.tei.lineOverrides['e5-legacy-software'] = true;
    const r = computeTei(a, computeAssessment(a));
    expect(r.canCombine).toBe(false);
    expect(r.combinationWarnings.join(' ')).toContain('common cash benefit');
  });

  it.each(['copilot', 'copilot-m365'])('does not treat already-purchased %s as wholly new TEI value', (addOnId) => {
    const a = assessment({ addOns: [{ addOnId, mode: 'annual', annual: 1_200 }] });
    const r = computeTei(a, computeAssessment(a));
    expect(r.studies.find((study) => study.studyId === 'copilot')?.total).toBe(0);
    expect(r.studies.find((study) => study.studyId === 'copilot')?.notApplicableReason).toContain('already bought');
  });

  it('uses the golden scheduled cash benefits and transition charge exactly once', () => {
    const a = combinedAssessment({
      seats: 100,
      assumptions: {
        ...DEFAULT_ASSUMPTIONS, horizonYears: 4, transitionEnabled: true, transitionCost: 6_000,
      },
      lines: [{
        categoryId: 'edr-xdr', vendor: 'Customer', mode: 'annual', annual: 60_000,
        retainPct: 20, savingsDelayMonths: 6, amountSource: 'customer', assumptionConfirmed: true,
      }],
      addOns: [{
        addOnId: 'copilot', mode: 'annual', annual: 7_200, savingsDelayMonths: 3,
        amountSource: 'customer', assumptionConfirmed: true,
      }],
      tei: tei({ confidencePct: 0, includeEnablementCost: false }),
    });
    const cash = computeAssessment(a);
    const r = computeTei(a, cash);
    expect(r.canCombine).toBe(true);
    expect(r.years.map((year) => year.cashBenefit)).toEqual([35_400, 67_200, 67_200, 67_200]);
    expect(r.years[0].net).toBe(-11_400);
    expect(r.years[0].cumulativeNet).toBe(-17_400);
    expect(r.years[3].cumulativeNet).toBe(43_800);
    expect(r.paybackMonths).toBe(23);
    expect(r.paybackStatus).toBe('reached');
    expect(r.cashBenefitPv).toBeCloseTo(35_400 / 1.1 + 67_200 / 1.1 ** 2 + 67_200 / 1.1 ** 3 + 67_200 / 1.1 ** 4, 6);
    expect(r.costPv).toBeCloseTo(6_000 + [1, 2, 3, 4].reduce((sum, year) => sum + 46_800 / 1.1 ** year, 0), 6);
  });
});

describe('study data reconciles to the published figures', () => {
  it.each(TEI_STUDIES.map((s) => [s.id, s] as const))(
    '%s: every line re-multiplies to its published year values',
    (_id, study) => {
      for (const line of study.lines) {
        for (let y = 0; y < 3; y++) {
          const rebuilt = perSeatRate(line, y) * line.divisor[y];
          closeTo(rebuilt, line.published[y]);
        }
      }
    },
  );

  it.each(TEI_STUDIES.map((s) => [s.id, s] as const))(
    '%s: NPV, benefits and costs are internally consistent',
    (_id, study) => {
      closeTo(study.publishedBenefitsPv - study.publishedCostsPv, study.publishedNpv);
      // Forrester prints ROI rounded to a whole percent, so reconcile at that precision:
      // the E5 study's own figures give 189.69%, printed as 190%.
      const computed = (study.publishedNpv / study.publishedCostsPv) * 100;
      expect(Math.round(computed)).toBe(study.publishedRoiPct);
    },
  );

  it('E5 lines sum to the published three-year present value', () => {
    const study = getStudy('m365e5')!;
    // Every line in the E5 study is modelled, so the sum must reproduce the study total. This is
    // the check that catches a mistyped digit anywhere in the table.
    const pv = study.lines.reduce(
      (acc, line) =>
        acc + line.published.reduce((a, v, i) => a + discountYear(v, i + 1), 0),
      0,
    );
    closeTo(pv, study.publishedBenefitsPv);
  });

  it('Entra Suite lines sum to the published three-year present value', () => {
    const study = getStudy('entra-suite')!;
    const pv = study.lines.reduce(
      (acc, line) =>
        acc + line.published.reduce((a, v, i) => a + discountYear(v, i + 1), 0),
      0,
    );
    closeTo(pv, study.publishedBenefitsPv);
  });

  it('Copilot modelled lines plus the excluded go-to-market line reach the study total', () => {
    const study = getStudy('copilot')!;
    const modelled = study.lines.reduce(
      (acc, line) => acc + line.published.reduce((a, v, i) => a + discountYear(v, i + 1), 0),
      0,
    );
    const excluded = (study.excluded ?? []).reduce((a, e) => a + e.publishedPv, 0);
    closeTo(modelled + excluded, study.publishedBenefitsPv);
  });

  it('Copilot operations reconciles to the study drivers, not just its printed total', () => {
    // 9 hours a month x $38 fully burdened x 50% recapture, on the 67% of licensed seats outside
    // sales, marketing and customer service, less a 10% risk adjustment.
    const eligible = 2010; // printed as row B5 for year one, against 3,000 licensed seats
    const gross = eligible * 9 * 12 * 38 * 0.5;
    const riskAdjusted = gross * 0.9;
    const line = getStudy('copilot')!.lines.find((l) => l.id === 'copilot-operations')!;
    closeTo(riskAdjusted, line.published[0]);
  });

  it('Copilot operations is flat per licensed seat despite the seat ramp', () => {
    const line = getStudy('copilot')!.lines.find((l) => l.id === 'copilot-operations')!;
    closeTo(perSeatRate(line, 1), perSeatRate(line, 0));
    closeTo(perSeatRate(line, 2), perSeatRate(line, 0));
  });

  it('Copilot people and culture ramps, and is not flattened by the divisor', () => {
    const line = getStudy('copilot')!.lines.find((l) => l.id === 'copilot-people')!;
    expect(perSeatRate(line, 1)).toBeGreaterThan(perSeatRate(line, 0));
    expect(perSeatRate(line, 2)).toBeGreaterThan(perSeatRate(line, 1));
  });

  it('holds the year-three rate beyond the study horizon rather than extrapolating a trend', () => {
    const line = getStudy('copilot')!.lines.find((l) => l.id === 'copilot-people')!;
    expect(perSeatRate(line, 7)).toBe(perSeatRate(line, 2));
  });

  it('every line carries a citable identity', () => {
    for (const study of TEI_STUDIES) {
      expect(study.url).toMatch(/^https:\/\//);
      for (const line of study.lines) {
        expect(line.ref).toBeTruthy();
        expect(line.name).toBeTruthy();
        expect(line.detail.length).toBeGreaterThan(20);
      }
    }
  });

  it('has no duplicate line ids across studies', () => {
    const ids = TEI_STUDIES.flatMap((s) => s.lines.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('double-counting guards', () => {
  it('ships every cost-type line switched off', () => {
    const costLines = TEI_STUDIES.flatMap((s) => s.lines).filter((l) => l.kind === 'cost');
    expect(costLines.length).toBeGreaterThan(0);
    for (const line of costLines) expect(isLineOnByDefault(line)).toBe(false);
  });

  it('gives a reason for every line that is off by default', () => {
    for (const line of TEI_STUDIES.flatMap((s) => s.lines)) {
      if (!isLineOnByDefault(line)) {
        expect(line.doubleCounts ?? line.caution).toBeTruthy();
      }
    }
  });

  it('excludes the consolidation lines that the cash engine already counts', () => {
    for (const id of ['e5-legacy-software', 'entra-vendor-consolidation', 'entra-vpn']) {
      const line = TEI_STUDIES.flatMap((s) => s.lines).find((l) => l.id === id)!;
      expect(line.doubleCounts).toBeTruthy();
      expect(isLineIncluded(line, DEFAULT_TEI_SETTINGS)).toBe(false);
    }
  });

  it('keeps the legacy-software line out of the total until explicitly switched on', () => {
    const a = assessment({ baseline: 'm365e3' });
    const off = computeTei(a, computeAssessment(a));
    const on = computeTei(
      { ...a, tei: tei({ lineOverrides: { 'e5-legacy-software': true } }) },
      computeAssessment(a),
    );
    expect(on.teiBenefitPv).toBeGreaterThan(off.teiBenefitPv);
    expect(off.scoredLines.find((l) => l.lineId === 'e5-legacy-software')!.total).toBe(0);
  });

  it('does not model the revenue-linked go-to-market benefit at all', () => {
    const study = getStudy('copilot')!;
    expect(study.lines.find((l) => l.id.includes('go-to-market'))).toBeUndefined();
    expect(study.excluded?.[0].name).toContain('Go to market');
  });
});

describe('baseline awareness', () => {
  it('withholds the E5 study from a customer already on E5', () => {
    expect(studiesForBaseline('m365e5').map((s) => s.id)).toEqual(['copilot', 'entra-suite']);
  });

  it('applies all three studies to the E3 tiers', () => {
    expect(studiesForBaseline('m365e3')).toHaveLength(3);
    expect(studiesForBaseline('o365e3')).toHaveLength(3);
  });

  it('zeroes E5 lines and explains why, for an E5 customer', () => {
    const a = assessment({ baseline: 'm365e5' });
    const result = computeTei(a, computeAssessment(a));
    const summary = result.studies.find((s) => s.studyId === 'm365e5')!;
    expect(summary.applies).toBe(false);
    expect(summary.notApplicableReason).toContain('banked');
    expect(summary.presentValue).toBe(0);
    for (const line of result.scoredLines.filter((l) => l.studyId === 'm365e5')) {
      expect(line.included).toBe(false);
      expect(line.total).toBe(0);
    }
  });

  it('produces a larger simulation for an E3 customer than an E5 one', () => {
    const e3 = assessment({
      baseline: 'm365e3',
      tei: tei({ lineOverrides: { 'e5-productivity': true } }),
    });
    const e5 = assessment({ baseline: 'm365e5' });
    expect(computeTei(e3, computeAssessment(e3)).teiBenefitPv).toBeGreaterThan(
      computeTei(e5, computeAssessment(e5)).teiBenefitPv,
    );
  });
});

describe('scaling to the customer', () => {
  it('reproduces the study when the customer is the composite', () => {
    // An M365 E3 customer with exactly the composite's 10,000 E5 seats, no haircut, no adoption
    // discount and only the E5 study's lines, must reproduce the published benefits PV.
    const a = assessment({
      seats: 10_000,
      baseline: 'm365e3',
      tei: tei({
        confidencePct: 100,
        copilotAdoptionPct: 0,
        includeEnablementCost: false,
        lineOverrides: Object.fromEntries(getStudy('m365e5')!.lines.map((line) => [line.id, true])),
      }),
    });
    const result = computeTei(a, computeAssessment(a));
    const e5Pv = result.scoredLines
      .filter((l) => l.studyId === 'm365e5')
      .reduce((acc, l) => acc + l.presentValue, 0);
    closeTo(e5Pv, getStudy('m365e5')!.publishedBenefitsPv);
  });

  it('scales linearly with seats', () => {
    const small = assessment({ seats: 1_000, baseline: 'm365e3' });
    const large = assessment({ seats: 10_000, baseline: 'm365e3' });
    const a = computeTei(small, computeAssessment(small)).teiBenefitPv;
    const b = computeTei(large, computeAssessment(large)).teiBenefitPv;
    closeTo(b, a * 10);
  });

  it('applies Copilot adoption to Copilot lines only', () => {
    const a = assessment({ baseline: 'm365e3', tei: tei({ copilotAdoptionPct: 50 }) });
    const result = computeTei(a, computeAssessment(a));
    const copilotLine = result.scoredLines.find((l) => l.studyId === 'copilot')!;
    const entraLine = result.scoredLines.find((l) => l.studyId === 'entra-suite')!;
    expect(copilotLine.appliedSeats).toBe(5_000);
    expect(entraLine.appliedSeats).toBe(10_000);
  });

  it('applies the confidence haircut proportionally', () => {
    const full = assessment({ baseline: 'm365e3', tei: tei({ confidencePct: 100 }) });
    const half = assessment({ baseline: 'm365e3', tei: tei({ confidencePct: 50 }) });
    closeTo(
      computeTei(half, computeAssessment(half)).teiBenefitPv * 2,
      computeTei(full, computeAssessment(full)).teiBenefitPv,
    );
  });

  it('honours the assessment horizon', () => {
    const a = assessment({
      baseline: 'm365e3',
      assumptions: { ...DEFAULT_ASSUMPTIONS, horizonYears: 5 },
    });
    const result = computeTei(a, computeAssessment(a));
    expect(result.studies.every((study) => study.byYear.length === 5)).toBe(true);
    expect(result.years).toHaveLength(0);
    expect(result.scoredLines[0].byYear).toHaveLength(5);
  });

  it('discounts at the same 10% the studies use', () => {
    expect(TEI_DISCOUNT_RATE).toBe(0.1);
    closeTo(discountYear(110, 1), 100);
  });
});

describe('costs and the resulting ROI', () => {
  it('charges Copilot enablement from the study’s own training line', () => {
    const a = combinedAssessment({
      seats: 1_000,
      tei: tei({ copilotAdoptionPct: 100, includeEnablementCost: true }),
    });
    const result = computeTei(a, computeAssessment(a));
    const expected = COPILOT_ENABLEMENT_PER_SEAT.reduce((sum, rate) => sum + rate * 1_000, 0);
    closeTo(result.enablementTotal, expected);
  });

  it('drops enablement when switched off', () => {
    const a = combinedAssessment({ tei: tei({ includeEnablementCost: false }) });
    expect(computeTei(a, computeAssessment(a)).enablementTotal).toBe(0);
  });

  it('scales enablement with Copilot adoption', () => {
    const half = combinedAssessment({ seats: 1_000, tei: tei({ copilotAdoptionPct: 50 }) });
    const full = combinedAssessment({ seats: 1_000, tei: tei({ copilotAdoptionPct: 100 }) });
    closeTo(
      computeTei(half, computeAssessment(half)).enablementTotal * 2,
      computeTei(full, computeAssessment(full)).enablementTotal,
    );
  });

  it('treats a negative uplift as benefit, never as a negative cost', () => {
    // E7 cheaper than the current baseline: the uplift must not become a negative denominator.
    const a = combinedAssessment({
      assumptions: { ...DEFAULT_ASSUMPTIONS, baselineUnitPupm: 200, e7ListPupm: 99 },
    });
    const result = computeTei(a, computeAssessment(a));
    expect(result.upliftAnnual).toBe(0);
    expect(result.costPv).toBeGreaterThanOrEqual(0);
    expect(result.years[0].cashBenefit).toBeGreaterThan(0);
  });

  it('reports ROI as null rather than dividing by a zero cost base', () => {
    const a = combinedAssessment({
      seats: 0,
      assumptions: { ...DEFAULT_ASSUMPTIONS, migrationCostPerSeat: 0 },
      tei: tei({ includeEnablementCost: false }),
    });
    expect(computeTei(a, computeAssessment(a)).roiPct).toBeNull();
  });

  it('keeps NPV equal to benefits less costs', () => {
    const a = combinedAssessment({ baseline: 'm365e3', assumptions: { ...DEFAULT_ASSUMPTIONS, transitionEnabled: true, transitionCost: 150_000 } });
    const r = computeTei(a, computeAssessment(a));
    expect(r.canCombine).toBe(true);
    closeTo(r.npv!, r.totalBenefitPv - r.costPv);
    closeTo(r.totalBenefitPv, r.teiBenefitPv + r.cashBenefitPv);
  });

  it('charges migration once, at time zero, and not again inside year one', () => {
    const a = combinedAssessment({
      seats: 1_000,
      assumptions: { ...DEFAULT_ASSUMPTIONS, transitionEnabled: true, transitionCost: 50_000 },
    });
    const r = computeTei(a, computeAssessment(a));
    expect(r.migrationTotal).toBe(50_000);
    // Year one's cost row is recurring only — licence uplift plus year-one enablement...
    closeTo(r.years[0].cost, r.upliftAnnual + COPILOT_ENABLEMENT_PER_SEAT[0] * r.copilotSeats);
    // ...and the cumulative series starts in the hole by exactly the migration investment.
    closeTo(r.years[0].cumulativeNet, r.years[0].net - 50_000);
    // Which means it appears in the cost present value exactly once, undiscounted.
    const recurringPv = r.years.reduce((acc, y) => acc + discountYear(y.cost, y.year), 0);
    closeTo(r.costPv, recurringPv + 50_000);
  });

  it('returns a payback of null when the move never gets there', () => {
    const a = combinedAssessment({
      seats: 1_000,
      baseline: 'm365e5',
      assumptions: { ...DEFAULT_ASSUMPTIONS, baselineUnitPupm: 0, e7ListPupm: 10_000 },
      tei: tei({ confidencePct: 0, includeEnablementCost: false }),
    });
    expect(computeTei(a, computeAssessment(a)).paybackMonths).toBeNull();
  });
});

describe('opt-in and robustness', () => {
  it('is off until the user opts in', () => {
    expect(DEFAULT_TEI_SETTINGS.enabled).toBe(false);
    const a = assessment({ tei: { ...DEFAULT_TEI_SETTINGS } });
    expect(computeTei(a, computeAssessment(a)).enabled).toBe(false);
  });

  it('survives a missing settings object from an older share link', () => {
    const a = assessment();
    delete (a as Partial<Assessment>).tei;
    const result = computeTei(a, computeAssessment(a));
    expect(result.enabled).toBe(false);
    expect(result.npv).toBeNull();
    expect(result.teiBenefitPv).toBe(0);
  });

  it('produces finite numbers for a zero-seat assessment', () => {
    const a = assessment({ seats: 0 });
    const r = computeTei(a, computeAssessment(a));
    expect(r.teiBenefitPv).toBe(0);
    expect(r.npv).toBeNull();
    expect(r.costPv).toBe(0);
  });

  it('clamps out-of-range percentages instead of producing nonsense', () => {
    const a = assessment({
      baseline: 'm365e3',
      tei: tei({ confidencePct: 900, copilotAdoptionPct: -50 }),
    });
    const b = assessment({ baseline: 'm365e3', tei: tei({ confidencePct: 100, copilotAdoptionPct: 0 }) });
    closeTo(
      computeTei(a, computeAssessment(a)).teiBenefitPv,
      computeTei(b, computeAssessment(b)).teiBenefitPv,
    );
  });

  it('never lets the simulation touch the cash engine result', () => {
    const a = assessment({ baseline: 'm365e3' });
    const cash = computeAssessment(a);
    const before = { ...cash };
    computeTei(a, cash);
    expect(cash.netAnnualConservative).toBe(before.netAnnualConservative);
    expect(cash.totalSavingsConservative).toBe(before.totalSavingsConservative);
    expect(cash.effectiveNetPupmConservative).toBe(before.effectiveNetPupmConservative);
  });
});
