import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '@/data/categories';
import { getSource } from '@/data/sources';
import { INCIDENT_CLUES } from '@/data/experience/fixtures';
import { PROTECTION_MISSIONS, SHARING_SAMPLE_FIELDS } from '@/data/experience/missions/protection';
import { LAB_SUITES, type AgentInput, type CaseVariant, type ClueId, type IncidentInput, type MissionOutcome, type SharingInput } from '@/data/experience/types';
import { evaluateAgent, evaluateIncident, evaluateSharing, getAgentAccess, getAgentToolControl, getIncidentBoard, getSharingPreview } from './experienceProtection';

const variants: readonly CaseVariant[] = ['everyday', 'curveball'];
const incident: IncidentInput = { kind: 'incident', clues: ['email', 'endpoint'], response: 'investigate', onboarded: false, analystAssistant: false };
const sharing: SharingInput = { kind: 'sharing', target: 'team', classification: 'confidential', policyEnabled: false, remediate: 'none' };
const agent: AgentInput = { kind: 'agent', owner: 'maya', permissions: 'project', task: 'project', policyEnabled: false };
const words = (outcome: MissionOutcome) => [outcome.title, outcome.summary, ...outcome.explanation, outcome.nextAction].join(' ');

function expectComplete(outcome: MissionOutcome) {
  expect(['ready', 'success', 'review', 'blocked', 'needs-setup', 'separate']).toContain(outcome.status);
  expect(outcome.title.length).toBeGreaterThan(8);
  expect(outcome.summary.length).toBeGreaterThan(20);
  expect(outcome.explanation.length).toBeGreaterThan(0);
  expect(outcome.nextAction.length).toBeGreaterThan(10);
}

describe('protection mission definitions', () => {
  it('supplies the three complete missions with real categories and exact suite comparisons', () => {
    expect(PROTECTION_MISSIONS.map(mission => mission.id)).toEqual(['incident', 'sharing', 'agent']);
    for (const mission of PROTECTION_MISSIONS) {
      expect(mission.categoryIds.length).toBeGreaterThan(0);
      for (const id of mission.categoryIds) expect(CATEGORIES.some(category => category.id === id)).toBe(true);
      for (const id of mission.sourceIds) expect(getSource(id), `${mission.id}: missing source ${id}`).toBeDefined();
      expect(Object.keys(mission.comparison)).toEqual(['o365e3', 'm365e7']);
      expect(mission.prerequisites.length).toBeGreaterThan(1);
      for (const value of [mission.intro, mission.objective, mission.product, mission.boundary, mission.takeaway]) expect(value.length).toBeGreaterThan(10);
      expect(mission.variants.curveball.description).not.toEqual(mission.variants.everyday.description);
      expect(JSON.stringify(mission)).not.toMatch(/\$\d|savings|\d+%/i);
    }
  });

  it('declares the evidence links without treating all Purview or agent runtime as included', () => {
    expect(PROTECTION_MISSIONS[0].sourceIds).toEqual([
      'architecture-defender-xdr', 'architecture-attack-disruption', 'security-copilot-inclusion', 'm365-packaging-2026', 'experience-defender-office-plans',
    ]);
    expect(PROTECTION_MISSIONS[1].sourceIds).toContain('experience-endpoint-dlp');
    expect(PROTECTION_MISSIONS[1].boundary).toMatch(/Retention is not backup/);
    expect(PROTECTION_MISSIONS[1].boundary).toMatch(/not an entitlement to all Purview Data Governance/);
    expect(PROTECTION_MISSIONS[2].sourceIds).toEqual([
      'architecture-agent365', 'architecture-agent-data', 'architecture-copilot-data', 'experience-agent365-licensing', 'e7-announcement',
    ]);
    expect(PROTECTION_MISSIONS[2].boundary).toMatch(/not an agent builder or unlimited runtime/);
    expect(PROTECTION_MISSIONS[2].comparison.o365e3).toMatch(/includes basic Agent 365 inventory, owner reassignment and core administration/);
    expect(PROTECTION_MISSIONS[2].comparison.m365e7).toMatch(/policy templates and tool controls/);
    expect(PROTECTION_MISSIONS[2].boundary).toMatch(/does not automatically inherit source sensitivity labels/);
  });
});

