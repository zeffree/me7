import { BRIEF_SOURCES, BUSINESS_ROWS, WORKPLACE } from '@/data/experience/fixtures';
import type {
  BriefInput,
  BriefSourceId,
  CallingInput,
  CaseVariant,
  InsightsInput,
  LabSuite,
  MissionOutcome,
} from '@/data/experience/types';

type AllowedBriefSourceId = Exclude<BriefSourceId, 'private'>;
export type BriefSource = (typeof BRIEF_SOURCES)[number];

const BRIEF_COPY: Record<BriefInput['focus'], Record<AllowedBriefSourceId, string>> = {
  decision: {
    project: 'Keep the pilot ready, but wait for a completed accessibility review before launch. Maya owns the launch decision.',
    thread: 'Sam recommends keeping the pilot small while the accessibility review is open.',
    notes: 'Customers liked the simpler setup, with clearer keyboard instructions still needed.',
  },
  risks: {
    project: 'A ready pilot is not launch approval: the accessibility review is a launch dependency.',
    thread: 'The team still has an open accessibility review, so expanding the pilot would be premature.',
    notes: 'Two workshop participants needed clearer keyboard instructions.',
  },
  actions: {
    project: 'Ask Maya to confirm the accessibility review is complete before making the launch decision.',
    thread: 'Keep the pilot small until the open accessibility review is complete.',
    notes: 'Ask Sam to follow up on the workshop feedback about keyboard instructions.',
  },
};

const UPDATED_PLAN_COPY: Record<BriefInput['focus'], string> = {
  decision: 'The updated plan marks the accessibility review complete. Check the other permitted status evidence before treating that as settled.',
  risks: 'The plan now marks the accessibility review complete; that update still needs to agree with the team’s evidence.',
  actions: 'Ask Maya to confirm the plan’s new “complete” status against the team’s latest review update.',
};

const BRIEF_BOUNDARY = 'Only permitted sources are used. Copilot does not override file permissions or fix oversharing.';
export const COPILOT_CHAT_CONTEXT = 'Eligible baseline Copilot Chat can use supplied files, pasted text and open-app context. Its 2026 enhancements include inbox/calendar context and document agents; this is not an AI-versus-no-AI comparison.';
export const COPILOT_PAID_CONTRAST = 'The paid Microsoft 365 Copilot contrast is work-grounded assistance across permitted work sources, not exclusive access to file-based or in-app AI.';

export function getBriefSources(variant: CaseVariant): readonly BriefSource[] {
  return BRIEF_SOURCES.map(source => {
    // Do not carry restricted contents into any presentation or draft helper.
    if (!source.permitted) return { ...source, text: '' };
    if (variant === 'curveball' && source.id === 'project') {
      return {
        ...source,
        text: 'Updated plan: the pilot is ready and the accessibility review is marked complete. Maya owns the launch decision.',
      };
    }
    return { ...source };
  });
}

export function toggleBriefSource(input: BriefInput, id: BriefSourceId): BriefInput {
  const permitted = new Set(BRIEF_SOURCES.filter(source => source.permitted).map(source => source.id));
  const selected = new Set(input.sources.filter(source => permitted.has(source)));
  if (permitted.has(id)) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
  }
  return { ...input, sources: [...selected] };
}

export function rejectBriefSource(input: BriefInput, id: BriefSourceId): BriefInput {
  const permitted = new Set(BRIEF_SOURCES.filter(source => source.permitted).map(source => source.id));
  return { ...input, sources: [...new Set(input.sources.filter(source => source !== id && permitted.has(source)))] };
}

export function reviseBriefForVerification(input: BriefInput): BriefInput {
  return { ...input, focus: 'actions' };
}

export interface BriefDraft {
  sources: readonly BriefSource[];
  entries: readonly { text: string; citations: readonly BriefSourceId[] }[];
  conflict: boolean;
  missingContext: boolean;
  limitation: string;
}

