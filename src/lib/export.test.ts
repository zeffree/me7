import { describe, expect, it } from 'vitest';
import { buildCsvExport, buildJsonExport, buildInputRecoveryExport } from './export';
import { computeAssessment, DEFAULT_ASSUMPTIONS } from '@/model/engine';
import { computeTei, DEFAULT_TEI_SETTINGS } from '@/model/tei';
import type { Assessment } from '@/model/types';
import { parseAssessmentExport } from './importJson';
import { TEI_STUDIES } from '@/data/teiStudies';

const assessment: Assessment = {
  orgName: 'Example organisation',
  seats: 100,
  currency: 'USD',
  baseline: 'm365e5',
  assumptions: { ...DEFAULT_ASSUMPTIONS },
  lines: [
    { categoryId: 'siem-soar', vendor: 'Keep this vendor', mode: 'annual', annual: 1234.56, retainPct: 0 },
  ],
  addOns: [],
  plannedCapabilities: [],
  tei: { ...DEFAULT_TEI_SETTINGS },
};

describe('assessment exports', () => {
  it('keeps exact inputs and unrounded financial totals in versioned JSON', () => {
    const result = computeAssessment(assessment);
    const payload = buildJsonExport(assessment, result);
    expect(payload.schema).toBe('me7-assessment/2');
    expect(payload.assessment).toEqual(assessment);
    expect(payload.summary.currentAnnualTotal).toBe(result.currentAnnualTotal);
    expect(payload.summary.netAnnualConservative).toBe(result.netAnnualConservative);
    expect(payload.summary.tcoNetBenefit).toBe(result.tcoNetBenefit);
  });

  it('omits experimental study results when the user did not opt in', () => {
    const result = computeAssessment(assessment);
    const tei = computeTei(assessment, result);
    expect(buildJsonExport(assessment, result, tei)).not.toHaveProperty('experimentalSimulatedTei');
    expect(buildCsvExport(assessment, result, tei)).not.toContain('SIMULATED FORRESTER');
  });

  it('exports unknown and excluded spend without claiming retirement credit', () => {
    const csv = buildCsvExport(assessment, computeAssessment(assessment));
    expect(csv).toContain('Keep this vendor');
    expect(csv).toContain('1234.56');
    expect(csv).toContain('Not covered');
    expect(csv).toContain('Currency,USD');
  });

  it('treats spreadsheet formulas in user-supplied text as literal text', () => {
    const withFormula: Assessment = {
      ...assessment,
      orgName: '=1+1',
      lines: [{ ...assessment.lines[0], vendor: '@SUM(1,2)' }],
    };
    const csv = buildCsvExport(withFormula, computeAssessment(withFormula));
    expect(csv).toContain("Organisation,'=1+1");
    expect(csv).toContain(`"'@SUM(1,2)"`);
    expect(buildJsonExport(withFormula, computeAssessment(withFormula)).assessment.orgName).toBe('=1+1');
  });

  it('reconciles timed cash flows, source metadata and saved settings to independent expected values', () => {
    const timed: Assessment = {
      ...assessment,
      schemaVersion: 2,
      assumptions: {
        ...DEFAULT_ASSUMPTIONS,
        baselineUnitPupm: 60,
        e7ListPupm: 99,
        baselinePriceSource: 'customer',
        e7PriceSource: 'customer',
        pricesConfirmed: true,
        horizonYears: 4,
        transitionEnabled: true,
        transitionCost: 6000,
      },
      lines: [{
        categoryId: 'edr-xdr',
        vendor: 'Independent invoice',
        mode: 'annual',
        annual: 60000,
        retainPct: 20,
        amountSource: 'customer',
        assumptionConfirmed: true,
        savingsDelayMonths: 6,
      }],
      addOns: [{
        addOnId: 'copilot',
        mode: 'annual',
        annual: 7200,
        amountSource: 'customer',
        assumptionConfirmed: true,
        savingsDelayMonths: 3,
      }],
    };
    const result = computeAssessment(timed);
    const payload = buildJsonExport(timed, result);
    expect(payload.summary.currentAnnualTotal).toBeCloseTo(139200);
    expect(payload.modelVersion).toBe(3);
    expect(payload.retirementPolicy).toBe('full-replacement');
    expect(payload.summary.futureAnnualTotal).toBeCloseTo(118800);
    expect(payload.summary.recurringAnnualBenefit).toBeCloseTo(20400);
    expect(payload.summary.year1NetBenefit).toBeCloseTo(-17400);
    expect(payload.summary.tcoNetBenefit).toBeCloseTo(43800);
    expect(payload.summary.paybackMonths).toBe(23);
    expect(payload.cashflow.months[0].transitionCost).toBe(6000);
    expect(payload.cashflow.years).toHaveLength(4);
    expect(payload.evidence.sources.length).toBeGreaterThan(0);
    expect(payload.evidence.lines[0].customerConfirmed).toBe(true);
    expect(payload.sourceVersion).toBeTruthy();
    expect(buildCsvExport(timed, result)).toContain('Year-one net benefit,-17400');
    const imported = parseAssessmentExport(JSON.stringify(payload));
    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.assessment.assumptions.transitionCost).toBe(6000);
      expect(imported.assessment.lines[0].savingsDelayMonths).toBe(6);
      expect(imported.assessment.addOns[0].savingsDelayMonths).toBe(3);
      expect(imported.assessment.lines[0].assumptionConfirmed).toBe(true);
    }
  });

  it('exports full covered add-on retirement without claiming a customer confirmed it', () => {
    const unconfirmed: Assessment = {
      ...assessment,
      schemaVersion: 2,
      addOns: [{ addOnId: 'copilot', mode: 'annual', annual: 7200, assumptionConfirmed: false }],
    };
    const result = computeAssessment(unconfirmed);
    const payload = buildJsonExport(unconfirmed, result);
    expect(payload.evidence.addOns[0].annualCredit).toBe(7200);
    expect(payload.evidence.addOns[0].eligible).toBe(true);
    expect(payload.evidence.addOns[0].customerConfirmed).toBe(false);
  });

  it('exports study estimates independently without an unreviewed combined return', () => {
    const experimental = { ...assessment, tei: { ...DEFAULT_TEI_SETTINGS, enabled: true } };
    const result = computeAssessment(experimental);
    const tei = computeTei(experimental, result);
    const payload = buildJsonExport(experimental, result, tei);
    expect(payload.experimentalSimulatedTei?.currency).toBe('USD');
    expect(payload.experimentalSimulatedTei?.studies).toHaveLength(3);
    expect(payload.experimentalSimulatedTei).not.toHaveProperty('combinedSimulation');
    const csv = buildCsvExport(experimental, result, tei);
    expect(csv).toContain('Independent study benefit PV (USD)');
    expect(csv).not.toContain('Simulated ROI %');
  });

  it('never exports mixed-currency combined ROI, even when review is requested', () => {
    const experimental: Assessment = {
      ...assessment,
      currency: 'EUR',
      tei: { ...DEFAULT_TEI_SETTINGS, enabled: true, combinedReviewed: true },
    };
    const result = computeAssessment(experimental);
    const tei = computeTei(experimental, result);
    const payload = buildJsonExport(experimental, result, tei);
    expect(payload.experimentalSimulatedTei?.combinedSimulationEligible).toBe(false);
    expect(payload.experimentalSimulatedTei).not.toHaveProperty('combinedSimulation');
    expect(buildCsvExport(experimental, result, tei)).not.toContain('Combined total benefit');
  });

  it('preserves no-investment status for a profitable reviewed TEI combination', () => {
    const experimental: Assessment = {
      ...assessment,
      schemaVersion: 2,
      lines: [],
      assumptions: {
        ...DEFAULT_ASSUMPTIONS,
        baselineUnitPupm: 60,
        e7ListPupm: 99,
        pricesConfirmed: true,
        baselinePriceSource: 'customer',
        e7PriceSource: 'customer',
      },
      tei: {
        ...DEFAULT_TEI_SETTINGS,
        enabled: true,
        combinedReviewed: true,
        copilotAdoptionPct: 100,
        confidencePct: 100,
        includeEnablementCost: true,
        lineOverrides: Object.fromEntries(TEI_STUDIES.flatMap((study) =>
          study.lines.map((line) => [line.id, line.id === 'copilot-operations']),
        )),
      },
    };
    const result = computeAssessment(experimental);
    const tei = computeTei(experimental, result);
    expect(tei.canCombine).toBe(true);
    expect(tei.years[0].net).toBeCloseTo(13095.60);
    expect(tei.paybackStatus).toBe('no-investment');
    const payload = buildJsonExport(experimental, result, tei);
    expect(payload.experimentalSimulatedTei?.combinedSimulation?.simulatedPaybackStatus).toBe('no-investment');
    const csv = buildCsvExport(experimental, result, tei);
    expect(csv).toContain('Simulated payback (months),No initial investment');
    expect(csv).not.toContain('Simulated payback (months),Not reached');
  });

  it('does not certify an unresolved foreign-currency reference on an excluded invoice', () => {
    const unresolved: Assessment = {
      ...assessment,
      schemaVersion: 2,
      currency: 'EUR',
      lines: [],
      assumptions: { ...DEFAULT_ASSUMPTIONS, pricesConfirmed: true },
      addOns: [{
        addOnId: 'windows-365', mode: 'pupm', pupm: 41,
        amountSource: 'benchmark', assumptionConfirmed: false,
      }],
    };
    const result = computeAssessment(unresolved);
    const payload = buildJsonExport(unresolved, result);
    expect(payload.summary.cashEstimateReady).toBe(false);
    expect(payload.summary.warnings.length).toBeGreaterThan(0);
    expect(payload.evidence.addOns[0].annualCredit).toBe(0);
    expect(buildCsvExport(unresolved, result)).toContain('Provisional: resolve missing or unsupported inputs');
  });

  it('preserves legacy foreign-currency inputs in a recovery copy without publishing projections', () => {
    const foreign = { ...assessment, currency: 'EUR' };
    const before = structuredClone(foreign);
    const payload = buildInputRecoveryExport(foreign);
    expect(payload.assessment).toEqual(before);
    expect(payload.recoveryOnly).toBe(true);
    expect(payload).not.toHaveProperty('summary');
    expect(payload).not.toHaveProperty('cashflow');
    expect(payload.note).toContain('No FX conversion');
    payload.assessment.lines[0].annual = 1;
    expect(foreign).toEqual(before);
  });
});
