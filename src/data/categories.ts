/**
 * The consolidation catalog — the heart of the assessment.
 *
 * Every category records what the solution category actually is in plain English, which
 * Microsoft 365 E7 capability covers it, mainstream products people buy in that space, a
 * benchmark price for users who do not know their own numbers, and — critically — how the
 * coverage differs depending on the suite the customer is on *today*.
 *
 * Coverage semantics (see model/engine.ts for how these are scored):
 *   'already'     The baseline has a relevant capability; vendor replacement still needs review.
 *   'unlocked'    E7 newly covers this relative to your current suite.
 *   'upgrade'     The baseline has a lesser tier. No automatic functional parity is implied.
 *   'not-covered' E7 does not cover this. Listed on purpose so the business case is honest.
 */

import type { BaselineSkuId } from './skus';
import { SECURITY_COPILOT_ALLOWANCE, TEAMS_VARIANT_CONDITION } from './sources';

export type DomainId =
  | 'ai'
  | 'identity'
  | 'endpoint'
  | 'threat'
  | 'data'
  | 'comms'
  | 'analytics';

export type Coverage = 'already' | 'unlocked' | 'upgrade' | 'not-covered';

/** Legacy editorial coverage label, not verified parity or a financial discount. */
export type Confidence = 'full' | 'strong' | 'partial';

export interface Domain {
  id: DomainId;
  name: string;
  blurb: string;
  /** Tailwind-friendly accent key, resolved in the theme. */
  accent: string;
}

export interface Category {
  id: string;
  domain: DomainId;
  name: string;
  /** Plain-English explanation of what this class of solution does. */
  whatItIs: string;
  /** The Microsoft 365 E7 capability that covers it. */
  e7Component: string;
  /** How that capability maps onto the incumbent. */
  whyReplaced: string;
  /** Mainstream products customers actually buy in this space. */
  examples: string[];
  /**
   * Illustrative, unverified USD benchmark for alternatives, not a published vendor quote.
   * Some values normalize specialist or consumption pricing to workforce users.
   * See getBenchmarkEvidence; using a seed applies the full-replacement scenario, not a quote.
   * Zero means no reference estimate, not free service.
   */
  benchmarkPupm: number;
  /**
   * Illustrative share of the workforce, 0–1. Not externally verified adoption data.
   *
   * The original catalog mixes licensed-seat inputs with workforce-normalized estimates.
   * That normalization has no retained vendor derivation; review units and population before use.
   * Used only for optional planned-capability estimates. Invoice lines carry their own seats.
   */
  typicalAdoptionPct?: number;
  confidence: Confidence;
  /** Legacy evidence-review recommendation; not a model-v3 financial gate. */
  requiresConfirmation?: boolean;
  /** Included in the 8-item quick assessment. */
  quickAssess: boolean;
  coverage: Record<BaselineSkuId, Coverage>;
  /** Honest limitation. Surfaced in the UI wherever the category is scored. */
  caveat?: string;
  /** Extra depth shown only in seller/presenter mode. */
  talkTrack?: string;
}

export const DOMAINS: Domain[] = [
  {
    id: 'ai',
    name: 'AI & Agents',
    blurb:
      'Assistants, enterprise search, notetakers and the emerging layer of AI agent governance.',
    accent: 'violet',
  },
  {
    id: 'identity',
    name: 'Identity & Access',
    blurb: 'Who your people are, what they can reach, and how they reach it securely.',
    accent: 'indigo',
  },
  {
    id: 'endpoint',
    name: 'Endpoint & Device',
    blurb: 'Managing, patching and protecting laptops, desktops and mobile devices.',
    accent: 'sky',
  },
  {
    id: 'threat',
    name: 'Threat Protection',
    blurb: 'Detecting and stopping attacks across endpoints, email, identity and SaaS.',
    accent: 'rose',
  },
  {
    id: 'data',
    name: 'Data Security & Compliance',
    blurb: 'Classifying, protecting, retaining and discovering your organisation’s information.',
    accent: 'amber',
  },
  {
    id: 'comms',
    name: 'Communication & Collaboration',
    blurb: 'Meetings, calling, file sharing and the places work gets done together.',
    accent: 'teal',
  },
  {
    id: 'analytics',
    name: 'Analytics & Automation',
    blurb: 'Dashboards, workflow automation and low-code applications.',
    accent: 'emerald',
  },
];

/** Shorthand builders for the repetitive coverage maps. */
const cov = (
  o365e3: Coverage,
  m365e3: Coverage,
  m365e5: Coverage,
): Record<BaselineSkuId, Coverage> => ({ o365e3, m365e3, m365e5 });

const allUnlocked = cov('unlocked', 'unlocked', 'unlocked');
const allAlready = cov('already', 'already', 'already');
const allUpgrade = cov('upgrade', 'upgrade', 'upgrade');
const notCovered = cov('not-covered', 'not-covered', 'not-covered');
/** E5 already has it; the E3 tiers do not. The classic Defender/Purview shape. */
const e5Already = cov('unlocked', 'unlocked', 'already');
/** Included from M365 E3 upward — only O365 E3 customers gain it. */
const e3Already = cov('unlocked', 'already', 'already');

