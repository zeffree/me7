import type { BaselineSkuId } from '@/data/skus';
import type { Category, Confidence, Coverage, DomainId } from '@/data/categories';
import type { TeiBenefitLine, TeiStudyId } from '@/data/teiStudies';

/** How a spend figure was entered. */
export type SpendMode = 'pupm' | 'annual';

/** A third-party product the customer pays for today. */
export interface SpendLine {
  categoryId: string;
  vendor: string;
  /** Seats for this product. Falls back to the org-wide seat count when unset. */
  seats?: number;
  mode: SpendMode;
  /** USD per user per month, when mode is 'pupm'. */
  pupm?: number;
  /** USD annual total, when mode is 'annual'. */
  annual?: number;
  /** ISO date. Purely informational today, but surfaced so renewal timing is visible. */
  contractEnd?: string;
  /** 0-100. Portion of this spend the customer expects to keep even after consolidating. */
  retainPct: number;
}

/** A Microsoft add-on SKU the customer pays for today. */
export interface AddOnLine {
  addOnId: string;
  seats?: number;
  mode: SpendMode;
  pupm?: number;
  annual?: number;
}

export interface Assumptions {
  /** E7 list price per user per month. */
  e7ListPupm: number;
  /** Negotiated discount off E7 list, as a percentage. */
  e7DiscountPct: number;
  /** What the customer actually pays today for their baseline suite, per user per month. */
  baselineUnitPupm: number;
  horizonYears: number;
  migrationCostPerSeat: number;
  /** Share of consolidation savings realised in year one, since contracts run to renewal. */
  year1RealizationPct: number;
  /** Credit applied per confidence tier in the conservative case. */
  conservative: Record<Confidence, number>;
  /** Credit applied per confidence tier in the best case. */
  bestCase: Record<Confidence, number>;
}

/**
 * Settings for the experimental TEI simulation. Kept off by default: everything else in this app
 * multiplies numbers the customer typed in themselves, whereas this re-scales somebody else's
 * composite organisation onto them. That is a weaker claim and the UI treats it as one.
 */
export interface TeiSettings {
  /** The user has explicitly opted in to running the simulation. */
  enabled: boolean;
  /**
   * Per-line overrides against the default on/off state. Stored as overrides rather than as a
   * list of enabled ids so that adding a study line later cannot silently switch something on
   * inside an assessment somebody already saved or shared.
   */
  lineOverrides: Record<string, boolean>;
  /**
   * Share of seats expected to actively use Copilot, 0-100. The study licensed only 40% of its
   * composite's workforce; E7 licenses everybody, which is not the same as everybody using it.
   */
  copilotAdoptionPct: number;
  /** A single honest haircut on the whole simulation, 0-100. */
  confidencePct: number;
  /** Count the Copilot training and discovery cost the study itself charged. */
  includeEnablementCost: boolean;
}

export interface Assessment {
  orgName: string;
  seats: number;
  currency: string;
  baseline: BaselineSkuId;
  assumptions: Assumptions;
  lines: SpendLine[];
  addOns: AddOnLine[];
  /**
   * Category ids the customer does not pay for today and intends to switch on once E7 includes
   * them. These drive cost avoidance, which is deliberately kept out of the cash savings: the
   * customer is not cancelling an invoice, they are getting capability they would otherwise have
   * had to buy. Folding it into net impact would inflate the number a CFO is asked to trust.
   */
  plannedCapabilities: string[];
  tei: TeiSettings;
}

/**
 * Which story a line tells.
 *  already-redundant — the customer's CURRENT suite already covers this; they pay twice today
 *  unlocked-by-e7    — moving to E7 newly covers it
 *  partial-upgrade   — they have a lesser tier today and E7 raises it; scored conservatively
 *  not-covered       — E7 does not cover this at all; zero credit
 */
export type Bucket = 'already-redundant' | 'unlocked-by-e7' | 'partial-upgrade' | 'not-covered';

export interface ScoredLine {
  line: SpendLine;
  category: Category;
  coverage: Coverage;
  bucket: Bucket;
  /** Confidence actually used — 'upgrade' coverage is floored to 'partial'. */
  effectiveConfidence: Confidence;
  annualSpend: number;
  conservativeCredit: number;
  bestCaseCredit: number;
}

export interface ScoredAddOn {
  addOnId: string;
  name: string;
  annualSpend: number;
  absorbed: boolean;
}

export interface BucketSummary {
  bucket: Bucket;
  grossSpend: number;
  conservativeCredit: number;
  bestCaseCredit: number;
  lineCount: number;
}

export interface DomainSummary {
  domain: DomainId;
  grossSpend: number;
  conservativeCredit: number;
  bestCaseCredit: number;
  lineCount: number;
}

export interface TcoYear {
  year: number;
  currentCost: number;
  e7Cost: number;
  netBenefit: number;
  cumulativeNetBenefit: number;
}

