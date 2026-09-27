import type { Assessment, EngineResult, TeiResult } from '@/model/types';
import { MODEL_VERSION } from '@/model/engine';
import { getDomain } from '@/data/categories';
import { getBaseline } from '@/data/skus';
import { getStudy } from '@/data/teiStudies';
import { getAddOn } from '@/data/msAddOns';
import {
  getAddOnEvidence, getAddOnPriceEvidence, getBenchmarkEvidence, getCategoryEvidence,
  getSuiteEvidence, getTeiEvidence, type EvidenceAssessment,
} from '@/data/evidence';
import { EVIDENCE_REVIEW_DATE, SOURCE_VERSION, SOURCES, getSource } from '@/data/sources';
import { BUCKET_META } from '@/lib/coverage';

function download(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'assessment'
  );
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Full state, re-importable. Kept pure so output can be reconciled without a browser. */
export function buildJsonExport(assessment: Assessment, result: EngineResult, tei?: TeiResult) {
  return {
    schema: 'me7-assessment/2',
    modelVersion: MODEL_VERSION,
    retirementPolicy: 'full-replacement',
    currencyPolicy: 'USD-only',
    sourceVersion: SOURCE_VERSION,
    evidenceReviewedAt: EVIDENCE_REVIEW_DATE,
    exportedAt: new Date().toISOString(),
    assessment,
    summary: {
      currentAnnualTotal: result.currentAnnualTotal,
      futureAnnualTotal: result.futureAnnualTotal,
      recurringAnnualBenefit: result.recurringAnnualBenefit,
      year1NetBenefit: result.year1NetBenefit,
      cashEstimateReady: result.cashEstimateReady,
      warnings: result.warnings,
      e7Annual: result.e7Annual,
      uplift: result.uplift,
      netAnnualConservative: result.netAnnualConservative,
      netAnnualBest: result.netAnnualBest,
      effectiveNetPupmConservative: result.effectiveNetPupmConservative,
      effectiveNetPupmBest: result.effectiveNetPupmBest,
      paybackMonths: result.paybackMonths,
      paybackStatus: result.paybackStatus,
      tcoNetBenefit: result.tcoNetBenefit,
      // Reported separately, and never added to the figures above: this is capability value
      // gained at benchmark prices, not cash removed from the P&L.
      avoidedAnnualSelected: result.avoidedAnnualSelected,
      avoidedCostCurrency: 'USD',
    },
    cashflow: {
      currency: assessment.currency,
      timingMode: assessment.assumptions.transitionEnabled ? 'scheduled' : 'run-rate',
      oneTimeTransitionCost: result.migrationTotal,
      months: result.monthlyCashflow,
      years: result.tco,
    },
    evidence: {
      baseline: getSuiteEvidence(assessment.baseline),
      e7: getSuiteEvidence('m365e7'),
      sources: SOURCES,
      lines: result.scoredLines.map((scored) => ({
        categoryId: scored.line.categoryId,
        amountSource: scored.line.amountSource ?? 'unspecified',
        customerConfirmed: scored.line.assumptionConfirmed === true,
        eligible: scored.eligible,
        excludedReason: scored.exclusionReason,
        annualCredit: scored.annualCredit,
        coverage: getCategoryEvidence(scored.line.categoryId, assessment.baseline),
        referenceBenchmark: getBenchmarkEvidence(scored.line.categoryId, scored.line.vendor),
      })),
      addOns: result.scoredAddOns.map((scored) => ({
        addOnId: scored.addOnId,
        amountSource: scored.line.amountSource ?? 'unspecified',
        customerConfirmed: scored.line.assumptionConfirmed === true,
        eligible: scored.eligible,
        excludedReason: scored.exclusionReason,
        annualCredit: scored.annualCredit,
        coverage: getAddOnEvidence(scored.addOnId),
        referencePrice: getAddOnPriceEvidence(scored.addOnId),
      })),
      avoidedCosts: result.avoidedCosts.filter((item) => item.selected).map((item) => ({
        categoryId: item.category.id,
        currency: 'USD',
        annualReferenceValue: item.avoidedAnnual,
        benchmark: getBenchmarkEvidence(item.category.id),
      })),
    },
    // Only present when the user opted in. Deliberately a sibling of `summary` rather than a
    // member of it, so nothing here can be mistaken for part of the cash business case, and every
    // field name carries the word "simulated".
    ...(tei?.enabled ? { experimentalSimulatedTei: teiExportPayload(tei) } : {}),
    disclaimer:
      'Estimator only, not a Microsoft quote. Full replacement of eligible covered invoices is a scenario assumption, not verified equivalence or cancellation. ' +
      'Legacy retained percentages and amount-confirmation flags are preserved as inputs but are not used by this model. ' +
      'All new assessments use USD. Cost avoidance and TEI are not cash savings.',
  };
}

