import { COVERAGE_META } from '../lib/coverage';
import { CATEGORIES } from './categories';
import { E7_SKU, getBaseline, type BaselineSkuId } from './skus';
import { SECURITY_COPILOT_ALLOWANCE } from './sources';
import type {
  ArchitectureBundle,
  ArchitectureCoverage,
  ArchitectureEdge,
  ArchitectureEdgeKind,
  ArchitectureNode,
  ArchitecturePillar,
} from './architectureTypes';

export const ARCHITECTURE_PILLARS: readonly ArchitecturePillar[] = [
  { id: 'identity', label: 'Identities', description: 'Verify people and workloads; grant only the access they need.' },
  { id: 'endpoint', label: 'Endpoints', description: 'Manage device configuration, evaluate compliance and respond to device threats.' },
  { id: 'network', label: 'Network', description: 'Control connectivity without treating a network location as inherently trusted.' },
  { id: 'apps', label: 'Apps', description: 'Apply permissions and controls where people and agents do their work.' },
  { id: 'data', label: 'Data', description: 'Protect information through permissions, classification and data-handling policies.' },
  { id: 'infrastructure', label: 'Infrastructure', description: 'Harden and monitor compute resources; retain separate workload and recovery services.' },
  { id: 'secops', label: 'SecOps', description: 'Connect evidence to investigation, response and an accountable recovery process.' },
];

export const BUNDLE_LABELS: Record<ArchitectureBundle, string> = {
  e5: getBaseline('m365e5').name,
  copilot: E7_SKU.deltaOverE5[0].name,
  'entra-suite': E7_SKU.deltaOverE5[2].name,
  agent365: E7_SKU.deltaOverE5[1].name,
  context: 'Architecture context · not an extra SKU',
  external: `Separate from ${E7_SKU.shortName}`,
};

export const EDGE_KIND_LABELS: Record<ArchitectureEdgeKind, string> = {
  access: 'Access request',
  signal: 'Signal / evidence',
  policy: 'Policy / enforcement',
  data: 'Permitted data / context',
  governance: 'Governance / lifecycle',
  response: 'Response / reevaluation',
};

