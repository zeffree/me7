import type { Confidence, Coverage } from '@/data/categories';

export const COVERAGE_META: Record<
  Coverage,
  { label: string; tone: 'brand' | 'warning' | 'neutral' | 'danger'; blurb: string }
> = {
  already: {
    label: 'Already in your suite',
    tone: 'warning',
    blurb:
      'Your current subscription already includes this capability. If you also pay a vendor for it, you are paying twice today — before E7 even enters the picture.',
  },
  unlocked: {
    label: 'Unlocked by E7',
    tone: 'brand',
    blurb: 'Your current suite does not cover this. Moving to E7 newly includes it.',
  },
  upgrade: {
    label: 'Tier upgrade',
    tone: 'neutral',
    blurb:
      'You have a lesser version of this today and E7 raises the tier. Scored conservatively, because a tier upgrade is rarely a like-for-like replacement.',
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
    label: 'Full replacement',
    tone: 'positive',
    blurb: 'A direct like-for-like substitute. Most teams retain nothing here.',
  },
  strong: {
    label: 'Strong overlap',
    tone: 'brand',
    blurb:
      'Covers the large majority of real-world use. Expect to keep a slice for edge cases — set a retained share to reflect it.',
  },
  partial: {
    label: 'Partial overlap',
    tone: 'muted',
    blurb:
      'Meaningful overlap but not a clean swap. Keep a substantial retained share unless you have tested the gap.',
  },
};

export const BUCKET_META = {
  'already-redundant': {
    label: 'Already redundant today',
    tone: 'warning' as const,
    blurb: 'Capabilities your current suite already includes but you still buy separately.',
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
