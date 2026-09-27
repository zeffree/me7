import { INCIDENT_CLUES } from '@/data/experience/fixtures';
import { AGENT_SAMPLE, SHARING_ROUTES, SHARING_SAMPLE_FIELDS } from '@/data/experience/missions/protection';
import type {
  AgentInput, CaseVariant, ClueId, IncidentInput, LabSuite, MissionOutcome, SharingInput,
} from '@/data/experience/types';

export function getIncidentBoard(input: IncidentInput, variant: CaseVariant) {
  const selected = INCIDENT_CLUES.filter(clue => input.clues.includes(clue.id));
  const has = (id: ClueId) => selected.some(clue => clue.id === id);
  const linkedTimeline = has('email') && has('endpoint');
  const corroborated = linkedTimeline && variant === 'everyday';
  const relevant = selected.filter(clue => clue.id !== 'benign');
  const relations: string[] = [];
  if (linkedTimeline) relations.push(variant === 'curveball'
    ? 'Email ↔ endpoint: connection unverified; the device timestamp overlaps maintenance.'
    : 'Email → endpoint: the authored process activity follows the opened message.');
  if (has('identity') && (has('email') || has('endpoint'))) {
    relations.push('Identity ↔ incident window: useful context, not proof of the actor or compromise.');
  }
  if (has('benign')) relations.push('Inventory task: routine activity, deliberately left outside the incident chain.');
  return { selected, relevant, linkedTimeline, corroborated, relations };
}

export function evaluateIncident(input: IncidentInput, suite: LabSuite, variant: CaseVariant): MissionOutcome {
  const board = getIncidentBoard(input, variant);
  const baseline = suite === 'o365e3'
    ? 'Office 365 E3 already includes Defender for Office 365 Plan 1 under the July 2026 packaging update. Plan 1 includes email investigation and Real-time detections, not only preventive filtering. Manual evidence review is a valid path.'
    : 'Microsoft 365 E7 can correlate licensed, onboarded workload signals in Defender XDR. Support, exclusions and analyst response permissions still apply.';
  const evidence = variant === 'curveball'
    ? 'The device timestamp is unverified and overlaps known maintenance. Even all three observations do not establish a reliable attack chain.'
    : board.corroborated
      ? 'The selected email and endpoint observations form an authored sequence worth investigating, not a confirmed attack.'
      : 'An email alert, a process observation or a risky sign-in alone is insufficient. Add the message and device context before deciding on containment.';
  const briefing = input.analystAssistant
    ? suite === 'm365e7'
      ? 'The prepared Security Copilot briefing is not live AI. Real use needs tenant enablement, supported sources and available Security Compute Unit capacity; a human must check it.'
      : 'Security Copilot is not included in Office 365 E3. The prepared briefing is a preview, not a licensed or live service.'
    : 'The analyst is reviewing the prepared observations manually; an AI briefing is not required.';
  const facts = [
    { label: 'Pinned observations', value: String(board.selected.length) },
    { label: 'Evidence relationship', value: board.corroborated ? 'Email and endpoint sequence to verify' : 'Insufficient or unverified' },
    { label: 'Response prerequisites', value: input.onboarded ? 'Marked verified for this lab only' : 'Not verified' },
    { label: 'Containment', value: 'Not asserted; no live action' },
  ];
  const explanation = [
    evidence, baseline, briefing,
    'The identity clue is Entra ID Protection cloud-risk context, not an assumed on-premises AD sensor. Cross-workload correlation requires licensed, onboarded sources; these supplied practice observations do not add their entitlements.',
  ];

  if (input.response === 'dismiss') {
    return {
      status: 'review', title: 'Do not close the incident on an assumption',
      summary: 'A routine task can be set aside without dismissing the unusual invoice. Missing evidence is not evidence that everything is safe.',
      explanation, facts, nextAction: 'Choose Investigate and collect or verify the email and device observations.',
    };
  }
  if (input.response === 'isolate' && !board.corroborated) {
    return {
      status: 'review', title: 'Investigate before requesting isolation',
      summary: variant === 'curveball'
        ? 'The noisy timeline does not justify containment. Keep the investigation open and validate the timestamp with a human analyst.'
        : 'The selected clues do not yet support an isolation request. A risky sign-in alone cannot prove compromise.',
      explanation, facts, nextAction: 'Choose Investigate. Pin the relevant observations and resolve uncertainty rather than adding routine activity as evidence.',
    };
  }
  if (suite === 'o365e3' && (input.response === 'isolate' || input.analystAssistant)) {
    return {
      status: 'separate', title: 'Keep triage manual, or confirm separate coverage',
      summary: 'This Office 365 E3 path does not include the illustrated endpoint response, cross-workload XDR or Security Copilot capability. Marking setup complete does not add a licence.',
      explanation, facts, nextAction: 'Choose Investigate and turn off the briefing for a manual review, or compare the E7 path with its prerequisites.',
    };
  }
  if (suite === 'm365e7' && !input.onboarded && (input.response === 'isolate' || input.analystAssistant)) {
    return {
      status: 'needs-setup', title: 'The response tools need a prepared environment',
      summary: 'An E7 licence is not workload onboarding or response authorisation. The requested assisted or endpoint-response workflow is not ready.',
      explanation: [...explanation, 'Verify licensed workloads, supported endpoints, integrations and response permissions. The lab setup switch represents all of those checks, not an actual deployment.'],
      facts, nextAction: 'Complete the lab prerequisites, or turn off the briefing and continue with manual investigation.',
    };
  }
  if (input.response === 'isolate') {
    return {
      status: 'success', title: 'A supported isolation request is ready for review',
      summary: 'You related the email and device evidence and verified the sample response prerequisites. A human analyst can now review the simulated request.',
      explanation: [...explanation, 'This is a proposed, scoped endpoint action. Automatic attack disruption depends on its own supported detections and configuration; neither attack confirmation nor successful containment is guaranteed.'],
      facts, nextAction: 'Review business impact and response scope with an authorised analyst. Try the noisy case to see why investigation may be the better response.',
    };
  }
  if (board.relevant.length === 0 || (variant === 'everyday' && !board.corroborated)) {
    return {
      status: 'review', title: 'Keep collecting corroborating evidence',
      summary: board.relevant.length === 0
        ? 'Pin the invoice and device observations. An empty board or the inventory task alone cannot establish what happened.'
        : 'Investigation is a sound next step, but the case is still incomplete. Distinguish identity context from a verified email-to-device sequence.',
      explanation, facts, nextAction: 'Pin the email and endpoint observations, and leave the routine inventory task outside the working hypothesis.',
    };
  }
  return {
    status: 'success',
    title: variant === 'curveball' ? 'An open investigation is the right response' : 'A careful triage is ready',
    summary: variant === 'curveball'
      ? 'You chose to investigate uncertain evidence rather than claim an attack or containment. Ask a human analyst to validate the device timeline.'
      : suite === 'o365e3' || !input.onboarded
        ? 'Your manual review connects the prepared email and device observations. That is useful triage without claiming automatic correlation or response.'
        : 'The prepared board relates email, device and any selected identity context. Keep the response decision with the analyst.',
    explanation, facts,
    nextAction: variant === 'curveball'
      ? 'Request a validated timestamp and independent corroboration. Do not close or isolate based on this noisy sample.'
      : 'Hand the evidence and remaining questions to the response team. Compare the other suite without changing the evidence standard.',
  };
}

