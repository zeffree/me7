import type { LabRole, MissionId } from './types';

export const ROLE_PATHS: readonly { id: LabRole; label: string; description: string; missions: readonly MissionId[] }[] = [
  { id: 'everyone', label: 'A little of everything', description: 'Start with a real task. Follow your curiosity from there.', missions: ['brief', 'device', 'access', 'incident', 'sharing', 'agent', 'insights', 'calling'] },
  { id: 'business', label: 'Get work done', description: 'Bring a brief, an agent and the right people together.', missions: ['brief', 'agent', 'calling', 'insights'] },
  { id: 'it', label: 'Run IT', description: 'Set up a workplace that people and agents can actually use.', missions: ['device', 'access', 'agent', 'incident'] },
  { id: 'security', label: 'Protect the business', description: 'Follow the evidence, protect information and keep access deliberate.', missions: ['access', 'incident', 'sharing', 'agent'] },
  { id: 'leader', label: 'See the bigger picture', description: 'Connect better-informed work to the controls it still needs.', missions: ['brief', 'insights', 'calling', 'sharing'] },
];

export function getRolePath(role: LabRole) {
  const path = ROLE_PATHS.find(item => item.id === role);
  if (!path) throw new Error(`Unknown experience role: ${role}`);
  return path;
}
