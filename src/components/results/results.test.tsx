import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createDemoAssessment } from '@/data/demo';
import { computeAssessment } from '@/model/engine';
import type { Assessment } from '@/model/types';
import { useAssessment } from '@/store/useAssessment';
import { bridgeSteps, CostBridge } from './CostBridge';
import { CountUp } from './CountUp';
import { Headline } from './Headline';
import { MetricTiles } from './MetricTiles';
import { sortStack, StackSorter } from './StackSorter';
import { curveGeometry, TcoChart } from './TcoChart';
import { celebrationKey } from './VerdictHero';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

function lossAssessment(): Assessment {
  const assessment = createDemoAssessment();
  assessment.assumptions = { ...assessment.assumptions, e7ListPupm: 400 };
  return assessment;
}

describe('business case presentation', () => {
  let before: ReturnType<typeof useAssessment.getState>;
  beforeEach(() => { before = useAssessment.getState(); });
  afterEach(() => { useAssessment.setState(before, true); });

  const load = (assessment: Assessment) => { useAssessment.setState({ ...assessment }); return computeAssessment(assessment); };

  it('leads a positive case with a lower-cost verdict and no remedial panel', () => {
    const result = load(createDemoAssessment());
    const html = text(renderToStaticMarkup(<Headline result={result} currency="USD" />));
    expect(html).toContain('Lower recurring cost');
    expect(html).toContain('$453,600');
    expect(html).toContain('27% lower than staying as entered');
    expect(html).toContain('Month 8');
    expect(html).not.toContain('What could change this picture');
    expect(html).not.toContain('Higher recurring cost');
  });

  it('states a negative case in words, offers levers and never celebrates', () => {
    const result = load(lossAssessment());
    expect(result.netAnnualConservative).toBeLessThan(0);
    const markup = renderToStaticMarkup(<Headline result={result} currency="USD" />);
    const html = text(markup);
    expect(html).toContain('Higher recurring cost');
    expect(html).toContain('USD / year more');
    expect(html).toContain('What could change this picture');
    expect(html).toContain('Not reached in');
    expect(html).not.toContain('Celebrate again');
    expect(html).not.toContain('Lower recurring cost');
    expect(markup).toContain('verdict-hero tone-loss');
  });

  it('keeps capability cost avoided out of the cash metric tiles', () => {
    const assessment = createDemoAssessment();
    assessment.plannedCapabilities = computeAssessment(assessment).costAvoidance.capabilities.map(item => item.category.id);
    const result = computeAssessment(assessment);
    expect(result.costAvoidance.annualAvoided).toBeGreaterThan(0);
    expect(result.tcoNetBenefit).toBe(1_075_200);
    const html = text(renderToStaticMarkup(<MetricTiles result={result} currency="USD" horizonYears={3} transitionEnabled entries={12} />));
    expect(html).toContain('$168,000');
    expect(html).toContain('$1,075,200');
    expect(html).not.toMatch(/avoid/i);
    expect(html).not.toContain(`$${result.costAvoidance.annualAvoided.toLocaleString('en-US')}`);
  });

  it('builds a cost bridge that reconciles exactly to the future total', () => {
    for (const assessment of [createDemoAssessment(), lossAssessment()]) {
      const result = computeAssessment(assessment);
      const steps = bridgeSteps(result);
      expect(steps[0]).toMatchObject({ key: 'current', amount: result.currentAnnualTotal });
      expect(steps[steps.length - 1]).toMatchObject({ key: 'future', amount: result.futureAnnualTotal });
      const walked = steps.slice(1, -1).reduce((sum, step) => sum + (step.kind === 'up' ? step.amount : -step.amount), result.currentAnnualTotal);
      expect(walked).toBeCloseTo(result.futureAnnualTotal, 6);
      steps.slice(1, -1).forEach(step => expect(step.to - step.from).toBeCloseTo(step.amount, 6));
    }
    const html = text(renderToStaticMarkup(<CostBridge result={computeAssessment(createDemoAssessment())} currency="USD" />));
    expect(html).toContain('Stay as entered');
    expect(html).toContain('Move to E7');
  });

  it('sorts every entered invoice into retired or stays paid without dropping any', () => {
    const assessment = createDemoAssessment();
    const result = computeAssessment(assessment);
    const stack = sortStack(result, assessment);
    expect(stack.retired).toHaveLength(10);
    expect(stack.retired.reduce((sum, item) => sum + item.amount, 0)).toBe(1_173_600);
    expect(stack.retained.map(item => item.name)).toEqual(['Veeam Backup for Microsoft 365', 'DocuSign']);
    expect(stack.retained.reduce((sum, item) => sum + item.amount, 0)).toBe(60_000);
    expect(stack.unknown).toEqual([]);
  });

  it('treats a missing amount as unknown, not zero', () => {
    const assessment = createDemoAssessment();
    assessment.lines = assessment.lines.map((line, index) => index === 0 ? { ...line, annual: undefined, pupm: undefined } : line);
    const result = computeAssessment(assessment);
    const stack = sortStack(result, assessment);
    expect(stack.unknown).toHaveLength(1);
    expect(stack.retired.length + stack.retained.length + stack.unknown.length).toBe(12);
    const html = text(renderToStaticMarkup(<StackSorter result={result} currency="USD" />));
    expect(html).toContain('Unknown');
  });

  it('marks payback on the cash curve only when it is reached', () => {
    const positive = computeAssessment(createDemoAssessment());
    const geometry = curveGeometry(positive);
    expect(geometry.end.cumulativeNetBenefit).toBeCloseTo(positive.tcoNetBenefit, 6);
    expect(geometry.lowest.cumulativeNetBenefit).toBeLessThan(0);
    expect(geometry.zeroY).toBeGreaterThan(0);
    const positiveHtml = renderToStaticMarkup(<TcoChart result={positive} currency="USD" />);
    expect(positiveHtml).toContain('curve-pin');
    expect(text(positiveHtml)).toContain('month 8');

    const negative = computeAssessment(lossAssessment());
    const negativeHtml = renderToStaticMarkup(<TcoChart result={negative} currency="USD" />);
    expect(negativeHtml).not.toContain('curve-pin');
  });

  it('renders the exact final value for count-ups on the server and in print', () => {
    const html = renderToStaticMarkup(<CountUp value={453_600} format={value => `$${Math.round(value).toLocaleString('en-US')}`} />);
    expect(html).toContain('$453,600');
    expect(html).not.toContain('$0');
  });

  it('keys the one-time celebration to the scenario so a changed result can celebrate again', () => {
    const positive = computeAssessment(createDemoAssessment());
    const changed = createDemoAssessment();
    changed.seats = 1_200;
    expect(celebrationKey('Northstar', 1_000, positive)).not.toBe(celebrationKey('Northstar', 1_200, computeAssessment(changed)));
    expect(celebrationKey(' Northstar ', 1_000, positive)).toBe(celebrationKey('northstar', 1_000, positive));
  });
});
