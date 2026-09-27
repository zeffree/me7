import { ACCESS_SAMPLE, DEVICE_SAMPLE } from '@/data/experience/missions/itAccess';
import type { AccessInput, CaseVariant, DeviceInput, LabSuite, MissionOutcome } from '@/data/experience/types';

function deviceOutcome(
  input: DeviceInput,
  suite: LabSuite,
  variant: CaseVariant,
  outcome: MissionOutcome,
): MissionOutcome {
  const managed = input.enrolled || input.requireCompliance || input.support === 'remote';
  return {
    ...outcome,
    explanation: [
      ...outcome.explanation,
      ...(suite === 'o365e3' ? [DEVICE_SAMPLE.limitedManagement] : []),
      'A local update record is not compliance certainty. The managed sample checks one assigned minimum-version rule; neither result proves the device is threat-free.',
      DEVICE_SAMPLE.rights,
    ],
    facts: [
      { label: 'Device', value: DEVICE_SAMPLE.platform },
      { label: 'Local update', value: input.patched ? 'Checklist and restart recorded' : 'Checklist still open' },
      {
        label: 'Enrollment',
        value: !input.enrolled ? 'Not enrolled' : suite === 'o365e3' ? 'Requested · separate purchase' : 'Enrolled in the prepared case',
      },
      {
        label: 'Assigned rule',
        value: !input.requireCompliance ? 'Not assigned' : suite === 'o365e3' ? 'Requested · separate purchase' : `${DEVICE_SAMPLE.rule} · ${DEVICE_SAMPLE.scope}`,
      },
      {
        label: 'Tenant report',
        value: !managed ? 'Not used · local checklist only'
          : suite === 'o365e3' ? 'Intune requires separate purchase'
            : variant === 'curveball' ? 'Offline · fresh report pending'
              : !input.enrolled ? 'Enrollment required'
                : 'Simulated fresh check-in',
      },
      {
        label: 'Support',
        value: input.support === 'self' ? 'Local self-service'
          : suite === 'o365e3' ? 'Remote Help · separate purchase'
            : variant === 'curveball' ? 'Remote Help · pending connectivity' : 'Remote Help · prepared support setup',
      },
    ],
  };
}

