import { describe, expect, it } from 'vitest';
import { sanitizeAssessment } from '@/store/useAssessment';
import { getBaseline } from '@/data/skus';
import { DEFAULT_TEI_SETTINGS } from '@/model/tei';
import { computeAssessment } from '@/model/engine';
import type { Assessment } from '@/model/types';

/**
 * Assessments arriving from a share link or from localStorage written by an older build are
 * untrusted input. Before this guard existed, a single unknown baseline id threw out of
 * getBaseline during render and the user got a blank page with no way to recover.
 */
describe('sanitizeAssessment', () => {
  it('replaces an unknown baseline rather than letting getBaseline throw', () => {
    const clean = sanitizeAssessment({ baseline: 'm365e9' } as unknown as Assessment);
    expect(clean.baseline).toBe('m365e5');
    expect(() => getBaseline(clean.baseline)).not.toThrow();
  });

  it('keeps a valid baseline and re-anchors the unit price to it', () => {
    const clean = sanitizeAssessment({ baseline: 'o365e3' } as unknown as Assessment);
    expect(clean.baseline).toBe('o365e3');
    expect(clean.assumptions.baselineUnitPupm).toBe(getBaseline('o365e3').listPricePupm);
  });

  it('lets an explicit stored unit price win over the baseline default', () => {
    const clean = sanitizeAssessment({
      baseline: 'm365e5',
      assumptions: { baselineUnitPupm: 47 },
    } as unknown as Assessment);
    expect(clean.assumptions.baselineUnitPupm).toBe(47);
  });

  it('preserves unknown invoice amounts with an actionable review warning', () => {
    const clean = sanitizeAssessment({
      lines: [
        { categoryId: 'edr-xdr', mode: 'pupm', pupm: 8, retainPct: 0 },
        { categoryId: 'category-we-deleted', mode: 'pupm', pupm: 99, retainPct: 0 },
      ],
    } as unknown as Assessment);
    expect(clean.lines.map((l) => l.categoryId)).toEqual(['edr-xdr', 'category-we-deleted']);
    expect(clean.lines[1].pupm).toBe(99);
    expect(clean.reviewWarnings?.join(' ')).toContain('unknown catalog identity');
  });

  it('preserves unknown add-on amounts for customer review', () => {
    const clean = sanitizeAssessment({
      addOns: [
        { addOnId: 'copilot', mode: 'pupm', pupm: 30 },
        { addOnId: 'sku-that-was-retired', mode: 'pupm', pupm: 5 },
      ],
    } as unknown as Assessment);
    expect(clean.addOns.map((a) => a.addOnId)).toEqual(['copilot', 'sku-that-was-retired']);
    expect(clean.addOns[1].pupm).toBe(5);
    expect(clean.reviewWarnings?.join(' ')).toContain('unknown catalog identity');
  });

  it('rejects non-finite and negative seat counts', () => {
    expect(sanitizeAssessment({ seats: NaN } as unknown as Assessment).seats).toBe(2500);
    expect(sanitizeAssessment({ seats: Infinity } as unknown as Assessment).seats).toBe(2500);
    expect(sanitizeAssessment({ seats: -400 } as unknown as Assessment).seats).toBe(2500);
    expect(sanitizeAssessment({ seats: 1200.6 } as unknown as Assessment).seats).toBe(1201);
  });

  it('survives null, undefined and outright garbage', () => {
    for (const input of [null, undefined, 'nonsense', 42, []]) {
      const clean = sanitizeAssessment(input as unknown as Assessment);
      expect(clean.baseline).toBe('m365e5');
      expect(clean.lines).toEqual([]);
      expect(clean.addOns).toEqual([]);
    }
  });

  it('preserves a well-formed assessment unchanged', () => {
    const input: Assessment = {
      orgName: 'Northwind Traders',
      seats: 4200,
      currency: 'EUR',
      baseline: 'm365e3',
      assumptions: { ...sanitizeAssessment(null).assumptions, e7DiscountPct: 12 },
      lines: [{ categoryId: 'sso-mfa', vendor: 'Test Vendor', mode: 'pupm', pupm: 6, retainPct: 0 }],
      addOns: [{ addOnId: 'copilot', mode: 'pupm', pupm: 30 }],
      plannedCapabilities: ['ztna', 'ediscovery'],
      tei: { ...DEFAULT_TEI_SETTINGS },
    };
    const clean = sanitizeAssessment(input);
    expect(clean.orgName).toBe('Northwind Traders');
    expect(clean.seats).toBe(4200);
    expect(clean.currency).toBe('EUR');
    expect(clean.baseline).toBe('m365e3');
    expect(clean.assumptions.e7DiscountPct).toBe(12);
    expect(clean.lines).toHaveLength(1);
    expect(clean.addOns).toHaveLength(1);
  });

  it('preserves currency and audit-only legacy flags without applying them to USD credit', () => {
    const clean = sanitizeAssessment({
      currency: 'USD',
      lines: [{
        categoryId: 'edr-xdr', vendor: 'Legacy invoice', mode: 'annual', annual: 12_000,
        retainPct: 100, assumptionConfirmed: false,
      }],
      addOns: [{ addOnId: 'copilot', mode: 'annual', annual: 7_200, retainPct: 100, assumptionConfirmed: false }],
    });
    expect(clean.lines[0].retainPct).toBe(100);
    expect(clean.lines[0].assumptionConfirmed).toBe(false);
    expect(clean.addOns[0].assumptionConfirmed).toBe(false);
    expect(clean.assumptions.pricesConfirmed).toBe(false);
    expect(clean.reviewWarnings?.join(' ')).toContain('full replacement');
    const result = computeAssessment(clean);
    expect(result.totalAnnualSavings).toBe(19_200);
    expect(result.cashEstimateReady).toBe(true);
  });

  it.each([undefined, null, NaN, Infinity, '12000'])('does not convert an unknown or invalid legacy amount %s into an explicit zero', (annual) => {
    const clean = sanitizeAssessment({
      lines: [{ categoryId: 'edr-xdr', vendor: 'Legacy', mode: 'annual', annual, retainPct: 0 }],
      addOns: [{ addOnId: 'copilot', mode: 'annual', annual }],
    } as unknown as Assessment);
    expect(clean.lines[0].annual).toBeUndefined();
    expect(clean.addOns[0].annual).toBeUndefined();
    const result = computeAssessment(clean);
    expect(result.totalAnnualSavings).toBe(0);
    expect(result.cashEstimateReady).toBe(false);
  });
});

