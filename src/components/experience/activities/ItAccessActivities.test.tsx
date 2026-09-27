import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { INITIAL_INPUTS, WORKPLACE } from '@/data/experience/fixtures';
import { ACCESS_SAMPLE, DEVICE_SAMPLE } from '@/data/experience/missions/itAccess';
import { LAB_SUITES, type AccessInput, type CaseVariant, type DeviceInput } from '@/data/experience/types';
import { ChoiceStrip, LabToggle } from '../ActivityPrimitives';
import { AccessActivity, DeviceActivity } from './ItAccessActivities';

const variants: readonly CaseVariant[] = ['everyday', 'curveball'];
const suiteCases = LAB_SUITES.flatMap(suite => variants.map(variant => ({ suite, variant })));
type ToggleProps = Parameters<typeof LabToggle>[0];
type ChoiceProps<T extends string> = Parameters<typeof ChoiceStrip<T>>[0];

function elements<P>(root: ReactNode, type: unknown): ReactElement<P>[] {
  const found: ReactElement<P>[] = [];
  Children.forEach(root, child => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return;
    if (child.type === type) found.push(child as ReactElement<P>);
    found.push(...elements<P>(child.props.children, type));
  });
  return found;
}

const escape = (text: string) => renderToStaticMarkup(<span>{text}</span>).slice(6, -7);

function expectNoParentControls(html: string) {
  expect(html).not.toMatch(/lab-suite-switch|lab-attempt|lab-replay|lab-debrief|<nav\b/);
  expect(html).not.toMatch(/<canvas\b|<audio\b|<video\b|autoplay|onclick=/i);
  expect(html).toContain('role="status" aria-live="polite"');
  expect(html).toContain('type="button"');
}

describe('controlled device bench', () => {
  it.each(suiteCases)('$suite / $variant renders a labeled laptop, meaningful slots and native controls', ({ suite, variant }) => {
    const html = renderToStaticMarkup(<DeviceActivity input={INITIAL_INPUTS.device} suite={suite} variant={variant} onChange={() => {}} />);
    expect(html).toContain('aria-label="Device bench"');
    expect(html).toContain('aria-label="Sample laptop configuration record"');
    expect(html).toContain(DEVICE_SAMPLE.assetTag);
    expect(html).toContain(DEVICE_SAMPLE.platform);
    expect(html).toContain('Enroll the sample device');
    expect(html).toContain('Complete the update checklist');
    expect(html).toContain('Assign the compliance gate');
    expect(html).toContain('Who helps with the repair?');
    expect(html).toContain('Tenant check-in');
    expect(html.match(/type="checkbox"/g)).toHaveLength(3);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain(escape(DEVICE_SAMPLE.report));
    expect(html).toContain('Nothing here runs an update or starts a remote session');
    expectNoParentControls(html);
  });

  it.each(suiteCases)('$suite / $variant emits a complete typed input for every device toggle and support choice', ({ suite, variant }) => {
    const input: DeviceInput = { kind: 'device', enrolled: false, patched: true, requireCompliance: true, support: 'self' };
    const original = { ...input };
    const onChange = vi.fn();
    const tree = DeviceActivity({ input, suite, variant, onChange });
    const toggles = elements<ToggleProps>(tree, LabToggle);
    expect(toggles).toHaveLength(3);
    const controls = [
      { label: 'Enroll the sample device', key: 'enrolled' },
      { label: 'Complete the update checklist', key: 'patched' },
      { label: 'Assign the compliance gate', key: 'requireCompliance' },
    ] as const;
    for (const { label, key } of controls) {
      toggles.find(item => item.props.label === label)!.props.onChange(!input[key]);
      expect(onChange).toHaveBeenLastCalledWith({ ...input, [key]: !input[key] });
    }
    const choices = elements<ChoiceProps<DeviceInput['support']>>(tree, ChoiceStrip);
    expect(choices).toHaveLength(1);
    expect(choices[0].props.options.map(option => option.value)).toEqual(['self', 'remote']);
    choices[0].props.onChange('remote');
    expect(onChange).toHaveBeenLastCalledWith({ ...input, support: 'remote' });
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(input).toEqual(original);
  });

  it('renders controlled edits on the next parent render rather than keeping its own device state', () => {
    const input: DeviceInput = { ...INITIAL_INPUTS.device };
    let changed = input;
    const first = DeviceActivity({ input, suite: 'm365e7', variant: 'everyday', onChange: value => { changed = value; } });
    const enrollment = elements<ToggleProps>(first, LabToggle).find(item => item.props.label === 'Enroll the sample device')!;
    enrollment.props.onChange(true);
    expect(input.enrolled).toBe(false);
    const next = renderToStaticMarkup(<DeviceActivity input={changed} suite="m365e7" variant="everyday" onChange={() => {}} />);
    expect(next).toContain('Prepared enrollment');
    expect(next).toContain('Simulated fresh report');
    expect(next.match(/checked=""/g)).toHaveLength(1);
  });

  it('keeps unavailable E3 controls explorable and labels the separate purchase', () => {
    const input: DeviceInput = { kind: 'device', enrolled: true, patched: true, requireCompliance: true, support: 'remote' };
    const html = renderToStaticMarkup(<DeviceActivity input={input} suite="o365e3" variant="everyday" onChange={() => {}} />);
    expect(html).toContain('Intune not in this suite');
    expect(html).toContain(escape(DEVICE_SAMPLE.limitedManagement));
    expect(html).toContain('Separate purchase with Office 365 E3');
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain('Simulated fresh report');
    expect(html.match(/checked=""/g)).toHaveLength(3);
  });

  it('shows the offline remote wait and the cached self-service alternative without claiming a report', () => {
    const input: DeviceInput = { kind: 'device', enrolled: true, patched: true, requireCompliance: true, support: 'remote' };
    const remote = renderToStaticMarkup(<DeviceActivity input={input} suite="m365e7" variant="curveball" onChange={() => {}} />);
    expect(remote).toContain('Remote Help is pending');
    expect(remote).toContain('Fresh report pending');
    expect(remote).toContain('Previously enrolled');
    expect(remote).not.toContain('Simulated fresh report');
    const local = renderToStaticMarkup(<DeviceActivity input={{ ...input, patched: false, support: 'self' }} suite="m365e7" variant="curveball" onChange={() => {}} />);
    expect(local).toContain('IT-approved update package is already cached');
    expect(local).toContain('no download or remote connection is needed');
  });

  it.each(variants)('%s: Remote Help makes tenant, identity, permission and consent prerequisites explicit', variant => {
    const html = renderToStaticMarkup(<DeviceActivity input={{ ...INITIAL_INPUTS.device, support: 'remote' }}
      suite="m365e7" variant={variant} onChange={() => {}} />);
    expect(html).toContain(escape(DEVICE_SAMPLE.remoteSetup));
    expect(html).toContain('tenant enablement');
    expect(html).toContain('organizational identities');
    expect(html).toContain('scoped helper permissions');
    expect(html).toContain('employee consent');
    expect(html).toContain('Windows Pro/Enterprise rights');
    expect(html).toContain('not a free Windows Home upgrade');
  });
});

