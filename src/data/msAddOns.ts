/**
 * Microsoft add-on SKUs a customer may already be paying for on top of their
 * baseline suite.
 *
 * `absorbedByE7: true`  -> E7 includes this capability, so the add-on line can be retired.
 * `absorbedByE7: false` -> E7 does NOT include it. These are listed deliberately: a business
 *                          case that quietly assumes E7 swallows Sentinel, calling plans or
 *                          Security Copilot will not survive finance review.
 *
 * `relevantFor` gates which baselines would plausibly be buying the add-on — there is no point
 * asking an M365 E5 customer whether they buy Entra ID P2, because E5 already includes it.
 *
 * Prices are USD list per user per month (annual commitment), and are editable in-app.
 */

import type { BaselineSkuId } from './skus';

export interface MsAddOn {
  id: string;
  name: string;
  listPricePupm: number;
  description: string;
  absorbedByE7: boolean;
  relevantFor: BaselineSkuId[];
  /** Set for add-ons that are not per-user priced, so the UI can explain the estimate. */
  note?: string;
  /**
   * Microsoft consolidated several standalone per-user SKUs into the Defender and Purview
   * suites, and no longer publishes list prices for the originals. Customers on older
   * agreements may still see them itemised, so they stay selectable — but counting a suite
   * AND its constituents is double-counting, and the UI warns when both carry a value.
   */
  supersededBy?: string;
}

const ALL: BaselineSkuId[] = ['o365e3', 'm365e3', 'm365e5'];
const E3_TIERS: BaselineSkuId[] = ['o365e3', 'm365e3'];

