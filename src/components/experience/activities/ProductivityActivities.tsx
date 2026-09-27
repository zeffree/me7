import { useId } from 'react';
import { ArrowRight, BarChart3, ClipboardList, FileText, LockKeyhole, MessageSquare, Network, Phone, UserRound, Users } from 'lucide-react';
import { WORKPLACE } from '@/data/experience/fixtures';
import type { BriefInput, CallingInput, InsightsInput, MissionActivityProps } from '@/data/experience/types';
import {
  buildBriefDraft,
  calculateInsights,
  COPILOT_CHAT_CONTEXT,
  COPILOT_PAID_CONTRAST,
  describeInsightEvidence,
  formatInsightNumber,
  formatInsightPercent,
  getBriefSources,
  getCallingPath,
  INSIGHT_FINDING_LABELS,
  INSIGHT_FILTER_BOUNDARY,
  INSIGHT_REPORT_PERMISSIONS,
  INSIGHT_RETURN_REVIEW_PERCENT,
  POWER_BI_PERSONAL_BASELINE,
  rejectBriefSource,
  reviseBriefForVerification,
  toggleBriefSource,
} from '@/lib/experienceProductivity';
import { ArtifactHeading, ChoiceStrip, LabHint, LabToggle, SetupNotes } from '../ActivityPrimitives';
import './productivity.css';

const FOCUS_LABELS: Record<BriefInput['focus'], string> = {
  decision: 'Decision',
  risks: 'Risks',
  actions: 'Actions',
};

