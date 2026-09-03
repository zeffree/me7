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
 * Nothing here is a pre-divided per-seat number. Every line stores the figure Forrester actually
 * printed (`published`, risk-adjusted, per study year) alongside the seat population that figure
 * was earned across (`divisor`). The per-seat rate is derived at runtime, which means the UI can
 * show its own arithmetic — "$1,755,000 ÷ 10,000 seats = $175.50/seat/yr" — and a reviewer can
 * check any number against the study without leaving the page. Storing rounded rates instead
 * would have made the derivation unverifiable, which is the one thing this feature cannot afford.
 *
 * WHAT FORRESTER DID NOT DO
 * -------------------------
 * Forrester has not studied Microsoft 365 E7. It has not studied this customer. It has not
 * reviewed or endorsed the arithmetic in this app. Re-scaling a composite organisation onto a
 * different organisation is an extrapolation, and the UI labels it as experimental for that
 * reason. Every figure below, however, is verified against the primary source — the Forrester TEI
 * microsites and Microsoft's own CDN copies, not press coverage.
 */

import type { BaselineSkuId } from './skus';

/** What a benefit line measures. Drives grouping, and which lines ship switched on. */
export type TeiBenefitKind = 'productivity' | 'it-efficiency' | 'risk' | 'cost';

export interface TeiBenefitLine {
  id: string;
  /** Forrester's reference letter for the line, e.g. 'Htr'. Lets a reader find it in the study. */
  ref: string;
  /** The line name exactly as printed in the study. Not paraphrased. */
  name: string;
  /** Risk-adjusted value Forrester published for study years 1, 2 and 3. */
  published: [number, number, number];
  /** Seat population each year's value was earned across. Usually flat; Copilot's ramps. */
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
}

export interface TeiExcludedLine {
  name: string;
  publishedPv: number;
  reason: string;
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
   * Baselines this study's value is still ahead of. An M365 E5 customer has already banked the
   * E5 study, so claiming it again on the way to E7 would be selling them something they own.
   */
  appliesTo: BaselineSkuId[];
  /** True when the benefit only accrues to seats that actively adopt Copilot. */
  adoptionScaled?: boolean;
  lines: TeiBenefitLine[];
  /** Lines present in the study but deliberately not modelled at all. */
  excluded?: TeiExcludedLine[];
}

export type TeiStudyId = 'm365e5' | 'copilot' | 'entra-suite';

/** Forrester discounts every one of these studies at 10% a year. We match it. */
export const TEI_DISCOUNT_RATE = 0.1;

/**
 * The Microsoft 365 E5 study.
 *
 * Composite: 40,000 employees, of which 10,000 hold E5 licences and 30,000 remain on M365 E3.
 * Every benefit and cost row in the model is driven off the 10,000 E5 population, so that is the
 * divisor — using 40,000 would understate the per-seat value by a factor of four.
 *
 * Note on the study's own arithmetic: the executive summary prints "$68.42 million" but the
 * cash-flow table prints $68,842,937, which is the figure that reconciles
 * ($45,078,548 NPV + $23,764,389 costs PV) and that the benefit lines sum to. We use the table.
 */