/** A logical reference model: edges are relationships, not one end-to-end packet route. */
export const ARCHITECTURE_NODES: readonly ArchitectureNode[] = [
  {
    id: 'employee', label: 'Employee', shortLabel: 'Employee', pillar: 'identity', bundle: 'context', kind: 'person',
    description: 'A person requests access to a work resource and remains accountable for the result.',
    technical: 'This synthetic employee represents a user identity and a business task, not a trusted actor by network location.',
    prerequisites: ['A provisioned identity, an assigned role and a legitimate resource need.'],
    categoryIds: [], sourceIds: ['architecture-zero-trust'],
  },
  {
    id: 'device', label: 'Work device', shortLabel: 'Device', pillar: 'endpoint', bundle: 'context', kind: 'device',
    description: 'The employee works from a device whose configuration and health contribute to access decisions.',
    technical: 'A compliant device satisfies assigned rules at evaluation time; it is not guaranteed threat-free. Reporting and policy refresh affect the available signal.',
    prerequisites: ['Supported device enrollment and a current compliance evaluation for the illustrated policy.'],
    categoryIds: [], sourceIds: ['architecture-device-compliance'],
  },
  {
    id: 'entra-id', label: 'Microsoft Entra ID', shortLabel: 'Entra ID', pillar: 'identity', bundle: 'e5', kind: 'service',
    description: 'Establish identity, authenticate the request and supply identity risk context.',
    technical: 'E5 includes Entra ID P2. Authentication is distinct from resource authorization; Entra ID Protection can contribute user and sign-in risk to configured policies.',
    prerequisites: ['Assigned identities and application integration.', 'Risk-based policies need P2 and a scoped configuration.'],
    categoryIds: ['sso-mfa'], sourceIds: ['architecture-conditional-access', 'm365-packaging-2026', 'e7-announcement'],
    coverageNote: 'The mapped category combines SSO, MFA and Conditional Access tiers. M365 E3 already has P1; E7 adds the P2 tier, not identity from scratch.',
  },
  {
    id: 'conditional-access', label: 'Entra Conditional Access', shortLabel: 'Access policy', pillar: 'identity', bundle: 'e5', kind: 'service',
    description: 'Evaluate the relevant identity, device and risk conditions before permitting a scoped request.',
    technical: 'Conditional Access runs after first-factor authentication. Policies can require MFA, require a compliant device or block access. It does not replace application permissions.',
    prerequisites: ['Enabled policies with deliberate user/resource scope and emergency-access exclusions.', 'P1 for Conditional Access; P2 for user/sign-in risk policies.'],
    categoryIds: ['sso-mfa'], sourceIds: ['architecture-conditional-access', 'architecture-device-compliance'],
    coverageNote: 'Core Conditional Access is already in M365 E3. This model includes P2 risk controls. Agent targeting has Preview qualifications and is not required for the agent permission boundary shown here.',
  },
  {
    id: 'identity-governance', label: 'Entra ID Governance', shortLabel: 'ID Governance', pillar: 'identity', bundle: 'entra-suite', kind: 'service',
    description: 'Manage who should retain access as people join, move and leave.',
    technical: 'Entitlement management, lifecycle workflows and access reviews connect business ownership to the identity/access lifecycle. A review process complements runtime access checks.',
    prerequisites: ['Resource owners, access packages and an operating review process.', 'Eligible users and configured lifecycle integrations.'],
    categoryIds: ['identity-governance'], sourceIds: ['architecture-identity-governance', 'e7-announcement'],
    coverageNote: 'The category maps the full Governance offering. E5/P2 already includes a subset; not every governance feature is new with E7.',
  },
  {
    id: 'private-access', label: 'Entra Private Access', shortLabel: 'Private Access', pillar: 'network', bundle: 'entra-suite', kind: 'service',
    description: 'Provide identity-aware access to selected private applications instead of trusting the entire network.',
    technical: 'Private Access connects a configured client to published private resources with per-app access policies. It is a separate path from normal Microsoft 365 resource access.',
    prerequisites: ['Private resource publication, connectors, supported clients and policy assignment.', 'Entra ID P1/P2 plus Private Access or Entra Suite entitlement.'],
    categoryIds: ['ztna'], sourceIds: ['architecture-global-secure-access', 'e7-announcement'],
    coverageNote: 'Availability does not automatically migrate VPN applications or establish feature equivalence.',
  },
  {
    id: 'internet-access', label: 'Entra Internet Access', shortLabel: 'Internet Access', pillar: 'network', bundle: 'entra-suite', kind: 'service',
    description: 'Apply identity-aware web access controls to configured internet and SaaS traffic.',
    technical: 'The full Internet Access offer adds an internet/SaaS secure web gateway. Traffic forwarding and filtering policies must be configured; it is not mandatory transit for every node in this model.',
    prerequisites: ['A supported traffic-forwarding configuration and scoped network security policies.', 'Entra ID P1/P2 plus Internet Access or Entra Suite entitlement.'],
    categoryIds: ['swg'], sourceIds: ['architecture-global-secure-access', 'e7-announcement'],
    coverageNote: 'Internet Access for Microsoft services already comes with P1/P2. Do not confuse that baseline capability with full Internet Access.',
  },
  {
    id: 'intune', label: 'Microsoft Intune', shortLabel: 'Intune', pillar: 'endpoint', bundle: 'e5', kind: 'service',
    description: 'Configure work devices and report whether they satisfy the organization’s compliance rules.',
    technical: 'Compliance results can feed Conditional Access. Device management, patch/application management, remote support and Cloud PKI have different baseline entitlements.',
    prerequisites: ['Enrollment, supported platforms and assigned compliance/configuration policies.', 'A deliberate setting for devices with no compliance policy and integration with access policy.'],
    categoryIds: ['uem', 'patch-config', 'remote-support', 'dex', 'cert-lifecycle'],
    sourceIds: ['architecture-device-compliance', 'm365-packaging-2026', 'intune-pricing'],
    coverageNote: 'July 2026 packaging adds Plan 2, Remote Help and Advanced Analytics to M365 E3; E5 also adds EPM, Enterprise Application Management and Cloud PKI. Verify tenant enablement.',
  },
  {
    id: 'm365-apps', label: 'Microsoft 365 apps & collaboration', shortLabel: 'Work apps', pillar: 'apps', bundle: 'e5', kind: 'service',
    description: 'The familiar place to collaborate, open a work document and use an available Copilot experience.',
    technical: 'Microsoft 365 apps provide the user experience; identity policy and each workload’s permissions still apply. A suite app is not itself a grant to every document.',
    prerequisites: ['Licensed and enabled workloads, supported clients and appropriate user assignments.', 'Confirm with-Teams or without-Teams variant.'],
    categoryIds: ['team-chat', 'video-meetings'], sourceIds: ['m365-packaging-2026', 'teams-choice-2025', 'architecture-copilot-data'],
    coverageNote: 'The mapped comparison covers collaboration categories, not a new licence for every app. Office apps are already part of the listed E3/E5 baselines; full Copilot is shown separately.',
  },
  {
    id: 'copilot', label: 'Microsoft 365 Copilot', shortLabel: 'Copilot', pillar: 'apps', bundle: 'copilot', kind: 'service',
    description: 'Help the employee summarize and work with information they are already permitted to access.',
    technical: 'Copilot coordinates models, Microsoft Graph work context and productivity apps. Current documentation uses Microsoft Copilot; the suite-qualified label here distinguishes the entitlement from baseline Copilot Chat.',
    prerequisites: ['Eligible assigned licences, supported experiences and configured data access.', 'Review oversharing, connectors and generated output.'],
    categoryIds: ['genai-assistant', 'enterprise-search'], sourceIds: ['architecture-copilot-data', 'e7-announcement'],
    coverageNote: 'Baseline Copilot Chat enhancements are not the full work-grounded Copilot entitlement. Model/API usage and specialist agent services can have separate conditions.',
  },
  {
    id: 'work-context', label: 'Microsoft Graph / Work IQ context', shortLabel: 'Work context', pillar: 'data', bundle: 'context', kind: 'resource',
    description: 'Relevant work relationships and permitted content help ground a useful Copilot response.',
    technical: 'Graph supplies permission-aware organizational content. Work IQ describes the intelligence behind Copilot’s work context; it is not a fifth E7 bundle component or a separate licence in this diagram.',
    prerequisites: ['Accessible work content and maintained resource permissions.', 'Explicit review of connected external data and its permissions.'],
    categoryIds: [], sourceIds: ['architecture-copilot-data', 'e7-announcement'],
    coverageNote: 'Context supporting Copilot, not an additional SKU or a universal data-access grant.',
  },
  {
    id: 'sharepoint', label: 'SharePoint & OneDrive', shortLabel: 'Work files', pillar: 'data', bundle: 'e5', kind: 'resource',
    description: 'Store the permitted work files used by the employee or an explicitly authorized agent.',
    technical: 'Resource permissions remain the data-access boundary. Broad sharing can broaden what Copilot can surface; buying Copilot does not repair that sharing.',
    prerequisites: ['Maintained site/file permissions and deliberate sharing settings.', 'Explicit agent access and any encryption usage rights for the agent example.'],
    categoryIds: ['file-storage', 'intranet-ex'], sourceIds: ['architecture-copilot-data', 'architecture-agent-data', 'm365-packaging-2026'],
    coverageNote: 'File storage and sharing already exist in the three baselines. Storage limits and separately billed backup remain distinct.',
  },
  {
    id: 'purview', label: 'Microsoft Purview', shortLabel: 'Purview', pillar: 'data', bundle: 'e5', kind: 'service',
    description: 'Apply information protection and data-handling policies alongside resource permissions.',
    technical: 'Labels, encryption rights, DLP and risk review serve different purposes. Agent DLP must target the instance and a supported interaction; newly created agent content does not automatically inherit source labels.',
    prerequisites: ['Configured labels, rights and workload-specific policies.', 'Explicit agent policy targeting, supported channels and owner monitoring.'],
    categoryIds: ['dlp', 'info-protection', 'insider-risk'], sourceIds: ['architecture-agent-data', 'architecture-copilot-data', 'purview-governance-billing'],
    coverageNote: 'Basic protection already exists in E3; E5 adds advanced capabilities. Unified Catalog/data governance and applicable consumption are not unlimited E7 entitlements.',
  },
  {
    id: 'agent365', label: 'Microsoft Agent 365', shortLabel: 'Agent 365', pillar: 'apps', bundle: 'agent365', kind: 'service',
    description: 'Make agents visible and govern their lifecycle with identity, data and security controls.',
    technical: 'The registry and lifecycle control plane coordinate with Entra, Purview and Defender. Registration never grants resource permissions. Agent-specific features and integrations have their own prerequisites.',
    prerequisites: ['Qualifying per-user licensing, supported agents and accountable owners.', 'Configured identity, data-protection and security integrations.'],
    categoryIds: ['agent-governance'], sourceIds: ['architecture-agent365', 'architecture-agent-data', 'e7-announcement'],
    coverageNote: 'Included as one of E7’s four components; also available standalone. It is not unlimited agent creation, execution, connector access or model/API consumption.',
  },
  {
    id: 'agent', label: 'Governed work agent', shortLabel: 'Work agent', pillar: 'apps', bundle: 'context', kind: 'agent',
    description: 'An illustrative agent prepares an approved project summary for a permitted destination.',
    technical: 'The scenario uses an explicitly authorized agent instance and a supported SharePoint interaction. Its identity, resource permissions, data policies and runtime are distinct concerns.',
    prerequisites: ['A registered, owned agent and separately validated execution/consumption arrangements.', 'Explicit file access; VIEW and EXTRACT rights where sensitivity-label encryption applies.'],
    categoryIds: [], sourceIds: ['architecture-agent365', 'architecture-agent-data'],
    coverageNote: 'An example workload, not an extra bundled SKU or an entitlement to unbounded execution.',
  },
  {
    id: 'defender-endpoint', label: 'Defender for Endpoint', shortLabel: 'Endpoint defense', pillar: 'endpoint', bundle: 'e5', kind: 'service',
    description: 'Detect and investigate device activity and apply supported endpoint response actions.',
    technical: 'Endpoint signals contribute to XDR correlation. E5 includes the P2 tier; response scope depends on onboarding, platform support and configured capabilities.',
    prerequisites: ['Supported, onboarded endpoints and appropriate response permissions.', 'Validate vulnerability-management feature tiers; premium add-ons are not implied.'],
    categoryIds: ['edr-xdr', 'vuln-mgmt'], sourceIds: ['architecture-defender-xdr', 'architecture-attack-disruption', 'm365-packaging-2026'],
    coverageNote: 'M365 E3 already includes Endpoint P1, not the full P2 tier. User endpoint rights do not automatically license server protection.',
  },
  {
    id: 'defender-office', label: 'Defender for Office 365', shortLabel: 'Email defense', pillar: 'apps', bundle: 'e5', kind: 'service',
    description: 'Protect email and collaboration and contribute relevant threat evidence.',
    technical: 'Safe Links, Safe Attachments and anti-phishing protection are distinct from P2 investigation and response capabilities. Email evidence may connect an incident to its entry point.',
    prerequisites: ['Licensed, configured email/collaboration protection and supported workloads.'],
    categoryIds: ['email-security'], sourceIds: ['architecture-defender-xdr', 'm365-packaging-2026'],
    coverageNote: 'Both E3 baselines gained P1 in July 2026. E7 adds the P2 tier, not the first email protection.',
  },
  {
    id: 'defender-identity', label: 'Defender for Identity', shortLabel: 'Identity defense', pillar: 'identity', bundle: 'e5', kind: 'service',
    description: 'Use identity-environment evidence to investigate potentially compromised identities.',
    technical: 'The reference relationship uses on-premises Active Directory signals. This is distinct from Entra ID Protection’s cloud sign-in risk; do not assume a sensor exists just because E7 is assigned.',
    prerequisites: ['Supported identity-environment onboarding and required sensors/permissions.'],
    categoryIds: ['itdr'], sourceIds: ['architecture-defender-xdr', 'architecture-attack-disruption'],
  },
  {
    id: 'defender-cloud-apps', label: 'Defender for Cloud Apps', shortLabel: 'SaaS defense', pillar: 'apps', bundle: 'e5', kind: 'service',
    description: 'Improve visibility into SaaS activity and apply supported application or session controls.',
    technical: 'Connected app activity contributes to XDR. Conditional Access integration can apply controls to supported sessions; this is not the same service as Defender for Cloud workload protection.',
    prerequisites: ['Supported app connections and required permissions.', 'Explicit setup for session controls and governance actions.'],
    categoryIds: ['casb'], sourceIds: ['architecture-defender-xdr', 'architecture-conditional-access', 'architecture-global-secure-access'],
  },
  {
    id: 'defender-xdr', label: 'Microsoft Defender XDR', shortLabel: 'Defender XDR', pillar: 'secops', bundle: 'e5', kind: 'service',
    description: 'Connect related workload signals into an incident for investigation and response.',
    technical: 'XDR correlates licensed and provisioned signals rather than routing all business traffic. Supported high-confidence incidents can trigger attack disruption; detection and containment are not guaranteed.',
    prerequisites: ['Provisioned contributing products, telemetry and response permissions.', 'Supported response configuration with exclusions and analyst recovery procedures.'],
    categoryIds: ['edr-xdr', 'email-security', 'itdr', 'casb'], sourceIds: ['architecture-defender-xdr', 'architecture-attack-disruption'],
    coverageNote: 'The comparison shows contributing workload categories. Mixed tiers do not mean the full illustrated configuration is already deployed.',
  },
  {
    id: 'security-copilot', label: 'Microsoft Security Copilot', shortLabel: 'Security Copilot', pillar: 'secops', bundle: 'e5', kind: 'service',
    description: 'Help an analyst explain incident evidence and prepare next steps.',
    technical: 'Assistive summaries and investigation guidance use permitted security context. Analysts validate the output; Security Copilot is not a prerequisite for Defender to detect a threat.',
    prerequisites: ['Tenant enablement, available capacity and permitted connected security data.', 'Human review of generated investigation guidance.'],
    categoryIds: ['secops-ai'], sourceIds: ['architecture-security-copilot', 'security-copilot-inclusion'],
    coverageNote: `${SECURITY_COPILOT_ALLOWANCE.summary} ${SECURITY_COPILOT_ALLOWANCE.conditions}`,
  },
  {
    id: 'infrastructure', label: 'Private apps & compute', shortLabel: 'Infrastructure', pillar: 'infrastructure', bundle: 'context', kind: 'resource',
    description: 'Private applications, servers and cloud workloads still need their own hardening and access controls.',
    technical: 'This context node is a possible target of Private Access, not a trusted inner zone or a claim that Microsoft 365 licenses all compute resources.',
    prerequisites: ['Compute ownership, patching, segmentation and workload-specific protection.', 'Private Access publication only for the resources intended to be reachable.'],
    categoryIds: [], sourceIds: ['architecture-pillars', 'architecture-global-secure-access'],
    coverageNote: 'Compute and workload licensing are separate from Microsoft 365 user licensing.',
  },
  {
    id: 'sentinel', label: 'Microsoft Sentinel', shortLabel: 'Sentinel · separate', pillar: 'secops', bundle: 'external', kind: 'service',
    description: 'A complementary SIEM/SOAR service can extend investigation across a broader estate.',
    technical: 'Sentinel has separate Azure billing and data/automation conditions even when it shares a security operations experience with Defender.',
    prerequisites: ['A separately configured workspace/service, connectors and billing review.'],
    categoryIds: ['siem-soar'], sourceIds: ['architecture-sentinel-billing', 'architecture-security-copilot'],
    coverageNote: 'Not included in E7. Ingestion benefits or free data sources are not an unlimited SIEM/SOAR entitlement.',
  },
  {
    id: 'defender-cloud', label: 'Defender for Cloud', shortLabel: 'Cloud defense · separate', pillar: 'infrastructure', bundle: 'external', kind: 'service',
    description: 'Complement user security with separately evaluated cloud workload protection.',
    technical: 'For example, Defender for Servers offers paid Plan 1 and Plan 2. Workload protection and deployment scope are not licensed merely by assigning E7 to employees.',
    prerequisites: ['Plan-specific licensing/billing and onboarding of the intended cloud workloads.'],
    categoryIds: [], sourceIds: ['architecture-defender-cloud', 'architecture-defender-xdr'],
    coverageNote: 'Paid Defender for Cloud workload plans are not included in E7. Free foundational features do not make the paid plans part of the bundle.',
  },
  {
    id: 'backup', label: 'Backup & recovery service', shortLabel: 'Backup · separate', pillar: 'infrastructure', bundle: 'external', kind: 'service',
    description: 'Maintain an explicit recovery service and exercise restore procedures.',
    technical: 'Microsoft 365 Backup uses consumption billing for protected content; partner solutions have their own agreements. Work-file storage and retention are not a complete backup-service entitlement.',
    prerequisites: ['A separate backup agreement or billing setup, protection scope and tested recovery procedures.'],
    categoryIds: ['saas-backup'], sourceIds: ['architecture-backup-billing'],
    coverageNote: 'Not included in E7. Keep applicable backup and recovery costs separate.',
  },
];

