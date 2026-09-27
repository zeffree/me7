import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BRIEF_SOURCES, INITIAL_INPUTS } from '@/data/experience/fixtures';
import { LAB_SUITES, type BriefInput, type CallingInput, type CaseVariant, type InsightsInput } from '@/data/experience/types';
import { calculateInsights, describeInsightEvidence, formatInsightNumber, formatInsightPercent, rejectBriefSource, reviseBriefForVerification } from '@/lib/experienceProductivity';
import { BriefActivity, CallingActivity, InsightsActivity } from './ProductivityActivities';

const controls = vi.hoisted(() => ({
  choices: new Map<string, (value: string) => void>(),
  toggles: new Map<string, (value: boolean) => void>(),
}));

vi.mock('../ActivityPrimitives', async importOriginal => {
  const actual = await importOriginal<typeof import('../ActivityPrimitives')>();
  return {
    ...actual,
    ChoiceStrip: (props: Parameters<typeof actual.ChoiceStrip>[0]) => {
      controls.choices.set(props.label, props.onChange);
      return actual.ChoiceStrip(props);
    },
    LabToggle: (props: Parameters<typeof actual.LabToggle>[0]) => {
      controls.toggles.set(props.label, props.onChange);
      return actual.LabToggle(props);
    },
  };
});

vi.mock('@/data/experience/fixtures', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/experience/fixtures')>();
  return {
    ...actual,
    BRIEF_SOURCES: actual.BRIEF_SOURCES.map(source => source.permitted ? source : { ...source, text: 'UNREADABLE_PRIVATE_FIXTURE' }),
  };
});

const VARIANTS: readonly CaseVariant[] = ['everyday', 'curveball'];
const SUITE_CASES = LAB_SUITES.flatMap(suite => VARIANTS.map(variant => ({ suite, variant })));
const brief = (changes: Partial<Omit<BriefInput, 'kind'>> = {}): BriefInput => ({ ...INITIAL_INPUTS.brief, sources: [], ...changes });
const insights = (changes: Partial<Omit<InsightsInput, 'kind'>> = {}): InsightsInput => ({ ...INITIAL_INPUTS.insights, ...changes });
const calling = (changes: Partial<Omit<CallingInput, 'kind'>> = {}): CallingInput => ({ ...INITIAL_INPUTS.calling, ...changes });
const escapeText = (text: string) => renderToStaticMarkup(<span>{text}</span>).slice(6, -7);

function changeChoice(label: string, value: string) {
  const callback = controls.choices.get(label);
  if (!callback) throw new Error(`Missing rendered choice: ${label}`);
  callback(value);
}

function changeToggle(label: string, value: boolean) {
  const callback = controls.toggles.get(label);
  if (!callback) throw new Error(`Missing rendered toggle: ${label}`);
  callback(value);
}

beforeEach(() => {
  controls.choices.clear();
  controls.toggles.clear();
});