const CATEGORY_RECORDS: Category[] = [
  // ══════════════════════════════════════════════════════════ AI & AGENTS
  {
    id: 'genai-assistant',
    domain: 'ai',
    name: 'Generative AI assistant for work',
    whatItIs:
      'A licensed AI chat assistant that employees use to draft, summarise, analyse and answer questions, grounded in company data. Usually bought per seat for knowledge workers.',
    e7Component: 'Microsoft 365 Copilot (included in E7)',
    whyReplaced:
      'E7 includes Copilot for every user at no incremental line item — it was a $30/user/month add-on under E5. Copilot is grounded in your existing Microsoft Graph data, so it answers from the mail, files and meetings you already have.',
    examples: [
      'ChatGPT Enterprise',
      'Google Workspace (Gemini included)',
      'Anthropic Claude Enterprise',
      'Glean Assistant',
      'Perplexity Enterprise',
    ],
    benchmarkPupm: 28,
    confidence: 'strong',
    quickAssess: true,
    coverage: allUnlocked,
    caveat:
      'Direct model/API consumption and specialist workflows may remain. Eligible baseline users already have Copilot Chat, with 2026 enhancements; it is not the same entitlement as full Microsoft 365 Copilot. Verify current in-app and grounding capabilities rather than assuming the baseline has no AI.',
    talkTrack:
      'Use the actual assistant invoice, not an assumed enterprise price. Compare only validated cancellable seats, and keep specialist workflows and API usage outside the retirement claim.',
  },
  {
    id: 'enterprise-search',
    domain: 'ai',
    name: 'Enterprise search & knowledge discovery',
    whatItIs:
      'A search layer that indexes across all your business systems — email, files, wikis, tickets, CRM — so employees can find answers without knowing which app holds them.',
    e7Component: 'Microsoft 365 Copilot + Microsoft Graph + Work IQ',
    whyReplaced:
      'Copilot retrieval over Microsoft Graph, extended with Graph connectors to third-party sources, covers the core use case. Work IQ grounds Copilot in cross-app context that previously required a dedicated search product.',
    examples: ['Glean', 'Coveo', 'Elastic Search AI Platform', 'Lucidworks Fusion', 'Sinequa'],
    benchmarkPupm: 30,
    confidence: 'strong',
    quickAssess: false,
    coverage: allUnlocked,
    caveat:
      'Graph connectors need configuring per source, and some highly specialised connectors may not exist. Budget project effort for the migration.',
    talkTrack:
      'Ask which knowledge sources, permissions and workflows the current search tool serves. Microsoft 365 content overlap is a reason to evaluate, not proof that the search invoice is redundant.',
  },
  {
    id: 'ai-notetaker',
    domain: 'ai',
    name: 'AI meeting transcription & notetakers',
    whatItIs:
      'Bots that join meetings to record, transcribe, summarise and extract action items. Often bought bottom-up by individual teams, so spend hides in expense reports.',
    e7Component: 'Copilot in Teams + Intelligent Recap',
    whyReplaced:
      'Teams already produces transcripts; Copilot adds AI recap, action items and follow-up questions over the meeting natively — with no third-party bot admitted into the meeting.',
    examples: ['Otter.ai', 'Fireflies.ai', 'Read AI', 'Avoma', 'tl;dv'],
    benchmarkPupm: 19,
    typicalAdoptionPct: 0.4,
    confidence: 'strong',
    quickAssess: false,
    coverage: allUnlocked,
    talkTrack:
      'Review recording consent, retention and data handling for both solutions. A third-party notetaker is not necessarily unmanaged, and a native tool still needs policy and configuration.',
  },
  {
    id: 'agent-platform',
    domain: 'ai',
    name: 'AI agent building & orchestration',
    whatItIs:
      'Platforms for building autonomous AI agents that take multi-step actions across systems, rather than just answering questions.',
    e7Component: 'Agent building in Microsoft 365 Copilot (Wave 3) + Agent 365',
    whyReplaced:
      'E7 bundles Microsoft 365 Copilot, whose Wave 3 agentic capabilities let users build and run agents inside the apps they already use, governed centrally by Agent 365. None of Office 365 E3, Microsoft 365 E3 or E5 include Copilot, so this capability is genuinely new at E7.',
    examples: [
      'Salesforce Agentforce',
      'CrewAI Enterprise',
      'LangChain / LangSmith',
      'Sierra',
      'Writer',
    ],
    benchmarkPupm: 20,
    typicalAdoptionPct: 0.15,
    confidence: 'partial',
    quickAssess: false,
    coverage: allUnlocked,
    caveat:
      'Copilot Studio capacity is not itself bundled as unlimited usage into E7. Confirm current capacity, agent and preview licensing rather than assuming all agent execution is included. Complex customer-facing agents may require separate platforms or consumption.',
    talkTrack:
      'Ask who builds the agents, where they run and which integrations and consumption they require. A Copilot or Agent 365 entitlement is not evidence that a specialist development platform or its operating bill can be retired.',
  },
  {
    id: 'agent-governance',
    domain: 'ai',
    name: 'AI agent governance, identity & observability',
    whatItIs:
      'The control plane for AI agents once you have more than a handful: giving each agent an identity, controlling what it can access, logging what it did, and retiring it safely. A brand-new budget line for most organisations.',
    e7Component: 'Agent 365 (included in E7; $15/user/month standalone otherwise)',
    whyReplaced:
      'Agent 365 treats agents as first-class digital workers — registry, identity via Entra, policy enforcement, Defender and Purview integration, and full audit. E7 includes it; E5 customers can buy it as an add-on.',
    examples: ['Zenity', 'WitnessAI', 'Credal', 'Lasso Security', 'Aim Security'],
    benchmarkPupm: 10,
    confidence: 'strong',
    quickAssess: false,
    coverage: allUnlocked,
    caveat:
      'Agent 365 is not E7-exclusive; the announcement also prices a standalone per-user offer at $15. Confirm current prerequisites, eligible users and any foundational tier rather than assuming every agent workload is covered.',
    talkTrack:
      'For customers not yet spending here, do not book cash savings or invent quantified risk avoided. Record a planned capability only if the customer intends to adopt it, with a separately confirmed budget assumption.',
  },
  {
    id: 'genai-data-protection',
    domain: 'ai',
    name: 'GenAI data protection & shadow-AI control',
    whatItIs:
      'Tooling that stops staff pasting sensitive data into public AI tools, and gives visibility into which AI services the organisation is actually using.',
    e7Component: 'Microsoft Purview DSPM for AI + Defender for Cloud Apps',
    whyReplaced:
      'Purview extends existing sensitivity labels and DLP policies to AI prompts and responses, while Defender for Cloud Apps discovers and governs unsanctioned AI services.',
    examples: ['Nightfall AI', 'SentinelOne Prompt Security', 'Netskope GenAI Security', 'Zscaler AI Protection'],
    benchmarkPupm: 6,
    confidence: 'partial',
    quickAssess: false,
    coverage: e5Already,
    caveat: 'Coverage is strongest for Microsoft-hosted AI; browser-level control of arbitrary AI sites is less complete than a dedicated proxy.',
    talkTrack:
      'The shadow-AI conversation opens doors even where there is no budget line for it. Run the Defender for Cloud Apps discovery report and show them which AI services their staff are already pasting data into. That report sells this category better than any slide you have.',
  },

  // ══════════════════════════════════════════════════════════ IDENTITY & ACCESS
  {
    id: 'sso-mfa',
    domain: 'identity',
    name: 'SSO, MFA & conditional access',
    whatItIs:
      'The identity provider that authenticates staff once and grants access to every application, enforcing multi-factor authentication and risk-based policies.',
    e7Component: 'Microsoft Entra ID P2',
    whyReplaced:
      'Entra ID is a full workforce identity provider — SSO to thousands of SaaS apps, passwordless and phishing-resistant MFA, conditional access, and risk-based Identity Protection.',
    examples: [
      'Okta Workforce Identity',
      'Ping Identity',
      'Cisco Duo',
      'JumpCloud',
      'OneLogin',
    ],
    benchmarkPupm: 7,
    confidence: 'strong',
    quickAssess: true,
    coverage: cov('unlocked', 'upgrade', 'already'),
    caveat:
      'M365 E3 has Entra ID P1, not P2 risk-based Identity Protection. Migrating an established IdP needs app-by-app review, and customer identity or specialist integrations may remain separate.',
    talkTrack:
      'Map the actual Okta or other identity workloads against the purchased Entra plan. Existing SSO overlap is not proof of equivalent integrations or a redundant invoice; validate the migration and retained scope.',
  },
  {
    id: 'identity-governance',
    domain: 'identity',
    name: 'Identity governance & administration (IGA)',
    whatItIs:
      'Automating the joiner-mover-leaver lifecycle, running periodic access reviews, and proving to auditors that only the right people have access.',
    e7Component: 'Microsoft Entra ID Governance (in the Entra Suite)',
    whyReplaced:
      'Entra ID Governance delivers entitlement management, access packages, access reviews and lifecycle workflows. E7 includes the full Entra Suite, so this is no longer a separate add-on.',
    examples: ['SailPoint Identity Security Cloud', 'Saviynt', 'Omada Identity', 'One Identity', 'Clear Skye'],
    benchmarkPupm: 9,
    confidence: 'partial',
    quickAssess: false,
    coverage: allUnlocked,
    caveat:
      'Deep governance of on-premises and mainframe systems is still stronger in specialist IGA tools. Entra is strongest for cloud and Microsoft-centric estates.',
    talkTrack:
      'Note this is unlocked even for E5 customers — Entra ID Governance is a paid add-on alongside E5 and is bundled in E7.',
  },
  {
    id: 'pam-ciem',
    domain: 'identity',
    name: 'Privileged access & cloud permissions (PAM/CIEM)',
    whatItIs:
      'Controlling admin and superuser access — time-bound elevation, approval workflows, and finding over-permissioned identities across cloud platforms.',
    e7Component: 'Microsoft Entra Privileged Identity Management + Intune Endpoint Privilege Management',
    whyReplaced:
      'PIM provides just-in-time elevation, approvals and access reviews for Entra ID and Azure roles. Intune Endpoint Privilege Management supports eligible Windows endpoint elevation. Neither establishes equivalence to a complete PAM or multicloud CIEM platform.',
    examples: ['CyberArk', 'BeyondTrust', 'Delinea', 'Sonrai Security', 'Saviynt CPAM'],
    benchmarkPupm: 6,
    confidence: 'partial',
    quickAssess: false,
    coverage: cov('unlocked', 'unlocked', 'already'),
    caveat:
      'The July 2026 packaging update adds endpoint privilege management to M365 E5; validate tenant enablement and supported scope. Entra Permissions Management retired on October 1, 2025, so no multicloud CIEM entitlement is claimed. Credential vaulting, session recording, servers and OT remain separate.',
    talkTrack:
      'Split the incumbent by module and workload before pricing it. Vaulting, session recording and CIEM stay separate; validate role and endpoint elevation in a pilot before confirming any cancellable amount.',
  },
  {
    id: 'ztna',
    domain: 'identity',
    name: 'Zero Trust network access / VPN replacement',
    whatItIs:
      'Replacing the traditional corporate VPN with per-application access, so users reach only the specific internal apps they are entitled to rather than the whole network.',
    e7Component: 'Microsoft Entra Private Access',
    whyReplaced:
      'Entra Private Access delivers identity-aware, per-app access to private resources with conditional access applied, removing the need for a separate ZTNA vendor and legacy VPN concentrators.',
    examples: [
      'Zscaler Private Access',
      'Palo Alto Prisma Access',
      'Netskope Private Access',
      'Cloudflare Access',
      'Cisco Secure Client',
    ],
    benchmarkPupm: 9,
    confidence: 'strong',
    quickAssess: true,
    coverage: allUnlocked,
    caveat:
      'Non-Windows client coverage and very high-throughput data-centre scenarios should be validated in a pilot before decommissioning the incumbent.',
    talkTrack:
      'This is the biggest surprise line for E5 customers — the Entra Suite is a paid add-on next to E5 and is included with E7. Zscaler and Prisma contracts are usually six figures.',
  },
  {
    id: 'swg',
    domain: 'identity',
    name: 'Secure web gateway & internet access',
    whatItIs:
      'Filtering and inspecting outbound internet traffic — blocking malicious or non-compliant sites and applying acceptable-use policy wherever staff work.',
    e7Component: 'Microsoft Entra Internet Access',
    whyReplaced:
      'Entra Internet Access provides an identity-aware secure web gateway with web content filtering and conditional access, unified with the same policy engine as the rest of Entra.',
    examples: [
      'Zscaler Internet Access',
      'Netskope Next Gen SWG',
      'Cisco Umbrella',
      'Forcepoint ONE',
      'iboss',
    ],
    benchmarkPupm: 7,
    confidence: 'strong',
    quickAssess: false,
    coverage: allUnlocked,
    caveat:
      'Full SSE feature parity — advanced CASB inline controls, granular DLP on all web traffic, global PoP coverage — should be compared feature by feature against a mature incumbent.',
    talkTrack:
      'Internet Access is the newest part of the Entra Suite and it shows. Position it as the natural pair to Private Access rather than a Zscaler rip-and-replace, and check they are not in a multi-year Zscaler bundle where the SWG is already discounted to near nothing alongside ZPA.',
  },
  {
    id: 'verified-id',
    domain: 'identity',
    name: 'Identity verification & verifiable credentials',
    whatItIs:
      'Proving someone is who they claim during onboarding or helpdesk recovery, and issuing digital credentials that can be verified without calling the issuer.',
    e7Component: 'Microsoft Entra Verified ID with Face Check (Entra Suite)',
    whyReplaced:
      'Verified ID issues and verifies W3C verifiable credentials. The Entra Suite in E7 adds Face Check biometric matching, which is otherwise charged per verification.',
    examples: ['Persona', 'Onfido (Entrust)', 'ID.me', 'Jumio', 'CLEAR Verified'],
    benchmarkPupm: 3,
    confidence: 'partial',
    quickAssess: false,
    coverage: allUpgrade,
    caveat:
      'Base Verified ID is already free with any Entra ID subscription, so this is an uplift rather than a new capability — E7 adds Face Check. Document and biometric proofing itself still comes from a partner and is transaction-priced.',
    talkTrack:
      'Base Verified ID is free with any Entra subscription, so lead with Face Check or you are selling something they already have. This is a small line — use it to show you are being precise, not to drive the savings number.',
  },
  {
    id: 'cert-lifecycle',
    domain: 'identity',
    name: 'Certificate lifecycle management (PKI)',
    whatItIs:
      'Issuing and renewing the digital certificates that authenticate devices and users to Wi-Fi, VPN and internal services — and making sure none of them silently expire and take a service down.',
    e7Component: 'Microsoft Cloud PKI',
    whyReplaced:
      'Cloud PKI stands up a managed certification authority in minutes and issues, renews and revokes device and user certificates through Intune, retiring the on-premises AD CS servers, NDES connectors and SCEP plumbing that most estates still run.',
    examples: ['Venafi', 'Keyfactor', 'DigiCert Trust Lifecycle', 'Entrust', 'SCEPman'],
    benchmarkPupm: 3,
    confidence: 'partial',
    quickAssess: false,
    coverage: e5Already,
    caveat:
      'New in the July 2026 packaging update: Cloud PKI is now in M365 E5. It targets certificates for Intune-managed devices — public TLS certificates, code-signing, server and workload identity, and anything on unmanaged or non-Intune endpoints stay with your existing CA or vendor, which is where most Venafi and Keyfactor spend actually sits.',
    talkTrack:
      'This is an infrastructure saving, not a licence saving. The money is in retiring AD CS servers, NDES connectors and the person who babysits them. Ask when their last certificate-expiry outage was; that story lands harder than the per-user figure.',
  },
  {
    id: 'password-manager',
    domain: 'identity',
    name: 'Enterprise password manager',
    whatItIs:
      'A vault where staff store credentials for applications that cannot use SSO, plus shared team secrets.',
    e7Component: 'Not included in Microsoft 365 E7',
    whyReplaced:
      'Broad SSO adoption via Entra ID materially shrinks the number of passwords staff need, but E7 does not ship an enterprise password vault. Expect this line to shrink, not disappear.',
    examples: ['1Password Business', 'Keeper', 'Bitwarden', 'LastPass', 'Dashlane'],
    benchmarkPupm: 6,
    confidence: 'partial',
    quickAssess: false,
    coverage: notCovered,
    caveat: 'Keep this budget. Included here so the assessment does not silently overstate savings.',
    talkTrack:
      'Say plainly that E7 does not include this. Entra covers workforce sign-in, not the shared vault marketing keeps in 1Password. Leaving this line fully intact is what makes every other claim on the page credible.',
  },

  // ══════════════════════════════════════════════════════════ ENDPOINT & DEVICE
  {
    id: 'uem',
    domain: 'endpoint',
    name: 'Unified endpoint management (MDM/MAM)',
    whatItIs:
      'Enrolling, configuring and securing laptops, desktops and mobile devices from the cloud — pushing policy, apps and compliance rules, and wiping lost devices.',
    e7Component: 'Microsoft Intune (Plan 2)',
    whyReplaced:
      'Intune manages Windows, macOS, iOS, Android and Linux from one console, with compliance state feeding directly into Entra conditional access. Since the July 2026 packaging update the E3 and E5 suites include Intune Plan 2, which adds Tunnel for MAM (app-level VPN on unmanaged devices), specialised device management for kiosks and shared devices, and firmware updates over the air — the capabilities that previously kept Workspace ONE and Ivanti in the estate.',
    examples: [
      'Omnissa Workspace ONE',
      'Jamf Pro',
      'Ivanti Neurons',
      'ManageEngine Endpoint Central',
      'Kandji',
    ],
    benchmarkPupm: 9,
    confidence: 'strong',
    quickAssess: true,
    coverage: e3Already,
    caveat:
      'Mac-heavy estates with deep Jamf tooling often retain it. Intune is strongest on Windows and mobile.',
    talkTrack:
      'Review the updated M365 E3/E5 Intune entitlement against the actual device requirements and tenant enablement. A feature addition may remove a blocker, but only a validated migration and cancellation plan supports savings.',
  },
  {
    id: 'patch-config',
    domain: 'endpoint',
    name: 'Patch & configuration management',
    whatItIs:
      'Keeping operating systems and third-party applications up to date and configured to a hardened baseline, with reporting on compliance drift.',
    e7Component: 'Intune + Windows Autopatch + Enterprise Application Management',
    whyReplaced:
      'Autopatch and Intune support Microsoft update and configuration workflows. Enterprise Application Management adds a hosted application catalog; validate each application and update workflow rather than assuming every third-party application auto-updates.',
    examples: ['Automox', 'Tanium', 'NinjaOne', 'Ivanti Neurons for Patch', 'PDQ Deploy'],
    benchmarkPupm: 5,
    confidence: 'strong',
    quickAssess: false,
    coverage: cov('unlocked', 'upgrade', 'already'),
    caveat:
      'The July 2026 packaging update puts Enterprise Application Management in M365 E5, not E3. M365 E3 has foundational patching; validate app catalog coverage and update workflows. Niche and in-house applications may still need packaging effort or a dedicated tool.',
    talkTrack:
      'Inventory every required application and update workflow. Enterprise Application Management is an E5 addition, and catalog availability alone is not proof of automatic patching or a cancellable third-party contract.',
  },
  {
    id: 'windows-vdi',
    domain: 'endpoint',
    name: 'Windows Enterprise & virtual desktop licensing',
    whatItIs:
      'Per-user licensing for Windows Enterprise edition and the entitlement to run virtualised Windows desktops.',
    e7Component: 'Windows 11 Enterprise E5',
    whyReplaced:
      'M365 E3 and above include Windows Enterprise per-user licensing and virtualisation rights, removing separate Windows licensing lines.',
    examples: ['Citrix DaaS', 'Omnissa Horizon', 'Amazon WorkSpaces', 'Windows VDA licences'],
    benchmarkPupm: 14,
    typicalAdoptionPct: 0.2,
    confidence: 'partial',
    quickAssess: false,
    coverage: e3Already,
    caveat:
      'This covers the Windows licence and virtualisation rights only — the VDI broker, and the compute it runs on, remain separate costs.',
    talkTrack:
      'Careful here. You are consolidating the Windows licence, not the VDI platform. If they run Citrix, the Citrix bill stays — what goes is the separate Windows VDA line. Say that before they say it to you.',
  },
  {
    id: 'remote-support',
    domain: 'endpoint',
    name: 'Remote support & remote control',
    whatItIs:
      'Letting the service desk see and take control of a user’s screen to fix a problem — session recording, file transfer, chat and consent prompts, without needing the user on the corporate network.',
    e7Component: 'Microsoft Intune Remote Help',
    whyReplaced:
      'Remote Help gives consent-based, role-scoped remote control launched from inside the Intune console, with device compliance and Entra identity verified on both sides of the session and no VPN required.',
    examples: [
      'TeamViewer',
      'LogMeIn Rescue',
      'BeyondTrust Remote Support',
      'Splashtop Enterprise',
      'RealVNC Connect',
    ],
    benchmarkPupm: 4,
    confidence: 'strong',
    quickAssess: false,
    coverage: e3Already,
    caveat:
      'The July 2026 packaging update moves Remote Help into M365 E3 and E5. Validate tenant rollout, platform, enrolment and consent/unattended requirements. Existing support invoices may serve external customers or workloads that the included capability does not replace.',
    talkTrack:
      'Ask which devices and support scenarios the invoice serves. Review the included Remote Help entitlement, run a pilot and record cancellation timing only for scope that the customer confirms can move.',
  },
  {
    id: 'dex',
    domain: 'endpoint',
    name: 'Digital employee experience / endpoint analytics',
    whatItIs:
      'Telemetry on how devices actually perform for real people — boot and login times, application crashes, battery and disk health — used to fix problems proactively before the service desk hears about them.',
    e7Component: 'Intune Advanced Analytics',
    whyReplaced:
      'Advanced Analytics adds device timelines, anomaly detection, enhanced device query and richer startup, application reliability and battery reporting on top of the Endpoint Analytics scores already in Intune.',
    examples: [
      'Nexthink',
      'Lakeside SysTrack',
      'ControlUp',
      '1E (Netskope)',
      'Riverbed Aternity',
    ],
    benchmarkPupm: 5,
    confidence: 'partial',
    quickAssess: false,
    coverage: e3Already,
    caveat:
      'The July 2026 packaging update adds Advanced Analytics to M365 E3 and E5. Validate the required reporting, remediation, sentiment and telemetry features; no complete equivalence to a mature DEX deployment is established here.',
    talkTrack:
      'Separate reporting, remediation and employee-experience workflows before comparing products. Ask the customer to validate the supported scope and retained cost rather than predicting a full dashboard-platform cancellation.',
  },
  {
    id: 'mobile-threat-defense',
    domain: 'endpoint',
    name: 'Mobile threat defence',
    whatItIs:
      'Detecting malicious apps, network attacks and phishing on iOS and Android devices, and feeding that risk signal into access decisions.',
    e7Component: 'Microsoft Defender for Endpoint (mobile)',
    whyReplaced:
      'Defender for Endpoint covers iOS and Android with app, network and web protection, and passes device risk into Intune compliance and Entra conditional access.',
    examples: ['Lookout Mobile Endpoint Security', 'Zimperium', 'Check Point Harmony Mobile', 'Ivanti Neurons for Mobile Threat Defense'],
    benchmarkPupm: 3,
    confidence: 'strong',
    quickAssess: false,
    coverage: cov('unlocked', 'upgrade', 'already'),
    talkTrack:
      'Defender covers mobile well enough for most estates, but if they are in a sector that mandates a dedicated MTD attestation, that requirement outranks your saving. Check the compliance driver before the price.',
  },

  // ══════════════════════════════════════════════════════════ THREAT PROTECTION
  {
    id: 'edr-xdr',
    domain: 'threat',
    name: 'Endpoint protection & EDR/XDR',
    whatItIs:
      'Next-generation antivirus plus endpoint detection and response — recording endpoint behaviour, detecting attacks, and giving analysts the ability to investigate and remediate.',
    e7Component: 'Microsoft Defender for Endpoint P2 (Defender XDR)',
    whyReplaced:
      'Defender for Endpoint P2 provides EDR, automated investigation and remediation, threat and vulnerability management, and correlates endpoint signal with identity, email and cloud app signal in Defender XDR.',
    examples: [
      'CrowdStrike Falcon',
      'SentinelOne Singularity',
      'Sophos Intercept X',
      'Palo Alto Cortex XDR',
      'Trend Vision One',
    ],
    benchmarkPupm: 9,
    confidence: 'strong',
    quickAssess: true,
    coverage: cov('unlocked', 'upgrade', 'already'),
    caveat:
      'M365 E3 already includes Defender for Endpoint P1, but P1 is not P2 EDR. Existing antivirus overlap is not proof that an incumbent EDR invoice is redundant. Validate SOC workflows and server licences separately before switching.',
    talkTrack:
      'An E5 licence provides a reason to evaluate Defender, not proof that CrowdStrike is redundant. Compare SOC workflows, server licensing and managed services before defining the retirement scope.',
  },
  {
    id: 'email-security',
    domain: 'threat',
    name: 'Email & collaboration security',
    whatItIs:
      'Filtering phishing, malware and business email compromise out of inbound mail, and scanning links and attachments shared in collaboration tools.',
    e7Component: 'Microsoft Defender for Office 365 P2',
    whyReplaced:
      'Defender for Office 365 provides Safe Links, Safe Attachments, anti-phishing with impersonation protection, automated investigation and response, and covers Teams, SharePoint and OneDrive as well as email.',
    examples: [
      'Proofpoint',
      'Mimecast',
      'Abnormal AI',
      'Barracuda Email Protection',
      'Cisco Secure Email',
    ],
    benchmarkPupm: 5,
    confidence: 'strong',
    quickAssess: true,
    coverage: cov('upgrade', 'upgrade', 'already'),
    caveat:
      'The July 2026 packaging update adds Defender for Office 365 P1 to both E3 tiers; E7 is a P1-to-P2 upgrade, not new baseline filtering. Validate response, investigation, simulation and retained gateway requirements. A second vendor can be an intentional defence-in-depth choice, not waste.',
    talkTrack:
      'The July 2026 change cuts both ways. E3 customers already hold Plan 1, so do not claim the full Proofpoint spend — but that also means they can act today rather than waiting for E7. Sell the audit now and the upgrade later.',
  },
  {
    id: 'itdr',
    domain: 'threat',
    name: 'Identity threat detection & response',
    whatItIs:
      'Watching Active Directory and cloud identity for attack techniques — credential theft, lateral movement, privilege escalation — that traditional endpoint tools miss.',
    e7Component: 'Microsoft Defender for Identity',
    whyReplaced:
      'Defender for Identity monitors on-premises AD and Entra ID for attack signals and feeds them into the same XDR incident graph as endpoint and email detections.',
    examples: ['CrowdStrike Falcon Identity Protection', 'Semperis', 'Silverfort', 'Quest Change Auditor'],
    benchmarkPupm: 5,
    confidence: 'strong',
    quickAssess: false,
    coverage: e5Already,
    caveat: 'AD backup, forest recovery and real-time authentication blocking remain specialist capabilities.',
    talkTrack:
      'Defender for Identity needs sensors on domain controllers to be worth anything. Ask whether they still run on-premises Active Directory — if they are fully cloud-native, this category matters less than the licence delta implies.',
  },
  {
    id: 'casb',
    domain: 'threat',
    name: 'SaaS security & CASB / shadow IT',
    whatItIs:
      'Discovering which cloud applications staff actually use, assessing their risk, and applying policy to sanctioned SaaS — including session-level controls.',
    e7Component: 'Microsoft Defender for Cloud Apps',
    whyReplaced:
      'Defender for Cloud Apps discovers shadow IT from network logs, scores app risk, connects to major SaaS via API for posture management, and enforces real-time session policies through conditional access app control.',
    examples: ['Netskope', 'Zscaler', 'Palo Alto Next-Gen CASB', 'AppOmni', 'Obsidian Security'],
    benchmarkPupm: 5,
    confidence: 'strong',
    quickAssess: false,
    coverage: e5Already,
    talkTrack:
      'Defender for Cloud Apps is strongest at discovery and Microsoft-adjacent SaaS governance. If their Netskope deployment is doing inline proxying for the whole internet, that is really the secure web gateway line, not this one. Do not count it twice.',
  },
  {
    id: 'vuln-mgmt',
    domain: 'threat',
    name: 'Vulnerability management',
    whatItIs:
      'Continuously finding unpatched software and misconfigurations across your estate, and prioritising what to fix first based on real risk.',
    e7Component: 'Microsoft Defender Vulnerability Management',
    whyReplaced:
      'Defender for Endpoint P2 includes core vulnerability management for supported onboarded endpoints. Premium vulnerability-management capabilities and other asset classes need a separate licensing and deployment review.',
    examples: ['Qualys VMDR', 'Tenable One', 'Rapid7 InsightVM', 'Ivanti Neurons for RBVM'],
    benchmarkPupm: 4,
    confidence: 'strong',
    quickAssess: false,
    coverage: e5Already,
    caveat:
      'Scanning unmanaged network devices, OT and external attack surface typically still needs a dedicated scanner. The premium MDVM add-on extends coverage further.',
    talkTrack:
      'Defender Vulnerability Management covers endpoints well. It does not cover network appliances, OT or external attack surface the way Qualys and Tenable do. Ask what is actually in scope for their scans before you claim the whole spend.',
  },
  {
    id: 'security-awareness',
    domain: 'threat',
    name: 'Security awareness & phishing simulation',
    whatItIs:
      'Running simulated phishing campaigns against staff and assigning training to those who fall for them, with reporting for auditors and boards.',
    e7Component: 'Attack Simulation Training in Defender for Office 365 P2',
    whyReplaced:
      'Attack Simulation Training runs realistic payload simulations against your own users, auto-assigns remedial training, and reports on repeat-offender rates natively in the Defender portal.',
    examples: ['KnowBe4', 'Proofpoint Security Awareness', 'Hoxhunt', 'Cofense', 'SANS Security Awareness'],
    benchmarkPupm: 2,
    confidence: 'strong',
    quickAssess: false,
    coverage: e5Already,
    caveat: 'Training content libraries are smaller than a dedicated awareness vendor’s catalogue.',
    talkTrack:
      'Attack Simulation Training is credible on phishing simulation and thin on training content. The usual landing point is that they keep a small content subscription and drop the simulation platform — price it that way rather than all-or-nothing.',
  },
  {
    id: 'siem-soar',
    domain: 'threat',
    name: 'SIEM & security orchestration (SOAR)',
    whatItIs:
      'Centralised log collection, correlation and long-term retention across the whole estate, with automated response playbooks for the SOC.',
    e7Component: 'Not included — Microsoft Sentinel is billed separately',
    whyReplaced:
      'Defender XDR correlates Microsoft-native signal and covers many SOC use cases, but it is not a SIEM. Microsoft Sentinel is priced on data ingestion and is not part of any M365 suite, including E7.',
    examples: ['Splunk Enterprise Security', 'Palo Alto Cortex XSIAM', 'Elastic Security', 'Sumo Logic', 'Exabeam'],
    benchmarkPupm: 0,
    confidence: 'partial',
    quickAssess: false,
    coverage: notCovered,
    caveat:
      'Keep this budget line. Defender XDR may reduce ingestion volume, but E7 does not replace a SIEM.',
    talkTrack:
      'Say this out loud early. Volunteering the exclusion buys credibility for every saving you do claim.',
  },
  {
    id: 'secops-ai',
    domain: 'threat',
    name: 'AI assistant for security operations',
    whatItIs:
      'An AI copilot for the SOC — summarising incidents, explaining suspicious scripts, drafting hunting queries and walking an analyst through an investigation in natural language.',
    e7Component: 'Microsoft Security Copilot',
    whyReplaced:
      'Security Copilot brings chat, promptbooks and agentic investigation into Defender, Entra, Intune and Purview, plus a standalone portal — covering phishing triage, incident summarisation, identity risk review and conditional access analysis.',
    examples: [
      'CrowdStrike Charlotte AI',
      'SentinelOne Purple AI',
      'Torq HyperSOC',
      'Dropzone AI',
      'Google SecOps (Gemini)',
    ],
    benchmarkPupm: 4,
    confidence: 'partial',
    quickAssess: false,
    coverage: e5Already,
    caveat:
      `Separate from the July 2026 pricing date, Security Copilot inclusion follows a phased tenant rollout. ${SECURITY_COPILOT_ALLOWANCE.summary} ${SECURITY_COPILOT_ALLOWANCE.conditions}`,
    talkTrack:
      'Validate tenant enablement, actual consumption, supported data sources and remaining services. An included monthly allowance is not permission to delete provisioned capacity or cancel the entire SOC AI invoice.',
  },

  // ══════════════════════════════════════════════════════════ DATA SECURITY & COMPLIANCE
  {
    id: 'dlp',
    domain: 'data',
    name: 'Data loss prevention (DLP)',
    whatItIs:
      'Detecting and blocking sensitive information — card numbers, health records, source code — from leaving the organisation via email, uploads, USB or chat.',
    e7Component: 'Microsoft Purview Data Loss Prevention',
    whyReplaced:
      'Purview DLP applies one policy set across Exchange, SharePoint, OneDrive, Teams, endpoints and browsers, using the same sensitive information types and labels as the rest of Purview.',
    examples: [
      'Forcepoint DLP',
      'Broadcom/Symantec DLP',
      'Fortra Digital Guardian',
      'Netskope DLP',
      'Nightfall AI',
    ],
    benchmarkPupm: 6,
    confidence: 'strong',
    quickAssess: true,
    coverage: cov('upgrade', 'upgrade', 'already'),
    caveat:
      'Network-level DLP for non-Microsoft egress paths is thinner than a dedicated network DLP appliance.',
    talkTrack:
      'Obtain the DLP policy inventory and required endpoint, browser and non-Microsoft coverage. Validate each enforcement path and any consumption charges before confirming a retirement amount.',
  },
  {
    id: 'info-protection',
    domain: 'data',
    name: 'Information protection, classification & labelling',
    whatItIs:
      'Tagging documents and emails by sensitivity, then enforcing encryption and usage rights that travel with the file wherever it goes.',
    e7Component: 'Microsoft Purview Information Protection',
    whyReplaced:
      'Sensitivity labels are built into Office apps natively, with automatic classification, encryption and rights management that persists outside your tenant.',
    examples: ['Fortra Titus', 'Fortra Boldon James', 'Seclore', 'Virtru', 'GetVisibility'],
    benchmarkPupm: 5,
    confidence: 'strong',
    quickAssess: false,
    coverage: cov('upgrade', 'upgrade', 'already'),
    talkTrack:
      'Labelling programmes fail on adoption, not licensing. If they already have a Titus taxonomy that people genuinely use, migrating it is a project cost. Show that cost next to the saving or the number will not survive scrutiny.',
  },
  {
    id: 'insider-risk',
    domain: 'data',
    name: 'Insider risk management',
    whatItIs:
      'Spotting risky behaviour by your own people — mass downloads before resignation, data staged to personal cloud storage — with privacy controls and HR workflow built in.',
    e7Component: 'Microsoft Purview Insider Risk Management',
    whyReplaced:
      'Purview correlates HR signals, endpoint activity and file actions into pseudonymised risk cases, with built-in investigation workflow and forensic evidence capture.',
    examples: ['Proofpoint ITM (ObserveIT)', 'DTEX InTERCEPT', 'Teramind', 'Everfox', 'Varonis'],
    benchmarkPupm: 6,
    confidence: 'strong',
    quickAssess: false,
    coverage: e5Already,
    talkTrack:
      'This is a works council and privacy conversation as much as a licensing one. In Germany, France or the Nordics, ask about employee representation before you build a business case on it.',
  },
  {
    id: 'ediscovery',
    domain: 'data',
    name: 'eDiscovery & legal hold',
    whatItIs:
      'Finding, preserving and exporting electronic evidence for litigation or regulatory investigations, with defensible chain of custody.',
    e7Component: 'Microsoft Purview eDiscovery (premium capabilities)',
    whyReplaced:
      'Purview eDiscovery handles custodian management, legal hold, advanced search, review sets, near-duplicate detection and export — in place, without first copying data out of the tenant.',
    examples: ['Relativity', 'Exterro', 'Nuix', 'DISCO', 'Reveal Logikcull', 'Onna'],
    benchmarkPupm: 6,
    confidence: 'strong',
    quickAssess: false,
    coverage: e5Already,
    caveat:
      'Large-scale review with contract-reviewer workflows and non-Microsoft data sources usually keeps a specialist review platform downstream.',
    talkTrack:
      'Legal owns this budget, not IT, which is exactly why it survives consolidation reviews. Get legal in the room. Purview handles Microsoft 365 content well; Relativity earns its keep on non-Microsoft sources and review workflow.',
  },
  {
    id: 'archiving-retention',
    domain: 'data',
    name: 'Archiving, retention & records management',
    whatItIs:
      'Keeping messages and documents for a regulator-mandated period in immutable storage, and disposing of them defensibly when the period expires.',
    e7Component: 'Microsoft Purview Data Lifecycle & Records Management',
    whyReplaced:
      'Purview applies retention and disposition policy in place across Exchange, SharePoint, OneDrive and Teams, with records declaration, immutability and disposition review.',
    examples: [
      'Arctera Enterprise Vault (formerly Veritas)',
      'OpenText',
      'Smarsh',
      'Global Relay',
      'Mimecast Archive',
      'Proofpoint Archive',
    ],
    benchmarkPupm: 7,
    confidence: 'strong',
    quickAssess: false,
    coverage: cov('upgrade', 'upgrade', 'already'),
    caveat:
      'Migrating a decade of legacy archive out of Enterprise Vault is a genuine project cost — model it in the migration assumption.',
    talkTrack:
      'The saving is real but migration is the obstacle. Twenty years of Enterprise Vault does not move over a weekend. Show the licence saving and the migration cost side by side, or you will lose the room the moment their archivist speaks.',
  },
  {
    id: 'comms-compliance',
    domain: 'data',
    name: 'Communication compliance & supervision',
    whatItIs:
      'Reviewing employee communications for regulatory breaches, market abuse, harassment or conduct risk — a hard requirement in financial services.',
    e7Component: 'Microsoft Purview Communication Compliance',
    whyReplaced:
      'Purview monitors Teams, Exchange and connected third-party channels against classifiers for conduct and regulatory risk, with reviewer workflow and escalation.',
    examples: ['Smarsh', 'Global Relay', 'Behavox', 'Theta Lake', 'Shield'],
    benchmarkPupm: 9,
    confidence: 'strong',
    quickAssess: false,
    coverage: e5Already,
    caveat:
      'Capturing non-Microsoft channels — WhatsApp, Bloomberg chat, voice — needs third-party connectors that are often still paid for.',
    talkTrack:
      'In regulated financial services this is a supervision obligation, not a feature. Smarsh and Global Relay hold years of surveillance archive and regulator-accepted workflow. Position Purview for the Teams and Exchange channels, not as a wholesale replacement.',
  },
  {
    id: 'data-catalog',
    domain: 'data',
    name: 'Data governance & catalogue',
    whatItIs:
      'Cataloguing where data lives across the estate, who owns it, what it means, and tracking its lineage through pipelines and reports.',
    e7Component: 'Not included — Microsoft Purview Data Governance is pay-as-you-go',
    whyReplaced:
      'Microsoft Purview Unified Catalog and data health capabilities use Azure pay-as-you-go billing. The E7 suite does not fund a catalog-platform replacement, so no retirement credit is modeled.',
    examples: ['Collibra', 'Alation', 'Informatica', 'Atlan', 'data.world'],
    benchmarkPupm: 3,
    confidence: 'partial',
    quickAssess: false,
    coverage: notCovered,
    caveat:
      'Governed assets and data health processing are separately metered. Some scanning can be free under specific conditions, but that is not a suite-funded replacement for an enterprise governance platform.',
    talkTrack:
      'Keep this budget: Purview Data Governance is not included as a suite-funded replacement. Any separate platform proposal needs its own Azure consumption, implementation and functional comparison.',
  },
  {
    id: 'compliance-posture',
    domain: 'data',
    name: 'Compliance posture & audit management',
    whatItIs:
      'Tracking your control implementation against frameworks like ISO 27001, SOC 2 and NIST, and producing evidence for auditors.',
    e7Component: 'Microsoft Purview Compliance Manager',
    whyReplaced:
      'Compliance Manager maps your Microsoft 365 configuration to control frameworks, scores posture and produces improvement actions with evidence collection.',
    examples: ['Vanta', 'Drata', 'OneTrust', 'LogicGate', 'ServiceNow IRM'],
    benchmarkPupm: 6,
    confidence: 'partial',
    quickAssess: false,
    coverage: cov('upgrade', 'upgrade', 'already'),
    caveat:
      'Only assesses your Microsoft estate. Organisations needing auditor-ready evidence across AWS, HR and finance systems will keep a dedicated GRC tool.',
    talkTrack:
      'Compliance Manager is good at Microsoft-scope evidence and weak at the vendor questionnaires and SOC 2 automation that Vanta and Drata are bought for. Expect a partial, and say so before their compliance lead does.',
  },

  // ══════════════════════════════════════════════════════════ COMMUNICATION & COLLABORATION
  {
    id: 'video-meetings',
    domain: 'comms',
    name: 'Video meetings & conferencing platform',
    whatItIs:
      'The platform staff use for video calls, screen sharing and webinars. Frequently duplicated: organisations standardise on Teams but keep a Zoom estate alive for years.',
    e7Component: 'Microsoft Teams',
    whyReplaced:
      'The modeled with-Teams variants include Teams meetings. A parallel platform may serve specific external, event, accessibility or integration requirements; evaluate those before confirming retirement.',
    examples: ['Zoom Workplace', 'Cisco Webex', 'Google Meet', 'GoTo Meeting', 'Zoho Meeting'],
    benchmarkPupm: 15,
    confidence: 'strong',
    quickAssess: false,
    coverage: allAlready,
    caveat:
      TEAMS_VARIANT_CONDITION,
    talkTrack:
      'Confirm the purchased Teams variant and the workloads each meeting platform serves. Include only seats the customer confirms can move, and account for migration, external participants and contract timing.',
  },
  {
    id: 'ucaas-telephony',
    domain: 'comms',
    name: 'Cloud telephony / PBX (UCaaS)',
    whatItIs:
      'Business phone service — extensions, call queues, auto attendants and PSTN connectivity — delivered from the cloud.',
    e7Component: 'Microsoft Teams Phone Standard',
    whyReplaced:
      'Teams Phone provides the cloud PBX with call queues, auto attendants and voicemail natively in Teams, connected to the PSTN via a calling plan, operator connect or direct routing.',
    examples: ['RingCentral', '8x8', 'Zoom Phone', 'Dialpad', 'Vonage', 'Cisco Webex Calling'],
    benchmarkPupm: 22,
    confidence: 'strong',
    quickAssess: true,
    coverage: e5Already,
    caveat:
      'The PSTN calling plan is always a separate cost. Contact-centre and compliance-recording features are not covered by Teams Phone alone.',
    talkTrack:
      'Teams Phone Standard is the licence, not the minutes. They still buy calling plans, Operator Connect or direct routing on top. Quote the licence saving and name the call cost in the same breath, every time.',
  },
  {
    id: 'audio-conferencing',
    domain: 'comms',
    name: 'Audio conferencing & dial-in',
    whatItIs:
      'Dial-in numbers so participants can join meetings by phone when they have no data connection.',
    e7Component: 'Microsoft Teams Audio Conferencing',
    whyReplaced: 'Included with Teams meetings, with dial-in numbers across a wide set of countries.',
    examples: ['Zoom Audio Conferencing', 'Webex Audio', 'GoTo Meeting audio', 'Dialpad Meetings'],
    benchmarkPupm: 4,
    confidence: 'full',
    quickAssess: false,
    coverage: allAlready,
    talkTrack:
      'Check assigned conferencing licences and regional dial-in, dial-out and toll-free allowances. An invoice may fund usage that is not included; do not label it overspend solely because the customer owns Teams.',
  },
  {
    id: 'webinars-events',
    domain: 'comms',
    name: 'Webinars & virtual events',
    whatItIs:
      'Running large broadcast-style events with registration pages, attendee analytics and production controls.',
    e7Component: 'Teams Webinars and Town Hall',
    whyReplaced:
      'Teams offers webinars and town halls. Confirm the current core/Premium feature split, tenant rollout and capacity limits for the event workload; this audit has not independently verified the detailed 2026 event packaging.',
    examples: ['ON24', 'Zoom Events', 'GoTo Webinar', 'RingCentral Events', 'Bizzabo'],
    benchmarkPupm: 3,
    confidence: 'partial',
    quickAssess: false,
    coverage: allUpgrade,
    caveat:
      'Marketing events with lead scoring and CRM integration may need a dedicated platform. Capacity, production features and attendee add-ons require current licence validation.',
    talkTrack:
      'Teams Town Hall covers internal all-hands well. It does not do the registration funnels, lead scoring and CRM integration that marketing buys ON24 for. Ask who owns the budget — if it is marketing, expect to keep it.',
  },
  {
    id: 'file-storage',
    domain: 'comms',
    name: 'Cloud file storage & sharing',
    whatItIs:
      'Where corporate documents live and how they are shared internally and with external parties, with versioning and access control.',
    e7Component: 'OneDrive for Business + SharePoint Online',
    whyReplaced:
      'Every suite in this assessment already includes 1 TB+ per user of OneDrive plus SharePoint, with external sharing, versioning, sensitivity labels and DLP applied.',
    examples: ['Box', 'Dropbox Business', 'Egnyte', 'ShareFile', 'Google Drive'],
    benchmarkPupm: 20,
    confidence: 'strong',
    quickAssess: false,
    coverage: allAlready,
    caveat:
      'Regulated industries sometimes require a separately governed external-sharing platform. Content migration is a real project.',
    talkTrack:
      'An included storage allowance is not proof that Box or Dropbox is redundant. Review external sharing, governance, capacity and migration with the teams who use it before confirming any cancellation.',
  },
  {
    id: 'whiteboarding',
    domain: 'comms',
    name: 'Digital whiteboarding & visual collaboration',
    whatItIs:
      'Infinite-canvas boards for workshops, brainstorming, diagramming and planning — used heavily by product, design and agile teams.',
    e7Component: 'Microsoft Whiteboard + Microsoft Loop',
    whyReplaced:
      'Whiteboard covers workshop and brainstorming use inside Teams meetings; Loop covers live collaborative components and pages.',
    examples: ['Miro', 'Mural', 'Figma FigJam', 'Lucidspark'],
    benchmarkPupm: 12,
    confidence: 'partial',
    quickAssess: false,
    coverage: allAlready,
    caveat:
      'Design and product teams with deep Miro or FigJam template libraries will resist this, and often for good reason. Expect partial displacement at best.',
    talkTrack:
      'Miro survives on adoption, not features. Whiteboard is already paid for, so the real question is whether design and product teams will switch. Usually the answer is no for those teams and yes for everyone else — price the everyone else.',
  },
  {
    id: 'intranet-ex',
    domain: 'comms',
    name: 'Intranet & employee experience',
    whatItIs:
      'The company intranet — news, policies, org announcements — plus employee engagement and communication tooling, especially for frontline staff.',
    e7Component: 'SharePoint + Viva Connections and Viva Engage',
    whyReplaced:
      'SharePoint communication sites with Viva Connections deliver a modern intranet surfaced directly inside Teams, and Viva Engage covers social and leadership communication.',
    examples: ['Simpplr', 'Staffbase', 'Firstup', 'Workvivo', 'Unily'],
    benchmarkPupm: 5,
    confidence: 'partial',
    quickAssess: false,
    coverage: allAlready,
    caveat:
      'The full Viva Suite — Glint and Viva Learning — is a separate add-on and is not included in E7. (Viva Goals was retired on 31 December 2025.)',
    talkTrack:
      'SharePoint plus Viva is already paid for. Simpplr and Staffbase win because someone still has to build and run the intranet. Position this saving as licence-only and attach an honest internal effort cost.',
  },
  {
    id: 'saas-backup',
    domain: 'data',
    name: 'Microsoft 365 backup & recovery',
    whatItIs:
      'Independent backup of Exchange, SharePoint, OneDrive and Teams data, with point-in-time restore and retention beyond what the tenant itself keeps. Bought to cover ransomware, malicious deletion and long-horizon legal recovery.',
    e7Component: 'Not included in Microsoft 365 E7',
    whyReplaced:
      'Retention and recycle-bin policies are not backup, and E7 changes nothing here. Microsoft 365 Backup exists but is a pay-as-you-go Azure service billed per gigabyte, entirely separate from the suite.',
    examples: ['Veeam Backup for Microsoft 365', 'AvePoint Cloud Backup', 'Druva', 'Rubrik', 'Keepit'],
    benchmarkPupm: 3.5,
    confidence: 'partial',
    quickAssess: false,
    coverage: notCovered,
    caveat:
      'Keep this budget. Microsoft 365 Backup is charged at roughly $0.15/GB/month on an Azure subscription and is not bundled into E5 or E7.',
    talkTrack:
      'Worth raising unprompted. Customers often assume a move up the suite ladder covers backup — it does not, and saying so early buys credibility for the savings you do claim.',
  },
  {
    id: 'team-chat',
    domain: 'comms',
    name: 'Persistent team chat',
    whatItIs:
      'Channel-based messaging where work conversation lives — threads, direct messages, file sharing and app integrations. Commonly runs in parallel with Teams for years after a Microsoft standardisation.',
    e7Component: 'Microsoft Teams',
    whyReplaced:
      'Teams chat and channels are included in the modeled with-Teams variants. Evaluate specialist integrations and external collaboration before treating another platform as replaceable.',
    examples: ['Slack', 'Google Chat', 'Mattermost', 'Rocket.Chat', 'Discord'],
    benchmarkPupm: 12,
    confidence: 'strong',
    quickAssess: false,
    coverage: allAlready,
    caveat:
      `${TEAMS_VARIANT_CONDITION} Engineering integrations and external-partner channels need a migration and federation review.`,
    talkTrack:
      'Ask who is still on Slack and why. The usual answer is engineering culture rather than capability — which makes it a change-management conversation, not a licensing one.',
  },
  {
    id: 'wiki-knowledge',
    domain: 'comms',
    name: 'Wiki & collaborative documentation',
    whatItIs:
      'Structured internal documentation — runbooks, product specs, onboarding guides and meeting notes — with wiki-style linking and shared editing.',
    e7Component: 'SharePoint, Loop and OneNote (with Copilot retrieval in E7)',
    whyReplaced:
      'SharePoint pages, Loop components and OneNote cover the documentation surface, and Copilot in E7 makes that content retrievable conversationally, which is much of why teams adopt a separate wiki.',
    examples: ['Notion', 'Atlassian Confluence', 'Guru', 'Slab', 'Coda'],
    benchmarkPupm: 12,
    confidence: 'partial',
    quickAssess: false,
    coverage: allAlready,
    caveat:
      'Confluence tied to Jira workflows is rarely displaced, and Notion databases used as lightweight applications have no clean Microsoft equivalent. Expect this line to shrink rather than disappear.',
    talkTrack:
      'Engineering teams rarely give up Confluence or Notion, and pushing it damages your credibility elsewhere. Target the departmental Notion subscriptions finance cannot even attribute to a team.',
  },
  {
    id: 'esignature',
    domain: 'comms',
    name: 'Electronic signature',
    whatItIs:
      'Legally binding electronic signing of contracts, with audit trail, templates and signer authentication.',
    e7Component: 'Not included in Microsoft 365 E7',
    whyReplaced:
      'There is no e-signature capability in E7. This budget stays exactly where it is.',
    examples: ['DocuSign', 'Adobe Acrobat Sign', 'Dropbox Sign', 'PandaDoc'],
    benchmarkPupm: 30,
    typicalAdoptionPct: 0.25,
    confidence: 'partial',
    quickAssess: false,
    coverage: notCovered,
    caveat: 'Listed so the assessment does not silently overstate what consolidates.',
    talkTrack:
      'E7 does not include e-signature. Say it early. It is often one of the larger third-party lines on the page, and volunteering it is precisely what makes the rest of your numbers believable.',
  },
  {
    id: 'contact-center',
    domain: 'comms',
    name: 'Contact centre (CCaaS)',
    whatItIs:
      'Omnichannel customer contact — routing, IVR, agent desktops, workforce management and call recording for customer service teams.',
    e7Component: 'Not included — Teams Phone is not a contact centre',
    whyReplaced:
      'Teams Phone provides business telephony, not contact-centre routing and workforce management. Certified CCaaS vendors integrate with Teams but remain separately licensed.',
    examples: ['Genesys Cloud', 'Five9', 'NICE CXone Mpower', 'Amazon Connect', 'Talkdesk'],
    benchmarkPupm: 0,
    confidence: 'partial',
    quickAssess: false,
    coverage: notCovered,
    caveat:
      'Only licensed for agents, not all staff — enter the agent count rather than total seats if you record spend here.',
    talkTrack:
      'Teams Phone has call queues, but is not a full contact centre with workforce management and omnichannel routing. Name the exclusion and keep CCaaS costs separate from the PBX licence comparison.',
  },

  // ══════════════════════════════════════════════════════════ ANALYTICS & AUTOMATION
  {
    id: 'business-intelligence',
    domain: 'analytics',
    name: 'Business intelligence & dashboards',
    whatItIs:
      'Self-service reporting and dashboards over business data, published to a wide internal audience.',
    e7Component: 'Power BI Pro',
    whyReplaced:
      'Power BI Pro is included from M365 E5 upward, covering authoring, publishing and consumption of reports with row-level security and Microsoft 365 governance.',
    examples: ['Tableau', 'Qlik Sense', 'Google Looker', 'Domo', 'Sisense', 'ThoughtSpot'],
    benchmarkPupm: 25,
    typicalAdoptionPct: 0.35,
    confidence: 'strong',
    quickAssess: true,
    coverage: e5Already,
    caveat:
      'Very large models or high-concurrency deployments need Power BI Premium/Fabric capacity, which is priced separately.',
    talkTrack:
      'Power BI Pro is per user, so this scales with their Tableau licence mix. Get the split — Creators are expensive and few, Viewers are cheap and many, and that ratio decides whether this is a headline line or a footnote.',
  },
  {
    id: 'workflow-automation',
    domain: 'analytics',
    name: 'Workflow automation & integration (iPaaS)',
    whatItIs:
      'Connecting applications so that an action in one triggers work in another, without custom code.',
    e7Component: 'Power Automate seeded rights — already in your current suite',
    whyReplaced:
      'Seeded Power Automate rights cover cloud flows on standard connectors across Microsoft 365, which handles a large share of everyday departmental automation. Those rights are identical in Office 365 E3, Microsoft 365 E3, E5 and E7 — so this overlap exists today and E7 does not change it.',
    examples: ['Zapier', 'Workato', 'Tray.ai', 'Nintex', 'Make'],
    benchmarkPupm: 15,
    typicalAdoptionPct: 0.25,
    confidence: 'partial',
    quickAssess: false,
    coverage: allAlready,
    caveat:
      'Power Platform seeded rights do not tier with your suite: E7 adds no Power Automate entitlement over O365 E3, M365 E3 or E5. Premium connectors, Dataverse and higher API limits need Power Automate Premium, a separate purchase at every tier including E7.',
    talkTrack:
      'Compare the current flow inventory with seeded rights; there is no new E7 premium entitlement here. Confirm connectors, limits and support needs before treating an existing automation invoice as replaceable.',
  },
  {
    id: 'rpa',
    domain: 'analytics',
    name: 'Robotic process automation (RPA)',
    whatItIs:
      'Software robots that drive legacy user interfaces to automate repetitive work where no API exists.',
    e7Component: 'Not covered — Power Automate Premium is a separate purchase',
    whyReplaced:
      'No Microsoft 365 suite licenses organisational RPA. Attended desktop flows are free with Windows 10 and 11 rather than with your suite, and unattended bots need Power Automate Premium plus an unattended add-on. None of that changes when you move to E7.',
    examples: ['UiPath', 'Automation Anywhere', 'SS&C Blue Prism', 'Nintex RPA'],
    benchmarkPupm: 0,
    confidence: 'partial',
    quickAssess: false,
    coverage: notCovered,
    caveat:
      'Attended Power Automate for desktop is free with Windows, so some individual automation can move at no licence cost — but that is already true today, with or without E7. Treat RPA spend as unaffected by this decision.',
    talkTrack:
      'Do not put their UiPath number in the savings column. E7 adds no RPA entitlement, and claiming it is the fastest way to lose the room when their automation lead speaks up. The honest play is the reverse: name RPA as out of scope before they do, then point at attended desktop flows on Windows as a way to slow new bot licence growth.',
  },
  {
    id: 'lowcode',
    domain: 'analytics',
    name: 'Low-code application platform',
    whatItIs:
      'Building internal business applications with minimal code — forms over data, approval apps, departmental tools.',
    e7Component: 'Power Apps seeded rights — already in your current suite',
    whyReplaced:
      'Seeded Power Apps rights let staff build canvas apps over Microsoft 365 data and standard connectors, covering a large share of internal app demand. Those rights are the same in Office 365 E3, Microsoft 365 E3, E5 and E7, so the overlap exists today.',
    examples: ['OutSystems', 'Mendix', 'Appian', 'Retool', 'Airtable'],
    benchmarkPupm: 25,
    typicalAdoptionPct: 0.2,
    confidence: 'partial',
    quickAssess: false,
    coverage: allAlready,
    caveat:
      'E7 adds no Power Apps entitlement over O365 E3, M365 E3 or E5. Apps needing Dataverse, premium connectors or model-driven experiences require Power Apps Premium at every tier.',
    talkTrack:
      'Evaluate existing seeded rights separately from E7. Premium connectors, Dataverse, governance and application needs can justify a separate platform; confirm the exact scope before claiming retirement.',
  },
  {
    id: 'forms-surveys',
    domain: 'analytics',
    name: 'Forms & surveys',
    whatItIs: 'Collecting structured input from staff or customers — surveys, quizzes, request forms.',
    e7Component: 'Microsoft Forms',
    whyReplaced:
      'Forms is included in every Microsoft 365 suite and covers internal surveys, quizzes and simple request capture.',
    examples: ['SurveyMonkey', 'Typeform', 'Qualtrics', 'Alchemer'],
    benchmarkPupm: 25,
    typicalAdoptionPct: 0.15,
    confidence: 'partial',
    quickAssess: false,
    coverage: allAlready,
    caveat:
      'Advanced experience-management platforms like Qualtrics do far more than forms — do not assume a clean swap.',
    talkTrack:
      'Microsoft Forms is fine for internal surveys and nowhere near Qualtrics for research or customer experience programmes. If the budget sits with HR or CX, expect it to stay where it is.',
  },
  {
    id: 'project-management',
    domain: 'analytics',
    name: 'Project & work management',
    whatItIs:
      'Tracking tasks, sprints, dependencies and portfolios across teams, with boards, timelines and reporting.',
    e7Component: 'Microsoft Planner basic — Premium is separately licensed',
    whyReplaced:
      'Planner in Teams covers team-level task and work management, with Planner Premium available for scheduling and resource management.',
    examples: ['Asana', 'Monday.com', 'Smartsheet', 'Wrike', 'Atlassian Jira'],
    benchmarkPupm: 16,
    typicalAdoptionPct: 0.3,
    confidence: 'partial',
    quickAssess: false,
    coverage: allAlready,
    caveat:
      'Portfolio management and engineering workflow (Jira) are not realistically displaced. Planner and Project Plan 3/5 licences are sold separately from E7.',
    talkTrack:
      'Planner covers task and basic project work, and Planner Premium adds real scheduling. What it does not do is the portfolio and resource management that Smartsheet and Asana Enterprise are bought for. Ask what they actually run in the tool.',
  },
];

// ─────────────────────────────────────────────────────────────── helpers

export const CATEGORIES: Category[] = CATEGORY_RECORDS.map((category) => ({
  requiresConfirmation: true,
  ...category,
}));

export const QUICK_ASSESS_CATEGORIES = CATEGORIES.filter((c) => c.quickAssess);

export function categoriesByDomain(domain: DomainId): Category[] {
  return CATEGORIES.filter((c) => c.domain === domain);
}

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getDomain(id: DomainId): Domain {
  const d = DOMAINS.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown domain: ${id}`);
  return d;
}
