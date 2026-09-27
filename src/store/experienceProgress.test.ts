import { describe, expect, it, vi } from 'vitest';
import { createMissionInput } from '../data/experience/fixtures';
import {
  LAB_SUITES, MISSION_IDS, type ExperienceAction, type ExperienceState, type MissionId, type MissionInput,
} from '../data/experience/types';
import { createExperienceState, experienceReducer, getCurrentRun, MAX_HISTORY } from '../lib/experienceEngine';
import {
  clearExperienceProgress, EXPERIENCE_SCHEMA_VERSION, EXPERIENCE_STORAGE_KEY,
  loadExperienceProgress, saveExperienceProgress,
} from './experienceProgress';

const OTHER_VALUES = [
  ['me7-assessment', 'Original assessment'],
  ['me7-architecture', 'Original technical map'],
  ['preferences', 'Original preferences'],
] as const;

function fakeStorage(saved?: string) {
  const values = new Map<string, string>(OTHER_VALUES);
  if (saved !== undefined) values.set(EXPERIENCE_STORAGE_KEY, saved);
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
  return { storage, values };
}

function encode(state: ExperienceState = createExperienceState(), version: unknown = 1): string {
  return JSON.stringify({ version, state });
}

function apply(state: ExperienceState, ...actions: ExperienceAction[]): ExperienceState {
  return actions.reduce(experienceReducer, state);
}

function choice(id: MissionId): MissionInput {
  const input = createMissionInput(id);
  switch (input.kind) {
    case 'brief': return { ...input, sources: ['project', 'thread'] };
    case 'device': return { ...input, enrolled: true };
    case 'access': return { ...input, verify: 'mfa' };
    case 'incident': return { ...input, clues: ['email', 'endpoint', 'identity'] };
    case 'sharing': return { ...input, classification: 'confidential' };
    case 'agent': return { ...input, owner: 'maya' };
    case 'insights': return { ...input, metric: 'returns', region: 'south' };
    case 'calling': return { ...input, destination: 'colleague' };
  }
}

function richState(): ExperienceState {
  let state = createExperienceState();
  for (const [index, id] of MISSION_IDS.entries()) {
    state = apply(state, { type: 'enter', id },
      { type: 'case', variant: index % 2 ? 'curveball' : 'everyday' },
      { type: 'suite', suite: 'o365e3' }, { type: 'edit', input: choice(id) },
      { type: 'attempt' }, { type: 'seek', cursor: 1 },
      { type: 'suite', suite: 'm365e7' }, { type: 'attempt' },
      { type: 'edit', input: choice(id) }, { type: 'attempt' },
      { type: 'compare' }, { type: 'discover' });
  }
  return apply(state, { type: 'role', role: 'security' }, { type: 'screen', screen: 'passport' });
}

function expectOtherKeys(values: Map<string, string>): void {
  for (const [key, value] of OTHER_VALUES) expect(values.get(key)).toBe(value);
}

function expectBlockedCopy(raw: string): void {
  const { storage, values } = fakeStorage(raw);
  const result = loadExperienceProgress(storage);
  expect(result.state).toEqual(createExperienceState());
  expect(result.warning).toMatch(/saved lab progress/i);
  expect(result.warning).toMatch(/reset only the lab/i);
  expect(result.blocked).toBe(true);
  expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(EXPERIENCE_STORAGE_KEY);
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(storage.removeItem).not.toHaveBeenCalled();
  expect(values.get(EXPERIENCE_STORAGE_KEY)).toBe(raw);
  expectOtherKeys(values);
}

