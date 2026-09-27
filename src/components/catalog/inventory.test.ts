import { describe, expect, it } from 'vitest';
import { answeredCategoryCount, recoveredInvoices } from './inventory';
import type { SpendLine } from '@/model/types';

const known: SpendLine = { categoryId: 'genai-assistant', vendor: 'Known invoice', mode: 'annual', annual: 1200, retainPct: 0 };
const unknown: SpendLine = { categoryId: 'retired-catalog-id', vendor: 'Legacy vendor', mode: 'annual', annual: 4321, retainPct: 0 };

describe('recovered inventory presentation', () => {
  it('does not count unknown identifiers or duplicate answers as reviewed categories', () => {
    expect(answeredCategoryCount([known, unknown], ['genai-assistant', 'another-retired-id'])).toBe(1);
  });

  it('exposes both types of unmapped invoice and preserves annual amounts', () => {
    expect(recoveredInvoices({
      seats: 100, lines: [known, unknown],
      addOns: [{ addOnId: 'retired-addon-id', mode: 'pupm', pupm: 2.5, seats: 10 }, { addOnId: 'copilot', mode: 'annual', annual: 1000 }],
    })).toEqual([
      { kind: 'third-party', id: 'retired-catalog-id', name: 'Legacy vendor', annual: 4321 },
      { kind: 'microsoft', id: 'retired-addon-id', name: 'retired-addon-id', annual: 300 },
    ]);
  });

  it('keeps unknown recovered amounts distinct from explicit zero', () => {
    const result = recoveredInvoices({
      seats: 100, lines: [{ ...unknown, annual: undefined }],
      addOns: [{ addOnId: 'retired-addon-id', mode: 'annual', annual: 0 }],
    });
    expect(result[0].annual).toBeUndefined();
    expect(result[1].annual).toBe(0);
  });
});
