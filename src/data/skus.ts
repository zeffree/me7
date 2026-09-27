/**
 * Baseline suite definitions and Microsoft 365 E7 reference data.
 *
 * Prices are editable USD reference inputs, not a customer quote or regional price list.
 * Check source scope, purchased variant and renewal terms before using a reference price.
 *
 * IMPORTANT — the July 2026 packaging update is reflected here.
 * Pricing effective 1 July 2026 (feature rollout CY26 Q3, stated complete 1 August 2026)
 * Microsoft both raised prices and moved capability *down* into the baseline suites:
 *   O365 E3 + M365 E3  gained Defender for Office 365 Plan 1
 *   M365 E3            gained Intune Plan 2, Remote Help and Advanced Analytics
 *   M365 E5            additionally gained Intune Endpoint Privilege Management,
 *                      Enterprise Application Management and Cloud PKI
 * Security Copilot follows its own inclusion rollout; check current tenant enablement.
 * All three tiers also gained Copilot Chat enhancements (inbox and calendar awareness, plus
 * Word/Excel/PowerPoint agents) and Copilot Chat Analytics — useful context, but well short
 * of full Microsoft 365 Copilot, so it does not reduce the Copilot line in the model.
 * This materially shrinks the E7 delta in several categories. Anything a baseline suite
 * now includes must NOT be sold as "unlocked by E7" — see data/categories.ts.
 *
 * Existing customer pricing depends on renewal. The 30-day Message Center notice concerns
 * tenant feature availability, not a universal contractual price-change notice.
 *
 * The E3-vs-E5 split above is confirmed by Microsoft's own packaging table, not inferred:
 * Endpoint Privilege Management, Enterprise Application Management, Cloud PKI and Security
 * Copilot are listed under the E5 additions only. They therefore remain creditable as an E7
 * unlock for E3 customers.
 */

import { SECURITY_COPILOT_ALLOWANCE } from './sources';

export const PRICING_AS_OF = 'September 2026';

/** The packaging change baked into the coverage model. Surfaced in the UI for credibility. */
export const PACKAGING_UPDATE = {
  effective: '1 July 2026',
  pricingEffectiveDate: '2026-07-01',
  rolloutCompleteDate: '2026-08-01',
  sourceIds: ['m365-packaging-2026', 'security-copilot-inclusion'],
  label: 'July 2026 packaging update',
  summary:
    'Pricing changes took effect July 1, 2026, with packaging rollout stated to complete August 1. Both E3 tiers gain Defender for Office 365 P1; M365 E3 gains Intune Plan 2, Remote Help and Advanced Analytics; M365 E5 gains EPM, Enterprise Application Management and Cloud PKI. Security Copilot has a separately documented phased inclusion rollout. Confirm tenant availability and renewal terms.',
  impact:
    'Some capabilities may already be in your baseline. Review those as baseline optimization, not E7-only savings. Existing ownership does not prove vendor equivalence or that an invoice can be cancelled.',
} as const;

export type BaselineSkuId = 'o365e3' | 'm365e3' | 'm365e5';

export interface BaselineSku {
  id: BaselineSkuId;
  name: string;
  shortName: string;
  listPricePupm: number;
  tagline: string;
  includes: string[];
  notIncluded: string[];
  sourceIds: string[];
  referenceCurrency: 'USD';
}

