import { describe, expect, it, vi } from 'vitest';
import { createMissionInput, INITIAL_INPUTS } from '../data/experience/fixtures';
import {
  areMissionInputsEqual, isAccessInput, isAgentInput, isBriefInput, isCallingInput,
  isDeviceInput, isIncidentInput, isInsightsInput, isMissionInput, isSharingInput,
} from '../data/experience/inputValidation';
import {
  LAB_SUITES, MISSION_IDS, type ExperienceAction, type ExperienceState,
  type InputFor, type MissionId, type MissionInput,
} from '../data/experience/types';
import {
  countDiscoveries, createExperienceState, experienceReducer, getCurrentRun,
  getCurrentSnapshot, getMissionStatus, hasMissionInteraction, MAX_HISTORY,
} from './experienceEngine';

const CHOICES = {
  brief: { kind: 'brief', sources: ['project', 'thread'], focus: 'risks', approach: 'copilot' },
  device: { kind: 'device', enrolled: true, patched: true, requireCompliance: true, support: 'remote' },
  access: { kind: 'access', resource: 'private-app', verify: 'mfa', policyEnabled: true, privateConnector: true },
  incident: { kind: 'incident', clues: ['email', 'endpoint'], response: 'isolate', onboarded: true, analystAssistant: true },
  sharing: { kind: 'sharing', target: 'external', classification: 'confidential', policyEnabled: true, remediate: 'redact' },
  agent: { kind: 'agent', owner: 'maya', permissions: 'project', task: 'payroll', policyEnabled: true },
  insights: { kind: 'insights', region: 'south', metric: 'returns', finding: 'returns', destination: 'report', colleagueLicensed: true },
  calling: { kind: 'calling', destination: 'customer', route: 'team', phoneAssigned: true, pstnConnected: true },
} satisfies { [K in MissionId]: InputFor<K> };

const GUARDS: Record<MissionId, (value: unknown) => boolean> = {
  brief: isBriefInput, device: isDeviceInput, access: isAccessInput, incident: isIncidentInput,
  sharing: isSharingInput, agent: isAgentInput, insights: isInsightsInput, calling: isCallingInput,
};

const ALLOWED_FIELDS: Record<MissionId, Record<string, readonly unknown[]>> = {
  brief: { sources: [[], ['project', 'thread', 'notes', 'private']], focus: ['decision', 'risks', 'actions'], approach: ['manual', 'copilot'] },
  device: { enrolled: [true, false], patched: [true, false], requireCompliance: [true, false], support: ['self', 'remote'] },
  access: { resource: ['work-files', 'private-app'], verify: ['password', 'mfa'], policyEnabled: [true, false], privateConnector: [true, false] },
  incident: { clues: [[], ['email', 'endpoint', 'identity', 'benign']], response: ['investigate', 'isolate', 'dismiss'], onboarded: [true, false], analystAssistant: [true, false] },
  sharing: { target: ['team', 'external', 'usb'], classification: ['public', 'confidential'], policyEnabled: [true, false], remediate: ['none', 'redact', 'approved-share'] },
  agent: { owner: ['none', 'maya', 'it'], permissions: ['project', 'all'], task: ['project', 'payroll'], policyEnabled: [true, false] },
  insights: { region: ['all', 'north', 'south'], metric: ['revenue', 'returns'], finding: ['growth', 'returns', 'no-issue'], destination: ['workbook', 'report'], colleagueLicensed: [true, false] },
  calling: { destination: ['meeting', 'colleague', 'customer'], route: ['direct', 'team'], phoneAssigned: [true, false], pstnConnected: [true, false] },
};

function apply(state: ExperienceState, ...actions: ExperienceAction[]): ExperienceState {
  return actions.reduce(experienceReducer, state);
}

function open(id: MissionId): ExperienceState {
  return experienceReducer(createExperienceState(), { type: 'enter', id });
}

function collect(state: ExperienceState): ExperienceState {
  return apply(state,
    { type: 'edit', input: structuredClone(CHOICES[state.missionId]) },
    { type: 'attempt' }, { type: 'compare' }, { type: 'discover' });
}

