import type { BaselineSkuId } from '@/data/skus';
import type { Category, Confidence, Coverage, DomainId } from '@/data/categories';
import type { StandaloneLicence } from '@/data/standaloneLicences';
import type { TeiBenefitLine, TeiStudyId } from '@/data/teiStudies';

/** How a spend figure was entered. */
export type SpendMode = 'pupm' | 'annual';
export type AmountSource = 'customer' | 'benchmark' | 'legacy';
export type PriceSource = 'customer' | 'reference' | 'legacy';

export interface LineAssumptions {
  /** Whole months without retirement savings; zero starts savings in month one. */
  savingsDelayMonths?: number;
  amountSource?: AmountSource;
  /** @deprecated Audit-only legacy confirmation; never gates retirement or proves entitlement. */
  assumptionConfirmed?: boolean;
}

/** A third-party product the customer pays for today. */
export interface SpendLine extends LineAssumptions {
  categoryId: string;
  vendor: string;
  /** Seats for this product. Falls back to the org-wide seat count when unset. */
  seats?: number;
  mode: SpendMode;
  /** Assessment currency per user per month, when mode is 'pupm'. */
  pupm?: number;
  /** Assessment currency annual total, when mode is 'annual'. */
  annual?: number;
  /** ISO date. Purely informational today, but surfaced so renewal timing is visible. */
  contractEnd?: string;
  /** @deprecated Audit-only legacy retained percentage; covered USD invoices assume full replacement. */
  retainPct: number;
}

/** A Microsoft add-on SKU the customer pays for today. */
export interface AddOnLine extends LineAssumptions {
  addOnId: string;
  seats?: number;
  mode: SpendMode;
  pupm?: number;
  annual?: number;
  /** @deprecated Audit-only legacy retained percentage; absorbed USD add-ons assume full replacement. */
  retainPct?: number;
}

export interface Assumptions {
  transitionEnabled?: boolean;
  transitionCost?: number;
  baselinePriceSource?: PriceSource;
  e7PriceSource?: PriceSource;
  /** @deprecated Audit-only legacy confirmation; never gates a usable USD cash estimate. */
  pricesConfirmed?: boolean;
  /** E7 comparison unit price in assessment currency; references retain USD provenance. */
  e7ListPupm: number;
  /** Negotiated discount off E7 list, as a percentage. */
  e7DiscountPct: number;
  /** What the customer actually pays today for their baseline suite, per user per month. */
  baselineUnitPupm: number;
  horizonYears: number;
  /** @deprecated Retained for v1 reading; not applied. Use transitionCost. */
  migrationCostPerSeat: number;
  /** @deprecated Not applied. Use explicit savingsDelayMonths on individual invoices. */
  year1RealizationPct: number;
  /** @deprecated Neutral legacy fields; invoice credit is never confidence-discounted. */
  conservative: Record<Confidence, number>;
  /** @deprecated Neutral legacy fields; aliases produce the same credited retirement. */
  bestCase: Record<Confidence, number>;
}

/**
 * Settings for the experimental TEI simulation. Kept off by default: the cash model uses the
 * assessment's explicit invoice and price inputs, whereas this re-scales somebody else's
 * composite organisation onto them. That is a weaker claim and the UI treats it as one.
 */
export interface TeiSettings {
  combinedReviewed?: boolean;
  /** Explicit review of the exact published training cost omitted from a combination. */
  enablementOverlapReviewed?: boolean;
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
  schemaVersion?: 2;
  reviewWarnings?: string[];
  addOnsReviewed?: boolean;
  isDemo?: boolean;
  orgName: string;
  seats: number;
  currency: string;
  baseline: BaselineSkuId;
  assumptions: Assumptions;
  lines: SpendLine[];
  addOns: AddOnLine[];
  /** Gap capabilities the customer plans to deploy; valued at standalone Microsoft licence prices. */
  plannedCapabilities?: string[];
  /** Customer edits to the capability cost-avoidance view. Absent means all defaults. */
  costAvoidance?: CostAvoidanceSettings;
  tei: TeiSettings;
}

