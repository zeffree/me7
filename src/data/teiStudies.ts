/**
 * Forrester Total Economic Impact™ study data, for the experimental TEI simulation.
 *
 * WHY THIS EXISTS
 * ---------------
 * A move to E7 bundles three things Forrester has separately measured: Microsoft 365 E5,
 * Microsoft 365 Copilot and the Microsoft Entra Suite. This file holds those studies' published
 * benefit lines so the app can extrapolate them to a customer's seat count.
 *
 * THE RULE THAT KEEPS THIS HONEST
 * -------------------------------
 * Benefit lines store reported annual figures (`published`) alongside the app's chosen
 * normalization population (`divisor`). Source review status is explicit for every line.
 * The per-seat rate is derived at runtime, which means the UI can
 * show its own arithmetic — "$1,755,000 ÷ 10,000 seats = $175.50/seat/yr" — and a reviewer can
 * check any number against the study without leaving the page. Storing rounded rates instead
 * would have made the derivation unverifiable, which is the one thing this feature cannot afford.
 *
 * WHAT FORRESTER DID NOT DO
 * -------------------------
 * These source studies do not evaluate Microsoft 365 E7 or this customer. Forrester has not
 * reviewed or endorsed the arithmetic in this app. Re-scaling a composite organisation onto a
 * different organisation is an extrapolation, and the UI labels it as experimental for that
 * reason. The E5 PDF tables have NOT been independently verified in this audit. Other original
 * study figures were spot-checked; source verification does not validate customer extrapolation.
 */

import type { BaselineSkuId } from './skus';
import { getSource } from './sources';
import type { EvidenceStatus } from './sources';

/** What a benefit line measures. Drives grouping, and which lines ship switched on. */
export type TeiBenefitKind = 'productivity' | 'it-efficiency' | 'risk' | 'cost';

export interface TeiBenefitLine {
  id: string;
  /** Forrester's reference letter for the line, e.g. 'Htr'. Lets a reader find it in the study. */
  ref: string;
  /** Stored study line label; use source status before treating it as independently checked. */
  name: string;
  /** Risk-adjusted value Forrester published for study years 1, 2 and 3. */
  published: [number, number, number];
  /** App normalization population, not necessarily the study's licensed user population. */
  divisor: [number, number, number];
  kind: TeiBenefitKind;
  /** Plain-language description of what drives the number. */
  detail: string;
  /** Downward risk adjustment Forrester applied to this line, as a percentage. */
  riskAdjustmentPct?: number;
  /**
   * Set when the line measures something this app already counts from the customer's own spend.
   * These ship switched OFF: the app credits real vendor invoices the customer typed in, and
   * adding Forrester's estimate of the same saving on top would count it twice.
   */
  doubleCounts?: string;
  /** Set when a line ships off for a reason other than double counting. */
  caution?: string;
  sourceIds?: string[];
  evidenceStatus?: EvidenceStatus;
  /** Conservative cross-study review group; not proof that every grouped benefit duplicates. */
  overlapGroup?: string;
}

export interface TeiExcludedLine {
  name: string;
  publishedPv: number;
  reason: string;
}

export interface TeiPublishedCostLine {
  ref: string;
  name: string;
  initial: number;
  published: [number, number, number];
  publishedPv: number;
  treatment: 'reference-only' | 'training-normalization';
  reviewCondition: string;
}

export interface TeiStudy {
  id: TeiStudyId;
  title: string;
  /** Month and year printed on the cover. */
  published: string;
  url: string;
  /** One-line description of the composite organisation. */
  composite: string;
  /** What the composite ran before, which is what makes the benefit incremental. */
  priorState: string;
  /** Why the divisor is what it is. Shown in the derivation disclosure. */
  divisorNote: string;
  researchBase: string;
  /** Published headline figures, kept for the tests and for citation in the UI. */
  publishedBenefitsPv: number;
  publishedCostsPv: number;
  publishedNpv: number;
  publishedRoiPct: number;
  publishedPayback: string;
  /**
   * Conservative baseline eligibility filter, not proof the customer has realized a benefit.
   * Existing purchased add-ons and deployed capabilities still need an incremental-value review.
   */
  appliesTo: BaselineSkuId[];
  /** True when the benefit only accrues to seats that actively adopt Copilot. */
  adoptionScaled?: boolean;
  lines: TeiBenefitLine[];
  /** Lines present in the study but deliberately not modelled at all. */
  excluded?: TeiExcludedLine[];
  sourceIds?: string[];
  evidenceStatus?: EvidenceStatus;
  normalizationNote?: string;
  omittedCostNote?: string;
  publishedCostLines?: TeiPublishedCostLine[];
}

