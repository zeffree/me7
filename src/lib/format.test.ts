import { describe, expect, it } from 'vitest';
import {
  currencySymbol,
  formatCompactCurrency,
  formatCurrency,
  formatMonths,
  formatNumber,
  formatPercent,
  formatPupm,
} from './format';

describe('format helpers', () => {
  it('renders non-finite numeric values as an em dash', () => {
    expect(formatCurrency(Number.NaN)).toBe('—');
    expect(formatCompactCurrency(Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatPupm(Number.NEGATIVE_INFINITY)).toBe('—');
    expect(formatNumber(Number.NaN)).toBe('—');
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('does not expose negative zero after rounding', () => {
    expect(formatCurrency(-0.4)).toBe('$0');
    expect(formatCompactCurrency(-0.4)).toBe('$0');
    expect(formatPupm(-0.004)).toBe('$0.00');
    expect(formatNumber(-0.4)).toBe('0');
    expect(formatPercent(-0.4)).toBe('0%');
  });

  it('falls back safely when given an invalid currency code', () => {
    expect(formatCurrency(1234, 'NOT_A_CURRENCY')).toBe('$1,234');
    expect(formatPupm(12.5, 'NOT_A_CURRENCY')).toBe('$12.50');
    expect(formatCompactCurrency(1_250_000, 'NOT_A_CURRENCY')).toBe('$1.3M');
    expect(currencySymbol('NOT_A_CURRENCY')).toBe('$');
  });

  it('supports valid currency codes that are not in the app pick-list', () => {
    expect(formatCurrency(1234, 'CHF')).toContain('CHF');
    expect(currencySymbol('CHF')).toBe('CHF');
  });

  it('formats enormous finite values without throwing', () => {
    expect(formatCurrency(1e21)).toBe('$1,000,000,000,000,000,000,000');
    expect(formatCompactCurrency(1e21)).toBe('$1.0e+21');
  });

  it('treats invalid payback months as no payback', () => {
    expect(formatMonths(null)).toBe('No payback');
    expect(formatMonths(Number.NaN)).toBe('No payback');
    expect(formatMonths(Number.POSITIVE_INFINITY)).toBe('No payback');
    expect(formatMonths(-1)).toBe('No payback');
  });

  it('rounds fractional payback months before formatting', () => {
    expect(formatMonths(11.4)).toBe('11 mo');
    expect(formatMonths(11.6)).toBe('1 yr');
    expect(formatMonths(14.4)).toBe('1 yr 2 mo');
  });
});
