import { describe, expect, it, vi } from 'vitest';
import { CATEGORIES } from '@/data/categories';
import { BRIEF_SOURCES, BUSINESS_ROWS, INITIAL_INPUTS } from '@/data/experience/fixtures';
import { PRODUCTIVITY_MISSIONS } from '@/data/experience/missions/productivity';
import { LAB_SUITES, type BriefInput, type BriefSourceId, type CallingInput, type CaseVariant, type InsightsInput } from '@/data/experience/types';
import {
  buildBriefDraft,
  calculateInsights,
  describeInsightEvidence,
  evaluateBrief,
  evaluateCalling,
  evaluateInsights,
  formatInsightPercent,
  getBriefSources,
  getCallingPath,
  getInsightRows,
  INSIGHT_RETURN_REVIEW_PERCENT,
  rejectBriefSource,
  reviseBriefForVerification,
  toggleBriefSource,
} from './experienceProductivity';

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

describe('productivity mission definitions', () => {
  it('registers only the three owned missions with current category IDs and complete comparisons', () => {
    expect(PRODUCTIVITY_MISSIONS.map(mission => mission.id)).toEqual(['brief', 'insights', 'calling']);
    for (const mission of PRODUCTIVITY_MISSIONS) {
      for (const id of mission.categoryIds) expect(CATEGORIES.some(category => category.id === id)).toBe(true);
      for (const text of [mission.title, mission.shortTitle, mission.room, mission.intro, mission.objective, mission.product, mission.boundary, mission.takeaway]) {
        expect(text.length).toBeGreaterThan(8);
      }
      expect(Object.keys(mission.comparison)).toEqual(['o365e3', 'm365e7']);
      for (const suite of LAB_SUITES) expect(mission.comparison[suite].length).toBeGreaterThan(30);
      expect(mission.prerequisites.length).toBeGreaterThan(0);
      expect(mission.variants.everyday.label).not.toBe(mission.variants.curveball.label);
      expect(mission.variants.everyday.description).not.toBe(mission.variants.curveball.description);
    }
  });

  it('uses exactly the supplied and planned source IDs', () => {
    expect(PRODUCTIVITY_MISSIONS.find(mission => mission.id === 'brief')?.sourceIds)
      .toEqual(['e7-announcement', 'architecture-copilot-data', 'm365-packaging-2026', 'experience-copilot-chat', 'experience-packaging-details']);
    expect(PRODUCTIVITY_MISSIONS.find(mission => mission.id === 'insights')?.sourceIds)
      .toEqual(['experience-power-bi-sharing', 'e7-announcement', 'experience-power-bi-licensing']);
    expect(PRODUCTIVITY_MISSIONS.find(mission => mission.id === 'calling')?.sourceIds)
      .toEqual(['experience-teams-phone', 'teams-choice-2025', 'e7-announcement', 'experience-teams-pstn', 'experience-packaging-details']);
  });
});

