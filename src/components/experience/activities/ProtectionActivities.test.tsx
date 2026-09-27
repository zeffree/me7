import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_INPUTS } from '@/data/experience/fixtures';
import { LAB_SUITES, type AgentInput, type CaseVariant, type IncidentInput, type LabSuite, type SharingInput } from '@/data/experience/types';
import { AgentActivity, IncidentActivity, SharingActivity } from './ProtectionActivities';

const variants: readonly CaseVariant[] = ['everyday', 'curveball'];
const incident = (patch: Partial<IncidentInput> = {}): IncidentInput => ({ ...INITIAL_INPUTS.incident, ...patch });
const sharing = (patch: Partial<SharingInput> = {}): SharingInput => ({ ...INITIAL_INPUTS.sharing, ...patch });
const agent = (patch: Partial<AgentInput> = {}): AgentInput => ({ ...INITIAL_INPUTS.agent, ...patch });
const incidentHtml = (input: IncidentInput, suite: LabSuite = 'm365e7', variant: CaseVariant = 'everyday') =>
  renderToStaticMarkup(<IncidentActivity input={input} suite={suite} variant={variant} onChange={() => {}} />);
const sharingHtml = (input: SharingInput, suite: LabSuite = 'm365e7', variant: CaseVariant = 'everyday') =>
  renderToStaticMarkup(<SharingActivity input={input} suite={suite} variant={variant} onChange={() => {}} />);
const agentHtml = (input: AgentInput, suite: LabSuite = 'm365e7', variant: CaseVariant = 'everyday') =>
  renderToStaticMarkup(<AgentActivity input={input} suite={suite} variant={variant} onChange={() => {}} />);

describe('protection activity integration boundaries', () => {
  it.each(LAB_SUITES)('%s renders all three functional artifacts in either case without editing state', suite => {
    for (const variant of variants) {
      const onIncident = vi.fn();
      const onSharing = vi.fn();
      const onAgent = vi.fn();
      const incidentInput = incident();
      const sharingInput = sharing();
      const agentInput = agent();
      const inputs = [incidentInput, sharingInput, agentInput];
      const before = JSON.stringify(inputs);
      const html = [
        renderToStaticMarkup(<IncidentActivity input={incidentInput} suite={suite} variant={variant} onChange={onIncident} />),
        renderToStaticMarkup(<SharingActivity input={sharingInput} suite={suite} variant={variant} onChange={onSharing} />),
        renderToStaticMarkup(<AgentActivity input={agentInput} suite={suite} variant={variant} onChange={onAgent} />),
      ];
      for (const rendered of html) {
        expect(rendered).toContain('class="lab-activity protection-');
        expect(rendered).toContain('type="button"');
        expect(rendered).toContain('type="checkbox"');
        expect(rendered).toContain('aria-live="polite"');
        expect(rendered).not.toContain('<form');
        expect(rendered).not.toContain('<iframe');
        expect(rendered).not.toContain('<canvas');
        expect(rendered).not.toMatch(/>Try(?: this)?(?: setup)?<\/button>/);
        expect(rendered).not.toContain('lab-suite-switch');
      }
      expect(onIncident).not.toHaveBeenCalled();
      expect(onSharing).not.toHaveBeenCalled();
      expect(onAgent).not.toHaveBeenCalled();
      expect(JSON.stringify(inputs)).toBe(before);
    }
  });
});

