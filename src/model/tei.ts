/**
 * The experimental TEI simulation.
 *
 * Pure functions, no React, unit tested against the published studies. This module answers a
 * different question from `engine.ts`: not "what invoices disappear" but "what did Forrester
 * measure organisations getting from the three things E7 bundles".
 *
 * WHAT THIS IS
 * ------------
 * Each study's published, risk-adjusted benefit line is divided by the seat population that
 * earned it, then re-multiplied by this customer's seats. Forrester's own year-by-year shape is
 * preserved rather than averaged, and the result is discounted at 10% a year to match the
 * studies' own convention.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is not a Forrester finding about this customer, and none of it may touch the cash side of
 * the app. `TeiResult` is a separate object for exactly that reason: net annual impact, effective
 * per-user price and the existing TCO never see these numbers. The cash benefit that appears
 * inside the simulation is the *same* consolidation saving `engine.ts` already computed, pulled
 * in so the ROI has a real denominator — not a second, differently-derived version of it.
 */

import {
  COPILOT_ENABLEMENT_PER_SEAT,
  TEI_DISCOUNT_RATE,
  TEI_STUDIES,
  isLineOnByDefault,
  perSeatRate,
  type TeiBenefitLine,
  type TeiStudy,
} from '@/data/teiStudies';
import { getBaseline } from '@/data/skus';
import { annualiseLine, scheduledPayback } from './engine';
import type {
  Assessment,
  EngineResult,
  TeiResult,
  TeiScoredLine,
  TeiSettings,
  TeiStudySummary,
  TeiYear,
} from './types';

/**
 * Off by default, and conservative when switched on.
 *
 * `copilotAdoptionPct` starts at 60 because the Copilot study licensed only 40% of its
 * composite's workforce by year three, whereas E7 licenses everybody — and a licence is not
 * usage. `confidencePct` starts at 75 as a single, visible haircut on an extrapolation that is
 * honestly weaker than the rest of the app's arithmetic.
 */
export const DEFAULT_TEI_SETTINGS: TeiSettings = {
  enabled: false,
  combinedReviewed: false,
  enablementOverlapReviewed: false,
  lineOverrides: {},
  copilotAdoptionPct: 60,
  confidencePct: 75,
  includeEnablementCost: true,
};

const MAX_HORIZON_YEARS = 50;

function safe(n: number | undefined | null): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

const nonNegative = (n: number | undefined | null) => Math.max(0, safe(n));
const clampPct = (n: number | undefined) => Math.min(100, Math.max(0, safe(n)));
const normaliseHorizonYears = (n: number) =>
  Math.min(MAX_HORIZON_YEARS, Math.max(1, Math.round(safe(n))));

/** Present value of a single year's cash flow, discounted end-of-year at Forrester's 10%. */
export function discountYear(value: number, year: number): number {
  return value / Math.pow(1 + TEI_DISCOUNT_RATE, year);
}

/**
 * Whether a line contributes to the totals. Lines that would double-count the app's own
 * consolidation maths, or that carry an explicit caution, are off unless the user says otherwise.
 */
export function isLineIncluded(line: TeiBenefitLine, settings: TeiSettings): boolean {
  const override = settings.lineOverrides?.[line.id];
  return typeof override === 'boolean' ? override : isLineOnByDefault(line);
}

function notApplicableReason(study: TeiStudy, assessment: Assessment): string | undefined {
  if (assessment.addOns.some((line) => (line.addOnId === 'copilot-m365' ? 'copilot' : line.addOnId) === study.id &&
      annualiseLine(line, assessment.seats) > 0)) {
    return 'This capability is already bought as a Microsoft add-on; its full study benefit is not a new E7 benefit.';
  }
  if (study.appliesTo.includes(assessment.baseline)) return undefined;
  const name = getBaseline(assessment.baseline).name;
  return `You are already on ${name}, so this value is banked rather than gained. Counting it towards an E7 move would be selling you something you own.`;
}

/**
 * Scale one study line to this customer.
 *
 * Copilot lines are scaled to adopting seats rather than all seats. Everything else is org-wide:
 * a help desk stops taking password reset calls for the whole population, not for a licensed
 * subset.
 */