/**
 * The TEI settings are the newest untrusted surface. The stakes are different from the rest of the
 * assessment: a crafted or stale link cannot corrupt a price here, but it *can* switch on a study
 * line this build considers a double count, and the resulting number would look entirely normal.
 */
describe('sanitizeAssessment — TEI settings', () => {
  const withTei = (patch: unknown) =>
    sanitizeAssessment({ baseline: 'm365e3', tei: patch } as unknown as Assessment).tei;

  it('defaults to the simulation being off', () => {
    expect(sanitizeAssessment(null).tei.enabled).toBe(false);
    expect(withTei(undefined).enabled).toBe(false);
    expect(withTei('nonsense').enabled).toBe(false);
    expect(withTei({}).enabled).toBe(false);
  });

  it('only treats an explicit true as opting in', () => {
    expect(withTei({ enabled: 'yes' }).enabled).toBe(false);
    expect(withTei({ enabled: 1 }).enabled).toBe(false);
    expect(withTei({ enabled: true }).enabled).toBe(true);
  });

  it('drops overrides for line ids this build does not know', () => {
    const clean = withTei({
      lineOverrides: { 'not-a-real-line': true, 'e5-legacy-software': true },
    });
    expect(clean.lineOverrides['not-a-real-line']).toBeUndefined();
    expect(clean.lineOverrides['e5-legacy-software']).toBe(true);
  });

  it('ignores non-boolean override values rather than coercing them', () => {
    const clean = withTei({ lineOverrides: { 'e5-legacy-software': 'true', 'e5-travel': 1 } });
    expect(clean.lineOverrides).toEqual({});
  });

  it('survives a lineOverrides that is not an object', () => {
    for (const junk of [null, 'x', 42, []]) {
      expect(withTei({ lineOverrides: junk }).lineOverrides).toEqual({});
    }
  });

  it('clamps both percentages into range', () => {
    expect(withTei({ confidencePct: 900 }).confidencePct).toBe(100);
    expect(withTei({ confidencePct: -20 }).confidencePct).toBe(0);
    expect(withTei({ copilotAdoptionPct: 340 }).copilotAdoptionPct).toBe(100);
    expect(withTei({ copilotAdoptionPct: 62.7 }).copilotAdoptionPct).toBe(63);
  });

  it('falls back to the default when a percentage is not a usable number', () => {
    expect(withTei({ confidencePct: 'lots' }).confidencePct).toBe(75);
    expect(withTei({ copilotAdoptionPct: null }).copilotAdoptionPct).toBe(60);
    // Infinity is garbage rather than "a very large percentage", so it takes the default
    // instead of clamping to 100 — clamping would invent an opinion the link never expressed.
    expect(withTei({ copilotAdoptionPct: 1e309 }).copilotAdoptionPct).toBe(60);
    expect(withTei({ confidencePct: Number.NaN }).confidencePct).toBe(75);
  });

  it('keeps charging enablement unless told otherwise, so a bad link cannot delete a cost', () => {
    expect(withTei({}).includeEnablementCost).toBe(true);
    expect(withTei({ includeEnablementCost: 'no' }).includeEnablementCost).toBe(true);
    expect(withTei({ includeEnablementCost: false }).includeEnablementCost).toBe(false);
  });

  it('preserves a well-formed settings object', () => {
    const clean = withTei({
      enabled: true,
      confidencePct: 80,
      copilotAdoptionPct: 45,
      includeEnablementCost: false,
      lineOverrides: { 'e5-travel': true },
    });
    expect(clean).toEqual({
      enabled: true,
      combinedReviewed: false,
      enablementOverlapReviewed: false,
      confidencePct: 80,
      copilotAdoptionPct: 45,
      includeEnablementCost: false,
      lineOverrides: { 'e5-travel': true },
    });
  });
});

