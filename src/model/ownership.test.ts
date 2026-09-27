import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '@/data/categories';
import { MS_ADD_ONS, getAddOnCapabilityIds } from '@/data/msAddOns';

describe('already-purchased capability exclusions', () => {
  it('references only known catalog capabilities and has no duplicate exclusions', () => {
    const ids = new Set(CATEGORIES.map((category) => category.id));
    for (const addOn of MS_ADD_ONS) {
      const owned = getAddOnCapabilityIds(addOn.id);
      expect(new Set(owned).size).toBe(owned.length);
      for (const id of owned) expect(ids.has(id), `${addOn.id}: ${id}`).toBe(true);
    }
  });

  it('does not infer capabilities from unknown product identities', () => {
    expect(getAddOnCapabilityIds('unknown')).toEqual([]);
  });
});