describe('incident evidence and response', () => {
  it('uses the fixture observations and ignores duplicates as corroboration', () => {
    const input: IncidentInput = { ...incident, clues: ['identity', 'identity', 'benign'] };
    const board = getIncidentBoard(input, 'everyday');
    expect(board.selected).toEqual(INCIDENT_CLUES.filter(clue => clue.id === 'identity' || clue.id === 'benign'));
    expect(board.relevant).toHaveLength(1);
    expect(board.corroborated).toBe(false);
    expect(board.relations).toEqual(['Inventory task: routine activity, deliberately left outside the incident chain.']);
  });

  it('accepts ordinary manual review on Office 365 E3 with its existing email protection', () => {
    const outcome = evaluateIncident(incident, 'o365e3', 'everyday');
    expect(outcome.status).toBe('success');
    expect(outcome.summary).toMatch(/manual review/);
    expect(words(outcome)).toMatch(/Defender for Office 365 Plan 1 under the July 2026/);
    expect(words(outcome)).toMatch(/includes email investigation and Real-time detections, not only preventive filtering/);
    expect(outcome.facts).toContainEqual({ label: 'Containment', value: 'Not asserted; no live action' });
  });

  it('keeps manual triage useful on E7 without pretending workloads are onboarded', () => {
    const outcome = evaluateIncident(incident, 'm365e7', 'everyday');
    expect(outcome.status).toBe('success');
    expect(outcome.summary).toMatch(/manual review/);
    expect(outcome.facts).toContainEqual({ label: 'Response prerequisites', value: 'Not verified' });
  });

  it.each(LAB_SUITES)('%s identifies the identity fixture as cloud risk, not an assumed AD sensor or bundled source', suite => {
    const outcome = evaluateIncident({ ...incident, clues: ['email', 'endpoint', 'identity'] }, suite, 'everyday');
    expect(words(outcome)).toMatch(/identity clue is Entra ID Protection cloud-risk context/);
    expect(words(outcome)).toMatch(/not an assumed on-premises AD sensor/);
    expect(words(outcome)).toMatch(/requires licensed, onboarded sources/);
    expect(words(outcome)).toMatch(/practice observations do not add their entitlements/);
  });

  it.each(LAB_SUITES)('%s never isolates on a single observation, duplicates or identity context alone', suite => {
    const selections: ClueId[][] = [[], ['email'], ['endpoint'], ['identity'], ['benign'], ['identity', 'identity'], ['email', 'identity'], ['endpoint', 'benign']];
    for (const clues of selections) {
      for (const variant of variants) {
        const outcome = evaluateIncident({ ...incident, clues, response: 'isolate', onboarded: true }, suite, variant);
        expect(outcome.status).toBe('review');
        expect(outcome.nextAction).toMatch(/Investigate/);
        expect(getIncidentBoard({ ...incident, clues }, variant).corroborated).toBe(false);
      }
    }
  });

  it('does not treat an empty board or routine activity alone as completed investigation', () => {
    for (const suite of LAB_SUITES) {
      for (const variant of variants) {
        for (const clues of [[], ['benign']] satisfies ClueId[][]) {
          expect(evaluateIncident({ ...incident, clues }, suite, variant).status).toBe('review');
        }
      }
    }
  });

  it('requires E7 response support and permissions after evidence is connected', () => {
    const input: IncidentInput = { ...incident, response: 'isolate' };
    const missing = evaluateIncident(input, 'm365e7', 'everyday');
    expect(missing.status).toBe('needs-setup');
    expect(words(missing)).toMatch(/response permissions/);
    const prepared = evaluateIncident({ ...input, onboarded: true }, 'm365e7', 'everyday');
    expect(prepared.status).toBe('success');
    expect(prepared.title).toMatch(/request is ready for review/);
    expect(words(prepared)).toMatch(/neither attack confirmation nor successful containment is guaranteed/);
  });

  it('does not let the setup switch add endpoint response or Security Copilot to Office 365 E3', () => {
    expect(evaluateIncident({ ...incident, response: 'isolate', onboarded: true }, 'o365e3', 'everyday').status).toBe('separate');
    const preview = evaluateIncident({ ...incident, analystAssistant: true, onboarded: true }, 'o365e3', 'everyday');
    expect(preview.status).toBe('separate');
    expect(words(preview)).toMatch(/prepared briefing is a preview/);
    expect(evaluateIncident({ ...incident, analystAssistant: false }, 'o365e3', 'everyday').status).toBe('success');
  });

  it('labels Security Copilot assistance as prepared, capacity-limited and human-reviewed', () => {
    expect(evaluateIncident({ ...incident, analystAssistant: true }, 'm365e7', 'everyday').status).toBe('needs-setup');
    const outcome = evaluateIncident({ ...incident, analystAssistant: true, onboarded: true }, 'm365e7', 'everyday');
    expect(outcome.status).toBe('success');
    expect(words(outcome)).toMatch(/not live AI/);
    expect(words(outcome)).toMatch(/Security Compute Unit capacity/);
    expect(words(outcome)).toMatch(/human must check/);
  });

  it.each(LAB_SUITES)('%s prefers investigation in the noisy case even when every clue is selected', suite => {
    const input: IncidentInput = { ...incident, onboarded: true, clues: ['email', 'endpoint', 'identity', 'benign'] };
    expect(getIncidentBoard(input, 'curveball').corroborated).toBe(false);
    expect(evaluateIncident({ ...input, response: 'isolate' }, suite, 'curveball').status).toBe('review');
    expect(evaluateIncident({ ...input, response: 'dismiss' }, suite, 'curveball').status).toBe('review');
    const investigating = evaluateIncident(input, suite, 'curveball');
    expect(investigating.status).toBe('success');
    expect(words(investigating)).toMatch(/timestamp is unverified/);
    expect(investigating.summary).toMatch(/rather than claim an attack or containment/);
  });

  it('does not mistake dismissal of routine work for closure of the invoice incident', () => {
    const outcome = evaluateIncident({ ...incident, clues: ['benign'], response: 'dismiss' }, 'o365e3', 'everyday');
    expect(outcome.status).toBe('review');
    expect(outcome.summary).toMatch(/set aside without dismissing the unusual invoice/);
  });

  it('is deterministic, complete and non-mutating across every supported control combination', () => {
    const ids = INCIDENT_CLUES.map(clue => clue.id);
    for (let mask = 0; mask < 2 ** ids.length; mask++) {
      const clues = ids.filter((_, index) => (mask & (1 << index)) !== 0);
      for (const response of ['investigate', 'isolate', 'dismiss'] as const) {
        for (const onboarded of [false, true]) {
          for (const analystAssistant of [false, true]) {
            const input: IncidentInput = { ...incident, clues, response, onboarded, analystAssistant };
            Object.freeze(input.clues);
            Object.freeze(input);
            const before = JSON.stringify(input);
            for (const suite of LAB_SUITES) {
              for (const variant of variants) {
                const outcome = evaluateIncident(input, suite, variant);
                expectComplete(outcome);
                expect(evaluateIncident(input, suite, variant)).toEqual(outcome);
              }
            }
            expect(JSON.stringify(input)).toBe(before);
          }
        }
      }
    }
  });
});

