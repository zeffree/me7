import { describe, expect, it } from 'vitest';
import { ARCHITECTURE_EDGES, ARCHITECTURE_NODES } from '@/data/architecture';
import { ARCHITECTURE_SCENARIOS, getArchitectureScenario } from '@/data/architectureScenarios';
import type { ArchitectureScenarioId, ScenarioInputs } from '@/data/architectureTypes';
import {
  architectureReducer,
  createArchitectureState,
  getActiveStep,
  getScenarioBranch,
  getScenarioInputs,
  getVisitedEdgeIds,
} from './architectureSimulation';

function inputCases(id: ArchitectureScenarioId): ScenarioInputs[] {
  const scenario = getArchitectureScenario(id);
  return Array.from({ length: 2 ** scenario.controls.length }, (_, mask) => {
    const inputs = getScenarioInputs(id);
    scenario.controls.forEach((control, index) => { inputs[control.id] = Boolean(mask & (1 << index)); });
    return inputs;
  });
}

describe('architecture mission state', () => {
  it('starts as an independent, paused E5-to-E7 comparison', () => {
    const state = createArchitectureState();
    expect(state.baseline).toBe('m365e5');
    expect(state.scenarioId).toBe('secure-work');
    expect(state.playing).toBe(false);
    expect(state.view).toBe('3d');
    expect(state.checkpoint).toBe(0);
    expect(state.followCamera).toBe(false);
    expect(getActiveStep(state)).toBe(getScenarioBranch(state).steps[0]);
  });

  it.each(ARCHITECTURE_SCENARIOS)('resolves and replays every $id input combination', scenario => {
    for (const inputs of inputCases(scenario.id)) {
      let state = { ...createArchitectureState(scenario.id), inputs };
      const branch = getScenarioBranch(state);
      expect(branch.steps.length).toBeGreaterThan(1);
      state = architectureReducer(state, { type: 'play' });
      for (let index = 1; index < branch.steps.length; index++) {
        state = architectureReducer(state, { type: 'tick' });
        expect(state.checkpoint).toBe(index);
        expect(getActiveStep(state)).toBe(branch.steps[index]);
      }
      expect(state.playing).toBe(false);
      expect(architectureReducer(state, { type: 'tick' })).toBe(state);
      expect(getVisitedEdgeIds(state)).toEqual([...new Set(branch.steps.flatMap(step => step.edgeIds))]);
      for (let index = branch.steps.length - 1; index >= 0; index--) {
        state = architectureReducer(state, { type: 'seek', checkpoint: index });
        expect(getActiveStep(state)).toBe(branch.steps[index]);
        expect(state.playing).toBe(false);
        expect(getVisitedEdgeIds(state)).toEqual([...new Set(branch.steps.slice(0, index + 1).flatMap(step => step.edgeIds))]);
      }
    }
  });

  it('restarts completed playback without keeping a stale result', () => {
    const original = createArchitectureState();
    const finished = architectureReducer(original, { type: 'seek', checkpoint: 1000 });
    const replay = architectureReducer(finished, { type: 'play' });
    expect(replay.checkpoint).toBe(0);
    expect(replay.playing).toBe(true);
    expect(replay.camera).toBe('follow');
  });

  it('pauses a changed what-if at a valid checkpoint without mutating the previous state', () => {
    const original = createArchitectureState();
    const playing = architectureReducer(original, { type: 'play' });
    const changed = architectureReducer(playing, { type: 'input', id: 'deviceCompliant', value: false });
    expect(changed.playing).toBe(false);
    expect(changed.checkpoint).toBe(0);
    expect(changed.inputs.deviceCompliant).toBe(false);
    expect(original.inputs.deviceCompliant).toBe(true);
    expect(playing.inputs.deviceCompliant).toBe(true);
    expect(getScenarioBranch(changed).outcome).toBe('blocked');
    expect(changed.message).toContain('first checkpoint');
  });

  it('keeps comparison labels separate from mission conditions and outcomes', () => {
    const state = architectureReducer(createArchitectureState(), { type: 'input', id: 'deviceCompliant', value: false });
    const branch = getScenarioBranch(state);
    for (const baseline of ['o365e3', 'm365e3', 'm365e5'] as const) {
      const compared = architectureReducer(state, { type: 'baseline', baseline });
      expect(compared.inputs).toBe(state.inputs);
      expect(getScenarioBranch(compared)).toBe(branch);
      expect(compared.checkpoint).toBe(state.checkpoint);
    }
  });

  it('preserves the active mission when switching rendering modes', () => {
    const selected = architectureReducer(
      architectureReducer(createArchitectureState(), { type: 'seek', checkpoint: 1 }),
      { type: 'select', selection: { kind: 'node', id: ARCHITECTURE_NODES[0].id } },
    );
    const flat = architectureReducer(selected, { type: 'view', view: '2d' });
    const spatial = architectureReducer(flat, { type: 'view', view: '3d' });
    expect(spatial.checkpoint).toBe(selected.checkpoint);
    expect(spatial.inputs).toBe(selected.inputs);
    expect(spatial.selection).toEqual(selected.selection);
    expect(getActiveStep(spatial)).toBe(getActiveStep(selected));
  });

  it('distinguishes replay from resetting the example conditions', () => {
    let state = architectureReducer(createArchitectureState(), { type: 'input', id: 'deviceCompliant', value: false });
    state = architectureReducer(state, { type: 'baseline', baseline: 'm365e3' });
    state = architectureReducer(state, { type: 'view', view: '2d' });
    expect(architectureReducer(state, { type: 'restart' }).inputs.deviceCompliant).toBe(false);
    const reset = architectureReducer(state, { type: 'reset' });
    expect(reset.inputs.deviceCompliant).toBe(true);
    expect(reset.baseline).toBe('m365e3');
    expect(reset.view).toBe('2d');
  });

  it('restores new-mission defaults without changing the comparison or rendering choice', () => {
    let state = architectureReducer(createArchitectureState(), { type: 'view', view: '2d' });
    state = architectureReducer(state, { type: 'baseline', baseline: 'o365e3' });
    state = architectureReducer(state, { type: 'scenario', id: 'contain-threat' });
    expect(state.inputs).toEqual(getScenarioInputs('contain-threat'));
    expect(state.baseline).toBe('o365e3');
    expect(state.view).toBe('2d');
    expect(state.playing).toBe(false);
    expect(state.selection).toBeNull();
  });

  it('allows manual camera movement without interrupting the mission', () => {
    const playing = architectureReducer(createArchitectureState(), { type: 'play' });
    const orbiting = architectureReducer(playing, { type: 'camera-interacted' });
    expect(orbiting.followCamera).toBe(false);
    expect(orbiting.playing).toBe(true);
    expect(architectureReducer(orbiting, { type: 'camera-interacted' })).toBe(orbiting);
    const following = architectureReducer(orbiting, { type: 'camera', camera: 'follow' });
    expect(following.followCamera).toBe(true);
    expect(following.cameraRevision).toBeGreaterThan(orbiting.cameraRevision);
  });

  it('pauses for exploration and validates product and connection selection', () => {
    const playing = architectureReducer(createArchitectureState(), { type: 'play' });
    const exploring = architectureReducer(playing, { type: 'mode', mode: 'explore' });
    expect(exploring.playing).toBe(false);
    expect(exploring.followCamera).toBe(false);
    expect(architectureReducer(playing, { type: 'select', selection: { kind: 'edge', id: ARCHITECTURE_EDGES[0].id } }).playing).toBe(false);
    expect(() => architectureReducer(playing, { type: 'select', selection: { kind: 'node', id: 'missing-node' } })).toThrow();
    expect(() => architectureReducer(playing, { type: 'select', selection: { kind: 'edge', id: 'missing-edge' } })).toThrow();
  });

  it('clamps normal seek boundaries but rejects non-finite checkpoints', () => {
    const state = createArchitectureState();
    expect(architectureReducer(state, { type: 'seek', checkpoint: -10 }).checkpoint).toBe(0);
    expect(architectureReducer(state, { type: 'seek', checkpoint: 1.7 }).checkpoint).toBe(1);
    expect(architectureReducer(state, { type: 'seek', checkpoint: 1000 }).checkpoint).toBe(getScenarioBranch(state).steps.length - 1);
    expect(() => architectureReducer(state, { type: 'seek', checkpoint: NaN })).toThrow('finite');
    expect(() => architectureReducer(state, { type: 'input', id: 'agentAuthorized', value: false })).toThrow('not part of this mission');
  });
});