describe('briefing desk artifact', () => {
  it('starts with a meaningful empty draft and an explicitly unavailable document', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<BriefActivity input={brief()} suite="o365e3" variant="everyday" onChange={onChange} />);
    expect(html).toContain('Your source-cited brief will appear here');
    expect(html).toContain('0 selected');
    expect(html).toContain('Board-only forecast');
    expect(html).toContain('Restricted — Maya has no access');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('UNREADABLE_PRIVATE_FIXTURE');
    expect(html).not.toContain('class="lab-brief-points"');
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(SUITE_CASES)('does not render restricted contents even for a restored selection in $suite / $variant', ({ suite, variant }) => {
    const html = renderToStaticMarkup(<BriefActivity input={brief({ sources: ['private'], approach: 'copilot' })}
      suite={suite} variant={variant} onChange={() => {}} />);
    const restricted = html.match(/<div class="lab-brief-source" data-permitted="false"[\s\S]*?<\/div>/)?.[0];
    expect(restricted).toBeTruthy();
    expect(restricted).toContain('disabled=""');
    expect(restricted).not.toContain('checked=""');
    expect(html).toContain('0 selected');
    expect(html).not.toContain('UNREADABLE_PRIVATE_FIXTURE');
    expect(html).not.toContain('class="lab-brief-points"');
  });

  it('shows actual selected evidence and source citations without changing the hash route', () => {
    const input = brief({ sources: ['thread'] });
    const html = renderToStaticMarkup(<BriefActivity input={input} suite="o365e3" variant="everyday" onChange={() => {}} />);
    const thread = BRIEF_SOURCES.find(source => source.id === 'thread');
    expect(thread).toBeDefined();
    expect(html).toContain(escapeText(thread?.text ?? ''));
    expect(html).not.toContain(escapeText(BRIEF_SOURCES[0].text));
    expect(html).toContain('1 selected');
    expect(html).toContain('aria-label="Source 2: Launch team conversation"');
    const target = html.match(/aria-controls="([^"]+)"/)?.[1];
    expect(target).toBeTruthy();
    expect(html).toContain(`id="${target}" tabindex="-1"`);
    expect(html).not.toContain('href=');
    expect(html).toContain('Prepared manual synthesis');
  });

  it('keeps citation IDs distinct when two artifacts are rendered together', () => {
    const input = brief({ sources: ['project', 'thread'] });
    const html = renderToStaticMarkup(<>
      <BriefActivity input={input} suite="o365e3" variant="everyday" onChange={() => {}} />
      <BriefActivity input={input} suite="m365e7" variant="curveball" onChange={() => {}} />
    </>);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const match of html.matchAll(/aria-controls="([^"]+)"/g)) expect(ids).toContain(match[1]);
  });

  it('reveals the conflicting permitted update without inventing a restricted answer', () => {
    const input = brief({ sources: ['project', 'thread'], focus: 'actions' });
    const html = renderToStaticMarkup(<BriefActivity input={input} suite="m365e7" variant="curveball" onChange={() => {}} />);
    expect(html).toContain('Updated permitted sample');
    expect(html).toContain('accessibility review is marked complete');
    expect(html).toContain('accessibility review is still open');
    expect(html).toContain('does not resolve the disagreement');
    expect(html).toContain('Prepared actions draft');
    expect(html).not.toContain('UNREADABLE_PRIVATE_FIXTURE');
  });

  it('lets the learner reject a prepared point and replace an unresolved decision with verification actions', () => {
    const input = brief({ sources: ['project', 'thread'] });
    const render = (value: BriefInput) => renderToStaticMarkup(<BriefActivity input={value} suite="m365e7" variant="curveball" onChange={() => {}} />);
    const original = render(input);
    expect(original.match(/>Reject point and source</g)).toHaveLength(2);
    expect(original).toContain('aria-label="Reject prepared point 1 and remove its source"');
    expect(original).toContain('Replace decision with verification actions');
    expect(original).toContain('Rejecting a point removes its source from this draft only');
    const rejected = render(rejectBriefSource(input, 'project'));
    expect(rejected).not.toContain('accessibility review is marked complete');
    expect(rejected).toContain('Missing from this draft: the updated project plan');
    const revised = render(reviseBriefForVerification(input));
    expect(revised).toContain('Prepared actions draft');
    expect(revised).toContain('Ask Maya to confirm');
    expect(revised).toContain('does not resolve the disagreement');
    expect(revised).not.toContain('Replace decision with verification actions');
  });

  it.each(LAB_SUITES)('labels the prepared Copilot method honestly in %s', suite => {
    const html = renderToStaticMarkup(<BriefActivity input={brief({ sources: ['project'], approach: 'copilot' })}
      suite={suite} variant="everyday" onChange={() => {}} />);
    expect(html).toContain('Prepared Copilot sample');
    expect(html).toContain(suite === 'o365e3' ? 'separate purchase under Office 365 E3' : 'not live AI output');
    expect(html).toContain('Eligible baseline Copilot Chat');
    expect(html).toContain('supplied files, pasted text and open-app context');
    expect(html).toContain('inbox/calendar context and document agents');
    expect(html).toContain('not an AI-versus-no-AI comparison');
    expect(html).toContain('not exclusive access to file-based or in-app AI');
    expect(html).toContain('does not fix oversharing');
  });

  it('passes complete controlled inputs for focus and method changes', () => {
    const input = brief({ sources: ['project', 'notes'] });
    const onChange = vi.fn<(value: BriefInput) => void>();
    renderToStaticMarkup(<BriefActivity input={input} suite="o365e3" variant="everyday" onChange={onChange} />);
    changeChoice('What should the brief help with?', 'risks');
    expect(onChange).toHaveBeenLastCalledWith({ ...input, focus: 'risks' });
    changeChoice('Prepare the brief with', 'copilot');
    expect(onChange).toHaveBeenLastCalledWith({ ...input, approach: 'copilot' });
    expect(input).toEqual(brief({ sources: ['project', 'notes'] }));
  });
});