export function exportJson(assessment: Assessment, result: EngineResult, tei?: TeiResult) {
  download(
    `${slug(assessment.orgName)}-e7-assessment-${stamp()}.json`,
    JSON.stringify(buildJsonExport(assessment, result, tei), null, 2),
    'application/json',
  );
}

/** Recovery copy only: no new-model projections for unsupported legacy currencies. */
export function buildInputRecoveryExport(assessment: Assessment) {
  return {
    schema: 'me7-assessment/2',
    exportedAt: new Date().toISOString(),
    recoveryOnly: true,
    note: 'Original inputs preserved in their original currency. No FX conversion or new financial projection has been applied. The current app accepts only USD assessments.',
    assessment: structuredClone(assessment),
  };
}

export function exportInputRecovery(assessment: Assessment) {
  download(
    `${slug(assessment.orgName)}-original-${slug(assessment.currency)}-inputs-${stamp()}.json`,
    JSON.stringify(buildInputRecoveryExport(assessment), null, 2),
    'application/json',
  );
}

function teiExportPayload(tei: TeiResult) {
  return {
    warning:
      'EXPERIMENTAL — NOT A FORRESTER FINDING. These figures extrapolate three published Forrester ' +
      'Total Economic Impact studies (Microsoft 365 E5, August 2023; Microsoft 365 Copilot, March 2025; ' +
      'Microsoft Entra Suite, July 2025) using app-selected normalization populations. They are not ' +
      'a Forrester finding or endorsement about this organisation or its E7 investment. Discounted at ' +
      '10% a year. Do not add these estimates to cash net impact, effective price or TCO. ' +
      'Studies are independent estimates; aggregation requires a reviewed non-overlapping selection.',
    currency: tei.referenceCurrency,
    combinedSimulationEligible: tei.canCombine,
    combinationWarnings: tei.combinationWarnings,
    horizonYears: tei.horizonYears,
    seats: tei.seats,
    copilotSeats: tei.copilotSeats,
    ...(tei.canCombine ? {
      combinedSimulation: {
        currency: 'USD',
        simulatedTeiBenefitPv: tei.teiBenefitPv,
        cashBenefitPv: tei.cashBenefitPv,
        simulatedTotalBenefitPv: tei.totalBenefitPv,
        simulatedCostPv: tei.costPv,
        simulatedNpv: tei.npv,
        simulatedRoiPct: tei.roiPct,
        simulatedPaybackMonths: tei.paybackMonths,
        simulatedPaybackStatus: tei.paybackStatus,
        years: tei.years,
        costComponents: {
          licenceUpliftAnnual: tei.upliftAnnual,
          migrationTotal: tei.migrationTotal,
          copilotEnablementTotal: tei.enablementTotal,
        },
      },
    } : {}),
    studies: tei.studies.map((s) => {
      const study = getStudy(s.studyId);
      return {
        id: s.studyId,
        title: study?.title,
        published: study?.published,
        url: study?.url,
        appliesToThisBaseline: s.applies,
        notApplicableReason: s.notApplicableReason,
        currency: 'USD',
        simulatedByYear: s.byYear,
        simulatedPresentValue: s.presentValue,
        evidence: getTeiEvidence(s.studyId),
      };
    }),
    lines: tei.scoredLines.map((l) => ({
      studyId: l.studyId,
      forresterRef: l.line.ref,
      publishedLineName: l.line.name,
      kind: l.line.kind,
      counted: l.included,
      excludedReason: l.included ? undefined : l.suppressedReason,
      publishedYear1RiskAdjusted: l.line.published[0],
      compositeSeats: l.line.divisor[0],
      simulatedPerSeatPerYear: l.perSeatYear1,
      simulatedAnnualAtYear1: l.byYear[0] ?? 0,
      simulatedPresentValue: l.presentValue,
      evidence: getTeiEvidence(l.studyId, l.lineId),
    })),
  };
}

function evidenceCells(evidence: EvidenceAssessment): string[] {
  return [
    evidence.status,
    evidence.sourceIds.join('; '),
    evidence.sourceIds.map((id) => getSource(id)?.url).filter(Boolean).join('; '),
    evidence.conditions.join(' '),
  ];
}