/**
 * Edits to the capability cost-avoidance view: users per capability (default all seats) and USD
 * unit prices per standalone licence (default list less the E7 discount).
 */
export interface CostAvoidanceSettings {
  users: Record<string, number>;
  unitPrices: Record<string, number>;
}

/**
 * Which story a line tells.
 *  already-redundant — the customer's CURRENT suite already covers this; they pay twice today
 *  unlocked-by-e7    — moving to E7 newly covers it
 *  partial-upgrade   — they have a lesser tier today and E7 raises it; full replacement assumed
 *  not-covered       — E7 does not cover this at all; zero credit
 */
export type Bucket = 'already-redundant' | 'unlocked-by-e7' | 'partial-upgrade' | 'not-covered';

export interface ScoredLine {
  eligible: boolean;
  /** @deprecated Always false. Eligibility models a scenario, not customer verification. */
  requiresConfirmation: boolean;
  exclusionReason?: string;
  annualCredit: number;
  line: SpendLine;
  category: Category;
  coverage: Coverage;
  bucket: Bucket;
  /** Descriptive evidence label only — never a multiplier on invoice credit. */
  effectiveConfidence: Confidence;
  annualSpend: number;
  conservativeCredit: number;
  bestCaseCredit: number;
}

export interface ScoredAddOn {
  line: AddOnLine;
  eligible: boolean;
  /** @deprecated Always false. Resolve duplicate/bundled entries by removing them, not confirming. */
  requiresConfirmation: boolean;
  exclusionReason?: string;
  annualCredit: number;
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

export interface CashflowMonth {
  /** Month zero contains only the optional transition investment. */
  month: number;
  currentCost: number;
  e7Cost: number;
  vendorSavings: number;
  addOnSavings: number;
  cashSavings: number;
  licenceUplift: number;
  transitionCost: number;
  netBenefit: number;
  cumulativeNetBenefit: number;
}

export type PaybackStatus =
  | 'reached'
  | 'not-reached'
  | 'no-investment'
  | 'break-even'
  | 'cost-increase';

export type LicenceOwnership = 'none' | 'partial' | 'full';

/** A third-party invoice already credited as a cash retirement for a capability this licence grants. */
export interface CashOverlap {
  categoryId: string;
  categoryName: string;
  vendor: string;
  annualCredit: number;
}

/**
 * A capability E7 includes that the customer's current suite does not, and what licensing it
 * separately from Microsoft would cost. The customer selects the capabilities they plan to deploy;
 * only those count. This is a licence counterfactual, never an invoice they stop paying.
 */
export interface AvoidedCapability {
  category: Category;
  /** The customer plans to deploy it. */
  selected: boolean;
  /** False when no standalone Microsoft licence in the catalog provides it on this baseline. */
  priced: boolean;
  defaultUsers: number;
  users: number;
  usersOverridden: boolean;
  /** Cheapest licences that would provide just this capability, bought on its own. */
  standaloneLicenceIds: string[];
  standaloneLicenceNames: string[];
  standaloneAnnual: number;
  /** Purchased Microsoft add-ons that already license it for every user. */
  ownedVia: string[];
  /** When selected, the licence in the combined set credited with it. */
  coveredByLicenceId?: string;
  /**
   * Its share of annualAvoided, counting each licence once: a licence's cost sits with the selected
   * capability that needs it for the most users, and its prerequisites follow it. Zero when not
   * selected. Summed over the capabilities this equals annualAvoided exactly.
   */
  countedAnnual: number;
  /** Not selected: what adding it to the current selection would add. Selected: countedAnnual. */
  marginalAnnual: number;
  /** A licence already counted for the selection also provides this capability. */
  includedWith?: { licenceId: string; licenceName: string; countedOn?: Category };
  /** Illustrative third-party category benchmark for the same users. Context only. */
  thirdPartyReferencePupm: number;
  thirdPartyReferenceAnnual: number;
  cashOverlap: CashOverlap[];
}

/**
 * One Microsoft licence in the cheapest set that provides every selected capability. Kept out of
 * every cash total.
 */
export interface AvoidedLicence {
  currency: 'USD';
  licence: StandaloneLicence;
  /** Selected capabilities this licence is credited with. */
  capabilities: Category[];
  /** Licences in the set that need this one as a prerequisite. */
  prerequisiteFor: StandaloneLicence[];
  listPricePupm: number;
  /** The assessment's E7 discount, applied to the list reference by default. */
  discountPct: number;
  defaultUnitPupm: number;
  unitPupm: number;
  unitPriceOverridden: boolean;
  /** Users the licence must cover: the largest user count among its capabilities. */
  quantity: number;
  /** quantity less users already licensed through a purchased Microsoft add-on. */
  paidQuantity: number;
  ownership: LicenceOwnership;
  ownedSeats: number;
  ownedAddOnNames: string[];
  /** Purchased add-on spend a suite step-up would replace, credited against it. */
  supersededCredit: number;
  supersededAddOnNames: string[];
  /** unitPupm × paidQuantity × 12. */
  grossAnnual: number;
  /** grossAnnual − supersededCredit, never below zero. */
  annual: number;
  cashOverlap: CashOverlap[];
}

export interface CostAvoidance {
  currency: 'USD';
  /** Every gap capability for the baseline, selected or not, in catalog order. */
  capabilities: AvoidedCapability[];
  /** The cheapest licence set that provides every selected, priced capability. */
  lines: AvoidedLicence[];
  selectedCount: number;
  /** Gap capabilities no standalone Microsoft licence provides on this baseline; not valued. */
  unpriced: Category[];
  /** Annual cost of the cheapest licence set. The headline cost avoided. */
  annualAvoided: number;
  /** Sum of each selected capability licensed on its own. Never less than annualAvoided. */
  standaloneSumAnnual: number;
  /** Illustrative third-party benchmark for the selected capabilities. Context only. */
  thirdPartyReferenceAnnual: number;
  /** Current suite plus the purchased Microsoft add-ons E7 absorbs. */
  currentLicenceAnnual: number;
  /** currentLicenceAnnual + annualAvoided: licence spend for the selected capabilities without E7. */
  buySeparatelyAnnual: number;
  buySeparatelyPupm: number;
  e7Annual: number;
  e7NetPupm: number;
  /** buySeparatelyAnnual − e7Annual. Positive means E7 costs less than buying separately. */
  bundleDifferenceAnnual: number;
  bundleDifferencePupm: number;
}

export interface EngineResult {
  futureAnnualTotal: number;
  recurringAnnualBenefit: number;
  totalAnnualSavings: number;
  year1NetBenefit: number;
  monthlyCashflow: CashflowMonth[];
  paybackStatus: PaybackStatus;
  warnings: string[];
  /** Usable USD cash inputs with no unknown amounts, identities or ambiguous duplicate/bundle credit. */
  cashEstimateReady: boolean;
  /** @deprecated Exact alias of cashEstimateReady; does not represent human confirmation. */
  cashEstimateConfirmed: boolean;
  referenceCurrency: 'USD';
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
  /** Offset-adjusted comparison, not the Microsoft invoice rate or a refund. */
  effectiveNetPupmConservative: number;
  effectiveNetPupmBest: number;
  migrationTotal: number;
  paybackMonths: number | null;
  tco: TcoYear[];
  tcoNetBenefit: number;

  // ---- licence cost avoidance (licence counterfactual, NOT cash saved — never added to netAnnual*)
  costAvoidance: CostAvoidance;
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
  byYear: number[];
  total: number;
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
  canCombine: boolean;
  paybackStatus: PaybackStatus | 'withheld';
  combinationWarnings: string[];
  referenceCurrency: 'USD';
  /** False when the user has not opted in; all simulated financial values are withheld. */
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
  npv: number | null;
  /** Null when costs are zero, since ROI would be meaningless. */
  roiPct: number | null;
  paybackMonths: number | null;
  /** Cost components, surfaced so the panel can show its working. */
  upliftAnnual: number;
  migrationTotal: number;
  enablementTotal: number;
}
