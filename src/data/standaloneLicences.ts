/**
 * The Microsoft licences a customer could buy separately to get each capability E7 includes that
 * their current suite does not. This drives the capability cost-avoidance view: the customer picks
 * the capabilities they plan to deploy, and the engine finds the cheapest set of these licences
 * that would provide them. It is a licence counterfactual, never a cash saving.
 *
 * Add-on licences reuse the editable USD references in msAddOns.ts so there is a single price
 * source. Suite step-ups are approximated as the list difference between Microsoft 365 E5 and the
 * current suite; the actual step-up SKU price, eligibility and term depend on the agreement.
 */

import { CATEGORIES, type Category } from './categories';
import { getAddOn, getAddOnCapabilityIds } from './msAddOns';
import { BASELINE_SKUS, getBaseline, type BaselineSkuId } from './skus';

export interface StandaloneLicence {
  id: string;
  name: string;
  kind: 'add-on' | 'step-up';
  /** Catalog add-on this licence corresponds to; used for price and ownership. */
  addOnId?: string;
  /** Editable USD reference per user per month, before any negotiated discount. */
  listPricePupm: number;
  /** Categories this licence grants. */
  capabilityIds: string[];
  /** Purchased add-ons a suite step-up would replace, credited against the step-up cost. */
  supersedesAddOnIds: string[];
  /** Baselines this licence can be bought on. */
  availableFor: BaselineSkuId[];
  /**
   * Licences one of which must also be held, per baseline, before this one can be used. Missing
   * baselines have no modelled prerequisite (the suite already satisfies it).
   */
  requiresOneOf: Partial<Record<BaselineSkuId, string[]>>;
  prerequisite?: string;
  priceBasis: string;
  sourceIds: string[];
}

/** Categories E7 covers that this baseline does not: the capability gap to be licensed. */
export function gapCategories(baseline: BaselineSkuId): Category[] {
  return CATEGORIES.filter((c) => c.coverage[baseline] === 'unlocked' || c.coverage[baseline] === 'upgrade');
}

/** Add-ons that Microsoft 365 E5 already includes, so a step-up to E5 replaces them. */
const E5_INCLUDED_ADD_ONS = [
  'entra-id-p1', 'entra-id-p2', 'windows-e3', 'intune-plan1', 'intune-suite',
  'defender-endpoint-p1', 'defender-endpoint-p2', 'defender-o365-p1', 'defender-o365-p2',
  'defender-identity', 'defender-cloud-apps', 'm365-e5-security', 'm365-e5-compliance',
  'purview-info-protection', 'purview-insider-risk', 'purview-ediscovery-audit',
  'purview-comms-compliance', 'power-bi-pro', 'teams-phone',
];

/** Add-ons a baseline suite already includes; buying them again adds no capability. */
const INCLUDED_IN_BASELINE: Record<BaselineSkuId, string[]> = {
  o365e3: [],
  m365e3: ['entra-id-p1', 'intune-plan1', 'windows-e3'],
  m365e5: E5_INCLUDED_ADD_ONS,
};

/** Suite add-ons sold only on top of Microsoft 365 E3. */
const M365_E3_ONLY = ['m365-e5-security', 'm365-e5-compliance'];

const REQUIRES_ONE_OF: Record<string, Partial<Record<BaselineSkuId, string[]>>> = {
  'intune-suite': { o365e3: ['intune-plan1', 'm365e5-step-up-o365e3'] },
  'entra-suite': { o365e3: ['entra-id-p1', 'entra-id-p2', 'm365e5-step-up-o365e3'] },
};

const PREREQUISITES: Record<string, string> = {
  'copilot': 'Requires a qualifying Microsoft 365 or Office 365 base licence for each user.',
  'agent-365': 'Validate the licensed population and prerequisites in the current agreement.',
  'entra-suite': 'Requires Microsoft Entra ID P1 (included in M365 E3/E5; Office 365 E3 users need P1 or P2).',
  'intune-suite': 'Requires Microsoft Intune Plan 1 for each user.',
  'm365-e5-security': 'Sold as an add-on to Microsoft 365 E3.',
  'm365-e5-compliance': 'Sold as an add-on to Microsoft 365 E3.',
  'windows-e3': 'Requires a qualifying Windows Pro base licence on the device.',
};