export function evaluateDevice(input: DeviceInput, suite: LabSuite, variant: CaseVariant): MissionOutcome {
  const managed = input.enrolled || input.requireCompliance || input.support === 'remote';
  const result = (outcome: MissionOutcome) => deviceOutcome(input, suite, variant, outcome);

  if (suite === 'o365e3' && managed) {
    return result({
      status: 'separate',
      title: 'This management path needs a separate purchase',
      summary: 'Office 365 E3 does not supply the Intune or Remote Help entitlement requested by these controls.',
      explanation: [
        'Office 365 E3 is not Microsoft 365 E3. It does not include Intune or Windows Enterprise suite entitlement.',
        'Selecting enrollment, a managed compliance gate or Remote Help cannot activate a separately licensed service.',
        'The local self-service checklist can still succeed on this already licensed Windows laptop, without claiming central enforcement.',
      ],
      nextAction: 'Choose self-service, turn off the two managed options in this lab, and complete the local update checklist. Or compare the configured E7 path.',
    });
  }

  if (!managed) {
    if (!input.patched) {
      return result({
        status: 'needs-setup',
        title: 'The local update checklist is still open',
        summary: 'The employee can repair this sample laptop without a centrally managed workflow.',
        explanation: [
          variant === 'curveball'
            ? 'The approved update package is already cached. This offline case permits local installation and a verified restart; it does not require a remote session.'
            : 'Use the prepared local update and restart checklist. Selecting a suite does not complete those tasks.',
          'Self-service records a local repair only. No enrollment, assigned compliance policy or tenant enforcement is implied.',
        ],
        nextAction: 'Complete the update checklist to record the prepared local repair.',
      });
    }

    return result({
      status: 'success',
      title: variant === 'curveball' ? 'The offline checklist is complete' : 'The local checklist is complete',
      summary: 'Maya’s prepared update and restart are recorded locally. No central compliance result is claimed.',
      explanation: [
        variant === 'curveball'
          ? 'The sample uses the cached, approved update package. A local repair can finish while remote support and tenant check-in are unavailable.'
          : 'The supported manual workflow succeeds using the Windows rights and local update permissions already assumed for this device.',
        'This is a local maintenance result, not access authorization. It cannot bypass a real enforced compliance gate.',
        suite === 'o365e3'
          ? 'Office 365 E3 supplies neither Intune nor Windows Enterprise suite entitlement; neither is claimed by this manual result.'
          : 'E7 management entitlement is available but unused in this manual path. No policy is silently assigned.',
      ],
      nextAction: 'Compare the managed path by enrolling the sample device and assigning the compliance gate in the online case.',
    });
  }

  if (variant === 'curveball' && input.support === 'remote') {
    return result({
      status: 'review',
      title: 'Remote Help is waiting for connectivity',
      summary: 'The E7 entitlement cannot reach this offline laptop. No remote action or fresh compliance report has completed.',
      explanation: [
        DEVICE_SAMPLE.remoteSetup,
        'Enrollment and an assigned rule still matter; an offline device cannot send the fresh check-in required by this example.',
        input.patched
          ? 'The local checklist is recorded, but that does not make the device reachable or turn its local record into a tenant report.'
          : 'The approved cached update remains available for a local self-service repair.',
      ],
      nextAction: 'Choose self-service to work locally. For a managed result, switch to the online case, enroll the device, assign the gate and complete the checklist.',
    });
  }

  if (!input.enrolled) {
    return result({
      status: 'needs-setup',
      title: 'Enroll the device before the managed check',
      summary: 'The E7 license makes management available; it has not enrolled this laptop.',
      explanation: [
        'This authored managed workflow needs the supported Windows device enrolled and registered for the identity context.',
        'A selected compliance gate or support method cannot stand in for enrollment or a reported device result.',
      ],
      nextAction: variant === 'curveball'
        ? 'Switch to the online case and enroll the sample device, or use self-service with the managed options off for a local checklist only.'
        : 'Enroll the sample device, then assign its compliance gate and complete the update checklist.',
    });
  }

  if (!input.requireCompliance) {
    return result({
      status: 'needs-setup',
      title: 'The managed rule has not been assigned',
      summary: 'Enrollment alone does not define or enforce Northstar’s compliance requirements.',
      explanation: [
        `Assign “${DEVICE_SAMPLE.rule}” to ${DEVICE_SAMPLE.scope} and configure the access gate to require its reported result.`,
        'The update checkbox records one local action. Without the scoped rule, it is not a compliant-device decision.',
      ],
      nextAction: 'Assign the compliance gate. The online case must then provide a fresh check-in against that rule.',
    });
  }

  if (variant === 'curveball') {
    return result({
      status: 'review',
      title: input.patched ? 'Local repair recorded; tenant check-in pending' : 'The device report is waiting for connectivity',
      summary: 'The policy is assigned, but this offline sample has no fresh report to evaluate.',
      explanation: [
        DEVICE_SAMPLE.report,
        input.patched
          ? 'The selected local repair does not override the missing report or an enforced access gate.'
          : 'Self-service can apply the cached update and verify a restart locally; the managed result still waits.',
      ],
      nextAction: input.patched
        ? 'Switch to the online case to supply the prepared fresh check-in. A real device would need to reconnect and report.'
        : 'Complete the local update checklist, then switch to the online case for its prepared fresh report.',
    });
  }

  if (!input.patched) {
    return result({
      status: 'blocked',
      title: 'The reported version misses the assigned rule',
      summary: 'The prepared online report does not meet Northstar’s minimum-version requirement, so the illustrated compliance gate stays closed.',
      explanation: [
        `“${DEVICE_SAMPLE.rule}” is explicitly assigned to ${DEVICE_SAMPLE.scope}; this is not a default policy supplied by the license.`,
        'This online case supplies a simulated fresh report showing the selected update is still outstanding.',
        input.support === 'remote'
          ? 'The prepared Remote Help setup can support the repair, but selecting it does not install the update.'
          : 'The local self-service checklist can remedy the version mismatch.',
      ],
      nextAction: 'Complete the update checklist. The online case will then show the authored check-in meeting this one rule.',
    });
  }

  return result({
    status: 'success',
    title: 'The prepared report meets the assigned rule',
    summary: 'Enrollment, the scoped minimum-version rule and the fresh sample check-in are all present.',
    explanation: [
      DEVICE_SAMPLE.report,
      'The illustrated gate accepts this reported minimum-version result. Other real compliance rules and resource permissions would still apply.',
      input.support === 'remote'
        ? DEVICE_SAMPLE.remoteSetup
        : 'Maya used the local checklist to repair the device; the separate, prepared check-in provides the managed evidence.',
    ],
    nextAction: 'Try the offline case to see why a repaired device can still be waiting for a managed result.',
  });
}

