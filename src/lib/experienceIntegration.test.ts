import { describe, expect, it } from 'vitest';
import { createMissionInput } from '@/data/experience/fixtures';
import { LAB_SUITES, MISSION_IDS, type MissionId, type MissionInput } from '@/data/experience/types';
import { toAssessment, useAssessment } from '@/store/useAssessment';
import { computeAssessment } from '@/model/engine';
import { createExperienceState, experienceReducer, getCurrentSnapshot, countDiscoveries } from './experienceEngine';
import { evaluateExperience } from './experienceEvaluation';

function makeChoice(id: MissionId): MissionInput {
  const input = createMissionInput(id);
  switch (input.kind) {
    case 'brief': return { ...input, sources: ['project', 'thread'] };
    case 'device': return { ...input, patched: true };
    case 'access': return { ...input, verify: 'mfa' };
    case 'incident': return { ...input, clues: ['email', 'endpoint', 'identity'] };
    case 'sharing': return { ...input, classification: 'confidential' };
    case 'agent': return { ...input, owner: 'maya', permissions: 'project' };
    case 'insights': return { ...input, metric: 'returns', region: 'south' };
    case 'calling': return { ...input, destination: 'colleague' };
  }
}

describe('eight missions share a safe, consistent integration contract', () => {
  it('completes both suite explanations and discoveries without changing financial inputs or results', () => {
    const before = toAssessment(useAssessment.getState());
    const financial = computeAssessment(before);
    let state = createExperienceState();
    for (const id of MISSION_IDS) {
      state = experienceReducer(state, { type: 'enter', id });
      for (const suite of LAB_SUITES) {
        state = experienceReducer(state, { type: 'suite', suite });
        state = experienceReducer(state, { type: 'edit', input: makeChoice(id) });
        state = experienceReducer(state, { type: 'attempt' });
        const outcome = evaluateExperience(getCurrentSnapshot(state).input, suite, state.missions[id].variant);
        expect(outcome.title).toBeTruthy();
        expect(outcome.summary).toBeTruthy();
        expect(outcome.nextAction).toBeTruthy();
        expect(outcome.explanation.length).toBeGreaterThan(0);
      }
      state = experienceReducer(state, { type: 'compare' });
      state = experienceReducer(state, { type: 'discover' });
    }
    expect(countDiscoveries(state)).toBe(8);
    state = experienceReducer(state, { type: 'reset' });
    expect(countDiscoveries(state)).toBe(0);
    expect(toAssessment(useAssessment.getState())).toEqual(before);
    expect(computeAssessment(toAssessment(useAssessment.getState()))).toEqual(financial);
  });

  it.each(MISSION_IDS)('%s evaluates deterministically for both shared sample cases and suites', id => {
    const input = makeChoice(id);
    for (const suite of LAB_SUITES) {
      for (const variant of ['everyday', 'curveball'] as const) {
        const serialized = JSON.stringify(input);
        expect(evaluateExperience(input, suite, variant)).toEqual(evaluateExperience(input, suite, variant));
        expect(JSON.stringify(input)).toBe(serialized);
      }
    }
  });
});
