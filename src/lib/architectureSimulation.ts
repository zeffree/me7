import { ARCHITECTURE_PILLARS, getArchitectureEdge, getArchitectureNode } from '@/data/architecture';
import { getArchitectureScenario } from '@/data/architectureScenarios';
import type {
  ArchitectureAction,
  ArchitectureScenarioId,
  ArchitectureState,
  ScenarioBranch,
  ScenarioInputs,
  ScenarioStatus,
  ScenarioStep,
} from '@/data/architectureTypes';
import { getBaseline } from '@/data/skus';

export const PLAYBACK_INTERVAL_MS = 4400;

export const SCENARIO_STATUS_LABELS: Record<ScenarioStatus, string> = {
  ready: 'Ready to begin',
  allowed: 'Access permitted',
  challenged: 'Verification required',
  blocked: 'Request stopped',
  detected: 'Signal detected',
  contained: 'Containment applied',
  review: 'Review needed',
  complete: 'Work completed',
};

const DEFAULT_INPUTS: ScenarioInputs = {
  deviceCompliant: true,
  riskySignIn: false,
  automaticResponse: true,
  agentAuthorized: true,
  dataPolicyEnabled: true,
};

export function getScenarioInputs(id: ArchitectureScenarioId): ScenarioInputs {
  const inputs = { ...DEFAULT_INPUTS };
  for (const control of getArchitectureScenario(id).controls) inputs[control.id] = control.defaultValue;
  return inputs;
}

export function createArchitectureState(scenarioId: ArchitectureScenarioId = 'secure-work'): ArchitectureState {
  return {
    scenarioId,
    inputs: getScenarioInputs(scenarioId),
    checkpoint: 0,
    playing: false,
    mode: 'guided',
    selection: null,
    pillar: 'all',
    baseline: 'm365e5',
    view: '3d',
    camera: 'overview',
    cameraRevision: 0,
    followCamera: false,
    message: '',
  };
}

export function getScenarioBranch(state: Pick<ArchitectureState, 'scenarioId' | 'inputs'>): ScenarioBranch {
  const scenario = getArchitectureScenario(state.scenarioId);
  const branch = scenario.branches.find(candidate =>
    Object.entries(candidate.when).every(([key, value]) =>
      Object.entries(state.inputs).some(([inputKey, inputValue]) => inputKey === key && inputValue === value),
    ),
  );
  if (!branch || branch.steps.length === 0) throw new Error(`No complete architecture journey for ${scenario.id}.`);
  return branch;
}

export function getActiveStep(state: ArchitectureState): ScenarioStep {
  const step = getScenarioBranch(state).steps[state.checkpoint];
  if (!step) throw new RangeError(`Invalid architecture checkpoint: ${state.checkpoint}.`);
  return step;
}

export function getVisitedEdgeIds(state: ArchitectureState): string[] {
  return [...new Set(getScenarioBranch(state).steps.slice(0, state.checkpoint + 1).flatMap(step => step.edgeIds))];
}

function seek(state: ArchitectureState, checkpoint: number): ArchitectureState {
  if (!Number.isFinite(checkpoint)) throw new RangeError('Architecture checkpoints must be finite numbers.');
  const last = getScenarioBranch(state).steps.length - 1;
  return {
    ...state,
    checkpoint: Math.max(0, Math.min(last, Math.trunc(checkpoint))),
    playing: false,
    selection: null,
    mode: 'guided',
    message: '',
  };
}