describe('sanitizeAssessment — assumptions', () => {  const withAssumptions = (patch: Record<string, unknown>) =>
    sanitizeAssessment({
      baseline: 'o365e3',
      assumptions: patch,
    } as unknown as Assessment).assumptions;

  it('anchors the baseline price to the chosen suite when none is supplied', () => {
    expect(withAssumptions({}).baselineUnitPupm).toBe(26);
    expect(
      sanitizeAssessment({ baseline: 'm365e5' } as unknown as Assessment).assumptions
        .baselineUnitPupm,
    ).toBe(60);
  });

  it('keeps a negotiated price that differs from list, because that is the point', () => {
    expect(withAssumptions({ baselineUnitPupm: 21.5 }).baselineUnitPupm).toBe(21.5);
  });

  it('falls back to the anchored price when the supplied one is unusable', () => {
    for (const bad of [NaN, Infinity, -Infinity, undefined, null, '30', {}]) {
      expect(withAssumptions({ baselineUnitPupm: bad }).baselineUnitPupm).toBe(26);
    }
  });

  it('clamps percentages into range instead of trusting them', () => {
    expect(withAssumptions({ e7DiscountPct: 480 }).e7DiscountPct).toBe(100);
    expect(withAssumptions({ e7DiscountPct: -30 }).e7DiscountPct).toBe(0);
    expect(withAssumptions({ year1RealizationPct: 1e9 }).year1RealizationPct).toBe(100);
    expect(withAssumptions({ migrationCostPerSeat: -5 }).migrationCostPerSeat).toBe(0);
  });

  it('normalises the horizon to a whole number of years in range', () => {
    expect(withAssumptions({ horizonYears: 0 }).horizonYears).toBe(1);
    expect(withAssumptions({ horizonYears: 3.6 }).horizonYears).toBe(4);
    expect(withAssumptions({ horizonYears: 900 }).horizonYears).toBe(50);
    expect(withAssumptions({ horizonYears: NaN }).horizonYears).toBe(3);
  });

  /**
   * The confidence haircut, year-one realisation and migration cost were removed from the model.
   * They still exist as fields, so a stale localStorage entry or an old share link will keep
   * supplying the previous values — these two tests assert the sanitiser overwrites rather than
   * trusts them, which is the only thing stopping a returning user from silently getting a 60%
   * haircut the current UI gives them no way to see or change.
   */
  it('pins confidence factors to 1 no matter what the payload supplies', () => {
    const a = withAssumptions({
      conservative: { full: 0.2, strong: 0.7, partial: 0.35 },
      bestCase: { full: 1, strong: 1, partial: 0.6 },
    });
    expect(a.conservative).toEqual({ full: 1, strong: 1, partial: 1 });
    expect(a.bestCase).toEqual({ full: 1, strong: 1, partial: 1 });
  });

  it('pins year-one realisation and migration cost from a stale payload', () => {
    const a = withAssumptions({ year1RealizationPct: 60, migrationCostPerSeat: 12 });
    expect(a.year1RealizationPct).toBe(100);
    expect(a.migrationCostPerSeat).toBe(0);
  });

  it('ignores a confidence block that is not an object', () => {
    expect(withAssumptions({ bestCase: 'nope' }).bestCase).toEqual({
      full: 1,
      strong: 1,
      partial: 1,
    });
  });
});