export function buildBriefDraft(input: BriefInput, variant: CaseVariant): BriefDraft {
  const sources = getBriefSources(variant).filter(source => source.permitted && input.sources.includes(source.id));
  const has = (id: BriefSourceId) => sources.some(source => source.id === id);
  const conflict = variant === 'curveball' && has('project') && has('thread');
  const missingContext = variant === 'curveball' && !conflict;
  const entries: { text: string; citations: readonly BriefSourceId[] }[] = sources.flatMap(source => {
    if (source.id === 'private') return [];
    return [{
      text: variant === 'curveball' && source.id === 'project'
        ? UPDATED_PLAN_COPY[input.focus]
        : BRIEF_COPY[input.focus][source.id],
      citations: [source.id],
    }];
  });
  if (conflict) {
    entries.push({
      text: 'The plan says “complete”; the conversation says “still open”. Ask Maya and Sam to reconcile those updates before approving launch. This draft does not resolve the disagreement.',
      citations: ['project', 'thread'],
    });
  }
  let limitation = 'Check each prepared point against its citation. Reject an unsuitable point and source, or change the focus to revise the draft. Existing file permissions are unchanged.';
  if (sources.length === 0) {
    limitation = 'Select at least one allowed source to prepare a draft. The restricted document cannot fill a gap.';
  } else if (missingContext) {
    const missing = [
      !has('project') ? 'the updated project plan' : '',
      !has('thread') ? 'the team conversation' : '',
    ].filter(Boolean).join(' and ');
    limitation = `Missing from this draft: ${missing}. Add the permitted status sources before treating the launch status as confirmed.`;
  } else if (conflict) {
    limitation = 'Contradictory permitted evidence: keep the launch decision open, or prepare a risks/actions brief that explicitly asks for verification.';
  }
  return { sources, entries, conflict, missingContext, limitation };
}

