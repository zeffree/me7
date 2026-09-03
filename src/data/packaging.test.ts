import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './categories';
import { MS_ADD_ONS } from './msAddOns';
import { BASELINE_SKUS, E7_SKU, PACKAGING_UPDATE, getBaseline } from './skus';

/**
 * Guards the July 2026 Microsoft 365 packaging update.
 *
 * Effective 1 July 2026 Microsoft moved capability *down* into the baseline suites. That
 * shrinks the E7 delta, so these facts directly control whether the tool overstates savings.
 * An earlier revision of this catalog sold Defender for Office 365 as "unlocked by E7" to
 * E3 customers who, as of July 2026, already own Plan 1 — these tests exist so that class
 * of error cannot silently return.
 */

const byId = (id: string) => {
  const c = CATEGORIES.find((x) => x.id === id);
  if (!c) throw new Error(`Category not found: ${id}`);
  return c;
};

const joined = (id: 'o365e3' | 'm365e3' | 'm365e5', field: 'includes' | 'notIncluded') =>
  getBaseline(id)[field].join(' | ').toLowerCase();

describe('July 2026 packaging update — suite composition', () => {
  it('gives both E3 tiers Defender for Office 365 Plan 1', () => {
    for (const id of ['o365e3', 'm365e3'] as const) {
      expect(joined(id, 'includes')).toMatch(/defender for office 365 p1/);
    }
  });

  it('still withholds Defender for Office 365 P2 from the E3 tiers', () => {
    for (const id of ['o365e3', 'm365e3'] as const) {
      expect(joined(id, 'notIncluded')).toMatch(/defender for office 365 p2/);
    }
  });

  it('gives M365 E3 Intune Plan 2, Remote Help and Advanced Analytics', () => {
    const inc = joined('m365e3', 'includes');
    expect(inc).toMatch(/intune plan 2/);
    expect(inc).toMatch(/remote help/);
    expect(inc).toMatch(/advanced analytics/);
  });

  it('does not leave M365 E3 on the retired Intune Plan 1 description', () => {
    expect(joined('m365e3', 'includes')).not.toMatch(/intune plan 1/);
  });

  it('gives M365 E5 Security Copilot, EPM, Enterprise Application Management and Cloud PKI', () => {
    const inc = joined('m365e5', 'includes');
    expect(inc).toMatch(/security copilot/);
    expect(inc).toMatch(/endpoint privilege management/);
    expect(inc).toMatch(/enterprise application management/);
    expect(inc).toMatch(/cloud pki/);
  });

  it('keeps the E5-only capabilities out of M365 E3', () => {
    const notInc = joined('m365e3', 'notIncluded');
    expect(notInc).toMatch(/endpoint privilege management/);
    expect(notInc).toMatch(/cloud pki/);
    expect(notInc).toMatch(/security copilot/);
  });

  it('never lists the same capability as both included and not included', () => {
    for (const sku of BASELINE_SKUS) {
      const inc = new Set(sku.includes.map((s) => s.toLowerCase().trim()));
      const overlap = sku.notIncluded.filter((s) => inc.has(s.toLowerCase().trim()));
      expect(overlap, `${sku.id} contradicts itself`).toEqual([]);
    }
  });

  it('exposes the packaging update for the UI to disclose', () => {
    expect(PACKAGING_UPDATE.effective).toBe('1 July 2026');
    expect(PACKAGING_UPDATE.summary.length).toBeGreaterThan(80);
    expect(PACKAGING_UPDATE.impact.length).toBeGreaterThan(40);
  });
});

