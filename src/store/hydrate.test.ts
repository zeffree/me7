import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toAssessment, useAssessment } from '@/store/useAssessment';
import { computeAssessment } from '@/model/engine';
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
  currency: 'USD',
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

  it('refuses a corrupt baseline without replacing the current assessment', () => {
    useAssessment.getState().hydrate(sample);
    expect(() =>
      useAssessment.getState().hydrate({ ...sample, baseline: 'm365e9' } as unknown as Assessment),
    ).not.toThrow();
    expect(useAssessment.getState().baseline).toBe('o365e3');
    expect(useAssessment.getState().orgName).toBe('Fabrikam Global');
    expect(useAssessment.getState().flash).toContain('not replaced');
  });

  it.each(['EUR', 'GBP', 'JPY', 'usd'])('rejects explicit %s inputs before mutating the current assessment', (currency) => {
    useAssessment.getState().hydrate(sample);
    const before = toAssessment(useAssessment.getState());
    useAssessment.getState().hydrate({ ...sample, orgName: 'Rejected import', currency });
    expect(toAssessment(useAssessment.getState())).toEqual(before);
    expect(useAssessment.getState().flash).toContain('No FX conversion');
    expect(JSON.parse(localStorage.getItem('me7-assessment')!).state.orgName).toBe(sample.orgName);
    expect(JSON.parse(localStorage.getItem('me7-assessment')!).state.currency).toBe('USD');
  });
});

