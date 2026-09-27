import { describe, expect, it } from 'vitest';
import { annualiseLine, buildWaterfall, computeAssessment, DEFAULT_ASSUMPTIONS } from './engine';
import { DEFAULT_TEI_SETTINGS } from './tei';
import type { Assessment, SpendLine } from './types';
import type { BaselineSkuId } from '@/data/skus';
import { CATEGORIES } from '@/data/categories';

/**
 * Resolve a covered category from the catalog rather than coupling arithmetic fixtures to a
 * particular product. Confidence labels are descriptive and never scale replacement credit.
 */
const FULL_CONFIDENCE_CATEGORY = CATEGORIES.find((c) => c.confidence === 'full')?.id;
if (!FULL_CONFIDENCE_CATEGORY) {
  throw new Error('No full-confidence category in the catalog; update these fixtures.');
}

function makeAssessment(
  baseline: BaselineSkuId,
  overrides: Partial<Assessment> = {},
): Assessment {
  const assessment: Assessment = {
    orgName: 'Test Corp',
    seats: 1000,
    currency: 'USD',
    baseline,
    assumptions: {
      ...DEFAULT_ASSUMPTIONS,
      baselineUnitPupm: baseline === 'm365e5' ? 60 : baseline === 'm365e3' ? 39 : 26,
    },
    lines: [],
    addOns: [],
    plannedCapabilities: [],
    tei: { ...DEFAULT_TEI_SETTINGS },
    ...overrides,
  };
  return {
    ...assessment,
    lines: assessment.lines.map((l) => ({ amountSource: 'customer', ...l })),
    addOns: assessment.addOns.map((l) => ({ amountSource: 'customer', ...l })),
  };
}

const line = (over: Partial<SpendLine> & { categoryId: string }): SpendLine => ({
  vendor: 'Test Vendor',
  mode: 'pupm',
  pupm: 10,
  retainPct: 0,
  ...over,
});

describe('annualiseLine', () => {
  it('annualises per-user-per-month spend using org seats by default', () => {
    expect(annualiseLine(line({ categoryId: 'edr-xdr', pupm: 10 }), 1000)).toBe(120_000);
  });

  it('uses the line-level seat override when present', () => {
    expect(annualiseLine(line({ categoryId: 'edr-xdr', pupm: 10, seats: 250 }), 1000)).toBe(30_000);
  });

  it('uses the annual total verbatim in annual mode', () => {
    expect(
      annualiseLine(line({ categoryId: 'edr-xdr', mode: 'annual', annual: 87_500 }), 1000),
    ).toBe(87_500);
  });

  it('never returns a negative or NaN figure', () => {
    expect(annualiseLine(line({ categoryId: 'edr-xdr', pupm: -5 }), 1000)).toBe(0);
    expect(
      annualiseLine(line({ categoryId: 'edr-xdr', pupm: Number.NaN }), 1000),
    ).toBe(0);
  });
});

describe('baseline-aware bucketing', () => {
  it('classifies EDR as already redundant for an M365 E5 customer', () => {
    const r = computeAssessment(
      makeAssessment('m365e5', { lines: [line({ categoryId: 'edr-xdr' })] }),
    );
    expect(r.scoredLines[0].bucket).toBe('already-redundant');
  });

  it('classifies EDR P2 as an upgrade from M365 E3 endpoint P1', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', { lines: [line({ categoryId: 'edr-xdr' })] }),
    );
    expect(r.scoredLines[0].bucket).toBe('partial-upgrade');
  });

  it('treats ZTNA as unlocked even for E5, because the Entra Suite is an E5 add-on', () => {
    const r = computeAssessment(
      makeAssessment('m365e5', { lines: [line({ categoryId: 'ztna' })] }),
    );
    expect(r.scoredLines[0].bucket).toBe('unlocked-by-e7');
  });

  it('treats file storage as already redundant on every baseline', () => {
    for (const b of ['o365e3', 'm365e3', 'm365e5'] as BaselineSkuId[]) {
      const r = computeAssessment(makeAssessment(b, { lines: [line({ categoryId: 'file-storage' })] }));
      expect(r.scoredLines[0].bucket).toBe('already-redundant');
    }
  });
});

