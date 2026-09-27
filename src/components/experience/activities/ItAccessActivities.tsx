import { Laptop, Route, Wrench } from 'lucide-react';
import { WORKPLACE } from '@/data/experience/fixtures';
import { ACCESS_SAMPLE, DEVICE_SAMPLE } from '@/data/experience/missions/itAccess';
import type { MissionActivityProps } from '@/data/experience/types';
import { ArtifactHeading, ChoiceStrip, LabHint, LabToggle, SetupNotes } from '../ActivityPrimitives';
import './it-access.css';

export function DeviceActivity({ input, suite, variant, onChange }: MissionActivityProps<'device'>) {
  const e7 = suite === 'm365e7';
  const offline = variant === 'curveball';
  const slots = [
    {
      label: 'Enrollment',
      value: !input.enrolled ? 'Not enrolled' : !e7 ? 'Selected · separate purchase' : offline ? 'Previously enrolled · offline' : 'Prepared enrollment',
      filled: input.enrolled && e7,
    },
    {
      label: 'Local update',
      value: input.patched ? 'Update and restart recorded' : 'Checklist still open',
      filled: input.patched,
    },
    {
      label: 'Rule assignment',
      value: !input.requireCompliance ? 'No scoped rule assigned' : !e7 ? 'Selected · separate purchase' : DEVICE_SAMPLE.rule,
      filled: input.requireCompliance && e7,
    },
    {
      label: 'Tenant check-in',
      value: !e7 ? 'Intune not in this suite' : !input.enrolled ? 'Enrollment needed' : offline ? 'Fresh report pending' : 'Simulated fresh report',
      filled: e7 && input.enrolled && !offline,
    },
  ];
  const repairNote = input.support === 'remote'
    ? !e7
      ? 'Remote Help needs a separate purchase with Office 365 E3. Keep this choice to explore that boundary, or choose the local checklist.'
      : offline
        ? 'Remote Help is pending: the laptop is offline. A local repair is still possible; fresh tenant reporting must wait for connectivity.'
        : 'Remote Help is selected, not running. Its setup and consent are assumed for this enrolled-device sample; the update checklist still records the repair.'
    : input.patched
      ? 'The local checklist is recorded. It does not prove compliance, grant resource access or replace a fresh tenant report.'
      : offline
        ? 'The IT-approved update package is already cached. Complete the update and restart checklist locally; no download or remote connection is needed in this prepared case.'
        : 'Use the prepared local update and restart checklist. The suite selection does not install an update for Maya.';

  return <section className="lab-activity it-access-activity it-device" aria-label="Device bench">
    <ArtifactHeading icon={<Laptop />} title="Maya’s Windows laptop">
      Configure a fictional laptop, not a live device. Each slot shows a different piece of readiness.
    </ArtifactHeading>

    <div className="it-device-workbench">
      <figure className="it-device-object" aria-label="Sample laptop configuration record">
        <div className="it-device-screen">
          <div className="it-device-nameplate">
            <strong>{DEVICE_SAMPLE.assetTag}</strong>
            <span>{offline ? 'Offline case' : 'Online case'}</span>
          </div>
          <dl className="it-device-slots">
            {slots.map(slot => <div key={slot.label} data-filled={slot.filled}>
              <dt>{slot.label}</dt>
              <dd><span className="it-device-slot-pin" aria-hidden="true" />{slot.value}</dd>
            </div>)}
          </dl>
        </div>
        <svg className="it-device-keyboard" viewBox="0 0 360 54" aria-hidden="true" focusable="false">
          <path className="it-art-soft" d="M22 3H338L355 38Q357 45 348 47H12Q3 45 5 38Z" />
          <path className="it-art-line" d="M41 15H319M35 25H325M54 9L48 28M83 9L79 28M112 9L110 28M141 9V28M219 9V28M248 9L250 28M277 9L281 28M306 9L312 28" />
          <rect className="it-art-paper" x="144" y="33" width="72" height="9" rx="3" />
          <path className="it-art-line" d="M7 44H353" />
        </svg>
        <figcaption>{WORKPLACE.employee} · {DEVICE_SAMPLE.platform}</figcaption>
      </figure>

      <fieldset className="it-device-settings">
        <legend>Configure the sample laptop</legend>
        <LabToggle label="Enroll the sample device" checked={input.enrolled}
          detail={!e7
            ? 'Intune enrollment requires a separate purchase with Office 365 E3.'
            : offline
              ? 'Model enrollment completed before connectivity was lost. New enrollment would need a connection.'
              : 'Model enrollment and registration. This online case then supplies a simulated check-in; Windows activation has separate prerequisites.'}
          onChange={enrolled => onChange({ ...input, enrolled })} />
        <LabToggle label="Complete the update checklist" checked={input.patched}
          detail={offline
            ? 'Use the approved cached update and verify the restart locally. This is not a compliance certificate.'
            : 'Record the prepared update and restart. The assigned rule and check-in are separate evidence.'}
          onChange={patched => onChange({ ...input, patched })} />
        <LabToggle label="Assign the compliance gate" checked={input.requireCompliance}
          detail={!e7
            ? 'A managed rule and compliant-device access gate need separate management and identity entitlement.'
            : `Scope “${DEVICE_SAMPLE.rule}” to Maya’s pilot device and require its reported result at the access gate.`}
          onChange={requireCompliance => onChange({ ...input, requireCompliance })} />
      </fieldset>
    </div>

    <ChoiceStrip label="Who helps with the repair?" value={input.support}
      options={[
        { value: 'self', label: 'Self-service checklist', detail: 'Record the local update and restart. No central enforcement is claimed.' },
        {
          value: 'remote', label: 'Remote Help', detail: 'Illustrate an employee-assisted support session, with setup and consent.',
          unavailable: !e7 ? 'Separate purchase with Office 365 E3' : undefined,
        },
      ]}
      onChange={support => onChange({ ...input, support })} />

    <div className="it-device-repair-note">
      <Wrench aria-hidden="true" />
      <p role="status" aria-live="polite">{repairNote}</p>
    </div>
    <SetupNotes>{!e7 && <LabHint>{DEVICE_SAMPLE.limitedManagement}</LabHint>}
    {input.support === 'remote' && <LabHint>{DEVICE_SAMPLE.remoteSetup}</LabHint>}
    <LabHint>{DEVICE_SAMPLE.report}</LabHint>
    <LabHint>{DEVICE_SAMPLE.rights} Nothing here runs an update or starts a remote session.</LabHint></SetupNotes>
  </section>;
}

