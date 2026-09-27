import { createMissionInput } from '../data/experience/fixtures';
import {
  areMissionInputsEqual, hasExactKeys, isBoundedArray, isCaseVariant, isLabRole,
  isLabScreen, isLabSuite, isMissionId, isMissionInput,
} from '../data/experience/inputValidation';
import {
  LAB_SUITES, MISSION_IDS, type ExperienceState, type MissionId,
  type MissionProgress, type MissionRun, type MissionSnapshot,
} from '../data/experience/types';
import { createExperienceState, MAX_HISTORY } from '../lib/experienceEngine';

export const EXPERIENCE_STORAGE_KEY = 'me7-experience-progress';
export const EXPERIENCE_SCHEMA_VERSION = 1;
const MAX_STORED_CHARACTERS = 256_000;
const STATE_KEYS = ['version', 'screen', 'missionId', 'suite', 'role', 'missions'] as const;
const INVALID_PROGRESS = 'Saved lab progress could not be validated. A fresh lab is available for this visit, and the original saved copy has not been changed. Reset only the lab to replace it; your assessment and technical map will be kept.';
const INCOMPATIBLE_PROGRESS = 'Saved lab progress uses a different format. A fresh lab is available for this visit, and the original saved copy has not been changed. Use the lab version that created it, or reset only the lab to start saving again.';

export interface ExperienceProgressLoad {
  state: ExperienceState;
  warning: string | null;
  blocked: boolean;
}

function readRun(value: unknown, id: MissionId): MissionRun | null {
  if (!hasExactKeys(value, ['history', 'cursor'])
    || !isBoundedArray(value.history, MAX_HISTORY) || value.history.length === 0
    || typeof value.cursor !== 'number' || !Number.isSafeInteger(value.cursor)
    || value.cursor < 0 || value.cursor >= value.history.length) return null;

  const history: MissionSnapshot[] = [];
  for (const snapshot of value.history) {
    if (!hasExactKeys(snapshot, ['input', 'attempted'])
      || !isMissionInput(snapshot.input) || snapshot.input.kind !== id
      || typeof snapshot.attempted !== 'boolean') return null;
    history.push({ input: structuredClone(snapshot.input), attempted: snapshot.attempted });
  }
  if (history[0].attempted || !areMissionInputsEqual(history[0].input, createMissionInput(id))) return null;
  return { history, cursor: value.cursor };
}

function readMission(value: unknown, id: MissionId): MissionProgress | null {
  if (!hasExactKeys(value, ['variant', 'runs', 'visited', 'compared', 'discovered'])
    || !isCaseVariant(value.variant) || !hasExactKeys(value.runs, LAB_SUITES)
    || typeof value.visited !== 'boolean' || typeof value.compared !== 'boolean'
    || typeof value.discovered !== 'boolean') return null;

  const o365e3 = readRun(value.runs.o365e3, id);
  const m365e7 = readRun(value.runs.m365e7, id);
  if (!o365e3 || !m365e7) return null;
  if (value.compared && !o365e3.history[o365e3.cursor].attempted
    && !m365e7.history[m365e7.cursor].attempted) return null;
  return {
    variant: value.variant,
    runs: { o365e3, m365e7 },
    visited: value.visited,
    compared: value.compared,
    discovered: value.discovered,
  };
}

function readState(value: unknown): ExperienceState | null {
  if ((!hasExactKeys(value, STATE_KEYS) && !hasExactKeys(value, [...STATE_KEYS, 'message']))
    || (Object.hasOwn(value, 'message') && typeof value.message !== 'string')
    || value.version !== EXPERIENCE_SCHEMA_VERSION
    || !isLabScreen(value.screen) || !isMissionId(value.missionId)
    || !isLabSuite(value.suite) || !isLabRole(value.role)
    || !hasExactKeys(value.missions, MISSION_IDS)) return null;

  const missions = {} as ExperienceState['missions'];
  for (const id of MISSION_IDS) {
    const progress = readMission(value.missions[id], id);
    if (!progress) return null;
    missions[id] = progress;
  }
  return {
    version: EXPERIENCE_SCHEMA_VERSION,
    screen: value.screen,
    missionId: value.missionId,
    suite: value.suite,
    role: value.role,
    missions,
    message: '',
  };
}