function accessOutcome(
  input: AccessInput,
  suite: LabSuite,
  variant: CaseVariant,
  outcome: MissionOutcome,
): MissionOutcome {
  const premium = suite === 'm365e7' && input.policyEnabled;
  return {
    ...outcome,
    explanation: [
      ...outcome.explanation,
      ...(suite === 'o365e3' ? [ACCESS_SAMPLE.basicIdentity] : []),
      ACCESS_SAMPLE.permissions,
    ],
    facts: [
      { label: 'Resource', value: input.resource === 'work-files' ? ACCESS_SAMPLE.workFiles : ACCESS_SAMPLE.privateApp },
      { label: 'Resource permission', value: 'Already allowed in this prepared case' },
      { label: 'Verification', value: input.verify === 'mfa' ? 'MFA challenge completed' : 'Password only' },
      {
        label: 'Premium policy',
        value: !input.policyEnabled ? 'Not configured'
          : suite === 'o365e3' ? 'Requested · separate entitlement' : 'Assigned to Maya and this resource',
      },
      { label: 'Device condition', value: premium ? 'Simulated compliant report · assigned scope' : 'Not evaluated by a premium policy' },
      {
        label: 'Private route',
        value: input.resource === 'work-files' ? 'Not needed for work files'
          : suite === 'o365e3' ? 'Separate entitlement or tool'
            : input.privateConnector ? 'Prepared client, connector and app publication' : 'Client, connector and publication not prepared',
      },
      {
        label: 'Risk response',
        value: variant === 'everyday' ? 'No authored risk condition' : premium ? 'P2 MFA response explicitly configured' : 'P2 response not configured',
      },
    ],
  };
}