function scoreLine(
  study: TeiStudy,
  line: TeiBenefitLine,
  opts: {
    seats: number;
    copilotSeats: number;
    horizonYears: number;
    confidence: number;
    settings: TeiSettings;
    applies: boolean;
  },
): TeiScoredLine {
  const appliedSeats = study.adoptionScaled ? opts.copilotSeats : opts.seats;
  const included = opts.applies && isLineIncluded(line, opts.settings);

  const byYear: number[] = [];
  for (let y = 0; y < opts.horizonYears; y++) {
    const value = perSeatRate(line, y) * appliedSeats * opts.confidence;
    byYear.push(included ? value : 0);
  }

  const total = byYear.reduce((a, b) => a + b, 0);
  const presentValue = byYear.reduce((acc, v, i) => acc + discountYear(v, i + 1), 0);

  return {
    studyId: study.id,
    lineId: line.id,
    line,
    included,
    suppressedReason: line.doubleCounts ?? line.caution,
    perSeatYear1: perSeatRate(line, 0),
    appliedSeats,
    byYear,
    total,
    presentValue,
  };
}

export function computeTei(assessment: Assessment, result: EngineResult): TeiResult {
  const settings: TeiSettings = { ...DEFAULT_TEI_SETTINGS, ...(assessment.tei ?? {}) };
  const seats = nonNegative(result.seats);
  const horizonYears = normaliseHorizonYears(assessment.assumptions.horizonYears);
  const confidence = clampPct(settings.confidencePct) / 100;
  const copilotSeats = Math.round(seats * (clampPct(settings.copilotAdoptionPct) / 100));

  const scoredLines: TeiScoredLine[] = [];
  const studies: TeiStudySummary[] = [];

  for (const study of TEI_STUDIES) {
    const reason = notApplicableReason(study, assessment);
    const applies = settings.enabled === true && reason === undefined;
    const lines = study.lines.map((line) =>
      scoreLine(study, line, {
        seats,
        copilotSeats,
        horizonYears,
        confidence,
        settings,
        applies,
      }),
    );
    scoredLines.push(...lines);
    const byYear = Array.from({ length: horizonYears }, (_, y) =>
      lines.reduce((total, line) => total + line.byYear[y], 0));
    studies.push({
      studyId: study.id,
      applies,
      notApplicableReason: reason,
      presentValue: lines.reduce((a, l) => a + l.presentValue, 0),
      includedLineCount: lines.filter((l) => l.included).length,
      byYear,
      total: byYear.reduce((total, value) => total + value, 0),
    });
  }

  const combinationWarnings: string[] = [];
  if (!settings.enabled) combinationWarnings.push('Experimental study estimates are switched off.');
  if (!settings.combinedReviewed) combinationWarnings.push('Explicit benefit-overlap and implementation-cost review is required before combining studies with cash costs.');
  if (assessment.currency !== 'USD') combinationWarnings.push('Study values are USD. No currency conversion is supplied, so they cannot be combined with non-USD assessment costs.');
  if (!result.cashEstimateReady) combinationWarnings.push('Resolve incomplete or ambiguous USD cash-model inputs before combining.');
  if (!settings.includeEnablementCost && !settings.enablementOverlapReviewed && copilotSeats > 0 &&
      studies.some((study) => study.studyId === 'copilot' && study.applies)) {
    combinationWarnings.push('Review the exact excluded Copilot training cost. A transition budget alone does not prove this cost is already included or inapplicable.');
  }
  const active = scoredLines.filter((line) => line.included && line.total > 0);
  const groups = new Map<string, string[]>();
  for (const scored of active) {
    if (scored.line.doubleCounts) combinationWarnings.push(`Exclude ${scored.line.name}: overlaps the common cash benefit.`);
    const group = (scored.line as TeiBenefitLine & { overlapGroup?: string }).overlapGroup;
    if (group) groups.set(group, [...(groups.get(group) ?? []), scored.line.name]);
  }
  for (const [group, lines] of groups) {
    if (lines.length > 1) combinationWarnings.push(`Resolve overlapping benefit group "${group}" by keeping at most one line: ${lines.join(', ')}.`);
  }
  const canCombine = combinationWarnings.length === 0;
  const standaloneBenefitPv = scoredLines.reduce((total, line) => total + line.presentValue, 0);
  if (!canCombine) {
    return {
      enabled: settings.enabled === true, canCombine, combinationWarnings,
      referenceCurrency: 'USD', seats, copilotSeats, horizonYears, scoredLines, studies,
      years: [], teiBenefitPv: standaloneBenefitPv, cashBenefitPv: 0,
      totalBenefitPv: 0, costPv: 0, npv: null, roiPct: null, paybackMonths: null,
      paybackStatus: 'withheld',
      upliftAnnual: 0, migrationTotal: 0, enablementTotal: 0,
    };
  }

  // ---------------------------------------------------------------- costs
  // The investment is what the customer newly spends. When E7 lands cheaper than the current
  // baseline the uplift is negative, which is a benefit rather than a negative cost — folding it
  // in as one would produce a nonsensical ROI denominator.
  const upliftAnnual = Math.max(0, result.uplift);
  const migrationTotal = nonNegative(result.migrationTotal);

  const enablementByYear: number[] = [];
  for (let y = 0; y < horizonYears; y++) {
    if (!settings.includeEnablementCost || !studies.find((study) => study.studyId === 'copilot')?.applies) {
      enablementByYear.push(0);
      continue;
    }
    const rate = COPILOT_ENABLEMENT_PER_SEAT[Math.min(y, COPILOT_ENABLEMENT_PER_SEAT.length - 1)];
    enablementByYear.push(rate * copilotSeats);
  }
  const enablementTotal = enablementByYear.reduce((a, b) => a + b, 0);

  // ---------------------------------------------------------------- benefits
  const years: TeiYear[] = [];
  let teiBenefitPv = 0;
  let cashBenefitPv = 0;
  let recurringCostPv = 0;

  // Migration is the time-zero investment, undiscounted, exactly as a TEI treats initial cost.
  // Every year row below therefore carries only recurring cost, and the cumulative series starts
  // in the hole by that investment rather than charging it again inside year one.
  let cumulativeNet = -migrationTotal;

  for (let y = 0; y < horizonYears; y++) {
    const cashBenefitAnnual = result.monthlyCashflow
      .filter((month) => month.month > y * 12 && month.month <= (y + 1) * 12)
      .reduce((total, month) => total + month.cashSavings + Math.max(0, -month.licenceUplift), 0);
    const teiBenefit = scoredLines.reduce((a, l) => a + l.byYear[y], 0);
    const cost = upliftAnnual + enablementByYear[y];
    const benefit = teiBenefit + cashBenefitAnnual;
    const net = benefit - cost;
    cumulativeNet += net;

    teiBenefitPv += discountYear(teiBenefit, y + 1);
    cashBenefitPv += discountYear(cashBenefitAnnual, y + 1);
    recurringCostPv += discountYear(cost, y + 1);

    years.push({
      year: y + 1,
      teiBenefit,
      cashBenefit: cashBenefitAnnual,
      cost,
      net,
      cumulativeNet,
    });
  }

  // Migration is a time-zero investment and is not discounted, matching TEI convention.
  const costPv = recurringCostPv + migrationTotal;
  const totalBenefitPv = teiBenefitPv + cashBenefitPv;
  const npv = totalBenefitPv - costPv;
  let monthlyCumulative = -migrationTotal;
  const paybackSchedule = result.monthlyCashflow.map((month) => {
    if (month.month === 0) return month;
    const year = Math.floor((month.month - 1) / 12);
    const studyBenefit = scoredLines.reduce((total, line) => total + line.byYear[year], 0) / 12;
    const netBenefit = month.netBenefit + studyBenefit - enablementByYear[year] / 12;
    monthlyCumulative += netBenefit;
    return { month: month.month, netBenefit, cumulativeNetBenefit: monthlyCumulative };
  });

  return {
    enabled: settings.enabled === true,
    canCombine,
    combinationWarnings,
    referenceCurrency: 'USD',
    seats,
    copilotSeats,
    horizonYears,
    scoredLines,
    studies,
    years,
    teiBenefitPv,
    cashBenefitPv,
    totalBenefitPv,
    costPv,
    npv,
    roiPct: costPv > 0 ? (npv / costPv) * 100 : null,
    ...scheduledPayback(paybackSchedule),
    upliftAnnual,
    migrationTotal,
    enablementTotal,
  };
}
