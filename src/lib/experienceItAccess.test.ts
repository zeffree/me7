import { describe, expect, it } from 'vitest';
import { INITIAL_INPUTS } from '@/data/experience/fixtures';
import { ACCESS_SAMPLE, DEVICE_SAMPLE, IT_ACCESS_MISSIONS } from '@/data/experience/missions/itAccess';
import { LAB_SUITES, type AccessInput, type CaseVariant, type DeviceInput, type LabSuite, type MissionOutcome } from '@/data/experience/types';
import missionSource from '@/data/experience/missions/itAccess.ts?raw';
import activitySource from '@/components/experience/activities/ItAccessActivities.tsx?raw';
import evaluatorSource from './experienceItAccess.ts?raw';
import { evaluateAccess, evaluateDevice } from './experienceItAccess';

const variants: readonly CaseVariant[] = ['everyday', 'curveball'];
const device = (overrides: Partial<DeviceInput> = {}): DeviceInput => ({ ...INITIAL_INPUTS.device, ...overrides });
const access = (overrides: Partial<AccessInput> = {}): AccessInput => ({ ...INITIAL_INPUTS.access, ...overrides });
const managedDevice = device({ enrolled: true, patched: true, requireCompliance: true });
const preparedAccess = access({ verify: 'mfa', policyEnabled: true, privateConnector: true });
const allDeviceInputs: DeviceInput[] = [];
const allAccessInputs: AccessInput[] = [];

for (const enrolled of [false, true]) {
  for (const patched of [false, true]) {
    for (const requireCompliance of [false, true]) {
      for (const support of ['self', 'remote'] as const) {
        allDeviceInputs.push(device({ enrolled, patched, requireCompliance, support }));
      }
    }
  }
}
for (const resource of ['work-files', 'private-app'] as const) {
  for (const verify of ['password', 'mfa'] as const) {
    for (const policyEnabled of [false, true]) {
      for (const privateConnector of [false, true]) {
        allAccessInputs.push(access({ resource, verify, policyEnabled, privateConnector }));
      }
    }
  }
}

function expectComplete(outcome: MissionOutcome) {
  expect(['ready', 'success', 'review', 'blocked', 'needs-setup', 'separate']).toContain(outcome.status);
  expect(outcome.title.trim().length).toBeGreaterThan(10);
  expect(outcome.summary.trim().length).toBeGreaterThan(20);
  expect(outcome.nextAction.trim().length).toBeGreaterThan(20);
  expect(outcome.explanation.length).toBeGreaterThan(1);
  expect(outcome.explanation.every(item => item.trim().length > 0)).toBe(true);
  expect(outcome.facts?.every(fact => fact.label && fact.value)).toBe(true);
}