export type TeiStudyId = 'm365e5' | 'copilot' | 'entra-suite';

/** Forrester discounts every one of these studies at 10% a year. We match it. */
export const TEI_DISCOUNT_RATE = 0.1;

/**
 * The Microsoft 365 E5 study.
 *
 * Composite: 40,000 employees, of which 10,000 hold E5 licences and 30,000 remain on M365 E3.
 * The stored model uses 10,000 as its divisor. The source table population was not independently
 * extracted in this audit, so this normalization remains unverified.
 *
 * Stored figures reconcile arithmetically ($45,078,548 NPV + $23,764,389 costs PV).
 * That does not establish the previously asserted executive-summary/table discrepancy.
 */
const M365E5_STUDY: TeiStudy = {
  id: 'm365e5',
  title: 'The Total Economic Impact™ Of Microsoft 365 E5',
  published: 'August 2023',
  url: getSource('tei-e5-2023')!.url!,
  sourceIds: ['tei-e5-2023'],
  evidenceStatus: 'unverified',
  normalizationNote: 'Unverified app assumption: divide stored annual figures by 10,000 E5 seats. Independently check the original population and line drivers before use.',
  omittedCostNote: 'The simulation does not reproduce all published implementation, administration and licensing costs. No customer migration field automatically resolves this omission; review costs explicitly.',
  composite: 'Stored, unverified source description: US-based global operations, 40,000 employees, 10,000 licensed for E5.',
  priorState:
    'Users held Microsoft 365 E3 licences plus a mix of on-premises and SaaS calling and security tools, third-party chat, video and conferencing, and separate threat-hunting products.',
  divisorNote:
    'The app divides by 10,000 E5 seats rather than 40,000 employees. This divisor, the stored annual values and the source population were not independently verified in this audit; do not interpret the result as a published per-seat forecast.',
  researchBase: '14 interviewees and 920 survey respondents',
  publishedBenefitsPv: 68_842_937,
  publishedCostsPv: 23_764_389,
  publishedNpv: 45_078_548,
  publishedRoiPct: 190,
  publishedPayback: 'under 6 months',
  // Do not claim E5 entitlement value again as an E7 upgrade.
  appliesTo: ['o365e3', 'm365e3'],
  lines: [
    {
      id: 'e5-productivity',
      ref: 'Htr',
      name: 'End-user productivity improvements',
      published: [9_308_520, 9_626_561, 9_953_600],
      divisor: [10_000, 10_000, 10_000],
      kind: 'productivity',
      riskAdjustmentPct: 15,
      detail:
        'Time returned to staff by consolidated collaboration, search and self-service, net of the share Forrester assumes is not converted into productive work.',
    },
    {
      id: 'e5-security-management',
      ref: 'Btr',
      name: 'Improved security management',
      published: [1_755_000, 1_755_000, 1_755_000],
      divisor: [10_000, 10_000, 10_000],
      kind: 'it-efficiency',
      riskAdjustmentPct: 10,
      detail:
        'Security team effort saved by running one integrated stack instead of stitching together separate detection and response products.',
    },
    {
      id: 'e5-endpoint',
      ref: 'Dtr',
      name: 'Endpoint deployment and management time savings',
      published: [1_678_758, 1_678_758, 1_678_758],
      divisor: [10_000, 10_000, 10_000],
      kind: 'it-efficiency',
      riskAdjustmentPct: 10,
      detail:
        'Faster provisioning and lower ongoing device management effort through Intune and Autopilot.',
    },
    {
      id: 'e5-compliance',
      ref: 'Ftr',
      name: 'Improved regulatory audit and compliance management',
      published: [1_170_000, 1_170_000, 1_170_000],
      divisor: [10_000, 10_000, 10_000],
      kind: 'risk',
      riskAdjustmentPct: 10,
      detail:
        'Audit preparation, eDiscovery and compliance reporting effort saved by integrated Purview tooling.',
    },
    {
      id: 'e5-breach-risk',
      ref: 'Atr',
      name: 'Reduced risk of a data breach',
      published: [999_405, 999_405, 999_405],
      divisor: [10_000, 10_000, 10_000],
      kind: 'risk',
      riskAdjustmentPct: 10,
      detail:
        'Expected-value reduction in breach cost from lower likelihood and smaller blast radius.',
    },
    {
      id: 'e5-helpdesk',
      ref: 'Etr',
      name: 'IT administration and help desk',
      published: [655_500, 655_500, 655_500],
      divisor: [10_000, 10_000, 10_000],
      kind: 'it-efficiency',
      riskAdjustmentPct: 5,
      detail:
        'Fewer and shorter support calls, modelled on six help desk calls per user per year.',
    },
    {
      id: 'e5-legacy-software',
      ref: 'Ctr',
      name: 'Legacy software and infrastructure cost savings',
      published: [9_315_000, 9_315_000, 9_315_000],
      divisor: [10_000, 10_000, 10_000],
      kind: 'cost',
      riskAdjustmentPct: 10,
      detail:
        'Retired third-party collaboration, telephony, security and analytics licensing plus on-premises hardware — $86.25 per user per month in the study.',
      doubleCounts:
        'Potential overlap with entered invoice retirements. Keep this study estimate excluded unless its scope is demonstrably distinct and explicitly allocated; customer invoices may be incomplete or unconfirmed.',
    },
    {
      id: 'e5-travel',
      ref: 'Gtr',
      name: 'Reduced travel and expense',
      published: [2_500_000, 2_500_000, 2_500_000],
      divisor: [10_000, 10_000, 10_000],
      kind: 'cost',
      riskAdjustmentPct: 20,
      detail:
        'Stored travel-benefit estimate. Its source budget, reduction and attribution factors were not independently verified in this audit.',
      caution:
        'Unverified source drivers and a composite-specific travel assumption. Exclude unless the original table and the customer travel budget support an explicit scenario.',
    },
  ],
};