describe('replacement credit', () => {
  /**
   * Credit used to be scaled by a confidence factor per tier (strong 70%, partial 35%). Those
   * were percentage guesses layered on top of the customer's own figures, so they are gone: the
   * full replacement is now a scenario assumption, including for legacy retained percentages.
   */
  it('credits a strong-overlap category in full, with no confidence haircut', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', { lines: [line({ categoryId: 'edr-xdr', pupm: 10 })] }),
    );
    expect(r.scoredLines[0].annualSpend).toBe(120_000);
    expect(r.thirdPartyCreditConservative).toBeCloseTo(120_000, 6);
    expect(r.thirdPartyCreditBest).toBeCloseTo(120_000, 6);
  });

  it('ignores a legacy retained share and credits the entire covered invoice', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', {
        lines: [line({ categoryId: 'edr-xdr', pupm: 10, retainPct: 25 })],
      }),
    );
    expect(r.thirdPartyCreditConservative).toBeCloseTo(120_000, 6);
  });

  it('gives a full-confidence category 100% credit in both cases', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', { lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, pupm: 10 })] }),
    );
    expect(r.thirdPartyCreditConservative).toBeCloseTo(120_000, 6);
    expect(r.thirdPartyCreditBest).toBeCloseTo(120_000, 6);
  });

  it('still labels an upgrade-coverage category as partial, but no longer docks it', () => {
    // archiving-retention is a 'strong' category but only an 'upgrade' for O365 E3. The label is
    // kept for evidence context, not to silently multiply the scenario's money.
    const r = computeAssessment(
      makeAssessment('o365e3', { lines: [line({ categoryId: 'archiving-retention', pupm: 10 })] }),
    );
    expect(r.scoredLines[0].coverage).toBe('upgrade');
    expect(r.scoredLines[0].effectiveConfidence).toBe('partial');
    expect(r.thirdPartyCreditConservative).toBeCloseTo(120_000, 6);
  });

  it('claims zero credit for capabilities E7 does not cover', () => {
    const r = computeAssessment(
      makeAssessment('m365e5', {
        lines: [
          line({ categoryId: 'siem-soar', mode: 'annual', annual: 500_000 }),
          line({ categoryId: 'esignature', mode: 'annual', annual: 90_000 }),
        ],
      }),
    );
    expect(r.thirdPartyAnnual).toBe(590_000);
    expect(r.thirdPartyCreditConservative).toBe(0);
    expect(r.thirdPartyCreditBest).toBe(0);
    const notCovered = r.buckets.find((b) => b.bucket === 'not-covered');
    expect(notCovered?.grossSpend).toBe(590_000);
    expect(notCovered?.lineCount).toBe(2);
  });

  it('keeps retained percentages on input without applying them to either credit alias', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', {
        lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, pupm: 10, retainPct: 25 })],
      }),
    );
    expect(r.thirdPartyCreditConservative).toBeCloseTo(120_000, 6);
    expect(r.thirdPartyCreditBest).toBeCloseTo(120_000, 6);
    expect(r.scoredLines[0].line.retainPct).toBe(25);
  });

  it('does not allow a nonsensical deprecated percentage to affect replacement', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', {
        lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, pupm: 10, retainPct: 400 })],
      }),
    );
    expect(r.thirdPartyCreditConservative).toBe(120_000);
  });

  it('retains unknown invoices at full cost without claiming savings', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', { lines: [line({ categoryId: 'does-not-exist' })] }),
    );
    expect(r.scoredLines).toHaveLength(0);
    expect(r.thirdPartyAnnual).toBe(120_000);
    expect(r.totalAnnualSavings).toBe(0);
    expect(r.warnings.join(' ')).toContain('Unknown catalog');
  });
});

describe('Microsoft add-on absorption', () => {
  it('counts absorbed add-ons as savings and leaves the rest in place', () => {
    const r = computeAssessment(
      makeAssessment('m365e5', {
        addOns: [
          { addOnId: 'copilot', mode: 'pupm', pupm: 30 }, // absorbed
          { addOnId: 'teams-calling-plan', mode: 'pupm', pupm: 12 }, // NOT absorbed
        ],
      }),
    );
    expect(r.addOnAnnualAbsorbed).toBe(360_000);
    expect(r.addOnAnnualRetained).toBe(144_000);
    expect(r.addOnAnnualTotal).toBe(504_000);
    expect(r.totalSavingsConservative).toBe(360_000);
  });
});