export function architectureReducer(state: ArchitectureState, action: ArchitectureAction): ArchitectureState {
  switch (action.type) {
    case 'scenario':
      return {
        ...createArchitectureState(action.id),
        baseline: state.baseline,
        view: state.view,
        cameraRevision: state.cameraRevision + 1,
        message: 'New mission ready. Its example conditions have been restored.',
      };
    case 'input': {
      const control = getArchitectureScenario(state.scenarioId).controls.find(item => item.id === action.id);
      if (!control) throw new Error(`Condition ${action.id} is not part of this mission.`);
      return {
        ...state,
        inputs: { ...state.inputs, [action.id]: action.value },
        checkpoint: 0,
        playing: false,
        selection: null,
        mode: 'guided',
        message: `${control.label}: ${action.value ? control.onLabel : control.offLabel}. Replay starts at the first checkpoint.`,
      };
    }
    case 'play': {
      const last = getScenarioBranch(state).steps.length - 1;
      return {
        ...state,
        checkpoint: state.checkpoint === last ? 0 : state.checkpoint,
        playing: last > 0,
        mode: 'guided',
        selection: null,
        pillar: 'all',
        camera: 'follow',
        followCamera: true,
        cameraRevision: state.cameraRevision + 1,
        message: '',
      };
    }
    case 'pause':
      return { ...state, playing: false, message: 'Mission paused. Explore a component or move between checkpoints.' };
    case 'tick': {
      if (!state.playing) return state;
      const last = getScenarioBranch(state).steps.length - 1;
      const checkpoint = Math.min(last, state.checkpoint + 1);
      return { ...state, checkpoint, playing: checkpoint < last, message: '' };
    }
    case 'seek':
      return seek(state, action.checkpoint);
    case 'restart':
      return {
        ...seek(state, 0),
        pillar: 'all',
        camera: 'overview',
        followCamera: false,
        cameraRevision: state.cameraRevision + 1,
        message: 'Replay returned to the beginning. Your what-if conditions are unchanged.',
      };
    case 'reset':
      return {
        ...createArchitectureState(state.scenarioId),
        baseline: state.baseline,
        view: state.view,
        cameraRevision: state.cameraRevision + 1,
        message: 'This mission has been reset. Your comparison lens and assessment are unchanged.',
      };
    case 'mode':
      return {
        ...state,
        mode: action.mode,
        playing: false,
        selection: null,
        pillar: 'all',
        followCamera: false,
        camera: 'overview',
        cameraRevision: state.cameraRevision + 1,
        message: action.mode === 'explore' ? 'Explore any component or connection. Your mission is paused.' : 'Your mission is ready to resume.',
      };
    case 'select': {
      const selection = action.selection;
      const item = selection?.kind === 'node' ? getArchitectureNode(selection.id)
        : selection?.kind === 'edge' ? getArchitectureEdge(selection.id) : null;
      return {
        ...state,
        selection,
        playing: false,
        pillar: 'all',
        followCamera: false,
        cameraRevision: state.cameraRevision + 1,
        message: item ? `${item.label} selected. Its explanation is available in the inspector.` : '',
      };
    }
    case 'pillar':
      if (action.pillar !== 'all' && !ARCHITECTURE_PILLARS.some(pillar => pillar.id === action.pillar)) {
        throw new Error(`Unknown architecture pillar: ${action.pillar}.`);
      }
      return {
        ...state,
        pillar: action.pillar,
        selection: null,
        playing: false,
        mode: 'explore',
        camera: 'overview',
        followCamera: false,
        cameraRevision: state.cameraRevision + 1,
        message: '',
      };
    case 'baseline':
      getBaseline(action.baseline);
      return { ...state, baseline: action.baseline, message: 'Comparison labels updated. The simulated E7 setup and your assessment are unchanged.' };
    case 'view':
      return { ...state, view: action.view, message: `${action.view === '2d' ? '2D' : '3D'} view. Your mission and selection are unchanged.` };
    case 'camera':
      return {
        ...state,
        camera: action.camera,
        cameraRevision: state.cameraRevision + 1,
        followCamera: action.camera === 'follow',
        selection: null,
        message: '',
      };
    case 'camera-interacted':
      return state.followCamera
        ? { ...state, followCamera: false, message: 'Camera follow paused. You can resume following the request.' }
        : state;
  }
}