function PersonDeviceArt() {
  return <svg className="it-route-art" viewBox="0 0 128 96" aria-hidden="true" focusable="false">
    <circle className="it-art-paper" cx="38" cy="25" r="13" />
    <path className="it-art-soft" d="M15 74V59Q15 42 38 42Q59 42 61 59V74Z" />
    <path className="it-art-line" d="M26 73V60M48 73V60" />
    <rect className="it-art-paper" x="64" y="42" width="50" height="33" rx="3" />
    <rect className="it-art-wash" x="70" y="48" width="38" height="20" rx="1" />
    <path className="it-art-soft" d="M63 75H115L122 82H56Z" />
    <path className="it-art-line" d="M12 84H123" />
  </svg>;
}

function IdentityGateArt({ open, configured }: { open: boolean; configured: boolean }) {
  return <svg className="it-route-art" viewBox="0 0 128 96" aria-hidden="true" focusable="false" data-configured={configured}>
    <path className="it-art-line" d="M12 84H117" />
    <rect className="it-art-soft" x="24" y="52" width="15" height="32" rx="3" />
    <rect className="it-art-paper" x="101" y="61" width="9" height="23" rx="2" />
    <path className="it-gate-arm" d={open ? 'M32 52L78 12' : 'M32 52H105'} />
    <circle className="it-art-accent" cx="31.5" cy="54" r="5" />
    <path className="it-art-line" d="M18 23H45M18 31H36" />
  </svg>;
}

