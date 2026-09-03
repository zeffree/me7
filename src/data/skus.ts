/**
 * Baseline suite definitions and Microsoft 365 E7 reference data.
 *
 * All prices are USD list, per user per month, annual commitment, verified against
 * Microsoft's published list pricing in September 2026. They are seeded defaults only —
 * every price is editable in the app because EA/CSP agreements typically land 10-20%
 * below list. This is an estimator, not a quote.
 *
 * IMPORTANT — the July 2026 packaging update is reflected here.
 * Effective 1 July 2026 (packaging began rolling out June 2026, complete 1 August 2026)
 * Microsoft both raised prices and moved capability *down* into the baseline suites:
 *   O365 E3 + M365 E3  gained Defender for Office 365 Plan 1
 *   M365 E3            gained Intune Plan 2, Remote Help and Advanced Analytics
 *   M365 E5            additionally gained Security Copilot, Intune Endpoint Privilege
 *                      Management, Enterprise Application Management and Cloud PKI
 * All three tiers also gained Copilot Chat enhancements (inbox and calendar awareness, plus
 * Word/Excel/PowerPoint agents) and Copilot Chat Analytics — useful context, but well short
 * of full Microsoft 365 Copilot, so it does not reduce the Copilot line in the model.
 * This materially shrinks the E7 delta in several categories. Anything a baseline suite
 * now includes must NOT be sold as "unlocked by E7" — see data/categories.ts.
 *
 * Existing customers stay on current pricing until their renewal, with at least 30 days'
 * notice in the Message Center, so a customer's live rate may still be the pre-July figure.
 *
 * The E3-vs-E5 split above is confirmed by Microsoft's own packaging table, not inferred:
 * Endpoint Privilege Management, Enterprise Application Management, Cloud PKI and Security
 * Copilot are listed under the E5 additions only. They therefore remain creditable as an E7
 * unlock for E3 customers.
 */

export const PRICING_AS_OF = 'September 2026';

/** The packaging change baked into the coverage model. Surfaced in the UI for credibility. */
export const PACKAGING_UPDATE = {
  effective: '1 July 2026',
  label: 'July 2026 packaging update',
  summary:
    'Microsoft raised list prices and moved capability down into E3 and E5. Defender for Office 365 P1 is now in both E3 tiers; Intune Plan 2, Remote Help and Advanced Analytics are in M365 E3; Security Copilot, Endpoint Privilege Management, Enterprise Application Management and Cloud PKI are in M365 E5.',
  impact:
    'Several things E7 used to unlock are now already in your baseline, so this assessment credits them as redundant spend you can cut today rather than as an E7 upgrade.',
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
}

export const BASELINE_SKUS: BaselineSku[] = [
  {
    id: 'o365e3',
    name: 'Office 365 E3',
    shortName: 'O365 E3',
    listPricePupm: 26,
    tagline: 'Core productivity only — no Windows, no advanced security',
    includes: [
      'Office desktop + web apps',
      'Exchange Online, SharePoint, OneDrive',
      'Microsoft Teams',
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
    tagline: 'Productivity + Windows Enterprise + foundational identity and device management',
    includes: [
      'Everything in Office 365 E3',
      'Windows 11 Enterprise E3',
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
      'Teams Phone and Audio Conferencing',
    ],
  },
  {
    id: 'm365e5',
    name: 'Microsoft 365 E5',
    shortName: 'M365 E5',
    listPricePupm: 60,
    tagline: 'The full security, compliance, analytics and voice stack — everything except AI',
    includes: [
      'Everything in Microsoft 365 E3',
      'Microsoft Defender for Endpoint P2, Office 365 P2, Identity, Cloud Apps',
      'Microsoft Entra ID P2',
      'Microsoft Security Copilot — included SCU allocation (added July 2026)',
      'Intune Endpoint Privilege Management, Enterprise Application Management, Cloud PKI (added July 2026)',
      'Full Microsoft Purview: DLP, Insider Risk, eDiscovery Premium, Communication Compliance',
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
        'Beyond Entra ID P2 — adds Entra Private Access (ZTNA), Internet Access (SWG), ID Governance, ID Protection and Verified ID premium capabilities.',
    },
  ],
};

export function getBaseline(id: BaselineSkuId): BaselineSku {
  const sku = BASELINE_SKUS.find((s) => s.id === id);
  if (!sku) throw new Error(`Unknown baseline SKU: ${id}`);
  return sku;
}
