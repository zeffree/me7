/** Formatting helpers. Money is the product here, so it gets careful treatment. */

function currencyOrDefault(currency: string): string {
  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(0);
    return currency;
  } catch {
    return 'USD';
  }
}

function digitsOrDefault(digits: number): number {
  return Math.min(20, Math.max(0, Math.round(Number.isFinite(digits) ? digits : 0)));
}

function normaliseRoundedZero(value: number, maximumFractionDigits: number): number {
  const digits = digitsOrDefault(maximumFractionDigits);
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : value;
}

export function formatCurrency(value: number, currency = 'USD', maximumFractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—';
  const digits = digitsOrDefault(maximumFractionDigits);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyOrDefault(currency),
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(normaliseRoundedZero(value, digits));
}

/** Compact form for chart axes and dense cards: $1.2M, $840K. */
export function formatCompactCurrency(value: number, currency = 'USD'): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = normaliseRoundedZero(value, 0);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? '-' : '';
  const symbol = currencySymbol(currency);
  if (abs >= 1_000_000_000_000_000) return `${sign}${symbol}${abs.toExponential(1)}`;
  if (abs >= 1_000_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000_000).toFixed(1)}T`;
  if (abs >= 1_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${Math.round(abs / 1_000)}K`;
  return `${sign}${symbol}${Math.round(abs)}`;
}

export function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyOrDefault(currency),
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? '$';
  } catch {
    return '$';
  }
}

/** Per-user-per-month figures need cents; whole dollars would hide a $0.50 difference. */
export function formatPupm(value: number, currency = 'USD'): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyOrDefault(currency),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normaliseRoundedZero(value, 2));
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  return new Intl.NumberFormat('en-US').format(Object.is(rounded, -0) ? 0 : rounded);
}

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  const safeDigits = digitsOrDefault(digits);
  return `${normaliseRoundedZero(value, safeDigits).toFixed(safeDigits)}%`;
}

export function formatMonths(months: number | null): string {
  if (months === null || !Number.isFinite(months) || months <= 0) return 'No payback';
  const roundedMonths = Math.round(months);
  if (roundedMonths < 12) return `${roundedMonths} mo`;
  const years = Math.floor(roundedMonths / 12);
  const rem = roundedMonths % 12;
  return rem === 0 ? `${years} yr` : `${years} yr ${rem} mo`;
}

export const CURRENCIES = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'SGD', label: 'Singapore Dollar' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'JPY', label: 'Japanese Yen' },
] as const;

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
