import { getBaseline } from '@/data/skus';
import { formatCurrency } from '@/lib/format';
import type { Assessment, EngineResult } from '@/model/types';

export function buildPresenterCase(assessment: Assessment, result: EngineResult) {
  const money = (value: number) => formatCurrency(value, assessment.currency);
  const retirementCandidates = [
    ...result.scoredLines.filter(line => line.annualCredit > 0).map(line => ({
      id: `category:${line.line.categoryId}`,
      name: line.line.vendor || line.category.name,
      capability: line.category.e7Component,
      annualCredit: line.annualCredit,
      baselineOpportunity: line.bucket === 'already-redundant',
    })),
    ...result.scoredAddOns.filter(line => line.annualCredit > 0).map(line => ({
      id: `addon:${line.addOnId}`, name: line.name,
      capability: 'Included E7 entitlement', annualCredit: line.annualCredit, baselineOpportunity: false,
    })),
  ].sort((left, right) => right.annualCredit - left.annualCredit);
  const baselineOpportunity = retirementCandidates.filter(line => line.baselineOpportunity).reduce((sum, line) => sum + line.annualCredit, 0);
  const retainedAnnual = result.thirdPartyAnnual - result.thirdPartyCreditConservative + result.addOnAnnualRetained;
  const firstSavingsMonth = result.monthlyCashflow.find(month => month.cashSavings > 0)?.month ?? null;
  const change = result.recurringAnnualBenefit > 0 ? 'reduction' : result.recurringAnnualBenefit < 0 ? 'increase' : 'change';
  const verdict = result.recurringAnnualBenefit > 0
    ? 'The modeled retirements more than fund the move.'
    : result.recurringAnnualBenefit < 0
      ? 'The current cash case does not yet fund the move.'
      : 'The recurring cash comparison is at break-even.';
  const summary = `${assessment.orgName || 'The organization'} is evaluating ${getBaseline(assessment.baseline).name} to Microsoft 365 E7 for ${assessment.seats.toLocaleString()} seats. Current recurring cost is ${money(result.currentAnnualTotal)}; future recurring cost is ${money(result.futureAnnualTotal)}. The modeled annual ${change} is ${money(Math.abs(result.recurringAnnualBenefit))}. Year-one net cash benefit is ${money(result.year1NetBenefit)}, including ${money(result.migrationTotal)} in transition costs. Full replacement of eligible invoices is assumed; ${money(retainedAnnual)} of entered vendor and add-on cost remains. ${money(baselineOpportunity)} of third-party retirement maps to capabilities already in the current suite, not a benefit unique to E7. These are scenario inputs, not a quote or a guaranteed saving.`;
  return { retirementCandidates, baselineOpportunity, retainedAnnual, firstSavingsMonth, change, verdict, summary };
}
