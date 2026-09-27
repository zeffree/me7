import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildPresenterCase } from './presenter';
import { PresenterContent } from '@/components/results/SellerWorkspace';
import { createDemoAssessment } from '@/data/demo';
import { computeAssessment } from '@/model/engine';

describe('presenter decision narrative', () => {
  it('keeps funding, retained services, baseline opportunities and timing distinct', () => {
    const assessment = createDemoAssessment();
    const result = computeAssessment(assessment);
    const story = buildPresenterCase(assessment, result);
    expect(story.retirementCandidates).toHaveLength(10);
    expect(story.retirementCandidates.reduce((sum, item) => sum + item.annualCredit, 0)).toBe(1_173_600);
    expect(story.retirementCandidates[0].name).toBe('ChatGPT Enterprise');
    expect(story.baselineOpportunity).toBe(96_000);
    expect(story.retainedAnnual).toBe(60_000);
    expect(story.firstSavingsMonth).toBe(3);
    expect(story.summary).toContain('Full replacement');
    expect(story.summary).toContain('not a benefit unique to E7');
    expect(story.summary).not.toContain('customer-confirmed');
    const html = renderToStaticMarkup(<PresenterContent assessment={assessment} result={result} />);
    expect(html).toContain('Show the path from purchase to payback');
    expect(html).toContain('Month 8');
    expect(html).toContain('Microsoft 365 Copilot');
    expect(html).toContain('acceptance criteria');
    expect(html).toContain('Largest modeled retirements');
  });

  it('does not turn a negative or empty cash case into a savings pitch', () => {
    const assessment = createDemoAssessment();
    assessment.lines = [];
    assessment.addOns = [];
    const result = computeAssessment(assessment);
    const story = buildPresenterCase(assessment, result);
    expect(story.change).toBe('increase');
    expect(story.verdict).toContain('does not yet fund');
    expect(story.retirementCandidates).toEqual([]);
    expect(story.firstSavingsMonth).toBeNull();
    const html = renderToStaticMarkup(<PresenterContent assessment={assessment} result={result} />);
    expect(html).toContain('Do not present an increase as savings');
    expect(html).toContain('No retirement savings are captured yet');
    expect(html).not.toContain('Month null');
  });

  it('labels a cost-neutral result and a licence reduction correctly', () => {
    const assessment = createDemoAssessment();
    assessment.lines = [];
    assessment.addOns = [];
    assessment.assumptions.e7ListPupm = assessment.assumptions.baselineUnitPupm;
    let result = computeAssessment(assessment);
    expect(buildPresenterCase(assessment, result).verdict).toContain('break-even');
    assessment.assumptions.e7ListPupm = 10;
    result = computeAssessment(assessment);
    expect(renderToStaticMarkup(<PresenterContent assessment={assessment} result={result} />)).toContain('Plus: suite licence reduction');
  });
});
