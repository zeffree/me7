import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './categories';
import { getAddOn } from './msAddOns';
import { BASELINE_SKUS, getBaseline } from './skus';
import { SOURCES } from './sources';
import {
  STANDALONE_LICENCES, gapCategories, getStandaloneLicence, licencesForBaseline,
} from './standaloneLicences';

describe('standalone licence catalog', () => {
  it('uses unique ids and only known capabilities and sources', () => {
    const ids = STANDALONE_LICENCES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const categoryIds = new Set(CATEGORIES.map((c) => c.id));
    const sourceIds = new Set(SOURCES.map((s) => s.id));
    for (const licence of STANDALONE_LICENCES) {
      expect(licence.listPricePupm).toBeGreaterThan(0);
      for (const id of licence.capabilityIds) expect(categoryIds.has(id)).toBe(true);
      for (const id of licence.sourceIds) expect(sourceIds.has(id)).toBe(true);
    }
  });

  it('reuses the add-on catalog price for add-on licences', () => {
    for (const licence of STANDALONE_LICENCES.filter((l) => l.kind === 'add-on')) {
      expect(licence.listPricePupm).toBe(getAddOn(licence.addOnId!)!.listPricePupm);
    }
  });

  it('prices suite step-ups as the list difference to Microsoft 365 E5', () => {
    for (const from of ['o365e3', 'm365e3'] as const) {
      const stepUp = getStandaloneLicence(`m365e5-step-up-${from}`)!;
      expect(stepUp.listPricePupm).toBe(getBaseline('m365e5').listPricePupm - getBaseline(from).listPricePupm);
    }
  });

  it('offers licences per baseline that grant only gap capabilities and add something', () => {
    for (const baseline of BASELINE_SKUS) {
      const gap = new Set(gapCategories(baseline.id).map((c) => c.id));
      const licences = licencesForBaseline(baseline.id);
      expect(licences.length).toBeGreaterThan(0);
      for (const licence of licences) {
        for (const id of licence.capabilityIds) expect(gap.has(id)).toBe(true);
        for (const id of licence.requiresOneOf[baseline.id] ?? []) expect(getStandaloneLicence(id)).toBeDefined();
      }
    }
  });

  it('never offers a licence the baseline already includes, or a step-up from another suite', () => {
    const e5 = licencesForBaseline('m365e5').map((l) => l.id);
    expect(e5).not.toContain('entra-id-p2');
    expect(e5).not.toContain('m365-e5-security');
    expect(e5.some((id) => id.startsWith('m365e5-step-up'))).toBe(false);
    const m365e3 = licencesForBaseline('m365e3').map((l) => l.id);
    expect(m365e3).not.toContain('intune-plan1');
    expect(m365e3).toContain('m365e5-step-up-m365e3');
    expect(m365e3).not.toContain('m365e5-step-up-o365e3');
    expect(licencesForBaseline('o365e3').map((l) => l.id)).not.toContain('m365-e5-security');
  });

  it('does not let a product E5 includes grant a capability E5 lacks', () => {
    const p2 = getStandaloneLicence('entra-id-p2')!;
    expect(p2.capabilityIds).not.toContain('identity-governance');
  });

  it('treats only unlocked or upgraded capabilities as the gap', () => {
    expect(gapCategories('m365e5').every((c) => c.coverage.m365e5 !== 'already')).toBe(true);
  });
});
