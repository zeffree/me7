export type Tone = 'gain' | 'loss' | 'even';

/** Positive means the move costs less. Matches the ledger's strict sign semantics. */
export const toneOf = (value: number): Tone => value > 0 ? 'gain' : value < 0 ? 'loss' : 'even';

export const TONE_WORD: Record<Tone, { less: string; label: string }> = {
  gain: { less: 'less', label: 'Lower recurring cost' },
  loss: { less: 'more', label: 'Higher recurring cost' },
  even: { less: '', label: 'No recurring cost difference' },
};