export function BriefActivity({ input, suite, variant, onChange }: MissionActivityProps<'brief'>) {
  const id = useId();
  const sources = getBriefSources(variant);
  const draft = buildBriefDraft(input, variant);
  const sourceAnchor = (sourceId: string) => `${id}-source-${sourceId}`;
  const preparedMethod = input.approach === 'manual'
    ? 'Prepared manual synthesis — an Office apps workflow in either suite.'
    : suite === 'o365e3'
      ? 'Prepared Copilot sample — a separate purchase under Office 365 E3, not a live result.'
      : 'Prepared Copilot sample — included E7 entitlement, not live AI output.';

  return <section className="lab-activity lab-productivity lab-brief" aria-label="Briefing desk">
    <ArtifactHeading icon={<FileText />} title={`${WORKPLACE.project} briefing desk`}>
      {WORKPLACE.name} · A synthetic evidence pack for {WORKPLACE.employee}.
    </ArtifactHeading>
    <div className="lab-brief-workspace">
      <fieldset className="lab-brief-sources">
        <legend>Choose allowed evidence <span>{draft.sources.length} selected</span></legend>
        <div className="lab-artifact-list lab-brief-source-list">
          {sources.map((source, index) => {
            const selected = source.permitted && input.sources.includes(source.id);
            return <div className="lab-brief-source" key={source.id} data-permitted={source.permitted} data-selected={selected}>
              <label className="lab-source-pick">
                <input id={`${sourceAnchor(source.id)}-select`} type="checkbox" checked={selected} disabled={!source.permitted}
                  onChange={() => onChange(toggleBriefSource(input, source.id))} />
                <span className="lab-source-icon" aria-hidden="true">
                  {!source.permitted ? <LockKeyhole /> : source.id === 'thread' ? <MessageSquare /> : source.id === 'notes' ? <ClipboardList /> : <FileText />}
                </span>
                <span>
                  <strong>{source.title}</strong>
                  <small>{source.format} · {source.permitted ? 'Maya has access' : 'Restricted — Maya has no access'}</small>
                  {variant === 'curveball' && source.id === 'project' && <small>Updated permitted sample</small>}
                </span>
              </label>
              {selected && <blockquote id={sourceAnchor(source.id)} tabIndex={-1}>
                <span>Source {index + 1}</span>
                <p>{source.text}</p>
              </blockquote>}
            </div>;
          })}
        </div>
      </fieldset>
      <section className="lab-prepared-page" aria-labelledby={`${id}-draft-title`}>
        <header><ClipboardList aria-hidden="true" /><h4 id={`${id}-draft-title`} tabIndex={-1}>Prepared {FOCUS_LABELS[input.focus].toLowerCase()} draft</h4></header>
        <p className="lab-prepared-method">{preparedMethod}</p>
        {draft.entries.length > 0
          ? <ol className="lab-brief-points">{draft.entries.map((entry, index) => <li key={entry.citations.join('-')}>
            <p>{entry.text}</p>
            <span className="lab-brief-citations">{entry.citations.map(sourceId => {
              const sourceIndex = sources.findIndex(source => source.id === sourceId);
              return <button key={sourceId} type="button" aria-controls={sourceAnchor(sourceId)}
                aria-label={`Source ${sourceIndex + 1}: ${sources[sourceIndex].title}`}
                onClick={() => document.getElementById(sourceAnchor(sourceId))?.focus()}>
                [{sourceIndex + 1}]
              </button>;
            })}</span>
            {entry.citations.length === 1 && <div className="lab-draft-point-actions">
              <button type="button" className="lab-button lab-button-quiet"
                aria-label={`Reject prepared point ${index + 1} and remove its source`}
                onClick={() => {
                  onChange(rejectBriefSource(input, entry.citations[0]));
                  document.getElementById(`${sourceAnchor(entry.citations[0])}-select`)?.focus();
                }}>
                Reject point and source
              </button>
            </div>}
          </li>)}</ol>
          : <p className="lab-draft-empty">Your source-cited brief will appear here. Select a file or conversation you are allowed to read.</p>}
        <p className="lab-draft-limitation" role="status" aria-live="polite">{draft.limitation}</p>
        {draft.sources.length > 0 && <p className="lab-draft-review-note">Rejecting a point removes its source from this draft only. Reselect the source to restore it.</p>}
        {variant === 'curveball' && input.focus === 'decision' && draft.sources.length > 0 && <button type="button"
          className="lab-button lab-draft-revise" onClick={() => {
            onChange(reviseBriefForVerification(input));
            document.getElementById(`${id}-draft-title`)?.focus();
          }}>
          Replace decision with verification actions
        </button>}
      </section>
    </div>
    <ChoiceStrip<BriefInput['focus']> label="What should the brief help with?" value={input.focus}
      options={[
        { value: 'decision', label: 'A launch decision', detail: 'Separate readiness from approval' },
        { value: 'risks', label: 'Risks to discuss', detail: 'Bring uncertainties into view' },
        { value: 'actions', label: 'Next actions', detail: 'Name the follow-up work' },
      ]} onChange={focus => onChange({ ...input, focus })} />
    <ChoiceStrip<BriefInput['approach']> label="Prepare the brief with" value={input.approach}
      options={[
        { value: 'manual', label: 'Manual synthesis', detail: 'Office apps already support this work' },
        {
          value: 'copilot', label: 'Work-grounded Copilot sample', detail: 'Prepared illustration, not live AI',
          unavailable: suite === 'o365e3' ? 'Full work-grounded method is a separate purchase' : undefined,
        },
      ]} onChange={approach => onChange({ ...input, approach })} />
    <SetupNotes><LabHint>{COPILOT_CHAT_CONTEXT} {COPILOT_PAID_CONTRAST}</LabHint></SetupNotes>
    <LabHint>Neither method can open the restricted document. Copilot does not fix oversharing; check whether existing permissions are appropriate.</LabHint>
  </section>;
}