describe('permission-bound prepared briefs', () => {
  it.each(VARIANTS)('never passes restricted contents into %s presentation data', variant => {
    expect(BRIEF_SOURCES.find(source => !source.permitted)?.text).toBe('UNREADABLE_PRIVATE_FIXTURE');
    const sources = getBriefSources(variant);
    expect(sources.find(source => source.id === 'private')).toMatchObject({ permitted: false, text: '' });
    const draft = buildBriefDraft(brief({ sources: ['private', 'project', 'thread'] }), variant);
    expect(draft.sources.map(source => source.id)).toEqual(['project', 'thread']);
    expect(JSON.stringify(draft)).not.toContain('UNREADABLE_PRIVATE_FIXTURE');
    expect(draft.entries.flatMap(entry => entry.citations)).not.toContain('private');
  });

  it('renders everyday permitted evidence from the shared fixture without modifying it', () => {
    const before = JSON.stringify(BRIEF_SOURCES);
    const sources = getBriefSources('everyday');
    expect(sources.filter(source => source.permitted)).toEqual(BRIEF_SOURCES.filter(source => source.permitted));
    expect(sources[0]).not.toBe(BRIEF_SOURCES[0]);
    const curveball = getBriefSources('curveball');
    expect(curveball.find(source => source.id === 'project')?.text).toContain('marked complete');
    expect(curveball.find(source => source.id === 'thread')?.text).toBe(BRIEF_SOURCES.find(source => source.id === 'thread')?.text);
    expect(JSON.stringify(BRIEF_SOURCES)).toBe(before);
  });

  it.each(['decision', 'risks', 'actions'] as const)('keeps a %s draft grounded only in selected sources', focus => {
    const draft = buildBriefDraft(brief({ sources: ['notes', 'notes'], focus }), 'everyday');
    expect(draft.sources).toHaveLength(1);
    expect(draft.entries).toHaveLength(1);
    expect(draft.entries[0].citations).toEqual(['notes']);
    expect(draft.entries[0].text).toMatch(/keyboard/);
    expect(draft.entries[0].text).not.toMatch(/\b(?:pilot|launch decision|board)\b/i);
  });

  it('changes the draft’s useful emphasis when the focus changes', () => {
    const input = brief({ sources: ['project', 'thread', 'notes'] });
    const decision = buildBriefDraft(input, 'everyday');
    const risks = buildBriefDraft({ ...input, focus: 'risks' }, 'everyday');
    const actions = buildBriefDraft({ ...input, focus: 'actions' }, 'everyday');
    expect(decision.entries[0].text).toContain('launch decision');
    expect(risks.entries[0].text).toContain('launch dependency');
    expect(actions.entries[0].text).toContain('Ask Maya');
    expect(actions.entries[2].text).toContain('Ask Sam');
    expect(new Set([decision.entries[0].text, risks.entries[0].text, actions.entries[0].text]).size).toBe(3);
  });

  it('uses a typed, reversible source toggle and cleans disallowed selections', () => {
    const original = brief({ sources: ['private', 'project', 'project'], focus: 'risks', approach: 'copilot' });
    expect(toggleBriefSource(original, 'private')).toEqual({ ...original, sources: ['project'] });
    const selected = toggleBriefSource(original, 'thread');
    expect(selected).toEqual({ ...original, sources: ['project', 'thread'] });
    expect(toggleBriefSource(selected, 'thread')).toEqual({ ...original, sources: ['project'] });
    expect(toggleBriefSource(selected, 'project').sources).toEqual(['thread']);
    expect(original.sources).toEqual(['private', 'project', 'project']);
  });

  it('lets the learner reject a point and source without deleting the file or resolving contradictory evidence', () => {
    const original = brief({ sources: ['project', 'thread', 'notes'], approach: 'copilot' });
    const rejected = rejectBriefSource(original, 'project');
    expect(rejected).toEqual({ ...original, sources: ['thread', 'notes'] });
    expect(rejectBriefSource(rejected, 'project')).toEqual(rejected);
    expect(buildBriefDraft(rejected, 'curveball').entries.flatMap(entry => entry.citations)).not.toContain('project');
    expect(evaluateBrief(rejected, 'm365e7', 'curveball').status).toBe('review');
    expect(getBriefSources('curveball').find(source => source.id === 'project')).toMatchObject({ permitted: true });
    expect(toggleBriefSource(rejected, 'project').sources).toEqual(['thread', 'notes', 'project']);
    expect(original.sources).toEqual(['project', 'thread', 'notes']);
    expect(rejectBriefSource(brief({ sources: ['private', 'project'] }), 'private').sources).toEqual(['project']);
  });

  it('revises a decision into a verification task without claiming the disagreement is fixed', () => {
    const original = brief({ sources: ['project', 'thread'], approach: 'copilot' });
    const revised = reviseBriefForVerification(original);
    expect(revised).toEqual({ ...original, focus: 'actions' });
    expect(original.focus).toBe('decision');
    expect(evaluateBrief(original, 'm365e7', 'curveball').status).toBe('review');
    const result = evaluateBrief(revised, 'm365e7', 'curveball');
    expect(result.status).toBe('success');
    expect(result.summary).toContain('does not approve launch');
    expect(buildBriefDraft(revised, 'curveball').entries[0].text).toContain('Ask Maya');
    expect(buildBriefDraft(revised, 'curveball').conflict).toBe(true);
    expect(evaluateBrief(reviseBriefForVerification(brief({ sources: ['project'] })), 'm365e7', 'curveball').status).toBe('review');
  });

  it.each(SUITE_CASES)('starts ready without fabricated evidence in $suite / $variant', ({ suite, variant }) => {
    const input = brief();
    expect(evaluateBrief(input, suite, variant).status).toBe('ready');
    expect(buildBriefDraft(input, variant).entries).toEqual([]);
  });

  it.each(SUITE_CASES)('holds the restricted boundary in $suite / $variant', ({ suite, variant }) => {
    for (const approach of ['manual', 'copilot'] as const) {
      const result = evaluateBrief(brief({ sources: ['project', 'private'], approach }), suite, variant);
      expect(result.status).toBe('blocked');
      expect(result.facts?.find(fact => fact.label === 'Allowed sources selected')?.value).toBe('1');
      expect(JSON.stringify(result)).not.toContain('UNREADABLE_PRIVATE_FIXTURE');
      expect(result.summary).toContain('Neither method can use it');
    }
  });

  it.each(LAB_SUITES)('can complete a single-source manual brief in %s', suite => {
    for (const source of ['project', 'thread', 'notes'] as const) {
      const result = evaluateBrief(brief({ sources: [source] }), suite, 'everyday');
      expect(result.status).toBe('success');
      expect(result.title).toBe('A manual brief is prepared');
    }
  });

  it.each(VARIANTS)('separates E3 baseline Chat from the work-grounded method in %s', variant => {
    const input = brief({ sources: ['project', 'thread'], approach: 'copilot' });
    const result = evaluateBrief(input, 'o365e3', variant);
    expect(result.status).toBe('separate');
    expect(result.explanation.join(' ')).toContain('Eligible baseline Copilot Chat can use supplied files, pasted text and open-app context');
    expect(result.explanation.join(' ')).toContain('2026 enhancements include inbox/calendar context and document agents');
    expect(result.explanation.join(' ')).toContain('not exclusive access to file-based or in-app AI');
    expect(result.summary).toContain('paid cross-work-source');
    expect(result.explanation.join(' ')).toContain('not a live E3 Copilot result');
    expect(result.nextAction).toContain('manual synthesis');
    expect(evaluateBrief({ ...input, approach: 'manual', focus: 'actions' }, 'o365e3', variant).status).toBe('success');
  });

  it('supports the E7 Copilot sample without claiming to run AI or repair oversharing', () => {
    const result = evaluateBrief(brief({ sources: ['project', 'thread'], approach: 'copilot' }), 'm365e7', 'everyday');
    expect(result.status).toBe('success');
    expect(result.explanation.join(' ')).toContain('license assignment, tenant setup');
    expect(result.explanation.join(' ')).toContain('does not override file permissions or fix oversharing');
    expect(result.explanation.join(' ')).toContain('not live AI output');
  });

  it.each(LAB_SUITES)('keeps curveball launch approval unresolved but permits a qualified follow-up in %s', suite => {
    const input = brief({ sources: ['project', 'thread'] });
    expect(evaluateBrief(input, suite, 'curveball').status).toBe('review');
    const draft = buildBriefDraft(input, 'curveball');
    expect(draft.conflict).toBe(true);
    expect(draft.entries.at(-1)?.citations).toEqual(['project', 'thread']);
    expect(draft.entries.at(-1)?.text).toContain('does not resolve the disagreement');
    for (const focus of ['risks', 'actions'] as const) {
      const result = evaluateBrief({ ...input, focus }, suite, 'curveball');
      expect(result.status).toBe('success');
      expect(result.summary).toContain('does not approve launch');
    }
    expect(evaluateBrief({ ...input, approach: 'copilot', focus: 'actions' }, 'm365e7', 'curveball').status).toBe('success');
  });

  it.each(['project', 'thread', 'notes'] as const)('flags missing permitted status context when only %s is selected', source => {
    const input = brief({ sources: [source], focus: 'actions' });
    for (const suite of LAB_SUITES) {
      const result = evaluateBrief(input, suite, 'curveball');
      expect(result.status).toBe('review');
      expect(result.summary).toContain('cannot establish the current review status');
    }
    const draft = buildBriefDraft(input, 'curveball');
    expect(draft.missingContext).toBe(true);
    expect(draft.conflict).toBe(false);
    expect(draft.entries.flatMap(entry => entry.citations)).toEqual([source]);
  });

  it('covers every brief outcome deterministically without changing the input or fixture', () => {
    const statuses = new Set<string>();
    const sourceIds: readonly BriefSourceId[] = ['project', 'thread', 'notes', 'private'];
    const before = JSON.stringify(BRIEF_SOURCES);
    for (const { suite, variant } of SUITE_CASES) {
      for (let mask = 0; mask < 16; mask++) {
        for (const approach of ['manual', 'copilot'] as const) {
          for (const focus of ['decision', 'risks', 'actions'] as const) {
            const input = brief({ sources: sourceIds.filter((_, index) => Boolean(mask & (1 << index))), approach, focus });
            const original = JSON.stringify(input);
            const result = evaluateBrief(input, suite, variant);
            expect(evaluateBrief(input, suite, variant)).toEqual(result);
            expect(JSON.stringify(input)).toBe(original);
            expect(result.nextAction.length).toBeGreaterThan(0);
            statuses.add(result.status);
          }
        }
      }
    }
    expect(statuses).toEqual(new Set(['ready', 'success', 'review', 'blocked', 'separate']));
    expect(JSON.stringify(BRIEF_SOURCES)).toBe(before);
  });
});