export const MS_ADD_ONS: MsAddOn[] = [
  // ---------------------------------------------------------------- absorbed by E7
  {
    id: 'copilot',
    name: 'Microsoft 365 Copilot',
    listPricePupm: 30,
    description:
      'The AI assistant across Word, Excel, PowerPoint, Outlook and Teams. E7 includes it for every user, so this add-on line disappears entirely.',
    absorbedByE7: true,
    relevantFor: ALL,
  },
  {
    id: 'agent-365',
    name: 'Microsoft Agent 365',
    listPricePupm: 15,
    description:
      'The control plane for AI agents — registry, Entra Agent ID, policy, observability, and Defender and Purview coverage for agents. Included with E7; $15/user/month standalone otherwise.',
    absorbedByE7: true,
    relevantFor: ALL,
    note: 'Licensed per person who manages, sponsors or is served by agents — not per agent.',
  },
  {
    id: 'intune-suite',
    name: 'Microsoft Intune Suite',
    listPricePupm: 10,
    description:
      'Remote Help, Endpoint Privilege Management, Cloud PKI, Enterprise Application Management and Advanced Analytics. The July 2026 update moved Intune Plan 2, Remote Help and Advanced Analytics into M365 E3, and EPM, Cloud PKI and Enterprise Application Management into M365 E5 — so an E5 customer still buying this suite is largely paying twice today.',
    absorbedByE7: true,
    relevantFor: ALL,
  },
  {
    id: 'entra-suite',
    name: 'Microsoft Entra Suite',
    listPricePupm: 12,
    description:
      'Entra Private Access, Internet Access, ID Governance, ID Protection and Verified ID premium capabilities. Included in full with E7.',
    absorbedByE7: true,
    relevantFor: ALL,
  },
  {
    id: 'entra-id-governance',
    name: 'Microsoft Entra ID Governance',
    listPricePupm: 7,
    description:
      'Access reviews, entitlement management and lifecycle workflows. Sold separately even alongside E5; folded into the Entra Suite in E7.',
    absorbedByE7: true,
    relevantFor: ALL,
  },
  {
    id: 'entra-id-p1',
    name: 'Microsoft Entra ID P1',
    listPricePupm: 7,
    description: 'Conditional access, SSO and MFA. Already included in M365 E3 and E5.',
    absorbedByE7: true,
    relevantFor: ['o365e3'],
  },
  {
    id: 'entra-id-p2',
    name: 'Microsoft Entra ID P2',
    listPricePupm: 10,
    description:
      'Identity Protection risk-based policies and Privileged Identity Management. Already included in M365 E5.',
    absorbedByE7: true,
    relevantFor: E3_TIERS,
  },
  {
    id: 'windows-e3',
    name: 'Windows 11 Enterprise E3',
    listPricePupm: 7.63,
    description:
      'Windows Enterprise per-user licensing. Included from M365 E3 upward. Rose from $6.63 on 1 July 2026.',
    absorbedByE7: true,
    relevantFor: ['o365e3'],
  },
  {
    id: 'intune-plan1',
    name: 'Microsoft Intune Plan 1',
    listPricePupm: 8,
    description: 'Cloud endpoint and mobile device management. Included from M365 E3 upward.',
    absorbedByE7: true,
    relevantFor: ['o365e3'],
  },
  {
    id: 'defender-endpoint-p1',
    name: 'Microsoft Defender for Endpoint P1',
    listPricePupm: 3,
    description:
      'Next-generation antimalware and attack surface reduction. Already included in Microsoft 365 E3 and above.',
    absorbedByE7: true,
    relevantFor: ['o365e3'],
    supersededBy: 'm365-e5-security',
  },
  {
    id: 'defender-endpoint-p2',
    name: 'Microsoft Defender for Endpoint P2',
    listPricePupm: 5.2,
    description:
      'Full EDR with automated investigation, threat hunting and vulnerability management. Included in M365 E5.',
    absorbedByE7: true,
    relevantFor: E3_TIERS,
    supersededBy: 'm365-e5-security',
  },
  {
    id: 'defender-o365-p1',
    name: 'Microsoft Defender for Office 365 P1',
    listPricePupm: 2,
    description: 'Safe Links, Safe Attachments and anti-phishing for email and collaboration.',
    absorbedByE7: true,
    relevantFor: E3_TIERS,
    supersededBy: 'm365-e5-security',
  },
  {
    id: 'defender-o365-p2',
    name: 'Microsoft Defender for Office 365 P2',
    listPricePupm: 5,
    description:
      'Adds threat explorer, automated investigation and attack simulation training. Included in M365 E5.',
    absorbedByE7: true,
    relevantFor: E3_TIERS,
    supersededBy: 'm365-e5-security',
  },
  {
    id: 'defender-identity',
    name: 'Microsoft Defender for Identity',
    listPricePupm: 5.5,
    description: 'Detects identity attacks against Active Directory and Entra ID.',
    absorbedByE7: true,
    relevantFor: E3_TIERS,
    supersededBy: 'm365-e5-security',
  },
  {
    id: 'defender-cloud-apps',
    name: 'Microsoft Defender for Cloud Apps',
    listPricePupm: 5,
    description: 'CASB for shadow-IT discovery, SaaS posture and session control.',
    absorbedByE7: true,
    relevantFor: E3_TIERS,
    supersededBy: 'm365-e5-security',
  },
  {
    id: 'm365-e5-security',
    name: 'Microsoft Defender Suite',
    listPricePupm: 12,
    description:
      'The bundled Defender + Entra ID P2 uplift sold on top of M365 E3 — renamed from "Microsoft 365 E5 Security". Fully absorbed by E7.',
    absorbedByE7: true,
    relevantFor: ['m365e3'],
  },
  {
    id: 'm365-e5-compliance',
    name: 'Microsoft Purview Suite',
    listPricePupm: 12,
    description:
      'The bundled Purview uplift sold on top of M365 E3 — renamed from "Microsoft 365 E5 Compliance". Fully absorbed by E7.',
    absorbedByE7: true,
    relevantFor: ['m365e3'],
  },
  {
    id: 'purview-info-protection',
    name: 'Purview Information Protection & Governance',
    listPricePupm: 10,
    description: 'Sensitivity labelling, advanced DLP and data lifecycle management.',
    absorbedByE7: true,
    relevantFor: E3_TIERS,
    supersededBy: 'm365-e5-compliance',
    note: 'Covers the classic user-based Purview capabilities that E5/E7 include. Purview coverage across data estates, networks and generative-AI apps is pay-as-you-go on Azure and is NOT absorbed, so exclude that portion of your spend.',
  },
  {
    id: 'purview-insider-risk',
    name: 'Purview Insider Risk Management',
    listPricePupm: 12,
    description: 'Detects risky insider activity such as data theft before departure.',
    absorbedByE7: true,
    relevantFor: E3_TIERS,
    supersededBy: 'm365-e5-compliance',
    note: 'Covers the classic user-based Purview capabilities that E5/E7 include. Purview coverage across data estates, networks and generative-AI apps is pay-as-you-go on Azure and is NOT absorbed, so exclude that portion of your spend.',
  },
  {
    id: 'purview-ediscovery-audit',
    name: 'Purview eDiscovery & Audit',
    listPricePupm: 12,
    description: 'Premium eDiscovery workflows, legal hold and long-term audit retention.',
    absorbedByE7: true,
    relevantFor: E3_TIERS,
    supersededBy: 'm365-e5-compliance',
    note: 'Covers the classic user-based Purview capabilities that E5/E7 include. Purview coverage across data estates, networks and generative-AI apps is pay-as-you-go on Azure and is NOT absorbed, so exclude that portion of your spend.',
  },
  {
    id: 'purview-comms-compliance',
    name: 'Purview Communication Compliance',
    listPricePupm: 12,
    description: 'Supervisory review of Teams, Exchange and third-party channels.',
    absorbedByE7: true,
    relevantFor: E3_TIERS,
    supersededBy: 'm365-e5-compliance',
    note: 'Covers the classic user-based Purview capabilities that E5/E7 include. Purview coverage across data estates, networks and generative-AI apps is pay-as-you-go on Azure and is NOT absorbed, so exclude that portion of your spend.',
  },
  {
    id: 'power-bi-pro',
    name: 'Power BI Pro',
    listPricePupm: 14,
    description: 'Publish, share and consume Power BI reports. Included in M365 E5.',
    absorbedByE7: true,
    relevantFor: E3_TIERS,
  },
  {
    id: 'teams-phone',
    name: 'Teams Phone Standard',
    listPricePupm: 10,
    description:
      'Cloud PBX for Teams. Included in M365 E5. Note this is the PBX only — calling plans are separate.',
    absorbedByE7: true,
    relevantFor: E3_TIERS,
  },
  {
    id: 'audio-conferencing',
    name: 'Teams Audio Conferencing',
    listPricePupm: 0,
    description:
      'Dial-in numbers for Teams meetings. Since 2023 this has been included at no cost with every enterprise plan that carries Teams, so there should be nothing left to cancel.',
    absorbedByE7: true,
    relevantFor: [],
    note: 'Listed for completeness only. If this still appears on your invoice it is worth querying with your reseller — Microsoft made it free across enterprise plans.',
  },

  // ------------------------------------------------------------ NOT absorbed by E7
  {
    id: 'sentinel',
    name: 'Microsoft Sentinel',
    listPricePupm: 0,
    description:
      'Cloud-native SIEM. Billed on data ingestion, not per user, and NOT included in E7 — budget for it separately.',
    absorbedByE7: false,
    relevantFor: ALL,
    note: 'Consumption-based. Enter your estimated monthly spend divided by seats, or use the annual total field.',
  },
  {
    id: 'security-copilot',
    name: 'Microsoft Security Copilot',
    listPricePupm: 0,
    description:
      'AI for the SOC. Included for M365 E5 and E7 customers as a monthly Security Compute Unit allocation, so an E3-based customer paying for it separately can stop.',
    absorbedByE7: true,
    relevantFor: E3_TIERS,
    note: 'E5/E7 include 400 SCUs per month for every 1,000 paid licences, capped at 10,000 SCUs per month. Heavy SOC usage beyond that allocation is still billed, so treat this as a capped rather than unlimited saving.',
  },
  {
    id: 'teams-calling-plan',
    name: 'Teams Calling Plan (domestic)',
    listPricePupm: 12,
    description:
      'PSTN minutes. E7 includes the Teams Phone PBX but never the calling plan itself — this cost persists.',
    absorbedByE7: false,
    relevantFor: ALL,
  },
  {
    id: 'power-platform-premium',
    name: 'Power Apps / Power Automate Premium',
    listPricePupm: 20,
    description:
      'Premium connectors, Dataverse and RPA beyond the seeded rights in M365. Not absorbed by E7.',
    absorbedByE7: false,
    relevantFor: ALL,
  },
  {
    id: 'project-plan3',
    name: 'Planner and Project Plan 3',
    listPricePupm: 30,
    description: 'Full project and portfolio management. Sold separately from every M365 suite.',
    absorbedByE7: false,
    relevantFor: ALL,
  },
  {
    id: 'viva-suite',
    name: 'Microsoft Viva Suite',
    listPricePupm: 12,
    description:
      'Glint and Viva Learning beyond the Viva Connections/Engage basics carried in M365. Not absorbed by E7. (Viva Goals was retired on 31 December 2025.)',
    absorbedByE7: false,
    relevantFor: ALL,
  },
  {
    id: 'windows-365',
    name: 'Windows 365 Cloud PC',
    listPricePupm: 41,
    description: 'Hosted Cloud PCs. Consumption of compute, entirely separate from the E7 suite.',
    absorbedByE7: false,
    relevantFor: ALL,
    note: 'Priced per Cloud PC size. $41 is the 2 vCPU / 8 GB / 128 GB config most orgs deploy for Office and line-of-business apps; sizes run $28 (2/4/128) to $123 (8/32/512), so adjust to your actual mix.',
  },
];

export function addOnsForBaseline(baseline: BaselineSkuId): MsAddOn[] {
  return MS_ADD_ONS.filter((a) => a.relevantFor.includes(baseline));
}

export function getAddOn(id: string): MsAddOn | undefined {
  return MS_ADD_ONS.find((a) => a.id === id);
}
