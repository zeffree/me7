import { WORKPLACE } from '../fixtures';
import type { ExperienceMission } from '../types';

export const DEVICE_SAMPLE = {
  assetTag: 'NS-LANTERN-07',
  platform: 'Supported Windows 11 Pro laptop',
  rule: 'Lantern minimum Windows version',
  scope: 'Maya’s Northstar pilot device',
  limitedManagement: 'Office 365 E3 includes limited Basic Mobility and Security. It is not full Intune and does not provide the equivalent Windows compliance-based access gate modeled here.',
  report: 'The online case supplies a simulated, fresh check-in after modeled enrollment. This authored report compares the selected update state with the assigned minimum-version rule. Offline reports remain pending; no real device state is measured.',
  remoteSetup: 'Remote Help requires tenant enablement, organizational identities and appropriate licenses for helper and employee, supported apps and scoped helper permissions. This lab assumes those prerequisites for E7’s enrolled-device pattern and employee consent for an attended session; both devices still need connectivity.',
  rights: 'Windows Enterprise subscription activation needs qualifying Windows Pro/Enterprise rights and an Entra joined or hybrid-joined device; registration or Intune enrollment alone is insufficient. It is not a free Windows Home upgrade, an OS version upgrade or a remedy for failed compliance. VDI infrastructure and Cloud PC compute remain separate.',
} as const;

export const ACCESS_SAMPLE = {
  workFiles: `${WORKPLACE.project} files`,
  privateApp: 'Lantern private app',
  basicIdentity: 'Security defaults are available in Microsoft Entra ID Free. This Office 365 E3 sample assumes they are enabled and this sign-in requests basic MFA; it does not assign a premium Conditional Access or P2 risk policy.',
  permissions: 'Maya already has permission to the illustrated Project Lantern files and is assigned to the private app. The app’s own authorization permits only the illustrated project view. Neither MFA, the private route nor a suite license grants other file or app permissions.',
  deviceContext: 'For the E7 policy path, this independent case supplies an enrolled, supported Windows device, an assigned compliance rule and a fresh compliant simulated report. It does not read your Device bench choices.',
  privateSetup: 'A signed-in Global Secure Access client, a healthy private network connector and an application publication assigned to Maya are all required. The route switch models that completed setup, not an automatic deployment.',
  riskPolicy: 'Lantern sign-in review',
  riskResponse: 'Northstar’s fictional “Lantern sign-in review” policy, when assigned in the E7 path, requires MFA for this authored sign-in-risk condition. It is an explicitly configured Entra ID P2 response, not a live detection. Completing the illustrated challenge does not clear every risk or guarantee a safe sign-in.',
} as const;