describe('isolated versioned lab persistence', () => {
  it('loads missing progress as a fresh, unblocked lab without writing any storage', () => {
    const { storage, values } = fakeStorage();
    expect(loadExperienceProgress(storage)).toEqual({ state: createExperienceState(), warning: null, blocked: false });
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(EXPERIENCE_STORAGE_KEY);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expectOtherKeys(values);
    expect(EXPERIENCE_SCHEMA_VERSION).toBe(1);
    expect(OTHER_VALUES.map(([key]) => key)).not.toContain(EXPERIENCE_STORAGE_KEY);
  });

  it('round-trips all eight missions and both independent histories, variants, flags, cursors, and navigation', () => {
    const state = richState();
    const before = structuredClone(state);
    const { storage, values } = fakeStorage();
    expect(saveExperienceProgress(storage, state)).toBeNull();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const raw = values.get(EXPERIENCE_STORAGE_KEY)!;
    const envelope = JSON.parse(raw);
    expect(Object.keys(envelope).sort()).toEqual(['state', 'version']);
    expect(envelope.version).toBe(1);
    expect(envelope.state.version).toBe(1);
    expect(Object.keys(envelope.state).sort()).toEqual(['missionId', 'missions', 'role', 'screen', 'suite', 'version']);
    expect(Object.keys(envelope.state.missions)).toEqual([...MISSION_IDS]);
    const restored = loadExperienceProgress(storage);
    expect(restored).toEqual({ state: { ...state, message: '' }, warning: null, blocked: false });
    expect(state).toEqual(before);
    for (const id of MISSION_IDS) {
      for (const suite of LAB_SUITES) {
        const run = restored.state.missions[id].runs[suite];
        expect(run).not.toBe(state.missions[id].runs[suite]);
        expect(run.history[0].input).toEqual(createMissionInput(id));
      }
      expect(restored.state.missions[id].runs.o365e3.cursor).toBe(1);
      expect(restored.state.missions[id].runs.m365e7.cursor).toBe(3);
    }
    expect(values.get(EXPERIENCE_STORAGE_KEY)).toBe(raw);
    expectOtherKeys(values);
  });

  it('does not persist or replay transient messages, including messages in an otherwise valid stored state', () => {
    const { storage, values } = fakeStorage();
    const state = createExperienceState();
    state.message = 'This old announcement must never be replayed.';
    expect(saveExperienceProgress(storage, state)).toBeNull();
    expect(values.get(EXPERIENCE_STORAGE_KEY)).not.toContain(state.message);
    expect(JSON.parse(values.get(EXPERIENCE_STORAGE_KEY)!).state).not.toHaveProperty('message');
    values.set(EXPERIENCE_STORAGE_KEY, encode(state));
    expect(loadExperienceProgress(storage)).toEqual({ state: { ...state, message: '' }, warning: null, blocked: false });
    expect(state.message).not.toBe('');
  });

  it('restores a historical discovery after a case change cleared all its attempts and comparisons', () => {
    const state = apply(richState(), { type: 'enter', id: 'brief' }, { type: 'case', variant: 'curveball' });
    expect(state.missions.brief).toMatchObject({ discovered: true, compared: false, variant: 'curveball' });
    const { storage } = fakeStorage();
    expect(saveExperienceProgress(storage, state)).toBeNull();
    expect(loadExperienceProgress(storage)).toEqual({ state: { ...state, message: '' }, warning: null, blocked: false });
  });

  it('persists the largest supported histories for every mission and suite without truncating them', () => {
    let state = createExperienceState();
    for (const id of MISSION_IDS) {
      state = experienceReducer(state, { type: 'enter', id });
      for (const suite of LAB_SUITES) {
        state = experienceReducer(state, { type: 'suite', suite });
        for (let index = 0; index < MAX_HISTORY + 2; index += 1) {
          state = experienceReducer(state, index % 2
            ? { type: 'attempt' } : { type: 'edit', input: choice(id) });
        }
        expect(getCurrentRun(state).history).toHaveLength(MAX_HISTORY);
      }
    }
    const { storage } = fakeStorage();
    expect(saveExperienceProgress(storage, state)).toBeNull();
    expect(loadExperienceProgress(storage)).toEqual({ state: { ...state, message: '' }, warning: null, blocked: false });
  });

  it('creates fresh independent objects on repeated reads and clears only the lab key on explicit reset', () => {
    const { storage, values } = fakeStorage(encode());
    const first = loadExperienceProgress(storage).state;
    const second = loadExperienceProgress(storage).state;
    expect(first).toEqual(second);
    expect(first.missions.brief.runs.o365e3.history[0].input).not.toBe(second.missions.brief.runs.o365e3.history[0].input);
    expect(clearExperienceProgress({ removeItem: storage.removeItem })).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledExactlyOnceWith(EXPERIENCE_STORAGE_KEY);
    expect(values.has(EXPERIENCE_STORAGE_KEY)).toBe(false);
    expectOtherKeys(values);
    expect(loadExperienceProgress(storage).blocked).toBe(false);
  });
});

