import type { DomainId } from './categories';

/**
 * Seller mode's content layer.
 *
 * The rule everything here follows: a seller who repeats this in front of a customer must not
 * later have to walk it back. So every battlecard names where the incumbent genuinely wins, and
 * every objection response concedes the true part before answering. A play that only works if
 * the customer does not know their own estate is not a play, it is a liability.
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
}

export const BATTLECARDS: Battlecard[] = [
  {
    match: /crowdstrike|falcon/i,
    vendor: 'CrowdStrike',
    counter: 'Microsoft Defender for Endpoint P2',
    wedge:
      'They are already paying for Defender inside E5/E7 and running it in passive mode. That is a second endpoint budget for a capability they own. Start with the licence audit, not the product comparison.',
    theyWin:
      'Threat hunting workflow, Linux and legacy OS coverage, and a SOC team already fluent in the console. Falcon Complete is a managed service Microsoft does not directly replicate.',
    trap:
      'Do not claim a like-for-like swap for a mature SOC. Propose a coexistence period and a measured cutover on a defined workload — the credit in this model assumes a retained share for exactly this reason.',
  },
  {
    match: /okta|ping identity|pingone|jumpcloud|duo/i,
    vendor: 'Okta / Ping / Duo',
    counter: 'Microsoft Entra ID P2 + Entra Suite',
    wedge:
      'Entra is already the identity provider for every Microsoft workload they run. Paying a second IdP to broker access back into Microsoft 365 is the clearest double-spend in the estate.',
    theyWin:
      'Deep non-Microsoft SaaS integration catalogues, customer identity (CIAM), and organisations with a deliberate multi-cloud, vendor-neutral identity strategy.',
    trap:
      'Migration is a project, not a switch. App-by-app re-federation, legacy SAML apps and MFA re-enrolment are real cost and real elapsed time. Model a retained share for the long tail.',
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
      'A third-party mail gateway in front of Exchange Online duplicates filtering they already own, and adds a mail-flow hop that complicates every delivery investigation.',
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
      'There is no consolidation play here on licence cost. The honest angle is data architecture: E5/E7 already ships the connectors and the security data, so a Sentinel move can cut ingest volume and tiering cost.',
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
      'Copilot moves from a $30 add-on to included. If they are running a paid GenAI pilot alongside an E5 estate, the E7 upgrade delta is substantially pre-funded by cancelling it.',
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
      'Power BI Pro is already included, so most Tableau viewer seats are paid twice. Viewer-tier consolidation is usually the fastest win and does not touch the analyst community.',
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
      'Storage they already own, sitting unused next to a paid alternative. Often survives purely as habit or a single departmental workflow.',
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
    counter: 'Entra Privileged Identity Management + Permissions Management',
    wedge:
      'Just-in-time elevation and cloud entitlement management for Azure, AWS and GCP identities is included in the full Entra Suite that E7 unlocks.',
    theyWin:
      'Credential vaulting, session recording, and privileged access to on-premises and OT systems. This is a genuinely different product category.',
    trap:
      'PIM is not a vault. Do not position it against secrets management — you will be corrected in the room by someone who runs it.',
  },
  {
    match: /jamf|workspace one|airwatch|ivanti|kandji|mosyle/i,
    vendor: 'Jamf / Workspace ONE',
    counter: 'Microsoft Intune, plus the Intune Suite capabilities',
    wedge:
      'Intune is already licensed. Where the estate is majority Windows, a second UEM is duplicated spend for the same enrolled devices.',
    theyWin:
      'Jamf on same-day macOS and iOS feature support, and on Apple-first organisations where Mac admins have deep tooling investment.',
    trap:
      'Do not propose displacing Jamf in a design or engineering org. Model the Mac fleet as a retained share and take the Windows and mobile consolidation instead.',
  },
  {
    match: /knowbe4|hoxhunt|cofense|proofpoint security awareness|ninjio/i,
    vendor: 'KnowBe4 / Hoxhunt',
    counter: 'Microsoft Defender Attack Simulation Training',
    wedge:
      'Small contract, easy win, and it is already included. Useful as a low-friction first consolidation that proves the pattern before the contested ones.',
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
      'Agent consolidation is the argument as much as licence cost — Defender is already deployed on the endpoint, so this removes a second agent from every managed device.',
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
      'For Microsoft 365 data — mail, Teams, SharePoint, OneDrive — collection happens in place, without export and re-hosting. That is where most of their volume is.',
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

export const OBJECTIONS: Objection[] = [
  {
    id: 'sticker',
    objection: '"$99 a user is far more than we pay today."',
    concede: 'It is. On sticker price alone this is the largest per-seat suite Microsoft sells.',
    answer:
      'Sticker price is the wrong comparison because it is not what you pay today either — you pay for the suite plus everything around it. Put the vendor contracts next to it and compare total cost to total cost. That is the number on this page.',
  },
  {
    id: 'net-negative',
    objection: '"Even after consolidation the total still goes up."',
    concede: 'On the spend captured so far, yes, and pretending otherwise would be dishonest.',
    answer:
      'Two honest routes forward. First, this only counts what we have entered — most estates have more contracts than anyone remembers in one sitting. Second, the discount slider is real: this is a negotiation, and the gap is a number you can take to the table rather than an argument you have lost.',
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
      'Set the retained share on each line to reflect the term you are stuck with. It makes the first-year number smaller and the whole case more credible. Renewal dates are also leverage — knowing which contracts expire when tells you the order to sequence this in.',
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
      'Three things are genuinely new: Copilot included rather than a $30 add-on, Agent 365 for governing AI agents, and the full Entra Suite instead of just Entra ID P2. But the sharper finding for an E5 customer is usually the redundant-today bucket — capability you already own and are paying a vendor for a second time.',
    when: (c) => c.baseline === 'm365e5',
  },
  {
    id: 'redundant-first',
    objection: '"Why would we upgrade before fixing what we already have?"',
    concede: 'You should not. That is the right instinct and the right sequence.',
    answer:
      'Fix the redundant-today bucket first — it is savings you can take without buying anything. Do that, prove the consolidation muscle works, and the E7 conversation becomes an extension of a track record rather than a leap of faith.',
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
      'SIEM, PSTN calling plans, Security Copilot, premium Power Platform capacity and Project all remain separate purchases. Those are on the exclusions panel with your own numbers in them. A business case that omits them does not survive its first review.',
    when: (c) => c.notCoveredAnnual > 0,
  },
  {
    id: 'benchmark-value',
    objection: '"The new-capability value looks made up."',
    concede: 'It is benchmark-priced, not quoted, and it is softer than the cash side.',
    answer:
      'Which is exactly why it is reported separately and never added to the net impact or the TCO. Treat it as what you would have had to budget if you wanted these capabilities another way — and if you would not have bought them at all, untick them. The number should reflect your actual plans.',
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
