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
import { BASELINE_SKUS } from '@/data/skus';
import { gapCategories, licencesForBaseline } from '@/data/standaloneLicences';
import { cheapestCover, type CoverCandidate } from './licenceCover';

import type {
  Assessment,
  Assumptions,
  AvoidedCapability,
  AvoidedLicence,
  Bucket,
  BucketSummary,
  CostAvoidance,
  DomainSummary,
  EngineResult,
  LicenceOwnership,
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
 * Capability cost avoidance: what the customer would pay Microsoft to license, separately, the
 * capabilities they plan to deploy that E7 includes and their current suite does not.
 *
 * Every gap capability is priced on its own (the cheapest standalone licences that would provide
 * just it) so the customer can choose. The selected capabilities are then priced together as the
 * cheapest licence set that provides them all, because one suite licence often covers several.
 * Prices are Microsoft list references less the assessment's E7 discount unless the customer
 * enters one. Microsoft add-ons they already buy license their users at no extra cost, and a suite
 * step-up is credited with the purchased add-ons it would replace, so nothing is counted twice.
 *
 * Third-party invoices on the same capability stay credited on the cash side and are flagged
 * here. These are two separate lenses and must never be summed, which is why the caller keeps
 * this out of netAnnualImpact, TCO and payback.
 */
export function computeCostAvoidance(
  assessment: Assessment,
  context: {
    baselineAnnual: number;
    addOnAnnualAbsorbed: number;
    e7Annual: number;
    e7NetPupm: number;
    scoredLines: ScoredLine[];
    scoredAddOns: ScoredAddOn[];
  },
): CostAvoidance {
  const seats = seatCount(assessment.seats);
  const discountPct = clampPct(assessment.assumptions.e7DiscountPct);
  const userEdits = assessment.costAvoidance?.users ?? {};
  const unitPrices = assessment.costAvoidance?.unitPrices ?? {};
  const selectedIds = new Set(assessment.plannedCapabilities ?? []);
  const gap = gapCategories(assessment.baseline);
  const licences = licencesForBaseline(assessment.baseline);

  const owned = assessment.addOns.map((line, index) => ({
    line,
    id: canonicalAddOnId(line.addOnId),
    seats: line.seats !== undefined ? seatCount(line.seats) : seats,
    scored: context.scoredAddOns[index],
  }));

  const priced = licences.map((licence) => {
    const owners = licence.addOnId
      ? owned.filter((o) => o.id === licence.addOnId || containsAddOn(o.id, licence.addOnId!))
      : [];
    const ownedSeats = Math.min(seats, sum(owners.map((o) => o.seats)));
    const superseded = licence.supersedesAddOnIds.length
      ? owned.filter((o) => licence.supersedesAddOnIds.includes(o.id))
      : [];
    const supersededAnnual = sum(superseded.map((o) => (o.scored?.eligible ? o.scored.annualCredit : 0)));
    const listPricePupm = unitPrice(licence.listPricePupm);
    const defaultUnitPupm = listPricePupm * (1 - discountPct / 100);
    const priceOverride = unitPrices[licence.id];
    const unitPriceOverridden = validNumber(priceOverride, 100_000);
    const unitPupm = unitPriceOverridden ? priceOverride : defaultUnitPupm;
    return {
      licence, owners, ownedSeats, superseded, listPricePupm, defaultUnitPupm, unitPupm, unitPriceOverridden,
      candidate: {
        id: licence.id,
        grants: licence.capabilityIds,
        unitPupm,
        ownedSeats,
        creditPupm: seats > 0 ? supersededAnnual / seats / 12 : 0,
        requiresOneOf: licence.requiresOneOf[assessment.baseline] ?? [],
      } satisfies CoverCandidate,
    };
  });
  const candidates = priced.map((p) => p.candidate);
  const byId = new Map(priced.map((p) => [p.licence.id, p]));

  const cashOverlapFor = (ids: Set<string>) => context.scoredLines
    .filter((l) => l.eligible && l.annualCredit > 0 && ids.has(l.category.id))
    .map((l) => ({
      categoryId: l.category.id,
      categoryName: l.category.name,
      vendor: l.line.vendor || l.category.name,
      annualCredit: l.annualCredit,
    }));

  const capabilities = gap.map((category): AvoidedCapability => {
    const edit = userEdits[category.id];
    const usersOverridden = validNumber(edit, 5_000_000, true);
    const users = usersOverridden ? edit : seats;
    const alone = cheapestCover([{ id: category.id, users }], candidates);
    const isPriced = alone.uncovered.length === 0;
    const ownedVia = priced
      .filter((p) => p.licence.capabilityIds.includes(category.id) && p.owners.length && p.ownedSeats >= users)
      .flatMap((p) => p.owners.map((o) => getAddOn(o.id)?.name ?? o.id));
    const benchmark = nonNegative(category.benchmarkPupm) *
      (category.typicalAdoptionPct === undefined ? 1 : clampUnit(category.typicalAdoptionPct));
    return {
      category,
      selected: selectedIds.has(category.id),
      priced: isPriced,
      defaultUsers: seats,
      users,
      usersOverridden,
      standaloneLicenceIds: alone.lines.map((l) => l.id),
      standaloneLicenceNames: alone.lines.map((l) => byId.get(l.id)!.licence.name),
      standaloneAnnual: isPriced ? alone.annual : 0,
      countedAnnual: 0,
      marginalAnnual: 0,
      ownedVia: [...new Set(ownedVia)],
      thirdPartyReferencePupm: benchmark,
      thirdPartyReferenceAnnual: benchmark * users * 12,
      cashOverlap: cashOverlapFor(new Set([category.id])),
    };
  });

  const counted = capabilities.filter((c) => c.selected && c.priced);
  const combined = cheapestCover(counted.map((c) => ({ id: c.category.id, users: c.users })), candidates);
  const lines = combined.lines.map((line): AvoidedLicence => {
    const p = byId.get(line.id)!;
    const assigned = line.capabilityIds.map((id) => counted.find((c) => c.category.id === id)!.category);
    const ownership: LicenceOwnership = p.owners.length === 0 ? 'none' : p.ownedSeats >= line.quantity ? 'full' : 'partial';
    return {
      currency: 'USD',
      licence: p.licence,
      capabilities: assigned,
      prerequisiteFor: line.prerequisiteFor.map((id) => byId.get(id)!.licence),
      listPricePupm: p.listPricePupm,
      discountPct,
      defaultUnitPupm: p.defaultUnitPupm,
      unitPupm: p.unitPupm,
      unitPriceOverridden: p.unitPriceOverridden,
      quantity: line.quantity,
      paidQuantity: line.paidQuantity,
      ownership,
      ownedSeats: p.ownedSeats,
      ownedAddOnNames: [...new Set(p.owners.map((o) => getAddOn(o.id)?.name ?? o.id))],
      supersededCredit: line.creditAnnual,
      supersededAddOnNames: line.creditAnnual > 0 ? [...new Set(p.superseded.map((o) => getAddOn(o.id)?.name ?? o.id))] : [],
      grossAnnual: line.grossAnnual,
      annual: line.annual,
      cashOverlap: cashOverlapFor(new Set(line.capabilityIds)),
    };
  });
  // Count each licence once: its cost sits with the selected capability needing it for the most
  // users, the rest are shown as included with it, and a prerequisite follows its dependent licence.
  const capById = new Map(capabilities.map((c) => [c.category.id, c]));
  const primaryOf = new Map<string, AvoidedCapability>();
  for (const line of lines) {
    const caps = line.capabilities.map((cat) => capById.get(cat.id)!);
    const primary = caps.reduce<AvoidedCapability | undefined>((best, cap) => (!best || cap.users > best.users ? cap : best), undefined);
    if (!primary) continue;
    primaryOf.set(line.licence.id, primary);
    for (const cap of caps) {
      cap.coveredByLicenceId = line.licence.id;
      if (cap !== primary) cap.includedWith = { licenceId: line.licence.id, licenceName: line.licence.name, countedOn: primary.category };
    }
  }
  for (const line of lines) {
    const owner = primaryOf.get(line.licence.id) ??
      line.prerequisiteFor.map((l) => primaryOf.get(l.id)).find(Boolean) ?? counted[0];
    if (owner) owner.countedAnnual += line.annual;
  }
  const inSet = new Set(combined.lines.map((l) => l.id));
  for (const cap of capabilities) {
    if (cap.selected) { cap.marginalAnnual = cap.countedAnnual; continue; }
    if (!cap.priced) continue;
    if (!counted.length) { cap.marginalAnnual = cap.standaloneAnnual; continue; }
    const withIt = cheapestCover([...counted, cap].map((c) => ({ id: c.category.id, users: c.users })), candidates);
    cap.marginalAnnual = Math.max(0, withIt.annual - combined.annual);
    const via = withIt.lines.find((l) => l.capabilityIds.includes(cap.category.id) && inSet.has(l.id));
    if (via) cap.includedWith = { licenceId: via.id, licenceName: byId.get(via.id)!.licence.name };
  }

  const annualAvoided = combined.annual;
  const currentLicenceAnnual = context.baselineAnnual + context.addOnAnnualAbsorbed;
  const buySeparatelyAnnual = currentLicenceAnnual + annualAvoided;
  const perUser = (annual: number) => (seats > 0 ? annual / seats / 12 : 0);

  return {
    currency: 'USD',
    capabilities,
    lines,
    selectedCount: capabilities.filter((c) => c.selected).length,
    unpriced: capabilities.filter((c) => !c.priced).map((c) => c.category),
    annualAvoided,
    standaloneSumAnnual: sum(counted.map((c) => c.standaloneAnnual)),
    thirdPartyReferenceAnnual: sum(counted.map((c) => c.thirdPartyReferenceAnnual)),
    currentLicenceAnnual,
    buySeparatelyAnnual,
    buySeparatelyPupm: perUser(buySeparatelyAnnual),
    e7Annual: context.e7Annual,
    e7NetPupm: context.e7NetPupm,
    bundleDifferenceAnnual: buySeparatelyAnnual - context.e7Annual,
    bundleDifferencePupm: perUser(buySeparatelyAnnual - context.e7Annual),
  };
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

  // Licence cost avoidance is computed and returned, but deliberately never folded into
  // totalSavings / netAnnual / TCO. It is a licence counterfactual — what the customer would
  // otherwise have to buy — not an invoice they stop paying.
  const costAvoidance = computeCostAvoidance(assessment, {
    baselineAnnual, addOnAnnualAbsorbed, e7Annual, e7NetPupm, scoredLines, scoredAddOns,
  });

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
    costAvoidance,
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
