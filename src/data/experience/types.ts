import type { DomainId } from '../categories';

export const MISSION_IDS = ['brief', 'device', 'access', 'incident', 'sharing', 'agent', 'insights', 'calling'] as const;
export const LAB_SUITES = ['o365e3', 'm365e7'] as const;
export type MissionId = typeof MISSION_IDS[number];
export type LabSuite = typeof LAB_SUITES[number];
export type CaseVariant = 'everyday' | 'curveball';
export type LabRole = 'everyone' | 'business' | 'it' | 'security' | 'leader';
export type LabScreen = 'workplace' | 'mission' | 'catalog' | 'passport';
export type BriefSourceId = 'project' | 'thread' | 'notes' | 'private';
export type ClueId = 'email' | 'endpoint' | 'identity' | 'benign';

export interface BriefInput {
  kind: 'brief';
  sources: BriefSourceId[];
  focus: 'decision' | 'risks' | 'actions';
  approach: 'manual' | 'copilot';
}
export interface DeviceInput {
  kind: 'device';
  enrolled: boolean;
  patched: boolean;
  requireCompliance: boolean;
  support: 'self' | 'remote';
}
export interface AccessInput {
  kind: 'access';
  resource: 'work-files' | 'private-app';
  verify: 'password' | 'mfa';
  policyEnabled: boolean;
  privateConnector: boolean;
}
export interface IncidentInput {
  kind: 'incident';
  clues: ClueId[];
  response: 'investigate' | 'isolate' | 'dismiss';
  onboarded: boolean;
  analystAssistant: boolean;
}
export interface SharingInput {
  kind: 'sharing';
  target: 'team' | 'external' | 'usb';
  classification: 'public' | 'confidential';
  policyEnabled: boolean;
  remediate: 'none' | 'redact' | 'approved-share';
}
export interface AgentInput {
  kind: 'agent';
  owner: 'none' | 'maya' | 'it';
  permissions: 'project' | 'all';
  task: 'project' | 'payroll';
  policyEnabled: boolean;
}
export interface InsightsInput {
  kind: 'insights';
  region: 'all' | 'north' | 'south';
  metric: 'revenue' | 'returns';
  finding: 'growth' | 'returns' | 'no-issue';
  destination: 'workbook' | 'report';
  colleagueLicensed: boolean;
}
export interface CallingInput {
  kind: 'calling';
  destination: 'meeting' | 'colleague' | 'customer';
  route: 'direct' | 'team';
  phoneAssigned: boolean;
  pstnConnected: boolean;
}

export type MissionInput = BriefInput | DeviceInput | AccessInput | IncidentInput | SharingInput | AgentInput | InsightsInput | CallingInput;
export type InputFor<K extends MissionId> = Extract<MissionInput, { kind: K }>;

export interface MissionActivityProps<K extends MissionId> {
  input: InputFor<K>;
  suite: LabSuite;
  variant: CaseVariant;
  onChange: (input: InputFor<K>) => void;
}

export interface ExperienceMission {
  id: MissionId;
  title: string;
  shortTitle: string;
  room: string;
  domain: DomainId;
  intro: string;
  objective: string;
  product: string;
  categoryIds: readonly string[];
  sourceIds: readonly string[];
  variants: Record<CaseVariant, { label: string; description: string }>;
  comparison: Record<LabSuite, string>;
  prerequisites: readonly string[];
  boundary: string;
  takeaway: string;
}

export interface MissionOutcome {
  status: 'ready' | 'success' | 'review' | 'blocked' | 'needs-setup' | 'separate';
  title: string;
  summary: string;
  explanation: readonly string[];
  nextAction: string;
  facts?: readonly { label: string; value: string }[];
}

export interface MissionSnapshot {
  input: MissionInput;
  attempted: boolean;
}
export interface MissionRun {
  history: MissionSnapshot[];
  cursor: number;
}
export interface MissionProgress {
  variant: CaseVariant;
  runs: Record<LabSuite, MissionRun>;
  visited: boolean;
  compared: boolean;
  discovered: boolean;
}
export interface ExperienceState {
  version: 1;
  screen: LabScreen;
  missionId: MissionId;
  suite: LabSuite;
  role: LabRole;
  missions: Record<MissionId, MissionProgress>;
  message: string;
}

export type ExperienceAction =
  | { type: 'enter'; id: MissionId }
  | { type: 'screen'; screen: LabScreen }
  | { type: 'suite'; suite: LabSuite }
  | { type: 'role'; role: LabRole }
  | { type: 'edit'; input: MissionInput }
  | { type: 'case'; variant: CaseVariant }
  | { type: 'seek'; cursor: number }
  | { type: 'attempt' | 'compare' | 'discover' | 'reset-mission' | 'reset' };