export function evaluateBrief(input: BriefInput, suite: LabSuite, variant: CaseVariant): MissionOutcome {
  const draft = buildBriefDraft(input, variant);
  const method = input.approach === 'manual' ? 'Manual synthesis' : 'Prepared work-grounded Copilot sample';
  const facts = [
    { label: 'Allowed sources selected', value: String(draft.sources.length) },
    { label: 'Method', value: method },
    { label: 'Evidence', value: draft.sources.length === 0 ? 'No sources selected' : draft.conflict ? 'Conflicting status updates' : draft.missingContext ? 'Missing status context' : 'Selected permitted evidence' },
  ];
  const restrictedRequested = input.sources.some(id => !BRIEF_SOURCES.some(source => source.id === id && source.permitted));
  if (restrictedRequested) {
    return {
      status: 'blocked',
      title: 'The permission boundary holds',
      summary: 'The board-only source is not available to Maya. Neither method can use it.',
      explanation: [BRIEF_BOUNDARY, 'No restricted contents were included in the prepared draft.', draft.limitation],
      nextAction: 'Remove the restricted source and use the permitted plan, conversation or notes.',
      facts,
    };
  }
  if (draft.sources.length === 0) {
    return {
      status: 'ready',
      title: 'Choose evidence for the brief',
      summary: 'There is no source-grounded draft until you select an allowed file or conversation.',
      explanation: [BRIEF_BOUNDARY, 'Both suites can support manual synthesis of material the employee is allowed to read.', COPILOT_CHAT_CONTEXT],
      nextAction: 'Select an allowed source, then choose a decision, risks or actions focus.',
      facts,
    };
  }
  if (input.approach === 'copilot' && suite === 'o365e3') {
    return {
      status: 'separate',
      title: 'This Copilot method is a separate purchase',
      summary: 'Office 365 E3 does not include the paid cross-work-source Microsoft 365 Copilot method shown in this prepared sample.',
      explanation: [
        COPILOT_CHAT_CONTEXT,
        COPILOT_PAID_CONTRAST,
        'The preview is authored learning material, not a live E3 Copilot result.',
        BRIEF_BOUNDARY,
        draft.limitation,
      ],
      nextAction: 'Choose manual synthesis to complete this task with Office 365 E3, or compare the Copilot method under Microsoft 365 E7.',
      facts,
    };
  }
  if (draft.missingContext || (draft.conflict && input.focus === 'decision')) {
    return {
      status: 'review',
      title: draft.conflict ? 'The launch status is not settled' : 'A current-status source is missing',
      summary: draft.conflict
        ? 'The selected plan and conversation disagree. A polished draft is not evidence that the review is complete.'
        : 'The selected material can support a partial brief, but it cannot establish the current review status.',
      explanation: [draft.limitation, BRIEF_BOUNDARY, 'A person must verify the permitted evidence. No missing answer is inferred from the restricted document.'],
      nextAction: draft.conflict
        ? 'Revise the decision into verification actions, or reject an unsuitable point and source. Removing evidence does not resolve the disagreement.'
        : 'Select both the updated project plan and the team conversation to compare their status evidence.',
      facts,
    };
  }
  return {
    status: 'success',
    title: draft.conflict ? 'A qualified follow-up brief is prepared' : input.approach === 'manual' ? 'A manual brief is prepared' : 'A work-grounded sample is prepared',
    summary: draft.conflict
      ? 'The brief surfaces the disagreement and asks for verification. It does not approve launch or claim the review is resolved.'
      : 'The prepared draft uses the selected permitted sources and keeps a citation beside each point.',
    explanation: [
      input.approach === 'manual'
        ? 'Manual synthesis in Office apps is already a valid Office 365 E3 route; upgrading is not required to write this brief.'
        : 'Microsoft 365 E7 includes Microsoft 365 Copilot across permitted work sources. Real work-grounded use still needs license assignment, tenant setup and appropriate source permissions.',
      COPILOT_CHAT_CONTEXT,
      BRIEF_BOUNDARY,
      'Prepared text is not live AI output. Check or reject its points and whether the existing source permissions are appropriate.',
    ],
    nextAction: draft.conflict ? 'Switch back to a decision brief to see why the contradictory status still needs review.' : 'Change the sources or method and see which evidence and entitlement boundaries remain.',
    facts,
  };
}

export type InsightRow = Readonly<(typeof BUSINESS_ROWS)[number]>;
export type CalculatedInsightRow = InsightRow & {
  key: string;
  revenueChange: number;
  growthPercent: number;
  returnRate: number;
};

export const INSIGHT_RETURN_REVIEW_PERCENT = 5;
export const POWER_BI_PERSONAL_BASELINE = 'Excel can filter, visualize and collaborate on an approved workbook. Free Power BI can author personal content; Pro is the publishing/sharing and licensed-recipient contrast here.';
export const INSIGHT_REPORT_PERMISSIONS = 'Maya and Sam already have the required workspace, report and data permissions in this sample. The Pro toggle changes licensing only; it never grants access.';
export const INSIGHT_FILTER_BOUNDARY = 'Data filters are not security controls. They change the visible rows, not recipient permissions or row-level security.';

