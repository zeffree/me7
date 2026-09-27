export type EvidenceStatus = 'verified' | 'conditional' | 'unverified';

export interface EvidenceSource {
  id: string;
  publisher: string;
  title: string;
  url: string | null;
  section: string;
  publishedDate: string | null;
  effectiveDate: string | null;
  reviewedAt: string;
  status: EvidenceStatus;
  currency: 'USD' | null;
  unit: string;
  term: string;
  region: string;
  conditions: string[];
}

export const EVIDENCE_REVIEW_DATE = '2026-09-06';
export const SOURCE_VERSION = '2026-09-10.2';
export const EVIDENCE_VERSION = SOURCE_VERSION;

const source = (
  id: string,
  publisher: string,
  title: string,
  url: string | null,
  status: EvidenceStatus,
  section: string,
  conditions: string[],
  extra: Partial<EvidenceSource> = {},
): EvidenceSource => ({
  id, publisher, title, url, status, section, conditions,
  publishedDate: null,
  effectiveDate: null,
  reviewedAt: EVIDENCE_REVIEW_DATE,
  currency: null,
  unit: 'Capability / licence entitlement',
  term: 'Subject to the purchased agreement and applicable Product Terms',
  region: 'Commercial; confirm country, cloud and purchased SKU',
  ...extra,
});