export function getSharingPreview(input: SharingInput, variant: CaseVariant) {
  const fields = SHARING_SAMPLE_FIELDS
    .filter(field => !field.curveballOnly || variant === 'curveball')
    .map(field => ({ ...field, removed: input.remediate === 'redact' && field.removedByExtract }));
  const remainingSensitive = fields.filter(field => field.sensitivity !== 'public' && !field.removed);
  const hasSensitiveContent = remainingSensitive.length > 0;
  const approvedLink = input.remediate === 'approved-share';
  return {
    fields,
    remainingSensitive,
    hasSensitiveContent,
    labelMismatch: input.classification === 'public' && hasSensitiveContent,
    protectedDocument: hasSensitiveContent || input.classification === 'confidential',
    approvedLink,
    publicExtract: input.remediate === 'redact' && !hasSensitiveContent && input.classification === 'public',
    route: approvedLink ? SHARING_ROUTES.approved : SHARING_ROUTES[input.target],
  };
}

export function evaluateSharing(input: SharingInput, suite: LabSuite, variant: CaseVariant): MissionOutcome {
  const preview = getSharingPreview(input, variant);
  const baseline = suite === 'o365e3'
    ? 'Office 365 E3 has document permissions and baseline information protection and DLP for Exchange Online, SharePoint and OneDrive, including files in Teams repositories. This advanced Endpoint DLP USB scenario needs separate coverage.'
    : 'Microsoft 365 E7 includes advanced E5-level Endpoint DLP coverage. A supported, onboarded endpoint and correctly scoped policy are still required.';
  const content = preview.hasSensitiveContent
    ? `Confidential content remains: ${preview.remainingSensitive.map(field => field.label).join(', ')}. A Public label does not declassify those fields.`
    : 'The prepared extract removes the client contact and contract reference. The source stays unchanged; inspect the outgoing column, not just the label.';
  const policy = 'The sample switch controls only USB copying of a previously saved, supported local file on an onboarded physical Windows endpoint inside the enforced scope. It is not a blanket external-sharing rule; labeling alone does not enable enforcement. Requested policy exceptions remain pending.';
  const facts = [
    { label: 'Outgoing content', value: preview.hasSensitiveContent ? 'Confidential fields retained' : 'Prepared extract; marked fields removed' },
    { label: 'Applied label', value: input.classification === 'public' ? 'Public' : 'Confidential' },
    { label: 'Requested destination', value: SHARING_ROUTES[input.target] },
    { label: 'Handling route', value: preview.route },
  ];
  const explanation = [content, baseline, policy];

  if (preview.approvedLink) {
    if (preview.labelMismatch) {
      return {
        status: 'review', title: 'Keep the approved copy correctly classified',
        summary: 'The alternate has named-recipient permissions, but the retained confidential content is still mislabeled Public.',
        explanation, facts, nextAction: 'Apply Confidential and keep the owner-approved named-recipient route.',
      };
    }
    return {
      status: 'success', title: 'Use the approved link, not an uncontrolled copy',
      summary: input.target === 'usb'
        ? 'The requested USB export is replaced by a prepared named-recipient link. No USB copy is made, and the document stays confidential.'
        : 'The prepared owner-approved route keeps the original content available only to the named, authorised reviewers.',
      explanation: [...explanation, 'This alternate already has owner approval and explicit access for the appropriate named reviewers, including the restricted review group in the curveball. Choosing it does not grant or expand permissions, approve an exception or override the USB policy.'],
      facts, nextAction: 'Verify the actual recipients and their rights in a real workflow. The same careful sharing practice is available in either suite.',
    };
  }
  if (input.target === 'usb' && preview.protectedDocument) {
    if (suite === 'm365e7' && input.policyEnabled) {
      return {
        status: 'blocked', title: 'The scoped rule blocks this USB copy',
        summary: preview.labelMismatch
          ? 'The prepared content condition still matches the confidential fields, even though the copy is labeled Public.'
          : 'This sample’s enabled block rule matches the confidential content or label on the supported, onboarded endpoint.',
        explanation: [...explanation, 'The lab explicitly configures Block for the matched USB activity. Real policies can audit or block supported actions; neither detection nor enforcement is inferred for other routes.'],
        facts, nextAction: variant === 'curveball'
          ? 'Choose the approved link and apply Confidential. The prepared extract still retains the restricted care note.'
          : 'Use the approved link, or inspect the prepared public extract and label that clean copy Public.',
      };
    }
    return {
      status: suite === 'o365e3' ? 'separate' : 'needs-setup',
      title: suite === 'o365e3' ? 'Hold the copy; endpoint coverage is separate' : 'A label is not a USB policy',
      summary: suite === 'o365e3'
        ? 'No USB block is attributed to Office 365 E3 here, even if the sample policy switch is on. The lab holds the proposal for a human; it does not imply E3 freely leaks data.'
        : 'The lab holds the proposal for review. No endpoint block is modeled until the supported device and scoped block rule are configured.',
      explanation, facts, nextAction: 'Use the approved named-recipient link. To explore the endpoint rule, compare E7 and enable its scoped USB policy.',
    };
  }
  if (preview.labelMismatch) {
    return {
      status: input.target === 'external' ? 'blocked' : 'review',
      title: input.remediate === 'redact' ? 'The public extract still contains a restricted field' : 'The content has not become public',
      summary: input.target === 'external'
        ? 'This copy is not approved for the external recipient. Its confidential content and team-only source permissions remain in force; the USB switch does not decide this route.'
        : 'The Lantern team may have access, but the proposed Public classification is wrong. Correct the handling before continuing.',
      explanation, facts, nextAction: variant === 'curveball'
        ? 'Apply Confidential and use the prepared owner-approved link for the restricted reviewers.'
        : 'Apply Confidential for team work, or choose the reviewed extract and check which fields were removed.',
    };
  }
  if (preview.publicExtract) {
    return {
      status: 'success', title: 'The prepared public extract is ready',
      summary: 'The outgoing sample contains only the project name and workshop update. The confidential contact and contract lines are visibly removed.',
      explanation: [...explanation, 'For this authored case, the owner has approved this clean extract for the chosen destination. A real redaction still needs content and release review; relabeling the original is not equivalent.'],
      facts, nextAction: 'Compare the source and outgoing columns. Try the curveball before assuming the same redaction always removes everything sensitive.',
    };
  }
  if (variant === 'curveball' && preview.hasSensitiveContent) {
    return {
      status: input.target === 'external' ? 'blocked' : 'review',
      title: 'The restricted note needs the approved review route',
      summary: 'The care note is still in the outgoing copy. The ordinary team workspace and external destination are not the prepared restricted-review route.',
      explanation: [...explanation, 'The curveball requires the owner-approved restricted reviewers, not the ordinary team audience. The prepared extract does not remove this extra field.'],
      facts, nextAction: 'Keep Confidential and choose the owner-approved named-recipient link for the restricted reviewers.',
    };
  }
  if (input.target === 'external') {
    return {
      status: 'blocked', title: 'The recipient is outside this document’s permissions',
      summary: 'The original is restricted to the Lantern team. This external reviewer has not been granted access, in either suite.',
      explanation: [...explanation, 'This result comes from the prepared document permissions, not a universal E7 DLP rule. Turning the USB policy on or off does not authorise an external reader.'],
      facts, nextAction: 'Choose the pre-approved named-recipient link, or use the clean, owner-reviewed public extract for the everyday case.',
    };
  }
  return {
    status: 'success', title: 'The team can keep working',
    summary: 'The prepared team workspace already grants the Lantern team access. A Confidential label does not require stopping authorised collaboration.',
    explanation: [...explanation, 'Team permissions and correct handling are useful in Office 365 E3 as well as Microsoft 365 E7. Advanced endpoint controls are not a prerequisite for this team-only route.'],
    facts, nextAction: 'Try a USB destination to examine the scoped endpoint policy, or test the external recipient’s separate permissions.',
  };
}

