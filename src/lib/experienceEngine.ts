import { createMissionInput } from '../data/experience/fixtures';
import {
  areMissionInputsEqual, hasExactKeys, isBoundedArray, isCaseVariant, isLabRole,
  isLabScreen, isLabSuite, isMissionId, isMissionInput, isPlainRecord,
} from '../data/experience/inputValidation';
import {
  LAB_SUITES, MISSION_IDS,
  type ExperienceAction, type ExperienceState, type MissionId, type MissionProgress,
  type MissionRun, type MissionSnapshot,
} from '../data/experience/types';

export const MAX_HISTORY = 32;

function createMissionProgress(id: MissionId): MissionProgress {
  const createRun = (): MissionRun => ({
    history: [{ input: createMissionInput(id), attempted: false }],
    cursor: 0,
  });
  return {
    variant: 'everyday',
    runs: { o365e3: createRun(), m365e7: createRun() },
    visited: false,
    compared: false,
    discovered: false,
  };
}

export function createExperienceState(): ExperienceState {
  return {
    version: 1,
    screen: 'workplace',
    missionId: 'brief',
    suite: 'o365e3',
    role: 'everyone',
    missions: Object.fromEntries(
      MISSION_IDS.map(id => [id, createMissionProgress(id)]),
    ) as ExperienceState['missions'],
    message: '',
  };
}

export function getCurrentRun(state: ExperienceState): MissionRun {
  if (!isMissionId(state.missionId) || !isLabSuite(state.suite)) {
    throw new TypeError('Choose a supported mission and suite.');
  }
  const run = state.missions[state.missionId]?.runs[state.suite];
  if (!run || !isBoundedArray(run.history, MAX_HISTORY) || run.history.length === 0) {
    throw new TypeError('This mission needs a valid step history.');
  }
  return run;
}

export function getCurrentSnapshot(state: ExperienceState): MissionSnapshot {
  const run = getCurrentRun(state);
  if (!Number.isSafeInteger(run.cursor) || run.cursor < 0 || run.cursor >= run.history.length) {
    throw new RangeError('Choose an available step in this mission.');
  }
  const snapshot = run.history[run.cursor];
  if (!hasExactKeys(snapshot, ['input', 'attempted'])
    || !isMissionInput(snapshot.input) || snapshot.input.kind !== state.missionId
    || typeof snapshot.attempted !== 'boolean') {
    throw new TypeError('This mission step does not contain supported sample choices.');
  }
  return snapshot;
}

export function hasMissionInteraction(progress: MissionProgress): boolean {
  return LAB_SUITES.some(suite => progress.runs[suite].history.some(snapshot =>
    !areMissionInputsEqual(snapshot.input, createMissionInput(snapshot.input.kind)),
  ));
}

export function getMissionStatus(progress: MissionProgress): 'untouched' | 'in-progress' | 'discovered' {
  if (progress.discovered) return 'discovered';
  return progress.visited || hasMissionInteraction(progress)
    || LAB_SUITES.some(suite => progress.runs[suite].history.some(snapshot => snapshot.attempted))
    ? 'in-progress' : 'untouched';
}

export function countDiscoveries(state: ExperienceState): number {
  return MISSION_IDS.filter(id => state.missions[id].discovered).length;
}

function updateMission(state: ExperienceState, progress: MissionProgress, message: string): ExperienceState {
  return { ...state, missions: { ...state.missions, [state.missionId]: progress }, message };
}

function appendSnapshot(state: ExperienceState, snapshot: MissionSnapshot, message: string): ExperienceState {
  const progress = state.missions[state.missionId];
  const run = getCurrentRun(state);
  let history = [...run.history.slice(0, run.cursor + 1), snapshot];
  // Keep the immutable starting point even after older intermediate steps are evicted.
  if (history.length > MAX_HISTORY) history = [history[0], ...history.slice(-(MAX_HISTORY - 1))];
  return updateMission(state, {
    ...progress,
    visited: true,
    compared: false,
    runs: { ...progress.runs, [state.suite]: { history, cursor: history.length - 1 } },
  }, message);
}

function assertActionKeys(action: ExperienceAction, fields: readonly string[] = []): void {
  if (!hasExactKeys(action, ['type', ...fields])) {
    throw new TypeError('This lab action contains missing or unsupported settings.');
  }
}