/**
 * A capability the customer has no spend against today, which E7 either newly unlocks or raises
 * to a usable tier. If they wanted it, they would have to buy it — so switching it on avoids a
 * cost rather than removing one. Priced at the catalog benchmark, never at a customer figure,
 * because by definition there is no customer figure.
 */
export interface AvoidedCost {
  category: Category;
  coverage: Coverage;
  /** Catalog benchmark, per user per month, for the third-party products in this category. */
  benchmarkPupm: number;
  /** Share of the workforce that would realistically hold a seat, 0–1. */
  adoptionPct: number;
  /** seats × adoptionPct, rounded. What you'd actually have had to buy. */
  licensedSeats: number;
  /** benchmarkPupm × licensedSeats × 12. */
  avoidedAnnual: number;
  /** True when the customer has chosen to count this. Only selected rows total up. */
  selected: boolean;
}

export interface EngineResult {
  seats: number;
  // ---- current state
  baselineAnnual: number;
  addOnAnnualTotal: number;
  addOnAnnualAbsorbed: number;
  addOnAnnualRetained: number;
  thirdPartyAnnual: number;
  currentAnnualTotal: number;

  // ---- target state
  e7NetPupm: number;
  e7Annual: number;
  /** e7Annual - baselineAnnual. The gross cost of the move before any consolidation. */
  uplift: number;

  // ---- consolidation
  scoredLines: ScoredLine[];
  scoredAddOns: ScoredAddOn[];
  buckets: BucketSummary[];
  domains: DomainSummary[];
  thirdPartyCreditConservative: number;
  thirdPartyCreditBest: number;
  totalSavingsConservative: number;
  totalSavingsBest: number;

  // ---- headline
  netAnnualConservative: number;
  netAnnualBest: number;
  /** What E7 really costs per user per month once redundant spend is cancelled. */
  effectiveNetPupmConservative: number;
  effectiveNetPupmBest: number;
  migrationTotal: number;
  paybackMonths: number | null;
  tco: TcoYear[];
  tcoNetBenefit: number;

  // ---- cost avoidance (value gained, NOT cash saved — never added to netAnnual*)
  avoidedCosts: AvoidedCost[];
  /** Benchmark value of the selected capabilities only. */
  avoidedAnnualSelected: number;
  /** Benchmark value if every candidate capability were switched on. */
  avoidedAnnualAll: number;
}

/** One study benefit line, scaled to this customer. */
export interface TeiScoredLine {
  studyId: TeiStudyId;
  lineId: string;
  line: TeiBenefitLine;
  /** True when this line is contributing to the totals. */
  included: boolean;
  /** Why it is switched off, when it is off by default. */
  suppressedReason?: string;
  /** Forrester's published figure divided by the population that earned it, for year one. */
  perSeatYear1: number;
  /** Seats this line was applied to — reduced by Copilot adoption on Copilot lines. */
  appliedSeats: number;
  /** Value per year, after adoption and the confidence haircut. */
  byYear: number[];
  /** Undiscounted total across the horizon. */
  total: number;
  /** Discounted at 10% a year, matching Forrester. */
  presentValue: number;
}

export interface TeiStudySummary {
  studyId: TeiStudyId;
  /** False when the customer's baseline already includes this study's value. */
  applies: boolean;
  /** Why it does not apply, when it does not. */
  notApplicableReason?: string;
  presentValue: number;
  includedLineCount: number;
}

export interface TeiYear {
  year: number;
  /** Simulated study value for the year, after adoption and haircut. */
  teiBenefit: number;
  /** Real consolidation savings the rest of the app already computed. */
  cashBenefit: number;
  /** Licence uplift and Copilot enablement. Migration is charged separately, at time zero. */
  cost: number;
  net: number;
  cumulativeNet: number;
}

/**
 * The experimental simulation. Deliberately a separate result object rather than fields on
 * EngineResult: nothing in here may leak into net annual impact, effective per-user price or the
 * existing TCO, and keeping it in its own shape makes that difficult to do by accident.
 */
export interface TeiResult {
  /** False when the user has not opted in. Everything below is zeroed in that case. */
  enabled: boolean;
  seats: number;
  copilotSeats: number;
  horizonYears: number;
  scoredLines: TeiScoredLine[];
  studies: TeiStudySummary[];
  years: TeiYear[];
  /** Simulated study value only, discounted. */
  teiBenefitPv: number;
  /** Real consolidation savings, discounted on the same basis. */
  cashBenefitPv: number;
  /** teiBenefitPv + cashBenefitPv. */
  totalBenefitPv: number;
  costPv: number;
  npv: number;
  /** Null when costs are zero, since ROI would be meaningless. */
  roiPct: number | null;
  paybackMonths: number | null;
  /** Cost components, surfaced so the panel can show its working. */
  upliftAnnual: number;
  migrationTotal: number;
  enablementTotal: number;
}