export const ARCHITECTURE_EDGES: readonly ArchitectureEdge[] = [
  {
    id: 'employee-device', from: 'employee', to: 'device', kind: 'access', label: 'Start a work request',
    description: 'An employee initiates the task on a work device; neither the person nor the network location is inherently trusted.',
    sourceIds: ['architecture-zero-trust'],
  },
  {
    id: 'device-intune', from: 'device', to: 'intune', kind: 'signal', label: 'Report device configuration',
    description: 'The enrolled device reports configuration used to evaluate assigned compliance rules; reporting is subject to check-in and refresh cycles.',
    sourceIds: ['architecture-device-compliance'],
  },
  {
    id: 'intune-device', from: 'intune', to: 'device', kind: 'policy', label: 'Apply device requirements',
    description: 'Assigned management and compliance policies define the required device state. Licensing alone does not configure them.',
    sourceIds: ['architecture-device-compliance'],
  },
  {
    id: 'employee-entra', from: 'employee', to: 'entra-id', kind: 'access', label: 'Authenticate the person',
    description: 'Establish the user identity before evaluating Conditional Access; successful authentication is not blanket authorization.',
    sourceIds: ['architecture-conditional-access'],
  },
  {
    id: 'entra-access-policy', from: 'entra-id', to: 'conditional-access', kind: 'signal', label: 'Identity and sign-in context',
    description: 'Identity and, where licensed/configured, ID Protection risk contribute to the scoped access decision.',
    sourceIds: ['architecture-conditional-access'],
  },
  {
    id: 'intune-access-policy', from: 'intune', to: 'conditional-access', kind: 'signal', label: 'Device compliance result',
    description: 'Conditional Access can require the device to be marked compliant; this is a policy decision, not a route through Intune.',
    sourceIds: ['architecture-device-compliance', 'architecture-conditional-access'],
  },
  {
    id: 'access-work-apps', from: 'conditional-access', to: 'm365-apps', kind: 'policy', label: 'Enforce the scoped access policy',
    description: 'Only a request meeting this example’s enabled policy continues. The app must still enforce its own authorization.',
    sourceIds: ['architecture-conditional-access'],
  },
  {
    id: 'governance-entra', from: 'identity-governance', to: 'entra-id', kind: 'governance', label: 'Review and expire assignments',
    description: 'Owners and lifecycle processes review or remove assignments as business needs change; sign-in is not a permanent access grant.',
    sourceIds: ['architecture-identity-governance'],
  },
  {
    id: 'access-private', from: 'conditional-access', to: 'private-access', kind: 'policy', label: 'Scope private-app access',
    description: 'Configured per-app policies control access to published private resources; not every work task requires this path.',
    sourceIds: ['architecture-global-secure-access'],
  },
  {
    id: 'private-infrastructure', from: 'private-access', to: 'infrastructure', kind: 'access', label: 'Reach a published private resource',
    description: 'A configured client/connector path reaches the intended private application, not a generally trusted internal network.',
    sourceIds: ['architecture-global-secure-access'],
  },
  {
    id: 'device-internet', from: 'device', to: 'internet-access', kind: 'access', label: 'Forward selected internet traffic',
    description: 'An enabled traffic-forwarding configuration brings internet/SaaS traffic under the applicable web policy.',
    sourceIds: ['architecture-global-secure-access'],
  },
  {
    id: 'access-internet', from: 'conditional-access', to: 'internet-access', kind: 'policy', label: 'Apply identity-aware web policy',
    description: 'Conditional Access context can inform network security policies; full Internet Access is distinct from the P1/P2 Microsoft-services profile.',
    sourceIds: ['architecture-global-secure-access'],
  },
  {
    id: 'apps-sharepoint', from: 'm365-apps', to: 'sharepoint', kind: 'access', label: 'Request a permitted work file',
    description: 'The workload checks the user’s site/file access. Being signed in to an app does not authorize every document.',
    sourceIds: ['architecture-copilot-data'],
  },
  {
    id: 'apps-copilot', from: 'm365-apps', to: 'copilot', kind: 'access', label: 'Ask for help with the task',
    description: 'An eligible user invokes an available Copilot experience from work apps; this is separate from baseline app licensing.',
    sourceIds: ['architecture-copilot-data', 'e7-announcement'],
  },
  {
    id: 'sharepoint-context', from: 'sharepoint', to: 'work-context', kind: 'data', label: 'Permission-aware work content',
    description: 'The reference grounding relationship includes content the user can access; it does not copy the entire tenant into a new entitlement.',
    sourceIds: ['architecture-copilot-data'],
  },
  {
    id: 'context-copilot', from: 'work-context', to: 'copilot', kind: 'data', label: 'Ground with permitted context',
    description: 'Graph content and work relationships help ground a response. Work IQ supports Copilot; it is not a fifth E7 SKU.',
    sourceIds: ['architecture-copilot-data', 'e7-announcement'],
  },
  {
    id: 'copilot-apps', from: 'copilot', to: 'm365-apps', kind: 'data', label: 'Return a draft for review',
    description: 'The employee receives generated help within the available experience and should verify its content and citations.',
    sourceIds: ['architecture-copilot-data'],
  },
  {
    id: 'purview-sharepoint', from: 'purview', to: 'sharepoint', kind: 'policy', label: 'Protect sensitive work content',
    description: 'Applicable labels, encryption rights and DLP complement file permissions. Policy scope and workload support determine enforcement.',
    sourceIds: ['architecture-agent-data', 'architecture-copilot-data'],
  },
  {
    id: 'purview-copilot', from: 'purview', to: 'copilot', kind: 'policy', label: 'Honor applicable data protections',
    description: 'Copilot honors access and applicable information-protection rights; policies do not retroactively correct broad sharing.',
    sourceIds: ['architecture-copilot-data'],
  },
  {
    id: 'agent365-agent', from: 'agent365', to: 'agent', kind: 'governance', label: 'Register ownership and lifecycle',
    description: 'An owned agent becomes visible for oversight and lifecycle management. Registration never grants resource access.',
    sourceIds: ['architecture-agent365', 'architecture-agent-data'],
  },
  {
    id: 'agent-entra', from: 'agent', to: 'entra-id', kind: 'access', label: 'Establish the agent identity',
    description: 'The request has an accountable identity and authorized scope. The illustration does not depend on Preview agent Conditional Access targeting.',
    sourceIds: ['architecture-agent365', 'architecture-conditional-access'],
  },
  {
    id: 'entra-agent', from: 'entra-id', to: 'agent', kind: 'policy', label: 'Constrain authorized reach',
    description: 'Identity and permission configuration constrain the agent request. The destination still requires explicit file access and any encryption rights.',
    sourceIds: ['architecture-agent365', 'architecture-agent-data'],
  },
  {
    id: 'agent-sharepoint', from: 'agent', to: 'sharepoint', kind: 'access', label: 'Use only explicitly shared files',
    description: 'An authorized agent instance accesses the permitted project files; encrypted files additionally require explicit VIEW and EXTRACT rights.',
    sourceIds: ['architecture-agent-data'],
  },
  {
    id: 'purview-agent', from: 'purview', to: 'agent', kind: 'policy', label: 'Scope supported data-handling controls',
    description: 'DLP targets the agent instance or its security group and a supported interaction. It is not a universal inspection gateway for every tool call.',
    sourceIds: ['architecture-agent-data'],
  },
  {
    id: 'agent-purview', from: 'agent', to: 'purview', kind: 'signal', label: 'Record supported agent interactions',
    description: 'Supported agent activities provide audit and data-security visibility. Policy owners monitor blocked actions and their workflow consequences.',
    sourceIds: ['architecture-agent-data'],
  },
  {
    id: 'agent-agent365', from: 'agent', to: 'agent365', kind: 'signal', label: 'Observe agent activity and health',
    description: 'Supported integrations make agent activity visible to administrators and accountable owners, rather than granting unchecked autonomy.',
    sourceIds: ['architecture-agent365'],
  },
  {
    id: 'device-defender', from: 'device', to: 'defender-endpoint', kind: 'signal', label: 'Observe endpoint activity',
    description: 'An onboarded endpoint supplies relevant device activity to protection and investigation; coverage depends on platform and setup.',
    sourceIds: ['architecture-defender-xdr'],
  },
  {
    id: 'apps-defender-office', from: 'm365-apps', to: 'defender-office', kind: 'signal', label: 'Observe email and collaboration threats',
    description: 'Configured email/collaboration protection can supply evidence of a malicious message, link or attachment.',
    sourceIds: ['architecture-defender-xdr'],
  },
  {
    id: 'infrastructure-defender-identity', from: 'infrastructure', to: 'defender-identity', kind: 'signal', label: 'Observe onboarded identity infrastructure',
    description: 'Supported on-premises Active Directory signals provide identity threat evidence; the diagram does not assume every estate has that infrastructure.',
    sourceIds: ['architecture-defender-xdr'],
  },
  {
    id: 'apps-cloud-apps', from: 'm365-apps', to: 'defender-cloud-apps', kind: 'signal', label: 'Observe connected SaaS activity',
    description: 'Supported connected applications contribute activity evidence; connector permissions and integration scope matter.',
    sourceIds: ['architecture-defender-xdr'],
  },
  {
    id: 'endpoint-xdr', from: 'defender-endpoint', to: 'defender-xdr', kind: 'signal', label: 'Correlate endpoint evidence',
    description: 'Device alerts and activity can connect an affected endpoint to the wider incident.',
    sourceIds: ['architecture-defender-xdr'],
  },
  {
    id: 'office-xdr', from: 'defender-office', to: 'defender-xdr', kind: 'signal', label: 'Correlate email evidence',
    description: 'Email/collaboration evidence can help an analyst understand how a related attack entered the environment.',
    sourceIds: ['architecture-defender-xdr'],
  },
  {
    id: 'identity-xdr', from: 'defender-identity', to: 'defender-xdr', kind: 'signal', label: 'Correlate identity-environment evidence',
    description: 'Relevant identity threat evidence can link account behavior to other workload observations.',
    sourceIds: ['architecture-defender-xdr'],
  },
  {
    id: 'cloud-apps-xdr', from: 'defender-cloud-apps', to: 'defender-xdr', kind: 'signal', label: 'Correlate SaaS evidence',
    description: 'Connected SaaS activity can add application context to an investigation instead of remaining an isolated alert.',
    sourceIds: ['architecture-defender-xdr'],
  },
  {
    id: 'entra-xdr', from: 'entra-id', to: 'defender-xdr', kind: 'signal', label: 'Contribute cloud identity risk',
    description: 'Entra ID Protection is a distinct source of cloud identity context; a single risky sign-in is not proof of a full incident.',
    sourceIds: ['architecture-defender-xdr', 'architecture-conditional-access'],
  },
  {
    id: 'purview-xdr', from: 'purview', to: 'defender-xdr', kind: 'signal', label: 'Connect supported data-risk evidence',
    description: 'Supported Purview risk signals can contribute to investigation, including configured AI-related risk insights; not every audit event is an incident.',
    sourceIds: ['architecture-agent-data', 'architecture-defender-xdr'],
  },
  {
    id: 'xdr-security-copilot', from: 'defender-xdr', to: 'security-copilot', kind: 'data', label: 'Supply permitted incident context',
    description: 'Security Copilot can summarize accessible incident evidence and assist investigation, within enabled permissions and capacity.',
    sourceIds: ['architecture-security-copilot', 'security-copilot-inclusion'],
  },
  {
    id: 'xdr-endpoint-response', from: 'defender-xdr', to: 'defender-endpoint', kind: 'response', label: 'Request supported endpoint containment',
    description: 'A supported high-confidence attack-disruption case can invoke endpoint actions. The demonstration assumes the required configuration, not guaranteed detection.',
    sourceIds: ['architecture-attack-disruption'],
  },
  {
    id: 'defender-device-response', from: 'defender-endpoint', to: 'device', kind: 'response', label: 'Apply a scoped device response',
    description: 'Supported device isolation or containment limits relevant communication; security teams still investigate and restore the asset.',
    sourceIds: ['architecture-attack-disruption'],
  },
  {
    id: 'xdr-entra-response', from: 'defender-xdr', to: 'entra-id', kind: 'response', label: 'Coordinate supported identity response',
    description: 'Configured response can revoke sessions or suspend an affected Entra user. Propagation and application/session behavior affect the result; there is no instant universal revocation claim.',
    sourceIds: ['architecture-attack-disruption'],
  },
  {
    id: 'access-session-review', from: 'conditional-access', to: 'employee', kind: 'response', label: 'Require a new access decision',
    description: 'A changed condition can challenge or block a subsequent scoped request. The scenario pauses for remediation rather than declaring the identity permanently safe.',
    sourceIds: ['architecture-conditional-access', 'architecture-zero-trust'],
  },
  {
    id: 'infrastructure-cloud-defense', from: 'infrastructure', to: 'defender-cloud', kind: 'signal', label: 'Monitor separately onboarded workloads',
    description: 'The chosen Defender for Cloud plan protects its configured workload scope, not every server because employees have E7.',
    sourceIds: ['architecture-defender-cloud'],
  },
  {
    id: 'cloud-defense-xdr', from: 'defender-cloud', to: 'defender-xdr', kind: 'signal', label: 'Contribute separately licensed cloud signals',
    description: 'A provisioned Defender for Cloud integration can contribute evidence without making its paid workload plans an E7 component.',
    sourceIds: ['architecture-defender-xdr', 'architecture-defender-cloud'],
  },
  {
    id: 'sentinel-security-copilot', from: 'sentinel', to: 'security-copilot', kind: 'data', label: 'Optional broader investigation context',
    description: 'An enabled Sentinel integration can enrich analyst context. Sentinel consumption and Security Copilot capacity remain separately bounded.',
    sourceIds: ['architecture-security-copilot', 'architecture-sentinel-billing', 'security-copilot-inclusion'],
  },
  {
    id: 'sharepoint-backup', from: 'sharepoint', to: 'backup', kind: 'data', label: 'Protect selected recovery content',
    description: 'A separately configured backup service protects selected work content under its billing and retention terms; this is not a free E7 copy.',
    sourceIds: ['architecture-backup-billing'],
  },
];