export function getInsightRows(variant: CaseVariant): readonly InsightRow[] {
  return BUSINESS_ROWS.map(row => ({
    ...row,
    returns: variant === 'curveball' && row.region === 'south' && row.product === 'Beacon' ? 36 : row.returns,
  }));
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatInsightNumber = (value: number): string => numberFormatter.format(value);
export const formatInsightPercent = (value: number): string => `${percentFormatter.format(value)}%`;

export function calculateInsights(input: Pick<InsightsInput, 'region' | 'metric'>, variant: CaseVariant) {
  const rows: CalculatedInsightRow[] = getInsightRows(variant)
    .filter(row => input.region === 'all' || row.region === input.region)
    .map(row => ({
      ...row,
      key: `${row.region}-${row.product}`,
      revenueChange: row.revenue - row.previousRevenue,
      growthPercent: row.previousRevenue === 0 ? 0 : (row.revenue - row.previousRevenue) / row.previousRevenue * 100,
      returnRate: row.orders === 0 ? 0 : row.returns / row.orders * 100,
    }));
  const totals = rows.reduce((total, row) => ({
    revenue: total.revenue + row.revenue,
    previousRevenue: total.previousRevenue + row.previousRevenue,
    orders: total.orders + row.orders,
    returns: total.returns + row.returns,
  }), { revenue: 0, previousRevenue: 0, orders: 0, returns: 0 });
  const growthPercent = totals.previousRevenue === 0 ? 0 : (totals.revenue - totals.previousRevenue) / totals.previousRevenue * 100;
  const returnRate = totals.orders === 0 ? 0 : totals.returns / totals.orders * 100;
  const highestGrowth = rows.reduce<CalculatedInsightRow | undefined>((highest, row) => !highest || row.growthPercent > highest.growthPercent ? row : highest, undefined);
  const highestReturns = rows.reduce<CalculatedInsightRow | undefined>((highest, row) => !highest || row.returnRate > highest.returnRate ? row : highest, undefined);
  const returnOutlier = highestReturns && highestReturns.returnRate >= INSIGHT_RETURN_REVIEW_PERCENT ? highestReturns : undefined;
  const highlighted = input.metric === 'revenue' ? highestGrowth : highestReturns;
  const expectedFinding: InsightsInput['finding'] = input.metric === 'revenue'
    ? growthPercent > 0 ? 'growth' : 'no-issue'
    : returnOutlier ? 'returns' : 'no-issue';
  const chartMaximum = input.metric === 'revenue'
    ? Math.max(1, ...rows.flatMap(row => [row.revenue, row.previousRevenue]))
    : Math.max(10, Math.ceil((highestReturns?.returnRate ?? 0) / 5) * 5);
  return { rows, totals, growthPercent, returnRate, highlighted, returnOutlier, expectedFinding, chartMaximum };
}

export const INSIGHT_FINDING_LABELS: Record<InsightsInput['finding'], string> = {
  growth: 'Revenue is growing',
  returns: 'Returns need review',
  'no-issue': 'No issue in this view',
};

export function describeInsightEvidence(input: Pick<InsightsInput, 'region' | 'metric'>, variant: CaseVariant): string {
  const calculation = calculateInsights(input, variant);
  if (input.metric === 'revenue') {
    return `Revenue is ${formatInsightNumber(calculation.totals.revenue)} versus ${formatInsightNumber(calculation.totals.previousRevenue)} previously: ${formatInsightPercent(calculation.growthPercent)} growth in the selected rows.`;
  }
  if (calculation.returnOutlier) {
    const row = calculation.returnOutlier;
    return `${row.region === 'south' ? 'South' : 'North'} ${row.product} has ${row.returns} returns from ${row.orders} orders (${formatInsightPercent(row.returnRate)}), above the sample ${INSIGHT_RETURN_REVIEW_PERCENT}% review line.`;
  }
  return `The selected rows have ${calculation.totals.returns} returns from ${formatInsightNumber(calculation.totals.orders)} orders (${formatInsightPercent(calculation.returnRate)} overall). Every visible row is below the sample ${INSIGHT_RETURN_REVIEW_PERCENT}% review line.`;
}

export function evaluateInsights(input: InsightsInput, suite: LabSuite, variant: CaseVariant): MissionOutcome {
  const calculation = calculateInsights(input, variant);
  const correctFinding = input.finding === calculation.expectedFinding;
  const evidence = describeInsightEvidence(input, variant);
  const findingFeedback = correctFinding
    ? 'Your finding matches this filtered metric. It does not make a claim about data outside the current view.'
    : `This view supports “${INSIGHT_FINDING_LABELS[calculation.expectedFinding]}”, not “${INSIGHT_FINDING_LABELS[input.finding]}”.`;
  const scope = `The 5% return-rate review line is an illustrative rule for this synthetic workbook, not a Microsoft benchmark. ${INSIGHT_FILTER_BOUNDARY}`;
  const reportBoundary = `Pro does not include Fabric/Premium capacity or BI Copilot here. Licensing never grants report or data permission by itself. ${INSIGHT_FILTER_BOUNDARY}`;
  const facts = [
    { label: 'Visible rows', value: String(calculation.rows.length) },
    { label: 'Revenue / previous', value: `${formatInsightNumber(calculation.totals.revenue)} / ${formatInsightNumber(calculation.totals.previousRevenue)}` },
    { label: 'Returns / orders', value: `${calculation.totals.returns} / ${formatInsightNumber(calculation.totals.orders)}` },
    { label: 'Calculated finding', value: INSIGHT_FINDING_LABELS[calculation.expectedFinding] },
    { label: 'Access assumption', value: input.destination === 'report' ? 'Required workspace, report and data permissions already granted' : 'Approved workbook access' },
  ];
  if (input.destination === 'report' && suite === 'o365e3') {
    return {
      status: 'separate',
      title: 'The report route needs Power BI Pro',
      summary: 'Office 365 E3 does not include the publisher’s Power BI Pro entitlement for publishing and sharing this report.',
      explanation: [evidence, findingFeedback, 'Sam’s viewer license cannot supply the publisher’s missing entitlement.', POWER_BI_PERSONAL_BASELINE, INSIGHT_REPORT_PERMISSIONS, reportBoundary],
      nextAction: 'Choose the Excel workbook route, or compare Pro report sharing under Microsoft 365 E7.',
      facts,
    };
  }
  if (input.destination === 'report' && !input.colleagueLicensed) {
    return {
      status: 'needs-setup',
      title: 'Check Sam’s viewer license',
      summary: 'E7 includes the publisher’s Power BI Pro entitlement, but Sam also needs an appropriate license to view this Pro-workspace report.',
      explanation: [evidence, findingFeedback, INSIGHT_REPORT_PERMISSIONS, reportBoundary],
      nextAction: 'Confirm Sam has Power BI Pro, or choose an approved Excel workbook share instead.',
      facts,
    };
  }
  if (!correctFinding) {
    return {
      status: 'review',
      title: 'Check the finding against the visible rows',
      summary: findingFeedback,
      explanation: [evidence, scope, 'Revenue and return rates answer different questions. A region filter can hide an issue elsewhere.'],
      nextAction: `Select “${INSIGHT_FINDING_LABELS[calculation.expectedFinding]}” for this view, or change the metric and inspect the recalculated chart.`,
      facts,
    };
  }
  return {
    status: 'success',
    title: input.destination === 'workbook' ? 'An evidence-backed workbook share is prepared' : 'An evidence-backed report share is prepared',
    summary: evidence,
    explanation: [
      findingFeedback,
      input.destination === 'workbook'
        ? 'Excel analysis and an approved workbook share are already valid Office 365 E3 capabilities. This route does not require a Power BI report license.'
        : `E7 supplies the publisher’s Pro entitlement and Sam’s Pro license is confirmed. ${INSIGHT_REPORT_PERMISSIONS} Real deployment still needs license assignment and access configuration.`,
      POWER_BI_PERSONAL_BASELINE,
      scope,
      reportBoundary,
    ],
    nextAction: input.metric === 'revenue'
      ? 'Switch to returns and check each region before assuming growth means there is no issue.'
      : 'Change the region or sharing route to test whether the same conclusion and access conditions still hold.',
    facts,
  };
}

export interface CallingPathNode {
  id: 'employee' | 'route' | 'phone' | 'provider' | 'destination';
  label: string;
  detail: string;
  state: 'available' | 'separate' | 'unassigned' | 'unconfigured' | 'unavailable' | 'waiting';
}

export function getCallingPath(input: CallingInput, suite: LabSuite, variant: CaseVariant) {
  const external = input.destination === 'customer';
  const phoneEntitled = suite === 'm365e7';
  const providerAvailable = variant === 'everyday';
  const canConnect = !external || (phoneEntitled && input.phoneAssigned && input.pstnConnected && providerAvailable);
  const routeLabel = input.route === 'team'
    ? input.destination === 'meeting' ? 'Team channel meeting' : input.destination === 'colleague' ? 'Group Teams call' : 'Internal team consultation'
    : input.destination === 'meeting' ? 'Meeting invitation' : input.destination === 'colleague' ? 'One-to-one Teams call' : 'Direct calling';
  const nodes: CallingPathNode[] = [
    { id: 'employee', label: WORKPLACE.employee, detail: external ? 'Dedicated-number user example' : 'Configured Teams account', state: 'available' },
    {
      id: 'route',
      label: routeLabel,
      detail: input.route === 'team'
        ? external ? `Consult ${WORKPLACE.colleague} inside Teams, then Maya calls from her own number. No shared queue or resource account.` : 'Conversation through the launch team'
        : external ? 'Maya’s own dedicated-number calling path' : 'Connect without a team consultation',
      state: 'available',
    },
  ];
  if (external) {
    nodes.push({
      id: 'phone',
      label: 'Teams Phone Standard',
      detail: !phoneEntitled
        ? 'Separate entitlement under Office 365 E3, even if assignment is checked'
        : input.phoneAssigned ? 'E7 entitlement; license assigned' : 'E7 entitlement; assign the license',
      state: !phoneEntitled ? 'separate' : input.phoneAssigned ? 'available' : 'unassigned',
    }, {
      id: 'provider',
      label: 'PSTN provider',
      detail: !providerAvailable
        ? 'Unavailable in this case; configuration cannot restore the provider'
        : input.pstnConnected ? 'Separate carrier, user number and emergency setup confirmed' : 'Configure the separate carrier, user number and emergency setup',
      state: !providerAvailable ? 'unavailable' : input.pstnConnected ? 'available' : 'unconfigured',
    });
  }
  nodes.push({
    id: 'destination',
    label: input.destination === 'meeting' ? 'Launch meeting' : input.destination === 'colleague' ? WORKPLACE.colleague : 'Customer’s phone',
    detail: external ? canConnect ? 'Prepared PSTN path is complete; no call is placed' : 'External path is not complete' : 'Teams-to-Teams; no PSTN needed',
    state: canConnect ? 'available' : 'waiting',
  });
  return { external, phoneEntitled, providerAvailable, canConnect, routeLabel, nodes };
}

export function evaluateCalling(input: CallingInput, suite: LabSuite, variant: CaseVariant): MissionOutcome {
  const path = getCallingPath(input, suite, variant);
  const boundary = 'No calling plan is bundled by this example. Internal team collaboration does not imply full CCaaS, call-queue provisioning, resource-account features or Teams Premium.';
  const providerNote = path.providerAvailable
    ? 'The sample provider is available; carrier/PSTN service, the dedicated user number and emergency calling have to be arranged and configured separately.'
    : 'The provider is unavailable in this case. Even a licensed, configured external path cannot connect until service returns.';
  const facts = [
    { label: 'Destination', value: input.destination === 'customer' ? 'Customer PSTN phone' : input.destination === 'colleague' ? 'Teams colleague' : 'Online Teams meeting' },
    { label: 'Route', value: path.routeLabel },
    { label: 'Phone entitlement', value: path.external ? path.phoneEntitled ? 'Phone Standard included in E7; assignment required' : 'Phone Standard separate from Office 365 E3' : 'Not needed for this path' },
    { label: 'PSTN', value: path.external ? !path.providerAvailable ? 'Provider unavailable' : input.pstnConnected ? 'Separate connection configured' : 'Not configured' : 'Not used' },
    { label: 'User number / emergency setup', value: path.external ? input.pstnConnected ? 'Confirmed with the separate PSTN setup' : 'Not confirmed' : 'Not needed for this Teams-only path' },
  ];
  if (!path.external) {
    return {
      status: 'success',
      title: input.destination === 'meeting' ? 'The Teams meeting path is available' : 'The colleague call stays in Teams',
      summary: 'This with-Teams sample already supports online meetings and Teams-to-Teams calls under Office 365 E3.',
      explanation: [
        'No Teams Phone assignment or PSTN provider is needed for the selected online path. Microsoft 365 E7 also supports this baseline collaboration.',
        variant === 'curveball' ? 'The PSTN provider outage does not affect this illustrated Teams-to-Teams path. A meeting is an alternative conversation, not a repaired phone call.' : 'This is a prepared path, not a live call or meeting service.',
        boundary,
      ],
      nextAction: 'Choose a customer’s phone to see the extra entitlement, assignment and connectivity requirements.',
      facts,
    };
  }
  if (!path.phoneEntitled) {
    return {
      status: 'separate',
      title: 'Teams Phone Standard is a separate requirement',
      summary: 'Office 365 E3 alone cannot supply the Phone Standard entitlement for this dedicated-number customer PSTN call.',
      explanation: [
        'Checking “license assigned” describes setup; it does not purchase or add Phone to the E3 suite. A real separate Phone entitlement could support a different licensed deployment.',
        providerNote,
        boundary,
      ],
      nextAction: 'Compare the Phone path under E7, or choose a meeting or colleague call that E3 already supports.',
      facts,
    };
  }
  if (!input.phoneAssigned) {
    return {
      status: 'needs-setup',
      title: 'Assign the included Phone license',
      summary: 'E7 includes Phone Standard, but this employee is not yet assigned the Phone license in the sample.',
      explanation: ['An included entitlement is not a configured user.', providerNote, boundary],
      nextAction: 'Assign the Phone Standard license, then check the separate carrier, user-number and emergency setup.',
      facts,
    };
  }
  if (!input.pstnConnected) {
    return {
      status: 'needs-setup',
      title: 'The PSTN connection is still missing',
      summary: 'A Phone Standard license does not supply a carrier connection, dedicated number or emergency setup.',
      explanation: ['Arrange and configure a separate PSTN service, such as a Calling Plan, Operator Connect or Direct Routing, plus user-number assignment and emergency calling. E7 does not include a calling plan by default.', providerNote, boundary],
      nextAction: 'Confirm the separately arranged PSTN, user-number and emergency setup together, or keep the conversation inside Teams.',
      facts,
    };
  }
  if (!path.providerAvailable) {
    return {
      status: 'blocked',
      title: 'The provider outage still blocks the call',
      summary: 'The E7 Phone license and PSTN configuration are in place, but the customer call is unresolved while the provider is unavailable.',
      explanation: [providerNote, 'Consulting the team inside Teams does not bypass the unavailable PSTN provider for Maya’s customer call.', boundary],
      nextAction: 'Choose an online Teams meeting as an honest alternative while the provider issue is handled separately.',
      facts,
    };
  }
  return {
    status: 'success',
    title: 'The customer call path is prepared',
    summary: 'The E7 Phone Standard license and separately confirmed carrier, dedicated-number and emergency setup now form a complete sample path with an available provider.',
    explanation: ['No live call is placed. The PSTN setup switch confirms the carrier, user number, emergency calling and applicable policies for this one-user example; it does not provision them.', providerNote, boundary],
    nextAction: 'Remove the PSTN connection or try the provider-outage case to see why entitlement alone is not enough.',
    facts,
  };
}
