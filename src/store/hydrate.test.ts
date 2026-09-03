import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAssessment } from '@/store/useAssessment';
import { DEFAULT_TEI_SETTINGS } from '@/model/tei';
import type { Assessment } from '@/model/types';

// These tests exercise the persisted store outside a browser. zustand resolves
// `window.localStorage` when the store module first evaluates, so this has to be hoisted above the
// import — otherwise every write logs a warning that would bury a real failure in noise.
vi.hoisted(() => {
  const mem = new Map<string, string>();
  const storage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  } as Storage;
  (globalThis as { window?: unknown }).window = { localStorage: storage };
  globalThis.localStorage = storage;
});

const sample: Assessment = {
  orgName: 'Fabrikam Global',
  seats: 9100,
  currency: 'EUR',
  baseline: 'o365e3',
  assumptions: {
    ...useAssessment.getState().assumptions,
    baselineUnitPupm: 23.4,
    e7DiscountPct: 14,
  },
  lines: [{ categoryId: 'edr-xdr', vendor: 'CrowdStrike', mode: 'pupm', pupm: 8, retainPct: 0 }],
  addOns: [],
  plannedCapabilities: ['ztna'],
  tei: { ...DEFAULT_TEI_SETTINGS },
};

describe('hydrate', () => {
  beforeEach(() => {
    useAssessment.getState().reset();
  });

  it('lands the user on results, since that is the point of loading a saved file', () => {
    useAssessment.getState().hydrate(sample);
    const s = useAssessment.getState();
    expect(s.step).toBe('results');
    expect(s.started).toBe(true);
    expect(s.orgName).toBe('Fabrikam Global');
    expect(s.seats).toBe(9100);
  });

  it('keeps a negotiated price rather than resetting it to the suite list price', () => {
    useAssessment.getState().hydrate(sample);
    expect(useAssessment.getState().assumptions.baselineUnitPupm).toBe(23.4);
    expect(useAssessment.getState().assumptions.e7DiscountPct).toBe(14);
  });

  /**
   * hydrate navigates to the results step, which unmounts whatever triggered the import. A
   * confirmation owned by that component would be destroyed before anyone could read it, so the
   * message has to travel through the store instead.
   */
  it('carries an optional confirmation through to the step the user lands on', () => {
    useAssessment.getState().hydrate(sample, 'Loaded Fabrikam Global — 9,100 seats, 1 spend line.');
    expect(useAssessment.getState().flash).toContain('Fabrikam Global');
  });

  it('leaves flash null when no message is supplied', () => {
    useAssessment.getState().hydrate(sample);
    expect(useAssessment.getState().flash).toBeNull();
  });

  it('clears a previous confirmation on the next hydrate, reset and demo load', () => {
    const store = useAssessment.getState();
    store.hydrate(sample, 'first message');
    useAssessment.getState().hydrate(sample);
    expect(useAssessment.getState().flash).toBeNull();

    useAssessment.getState().hydrate(sample, 'second message');
    useAssessment.getState().reset();
    expect(useAssessment.getState().flash).toBeNull();

    useAssessment.getState().hydrate(sample, 'third message');
    useAssessment.getState().loadDemo();
    expect(useAssessment.getState().flash).toBeNull();
  });

  it('lets the confirmation be dismissed', () => {
    useAssessment.getState().hydrate(sample, 'dismiss me');
    useAssessment.getState().setFlash(null);
    expect(useAssessment.getState().flash).toBeNull();
  });

  it('drops dismissals from the previous session so imported answers are not pre-marked', () => {
    useAssessment.setState({ dismissed: ['edr-xdr', 'sso-mfa'] });
    useAssessment.getState().hydrate(sample);
    expect(useAssessment.getState().dismissed).toEqual([]);
  });

  it('refuses a corrupt baseline instead of throwing on the results render', () => {
    expect(() =>
      useAssessment.getState().hydrate({ ...sample, baseline: 'm365e9' } as unknown as Assessment),
    ).not.toThrow();
    expect(useAssessment.getState().baseline).toBe('m365e5');
  });
});

describe('planned capabilities', () => {
  // The store, not the engine, is what stops the same capability being claimed twice: dismissing
  // a category means "no vendor here", entering spend means "we pay for this". They are mutually
  // exclusive answers and the state has to reflect that at the moment the user answers.
  beforeEach(() => {
    useAssessment.getState().reset();
  });

  it('pre-selects a dismissed category that E7 unlocks', () => {
    useAssessment.setState({ baseline: 'm365e5' });
    useAssessment.getState().dismissCategory('agent-governance');
    expect(useAssessment.getState().plannedCapabilities).toContain('agent-governance');
  });

  it('does not pre-select a dismissed category E7 does not cover', () => {
    useAssessment.setState({ baseline: 'm365e5' });
    useAssessment.getState().dismissCategory('siem-soar');
    expect(useAssessment.getState().plannedCapabilities).not.toContain('siem-soar');
  });

  it('drops a planned capability as soon as spend is entered against it', () => {
    useAssessment.setState({ baseline: 'm365e5' });
    useAssessment.getState().dismissCategory('ztna');
    expect(useAssessment.getState().plannedCapabilities).toContain('ztna');

    useAssessment.getState().upsertLine({
      categoryId: 'ztna',
      vendor: 'Zscaler',
      mode: 'pupm',
      pupm: 9,
      retainPct: 0,
    });
    expect(useAssessment.getState().plannedCapabilities).not.toContain('ztna');
    expect(useAssessment.getState().dismissed).not.toContain('ztna');
  });

  it('toggles cleanly and never duplicates', () => {
    const s = useAssessment.getState();
    s.togglePlannedCapability('ztna');
    s.togglePlannedCapability('ztna');
    expect(useAssessment.getState().plannedCapabilities).not.toContain('ztna');
    s.togglePlannedCapability('ztna');
    s.togglePlannedCapability('ztna');
    s.togglePlannedCapability('ztna');
    expect(
      useAssessment.getState().plannedCapabilities.filter((p) => p === 'ztna'),
    ).toHaveLength(1);
  });

  it('rejects unknown category ids on bulk select', () => {
    useAssessment.getState().setPlannedCapabilities(['ztna', 'not-a-real-category', 'ztna']);
    expect(useAssessment.getState().plannedCapabilities).toEqual(['ztna']);
  });

  it('survives a share round-trip', () => {
    useAssessment.getState().hydrate({ ...sample, plannedCapabilities: ['ztna'] });
    expect(useAssessment.getState().plannedCapabilities).toEqual(['ztna']);
  });
});