/**
 * The Microsoft 365 Copilot study.
 *
 * Licensing ramps 3,000 → 6,000 → 10,000 seats across the three years, so the divisor ramps with
 * it. That matters: the operations benefit is flat at $1,237.36 per licensed seat per year once
 * you divide correctly, while the people-and-culture benefit genuinely ramps as onboarding and
 * attrition effects mature. Dividing the three-year PV by a single seat number would have blurred
 * those two very different shapes into one misleading average.
 *
 * The operations line reconciles exactly to the study's own drivers: 9 hours saved per user per
 * month x $38 fully burdened hourly rate x 50% productivity recapture, applied to the 67% of
 * licensed seats outside sales, marketing and customer service (Forrester excludes those to avoid
 * double-counting them in the go-to-market benefit), then risk-adjusted down 10%.
 */
const COPILOT_STUDY: TeiStudy = {
  id: 'copilot',
  title: 'The Total Economic Impact™ Of Microsoft 365 Copilot',
  published: 'March 2025',
  url: getSource('tei-copilot-2025')!.url!,
  sourceIds: ['tei-copilot-2025'],
  evidenceStatus: 'conditional',
  normalizationNote: 'App extrapolation: annual composite values divided by 3,000 / 6,000 / 10,000 licensed seats, then scaled to customer adoption. The composite role mix, wages and benefit realization do not automatically apply.',
  omittedCostNote: 'Training is modeled separately. Other published implementation, change-management, administration and licensing costs are not all reproduced; explicitly reconcile them with customer costs.',
  composite:
    'US-headquartered global company, 25,000 employees. Copilot rolled out to 3,000 seats in year one, 6,000 in year two and 10,000 by year three.',
  priorState:
    'No generative AI assistant integrated with the productivity estate; knowledge work done unaided across Teams, Outlook, Word, Excel and PowerPoint.',
  divisorNote:
    'App normalization divides by the study’s 3,000, 6,000 and 10,000 licensed seats. This is a derived rate, not a Forrester customer forecast; the study role mix and organizational drivers must be reviewed.',
  researchBase: '16 decision-makers across 12 organisations and 367 survey respondents',
  publishedBenefitsPv: 36_771_858,
  publishedCostsPv: 17_060_832,
  publishedNpv: 19_711_026,
  publishedRoiPct: 116,
  publishedPayback: '10 months',
  appliesTo: ['o365e3', 'm365e3', 'm365e5'],
  adoptionScaled: true,
  publishedCostLines: [
    {
      ref: 'Dtr', name: 'Microsoft 365 Copilot licenses', initial: 0,
      published: [1_134_000, 2_268_000, 3_780_000], publishedPv: 5_745_259,
      treatment: 'reference-only',
      reviewCondition: 'Customer licence costs are modeled separately; do not add the composite licence bill to E7 costs.',
    },
    {
      ref: 'Etr', name: 'Implementation and management costs', initial: 1_870_000,
      published: [1_017_500, 1_017_500, 1_017_500], publishedPv: 4_400_372,
      treatment: 'reference-only',
      reviewCondition: 'Omitted from automatic extrapolation. Explicitly review implementation and ongoing management costs; a migration field does not prove overlap.',
    },
    {
      ref: 'Ftr', name: 'Training and employee discovery', initial: 0,
      published: [1_915_200, 2_633_400, 3_990_000], publishedPv: 6_915_201,
      treatment: 'training-normalization',
      reviewCondition: 'Only this cost line is normalized into the optional training model. Validate customer population, wages and training effort.',
    },
  ],
  lines: [
    {
      id: 'copilot-operations',
      ref: 'Btr',
      name: 'Business transformation: Operations',
      published: [3_712_068, 7_424_136, 12_373_560],
      divisor: [3_000, 6_000, 10_000],
      kind: 'productivity',
      riskAdjustmentPct: 10,
      detail:
        '9 hours saved per user per month at a $38 fully burdened hourly rate, of which Forrester assumes half is recaptured as productive work, applied to the 67% of licensed users outside sales, marketing and customer service.',
    },
    {
      id: 'copilot-people',
      ref: 'Ctr',
      name: 'Business transformation: People and culture',
      published: [162_792, 1_027_931, 2_883_795],
      divisor: [3_000, 6_000, 10_000],
      kind: 'productivity',
      riskAdjustmentPct: 15,
      detail:
        'Faster onboarding — 45 days cut by 15%, then 20%, then 25% — plus reduced attrition as the deployment matures. Ramps hard, so year one is deliberately small.',
    },
  ],
  excluded: [
    {
      name: 'Business transformation: Go to market',
      publishedPv: 14_801_002,
      reason:
        'Worth $14.8M of the study’s $36.8M, but it is revenue arithmetic — incremental win rate and retention applied to a $6.25B revenue base — not a per-seat effect. Re-scaling it by headcount would silently assume this customer earns the same $250,000 of revenue per employee as the composite. Left out entirely rather than guessed at.',
    },
  ],
};