describe('July 2026 packaging update — catalog coverage', () => {
  it('scores email security as an upgrade, not an unlock, for E3 tiers', () => {
    const c = byId('email-security');
    // E3 now ships Plan 1, so E7 is a P1 -> P2 upgrade. Claiming "unlocked" would
    // credit the full filtering spend a customer can already displace today.
    expect(c.coverage.o365e3).toBe('upgrade');
    expect(c.coverage.m365e3).toBe('upgrade');
    expect(c.coverage.m365e5).toBe('already');
  });

  it('treats Remote Help and endpoint analytics as already owned from M365 E3', () => {
    for (const id of ['remote-support', 'dex']) {
      const c = byId(id);
      expect(c.coverage.m365e3, `${id} on M365 E3`).toBe('already');
      expect(c.coverage.m365e5, `${id} on M365 E5`).toBe('already');
      expect(c.coverage.o365e3, `${id} on O365 E3`).toBe('unlocked');
    }
  });

  it('treats Cloud PKI and Security Copilot as already owned from M365 E5 only', () => {
    for (const id of ['cert-lifecycle', 'secops-ai']) {
      const c = byId(id);
      expect(c.coverage.m365e5, `${id} on M365 E5`).toBe('already');
      expect(c.coverage.m365e3, `${id} on M365 E3`).toBe('unlocked');
    }
  });

  it('keeps endpoint privilege management already-covered for E5', () => {
    expect(byId('pam-ciem').coverage.m365e5).toBe('already');
  });

  it('explains the change wherever the July 2026 update moved the line', () => {
    for (const id of ['email-security', 'remote-support', 'dex', 'cert-lifecycle', 'secops-ai']) {
      expect(byId(id).caveat, `${id} should disclose the packaging change`).toMatch(/July 2026/);
    }
  });

  it('does not describe a capability the baseline now owns as net-new', () => {
    // Anything marked 'already' for a baseline must not be sold to that baseline as unlocked.
    const contradictions = CATEGORIES.filter(
      (c) => c.coverage.m365e3 === 'already' && c.coverage.m365e5 === 'unlocked',
    );
    expect(contradictions.map((c) => c.id)).toEqual([]);
  });
});

/**
 * Guards the corrections from the September 2026 audit against Microsoft's published
 * pricing and packaging pages. Each of these was a real defect found in the shipped data,
 * so each gets a test rather than a comment.
 */
describe('September 2026 fact audit — corrections that must not regress', () => {
  const addOn = (id: string) => {
    const a = MS_ADD_ONS.find((x) => x.id === id);
    if (!a) throw new Error(`Add-on not found: ${id}`);
    return a;
  };

  it('offers Agent 365 as a declarable add-on, so E5 buyers are not under-credited', () => {
    const a = addOn('agent-365');
    expect(a.listPricePupm).toBe(15);
    expect(a.absorbedByE7).toBe(true);
    expect(a.relevantFor).toContain('m365e5');
  });

  /**
   * July 2026 pushed Intune Plan 2, Remote Help and Advanced Analytics into M365 E3 and
   * EPM, Cloud PKI and Enterprise Application Management into M365 E5 — between them the
   * Intune Suite capability set. The data used to call this "an add-on even for E5 and E7
   * customers", which hid a live double-spend from exactly the customers who have it.
   */
  it('treats the Intune Suite as absorbed, because E5 now carries its capabilities', () => {
    expect(addOn('intune-suite').absorbedByE7).toBe(true);
  });

  it('prices Teams Phone and Windows E3 at Microsoft list, not the pre-July figures', () => {
    expect(addOn('teams-phone').listPricePupm).toBe(10);
    expect(addOn('windows-e3').listPricePupm).toBe(7.63);
  });

  /**
   * Microsoft names exactly four components in E7: Copilot, M365 E5, the Entra Suite and
   * Agent 365. Work IQ is what powers Copilot, not a fifth thing E7 buys you, and listing
   * it separately padded the delta with a capability the customer is already being sold.
   */
  it('claims only the three E5 deltas Microsoft actually names', () => {
    const names = E7_SKU.deltaOverE5.map((d) => d.name.toLowerCase());
    expect(names).toHaveLength(3);
    expect(names.some((n) => n.includes('copilot'))).toBe(true);
    expect(names.some((n) => n.includes('agent 365'))).toBe(true);
    expect(names.some((n) => n.includes('entra suite'))).toBe(true);
    expect(names.some((n) => n.includes('work iq'))).toBe(false);
  });

  it('drops "Cowork", which has no Microsoft source', () => {
    const all = JSON.stringify(BASELINE_SKUS) + JSON.stringify(E7_SKU);
    expect(all.toLowerCase()).not.toMatch(/cowork/);
  });
});

