import { MISSION_IDS, type ExperienceMission, type MissionId } from './types';
import { PRODUCTIVITY_MISSIONS } from './missions/productivity';
import { IT_ACCESS_MISSIONS } from './missions/itAccess';
import { PROTECTION_MISSIONS } from './missions/protection';

const definitions = [...PRODUCTIVITY_MISSIONS, ...IT_ACCESS_MISSIONS, ...PROTECTION_MISSIONS];

export const EXPERIENCE_MISSIONS: readonly ExperienceMission[] = MISSION_IDS.map(id => {
  const matches = definitions.filter(mission => mission.id === id);
  if (matches.length !== 1) throw new Error(`Experience mission ${id} needs exactly one definition.`);
  return matches[0];
});

export function getExperienceMission(id: MissionId): ExperienceMission {
  const mission = EXPERIENCE_MISSIONS.find(item => item.id === id);
  if (!mission) throw new Error(`Unknown experience mission: ${id}`);
  return mission;
}