describe('unknown, malformed, and incompatible persisted values', () => {
  it.each([
    '', '{', 'not json', 'null', '[]', 'false', '5', '"lab"', '{}',
    '{"version":1}', '{"state":{}}', '{"version":1,"state":null}',
    JSON.stringify(createExperienceState()),
    JSON.stringify({ version: 1, state: createExperienceState(), assessment: {} }),
    '{"version":1,"state":{},"__proto__":{"injected":true}}',
  ])('preserves malformed original storage %# and blocks automatic overwrites', raw => {
    expectBlockedCopy(raw);
  });

  it.each([0, 2, -1, 1.5, '1', null, {}, []])('blocks incompatible envelope version %# without rewriting it', version => {
    const raw = encode(createExperienceState(), version);
    expectBlockedCopy(raw);
    expect(loadExperienceProgress(fakeStorage(raw).storage).warning).toMatch(/different format/i);
  });

  it('blocks an incompatible nested state version even inside a current envelope', () => {
    const state = createExperienceState();
    Reflect.set(state, 'version', 2);
    expectBlockedCopy(encode(state));
  });

  it('bounds the serialized value before parsing arbitrary large payloads', () => {
    expectBlockedCopy(`{"version":1,"state":${' '.repeat(256_001)}null}`);
  });

  it('surfaces an invalid storage return value rather than treating it as missing', () => {
    const getItem = vi.fn(() => undefined) as unknown as Storage['getItem'];
    const result = loadExperienceProgress({ getItem });
    expect(result.blocked).toBe(true);
    expect(result.warning).toBeTruthy();
    expect(result.state).toEqual(createExperienceState());
  });

  it('does not hide unexpected programming errors from JSON parsing', () => {
    const parse = vi.spyOn(JSON, 'parse').mockImplementationOnce(() => { throw new TypeError('Unexpected parser failure'); });
    try {
      expect(() => loadExperienceProgress(fakeStorage('{}').storage)).toThrow('Unexpected parser failure');
    } finally {
      parse.mockRestore();
    }
  });
});