/**
 * Power Platform has no tier ladder.
 *
 * Seeded Power Apps / Power Automate use rights are identical across Office 365 E3,
 * Microsoft 365 E3, E5 and E7 — the suite you hold does not change them. Organisational RPA
 * is not licensed by any suite: attended desktop flows are free with Windows 10/11, and
 * unattended bots need Power Automate Premium plus an add-on at every tier.
 *
 * An earlier revision scored workflow-automation, lowcode AND rpa as `upgrade` at all three
 * baselines, which invented an E7 entitlement that does not exist and contradicted this
 * file's own `deltaOverE5` assertion above. These tests stop that returning.
 */
describe('Power Platform, RPA and Copilot Studio — no tier ladder', () => {
  const BASELINES = ['o365e3', 'm365e3', 'm365e5'] as const;

  it.each(['workflow-automation', 'lowcode'])(
    'scores seeded Power Platform (%s) as already-owned at every baseline',
    (id) => {
      const c = byId(id);
      for (const b of BASELINES) {
        expect(c.coverage[b]).toBe('already');
      }
    },
  );

  it('never claims E7 upgrades or unlocks a seeded Power Platform capability', () => {
    for (const id of ['workflow-automation', 'lowcode']) {
      const c = byId(id);
      for (const b of BASELINES) {
        expect(c.coverage[b]).not.toBe('upgrade');
        expect(c.coverage[b]).not.toBe('unlocked');
      }
    }
  });

  it('leaves RPA uncovered, so no UiPath spend is ever credited to E7', () => {
    const c = byId('rpa');
    for (const b of BASELINES) {
      expect(c.coverage[b]).toBe('not-covered');
    }
  });

  it('says attended RPA comes from Windows, not from the suite', () => {
    const c = byId('rpa');
    expect(`${c.whyReplaced} ${c.caveat}`.toLowerCase()).toMatch(/windows/);
  });

  it('keeps Power Platform premium out of the E7 absorption list', () => {
    const premium = MS_ADD_ONS.find((a) => a.id === 'power-platform-premium');
    expect(premium).toBeDefined();
    expect(premium!.absorbedByE7).toBe(false);
  });

  it('names no Power Platform entitlement in the E7 delta over E5', () => {
    const delta = JSON.stringify(E7_SKU.deltaOverE5).toLowerCase();
    expect(delta).not.toMatch(/power automate|power apps|power platform/);
  });

  it('still treats agent building as genuinely unlocked, since no baseline has Copilot', () => {
    const c = byId('agent-platform');
    for (const b of BASELINES) {
      expect(c.coverage[b]).toBe('unlocked');
    }
  });

  it('does not claim Copilot Studio itself is bundled into E7', () => {
    const c = byId('agent-platform');
    expect(c.e7Component.toLowerCase()).not.toMatch(/copilot studio/);
    expect(c.caveat!.toLowerCase()).toMatch(/not itself bundled|billed separately/);
  });
});

/**
 * Guards the catalog's pricing semantics.
 *
 * `benchmarkPupm` is the list price of the THIRD-PARTY products in a category — what a customer
 * pays Tableau or DocuSign today. It is deliberately not the price of the Microsoft component
 * that replaces them. A user reported Power BI Pro "showing as $15" when $15 was in fact the
 * Tableau Viewer seat price sitting on the same card, so these tests pin the corrected figures
 * and guard the class of error where a benchmark drifts onto the Microsoft price instead.
 */
