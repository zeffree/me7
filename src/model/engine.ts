/**
 * The savings engine. Pure functions, no React, fully unit tested — the numbers this
 * produces are the entire credibility of the app.
 *
 * Identity that must always hold:
 *   netAnnual = absorbedAddOns + thirdPartyCredit - (e7Annual - baselineAnnual)
 * which is exactly currentAnnualTotal - futureAnnualTotal.
 */

import { CATEGORIES, type Confidence, type Coverage, type DomainId } from '@/data/categories';
import { getAddOn, getAddOnCapabilityIds } from '@/data/msAddOns';
import { BASELINE_SKUS } from '@/data/skus';
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
  CashflowMonth,
  AddOnLine,
  PaybackStatus,
} from './types';

/** Full-replacement USD scenario with monthly cashflow and explicit TEI combination review. */
export const MODEL_VERSION = 3 as const;

/**
 * Known USD amounts for mapped, covered invoices assume full replacement. This is a scenario
 * assumption, not customer verification or licensing certification. Legacy retained percentages,
 * provenance confirmations and confidence haircuts never change credit. Unknown, not-covered and
 * duplicate/bundled invoices remain retained; explicit transition costs and delays still apply.
 */
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  e7ListPupm: 99,
  e7DiscountPct: 0,
  baselineUnitPupm: 60,
  horizonYears: 3,
  transitionEnabled: false,
  transitionCost: 0,
  baselinePriceSource: 'reference',
  e7PriceSource: 'reference',
  pricesConfirmed: false,
  migrationCostPerSeat: 0,
  year1RealizationPct: 100,
  conservative: { full: 1, strong: 1, partial: 1 },
  bestCase: { full: 1, strong: 1, partial: 1 },
};

const MAX_HORIZON_YEARS = 50;

const clampPct = (n: number) => Math.min(100, Math.max(0, safe(n)));
const clampUnit = (n: number | undefined) => Math.min(1, Math.max(0, safe(n)));
const nonNegative = (n: number | undefined | null) => Math.max(0, safe(n));
const seatCount = (n: number | undefined | null) => Math.min(5_000_000, Math.round(nonNegative(n)));
const unitPrice = (n: number | undefined | null) => Math.min(100_000, nonNegative(n));
const normaliseHorizonYears = (n: number) =>
  Math.min(MAX_HORIZON_YEARS, Math.max(1, Math.round(safe(n))));

/** Coerce anything the UI might hand us (NaN, undefined, '') into a usable number. */
function safe(n: number | undefined | null): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

/** Annualised spend for a single third-party line. */
export function annualiseLine(line: SpendLine | AddOnLine, orgSeats: number): number {
  if (line.mode === 'annual') return Math.min(1e12, nonNegative(line.annual));
  if (line.mode !== 'pupm') return 0;
  const seats = line.seats !== undefined ? seatCount(line.seats) : seatCount(orgSeats);
  return seats * unitPrice(line.pupm) * 12;
}

function validNumber(value: unknown, max: number, integer = false, min = 0): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max &&
    (!integer || Number.isInteger(value));
}

function hasKnownAmount(line: SpendLine | AddOnLine): boolean {
  return line.mode === 'annual' ? validNumber(line.annual, 1e12)
    : line.mode === 'pupm' && validNumber(line.pupm, 100_000);
}

function validInvoiceInputs(line: SpendLine | AddOnLine, transitionEnabled: boolean): boolean {
  return hasKnownAmount(line) &&
    (line.mode !== 'pupm' || line.seats === undefined || validNumber(line.seats, 5_000_000, true)) &&
    (!transitionEnabled || line.savingsDelayMonths === undefined || validNumber(line.savingsDelayMonths, 1200, true));
}