function ConnectorArt({ connected }: { connected: boolean }) {
  return <svg className="it-route-art" viewBox="0 0 128 96" aria-hidden="true" focusable="false" data-connected={connected}>
    <rect className="it-art-soft" x="12" y="27" width="32" height="42" rx="4" />
    <rect className="it-art-paper" x="84" y="27" width="32" height="42" rx="4" />
    <path className="it-art-line" d="M20 37H36M20 46H32M92 37H108M92 46H104" />
    <path className="it-connector-cable" d={connected ? 'M44 48H84' : 'M44 48H55M74 48H84'} />
    <path className="it-art-line" d={connected ? 'M60 41L68 48L60 55' : 'M55 42V54M74 42V54'} />
    <path className="it-art-line" d="M8 84H120" />
  </svg>;
}

function ResourceArt({ privateApp }: { privateApp: boolean }) {
  return <svg className="it-route-art" viewBox="0 0 128 96" aria-hidden="true" focusable="false">
    {privateApp ? <>
      <rect className="it-art-soft" x="25" y="15" width="78" height="68" rx="4" />
      <path className="it-art-line" d="M25 32H103M36 23H40M46 23H50" />
      <rect className="it-art-paper" x="38" y="42" width="21" height="27" rx="2" />
      <path className="it-art-line" d="M70 44H92M70 53H88M70 62H83" />
    </> : <>
      <path className="it-art-soft" d="M17 32V24Q17 20 22 20H50L60 30H104Q109 30 109 35V79Q109 83 105 83H21Q17 83 17 79Z" />
      <path className="it-art-paper" d="M37 65V12H76L91 27V65Z" />
      <path className="it-art-line" d="M76 12V27H91M46 36H78M46 44H78M46 52H70" />
      <path className="it-art-wash" d="M17 51H111L105 83H23Z" />
    </>}
    <path className="it-art-line" d="M11 86H117" />
  </svg>;
}

