import { CATEGORIES, getCategory } from './categories';
import { MS_ADD_ONS, getAddOn } from './msAddOns';
import type { BaselineSkuId } from './skus';
import { EVIDENCE_REVIEW_DATE, SECURITY_COPILOT_ALLOWANCE, TEAMS_VARIANT_CONDITION } from './sources';
import type { EvidenceStatus } from './sources';
import { getStudy } from './teiStudies';
import type { TeiStudyId } from './teiStudies';

export type { EvidenceStatus } from './sources';

export interface EvidenceAssessment {
  status: EvidenceStatus;
  sourceIds: string[];
  conditions: string[];
  requiresConfirmation: boolean;
  reviewedAt: string;
}

const replacementCondition = 'Confirm the purchased SKU, supported workloads and users, functional replacement, retained scope, and actual contract cancellation. Owning a baseline capability does not establish duplicate spend.';
const invoiceCondition = 'Confirm the invoice is distinct, applies to the licensed users, can be cancelled, and excludes retained consumption or capabilities. Suite ownership alone does not establish a redundant invoice.';

const review = (status: EvidenceStatus, sourceIds: string[], conditions: string[]): EvidenceAssessment => ({
  status, sourceIds, conditions, requiresConfirmation: true, reviewedAt: EVIDENCE_REVIEW_DATE,
});
const conditional = (sourceIds: string[], ...conditions: string[]) => review('conditional', sourceIds, conditions);
const unverified = (...conditions: string[]) => review('unverified', ['m365-product-terms'], conditions);

