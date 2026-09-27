import type { Confidence, Coverage } from '@/data/categories';

export const COVERAGE_META: Record<
  Coverage,
  { label: string; tone: 'brand' | 'warning' | 'neutral' | 'danger'; blurb: string }
> = {
  already: {
    label: 'Already in your suite',
    tone: 'warning',
    blurb:
      'Your current subscription includes an overlapping capability. Confirm your requirements and cancellable spend; an overlapping licence is not proof that a second vendor is unnecessary.',
  },
  unlocked: {
    label: 'Unlocked by E7',
    tone: 'brand',
    blurb: 'E7 adds an entitlement beyond your current suite. Confirm eligibility, technical suitability and any extra charges before retiring a vendor.',
  },
  upgrade: {
    label: 'Tier upgrade',
    tone: 'neutral',
    blurb:
      'E7 raises the available tier. This does not establish like-for-like replacement; confirm what you would keep. No confidence multiplier is applied.',
  },
  'not-covered': {
    label: 'Not covered by E7',
    tone: 'danger',
    blurb:
      'E7 does not include this. Capture the spend for completeness, but no saving is claimed against it.',
  },
};

export const CONFIDENCE_META: Record<
  Confidence,
  { label: string; tone: 'positive' | 'brand' | 'muted'; blurb: string }
> = {
/**
 * These describe how cleanly Microsoft's capability substitutes for the incumbent. They are
 * guidance for choosing a retained share — they no longer multiply the money themselves.
 */
  full: {
    label: 'Broad overlap',
    tone: 'positive',
    blurb: 'Broad capability overlap, not a guarantee of parity. Confirm requirements, coverage and retained spend.',
  },
  strong: {
    label: 'Strong overlap',
    tone: 'brand',
    blurb:
      'Potential overlap across common uses. Compare your actual requirements and set the retained share yourself.',
  },
  partial: {
    label: 'Partial overlap',
    tone: 'muted',
    blurb:
      'Some capabilities overlap, but the complete vendor service may not. Confirm the specific spend that could stop.',
  },
};

export const BUCKET_META = {
  'already-redundant': {
    label: 'Existing-suite overlap',
    tone: 'warning' as const,
    blurb: 'Potential consolidation using capabilities in your current suite; not a benefit that requires E7.',
  },
  'unlocked-by-e7': {
    label: 'Unlocked by E7',
    tone: 'brand' as const,
    blurb: 'Capabilities the move to E7 newly covers.',
  },
  'partial-upgrade': {
    label: 'Partial upgrades',
    tone: 'neutral' as const,
    blurb: 'Capabilities where E7 raises your tier rather than replacing the product outright.',
  },
  'not-covered': {
    label: 'Not covered by E7',
    tone: 'danger' as const,
    blurb: 'Spend that stays exactly where it is. No savings claimed.',
  },
};