const INVALID_STATES: [string, (state: ExperienceState) => void][] = [
  ['unknown root field', state => Reflect.set(state, 'assessment', { private: 'not lab progress' })],
  ['missing root field', state => Reflect.deleteProperty(state, 'screen')],
  ['unknown screen', state => Reflect.set(state, 'screen', 'assessment')],
  ['unknown role', state => Reflect.set(state, 'role', 'general')],
  ['unknown suite', state => Reflect.set(state, 'suite', 'm365e3')],
  ['unknown mission', state => Reflect.set(state, 'missionId', 'unknown')],
  ['wrong message type', state => Reflect.set(state, 'message', { arbitrary: 'payload' })],
  ['missing mission', state => Reflect.deleteProperty(state.missions, 'calling')],
  ['extra mission', state => Reflect.set(state.missions, 'extra', state.missions.brief)],
  ['array instead of missions', state => Reflect.set(state, 'missions', [])],
  ['missing suite run', state => Reflect.deleteProperty(state.missions.brief.runs, 'm365e7')],
  ['extra suite run', state => Reflect.set(state.missions.brief.runs, 'm365e3', state.missions.brief.runs.o365e3)],
  ['wrong variant', state => Reflect.set(state.missions.brief, 'variant', 'random')],
  ['missing progress flag', state => Reflect.deleteProperty(state.missions.brief, 'discovered')],
  ['string visited flag', state => Reflect.set(state.missions.brief, 'visited', 'false')],
  ['string comparison flag', state => Reflect.set(state.missions.brief, 'compared', 'true')],
  ['numeric discovery flag', state => Reflect.set(state.missions.brief, 'discovered', 1)],
  ['comparison without a submitted cursor', state => { state.missions.brief.compared = true; }],
  ['extra mission data', state => Reflect.set(state.missions.brief, 'notes', 'freeform')],
  ['missing history', state => Reflect.deleteProperty(state.missions.brief.runs.o365e3, 'history')],
  ['empty history', state => { state.missions.brief.runs.o365e3.history = []; }],
  ['non-array history', state => Reflect.set(state.missions.brief.runs.o365e3, 'history', {})],
  ['sparse history', state => { state.missions.brief.runs.o365e3.history = new Array(2); }],
  ['oversized history', state => {
    const run = state.missions.brief.runs.o365e3;
    run.history = Array.from({ length: MAX_HISTORY + 1 }, () => structuredClone(run.history[0]));
  }],
  ['extra run field', state => Reflect.set(state.missions.brief.runs.o365e3, 'notes', 'freeform')],
  ['negative cursor', state => { state.missions.brief.runs.o365e3.cursor = -1; }],
  ['past-end cursor', state => { state.missions.brief.runs.o365e3.cursor = 1; }],
  ['fractional cursor', state => { state.missions.brief.runs.o365e3.cursor = 0.5; }],
  ['infinite cursor', state => { state.missions.brief.runs.o365e3.cursor = Infinity; }],
  ['not-a-number cursor', state => { state.missions.brief.runs.o365e3.cursor = NaN; }],
  ['string cursor', state => Reflect.set(state.missions.brief.runs.o365e3, 'cursor', '0')],
  ['extra snapshot data', state => Reflect.set(state.missions.brief.runs.o365e3.history[0], 'output', 'freeform')],
  ['wrong attempted flag', state => Reflect.set(state.missions.brief.runs.o365e3.history[0], 'attempted', 'false')],
  ['missing snapshot input', state => Reflect.deleteProperty(state.missions.brief.runs.o365e3.history[0], 'input')],
  ['unknown input kind', state => Reflect.set(state.missions.brief.runs.o365e3.history[0].input, 'kind', 'unknown')],
  ['wrong mission input kind', state => { state.missions.brief.runs.o365e3.history[0].input = createMissionInput('device'); }],
  ['changed base input', state => { state.missions.brief.runs.o365e3.history[0].input = choice('brief'); }],
  ['attempted base snapshot', state => { state.missions.brief.runs.o365e3.history[0].attempted = true; }],
  ['duplicate sources', state => Reflect.set(state.missions.brief.runs.o365e3.history[0].input, 'sources', ['project', 'project'])],
  ['duplicate clues', state => Reflect.set(state.missions.incident.runs.m365e7.history[0].input, 'clues', ['email', 'email'])],
  ['unbounded sources', state => Reflect.set(state.missions.brief.runs.m365e7.history[0].input, 'sources', Array(5).fill('project'))],
  ['unknown clue', state => Reflect.set(state.missions.incident.runs.o365e3.history[0].input, 'clues', ['unapproved'])],
];

describe('strict state and snapshot validation on both read and write', () => {
  it.each(INVALID_STATES)('rejects %s without saving or discarding the source key', (_label, mutate) => {
    const state = createExperienceState();
    mutate(state);
    expectBlockedCopy(encode(state));
    const source = encode(richState());
    const { storage, values } = fakeStorage(source);
    expect(saveExperienceProgress(storage, state)).toMatch(/not saved/i);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(values.get(EXPERIENCE_STORAGE_KEY)).toBe(source);
    expectOtherKeys(values);
  });

  it.each(MISSION_IDS)('validates every retained %s snapshot in both suites, including redo history', id => {
    for (const suite of LAB_SUITES) {
      const state = apply(createExperienceState(), { type: 'enter', id }, { type: 'suite', suite },
        { type: 'edit', input: choice(id) }, { type: 'attempt' }, { type: 'seek', cursor: 0 });
      Reflect.set(state.missions[id].runs[suite].history[2].input, 'freeform', 'Unapproved payload');
      expectBlockedCopy(encode(state));
      const { storage } = fakeStorage(encode());
      expect(saveExperienceProgress(storage, state)).toMatch(/not saved/i);
      expect(storage.setItem).not.toHaveBeenCalled();
    }
  });

  it('rejects runtime-only payloads before serialization can hide or execute them', () => {
    const candidates = [
      (state: ExperienceState) => Reflect.set(state, 'toJSON', vi.fn(() => createExperienceState())),
      (state: ExperienceState) => Object.defineProperty(state, Symbol('extra'), { value: true }),
      (state: ExperienceState) => Object.defineProperty(state.missions.brief, 'hidden', { value: 'payload' }),
      (state: ExperienceState) => Object.assign(state.missions.brief.runs.o365e3.history, { notes: 'payload' }),
      (state: ExperienceState) => Object.setPrototypeOf(state.missions.brief, { notes: 'payload' }),
    ];
    for (const mutate of candidates) {
      const state = createExperienceState();
      mutate(state);
      const { storage } = fakeStorage(encode());
      expect(saveExperienceProgress(storage, state)).toMatch(/not saved/i);
      expect(storage.setItem).not.toHaveBeenCalled();
    }
    const state = createExperienceState();
    const getter = vi.fn(() => 'workplace');
    Object.defineProperty(state, 'screen', { enumerable: true, get: getter });
    expect(saveExperienceProgress(fakeStorage().storage, state)).toMatch(/not saved/i);
    expect(getter).not.toHaveBeenCalled();
  });
});

