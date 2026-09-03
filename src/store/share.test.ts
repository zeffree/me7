import { describe, expect, it } from 'vitest';
import LZString from 'lz-string';
import { decodeAssessment, encodeAssessment } from './share';
import { DEFAULT_ASSUMPTIONS, computeAssessment } from '@/model/engine';
import { DEFAULT_TEI_SETTINGS } from '@/model/tei';
import type { Assessment } from '@/model/types';

const fixture: Assessment = {
  orgName: 'Northwind Traders',
  seats: 4200,
  currency: 'USD',
  baseline: 'm365e5',
  assumptions: { ...DEFAULT_ASSUMPTIONS, baselineUnitPupm: 54, e7DiscountPct: 8 },
  lines: [
    {
      categoryId: 'genai-assistant',
      vendor: 'ChatGPT Enterprise',
      mode: 'pupm',
      pupm: 60,
      seats: 600,
      retainPct: 10,
      contractEnd: '2027-03-31',
    },
    {
      categoryId: 'ztna',
      vendor: 'Zscaler Private Access',
      mode: 'annual',
      annual: 310_000,
      retainPct: 0,
    },
    {
      categoryId: 'siem-soar',
      vendor: 'Splunk Enterprise Security',
      mode: 'annual',
      annual: 620_000,
      retainPct: 0,
    },
  ],
  addOns: [
    { addOnId: 'copilot', mode: 'pupm', pupm: 30, seats: 800 },
    { addOnId: 'entra-id-governance', mode: 'pupm', pupm: 7, seats: 4200 },
  ],
  plannedCapabilities: ['agent-governance', 'identity-governance'],
  tei: { ...DEFAULT_TEI_SETTINGS },
};

describe('share codec', () => {
  it('round-trips an assessment without losing anything', () => {
    const decoded = decodeAssessment(encodeAssessment(fixture));
    expect(decoded).toEqual(fixture);
  });

  it('produces an identical engine result after a round-trip', () => {
    const decoded = decodeAssessment(encodeAssessment(fixture));
    expect(decoded).not.toBeNull();
    expect(computeAssessment(decoded!)).toEqual(computeAssessment(fixture));
  });

  it('uses a URL-safe alphabet', () => {
    expect(encodeAssessment(fixture)).toMatch(/^[A-Za-z0-9+\-$]*$/);
  });

  it('survives a real query-string round-trip', () => {
    const encoded = encodeAssessment(fixture);
    const url = new URL('https://example.com/');
    url.searchParams.set('d', encoded);
    const readBack = new URLSearchParams(new URL(url.toString()).search).get('d');
    expect(decodeAssessment(readBack!)).toEqual(fixture);
  });

  it('recovers when a link rewriter turns "+" into a space', () => {
    // Bare '+' in a query string decodes to a space under form-urlencoded rules, which is
    // exactly what happens when a share link is pasted through a mail or chat client.
    const corrupted = encodeAssessment(fixture).replace(/\+/g, ' ');
    expect(decodeAssessment(corrupted)).toEqual(fixture);
  });

  it('survives unicode in free-text fields', () => {
    const withUnicode: Assessment = {
      ...fixture,
      orgName: 'Ærø Handel — 日本支社',
      lines: [{ ...fixture.lines[0], vendor: 'Zoë’s “AI” Co. €1' }],
    };
    expect(decodeAssessment(encodeAssessment(withUnicode))).toEqual(withUnicode);
  });

  it('returns null for garbage rather than throwing', () => {
    expect(decodeAssessment('not-valid-lz-string!!')).toBeNull();
    expect(decodeAssessment('')).toBeNull();
  });

  it('rejects well-formed JSON that is not an assessment', () => {
    const notAnAssessment = LZString.compressToEncodedURIComponent(
      JSON.stringify({ foo: 'bar' }),
    );
    expect(decodeAssessment(notAnAssessment)).toBeNull();
  });

  it('rejects an assessment missing its line items', () => {
    const missingLines = LZString.compressToEncodedURIComponent(
      JSON.stringify({ ...fixture, lines: undefined }),
    );
    expect(decodeAssessment(missingLines)).toBeNull();
  });

  it('keeps a fully-populated assessment inside practical URL limits', () => {
    const big: Assessment = {
      ...fixture,
      lines: Array.from({ length: 47 }, (_, i) => ({
        categoryId: `category-${i}`,
        vendor: `Some Reasonably Long Vendor Name ${i}`,
        mode: 'annual' as const,
        annual: 100_000 + i,
        retainPct: 10,
        contractEnd: '2027-06-30',
      })),
    };
    // 8 KB is the conservative limit proxies and servers tend to enforce; browsers allow far
    // more. A completely filled-in assessment must stay comfortably under it.
    expect(encodeAssessment(big).length).toBeLessThan(8000);
    expect(decodeAssessment(encodeAssessment(big))).toEqual(big);
  });
});
