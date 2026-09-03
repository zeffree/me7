import { describe, expect, it } from 'vitest';

import { CATEGORIES, DOMAINS } from './categories';

/**
 * Structural guards for the category catalog.
 *
 * These exist because several defects in this project were data problems, not
 * logic problems: a stale product name, a coverage value that overstated
 * savings, a count hardcoded in prose. Types alone do not catch any of those.
 */
describe('catalog integrity', () => {
  it('has no duplicate category ids', () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('assigns every category to a declared domain', () => {
    const domainIds = new Set(DOMAINS.map((d) => d.id));
    const orphans = CATEGORIES.filter((c) => !domainIds.has(c.domain)).map((c) => c.id);
    expect(orphans).toEqual([]);
  });

  it('gives every category at least three example products', () => {
    const thin = CATEGORIES.filter((c) => c.examples.length < 3).map((c) => c.id);
    expect(thin).toEqual([]);
  });

  it('gives every covered category a non-zero benchmark price', () => {
    const bad = CATEGORIES.filter(
      (c) => c.coverage.m365e5 !== 'not-covered' && !(c.benchmarkPupm > 0),
    ).map((c) => c.id);
    expect(bad).toEqual([]);
  });

  it('marks a category not-covered across every baseline or none of them', () => {
    const inconsistent = CATEGORIES.filter((c) => {
      const values = Object.values(c.coverage);
      const notCovered = values.filter((v) => v === 'not-covered').length;
      return notCovered !== 0 && notCovered !== values.length;
    }).map((c) => c.id);
    expect(inconsistent).toEqual([]);
  });

  it('explains every not-covered category with a caveat', () => {
    const unexplained = CATEGORIES.filter(
      (c) => c.coverage.m365e5 === 'not-covered' && !c.caveat,
    ).map((c) => c.id);
    expect(unexplained).toEqual([]);
  });
});

/**
 * Seller mode is only worth toggling if it actually changes the page. It used
 * to reach 12 of 54 categories, so on most screens the toggle was a silent
 * no-op. Every category carries a talk track now, and this keeps it that way.
 */
describe('seller mode content', () => {
  it('gives every category a talk track', () => {
    const missing = CATEGORIES.filter((c) => !c.talkTrack?.trim()).map((c) => c.id);
    expect(missing).toEqual([]);
  });

  it('writes talk tracks with enough substance to be useful in a room', () => {
    const thin = CATEGORIES.filter((c) => (c.talkTrack ?? '').length < 80).map((c) => c.id);
    expect(thin).toEqual([]);
  });

  it('does not simply restate the category explanation', () => {
    const duplicated = CATEGORIES.filter((c) => c.talkTrack === c.whatItIs).map((c) => c.id);
    expect(duplicated).toEqual([]);
  });

  it('tells the seller to volunteer the exclusion on every not-covered category', () => {
    const notCovered = CATEGORIES.filter((c) => c.coverage.m365e5 === 'not-covered');
    expect(notCovered.length).toBeGreaterThan(0);

    const silent = notCovered
      .filter((c) => !/\bnot\b|\bno\b|\bexclusion\b|\bstays\b/i.test(c.talkTrack ?? ''))
      .map((c) => c.id);
    expect(silent).toEqual([]);
  });
});
