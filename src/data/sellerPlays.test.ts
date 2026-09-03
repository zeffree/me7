import { describe, expect, it } from 'vitest';
import {
  BATTLECARDS,
  OBJECTIONS,
  DISCOVERY_QUESTIONS,
  GAP_PROBES,
  findBattlecards,
  type DealContext,
} from './sellerPlays';
import { DOMAINS } from './categories';

const ctx = (over: Partial<DealContext> = {}): DealContext => ({
  baseline: 'm365e5',
  seats: 2500,
  netAnnual: 500_000,
  upliftAnnual: 1_200_000,
  redundantToday: 0,
  notCoveredAnnual: 0,
  capturedLines: 10,
  avoidedSelected: 0,
  ...over,
});

describe('battlecards', () => {
  it('matches the vendor names customers actually type', () => {
    expect(findBattlecards(['CrowdStrike Falcon'])[0].vendor).toBe('CrowdStrike');
    expect(findBattlecards(['Zscaler Private Access'])[0].vendor).toContain('Zscaler');
    expect(findBattlecards(['okta'])[0].vendor).toContain('Okta');
    expect(findBattlecards(['ChatGPT Enterprise'])[0].vendor).toContain('ChatGPT');
  });

  it('returns nothing for an unknown vendor rather than guessing', () => {
    expect(findBattlecards(['Some Internal Tool'])).toEqual([]);
  });

  it('de-duplicates when several lines hit the same card', () => {
    const cards = findBattlecards(['Zscaler ZPA', 'Zscaler ZIA', 'Netskope']);
    const names = cards.map((c) => c.vendor);
    expect(new Set(names).size).toBe(names.length);
  });

  it('does not match Box on unrelated words containing "box"', () => {
    // A bare /box/ would fire on Dropbox, Boxer, sandbox and half the SaaS market.
    expect(findBattlecards(['Boxever']).some((c) => c.vendor.startsWith('Box'))).toBe(false);
  });

  /**
   * The whole premise of this content is that a seller can repeat it without being corrected.
   * A card that only lists strengths is the failure mode, so the honesty fields are mandatory.
   */
  it('every card concedes where the incumbent wins and names an overclaim to avoid', () => {
    for (const c of BATTLECARDS) {
      expect(c.theyWin.length, `${c.vendor} theyWin`).toBeGreaterThan(20);
      expect(c.trap.length, `${c.vendor} trap`).toBeGreaterThan(20);
      expect(c.counter.length, `${c.vendor} counter`).toBeGreaterThan(3);
    }
  });

  it('does not pretend E7 covers SIEM or e-signature', () => {
    const splunk = BATTLECARDS.find((c) => c.vendor.startsWith('Splunk'))!;
    expect(splunk.counter.toLowerCase()).toContain('not included');
    const docusign = BATTLECARDS.find((c) => c.vendor.startsWith('DocuSign'))!;
    expect(docusign.counter.toLowerCase()).toContain('no direct');
  });
});

describe('objections', () => {
  it('always has unconditional objections available', () => {
    const always = OBJECTIONS.filter((o) => !o.when);
    expect(always.length).toBeGreaterThanOrEqual(4);
  });

  it('surfaces the net-negative objection only when the deal is net negative', () => {
    const show = OBJECTIONS.filter((o) => !o.when || o.when(ctx({ netAnnual: -100 })));
    const hide = OBJECTIONS.filter((o) => !o.when || o.when(ctx({ netAnnual: 100 })));
    expect(show.map((o) => o.id)).toContain('net-negative');
    expect(hide.map((o) => o.id)).not.toContain('net-negative');
  });

  it('surfaces the E5-specific objection only for E5 customers', () => {
    const e5 = OBJECTIONS.filter((o) => !o.when || o.when(ctx({ baseline: 'm365e5' })));
    const e3 = OBJECTIONS.filter((o) => !o.when || o.when(ctx({ baseline: 'm365e3' })));
    expect(e5.map((o) => o.id)).toContain('already-e5');
    expect(e3.map((o) => o.id)).not.toContain('already-e5');
  });

  it('warns about thin data only when few lines are captured', () => {
    const thin = OBJECTIONS.filter((o) => !o.when || o.when(ctx({ capturedLines: 2 })));
    const rich = OBJECTIONS.filter((o) => !o.when || o.when(ctx({ capturedLines: 20 })));
    expect(thin.map((o) => o.id)).toContain('thin-data');
    expect(rich.map((o) => o.id)).not.toContain('thin-data');
  });

  it('every objection concedes something before answering', () => {
    for (const o of OBJECTIONS) {
      // A short concession is fine ("Right now, yes.") — an absent one is not.
      expect(o.concede.length, o.id).toBeGreaterThan(10);
      expect(o.answer.length, o.id).toBeGreaterThan(40);
    }
  });

  it('has unique ids', () => {
    const ids = OBJECTIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('discovery', () => {
  it('covers every domain in the catalog', () => {
    for (const d of DOMAINS) {
      expect(DISCOVERY_QUESTIONS[d.id], d.id).toBeTruthy();
      expect(DISCOVERY_QUESTIONS[d.id].length, d.id).toBeGreaterThanOrEqual(3);
      expect(GAP_PROBES[d.id], d.id).toBeTruthy();
    }
  });

  it('asks open questions, not ones answerable with yes', () => {
    // A discovery question that closes is a survey question. Allow a couple of deliberate
    // confirmations, but the body should be overwhelmingly open.
    const all = DOMAINS.flatMap((d) => DISCOVERY_QUESTIONS[d.id]);
    const open = all.filter((q) => /^(what|who|where|when|how|which|why)/i.test(q));
    expect(open.length / all.length).toBeGreaterThan(0.7);
  });
});
