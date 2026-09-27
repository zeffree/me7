import type { DomainId } from './categories';
import { SECURITY_COPILOT_ALLOWANCE } from './sources';
import type { EvidenceStatus } from './sources';

/**
 * Seller mode's content layer.
 *
 * Discovery prompts are hypotheses, not verified comparative product claims.
 * Validate actual workloads, invoices and customer assumptions before presenting savings.
 */

export interface Battlecard {
  /** Matched case-insensitively against the vendor string the user typed. */
  match: RegExp;
  vendor: string;
  /** The Microsoft capability that competes. */
  counter: string;
  /** Where the consolidation argument is strongest. */
  wedge: string;
  /** Where the incumbent is genuinely better. Say this out loud. */
  theyWin: string;
  /** The overclaim that gets a seller caught. */
  trap: string;
  sourceIds?: string[];
  evidenceStatus?: EvidenceStatus;
}

const BATTLECARD_RECORDS: Battlecard[] = [
  {
    match: /crowdstrike|falcon/i,
    vendor: 'CrowdStrike',
    counter: 'Microsoft Defender for Endpoint P2',
    wedge:
      'If the customer licenses Defender in E5/E7, evaluate whether its required endpoint workloads could move. Do not assume Defender is deployed or that a separate endpoint invoice is redundant.',
    theyWin:
      'Threat hunting workflow, Linux and legacy OS coverage, and a SOC team already fluent in the console. Falcon Complete is a managed service Microsoft does not directly replicate.',
    trap:
      'Do not claim a like-for-like swap for a mature SOC. Propose a coexistence period and a measured cutover on a defined workload. This model assumes full replacement; it is not a prediction that every operational requirement will migrate.',
  },
  {
    match: /okta|ping identity|pingone|jumpcloud|duo/i,
    vendor: 'Okta / Ping / Duo',
    counter: 'Microsoft Entra ID P2 + Entra Suite',
    wedge:
      'Review the identity architecture and purchased Entra plan. A second provider may support required applications, customer identity or resilience; existing suite ownership alone does not establish double payment.',
    theyWin:
      'Deep non-Microsoft SaaS integration catalogues, customer identity (CIAM), and organisations with a deliberate multi-cloud, vendor-neutral identity strategy.',
    trap:
      'Migration is a project, not a switch. App-by-app re-federation, legacy SAML apps and MFA re-enrolment are real cost and real elapsed time. Validate the long tail before relying on the full-replacement scenario, and model a realistic savings delay.',
  },
  {
    match: /zscaler|netskope|palo alto|prisma|cloudflare|umbrella|forcepoint/i,
    vendor: 'Zscaler / Netskope / Prisma',
    counter: 'Microsoft Entra Private Access and Internet Access (Global Secure Access)',
    wedge:
      'Full Entra Suite is included in E7 but only partially in E5 — this is one of the clearest net-new entitlements in the upgrade, and it lands against a large, visible annual contract.',
    theyWin:
      'Global PoP footprint and latency, mature SD-WAN and branch integration, and depth of inline inspection policy built over years.',
    trap:
      'Global Secure Access is the newest of the capabilities in this model. Scope a pilot on remote access before proposing a full SWG displacement, and do not imply feature parity with a tuned Zscaler estate.',
  },
  {
    match: /proofpoint|mimecast|abnormal|barracuda|ironscales/i,
    vendor: 'Proofpoint / Mimecast / Abnormal',
    counter: 'Microsoft Defender for Office 365 P2',
    wedge:
      'Compare actual filtering and response requirements with the purchased Defender plan. A second gateway may be an intentional defence-in-depth control, so validate the security design before proposing retirement.',
    theyWin:
      'Abnormal in particular on behavioural BEC detection; Proofpoint on granular DLP for mail and on very large, heavily-tuned rule estates.',
    trap:
      'Never propose removing a mail gateway without a parallel-run measurement period. Miss rate is the one metric a security team will not accept on trust.',
  },
  {
    match: /splunk|qradar|arcsight|sumo logic|exabeam|chronicle/i,
    vendor: 'Splunk / QRadar',
    counter: 'Microsoft Sentinel — priced separately, NOT included in E7',
    wedge:
      'There is no included SIEM licence saving. A separate Sentinel evaluation needs measured ingestion, retention, connectors, automation and operating costs; do not infer savings from the E7 bundle.',
    theyWin:
      'Everything about a mature SIEM: content library, custom parsers, years of tuned detections, and non-security observability use cases.',
    trap:
      'SIEM is in the "not covered" panel for a reason. Claiming E7 absorbs it is the single fastest way to lose a security buyer. Volunteer the exclusion first.',
  },
  {
    match: /chatgpt|openai|anthropic|claude|gemini|glean|writer\.com/i,
    vendor: 'ChatGPT Enterprise / Gemini / Glean',
    counter: 'Microsoft 365 Copilot, included in E7',
    wedge:
      'Copilot inclusion creates an evaluation opportunity. Compare the actual assistant invoice, adoption and retained specialist/API use before claiming any offset to the E7 upgrade.',
    theyWin:
      'Raw model choice and speed of frontier-model access, developer-facing tooling, and connectors into non-Microsoft content where the user works all day outside Office.',
    trap:
      'Copilot grounds in Microsoft Graph. If their knowledge lives in Confluence, Slack or Google Drive, the grounding story is weaker and a Glean-style layer may genuinely survive. Ask where the content is before you claim the seat.',
  },
  {
    match: /tableau|qlik|looker|domo|sisense|thoughtspot/i,
    vendor: 'Tableau / Qlik / Looker',
    counter: 'Power BI Pro, included in the suite',
    wedge:
      'Power BI Pro is a relevant E5/E7 entitlement. Review viewers, authors, report migration and required capacity before confirming replaceable seats; owning both products is not proof of duplicate spend.',
    theyWin:
      'Analyst affinity and visual grammar, and genuinely large or complex extract-based models. Analysts do not switch tools quietly.',
    trap:
      'Split viewers from authors before quoting a number. Proposing to move 40 senior analysts is a fight; proposing to move 4,000 viewers is a budget line.',
  },
  {
    match: /\bbox\b|dropbox|egnyte|syncplicity/i,
    vendor: 'Box / Dropbox Business',
    counter: 'OneDrive and SharePoint, already included',
    wedge:
      'Review included storage alongside external collaboration, governance, quotas and workflows. A separate platform may be justified; confirm the scope and migration effort before cancelling it.',
    theyWin:
      'External collaboration UX, and industry-specific governance workflows (Box Shield, Box Sign) embedded in regulated processes.',
    trap:
      'Content migration and re-permissioning is the real cost. Quote the tooling and elapsed time, not just the licence delta.',
  },
  {
    match: /sailpoint|saviynt|omada|one identity/i,
    vendor: 'SailPoint / Saviynt',
    counter: 'Microsoft Entra ID Governance',
    wedge:
      'For access reviews, lifecycle workflows and entitlement management on Microsoft-centric estates, this is included and already integrated with the directory of record.',
    theyWin:
      'Breadth of connectors into mainframe, on-premises and long-tail enterprise applications, and separation-of-duties modelling for regulated industries.',
    trap:
      'If their governance scope is SAP, mainframe or bespoke line-of-business apps, this is a partial overlap at best. Score it accordingly rather than claiming the whole contract.',
  },
  {
    match: /cyberark|beyondtrust|delinea|thycotic|hashicorp vault/i,
    vendor: 'CyberArk / BeyondTrust / Delinea',
    counter: 'Entra Privileged Identity Management + Intune Endpoint Privilege Management',
    sourceIds: ['permissions-management-retirement', 'm365-packaging-2026'],
    evidenceStatus: 'conditional',
    wedge:
      'Evaluate Entra/Azure role elevation and eligible Windows endpoint elevation only. Entra Permissions Management retired on October 1, 2025; no multicloud CIEM entitlement is claimed in E7.',
    theyWin:
      'Credential vaulting, session recording, and privileged access to on-premises and OT systems. This is a genuinely different product category.',
    trap:
      'PIM is not a vault or a replacement for retired multicloud CIEM. Credential vaulting, session recording, servers and OT remain separate; validate the module-level retirement scope.',
  },
  {
    match: /jamf|workspace one|airwatch|ivanti|kandji|mosyle/i,
    vendor: 'Jamf / Workspace ONE',
    counter: 'Microsoft Intune, plus the Intune Suite capabilities',
    wedge:
      'Check the purchased Intune plan and actual device population. A second UEM may cover different devices or required features; validate enrolment and workload parity before claiming retirement.',
    theyWin:
      'Jamf on same-day macOS and iOS feature support, and on Apple-first organisations where Mac admins have deep tooling investment.',
    trap:
      'Do not assume Jamf can be displaced in a design or engineering org. Test the Mac-specific workflows explicitly; a full-replacement scenario overstates savings if the specialist platform must remain.',
  },
  {
    match: /knowbe4|hoxhunt|cofense|proofpoint security awareness|ninjio/i,
    vendor: 'KnowBe4 / Hoxhunt',
    counter: 'Microsoft Defender Attack Simulation Training',
    wedge:
      'Compare the required simulations, training content, languages and audit evidence with the included Defender plan. A small invoice is not automatically a cancellable one.',
    theyWin:
      'Content library depth, localisation, and reporting that compliance teams have already built audit evidence around.',
    trap:
      'Compliance teams often need specific certified content. Confirm the audit requirement before assuming the contract lapses.',
  },
  {
    match: /ringcentral|8x8|zoom phone|dialpad|vonage|mitel|avaya/i,
    vendor: 'RingCentral / 8x8 / Zoom Phone',
    counter: 'Microsoft Teams Phone — licence included, calling plans are not',
    wedge:
      'The Teams Phone system licence is in the suite. The consolidation is real, but only on the platform layer.',
    theyWin:
      'Contact centre depth, carrier relationships and international number estates, and analogue or legacy PSTN edge cases.',
    trap:
      'Calling plans and PSTN minutes are a separate cost and are flagged as not covered in this model. Quoting a full UCaaS displacement without the calling plan back in is the classic mistake.',
  },
  {
    match: /qualys|tenable|rapid7|nessus/i,
    vendor: 'Qualys / Tenable / Rapid7',
    counter: 'Microsoft Defender Vulnerability Management',
    wedge:
      'If Defender is deployed, evaluate core endpoint vulnerability coverage against the current scanner scope. Premium features, unmanaged assets, servers and network scanning may remain separately licensed.',
    theyWin:
      'Unauthenticated network scanning, OT and unmanaged asset discovery, and compliance scanning against specific benchmark standards.',
    trap:
      'Defender VM sees managed endpoints. If their scope is the network and unmanaged estate, this is a partial overlap, not a replacement.',
  },
  {
    match: /relativity|exterro|nuix|disco|everlaw|logikcull/i,
    vendor: 'Relativity / Exterro / Nuix',
    counter: 'Microsoft Purview eDiscovery Premium',
    wedge:
      'Evaluate in-place collection for Microsoft 365 sources. Measure the customer data mix and required legal review workflow rather than assuming most volume can stay inside Purview.',
    theyWin:
      'Review workflow, analytics and processing at scale, plus data from outside Microsoft 365. Legal teams and outside counsel are deeply committed to their review platform.',
    trap:
      'Purview handles collection and early case assessment well; it is not a full review platform. Position it as reducing what gets exported, not as replacing the law firm\u2019s tooling.',
  },
  {
    match: /docusign|adobe sign|hellosign|dropbox sign|pandadoc/i,
    vendor: 'DocuSign / Adobe Sign',
    counter: 'No direct E7 equivalent',
    wedge:
      'There is not one. E-signature is not part of the E7 story.',
    theyWin: 'Everything, in this category.',
    trap:
      'Do not put this in the savings column. If it is captured as spend, it should score as not covered — leaving it in the credit is the kind of error that invalidates the whole model in review.',
  },
];

