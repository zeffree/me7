import { describe, expect, it } from 'vitest';
import { annualiseLine, buildWaterfall, computeAssessment, DEFAULT_ASSUMPTIONS } from './engine';
import { DEFAULT_TEI_SETTINGS } from './tei';
import type { Assessment, SpendLine } from './types';
import type { BaselineSkuId } from '@/data/skus';
import { CATEGORIES } from '@/data/categories';

/**
 * Several tests need a category the catalog scores at full confidence, so the credit factor is
 * 1.0 in both scenarios and the arithmetic is easy to read. Resolve it from the catalog rather
 * than naming a product: confidence ratings are research-driven and do change, and a test suite
 * that fails because a vendor claim was corrected is testing the wrong thing.
 */
const FULL_CONFIDENCE_CATEGORY = CATEGORIES.find((c) => c.confidence === 'full')?.id;
if (!FULL_CONFIDENCE_CATEGORY) {
  throw new Error('No full-confidence category in the catalog; update these fixtures.');
}

function makeAssessment(
  baseline: BaselineSkuId,
  overrides: Partial<Assessment> = {},
): Assessment {
  return {
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

  it('classifies EDR as unlocked by E7 for an M365 E3 customer', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', { lines: [line({ categoryId: 'edr-xdr' })] }),
    );
    expect(r.scoredLines[0].bucket).toBe('unlocked-by-e7');
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
   * only thing that now reduces a line is the retained share the customer states.
   */
  it('credits a strong-overlap category in full, with no confidence haircut', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', { lines: [line({ categoryId: 'edr-xdr', pupm: 10 })] }),
    );
    expect(r.scoredLines[0].annualSpend).toBe(120_000);
    expect(r.thirdPartyCreditConservative).toBeCloseTo(120_000, 6);
    expect(r.thirdPartyCreditBest).toBeCloseTo(120_000, 6);
  });

  it('reduces credit only by the retained share the customer entered', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', {
        lines: [line({ categoryId: 'edr-xdr', pupm: 10, retainPct: 25 })],
      }),
    );
    expect(r.thirdPartyCreditConservative).toBeCloseTo(90_000, 6);
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
    // kept because it tells the user where a retained share is worth setting; it no longer
    // silently multiplies the money.
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

  it('honours retained spend', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', {
        lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, pupm: 10, retainPct: 25 })],
      }),
    );
    // full confidence, so credit is purely the non-retained share
    expect(r.thirdPartyCreditConservative).toBeCloseTo(90_000, 6);
  });

  it('clamps a nonsensical retain percentage', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', {
        lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, pupm: 10, retainPct: 400 })],
      }),
    );
    expect(r.thirdPartyCreditConservative).toBe(0);
  });

  it('ignores lines pointing at an unknown category', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', { lines: [line({ categoryId: 'does-not-exist' })] }),
    );
    expect(r.scoredLines).toHaveLength(0);
    expect(r.thirdPartyAnnual).toBe(0);
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
  it('throttles year-one savings and applies migration cost once', () => {
    const a = makeAssessment('m365e3', {
      lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, pupm: 20 })],
    });
    a.assumptions.migrationCostPerSeat = 10;
    a.assumptions.year1RealizationPct = 50;

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
    a.assumptions.migrationCostPerSeat = 5;
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

  it('applies retain percentages only inside the 0 to 100 range', () => {
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
    expect(atHundred.thirdPartyCreditConservative).toBe(0);
    expect(aboveHundred.thirdPartyCreditConservative).toBe(0);
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

  it('clamps custom confidence factors to the zero-to-one credit range', () => {
    const a = makeAssessment('m365e3', {
      lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, mode: 'annual', annual: 100_000 })],
    });
    a.assumptions.conservative = { ...a.assumptions.conservative, full: 2 };
    a.assumptions.bestCase = { ...a.assumptions.bestCase, full: -0.5 };

    const r = computeAssessment(a);

    expect(r.thirdPartyCreditConservative).toBe(100_000);
    expect(r.thirdPartyCreditBest).toBe(0);
  });

  it('skips unknown add-ons without dropping known add-ons', () => {
    const r = computeAssessment(
      makeAssessment('m365e5', {
        addOns: [
          { addOnId: 'does-not-exist', mode: 'annual', annual: 999_999 },
          { addOnId: 'copilot', mode: 'annual', annual: 12_000 },
        ],
      }),
    );

    expect(r.scoredAddOns).toHaveLength(1);
    expect(r.scoredAddOns[0].addOnId).toBe('copilot');
    expect(r.addOnAnnualAbsorbed).toBe(12_000);
  });

  it('adds duplicate category lines independently', () => {
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
    expect(r.thirdPartyCreditConservative).toBe(35_000);
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

  it('keeps very large realistic inputs finite', () => {
    const r = computeAssessment(
      makeAssessment('m365e5', {
        seats: 10_000_000,
        lines: [line({ categoryId: 'siem-soar', mode: 'annual', annual: 1e12 })],
        addOns: [{ addOnId: 'copilot', mode: 'annual', annual: 1e12 }],
      }),
    );

    expect(r.currentAnnualTotal).toBeCloseTo(2_007_200_000_000, 0);
    expect(r.totalSavingsConservative).toBe(1e12);
    expect(Number.isFinite(r.tcoNetBenefit)).toBe(true);
  });

  it('supports fractional seats consistently', () => {
    const r = computeAssessment(
      makeAssessment('m365e5', {
        seats: 12.5,
        lines: [line({ categoryId: FULL_CONFIDENCE_CATEGORY, pupm: 10 })],
      }),
    );

    expect(r.baselineAnnual).toBe(9_000);
    expect(r.thirdPartyAnnual).toBe(1_500);
    expect(r.e7Annual).toBe(14_850);
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

  it('lets absent, malformed, and past contract dates remain informational only', () => {
    const r = computeAssessment(
      makeAssessment('m365e3', {
        lines: [
          line({ categoryId: FULL_CONFIDENCE_CATEGORY, mode: 'annual', annual: 10_000 }),
          line({ categoryId: FULL_CONFIDENCE_CATEGORY, mode: 'annual', annual: 20_000, contractEnd: 'not-a-date' }),
          line({ categoryId: FULL_CONFIDENCE_CATEGORY, mode: 'annual', annual: 30_000, contractEnd: '2001-01-01' }),
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

describe('cost avoidance', () => {
  // Cost avoidance answers a different question from the rest of the engine: not "what do you
  // stop paying" but "what would you have had to buy". It is benchmark-priced and therefore
  // softer than the cash side, so these tests exist mainly to prove it never leaks into the
  // cash figures.
  it('offers only capabilities E7 unlocks or upgrades for this baseline', () => {
    const r = computeAssessment(makeAssessment('m365e5'));
    for (const a of r.avoidedCosts) {
      expect(['unlocked', 'upgrade']).toContain(a.category.coverage.m365e5);
    }
    expect(r.avoidedCosts.length).toBeGreaterThan(0);
  });

  it('offers an E3 customer far more new capability than an E5 customer', () => {
    const e3 = computeAssessment(makeAssessment('o365e3'));
    const e5 = computeAssessment(makeAssessment('m365e5'));
    expect(e3.avoidedCosts.length).toBeGreaterThan(e5.avoidedCosts.length);
  });

  it('prices a selected capability at benchmark x licensed seats x 12', () => {
    const cat = CATEGORIES.find(
      (c) => c.coverage.m365e5 === 'unlocked' && c.benchmarkPupm > 0,
    )!;
    const r = computeAssessment(
      makeAssessment('m365e5', { plannedCapabilities: [cat.id] }),
    );
    const licensed = Math.round(1000 * (cat.typicalAdoptionPct ?? 1));
    expect(r.avoidedAnnualSelected).toBeCloseTo(cat.benchmarkPupm * licensed * 12, 6);
  });

  it('charges specialist tools to a subset of staff, not the whole workforce', () => {
    // A $30 e-signature seat is not bought for all 5,000 employees. Categories that carry a
    // typicalAdoptionPct must price avoidance below the naive benchmark x all-seats figure.
    const subset = CATEGORIES.filter(
      (c) => (c.typicalAdoptionPct ?? 1) < 1 && c.benchmarkPupm > 0,
    );
    expect(subset.length).toBeGreaterThan(0);

    for (const cat of subset) {
      const r = computeAssessment(makeAssessment('o365e3', { plannedCapabilities: [cat.id] }));
      const row = r.avoidedCosts.find((a) => a.category.id === cat.id);
      if (!row) continue;
      expect(row.licensedSeats).toBeLessThan(1000);
      expect(row.avoidedAnnual).toBeLessThan(cat.benchmarkPupm * 1000 * 12);
      expect(row.avoidedAnnual).toBeCloseTo(cat.benchmarkPupm * row.licensedSeats * 12, 6);
    }
  });

  it('defaults org-wide categories to every seat', () => {
    const cat = CATEGORIES.find(
      (c) =>
        c.coverage.o365e3 === 'unlocked' &&
        c.benchmarkPupm > 0 &&
        c.typicalAdoptionPct === undefined,
    )!;
    const r = computeAssessment(makeAssessment('o365e3', { plannedCapabilities: [cat.id] }));
    const row = r.avoidedCosts.find((a) => a.category.id === cat.id)!;
    expect(row.adoptionPct).toBe(1);
    expect(row.licensedSeats).toBe(1000);
  });

  it('counts only selected capabilities, not every candidate', () => {
    const r = computeAssessment(makeAssessment('m365e5'));
    expect(r.avoidedAnnualSelected).toBe(0);
    expect(r.avoidedAnnualAll).toBeGreaterThan(0);
  });

  it('drops a capability from avoidance once it has real spend against it', () => {
    // The same capability must never be both a cash saving and an avoided cost.
    const withSpend = computeAssessment(
      makeAssessment('m365e5', {
        lines: [line({ categoryId: 'ztna', pupm: 9 })],
        plannedCapabilities: ['ztna'],
      }),
    );
    expect(withSpend.avoidedCosts.some((a) => a.category.id === 'ztna')).toBe(false);
    expect(withSpend.avoidedAnnualSelected).toBe(0);
    expect(withSpend.thirdPartyCreditConservative).toBeGreaterThan(0);
  });

  it('never lets avoided cost touch the cash figures', () => {
    const plain = computeAssessment(makeAssessment('m365e5'));
    const planned = computeAssessment(
      makeAssessment('m365e5', { plannedCapabilities: ['agent-governance'] }),
    );
    expect(planned.avoidedAnnualSelected).toBeGreaterThan(0);
    expect(planned.netAnnualConservative).toBe(plain.netAnnualConservative);
    expect(planned.currentAnnualTotal).toBe(plain.currentAnnualTotal);
    expect(planned.effectiveNetPupmConservative).toBe(plain.effectiveNetPupmConservative);
    expect(planned.tcoNetBenefit).toBe(plain.tcoNetBenefit);
  });

  it('ignores a planned capability that is not a candidate', () => {
    // siem-soar is not covered by E7 at all, so claiming it as gained value would be a lie.
    const r = computeAssessment(
      makeAssessment('m365e5', { plannedCapabilities: ['siem-soar'] }),
    );
    expect(r.avoidedCosts.some((a) => a.category.id === 'siem-soar')).toBe(false);
    expect(r.avoidedAnnualSelected).toBe(0);
  });

  it('scales with seats and reports nothing for a zero-seat org', () => {
    const r = computeAssessment(
      makeAssessment('m365e5', { seats: 0, plannedCapabilities: ['agent-governance'] }),
    );
    expect(r.avoidedAnnualSelected).toBe(0);
  });
});