describe('fixture-derived insights', () => {
  it('centralizes the curveball without mutating shared business rows', () => {
    const before = JSON.stringify(BUSINESS_ROWS);
    expect(getInsightRows('everyday')).toEqual(BUSINESS_ROWS);
    expect(getInsightRows('everyday')[0]).not.toBe(BUSINESS_ROWS[0]);
    expect(getInsightRows('curveball')).toEqual(BUSINESS_ROWS.map(row =>
      row.region === 'south' && row.product === 'Beacon' ? { ...row, returns: 36 } : row));
    expect(JSON.stringify(BUSINESS_ROWS)).toBe(before);
  });

  it.each([
    { variant: 'everyday', region: 'all', revenue: 285000, previous: 250000, orders: 1425, returns: 32 },
    { variant: 'everyday', region: 'north', revenue: 146000, previous: 130000, orders: 730, returns: 15 },
    { variant: 'everyday', region: 'south', revenue: 139000, previous: 120000, orders: 695, returns: 17 },
    { variant: 'curveball', region: 'all', revenue: 285000, previous: 250000, orders: 1425, returns: 62 },
    { variant: 'curveball', region: 'north', revenue: 146000, previous: 130000, orders: 730, returns: 15 },
    { variant: 'curveball', region: 'south', revenue: 139000, previous: 120000, orders: 695, returns: 47 },
  ] as const)('calculates the actual $region totals for $variant', ({ variant, region, revenue, previous, orders, returns }) => {
    const result = calculateInsights({ region, metric: 'returns' }, variant);
    expect(result.totals).toEqual({ revenue, previousRevenue: previous, orders, returns });
    expect(result.returnRate).toBeCloseTo(returns / orders * 100, 10);
    expect(result.growthPercent).toBeCloseTo((revenue - previous) / previous * 100, 10);
    expect(result.rows.length).toBe(region === 'all' ? 4 : 2);
  });

  it('highlights measured growth rather than guessing the highest product', () => {
    const all = calculateInsights({ region: 'all', metric: 'revenue' }, 'everyday');
    expect(all.highlighted?.key).toBe('south-Lantern');
    expect(all.highlighted?.growthPercent).toBeCloseTo(17000 / 74000 * 100, 10);
    expect(all.chartMaximum).toBe(91000);
    expect(all.expectedFinding).toBe('growth');
    expect(calculateInsights({ region: 'north', metric: 'revenue' }, 'curveball').highlighted?.key).toBe('north-Lantern');
    expect(describeInsightEvidence({ region: 'all', metric: 'revenue' }, 'curveball'))
      .toBe('Revenue is 285,000 versus 250,000 previously: 14.0% growth in the selected rows.');
  });

  it('detects the row-level return outlier even when the overall return rate is below 5%', () => {
    const result = calculateInsights({ region: 'all', metric: 'returns' }, 'curveball');
    expect(result.returnRate).toBeLessThan(INSIGHT_RETURN_REVIEW_PERCENT);
    expect(result.returnOutlier).toMatchObject({ key: 'south-Beacon', returns: 36, orders: 240, returnRate: 15 });
    expect(result.highlighted?.key).toBe('south-Beacon');
    expect(result.chartMaximum).toBe(15);
    expect(result.expectedFinding).toBe('returns');
    expect(describeInsightEvidence({ region: 'all', metric: 'returns' }, 'curveball'))
      .toBe('South Beacon has 36 returns from 240 orders (15.0%), above the sample 5% review line.');
  });

  it('distinguishes a highest return rate from an actual review-line outlier', () => {
    const result = calculateInsights({ region: 'all', metric: 'returns' }, 'everyday');
    expect(result.highlighted).toMatchObject({ key: 'south-Beacon', returnRate: 2.5 });
    expect(result.returnOutlier).toBeUndefined();
    expect(result.expectedFinding).toBe('no-issue');
    expect(result.chartMaximum).toBe(10);
    expect(describeInsightEvidence({ region: 'all', metric: 'returns' }, 'everyday'))
      .toBe('The selected rows have 32 returns from 1,425 orders (2.2% overall). Every visible row is below the sample 5% review line.');
  });

  it.each(SUITE_CASES)('supports an evidence-backed Excel route in $suite / $variant', ({ suite, variant }) => {
    const revenue = evaluateInsights(insights({ finding: 'growth' }), suite, variant);
    expect(revenue.status).toBe('success');
    expect(revenue.explanation.join(' ')).toContain('already valid Office 365 E3 capabilities');
    const returns = evaluateInsights(insights({ metric: 'returns', finding: variant === 'curveball' ? 'returns' : 'no-issue' }), suite, variant);
    expect(returns.status).toBe('success');
    expect(evaluateInsights(insights({ finding: 'returns' }), suite, variant).status).toBe('review');
  });

  it.each(VARIANTS)('requires a separate E3 publisher entitlement regardless of viewer setup in %s', variant => {
    for (const colleagueLicensed of [false, true]) {
      const result = evaluateInsights(insights({ destination: 'report', finding: 'growth', colleagueLicensed }), 'o365e3', variant);
      expect(result.status).toBe('separate');
      expect(result.explanation.join(' ')).toContain('viewer license cannot supply the publisher');
      expect(result.nextAction).toContain('Excel workbook');
    }
  });

  it.each(VARIANTS)('checks E7 viewer licensing separately from permission in %s', variant => {
    const input = insights({ destination: 'report', finding: 'growth' });
    expect(evaluateInsights(input, 'm365e7', variant).status).toBe('needs-setup');
    const allowed = evaluateInsights({ ...input, colleagueLicensed: true }, 'm365e7', variant);
    expect(allowed.status).toBe('success');
    expect(allowed.explanation.join(' ')).toContain('required workspace, report and data permissions');
    expect(allowed.explanation.join(' ')).toContain('Licensing never grants report or data permission by itself');
    expect(allowed.explanation.join(' ')).toContain('does not include Fabric/Premium capacity or BI Copilot');
    expect(evaluateInsights({ ...input, colleagueLicensed: true, finding: 'returns' }, 'm365e7', variant).status).toBe('review');
  });

  it('distinguishes Pro publishing/sharing from free personal authoring and Excel collaboration', () => {
    for (const destination of ['workbook', 'report'] as const) {
      const result = evaluateInsights(insights({ destination, finding: 'growth' }), 'o365e3', 'everyday');
      expect(result.explanation.join(' ')).toContain('Excel can filter, visualize and collaborate');
      expect(result.explanation.join(' ')).toContain('Free Power BI can author personal content');
      expect(result.explanation.join(' ')).toContain('publishing/sharing and licensed-recipient contrast');
    }
  });

  it('does not change permissions when toggling viewer licensing or filtering a report', () => {
    const input = insights({ destination: 'report', metric: 'returns', finding: 'no-issue' });
    const unlicensed = evaluateInsights(input, 'm365e7', 'curveball');
    const licensed = evaluateInsights({ ...input, colleagueLicensed: true }, 'm365e7', 'curveball');
    const filtered = evaluateInsights({ ...input, colleagueLicensed: true, region: 'north' }, 'm365e7', 'curveball');
    const permission = (outcome: ReturnType<typeof evaluateInsights>) => outcome.facts?.find(fact => fact.label === 'Access assumption')?.value;
    expect(permission(unlicensed)).toBe('Required workspace, report and data permissions already granted');
    expect(permission(licensed)).toBe(permission(unlicensed));
    expect(permission(filtered)).toBe(permission(unlicensed));
    for (const outcome of [unlicensed, licensed, filtered]) {
      expect(outcome.explanation.join(' ')).toContain('Data filters are not security controls');
    }
    expect(unlicensed.explanation.join(' ')).toContain('The Pro toggle changes licensing only; it never grants access');
  });

  it('does not let a correct revenue finding or a north filter deny a south returns issue', () => {
    const input = insights({ region: 'north', metric: 'returns', finding: 'no-issue' });
    expect(evaluateInsights(input, 'o365e3', 'curveball').status).toBe('success');
    const south = evaluateInsights({ ...input, region: 'south' }, 'o365e3', 'curveball');
    expect(south.status).toBe('review');
    expect(south.explanation.join(' ')).toContain('36 returns from 240 orders');
    expect(evaluateInsights({ ...input, region: 'south', finding: 'returns' }, 'o365e3', 'curveball').status).toBe('success');
    expect(evaluateInsights(insights({ finding: 'growth' }), 'm365e7', 'curveball').nextAction).toContain('Switch to returns');
  });

  it('returns facts from the same calculation and keeps all combinations deterministic', () => {
    const statuses = new Set<string>();
    const before = JSON.stringify(BUSINESS_ROWS);
    for (const { suite, variant } of SUITE_CASES) {
      for (const region of ['all', 'north', 'south'] as const) {
        for (const metric of ['revenue', 'returns'] as const) {
          for (const finding of ['growth', 'returns', 'no-issue'] as const) {
            for (const destination of ['workbook', 'report'] as const) {
              for (const colleagueLicensed of [false, true]) {
                const input = insights({ region, metric, finding, destination, colleagueLicensed });
                const original = JSON.stringify(input);
                const result = evaluateInsights(input, suite, variant);
                expect(evaluateInsights(input, suite, variant)).toEqual(result);
                expect(JSON.stringify(input)).toBe(original);
                expect(result.facts?.find(fact => fact.label === 'Visible rows')?.value).toBe(region === 'all' ? '4' : '2');
                expect(result.nextAction.length).toBeGreaterThan(0);
                statuses.add(result.status);
              }
            }
          }
        }
      }
    }
    expect(statuses).toEqual(new Set(['success', 'review', 'separate', 'needs-setup']));
    expect(JSON.stringify(BUSINESS_ROWS)).toBe(before);
    expect(formatInsightPercent(36 / 240 * 100)).toBe('15.0%');
  });
});