/**
 * The Microsoft Entra Suite study.
 *
 * The composite already held M365 E5 with Entra ID P2 and bought the Suite on top.
 * That prior state is not proof the benefits are incremental for every customer.
 *
 * The divisor is the 85,000 total users, not the 24,000 licensed Suite users. Forrester models
 * benefit volumes at org-wide scale — 80,000 password reset tickets a year, 25,000 access
 * management tasks — while only licensing a subset. Choosing 85,000 is an app normalization,
 * not a source-certified per-seat rate or a validated conservative forecast.
 *
 * Not to be confused with "The Total Economic Impact™ Of Microsoft Entra" (2023, 240% ROI), which
 * covered Azure AD, Permissions Management and Verified ID, and predates the Entra Suite SKU.
 */
const ENTRA_SUITE_STUDY: TeiStudy = {
  id: 'entra-suite',
  title: 'The Total Economic Impact™ Of Microsoft Entra Suite',
  published: 'July 2025',
  url: getSource('tei-entra-2025')!.url!,
  sourceIds: ['tei-entra-2025'],
  evidenceStatus: 'conditional',
  normalizationNote: 'App extrapolation: divides benefits by 85,000 total users although the study licensed 24,000 Suite users. The source summary calls these 85,000 employees, while its composite section says 50,000 employees and 85,000 total users. Customer population and workloads need explicit review.',
  omittedCostNote: 'Published licensing, implementation and administration costs are not all reproduced. Check incremental costs and existing Entra Suite ownership before aggregation.',
  composite:
    'Global enterprise in regulated industries, $28B revenue. 85,000 total users across a 50,000-employee hybrid workforce, with 24,000 licensed for the Entra Suite.',
  priorState:
    'Already licensed for M365 E5 including Entra ID P2, and buying the Entra Suite on top. Ran three to five overlapping IAM, VPN and security products, traditional VPN for 20,000 users, and five full-time IAM engineers.',
  divisorNote:
    'The app chooses 85,000 total users as the divisor, not the 24,000 Suite licensees. Organizational workload volumes do not automatically scale with paid seats; this normalization is an app assumption rather than a published per-user forecast.',
  researchBase: '10 decision-makers interviewed and 119 survey respondents',
  publishedBenefitsPv: 14_449_655,
  publishedCostsPv: 6_249_816,
  publishedNpv: 8_199_839,
  publishedRoiPct: 131,
  publishedPayback: 'under 6 months',
  appliesTo: ['o365e3', 'm365e3', 'm365e5'],
  publishedCostLines: [
    {
      ref: 'Itr', name: 'Initial deployment cost', initial: 30_000,
      published: [0, 0, 0], publishedPv: 30_000,
      treatment: 'reference-only',
      reviewCondition: 'Not automatically modeled. Confirm customer implementation cost instead of assuming it duplicates another cost field.',
    },
    {
      ref: 'Jtr', name: 'Microsoft Entra Suite license fees', initial: 0,
      published: [2_491_200, 2_491_200, 2_491_200], publishedPv: 6_195_246,
      treatment: 'reference-only',
      reviewCondition: 'Customer E7 licences are modeled separately; do not add the composite bill or assume all users already need Suite licences.',
    },
    {
      ref: 'Ktr', name: 'Ongoing management effort', initial: 0,
      published: [9_880, 9_880, 9_880], publishedPv: 24_570,
      treatment: 'reference-only',
      reviewCondition: 'Not automatically modeled. Review the customer ongoing administration workload and cost.',
    },
  ],
  lines: [
    {
      id: 'entra-access-management',
      ref: 'Etr',
      name: 'IT time savings with faster ongoing user access management',
      published: [1_845_000, 1_845_000, 1_845_000],
      divisor: [85_000, 85_000, 85_000],
      kind: 'it-efficiency',
      detail:
        'Roughly 25,000 role and responsibility changes a year, each taking about 90 minutes, cut by 80% through automated lifecycle workflows.',
    },
    {
      id: 'entra-onboarding',
      ref: 'Dtr',
      name: 'IT time savings with faster user onboarding',
      published: [1_101_600, 1_101_600, 1_101_600],
      divisor: [85_000, 85_000, 85_000],
      kind: 'it-efficiency',
      detail: 'Onboarding effort of about 120 minutes per new hire, cut by 75%.',
    },
    {
      id: 'entra-password-tickets',
      ref: 'Ftr',
      name: 'Avoided cost from reduced password-related help desk tickets',
      published: [1_026_000, 1_026_000, 1_026_000],
      divisor: [85_000, 85_000, 85_000],
      kind: 'it-efficiency',
      riskAdjustmentPct: 5,
      detail:
        'Password reset tickets down 90%, from 80,000 to 8,000 a year, at $15 per avoided ticket.',
    },
    {
      id: 'entra-iam-engineers',
      ref: 'Ctr',
      name: 'Reduced IAM engineers’ effort managing tools',
      published: [589_000, 589_000, 589_000],
      divisor: [85_000, 85_000, 85_000],
      kind: 'it-efficiency',
      detail:
        'Five full-time IAM engineers spending 80% less time maintaining overlapping identity and access products.',
    },
    {
      id: 'entra-compliance',
      ref: 'Htr',
      name: 'Compliance and audit savings',
      published: [285_000, 285_000, 285_000],
      divisor: [85_000, 85_000, 85_000],
      kind: 'risk',
      riskAdjustmentPct: 5,
      detail: 'A 15% reduction against $2M a year of compliance and audit spend.',
    },
    {
      id: 'entra-security-posture',
      ref: 'Btr',
      name: 'Improved security posture',
      published: [215_220, 215_220, 215_220],
      divisor: [85_000, 85_000, 85_000],
      kind: 'risk',
      riskAdjustmentPct: 15,
      detail:
        'A 30% cut in identity risk exposure against an $844,000 annual baseline, from standardised Conditional Access and built-in identity protection.',
    },
    {
      id: 'entra-vendor-consolidation',
      ref: 'Atr',
      name: 'Cost savings from vendor consolidation',
      published: [475_000, 475_000, 475_000],
      divisor: [85_000, 85_000, 85_000],
      kind: 'cost',
      riskAdjustmentPct: 5,
      detail: 'Around $500,000 a year of redundant identity and security licensing retired.',
      doubleCounts:
        'Potential overlap with identity/security invoices and other study consolidation benefits. Exclude unless the customer identifies a distinct, explicitly allocated scope.',
    },
    {
      id: 'entra-vpn',
      ref: 'Gtr',
      name: 'Savings from VPN license reduction',
      published: [273_600, 273_600, 273_600],
      divisor: [85_000, 85_000, 85_000],
      kind: 'cost',
      riskAdjustmentPct: 5,
      detail: '60% of 20,000 VPN licences at $24 per user per year retired in favour of Entra Private Access.',
      doubleCounts:
        'If you entered a VPN or ZTNA vendor in the catalog, this app already credits it at your price. This line is the same saving, estimated.',
    },
  ],
};