function eligibility(
  line: SpendLine | AddOnLine,
  covered: boolean,
  currency: string,
  overlap = false,
) {
  const amountKnown = hasKnownAmount(line);
  const eligible = covered && amountKnown && currency === 'USD' && !overlap;
  const exclusionReason = !covered
    ? 'Not covered by E7; this invoice remains in future spend.'
    : !amountKnown
      ? 'No valid amount entered. This spend is unknown, not an explicit zero.'
      : currency !== 'USD'
        ? 'Only USD cash estimates are supported. No FX conversion is performed; preserve these original-currency inputs and start a new USD assessment.'
        : overlap
          ? 'Duplicate or bundled invoice entries are ambiguous. Remove the duplicate or overlapping suite/component entries before claiming retirement; legacy confirmation cannot resolve this.'
          : undefined;
  return { eligible, requiresConfirmation: false, exclusionReason };
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
  const effectiveConfidence = effectiveConfidenceFor(coverage, category.confidence);
  const policy = eligibility(line, ['already', 'unlocked', 'upgrade'].includes(coverage),
    assessment.currency, assessment.lines.filter((entry) => entry.categoryId === line.categoryId).length > 1);
  const claimable = policy.eligible ? annualSpend : 0;

  return {
    line,
    category,
    coverage,
    bucket: coverageToBucket(coverage),
    effectiveConfidence,
    annualSpend,
    ...policy,
    annualCredit: claimable,
    conservativeCredit: claimable,
    bestCaseCredit: claimable,
  };
}

const canonicalAddOnId = (id: string) => id === 'copilot-m365' ? 'copilot' : id;

// Supplement catalog supersession with known suite constituents and nested licence tiers.
// Capability intersections alone are not enough: separate products can share a capability.
const BUNDLE_COMPONENTS: Record<string, readonly string[]> = {
  'entra-suite': ['entra-id-governance', 'entra-id-p2'],
  'm365-e5-security': ['entra-id-p1', 'entra-id-p2'],
  'entra-id-p2': ['entra-id-p1'],
  'defender-endpoint-p2': ['defender-endpoint-p1'],
  'defender-o365-p2': ['defender-o365-p1'],
};

function containsAddOn(bundleId: string, componentId: string): boolean {
  // Do not infer transitive inclusion: Entra Suite overlaps P2 but still requires P1 separately.
  return getAddOn(componentId)?.supersededBy === bundleId ||
    (BUNDLE_COMPONENTS[bundleId] ?? []).includes(componentId);
}

function addOnsOverlap(left: AddOnLine, right: AddOnLine): boolean {
  const leftId = canonicalAddOnId(left.addOnId);
  const rightId = canonicalAddOnId(right.addOnId);
  return leftId === rightId || containsAddOn(leftId, rightId) || containsAddOn(rightId, leftId);
}

