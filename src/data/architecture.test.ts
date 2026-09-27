import { describe, expect, it } from 'vitest';
import {
  ARCHITECTURE_EDGES,
  ARCHITECTURE_NODES,
  ARCHITECTURE_PILLARS,
  BUNDLE_LABELS,
  EDGE_KIND_LABELS,
  getArchitectureEdge,
  getArchitectureNode,
  getNodeCoverage,
} from './architecture';
import type { ArchitectureNode } from './architectureTypes';
import { CATEGORIES } from './categories';
import { BASELINE_SKUS, E7_SKU } from './skus';
import { EVIDENCE_REVIEW_DATE, getSource, SECURITY_COPILOT_ALLOWANCE, SOURCES } from './sources';

describe('architecture reference graph', () => {
  it('uses the seven official technology pillars, separately from spending domains', () => {
    expect(ARCHITECTURE_PILLARS.map((pillar) => pillar.id).sort()).toEqual(
      ['identity', 'endpoint', 'network', 'apps', 'data', 'infrastructure', 'secops'].sort(),
    );
    expect(ARCHITECTURE_PILLARS.every((pillar) => pillar.description.trim().length > 20)).toBe(true);
    expect(new Set(ARCHITECTURE_NODES.map((node) => node.pillar))).toEqual(
      new Set(ARCHITECTURE_PILLARS.map((pillar) => pillar.id)),
    );
  });

  it('has a bounded, uniquely addressable graph', () => {
    expect(ARCHITECTURE_NODES.length).toBeGreaterThanOrEqual(20);
    expect(ARCHITECTURE_NODES.length).toBeLessThanOrEqual(25);
    expect(new Set(ARCHITECTURE_NODES.map((node) => node.id)).size).toBe(ARCHITECTURE_NODES.length);
    expect(new Set(ARCHITECTURE_EDGES.map((edge) => edge.id)).size).toBe(ARCHITECTURE_EDGES.length);
    expect(new Set(ARCHITECTURE_EDGES.map((edge) => edge.description)).size).toBe(ARCHITECTURE_EDGES.length);
    expect(new Set(ARCHITECTURE_EDGES.map((edge) => edge.label)).size).toBe(ARCHITECTURE_EDGES.length);
  });

  it.each(ARCHITECTURE_NODES)('resolves node $id, its pillar, categories and claim sources', (node) => {
    expect(getArchitectureNode(node.id)).toBe(node);
    expect(ARCHITECTURE_PILLARS.some((pillar) => pillar.id === node.pillar)).toBe(true);
    expect(BUNDLE_LABELS[node.bundle]).toBeTruthy();
    expect(node.label.trim()).not.toBe('');
    expect(node.shortLabel.trim()).not.toBe('');
    expect(node.description.length).toBeGreaterThan(20);
    expect(node.technical.length).toBeGreaterThan(40);
    expect(node.prerequisites.length).toBeGreaterThan(0);
    expect(node.sourceIds.length).toBeGreaterThan(0);
    expect(new Set(node.categoryIds).size).toBe(node.categoryIds.length);
    for (const id of node.categoryIds) expect(CATEGORIES.some((category) => category.id === id), id).toBe(true);
    for (const id of node.sourceIds) expect(getSource(id)?.url, id).toMatch(/^https:\/\//);
    if (node.baselineCoverage) expect(node.categoryIds).toEqual([]);
    expect(ARCHITECTURE_EDGES.some((edge) => edge.from === node.id || edge.to === node.id)).toBe(true);
  });

  it.each(ARCHITECTURE_EDGES)('resolves connection $id and its source-backed relationship', (edge) => {
    expect(getArchitectureEdge(edge.id)).toBe(edge);
    expect(getArchitectureNode(edge.from)).toBeDefined();
    expect(getArchitectureNode(edge.to)).toBeDefined();
    expect(edge.from).not.toBe(edge.to);
    expect(EDGE_KIND_LABELS[edge.kind]).toBeTruthy();
    expect(edge.description.length).toBeGreaterThan(40);
    expect(edge.sourceIds.length).toBeGreaterThan(0);
    for (const id of edge.sourceIds) expect(getSource(id)?.url, id).toMatch(/^https:\/\//);
  });

  it('represents all relationship types and keeps response distinct from data access', () => {
    expect(new Set(ARCHITECTURE_EDGES.map((edge) => edge.kind))).toEqual(new Set(Object.keys(EDGE_KIND_LABELS)));
    expect(getArchitectureEdge('xdr-entra-response').kind).toBe('response');
    expect(getArchitectureEdge('context-copilot').kind).toBe('data');
    expect(getArchitectureEdge('agent365-agent').kind).toBe('governance');
    expect(getArchitectureEdge('agent-sharepoint').kind).toBe('access');
  });

  it('identifies four actual E7 components without inventing a Work IQ SKU', () => {
    expect(BUNDLE_LABELS.e5).toBe(BASELINE_SKUS.find((sku) => sku.id === 'm365e5')?.name);
    expect(Object.values(BUNDLE_LABELS)).toEqual(expect.arrayContaining(E7_SKU.deltaOverE5.map((part) => part.name)));
    expect(new Set(ARCHITECTURE_NODES.map((node) => node.bundle))).toEqual(
      new Set(['e5', 'copilot', 'entra-suite', 'agent365', 'context', 'external']),
    );
    expect(getArchitectureNode('work-context').bundle).toBe('context');
    expect(getArchitectureNode('work-context').categoryIds).toEqual([]);
    expect(getArchitectureNode('agent').bundle).toBe('context');
    expect(getArchitectureNode('security-copilot').coverageNote).toContain(SECURITY_COPILOT_ALLOWANCE.summary);
  });

  it('keeps relevant licensing and data-protection qualifications close to the nodes', () => {
    expect(getArchitectureNode('conditional-access').coverageNote).toContain('Preview');
    expect(getArchitectureNode('internet-access').coverageNote).toContain('already comes with P1/P2');
    expect(getArchitectureNode('purview').technical).toContain('does not automatically inherit');
    expect(getArchitectureNode('agent365').technical).toContain('Registration never grants');
    expect(getArchitectureNode('agent365').coverageNote).toContain('model/API consumption');
    expect(getArchitectureNode('defender-identity').technical).toContain('on-premises Active Directory');
  });

  it('adds scoped evidence without promoting unrelated registry records', () => {
    expect(new Set(SOURCES.map((source) => source.id)).size).toBe(SOURCES.length);
    const additions = SOURCES.filter((source) => source.id.startsWith('architecture-'));
    expect(additions.length).toBeGreaterThan(0);
    expect(additions.every((source) => source.reviewedAt === '2026-09-10')).toBe(true);
    expect(getSource('catalog-assumptions')?.status).toBe('unverified');
    expect(getSource('m365-product-terms')?.status).toBe('unverified');
    expect(getSource('m365-packaging-2026')?.status).toBe('conditional');
    expect(getSource('catalog-assumptions')?.reviewedAt).toBe(EVIDENCE_REVIEW_DATE);
    expect(getSource('architecture-pillars')?.section).toContain('pillars');
  });

  it('throws clear errors for invalid internal IDs', () => {
    expect(() => getArchitectureNode('missing-node')).toThrow('Unknown architecture node: missing-node');
    expect(() => getArchitectureEdge('missing-edge')).toThrow('Unknown architecture edge: missing-edge');
  });
});

describe.each(BASELINE_SKUS)('standalone coverage against $name', (baseline) => {
  it.each(ARCHITECTURE_NODES)('derives $id coverage from the shared catalog or its explicit role', (node) => {
    const result = getNodeCoverage(node, baseline.id);
    expect(result.label).toBeTruthy();
    expect(result.note).toBeTruthy();
    if (node.bundle === 'context') {
      expect(result.summary).toBe('context');
      expect(result.items).toEqual([]);
    } else if (node.bundle === 'external') {
      expect(result.summary).toBe('not-covered');
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.every((item) => item.coverage === 'not-covered')).toBe(true);
    } else {
      const expected = node.categoryIds.map((id) => {
        const category = CATEGORIES.find((item) => item.id === id)!;
        return { label: category.name, coverage: category.coverage[baseline.id] };
      });
      expect(result.items).toEqual(expected);
      const statuses = new Set(expected.map((item) => item.coverage));
      expect(result.summary).toBe(statuses.size === 1 ? expected[0].coverage : 'mixed');
      expect(result.note).toContain(baseline.shortName);
      expect(result.note).toContain(E7_SKU.shortName);
    }
  });

  it.each(['sentinel', 'defender-cloud', 'backup'])('never includes external service %s', (id) => {
    const result = getNodeCoverage(getArchitectureNode(id), baseline.id);
    expect(result.summary).toBe('not-covered');
    expect(result.note).toMatch(/not included in E7/i);
  });
});

describe('coverage edge cases', () => {
  it.each([
    ['intune', 'm365e3', ['already', 'upgrade', 'already', 'already', 'unlocked']],
    ['purview', 'o365e3', ['upgrade', 'upgrade', 'unlocked']],
    ['defender-xdr', 'o365e3', ['unlocked', 'upgrade', 'unlocked', 'unlocked']],
  ] as const)('preserves all mixed constituents for %s against %s', (id, baseline, statuses) => {
    const result = getNodeCoverage(getArchitectureNode(id), baseline);
    expect(result.summary).toBe('mixed');
    expect(result.items.map((item) => item.coverage)).toEqual(statuses);
  });

  it('reflects the existing E5 foundation and the actual E7 additions', () => {
    expect(getNodeCoverage(getArchitectureNode('intune'), 'm365e5').summary).toBe('already');
    expect(getNodeCoverage(getArchitectureNode('defender-office'), 'm365e3').summary).toBe('upgrade');
    expect(getNodeCoverage(getArchitectureNode('conditional-access'), 'm365e3').summary).toBe('upgrade');
    expect(getNodeCoverage(getArchitectureNode('copilot'), 'm365e5').summary).toBe('unlocked');
    expect(getNodeCoverage(getArchitectureNode('agent365'), 'm365e5').summary).toBe('unlocked');
    expect(getNodeCoverage(getArchitectureNode('private-access'), 'm365e5').summary).toBe('unlocked');
  });

  it('uses an explicit uncatalogued mapping only when no catalog category exists', () => {
    const fixture: ArchitectureNode = {
      ...getArchitectureNode('m365-apps'), categoryIds: [],
      baselineCoverage: { o365e3: 'already', m365e3: 'already', m365e5: 'already' },
    };
    expect(getNodeCoverage(fixture, 'o365e3').summary).toBe('already');
    const mapped: ArchitectureNode = {
      ...getArchitectureNode('copilot'),
      baselineCoverage: { o365e3: 'not-covered', m365e3: 'not-covered', m365e5: 'not-covered' },
    };
    expect(getNodeCoverage(mapped, 'm365e5').summary).toBe('unlocked');
    expect(getNodeCoverage({ ...mapped, bundle: 'external' }, 'm365e5').summary).toBe('not-covered');
    expect(getNodeCoverage({ ...mapped, bundle: 'context' }, 'm365e5').summary).toBe('context');
  });

  it('fails clearly rather than silently inventing coverage for malformed internal data', () => {
    const node = getArchitectureNode('copilot');
    expect(() => getNodeCoverage({ ...node, categoryIds: ['missing-category'] }, 'm365e5'))
      .toThrow('Unknown architecture category "missing-category" on node "copilot"');
    expect(() => getNodeCoverage({ ...node, categoryIds: [] }, 'm365e5'))
      .toThrow('Architecture node "copilot" has no coverage mapping');
  });
});