function freeze(value: unknown): void {
  if (typeof value !== 'object' || value === null) return;
  Object.values(value).forEach(freeze);
  Object.freeze(value);
}

describe('validated, bounded synthetic inputs', () => {
  it.each(MISSION_IDS)('%s has an explicit discriminated guard and accepts every supported field value', id => {
    expect(isMissionInput(createMissionInput(id))).toBe(true);
    expect(isMissionInput(CHOICES[id])).toBe(true);
    for (const other of MISSION_IDS) expect(GUARDS[id](createMissionInput(other))).toBe(id === other);
    for (const [field, values] of Object.entries(ALLOWED_FIELDS[id])) {
      for (const value of values) {
        const input = { ...createMissionInput(id), [field]: value };
        expect(isMissionInput(input), `${id}: ${field}`).toBe(true);
        const edited = experienceReducer(open(id), { type: 'edit', input: input as MissionInput });
        expect(getCurrentSnapshot(edited)).toEqual({ input, attempted: false });
      }
    }
  });

  it.each(MISSION_IDS)('%s rejects missing, unknown, and wrongly typed fields without changing state', id => {
    const state = open(id);
    const before = structuredClone(state);
    const input = createMissionInput(id);
    const invalid: unknown[] = [null, [], {}, 'free text', { ...input, notes: 'unapproved payload' }];
    for (const key of Object.keys(input)) {
      const missing = { ...input };
      Reflect.deleteProperty(missing, key);
      invalid.push(missing);
      for (const value of [undefined, null, 0, 1, {}, 'unsupported choice']) {
        invalid.push({ ...input, [key]: value });
      }
    }
    for (const candidate of invalid) {
      expect(isMissionInput(candidate)).toBe(false);
      expect(() => experienceReducer(state, { type: 'edit', input: candidate as MissionInput })).toThrow(TypeError);
    }
    expect(state).toEqual(before);
  });

  it.each([
    ['brief', 'sources', 'project', 'thread', 'notes', 'private'],
    ['incident', 'clues', 'email', 'endpoint', 'identity', 'benign'],
  ] as const)('%s accepts only bounded, dense, unique source selections', (id, field, first, second, third, fourth) => {
    const input = createMissionInput(id);
    expect(isMissionInput({ ...input, [field]: [fourth, third, second, first] })).toBe(true);
    const extraArray = Object.assign([first], { notes: 'unapproved payload' });
    const accessorArray = [first];
    const getter = vi.fn(() => first);
    Object.defineProperty(accessorArray, 0, { get: getter, enumerable: true });
    for (const invalid of [
      [first, first], [first, second, third, fourth, first], ['unknown'], [null],
      [[first]], first, {}, new Array(1), extraArray, accessorArray,
    ]) {
      expect(isMissionInput({ ...input, [field]: invalid })).toBe(false);
    }
    expect(getter).not.toHaveBeenCalled();
  });

  it('rejects prototypes, hidden fields, symbols, accessors, and serialization hooks', () => {
    const input = createMissionInput('brief');
    const getter = vi.fn(() => 'brief');
    const accessors = { ...input };
    Object.defineProperty(accessors, 'kind', { get: getter, enumerable: true });
    const hidden = Object.defineProperty({ ...input }, 'extra', { value: 'hidden' });
    for (const invalid of [
      Object.create(input), hidden, accessors, { ...input, [Symbol('extra')]: true },
      { ...input, toJSON: () => input }, new Date(),
    ]) expect(isMissionInput(invalid)).toBe(false);
    expect(getter).not.toHaveBeenCalled();
  });

  it('compares choices by content rather than object keys or selection ordering', () => {
    const first = CHOICES.brief;
    const second: MissionInput = { approach: first.approach, focus: first.focus, sources: ['thread', 'project'], kind: 'brief' };
    expect(areMissionInputsEqual(first, second)).toBe(true);
    expect(areMissionInputsEqual(first, CHOICES.incident)).toBe(false);
    expect(areMissionInputsEqual(first, { ...first, focus: 'actions' })).toBe(false);
  });
});