export function getArchitectureNode(id: string): ArchitectureNode {
  const node = ARCHITECTURE_NODES.find((item) => item.id === id);
  if (!node) throw new Error(`Unknown architecture node: ${id}`);
  return node;
}

export function getArchitectureEdge(id: string): ArchitectureEdge {
  const edge = ARCHITECTURE_EDGES.find((item) => item.id === id);
  if (!edge) throw new Error(`Unknown architecture edge: ${id}`);
  return edge;
}

export function getNodeCoverage(node: ArchitectureNode, baseline: BaselineSkuId): ArchitectureCoverage {
  const sku = getBaseline(baseline);
  if (node.bundle === 'context') {
    return {
      summary: 'context', label: 'Architecture context', items: [],
      note: node.coverageNote ?? 'A person, device or work context in the reference model; not an additional SKU.',
    };
  }

  const categories = node.categoryIds.map((id) => {
    const category = CATEGORIES.find((item) => item.id === id);
    if (!category) throw new Error(`Unknown architecture category "${id}" on node "${node.id}"`);
    return category;
  });
  if (node.bundle === 'external') {
    return {
      summary: 'not-covered', label: COVERAGE_META['not-covered'].label,
      items: categories.length
        ? categories.map((category) => ({ label: category.name, coverage: 'not-covered' }))
        : [{ label: node.label, coverage: 'not-covered' }],
      note: node.coverageNote ?? `Separate licensing or consumption; not included in ${E7_SKU.name}.`,
    };
  }

  // Categories remain the source of truth even if a caller supplies an override.
  const items = categories.length
    ? categories.map((category) => ({ label: category.name, coverage: category.coverage[baseline] }))
    : node.baselineCoverage
      ? [{ label: node.label, coverage: node.baselineCoverage[baseline] }]
      : [];
  if (!items.length) throw new Error(`Architecture node "${node.id}" has no coverage mapping`);
  const summary = items.every((item) => item.coverage === items[0].coverage) ? items[0].coverage : 'mixed';
  return {
    summary, label: summary === 'mixed' ? 'Mixed capability coverage' : COVERAGE_META[summary].label,
    items,
    note: [
      `${E7_SKU.shortName} compared with ${sku.shortName}; capability availability, not configuration, vendor equivalence or savings.`,
      node.coverageNote,
    ].filter(Boolean).join(' '),
  };
}
