/**
 * The savings engine. Pure functions, no React, fully unit tested — the numbers this
 * produces are the entire credibility of the app.
 *
 * Identity that must always hold:
 *   netAnnual = absorbedAddOns + thirdPartyCredit - (e7Annual - baselineAnnual)
 * which is exactly currentAnnualTotal - futureAnnualTotal.
 */

import { CATEGORIES, type Confidence, type Coverage, type DomainId } from '@/data/categories';
import { getAddOn } from '@/data/msAddOns';
import type {
  Assessment,
  Assumptions,
  AvoidedCost,
  Bucket,
  BucketSummary,
  DomainSummary,
  EngineResult,
  ScoredAddOn,
  ScoredLine,
  SpendLine,
  TcoYear,
} from './types';

/**
 * Replacement credit is driven by one thing the customer states directly: the share of each
 * vendor line they expect to retain. There is deliberately no confidence multiplier and no
 * year-one realisation haircut — those were percentage guesses layered on top of the numbers
 * the customer actually gave us, and they made the output harder to defend, not easier.
 *
 * The confidence/realisation fields survive because share links and stored assessments carry
 * them, but they are pinned to neutral: every factor is 1, so credit = annual x (1 - retainPct)
 * and the conservative and best cases are identical. `sanitizeAssumptions` re-pins them on load
 * so an assessment saved under the old model does not quietly keep the old haircut.
 */
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  e7ListPupm: 99,
  e7DiscountPct: 0,
  baselineUnitPupm: 60,
  horizonYears: 3,
  migrationCostPerSeat: 0,
  year1RealizationPct: 100,
  conservative: { full: 1, strong: 1, partial: 1 },
  bestCase: { full: 1, strong: 1, partial: 1 },
};

const MAX_HORIZON_YEARS = 50;

const clampPct = (n: number) => Math.min(100, Math.max(0, safe(n)));
const clampUnit = (n: number | undefined) => Math.min(1, Math.max(0, safe(n)));
const nonNegative = (n: number | undefined | null) => Math.max(0, safe(n));
const normaliseHorizonYears = (n: number) =>
  Math.min(MAX_HORIZON_YEARS, Math.max(1, Math.round(safe(n))));

/** Coerce anything the UI might hand us (NaN, undefined, '') into a usable number. */
function safe(n: number | undefined | null): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

/** Annualised spend for a single third-party line. */
export function annualiseLine(line: SpendLine, orgSeats: number): number {
  if (line.mode === 'annual') return nonNegative(line.annual);
  const seats = line.seats !== undefined ? nonNegative(line.seats) : nonNegative(orgSeats);
  return nonNegative(seats * nonNegative(line.pupm) * 12);
}

function coverageToBucket(coverage: Coverage): Bucket {
  switch (coverage) {
    case 'already':
      return 'already-redundant';
    case 'unlocked':
      return 'unlocked-by-e7';
    case 'upgrade':
      return 'partial-upgrade';
    case 'not-covered':
      return 'not-covered';
  }
}

/**
 * A tier upgrade is not a like-for-like replacement, so we floor its confidence at
 * 'partial' no matter how strong the category normally scores.
 */
function effectiveConfidenceFor(coverage: Coverage, declared: Confidence): Confidence {
  return coverage === 'upgrade' ? 'partial' : declared;
}

export function scoreLine(
  line: SpendLine,
  assessment: Assessment,
): ScoredLine | null {
  const category = CATEGORIES.find((c) => c.id === line.categoryId);
  if (!category) return null;

  const coverage = category.coverage[assessment.baseline];
  const annualSpend = annualiseLine(line, assessment.seats);
  const retained = clampPct(line.retainPct) / 100;
  const replaceable = annualSpend * (1 - retained);
  const effectiveConfidence = effectiveConfidenceFor(coverage, category.confidence);
  const conservativeFactor = clampUnit(assessment.assumptions.conservative[effectiveConfidence]);
  const bestCaseFactor = clampUnit(assessment.assumptions.bestCase[effectiveConfidence]);

  // E7 does not cover it, so no credit is claimed under any scenario.
  const claimable = coverage === 'not-covered' ? 0 : replaceable;

  return {
    line,
    category,
    coverage,
    bucket: coverageToBucket(coverage),
    effectiveConfidence,
    annualSpend,
    conservativeCredit: claimable * conservativeFactor,
    bestCaseCredit: claimable * bestCaseFactor,
  };
}