describe('core cost identity', () => {
  it('net annual equals current total minus future total', () => {
    const assessment = makeAssessment('m365e5', {
      lines: [
        line({ categoryId: 'edr-xdr', pupm: 8 }),
        line({ categoryId: 'ztna', pupm: 7 }),
        line({ categoryId: 'siem-soar', mode: 'annual', annual: 400_000 }),
      ],
      addOns: [
        { addOnId: 'copilot', mode: 'pupm', pupm: 30 },
        { addOnId: 'entra-suite', mode: 'pupm', pupm: 12 },
        { addOnId: 'teams-calling-plan', mode: 'pupm', pupm: 12 },
      ],
    });
    const r = computeAssessment(assessment);

    const futureTotal =
      r.e7Annual +
      r.addOnAnnualRetained +
      (r.thirdPartyAnnual - r.thirdPartyCreditConservative);

    expect(r.currentAnnualTotal - futureTotal).toBeCloseTo(r.netAnnualConservative, 6);
    expect(r.netAnnualConservative).toBeCloseTo(
      r.totalSavingsConservative - r.uplift,
      6,
    );
  });

  it('reports the effective net per-user price after consolidation', () => {
    const r = computeAssessment(
      makeAssessment('m365e5', {
        addOns: [{ addOnId: 'copilot', mode: 'pupm', pupm: 30 }],
      }),
    );
    // $99 list, minus the $30 Copilot add-on that E7 absorbs => $69 effective.
    expect(r.e7NetPupm).toBe(99);
    expect(r.effectiveNetPupmConservative).toBeCloseTo(69, 6);
  });

  it('applies a negotiated discount to the E7 unit price', () => {
    const a = makeAssessment('m365e5');
    a.assumptions.e7DiscountPct = 15;
    const r = computeAssessment(a);
    expect(r.e7NetPupm).toBeCloseTo(84.15, 6);
    expect(r.e7Annual).toBeCloseTo(84.15 * 1000 * 12, 6);
  });
});

describe('three-year TCO', () => {
  it('schedules six months of year-one savings and applies transition cost once', () => {
    const a = makeAssessment('m365e3', {
      lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, pupm: 20 })],
    });
    a.assumptions.transitionEnabled = true;
    a.assumptions.transitionCost = 10_000;
    a.lines[0].savingsDelayMonths = 6;

    const r = computeAssessment(a);
    expect(r.migrationTotal).toBe(10_000);
    expect(r.tco).toHaveLength(3);

    // Year 1 only realises half the credit and carries the migration cost.
    const y1 = r.tco[0];
    const y2 = r.tco[1];
    expect(y1.netBenefit).toBeCloseTo(
      r.netAnnualConservative - r.thirdPartyCreditConservative * 0.5 - 10_000,
      6,
    );
    expect(y2.netBenefit).toBeCloseTo(r.netAnnualConservative, 6);
    expect(r.tcoNetBenefit).toBeCloseTo(y1.netBenefit + y2.netBenefit + r.tco[2].netBenefit, 6);
  });

  it('honours a custom horizon', () => {
    const a = makeAssessment('m365e5');
    a.assumptions.horizonYears = 5;
    expect(computeAssessment(a).tco).toHaveLength(5);
  });

  it('returns no payback when the move never pays for itself', () => {
    // E5 customer with no other spend at all: pure $39/user/month uplift, nothing to consolidate.
    const r = computeAssessment(makeAssessment('m365e5'));
    expect(r.netAnnualConservative).toBeLessThan(0);
    expect(r.paybackMonths).toBeNull();
  });

  it('computes a payback period when migration cost is recovered', () => {
    const a = makeAssessment('m365e3', {
      lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, pupm: 40 })],
      addOns: [{ addOnId: 'copilot', mode: 'pupm', pupm: 30 }],
    });
    a.assumptions.transitionEnabled = true;
    a.assumptions.transitionCost = 5_000;
    const r = computeAssessment(a);
    expect(r.netAnnualConservative).toBeGreaterThan(0);
    expect(r.paybackMonths).toBeGreaterThan(0);
    expect(r.paybackMonths).toBeLessThanOrEqual(36);
  });
});

describe('aggregations', () => {
  it('summarises by domain, ordered by gross spend', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', {
        lines: [
          line({ categoryId: 'edr-xdr', mode: 'annual', annual: 100_000 }),
          line({ categoryId: 'email-security', mode: 'annual', annual: 50_000 }),
          line({ categoryId: 'genai-assistant', mode: 'annual', annual: 400_000 }),
        ],
      }),
    );
    expect(r.domains[0].domain).toBe('ai');
    expect(r.domains[0].grossSpend).toBe(400_000);
    expect(r.domains[1].domain).toBe('threat');
    expect(r.domains[1].grossSpend).toBe(150_000);
    expect(r.domains[1].lineCount).toBe(2);
  });

  it('produces a waterfall that reconciles to the future spend total', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', {
        lines: [line({ categoryId: 'edr-xdr', pupm: 8 }), line({ categoryId: 'ztna', pupm: 6 })],
        addOns: [{ addOnId: 'copilot', mode: 'pupm', pupm: 30 }],
      }),
    );
    const steps = buildWaterfall(r);
    const start = steps[0].value;
    const movements = steps.slice(1, -1).reduce((acc, s) => acc + s.value, 0);
    const end = steps[steps.length - 1].value;
    expect(start + movements).toBeCloseTo(end, 6);
  });
});