describe('deterministic starting state and selectors', () => {
  it('opens the workplace with a general path, Office E3, and exactly eight independent missions', () => {
    const state = createExperienceState();
    expect(state).toMatchObject({ version: 1, screen: 'workplace', missionId: 'brief', suite: 'o365e3', role: 'everyone', message: '' });
    expect(Object.keys(state.missions)).toEqual([...MISSION_IDS]);
    expect(countDiscoveries(state)).toBe(0);
    expect(state).toEqual(createExperienceState());
    expect(Number.isInteger(MAX_HISTORY)).toBe(true);
    expect(MAX_HISTORY).toBeGreaterThan(1);
    expect(MAX_HISTORY).toBeLessThanOrEqual(32);
  });

  it.each(MISSION_IDS)('%s starts both suites on the same case without shared mutable snapshots', id => {
    const first = createExperienceState();
    const second = createExperienceState();
    const progress = first.missions[id];
    expect(progress).toMatchObject({ variant: 'everyday', visited: false, compared: false, discovered: false });
    expect(getMissionStatus(progress)).toBe('untouched');
    expect(hasMissionInteraction(progress)).toBe(false);
    expect(progress.runs.o365e3).not.toBe(progress.runs.m365e7);
    expect(progress.runs.o365e3.history[0].input).not.toBe(progress.runs.m365e7.history[0].input);
    for (const suite of LAB_SUITES) {
      expect(progress.runs[suite]).toEqual({ cursor: 0, history: [{ input: createMissionInput(id), attempted: false }] });
      expect(progress.runs[suite].history).not.toBe(second.missions[id].runs[suite].history);
      expect(progress.runs[suite].history[0].input).not.toBe(INITIAL_INPUTS[id]);
    }
  });

  it('returns the selected snapshot, not simply the last snapshot', () => {
    const state = apply(open('brief'),
      { type: 'edit', input: CHOICES.brief }, { type: 'attempt' }, { type: 'seek', cursor: 1 });
    expect(getCurrentRun(state)).toBe(state.missions.brief.runs.o365e3);
    expect(getCurrentSnapshot(state)).toBe(getCurrentRun(state).history[1]);
    expect(getCurrentSnapshot(state).attempted).toBe(false);
    for (const cursor of [-1, 3, 0.5, NaN]) {
      const invalid = structuredClone(state);
      invalid.missions.brief.runs.o365e3.cursor = cursor;
      expect(() => getCurrentSnapshot(invalid)).toThrow(RangeError);
    }
    const invalid = structuredClone(state);
    invalid.missions.brief.runs.o365e3.history[1].input = CHOICES.device;
    expect(() => getCurrentSnapshot(invalid)).toThrow(TypeError);
  });

  it('is reproducible, supports frozen state, and never mutates caller-owned inputs', () => {
    const state = createExperienceState();
    const before = structuredClone(state);
    const actions: ExperienceAction[] = [
      { type: 'enter', id: 'brief' }, { type: 'edit', input: structuredClone(CHOICES.brief) },
      { type: 'attempt' }, { type: 'compare' }, { type: 'discover' },
      { type: 'case', variant: 'curveball' }, { type: 'suite', suite: 'm365e7' },
    ];
    freeze(state);
    freeze(actions);
    expect(apply(state, ...actions)).toEqual(apply(createExperienceState(), ...actions));
    expect(state).toEqual(before);
    const input: InputFor<'brief'> = structuredClone(CHOICES.brief);
    const edited = experienceReducer(open('brief'), { type: 'edit', input });
    input.sources.push('notes');
    expect(getCurrentSnapshot(edited).input).toEqual(CHOICES.brief);
    const attempted = experienceReducer(edited, { type: 'attempt' });
    expect(getCurrentSnapshot(attempted).input).not.toBe(getCurrentSnapshot(edited).input);
    expect(getCurrentRun(attempted).history[0].input).toEqual(createMissionInput('brief'));
  });
});