function scoreAddOns(assessment: Assessment): ScoredAddOn[] {
  const out: ScoredAddOn[] = [];
  for (const entry of assessment.addOns) {
    const meta = getAddOn(entry.addOnId);
    if (!meta) continue;
    const annualSpend =
      entry.mode === 'annual'
        ? nonNegative(entry.annual)
        : nonNegative(
            (entry.seats !== undefined ? nonNegative(entry.seats) : nonNegative(assessment.seats)) *
              nonNegative(entry.pupm) *
              12,
          );
    out.push({
      addOnId: entry.addOnId,
      name: meta.name,
      annualSpend,
      absorbed: meta.absorbedByE7,
    });
  }
  return out;
}

function summariseBuckets(lines: ScoredLine[]): BucketSummary[] {
  const order: Bucket[] = [
    'already-redundant',
    'unlocked-by-e7',
    'partial-upgrade',
    'not-covered',
  ];
  return order.map((bucket) => {
    const inBucket = lines.filter((l) => l.bucket === bucket);
    return {
      bucket,
      grossSpend: sum(inBucket.map((l) => l.annualSpend)),
      conservativeCredit: sum(inBucket.map((l) => l.conservativeCredit)),
      bestCaseCredit: sum(inBucket.map((l) => l.bestCaseCredit)),
      lineCount: inBucket.length,
    };
  });
}