describe('destination-aware calling', () => {
  it.each(SUITE_CASES)('already supports online collaboration in $suite / $variant', ({ suite, variant }) => {
    for (const destination of ['meeting', 'colleague'] as const) {
      for (const route of ['direct', 'team'] as const) {
        const input = calling({ destination, route });
        expect(evaluateCalling(input, suite, variant).status).toBe('success');
        expect(evaluateCalling({ ...input, phoneAssigned: true, pstnConnected: true }, suite, variant).status).toBe('success');
        const path = getCallingPath(input, suite, variant);
        expect(path.canConnect).toBe(true);
        expect(path.nodes.map(node => node.id)).not.toContain('phone');
        expect(path.nodes.map(node => node.id)).not.toContain('provider');
        expect(evaluateCalling(input, suite, variant).summary).toContain('Office 365 E3');
      }
    }
  });

  it.each(VARIANTS)('never purchases Phone by toggling setup in E3 / %s', variant => {
    for (const route of ['direct', 'team'] as const) {
      for (const phoneAssigned of [false, true]) {
        for (const pstnConnected of [false, true]) {
          const input = calling({ destination: 'customer', route, phoneAssigned, pstnConnected });
          const result = evaluateCalling(input, 'o365e3', variant);
          expect(result.status).toBe('separate');
          expect(result.explanation.join(' ')).toContain('does not purchase or add Phone to the E3 suite');
          const path = getCallingPath(input, 'o365e3', variant);
          expect(path.canConnect).toBe(false);
          expect(path.nodes.find(node => node.id === 'phone')?.state).toBe('separate');
        }
      }
    }
  });

  it.each(VARIANTS)('requires assignment and separately arranged PSTN under E7 / %s', variant => {
    const input = calling({ destination: 'customer' });
    const assignment = evaluateCalling(input, 'm365e7', variant);
    expect(assignment.status).toBe('needs-setup');
    expect(assignment.title).toContain('Assign');
    const connection = evaluateCalling({ ...input, phoneAssigned: true }, 'm365e7', variant);
    expect(connection.status).toBe('needs-setup');
    expect(connection.title).toContain('PSTN connection');
    expect(connection.explanation.join(' ')).toContain('does not include a calling plan by default');
    expect(getCallingPath(input, 'm365e7', variant).nodes.find(node => node.id === 'phone')?.state).toBe('unassigned');
    expect(getCallingPath(input, 'm365e7', variant).canConnect).toBe(false);
  });

  it.each(['direct', 'team'] as const)('completes a configured E7 %s route only when the provider is available', route => {
    const input = calling({ destination: 'customer', route, phoneAssigned: true, pstnConnected: true });
    expect(evaluateCalling(input, 'm365e7', 'everyday').status).toBe('success');
    expect(getCallingPath(input, 'm365e7', 'everyday').canConnect).toBe(true);
    const outage = evaluateCalling(input, 'm365e7', 'curveball');
    expect(outage.status).toBe('blocked');
    expect(outage.summary).toContain('customer call is unresolved');
    const path = getCallingPath(input, 'm365e7', 'curveball');
    expect(path.canConnect).toBe(false);
    expect(path.nodes.find(node => node.id === 'provider')?.state).toBe('unavailable');
    expect(path.nodes.at(-1)?.state).toBe('waiting');
    expect(evaluateCalling({ ...input, destination: 'meeting' }, 'm365e7', 'curveball').status).toBe('success');
    expect(evaluateCalling({ ...input, pstnConnected: false }, 'm365e7', 'everyday').status).toBe('needs-setup');
  });

  it('makes the selected direct/team route a real change in the prepared path', () => {
    for (const destination of ['meeting', 'colleague', 'customer'] as const) {
      const input = calling({ destination, phoneAssigned: true, pstnConnected: true });
      const direct = getCallingPath(input, 'm365e7', 'everyday');
      const team = getCallingPath({ ...input, route: 'team' }, 'm365e7', 'everyday');
      expect(direct.nodes.find(node => node.id === 'route')?.label).not.toBe(team.nodes.find(node => node.id === 'route')?.label);
      expect(direct.routeLabel).not.toBe(team.routeLabel);
      expect(team.canConnect).toBe(direct.canConnect);
    }
  });

  it('models a dedicated-number user and ordinary team consultation, not a shared queue or resource account', () => {
    const input = calling({ destination: 'customer', route: 'team', phoneAssigned: true, pstnConnected: true });
    const path = getCallingPath(input, 'm365e7', 'everyday');
    expect(path.nodes.find(node => node.id === 'employee')?.detail).toBe('Dedicated-number user example');
    expect(path.nodes.find(node => node.id === 'phone')?.label).toBe('Teams Phone Standard');
    expect(path.nodes.find(node => node.id === 'route')?.label).toBe('Internal team consultation');
    expect(path.nodes.find(node => node.id === 'route')?.detail).toContain('then Maya calls from her own number');
    expect(path.nodes.find(node => node.id === 'route')?.detail).toContain('No shared queue or resource account');
    expect(path.nodes.find(node => node.id === 'provider')?.detail).toContain('carrier, user number and emergency setup confirmed');
    const result = evaluateCalling(input, 'm365e7', 'everyday');
    expect(result.explanation.join(' ')).toContain('carrier, user number, emergency calling and applicable policies');
    expect(result.explanation.join(' ')).toContain('it does not provision them');
    expect(evaluateCalling({ ...input, pstnConnected: false }, 'm365e7', 'everyday').summary)
      .toContain('does not supply a carrier connection, dedicated number or emergency setup');
  });

  it('covers all calling outcomes without treating Phone as PSTN or team routing as advanced features', () => {
    const statuses = new Set<string>();
    for (const { suite, variant } of SUITE_CASES) {
      for (const destination of ['meeting', 'colleague', 'customer'] as const) {
        for (const route of ['direct', 'team'] as const) {
          for (const phoneAssigned of [false, true]) {
            for (const pstnConnected of [false, true]) {
              const input = calling({ destination, route, phoneAssigned, pstnConnected });
              const original = JSON.stringify(input);
              const result = evaluateCalling(input, suite, variant);
              expect(evaluateCalling(input, suite, variant)).toEqual(result);
              expect(JSON.stringify(input)).toBe(original);
              expect(result.explanation.join(' ')).toContain('No calling plan is bundled');
              expect(result.explanation.join(' ')).toContain('does not imply full CCaaS, call-queue provisioning, resource-account features or Teams Premium');
              expect(result.nextAction.length).toBeGreaterThan(0);
              statuses.add(result.status);
            }
          }
        }
      }
    }
    expect(statuses).toEqual(new Set(['success', 'separate', 'needs-setup', 'blocked']));
  });
});