function addOnLicence(addOnId: string): StandaloneLicence {
  const addOn = getAddOn(addOnId);
  if (!addOn) throw new Error(`Unknown add-on in standalone licence catalog: ${addOnId}`);
  return {
    id: addOn.id,
    name: addOn.name,
    kind: 'add-on',
    addOnId: addOn.id,
    listPricePupm: addOn.listPricePupm,
    // Products E5 already includes cannot grant a capability E5 itself lacks.
    capabilityIds: getAddOnCapabilityIds(addOn.id).filter((id) =>
      !E5_INCLUDED_ADD_ONS.includes(addOn.id) || CATEGORIES.find((c) => c.id === id)?.coverage.m365e5 === 'already'),
    supersedesAddOnIds: [],
    availableFor: BASELINE_SKUS
      .map((b) => b.id)
      .filter((b) => !INCLUDED_IN_BASELINE[b].includes(addOn.id) && (b === 'm365e3' || !M365_E3_ONLY.includes(addOn.id))),
    requiresOneOf: REQUIRES_ONE_OF[addOn.id] ?? {},
    prerequisite: PREREQUISITES[addOn.id],
    priceBasis: 'Stored Microsoft add-on list reference (USD / user / month); editable.',
    sourceIds: addOn.id === 'agent-365' || addOn.id === 'copilot' || addOn.id === 'entra-suite'
      ? ['e7-announcement', 'm365-product-terms']
      : ['m365-product-terms'],
  };
}

function stepUpLicence(from: Exclude<BaselineSkuId, 'm365e5'>): StandaloneLicence {
  const base = getBaseline(from);
  const e5 = getBaseline('m365e5');
  return {
    id: `m365e5-step-up-${from}`,
    name: `Microsoft 365 E5 step-up from ${base.shortName}`,
    kind: 'step-up',
    listPricePupm: Math.max(0, e5.listPricePupm - base.listPricePupm),
    capabilityIds: CATEGORIES
      .filter((c) => c.coverage.m365e5 === 'already' && (c.coverage[from] === 'unlocked' || c.coverage[from] === 'upgrade'))
      .map((c) => c.id),
    supersedesAddOnIds: [...E5_INCLUDED_ADD_ONS],
    availableFor: [from],
    requiresOneOf: {},
    prerequisite: `Step-up from an existing ${base.name} agreement. Availability, term and price depend on the agreement.`,
    priceBasis: `Approximated as the list difference: ${e5.shortName} USD ${e5.listPricePupm} − ${base.shortName} USD ${base.listPricePupm}. Not a quoted step-up SKU price; editable.`,
    sourceIds: ['m365-packaging-2026', 'm365-product-terms'],
  };
}

const ADD_ON_LICENCE_IDS = [
  'copilot', 'agent-365', 'entra-suite', 'm365-e5-security', 'm365-e5-compliance', 'power-bi-pro',
  'teams-phone', 'intune-suite', 'windows-e3', 'intune-plan1', 'entra-id-p1', 'entra-id-p2', 'defender-endpoint-p2',
  'defender-o365-p2', 'defender-identity', 'defender-cloud-apps', 'purview-info-protection',
  'purview-insider-risk', 'purview-ediscovery-audit', 'purview-comms-compliance',
];

export const STANDALONE_LICENCES: StandaloneLicence[] = [
  stepUpLicence('o365e3'),
  stepUpLicence('m365e3'),
  ...ADD_ON_LICENCE_IDS.map(addOnLicence),
];

export function getStandaloneLicence(id: string): StandaloneLicence | undefined {
  return STANDALONE_LICENCES.find((l) => l.id === id);
}

/** Licences that can be bought on this baseline, keeping only the gap capabilities they grant. */
export function licencesForBaseline(baseline: BaselineSkuId): StandaloneLicence[] {
  const gap = new Set(gapCategories(baseline).map((c) => c.id));
  return STANDALONE_LICENCES
    .filter((l) => l.availableFor.includes(baseline))
    .map((l) => ({ ...l, capabilityIds: l.capabilityIds.filter((id) => gap.has(id)) }));
}

/** Microsoft 365 E7 = Microsoft 365 E5 + Copilot + Entra Suite + Agent 365. */
export const E7_COMPONENT_LICENCE_IDS = ['copilot', 'agent-365', 'entra-suite'];

/** Prerequisite references must resolve; checked at module load so a typo cannot ship. */
for (const baseline of BASELINE_SKUS) {
  const licences = licencesForBaseline(baseline.id);
  for (const licence of licences) {
    for (const ids of Object.values(licence.requiresOneOf)) {
      for (const id of ids ?? []) if (!getStandaloneLicence(id)) throw new Error(`Unknown prerequisite licence ${id}`);
    }
  }
}
