import { describe, expect, it } from 'vitest';
import { getArchitectureEdge, getArchitectureNode } from './architecture';
import { ARCHITECTURE_SCENARIOS, getArchitectureScenario } from './architectureScenarios';
import type {
  ArchitectureScenario,
  ArchitectureScenarioId,
  ScenarioInputId,
  ScenarioInputs,
  ScenarioStatus,
} from './architectureTypes';

const inputIds: readonly ScenarioInputId[] = [
  'deviceCompliant', 'riskySignIn', 'automaticResponse', 'agentAuthorized', 'dataPolicyEnabled',
];
const statuses: readonly ScenarioStatus[] = [
  'ready', 'allowed', 'challenged', 'blocked', 'detected', 'contained', 'review', 'complete',
];
const allInputs: ScenarioInputs[] = Array.from({ length: 2 ** inputIds.length }, (_, mask) =>
  Object.fromEntries(inputIds.map((id, index) => [id, Boolean(mask & (1 << index))])) as ScenarioInputs,
);

function branchFor(scenario: ArchitectureScenario, inputs: ScenarioInputs) {
  return scenario.branches.find((branch) =>
    Object.entries(branch.when).every(([key, value]) => inputs[key as ScenarioInputId] === value),
  )!;
}

describe('authored architecture missions', () => {
  it('exports exactly the three agreed missions and throws for an invalid internal ID', () => {
    expect(ARCHITECTURE_SCENARIOS.map((scenario) => scenario.id)).toEqual([
      'secure-work', 'contain-threat', 'govern-agent',
    ]);
    expect(() => getArchitectureScenario('missing' as ArchitectureScenarioId))
      .toThrow('Unknown architecture scenario: missing');
  });

  it.each(ARCHITECTURE_SCENARIOS)('provides valid controls and complete ordered branches for $id', (scenario) => {
    expect(getArchitectureScenario(scenario.id)).toBe(scenario);
    expect(scenario.goal.length).toBeGreaterThan(40);
    expect(scenario.assumption.length).toBeGreaterThan(100);
    expect(scenario.controls.length).toBe(2);
    const controls = scenario.controls.map((control) => control.id);
    expect(new Set(controls).size).toBe(controls.length);
    for (const control of scenario.controls) {
      expect(inputIds).toContain(control.id);
      expect(typeof control.defaultValue).toBe('boolean');
      expect(control.label).toBeTruthy();
      expect(control.description).toBeTruthy();
      expect(control.onLabel).not.toBe(control.offLabel);
    }
    expect(scenario.branches.length).toBe(3);
    expect(scenario.branches.at(-1)?.when).toEqual({});
    expect(scenario.branches.slice(0, -1).every((branch) => Object.keys(branch.when).length > 0)).toBe(true);
    expect(new Set(scenario.branches.map((branch) => branch.id)).size).toBe(scenario.branches.length);
    for (const branch of scenario.branches) {
      for (const [id, value] of Object.entries(branch.when)) {
        expect(controls).toContain(id);
        expect(typeof value).toBe('boolean');
      }
      expect(statuses).toContain(branch.outcome);
      expect(branch.outcomeTitle).toBeTruthy();
      expect(branch.outcomeSummary.length).toBeGreaterThan(60);
      expect(branch.steps.length).toBeGreaterThanOrEqual(4);
      expect(branch.steps.length).toBeLessThanOrEqual(6);
      expect(branch.steps.at(-1)?.status).toBe(branch.outcome);
      expect(new Set(branch.steps.map((step) => step.id)).size).toBe(branch.steps.length);
      for (const step of branch.steps) {
        expect(statuses).toContain(step.status);
        expect(step.nodeIds).toContain(step.focusNodeId);
        expect(new Set(step.nodeIds).size).toBe(step.nodeIds.length);
        expect(new Set(step.edgeIds).size).toBe(step.edgeIds.length);
        expect(step.title).toBeTruthy();
        expect(step.summary).toBeTruthy();
        expect(step.detail.length).toBeGreaterThan(60);
        for (const id of step.nodeIds) expect(getArchitectureNode(id)).toBeDefined();
        for (const id of step.edgeIds) {
          const edge = getArchitectureEdge(id);
          expect(step.nodeIds, `${scenario.id}/${branch.id}/${step.id}/${edge.id}`).toContain(edge.from);
          expect(step.nodeIds, `${scenario.id}/${branch.id}/${step.id}/${edge.id}`).toContain(edge.to);
        }
      }
    }
  });

  it.each(ARCHITECTURE_SCENARIOS)('covers every input combination and reaches every $id branch', (scenario) => {
    const selected = allInputs.map((inputs) => branchFor(scenario, inputs));
    expect(selected.every(Boolean)).toBe(true);
    expect(new Set(selected.map((branch) => branch.id))).toEqual(new Set(scenario.branches.map((branch) => branch.id)));
    for (const inputs of allInputs) {
      const initial = branchFor(scenario, inputs);
      for (const irrelevantId of inputIds.filter((id) => !scenario.controls.some((control) => control.id === id))) {
        expect(branchFor(scenario, { ...inputs, [irrelevantId]: !inputs[irrelevantId] })).toBe(initial);
      }
    }
  });

  it.each([
    ['secure-work', { deviceCompliant: true, riskySignIn: false }, 'complete'],
    ['contain-threat', { riskySignIn: true, automaticResponse: true }, 'contained'],
    ['govern-agent', { agentAuthorized: true, dataPolicyEnabled: true }, 'complete'],
  ] as const)('authors the expected default controls for %s', (id, controls, outcome) => {
    const scenario = getArchitectureScenario(id);
    const declared = Object.fromEntries(scenario.controls.map((control) => [control.id, control.defaultValue]));
    expect(declared).toEqual(controls);
    expect(branchFor(scenario, { ...allInputs[0], ...declared }).outcome).toBe(outcome);
  });
});