describe('edge cases', () => {
  it('handles a zero-seat organisation without dividing by zero', () => {
    const r = computeAssessment(makeAssessment('m365e5', { seats: 0 }));
    expect(r.e7Annual).toBe(0);
    expect(r.effectiveNetPupmConservative).toBe(0);
    expect(Number.isFinite(r.netAnnualConservative)).toBe(true);
  });

  it('handles an empty assessment', () => {
    const r = computeAssessment(makeAssessment('o365e3'));
    expect(r.thirdPartyAnnual).toBe(0);
    expect(r.totalSavingsConservative).toBe(0);
    expect(r.currentAnnualTotal).toBe(26 * 1000 * 12);
  });

  it('never claims more credit conservatively than at best case', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', {
        lines: [
          line({ categoryId: 'edr-xdr', pupm: 8 }),
          line({ categoryId: 'business-intelligence', pupm: 20 }),
          line({ categoryId: 'rpa', pupm: 25 }),
        ],
      }),
    );
    expect(r.thirdPartyCreditConservative).toBeLessThanOrEqual(r.thirdPartyCreditBest);
    expect(r.thirdPartyCreditBest).toBeLessThanOrEqual(r.thirdPartyAnnual);
  });

  it('sanitises invalid organisation seats before line, add-on, TCO and PUPM calculations', () => {
    const r = computeAssessment(
      makeAssessment('m365e5', {
        seats: Number.NaN,
        lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, pupm: 10 })],
        addOns: [{ addOnId: 'copilot', mode: 'pupm', pupm: 30 }],
      }),
    );

    expect(r.seats).toBe(0);
    expect(r.thirdPartyAnnual).toBe(0);
    expect(r.addOnAnnualAbsorbed).toBe(0);
    expect(r.e7Annual).toBe(0);
    expect(r.effectiveNetPupmConservative).toBe(0);
    expect(r.tco[0].currentCost).toBe(0);
    expect(r.paybackMonths).toBeNull();
  });

  it('clamps negative seats and prices on individual lines and assumptions to zero', () => {
    const a = makeAssessment('m365e5', {
      seats: -10,
      lines: [
        line({ categoryId: FULL_CONFIDENCE_CATEGORY, seats: -5, pupm: 20 }),
        line({ categoryId: 'edr-xdr', mode: 'annual', annual: -100 }),
      ],
      addOns: [
        { addOnId: 'copilot', mode: 'pupm', seats: -3, pupm: 30 },
        { addOnId: 'entra-suite', mode: 'annual', annual: -1 },
      ],
    });
    a.assumptions.baselineUnitPupm = -26;
    a.assumptions.e7ListPupm = -99;
    a.assumptions.migrationCostPerSeat = -10;

    const r = computeAssessment(a);

    expect(r.seats).toBe(0);
    expect(r.baselineAnnual).toBe(0);
    expect(r.e7NetPupm).toBe(0);
    expect(r.thirdPartyAnnual).toBe(0);
    expect(r.addOnAnnualTotal).toBe(0);
    expect(r.migrationTotal).toBe(0);
  });

  it('ignores retain percentages both inside and outside the former 0 to 100 range', () => {
    const atZero = computeAssessment(
      makeAssessment('m365e3', { lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, retainPct: 0 })] }),
    );
    const atHundred = computeAssessment(
      makeAssessment('m365e3', { lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, retainPct: 100 })] }),
    );
    const aboveHundred = computeAssessment(
      makeAssessment('m365e3', { lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, retainPct: 125 })] }),
    );
    const belowZero = computeAssessment(
      makeAssessment('m365e3', { lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, retainPct: -25 })] }),
    );

    expect(atZero.thirdPartyCreditConservative).toBe(120_000);
    expect(belowZero.thirdPartyCreditConservative).toBe(120_000);
    expect(atHundred.thirdPartyCreditConservative).toBe(120_000);
    expect(aboveHundred.thirdPartyCreditConservative).toBe(120_000);
  });

  it('clamps E7 discounts at zero and one hundred percent', () => {
    const noDiscount = makeAssessment('m365e5');
    noDiscount.assumptions.e7DiscountPct = 0;
    expect(computeAssessment(noDiscount).e7NetPupm).toBe(99);

    const fullDiscount = makeAssessment('m365e5');
    fullDiscount.assumptions.e7DiscountPct = 100;
    expect(computeAssessment(fullDiscount).e7NetPupm).toBe(0);

    const aboveFullDiscount = makeAssessment('m365e5');
    aboveFullDiscount.assumptions.e7DiscountPct = 150;
    expect(computeAssessment(aboveFullDiscount).e7NetPupm).toBe(0);

    const negativeDiscount = makeAssessment('m365e5');
    negativeDiscount.assumptions.e7DiscountPct = -20;
    expect(computeAssessment(negativeDiscount).e7NetPupm).toBe(99);
  });

  it('ignores obsolete confidence factors in both aliases', () => {
    const a = makeAssessment('m365e3', {
      lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, mode: 'annual', annual: 100_000 })],
    });
    a.assumptions.conservative = { ...a.assumptions.conservative, full: 2 };
    a.assumptions.bestCase = { ...a.assumptions.bestCase, full: -0.5 };

    const r = computeAssessment(a);

    expect(r.thirdPartyCreditConservative).toBe(100_000);
    expect(r.thirdPartyCreditBest).toBe(100_000);
  });

  it('retains unknown add-ons at full cost without dropping known add-ons', () => {
    const r = computeAssessment(
      makeAssessment('m365e5', {
        addOns: [
          { addOnId: 'does-not-exist', mode: 'annual', annual: 999_999 },
          { addOnId: 'copilot', mode: 'annual', annual: 12_000 },
        ],
      }),
    );

    expect(r.scoredAddOns).toHaveLength(2);
    expect(r.scoredAddOns[0].annualCredit).toBe(0);
    expect(r.scoredAddOns[1].addOnId).toBe('copilot');
    expect(r.addOnAnnualAbsorbed).toBe(12_000);
    expect(r.addOnAnnualTotal).toBe(1_011_999);
    expect(r.addOnAnnualRetained).toBe(999_999);
  });

  it('preserves duplicate invoice costs but excludes all ambiguous retirement', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', {
        lines: [
          line({ categoryId: FULL_CONFIDENCE_CATEGORY, mode: 'annual', annual: 10_000 }),
          line({ categoryId: FULL_CONFIDENCE_CATEGORY, mode: 'annual', annual: 25_000 }),
        ],
      }),
    );

    expect(r.scoredLines).toHaveLength(2);
    expect(r.thirdPartyAnnual).toBe(35_000);
    expect(r.thirdPartyCreditConservative).toBe(0);
    expect(r.cashEstimateReady).toBe(false);
    expect(r.scoredLines.every((line) => line.exclusionReason?.includes('Remove the duplicate'))).toBe(true);
  });

  it('normalises unusual TCO horizons to a safe whole-year range', () => {
    const zero = makeAssessment('m365e5');
    zero.assumptions.horizonYears = 0;
    expect(computeAssessment(zero).tco).toHaveLength(1);

    const fractional = makeAssessment('m365e5');
    fractional.assumptions.horizonYears = 2.6;
    expect(computeAssessment(fractional).tco).toHaveLength(3);

    const huge = makeAssessment('m365e5');
    huge.assumptions.horizonYears = 10_000;
    expect(computeAssessment(huge).tco).toHaveLength(50);
  });

  it('bounds oversized inputs to the supported five-million-seat limit and remains finite', () => {
    const r = computeAssessment(
      makeAssessment('m365e5', {
        seats: 10_000_000,
        lines: [line({ categoryId: 'siem-soar', mode: 'annual', annual: 1e12 })],
        addOns: [{ addOnId: 'copilot', mode: 'annual', annual: 1e12 }],
      }),
    );

    expect(r.seats).toBe(5_000_000);
    expect(r.currentAnnualTotal).toBeCloseTo(2_003_600_000_000, 0);
    expect(r.totalSavingsConservative).toBe(1e12);
    expect(Number.isFinite(r.tcoNetBenefit)).toBe(true);
  });

  it('normalizes fractional seats consistently across every recurring total', () => {
    const r = computeAssessment(
      makeAssessment('m365e5', {
        seats: 12.5,
        lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, pupm: 10 })],
      }),
    );

    expect(r.seats).toBe(13);
    expect(r.baselineAnnual).toBe(9_360);
    expect(r.thirdPartyAnnual).toBe(1_560);
    expect(r.e7Annual).toBe(15_444);
  });

  it('keeps malformed numeric fields from contaminating totals with NaN or Infinity', () => {
    const a = makeAssessment('m365e5', {
      lines: [
        line({ categoryId: FULL_CONFIDENCE_CATEGORY, pupm: Number.POSITIVE_INFINITY }),
        line({ categoryId: 'ztna', mode: 'annual', annual: Number.NaN }),
      ],
      addOns: [{ addOnId: 'copilot', mode: 'annual', annual: Number.POSITIVE_INFINITY }],
    });
    a.assumptions.e7ListPupm = Number.POSITIVE_INFINITY;
    a.assumptions.baselineUnitPupm = Number.NaN;
    a.assumptions.migrationCostPerSeat = Number.NaN;
    a.assumptions.horizonYears = Number.NaN;
    a.assumptions.year1RealizationPct = Number.POSITIVE_INFINITY;
    a.assumptions.conservative = { ...a.assumptions.conservative, full: Number.POSITIVE_INFINITY };

    const r = computeAssessment(a);

    expect(r.baselineAnnual).toBe(0);
    expect(r.e7Annual).toBe(0);
    expect(r.thirdPartyAnnual).toBe(0);
    expect(r.addOnAnnualTotal).toBe(0);
    expect(r.migrationTotal).toBe(0);
    expect(r.tco).toHaveLength(1);
    expect(Number.isFinite(r.netAnnualConservative)).toBe(true);
  });

  it.each([undefined, 'not-a-date', '2001-01-01'])('keeps contract date %s informational only', (contractEnd) => {
    const r = computeAssessment(
      makeAssessment('m365e3', {
        lines: [
          line({ categoryId: FULL_CONFIDENCE_CATEGORY, mode: 'annual', annual: 60_000, contractEnd }),
        ],
      }),
    );

    expect(r.thirdPartyAnnual).toBe(60_000);
    expect(r.thirdPartyCreditConservative).toBe(60_000);
  });

  it('keeps the waterfall reconciled for sanitised edge-case inputs', () => {
    const a = makeAssessment('m365e3', {
      seats: 0,
      lines: [
        line({ categoryId: FULL_CONFIDENCE_CATEGORY, mode: 'annual', annual: 120_000, retainPct: -50 }),
        line({ categoryId: 'edr-xdr', mode: 'annual', annual: 80_000, retainPct: 200 }),
        line({ categoryId: 'siem-soar', mode: 'annual', annual: Number.POSITIVE_INFINITY }),
      ],
      addOns: [
        { addOnId: 'copilot', mode: 'annual', annual: 50_000 },
        { addOnId: 'does-not-exist', mode: 'annual', annual: 25_000 },
      ],
    });
    a.assumptions.e7DiscountPct = 150;
    const r = computeAssessment(a);

    const steps = buildWaterfall(r);
    const movements = steps.slice(1, -1).reduce((acc, s) => acc + s.value, 0);
    expect(steps[0].value + movements).toBeCloseTo(steps[steps.length - 1].value, 6);
    expect(steps[steps.length - 1].value).toBe(r.currentAnnualTotal - r.netAnnualConservative);
  });
});


