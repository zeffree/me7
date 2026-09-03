import type { Assessment, EngineResult, TeiResult } from '@/model/types';
import { getDomain } from '@/data/categories';
import { getBaseline } from '@/data/skus';
import { getStudy } from '@/data/teiStudies';
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

/** Full state, re-importable. */
export function exportJson(assessment: Assessment, result: EngineResult, tei?: TeiResult) {
  const payload = {
    schema: 'me7-assessment/1',
    exportedAt: new Date().toISOString(),
    assessment,
    summary: {
      currentAnnualTotal: result.currentAnnualTotal,
      e7Annual: result.e7Annual,
      uplift: result.uplift,
      netAnnualConservative: result.netAnnualConservative,
      netAnnualBest: result.netAnnualBest,
      effectiveNetPupmConservative: result.effectiveNetPupmConservative,
      effectiveNetPupmBest: result.effectiveNetPupmBest,
      paybackMonths: result.paybackMonths,
      tcoNetBenefit: result.tcoNetBenefit,
      // Reported separately, and never added to the figures above: this is capability value
      // gained at benchmark prices, not cash removed from the P&L.
      avoidedAnnualSelected: result.avoidedAnnualSelected,
    },
    // Only present when the user opted in. Deliberately a sibling of `summary` rather than a
    // member of it, so nothing here can be mistaken for part of the cash business case, and every
    // field name carries the word "simulated".
    ...(tei?.enabled ? { experimentalSimulatedTei: teiExportPayload(tei) } : {}),
    disclaimer:
      'Estimator only. Not a Microsoft quote. Prices are editable defaults based on published list prices.',
  };
  download(
    `${slug(assessment.orgName)}-e7-assessment-${stamp()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
  );
}

function teiExportPayload(tei: TeiResult) {
  return {
    warning:
      'EXPERIMENTAL — NOT A FORRESTER FINDING. These figures extrapolate three published Forrester ' +
      'Total Economic Impact studies (Microsoft 365 E5, August 2023; Microsoft 365 Copilot, March 2025; ' +
      'Microsoft Entra Suite, July 2025) onto this organisation by dividing each published risk-adjusted ' +
      'benefit by the seat population that earned it and re-scaling to this seat count. Forrester has not ' +
      'studied Microsoft 365 E7, has not studied this organisation, and has not reviewed or endorsed this ' +
      'arithmetic. Discounted at 10% a year to match the studies. Do not add these figures to the net ' +
      'annual impact, effective per-user price or TCO reported above.',
    horizonYears: tei.horizonYears,
    seats: tei.seats,
    copilotSeats: tei.copilotSeats,
    simulatedTeiBenefitPv: tei.teiBenefitPv,
    cashBenefitPv: tei.cashBenefitPv,
    simulatedTotalBenefitPv: tei.totalBenefitPv,
    simulatedCostPv: tei.costPv,
    simulatedNpv: tei.npv,
    simulatedRoiPct: tei.roiPct,
    simulatedPaybackMonths: tei.paybackMonths,
    costComponents: {
      licenceUpliftAnnual: tei.upliftAnnual,
      migrationTotal: tei.migrationTotal,
      copilotEnablementTotal: tei.enablementTotal,
    },
    studies: tei.studies.map((s) => {
      const study = getStudy(s.studyId);
      return {
        id: s.studyId,
        title: study?.title,
        published: study?.published,
        url: study?.url,
        appliesToThisBaseline: s.applies,
        notApplicableReason: s.notApplicableReason,
        simulatedPresentValue: s.presentValue,
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
    })),
  };
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(assessment: Assessment, result: EngineResult, tei?: TeiResult) {
  const header = [
    'Domain',
    'Category',
    'Vendor',
    'Story',
    'Confidence',
    'Annual spend',
    'Retained %',
    'Recoverable',
    'Cost avoided',
    'Contract ends',
  ];

  const rows = result.scoredLines.map((l) => [
    getDomain(l.category.domain)?.name ?? l.category.domain,
    l.category.name,
    l.line.vendor,
    BUCKET_META[l.bucket].label,
    l.effectiveConfidence,
    Math.round(l.annualSpend),
    l.line.retainPct,
    Math.round(l.conservativeCredit),
    0,
    l.line.contractEnd ?? '',
  ]);

  const addOnRows = result.scoredAddOns.map((a) => [
    'Microsoft add-on',
    a.name,
    'Microsoft',
    a.absorbed ? 'Absorbed by E7' : 'Not covered by E7',
    a.absorbed ? 'full' : '',
    Math.round(a.annualSpend),
    0,
    a.absorbed ? Math.round(a.annualSpend) : 0,
    0,
    '',
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
      Math.round(x.avoidedAnnual),
      '',
    ]);

  const summary = [
    [],
    ['Summary'],
    ['Organisation', assessment.orgName],
    ['Seats', assessment.seats],
    ['Current suite', getBaseline(assessment.baseline).name],
    ['Currency', assessment.currency],
    ['Current annual run-rate', Math.round(result.currentAnnualTotal)],
    ['E7 annual licence cost', Math.round(result.e7Annual)],
    ['Net annual impact', Math.round(result.netAnnualConservative)],
    ['Effective E7 per user/month', result.effectiveNetPupmConservative.toFixed(2)],
    [],
    ['Cost avoided (capability gained, not cash saved — do not add to net impact)'],
    ['Annual value of new capabilities switched on', Math.round(result.avoidedAnnualSelected)],
    [],
    ['Estimator only. Not a Microsoft quote.'],
  ];

  const csv = [header, ...rows, ...addOnRows, ...avoidedRows, ...summary, ...teiCsvBlock(tei)]
    .map((r) => r.map(csvCell).join(','))
    .join('\n');

  download(`${slug(assessment.orgName)}-e7-lines-${stamp()}.csv`, csv, 'text/csv;charset=utf-8');
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
      'Extrapolated from published Forrester TEI studies of Microsoft 365 E5 (Aug 2023), Microsoft 365 Copilot (Mar 2025) and Microsoft Entra Suite (Jul 2025), re-scaled to this seat count and discounted at 10%/yr. Forrester has not studied Microsoft 365 E7, has not studied this organisation, and has not reviewed this arithmetic. Do not add to net annual impact, effective per-user price or TCO.',
    ],
    [],
    [P, 'Horizon (years)', tei.horizonYears],
    [P, 'Seats', tei.seats],
    [P, 'Copilot adopting seats', tei.copilotSeats],
    [P, 'Simulated study benefit (PV)', Math.round(tei.teiBenefitPv)],
    [P, 'Cash consolidation benefit (PV)', Math.round(tei.cashBenefitPv)],
    [P, 'Total benefit (PV)', Math.round(tei.totalBenefitPv)],
    [P, 'Total cost (PV)', Math.round(tei.costPv)],
    [P, 'Simulated NPV', Math.round(tei.npv)],
    [P, 'Simulated ROI %', tei.roiPct === null ? 'n/a' : Math.round(tei.roiPct)],
    [P, 'Simulated payback (months)', tei.paybackMonths ?? 'none'],
    [P, 'Licence uplift (annual)', Math.round(tei.upliftAnnual)],
    [P, 'Migration (one-off)', Math.round(tei.migrationTotal)],
    [P, 'Copilot enablement (total)', Math.round(tei.enablementTotal)],
    [],
    [
      P,
      'Study',
      'Ref',
      'Published line',
      'Counted',
      'Published Y1 (risk-adjusted)',
      'Composite seats',
      'Per seat/yr',
      'Your Y1 value',
      'Present value',
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
      Number(l.perSeatYear1.toFixed(2)),
      Math.round(l.byYear[0] ?? 0),
      Math.round(l.presentValue),
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