export const BATTLECARDS: Battlecard[] = BATTLECARD_RECORDS.map((card) => ({
  sourceIds: ['m365-product-terms'],
  evidenceStatus: 'unverified',
  ...card,
}));

export function findBattlecards(vendors: string[]): Battlecard[] {
  const seen = new Set<string>();
  const out: Battlecard[] = [];
  for (const v of vendors) {
    for (const card of BATTLECARDS) {
      if (card.match.test(v) && !seen.has(card.vendor)) {
        seen.add(card.vendor);
        out.push(card);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------- objections

export interface Objection {
  id: string;
  objection: string;
  /** Concede this first. Skipping it is what makes the answer sound like a script. */
  concede: string;
  answer: string;
  /** Only surfaced when this is true of the current deal. */
  when?: (ctx: DealContext) => boolean;
  sourceIds?: string[];
  evidenceStatus?: EvidenceStatus;
}

export interface DealContext {
  baseline: string;
  seats: number;
  netAnnual: number;
  upliftAnnual: number;
  redundantToday: number;
  notCoveredAnnual: number;
  capturedLines: number;
  avoidedSelected: number;
}

const OBJECTION_RECORDS: Objection[] = [
  {
    id: 'sticker',
    objection: '"$99 a user is far more than we pay today."',
    concede: 'The published E7 reference is $99 per user; the customer comparison depends on actual prices.',
    answer:
      'Compare actual current recurring spend with the proposed licence cost plus retained tools. Explain that covered invoices are fully replaced in this scenario, validate that scope before acting, and report a cost increase plainly if that is the result.',
  },
  {
    id: 'net-negative',
    objection: '"Even after consolidation the total still goes up."',
    concede: 'On the spend captured so far, yes, and pretending otherwise would be dishonest.',
    answer:
      'Keep the negative result visible. Verify the inventory and actual quote, but do not invent more spend or an expected discount to force a positive case. Staying on the current suite may be the better financial choice.',
    when: (c) => c.netAnnual < 0,
  },
  {
    id: 'shelfware',
    objection: '"We will end up paying for capability nobody uses."',
    concede: 'That is the standard failure mode of a big bundle, and it is a fair worry.',
    answer:
      'Which is why adoption should be a condition, not an afterthought. Pick the three capabilities with a named owner and a retirement date for the tool they replace, and make those the success criteria. Anything without an owner should not be in the business case.',
  },
  {
    id: 'best-of-breed',
    objection: '"We deliberately buy best-of-breed, not a bundle."',
    concede:
      'And for some of these categories that remains the right call — the battlecards here name exactly where.',
    answer:
      'The question is not bundle versus best-of-breed everywhere. It is which specific categories justify a premium. Keep the two or three that genuinely do, consolidate the rest, and you fund the premium ones out of the savings.',
  },
  {
    id: 'contracts',
    objection: '"We are locked into these contracts for another two years."',
    concede: 'Then the savings do not land on day one, and the model should not pretend they do.',
    answer:
      'Use the savings delay in whole months for the cancellable share of each invoice. Retained share describes spending that continues in steady state, not a temporary contract lock-in. Renewal notes alone do not calculate timing.',
  },
  {
    id: 'security-team',
    objection: '"Our security team will never give up their tooling."',
    concede: 'They should not, on the strength of a spreadsheet.',
    answer:
      'Nothing here proposes a rip-and-replace. It proposes a measured evaluation on a defined scope with a parallel-run period. If the incumbent wins the bake-off, keep it — you will have learned that from evidence rather than from inertia, and the rest of the consolidation still stands.',
  },
  {
    id: 'already-e5',
    objection: '"We are already on E5, so what is actually new?"',
    concede:
      'Less than the marketing suggests. E5 to E7 is a shorter list than E3 to E5.',
    answer:
      'E7 bundles Copilot, Agent 365 and the full Entra Suite over E5. Check existing add-ons before calling any capability new. Baseline optimization is separate from E7-unlocked savings, and existing ownership is not proof of a duplicate invoice.',
    when: (c) => c.baseline === 'm365e5',
  },
  {
    id: 'redundant-first',
    objection: '"Why would we upgrade before fixing what we already have?"',
    concede: 'You should not. That is the right instinct and the right sequence.',
    answer:
      'Review baseline optimization first. Only validated functional scope with an actual cancellation path can become savings, and migration may still cost money. Do not attribute those baseline opportunities to buying E7.',
    when: (c) => c.redundantToday > 0,
  },
  {
    id: 'lock-in',
    objection: '"This puts everything with one vendor."',
    concede: 'It does, and concentration risk is a legitimate architectural concern.',
    answer:
      'Weigh it explicitly rather than dismissing it. The counterweight is that every integration between the tools you run today is also a dependency, just a less visible one. Identity is already Microsoft in this estate — the question is whether a second identity plane reduces risk or just adds a seam.',
  },
  {
    id: 'exclusions',
    objection: '"What does this not cover?"',
    concede: 'Genuinely quite a lot, and you should have the list before you commit.',
    answer:
      `SIEM, PSTN calling plans, premium Power Platform, Project and separately metered services remain outside the suite. ${SECURITY_COPILOT_ALLOWANCE.summary} ${SECURITY_COPILOT_ALLOWANCE.conditions}`,
    when: (c) => c.notCoveredAnnual > 0,
  },
  {
    id: 'benchmark-value',
    objection: '"The new-capability value looks made up."',
    concede: 'The stored benchmarks are illustrative USD planning estimates, not quotes.',
    answer:
      'Keep it separate from recurring cash savings and TCO. Select only capabilities the customer actually plans to buy, and discuss the budget, modeled users and USD amount. A category planning estimate is not a vendor quote or a cash saving.',
    when: (c) => c.avoidedSelected > 0,
  },
  {
    id: 'thin-data',
    objection: '"This is based on very little information."',
    concede: 'Right now, yes.',
    answer:
      'This is a first-pass model, not a proposal. The most valuable next step is a proper spend inventory — procurement export, renewal calendar, and the security and identity contracts. An hour of that turns this into something finance can actually approve.',
    when: (c) => c.capturedLines < 5,
  },
];

export const OBJECTIONS: Objection[] = OBJECTION_RECORDS.map((objection) => ({
  sourceIds: objection.id === 'exclusions' ? ['security-copilot-inclusion', 'm365-product-terms'] : ['m365-product-terms'],
  evidenceStatus: 'unverified',
  ...objection,
}));

// ---------------------------------------------------------------------------- discovery

export const DISCOVERY_QUESTIONS: Record<DomainId, string[]> = {
  ai: [
    'Who is paying for GenAI tools today, and is it coming out of IT or a business budget?',
    'Where does the knowledge people search for actually live — Microsoft 365, or somewhere else?',
    'Has anyone been asked yet who is accountable when an AI agent takes an action on its own?',
  ],
  identity: [
    'What is your identity provider of record today, and what does it broker that Entra does not?',
    'How are access reviews evidenced at audit time, and how much of that is manual?',
    'When someone leaves, how long until every entitlement is actually gone?',
    'How do contractors and third parties get access to internal applications right now?',
  ],
  endpoint: [
    'What is the Windows to Mac split, and who owns each fleet?',
    'How many agents are on a standard managed device today?',
    'What does patch compliance reporting look like for someone who has to sign it off?',
  ],
  threat: [
    'Is Defender running in passive mode alongside your EDR right now?',
    'Who staffs the SOC, and are they in-house, managed, or a mix?',
    'When did you last measure your mail gateway\u2019s miss rate against a control?',
  ],
  data: [
    'What triggers a legal hold today, and how much data gets exported to satisfy it?',
    'Are sensitivity labels deployed, and if so what share of documents actually carry one?',
    'Which regulator or framework drives your retention schedule?',
    'Where does insider risk sit — security, HR, or legal?',
  ],
  comms: [
    'What is the telephony estate — carrier, contract term, and number of DIDs?',
    'Which file-sharing tools are in active use, including ones IT did not buy?',
    'How many collaboration tools would a new joiner be asked to learn in week one?',
  ],
  analytics: [
    'How many BI viewer seats versus author seats are you paying for?',
    'Who builds automations today, and what happens when they leave?',
    'Is there a shadow estate of departmental tools nobody has counted?',
  ],
};

/** Questions worth asking when a domain shows no captured spend at all — silence is data. */
export const GAP_PROBES: Record<DomainId, string> = {
  ai: 'No AI spend captured. Either they have not started, or someone is expensing it — both are worth knowing.',
  identity:
    'No identity spend captured. Unusual at enterprise scale; likely means native Entra already, or a contract nobody in the room owns.',
  endpoint:
    'No endpoint management spend captured. Confirm whether Intune is genuinely doing the work, or whether a Mac or mobile estate is managed elsewhere.',
  threat:
    'No third-party security spend captured. Verify — security contracts are the ones most often held outside IT procurement.',
  data:
    'No compliance spend captured. Ask what happens at audit and eDiscovery time; the cost may be people rather than software.',
  comms:
    'No collaboration or telephony spend captured. Telephony in particular is rarely zero — it may sit with facilities or a regional budget.',
  analytics:
    'No analytics spend captured. Departmental BI and automation tools are the classic shadow estate; ask finance, not IT.',
};