export function experienceReducer(state: ExperienceState, action: ExperienceAction): ExperienceState {
  if (!isPlainRecord(action)) throw new TypeError('Choose a supported lab action.');
  switch (action.type) {
    case 'enter': {
      assertActionKeys(action, ['id']);
      if (!isMissionId(action.id)) throw new TypeError('Choose one of the eight lab missions.');
      return {
        ...state,
        screen: 'mission',
        missionId: action.id,
        missions: { ...state.missions, [action.id]: { ...state.missions[action.id], visited: true } },
        message: 'Mission opened. Your choices and saved steps for this suite are ready.',
      };
    }
    case 'screen': {
      assertActionKeys(action, ['screen']);
      if (!isLabScreen(action.screen)) throw new TypeError('Choose a supported lab page.');
      const next = action.screen === 'mission'
        ? updateMission(state, { ...state.missions[state.missionId], visited: true }, '')
        : state;
      return { ...next, screen: action.screen, message: 'Lab page changed. Your mission progress is kept.' };
    }
    case 'suite': {
      assertActionKeys(action, ['suite']);
      if (!isLabSuite(action.suite)) throw new TypeError('Choose one of the two supported suites.');
      const label = action.suite === 'o365e3' ? 'Office 365 E3' : 'Microsoft 365 E7';
      if (state.suite === action.suite) {
        return { ...state, message: `${label} is already selected. Your current steps are unchanged.` };
      }
      return {
        ...updateMission(state, { ...state.missions[state.missionId], compared: false },
          `${label} selected. Its own choices and replay position were restored. Open the comparison again after an attempt.`),
        suite: action.suite,
      };
    }
    case 'role': {
      assertActionKeys(action, ['role']);
      if (!isLabRole(action.role)) throw new TypeError('Choose a supported learning path.');
      return { ...state, role: action.role, message: 'Learning path updated. Your existing mission progress is unchanged.' };
    }
    case 'edit': {
      assertActionKeys(action, ['input']);
      if (!isMissionInput(action.input)) {
        throw new TypeError('Use only the supported sample choices for a mission.');
      }
      if (action.input.kind !== state.missionId) {
        return { ...state, message: 'Those choices belong to another mission. Open that mission before changing its setup.' };
      }
      getCurrentSnapshot(state);
      return appendSnapshot(state, { input: structuredClone(action.input), attempted: false },
        'Choices saved as a new step. Later replay steps were replaced. Run this setup before comparing the results.');
    }
    case 'attempt': {
      assertActionKeys(action);
      const snapshot = getCurrentSnapshot(state);
      return appendSnapshot(state, { input: structuredClone(snapshot.input), attempted: true },
        'Sample attempt recorded. Review the outcome, then open the comparison to explore both workflows.');
    }
    case 'seek': {
      assertActionKeys(action, ['cursor']);
      if (typeof action.cursor !== 'number') throw new TypeError('Choose a numeric replay step.');
      if (!Number.isFinite(action.cursor)) throw new RangeError('Choose a finite replay step.');
      const progress = state.missions[state.missionId];
      const run = getCurrentRun(state);
      const cursor = Math.max(0, Math.min(run.history.length - 1, Math.trunc(action.cursor)));
      return updateMission(state, {
        ...progress,
        visited: true,
        compared: false,
        runs: { ...progress.runs, [state.suite]: { ...run, cursor } },
      }, `Step ${cursor + 1} of ${run.history.length} restored. The comparison is paused; open it again after an attempt.`);
    }
    case 'case': {
      assertActionKeys(action, ['variant']);
      if (!isCaseVariant(action.variant)) throw new TypeError('Choose one of the two sample cases.');
      const progress = state.missions[state.missionId];
      if (progress.variant === action.variant) {
        return { ...state, message: 'This sample case is already selected. Your choices and saved steps are unchanged.' };
      }
      return updateMission(state, {
        ...createMissionProgress(state.missionId),
        variant: action.variant,
        visited: true,
        discovered: progress.discovered,
      }, 'Sample case changed. Both suites now start from the same new case. Their previous choices, replay history and comparison were cleared. Collected discoveries are kept.');
    }
    case 'compare': {
      assertActionKeys(action);
      if (!getCurrentSnapshot(state).attempted) {
        return { ...state, message: 'Run the current setup before opening the comparison.' };
      }
      return updateMission(state, { ...state.missions[state.missionId], compared: true },
        'Comparison opened. Read both workflows, including their setup needs and limits, before keeping the discovery.');
    }
    case 'discover': {
      assertActionKeys(action);
      const progress = state.missions[state.missionId];
      if (progress.discovered) {
        return { ...state, message: 'This discovery is already collected. You can keep exploring other choices.' };
      }
      if (!getCurrentSnapshot(state).attempted) {
        return { ...state, message: 'Run the current setup before collecting a discovery.' };
      }
      if (!hasMissionInteraction(progress)) {
        return { ...state, message: 'Change at least one sample choice in this mission before collecting a discovery.' };
      }
      if (!progress.compared) {
        return { ...state, message: 'Open the comparison and read both workflows before collecting this discovery.' };
      }
      return updateMission(state, { ...progress, discovered: true },
        'Discovery collected. Its takeaway is now in your discoveries, and you can continue experimenting.');
    }
    case 'reset-mission':
      assertActionKeys(action);
      return updateMission(state, createMissionProgress(state.missionId),
        'This mission was restarted for both suites and its discovery was cleared. Other missions and your assessment are unchanged.');
    case 'reset':
      assertActionKeys(action);
      return {
        ...createExperienceState(),
        message: 'Only the lab was reset. Your assessment and technical map were not changed.',
      };
    default:
      throw new TypeError('Choose a supported lab action.');
  }
}
