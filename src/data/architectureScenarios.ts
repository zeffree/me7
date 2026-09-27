import type { ArchitectureScenario, ArchitectureScenarioId, ScenarioStep } from './architectureTypes';

const workRequest: ScenarioStep = {
  id: 'work-request', title: 'A person has work to do',
  summary: 'An employee starts a project-summary task from a work device.',
  detail: 'The example establishes the employee identity and device context. It does not trust an office network or assume that signing in authorizes every work file.',
  nodeIds: ['employee', 'device', 'entra-id'], edgeIds: ['employee-device', 'employee-entra'],
  focusNodeId: 'employee', status: 'ready',
};

const compliantDevice: ScenarioStep = {
  id: 'work-device-compliant', title: 'Device requirements are met',
  summary: 'Intune reports a compliant device for this configured example.',
  detail: 'Assigned rules and a current device report provide the compliance signal. Conditional Access consumes the result; Intune is not a proxy through which the document travels.',
  nodeIds: ['device', 'intune', 'conditional-access'], edgeIds: ['device-intune', 'intune-access-policy'],
  focusNodeId: 'intune', status: 'ready',
};

const threatEvidence: readonly ScenarioStep[] = [
  {
    id: 'threat-injected', title: 'Introduce a suspicious sign-in',
    summary: 'An authored sign-in signal starts this investigation.',
    detail: 'The toggle introduces a prepared example with corroborating workload activity. A risky sign-in alone would not prove a compromise or guarantee an automated response; this is not a live detection or risk prediction.',
    nodeIds: ['employee', 'entra-id', 'conditional-access'], edgeIds: ['employee-entra', 'entra-access-policy'],
    focusNodeId: 'entra-id', status: 'ready',
  },
  {
    id: 'threat-evidence', title: 'Look beyond one alert',
    summary: 'The example includes related device, email, identity and SaaS evidence.',
    detail: 'The relevant Defender workloads are assumed licensed and onboarded. Endpoint activity, a related email, supported identity-environment evidence and connected SaaS activity contribute distinct observations—not a request passing through four security products.',
    nodeIds: ['defender-endpoint', 'defender-office', 'defender-identity', 'defender-cloud-apps', 'defender-xdr'],
    edgeIds: ['endpoint-xdr', 'office-xdr', 'identity-xdr', 'cloud-apps-xdr'],
    focusNodeId: 'defender-endpoint', status: 'detected',
  },
  {
    id: 'threat-correlated', title: 'Connect the incident',
    summary: 'Defender XDR relates the prepared evidence and affected identity.',
    detail: 'Correlation provides an incident for investigation, rather than asserting that every risky sign-in is an attack. The example assumes a supported high-confidence case; real detection depends on available evidence and product behavior.',
    nodeIds: ['entra-id', 'defender-xdr'], edgeIds: ['entra-xdr'],
    focusNodeId: 'defender-xdr', status: 'detected',
  },
  {
    id: 'threat-analyst-brief', title: 'Help the analyst understand',
    summary: 'Security Copilot assists with a brief from permitted incident context.',
    detail: 'The analyst validates the explanation and proposed next steps. The example assumes tenant enablement, appropriate permissions and available capped capacity. Defender detection does not depend on this assistant.',
    nodeIds: ['defender-xdr', 'security-copilot'], edgeIds: ['xdr-security-copilot'],
    focusNodeId: 'security-copilot', status: 'review',
  },
];

const agentRegistration: ScenarioStep = {
  id: 'agent-registered', title: 'Know which agent is working',
  summary: 'An owned project-summary agent is visible in Agent 365.',
  detail: 'The registry provides lifecycle and ownership context. Registration never grants access to a file, connector or model, and it does not provide unlimited execution.',
  nodeIds: ['agent365', 'agent'], edgeIds: ['agent365-agent'],
  focusNodeId: 'agent365', status: 'ready',
};