function csvCell(value: string | number): string {
  const raw = String(value);
  // User-supplied names are text, never spreadsheet expressions. Numeric values stay numeric.
  const s = typeof value === 'string' && /^[\s]*[=+\-@]|^[\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsvExport(assessment: Assessment, result: EngineResult, tei?: TeiResult) {
  const header = [
    'Domain',
    'Category',
    'Vendor',
    'Story',
    'Coverage suitability (not a discount)',
    'Annual spend',
    'Modeled retained %',
    'Recoverable',
    'Cost avoided',
    'Contract ends',
    'Currency',
    'Amount source',
    'Savings delay (months)',
    'Legacy confirmation (not used)',
    'Credit eligible',
    'Evidence status',
    'Source IDs',
    'Source URLs',
    'Evidence conditions',
    'Exclusion reason',
  ];

  const rows = result.scoredLines.map((l) => [
    getDomain(l.category.domain)?.name ?? l.category.domain,
    l.category.name,
    l.line.vendor,
    BUCKET_META[l.bucket].label,
    l.effectiveConfidence,
    l.annualSpend,
    l.eligible ? 0 : 100,
    l.conservativeCredit,
    0,
    l.line.contractEnd ?? '',
    assessment.currency,
    l.line.amountSource ?? 'unspecified',
    assessment.assumptions.transitionEnabled ? l.line.savingsDelayMonths ?? 0 : 0,
    l.line.assumptionConfirmed ? 'yes' : 'no',
    l.eligible ? 'yes' : 'no',
    ...evidenceCells(getCategoryEvidence(l.line.categoryId, assessment.baseline)),
    l.exclusionReason ?? '',
  ]);

  const addOnRows = result.scoredAddOns.map((a) => [
    'Microsoft add-on',
    a.name,
    'Microsoft',
    getAddOn(a.addOnId)?.absorbedByE7 ? 'E7 retirement candidate' : 'Not covered by E7',
    '',
    a.annualSpend,
    a.eligible ? 0 : 100,
    a.annualCredit,
    0,
    '',
    assessment.currency,
    a.line.amountSource ?? 'unspecified',
    assessment.assumptions.transitionEnabled ? a.line.savingsDelayMonths ?? 0 : 0,
    a.line.assumptionConfirmed ? 'yes' : 'no',
    a.eligible ? 'yes' : 'no',
    ...evidenceCells(getAddOnEvidence(a.addOnId)),
    a.exclusionReason ?? '',
  ]);

  const avoidedRows = result.avoidedCosts
    .filter((x) => x.selected)
    .map((x) => [
      getDomain(x.category.domain)?.name ?? x.category.domain,
      x.category.name,
      '(none today)',
      'Cost avoided — new capability',
      x.category.confidence,
      0,
      0,
      0,
      x.avoidedAnnual,
      '',
      'USD',
      'Reference benchmark (not cash)',
      '',
      'Explicitly selected',
      'Not cash savings',
      ...evidenceCells(getBenchmarkEvidence(x.category.id)),
      '',
    ]);

  const summary = [
    [],
    ['Summary'],
    ['Organisation', assessment.orgName],
    ['Seats', assessment.seats],
    ['Current suite', getBaseline(assessment.baseline).name],
    ['Currency', assessment.currency],
    ['Model version', MODEL_VERSION],
    ['Source version', SOURCE_VERSION],
    ['Evidence reviewed', EVIDENCE_REVIEW_DATE],
    ['Estimate status', result.cashEstimateReady ? 'USD full-replacement scenario' : 'Provisional: resolve missing or unsupported inputs'],
    ['Retirement policy', 'Full replacement of eligible invoices; legacy retained percentages and confirmation flags are not used'],
    ['Current annual run-rate', result.currentAnnualTotal],
    ['E7 annual licence cost', result.e7Annual],
    ['Future annual run-rate', result.futureAnnualTotal],
    ['Net annual impact', result.netAnnualConservative],
    ['Savings-offset equivalent per user/month (not an invoice)', result.effectiveNetPupmConservative],
    ['Timing mode', assessment.assumptions.transitionEnabled ? 'Scheduled cash flow' : 'Immediate run-rate estimate'],
    ['One-time transition cost', result.migrationTotal],
    ['Year-one net benefit', result.year1NetBenefit],
    ['Horizon (years)', result.tco.length],
    ['Cumulative net benefit', result.tcoNetBenefit],
    ['Payback status', result.paybackStatus],
    ['Payback (months)', result.paybackMonths ?? 'n/a'],
    ...result.warnings.map((warning) => ['Assessment warning', warning]),
    [],
    ['Cash flow', assessment.currency],
    ['Year', 'Current annual cost', 'Future annual cost including transition', 'Net benefit', 'Cumulative benefit'],
    ...result.tco.map((year) => [year.year, year.currentCost, year.e7Cost, year.netBenefit, year.cumulativeNetBenefit]),
    [],
    ['Cost avoided (capability gained, not cash saved — do not add to net impact)'],
    ['Reference currency', 'USD'],
    ['Annual reference value of selected capabilities', result.avoidedAnnualSelected],
    [],
    ['Estimator only. Not a Microsoft quote. Full replacement is a scenario assumption, not proof of entitlement or cancellation.'],
  ];

  return [header, ...rows, ...addOnRows, ...avoidedRows, ...summary, ...teiCsvBlock(tei)]
    .map((r) => r.map(csvCell).join(','))
    .join('\n');
}

export function exportCsv(assessment: Assessment, result: EngineResult, tei?: TeiResult) {
  download(
    `${slug(assessment.orgName)}-e7-lines-${stamp()}.csv`,
    buildCsvExport(assessment, result, tei),
    'text/csv;charset=utf-8',
  );
}

/**
 * TEI gets its own labelled block rather than being forced into the spend-shaped columns above.
 * A row that reads "Annual spend: 0, Recoverable: 0" against a study benefit would be actively
 * misleading, and the whole point of the block is that it is a different kind of number.
 *
 * Every row is prefixed EXPERIMENTAL. Rows get lifted out of spreadsheets into decks with their
 * headers left behind, so the caveat travels on the row itself.
 */
function teiCsvBlock(tei: TeiResult | undefined): (string | number)[][] {
  if (!tei?.enabled) return [];

  const P = 'EXPERIMENTAL — simulated TEI';

  return [
    [],
    ['EXPERIMENTAL — SIMULATED FORRESTER TEI — NOT A FORRESTER FINDING'],
    [
      P,
      'Independent USD estimates from historical Forrester studies using app-selected normalization. Not a Forrester finding about this organisation or its E7 investment. Do not add to cash impact, effective price or TCO.',
    ],
    [],
    [P, 'Horizon (years)', tei.horizonYears],
    [P, 'Seats', tei.seats],
    [P, 'Copilot adopting seats', tei.copilotSeats],
    [P, 'Currency', 'USD'],
    [P, 'Combined simulation eligible', tei.canCombine ? 'yes' : 'no'],
    ...tei.combinationWarnings.map((warning) => [P, 'Combination withheld', warning]),
    ...tei.studies.map((study) => [
      P, 'Independent study benefit PV (USD)', getStudy(study.studyId)?.title ?? study.studyId,
      study.presentValue, study.notApplicableReason ?? '',
    ]),
    ...(tei.canCombine ? [
      [P, 'Combined study benefit PV (USD)', tei.teiBenefitPv],
      [P, 'Cash consolidation benefit PV (USD)', tei.cashBenefitPv],
      [P, 'Combined total benefit PV (USD)', tei.totalBenefitPv],
      [P, 'Combined total cost PV (USD)', tei.costPv],
      [P, 'Simulated NPV (USD)', tei.npv ?? 'n/a'],
      [P, 'Simulated ROI %', tei.roiPct ?? 'n/a'],
      [P, 'Simulated payback status', tei.paybackStatus],
      [P, 'Simulated payback (months)', tei.paybackMonths ?? (
        tei.paybackStatus === 'no-investment' ? 'No initial investment'
          : tei.paybackStatus === 'break-even' ? 'Break-even'
            : 'Not reached within the horizon'
      )],
      [P, 'Licence uplift annual (USD)', tei.upliftAnnual],
      [P, 'Transition one-off (USD)', tei.migrationTotal],
      [P, 'Copilot enablement total (USD)', tei.enablementTotal],
    ] : []),
    [],
    [
      P,
      'Study',
      'Ref',
      'Published line',
      'Counted',
      'Published Y1 (risk-adjusted USD)',
      'Composite seats',
      'Per seat/yr USD',
      'Your Y1 value USD',
      'Present value USD',
      'Reason if excluded',
    ],
    ...tei.scoredLines.map((l) => [
      P,
      getStudy(l.studyId)?.title.replace('The Total Economic Impact™ Of ', '') ?? l.studyId,
      l.line.ref,
      l.line.name,
      l.included ? 'yes' : 'no',
      l.line.published[0],
      l.line.divisor[0],
      l.perSeatYear1,
      l.byYear[0] ?? 0,
      l.presentValue,
      l.included ? '' : (l.suppressedReason ?? 'Not applicable to your current suite'),
    ]),
  ];
}

export function printBusinessCase() {
  window.print();
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API needs a secure context; fall back to a temporary selection.
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}
