import type { ExperienceMission } from '../types';

export const PROTECTION_MISSIONS: readonly ExperienceMission[] = [
  {
    id: 'incident',
    title: 'Follow the evidence',
    shortTitle: 'Review an incident',
    room: 'Response room',
    domain: 'threat',
    intro: 'Maya reports an unusual invoice. Pin the prepared observations together before deciding what the response team should do.',
    objective: 'Separate corroborating evidence from routine activity, then choose a proportionate, reviewable response.',
    product: 'Microsoft Defender XDR and Microsoft Security Copilot',
    categoryIds: ['edr-xdr', 'email-security', 'secops-ai'],
    sourceIds: ['architecture-defender-xdr', 'architecture-attack-disruption', 'security-copilot-inclusion', 'm365-packaging-2026', 'experience-defender-office-plans'],
    variants: {
      everyday: {
        label: 'An invoice to investigate',
        description: 'The authored email and device timelines line up. Entra ID Protection cloud-risk context can help the analyst investigate; a scheduled inventory task is unrelated.',
      },
      curveball: {
        label: 'A noisy timeline',
        description: 'The device timestamp is unverified and overlaps scheduled maintenance. Keep the investigation open: the available observations do not justify containment.',
      },
    },
    comparison: {
      o365e3: 'Office 365 E3 includes Defender for Office 365 Plan 1 under the July 2026 packaging update, including email investigation and Real-time detections—not only preventive filtering. Manual triage is valid. The illustrated cross-workload XDR, endpoint response, cloud identity-risk source and Security Copilot need separate coverage beyond this suite.',
      m365e7: 'Microsoft 365 E7 can bring licensed, onboarded workload signals together in Defender XDR. Supported response actions still depend on device support, scope and analyst permissions. Security Copilot can assist a human analyst within the enabled tenant’s capacity allowance; it does not prove an attack or guarantee containment.',
    },
    prerequisites: [
      'Onboard the licensed email and endpoint workloads and the Entra ID Protection cloud-risk source used here; verify supported devices, integrations, exclusions and response permissions.',
      'Validate the timeline and the person/device relationship before approving a response. A risky sign-in alone is not proof.',
      'For Security Copilot, confirm tenant enablement, supported data access and available Security Compute Unit capacity. Review its briefing as a human.',
    ],
    boundary: 'This authored board supplies practice observations, not live telemetry or source entitlements. The identity clue represents Entra ID Protection cloud risk, not an assumed on-premises AD sensor. No tenant, endpoint or AI service is contacted. Isolation is an analyst-reviewed request, not automatic attack disruption or guaranteed containment.',
    takeaway: 'Corroboration changes the next question. Licensing and onboarding enable tools; neither turns an uncertain clue into a verdict.',
  },
  {
    id: 'sharing',
    title: 'Give the document a safe route',
    shortTitle: 'Handle a document',
    room: 'Document desk',
    domain: 'data',
    intro: 'A Lantern workshop brief contains confidential details. Inspect the outgoing sample, choose a destination and keep the right people able to work.',
    objective: 'Match the label to the actual content and use an authorised route. Try the explicitly scoped endpoint USB policy without assuming every sharing path is blocked.',
    product: 'Microsoft Purview Information Protection and Endpoint DLP',
    categoryIds: ['dlp', 'info-protection'],
    sourceIds: ['experience-endpoint-dlp', 'experience-purview-licensing', 'e7-announcement'],
    variants: {
      everyday: {
        label: 'A workshop handout',
        description: 'The prepared public extract removes the client contact and contract reference. The original stays confidential and team-restricted.',
      },
      curveball: {
        label: 'One field remains',
        description: 'An additional restricted care note survives the prepared redaction. Do not release it as Public; use the pre-approved restricted sharing route.',
      },
    },
    comparison: {
      o365e3: 'Office 365 E3 already supports team collaboration, document permissions and foundational cloud DLP in Exchange Online, SharePoint and OneDrive, including files in Teams repositories. People can review content, use an approved link or release a reviewed public extract. The advanced Endpoint DLP USB control illustrated here is beyond this suite.',
      m365e7: 'Microsoft 365 E7 brings advanced E5-level Endpoint DLP coverage. On a supported, onboarded endpoint, a correctly scoped policy can audit or block confidential-data USB copying; this sample chooses block. Labels do not enable policy by themselves. External sharing still depends on recipient permissions and any separately scoped, supported policy.',
    },
    prerequisites: [
      'Confirm eligible licensing and a previously saved, supported local file on an onboarded physical Windows endpoint inside the enforced policy scope.',
      'Configure and test the sensitive-content conditions and the USB action. This sample rule matches marked confidential fields or the Confidential label.',
      'Verify document permissions and owner-approved recipients separately. Inspect the actual outgoing content before approving a public extract.',
    ],
    boundary: 'This is one supported USB block rule, not universal external-sharing, browser or network DLP. Requested exceptions remain pending; the pre-approved link is another route, not a USB-policy override or permission grant. Other scenarios may be consumption-billed. Retention is not backup, and E7 is not an entitlement to all Purview Data Governance consumption.',
    takeaway: 'A safe route depends on content, permissions and a scoped policy—not a label alone.',
  },
  {
    id: 'agent',
    title: 'Give an agent a job, not every file',
    shortTitle: 'Set agent boundaries',
    room: 'Agent workshop',
    domain: 'ai',
    intro: 'The prepared Lantern helper needs a named owner and project files. Make its passport and access path match that modest job.',
    objective: 'Assign responsibility, narrow source permissions and test a scoped premium tool policy without confusing agent registration, tool controls and file access.',
    product: 'Microsoft Agent 365 premium governance',
    categoryIds: ['agent-governance', 'genai-data-protection'],
    sourceIds: ['architecture-agent365', 'architecture-agent-data', 'architecture-copilot-data', 'experience-agent365-licensing', 'e7-announcement'],
    variants: {
      everyday: {
        label: 'Prepare the workshop',
        description: 'The agent needs the Lantern project brief, not the payroll folder. Record an owner and inspect its source access.',
      },
      curveball: {
        label: 'An unexpected request',
        description: 'Someone asks the project helper to include payroll. Test that boundary or return it to project work, and route the payroll question to an authorised human.',
      },
    },
    comparison: {
      o365e3: 'Office 365 E3 includes basic Agent 365 inventory, owner reassignment and core administration, including blocking an agent. A manual inventory is also valid. Ordinary file-permission denials are not E7-exclusive. The illustrated premium policy templates and selective tool controls need separate coverage; their absence does not authorise payroll access.',
      m365e7: 'Microsoft 365 E7 includes Agent 365 premium governance, including policy templates and tool controls for supported scenarios. Configure identity, ownership, access and policy scope. Registration adds no file permissions, and a broad existing grant remains a risk until an administrator fixes it.',
    },
    prerequisites: [
      'Use an eligible, supported agent in a qualifying tenant, with a registered identity, accountable owner and the required associated-user licence assignments.',
      'Grant only required source-file permissions; encrypted content also requires the applicable VIEW and EXTRACT rights.',
      'For this prepared supported scenario, scope the premium tool policy to this registered agent: permit Project reader and exclude Payroll reader. Verify actual tool/integration support; this is not universal agent DLP.',
    ],
    boundary: 'This helper and selective tool control are authored offline examples, not universal agent DLP. Basic agent administration is not the premium increment. Registration grants no file rights; new agent content does not automatically inherit source sensitivity labels. Agent 365 is not an agent builder or unlimited runtime, connector or model consumption. No agent runs here, no Astra runtime inclusion is implied, and the tool policy never repairs source permissions.',
    takeaway: 'An owned agent with narrow access can be useful precisely because it cannot answer every request.',
  },
];