const STORAGE_FAILURES = [
  { name: 'SecurityError', recovery: /allow storage for this site/i },
  { name: 'NotAllowedError', recovery: /allow storage for this site/i },
  { name: 'QuotaExceededError', recovery: /storage is full.*free some site storage/i },
  { name: 'NS_ERROR_DOM_QUOTA_REACHED', recovery: /storage is full.*free some site storage/i },
  { name: 'Error', recovery: /check this site.s storage permissions/i },
];

function storageError(name: string): Error {
  const error = new Error('Internal diagnostic details must not be exposed.');
  error.name = name;
  return error;
}

describe('visible storage failure and recovery boundaries', () => {
  it.each(STORAGE_FAILURES)('returns a fresh blocked visit and preserves stored data on read failure: $name', ({ name, recovery }) => {
    const raw = encode(richState());
    const { storage, values } = fakeStorage(raw);
    storage.getItem.mockImplementation(() => { throw storageError(name); });
    const loaded = loadExperienceProgress(storage);
    expect(loaded.state).toEqual(createExperienceState());
    expect(loaded.blocked).toBe(true);
    expect(loaded.warning).toMatch(/could not be read/i);
    expect(loaded.warning).toMatch(recovery);
    expect(loaded.warning).toMatch(/reload.*reset only the lab/i);
    expect(loaded.warning).not.toContain('Internal diagnostic');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(values.get(EXPERIENCE_STORAGE_KEY)).toBe(raw);
    expectOtherKeys(values);
  });

  it.each(STORAGE_FAILURES)('never reports success on write failure and allows an explicit retry: $name', ({ name, recovery }) => {
    const original = encode();
    const { storage, values } = fakeStorage(original);
    storage.setItem.mockImplementationOnce(() => { throw storageError(name); });
    const state = richState();
    const warning = saveExperienceProgress(storage, state);
    expect(warning).toMatch(/could not be saved/i);
    expect(warning).toMatch(recovery);
    expect(warning).toMatch(/keep this tab open.*try saving again/i);
    expect(warning).not.toContain('Internal diagnostic');
    expect(values.get(EXPERIENCE_STORAGE_KEY)).toBe(original);
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(saveExperienceProgress(storage, state)).toBeNull();
    expect(loadExperienceProgress(storage).state).toEqual({ ...state, message: '' });
    expectOtherKeys(values);
  });

  it.each(STORAGE_FAILURES)('does not claim a reset succeeded when removal fails: $name', ({ name, recovery }) => {
    const original = encode(richState());
    const { storage, values } = fakeStorage(original);
    storage.removeItem.mockImplementationOnce(() => { throw storageError(name); });
    const warning = clearExperienceProgress(storage);
    expect(warning).toMatch(/could not be removed/i);
    expect(warning).toMatch(recovery);
    expect(warning).toMatch(/reset only the lab again/i);
    expect(warning).not.toContain('Internal diagnostic');
    expect(values.get(EXPERIENCE_STORAGE_KEY)).toBe(original);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(clearExperienceProgress(storage)).toBeNull();
    expect(values.has(EXPERIENCE_STORAGE_KEY)).toBe(false);
    expectOtherKeys(values);
  });

  it('surfaces non-Error exceptions at the storage boundary rather than returning silent success', () => {
    const fail = () => { throw 'Storage is unavailable'; };
    expect(loadExperienceProgress({ getItem: fail })).toMatchObject({ blocked: true, warning: expect.any(String) });
    expect(saveExperienceProgress({ setItem: fail }, createExperienceState())).toMatch(/could not be saved/i);
    expect(clearExperienceProgress({ removeItem: fail })).toMatch(/could not be removed/i);
  });
});