describe('capability cost avoidance', () => {
  // Cost avoidance answers "what would licensing the capabilities you plan to deploy cost if E7
  // did not include them", priced as the cheapest set of standalone Microsoft licences at list
  // reference less the E7 discount. It is a counterfactual, never cash, so beyond the arithmetic
  // these tests prove it cannot leak into the cash figures.
  const annual = (pupm: number, seats = 1000) => pupm * seats * 12;
  const gapIds = (baseline: 'o365e3' | 'm365e3' | 'm365e5') =>
    CATEGORIES.filter((cat) => ['unlocked', 'upgrade'].includes(cat.coverage[baseline])).map((cat) => cat.id);
  const avoid = (baseline: 'o365e3' | 'm365e3' | 'm365e5', plannedCapabilities: string[], overrides: Partial<Assessment> = {}) =>
    computeAssessment(makeAssessment(baseline, { plannedCapabilities, ...overrides })).costAvoidance;
  const ids = (c: { lines: { licence: { id: string } }[] }) => c.lines.map((l) => l.licence.id);

  it('counts nothing until the customer selects capabilities, but prices each one on its own', () => {
    const c = avoid('m365e5', []);
    expect(c.annualAvoided).toBe(0);
    expect(c.lines).toEqual([]);
    expect(c.capabilities.map((cap) => cap.category.id).sort()).toEqual(gapIds('m365e5').sort());
    const copilot = c.capabilities.find((cap) => cap.category.id === 'genai-assistant')!;
    expect(copilot.standaloneLicenceIds).toEqual(['copilot']);
    expect(copilot.standaloneAnnual).toBeCloseTo(annual(30), 6);
    expect(c.currency).toBe('USD');
  });

  it('prices every E7 capability like the E7 components for an E5 customer', () => {
    const c = avoid('m365e5', gapIds('m365e5'));
    expect(ids(c)).toEqual(['copilot', 'agent-365', 'entra-suite']);
    expect(c.annualAvoided).toBeCloseTo(annual(30 + 15 + 12), 6);
  });

  it('finds the E5 step-up when every capability is selected on E3 suites', () => {
    const m365 = avoid('m365e3', gapIds('m365e3'));
    expect(ids(m365)).toContain('m365e5-step-up-m365e3');
    expect(m365.annualAvoided).toBeCloseTo(annual(21 + 57), 6);
    const o365 = avoid('o365e3', gapIds('o365e3'));
    expect(ids(o365)).toContain('m365e5-step-up-o365e3');
    expect(o365.annualAvoided).toBeCloseTo(annual(34 + 57), 6);
  });

  it('prices a single capability with its cheapest licence only', () => {
    const c = avoid('m365e3', ['edr-xdr']);
    expect(ids(c)).toEqual(['defender-endpoint-p2']);
    expect(c.annualAvoided).toBeCloseTo(annual(5.2), 6);
  });

  it('counts a licence shared by several capabilities once', () => {
    const c = avoid('m365e5', ['genai-assistant', 'enterprise-search']);
    expect(ids(c)).toEqual(['copilot']);
    expect(c.lines[0].capabilities.map((cat) => cat.id).sort()).toEqual(['enterprise-search', 'genai-assistant']);
    expect(c.annualAvoided).toBeCloseTo(annual(30), 6);
    expect(c.standaloneSumAnnual).toBeCloseTo(annual(60), 6);
    expect(c.capabilities.find((cap) => cap.category.id === 'genai-assistant')!.coveredByLicenceId).toBe('copilot');
  });

  it('switches to a suite when it is cheaper than the individual products', () => {
    const c = avoid('m365e3', ['edr-xdr', 'email-security', 'itdr', 'casb']);
    expect(ids(c)).toEqual(['m365-e5-security']);
    expect(c.annualAvoided).toBeCloseTo(annual(12), 6);
    expect(c.standaloneSumAnnual).toBeCloseTo(annual(5.2 + 5 + 5.5 + 5), 6);
  });

  it('sizes each licence to the users planned for its capabilities', () => {
    const c = avoid('m365e5', ['genai-assistant', 'enterprise-search'], {
      costAvoidance: { users: { 'genai-assistant': 200, 'enterprise-search': 500 }, unitPrices: {} },
    });
    expect(c.lines[0].quantity).toBe(500);
    expect(c.annualAvoided).toBeCloseTo(annual(30, 500), 6);
    const alone = c.capabilities.find((cap) => cap.category.id === 'genai-assistant')!;
    expect(alone.usersOverridden).toBe(true);
    expect(alone.standaloneAnnual).toBeCloseTo(annual(30, 200), 6);
  });

  it('adds a prerequisite licence when the suite lacks it', () => {
    const c = avoid('o365e3', ['ztna']);
    expect(ids(c).sort()).toEqual(['entra-id-p1', 'entra-suite']);
    const p1 = c.lines.find((l) => l.licence.id === 'entra-id-p1')!;
    expect(p1.prerequisiteFor.map((l) => l.id)).toEqual(['entra-suite']);
    expect(c.annualAvoided).toBeCloseTo(annual(12 + 7), 6);
    expect(avoid('m365e3', ['ztna']).annualAvoided).toBeCloseTo(annual(12), 6);
  });

  it('applies the E7 discount to list references by default', () => {
    const c = avoid('m365e5', gapIds('m365e5'), {
      assumptions: { ...DEFAULT_ASSUMPTIONS, baselineUnitPupm: 60, e7DiscountPct: 20 },
    });
    expect(c.lines[0].defaultUnitPupm).toBeCloseTo(24, 6);
    expect(c.annualAvoided).toBeCloseTo(annual(57 * 0.8), 6);
  });

  it('uses entered prices, which can change the cheapest licences', () => {
    const c = avoid('m365e3', ['edr-xdr'], { costAvoidance: { users: {}, unitPrices: { 'defender-endpoint-p2': 20 } } });
    expect(ids(c)).toEqual(['m365-e5-security']);
    const entered = avoid('m365e3', ['edr-xdr'], { costAvoidance: { users: {}, unitPrices: { 'defender-endpoint-p2': 4 } } });
    expect(entered.lines[0].unitPriceOverridden).toBe(true);
    expect(entered.annualAvoided).toBeCloseTo(annual(4), 6);
  });

  it('does not count licences the customer already buys', () => {
    const partial = avoid('m365e5', ['genai-assistant'], {
      addOns: [{ addOnId: 'copilot', mode: 'pupm', pupm: 30, seats: 400 }],
    });
    expect(partial.lines[0].ownership).toBe('partial');
    expect(partial.lines[0].paidQuantity).toBe(600);
    expect(partial.annualAvoided).toBeCloseTo(annual(30, 600), 6);

    const full = avoid('m365e5', ['genai-assistant'], { addOns: [{ addOnId: 'copilot', mode: 'pupm', pupm: 30 }] });
    expect(full.annualAvoided).toBe(0);
    expect(full.capabilities.find((cap) => cap.category.id === 'genai-assistant')!.ownedVia).toEqual(['Microsoft 365 Copilot']);
  });

  it('credits a step-up with the purchased add-ons it would replace', () => {
    const r = computeAssessment(makeAssessment('m365e3', {
      plannedCapabilities: ['dlp'],
      addOns: [{ addOnId: 'm365-e5-security', mode: 'pupm', pupm: 12 }],
    }));
    const credit = r.scoredAddOns[0].annualCredit;
    expect(credit).toBeCloseTo(annual(12), 6);
    const stepUp = r.costAvoidance.lines.find((l) => l.licence.kind === 'step-up')!;
    expect(stepUp).toBeDefined();
    expect(stepUp.supersededCredit).toBeCloseTo(credit, 6);
    expect(r.costAvoidance.annualAvoided).toBeCloseTo(annual(21 - 12), 6);
  });

  it('flags third-party spend on the same capability without removing it', () => {
    const r = computeAssessment(makeAssessment('m365e5', {
      plannedCapabilities: ['ztna'],
      lines: [line({ categoryId: 'ztna', pupm: 9 })],
    }));
    const cap = r.costAvoidance.capabilities.find((c) => c.category.id === 'ztna')!;
    expect(cap.cashOverlap.map((o) => o.categoryId)).toEqual(['ztna']);
    expect(r.costAvoidance.lines[0].cashOverlap.map((o) => o.categoryId)).toEqual(['ztna']);
    expect(r.costAvoidance.annualAvoided).toBeGreaterThan(0);
    expect(r.thirdPartyCreditConservative).toBeGreaterThan(0);
  });

  it('credits each selected capability to exactly one licence and never values unpriced ones', () => {
    for (const baseline of ['o365e3', 'm365e3', 'm365e5'] as const) {
      const c = avoid(baseline, gapIds(baseline));
      const credited = c.lines.flatMap((l) => l.capabilities.map((cat) => cat.id));
      expect(new Set(credited).size).toBe(credited.length);
      expect([...credited, ...c.unpriced.map((cat) => cat.id)].sort()).toEqual(gapIds(baseline).sort());
      expect(c.annualAvoided).toBeLessThanOrEqual(c.standaloneSumAnnual + 1e-6);
    }
    const unpriced = avoid('m365e5', ['webinars-events']);
    expect(unpriced.unpriced.map((cat) => cat.id)).toContain('webinars-events');
    expect(unpriced.annualAvoided).toBe(0);
  });

  it('compares buying the selected capabilities separately with E7', () => {
    const c = avoid('m365e5', gapIds('m365e5'));
    expect(c.currentLicenceAnnual).toBeCloseTo(annual(60), 6);
    expect(c.buySeparatelyAnnual).toBeCloseTo(annual(60 + 57), 6);
    expect(c.e7Annual).toBeCloseTo(annual(99), 6);
    expect(c.bundleDifferenceAnnual).toBeCloseTo(annual(18), 6);
    expect(c.bundleDifferencePupm).toBeCloseTo(18, 6);
  });

  it('keeps third-party benchmarks as context only', () => {
    const c = avoid('m365e5', gapIds('m365e5'));
    expect(c.thirdPartyReferenceAnnual).toBeGreaterThan(0);
    expect(c.annualAvoided).toBeCloseTo(annual(57), 6);
  });

  it('reports nothing for a zero-seat org', () => {
    const c = avoid('m365e5', gapIds('m365e5'), { seats: 0 });
    expect(c.annualAvoided).toBe(0);
    expect(c.bundleDifferencePupm).toBe(0);
  });

  it('never lets capability cost avoidance touch the cash figures', () => {
    const counted = computeAssessment(makeAssessment('m365e3', { plannedCapabilities: gapIds('m365e3') }));
    const none = computeAssessment(makeAssessment('m365e3'));
    expect(counted.costAvoidance.annualAvoided).toBeGreaterThan(0);
    expect(none.costAvoidance.annualAvoided).toBe(0);
    expect(counted.netAnnualConservative).toBe(none.netAnnualConservative);
    expect(counted.currentAnnualTotal).toBe(none.currentAnnualTotal);
    expect(counted.effectiveNetPupmConservative).toBe(none.effectiveNetPupmConservative);
    expect(counted.tcoNetBenefit).toBe(none.tcoNetBenefit);
    expect(counted.paybackStatus).toBe(none.paybackStatus);
  });
});