export interface SharingSampleField {
  id: string;
  label: string;
  value: string;
  sensitivity: 'public' | 'confidential' | 'restricted';
  removedByExtract: boolean;
  curveballOnly?: boolean;
}

export const SHARING_SAMPLE_FIELDS: readonly SharingSampleField[] = [
  { id: 'project', label: 'Project', value: 'Project Lantern', sensitivity: 'public', removedByExtract: false },
  { id: 'update', label: 'Workshop update', value: 'The pilot follows the accessibility review.', sensitivity: 'public', removedByExtract: false },
  { id: 'contact', label: 'Client contact', value: 'lantern-contact@example.test', sensitivity: 'confidential', removedByExtract: true },
  { id: 'contract', label: 'Contract reference', value: 'NORTHSTAR-DEMO-014', sensitivity: 'confidential', removedByExtract: true },
  { id: 'care', label: 'Restricted care note', value: 'Synthetic accommodation case DEMO-CARE-042', sensitivity: 'restricted', removedByExtract: false, curveballOnly: true },
];

export const SHARING_ROUTES = {
  team: 'Lantern team workspace',
  external: 'External reviewer',
  usb: 'Removable USB drive',
  approved: 'Owner-approved named-recipient link',
} as const;

export const AGENT_SAMPLE = {
  name: 'Lantern workshop helper',
  id: 'NS-LANTERN-01',
  purpose: 'Prepare the Lantern workshop from project files.',
  project: { title: 'Lantern project brief', content: 'Pilot agenda, accessibility review and workshop actions.' },
  payroll: { title: 'Restricted payroll file', content: 'Restricted sample metadata only. No real pay data.' },
  tools: { project: 'Project reader', payroll: 'Payroll reader' },
  owners: { none: 'No owner recorded', maya: 'Maya Chen', it: 'Northstar IT' },
} as const;