describe('planned capabilities', () => {
  // The store, not the engine, is what stops the same capability being claimed twice: dismissing
  // a category means "no vendor here", entering spend means "we pay for this". They are mutually
  // exclusive answers and the state has to reflect that at the moment the user answers.
  beforeEach(() => {
    useAssessment.getState().reset();
  });

  describe('version three financial policy with version two input shape', () => {
    beforeEach(() => useAssessment.getState().reset());

    it('allows unknown-amount drafts to be entered without inventing a zero invoice', () => {
      const store = useAssessment.getState();
      store.upsertLine({ categoryId: 'edr-xdr', vendor: '', mode: 'annual', retainPct: 0, amountSource: 'customer' });
      store.upsertAddOn({ addOnId: 'copilot', mode: 'annual', amountSource: 'customer' });
      expect(useAssessment.getState().lines).toHaveLength(1);
      expect(useAssessment.getState().addOns).toHaveLength(1);
      expect(useAssessment.getState().lines[0].annual).toBeUndefined();
      expect(useAssessment.getState().addOns[0].annual).toBeUndefined();
    });

    it('preserves the worked-example flag through refresh and import without tagging normal assessments', async () => {
      expect(useAssessment.getState().isDemo).toBe(false);
      useAssessment.getState().loadDemo();
      expect(useAssessment.getState().isDemo).toBe(true);
      const savedDemo = toAssessment(useAssessment.getState());
      await useAssessment.persist.rehydrate();
      expect(useAssessment.getState().isDemo).toBe(true);
      useAssessment.getState().reset();
      expect(useAssessment.getState().isDemo).toBe(false);
      useAssessment.getState().hydrate(savedDemo);
      expect(useAssessment.getState().isDemo).toBe(true);
      useAssessment.getState().hydrate(sample);
      expect(useAssessment.getState().isDemo).toBe(false);
    });

    it('defaults missing theme to light while preserving a saved dark preference', async () => {
      localStorage.setItem('me7-assessment', JSON.stringify({ version: 2, state: sample }));
      await useAssessment.persist.rehydrate();
      expect(useAssessment.getState().theme).toBe('light');
      localStorage.setItem('me7-assessment', JSON.stringify({ version: 2, state: { ...sample, theme: 'dark' } }));
      await useAssessment.persist.rehydrate();
      expect(useAssessment.getState().theme).toBe('dark');
    });

    it('invalidates explicit add-on review when an invoice or baseline changes', () => {
      const store = useAssessment.getState();
      store.setAddOnsReviewed(true);
      store.upsertAddOn({ addOnId: 'copilot', mode: 'annual', annual: 1_200 });
      expect(useAssessment.getState().addOnsReviewed).toBe(false);
      store.setAddOnsReviewed(true);
      store.setBaseline('m365e3');
      expect(useAssessment.getState().addOnsReviewed).toBe(false);
    });

    it('preserves legacy inputs for audit without applying retention or confirmation gates', async () => {
      const store = useAssessment.getState();
      store.setAssumptions({ transitionEnabled: true, transitionCost: 6_123.45 });
      store.upsertLine({
        categoryId: 'edr-xdr', vendor: 'Customer', mode: 'annual', annual: 60_000.17,
        retainPct: 20, amountSource: 'benchmark', assumptionConfirmed: true, savingsDelayMonths: 6,
      });
      store.upsertAddOn({
        addOnId: 'copilot', mode: 'annual', annual: 7_200.23, retainPct: 10,
        amountSource: 'customer', assumptionConfirmed: true, savingsDelayMonths: 3,
      });
      const before = toAssessment(useAssessment.getState());
      expect(before.schemaVersion).toBe(2);
      await useAssessment.persist.rehydrate();
      const after = toAssessment(useAssessment.getState());
      expect(after.assumptions.transitionCost).toBe(6_123.45);
      expect(after.assumptions.transitionEnabled).toBe(true);
      expect(after.lines).toEqual(before.lines);
      expect(after.addOns).toEqual(before.addOns);
      expect(computeAssessment(after).thirdPartyCreditConservative).toBeCloseTo(60_000.17, 6);
      expect(computeAssessment(after).addOnAnnualAbsorbed).toBeCloseTo(7_200.23, 6);
      useAssessment.getState().confirmLineAssumption('edr-xdr', false);
      expect(computeAssessment(toAssessment(useAssessment.getState())).thirdPartyCreditConservative).toBeCloseTo(60_000.17, 6);
      useAssessment.getState().confirmLineAssumption('edr-xdr', true);
      expect(computeAssessment(toAssessment(useAssessment.getState())).thirdPartyCreditConservative).toBeCloseTo(60_000.17, 6);
    });

    it('refuses currency relabeling while preserving amounts and all original metadata', () => {
      const store = useAssessment.getState();
      store.setAssumptions({ baselineUnitPupm: 52.25, e7ListPupm: 97.75, pricesConfirmed: true });
      store.upsertLine({ categoryId: 'edr-xdr', vendor: 'Invoice', mode: 'annual', annual: 12_345.67, retainPct: 0, assumptionConfirmed: true });
      const before = toAssessment(useAssessment.getState());
      store.setCurrency('EUR');
      const after = useAssessment.getState();
      expect(after.assumptions.baselineUnitPupm).toBe(52.25);
      expect(after.assumptions.e7ListPupm).toBe(97.75);
      expect(after.lines[0].annual).toBe(12_345.67);
      expect(toAssessment(after)).toEqual(before);
      expect(after.flash).toContain('no FX conversion');
      expect(after.currency).toBe('USD');
      expect(computeAssessment(toAssessment(after)).cashEstimateReady).toBe(true);
    });

    it('rejects invalid editing values without changing the previous valid amount', () => {
      const store = useAssessment.getState();
      store.setAssumptions({ transitionCost: 5_000 });
      store.setAssumptions({ transitionCost: Number.NaN });
      expect(useAssessment.getState().assumptions.transitionCost).toBe(5_000);
      expect(useAssessment.getState().flash).toContain('finite number');
      const seats = useAssessment.getState().seats;
      store.setSeats(Infinity);
      expect(useAssessment.getState().seats).toBe(seats);
    });

    it('invalidates combined study review when a financial or study selection changes', () => {
      const store = useAssessment.getState();
      store.setTeiCombinedReviewed(true);
      store.setTeiAdoption(30);
      expect(useAssessment.getState().tei.combinedReviewed).toBe(false);
      store.setTeiCombinedReviewed(true);
      store.setAssumptions({ transitionEnabled: true, transitionCost: 1_000 });
      expect(useAssessment.getState().tei.combinedReviewed).toBe(false);
    });

    it('persists exact training-cost overlap review and revokes it after budget changes', async () => {
      const store = useAssessment.getState();
      store.setTeiEnablementOverlapReviewed(true);
      store.toggleTeiEnablementCost();
      expect(useAssessment.getState().tei.includeEnablementCost).toBe(false);
      expect(useAssessment.getState().tei.enablementOverlapReviewed).toBe(true);
      await useAssessment.persist.rehydrate();
      expect(useAssessment.getState().tei.enablementOverlapReviewed).toBe(true);
      store.setAssumptions({ transitionCost: 25_000 });
      expect(useAssessment.getState().tei.enablementOverlapReviewed).toBe(false);
      store.setTeiEnablementOverlapReviewed(true);
      store.toggleTeiEnablementCost();
      expect(useAssessment.getState().tei.includeEnablementCost).toBe(true);
      expect(useAssessment.getState().tei.enablementOverlapReviewed).toBe(false);
    });

    it('migrates version-one storage with explicit legacy warnings and unchanged money', async () => {
      localStorage.setItem('me7-assessment', JSON.stringify({
        version: 1,
        state: { ...sample, step: 'catalog', started: true },
      }));
      await useAssessment.persist.rehydrate();
      const s = useAssessment.getState();
      expect(s.schemaVersion).toBe(2);
      expect(s.lines[0].pupm).toBe(8);
      expect(s.lines[0].amountSource).toBe('legacy');
      expect(s.lines[0].assumptionConfirmed).toBe(false);
      expect(s.reviewWarnings?.join(' ')).toContain('Legacy invoice amounts were preserved');
      expect(s.reviewWarnings?.join(' ')).toContain('full replacement');
      expect(JSON.parse(localStorage.getItem('me7-assessment')!).version).toBe(4);
    });

    it('migrates version-three storage to capability cost avoidance without renewing TEI review', async () => {
      localStorage.setItem('me7-assessment', JSON.stringify({
        version: 3,
        state: { ...sample, started: true, plannedCapabilities: ['ztna'], tei: { ...sample.tei, combinedReviewed: true }, reviewWarnings: [] },
      }));
      await useAssessment.persist.rehydrate();
      const s = useAssessment.getState();
      expect(s.plannedCapabilities).toEqual(['ztna']);
      expect(s.costAvoidance).toEqual({ users: {}, unitPrices: {} });
      expect(s.reviewWarnings?.join(' ')).toContain('Planned-capability selections are now valued');
      expect(s.reviewWarnings?.join(' ')).not.toContain('Model 3 uses full replacement');
      expect(s.tei.combinedReviewed).toBe(true);
    });

    it.each(['EUR', 'GBP', 'eur'])('recovers legacy %s storage without dropping or relabeling its money', async (currency) => {
      localStorage.setItem('me7-assessment', JSON.stringify({
        version: 2,
        state: {
          ...sample, currency, started: true, assumptions: { ...sample.assumptions, pricesConfirmed: true },
          tei: { ...sample.tei, combinedReviewed: true },
          addOns: [{ addOnId: 'retired-unknown-addon', mode: 'annual', annual: 7_654.32 }],
        },
      }));
      await useAssessment.persist.rehydrate();
      const s = useAssessment.getState();
      expect(s.currency).toBe(currency);
      expect(s.lines[0].pupm).toBe(8);
      expect(s.assumptions.baselineUnitPupm).toBe(23.4);
      expect(s.addOns[0].annual).toBe(7_654.32);
      expect(s.reviewWarnings?.join(' ')).toContain('original currency were preserved');
      expect(s.tei.combinedReviewed).toBe(false);
      expect(computeAssessment(toAssessment(s)).cashEstimateReady).toBe(false);
      const before = toAssessment(s);
      s.setCurrency('USD');
      expect(toAssessment(useAssessment.getState())).toEqual(before);
      expect(useAssessment.getState().flash).toContain('Currency was not changed');
      const saved = JSON.parse(localStorage.getItem('me7-assessment')!);
      expect(saved.version).toBe(4);
      expect(saved.state.currency).toBe(currency);
      expect(saved.state.addOns[0].annual).toBe(7_654.32);
      await useAssessment.persist.rehydrate();
      expect(useAssessment.getState().currency).toBe(currency);
      useAssessment.getState().reset();
      expect(useAssessment.getState().currency).toBe('USD');
      expect(useAssessment.getState().lines).toEqual([]);
      expect(useAssessment.getState().addOns).toEqual([]);
    });

    it('loads fresh shared synthetic demo inputs without any monetary confirmation gates', () => {
      useAssessment.getState().loadDemo();
      const a = toAssessment(useAssessment.getState());
      expect(a.seats).toBe(1000);
      expect(a.baseline).toBe('m365e3');
      expect(a.currency).toBe('USD');
      expect(a.isDemo).toBe(true);
      expect(a.lines).toHaveLength(12);
      expect(a.addOns).toHaveLength(1);
      expect([...a.lines, ...a.addOns].every((line) =>
        line.amountSource === 'benchmark' && !line.assumptionConfirmed)).toBe(true);
      expect(a.assumptions.pricesConfirmed).not.toBe(true);
      const r = computeAssessment(a);
      expect(r.cashEstimateReady).toBe(true);
      expect(r.totalAnnualSavings).toBe(1_173_600);
      expect(r.year1NetBenefit).toBe(168_000);
      useAssessment.getState().upsertLine({ ...a.lines[0], annual: 1 });
      useAssessment.getState().loadDemo();
      expect(useAssessment.getState().lines[0].annual).toBe(360_000);
    });

    it('does not overwrite unreadable browser storage with a success-shaped default', async () => {
      localStorage.setItem('me7-assessment', '{broken saved assessment');
      await useAssessment.persist.rehydrate();
      expect(useAssessment.getState().flash).toContain('Saving is paused');
      expect(useAssessment.getState().storageStatus).toBe('paused');
      expect(useAssessment.getState().storageError).toContain('Saving is paused');
      expect(localStorage.getItem('me7-assessment')).toBe('{broken saved assessment');
      useAssessment.getState().setOrgName('Unsaved recovery work');
      expect(localStorage.getItem('me7-assessment')).toBe('{broken saved assessment');
      useAssessment.getState().hydrate(sample);
      expect(JSON.parse(localStorage.getItem('me7-assessment')!).state.orgName).toBe(sample.orgName);
      expect(useAssessment.getState().storageStatus).toBe('available');
      expect(useAssessment.getState().storageError).toBeNull();
    });

    it('reports storage write failure while retaining in-memory edits', () => {
      const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
      try {
        useAssessment.getState().setOrgName('Kept in this tab');
        expect(useAssessment.getState().orgName).toBe('Kept in this tab');
        expect(useAssessment.getState().flash).toContain('storage is unavailable or full');
        expect(useAssessment.getState().storageStatus).toBe('unavailable');
        expect(useAssessment.getState().storageError).toContain('storage is unavailable or full');
      } finally {
        write.mockRestore();
      }
      useAssessment.getState().setOrgName('Saved after recovery');
      expect(useAssessment.getState().storageStatus).toBe('available');
      expect(useAssessment.getState().storageError).toBeNull();
    });
  });

  it('does not infer planned adoption from a no-purchase answer', () => {
    useAssessment.setState({ baseline: 'm365e5' });
    useAssessment.getState().dismissCategory('agent-governance');
    expect(useAssessment.getState().plannedCapabilities).not.toContain('agent-governance');
    expect(useAssessment.getState().dismissed).toContain('agent-governance');
  });

  it('does not pre-select a dismissed category E7 does not cover', () => {
    useAssessment.setState({ baseline: 'm365e5' });
    useAssessment.getState().dismissCategory('siem-soar');
    expect(useAssessment.getState().plannedCapabilities).not.toContain('siem-soar');
  });

  it('toggles planned capabilities cleanly and ignores unknown ones', () => {
    const s = useAssessment.getState();
    s.setPlannedCapabilities([]);
    s.togglePlannedCapability('ztna');
    expect(useAssessment.getState().plannedCapabilities).toEqual(['ztna']);
    s.togglePlannedCapability('ztna');
    expect(useAssessment.getState().plannedCapabilities).toEqual([]);
    s.togglePlannedCapability('not-a-capability');
    expect(useAssessment.getState().plannedCapabilities).toEqual([]);
    s.setPlannedCapabilities(['ztna', 'ztna', 'nope', 'genai-assistant']);
    expect(useAssessment.getState().plannedCapabilities).toEqual(['ztna', 'genai-assistant']);
    s.setPlannedCapabilities([]);
  });

  it('sets and clears user and price overrides within limits', () => {
    const s = useAssessment.getState();
    s.resetCostAvoidance();
    s.setCapabilityUsers('genai-assistant', 250);
    s.setAvoidedLicencePrice('copilot', 24.5);
    s.setCapabilityUsers('genai-assistant', 1.5);
    s.setCapabilityUsers('not-a-capability', 10);
    s.setAvoidedLicencePrice('copilot', -1);
    s.setAvoidedLicencePrice('not-a-licence', 5);
    expect(useAssessment.getState().costAvoidance).toEqual({ users: { 'genai-assistant': 250 }, unitPrices: { copilot: 24.5 } });
    s.setCapabilityUsers('genai-assistant', undefined);
    s.setAvoidedLicencePrice('copilot', undefined);
    expect(useAssessment.getState().costAvoidance).toEqual({ users: {}, unitPrices: {} });
  });

  it('keeps the capability selection when restoring default users and prices', () => {
    const s = useAssessment.getState();
    s.setPlannedCapabilities(['ztna']);
    s.setCapabilityUsers('ztna', 10);
    s.resetCostAvoidance();
    expect(useAssessment.getState().plannedCapabilities).toEqual(['ztna']);
    expect(useAssessment.getState().costAvoidance).toEqual({ users: {}, unitPrices: {} });
    s.setPlannedCapabilities([]);
  });

  it('keeps entering spend separate from capability cost avoidance', () => {
    useAssessment.getState().resetCostAvoidance();
    useAssessment.getState().setPlannedCapabilities([]);
    useAssessment.getState().upsertLine({ categoryId: 'ztna', vendor: 'Zscaler', mode: 'pupm', pupm: 9, retainPct: 0 });
    expect(useAssessment.getState().plannedCapabilities).toEqual([]);
    expect(useAssessment.getState().costAvoidance).toEqual({ users: {}, unitPrices: {} });
  });

  it('survives a share round-trip and only warns about selections saved before the rework', () => {
    const costAvoidance = { users: { ztna: 10 }, unitPrices: { 'entra-suite': 9 } };
    useAssessment.getState().hydrate({ ...sample, plannedCapabilities: ['ztna'], costAvoidance });
    expect(useAssessment.getState().plannedCapabilities).toEqual(['ztna']);
    expect(useAssessment.getState().costAvoidance).toEqual(costAvoidance);
    expect(useAssessment.getState().reviewWarnings?.join(' ') ?? '').not.toContain('Planned-capability selections are now valued');
    useAssessment.getState().hydrate({ ...sample, plannedCapabilities: ['ztna'], costAvoidance: undefined });
    expect(useAssessment.getState().reviewWarnings?.join(' ')).toContain('Planned-capability selections are now valued');
  });

  it('rejects unknown identities and invalid overrides on import', () => {
    const before = useAssessment.getState().orgName;
    useAssessment.getState().hydrate({ ...sample, orgName: 'Rejected', costAvoidance: { users: { nope: 5 }, unitPrices: {} } });
    expect(useAssessment.getState().orgName).toBe(before);
    expect(useAssessment.getState().flash).toContain('unknown capability identity');
    useAssessment.getState().hydrate({ ...sample, orgName: 'Rejected', costAvoidance: { users: {}, unitPrices: { copilot: -5 } } });
    expect(useAssessment.getState().orgName).toBe(before);
  });
});
