import { describe, expect, it } from 'vitest';
import { createDemoAssessment } from './demo';
import { computeAssessment } from '@/model/engine';
import { toAssessment, useAssessment } from '@/store/useAssessment';

describe('shared illustrative business case', () => {
  it('reconciles the example to independently calculated cash amounts', () => {
    const assessment = createDemoAssessment();
    const result = computeAssessment(assessment);
    expect(result.baselineAnnual).toBe(468_000);
    expect(result.currentAnnualTotal).toBe(1_701_600);
    expect(result.e7Annual).toBe(1_188_000);
    expect(result.totalAnnualSavings).toBe(1_173_600);
    expect(result.futureAnnualTotal).toBe(1_248_000);
    expect(result.recurringAnnualBenefit).toBe(453_600);
    expect(result.year1NetBenefit).toBe(168_000);
    expect(result.tcoNetBenefit).toBe(1_075_200);
    expect(result.paybackMonths).toBe(8);
    expect(result.monthlyCashflow[0].transitionCost).toBe(90_000);
    expect(result.monthlyCashflow[2].cashSavings).toBe(0);
    expect(result.monthlyCashflow[3].cashSavings).toBe(97_800);
    expect(result.scoredLines.filter(line => !line.eligible).map(line => line.category.id))
      .toEqual(['saas-backup', 'esignature']);
    expect(assessment.tei.enabled).toBe(false);
    expect(assessment.plannedCapabilities).toEqual([]);
  });

  it('loads exactly the case used on the landing rather than a disconnected demo', () => {
    const before = useAssessment.getState();
    try {
      useAssessment.getState().loadDemo();
      const loaded = toAssessment(useAssessment.getState());
      expect(loaded.isDemo).toBe(true);
      expect(loaded.currency).toBe('USD');
      expect(loaded.orgName).toBe(createDemoAssessment().orgName);
      const result = computeAssessment(loaded);
      const preview = computeAssessment(createDemoAssessment());
      for (const key of ['currentAnnualTotal', 'futureAnnualTotal', 'recurringAnnualBenefit', 'year1NetBenefit', 'tcoNetBenefit', 'paybackMonths'] as const) {
        expect(result[key]).toBe(preview[key]);
      }
      expect([...loaded.lines, ...loaded.addOns].every(line => line.amountSource === 'benchmark')).toBe(true);
    } finally {
      useAssessment.setState(before, true);
    }
  });

  it('returns independent editable inputs and never stamps synthetic invoices as confirmed', () => {
    const first = createDemoAssessment();
    first.lines[0].annual = 1;
    first.tei.lineOverrides.changed = true;
    first.assumptions.conservative.full = 0;
    const next = createDemoAssessment();
    expect(next.lines[0].annual).toBe(360_000);
    expect(next.tei.lineOverrides).toEqual({});
    expect(next.assumptions.conservative.full).toBe(1);
    expect(next.lines.every(line => !line.assumptionConfirmed && line.amountSource === 'benchmark')).toBe(true);
  });
});
