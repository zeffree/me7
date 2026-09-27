import { INCIDENT_CLUES } from '@/data/experience/fixtures';
import { AGENT_SAMPLE, SHARING_ROUTES } from '@/data/experience/missions/protection';
import type { AgentInput, ClueId, IncidentInput, MissionActivityProps, SharingInput } from '@/data/experience/types';
import { getAgentAccess, getAgentToolControl, getIncidentBoard, getSharingPreview } from '@/lib/experienceProtection';
import { ArtifactHeading, ChoiceStrip, LabHint, LabToggle } from '../ActivityPrimitives';
import './protection.css';

function ProtectionSymbol({ kind }: { kind: 'incident' | 'sharing' | 'agent' }) {
  return <svg viewBox="0 0 28 28" fill="var(--cp-clear)" stroke="var(--cp-accent)" strokeWidth="1.6" aria-hidden="true">
    {kind === 'incident' ? <>
      <circle cx="6" cy="7" r="3" /><circle cx="22" cy="7" r="3" /><circle cx="14" cy="22" r="3" />
      <path d="M9 7h10M8 10l4 9m8-9-4 9" />
    </> : kind === 'sharing' ? <>
      <path d="M5 3h12l6 6v16H5zM17 3v6h6M9 14h10M9 18h7" />
    </> : <>
      <rect x="3" y="7" width="22" height="17" rx="3" /><path d="M14 3v4M8 18h12" />
      <circle cx="9" cy="13" r="1" /><circle cx="19" cy="13" r="1" />
    </>}
  </svg>;
}

function PinnedMark({ selected }: { selected: boolean }) {
  return <svg viewBox="0 0 24 24" fill="var(--cp-clear)" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke={selected ? 'var(--cp-accent)' : 'var(--cp-border-strong)'} strokeWidth="1.5" />
    {selected && <path d="m7.5 12 3 3 6-6" stroke="var(--cp-accent)" strokeWidth="2" />}
  </svg>;
}