function scoreAddOns(assessment: Assessment): ScoredAddOn[] {
  const out: ScoredAddOn[] = [];
  for (const [index, entry] of assessment.addOns.entries()) {
    const meta = getAddOn(canonicalAddOnId(entry.addOnId));
    const annualSpend = annualiseLine(entry, assessment.seats);
    if (!meta) {
      out.push({
        line: entry, addOnId: entry.addOnId, name: `Unknown add-on (${entry.addOnId})`,
        annualSpend, annualCredit: 0, absorbed: false, eligible: false, requiresConfirmation: false,
        exclusionReason: 'Unknown add-on invoice retained at full cost; update its catalog identity.',
      });
      continue;
    }
    const overlap = assessment.addOns.some((other, otherIndex) =>
      otherIndex !== index && addOnsOverlap(entry, other));
    const policy = eligibility(entry, meta.absorbedByE7, assessment.currency, overlap);
    const annualCredit = policy.eligible ? annualSpend : 0;
    out.push({
      line: entry,
      addOnId: meta.id,
      name: meta.name,
      annualSpend,
      absorbed: annualCredit > 0,
      ...policy,
      annualCredit,
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
  const seats = seatCount(assessment.seats);
  const priced = new Set(assessment.lines.map((l) => l.categoryId));
  for (const addOn of assessment.addOns) {
    for (const id of getAddOnCapabilityIds(canonicalAddOnId(addOn.addOnId))) priced.add(id);
  }
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
        currency: 'USD' as const,
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

export function buildMonthlyCashflow(opts: {
  horizonYears: number;
  currentAnnualTotal: number;
  uplift: number;
  transitionEnabled: boolean;
  transitionCost: number;
  vendorLines: ScoredLine[];
  addOnLines: ScoredAddOn[];
}): CashflowMonth[] {
  const initial = opts.transitionEnabled ? nonNegative(opts.transitionCost) : 0;
  const months: CashflowMonth[] = [{
    month: 0, currentCost: 0, e7Cost: initial, vendorSavings: 0,
    addOnSavings: 0, cashSavings: 0, licenceUplift: 0,
    transitionCost: initial, netBenefit: -initial, cumulativeNetBenefit: -initial,
  }];
  let cumulative = -initial;
  const credit = (line: ScoredLine | ScoredAddOn, month: number) => {
    const delay = opts.transitionEnabled ? Math.round(nonNegative(line.line.savingsDelayMonths)) : 0;
    return month > delay ? line.annualCredit / 12 : 0;
  };
  for (let month = 1; month <= normaliseHorizonYears(opts.horizonYears) * 12; month++) {
    const vendorSavings = sum(opts.vendorLines.map((line) => credit(line, month)));
    const addOnSavings = sum(opts.addOnLines.map((line) => credit(line, month)));
    const cashSavings = vendorSavings + addOnSavings;
    const licenceUplift = opts.uplift / 12;
    const netBenefit = cashSavings - licenceUplift;
    cumulative += netBenefit;
    months.push({
      month, currentCost: opts.currentAnnualTotal / 12,
      e7Cost: opts.currentAnnualTotal / 12 + licenceUplift - cashSavings,
      vendorSavings, addOnSavings, cashSavings, licenceUplift,
      transitionCost: 0, netBenefit, cumulativeNetBenefit: cumulative,
    });
  }
  return months;
}

export function scheduledPayback(months: Pick<CashflowMonth, 'month' | 'netBenefit' | 'cumulativeNetBenefit'>[]): {
  paybackMonths: number | null; paybackStatus: PaybackStatus;
} {
  let invested = false;
  for (const row of months) {
    if (row.cumulativeNetBenefit < -1e-7) invested = true;
    if (row.month > 0 && invested && row.cumulativeNetBenefit >= -1e-7) {
      return { paybackMonths: row.month, paybackStatus: 'reached' };
    }
  }
  if (invested) return { paybackMonths: null, paybackStatus: 'not-reached' };
  const positive = months.some((m) => m.netBenefit > 1e-7);
  return { paybackMonths: null, paybackStatus: positive ? 'no-investment' : 'break-even' };
}

function buildTco(months: CashflowMonth[]): TcoYear[] {
  const years: TcoYear[] = [];
  for (let start = 1; start < months.length; start += 12) {
    const rows = months.slice(start === 1 ? 0 : start, start + 12);
    years.push({
      year: (start - 1) / 12 + 1,
      currentCost: sum(rows.map((m) => m.currentCost)),
      e7Cost: sum(rows.map((m) => m.e7Cost)),
      netBenefit: sum(rows.map((m) => m.netBenefit)),
      cumulativeNetBenefit: rows[rows.length - 1].cumulativeNetBenefit,
    });
  }
  return years;
}

export function computeAssessment(assessment: Assessment): EngineResult {
  const seats = seatCount(assessment.seats);
  const a = assessment.assumptions;

  // ---------------------------------------------------------------- current state
  const baselineAnnual = seats * unitPrice(a.baselineUnitPupm) * 12;

  const scoredAddOns = scoreAddOns(assessment);
  const addOnAnnualAbsorbed = sum(
    scoredAddOns.map((x) => x.annualCredit),
  );
  const addOnAnnualRetained = sum(
    scoredAddOns.map((x) => x.annualSpend - x.annualCredit),
  );
  const addOnAnnualTotal = addOnAnnualAbsorbed + addOnAnnualRetained;

  const scoredLines = assessment.lines
    .map((l) => scoreLine(l, assessment))
    .filter((x): x is ScoredLine => x !== null);

  // Even an obsolete catalog id still represents an invoice. Do not erase actual spend.
  const thirdPartyAnnual = sum(assessment.lines.map((l) => annualiseLine(l, seats)));
  const currentAnnualTotal = baselineAnnual + addOnAnnualTotal + thirdPartyAnnual;

  // ---------------------------------------------------------------- target state
  const e7NetPupm = unitPrice(a.e7ListPupm) * (1 - clampPct(a.e7DiscountPct) / 100);
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

  const migrationTotal = a.transitionEnabled === true ? Math.min(1e12, nonNegative(a.transitionCost)) : 0;

  // Cost avoidance is computed and returned, but deliberately never folded into
  // totalSavings / netAnnual / TCO. It is benchmark-priced capability the customer gains,
  // not an invoice they stop paying, and mixing the two would make the headline unarguable.
  const avoidedCosts = computeCostAvoidance(assessment);
  const avoidedAnnualSelected = sum(
    avoidedCosts.filter((x) => x.selected).map((x) => x.avoidedAnnual),
  );
  const avoidedAnnualAll = sum(avoidedCosts.map((x) => x.avoidedAnnual));

  const monthlyCashflow = buildMonthlyCashflow({
    horizonYears: a.horizonYears,
    currentAnnualTotal,
    uplift,
    transitionEnabled: a.transitionEnabled === true,
    transitionCost: migrationTotal,
    vendorLines: scoredLines,
    addOnLines: scoredAddOns,
  });
  const tco = buildTco(monthlyCashflow);
  const warnings = [...(assessment.reviewWarnings ?? [])];
  for (const line of [...scoredLines, ...scoredAddOns]) {
    if (!line.eligible && ('category' in line ? line.coverage !== 'not-covered' : getAddOn(line.addOnId)?.absorbedByE7)) {
      warnings.push(`${'category' in line ? line.category.name : line.name}: ${line.exclusionReason}`);
    }
  }
  if (assessment.currency !== 'USD') warnings.push('Only USD cash estimates are supported. No FX conversion is performed; original-currency inputs remain recoverable. Start a new USD assessment rather than relabeling these amounts.');
  if (scoredLines.length !== assessment.lines.length) warnings.push('Unknown catalog invoices retained at full cost and excluded from retirement savings.');
  if (scoredAddOns.some((line) => !getAddOn(line.addOnId))) warnings.push('Unknown Microsoft add-on invoices retained at full cost and excluded from retirement savings.');
  const hasUnknownAmount = [...assessment.lines, ...assessment.addOns].some((line) => !hasKnownAmount(line));
  if (hasUnknownAmount) warnings.push('Some invoice amounts are unknown, not explicit zeros. Current spend and the comparison are incomplete.');
  const usableInputs = validNumber(assessment.seats, 5_000_000, true) &&
    BASELINE_SKUS.some((baseline) => baseline.id === assessment.baseline) &&
    validNumber(a.baselineUnitPupm, 100_000) && validNumber(a.e7ListPupm, 100_000) &&
    validNumber(a.e7DiscountPct, 100) && validNumber(a.horizonYears, 50, true, 1) &&
    (!a.transitionEnabled || validNumber(a.transitionCost, 1e12)) &&
    [...assessment.lines, ...assessment.addOns].every((line) => validInvoiceInputs(line, a.transitionEnabled === true));
  if (!usableInputs) warnings.push('Cash inputs are incomplete or outside supported numeric ranges; correct the amounts, seats, prices, horizon or enabled transition settings before using the estimate.');
  const hasOverlap = assessment.lines.some((line, index) => assessment.lines.some((other, otherIndex) =>
    index !== otherIndex && line.categoryId === other.categoryId)) ||
    assessment.addOns.some((line, index) => assessment.addOns.some((other, otherIndex) =>
      index !== otherIndex && addOnsOverlap(line, other)));
  if (hasOverlap) warnings.push('Remove duplicate or overlapping suite/component invoice entries before using the cash estimate. All implicated retirement credits are excluded.');
  const cashEstimateReady = assessment.currency === 'USD' && usableInputs && !hasOverlap &&
    scoredLines.length === assessment.lines.length &&
    scoredAddOns.every((line) => !!getAddOn(line.addOnId));
  const payback = scheduledPayback(monthlyCashflow);
  if (payback.paybackStatus === 'not-reached' && netAnnualConservative < 0) payback.paybackStatus = 'cost-increase';

  return {
    futureAnnualTotal: currentAnnualTotal - netAnnualConservative,
    recurringAnnualBenefit: netAnnualConservative,
    totalAnnualSavings: totalSavingsConservative,
    year1NetBenefit: tco[0]?.netBenefit ?? 0,
    monthlyCashflow,
    ...payback,
    warnings: [...new Set(warnings)],
    cashEstimateReady,
    cashEstimateConfirmed: cashEstimateReady,
    referenceCurrency: 'USD',
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