function summariseDomains(lines: ScoredLine[]): DomainSummary[] {
  const map = new Map<DomainId, DomainSummary>();
  for (const l of lines) {
    const existing = map.get(l.category.domain) ?? {
      domain: l.category.domain,
      grossSpend: 0,
      conservativeCredit: 0,
      bestCaseCredit: 0,
      lineCount: 0,
    };
    existing.grossSpend += l.annualSpend;
    existing.conservativeCredit += l.conservativeCredit;
    existing.bestCaseCredit += l.bestCaseCredit;
    existing.lineCount += 1;
    map.set(l.category.domain, existing);
  }
  return [...map.values()].sort((a, b) => b.grossSpend - a.grossSpend);
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * Cost avoidance: capability the customer gets that they are not paying for today.
 *
 * A candidate is a category that (a) E7 newly unlocks or meaningfully upgrades for this
 * baseline, and (b) has no spend line against it. Condition (b) is what keeps this from
 * double-counting — the moment a category has a vendor and a number, it belongs in the cash
 * savings instead, and it drops out of here automatically.
 *
 * Priced at the catalog benchmark for the third-party products in the category, because there is
 * no customer figure to use by definition — and scaled by the share of the workforce that would
 * realistically hold a seat, so a $30 e-signature seat isn't charged to all 5,000 employees.
 * That makes it a softer number than the cash side, which is exactly why the caller must keep
 * it out of netAnnualImpact and out of the TCO.
 */
export function computeCostAvoidance(assessment: Assessment): AvoidedCost[] {
  const seats = nonNegative(assessment.seats);
  const priced = new Set(assessment.lines.map((l) => l.categoryId));
  const planned = new Set(assessment.plannedCapabilities ?? []);

  return CATEGORIES.filter((c) => {
    if (priced.has(c.id)) return false;
    const cov = c.coverage[assessment.baseline];
    return cov === 'unlocked' || cov === 'upgrade';
  })
    .map((category) => {
      const adoptionPct = category.typicalAdoptionPct === undefined
        ? 1
        : clampUnit(category.typicalAdoptionPct);
      const licensedSeats = Math.round(seats * adoptionPct);
      return {
        category,
        coverage: category.coverage[assessment.baseline],
        benchmarkPupm: nonNegative(category.benchmarkPupm),
        adoptionPct,
        licensedSeats,
        avoidedAnnual: nonNegative(category.benchmarkPupm) * licensedSeats * 12,
        selected: planned.has(category.id),
      };
    })
    .sort((a, b) => b.avoidedAnnual - a.avoidedAnnual);
}

/**
 * Month-by-month payback, honouring the fact that year-one savings are throttled by
 * contract renewal dates. Returns null when the move never pays for itself.
 */
function computePayback(
  migrationTotal: number,
  netAnnualBeforeMigration: number,
  year1RealizationPct: number,
  savingsAnnual: number,
  horizonYears: number,
): number | null {
  if (netAnnualBeforeMigration <= 0 && migrationTotal <= 0) return null;

  // Year 1 runs at partial realisation of the savings component only; the uplift is paid in full.
  const throttle = clampPct(year1RealizationPct) / 100;
  const year1Net = netAnnualBeforeMigration - savingsAnnual * (1 - throttle);

  let cumulative = -migrationTotal;
  const horizonMonths = normaliseHorizonYears(horizonYears) * 12;
  for (let month = 1; month <= horizonMonths; month++) {
    const annualRate = month <= 12 ? year1Net : netAnnualBeforeMigration;
    cumulative += annualRate / 12;
    if (cumulative >= 0) return month;
  }
  return null;
}

function buildTco(opts: {
  horizonYears: number;
  currentAnnualTotal: number;
  e7Annual: number;
  addOnAnnualRetained: number;
  thirdPartyAnnual: number;
  thirdPartyCredit: number;
  migrationTotal: number;
  year1RealizationPct: number;
}): TcoYear[] {
  const throttle = clampPct(opts.year1RealizationPct) / 100;
  const years: TcoYear[] = [];
  let cumulative = 0;

  for (let year = 1; year <= normaliseHorizonYears(opts.horizonYears); year++) {
    const realization = year === 1 ? throttle : 1;
    // Absorbed Microsoft add-ons simply drop out of the future cost the day E7 lands, so
    // unlike third-party contracts they are not throttled by renewal timing.
    const retainedThirdParty = opts.thirdPartyAnnual - opts.thirdPartyCredit * realization;
    const e7Cost =
      opts.e7Annual +
      opts.addOnAnnualRetained +
      retainedThirdParty +
      (year === 1 ? opts.migrationTotal : 0);
    const netBenefit = opts.currentAnnualTotal - e7Cost;
    cumulative += netBenefit;
    years.push({
      year,
      currentCost: opts.currentAnnualTotal,
      e7Cost,
      netBenefit,
      cumulativeNetBenefit: cumulative,
    });
  }
  return years;
}

export function computeAssessment(assessment: Assessment): EngineResult {
  const seats = nonNegative(assessment.seats);
  const a = assessment.assumptions;

  // ---------------------------------------------------------------- current state
  const baselineAnnual = seats * nonNegative(a.baselineUnitPupm) * 12;

  const scoredAddOns = scoreAddOns(assessment);
  const addOnAnnualAbsorbed = sum(
    scoredAddOns.filter((x) => x.absorbed).map((x) => x.annualSpend),
  );
  const addOnAnnualRetained = sum(
    scoredAddOns.filter((x) => !x.absorbed).map((x) => x.annualSpend),
  );
  const addOnAnnualTotal = addOnAnnualAbsorbed + addOnAnnualRetained;

  const scoredLines = assessment.lines
    .map((l) => scoreLine(l, assessment))
    .filter((x): x is ScoredLine => x !== null);

  const thirdPartyAnnual = sum(scoredLines.map((l) => l.annualSpend));
  const currentAnnualTotal = baselineAnnual + addOnAnnualTotal + thirdPartyAnnual;

  // ---------------------------------------------------------------- target state
  const e7NetPupm = nonNegative(a.e7ListPupm) * (1 - clampPct(a.e7DiscountPct) / 100);
  const e7Annual = seats * e7NetPupm * 12;
  const uplift = e7Annual - baselineAnnual;

  // ---------------------------------------------------------------- consolidation
  const thirdPartyCreditConservative = sum(scoredLines.map((l) => l.conservativeCredit));
  const thirdPartyCreditBest = sum(scoredLines.map((l) => l.bestCaseCredit));

  const totalSavingsConservative = addOnAnnualAbsorbed + thirdPartyCreditConservative;
  const totalSavingsBest = addOnAnnualAbsorbed + thirdPartyCreditBest;

  const netAnnualConservative = totalSavingsConservative - uplift;
  const netAnnualBest = totalSavingsBest - uplift;

  const effectiveNetPupmConservative =
    seats > 0 ? (e7Annual - totalSavingsConservative) / seats / 12 : 0;
  const effectiveNetPupmBest = seats > 0 ? (e7Annual - totalSavingsBest) / seats / 12 : 0;

  const migrationTotal = seats * nonNegative(a.migrationCostPerSeat);

  // Cost avoidance is computed and returned, but deliberately never folded into
  // totalSavings / netAnnual / TCO. It is benchmark-priced capability the customer gains,
  // not an invoice they stop paying, and mixing the two would make the headline unarguable.
  const avoidedCosts = computeCostAvoidance(assessment);
  const avoidedAnnualSelected = sum(
    avoidedCosts.filter((x) => x.selected).map((x) => x.avoidedAnnual),
  );
  const avoidedAnnualAll = sum(avoidedCosts.map((x) => x.avoidedAnnual));

  const tco = buildTco({
    horizonYears: a.horizonYears,
    currentAnnualTotal,
    e7Annual,
    addOnAnnualRetained,
    thirdPartyAnnual,
    thirdPartyCredit: thirdPartyCreditConservative,
    migrationTotal,
    year1RealizationPct: a.year1RealizationPct,
  });

  return {
    seats,
    baselineAnnual,
    addOnAnnualTotal,
    addOnAnnualAbsorbed,
    addOnAnnualRetained,
    thirdPartyAnnual,
    currentAnnualTotal,
    e7NetPupm,
    e7Annual,
    uplift,
    scoredLines,
    scoredAddOns,
    buckets: summariseBuckets(scoredLines),
    domains: summariseDomains(scoredLines),
    thirdPartyCreditConservative,
    thirdPartyCreditBest,
    totalSavingsConservative,
    totalSavingsBest,
    netAnnualConservative,
    netAnnualBest,
    effectiveNetPupmConservative,
    effectiveNetPupmBest,
    migrationTotal,
    paybackMonths: computePayback(
      migrationTotal,
      netAnnualConservative,
      a.year1RealizationPct,
      totalSavingsConservative,
      a.horizonYears,
    ),
    tco,
    tcoNetBenefit: tco.length ? tco[tco.length - 1].cumulativeNetBenefit : 0,
    avoidedCosts,
    avoidedAnnualSelected,
    avoidedAnnualAll,
  };
}

/** Steps for the consolidation waterfall chart, in presentation order. */
export function buildWaterfall(result: EngineResult) {
  return [
    { key: 'current', label: 'Current annual spend', value: result.currentAnnualTotal, kind: 'total' as const },
    { key: 'uplift', label: 'E7 licence uplift', value: result.uplift, kind: 'increase' as const },
    { key: 'addons', label: 'Microsoft add-ons absorbed', value: -result.addOnAnnualAbsorbed, kind: 'decrease' as const },
    {
      key: 'already',
      label: 'Already redundant today',
      value: -(result.buckets.find((b) => b.bucket === 'already-redundant')?.conservativeCredit ?? 0),
      kind: 'decrease' as const,
    },
    {
      key: 'unlocked',
      label: 'Unlocked by E7',
      value: -(result.buckets.find((b) => b.bucket === 'unlocked-by-e7')?.conservativeCredit ?? 0),
      kind: 'decrease' as const,
    },
    {
      key: 'upgrade',
      label: 'Partial upgrades',
      value: -(result.buckets.find((b) => b.bucket === 'partial-upgrade')?.conservativeCredit ?? 0),
      kind: 'decrease' as const,
    },
    {
      key: 'future',
      label: 'Future annual spend',
      value: result.currentAnnualTotal - result.netAnnualConservative,
      kind: 'total' as const,
    },
  ];
}