describe('suite and mission isolation', () => {
  it.each(MISSION_IDS)('%s restores independent suite choices and cursors, including an unattempted replay step', id => {
    let state = apply(open(id),
      { type: 'edit', input: CHOICES[id] }, { type: 'attempt' }, { type: 'compare' }, { type: 'seek', cursor: 1 });
    const e3 = getCurrentRun(state);
    state = experienceReducer(state, { type: 'suite', suite: 'm365e7' });
    expect(getCurrentRun(state)).toEqual({ cursor: 0, history: [{ input: createMissionInput(id), attempted: false }] });
    expect(state.missions[id].compared).toBe(false);
    state = experienceReducer(state, { type: 'attempt' });
    const e7 = getCurrentRun(state);
    state = experienceReducer(state, { type: 'suite', suite: 'o365e3' });
    expect(getCurrentRun(state)).toBe(e3);
    expect(getCurrentSnapshot(state)).toEqual({ input: CHOICES[id], attempted: false });
    state = experienceReducer(state, { type: 'suite', suite: 'm365e7' });
    expect(getCurrentRun(state)).toBe(e7);
    expect(getCurrentSnapshot(state)).toEqual({ input: createMissionInput(id), attempted: true });
  });

  it('never copies an advanced-suite setup back into an untouched Office suite', () => {
    const state = apply(open('access'),
      { type: 'suite', suite: 'm365e7' }, { type: 'edit', input: CHOICES.access },
      { type: 'attempt' }, { type: 'compare' }, { type: 'suite', suite: 'o365e3' });
    expect(getCurrentSnapshot(state)).toEqual({ input: createMissionInput('access'), attempted: false });
    expect(state.missions.access.compared).toBe(false);
    expect(state.missions.access.runs.m365e7.history).toHaveLength(3);
  });

  it('keeps every other mission unchanged when opening, editing, and replaying each mission', () => {
    let state = createExperienceState();
    for (const id of MISSION_IDS) {
      const previous = state;
      state = apply(state, { type: 'enter', id }, { type: 'edit', input: CHOICES[id] }, { type: 'attempt' });
      expect(state.screen).toBe('mission');
      expect(state.missions[id].visited).toBe(true);
      for (const other of MISSION_IDS.filter(other => other !== id)) {
        expect(state.missions[other]).toBe(previous.missions[other]);
      }
    }
    for (const id of MISSION_IDS) {
      state = experienceReducer(state, { type: 'enter', id });
      expect(getCurrentSnapshot(state)).toEqual({ input: CHOICES[id], attempted: true });
    }
  });

  it('validates and changes screens and learning paths without erasing any run', () => {
    let state = collect(open('agent'));
    const missions = state.missions;
    for (const role of ['everyone', 'business', 'it', 'security', 'leader'] as const) {
      state = experienceReducer(state, { type: 'role', role });
      expect(state.role).toBe(role);
      expect(state.missions).toBe(missions);
    }
    for (const screen of ['workplace', 'catalog', 'passport', 'mission'] as const) {
      state = experienceReducer(state, { type: 'screen', screen });
      expect(state.screen).toBe(screen);
      expect(state.missions.agent.runs).toBe(missions.agent.runs);
    }
    expect(countDiscoveries(state)).toBe(1);
  });
});