describe('interactive workbook artifact', () => {
  it.each(SUITE_CASES)('uses the actual calculated revenue totals in $suite / $variant', ({ suite, variant }) => {
    const input = insights({ finding: 'growth' });
    const result = calculateInsights(input, variant);
    const html = renderToStaticMarkup(<InsightsActivity input={input} suite={suite} variant={variant} onChange={() => {}} />);
    expect(html).toContain('<svg');
    expect(html).toContain('<table');
    expect(html).toContain('aria-label="Calculated workbook data" tabindex="0"');
    expect(html).toContain('Largest revenue growth');
    expect(html).toContain('South Lantern: 91,000.');
    expect(html).toContain(`>${formatInsightNumber(result.totals.revenue)}</td>`);
    expect(html).toContain(`>${formatInsightNumber(result.totals.previousRevenue)}</td>`);
    expect(html).toContain(`>+${formatInsightPercent(result.growthPercent)}</td>`);
    expect(html).toContain(escapeText(describeInsightEvidence(input, variant)));
    expect(html).toContain('Revenue units are synthetic business data, not license prices');
  });

  it('highlights the real curveball return rate and displays the weighted total', () => {
    const input = insights({ metric: 'returns', finding: 'returns' });
    const html = renderToStaticMarkup(<InsightsActivity input={input} suite="m365e7" variant="curveball" onChange={() => {}} />);
    expect(html).toContain('South Beacon: 15.0%. Return-rate outlier. Focus South.');
    expect(html).toContain('South Beacon has 36 returns from 240 orders (15.0%)');
    expect(html).toContain('<td>240</td><td>36</td><td>15.0%</td>');
    expect(html).toContain('<td>1,425</td><td>62</td><td>4.4%</td>');
    expect(html).toContain('Scale: 0–15.0%');
    expect(html).toContain('class="lab-review-line"');
    expect(html).toContain('The total return rate is weighted by orders');
  });

  it('does not label a normal highest return rate as an abnormal outlier', () => {
    const html = renderToStaticMarkup(<InsightsActivity input={insights({ metric: 'returns', finding: 'no-issue' })}
      suite="o365e3" variant="everyday" onChange={() => {}} />);
    expect(html).toContain('South Beacon: 2.5%. Highest return rate.');
    expect(html).not.toContain('Return-rate outlier');
    expect(html).toContain('<td>1,425</td><td>32</td><td>2.2%</td>');
  });

  it.each(['north', 'south'] as const)('filters both the chart and table to %s from the same helper', region => {
    const input = insights({ region, metric: 'returns' });
    const result = calculateInsights(input, 'curveball');
    const html = renderToStaticMarkup(<InsightsActivity input={input} suite="o365e3" variant="curveball" onChange={() => {}} />);
    expect(html.match(/class="lab-insight-bar"/g)).toHaveLength(2);
    const otherRegion = region === 'north' ? 'South' : 'North';
    expect(html).not.toContain(`<th scope="row">${otherRegion} ·`);
    expect(html).not.toContain(`aria-label="${otherRegion} Beacon:`);
    expect(html).toContain(`Show all regions.`);
    expect(html).toContain(`<td>${formatInsightNumber(result.totals.orders)}</td><td>${result.totals.returns}</td><td>${formatInsightPercent(result.returnRate)}</td>`);
  });

  it.each(LAB_SUITES)('shows the report’s separate viewer and access requirements in %s', suite => {
    const html = renderToStaticMarkup(<InsightsActivity input={insights({ destination: 'report', finding: 'growth', colleagueLicensed: true })}
      suite={suite} variant="everyday" onChange={() => {}} />);
    expect(html).toContain('Sam Rivera has Power BI Pro');
    expect(html).toContain('checked=""');
    expect(html).toContain('Maya and Sam already have the required workspace, report and data permissions');
    expect(html).toContain('The Pro toggle changes licensing only; it never grants access');
    expect(html).toContain('Data filters are not security controls');
    expect(html).toContain('Free Power BI can author personal content');
    expect(html).toContain('Excel can filter, visualize and collaborate');
    expect(html).toContain(suite === 'o365e3' ? 'Publisher: Pro separate from E3.' : 'Publisher: Pro included in E7.');
    expect(html).toContain('does not include Fabric/Premium capacity or BI Copilot');
  });

  it('does not present an irrelevant viewer-license control for an Excel workbook', () => {
    const html = renderToStaticMarkup(<InsightsActivity input={insights({ colleagueLicensed: true })}
      suite="o365e3" variant="everyday" onChange={() => {}} />);
    expect(html).toContain('No Power BI report license is required for this route');
    expect(html).not.toContain('type="checkbox"');
  });

  it('passes a complete input for each filter, finding, destination and license change', () => {
    const input = insights({ destination: 'report' });
    const onChange = vi.fn<(value: InsightsInput) => void>();
    renderToStaticMarkup(<InsightsActivity input={input} suite="m365e7" variant="curveball" onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
    changeChoice('Region', 'south');
    expect(onChange).toHaveBeenLastCalledWith({ ...input, region: 'south' });
    changeChoice('Metric', 'returns');
    expect(onChange).toHaveBeenLastCalledWith({ ...input, metric: 'returns' });
    changeChoice('Attach a finding to this view', 'returns');
    expect(onChange).toHaveBeenLastCalledWith({ ...input, finding: 'returns' });
    changeChoice('Prepare a share as', 'workbook');
    expect(onChange).toHaveBeenLastCalledWith({ ...input, destination: 'workbook' });
    changeToggle('Sam Rivera has Power BI Pro', true);
    expect(onChange).toHaveBeenLastCalledWith({ ...input, colleagueLicensed: true });
    expect(input).toEqual(insights({ destination: 'report' }));
  });
});

describe('calling path artifact', () => {
  it.each(SUITE_CASES)('starts with an honest Teams-only path in $suite / $variant', ({ suite, variant }) => {
    const html = renderToStaticMarkup(<CallingActivity input={calling()} suite={suite} variant={variant} onChange={() => {}} />);
    expect(html).toContain('with-Teams sample for both suites');
    expect(html).toContain('class="lab-call-path lab-call-path-internal"');
    expect(html).toContain('Meeting invitation');
    expect(html).toContain('Teams-to-Teams; no PSTN needed');
    expect(html).toContain('already work in this Office 365 E3 sample');
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain('class="lab-call-setup"');
  });

  it('changes the illustrated route when a conversation moves through the team', () => {
    const html = renderToStaticMarkup(<CallingActivity input={calling({ destination: 'colleague', route: 'team' })}
      suite="o365e3" variant="everyday" onChange={() => {}} />);
    expect(html).toContain('<strong>Group Teams call</strong>');
    expect(html).toContain('Conversation through the launch team');
    expect(html).toContain('not full CCaaS, call-queue or resource-account features, or Teams Premium');
  });

  it.each(LAB_SUITES)('separates a checked assignment from the suite entitlement in %s', suite => {
    const html = renderToStaticMarkup(<CallingActivity input={calling({ destination: 'customer', phoneAssigned: true, pstnConnected: true })}
      suite={suite} variant="everyday" onChange={() => {}} />);
    expect(html).toContain('class="lab-call-path lab-call-path-external"');
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html).toContain('A calling plan is not bundled by default');
    expect(html).toContain('one dedicated-number user, not a shared queue');
    expect(html).toContain('Confirm the separate carrier connection, Maya’s dedicated user number, emergency calling and applicable policies');
    if (suite === 'o365e3') {
      expect(html).toContain('Separate entitlement under Office 365 E3, even if assignment is checked');
      expect(html).toContain('External path is not complete');
      expect(html).not.toContain('Prepared PSTN path is complete');
    } else {
      expect(html).toContain('E7 entitlement; license assigned');
      expect(html).toContain('Prepared PSTN path is complete; no call is placed');
    }
  });

  it('shows missing PSTN separately from an available E7 Phone entitlement', () => {
    const html = renderToStaticMarkup(<CallingActivity input={calling({ destination: 'customer', phoneAssigned: true })}
      suite="m365e7" variant="everyday" onChange={() => {}} />);
    expect(html).toContain('E7 entitlement; license assigned');
    expect(html).toContain('Connection not configured');
    expect(html).toContain('External path is not complete');
    expect(html).toContain('Phone Standard entitlement is not PSTN connectivity, a dedicated number or emergency setup');
  });

  it('leaves a configured external path unresolved during the provider-outage case', () => {
    const html = renderToStaticMarkup(<CallingActivity input={calling({ destination: 'customer', route: 'team', phoneAssigned: true, pstnConnected: true })}
      suite="m365e7" variant="curveball" onChange={() => {}} />);
    expect(html).toContain('Provider unavailable');
    expect(html).toContain('configuration cannot restore the provider');
    expect(html).toContain('External path is not complete');
    expect(html).toContain('a Teams meeting remains a different, available conversation');
    expect(html).not.toContain('Prepared PSTN path is complete');
    expect(html).toContain('Internal team consultation');
    expect(html).toContain('then Maya calls from her own number');
    expect(html).toContain('No shared queue or resource account');
  });

  it('passes full controlled inputs for destination, route and setup choices', () => {
    const input = calling({ destination: 'customer' });
    const onChange = vi.fn<(value: CallingInput) => void>();
    renderToStaticMarkup(<CallingActivity input={input} suite="o365e3" variant="curveball" onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
    changeChoice('Who needs to connect?', 'meeting');
    expect(onChange).toHaveBeenLastCalledWith({ ...input, destination: 'meeting' });
    changeChoice('Route the conversation', 'team');
    expect(onChange).toHaveBeenLastCalledWith({ ...input, route: 'team' });
    changeToggle('Phone license assigned', true);
    expect(onChange).toHaveBeenLastCalledWith({ ...input, phoneAssigned: true });
    changeToggle('Separate PSTN connection configured', true);
    expect(onChange).toHaveBeenLastCalledWith({ ...input, pstnConnected: true });
    expect(input).toEqual(calling({ destination: 'customer' }));
  });
});

describe('controlled activity scope', () => {
  it.each(SUITE_CASES)('keeps submission, replay, suite selection and runtime requests out of $suite / $variant artifacts', ({ suite, variant }) => {
    const html = renderToStaticMarkup(<>
      <BriefActivity input={brief({ sources: ['project'] })} suite={suite} variant={variant} onChange={() => {}} />
      <InsightsActivity input={insights()} suite={suite} variant={variant} onChange={() => {}} />
      <CallingActivity input={calling()} suite={suite} variant={variant} onChange={() => {}} />
    </>);
    expect(html).not.toContain('Try this setup');
    expect(html).not.toContain('Submit');
    expect(html).not.toContain('Rewind');
    expect(html).not.toContain('lab-suite-switch');
    expect(html).not.toContain('lab-debrief');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<audio');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('href=');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('type="button"');
  });
});