export function AccessActivity({ input, suite, variant, onChange }: MissionActivityProps<'access'>) {
  const e7 = suite === 'm365e7';
  const risky = variant === 'curveball';
  const privateApp = input.resource === 'private-app';
  const configured = e7 ? input.policyEnabled : !input.policyEnabled;
  const verified = input.verify === 'mfa';
  const gateText = !e7 && input.policyEnabled ? 'Premium policy needs separate entitlement'
    : e7 && !input.policyEnabled ? 'Premium policy not configured'
      : !verified ? 'MFA challenge still open'
        : risky && e7 ? 'Configured P2 MFA challenge met'
          : risky ? 'Basic MFA met; P2 response absent' : 'Illustrated MFA challenge met';
  const connectionText = !e7 ? 'Separate entitlement or tool'
    : input.privateConnector ? 'Prepared client, connector and publication' : 'Client, connector and publication missing';
  const routeSummary = !e7 && (privateApp || input.policyEnabled)
    ? 'The selected premium path needs separate entitlement or tools with Office 365 E3. Basic identity and MFA remain available; selecting a policy or connector cannot activate this path.'
    : risky && !e7
      ? 'The basic identity route does not configure the P2 response required by this risky sample. Review is still needed; no automatic risk enforcement is claimed.'
    : e7 && !input.policyEnabled
      ? 'No premium gate is configured. This diagram does not claim that an unconfigured real tenant would automatically deny access.'
      : privateApp && (!e7 || !input.privateConnector)
        ? 'The private path is incomplete. Completed MFA cannot supply missing entitlement, client setup, a connector or app publication.'
        : verified
          ? 'The selected verification step is complete. Maya’s existing resource permissions remain the limit; this is not proof of a safe sign-in.'
          : 'The prepared request is waiting for the employee to complete its MFA challenge.';

  return <section className="lab-activity it-access-activity it-access" aria-label="Access gate">
    <ArtifactHeading icon={<Route />} title="Maya’s route to work">
      {risky
        ? 'The same permitted request has an authored sign-in-risk condition. It is a prepared case, not a live threat alert.'
        : 'An expected, already permitted work request. Follow the person, the identity gate and the resource.'}
    </ArtifactHeading>

    <ChoiceStrip label="Where is Maya going?" value={input.resource}
      options={[
        { value: 'work-files', label: 'Project work files', detail: 'Maya is already allowed to read the illustrated Lantern files.' },
        {
          value: 'private-app', label: 'Private project app', detail: 'Maya is assigned and authorized for the project view; the private path still needs setup.',
          unavailable: !e7 ? 'Separate entitlement or tool with Office 365 E3' : undefined,
        },
      ]}
      onChange={resource => onChange({ ...input, resource })} />

    <figure className="it-access-route" aria-label="Prepared person, device and resource route">
      <ol className="it-route-stations" data-private={privateApp}>
        <li>
          <PersonDeviceArt />
          <div className="it-route-copy">
            <strong>{WORKPLACE.employee}</strong>
            <span>Supported Windows device</span>
            <small>{verified ? 'Completed MFA' : 'Password only'}</small>
          </div>
        </li>
        <li data-gap={!configured}>
          <IdentityGateArt open={configured && verified} configured={configured} />
          <div className="it-route-copy">
            <strong>{e7 || input.policyEnabled ? 'Scoped identity policy' : 'Basic identity & MFA'}</strong>
            <span>{gateText}</span>
          </div>
        </li>
        {privateApp && <li data-gap={!e7 || !input.privateConnector}>
          <ConnectorArt connected={e7 && input.privateConnector} />
          <div className="it-route-copy">
            <strong>Private Access route</strong>
            <span>{connectionText}</span>
          </div>
        </li>}
        <li>
          <ResourceArt privateApp={privateApp} />
          <div className="it-route-copy">
            <strong>{privateApp ? ACCESS_SAMPLE.privateApp : ACCESS_SAMPLE.workFiles}</strong>
            <span>Existing permission: allowed</span>
            <small>Only this assigned resource</small>
          </div>
        </li>
      </ol>
      <figcaption role="status" aria-live="polite">{routeSummary}</figcaption>
    </figure>

    <div className="it-access-settings">
      <ChoiceStrip label="Verification completed" value={input.verify}
        options={[
          { value: 'password', label: 'Password only', detail: 'The illustrated MFA challenge is still outstanding.' },
          { value: 'mfa', label: 'Completed MFA', detail: 'Model a successfully completed challenge, not a button that bypasses it.' },
        ]}
        onChange={verify => onChange({ ...input, verify })} />
      <fieldset className="it-access-policy">
        <legend>Prepare the route’s gates</legend>
        <LabToggle label="Assign the premium access policy" checked={input.policyEnabled}
          detail={!e7
            ? 'This P1/P2 policy needs separate entitlement. Basic identity and MFA are still available without it.'
            : risky
              ? `Scope the fictional “${ACCESS_SAMPLE.riskPolicy}” policy to Maya and this resource; configure the P2 risk response to require MFA for this authored condition.`
              : 'Scope the MFA and compliant-device requirements to Maya and this resource. The case supplies the device context below.'}
          onChange={policyEnabled => onChange({ ...input, policyEnabled })} />
        {privateApp && <LabToggle label="Prepare the Private Access route" checked={input.privateConnector}
          detail={!e7
            ? 'Separate entitlement or tools are required. This choice cannot provision a private route under Office 365 E3 alone.'
            : 'Model a signed-in Global Secure Access client, a healthy private network connector and an app publication assigned to Maya.'}
          onChange={privateConnector => onChange({ ...input, privateConnector })} />}
      </fieldset>
    </div>

    {!privateApp && <LabHint>Work files use their existing route. The Private Access setting is not used for this request.</LabHint>}
    <SetupNotes>{!e7 && <LabHint>{ACCESS_SAMPLE.basicIdentity}</LabHint>}
    {risky && <LabHint>{ACCESS_SAMPLE.riskResponse}</LabHint>}
    <LabHint>{ACCESS_SAMPLE.deviceContext}</LabHint>
    <LabHint>{ACCESS_SAMPLE.permissions} No sign-in, connector or policy changes run here.</LabHint></SetupNotes>
  </section>;
}