export function getAgentAccess(input: AgentInput) {
  return {
    owner: AGENT_SAMPLE.owners[input.owner],
    file: AGENT_SAMPLE[input.task],
    sourceAllows: input.task === 'project' || input.permissions === 'all',
    broad: input.permissions === 'all',
    assigned: input.owner !== 'none',
  };
}

export function getAgentToolControl(input: AgentInput, suite: LabSuite) {
  const active = suite === 'm365e7' && input.policyEnabled;
  return {
    tool: AGENT_SAMPLE.tools[input.task],
    active,
    allows: !active || input.task === 'project',
  };
}

export function evaluateAgent(input: AgentInput, suite: LabSuite, variant: CaseVariant): MissionOutcome {
  const access = getAgentAccess(input);
  const toolControl = getAgentToolControl(input, suite);
  const baseline = suite === 'o365e3'
    ? 'Office 365 E3 includes basic Agent 365 inventory, owner reassignment and core agent administration, including blocking an agent. A manual owner and access inventory is also valid. Premium Agent 365 policy templates and selective tool controls require separate coverage; basic ownership and ordinary permission denials are not E7-exclusive.'
    : 'Microsoft 365 E7 includes premium Agent 365 governance for supported agents with qualifying tenant setup and licence assignments. Policy templates and tool controls need configuration; registration does not grant source access.';
  const permission = access.broad
    ? 'The broad setting explicitly models existing read grants to both project and payroll files. Neither assigning an owner nor enabling a tool policy repairs this over-grant.'
    : 'Project-only source permissions exclude payroll. A policy toggle, owner assignment or E7 licence does not add file access.';
  const scope = 'The switch models one premium selective tool control for this prepared supported agent: Project reader is permitted and Payroll reader is excluded. It is not universal agent DLP or basic whole-agent blocking. Real controls need supported tools, an eligible registered agent and scoped configuration.';
  const facts = [
    { label: 'Recorded owner', value: access.owner },
    { label: 'Requested source', value: access.file.title },
    { label: 'Source permission', value: access.sourceAllows ? 'Read granted by the fixture' : 'Read denied by the fixture' },
    { label: 'Requested tool', value: toolControl.tool },
    { label: 'Premium tool policy', value: toolControl.active
      ? toolControl.allows ? 'Requested tool permitted' : 'Requested tool excluded'
      : input.policyEnabled ? 'Separate coverage; no premium enforcement modeled' : 'Not enabled' },
  ];
  const explanation = [
    permission, baseline, scope,
    'This prepared helper does not run. Agent 365 governance is not agent building or unlimited runtime, connector or model consumption.',
    'New agent-generated content does not automatically inherit source sensitivity labels. Review and classify the output separately.',
  ];
  if (!access.sourceAllows) {
    return {
      status: 'blocked', title: 'Payroll stays outside the agent’s access',
      summary: variant === 'curveball'
        ? 'The unexpected request meets a useful boundary: project-only permissions deny payroll. Route the question to an authorised human rather than widening this agent’s access.'
        : 'The project helper cannot read the restricted payroll source. That is a beneficial least-privilege result in either suite.',
      explanation: [...explanation, access.assigned
        ? 'The recorded owner should review this out-of-purpose request. This denial is a file-permission boundary, not a claim that every agent tool is governed.'
        : 'The file boundary holds even without a recorded owner. Assign an accountable owner before treating the agent’s governance setup as complete.'],
      facts, nextAction: access.assigned
        ? 'Keep project-only access, ask the owner to review the payroll request and return the helper to its project brief.'
        : 'Keep project-only access and assign an owner. Send the payroll request to an authorised human.',
    };
  }
  if (!toolControl.allows) {
    return {
      status: 'blocked', title: 'The scoped tool policy stops this request',
      summary: 'The prepared premium policy excludes Payroll reader while keeping Project reader available. It stops this supported tool request, but the broad payroll file grant is still a risk.',
      explanation: [...explanation, 'The source still grants payroll read access; this result is a selective tool restriction, not an ACL repair. Another route could still expose the over-granted file. No live agent or tool was run.'],
      facts, nextAction: 'Keep the scoped tool restriction, narrow the source grant to project files and send the payroll question to an authorised human. Confirm an accountable owner.',
    };
  }
  if (access.broad) {
    return {
      status: 'review', title: 'The grant is broader than the job',
      summary: input.task === 'payroll'
        ? 'The explicit broad source grant would allow payroll access. No included, enabled selective tool policy stops this request; registration has not removed that exposure.'
        : 'The project request is allowed, but this helper could also read payroll. A successful project task does not make that grant appropriate.',
      explanation: [...explanation, input.policyEnabled && suite === 'm365e7'
        ? 'The configured policy permits this project tool but does not automatically revoke the unused payroll source permission. Fix that over-grant separately.'
        : 'Record the over-grant for the owner and the source administrator; no automatic correction is modeled.'],
      facts, nextAction: 'Remove the broad source grant by switching to project-only access. Record an owner and test the payroll boundary again.',
    };
  }
  if (!access.assigned) {
    return {
      status: suite === 'm365e7' ? 'needs-setup' : 'review', title: 'Record someone accountable for this helper',
      summary: 'The project file is permitted, but the passport has no owner to review purpose, changes or unexpected requests.',
      explanation, facts, nextAction: 'Assign Maya or the IT team and keep project-only source permissions.',
    };
  }
  if (suite === 'o365e3' && input.policyEnabled) {
    return {
      status: 'separate', title: 'Basic inventory is included; selective tool controls are separate',
      summary: 'The owner and source access are sensible, but this Office 365 E3 suite does not include the illustrated premium Agent 365 policies. The switch does not add a licence.',
      explanation, facts, nextAction: 'Turn off the premium tool-policy preview to use basic administration or a manual inventory. Compare E7 to examine the scoped selective tool control.',
    };
  }
  if (suite === 'm365e7' && !input.policyEnabled) {
    return {
      status: 'needs-setup', title: 'Basic inventory is ready; the premium policy is not',
      summary: 'Ownership and project access are recorded. The premium selective tool policy has not been configured for this supported sample agent. Basic administration and source permissions remain valid.',
      explanation, facts, nextAction: 'Enable the scoped tool policy after confirming the agent identity, licence assignment and supported tool integration.',
    };
  }
  return {
    status: 'success', title: suite === 'o365e3' ? 'A useful basic owner and access inventory' : 'An owned helper with a bounded job',
    summary: variant === 'curveball'
      ? 'The helper stays on the project brief. Send the unexpected payroll request to an authorised human; do not expand the agent’s sources to satisfy it.'
      : 'The named owner and project-only permissions fit the workshop job. Payroll stays outside the grant.',
    explanation, facts, nextAction: 'Test the payroll request without widening access. A refusal can demonstrate a useful boundary, not a broken agent.',
  };
}
