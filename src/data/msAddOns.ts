/**
 * Microsoft add-on SKUs a customer may already be paying for on top of their
 * baseline suite.
 *
 * `absorbedByE7: true`  -> Candidate entitlement overlap; cancellation requires review.
 * `absorbedByE7: false` -> E7 does NOT include it. These are listed deliberately: a business
 *                          case that quietly assumes E7 swallows Sentinel, calling plans or
 *                          consumption allowances will not survive finance review.
 *
 * `relevantFor` is a discovery hint, not a reason to hide an entered invoice.
 *
 * Prices are editable USD reference inputs; see getAddOnPriceEvidence for review status.
 */

import type { BaselineSkuId } from './skus';
import { SECURITY_COPILOT_ALLOWANCE } from './sources';

export interface MsAddOn {
  id: string;
  name: string;
  listPricePupm: number;
  description: string;
  absorbedByE7: boolean;
  /** Actual invoice cancellation requires customer review even when entitlement is sourced. */
  requiresConfirmation?: boolean;
  relevantFor: BaselineSkuId[];
  /** Categories with purchased capability overlap. Not proof of complete functional coverage. */
  capabilityIds?: string[];
  /** Set for add-ons that are not per-user priced, so the UI can explain the estimate. */
  note?: string;
  /**
   * Potential suite/component overlap for legacy standalone invoices. Current availability
   * and prices require agreement review. A suite and a constituent can be distinct invoices
   * for different populations; review their allocation rather than assuming duplication.
   */
  supersededBy?: string;
}

const ALL: BaselineSkuId[] = ['o365e3', 'm365e3', 'm365e5'];
const E3_TIERS: BaselineSkuId[] = ['o365e3', 'm365e3'];

/** Conservative planned-capability overlap: partial purchases also require review, not full new value. */
export const ADD_ON_CAPABILITY_IDS: Record<string, string[]> = {
  'copilot': ['genai-assistant', 'enterprise-search', 'ai-notetaker', 'agent-platform'],
  'agent-365': ['agent-governance'],
  'intune-suite': ['uem', 'remote-support', 'dex', 'patch-config', 'pam-ciem', 'cert-lifecycle'],
  'entra-suite': ['sso-mfa', 'identity-governance', 'pam-ciem', 'ztna', 'swg', 'verified-id'],
  'entra-id-governance': ['identity-governance', 'pam-ciem'],
  'entra-id-p1': ['sso-mfa'],
  'entra-id-p2': ['sso-mfa', 'identity-governance', 'pam-ciem'],
  'windows-e3': ['windows-vdi'],
  'intune-plan1': ['uem', 'patch-config'],
  'defender-endpoint-p1': ['edr-xdr'],
  'defender-endpoint-p2': ['edr-xdr', 'mobile-threat-defense', 'vuln-mgmt'],
  'defender-o365-p1': ['email-security'],
  'defender-o365-p2': ['email-security', 'security-awareness'],
  'defender-identity': ['itdr'],
  'defender-cloud-apps': ['casb', 'genai-data-protection'],
  'm365-e5-security': ['edr-xdr', 'mobile-threat-defense', 'email-security', 'security-awareness', 'itdr', 'casb', 'vuln-mgmt', 'sso-mfa', 'pam-ciem'],
  'm365-e5-compliance': ['dlp', 'info-protection', 'insider-risk', 'ediscovery', 'archiving-retention', 'comms-compliance', 'compliance-posture', 'genai-data-protection'],
  'purview-info-protection': ['dlp', 'info-protection', 'archiving-retention'],
  'purview-insider-risk': ['insider-risk'],
  'purview-ediscovery-audit': ['ediscovery'],
  'purview-comms-compliance': ['comms-compliance'],
  'power-bi-pro': ['business-intelligence'],
  'teams-phone': ['ucaas-telephony'],
  'audio-conferencing': ['audio-conferencing'],
  'sentinel': ['siem-soar'],
  'security-copilot': ['secops-ai'],
  'teams-calling-plan': ['ucaas-telephony'],
  'power-platform-premium': ['workflow-automation', 'lowcode', 'rpa'],
  'project-plan3': ['project-management'],
  'viva-suite': ['intranet-ex'],
  'windows-365': ['windows-vdi'],
};

const ADD_ON_RECORDS: MsAddOn[] = [
  // ---------------------------------------------------------------- absorbed by E7
  {
    id: 'copilot',
    name: 'Microsoft 365 Copilot',
    listPricePupm: 30,
    description:
      'The AI assistant across Word, Excel, PowerPoint, Outlook and Teams. E7 includes Copilot; review the same-user entitlement, contract and cancellation date before retiring an existing add-on invoice.',
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
    note: 'Published as a per-user offer, not per agent. Validate the precise licensed population and prerequisites in the current agreement.',
  },
  {
    id: 'intune-suite',
    name: 'Microsoft Intune Suite',
    listPricePupm: 10,
    description:
      'Remote Help, Endpoint Privilege Management, Cloud PKI, Enterprise Application Management and Advanced Analytics. The 2026 update moves these capabilities into M365 E3/E5 at different tiers. Verify the component set, tenant rollout, user population and agreement before treating any existing invoice as redundant.',
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
      'The Defender + Entra ID P2 uplift associated with M365 E3. E7 includes relevant capabilities; validate the exact purchased Defender/E5 Security offer, users and cancellation terms.',
    absorbedByE7: true,
    relevantFor: ['m365e3'],
  },
  {
    id: 'm365-e5-compliance',
    name: 'Microsoft Purview Suite',
    listPricePupm: 12,
    description:
      'The user-licensed Purview uplift associated with M365 E3. Validate the exact purchased Purview/E5 Compliance offer, users and cancellation terms; separately metered services may remain.',
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
      'Dial-in numbers for Teams meetings. Validate the purchased Teams variant, assigned licences and included regional allowances before changing an existing invoice.',
    absorbedByE7: true,
    relevantFor: ALL,
    note: 'A zero reference is not proof that your invoice is free or redundant. Toll-free, dial-out and regional consumption charges may remain.',
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
      `AI for the SOC. ${SECURITY_COPILOT_ALLOWANCE.summary}`,
    absorbedByE7: true,
    relevantFor: ALL,
    note: SECURITY_COPILOT_ALLOWANCE.conditions,
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
    description:     'Premium project planning capabilities. This is a separate purchase; verify current SKU features rather than treating it as a full portfolio-management entitlement.',
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
    note: 'Priced per Cloud PC configuration, not per employee. The stored $41 USD is an unverified illustrative reference; enter your actual configuration, commercial offer and invoice amount.',
  },
];

export const MS_ADD_ONS: MsAddOn[] = ADD_ON_RECORDS.map((addOn) => ({
  requiresConfirmation: true,
  ...addOn,
  capabilityIds: [...ADD_ON_CAPABILITY_IDS[addOn.id]],
}));

export function getAddOnCapabilityIds(addOnId: string): string[] {
  return [...(getAddOn(addOnId)?.capabilityIds ?? [])];
}

export function addOnsForBaseline(baseline: BaselineSkuId): MsAddOn[] {
  return MS_ADD_ONS.filter((a) => a.relevantFor.includes(baseline));
}

export function getAddOn(id: string): MsAddOn | undefined {
  return MS_ADD_ONS.find((a) => a.id === id);
}