describe('replay, branching, and bounded history', () => {
  it.each([[-100, 0], [100, 2], [1.9, 1], [Number.MAX_VALUE, 2], [-0.5, 0]])(
    'bounds finite replay position %s to %s and pauses comparison', (requested, expected) => {
      const original = apply(open('brief'), { type: 'edit', input: CHOICES.brief }, { type: 'attempt' }, { type: 'compare' });
      const state = experienceReducer(original, { type: 'seek', cursor: requested });
      expect(getCurrentRun(state).cursor).toBe(expected);
      expect(getCurrentRun(state).history).toBe(getCurrentRun(original).history);
      expect(state.missions.brief.compared).toBe(false);
      expect(state.message).toMatch(/comparison is paused/i);
    },
  );

  it.each([NaN, Infinity, -Infinity])('rejects nonfinite replay position %s', cursor => {
    expect(() => experienceReducer(open('brief'), { type: 'seek', cursor })).toThrow(RangeError);
  });

  it('truncates redo on an edit, clears attempted and comparison flags, and leaves the old history intact', () => {
    const original = apply(open('brief'),
      { type: 'edit', input: CHOICES.brief }, { type: 'attempt' }, { type: 'compare' });
    const state = apply(original, { type: 'seek', cursor: 1 }, { type: 'edit', input: createMissionInput('brief') });
    expect(getCurrentRun(state)).toEqual({
      cursor: 2,
      history: [...getCurrentRun(original).history.slice(0, 2), { input: createMissionInput('brief'), attempted: false }],
    });
    expect(getCurrentSnapshot(original).attempted).toBe(true);
    expect(original.missions.brief.compared).toBe(true);
    expect(state.missions.brief.compared).toBe(false);
  });

  it('also branches on submission and invalidates interaction that only existed in discarded redo steps', () => {
    const original = apply(open('brief'), { type: 'edit', input: CHOICES.brief }, { type: 'attempt' });
    const replayed = experienceReducer(original, { type: 'seek', cursor: 0 });
    expect(hasMissionInteraction(replayed.missions.brief)).toBe(true);
    const state = experienceReducer(replayed, { type: 'attempt' });
    expect(getCurrentRun(state).history).toEqual([
      { input: createMissionInput('brief'), attempted: false },
      { input: createMissionInput('brief'), attempted: true },
    ]);
    expect(hasMissionInteraction(state.missions.brief)).toBe(false);
    expect(apply(state, { type: 'compare' }, { type: 'discover' }).missions.brief.discovered).toBe(false);
  });

  it.each(MISSION_IDS)('%s caps edits and attempts while preserving the first snapshot and newest steps', id => {
    let state = open(id);
    const snapshots = [getCurrentSnapshot(state)];
    for (let index = 0; index < MAX_HISTORY + 7; index += 1) {
      state = experienceReducer(state, index % 2 === 0
        ? { type: 'edit', input: index % 4 === 0 ? CHOICES[id] : createMissionInput(id) }
        : { type: 'attempt' });
      snapshots.push(getCurrentSnapshot(state));
      expect(getCurrentRun(state).history.length).toBeLessThanOrEqual(MAX_HISTORY);
      expect(getCurrentRun(state).history[0]).toBe(snapshots[0]);
    }
    expect(getCurrentRun(state).history).toEqual([snapshots[0], ...snapshots.slice(-(MAX_HISTORY - 1))]);
    expect(getCurrentRun(state).cursor).toBe(MAX_HISTORY - 1);
    state = apply(state, { type: 'seek', cursor: 0 }, { type: 'edit', input: CHOICES[id] });
    expect(getCurrentRun(state).history).toHaveLength(2);
    expect(getCurrentRun(state).history[0]).toBe(snapshots[0]);
    expect(state.missions[id].runs.m365e7.history).toHaveLength(1);
  });
});