export function IncidentActivity({ input, suite, variant, onChange }: MissionActivityProps<'incident'>) {
  const board = getIncidentBoard(input, variant);
  const has = (id: ClueId) => board.selected.some(clue => clue.id === id);
  const pin = (id: ClueId) => onChange({
    ...input,
    clues: input.clues.includes(id) ? input.clues.filter(clue => clue !== id) : [...input.clues, id],
  });
  return <div className="lab-activity protection-incident">
    <ArtifactHeading icon={<ProtectionSymbol kind="incident" />} title="Maya’s incident board">
      Prepared observations, not live alerts. Pin evidence to make its relationships visible.
    </ArtifactHeading>

    <figure className="protection-evidence-board" aria-label="Selected evidence relationships">
      <div className="protection-evidence-chain">
        <svg className="protection-evidence-lines" viewBox="0 0 360 48" preserveAspectRatio="none" aria-hidden="true">
          <path d="M60 24H180" className="protection-relation"
            data-linked={board.linkedTimeline} data-unverified={variant === 'curveball'} />
          <path d="M180 24H300" className="protection-relation"
            data-linked={has('identity') && has('endpoint')} data-unverified="true" />
          <path d="M60 24Q180 -8 300 24" className="protection-relation protection-context-arc"
            data-linked={has('email') && has('identity') && !has('endpoint')} data-unverified="true" />
        </svg>
        {(['email', 'endpoint', 'identity'] as const).map(id => <div key={id}
          className="protection-evidence-node" data-pinned={has(id)}>
          <span className="protection-node-pin"><PinnedMark selected={has(id)} /></span>
          <strong>{id === 'email' ? 'Email' : id === 'endpoint' ? 'Endpoint' : 'Identity'}</strong>
          <small>{has(id) ? 'Pinned' : 'Not pinned'}</small>
        </div>)}
      </div>
      <div className="protection-routine" data-pinned={has('benign')}>
        <PinnedMark selected={has('benign')} />
        <span>Routine inventory {has('benign') ? 'is pinned, but stays outside the incident chain.' : 'is not incident evidence.'}</span>
      </div>
      <figcaption>
        {suite === 'o365e3' || !input.onboarded ? 'Manual relationship board' : 'Prepared cross-workload relationship view'}
        {variant === 'curveball' ? ' · Timeline connection unverified.' : ' · A connection is a lead, not an attack verdict.'}
      </figcaption>
    </figure>

    <fieldset className="protection-evidence-controls">
      <legend>Pin or unpin the observations</legend>
      <div className="protection-clues">{INCIDENT_CLUES.map(clue => <button type="button" key={clue.id}
        className="protection-clue" aria-pressed={has(clue.id)} onClick={() => pin(clue.id)}>
        <PinnedMark selected={has(clue.id)} />
        <span>
          <strong>{clue.title}</strong>
          <span>{clue.id === 'identity' ? 'Entra ID Protection cloud-risk context' : clue.source} · {clue.detail}</span>
          {suite === 'o365e3' && (clue.id === 'endpoint' || clue.id === 'identity') && <em>
            Supplied practice context from separately licensed tools, not an Office 365 E3 source entitlement.
          </em>}
          {variant === 'curveball' && clue.id === 'endpoint' && <em>
            Case update: the timestamp is unverified and overlaps the inventory task. Do not treat the sequence as established.
          </em>}
        </span>
      </button>)}</div>
    </fieldset>

    <div className="protection-board-notes" role="status" aria-live="polite" aria-atomic="true">
      <strong>{board.selected.length === 0 ? 'No observations pinned yet.' : `${board.selected.length} observations pinned.`}</strong>
      {board.relations.length > 0
        ? <ul>{board.relations.map(relation => <li key={relation}>{relation}</li>)}</ul>
        : <p>No relationship established. Pin the email and endpoint observations to compare them.</p>}
    </div>

    <ChoiceStrip<IncidentInput['response']> label="Prepare the analyst’s next step" value={input.response}
      options={[
        { value: 'investigate', label: 'Investigate', detail: 'Keep the case open; verify evidence.' },
        { value: 'isolate', label: 'Request isolation', detail: 'Propose a supported, human-reviewed endpoint action.', unavailable: suite === 'o365e3' ? 'Endpoint response is separate from this suite.' : undefined },
        { value: 'dismiss', label: 'Dismiss the incident', detail: 'Test whether the evidence supports closure.' },
      ]} onChange={response => onChange({ ...input, response })} />
    <LabToggle label="Verify workload and response prerequisites" checked={input.onboarded}
      detail="A lab assumption: licensed email, endpoint and Entra ID Protection cloud-risk sources onboarded; supported endpoint, integrations and response permission checked. No AD sensor or live setup is assumed."
      onChange={onboarded => onChange({ ...input, onboarded })} />
    <LabToggle label="Use a prepared Security Copilot briefing" checked={input.analystAssistant}
      detail={suite === 'o365e3'
        ? 'Preview a separate capability. Office 365 E3 does not include Security Copilot; manual review remains valid.'
        : 'Authored offline assistance. Real use needs tenant enablement, supported data access, capacity and a human reviewer.'}
      onChange={analystAssistant => onChange({ ...input, analystAssistant })} />

    {input.analystAssistant && <section className="protection-briefing" aria-label="Prepared Security Copilot briefing">
      <h4>Prepared Security Copilot briefing</h4>
      <p className="protection-muted">Authored offline text. No AI or tenant connection.</p>
      <dl>
        <div><dt>Selected sources</dt><dd>{board.selected.length
          ? board.selected.map(clue => clue.id === 'identity' ? 'Entra ID Protection cloud risk' : clue.source).join(', ')
          : 'None. Add observations before asking for a case summary.'}</dd></div>
        <div><dt>Working note</dt><dd>{variant === 'curveball'
          ? 'The device timestamp is unverified. Ask for independent corroboration; keep the case open.'
          : board.corroborated
            ? 'Email and device observations form a sequence to verify. Identity context does not independently establish compromise.'
            : 'The selected material is insufficient to support a containment recommendation.'}</dd></div>
        <div><dt>Human check</dt><dd>Verify sources, timing, authority and impact. Routine inventory is not supporting attack evidence.</dd></div>
      </dl>
      <p>{suite === 'o365e3'
        ? 'Separate entitlement required. This preview does not turn on Security Copilot for Office 365 E3.'
        : 'Confirm tenant enablement and available Security Compute Unit capacity. The included allowance is not unlimited; the briefing needs human review.'}</p>
    </section>}
    <LabHint>
      Office 365 E3 already includes Defender for Office 365 Plan 1 under the July 2026 packaging update.
      Plan 1 includes email investigation and Real-time detections, not only preventive filtering.
      A risky sign-in alone does not prove an attack, and no choice here guarantees containment.
    </LabHint>
  </div>;
}

