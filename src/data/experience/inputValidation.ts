import { ROLE_PATHS } from './roles';
import {
  LAB_SUITES, MISSION_IDS,
  type AccessInput, type AgentInput, type BriefInput, type CallingInput, type CaseVariant,
  type DeviceInput, type IncidentInput, type InsightsInput, type LabRole, type LabScreen,
  type LabSuite, type MissionId, type MissionInput, type SharingInput,
} from './types';

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Reflect.ownKeys(value).every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return typeof key === 'string' && descriptor?.enumerable === true && 'value' in descriptor;
  });
}

export function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return isPlainRecord(value)
    && Object.keys(value).length === keys.length
    && keys.every(key => Object.hasOwn(value, key));
}

export function isBoundedArray(value: unknown, maximum: number): value is unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype
    || value.length > maximum || Reflect.ownKeys(value).length !== value.length + 1) return false;
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    if (!descriptor?.enumerable || !('value' in descriptor)) return false;
  }
  return true;
}

function isChoice<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === 'string' && choices.some(choice => choice === value);
}

function isUniqueChoices<T extends string>(value: unknown, choices: readonly T[]): value is T[] {
  return isBoundedArray(value, choices.length)
    && value.every(item => isChoice(item, choices))
    && new Set(value).size === value.length;
}

export function isMissionId(value: unknown): value is MissionId {
  return isChoice(value, MISSION_IDS);
}

export function isLabSuite(value: unknown): value is LabSuite {
  return isChoice(value, LAB_SUITES);
}

export function isLabRole(value: unknown): value is LabRole {
  return ROLE_PATHS.some(role => role.id === value);
}

export function isLabScreen(value: unknown): value is LabScreen {
  return isChoice(value, ['workplace', 'mission', 'catalog', 'passport']);
}

export function isCaseVariant(value: unknown): value is CaseVariant {
  return value === 'everyday' || value === 'curveball';
}

export function isBriefInput(value: unknown): value is BriefInput {
  return hasExactKeys(value, ['kind', 'sources', 'focus', 'approach'])
    && value.kind === 'brief'
    && isUniqueChoices(value.sources, ['project', 'thread', 'notes', 'private'])
    && isChoice(value.focus, ['decision', 'risks', 'actions'])
    && isChoice(value.approach, ['manual', 'copilot']);
}

export function isDeviceInput(value: unknown): value is DeviceInput {
  return hasExactKeys(value, ['kind', 'enrolled', 'patched', 'requireCompliance', 'support'])
    && value.kind === 'device'
    && typeof value.enrolled === 'boolean'
    && typeof value.patched === 'boolean'
    && typeof value.requireCompliance === 'boolean'
    && isChoice(value.support, ['self', 'remote']);
}

export function isAccessInput(value: unknown): value is AccessInput {
  return hasExactKeys(value, ['kind', 'resource', 'verify', 'policyEnabled', 'privateConnector'])
    && value.kind === 'access'
    && isChoice(value.resource, ['work-files', 'private-app'])
    && isChoice(value.verify, ['password', 'mfa'])
    && typeof value.policyEnabled === 'boolean'
    && typeof value.privateConnector === 'boolean';
}

export function isIncidentInput(value: unknown): value is IncidentInput {
  return hasExactKeys(value, ['kind', 'clues', 'response', 'onboarded', 'analystAssistant'])
    && value.kind === 'incident'
    && isUniqueChoices(value.clues, ['email', 'endpoint', 'identity', 'benign'])
    && isChoice(value.response, ['investigate', 'isolate', 'dismiss'])
    && typeof value.onboarded === 'boolean'
    && typeof value.analystAssistant === 'boolean';
}

export function isSharingInput(value: unknown): value is SharingInput {
  return hasExactKeys(value, ['kind', 'target', 'classification', 'policyEnabled', 'remediate'])
    && value.kind === 'sharing'
    && isChoice(value.target, ['team', 'external', 'usb'])
    && isChoice(value.classification, ['public', 'confidential'])
    && typeof value.policyEnabled === 'boolean'
    && isChoice(value.remediate, ['none', 'redact', 'approved-share']);
}

export function isAgentInput(value: unknown): value is AgentInput {
  return hasExactKeys(value, ['kind', 'owner', 'permissions', 'task', 'policyEnabled'])
    && value.kind === 'agent'
    && isChoice(value.owner, ['none', 'maya', 'it'])
    && isChoice(value.permissions, ['project', 'all'])
    && isChoice(value.task, ['project', 'payroll'])
    && typeof value.policyEnabled === 'boolean';
}

export function isInsightsInput(value: unknown): value is InsightsInput {
  return hasExactKeys(value, ['kind', 'region', 'metric', 'finding', 'destination', 'colleagueLicensed'])
    && value.kind === 'insights'
    && isChoice(value.region, ['all', 'north', 'south'])
    && isChoice(value.metric, ['revenue', 'returns'])
    && isChoice(value.finding, ['growth', 'returns', 'no-issue'])
    && isChoice(value.destination, ['workbook', 'report'])
    && typeof value.colleagueLicensed === 'boolean';
}

export function isCallingInput(value: unknown): value is CallingInput {
  return hasExactKeys(value, ['kind', 'destination', 'route', 'phoneAssigned', 'pstnConnected'])
    && value.kind === 'calling'
    && isChoice(value.destination, ['meeting', 'colleague', 'customer'])
    && isChoice(value.route, ['direct', 'team'])
    && typeof value.phoneAssigned === 'boolean'
    && typeof value.pstnConnected === 'boolean';
}

export function isMissionInput(value: unknown): value is MissionInput {
  if (!isPlainRecord(value)) return false;
  switch (value.kind) {
    case 'brief': return isBriefInput(value);
    case 'device': return isDeviceInput(value);
    case 'access': return isAccessInput(value);
    case 'incident': return isIncidentInput(value);
    case 'sharing': return isSharingInput(value);
    case 'agent': return isAgentInput(value);
    case 'insights': return isInsightsInput(value);
    case 'calling': return isCallingInput(value);
    default: return false;
  }
}

export function areMissionInputsEqual(left: MissionInput, right: MissionInput): boolean {
  if (left.kind !== right.kind) return false;
  const other: Record<string, unknown> = { ...right };
  return Object.entries(left).every(([key, value]) => {
    const otherValue = other[key];
    return Array.isArray(value)
      ? Array.isArray(otherValue) && value.length === otherValue.length
        && value.every(item => otherValue.includes(item))
      : value === otherValue;
  });
}