const agentIdentity: ScenarioStep = {
  id: 'agent-identified', title: 'Establish accountable identity',
  summary: 'The request uses an explicitly configured agent identity.',
  detail: 'The example checks authorized scope independently from registration and DLP. It does not rely on Preview Conditional Access agent targeting or treat human device-compliance controls as universally applicable to agents.',
  nodeIds: ['agent', 'entra-id'], edgeIds: ['agent-entra'],
  focusNodeId: 'entra-id', status: 'ready',
};

const agentPermission: ScenarioStep = {
  id: 'agent-authorized', title: 'Give the agent only the right reach',
  summary: 'The approved project files are explicitly shared with this agent.',
  detail: 'Identity and resource permissions limit the request. Encrypted files additionally require explicit VIEW and EXTRACT usage rights. An unrelated restricted folder is outside the allowed scope.',
  nodeIds: ['entra-id', 'agent'], edgeIds: ['entra-agent'],
  focusNodeId: 'agent', status: 'allowed',
};

export const ARCHITECTURE_SCENARIOS: readonly ArchitectureScenario[] = [
  {
    id: 'secure-work', title: 'Get work done, safely', shortTitle: 'Secure work',
    description: 'Follow an employee from an access request to a permission-aware Copilot draft.',
    goal: 'Use an approved project file without treating identity, device compliance or Copilot as a universal permission grant.',
    assumption: 'Illustrative E7 configuration: assigned Intune rules, a current device report and an enabled access policy require a compliant device and an additional challenge for risky sign-ins. The employee has project-file permissions. Checkpoints show logical contributions, not one network protocol; Private Access and full Internet Access are optional, separately configured paths in Explore.',
    principle: 'Verify explicitly',
    controls: [
      {
        id: 'deviceCompliant', label: 'Device compliance', defaultValue: true,
        description: 'Change the device result used by this example’s enabled require-compliant-device policy.',
        onLabel: 'Compliant', offLabel: 'Noncompliant',
      },
      {
        id: 'riskySignIn', label: 'Sign-in risk', defaultValue: false,
        description: 'Introduce a sign-in risk condition requiring an additional challenge under the illustrated P2 policy.',
        onLabel: 'Risk signal present', offLabel: 'No risk signal injected',
      },
    ],
    branches: [
      {
        id: 'work-device-blocked', when: { deviceCompliant: false }, outcome: 'blocked',
        outcomeTitle: 'Resolve device compliance first',
        outcomeSummary: 'The enabled policy denies this request before work-file access or Copilot grounding. Fixing the device requires reevaluation; no other access requirement disappears.',
        steps: [
          workRequest,
          {
            id: 'work-device-failed', title: 'The device misses a requirement',
            summary: 'Intune’s authored result is noncompliant.',
            detail: 'The device does not satisfy the assigned configuration rules. The signal is supplied to Conditional Access; changing the comparison baseline would not change this simulated device result.',
            nodeIds: ['device', 'intune'], edgeIds: ['device-intune'],
            focusNodeId: 'intune', status: 'ready',
          },
          {
            id: 'work-device-denied', title: 'The scoped policy blocks access',
            summary: 'The require-compliant-device condition is not met.',
            detail: 'Conditional Access evaluates the supplied result and denies this request. A valid identity, an existing file permission or a Copilot licence does not override this enabled policy.',
            nodeIds: ['entra-id', 'intune', 'conditional-access'], edgeIds: ['entra-access-policy', 'intune-access-policy'],
            focusNodeId: 'conditional-access', status: 'blocked',
          },
          {
            id: 'work-remediate-device', title: 'Stop and remediate',
            summary: 'No work file is opened and no Copilot context is retrieved.',
            detail: 'The employee must resolve the device issue and obtain a new compliance evaluation before retrying. If a sign-in risk is also present, that requirement still needs to be resolved.',
            nodeIds: ['conditional-access', 'employee', 'intune', 'device'], edgeIds: ['access-session-review', 'intune-device'],
            focusNodeId: 'device', status: 'blocked',
          },
        ],
      },
      {
        id: 'work-sign-in-challenged', when: { riskySignIn: true }, outcome: 'challenged',
        outcomeTitle: 'An additional challenge is outstanding',
        outcomeSummary: 'The compliant device is not enough: this sign-in needs the configured challenge. The journey stops before resource access; it does not invent a successful MFA response.',
        steps: [
          workRequest,
          compliantDevice,
          {
            id: 'work-risk-check', title: 'Identity risk changes the decision',
            summary: 'The example’s risk policy requires another verification step.',
            detail: 'Entra ID Protection risk is evaluated by the configured P2 policy. Device compliance and identity risk are different signals, so satisfying one does not waive the other.',
            nodeIds: ['entra-id', 'conditional-access'], edgeIds: ['entra-access-policy'],
            focusNodeId: 'conditional-access', status: 'challenged',
          },
          {
            id: 'work-challenge-outstanding', title: 'Pause before opening the resource',
            summary: 'The employee has not completed the required challenge.',
            detail: 'This authored journey ends at the challenge. No file retrieval or Copilot completion follows. In a real deployment the relevant policy and authentication result determine the next decision.',
            nodeIds: ['conditional-access', 'employee'], edgeIds: ['access-session-review'],
            focusNodeId: 'employee', status: 'challenged',
          },
        ],
      },
      {
        id: 'work-complete', when: {}, outcome: 'complete',
        outcomeTitle: 'A permitted draft, ready for human review',
        outcomeSummary: 'Identity policy, Intune compliance and resource permissions each did a different job. Copilot helped with permitted context; no step made the whole tenant trusted or repaired oversharing.',
        steps: [
          workRequest,
          compliantDevice,
          {
            id: 'work-access-allowed', title: 'This request meets the access policy',
            summary: 'The example’s compliant-device and sign-in conditions are satisfied.',
            detail: 'Conditional Access permits the scoped app request after authentication. This is not permission to every file, and later changes in relevant conditions may require another decision.',
            nodeIds: ['entra-id', 'conditional-access', 'm365-apps'], edgeIds: ['entra-access-policy', 'access-work-apps'],
            focusNodeId: 'conditional-access', status: 'allowed',
          },
          {
            id: 'work-resource-permitted', title: 'Check the actual work-file permission',
            summary: 'SharePoint supplies only the project file this employee can access.',
            detail: 'The resource’s permissions and applicable information-protection rights remain in force. The authored file is permitted; a broadly shared real file would need a sharing review rather than a promise that Copilot will fix it.',
            nodeIds: ['m365-apps', 'sharepoint', 'purview'], edgeIds: ['apps-sharepoint', 'purview-sharepoint'],
            focusNodeId: 'sharepoint', status: 'allowed',
          },
          {
            id: 'work-copilot-grounded', title: 'Bring permitted context to Copilot',
            summary: 'Copilot uses relevant work content to prepare the project summary.',
            detail: 'Graph supplies permission-aware content and Work IQ supports the work context. These are logical grounding relationships, not another E7 SKU or an unrestricted copy of organizational data.',
            nodeIds: ['m365-apps', 'sharepoint', 'work-context', 'copilot'],
            edgeIds: ['apps-copilot', 'sharepoint-context', 'context-copilot'],
            focusNodeId: 'copilot', status: 'allowed',
          },
          {
            id: 'work-draft-returned', title: 'Keep the employee in the loop',
            summary: 'The employee receives a draft and checks its sources and content.',
            detail: 'Copilot returns generated help in the available work experience while honoring applicable data protections. The employee reviews the result; this illustration does not claim a measured productivity gain or error-free output.',
            nodeIds: ['copilot', 'm365-apps', 'purview'], edgeIds: ['copilot-apps', 'purview-copilot'],
            focusNodeId: 'm365-apps', status: 'complete',
          },
        ],
      },
    ],
  },
  {
    id: 'contain-threat', title: 'Contain a compromised session', shortTitle: 'Contain a threat',
    description: 'Connect a prepared suspicious-signal example to investigation and a bounded response.',
    goal: 'Understand why detecting an incident and executing a response are separate, complementary capabilities.',
    assumption: 'Authored illustration, not a risk predictor: the risk toggle injects a prepared sign-in signal with corroborating Defender evidence. Relevant workloads and identity integrations are onboarded, and Security Copilot has permitted context and available capped capacity. Automated response, when enabled here, represents a supported configured case—not a universal tenant switch or guaranteed detector behavior.',
    principle: 'Assume breach',
    controls: [
      {
        id: 'riskySignIn', label: 'Suspicious signal', defaultValue: true,
        description: 'Inject the authored suspicious sign-in and related evidence. With this off, no incident is manufactured.',
        onLabel: 'Example signal present', offLabel: 'No signal injected',
      },
      {
        id: 'automaticResponse', label: 'Automated response', defaultValue: true,
        description: 'Include the representative configured containment action, or leave detection intact for human review.',
        onLabel: 'Configured for this example', offLabel: 'Human response required',
      },
    ],
    branches: [
      {
        id: 'threat-no-signal', when: { riskySignIn: false }, outcome: 'complete',
        outcomeTitle: 'No incident was injected',
        outcomeSummary: 'Monitoring remains represented, but this replay has no suspicious evidence to investigate or contain. Absence of an injected example does not prove a real environment is threat-free.',
        steps: [
          {
            id: 'threat-monitor-ready', title: 'Keep the monitoring configuration',
            summary: 'The reference environment remains ready to observe activity.',
            detail: 'Turning off the example signal does not disable the depicted security products. The simulation simply stops injecting its prepared incident evidence.',
            nodeIds: ['device', 'entra-id', 'defender-xdr'], edgeIds: [],
            focusNodeId: 'device', status: 'ready',
          },
          {
            id: 'threat-no-workload-alert', title: 'No suspicious workload evidence is authored',
            summary: 'There is no prepared Defender alert to correlate in this replay.',
            detail: 'The product relationships remain visible, but they do not establish a detection. Real products evaluate their own available telemetry; this demo does not measure it.',
            nodeIds: ['defender-endpoint', 'defender-office', 'defender-identity', 'defender-cloud-apps', 'defender-xdr'],
            edgeIds: ['endpoint-xdr', 'office-xdr', 'identity-xdr', 'cloud-apps-xdr'],
            focusNodeId: 'defender-xdr', status: 'ready',
          },
          {
            id: 'threat-no-risk', title: 'Do not infer an identity incident',
            summary: 'No suspicious sign-in condition is injected.',
            detail: 'Identity and access-policy configuration still exist. No new incident or containment action is justified by this authored input alone.',
            nodeIds: ['entra-id', 'conditional-access'], edgeIds: ['entra-access-policy'],
            focusNodeId: 'entra-id', status: 'ready',
          },
          {
            id: 'threat-no-action', title: 'Finish without inventing a response',
            summary: 'No synthetic incident needs containment.',
            detail: 'The result is the same with automated response on or off because there is no injected signal. Continue real monitoring and investigation processes; the demo offers no assurance about an actual tenant.',
            nodeIds: ['defender-xdr'], edgeIds: [],
            focusNodeId: 'defender-xdr', status: 'complete',
          },
        ],
      },
      {
        id: 'threat-human-review', when: { automaticResponse: false }, outcome: 'review',
        outcomeTitle: 'Detection remains; a human must respond',
        outcomeSummary: 'The prepared incident is still detected and correlated. An analyst must investigate and authorize appropriate response; removing this automated action does not remove all other protections.',
        steps: [
          ...threatEvidence,
          {
            id: 'threat-await-response', title: 'Hand the decision to the analyst',
            summary: 'Keep the incident open for human investigation and response.',
            detail: 'No automated containment or session-revocation action is shown. Existing prevention and access controls remain, but this workflow needs an accountable analyst to choose and validate the response.',
            nodeIds: ['defender-xdr', 'security-copilot'], edgeIds: [],
            focusNodeId: 'defender-xdr', status: 'review',
          },
        ],
      },
      {
        id: 'threat-contained', when: {}, outcome: 'contained',
        outcomeTitle: 'Representative containment, not the end of recovery',
        outcomeSummary: 'The configured example limits relevant endpoint and identity activity. Analysts still validate action results, investigate scope and plan recovery; no instant revocation everywhere or guaranteed prevention is claimed.',
        steps: [
          ...threatEvidence,
          {
            id: 'threat-response', title: 'Apply supported containment actions',
            summary: 'The authored response coordinates endpoint and Entra actions.',
            detail: 'This supported example assumes an appropriate high-confidence incident, integrations and response permissions. Endpoint containment/isolation and an Entra identity/session action have different scopes; exclusions and application behavior affect the result.',
            nodeIds: ['defender-xdr', 'defender-endpoint', 'device', 'entra-id'],
            edgeIds: ['xdr-endpoint-response', 'defender-device-response', 'xdr-entra-response'],
            focusNodeId: 'defender-endpoint', status: 'contained',
          },
          {
            id: 'threat-validate-response', title: 'Reevaluate access and validate the response',
            summary: 'The affected identity does not simply resume a trusted session.',
            detail: 'Subsequent scoped access is reevaluated under the configured policy. Analysts verify actual action results and propagation, investigate remaining scope and recover affected assets. This checkpoint does not mean every token in every application stopped immediately.',
            nodeIds: ['entra-id', 'conditional-access', 'employee', 'defender-xdr'],
            edgeIds: ['entra-access-policy', 'access-session-review'],
            focusNodeId: 'conditional-access', status: 'contained',
          },
        ],
      },
    ],
  },
  {
    id: 'govern-agent', title: 'Give an agent the right reach', shortTitle: 'Govern an agent',
    description: 'Let a governed agent prepare a useful project summary without granting open-ended reach.',
    goal: 'Separate registration, resource authorization and supported data protection while keeping an accountable owner.',
    assumption: 'Illustrative supported Agent 365 instance with an owner, explicit project-file permissions and validated execution/consumption arrangements. The configured case targets the agent in an applicable Purview policy for its SharePoint interaction. The no-policy branch is an authored human-review hold, not a claim that missing DLP automatically blocks or leaks data. Preview agent Conditional Access targeting is not assumed.',
    principle: 'Use least privilege',
    controls: [
      {
        id: 'agentAuthorized', label: 'Requested resource', defaultValue: true,
        description: 'Choose a project resource explicitly shared with the agent, or an out-of-scope request.',
        onLabel: 'Within authorized scope', offLabel: 'Outside authorized scope',
      },
      {
        id: 'dataPolicyEnabled', label: 'Data-handling policy', defaultValue: true,
        description: 'Include an applicable, configured agent data policy, or pause the authorized task for handling review.',
        onLabel: 'Configured and targeted', offLabel: 'Review required',
      },
    ],
    branches: [
      {
        id: 'agent-denied', when: { agentAuthorized: false }, outcome: 'blocked',
        outcomeTitle: 'Registration is not permission',
        outcomeSummary: 'The out-of-scope request is denied before file retrieval, regardless of the DLP setting. Agent 365 visibility never grants access to the requested resource.',
        steps: [
          agentRegistration,
          agentIdentity,
          {
            id: 'agent-authorization-denied', title: 'Deny the out-of-scope request',
            summary: 'The requested resource is not authorized for this agent.',
            detail: 'The modeled authorization boundary combines identity scope and the destination’s explicit permissions. No work file is retrieved. Turning off DLP cannot grant the missing permission.',
            nodeIds: ['entra-id', 'agent'], edgeIds: ['entra-agent'],
            focusNodeId: 'entra-id', status: 'blocked',
          },
          {
            id: 'agent-denial-review', title: 'Return the denied task to its owner',
            summary: 'The agent does not continue into a successful data task.',
            detail: 'The owner reviews the denied attempt using available activity records and corrects the request or follows the approval process. This is a governance follow-up, not a fallback route around authorization.',
            nodeIds: ['agent', 'agent365'], edgeIds: ['agent-agent365'],
            focusNodeId: 'agent365', status: 'blocked',
          },
        ],
      },
      {
        id: 'agent-data-review', when: { dataPolicyEnabled: false }, outcome: 'review',
        outcomeTitle: 'Authorized reach still needs a handling decision',
        outcomeSummary: 'Permissions remain in force, but the illustrated workflow pauses for a data-handling review before processing. Missing this policy is neither permission to all data nor evidence that a leak occurred.',
        steps: [
          agentRegistration,
          agentIdentity,
          agentPermission,
          {
            id: 'agent-policy-absent', title: 'Notice the missing data-handling policy',
            summary: 'The applicable agent policy has not been configured.',
            detail: 'This example cannot demonstrate that specific DLP control. Other permissions, labels and rights do not disappear. The workflow owner chooses a review hold instead of proceeding on an unexamined assumption.',
            nodeIds: ['purview', 'agent'], edgeIds: [],
            focusNodeId: 'purview', status: 'review',
          },
          {
            id: 'agent-review-hold', title: 'Review before processing the files',
            summary: 'The owner must validate handling requirements and supported policy scope.',
            detail: 'No data-processing checkpoint follows in this authored branch. The owner checks the agent instance, supported SharePoint interaction, destination and output labeling. This is a procedural hold, not a product claim that absence of DLP disables all access.',
            nodeIds: ['agent', 'agent365', 'purview'], edgeIds: ['agent-agent365'],
            focusNodeId: 'agent365', status: 'review',
          },
        ],
      },
      {
        id: 'agent-complete', when: {}, outcome: 'complete',
        outcomeTitle: 'Useful work within an explicit boundary',
        outcomeSummary: 'The agent completes the approved project summary with permitted files, a supported data policy and accountable output review. Governance did not grant unrestricted access or unlimited runtime.',
        steps: [
          agentRegistration,
          agentIdentity,
          agentPermission,
          {
            id: 'agent-policy-targeted', title: 'Apply the right data policy',
            summary: 'The applicable policy explicitly targets this agent instance.',
            detail: 'The example uses a supported SharePoint interaction and approved content/destination. DLP scope and encryption usage rights are configured; a generic policy name is not proof every arbitrary agent tool call is inspected.',
            nodeIds: ['purview', 'agent'], edgeIds: ['purview-agent'],
            focusNodeId: 'purview', status: 'allowed',
          },
          {
            id: 'agent-work-permitted', title: 'Process the approved project content',
            summary: 'The agent uses only files explicitly available to it.',
            detail: 'The task produces a project summary within the permitted scope. Site/file permissions and any required VIEW and EXTRACT rights still apply, alongside the configured data-handling controls.',
            nodeIds: ['agent', 'sharepoint', 'purview'], edgeIds: ['agent-sharepoint', 'purview-sharepoint'],
            focusNodeId: 'sharepoint', status: 'allowed',
          },
          {
            id: 'agent-output-reviewed', title: 'Review the result and retain oversight',
            summary: 'The owner checks the summary in its approved project destination.',
            detail: 'Supported interaction records and agent activity remain available for oversight. The owner validates content and applies any required output label: new Agent 365 content does not automatically inherit source labels. Execution, connectors and model consumption retain their own terms.',
            nodeIds: ['agent', 'agent365', 'purview', 'sharepoint'], edgeIds: ['agent-agent365', 'agent-purview'],
            focusNodeId: 'agent', status: 'complete',
          },
        ],
      },
    ],
  },
];

export function getArchitectureScenario(id: ArchitectureScenarioId): ArchitectureScenario {
  const scenario = ARCHITECTURE_SCENARIOS.find((item) => item.id === id);
  if (!scenario) throw new Error(`Unknown architecture scenario: ${id}`);
  return scenario;
}