describe('device mission outcomes', () => {
  it.each(LAB_SUITES)('%s permits a local checklist without claiming management', suite => {
    for (const variant of variants) {
      expect(evaluateDevice(device(), suite, variant).status).toBe('needs-setup');
      const result = evaluateDevice(device({ patched: true }), suite, variant);
      expect(result.status).toBe('success');
      expect(result.summary).toContain('No central compliance result is claimed');
      expect(result.explanation.join(' ')).toContain('cannot bypass a real enforced compliance gate');
      expect(result.facts).toContainEqual({ label: 'Tenant report', value: 'Not used · local checklist only' });
    }
  });

  it.each([
    { enrolled: true },
    { requireCompliance: true },
    { support: 'remote' as const },
    { ...managedDevice, support: 'remote' as const },
  ])('keeps each requested E3 management capability separate: %j', setup => {
    for (const variant of variants) {
      const result = evaluateDevice(device({ patched: true, ...setup }), 'o365e3', variant);
      expect(result.status).toBe('separate');
      expect(result.explanation.join(' ')).toContain('Office 365 E3 is not Microsoft 365 E3');
      expect(result.explanation.join(' ')).toContain('does not include Intune or Windows Enterprise suite entitlement');
      expect(result.nextAction).toContain('self-service');
    }
  });

  it.each([
    { support: 'remote' as const },
    { requireCompliance: true },
    { patched: true, requireCompliance: true },
  ])('does not treat E7 licensing or a requested gate as enrollment: %j', setup => {
    const result = evaluateDevice(device(setup), 'm365e7', 'everyday');
    expect(result.status).toBe('needs-setup');
    expect(result.title).toContain('Enroll');
    expect(result.summary).toContain('has not enrolled');
  });

  it.each(variants)('refuses a managed result without a scoped rule in %s', variant => {
    const result = evaluateDevice(device({ enrolled: true, patched: true }), 'm365e7', variant);
    expect(result.status).toBe('needs-setup');
    expect(result.title).toContain('not been assigned');
    expect(result.explanation.join(' ')).toContain(DEVICE_SAMPLE.rule);
  });

  it.each(['self', 'remote'] as const)('%s support does not patch automatically, and a reported repair recovers', support => {
    const before = evaluateDevice({ ...managedDevice, patched: false, support }, 'm365e7', 'everyday');
    expect(before.status).toBe('blocked');
    expect(before.summary).toContain('minimum-version requirement');
    const after = evaluateDevice({ ...managedDevice, support }, 'm365e7', 'everyday');
    expect(after.status).toBe('success');
    expect(after.explanation).toContain(DEVICE_SAMPLE.report);
    expect(after.summary).toContain('fresh sample check-in');
    expect(after.explanation.join(' ')).toContain('neither result proves the device is threat-free');
    expect(after.explanation.join(' ')).not.toContain('automatically compliant');
  });

  it('keeps Windows activation rights distinct from repairing a failed reported rule', () => {
    const result = evaluateDevice({ ...managedDevice, patched: false }, 'm365e7', 'everyday');
    expect(result.status).toBe('blocked');
    expect(result.explanation).toContain(DEVICE_SAMPLE.rights);
    expect(DEVICE_SAMPLE.rights).toContain('Entra joined or hybrid-joined');
    expect(DEVICE_SAMPLE.rights).toContain('registration or Intune enrollment alone is insufficient');
    expect(DEVICE_SAMPLE.rights).toContain('not a free Windows Home upgrade');
    expect(DEVICE_SAMPLE.rights).toContain('or a remedy for failed compliance');
    expect(result.nextAction).toContain('Complete the update checklist');
    expect(result.nextAction).not.toContain('Windows Enterprise');
    expect(DEVICE_SAMPLE.report).toContain('simulated');
  });

  it('keeps every E7 offline remote choice pending, even with enrollment, a rule and local repair', () => {
    for (const input of allDeviceInputs.filter(item => item.support === 'remote')) {
      const result = evaluateDevice(input, 'm365e7', 'curveball');
      expect(result.status).toBe('review');
      expect(result.title).toContain('waiting for connectivity');
      expect(result.summary).toContain('No remote action or fresh compliance report has completed');
      expect(result.facts).toContainEqual({ label: 'Support', value: 'Remote Help · pending connectivity' });
    }
    expect(evaluateDevice({ ...managedDevice, support: 'remote' }, 'm365e7', 'everyday').status).toBe('success');
  });

  it('offers offline local remediation without silently passing the managed gate', () => {
    const waiting = evaluateDevice({ ...managedDevice, patched: false }, 'm365e7', 'curveball');
    expect(waiting.status).toBe('review');
    expect(waiting.nextAction).toContain('Complete the local update checklist');
    const repaired = evaluateDevice(managedDevice, 'm365e7', 'curveball');
    expect(repaired.status).toBe('review');
    expect(repaired.title).toContain('Local repair recorded');
    expect(repaired.summary).toContain('no fresh report');
    expect(repaired.nextAction).toContain('online case');
    expect(evaluateDevice(managedDevice, 'm365e7', 'everyday').status).toBe('success');
    expect(evaluateDevice(device({ patched: true }), 'o365e3', 'curveball').status).toBe('success');
  });

  describe.each(LAB_SUITES)('%s exhaustive device inputs', suite => {
    it.each(variants)('%s: all 16 configurations are pure, complete and bounded', variant => {
      for (const input of allDeviceInputs) {
        const frozen = Object.freeze({ ...input });
        const result = evaluateDevice(frozen, suite, variant);
        expect(result).toEqual(evaluateDevice(frozen, suite, variant));
        expect(frozen).toEqual(input);
        expectComplete(result);
        if (suite === 'o365e3') expect(result.explanation).toContain(DEVICE_SAMPLE.limitedManagement);
        expect(result.explanation).toContain(DEVICE_SAMPLE.rights);
        expect(result.explanation.join(' ')).toContain('neither result proves the device is threat-free');
        const manual = !input.enrolled && !input.requireCompliance && input.support === 'self';
        const managed = suite === 'm365e7' && variant === 'everyday' && input.enrolled && input.requireCompliance;
        expect(result.status === 'success').toBe(input.patched && (manual || managed));
        if (suite === 'o365e3' && !manual) expect(result.status).toBe('separate');
      }
    });
  });
});