function freshProgress(warning: string | null = null): ExperienceProgressLoad {
  return { state: createExperienceState(), warning, blocked: warning !== null };
}

function storageRecovery(error: unknown): string {
  const name = typeof error === 'object' && error !== null
    && 'name' in error && typeof error.name === 'string' ? error.name : '';
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
    return 'Your browser storage is full. Free some site storage before trying again.';
  }
  if (name === 'SecurityError' || name === 'NotAllowedError') {
    return 'Your browser is blocking site storage. Allow storage for this site or try a regular browsing window.';
  }
  return 'Browser storage is unavailable. Check this site’s storage permissions or try a regular browsing window.';
}

export function loadExperienceProgress(storage: Pick<Storage, 'getItem'>): ExperienceProgressLoad {
  let raw: string | null;
  try {
    raw = storage.getItem(EXPERIENCE_STORAGE_KEY);
  } catch (error: unknown) {
    return freshProgress(`Saved lab progress could not be read. ${storageRecovery(error)} A fresh lab is available for this visit; the stored copy has not been changed. Restore storage access and reload to retry that copy, or reset only the lab to replace it.`);
  }
  if (raw === null) return freshProgress();
  if (typeof raw !== 'string' || raw.length > MAX_STORED_CHARACTERS) return freshProgress(INVALID_PROGRESS);

  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch (error: unknown) {
    if (!(error instanceof SyntaxError)) throw error;
    return freshProgress('Saved lab progress could not be read because its format is damaged. A fresh lab is available for this visit, and the original saved copy has not been changed. Reset only the lab to start saving again.');
  }
  if (!hasExactKeys(envelope, ['version', 'state'])) return freshProgress(INVALID_PROGRESS);
  if (envelope.version !== EXPERIENCE_SCHEMA_VERSION) return freshProgress(INCOMPATIBLE_PROGRESS);
  if (hasExactKeys(envelope.state, STATE_KEYS) || hasExactKeys(envelope.state, [...STATE_KEYS, 'message'])) {
    if (envelope.state.version !== EXPERIENCE_SCHEMA_VERSION) return freshProgress(INCOMPATIBLE_PROGRESS);
  }
  const state = readState(envelope.state);
  return state ? { state, warning: null, blocked: false } : freshProgress(INVALID_PROGRESS);
}

export function saveExperienceProgress(storage: Pick<Storage, 'setItem'>, state: ExperienceState): string | null {
  const validated = readState(state);
  if (!validated) {
    return 'Lab progress was not saved because it contains unsupported or damaged settings. The previous saved copy was not changed. Keep this tab open, or reset only the lab to start fresh.';
  }
  const payload = JSON.stringify({
    version: EXPERIENCE_SCHEMA_VERSION,
    state: {
      version: validated.version,
      screen: validated.screen,
      missionId: validated.missionId,
      suite: validated.suite,
      role: validated.role,
      missions: validated.missions,
    },
  });
  if (payload.length > MAX_STORED_CHARACTERS) {
    return 'Lab progress was not saved because it is too large. The previous saved copy was not changed. Reset only the lab to start fresh.';
  }
  try {
    storage.setItem(EXPERIENCE_STORAGE_KEY, payload);
  } catch (error: unknown) {
    return `Lab progress could not be saved. ${storageRecovery(error)} Keep this tab open to retain your current progress, then try saving again.`;
  }
  return null;
}

export function clearExperienceProgress(storage: Pick<Storage, 'removeItem'>): string | null {
  try {
    storage.removeItem(EXPERIENCE_STORAGE_KEY);
  } catch (error: unknown) {
    return `Saved lab progress could not be removed. ${storageRecovery(error)} Restore storage access, then reset only the lab again. Your assessment and technical map were not touched.`;
  }
  return null;
}