export function InsightsActivity({ input, suite, variant, onChange }: MissionActivityProps<'insights'>) {
  const id = useId();
  const calculation = calculateInsights(input, variant);
  const isRevenue = input.metric === 'revenue';
  const regionLabel = input.region === 'all' ? 'All regions' : input.region === 'north' ? 'North' : 'South';
  const highlightLabel = isRevenue ? 'Largest revenue growth' : calculation.returnOutlier ? 'Return-rate outlier' : 'Highest return rate';

  return <section className="lab-activity lab-productivity lab-insights" aria-label="Trading workbook">
    <ArtifactHeading icon={<BarChart3 />} title={`${WORKPLACE.name} trading workbook`}>
      Synthetic rows, real calculations. Explore a finding before preparing a share for {WORKPLACE.colleague}.
    </ArtifactHeading>
    <div className="lab-workbook-controls">
      <ChoiceStrip<InsightsInput['region']> label="Region" value={input.region}
        options={[{ value: 'all', label: 'All regions' }, { value: 'north', label: 'North' }, { value: 'south', label: 'South' }]}
        onChange={region => onChange({ ...input, region })} />
      <ChoiceStrip<InsightsInput['metric']> label="Metric" value={input.metric}
        options={[{ value: 'revenue', label: 'Revenue' }, { value: 'returns', label: 'Returns' }]}
        onChange={metric => onChange({ ...input, metric })} />
    </div>
    <figure className="lab-workbook-chart" aria-labelledby={`${id}-chart-title`}>
      <figcaption id={`${id}-chart-title`}><strong>{isRevenue ? 'Revenue by product' : 'Return rate by product'}</strong><span>{regionLabel}</span></figcaption>
      <p className="lab-chart-legend">
        {isRevenue ? <><span className="lab-current-key" />Current period <span className="lab-previous-key" />Previous period</>
          : <>Returns ÷ orders · dashed review line at {INSIGHT_RETURN_REVIEW_PERCENT}%</>}
        <span>Scale: 0–{isRevenue ? formatInsightNumber(calculation.chartMaximum) : formatInsightPercent(calculation.chartMaximum)}</span>
      </p>
      <div className="lab-insight-bars">
        {calculation.rows.map(row => {
          const highlighted = calculation.highlighted?.key === row.key;
          const rowRegionLabel = row.region === 'north' ? 'North' : 'South';
          const metricValue = isRevenue ? row.revenue : row.returnRate;
          const rowValue = isRevenue ? formatInsightNumber(metricValue) : formatInsightPercent(metricValue);
          const nextRegion = input.region === row.region ? 'all' : row.region;
          const filterAction = nextRegion === 'all' ? 'Show all regions' : `Focus ${rowRegionLabel}`;
          return <button key={row.key} type="button" className="lab-insight-bar" data-highlighted={highlighted}
            aria-label={`${rowRegionLabel} ${row.product}: ${rowValue}. ${highlighted ? `${highlightLabel}. ` : ''}${filterAction}.`}
            onClick={() => onChange({ ...input, region: nextRegion })}>
            <span className="lab-chart-row-label"><strong>{row.product}</strong><small>{rowRegionLabel}</small></span>
            <svg viewBox="0 0 320 36" preserveAspectRatio="none" aria-hidden="true">
              {isRevenue && <rect className="lab-bar-previous" x="0" y="3" width={row.previousRevenue / calculation.chartMaximum * 320} height="8" />}
              <rect className={highlighted ? 'lab-bar-current lab-bar-highlight' : 'lab-bar-current'} x="0" y={isRevenue ? 16 : 10}
                width={metricValue / calculation.chartMaximum * 320} height="16" />
              {!isRevenue && <line className="lab-review-line" x1={INSIGHT_RETURN_REVIEW_PERCENT / calculation.chartMaximum * 320}
                x2={INSIGHT_RETURN_REVIEW_PERCENT / calculation.chartMaximum * 320} y1="2" y2="34" />}
            </svg>
            <span className="lab-chart-row-value"><strong>{rowValue}</strong>{highlighted && <small>{highlightLabel}</small>}</span>
          </button>;
        })}
      </div>
      <p className="lab-chart-instruction">Select a bar row to focus its region; select it again to restore all regions. {INSIGHT_FILTER_BOUNDARY}</p>
      <p className="lab-chart-evidence" role="status" aria-live="polite">{describeInsightEvidence(input, variant)}</p>
    </figure>
    <div className="lab-workbook-table-wrap" role="region" aria-label="Calculated workbook data" tabIndex={0}>
      <table className="lab-workbook-table">
        <caption>{regionLabel} · {isRevenue ? 'Revenue in sample units' : 'Returns and order counts'}</caption>
        <thead><tr><th scope="col">Region / product</th>
          {isRevenue ? <><th scope="col">Previous</th><th scope="col">Current</th><th scope="col">Change</th></>
            : <><th scope="col">Orders</th><th scope="col">Returns</th><th scope="col">Return rate</th></>}
        </tr></thead>
        <tbody>{calculation.rows.map(row => <tr key={row.key} data-highlighted={calculation.highlighted?.key === row.key}>
          <th scope="row">{row.region === 'north' ? 'North' : 'South'} · {row.product}</th>
          {isRevenue
            ? <><td>{formatInsightNumber(row.previousRevenue)}</td><td>{formatInsightNumber(row.revenue)}</td><td>+{formatInsightPercent(row.growthPercent)}</td></>
            : <><td>{formatInsightNumber(row.orders)}</td><td>{row.returns}</td><td>{formatInsightPercent(row.returnRate)}</td></>}
        </tr>)}</tbody>
        <tfoot><tr><th scope="row">Selected total</th>
          {isRevenue
            ? <><td>{formatInsightNumber(calculation.totals.previousRevenue)}</td><td>{formatInsightNumber(calculation.totals.revenue)}</td><td>+{formatInsightPercent(calculation.growthPercent)}</td></>
            : <><td>{formatInsightNumber(calculation.totals.orders)}</td><td>{calculation.totals.returns}</td><td>{formatInsightPercent(calculation.returnRate)}</td></>}
        </tr></tfoot>
      </table>
    </div>
    <LabHint>{isRevenue ? 'Revenue units are synthetic business data, not license prices.' : `The ${INSIGHT_RETURN_REVIEW_PERCENT}% review line is an illustrative rule for this workbook, not a Microsoft benchmark. The total return rate is weighted by orders.`}</LabHint>
    <ChoiceStrip<InsightsInput['finding']> label="Attach a finding to this view" value={input.finding}
      options={[
        { value: 'growth', label: INSIGHT_FINDING_LABELS.growth, detail: 'Current revenue versus previous revenue' },
        { value: 'returns', label: INSIGHT_FINDING_LABELS.returns, detail: `A visible row reaches the ${INSIGHT_RETURN_REVIEW_PERCENT}% review line` },
        { value: 'no-issue', label: INSIGHT_FINDING_LABELS['no-issue'], detail: 'No visible return-rate issue; not an all-business conclusion' },
      ]} onChange={finding => onChange({ ...input, finding })} />
    <ChoiceStrip<InsightsInput['destination']> label="Prepare a share as" value={input.destination}
      options={[
        { value: 'workbook', label: 'Excel workbook', detail: 'Use an approved team file location' },
        {
          value: 'report', label: 'Power BI Pro report', detail: 'A Pro-workspace report for a licensed colleague',
          unavailable: suite === 'o365e3' ? 'Pro is a separate requirement under Office 365 E3' : undefined,
        },
      ]} onChange={destination => onChange({ ...input, destination })} />
    {input.destination === 'report' && <LabToggle label={`${WORKPLACE.colleague} has Power BI Pro`}
      detail={INSIGHT_REPORT_PERMISSIONS}
      checked={input.colleagueLicensed} onChange={colleagueLicensed => onChange({ ...input, colleagueLicensed })} />}
    <div className="lab-prepared-share">
      {input.destination === 'workbook' ? <FileText aria-hidden="true" /> : <BarChart3 aria-hidden="true" />}
      <div><h4>Prepared share for {WORKPLACE.colleague}</h4>
        <p>{INSIGHT_FINDING_LABELS[input.finding]} · {regionLabel} · {isRevenue ? 'Revenue' : 'Returns'}</p>
        <small>{input.destination === 'workbook'
          ? 'Workbook in an approved team location. No Power BI report license is required for this route.'
          : `${suite === 'm365e7' ? 'Publisher: Pro included in E7.' : 'Publisher: Pro separate from E3.'} Sam’s Pro license: ${input.colleagueLicensed ? 'confirmed' : 'not confirmed'}. Required report/workspace permissions are already granted in this sample.`}</small>
      </div>
    </div>
    <SetupNotes><LabHint>{POWER_BI_PERSONAL_BASELINE}</LabHint>
    <LabHint>This example does not include Fabric/Premium capacity or BI Copilot. Real report sharing needs appropriate viewer licensing and explicit report/data access.</LabHint></SetupNotes>
  </section>;
}