const M365E5_STUDY: TeiStudy = {
  id: 'm365e5',
  title: 'The Total Economic Impact™ Of Microsoft 365 E5',
  published: 'August 2023',
  url: 'https://www.microsoft.com/content/dam/microsoft/final/en-us/microsoft-brand/documents/Forrester-TEI-Of-Microsoft-365-E5.pdf',
  composite: 'US-based, global operations. 40,000 employees, 10,000 of them licensed for E5.',
  priorState:
    'Users held Microsoft 365 E3 licences plus a mix of on-premises and SaaS calling and security tools, third-party chat, video and conferencing, and separate threat-hunting products.',
  divisorNote:
    'Divided by the 10,000 E5 seats, not the 40,000 headcount. Every benefit and cost row in the study is driven off the E5 population; the 30,000 E3 users contribute to neither side of the model.',
  researchBase: '14 interviewees and 920 survey respondents',
  publishedBenefitsPv: 68_842_937,
  publishedCostsPv: 23_764_389,
  publishedNpv: 45_078_548,
  publishedRoiPct: 190,
  publishedPayback: 'under 6 months',
  // An M365 E5 customer already has this. Only the E3 tiers still have it ahead of them.
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
        'This is the same saving the rest of this app already calculates from the vendor invoices you entered. Counting Forrester’s estimate on top would count it twice.',
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
        'Half of a $25M corporate travel budget, attributed to meeting online instead of in person.',
      caution:
        'Pegged to one composite’s travel budget with a 50% attribution factor, and a product of its era — the 2020 edition of this study also claimed office-space savings, which Forrester dropped entirely in 2023. Switch it on only if you can defend the travel line for this customer.',
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
  url: 'https://tei.forrester.com/go/microsoft/M365Copilot/',
  composite:
    'US-headquartered global company, 25,000 employees. Copilot rolled out to 3,000 seats in year one, 6,000 in year two and 10,000 by year three.',
  priorState:
    'No generative AI assistant integrated with the productivity estate; knowledge work done unaided across Teams, Outlook, Word, Excel and PowerPoint.',
  divisorNote:
    'Divided by the licensed seat count in each individual year — 3,000, then 6,000, then 10,000 — rather than by a single average. Licensing is cumulative, so each year’s published value is earned across that year’s licensed population.',
  researchBase: '16 decision-makers across 12 organisations and 367 survey respondents',
  publishedBenefitsPv: 36_771_858,
  publishedCostsPv: 17_060_832,
  publishedNpv: 19_711_026,
  publishedRoiPct: 116,
  publishedPayback: '10 months',
  appliesTo: ['o365e3', 'm365e3', 'm365e5'],
  adoptionScaled: true,
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
 * This one is unusually well suited to an E7 business case: the composite already held M365 E5
 * with Entra ID P2 and bought the Suite on top, so its benefits are genuinely incremental to an
 * E5 customer rather than a re-run of value they already own.
 *
 * The divisor is the 85,000 total users, not the 24,000 licensed Suite users. Forrester models
 * benefit volumes at org-wide scale — 80,000 password reset tickets a year, 25,000 access
 * management tasks — while only licensing a subset. Dividing by 24,000 would inflate the per-seat
 * rate roughly 3.5x on the back of that mismatch, so we take the conservative reading.
 *
 * Not to be confused with "The Total Economic Impact™ Of Microsoft Entra" (2023, 240% ROI), which
 * covered Azure AD, Permissions Management and Verified ID, and predates the Entra Suite SKU.
 */
const ENTRA_SUITE_STUDY: TeiStudy = {
  id: 'entra-suite',
  title: 'The Total Economic Impact™ Of Microsoft Entra Suite',
  published: 'July 2025',
  url: 'https://tei.forrester.com/go/Microsoft/EntraSuite/',
  composite:
    'Global enterprise in regulated industries, $28B revenue. 85,000 total users across a 50,000-employee hybrid workforce, with 24,000 licensed for the Entra Suite.',
  priorState:
    'Already licensed for M365 E5 including Entra ID P2, and buying the Entra Suite on top. Ran three to five overlapping IAM, VPN and security products, traditional VPN for 20,000 users, and five full-time IAM engineers.',
  divisorNote:
    'Divided by the 85,000 total users rather than the 24,000 licensed Suite users. The study derives its benefit volumes at org-wide scale — 80,000 password tickets a year, 25,000 access management tasks — while licensing only a subset, so dividing by 24,000 would inflate the per-seat rate on the back of that mismatch.',
  researchBase: '10 decision-makers interviewed and 119 survey respondents',
  publishedBenefitsPv: 14_449_655,
  publishedCostsPv: 6_249_816,
  publishedNpv: 8_199_839,
  publishedRoiPct: 131,
  publishedPayback: 'under 6 months',
  appliesTo: ['o365e3', 'm365e3', 'm365e5'],
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
        'The identity and security products you listed are already credited in this app at the prices you entered. This line is Forrester’s estimate of the same thing.',
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

export const TEI_STUDIES: TeiStudy[] = [M365E5_STUDY, COPILOT_STUDY, ENTRA_SUITE_STUDY];

/**
 * Copilot enablement cost, taken from the study's own training line rather than invented:
 * $1,915,200 / 3,000 seats in year one, $2,633,400 / 6,000 in year two, $3,990,000 / 10,000 in
 * year three. Underneath it is 10 hours of formal training per new user plus 6 hours a year of
 * ongoing discovery at the same $38 fully burdened rate, risk-adjusted up 5%.
 *
 * This is switched on by default. Claiming Copilot's productivity benefit while hiding the cost
 * of getting people to use it is the fastest way to lose a finance audience.
 */
export const COPILOT_ENABLEMENT_PER_SEAT: [number, number, number] = [638.4, 438.9, 399];

/** Only lines that would double-count, or carry an explicit caution, ship switched off. */
export function isLineOnByDefault(line: TeiBenefitLine): boolean {
  return !line.doubleCounts && !line.caution;
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

/** Studies whose value is still ahead of a customer on this baseline. */
export function studiesForBaseline(baseline: BaselineSkuId): TeiStudy[] {
  return TEI_STUDIES.filter((s) => s.appliesTo.includes(baseline));
}