export const BASELINE_SKUS: BaselineSku[] = [
  {
    id: 'o365e3',
    name: 'Office 365 E3',
    shortName: 'O365 E3',
    listPricePupm: 26,
    sourceIds: ['m365-packaging-2026', 'teams-choice-2025', 'm365-product-terms'],
    referenceCurrency: 'USD',
    tagline: 'Core productivity and email protection — no Windows or advanced endpoint security',
    includes: [
      'Office desktop + web apps',
      'Exchange Online, SharePoint, OneDrive',
      'Microsoft Teams (with-Teams variant assumed)',
      'Basic anti-malware and anti-spam',
      'Defender for Office 365 P1 — Safe Links, Safe Attachments, anti-phishing (added July 2026)',
    ],
    notIncluded: [
      'Windows 11 Enterprise',
      'Microsoft Intune',
      'Microsoft Entra ID P1/P2',
      'Defender for Office 365 P2 (AIR, Threat Explorer, attack simulation)',
      'Defender for Endpoint, Identity and Cloud Apps',
      'Microsoft Purview advanced compliance',
      'Power BI Pro',
      'Teams Phone',
    ],
  },
  {
    id: 'm365e3',
    name: 'Microsoft 365 E3',
    shortName: 'M365 E3',
    listPricePupm: 39,
    sourceIds: ['m365-packaging-2026', 'teams-choice-2025', 'm365-product-terms'],
    referenceCurrency: 'USD',
    tagline: 'Productivity + Windows Enterprise + foundational identity and device management',
    includes: [
      'Everything in Office 365 E3',
      'Windows 11 Enterprise E3',
      'Defender for Endpoint P1 — foundational endpoint protection',
      'Defender for Office 365 P1 — Safe Links, Safe Attachments, anti-phishing (added July 2026)',
      'Microsoft Intune Plan 2 — incl. Tunnel for MAM, specialised devices, firmware updates (added July 2026)',
      'Intune Remote Help and Advanced Analytics (added July 2026)',
      'Microsoft Entra ID P1',
      'Purview Information Protection (basic labelling)',
      'Basic DLP for Exchange, SharePoint and OneDrive',
    ],
    notIncluded: [
      'Microsoft Defender for Endpoint P2',
      'Microsoft Defender for Office 365 P2',
      'Microsoft Defender for Identity / Cloud Apps',
      'Microsoft Entra ID P2 and Entra ID Governance',
      'Intune Endpoint Privilege Management, Enterprise Application Management, Cloud PKI',
      'Microsoft Security Copilot',
      'Purview Insider Risk, eDiscovery Premium, Communication Compliance',
      'Power BI Pro',
      'Teams Phone Standard',
    ],
  },
  {
    id: 'm365e5',
    name: 'Microsoft 365 E5',
    shortName: 'M365 E5',
    listPricePupm: 60,
    sourceIds: ['m365-packaging-2026', 'teams-choice-2025', 'security-copilot-inclusion', 'm365-product-terms'],
    referenceCurrency: 'USD',
    tagline: 'Advanced security, compliance, analytics and voice — with a capped Security Copilot allowance',
    includes: [
      'Everything in Microsoft 365 E3',
      'Microsoft Defender for Endpoint P2, Office 365 P2, Identity, Cloud Apps',
      'Microsoft Entra ID P2',
      `Microsoft Security Copilot — ${SECURITY_COPILOT_ALLOWANCE.summary}`,
      'Intune Endpoint Privilege Management, Enterprise Application Management, Cloud PKI (added July 2026)',
      'User-licensed Microsoft Purview: DLP, Insider Risk, eDiscovery Premium, Communication Compliance; separate consumption may apply',
      'Power BI Pro',
      'Teams Phone Standard + Audio Conferencing',
    ],
    notIncluded: [
      'Microsoft 365 Copilot (was a $30/user/month add-on)',
      'Agent 365 — AI agent governance ($15/user/month standalone)',
      'Full Microsoft Entra Suite (Private Access, Internet Access, ID Governance, ID Protection, Verified ID with Face Check)',
    ],
  },
];

export const E7_SKU = {
  id: 'm365e7' as const,
  name: 'Microsoft 365 E7',
  shortName: 'M365 E7',
  listPricePupm: 99,
  sourceIds: ['e7-announcement', 'm365-packaging-2026', 'security-copilot-inclusion'],
  referenceCurrency: 'USD' as const,
  teamsVariants: ['with Teams', 'without Teams'],
  tagline: 'The Frontier Suite — E5 plus Copilot, Agent 365 and the full Entra Suite',
  generalAvailability: '1 May 2026',
  /**
   * What E7 adds on top of a fully-licensed M365 E5 estate.
   * Microsoft names exactly four components in E7 — Copilot, M365 E5, the Entra Suite and
   * Agent 365 — so the delta over E5 is the other three. Work IQ is not a separate component;
   * it is what powers Copilot, and is described there rather than counted again here.
   */
  deltaOverE5: [
    {
      name: 'Microsoft 365 Copilot',
      detail:
        'Included for every user — previously a $30/user/month add-on. This is the Copilot that Work IQ grounds in your work graph, not the Copilot Chat enhancements that reached E3 and E5 in July 2026.',
    },
    {
      name: 'Agent 365',
      detail:
        'A control plane for AI agents: identity, lifecycle, policy, observability and audit for agents as first-class digital workers. Included with E7; also sold standalone at $15/user/month, so this is a bundling saving rather than a capability only E7 can reach.',
    },
    {
      name: 'Microsoft Entra Suite (full)',
      detail:
        'Beyond the Entra ID P2 capabilities already in E5 — adds Entra Private Access (ZTNA), Internet Access (SWG), full ID Governance and Verified ID premium capabilities. Validate feature limits and eligibility.',
    },
  ],
};

export function getBaseline(id: BaselineSkuId): BaselineSku {
  const sku = BASELINE_SKUS.find((s) => s.id === id);
  if (!sku) throw new Error(`Unknown baseline SKU: ${id}`);
  return sku;
}
