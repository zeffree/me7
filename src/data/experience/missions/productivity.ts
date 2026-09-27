import type { ExperienceMission } from '../types';

export const PRODUCTIVITY_MISSIONS: readonly ExperienceMission[] = [
  {
    id: 'brief',
    title: 'Bring a useful brief',
    shortTitle: 'Prepare a brief',
    room: 'Project desk',
    domain: 'ai',
    intro: 'Maya needs a launch brief for Project Lantern. Choose the evidence that can actually support it.',
    objective: 'Check a source-cited brief, reject unsuitable evidence or revise a decision into a verification task, then compare methods.',
    product: 'Office apps, Copilot Chat and Microsoft 365 Copilot',
    categoryIds: ['genai-assistant', 'enterprise-search', 'ai-notetaker'],
    sourceIds: ['e7-announcement', 'architecture-copilot-data', 'm365-packaging-2026', 'experience-copilot-chat', 'experience-packaging-details'],
    variants: {
      everyday: {
        label: 'An open launch review',
        description: 'The permitted plan, team conversation and workshop notes describe a pilot awaiting accessibility review.',
      },
      curveball: {
        label: 'Two different status updates',
        description: 'An updated permitted plan marks the review complete; the team conversation still says it is open. Bring both into view before drawing a conclusion.',
      },
    },
    comparison: {
      o365e3: 'Office 365 E3 supports Office briefs and eligible Copilot Chat using supplied files, pasted text and open-app context, with 2026 inbox, calendar and document-agent enhancements. Cross-work-source Microsoft 365 Copilot is a separate purchase, not an AI-versus-no-AI distinction.',
      m365e7: 'Microsoft 365 E7 includes Microsoft 365 Copilot for work-grounded assistance across permitted work sources. A person still checks, corrects or rejects the evidence and the draft.',
    },
    prerequisites: [
      'The employee needs permission to each selected source. The board-only document is not available to Maya.',
      'Work-grounded Copilot requires an assigned entitlement and a properly configured tenant; this lab uses prepared text, not a connected service.',
      'Check whether existing permissions are appropriate, not just whether a file can be opened. Rejecting a draft point removes its cited source from this draft, not from the workplace.',
    ],
    boundary: 'Copilot does not bypass permissions, cure oversharing or resolve contradictory evidence on its own. Nothing here reads the restricted document or runs live AI.',
    takeaway: 'A sound brief depends on the evidence you can use, not just the assistant you have.',
  },
  {
    id: 'insights',
    title: 'Find the story in the numbers',
    shortTitle: 'Explore the numbers',
    room: 'Analytics bench',
    domain: 'analytics',
    intro: 'Explore Northstar’s small trading workbook, decide what the selected rows show and prepare a share for Sam.',
    objective: 'Filter a real sample calculation, distinguish growth from a returns issue and choose an appropriate sharing route.',
    product: 'Excel and Power BI Pro',
    categoryIds: ['business-intelligence'],
    sourceIds: ['experience-power-bi-sharing', 'e7-announcement', 'experience-power-bi-licensing'],
    variants: {
      everyday: {
        label: 'A steady trading period',
        description: 'Revenue has increased. Each product’s return rate is below this fictional workbook’s 5% review line.',
      },
      curveball: {
        label: 'Beacon returns in the south',
        description: 'South Beacon now has 36 returns from 240 orders. Revenue alone will not reveal the return-rate issue.',
      },
    },
    comparison: {
      o365e3: 'Office 365 E3 includes Excel for filtering, visualizing and collaborating on an approved workbook. Free Power BI can author personal content; publishing and sharing this Pro report is the separate licensing requirement.',
      m365e7: 'Microsoft 365 E7 includes Power BI Pro. This Pro-workspace example still requires an appropriately licensed colleague with explicit report access.',
    },
    prerequisites: [
      'Use the synthetic workbook’s selected rows and its illustrative 5% return-rate review line, not a guessed finding.',
      'Maya and Sam already have the required report, workspace and data permissions in this sample. The viewer-license control changes only the separate Pro license check.',
      'The publisher needs an assigned Pro license. Workspace, report and underlying data permissions still need to be configured in a real deployment.',
    ],
    boundary: 'Pro is not Fabric or Premium capacity and does not include BI Copilot here. Licenses do not grant access, and data filters are not security controls.',
    takeaway: 'The workbook can already answer a question. Report distribution adds licensing and access decisions.',
  },
  {
    id: 'calling',
    title: 'Make the right connection',
    shortTitle: 'Connect a call',
    room: 'Calling corner',
    domain: 'comms',
    intro: 'Connect Maya to a meeting, a colleague or a customer’s phone. External calling uses a dedicated user number, not a shared call queue.',
    objective: 'Separate Teams collaboration, Phone Standard assignment and the carrier, number and emergency setup for a dedicated-number user.',
    product: 'Teams and Teams Phone Standard',
    categoryIds: ['video-meetings', 'team-chat', 'ucaas-telephony'],
    sourceIds: ['experience-teams-phone', 'teams-choice-2025', 'e7-announcement', 'experience-teams-pstn', 'experience-packaging-details'],
    variants: {
      everyday: {
        label: 'A provider is available',
        description: 'A separately arranged PSTN provider is available. Maya still needs a Phone Standard assignment and separate carrier, dedicated-number and emergency setup.',
      },
      curveball: {
        label: 'The provider is unavailable',
        description: 'The sample PSTN provider is down. Even a licensed and configured customer call cannot connect; a Teams meeting is a different, available route.',
      },
    },
    comparison: {
      o365e3: 'In this with-Teams Office 365 E3 sample, online meetings and Teams-to-Teams calls already work. A customer PSTN call needs a separate Teams Phone Standard entitlement plus carrier, number and emergency setup.',
      m365e7: 'This with-Teams Microsoft 365 E7 sample includes Teams Phone Standard. Assign the license; carrier/PSTN service, the dedicated user number and emergency calling still need separate setup. A calling plan is not bundled by default.',
    },
    prerequisites: [
      'Both suite examples use with-Teams packaging and configured Teams accounts. Check the actual SKU when buying.',
      'The external path models one dedicated-number user. The PSTN setup flag confirms a separately arranged carrier connection, user-number assignment, emergency calling and applicable calling policies.',
      'Use a separately arranged Calling Plan, Operator Connect or Direct Routing service. The team route is ordinary internal consultation before Maya calls from her own number, not a call queue or resource account.',
    ],
    boundary: 'Phone Standard is not a PSTN service or bundled calling plan. Internal team collaboration does not simulate call queues, resource accounts, full CCaaS or Teams Premium. License toggles cannot fix a provider outage.',
    takeaway: 'Where the call goes determines what is needed. Collaboration, telephony and connectivity are different layers.',
  },
];
