import type { Coverage } from './categories';
import type { BaselineSkuId } from './skus';

export type ArchitecturePillarId = 'identity' | 'endpoint' | 'network' | 'apps' | 'data' | 'infrastructure' | 'secops';
export type ArchitectureBundle = 'e5' | 'copilot' | 'entra-suite' | 'agent365' | 'context' | 'external';
export type ArchitectureEdgeKind = 'access' | 'signal' | 'policy' | 'data' | 'governance' | 'response';
export type ArchitectureScenarioId = 'secure-work' | 'contain-threat' | 'govern-agent';
export type ScenarioInputId = 'deviceCompliant' | 'riskySignIn' | 'automaticResponse' | 'agentAuthorized' | 'dataPolicyEnabled';
export type ScenarioInputs = Record<ScenarioInputId, boolean>;
export type ScenarioStatus = 'ready' | 'allowed' | 'challenged' | 'blocked' | 'detected' | 'contained' | 'review' | 'complete';

export interface ArchitecturePillar {
  id: ArchitecturePillarId;
  label: string;
  description: string;
}

export interface ArchitectureNode {
  id: string;
  label: string;
  shortLabel: string;
  pillar: ArchitecturePillarId;
  bundle: ArchitectureBundle;
  kind: 'person' | 'device' | 'service' | 'resource' | 'agent';
  description: string;
  technical: string;
  prerequisites: readonly string[];
  categoryIds: readonly string[];
  sourceIds: readonly string[];
  /** Only for capabilities with no corresponding financial-catalog category. */
  baselineCoverage?: Record<BaselineSkuId, Coverage>;
  coverageNote?: string;
}

export interface ArchitectureEdge {
  id: string;
  from: string;
  to: string;
  kind: ArchitectureEdgeKind;
  label: string;
  description: string;
  sourceIds: readonly string[];
}

export interface ArchitectureCoverage {
  summary: Coverage | 'mixed' | 'context';
  label: string;
  items: readonly { label: string; coverage: Coverage }[];
  note: string;
}

export interface ScenarioControl {
  id: ScenarioInputId;
  label: string;
  description: string;
  defaultValue: boolean;
  onLabel: string;
  offLabel: string;
}

export interface ScenarioStep {
  id: string;
  title: string;
  summary: string;
  detail: string;
  nodeIds: readonly string[];
  edgeIds: readonly string[];
  focusNodeId: string;
  status: ScenarioStatus;
}

export interface ScenarioBranch {
  id: string;
  when: Partial<ScenarioInputs>;
  outcome: ScenarioStatus;
  outcomeTitle: string;
  outcomeSummary: string;
  steps: readonly ScenarioStep[];
}

export interface ArchitectureScenario {
  id: ArchitectureScenarioId;
  title: string;
  shortTitle: string;
  description: string;
  goal: string;
  assumption: string;
  principle: 'Verify explicitly' | 'Assume breach' | 'Use least privilege';
  controls: readonly ScenarioControl[];
  /** First matching branch wins. The final branch must have an empty condition. */
  branches: readonly ScenarioBranch[];
}

export type ArchitectureSelection = { kind: 'node' | 'edge'; id: string };
export type ArchitectureView = '3d' | '2d';
export type ArchitectureMode = 'guided' | 'explore';
export type ArchitectureCamera = 'overview' | 'follow' | 'exploded';

export interface ArchitectureState {
  scenarioId: ArchitectureScenarioId;
  inputs: ScenarioInputs;
  checkpoint: number;
  playing: boolean;
  mode: ArchitectureMode;
  selection: ArchitectureSelection | null;
  pillar: ArchitecturePillarId | 'all';
  baseline: BaselineSkuId;
  view: ArchitectureView;
  camera: ArchitectureCamera;
  cameraRevision: number;
  followCamera: boolean;
  message: string;
}

export type ArchitectureAction =
  | { type: 'scenario'; id: ArchitectureScenarioId }
  | { type: 'input'; id: ScenarioInputId; value: boolean }
  | { type: 'play' | 'pause' | 'tick' | 'restart' | 'reset' | 'camera-interacted' }
  | { type: 'seek'; checkpoint: number }
  | { type: 'mode'; mode: ArchitectureMode }
  | { type: 'select'; selection: ArchitectureSelection | null }
  | { type: 'pillar'; pillar: ArchitecturePillarId | 'all' }
  | { type: 'baseline'; baseline: BaselineSkuId }
  | { type: 'view'; view: ArchitectureView }
  | { type: 'camera'; camera: ArchitectureCamera };

export interface ArchitectureSceneProps {
  state: ArchitectureState;
  step: ScenarioStep;
  visitedEdgeIds: readonly string[];
  reducedMotion: boolean;
  theme: 'light' | 'dark';
  active: boolean;
  onSelect: (selection: ArchitectureSelection | null) => void;
  onCameraInteraction: () => void;
  onReady: () => void;
  onContextLost: (message: string) => void;
}
