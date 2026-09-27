import { describe, expect, it } from 'vitest';
import { describeImport, parseAssessmentExport } from './importJson';
import { sanitizeAssessment } from '@/store/useAssessment';

function envelope(assessment: unknown, schema = 'me7-assessment/1') {
  return JSON.stringify({ schema, exportedAt: new Date().toISOString(), assessment });
}

const sample = {
  orgName: 'Contoso Ltd',
  seats: 4200,
  currency: 'USD',
  baseline: 'o365e3',
  lines: [
    {
      categoryId: 'edr-xdr',
      vendor: 'CrowdStrike',
      seats: 4200,
      mode: 'pupm',
      pupm: 8,
      retainPct: 0,
    },
  ],
  addOns: [{ addOnId: 'copilot-m365', mode: 'pupm', pupm: 30 }],
};

describe('parseAssessmentExport', () => {
  it('round-trips an export envelope', () => {
    const res = parseAssessmentExport(envelope(sample));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.assessment.orgName).toBe('Contoso Ltd');
    expect(res.assessment.seats).toBe(4200);
    expect(res.assessment.baseline).toBe('o365e3');
    expect(res.assessment.lines).toHaveLength(1);
    expect(res.warning).toContain('Legacy invoice amounts were preserved');
    expect(res.assessment.addOns[0].addOnId).toBe('copilot');
    expect(res.assessment.addOns[0].pupm).toBe(30);
  });

  it('accepts a bare assessment object without the envelope', () => {
    const res = parseAssessmentExport(JSON.stringify(sample));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.assessment.seats).toBe(4200);
  });

  it.each(['EUR', 'GBP', 'JPY', 'usd'])('rejects explicit %s amounts rather than relabeling them as USD', (currency) => {
    const input = { ...sample, currency };
    for (const text of [
      JSON.stringify(input), envelope(input), envelope(input, 'me7-assessment/2'),
    ]) {
      const res = parseAssessmentExport(text);
      expect(res.ok).toBe(false);
      if (res.ok) continue;
      expect(res.error).toContain('Only USD assessments');
      expect(res.error).toContain('No FX conversion');
      expect(res.error).toContain('not imported');
    }
    expect(input.currency).toBe(currency);
    expect(input.lines[0].pupm).toBe(8);
  });

  it('treats an absent legacy currency as USD without manufacturing customer confirmations', () => {
    const { currency: _currency, ...input } = sample;
    const res = parseAssessmentExport(envelope(input));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.assessment.currency).toBe('USD');
    expect(res.assessment.assumptions.pricesConfirmed).toBe(false);
    expect([...res.assessment.lines, ...res.assessment.addOns].every((line) => !line.assumptionConfirmed)).toBe(true);
  });

  it('rejects unsupported future schemas rather than silently defaulting data', () => {
    const res = parseAssessmentExport(envelope(sample, 'me7-assessment/9'));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain('me7-assessment/9');
  });

  it('rejects unrelated JSON rather than silently resetting the assessment', () => {
    for (const junk of ['{"hello":"world"}', '[1,2,3]', '"a string"', 'null', '42']) {
      const res = parseAssessmentExport(junk);
      expect(res.ok, junk).toBe(false);
    }
  });

  it('rejects malformed JSON and empty files', () => {
    expect(parseAssessmentExport('{ not json').ok).toBe(false);
    expect(parseAssessmentExport('   ').ok).toBe(false);
  });

  it('rejects hostile values instead of returning success-shaped replacement defaults', () => {
    // Source baseline is deliberately o365e3 so the m365e5 fallback is unambiguous.
    const res = parseAssessmentExport(
      envelope({
        ...sample,
        baseline: 'm365e9',
        seats: -100,
        lines: [{ categoryId: 'nope', vendor: 'x', mode: 'pupm', pupm: 5, retainPct: 0 }],
        addOns: [{ addOnId: 'not-a-real-addon', mode: 'pupm', pupm: 5 }],
      }),
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain('Unknown baseline');
    expect(res.error).toContain('Seats');
    expect(res.error).toContain('unknown catalog identity');
  });

  it('survives a real export payload shape with extra keys', () => {
    const payload = JSON.stringify({
      schema: 'me7-assessment/1',
      exportedAt: '2026-09-01T00:00:00.000Z',
      assessment: sample,
      summary: { netAnnualConservative: 123 },
      disclaimer: 'Estimator only.',
    });
    expect(parseAssessmentExport(payload).ok).toBe(true);
  });
});

describe('describeImport', () => {
  it('summarises what was recovered', () => {
    const a = sanitizeAssessment(sample as never);
    const text = describeImport(a);
    expect(text).toContain('Contoso Ltd');
    expect(text).toContain('4,200 seats');
    expect(text).toContain('1 spend line');
  });

  describe('v2 import integrity', () => {
    it('round-trips explicit timing, provenance and audit-only retained percentages', () => {
      const a = sanitizeAssessment({
        ...sample,
        lines: sample.lines.map((line) => ({ ...line, amountSource: 'customer', assumptionConfirmed: true, savingsDelayMonths: 6 })),
        addOns: [{ addOnId: 'copilot', mode: 'annual', annual: 7_200, amountSource: 'customer', assumptionConfirmed: true, retainPct: 25, savingsDelayMonths: 3 }],
        assumptions: { transitionEnabled: true, transitionCost: 6_000 },
      } as never);
      const parsed = parseAssessmentExport(envelope(a, 'me7-assessment/2'));
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(parsed.assessment).toEqual(a);
      expect(parsed.warning).toContain('retained-spend percentages are preserved for audit but no longer applied');
      expect(parsed.assessment.assumptions.transitionCost).toBe(6_000);
      expect(parsed.assessment.lines[0].savingsDelayMonths).toBe(6);
      expect(parsed.assessment.addOns[0].retainPct).toBe(25);
    });

    it.each([
      { seats: 1.5 },
      { seats: null },
      { lines: [{ ...sample.lines[0], mode: 'monthly' }] },
      { lines: [{ ...sample.lines[0], pupm: null }] },
      { lines: [{ ...sample.lines[0], savingsDelayMonths: 2.5 }] },
      { lines: [sample.lines[0], sample.lines[0]] },
      { addOns: [{ addOnId: 'no-such-addon', mode: 'annual', annual: 7_200 }] },
      { assumptions: { transitionCost: -1 } },
      { assumptions: { horizonYears: 0 } },
      { tei: { combinedReviewed: 'yes' } },
    ])('rejects invalid fields rather than creating a default assessment: %j', (patch) => {
      const parsed = parseAssessmentExport(envelope({ ...sample, ...patch }, 'me7-assessment/2'));
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) expect(parsed.error).toContain('not imported');
    });
  });

  it('pluralises and omits add-ons when there are none', () => {
    const a = sanitizeAssessment({ ...sample, addOns: [], lines: [] } as never);
    const text = describeImport(a);
    expect(text).toContain('0 spend lines');
    expect(text).not.toContain('add-on');
  });
});