/** Each record is a review of retirement applicability, not a certification of vendor equivalence. */
export const CATEGORY_EVIDENCE: Record<string, EvidenceAssessment> = {
  'genai-assistant': conditional(['e7-announcement', 'm365-packaging-2026'], 'Copilot inclusion is sourced; model/API consumption and specialist assistant workflows are not equivalent.'),
  'enterprise-search': conditional(['e7-announcement'], 'Verify connector availability, permissions, indexing scope and migration.'),
  'ai-notetaker': conditional(['e7-announcement', 'teams-choice-2025'], 'Validate meeting platform, recording policy and required recap features.', TEAMS_VARIANT_CONDITION),
  'agent-platform': conditional(['e7-announcement'], 'The announcement is not proof of unlimited agent building, Copilot Studio capacity or customer-facing agent replacement.'),
  'agent-governance': conditional(['e7-announcement'], 'Agent 365 inclusion does not prove third-party agent coverage, product parity or eligibility of every user.'),
  'genai-data-protection': unverified('Detailed Purview AI and third-party AI coverage and consumption requirements remain unverified.'),
  'sso-mfa': unverified('M365 E3 has P1, not P2 risk-based Identity Protection. Verify application migrations and customer identity exclusions.'),
  'identity-governance': conditional(['e7-announcement'], 'E5 P2 has some governance features; full Entra Suite is a different entitlement. Validate each connector and workflow.'),
  'pam-ciem': conditional(['permissions-management-retirement', 'm365-packaging-2026'], 'Only Entra/Azure role elevation and eligible Windows endpoint elevation are candidates. Retired Permissions Management provides no multicloud CIEM entitlement; vaulting and session recording remain separate.'),
  'ztna': conditional(['e7-announcement'], 'Pilot supported clients, protocols, connectors, regional performance and network scope.'),
  'swg': conditional(['e7-announcement'], 'Inspect policy, traffic inspection and regional requirements; a suite announcement does not prove mature SSE parity.'),
  'verified-id': unverified('Validate Face Check allowance and paid document/biometric proofing; do not credit existing free Verified ID.'),
  'cert-lifecycle': conditional(['m365-packaging-2026'], 'Cloud PKI scope is eligible Intune-managed endpoints, not all public/server/workload certificates.'),
  'password-manager': unverified('No enterprise vault replacement is modeled; keep the invoice.'),
  'uem': conditional(['m365-packaging-2026'], 'Check device enrolment, OS-specific features and specialist fleet requirements.'),
  'patch-config': conditional(['m365-packaging-2026'], 'M365 E3 does not include the E5 Enterprise Application Management addition; validate app catalog and update workflows.'),
  'windows-vdi': unverified('Qualifying Windows base licences and virtualization access rights require agreement review. VDI brokers and compute are separate.'),
  'remote-support': conditional(['m365-packaging-2026'], 'Validate platform, enrolment, consent/unattended support and external-customer requirements.'),
  'dex': conditional(['m365-packaging-2026'], 'Advanced Analytics is not proof of equivalent remediation, sentiment collection or custom telemetry.'),
  'mobile-threat-defense': unverified('Validate licensed Defender plan, platform support and required mobile threat features.'),
  'edr-xdr': unverified('M365 E3 P1 is not P2 EDR. Validate device/server licences, managed services and SOC cutover.'),
  'email-security': conditional(['m365-packaging-2026'], 'Both E3 tiers gain P1, not P2. Parallel mail filtering may be deliberate defence in depth.'),
  'itdr': unverified('Validate sensors and identity scope; directory backup and forest recovery remain separate.'),
  'casb': unverified('API-based SaaS controls and inline SWG controls are not interchangeable. Check vendor bundle allocation.'),
  'vuln-mgmt': unverified('Only core Defender for Endpoint vulnerability capabilities are modeled; premium capabilities and unmanaged/server coverage need separate review.'),
  'security-awareness': unverified('Validate Plan 2 entitlement, training content, localization and audit requirements.'),
  'siem-soar': unverified('Sentinel consumption is not included in this suite comparison; keep SIEM and SOAR invoices.'),
  'secops-ai': conditional(['security-copilot-inclusion'], SECURITY_COPILOT_ALLOWANCE.summary, SECURITY_COPILOT_ALLOWANCE.conditions),
  'dlp': unverified('Validate endpoint, Teams, browser and non-Microsoft data coverage; E3 rights do not equal full E5 DLP.'),
  'info-protection': unverified('Validate manual versus automatic labelling, rights management and migration scope.'),
  'insider-risk': unverified('Validate service limits, licensed users, privacy approvals and separately metered features.'),
  'ediscovery': unverified('Validate retention period, data sources, review workflow and separately licensed audit retention.'),
  'archiving-retention': unverified('Validate regulatory requirements, immutable retention and legacy archive migration.'),
  'comms-compliance': unverified('Third-party channel capture and connectors may remain separately billed.'),
  'data-catalog': conditional(['purview-governance-billing'], 'Unified Catalog governed assets and data health processing are pay-as-you-go. No suite-funded retirement credit is modeled.'),
  'compliance-posture': unverified('Validate included assessment templates and the required non-Microsoft evidence collection.'),
  'video-meetings': conditional(['teams-choice-2025', 'e7-announcement'], TEAMS_VARIANT_CONDITION),
  'ucaas-telephony': unverified('Validate Teams/Phone licensing; PSTN, numbers, calling plans, recording and contact centre costs remain separate.'),
  'audio-conferencing': unverified(TEAMS_VARIANT_CONDITION, 'Validate dial-in/dial-out regions, assigned licences and any toll-free or consumption charges.'),
  'webinars-events': unverified(TEAMS_VARIANT_CONDITION, 'Specific event feature, rollout and capacity claims have not been independently verified; verify current Teams licensing.'),
  'file-storage': unverified('Validate storage quotas, external sharing, governance requirements and migration costs.'),
  'whiteboarding': unverified('Validate guest access, templates, workflows and Loop/Whiteboard service availability.'),
  'intranet-ex': unverified('Validate included Viva features and separately purchased premium employee-experience capabilities.'),
  'saas-backup': unverified('Retention is not backup. Microsoft 365 Backup consumption and third-party backup remain separate.'),
  'team-chat': conditional(['teams-choice-2025'], TEAMS_VARIANT_CONDITION, 'Validate external collaboration, app integrations and migration.'),
  'wiki-knowledge': unverified('Basic documentation overlap does not prove replacement of application-like databases or engineering workflows.'),
  'esignature': unverified('No suite-funded e-signature service is modeled; keep signature transaction and platform costs.'),
  'contact-center': unverified('Teams Phone is not a full contact centre; keep CCaaS, routing, recording and workforce management costs.'),
  'business-intelligence': unverified('Validate Power BI Pro licensing, role mix, model limits and separate Fabric/Premium capacity.'),
  'workflow-automation': review('unverified', ['power-platform-licensing'], ['Seeded standard-connector rights are not premium iPaaS entitlement; validate every connector and limit.']),
  'rpa': review('unverified', ['power-platform-licensing'], ['No organizational RPA retirement is modeled; paid automation remains separate from Windows desktop use rights.']),
  'lowcode': review('unverified', ['power-platform-licensing'], ['Validate seeded use rights; premium connectors, Dataverse and premium applications remain separate.']),
  'forms-surveys': unverified('Basic forms are not equivalent to enterprise research, experience management or customer workflows.'),
  'project-management': unverified('Basic Planner only; Premium, Project, portfolio and resource scheduling are separately licensed.'),
};