describe('access mission outcomes', () => {
  it('allows the everyday E3 basic-MFA route to permitted work files', () => {
    expect(evaluateAccess(access(), 'o365e3', 'everyday').status).toBe('blocked');
    for (const privateConnector of [false, true]) {
      const result = evaluateAccess(access({ verify: 'mfa', privateConnector }), 'o365e3', 'everyday');
      expect(result.status).toBe('success');
      expect(result.explanation.join(' ')).toContain('Basic identity and MFA suffice');
      expect(result.facts).toContainEqual({ label: 'Private route', value: 'Not needed for work files' });
    }
  });

  it.each(variants)('%s: E3 private access or a premium policy is separate, not no identity', variant => {
    for (const input of [
      access({ resource: 'private-app', verify: 'mfa', privateConnector: true }),
      access({ verify: 'mfa', policyEnabled: true }),
      { ...preparedAccess, resource: 'private-app' as const },
    ]) {
      const result = evaluateAccess(input, 'o365e3', variant);
      expect(result.status).toBe('separate');
      expect(result.summary).toContain('includes basic identity and MFA');
      expect(result.explanation.join(' ')).toContain('cannot install a private connector');
    }
  });

  it.each(['password', 'mfa'] as const)('does not invent E3 P2 risk enforcement after %s', verify => {
    const result = evaluateAccess(access({ verify }), 'o365e3', 'curveball');
    expect(result.status).toBe('review');
    expect(result.summary).toContain('does not pretend Office 365 E3 has enforced a P2 risk policy');
    expect(result.explanation).toContain(ACCESS_SAMPLE.riskResponse);
    expect(result.nextAction).toContain('everyday');
  });

  it.each(variants)('%s: completed MFA and a private connector cannot replace an unconfigured E7 policy', variant => {
    for (const resource of ['work-files', 'private-app'] as const) {
      const result = evaluateAccess({ ...preparedAccess, resource, policyEnabled: false }, 'm365e7', variant);
      expect(result.status).toBe('needs-setup');
      expect(result.title).toContain('not configured');
      expect(result.explanation.join(' ')).toContain('not a claim that a real tenant without this policy would automatically deny');
      expect(result.explanation).toContain(ACCESS_SAMPLE.deviceContext);
    }
  });

  it.each(variants)('%s: the E7 private route requires the client, connector and publication after MFA', variant => {
    const input = { ...preparedAccess, resource: 'private-app' as const, privateConnector: false };
    const result = evaluateAccess(input, 'm365e7', variant);
    expect(result.status).toBe('needs-setup');
    expect(result.title).toContain('missing link');
    expect(result.explanation).toContain(ACCESS_SAMPLE.privateSetup);
    expect(result.explanation.join(' ')).toContain('cannot repair the missing route');
    expect(evaluateAccess({ ...input, privateConnector: true }, 'm365e7', variant).status).toBe('success');
  });

  it.each(variants)('%s: E7 requires completed MFA after policy and route setup', variant => {
    for (const resource of ['work-files', 'private-app'] as const) {
      const result = evaluateAccess({ ...preparedAccess, resource, verify: 'password' }, 'm365e7', variant);
      expect(result.status).toBe('blocked');
      expect(result.title).toContain('MFA');
      expect(result.explanation).toContain(ACCESS_SAMPLE.deviceContext);
      const permitted = evaluateAccess({ ...preparedAccess, resource }, 'm365e7', variant);
      expect(permitted.status).toBe('success');
      expect(permitted.explanation).toContain(ACCESS_SAMPLE.permissions);
    }
  });

  it('requires the authored, explicitly configured P2 response for the risky sample', () => {
    const configured = evaluateAccess(preparedAccess, 'm365e7', 'curveball');
    expect(configured.status).toBe('success');
    expect(configured.title).toContain('configured risk challenge');
    expect(configured.explanation).toContain(ACCESS_SAMPLE.riskResponse);
    expect(ACCESS_SAMPLE.riskResponse).toContain(ACCESS_SAMPLE.riskPolicy);
    expect(ACCESS_SAMPLE.riskResponse).toContain('does not clear every risk');
    expect(configured.explanation.join(' ')).toContain('not proof of a safe sign-in');
    expect(configured.facts).toContainEqual({ label: 'Risk response', value: 'P2 MFA response explicitly configured' });
    expect(evaluateAccess({ ...preparedAccess, policyEnabled: false }, 'm365e7', 'curveball').status).toBe('needs-setup');
  });

  it.each(variants)('%s: a prepared private path does not replace the app’s own authorization', variant => {
    const result = evaluateAccess({ ...preparedAccess, resource: 'private-app' }, 'm365e7', variant);
    expect(result.status).toBe('success');
    expect(result.explanation).toContain(ACCESS_SAMPLE.permissions);
    expect(ACCESS_SAMPLE.permissions).toContain('app’s own authorization permits only the illustrated project view');
    expect(ACCESS_SAMPLE.permissions).toContain('Neither MFA, the private route nor a suite license grants other file or app permissions');
  });

  describe.each(LAB_SUITES)('%s exhaustive access inputs', suite => {
    it.each(variants)('%s: all 16 configurations are pure and preserve resource permissions', variant => {
      for (const input of allAccessInputs) {
        const frozen = Object.freeze({ ...input });
        const result = evaluateAccess(frozen, suite, variant);
        expect(result).toEqual(evaluateAccess(frozen, suite, variant));
        expect(frozen).toEqual(input);
        expectComplete(result);
        if (suite === 'o365e3') {
          expect(result.explanation).toContain(ACCESS_SAMPLE.basicIdentity);
          expect(ACCESS_SAMPLE.basicIdentity).toContain('Microsoft Entra ID Free');
          expect(ACCESS_SAMPLE.basicIdentity).toContain('Security defaults');
        }
        expect(result.explanation).toContain(ACCESS_SAMPLE.permissions);
        expect(result.facts).toContainEqual({ label: 'Resource permission', value: 'Already allowed in this prepared case' });
        const basic = suite === 'o365e3' && variant === 'everyday' && input.resource === 'work-files' && !input.policyEnabled;
        const premium = suite === 'm365e7' && input.policyEnabled && (input.resource === 'work-files' || input.privateConnector);
        expect(result.status === 'success').toBe(input.verify === 'mfa' && (basic || premium));
        if (suite === 'm365e7' && !input.policyEnabled) expect(result.status).toBe('needs-setup');
      }
    });
  });
});