export const TEI_OVERLAP_GROUPS: Record<string, string> = {
  'e5-productivity': 'employee-time',
  'copilot-operations': 'employee-time',
  'copilot-people': 'employee-time',
  'e5-security-management': 'it-administration',
  'e5-endpoint': 'it-administration',
  'e5-helpdesk': 'it-administration',
  'entra-access-management': 'it-administration',
  'entra-onboarding': 'it-administration',
  'entra-password-tickets': 'it-administration',
  'entra-iam-engineers': 'it-administration',
  'e5-compliance': 'compliance-effort',
  'entra-compliance': 'compliance-effort',
  'e5-breach-risk': 'security-risk',
  'entra-security-posture': 'security-risk',
  'e5-legacy-software': 'invoice-retirement',
  'entra-vendor-consolidation': 'invoice-retirement',
  'entra-vpn': 'invoice-retirement',
  'e5-travel': 'travel',
};

export const TEI_STUDIES: TeiStudy[] = [M365E5_STUDY, COPILOT_STUDY, ENTRA_SUITE_STUDY].map((study) => ({
  ...study,
  lines: study.lines.map((line) => ({
    ...line,
    sourceIds: study.sourceIds,
    evidenceStatus: study.evidenceStatus,
    overlapGroup: TEI_OVERLAP_GROUPS[line.id],
    caution: line.caution ?? (study.evidenceStatus === 'unverified' ? 'Original source values and normalization remain unverified. Explicitly review and select this experimental assumption before use.' : undefined),
  })),
}));