describe('Category benchmarks price the alternatives, not the Microsoft component', () => {
  const byId = (id: string) => CATEGORIES.find((c) => c.id === id)!;
  const addOn = (id: string) => MS_ADD_ONS.find((a) => a.id === id)!;

  it('does not price business intelligence at the Power BI Pro seat price', () => {
    // The reported bug. $15 was the Tableau *Viewer* floor; a real enterprise mix of
    // Creator / Explorer / Viewer blends to roughly $25.
    expect(addOn('power-bi-pro').listPricePupm).toBe(14);
    expect(byId('business-intelligence').benchmarkPupm).toBe(25);
    expect(byId('business-intelligence').benchmarkPupm).not.toBe(
      addOn('power-bi-pro').listPricePupm,
    );
  });

  it('prices specialist tools at their real per-seat list price', () => {
    // Every one of these was below the cheapest published plan in its category.
    expect(byId('esignature').benchmarkPupm).toBe(30); // DocuSign Standard $30 / Business Pro $45
    expect(byId('forms-surveys').benchmarkPupm).toBe(25); // cheapest seat in category is ~$18
    expect(byId('ai-notetaker').benchmarkPupm).toBe(19); // Otter Business $19.99 annual
    expect(byId('windows-vdi').benchmarkPupm).toBe(14); // Citrix DaaS $10-20
  });

  it('keeps Windows 365 on a real Cloud PC size', () => {
    // $31 matched no published tier. Sizes are $28 / $41 / $66 / $123.
    expect(addOn('windows-365').listPricePupm).toBe(41);
    expect(addOn('windows-365').note).toContain('$41');
    expect(addOn('windows-365').note).not.toContain('$31');
  });

  it('leaves categories that are not sold per user at zero', () => {
    // SIEM is priced on ingest, contact centre per agent, RPA per robot. A per-user number
    // here would be invented, and inventing one is how the tool loses a CFO.
    for (const id of ['siem-soar', 'contact-center', 'rpa']) {
      expect(byId(id).benchmarkPupm).toBe(0);
    }
  });

  it('keeps every adoption rate a real share of the workforce', () => {
    for (const c of CATEGORIES) {
      if (c.typicalAdoptionPct === undefined) continue;
      expect(c.typicalAdoptionPct).toBeGreaterThan(0);
      expect(c.typicalAdoptionPct).toBeLessThanOrEqual(1);
    }
  });

  it('only discounts adoption for categories that are genuinely bought for a subset', () => {
    // Endpoint protection, email security and SSO are bought for everyone. If one of these
    // ever picks up an adoption rate, avoidance silently under-reports.
    for (const id of ['edr-xdr', 'email-security', 'sso-mfa', 'uem', 'dlp']) {
      expect(byId(id).typicalAdoptionPct).toBeUndefined();
    }
    // ...while these are unambiguously specialist, and are priced per licensed seat.
    for (const id of ['esignature', 'forms-surveys', 'project-management', 'business-intelligence']) {
      expect(byId(id).typicalAdoptionPct).toBeLessThan(1);
    }
    // These are priced per privileged user, per GB and per host, so the benchmark is already
    // normalized across the workforce. An adoption rate here would discount twice.
    for (const id of ['pam-ciem', 'ediscovery', 'webinars-events']) {
      expect(byId(id).typicalAdoptionPct).toBeUndefined();
    }
  });

  it('never lets a benchmark drift onto the Microsoft add-on price for the same capability', () => {
    // The conflation that caused the original report, generalised. A category benchmark that
    // exactly matches the Microsoft SKU shown on the same card is usually a copied number
    // rather than a coincidence — that is precisely how business-intelligence ended up
    // reading as "Power BI Pro costs $15". Verified coincidences are listed here with their
    // evidence, so a genuine collision stays green while any new drift fails.
    const verifiedCoincidence = new Map<string, string>([
      // Cisco Duo lists $3 / $6 / $9 and Okta Starter $6, which honestly blend to ~$7.
      // Entra ID P1 also happens to be $7. Independently sourced, not copied.
      ['sso-mfa', 'entra-id-p1'],
    ]);

    const pairs: [string, string][] = [
      ['business-intelligence', 'power-bi-pro'],
      ['genai-assistant', 'copilot'],
      ['sso-mfa', 'entra-id-p1'],
      ['edr-xdr', 'defender-endpoint-p2'],
    ];

    for (const [categoryId, addOnId] of pairs) {
      const cat = byId(categoryId);
      const ms = addOn(addOnId);
      expect(cat, categoryId).toBeDefined();
      expect(ms, addOnId).toBeDefined();
      if (verifiedCoincidence.get(categoryId) === addOnId) continue;
      expect(cat.benchmarkPupm, `${categoryId} benchmark must not equal ${addOnId} list price`)
        .not.toBe(ms.listPricePupm);
    }
  });
});