const CALL_STATE_LABELS = {
  available: 'Available in this setup',
  separate: 'Separate entitlement',
  unassigned: 'License not assigned',
  unconfigured: 'Connection not configured',
  unavailable: 'Provider unavailable',
  waiting: 'Path incomplete',
} as const;

export function CallingActivity({ input, suite, variant, onChange }: MissionActivityProps<'calling'>) {
  const id = useId();
  const path = getCallingPath(input, suite, variant);
  return <section className="lab-activity lab-productivity lab-calling" aria-label="Calling path">
    <ArtifactHeading icon={<Phone />} title="Connect Maya to the right place">
      A with-Teams sample for both suites. The customer path is for one dedicated-number user, not a shared queue. No live call is placed.
    </ArtifactHeading>
    <ChoiceStrip<CallingInput['destination']> label="Who needs to connect?" value={input.destination}
      options={[
        { value: 'meeting', label: 'Launch meeting', detail: 'An online Teams meeting' },
        { value: 'colleague', label: WORKPLACE.colleague, detail: 'A Teams-to-Teams colleague call' },
        { value: 'customer', label: 'Customer’s phone', detail: 'An external PSTN call' },
      ]} onChange={destination => onChange({ ...input, destination })} />
    <figure className="lab-call-diagram" aria-labelledby={`${id}-path-title`}>
      <figcaption id={`${id}-path-title`}>Prepared {path.external ? 'customer phone' : 'Teams'} path — no call is placed</figcaption>
      <ol className={`lab-call-path ${path.external ? 'lab-call-path-external' : 'lab-call-path-internal'}`}>
        {path.nodes.map((node, index) => <li key={node.id} data-state={node.state}>
          {index > 0 && <ArrowRight className="lab-call-connector" aria-hidden="true" />}
          <span className="lab-call-node-icon" aria-hidden="true">
            {node.id === 'employee' ? <UserRound /> : node.id === 'route' ? <Users /> : node.id === 'provider' ? <Network /> : node.id === 'phone' || path.external ? <Phone /> : <MessageSquare />}
          </span>
          <strong>{node.label}</strong>
          <span className="lab-call-node-state">{CALL_STATE_LABELS[node.state]}</span>
          <p>{node.detail}</p>
        </li>)}
      </ol>
    </figure>
    <ChoiceStrip<CallingInput['route']> label="Route the conversation" value={input.route}
      options={[
        {
          value: 'direct', label: 'Direct',
          detail: input.destination === 'meeting' ? 'Send a meeting invitation' : input.destination === 'colleague' ? 'Call Sam one-to-one in Teams' : 'Use Maya’s prepared calling path',
        },
        {
          value: 'team', label: path.external ? 'Consult the launch team' : 'Through the launch team',
          detail: input.destination === 'meeting' ? 'Use a team channel meeting' : input.destination === 'colleague' ? 'Use a group Teams call' : 'Consult Sam inside Teams before Maya uses her own number',
        },
      ]} onChange={route => onChange({ ...input, route })} />
    {path.external ? <fieldset className="lab-choice-field lab-call-setup">
      <legend>Prepare the external path</legend>
      <LabToggle label="Phone license assigned"
        detail={suite === 'm365e7'
          ? 'Assign the Teams Phone Standard entitlement included in E7 to this dedicated-number user.'
          : 'This setup flag does not add Phone Standard to Office 365 E3. The entitlement remains a separate purchase.'}
        checked={input.phoneAssigned} onChange={phoneAssigned => onChange({ ...input, phoneAssigned })} />
      <LabToggle label="Separate PSTN connection configured"
        detail="Confirm the separate carrier connection, Maya’s dedicated user number, emergency calling and applicable policies. Use a separately arranged Calling Plan, Operator Connect or Direct Routing service. A calling plan is not bundled by default."
        checked={input.pstnConnected} onChange={pstnConnected => onChange({ ...input, pstnConnected })} />
    </fieldset> : <LabHint>Online meetings and Teams-to-Teams calls already work in this Office 365 E3 sample. Phone assignment and PSTN setup are not needed for this selected path.</LabHint>}
    {variant === 'curveball' && <p className="lab-call-provider-note">
      The sample PSTN provider is unavailable. Setup switches cannot restore its service; a Teams meeting remains a different, available conversation.
    </p>}
    <LabHint>The team route is ordinary internal Teams collaboration, not full CCaaS, call-queue or resource-account features, or Teams Premium. Phone Standard entitlement is not PSTN connectivity, a dedicated number or emergency setup.</LabHint>
  </section>;
}