describe('substantive interaction and discovery gates', () => {
  it.each(MISSION_IDS)('%s cannot earn a discovery through visits, no-op edits, or default submissions', id => {
    let state = open(id);
    expect(getMissionStatus(state.missions[id])).toBe('in-progress');
    state = experienceReducer(state, { type: 'compare' });
    expect(state.missions[id].compared).toBe(false);
    expect(state.message).toMatch(/run the current setup/i);
    const reordered = Object.fromEntries(Object.entries(createMissionInput(id)).reverse()) as unknown as MissionInput;
    state = apply(state, { type: 'edit', input: reordered }, { type: 'attempt' }, { type: 'compare' }, { type: 'discover' });
    expect(hasMissionInteraction(state.missions[id])).toBe(false);
    expect(state.missions[id].compared).toBe(true);
    expect(state.missions[id].discovered).toBe(false);
    expect(state.message).toMatch(/change at least one sample choice/i);
  });

  it.each(MISSION_IDS)('%s requires a current submission, a meaningful choice, and comparison exposure', id => {
    let state = apply(open(id), { type: 'edit', input: CHOICES[id] }, { type: 'discover' });
    expect(hasMissionInteraction(state.missions[id])).toBe(true);
    expect(state.missions[id].discovered).toBe(false);
    expect(state.message).toMatch(/run the current setup/i);
    state = apply(state, { type: 'attempt' }, { type: 'discover' });
    expect(state.missions[id].discovered).toBe(false);
    expect(state.message).toMatch(/open the comparison/i);
    state = apply(state, { type: 'compare' }, { type: 'discover' });
    expect(getMissionStatus(state.missions[id])).toBe('discovered');
    expect(countDiscoveries(state)).toBe(1);
    state = experienceReducer(state, { type: 'discover' });
    expect(countDiscoveries(state)).toBe(1);
    expect(state.message).toMatch(/already collected/i);
    state = experienceReducer(state, { type: 'edit', input: createMissionInput(id) });
    expect(state.missions[id].discovered).toBe(true);
    expect(state.missions[id].compared).toBe(false);
    expect(getCurrentSnapshot(state).attempted).toBe(false);
  });

  it('counts substantive choices in either suite but never borrows choices from another mission', () => {
    let state = apply(open('brief'), { type: 'suite', suite: 'm365e7' }, { type: 'edit', input: CHOICES.brief },
      { type: 'suite', suite: 'o365e3' }, { type: 'attempt' }, { type: 'compare' }, { type: 'discover' });
    expect(state.missions.brief.discovered).toBe(true);
    state = apply(state, { type: 'enter', id: 'device' }, { type: 'attempt' }, { type: 'compare' }, { type: 'discover' });
    expect(state.missions.device.discovered).toBe(false);
    expect(countDiscoveries(state)).toBe(1);
  });

  it('can compare a replayed submitted step, but never carries comparison exposure through replay or edits', () => {
    let state = apply(open('brief'), { type: 'attempt' }, { type: 'edit', input: CHOICES.brief },
      { type: 'attempt' }, { type: 'compare' }, { type: 'seek', cursor: 1 }, { type: 'discover' });
    expect(state.missions.brief.discovered).toBe(false);
    expect(hasMissionInteraction(state.missions.brief)).toBe(true);
    state = apply(state, { type: 'compare' }, { type: 'discover' });
    expect(state.missions.brief.discovered).toBe(true);
    state = apply(state, { type: 'seek', cursor: 2 }, { type: 'compare' });
    expect(state.missions.brief.compared).toBe(false);
    expect(state.message).toMatch(/run the current setup/i);
  });
});