/**
 * Copilot enablement cost, taken from the study's own training line rather than invented:
 * $1,915,200 / 3,000 seats in year one, $2,633,400 / 6,000 in year two, $3,990,000 / 10,000 in
 * year three. Underneath it is 10 hours of formal training per new user plus 6 hours a year of
 * ongoing discovery at the same $38 fully burdened rate, risk-adjusted up 5%.
 *
 * This is switched on by default. Claiming Copilot's productivity benefit while hiding the cost
 * of getting people to use it is the fastest way to lose a finance audience.
 */
export const COPILOT_ENABLEMENT_SOURCE = {
  sourceIds: ['tei-copilot-2025'],
  published: [1_915_200, 2_633_400, 3_990_000] as [number, number, number],
  divisor: [3_000, 6_000, 10_000] as [number, number, number],
  evidenceStatus: 'conditional' as EvidenceStatus,
  conditions: 'Training cost only, normalized by the app. Other implementation/administration costs need separate review; retaining this cost does not prove the model includes all enablement costs.',
};
export const COPILOT_ENABLEMENT_PER_SEAT = COPILOT_ENABLEMENT_SOURCE.published.map(
  (amount, index) => amount / COPILOT_ENABLEMENT_SOURCE.divisor[index],
) as [number, number, number];

/** Unverified source data, potential cash overlap and cautioned lines are excluded by default. */
export function isLineOnByDefault(line: TeiBenefitLine): boolean {
  return line.evidenceStatus !== 'unverified' && !line.doubleCounts && !line.caution;
}

/** The per-seat, per-year rate a line implies. The whole model rests on this one division. */
export function perSeatRate(line: TeiBenefitLine, yearIndex: number): number {
  // Study years run 1-3. Anything past the study horizon holds at the year-three rate rather
  // than extrapolating a trend Forrester never measured.
  const i = Math.min(Math.max(yearIndex, 0), 2);
  const divisor = line.divisor[i];
  if (!divisor) return 0;
  return line.published[i] / divisor;
}

export function getStudy(id: TeiStudyId): TeiStudy | undefined {
  return TEI_STUDIES.find((s) => s.id === id);
}

export function getTeiLine(id: string): { study: TeiStudy; line: TeiBenefitLine } | undefined {
  for (const study of TEI_STUDIES) {
    const line = study.lines.find((l) => l.id === id);
    if (line) return { study, line };
  }
  return undefined;
}

/** Baseline-eligible studies; existing add-ons and benefit realization still require review. */
export function studiesForBaseline(baseline: BaselineSkuId): TeiStudy[] {
  return TEI_STUDIES.filter((s) => s.appliesTo.includes(baseline));
}