export const IT_ACCESS_MISSIONS: readonly ExperienceMission[] = [
  {
    id: 'device',
    title: 'Get Maya’s laptop ready',
    shortTitle: 'Ready a laptop',
    room: 'Device bench',
    domain: 'endpoint',
    intro: `${WORKPLACE.employee} needs her laptop for ${WORKPLACE.project}. Open its configuration slots and decide how to repair it.`,
    objective: 'Complete a local update checklist, or prepare an enrolled device whose assigned rule can be checked against a simulated fresh report.',
    product: 'Microsoft Intune, Remote Help and Windows Enterprise',
    categoryIds: ['uem', 'patch-config', 'windows-vdi', 'remote-support'],
    sourceIds: [
      'm365-packaging-2026', 'architecture-device-compliance', 'e7-announcement', 'experience-remote-help',
      'experience-basic-mobility', 'experience-windows-activation', 'experience-packaging-details',
    ],
    variants: {
      everyday: {
        label: 'Online laptop',
        description: 'The supported Windows laptop is connected. Once enrolled, this authored case supplies a simulated fresh check-in reflecting your selected update state.',
      },
      curveball: {
        label: 'Offline laptop',
        description: 'The laptop has lost connectivity. An approved update package is already cached for a local repair; remote actions and fresh tenant reporting must wait.',
      },
    },
    comparison: {
      o365e3: 'Office 365 E3 includes limited Basic Mobility and Security, not the full Intune workflow modeled here. It does not include Intune, Remote Help or Windows Enterprise suite entitlement. A local checklist can succeed on an already licensed Windows device; the modeled managed path needs separate purchases. This is not Microsoft 365 E3.',
      m365e7: 'Microsoft 365 E7 provides the Intune, Remote Help and Windows Enterprise entitlement used here. Enrollment, scoped rules, reporting and support setup still matter. A license does not enroll a device, install updates or bring an offline device online.',
    },
    prerequisites: [
      'A supported Windows 11 Pro device with qualifying underlying OS rights and permission to apply the prepared update and restart.',
      'For managed evaluation: enrollment, an assigned minimum-version rule scoped to Maya’s device, an access gate using that report, and a fresh device check-in simulated by this case.',
      DEVICE_SAMPLE.remoteSetup,
      DEVICE_SAMPLE.rights,
      'The offline case assumes an IT-approved update package is already available locally. It does not download or run anything.',
    ],
    boundary: 'A completed checklist is not centrally enforced compliance. The simulated compliant result only meets the selected rule; it does not prove a device is threat-free. Windows Enterprise is not a remedy for a failed rule or a free Windows Home upgrade. Qualifying OS and activation prerequisites, VDI infrastructure and Cloud PC compute remain separate.',
    takeaway: 'Device readiness comes from work and evidence: a manual repair can succeed, while a licensed managed action can still wait for setup or connectivity.',
  },
  {
    id: 'access',
    title: 'Open the right work resource',
    shortTitle: 'Follow an access route',
    room: 'Access gate',
    domain: 'identity',
    intro: `${WORKPLACE.employee} is going from her Windows laptop to a work resource. Assemble the route without skipping verification or permissions.`,
    objective: 'Satisfy the illustrated identity challenge and, for a private app, its configured access route. Keep resource permissions intact.',
    product: 'Microsoft Entra identity, Conditional Access and Private Access',
    categoryIds: ['sso-mfa', 'identity-governance', 'ztna', 'swg'],
    sourceIds: [
      'architecture-conditional-access', 'architecture-device-compliance', 'architecture-global-secure-access', 'e7-announcement',
      'experience-security-defaults', 'experience-packaging-details',
    ],
    variants: {
      everyday: {
        label: 'Expected work request',
        description: 'Maya is allowed to use the selected project resource. Northstar’s prepared request asks her to complete MFA; there is no authored risk condition.',
      },
      curveball: {
        label: 'Risky sign-in',
        description: 'The same permitted request now has an authored sign-in-risk condition. Demonstrating its premium response requires a scoped, configured P2 risk policy, not just a completed MFA step.',
      },
    },
    comparison: {
      o365e3: 'Office 365 E3 includes basic identity and MFA; free Entra security defaults are enabled in this fictional tenant. Completing the illustrated basic MFA challenge can open the permitted everyday work files. Premium Conditional Access, the modeled P2 risk response and the private-app route need separate entitlement or tools.',
      m365e7: 'Microsoft 365 E7 adds the premium identity and Private Access capabilities used here. Assign the identity policy; prepare the client, connector and app publication for private access. Configured verification never overrides resource permissions.',
    },
    prerequisites: [
      ACCESS_SAMPLE.permissions,
      ACCESS_SAMPLE.basicIdentity,
      ACCESS_SAMPLE.deviceContext,
      'The premium policy switch assigns the illustrated MFA and compliant-device conditions to Maya and the chosen resource; in the curveball it also configures the P2 MFA risk response.',
      ACCESS_SAMPLE.privateSetup,
    ],
    boundary: 'This is a prepared request, not a live authorization decision or proof that a sign-in is safe. Completing MFA does not clear every risk. Private Access is not a general internet route or a demonstration of secure web gateway filtering. The app’s own authorization and existing file permissions still apply.',
    takeaway: 'Identity, verification, policy and the network path are different gates. A license or completed MFA cannot fill in a missing gate or grant a file permission.',
  },
];