export function getCategoryEvidence(categoryId: string, baseline?: BaselineSkuId): EvidenceAssessment {
  const record = CATEGORY_EVIDENCE[categoryId];
  const category = getCategory(categoryId);
  if (!record || !category) return unverified('Unknown category; no retirement credit without catalog review.');
  const coverage = baseline ? category.coverage[baseline] : undefined;
  return {
    ...record,
    sourceIds: [...record.sourceIds],
    conditions: [
      ...record.conditions,
      ...(category.caveat ? [category.caveat] : []),
      replacementCondition,
      ...(coverage === 'already' ? ['Baseline optimization is separate from E7-unlocked value; it is not necessarily double payment.'] : []),
      ...(coverage === 'not-covered' ? ['This category remains excluded even after customer confirmation.'] : []),
    ],
  };
}

export const ADD_ON_EVIDENCE: Record<string, EvidenceAssessment> = {
  'copilot': conditional(['e7-announcement'], 'Confirm the same licensed users, agreement and cancellation date; API/agent consumption is separate.'),
  'agent-365': conditional(['e7-announcement'], 'Confirm applicable user licensing, prerequisites and cancellation date.'),
  'intune-suite': conditional(['m365-packaging-2026', 'intune-pricing'], 'Verify the full required component set and actual tenant rollout; do not assume the existing invoice is duplicate.'),
  'entra-suite': conditional(['e7-announcement', 'entra-pricing'], 'Verify same licensed users, required service scope and consumption limits.'),
  'entra-id-governance': conditional(['e7-announcement', 'entra-pricing'], 'Verify the applicable governance SKU and overlap with any Entra Suite invoice.'),
  'entra-id-p1': unverified('Standalone price and purchased entitlement require current agreement review.'),
  'entra-id-p2': unverified('Standalone price and purchased entitlement require current agreement review.'),
  'windows-e3': unverified('Verify qualifying base licence, device rights and current price.'),
  'intune-plan1': unverified('Verify same licensed user/device population and current price.'),
  'defender-endpoint-p1': unverified('Verify legacy standalone price and overlap with Defender Suite.'),
  'defender-endpoint-p2': unverified('Server licences and managed services are not equivalent to user P2 entitlement.'),
  'defender-o365-p1': conditional(['m365-packaging-2026'], 'May already be in the baseline after rollout; validate invoice and renewal rather than silently removing it.'),
  'defender-o365-p2': unverified('Verify standalone SKU, user count and suite overlap.'),
  'defender-identity': unverified('Verify licensed users, sensors and Defender Suite overlap.'),
  'defender-cloud-apps': unverified('Verify licensed users, scope and Defender Suite overlap.'),
  'm365-e5-security': unverified('Verify Defender Suite prerequisites, exact components and current quoted price.'),
  'm365-e5-compliance': unverified('Verify Purview Suite prerequisites, exact components and current quoted price.'),
  'purview-info-protection': unverified('Legacy indicative price; estate-wide and AI pay-as-you-go charges are not absorbed.'),
  'purview-insider-risk': unverified('Legacy indicative price; validate feature limits and retained pay-as-you-go charges.'),
  'purview-ediscovery-audit': unverified('Verify audit retention duration and SKU; do not assume every long-term retention add-on is included.'),
  'purview-comms-compliance': unverified('Verify legacy SKU, third-party connectors and any retained consumption.'),
  'power-bi-pro': unverified('Verify current unit price and licensed user mix; Fabric/Premium capacity is separate.'),
  'teams-phone': unverified('Verify Teams variant and Phone entitlement; PSTN/calling plans remain separate.'),
  'audio-conferencing': unverified('Verify assigned licences, regions, dial-out/toll-free usage and the actual invoice. Zero is not a verified quote.'),
  'sentinel': unverified('Consumption is excluded; a zero per-user seed means usage-priced, not free.'),
  'security-copilot': conditional(['security-copilot-inclusion'], SECURITY_COPILOT_ALLOWANCE.summary, SECURITY_COPILOT_ALLOWANCE.conditions),
  'teams-calling-plan': unverified('Calling plan is excluded; verify country, number and minute allowances and actual price.'),
  'power-platform-premium': unverified('Separate purchase. This combined illustrative row is not one verified Power Apps/Power Automate SKU.'),
  'project-plan3': unverified('Separate purchase; verify current Planner/Project SKU and price.'),
  'viva-suite': unverified('Separate premium suite; verify current components and any product retirements.'),
  'windows-365': unverified('Separate Cloud PC purchase; configuration and commercial offer determine the invoice, not workforce seats.'),
};

