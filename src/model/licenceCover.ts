/**
 * Cheapest set of standalone licences that provides a chosen set of capabilities.
 *
 * Each capability is assigned to one licence that grants it; a licence is bought for the largest
 * user count assigned to it (less users already licensed), and a paid licence with a prerequisite
 * also raises its cheapest satisfier to the same count. Cost only rises as assignments are added, so
 * a depth-first branch and bound over assignments is exact: the partial cost bounds every completion,
 * and an option that costs nothing extra dominates the rest. Largest groups go first so the bound
 * bites early; the catalog is small, so this stays well under a millisecond in practice.
 */
export interface CoverCandidate {
  id: string;
  grants: string[];
  /** Price per user per month. */
  unitPupm: number;
  /** Users already licensed; only users beyond this are paid for. */
  ownedSeats: number;
  /** Per user per month of existing spend this licence would replace, deducted from its price. */
  creditPupm: number;
  /** One of these must also be in the set when this licence is paid for. Empty means none. */
  requiresOneOf: string[];
}

export interface CoverDemand {
  id: string;
  users: number;
}

export interface CoverLine {
  id: string;
  /** Users this licence must cover, including users already licensed. */
  quantity: number;
  /** quantity less users already licensed. */
  paidQuantity: number;
  capabilityIds: string[];
  /** Licences in the set that need this one as a prerequisite. */
  prerequisiteFor: string[];
  grossAnnual: number;
  creditAnnual: number;
  annual: number;
}

export interface CoverResult {
  lines: CoverLine[];
  annual: number;
  /** Demands no candidate grants. */
  uncovered: string[];
}

const MAX_NODES = 200_000;

const paid = (c: CoverCandidate, q: number) => Math.max(0, q - c.ownedSeats);
const effectiveUnit = (c: CoverCandidate) => Math.max(0, c.unitPupm - c.creditPupm);
const costAt = (c: CoverCandidate, q: number) => effectiveUnit(c) * 12 * paid(c, q);
const EPS = 1e-6;

export function cheapestCover(demands: CoverDemand[], candidates: CoverCandidate[]): CoverResult {
  const uncovered = demands.filter((d) => !candidates.some((c) => c.grants.includes(d.id))).map((d) => d.id);
  const optionsFor = new Map(demands.map((d) => [d.id, candidates.filter((c) => c.grants.includes(d.id))]));
  const order = demands
    .map((d, index) => ({ d, index, options: optionsFor.get(d.id)! }))
    .filter((x) => x.options.length > 0)
    .sort((a, b) => b.d.users - a.d.users || a.options.length - b.options.length || a.index - b.index);

  const q = new Map<string, number>(candidates.map((c) => [c.id, 0]));
  const assigned: string[] = new Array(order.length);
  let partial = 0;
  let nodes = 0;
  type Best = { annual: number; size: number; key: string; q: Map<string, number>; assigned: string[]; prereq: Map<string, string> };
  let best: Best | null = null;

  // Prerequisites only add cost, so they are settled at each leaf.
  const settlePrerequisites = () => {
    const leafQ = new Map(q);
    const prereq = new Map<string, string>();
    let extra = 0;
    const needy = candidates
      .filter((c) => c.requiresOneOf.length && paid(c, leafQ.get(c.id)!) > 0)
      .sort((a, b) => leafQ.get(b.id)! - leafQ.get(a.id)!);
    for (const licence of needy) {
      const need = leafQ.get(licence.id)!;
      const options = candidates.filter((c) => licence.requiresOneOf.includes(c.id));
      if (!options.length) return null;
      let pick = options[0];
      let pickCost = Infinity;
      for (const o of options) {
        const now = leafQ.get(o.id)!;
        const cost = costAt(o, Math.max(now, need)) - costAt(o, now);
        if (cost < pickCost - EPS || (Math.abs(cost - pickCost) <= EPS && now > leafQ.get(pick.id)!)) { pick = o; pickCost = cost; }
      }
      extra += pickCost;
      leafQ.set(pick.id, Math.max(leafQ.get(pick.id)!, need));
      prereq.set(licence.id, pick.id);
    }
    return { extra, leafQ, prereq };
  };

  const visit = (step: number) => {
    if (++nodes > MAX_NODES && best) return;
    if (best && partial > best.annual + EPS) return;
    if (step === order.length) {
      const settled = settlePrerequisites();
      if (!settled) return;
      const annual = partial + settled.extra;
      const used = candidates.filter((c) => settled.leafQ.get(c.id)! > 0).map((c) => c.id);
      const size = used.length;
      const key = used.join('|');
      if (!best || annual < best.annual - EPS ||
          (Math.abs(annual - best.annual) <= EPS && (size < best.size || (size === best.size && key < best.key)))) {
        best = { annual, size, key, q: settled.leafQ, assigned: [...assigned], prereq: settled.prereq };
      }
      return;
    }
    const { d, options } = order[step];
    const scored = options.map((o) => {
      const now = q.get(o.id)!;
      return { o, now, raise: costAt(o, Math.max(now, d.users)) - costAt(o, now) };
    });
    // Assigning to a licence already big enough changes nothing, so it dominates every other option.
    const free = scored.filter((s) => s.now >= d.users && s.now > 0);
    const branches = (free.length ? [free.sort((a, b) => b.now - a.now)[0]] : scored)
      .sort((a, b) => a.raise - b.raise || b.now - a.now);
    for (const { o, now, raise } of branches) {
      q.set(o.id, Math.max(now, d.users));
      partial += raise;
      assigned[step] = o.id;
      visit(step + 1);
      partial -= raise;
      q.set(o.id, now);
    }
  };
  visit(0);

  const chosen = best as Best | null;
  if (!chosen) return { lines: [], annual: 0, uncovered };
  const caps = new Map<string, string[]>();
  order.forEach(({ d }, i) => caps.set(chosen.assigned[i], [...(caps.get(chosen.assigned[i]) ?? []), d.id]));
  const prerequisiteFor = new Map<string, string[]>();
  for (const [dependent, satisfier] of chosen.prereq) {
    prerequisiteFor.set(satisfier, [...(prerequisiteFor.get(satisfier) ?? []), dependent]);
  }
  const lines: CoverLine[] = [];
  for (const c of candidates) {
    const quantity = chosen.q.get(c.id)!;
    if (quantity <= 0) continue;
    const paidQuantity = paid(c, quantity);
    const grossAnnual = c.unitPupm * paidQuantity * 12;
    const creditAnnual = Math.min(grossAnnual, c.creditPupm * paidQuantity * 12);
    const capabilityIds = demands.map((d) => d.id).filter((id) => caps.get(c.id)?.includes(id));
    lines.push({
      id: c.id, quantity, paidQuantity, capabilityIds, prerequisiteFor: prerequisiteFor.get(c.id) ?? [],
      grossAnnual, creditAnnual, annual: grossAnnual - creditAnnual,
    });
  }
  return { lines, annual: lines.reduce((acc, l) => acc + l.annual, 0), uncovered };
}