/**
 * A share link is just a compressed URL payload, so anyone can hand-craft one, and localStorage
 * is equally writable. Seats and the per-line money fields were only ever checked for finiteness,
 * never bounded — so seats: 1e308 survived sanitisation and then overflowed: seats * pupm * 12
 * became Infinity, and the Infinity - Infinity in the uplift became NaN. That poisoned 24 result
 * fields including every TCO year and every waterfall bar the charts consume.
 */
describe('sanitizeAssessment — numeric bounds', () => {
  it('bounds seats so a crafted payload cannot overflow the arithmetic', () => {
    for (const huge of [1e308, Number.MAX_VALUE, 1e30]) {
      const clean = sanitizeAssessment({
        baseline: 'm365e3',
        seats: huge,
      } as unknown as Assessment);
      expect(Number.isFinite(clean.seats)).toBe(true);
      expect(clean.seats).toBeLessThanOrEqual(5_000_000);
    }
  });

  it('bounds per-line money so one line cannot overflow the totals', () => {
    const clean = sanitizeAssessment({
      baseline: 'm365e3',
      seats: 5000,
      lines: [
        { categoryId: 'siem-soar', vendor: 'x', mode: 'pupm', pupm: 1e308, retainPct: 0 },
        { categoryId: 'edr-xdr', vendor: 'y', mode: 'annual', annual: 1e308, retainPct: 0 },
      ],
    } as unknown as Assessment);
    expect(clean.lines).toHaveLength(2);
    expect(clean.lines[0].pupm).toBeLessThanOrEqual(100_000);
    expect(clean.lines[1].annual).toBeLessThanOrEqual(1e12);
    for (const l of clean.lines) {
      expect(Number.isFinite(l.pupm ?? 0)).toBe(true);
      expect(Number.isFinite(l.annual ?? 0)).toBe(true);
    }
  });

  it('clamps a line retainPct into range rather than trusting it', () => {
    const clean = sanitizeAssessment({
      baseline: 'm365e3',
      lines: [{ categoryId: 'siem-soar', vendor: 'x', mode: 'annual', annual: 10, retainPct: 900 }],
    } as unknown as Assessment);
    expect(clean.lines[0].retainPct).toBe(100);
  });

  it('bounds add-on money on the same untrusted path as spend lines', () => {
    const clean = sanitizeAssessment({
      baseline: 'm365e3',
      addOns: [{ addOnId: 'copilot', mode: 'pupm', pupm: Number.MAX_VALUE, seats: 1e308 }],
    } as unknown as Assessment);
    expect(clean.addOns[0].pupm).toBeLessThanOrEqual(100_000);
    expect(clean.addOns[0].seats).toBeLessThanOrEqual(5_000_000);
  });

  it('leaves ordinary values untouched, because bounding must not distort real input', () => {
    const clean = sanitizeAssessment({
      baseline: 'm365e3',
      seats: 7500,
      lines: [{ categoryId: 'siem-soar', vendor: 'Splunk', mode: 'pupm', pupm: 12.5, seats: 400, retainPct: 25 }],
      addOns: [{ addOnId: 'copilot', mode: 'pupm', pupm: 30 }],
    } as unknown as Assessment);
    expect(clean.seats).toBe(7500);
    expect(clean.lines[0].pupm).toBe(12.5);
    expect(clean.lines[0].seats).toBe(400);
    expect(clean.lines[0].retainPct).toBe(25);
    expect(clean.lines[0].vendor).toBe('Splunk');
    expect(clean.addOns[0].pupm).toBe(30);
  });
});