describe('controlled access route', () => {
  it.each(suiteCases)('$suite / $variant renders an ordered person/device/resource scene and basic verification choices', ({ suite, variant }) => {
    const html = renderToStaticMarkup(<AccessActivity input={INITIAL_INPUTS.access} suite={suite} variant={variant} onChange={() => {}} />);
    expect(html).toContain('aria-label="Access gate"');
    expect(html).toContain('aria-label="Prepared person, device and resource route"');
    expect(html).toContain('<ol class="it-route-stations"');
    expect(html).toContain(WORKPLACE.employee);
    expect(html).toContain('Supported Windows device');
    expect(html).toContain(ACCESS_SAMPLE.workFiles);
    expect(html).toContain('Existing permission: allowed');
    expect(html).toContain('Verification completed');
    expect(html).toContain('Assign the premium access policy');
    expect(html).toContain('Work files use their existing route');
    expect(html).toContain(escape(ACCESS_SAMPLE.deviceContext));
    expect(html).toContain(escape(ACCESS_SAMPLE.permissions));
    expect(html.match(/type="checkbox"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expectNoParentControls(html);
  });

  it.each(suiteCases)('$suite / $variant emits complete typed route, verification and configuration inputs', ({ suite, variant }) => {
    const input: AccessInput = { kind: 'access', resource: 'private-app', verify: 'password', policyEnabled: false, privateConnector: true };
    const original = { ...input };
    const onChange = vi.fn();
    const tree = AccessActivity({ input, suite, variant, onChange });
    const toggles = elements<ToggleProps>(tree, LabToggle);
    expect(toggles).toHaveLength(2);
    toggles.find(item => item.props.label === 'Assign the premium access policy')!.props.onChange(true);
    expect(onChange).toHaveBeenLastCalledWith({ ...input, policyEnabled: true });
    toggles.find(item => item.props.label === 'Prepare the Private Access route')!.props.onChange(false);
    expect(onChange).toHaveBeenLastCalledWith({ ...input, privateConnector: false });

    const routes = elements<ChoiceProps<AccessInput['resource']>>(tree, ChoiceStrip);
    const resource = routes.find(item => item.props.label === 'Where is Maya going?')!;
    expect(resource.props.options.map(option => option.value)).toEqual(['work-files', 'private-app']);
    resource.props.onChange('work-files');
    expect(onChange).toHaveBeenLastCalledWith({ ...input, resource: 'work-files' });
    const verify = elements<ChoiceProps<AccessInput['verify']>>(tree, ChoiceStrip).find(item => item.props.label === 'Verification completed')!;
    expect(verify.props.options.map(option => option.value)).toEqual(['password', 'mfa']);
    verify.props.onChange('mfa');
    expect(onChange).toHaveBeenLastCalledWith({ ...input, verify: 'mfa' });
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(input).toEqual(original);
  });

  it('adds the private setup control only on its route and preserves other parent-owned choices', () => {
    const input: AccessInput = { ...INITIAL_INPUTS.access, verify: 'mfa', privateConnector: true };
    let changed = input;
    const workFiles = AccessActivity({ input, suite: 'm365e7', variant: 'everyday', onChange: value => { changed = value; } });
    expect(elements<ToggleProps>(workFiles, LabToggle)).toHaveLength(1);
    elements<ChoiceProps<AccessInput['resource']>>(workFiles, ChoiceStrip)
      .find(item => item.props.label === 'Where is Maya going?')!.props.onChange('private-app');
    expect(changed).toEqual({ ...input, resource: 'private-app' });
    const privateRoute = AccessActivity({ input: changed, suite: 'm365e7', variant: 'everyday', onChange: () => {} });
    expect(elements<ToggleProps>(privateRoute, LabToggle)).toHaveLength(2);
    const html = renderToStaticMarkup(privateRoute);
    expect(html).toContain('data-private="true"');
    expect(html).toContain('Prepared client, connector and publication');
    expect(html).toContain(ACCESS_SAMPLE.privateApp);
    expect(html).not.toContain('Work files use their existing route');
  });

  it.each(variants)('%s: completed MFA does not disguise an unconfigured policy or private route', variant => {
    const input: AccessInput = { kind: 'access', resource: 'private-app', verify: 'mfa', policyEnabled: false, privateConnector: false };
    const missingPolicy = renderToStaticMarkup(<AccessActivity input={input} suite="m365e7" variant={variant} onChange={() => {}} />);
    expect(missingPolicy).toContain('Premium policy not configured');
    expect(missingPolicy).toContain('does not claim that an unconfigured real tenant would automatically deny access');
    expect(missingPolicy).toContain('Client, connector and publication missing');
    const missingPath = renderToStaticMarkup(<AccessActivity input={{ ...input, policyEnabled: true }} suite="m365e7" variant={variant} onChange={() => {}} />);
    expect(missingPath).toContain('The private path is incomplete');
    expect(missingPath).toContain('Completed MFA cannot supply missing entitlement');
    expect(missingPath).toContain('Existing permission: allowed');
  });

  it('distinguishes E3 basic MFA from a separately entitled premium policy and risk response', () => {
    const input: AccessInput = { ...INITIAL_INPUTS.access, verify: 'mfa' };
    const everyday = renderToStaticMarkup(<AccessActivity input={input} suite="o365e3" variant="everyday" onChange={() => {}} />);
    expect(everyday).toContain('Basic identity &amp; MFA');
    expect(everyday).toContain('Illustrated MFA challenge met');
    expect(everyday).toContain(escape(ACCESS_SAMPLE.basicIdentity));
    expect(everyday).toContain('Security defaults are available in Microsoft Entra ID Free');
    const curveball = renderToStaticMarkup(<AccessActivity input={input} suite="o365e3" variant="curveball" onChange={() => {}} />);
    expect(curveball).toContain('Basic MFA met; P2 response absent');
    expect(curveball).toContain('no automatic risk enforcement is claimed');
    const premium = renderToStaticMarkup(<AccessActivity input={{ ...input, policyEnabled: true }} suite="o365e3" variant="everyday" onChange={() => {}} />);
    expect(premium).toContain('Premium policy needs separate entitlement');
    expect(premium).toContain('Basic identity and MFA are still available without it');
  });

  it('shows that an E7 risk challenge is authored and configured rather than inferring safety', () => {
    const html = renderToStaticMarkup(<AccessActivity
      input={{ ...INITIAL_INPUTS.access, verify: 'mfa', policyEnabled: true }}
      suite="m365e7" variant="curveball" onChange={() => {}} />);
    expect(html).toContain('authored sign-in-risk condition');
    expect(html).toContain('Configured P2 MFA challenge met');
    expect(html).toContain('configure the P2 risk response to require MFA');
    expect(html).toContain(ACCESS_SAMPLE.riskPolicy);
    expect(html).toContain('does not clear every risk');
    expect(html).toContain('not proof of a safe sign-in');
  });
});

describe('scoped artifact styling', () => {
  it('uses only existing Clawpilot colors and a mobile layout without authored motion', async () => {
    const { readFileSync } = await vi.importActual<{
      readFileSync: (path: URL, encoding: 'utf8') => string;
    }>('node:fs');
    const activityStyles = readFileSync(new URL('it-access.css', import.meta.url), 'utf8');
    const parentStyles = readFileSync(new URL('experience.css', new URL('..', import.meta.url)), 'utf8');
    const variables = Array.from(activityStyles.matchAll(/var\((--cp-[\w-]+)\)/g), match => match[1]);
    expect(variables.length).toBeGreaterThan(0);
    for (const variable of variables) expect(parentStyles).toContain(`${variable}:`);
    expect(activityStyles).not.toMatch(/#[\da-f]{3,8}\b|\brgba?\(|\bhsla?\(/i);
    expect(activityStyles).not.toMatch(/\bfont-family\s*:|\banimation\s*:|\btransition\s*:/);
    expect(activityStyles).toContain('@container (max-width: 38rem)');
    expect(activityStyles).toContain('minmax(min(100%, 16rem), 1fr)');
    expect(parentStyles).toContain('min-height: 44px');
    expect(parentStyles).toContain(':focus-visible');
  });
});