export function getAddOnEvidence(addOnId: string): EvidenceAssessment {
  const record = ADD_ON_EVIDENCE[addOnId];
  const addOn = getAddOn(addOnId);
  if (!record || !addOn) return unverified('Unknown add-on; validate catalog identity before any retirement.');
  return {
    ...record,
    sourceIds: [...record.sourceIds],
    conditions: [...record.conditions, invoiceCondition, ...(addOn.absorbedByE7 ? [] : ['Not absorbed by E7; confirmation cannot make this invoice eligible.'])],
  };
}

export function getBenchmarkEvidence(categoryId: string, vendor?: string): EvidenceAssessment {
  const category = getCategory(categoryId);
  return review('unverified', ['catalog-assumptions'], [
    category ? `${category.name}: ${category.benchmarkPupm} is an illustrative USD planning input, not a verified price.` : 'Unknown category benchmark.',
    ...(vendor ? [`No vendor-specific price evidence was retained for ${vendor}.`] : []),
    'Confirm vendor edition, actual units, term, licensed population, amount and currency. Customer confirmation remains an assumption.',
    'An adoption percentage and workforce normalization are model assumptions, not published vendor facts.',
  ]);
}

export function getAddOnPriceEvidence(addOnId: string): EvidenceAssessment {
  if (addOnId === 'agent-365') return conditional(['e7-announcement'], 'The $15 announced reference is not the customer agreement or a regional quote.');
  return review('unverified', ['m365-product-terms'], [
    getAddOn(addOnId) ? 'The stored USD price is an editable reference, not an independently verified current quote.' : 'Unknown add-on price.',
    'Enter a current amount in the assessment currency; zero usage-based seeds do not mean free service.',
  ]);
}

export function getSuiteEvidence(skuId: BaselineSkuId | 'm365e7'): EvidenceAssessment {
  return conditional(
    skuId === 'm365e7' ? ['e7-announcement', 'm365-packaging-2026'] : ['m365-packaging-2026', 'm365-product-terms', 'teams-choice-2025'],
    'Stored USD prices are references, not a regional quote. Confirm price, commitment, renewal date and purchased Teams variant.',
    'Feature rollout and eligibility are distinct from price effective dates; verify the customer tenant and applicable agreement.',
  );
}

export function getTeiEvidence(studyId: TeiStudyId, lineId?: string): EvidenceAssessment {
  const study = getStudy(studyId);
  const line = lineId ? study?.lines.find((item) => item.id === lineId) : undefined;
  if (!study || (lineId && !line)) return review('unverified', [], ['Unknown study or benefit line.']);
  return review(line?.evidenceStatus ?? study.evidenceStatus ?? 'unverified', [...(study.sourceIds ?? [])], [
    study.normalizationNote ?? 'Customer population scaling requires explicit review.',
    study.omittedCostNote ?? 'Review all implementation and ongoing costs.',
    'Study benefits are USD composite estimates, not customer cash. Do not combine with non-USD costs without an explicit supported conversion.',
    'Cross-study benefit overlap requires line exclusion or explicit allocation before aggregation. Year-three rates held beyond three years are app assumptions.',
    ...(line?.caution ? [line.caution] : []),
    ...(line?.doubleCounts ? [line.doubleCounts] : []),
  ]);
}

/** For exports and review screens: includes all records, not only selected or currently visible ones. */
export const EVIDENCE_CATALOG_COUNTS = {
  categories: CATEGORIES.length,
  addOns: MS_ADD_ONS.length,
};