export function evaluateAccess(input: AccessInput, suite: LabSuite, variant: CaseVariant): MissionOutcome {
  const result = (outcome: MissionOutcome) => accessOutcome(input, suite, variant, outcome);

  if (suite === 'o365e3' && (input.resource === 'private-app' || input.policyEnabled)) {
    return result({
      status: 'separate',
      title: input.resource === 'private-app' ? 'The private route needs a separate entitlement' : 'That premium policy needs separate entitlement',
      summary: 'Office 365 E3 includes basic identity and MFA, but not the premium access path selected here.',
      explanation: [
        input.resource === 'private-app'
          ? 'This suite-only example cannot supply Private Access. A separately licensed and configured private-access tool is needed; a connector checkbox is not an entitlement.'
          : 'The illustrated Conditional Access and P2 risk controls require premium Entra entitlement. Basic MFA does not require this premium-policy switch.',
        'A completed MFA challenge cannot install a private connector, publish an app or assign a missing policy.',
      ],
      nextAction: 'For the basic E3 route, choose work files with the premium policy off and complete MFA in the everyday case. Compare E7 to prepare the private route.',
    });
  }

  if (suite === 'o365e3' && variant === 'curveball') {
    return result({
      status: 'review',
      title: 'The sample risk response needs more than basic MFA',
      summary: 'This lab pauses the risky request for review; it does not pretend Office 365 E3 has enforced a P2 risk policy.',
      explanation: [
        'Office 365 E3 retains basic identity and MFA. The configured P2 sign-in-risk response required by this case needs separate entitlement and setup.',
        input.verify === 'mfa'
          ? 'The basic MFA challenge is completed, but that does not configure a premium risk response or prove this sign-in is safe.'
          : 'The basic MFA challenge is also still open. Completing it alone would not configure the missing risk response.',
        ACCESS_SAMPLE.riskResponse,
      ],
      nextAction: 'Compare E7 with the scoped risk policy enabled, or return to the everyday permitted work request to finish the basic E3 route.',
    });
  }

  if (suite === 'm365e7' && !input.policyEnabled) {
    return result({
      status: 'needs-setup',
      title: 'The premium policy is not configured',
      summary: 'There is no assigned E7 policy to demonstrate. Licensing and a completed verification step do not create enforcement.',
      explanation: [
        'This is a lab setup result, not a claim that a real tenant without this policy would automatically deny the request. Other tenant settings and permissions still determine access.',
        variant === 'curveball'
          ? 'The authored risk condition needs an explicitly configured P2 response. This sample uses an MFA challenge, not an assumed automatic protection.'
          : 'Assign the sample MFA and compliant-device conditions to Maya and the chosen resource.',
        ACCESS_SAMPLE.deviceContext,
      ],
      nextAction: 'Assign the premium access policy, then complete its MFA challenge. For a private app, also prepare the client, connector and publication.',
    });
  }

  if (suite === 'm365e7' && input.resource === 'private-app' && !input.privateConnector) {
    return result({
      status: 'needs-setup',
      title: 'The private route has a missing link',
      summary: 'The identity policy is assigned, but the Private Access client, connector and app publication are not prepared.',
      explanation: [
        ACCESS_SAMPLE.privateSetup,
        'A completed MFA challenge cannot repair the missing route. Private Access needs both the scoped identity policy and the configured path.',
        ACCESS_SAMPLE.deviceContext,
      ],
      nextAction: 'Prepare the Private Access route, then complete MFA if its challenge is still open.',
    });
  }

  if (input.verify !== 'mfa') {
    return result({
      status: 'blocked',
      title: 'Finish the illustrated MFA challenge',
      summary: 'Password-only verification does not satisfy Northstar’s prepared request.',
      explanation: [
        suite === 'o365e3'
          ? 'The fictional tenant has security defaults enabled and this work-file sign-in requests basic MFA. It does not use a premium Conditional Access policy.'
          : variant === 'curveball'
            ? 'The explicitly configured P2 response requires MFA for this authored sign-in-risk condition; the challenge is still open.'
            : 'The scoped E7 policy requires completed MFA and the compliant-device context supplied by this case.',
        suite === 'm365e7'
          ? ACCESS_SAMPLE.deviceContext
          : 'Basic identity and MFA are present in E3. Their availability does not mean the employee has completed the challenge.',
      ],
      nextAction: 'Select completed MFA to satisfy this sample challenge. Missing route or policy setup would still prevent the premium demonstration.',
    });
  }

  return result({
    status: 'success',
    title: variant === 'curveball' ? 'The configured risk challenge is satisfied' : 'The permitted request can continue',
    summary: input.resource === 'private-app'
      ? 'The sample has completed MFA, an assigned identity policy and the prepared private-app route.'
      : 'The illustrated MFA challenge is complete for Maya’s already permitted project files.',
    explanation: [
      suite === 'o365e3'
        ? 'Basic identity and MFA suffice for this everyday work-file request. No premium Conditional Access policy or private connector is claimed.'
        : variant === 'curveball' ? ACCESS_SAMPLE.riskResponse
          : 'The sample policy is assigned to Maya and this resource; entitlement alone did not enforce it.',
      suite === 'm365e7' ? ACCESS_SAMPLE.deviceContext
        : 'The work-file route does not use a Private Access connector, even if a private-route choice was saved earlier.',
      'Passing this authored challenge is not proof of a safe sign-in and does not override other real policies or resource permissions.',
    ],
    nextAction: variant === 'curveball'
      ? 'Turn off the premium policy or change the private-route setup to see which prerequisites a completed MFA step cannot replace.'
      : 'Try the risky-sign-in case, or switch resources to explore the additional private-route prerequisites.',
  });
}