describe('IT and access learning content contract', () => {
  it('defines both complete missions with existing category IDs and the requested sources', () => {
    expect(IT_ACCESS_MISSIONS.map(mission => mission.id)).toEqual(['device', 'access']);
    const categoryIds = {
      device: ['uem', 'patch-config', 'windows-vdi', 'remote-support'],
      access: ['sso-mfa', 'identity-governance', 'ztna', 'swg'],
    };
    const sources = {
      device: [
        'm365-packaging-2026', 'architecture-device-compliance', 'e7-announcement', 'experience-remote-help',
        'experience-basic-mobility', 'experience-windows-activation', 'experience-packaging-details',
      ],
      access: [
        'architecture-conditional-access', 'architecture-device-compliance', 'architecture-global-secure-access', 'e7-announcement',
        'experience-security-defaults', 'experience-packaging-details',
      ],
    };
    for (const mission of IT_ACCESS_MISSIONS) {
      const id = mission.id as keyof typeof categoryIds;
      expect(mission.categoryIds).toEqual(categoryIds[id]);
      expect(mission.sourceIds).toEqual(sources[id]);
      for (const key of ['title', 'shortTitle', 'room', 'domain', 'intro', 'objective', 'product', 'boundary', 'takeaway'] as const) {
        expect(mission[key].trim()).not.toBe('');
      }
      expect(Object.keys(mission.comparison)).toEqual(['o365e3', 'm365e7']);
      expect(mission.prerequisites.length).toBeGreaterThanOrEqual(3);
      for (const variant of variants) {
        expect(mission.variants[variant].label).not.toBe('');
        expect(mission.variants[variant].description).not.toBe('');
      }
    }
  });

  it('keeps production code independent from assessment, persistence, network and timers', () => {
    for (const source of [missionSource, evaluatorSource, activitySource]) {
      const imports = Array.from(source.matchAll(/\bfrom\s+['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g), match => match[1] ?? match[2]);
      expect(imports.length).toBeGreaterThan(0);
      expect(imports.join(' ')).not.toMatch(/assessment|store|model\/|experienceEngine|experienceProgress|experienceEvaluation/i);
      expect(source).not.toMatch(/\b(useState|useReducer|useEffect|localStorage|sessionStorage|fetch|XMLHttpRequest|sendBeacon|setInterval|setTimeout)\b/);
    }
  });
});

const suiteCasePairs: readonly { suite: LabSuite; variant: CaseVariant }[] = LAB_SUITES.flatMap(suite => variants.map(variant => ({ suite, variant })));

describe('recoverable authored routes', () => {
  it.each(suiteCasePairs)('$suite / $variant has a reachable device success without side effects', ({ suite, variant }) => {
    expect(allDeviceInputs.some(input => evaluateDevice(input, suite, variant).status === 'success')).toBe(true);
    expect(new Set(allDeviceInputs.map(input => evaluateDevice(input, suite, variant).status)).size).toBeGreaterThanOrEqual(2);
  });

  it.each(LAB_SUITES)('%s has a basic or configured permitted access route and a recoverable refusal', suite => {
    for (const variant of variants) {
      expect(new Set(allAccessInputs.map(input => evaluateAccess(input, suite, variant).status)).size).toBeGreaterThanOrEqual(2);
      const recoveryCase = suite === 'o365e3' ? 'everyday' : variant;
      expect(allAccessInputs.some(input => evaluateAccess(input, suite, recoveryCase).status === 'success')).toBe(true);
    }
  });
});
