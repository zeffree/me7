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
    expect(res.warning).toBeUndefined();
  });

  it('accepts a bare assessment object without the envelope', () => {
    const res = parseAssessmentExport(JSON.stringify(sample));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.assessment.seats).toBe(4200);
  });

  it('warns but still imports when the schema version differs', () => {
    const res = parseAssessmentExport(envelope(sample, 'me7-assessment/9'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.warning).toContain('me7-assessment/9');
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

  it('sanitises hostile values instead of trusting the file', () => {
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
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.assessment.baseline).toBe('m365e5');
    expect(res.assessment.seats).toBeGreaterThan(0);
    expect(res.assessment.lines).toHaveLength(0);
    expect(res.assessment.addOns).toHaveLength(0);
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

  it('pluralises and omits add-ons when there are none', () => {
    const a = sanitizeAssessment({ ...sample, addOns: [], lines: [] } as never);
    const text = describeImport(a);
    expect(text).toContain('0 spend lines');
    expect(text).not.toContain('add-on');
  });
});
