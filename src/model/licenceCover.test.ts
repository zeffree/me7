import { describe, expect, it } from 'vitest';
import { cheapestCover, type CoverCandidate } from './licenceCover';

const lic = (id: string, grants: string[], unitPupm: number, extra: Partial<CoverCandidate> = {}): CoverCandidate => ({
  id, grants, unitPupm, ownedSeats: 0, creditPupm: 0, requiresOneOf: [], ...extra,
});
const d = (id: string, users = 100) => ({ id, users });

describe('cheapestCover', () => {
  it('returns nothing for no demands', () => {
    expect(cheapestCover([], [lic('a', ['x'], 5)])).toEqual({ lines: [], annual: 0, uncovered: [] });
  });

  it('picks the individual licence when it is cheaper than a suite', () => {
    const r = cheapestCover([d('x')], [lic('suite', ['x', 'y'], 10), lic('a', ['x'], 4)]);
    expect(r.lines.map((l) => l.id)).toEqual(['a']);
    expect(r.annual).toBe(4 * 100 * 12);
  });

  it('picks a suite when it beats stacking products', () => {
    const r = cheapestCover([d('x'), d('y')], [lic('a', ['x'], 6), lic('b', ['y'], 6), lic('suite', ['x', 'y'], 10)]);
    expect(r.lines.map((l) => l.id)).toEqual(['suite']);
    expect(r.lines[0].capabilityIds.sort()).toEqual(['x', 'y']);
  });

  it('sizes a shared licence to the largest group and a mix when groups differ', () => {
    const shared = cheapestCover([d('x', 50), d('y', 200)], [lic('suite', ['x', 'y'], 10)]);
    expect(shared.lines[0].quantity).toBe(200);
    const mixed = cheapestCover([d('x', 1000), d('y', 10)], [lic('a', ['x'], 3), lic('suite', ['x', 'y'], 10)]);
    expect(mixed.lines.map((l) => [l.id, l.quantity])).toEqual([['a', 1000], ['suite', 10]]);
  });

  it('reports demands nothing grants and still covers the rest', () => {
    const r = cheapestCover([d('x'), d('none')], [lic('a', ['x'], 1)]);
    expect(r.uncovered).toEqual(['none']);
    expect(r.lines.map((l) => l.id)).toEqual(['a']);
  });

  it('only pays for users beyond those already licensed', () => {
    const r = cheapestCover([d('x', 100)], [lic('a', ['x'], 5, { ownedSeats: 40 })]);
    expect(r.lines[0]).toMatchObject({ quantity: 100, paidQuantity: 60 });
    expect(r.annual).toBe(5 * 60 * 12);
    const owned = cheapestCover([d('x', 100)], [lic('a', ['x'], 5, { ownedSeats: 100 }), lic('b', ['x'], 1)]);
    expect(owned.annual).toBe(0);
    expect(owned.lines.map((l) => l.id)).toEqual(['a']);
  });

  it('deducts credit for spend a licence replaces', () => {
    const r = cheapestCover([d('x')], [lic('step', ['x'], 20, { creditPupm: 18 }), lic('a', ['x'], 5)]);
    expect(r.lines[0]).toMatchObject({ id: 'step', creditAnnual: 18 * 100 * 12 });
    expect(r.annual).toBe(2 * 100 * 12);
  });

  it('adds the cheapest prerequisite for a paid licence', () => {
    const r = cheapestCover([d('x')], [
      lic('a', ['x'], 10, { requiresOneOf: ['p1', 'p2'] }), lic('p1', [], 7), lic('p2', [], 9),
    ]);
    expect(r.lines.map((l) => l.id).sort()).toEqual(['a', 'p1']);
    expect(r.lines.find((l) => l.id === 'p1')!).toMatchObject({ quantity: 100, prerequisiteFor: ['a'] });
    expect(r.annual).toBe(17 * 100 * 12);
  });

  it('lets a prerequisite that also grants a capability do both jobs', () => {
    const r = cheapestCover([d('x'), d('y')], [
      lic('a', ['x'], 10, { requiresOneOf: ['p'] }), lic('p', ['y'], 7), lic('b', ['y'], 1),
    ]);
    expect(r.lines.map((l) => l.id).sort()).toEqual(['a', 'p']);
    expect(r.annual).toBe(17 * 100 * 12);
  });

  it('skips a prerequisite when the dependent licence is already owned', () => {
    const r = cheapestCover([d('x')], [lic('a', ['x'], 10, { ownedSeats: 100, requiresOneOf: ['p'] }), lic('p', [], 7)]);
    expect(r.lines.map((l) => l.id)).toEqual(['a']);
    expect(r.annual).toBe(0);
  });

  it('is deterministic on ties, preferring fewer licences', () => {
    const r = cheapestCover([d('x'), d('y')], [lic('a', ['x'], 5), lic('b', ['y'], 5), lic('suite', ['x', 'y'], 10)]);
    expect(r.lines.map((l) => l.id)).toEqual(['suite']);
  });
});