describe('case invalidation and reset scopes', () => {
  it.each(MISSION_IDS)('%s resets both runs on a case change, preserving only its historical discovery', id => {
    let state = collect(open(id));
    state = apply(state, { type: 'suite', suite: 'm365e7' }, { type: 'edit', input: CHOICES[id] }, { type: 'attempt' }, { type: 'compare' });
    const original = state;
    state = experienceReducer(state, { type: 'case', variant: 'curveball' });
    expect(state.missions[id]).toMatchObject({ variant: 'curveball', visited: true, compared: false, discovered: true });
    for (const suite of LAB_SUITES) {
      expect(state.missions[id].runs[suite]).toEqual(createExperienceState().missions[id].runs[suite]);
    }
    expect(hasMissionInteraction(state.missions[id])).toBe(false);
    expect(state.message).toMatch(/both suites/i);
    expect(state.message).toMatch(/history and comparison were cleared/i);
    for (const other of MISSION_IDS.filter(other => other !== id)) expect(state.missions[other]).toBe(original.missions[other]);
    state = experienceReducer(state, { type: 'edit', input: CHOICES[id] });
    const run = getCurrentRun(state);
    state = experienceReducer(state, { type: 'case', variant: 'curveball' });
    expect(getCurrentRun(state)).toBe(run);
    expect(state.message).toMatch(/already selected/i);
    state = experienceReducer(state, { type: 'case', variant: 'everyday' });
    expect(state.missions[id].variant).toBe('everyday');
    expect(countDiscoveries(state)).toBe(1);
  });

  it.each(MISSION_IDS)('restarting %s resets just that mission, including its case and discovery', id => {
    let state = createExperienceState();
    for (const mission of MISSION_IDS) state = collect(experienceReducer(state, { type: 'enter', id: mission }));
    state = apply(state, { type: 'enter', id }, { type: 'case', variant: 'curveball' },
      { type: 'suite', suite: 'm365e7' }, { type: 'role', role: 'security' });
    const before = state;
    state = experienceReducer(state, { type: 'reset-mission' });
    expect(state.missions[id]).toEqual(createExperienceState().missions[id]);
    expect(state).toMatchObject({ missionId: id, suite: 'm365e7', role: 'security', screen: 'mission' });
    expect(countDiscoveries(state)).toBe(7);
    for (const other of MISSION_IDS.filter(other => other !== id)) expect(state.missions[other]).toBe(before.missions[other]);
  });

  it('resets the entire lab to fresh independent states and defaults', () => {
    let state = createExperienceState();
    for (const id of MISSION_IDS) state = collect(experienceReducer(state, { type: 'enter', id }));
    expect(countDiscoveries(state)).toBe(8);
    const reset = apply(state, { type: 'role', role: 'leader' }, { type: 'screen', screen: 'passport' }, { type: 'reset' });
    expect({ ...reset, message: '' }).toEqual(createExperienceState());
    expect(countDiscoveries(reset)).toBe(0);
    expect(countDiscoveries(state)).toBe(8);
    expect(reset.message).toMatch(/only the lab/i);
    expect(reset.message).toMatch(/assessment and technical map were not changed/i);
  });
});

describe('invalid actions and plain-language feedback', () => {
  it.each([
    null, undefined, [], {}, 'attempt', { type: 'unknown' }, { type: 'enter' },
    { type: 'enter', id: '__proto__' }, { type: 'suite', suite: 'm365e3' },
    { type: 'role', role: 'general' }, { type: 'screen', screen: 'assessment' },
    { type: 'case', variant: 'random' }, { type: 'seek', cursor: '1' },
    { type: 'edit' }, { type: 'attempt', payload: 'arbitrary text' },
  ])('throws for programmer-invalid action %#', invalid => {
    const state = createExperienceState();
    expect(() => experienceReducer(state, invalid as ExperienceAction)).toThrow(TypeError);
    expect(state).toEqual(createExperienceState());
  });

  it('surfaces a wrong-mission edit as a recoverable transition without altering either mission', () => {
    const before = open('brief');
    const after = experienceReducer(before, { type: 'edit', input: CHOICES.device });
    expect(after).not.toBe(before);
    expect(after.missions).toBe(before.missions);
    expect(after.message).toMatch(/another mission/i);
    expect(after.missionId).toBe('brief');
  });

  it('announces every supported transition without exposing internal identifiers', () => {
    let state = createExperienceState();
    const actions: ExperienceAction[] = [
      { type: 'enter', id: 'brief' }, { type: 'screen', screen: 'catalog' },
      { type: 'role', role: 'business' }, { type: 'suite', suite: 'm365e7' },
      { type: 'suite', suite: 'm365e7' }, { type: 'case', variant: 'curveball' },
      { type: 'case', variant: 'curveball' }, { type: 'edit', input: CHOICES.brief },
      { type: 'attempt' }, { type: 'compare' }, { type: 'discover' },
      { type: 'seek', cursor: 0 }, { type: 'reset-mission' }, { type: 'reset' },
    ];
    for (const action of actions) {
      state = experienceReducer(state, action);
      expect(state.message.length).toBeGreaterThan(10);
      expect(state.message).not.toMatch(/o365e3|m365e7|reset-mission|work-files|private-app|__proto__/);
    }
  });
});