/** Status covers only the stated section/claim, not every claim made by the linked document. */
export const SOURCES: EvidenceSource[] = [
  source('e7-announcement', 'Microsoft', 'Introducing the First Frontier Suite built on Intelligence + Trust',
    'https://blogs.microsoft.com/blog/2026/03/09/introducing-the-first-frontier-suite-built-on-intelligence-trust/',
    'verified', 'Introducing the Frontier Suite; Agent 365 availability; footnote 1', [
      'Announces E7 at $99 per user and Agent 365 at $15, generally available May 1, 2026.',
      'E7 combines Microsoft 365 E5, Microsoft 365 Copilot, Microsoft Entra Suite and Agent 365.',
      'E7 is available with and without Teams; this announcement is not a complete regional price list or Product Terms.',
    ], { publishedDate: '2026-03-09', effectiveDate: '2026-05-01', currency: 'USD', unit: 'USD / user / month reference', term: 'Confirm commitment and actual offer with the seller' }),
  source('m365-packaging-2026', 'Microsoft', '2026 Microsoft 365 packaging and pricing updates FAQ',
    'https://www.microsoft.com/en-us/licensing/news/2026-M365-Packaging-Pricing-Updates-FAQ',
    'conditional', 'Commercial pricing, packaging rollout and renewal FAQ', [
      'Pricing effective July 1, 2026 is distinct from feature rollout and tenant enablement.',
      'Packaging rollout completion is stated as August 1, 2026; customers receive a 30-day Message Center notice before tenant availability.',
      'Existing agreements generally retain their current rate until renewal; confirm agreement-specific terms.',
      'Suite references assume commercial with-Teams variants; government, education, no-Teams and regional offers differ.',
    ], { publishedDate: '2026-03-24', effectiveDate: '2026-07-01', currency: 'USD', unit: 'USD / user / month reference', term: 'Annual commitment reference; agreement and renewal conditions apply' }),
  source('teams-choice-2025', 'Microsoft', 'Evolving our productivity offerings to resolve European competition concerns about Teams',
    'https://www.microsoft.com/en-us/microsoft-365/blog/2025/09/12/evolving-our-productivity-offerings-to-resolve-european-competition-concerns-about-teams/',
    'verified', 'Added flexibility in licensing and pricing', [
      'From November 1, 2025 new customers worldwide can again buy enterprise Microsoft 365 and Office 365 suites with Teams.',
      'With-Teams and without-Teams variants coexist. The customer must identify the actual purchased variant.',
      'Published minimum price deltas do not establish the customer invoice price.',
    ], { publishedDate: '2025-09-12', effectiveDate: '2025-11-01' }),
  source('security-copilot-inclusion', 'Microsoft Learn', 'Security Copilot for Microsoft 365 E5 and E7 customers',
    'https://learn.microsoft.com/en-us/copilot/security/security-copilot-inclusion',
    'verified', 'Licensing and capacity; eligibility; usage and billing', [
      '400 SCUs per month per 1,000 eligible paid E5/E7 licences, proportionally scaled, capped at 10,000 SCUs/month.',
      'The allowance is shared tenant-wide, resets monthly and has no rollover; confirm tenant enablement.',
      'Microsoft advises existing customers not to delete previously provisioned capacity.',
      'Additional services and partner licences may remain chargeable. The June 19 documentation describes future throttling and optional $6 USD/SCU overage with advance notice, not a universal currently active charge.',
    ], { publishedDate: '2026-06-19', unit: 'SCU / tenant / month', term: 'Monthly inclusion allowance; eligibility and rollout conditions apply' }),
  source('permissions-management-retirement', 'Microsoft', 'Microsoft Entra Permissions Management migration program',
    'https://fpc.microsoft.com/knowledgebase/article/KB-01808/en-us',
    'verified', 'Program summary', [
      'Entra Permissions Management was deprecated on October 1, 2025.',
      'Do not claim its retired multicloud CIEM capability is included in E7; validate a separately purchased replacement.',
    ], { effectiveDate: '2025-10-01' }),
  source('purview-governance-billing', 'Microsoft Learn', 'Billing in Microsoft Purview Data Governance',
    'https://learn.microsoft.com/en-us/purview/data-governance-billing',
    'verified', 'Prerequisites, billing setup and pricing components', [
      'Unified Catalog governance uses Azure pay-as-you-go billing for governed assets and data health processing.',
      'Some scanning may be free under billing conditions; this does not fund a replacement governance platform through E7.',
    ], { publishedDate: '2026-04-24', effectiveDate: '2025-01-06', unit: 'Governed assets / processing units', term: 'Azure pay-as-you-go' }),
  source('m365-product-terms', 'Microsoft', 'Microsoft Product Terms',
    'https://www.microsoft.com/licensing/terms/',
    'unverified', 'Customer must select applicable program, product and effective month', [
      'Reference for agreement-specific validation, not evidence that every catalog mapping was independently verified.',
      'Check qualifying base licences, workloads, users/devices, geography, cloud, service limits and separate consumption.',
    ]),
  source('entra-pricing', 'Microsoft', 'Microsoft Entra pricing',
    'https://www.microsoft.com/en-us/security/business/microsoft-entra-pricing',
    'unverified', 'Standalone and suite offers', [
      'Stored standalone prices and detailed entitlements have not all been independently rechecked; obtain a current quote.',
    ], { currency: 'USD', unit: 'USD / user / month reference' }),
  source('intune-pricing', 'Microsoft', 'Microsoft Intune pricing',
    'https://www.microsoft.com/en-us/security/business/microsoft-intune-pricing',
    'unverified', 'Intune plans and suite', [
      'Verify the purchased SKU, supported operating systems and tenant enablement; a suite overlap does not prove an invoice is cancellable.',
    ], { currency: 'USD', unit: 'USD / user / month reference' }),
  source('power-platform-licensing', 'Microsoft Learn', 'Power Platform licensing FAQ',
    'https://learn.microsoft.com/en-us/power-platform/admin/pricing-billing-skus',
    'unverified', 'Seeded rights, premium connectors and automation', [
      'Detailed current licensing limits remain a customer review item; seeded rights do not imply full premium platform replacement.',
    ]),
  source('catalog-assumptions', 'Independent assessment model', 'Illustrative catalog benchmarks and adoption assumptions',
    null, 'unverified', 'All benchmarkPupm and typicalAdoptionPct values', [
      'These are unsourced illustrative USD planning inputs, not independently verified vendor prices or customer invoices.',
      'Vendor examples do not identify an edition, contractual term or equivalent feature set.',
      'Some numbers normalize specialist, host, device or usage-based pricing to a workforce user. No authoritative derivation was retained.',
      'Customer confirmation is an assumption, not verification. Do not relabel USD as another currency.',
    ], { currency: 'USD', unit: 'Illustrative USD / modeled user / month', term: 'No validated vendor term', region: 'Not a regional price list' }),
  source('tei-e5-2023', 'Forrester Consulting, commissioned by Microsoft', 'The Total Economic Impact of Microsoft 365 E5',
    'https://www.microsoft.com/content/dam/microsoft/final/en-us/microsoft-brand/documents/Forrester-TEI-Of-Microsoft-365-E5.pdf',
    'unverified', 'August 2023 benefit/cost tables, population and cash flow', [
      'The PDF tables were not independently extracted in this audit. Stored values, 10,000-seat divisor and reported summary/table discrepancy remain unverified.',
      'Do not treat stored figures or passing arithmetic tests as source verification; unverified lines are off by default.',
    ], { publishedDate: '2023-08', currency: 'USD', unit: 'USD / composite organisation / study year', term: 'Three-year published composite, not a customer forecast', region: 'US-based composite; global operations' }),
  source('tei-copilot-2025', 'Forrester Consulting, commissioned by Microsoft', 'The Total Economic Impact of Microsoft 365 Copilot',
    'https://tei.forrester.com/go/microsoft/M365Copilot/',
    'conditional', 'Benefits Btr/Ctr; population; cost rows Dtr/Etr/Ftr and cash-flow totals', [
      'Published annual benefit values and population figures were checked against the original study.',
      'Scaling by customer seats, adoption or role mix is an app assumption; benefits are not cash savings or an E7 study.',
      'The go-to-market revenue benefit is intentionally excluded from this app.',
    ], { publishedDate: '2025-03', currency: 'USD', unit: 'USD / composite organisation / study year', term: 'Three-year published composite, not a customer forecast', region: 'US-headquartered global composite' }),
  source('tei-entra-2025', 'Forrester Consulting, commissioned by Microsoft', 'The Total Economic Impact of Microsoft Entra Suite',
    'https://tei.forrester.com/go/Microsoft/EntraSuite/',
    'conditional', 'Benefit tables; composite population; cost rows Itr/Jtr/Ktr and cash-flow totals', [
      'Published annual benefit values and 85,000 total users / 24,000 licensed users were checked against the original study.',
      'Using total users as the app divisor is a normalization choice, not a Forrester per-licensed-seat forecast.',
      'Source inconsistency: summary says 85,000 employees; composite section says 50,000 employees and 85,000 total users. The app follows the latter as an explicit assumption.',
      'The composite already held E5; a customer already using Entra Suite may already realize these benefits.',
    ], { publishedDate: '2025-07', currency: 'USD', unit: 'USD / composite organisation / study year', term: 'Three-year published composite, not a customer forecast', region: 'Global enterprise composite' }),
  source('architecture-zero-trust', 'Microsoft Learn', 'Zero Trust as a security foundation',
    'https://learn.microsoft.com/en-us/security/zero-trust/zero-trust-overview',
    'verified', 'Zero Trust principles; challenging traditional assumptions', [
      'Verify explicitly, use least privilege and assume breach; network location alone does not establish trust.',
      'Architecture journeys are authored logical examples, not product deployment instructions or measured security outcomes.',
    ], { reviewedAt: '2026-09-10' }),
  source('architecture-pillars', 'Microsoft Learn', 'Zero Trust deployment for technology pillars overview',
    'https://learn.microsoft.com/en-us/security/zero-trust/deploy/overview',
    'verified', 'Technology pillars; pillars table', [
      'The seven technology pillars are identities, endpoints, data, apps, infrastructure, network and SecOps.',
      'The architecture uses these security functions, not the assessment spending-domain taxonomy.',
    ], { reviewedAt: '2026-09-10' }),
  source('architecture-conditional-access', 'Microsoft Learn', 'Microsoft Entra Conditional Access overview',
    'https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview',
    'verified', 'Common signals and decisions; license requirements', [
      'Conditional Access is evaluated after first-factor authentication and can require MFA or a compliant device, or block access.',
      'Conditional Access requires Entra ID P1; user/sign-in risk policies require ID Protection in P2.',
      'Agent targeting is documented as Preview; other integrated products require their own applicable licences and setup.',
    ], { reviewedAt: '2026-09-10' }),
  source('architecture-device-compliance', 'Microsoft Learn', 'Device compliance policies in Microsoft Intune',
    'https://learn.microsoft.com/en-us/intune/device-security/compliance/overview',
    'verified', 'Compliance policy settings; device compliance policies', [
      'Intune evaluates assigned device compliance rules; Conditional Access can use that compliance result.',
      'Policies, supported platforms, device reporting and the treatment of devices without an assigned policy must be configured.',
      'Evaluation depends on check-in and refresh cycles; compliance is not proof that a device is free of threats.',
    ], { reviewedAt: '2026-09-10' }),
  source('architecture-global-secure-access', 'Microsoft Learn', 'What is Global Secure Access?',
    'https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access',
    'verified', 'Internet Access; Private Access; licensing overview', [
      'Private Access and full Internet Access are Entra Suite or standalone capabilities requiring Entra ID P1/P2.',
      'Internet Access for Microsoft services is already included with Entra ID P1/P2; it is not the full internet/SaaS offer.',
      'Traffic acquisition, application configuration and policy assignment are deployment requirements, not automatic E7 behavior.',
    ], { reviewedAt: '2026-09-10' }),
  source('architecture-identity-governance', 'Microsoft Learn', 'Microsoft Entra ID Governance',
    'https://learn.microsoft.com/en-us/entra/id-governance/identity-governance-overview',
    'verified', 'Identity lifecycle; access lifecycle', [
      'Lifecycle workflows, entitlement management and access reviews support governed access over time.',
      'The full Governance offering is distinct from the subset of governance capabilities already available in Entra ID P2.',
      'Customers must configure owners, assignments, workflow integrations and review processes.',
    ], { reviewedAt: '2026-09-10' }),
  source('architecture-copilot-data', 'Microsoft Learn', 'Data, Privacy, and Security for Microsoft Copilot',
    'https://learn.microsoft.com/en-us/microsoft-365/copilot/microsoft-365-copilot-privacy',
    'verified', 'Organizational data; permissions; extensibility; product naming note', [
      'Copilot grounds work responses in Microsoft Graph content the user is permitted to access; correct resource permissions remain essential.',
      'Agent and connector permissions, terms and data handling need separate review. Licensing Copilot does not repair oversharing.',
      'The current page calls the product Microsoft Copilot; this app retains Microsoft 365 Copilot to distinguish the suite entitlement.',
    ], { reviewedAt: '2026-09-10' }),
  source('architecture-agent365', 'Microsoft Learn', 'Microsoft Agent 365 overview',
    'https://learn.microsoft.com/en-us/microsoft-agent-365/overview',
    'verified', 'Observe; govern; secure; availability and prerequisites', [
      'Agent 365 provides agent inventory and lifecycle oversight integrated with Entra, Purview and Defender.',
      'Commercial general availability is May 1, 2026; per-user licensing and qualifying tenant prerequisites apply.',
      'The governance control plane does not itself confer resource permissions or unlimited agent runtime, connector or model consumption.',
    ], { reviewedAt: '2026-09-10', effectiveDate: '2026-05-01' }),
  source('architecture-agent-data', 'Microsoft Learn', 'Use Microsoft Purview for Microsoft Agent 365',
    'https://learn.microsoft.com/en-us/purview/ai-agent-365',
    'verified', 'Sensitivity labels; data loss prevention; auditing and AI interactions', [
      'Agent instances need explicit file access; encrypted files require explicit VIEW and EXTRACT usage rights.',
      'DLP must target the agent instance or a containing security group and supports specified interactions, not every arbitrary agent tool call.',
      'New Agent 365 content does not automatically inherit source sensitivity labels. Owners must monitor blocking and subsequent workflows.',
    ], { reviewedAt: '2026-09-10' }),
  source('architecture-defender-xdr', 'Microsoft Learn', 'What is Microsoft Defender XDR?',
    'https://learn.microsoft.com/en-us/defender-xdr/microsoft-365-defender',
    'verified', 'Microsoft Defender protection; cross-product features', [
      'Defender XDR correlates signals across endpoints, identities, email and applications into incidents.',
      'Only licensed and provisioned products contribute their signals; the portal is not a substitute for workload onboarding.',
      'Defender for Identity uses on-premises Active Directory signals; Entra ID Protection supplies cloud identity risk context.',
    ], { reviewedAt: '2026-09-10' }),
  source('architecture-attack-disruption', 'Microsoft Learn', 'Automatic attack disruption in Microsoft Defender',
    'https://learn.microsoft.com/en-us/defender-xdr/automatic-attack-disruption',
    'verified', 'How automatic attack disruption works; automated response actions', [
      'Incident-level correlation can trigger supported containment actions, including endpoint containment and Entra session response.',
      'Capabilities, onboarding, integrations and exclusions determine scope. Analysts remain responsible for investigation and recovery.',
      'The architecture does not predict detector confidence, guarantee detection or claim instant revocation in every application.',
    ], { reviewedAt: '2026-09-10' }),
  source('architecture-security-copilot', 'Microsoft Learn', 'What is Microsoft Security Copilot?',
    'https://learn.microsoft.com/en-us/copilot/security/microsoft-security-copilot',
    'verified', 'Primary use cases; how Security Copilot works', [
      'Security Copilot can assist analysts with incident summaries, hunting queries and response guidance using connected security products.',
      'Plugin access and permissions still apply; assistance is not the source of the underlying Defender detection.',
      'Capacity and E5/E7 inclusion conditions are recorded separately under security-copilot-inclusion.',
    ], { reviewedAt: '2026-09-10' }),
  source('architecture-sentinel-billing', 'Microsoft Learn', 'Plan costs and understand Microsoft Sentinel billing',
    'https://learn.microsoft.com/en-us/azure/sentinel/billing',
    'verified', 'Full billing model; how you are charged', [
      'Sentinel is an Azure-billed service with usage or commitment pricing; related infrastructure and automation charges may apply.',
      'Free data sources, trials or ingestion benefits do not make the full Sentinel service an E7 bundle component.',
    ], { reviewedAt: '2026-09-10', unit: 'Data ingestion / retention / related consumption', term: 'Azure billing; plan-specific conditions' }),
  source('architecture-defender-cloud', 'Microsoft Learn', 'Select a Defender for Servers plan',
    'https://learn.microsoft.com/en-us/azure/defender-for-cloud/plan-defender-for-servers-select-plan',
    'verified', 'Review plans; deployment scope', [
      'Defender for Servers in Defender for Cloud has paid Plan 1 and Plan 2 offers with distinct capabilities.',
      'Workload protection and its deployment scope must be evaluated separately from Microsoft 365 user licensing.',
    ], { reviewedAt: '2026-09-10', unit: 'Separately licensed cloud workload protection', term: 'Defender for Cloud plan-specific billing' }),
  source('architecture-backup-billing', 'Microsoft Learn', 'Pricing model for Microsoft 365 Backup',
    'https://learn.microsoft.com/en-us/microsoft-365/backup/backup-pricing',
    'verified', 'Microsoft 365 Backup charge model', [
      'Microsoft 365 Backup is a consumption-based pay-as-you-go service measured by protected content.',
      'A partner backup solution has its own billing; E7 storage and retention capabilities do not fund an unlimited backup service.',
    ], { reviewedAt: '2026-09-10', unit: 'Protected content / month', term: 'Pay-as-you-go or partner agreement' }),
  source('experience-packaging-details', 'Microsoft', '2026 Microsoft 365 packaging and pricing updates',
    'https://www.microsoft.com/en-us/licensing/news/2026-M365-Packaging-Pricing-Updates',
    'verified', 'Suite-specific capability additions, including the expanded packaging tables', [
      'Office 365 E3 gains Defender for Office 365 P1, Copilot Chat enhancements and Chat Analytics; it is not an AI-free or email-investigation-free baseline.',
      'Intune additions apply to the specified Microsoft 365 suites, not Office 365 E3.',
      'Pricing dates, feature rollout and the actual tenant configuration are separate concerns.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-copilot-chat', 'Microsoft Learn', 'Microsoft 365 Copilot Chat overview',
    'https://learn.microsoft.com/en-us/copilot/overview',
    'verified', 'Copilot Chat capabilities and the paid Microsoft 365 Copilot comparison', [
      'Baseline Chat can use supplied files, pasted information and supported application context; it is not restricted to context-free conversation.',
      'Paid Microsoft 365 Copilot adds work-grounded chat across organizational work sources and deeper supported app experiences.',
      'Availability and permissions still matter. Prepared lab drafts are fictional examples, not a live Graph or model request.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-basic-mobility', 'Microsoft Learn', 'Basic Mobility and Security overview',
    'https://learn.microsoft.com/en-us/microsoft-365/admin/security-and-compliance/m365b-devices-basic-mobility-security-overview?view=o365-worldwide',
    'verified', 'Comparison of Basic Mobility and Security and Microsoft Intune', [
      'Office 365 Basic Mobility and Security supplies a limited subset of device-management capabilities; do not describe the baseline as entirely management-free.',
      'Its documented Windows restrictions do not provide an equivalent Intune compliance-based corporate-resource access gate.',
      'The sample Windows management workflow must not be generalized to every platform or existing third-party management solution.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-remote-help', 'Microsoft Learn', 'Microsoft Intune Remote Help',
    'https://learn.microsoft.com/en-us/intune/remote-help/',
    'verified', 'Remote Help service, organizational context and prerequisites', [
      'Remote Help supports authorized assistance with organizational identities and appropriate setup.',
      'Tenant enablement, helper permissions, supported devices and applicable licensing remain necessary.',
      'The lab illustrates an attended support workflow, not unrestricted remote control or a real connection to a device.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-remote-help-plan', 'Microsoft Learn', 'Plan for Remote Help',
    'https://learn.microsoft.com/en-us/intune/remote-help/plan',
    'verified', 'Prerequisites, permissions and attended support planning', [
      'Plan organizational identities, role permissions, supported clients and user participation for the attended support scenario.',
      'Enrollment, device compliance and support-session consent are distinct from buying the suite.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-windows-activation', 'Microsoft Learn', 'Windows subscription activation',
    'https://learn.microsoft.com/en-us/windows/deployment/windows-subscription-activation',
    'verified', 'Requirements and supported subscription step-up', [
      'Subscription activation requires an appropriate qualifying Windows installation and supported Entra-joined or hybrid-joined device.',
      'Entra registration alone is insufficient. This is not a free Home-to-Enterprise conversion or an operating-system version upgrade.',
      'Windows edition entitlement does not remediate a failing configuration rule or pay for Cloud PC/VDI infrastructure.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-security-defaults', 'Microsoft Learn', 'Security defaults in Microsoft Entra ID',
    'https://learn.microsoft.com/en-us/entra/fundamentals/security-defaults',
    'verified', 'Default protections, MFA and availability', [
      'Security defaults supply preconfigured identity protections in the free tier, including MFA-related controls and legacy-authentication blocking.',
      'Premium Conditional Access and P2 risk policy are distinct additions, not the first existence of identity protection or MFA.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-defender-office-plans', 'Microsoft Learn', 'Microsoft Defender for Office 365 overview',
    'https://learn.microsoft.com/en-us/defender-office-365/mdo-about',
    'verified', 'Defender for Office 365 Plan 1 versus Plan 2 comparison', [
      'P1 includes Safe Links, Safe Attachments, enhanced anti-phishing and real-time email detection/investigation views.',
      'P2 adds capabilities including Threat Explorer and automated investigation and response.',
      'A sample clue is not proof of compromise; cross-workload investigation also depends on licensed, provisioned evidence sources.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-endpoint-dlp', 'Microsoft Learn', 'Learn about Microsoft Purview Endpoint DLP',
    'https://learn.microsoft.com/en-us/purview/endpoint-dlp-learn-about',
    'verified', 'Endpoint activities, USB restrictions and supported-file limitations', [
      'Endpoint DLP supports audit, warning and blocking of matching protected-file copies to USB removable media.',
      'The lab uses a previously saved supported local file on an onboarded physical Windows endpoint within an enforced policy scope.',
      'An audit-only rule is not a block, labeling alone is not policy configuration, and exceptions must not be treated as automatically approved.',
      'Do not generalize this action to every browser, network, virtualized USB or arbitrary external-sharing scenario.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-purview-licensing', 'Microsoft Learn', 'Microsoft Purview service description',
    'https://learn.microsoft.com/en-us/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description',
    'verified', 'DLP licensing for cloud workloads and endpoints', [
      'Office 365 E3 includes foundational cloud DLP for Exchange Online, SharePoint and OneDrive, including files in Teams repositories.',
      'Endpoint DLP requires the listed E5/equivalent advanced entitlement and supported configured endpoints.',
      'Some other data-protection and browser/network scenarios have separate consumption conditions; do not extend the USB example to all Purview services.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-agent365-licensing', 'Microsoft Learn', 'Microsoft Agent 365 service description',
    'https://learn.microsoft.com/en-us/office365/servicedescriptions/microsoft-agent-365/microsoft-agent-365',
    'verified', 'Basic versus premium agent management feature table', [
      'Basic inventory, owner reassignment and core agent administration are listed across Microsoft 365 plans; do not claim ownership or an ordinary permission denial is E7-exclusive.',
      'Premium policy templates, tool controls and agent access packages are safer examples of an incremental Agent 365 governance capability.',
      'Some lifecycle and audit/eDiscovery boundaries differ between this service description and the licensing FAQ; the lab does not use those disputed items as its decisive comparison.',
      'Agent and integration support, associated-user licensing and separately funded runtime remain necessary.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-power-bi-sharing', 'Microsoft Learn', 'Share Power BI reports and dashboards',
    'https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-share-dashboards',
    'verified', 'Report sharing, permissions and underlying model access', [
      'In the sample shared-capacity Pro workflow, the publisher and recipients need appropriate licences and report/model access.',
      'Sharing may grant access to the underlying semantic model. Visual filters and hidden report pages are not security boundaries.',
      'The lab assumes explicit permitted internal recipients and does not use Publish to web as a licensing workaround.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-power-bi-licensing', 'Microsoft Learn', 'Power BI licensing for organizations',
    'https://learn.microsoft.com/en-us/fabric/enterprise/powerbi/service-admin-power-bi-licensing',
    'verified', 'Power BI licences and Microsoft 365 E5 inclusion', [
      'Microsoft 365 E5 includes a Power BI Pro licence, inherited through E7; dedicated Fabric/Premium capacity is separate.',
      'Free Power BI users can create personal content; Pro is not a prerequisite for every kind of authoring or analysis.',
      'The example compares licensed Pro collaboration with an existing Excel workbook workflow, not Power BI Copilot, PPU or dedicated-capacity features.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-teams-phone', 'Microsoft Learn', 'Teams Phone licensing',
    'https://learn.microsoft.com/en-us/microsoftteams/teams-phone-licensing',
    'verified', 'Teams Phone licensing for end users', [
      'An E5 user does not also need a standalone Teams Phone Standard licence; E7 inherits that entitlement through E5.',
      'An applicable Teams entitlement and assigned/enabled service plans remain required.',
      'Use the later Teams-choice source for current suite purchase variants rather than older purchase restrictions in general add-on guidance.',
      'The sample does not claim contact-centre, Teams Premium, resource-account or advanced queue entitlements.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-teams-pstn', 'Microsoft Learn', 'PSTN connectivity options',
    'https://learn.microsoft.com/en-us/microsoftteams/pstn-connectivity',
    'verified', 'Calling Plans, Operator Connect, Teams Phone Mobile and Direct Routing', [
      'PSTN connectivity requires a separate Microsoft calling subscription or carrier arrangement; Phone Standard does not supply calling minutes.',
      'Direct Routing has additional SBC infrastructure requirements.',
      'Online meeting audio and internal Teams-to-Teams calling are distinct from external PSTN calls and dial-in Audio Conferencing.',
    ], { reviewedAt: '2026-09-10' }),
  source('experience-teams-phone-setup', 'Microsoft Learn', 'Set up Teams Phone in your organization',
    'https://learn.microsoft.com/en-us/microsoftteams/setting-up-your-phone-system',
    'verified', 'Voice enablement, number assignment and emergency calling', [
      'The dedicated-number sample assumes voice enablement, an assigned number, emergency-calling configuration and an active PSTN arrangement.',
      'Requirements vary by option and country; Shared Calling also exists, so not every deployment needs a dedicated number per user.',
      'A fictional provider outage cannot be resolved by changing licence entitlement.',
    ], { reviewedAt: '2026-09-10' }),
];

export function getSource(id: string): EvidenceSource | undefined {
  return SOURCES.find((item) => item.id === id);
}

export const SECURITY_COPILOT_ALLOWANCE = {
  sourceId: 'security-copilot-inclusion',
  scusPerThousandLicences: 400,
  monthlyTenantCap: 10_000,
  summary: 'Eligible Microsoft 365 E5/E7 licences include 400 SCUs/month per 1,000 paid licences, proportionally scaled and capped at 10,000 SCUs/month. The allowance is shared tenant-wide, resets monthly and has no rollover.',
  conditions: 'Confirm tenant enablement and actual consumption. Microsoft advises existing customers not to delete previously provisioned capacity. Separately billed services, partner licences and validated residual capacity costs must be retained.',
} as const;

export const TEAMS_VARIANT_CONDITION = 'Teams-inclusive enterprise suites have been available to new customers worldwide since November 1, 2025. Verify the actual with-Teams or without-Teams variant and any separate Teams licence before claiming retirement.';