describe('document content, permissions and scoped USB protection', () => {
  it('does not declassify the source when Public is selected', () => {
    const preview = getSharingPreview({ ...sharing, classification: 'public' }, 'everyday');
    expect(preview.hasSensitiveContent).toBe(true);
    expect(preview.labelMismatch).toBe(true);
    expect(preview.remainingSensitive.map(field => field.id)).toEqual(['contact', 'contract']);
    expect(preview.fields.some(field => field.removed)).toBe(false);
  });

  it('uses an actually changed, prepared outgoing extract without changing the original fixture', () => {
    const before = JSON.stringify(SHARING_SAMPLE_FIELDS);
    const preview = getSharingPreview({ ...sharing, classification: 'public', remediate: 'redact' }, 'everyday');
    expect(preview.fields.filter(field => field.removed).map(field => field.id)).toEqual(['contact', 'contract']);
    expect(preview.fields.filter(field => !field.removed).map(field => field.id)).toEqual(['project', 'update']);
    expect(preview.publicExtract).toBe(true);
    expect(preview.hasSensitiveContent).toBe(false);
    expect(JSON.stringify(SHARING_SAMPLE_FIELDS)).toBe(before);
  });

  it.each(LAB_SUITES)('%s supports ordinary confidential team collaboration without advanced USB enforcement', suite => {
    for (const policyEnabled of [false, true]) {
      const outcome = evaluateSharing({ ...sharing, policyEnabled }, suite, 'everyday');
      expect(outcome.status).toBe('success');
      expect(outcome.summary).toMatch(/already grants the Lantern team access/);
    }
  });

  it('models Block only for the supported E7 USB rule, including content mislabeled Public', () => {
    for (const variant of variants) {
      for (const classification of ['public', 'confidential'] as const) {
        const outcome = evaluateSharing({ ...sharing, target: 'usb', classification, policyEnabled: true }, 'm365e7', variant);
        expect(outcome.status).toBe('blocked');
        expect(outcome.title).toMatch(/scoped rule blocks this USB copy/);
        expect(words(outcome)).toMatch(/supported, onboarded endpoint/);
        if (classification === 'public') expect(outcome.summary).toMatch(/content condition still matches/);
      }
    }
  });

  it('keeps labels separate from E7 setup and E3 advanced endpoint entitlement', () => {
    const copy: SharingInput = { ...sharing, target: 'usb' };
    expect(evaluateSharing(copy, 'm365e7', 'everyday').status).toBe('needs-setup');
    for (const policyEnabled of [false, true]) {
      const baseline = evaluateSharing({ ...copy, policyEnabled }, 'o365e3', 'everyday');
      expect(baseline.status).toBe('separate');
      expect(baseline.summary).toMatch(/No USB block is attributed to Office 365 E3/);
      expect(words(baseline)).toMatch(/baseline information protection and DLP/);
    }
  });

  it.each(LAB_SUITES)('%s uses actual recipient permissions, not the USB switch, for external sharing', suite => {
    const original: SharingInput = { ...sharing, target: 'external' };
    const off = evaluateSharing(original, suite, 'everyday');
    const on = evaluateSharing({ ...original, policyEnabled: true }, suite, 'everyday');
    expect(off.status).toBe('blocked');
    expect(off.title).toMatch(/outside this document’s permissions/);
    expect(on).toEqual(off);
    expect(words(on)).toMatch(/not a universal E7 DLP rule/);
  });

  it.each(LAB_SUITES)('%s allows the owner-reviewed clean public extract on each destination', suite => {
    for (const target of ['team', 'external', 'usb'] as const) {
      const input: SharingInput = { ...sharing, target, classification: 'public', remediate: 'redact', policyEnabled: true };
      const outcome = evaluateSharing(input, suite, 'everyday');
      expect(outcome.status).toBe('success');
      expect(outcome.summary).toMatch(/contact and contract lines are visibly removed/);
      expect(words(outcome)).toMatch(/owner has approved this clean extract/);
    }
  });

  it('still matches the Confidential label on a clean USB extract when that scoped rule is on', () => {
    const outcome = evaluateSharing({ ...sharing, target: 'usb', remediate: 'redact', policyEnabled: true }, 'm365e7', 'everyday');
    expect(outcome.status).toBe('blocked');
    expect(words(outcome)).toMatch(/confidential content or label/);
  });

  it.each(LAB_SUITES)('%s cannot turn the curveball extract into a public release', suite => {
    for (const target of ['team', 'external', 'usb'] as const) {
      for (const classification of ['public', 'confidential'] as const) {
        const input: SharingInput = { ...sharing, target, classification, remediate: 'redact', policyEnabled: true };
        const preview = getSharingPreview(input, 'curveball');
        expect(preview.remainingSensitive.map(field => field.id)).toEqual(['care']);
        expect(preview.publicExtract).toBe(false);
        expect(evaluateSharing(input, suite, 'curveball').status).not.toBe('success');
      }
    }
  });

  it.each(LAB_SUITES)('%s can use the already-authorised route in both cases without expanding rights', suite => {
    for (const variant of variants) {
      for (const target of ['team', 'external', 'usb'] as const) {
        const input: SharingInput = { ...sharing, target, remediate: 'approved-share' };
        const outcome = evaluateSharing(input, suite, variant);
        expect(outcome.status).toBe('success');
        expect(words(outcome)).toMatch(/Choosing it does not grant or expand permissions/);
        expect(getSharingPreview(input, variant).hasSensitiveContent).toBe(true);
        if (target === 'usb') {
          expect(outcome.summary).toMatch(/No USB copy is made/);
          expect(outcome.facts).toContainEqual({ label: 'Handling route', value: 'Owner-approved named-recipient link' });
        }
        expect(evaluateSharing({ ...input, classification: 'public' }, suite, variant).status).toBe('review');
      }
    }
  });

  it('requires the restricted review route even when the curveball is correctly labeled', () => {
    const outcome = evaluateSharing({ ...sharing, remediate: 'redact' }, 'm365e7', 'curveball');
    expect(outcome.status).toBe('review');
    expect(words(outcome)).toMatch(/ordinary team workspace/);
    expect(outcome.nextAction).toMatch(/owner-approved named-recipient link/);
  });

  it('keeps USB policy exceptions pending and the pre-approved link a separate route', () => {
    const input: SharingInput = { ...sharing, target: 'usb', policyEnabled: true };
    const blocked = evaluateSharing(input, 'm365e7', 'everyday');
    expect(blocked.status).toBe('blocked');
    expect(words(blocked)).toMatch(/previously saved, supported local file on an onboarded physical Windows endpoint inside the enforced scope/);
    expect(words(blocked)).toMatch(/Requested policy exceptions remain pending/);
    const rerouted = evaluateSharing({ ...input, remediate: 'approved-share' }, 'm365e7', 'everyday');
    expect(rerouted.status).toBe('success');
    expect(rerouted.summary).toMatch(/No USB copy is made/);
    expect(words(rerouted)).toMatch(/does not grant or expand permissions, approve an exception or override the USB policy/);
  });

  it('is deterministic, complete and non-mutating across destination, policy, label and handling choices', () => {
    for (const target of ['team', 'external', 'usb'] as const) {
      for (const classification of ['public', 'confidential'] as const) {
        for (const policyEnabled of [false, true]) {
          for (const remediate of ['none', 'redact', 'approved-share'] as const) {
            const input: SharingInput = Object.freeze({ ...sharing, target, classification, policyEnabled, remediate });
            const before = JSON.stringify(input);
            for (const suite of LAB_SUITES) {
              for (const variant of variants) {
                const outcome = evaluateSharing(input, suite, variant);
                expectComplete(outcome);
                expect(evaluateSharing(input, suite, variant)).toEqual(outcome);
              }
            }
            expect(JSON.stringify(input)).toBe(before);
          }
        }
      }
    }
  });
});