describe('incident evidence board markup', () => {
  it('exposes four named, native evidence toggles and starts with an honest empty board', () => {
    const html = incidentHtml(incident());
    expect(html).toContain('<fieldset class="protection-evidence-controls">');
    expect(html.match(/class="protection-clue" aria-pressed="false"/g)).toHaveLength(4);
    expect(html).toContain('No observations pinned yet.');
    expect(html).toContain('No relationship established.');
    expect(html).not.toContain('data-linked="true"');
    expect(html).toContain('A connection is a lead, not an attack verdict.');
  });

  it('changes the visible graph and relationship notes for the actual selected clues', () => {
    const emailOnly = incidentHtml(incident({ clues: ['email'] }));
    const related = incidentHtml(incident({ clues: ['email', 'endpoint', 'benign'] }));
    expect(emailOnly.match(/class="protection-clue" aria-pressed="true"/g)).toHaveLength(1);
    expect(emailOnly).not.toContain('data-linked="true"');
    expect(related.match(/class="protection-clue" aria-pressed="true"/g)).toHaveLength(3);
    expect(related.match(/data-linked="true"/g)).toHaveLength(1);
    expect(related).toContain('Email → endpoint: the authored process activity follows the opened message.');
    expect(related).toContain('Routine inventory is pinned, but stays outside the incident chain.');
  });

  it('connects identity context to email without falsely pinning the endpoint', () => {
    const html = incidentHtml(incident({ clues: ['email', 'identity'] }));
    expect(html).toContain('class="protection-relation protection-context-arc" data-linked="true"');
    expect(html).toContain('class="protection-evidence-node" data-pinned="false"');
    expect(html).toContain('Identity ↔ incident window: useful context, not proof');
    expect(html).not.toContain('Email → endpoint:');
  });

  it('shows the noisy case explicitly rather than recycling a confirmed chain', () => {
    const html = incidentHtml(incident({ clues: ['email', 'endpoint', 'identity'] }), 'm365e7', 'curveball');
    expect(html).toContain('data-linked="true" data-unverified="true"');
    expect(html).toContain('the timestamp is unverified and overlaps the inventory task');
    expect(html).toContain('Email ↔ endpoint: connection unverified');
    expect(html).not.toContain('Email → endpoint: the authored process activity follows');
  });

  it('reveals a source-aware prepared briefing only when requested', () => {
    const off = incidentHtml(incident({ clues: ['email'] }));
    const on = incidentHtml(incident({ clues: ['email'], onboarded: true, analystAssistant: true }));
    expect(off).not.toContain('<h4>Prepared Security Copilot briefing</h4>');
    expect(on).toContain('<h4>Prepared Security Copilot briefing</h4>');
    expect(on).toContain('<dt>Selected sources</dt><dd>Email</dd>');
    expect(on).toContain('Authored offline text. No AI or tenant connection.');
    expect(on).toContain('insufficient to support a containment recommendation');
    expect(on).toContain('Security Compute Unit capacity');
    expect(on).toContain('briefing needs human review');
    expect(on.match(/checked=""/g)).toHaveLength(2);
  });

  it('presents the E3 briefing as a preview and keeps existing email protection visible', () => {
    const html = incidentHtml(incident({ analystAssistant: true }), 'o365e3');
    expect(html).toContain('Separate entitlement required.');
    expect(html).toContain('Manual relationship board');
    expect(html).toContain('Defender for Office 365 Plan 1 under the July 2026 packaging update');
    expect(html).toContain('Plan 1 includes email investigation and Real-time detections');
    expect(html).toContain('Endpoint response is separate from this suite.');
    expect(html).toContain('Supplied practice context from separately licensed tools, not an Office 365 E3 source entitlement.');
  });

  it('identifies the cloud identity source in the evidence slip, setup assumption and prepared briefing', () => {
    const html = incidentHtml(incident({ clues: ['identity'], analystAssistant: true }));
    expect(html).toContain('Entra ID Protection cloud-risk context');
    expect(html).toContain('Entra ID Protection cloud-risk sources onboarded');
    expect(html).toContain('<dt>Selected sources</dt><dd>Entra ID Protection cloud risk</dd>');
    expect(html).toContain('No AD sensor or live setup is assumed.');
  });
});

describe('document handling workbench markup', () => {
  it('shows the source, outgoing sample and label as separate things', () => {
    const html = sharingHtml(sharing());
    expect(html).toContain('<caption>Compare what would leave</caption>');
    expect(html).toContain('<th scope="col">Source sample</th>');
    expect(html).toContain('<th scope="col">Outgoing sample</th>');
    expect(html).toContain('<option value="public" selected="">Public</option>');
    expect(html).toContain('Public label, confidential content still present.');
    expect(html.match(/lantern-contact@example\.test/g)).toHaveLength(2);
    expect(html).not.toContain('data-removed="true"');
    expect(html).toContain('a label does not grant it');
  });

  it('visibly removes the actual confidential values from the prepared outgoing extract', () => {
    const html = sharingHtml(sharing({ remediate: 'redact' }));
    expect(html.match(/data-removed="true"/g)).toHaveLength(2);
    expect(html.match(/Removed from outgoing sample/g)).toHaveLength(2);
    expect(html).toContain('<del>lantern-contact@example.test</del>');
    expect(html).toContain('<del>NORTHSTAR-DEMO-014</del>');
    expect(html.match(/lantern-contact@example\.test/g)).toHaveLength(1);
    expect(html.match(/NORTHSTAR-DEMO-014/g)).toHaveLength(1);
    expect(html).toContain('Only the project name and workshop update remain');
    expect(html).toContain('The original document remains restricted.');
  });

  it('does not conceal the restricted field retained by the curveball extract', () => {
    const html = sharingHtml(sharing({ remediate: 'redact' }), 'm365e7', 'curveball');
    expect(html).toContain('data-field="care" data-removed="false"');
    expect(html.match(/Synthetic accommodation case DEMO-CARE-042/g)).toHaveLength(2);
    expect(html).toContain('Public label, confidential content still present.');
    expect(html).toContain('Retained: Restricted care note.');
    expect(html).not.toContain('The marked confidential fields are removed.');
    expect(html).toContain('Source access: <strong>restricted reviewers</strong>');
  });

  it('shows approved sharing as an alternate route, not a USB transfer or permission grant', () => {
    const html = sharingHtml(sharing({ target: 'usb', classification: 'confidential', remediate: 'approved-share' }));
    expect(html).toContain('Requested destination</span><strong>Removable USB drive');
    expect(html).toContain('Prepared handling route</span><strong>Owner-approved named-recipient link');
    expect(html).toContain('Selecting it grants no new rights and makes no USB copy.');
    expect(html).not.toContain('data-removed="true"');
    expect(html.match(/lantern-contact@example\.test/g)).toHaveLength(2);
  });

  it.each(LAB_SUITES)('%s labels the policy’s scope without claiming blanket external protection', suite => {
    const html = sharingHtml(sharing({ target: 'external', policyEnabled: true }), suite);
    expect(html).toContain('Enable the scoped USB block policy');
    expect(html).toContain('not universal external-sharing enforcement');
    expect(html).toContain('External recipients need their own permission');
    expect(html).toContain('Retention is not backup.');
    expect(html).toContain('Requested exceptions remain pending; the approved link is not a USB override.');
    expect(html).toContain('Other browser or network scenarios may be consumption-billed.');
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toContain(suite === 'o365e3'
      ? 'needs separate coverage beyond Office 365 E3'
      : 'onboarded physical Windows endpoint and a previously saved, supported local file');
  });
});

