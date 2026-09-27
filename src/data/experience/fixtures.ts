import type { BriefSourceId, ClueId, InputFor, MissionId, MissionInput } from './types';

export const WORKPLACE = {
  name: 'Northstar',
  project: 'Project Lantern',
  employee: 'Maya Chen',
  colleague: 'Sam Rivera',
  disclaimer: 'A fictional workplace. Prepared examples, not live Microsoft services.',
} as const;

export const BRIEF_SOURCES: readonly {
  id: BriefSourceId; title: string; format: string; text: string; permitted: boolean;
}[] = [
  { id: 'project', title: 'Lantern project plan', format: 'Document', text: 'The pilot is ready. Launch depends on a completed accessibility review. Maya owns the launch decision.', permitted: true },
  { id: 'thread', title: 'Launch team conversation', format: 'Team conversation', text: 'Sam: the accessibility review is still open. Keep the pilot small until the review is complete.', permitted: true },
  { id: 'notes', title: 'Customer workshop notes', format: 'Meeting notes', text: 'Customers liked the simpler setup. Two participants needed clearer keyboard instructions. Sam will follow up.', permitted: true },
  { id: 'private', title: 'Board-only forecast', format: 'Restricted document', text: 'Not available to this employee. A work-grounded assistant does not override file permissions.', permitted: false },
];

export const INCIDENT_CLUES: readonly { id: ClueId; title: string; source: string; detail: string }[] = [
  { id: 'email', title: 'An unusual invoice message', source: 'Email', detail: 'A sample message asks Maya to open an unfamiliar invoice link. An email alert is a clue, not proof of compromise.' },
  { id: 'endpoint', title: 'A process follows the link', source: 'Endpoint', detail: 'The authored device timeline includes suspicious process activity after the message was opened.' },
  { id: 'identity', title: 'A new sign-in context', source: 'Identity', detail: 'A correlated identity observation appears in the same fictional incident window.' },
  { id: 'benign', title: 'The scheduled inventory task', source: 'Routine activity', detail: 'This known maintenance task ran as planned. It does not support the incident hypothesis.' },
];

export const BUSINESS_ROWS = [
  { region: 'north' as const, product: 'Lantern', revenue: 84_000, previousRevenue: 72_000, orders: 420, returns: 8 },
  { region: 'north' as const, product: 'Beacon', revenue: 62_000, previousRevenue: 58_000, orders: 310, returns: 7 },
  { region: 'south' as const, product: 'Lantern', revenue: 91_000, previousRevenue: 74_000, orders: 455, returns: 11 },
  { region: 'south' as const, product: 'Beacon', revenue: 48_000, previousRevenue: 46_000, orders: 240, returns: 6 },
];

export const INITIAL_INPUTS = {
  brief: { kind: 'brief', sources: [], focus: 'decision', approach: 'manual' },
  device: { kind: 'device', enrolled: false, patched: false, requireCompliance: false, support: 'self' },
  access: { kind: 'access', resource: 'work-files', verify: 'password', policyEnabled: false, privateConnector: false },
  incident: { kind: 'incident', clues: [], response: 'investigate', onboarded: false, analystAssistant: false },
  sharing: { kind: 'sharing', target: 'team', classification: 'public', policyEnabled: false, remediate: 'none' },
  agent: { kind: 'agent', owner: 'none', permissions: 'all', task: 'project', policyEnabled: false },
  insights: { kind: 'insights', region: 'all', metric: 'revenue', finding: 'no-issue', destination: 'workbook', colleagueLicensed: false },
  calling: { kind: 'calling', destination: 'meeting', route: 'direct', phoneAssigned: false, pstnConnected: false },
} satisfies { [K in MissionId]: InputFor<K> };

export function createMissionInput(id: MissionId): MissionInput {
  return structuredClone(INITIAL_INPUTS[id]);
}