describe('owned agents and real source boundaries', () => {
  it.each(LAB_SUITES)('%s denies payroll under project scope regardless of owner or policy', suite => {
    for (const variant of variants) {
      for (const owner of ['none', 'maya', 'it'] as const) {
        for (const policyEnabled of [false, true]) {
          const input: AgentInput = { ...agent, task: 'payroll', owner, policyEnabled };
          const outcome = evaluateAgent(input, suite, variant);
          expect(getAgentAccess(input).sourceAllows).toBe(false);
          expect(outcome.status).toBe('blocked');
          expect(outcome.facts).toContainEqual({ label: 'Source permission', value: 'Read denied by the fixture' });
          expect(words(outcome)).toMatch(/does not add file access/);
        }
      }
    }
  });

  it('accepts included basic E3 ownership and least-privilege inventory in either case', () => {
    for (const variant of variants) {
      const outcome = evaluateAgent(agent, 'o365e3', variant);
      expect(outcome.status).toBe('success');
      expect(outcome.title).toMatch(/basic owner and access inventory/);
      expect(words(outcome)).toMatch(/includes basic Agent 365 inventory, owner reassignment and core agent administration/);
      expect(words(outcome)).toMatch(/manual owner and access inventory is also valid/);
      expect(words(outcome)).toMatch(/Premium Agent 365 policy templates and selective tool controls require separate coverage/);
    }
    expect(evaluateAgent({ ...agent, policyEnabled: true }, 'o365e3', 'everyday').status).toBe('separate');
  });

  it('distinguishes E7 governance setup from source-file rights', () => {
    expect(evaluateAgent({ ...agent, owner: 'none', policyEnabled: true }, 'm365e7', 'everyday').status).toBe('needs-setup');
    const notConfigured = evaluateAgent(agent, 'm365e7', 'everyday');
    expect(notConfigured.status).toBe('needs-setup');
    expect(notConfigured.facts).toContainEqual({ label: 'Source permission', value: 'Read granted by the fixture' });
    for (const owner of ['maya', 'it'] as const) {
      expect(evaluateAgent({ ...agent, owner, policyEnabled: true }, 'm365e7', 'everyday').status).toBe('success');
    }
  });

  it.each(LAB_SUITES)('%s leaves broad source rights unchanged, including when a separate tool control stops a request', suite => {
    for (const variant of variants) {
      for (const task of ['project', 'payroll'] as const) {
        for (const policyEnabled of [false, true]) {
          const input: AgentInput = { ...agent, permissions: 'all', task, policyEnabled };
          const outcome = evaluateAgent(input, suite, variant);
          expect(getAgentAccess(input).sourceAllows).toBe(true);
          const toolStopsRequest = suite === 'm365e7' && policyEnabled && task === 'payroll';
          expect(outcome.status).toBe(toolStopsRequest ? 'blocked' : 'review');
          expect(words(outcome)).toMatch(/does not automatically revoke|no automatic correction is modeled|not an ACL repair/);
          expect(outcome.facts).toContainEqual({ label: 'Source permission', value: 'Read granted by the fixture' });
        }
      }
    }
  });

  it('models one premium selective tool restriction, not basic whole-agent blocking', () => {
    for (const variant of variants) {
      const input: AgentInput = { ...agent, permissions: 'all', task: 'payroll', policyEnabled: true };
      const controlled = evaluateAgent(input, 'm365e7', variant);
      expect(controlled.status).toBe('blocked');
      expect(controlled.title).toMatch(/scoped tool policy stops this request/);
      expect(controlled.facts).toContainEqual({ label: 'Premium tool policy', value: 'Requested tool excluded' });
      expect(controlled.facts).toContainEqual({ label: 'Source permission', value: 'Read granted by the fixture' });
      expect(controlled.summary).toMatch(/broad payroll file grant is still a risk/);
      expect(controlled.nextAction).toMatch(/narrow the source grant/);
      expect(getAgentToolControl(input, 'm365e7')).toEqual({ tool: 'Payroll reader', active: true, allows: false });
      expect(getAgentToolControl({ ...input, task: 'project' }, 'm365e7')).toEqual({ tool: 'Project reader', active: true, allows: true });
      expect(getAgentToolControl(input, 'o365e3')).toEqual({ tool: 'Payroll reader', active: false, allows: true });
      expect(evaluateAgent({ ...input, policyEnabled: false }, 'm365e7', variant).status).toBe('review');
      expect(evaluateAgent(input, 'o365e3', variant).status).toBe('review');
    }
  });

  it('makes the curveball a human-review moment, not universal agent DLP', () => {
    const bounded = { ...agent, policyEnabled: true };
    const stayingOnTask = evaluateAgent(bounded, 'm365e7', 'curveball');
    expect(stayingOnTask.status).toBe('success');
    expect(stayingOnTask.summary).toMatch(/unexpected payroll request to an authorised human/);
    const denied = evaluateAgent({ ...bounded, task: 'payroll' }, 'm365e7', 'curveball');
    expect(denied.status).toBe('blocked');
    expect(words(denied)).toMatch(/not universal agent DLP/);
    expect(words(denied)).toMatch(/not agent building or unlimited runtime/);
    expect(words(denied)).toMatch(/does not automatically inherit source sensitivity labels/);
  });

  it('is deterministic, complete and non-mutating across all passport and file-scope choices', () => {
    for (const owner of ['none', 'maya', 'it'] as const) {
      for (const permissions of ['project', 'all'] as const) {
        for (const task of ['project', 'payroll'] as const) {
          for (const policyEnabled of [false, true]) {
            const input: AgentInput = Object.freeze({ ...agent, owner, permissions, task, policyEnabled });
            const before = JSON.stringify(input);
            for (const suite of LAB_SUITES) {
              for (const variant of variants) {
                const outcome = evaluateAgent(input, suite, variant);
                expectComplete(outcome);
                expect(evaluateAgent(input, suite, variant)).toEqual(outcome);
              }
            }
            expect(JSON.stringify(input)).toBe(before);
          }
        }
      }
    }
  });
});