describe('owned agent passport and access path markup', () => {
  it('starts with an ownerless passport and exposes the broad grant as a real risk', () => {
    const html = agentHtml(agent());
    expect(html).toContain('aria-label="Owned agent passport"');
    expect(html).toContain('NS-LANTERN-01');
    expect(html).toContain('<option value="none" selected="">No owner recorded</option>');
    expect(html).toContain('Project and payroll: explicitly broad');
    expect(html.match(/data-source-access="granted"/g)).toHaveLength(2);
    expect(html).toContain('A passport entry or review flag does not remove payroll access.');
  });

  it('reflects the named owner and narrow source permissions in both file artifacts', () => {
    const html = agentHtml(agent({ owner: 'maya', permissions: 'project' }));
    expect(html).toContain('<option value="maya" selected="">Maya Chen');
    expect(html).toContain('<dt>Recorded owner</dt><dd>Maya Chen</dd>');
    expect(html).toContain('data-source-access="denied"');
    expect(html.match(/data-source-access="granted"/g)).toHaveLength(1);
    expect(html).toContain('Project only: payroll excluded');
    expect(html).toContain('Registration has not added any extra permission.');
  });

  it.each(LAB_SUITES)('%s makes a denied payroll request visible in either case', suite => {
    for (const variant of variants) {
      const html = agentHtml(agent({ owner: 'it', permissions: 'project', task: 'payroll', policyEnabled: true }), suite, variant);
      expect(html).toContain('class="protection-file-request" aria-pressed="true" data-source-access="denied"');
      expect(html).toContain('data-access="denied"');
      expect(html).toContain('Read denied by this fixture');
      expect(html).toContain('This boundary holds in either suite');
      expect(html).toContain('Project-only grant preserved; no payroll permission added.');
    }
  });

  it('shows a premium tool exclusion separately from an unchanged broad source grant', () => {
    const html = agentHtml(agent({ owner: 'maya', task: 'payroll', policyEnabled: true }));
    expect(html).toContain('data-access="granted"');
    expect(html).toContain('data-tool-policy="excluded"');
    expect(html).toContain('Excluded by the scoped tool policy');
    expect(html).toContain('Broad source grant remains: a source administrator must narrow it.');
    expect(html).toContain('source file permissions are unchanged');
    expect(html).toContain('This supported tool request is stopped, but source permission still grants payroll access.');
    expect(html).toContain('Selective tool control is distinct from basic whole-agent blocking.');
  });

  it('keeps basic E3 agent inventory included and only the premium policy preview separately licensed', () => {
    const html = agentHtml(agent({ owner: 'it', permissions: 'project', policyEnabled: true }), 'o365e3');
    expect(html).toContain('Basic Agent 365 inventory and owner reassignment included.');
    expect(html).toContain('Manual records also work; premium tool policies are separate.');
    expect(html).toContain('Preview only. This does not activate premium Agent 365 policies in Office 365 E3.');
    expect(html).toContain('does not build them, confer file rights or supply unlimited runtime');
    expect(html).toContain('VIEW and EXTRACT rights');
    expect(html).toContain('New agent content does not automatically inherit source sensitivity labels.');
  });

  it.each(LAB_SUITES)('%s shows the tool policy independently from both the owner and file ACL', suite => {
    const html = agentHtml(agent({ owner: 'maya', permissions: 'all', task: 'payroll', policyEnabled: true }), suite);
    expect(html).toContain('data-access="granted"');
    expect(html).toContain('data-tool-policy="' + (suite === 'm365e7' ? 'excluded' : 'inactive') + '"');
    expect(html).toContain(suite === 'm365e7' ? 'Excluded by the scoped tool policy' : 'Separate coverage; preview only');
    expect(html).toContain('Project reader is permitted; Payroll reader is excluded.');
  });

  it('shows the unexpected request and a human handoff without changing the selected project scope', () => {
    const html = agentHtml(agent({ owner: 'maya', permissions: 'project', task: 'project', policyEnabled: true }), 'm365e7', 'curveball');
    expect(html).toContain('Could the workshop helper add payroll to the brief?');
    expect(html).toContain('send payroll questions to an authorised human');
    expect(html).toContain('Request matches the project purpose.');
    expect(html).toContain('data-source-access="denied"');
    expect(html).not.toContain('data-access="denied"');
  });
});