export function SharingActivity({ input, suite, variant, onChange }: MissionActivityProps<'sharing'>) {
  const preview = getSharingPreview(input, variant);
  return <div className="lab-activity protection-sharing">
    <ArtifactHeading icon={<ProtectionSymbol kind="sharing" />} title="Lantern workshop brief">
      A synthetic document handling workbench. Compare the source with the copy you propose to release.
    </ArtifactHeading>

    <div className="protection-document-meta">
      <label>Applied label
        <select value={input.classification} onChange={event => onChange({
          ...input, classification: event.target.value === 'public' ? 'public' : 'confidential',
        })}>
          <option value="public">Public</option>
          <option value="confidential">Confidential</option>
        </select>
      </label>
      <p>Source access: <strong>{variant === 'curveball' ? 'restricted reviewers' : 'Lantern team'}</strong>.<br />
        External recipients need their own permission; a label does not grant it.</p>
    </div>

    <div className="protection-document">
      <table>
        <caption>Compare what would leave</caption>
        <thead><tr><th scope="col">Field</th><th scope="col">Source sample</th><th scope="col">Outgoing sample</th></tr></thead>
        <tbody>{preview.fields.map(field => <tr key={field.id} data-field={field.id} data-removed={field.removed}>
          <th scope="row">{field.label}<small>{field.sensitivity === 'public' ? 'Public content' : field.sensitivity === 'restricted' ? 'Restricted content' : 'Confidential content'}</small></th>
          <td>{field.removed ? <del>{field.value}</del> : field.value}</td>
          <td>{field.removed ? <span className="protection-removed">Removed from outgoing sample</span> : field.value}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="protection-document-note">Every value is fictional. The source column remains visible for this lesson; only the outgoing column represents the proposed copy.</p>
    <div className="protection-content-state" role="status" aria-live="polite" aria-atomic="true">
      <strong>{preview.labelMismatch ? 'Public label, confidential content still present.' : preview.hasSensitiveContent
        ? 'Confidential content remains in this copy.' : 'The marked confidential fields are removed.'}</strong>
      <p>{preview.hasSensitiveContent
        ? `Retained: ${preview.remainingSensitive.map(field => field.label).join(', ')}.`
        : 'Only the project name and workshop update remain in the prepared public extract.'}</p>
    </div>

    <ChoiceStrip<SharingInput['target']> label="Choose the intended destination" value={input.target}
      options={[
        { value: 'team', label: 'Team workspace', detail: 'Use the existing document permissions.' },
        { value: 'external', label: 'External reviewer', detail: 'Not a permitted reader of the original.' },
        { value: 'usb', label: 'USB drive', detail: 'Test the supported endpoint-copy rule.' },
      ]} onChange={target => onChange({ ...input, target })} />
    <ChoiceStrip<SharingInput['remediate']> label="Prepare the outgoing version" value={input.remediate}
      options={[
        { value: 'none', label: 'Keep the original', detail: 'No fields removed or permissions changed.' },
        { value: 'redact', label: 'Use prepared extract', detail: variant === 'curveball'
          ? 'Removes two fields; the care note remains.'
          : 'Reviewed extract removes the contact and contract.' },
        { value: 'approved-share', label: 'Use approved link', detail: 'Existing approval and named-recipient access; no USB export.' },
      ]} onChange={remediate => onChange({ ...input, remediate })} />

    <figure className="protection-route" aria-label="Proposed document route">
      <div><span>Requested destination</span><strong>{SHARING_ROUTES[input.target]}</strong></div>
      <svg viewBox="0 0 64 24" aria-hidden="true">
        <path d="M2 12h58m-8-8 8 8-8 8" fill="var(--cp-clear)" stroke="var(--cp-accent)" strokeWidth="2" />
      </svg>
      <div><span>Prepared handling route</span><strong>{preview.route}</strong></div>
      <figcaption>{preview.approvedLink
        ? 'The alternate already has owner approval and explicit access for named reviewers. Selecting it grants no new rights and makes no USB copy.'
        : preview.publicExtract
          ? 'The everyday extract has prepared owner approval for public release. The original document remains restricted.'
          : 'A proposed route is not an approved transfer. Use the common Try button to examine this setup.'}</figcaption>
    </figure>

    <LabToggle label="Enable the scoped USB block policy" checked={input.policyEnabled}
      detail={suite === 'o365e3'
        ? 'This advanced Endpoint DLP scenario needs separate coverage beyond Office 365 E3. The toggle does not add licensing.'
        : 'Assume an onboarded physical Windows endpoint and a previously saved, supported local file. Scope this Block rule to the sample’s confidential content or Confidential label.'}
      onChange={policyEnabled => onChange({ ...input, policyEnabled })} />
    <LabHint>
      This is one USB policy, not universal external-sharing enforcement. Office 365 E3 already has baseline protections in supported services.
      Requested exceptions remain pending; the approved link is not a USB override. Other browser or network scenarios may be consumption-billed.
      Labels and recipient permissions still need review. Retention is not backup.
    </LabHint>
  </div>;
}

export function AgentActivity({ input, suite, variant, onChange }: MissionActivityProps<'agent'>) {
  const access = getAgentAccess(input);
  const toolControl = getAgentToolControl(input, suite);
  return <div className="lab-activity protection-agent">
    <ArtifactHeading icon={<ProtectionSymbol kind="agent" />} title="An agent with a modest job">
      A prepared workshop helper, not a running agent. Inspect its basic owner record, source permissions and separate selective tool control.
    </ArtifactHeading>

    <section className="protection-passport" aria-label="Owned agent passport">
      <div className="protection-passport-title">
        <ProtectionSymbol kind="agent" />
        <div><h4>{AGENT_SAMPLE.name}</h4><p>{AGENT_SAMPLE.id} · Agent passport</p></div>
      </div>
      <dl>
        <div><dt>Purpose</dt><dd>{AGENT_SAMPLE.purpose}</dd></div>
        <div><dt>Recorded owner</dt><dd>{access.owner}</dd></div>
        <div><dt>Source grant</dt><dd>{access.broad ? 'Project and payroll: explicitly broad' : 'Project only: payroll excluded'}</dd></div>
        <div><dt>Inventory method</dt><dd>{suite === 'o365e3'
          ? 'Basic Agent 365 inventory and owner reassignment included. Manual records also work; premium tool policies are separate.'
          : 'Basic Agent 365 inventory with premium policies available. Real registration and tenant setup still required.'}</dd></div>
      </dl>
      <label className="protection-owner">Assign the accountable owner
        <select value={input.owner} onChange={event => {
          const owner: AgentInput['owner'] = event.target.value === 'maya' ? 'maya' : event.target.value === 'it' ? 'it' : 'none';
          onChange({ ...input, owner });
        }}>
          <option value="none">No owner recorded</option>
          <option value="maya">Maya Chen · project owner</option>
          <option value="it">Northstar IT · service owner</option>
        </select>
      </label>
    </section>

    <LabToggle label="Include payroll in the source grant" checked={access.broad}
      detail="On explicitly grants project and payroll read access in this fixture. Off limits the grant to project files. This is a source-permission change, not an automatic E7 repair."
      onChange={broad => onChange({ ...input, permissions: broad ? 'all' : 'project' })} />
    {variant === 'curveball' && <blockquote className="protection-request">
      <p>“Could the workshop helper add payroll to the brief?”</p>
      <footer>An unexpected, fictional request. Keep the source boundary and send payroll questions to an authorised human.</footer>
    </blockquote>}

    <fieldset className="protection-file-requests">
      <legend>Choose the file request to inspect</legend>
      {(['project', 'payroll'] as const).map(task => <button key={task} type="button"
        className="protection-file-request" aria-pressed={input.task === task}
        data-source-access={task === 'project' || access.broad ? 'granted' : 'denied'}
        onClick={() => onChange({ ...input, task })}>
        <ProtectionSymbol kind="sharing" />
        <span><strong>{AGENT_SAMPLE[task].title}</strong><span>{AGENT_SAMPLE[task].content}</span><span>Prepared tool: {AGENT_SAMPLE.tools[task]}</span></span>
        <small>{task === 'project' || access.broad ? 'Read granted' : 'Read denied'}</small>
      </button>)}
    </fieldset>

    <figure className="protection-access-path" aria-label="Prepared file-access path">
      <ol>
        <li><span>Agent identity</span><strong>{AGENT_SAMPLE.id}</strong></li>
        <li><span>Source permission</span><strong>{access.broad ? 'Project + payroll' : 'Project only'}</strong></li>
        <li data-tool-policy={toolControl.active ? toolControl.allows ? 'permitted' : 'excluded' : 'inactive'}>
          <span>Premium tool control</span><strong>{toolControl.tool}</strong>
          <small>{toolControl.active
            ? toolControl.allows ? 'Permitted by the scoped tool policy' : 'Excluded by the scoped tool policy'
            : input.policyEnabled ? 'Separate coverage; preview only' : 'No selective tool policy enabled'}</small>
        </li>
        <li data-access={access.sourceAllows ? 'granted' : 'denied'}>
          <span>Requested file</span><strong>{access.file.title}</strong>
          <small>{access.sourceAllows ? 'Read granted by this fixture' : 'Read denied by this fixture'}</small>
        </li>
      </ol>
      <figcaption role="status" aria-live="polite">
        {access.sourceAllows
          ? access.broad
            ? toolControl.allows
              ? 'The broad grant is still present. A passport entry or review flag does not remove payroll access.'
              : 'This supported tool request is stopped, but source permission still grants payroll access. Narrow the broad grant; the policy does not repair it.'
            : 'The project file is inside the source grant. Registration has not added any extra permission.'
          : 'Payroll is outside the source grant. This boundary holds in either suite, even with a recorded owner or a policy enabled.'}
      </figcaption>
    </figure>

    <LabToggle label="Enable the scoped premium tool policy" checked={input.policyEnabled}
      detail={suite === 'o365e3'
        ? 'Basic inventory, owner reassignment and whole-agent administration are included. The illustrated selective tool control needs separate coverage.'
        : 'Assume this registered agent and tool integration are supported and scoped. Permit Project reader; exclude Payroll reader. This does not change any file ACL.'}
      onChange={policyEnabled => onChange({ ...input, policyEnabled })} />
    {input.policyEnabled && <section className="protection-agent-review" aria-label="Prepared selective tool policy">
      <h4>Prepared selective tool policy</h4>
      <p>Scope: {AGENT_SAMPLE.id}, this supported tool integration only. Project reader is permitted; Payroll reader is excluded.</p>
      <ul>
        <li>{access.assigned ? `Owner recorded: ${access.owner}.` : 'Owner missing: assign an accountable person or team.'}</li>
        <li>{input.task === 'project' ? 'Request matches the project purpose.' : 'Payroll is outside the documented purpose: ask an authorised human to review.'}</li>
        <li>{access.broad ? 'Broad source grant remains: a source administrator must narrow it.' : 'Project-only grant preserved; no payroll permission added.'}</li>
      </ul>
      <p>{suite === 'o365e3'
        ? 'Preview only. This does not activate premium Agent 365 policies in Office 365 E3.'
        : 'Selective tool control is distinct from basic whole-agent blocking. Confirm the supported interaction and target scope; source file permissions are unchanged.'}</p>
    </section>}
    <LabHint>
      Agent 365 governs supported agents; it does not build them, confer file rights or supply unlimited runtime.
      Encrypted files also require the appropriate VIEW and EXTRACT rights. New agent content does not automatically inherit source sensitivity labels.
      This is not universal agent DLP. No tenant, model or agent is called here.
    </LabHint>
  </div>;
}
