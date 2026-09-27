import type { CaseVariant, LabSuite, MissionInput, MissionOutcome } from '@/data/experience/types';
import { evaluateBrief, evaluateCalling, evaluateInsights } from './experienceProductivity';
import { evaluateAccess, evaluateDevice } from './experienceItAccess';
import { evaluateAgent, evaluateIncident, evaluateSharing } from './experienceProtection';

export function evaluateExperience(input: MissionInput, suite: LabSuite, variant: CaseVariant): MissionOutcome {
  switch (input.kind) {
    case 'brief': return evaluateBrief(input, suite, variant);
    case 'device': return evaluateDevice(input, suite, variant);
    case 'access': return evaluateAccess(input, suite, variant);
    case 'incident': return evaluateIncident(input, suite, variant);
    case 'sharing': return evaluateSharing(input, suite, variant);
    case 'agent': return evaluateAgent(input, suite, variant);
    case 'insights': return evaluateInsights(input, suite, variant);
    case 'calling': return evaluateCalling(input, suite, variant);
  }
}