describe('authored path safety boundaries', () => {
  it.each(allInputs)('stops disallowed work before resource access for %j', (inputs) => {
    const branch = branchFor(getArchitectureScenario('secure-work'), inputs);
    if (!inputs.deviceCompliant || inputs.riskySignIn) {
      expect(branch.outcome).toBe(!inputs.deviceCompliant ? 'blocked' : 'challenged');
      for (const id of ['m365-apps', 'sharepoint', 'work-context', 'copilot']) {
        expect(branch.steps.flatMap((step) => step.nodeIds)).not.toContain(id);
      }
      expect(branch.steps.some((step) => step.status === 'allowed' || step.status === 'complete')).toBe(false);
    } else {
      expect(branch.outcome).toBe('complete');
      expect(branch.steps.flatMap((step) => step.edgeIds)).toContain('context-copilot');
    }
  });

  it.each(allInputs)('does not turn a disabled response into a disabled detector for %j', (inputs) => {
    const branch = branchFor(getArchitectureScenario('contain-threat'), inputs);
    const responseEdges = branch.steps.flatMap((step) => step.edgeIds)
      .filter((id) => getArchitectureEdge(id).kind === 'response');
    if (!inputs.riskySignIn) {
      expect(branch.id).toBe('threat-no-signal');
      expect(branch.steps.some((step) => step.status === 'detected' || step.status === 'contained')).toBe(false);
      expect(responseEdges).toEqual([]);
    } else if (!inputs.automaticResponse) {
      expect(branch.outcome).toBe('review');
      expect(branch.steps.some((step) => step.status === 'detected')).toBe(true);
      expect(branch.steps.some((step) => step.status === 'contained')).toBe(false);
      expect(responseEdges).toEqual([]);
    } else {
      expect(branch.outcome).toBe('contained');
      expect(responseEdges).toContain('xdr-entra-response');
      expect(responseEdges).toContain('xdr-endpoint-response');
    }
  });

  it.each(allInputs)('honors agent authorization independently of data policy for %j', (inputs) => {
    const branch = branchFor(getArchitectureScenario('govern-agent'), inputs);
    const nodes = branch.steps.flatMap((step) => step.nodeIds);
    const edges = branch.steps.flatMap((step) => step.edgeIds);
    if (!inputs.agentAuthorized) {
      expect(branch.outcome).toBe('blocked');
      expect(nodes).not.toContain('sharepoint');
      expect(edges).not.toContain('agent-sharepoint');
      const deniedIndex = branch.steps.findIndex((step) => step.status === 'blocked');
      expect(deniedIndex).toBeGreaterThanOrEqual(0);
      expect(branch.steps.slice(deniedIndex).every((step) => step.status === 'blocked')).toBe(true);
    } else if (!inputs.dataPolicyEnabled) {
      expect(branch.outcome).toBe('review');
      expect(nodes).not.toContain('sharepoint');
      expect(edges).not.toContain('purview-agent');
      expect(branch.steps.some((step) => step.status === 'allowed')).toBe(true);
      expect(branch.outcomeSummary).toContain('neither permission to all data');
    } else {
      expect(branch.outcome).toBe('complete');
      expect(edges).toContain('agent-sharepoint');
      expect(edges).toContain('purview-agent');
      expect(branch.steps.at(-1)?.detail).toContain('does not automatically inherit source labels');
    }
  });

  it('never routes a required mission through separately licensed complementary services', () => {
    for (const scenario of ARCHITECTURE_SCENARIOS) {
      for (const branch of scenario.branches) {
        const external = branch.steps.flatMap((step) => step.nodeIds)
          .filter((id) => getArchitectureNode(id).bundle === 'external');
        expect(external).toEqual([]);
      }
    }
  });
});
