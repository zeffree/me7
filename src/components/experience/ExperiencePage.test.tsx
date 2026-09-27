import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CATEGORIES } from '@/data/categories';
import { EXPERIENCE_MISSIONS } from '@/data/experience/missions';
import { createExperienceState, experienceReducer } from '@/lib/experienceEngine';
import { toAssessment, useAssessment } from '@/store/useAssessment';
import { CapabilityIndex } from './CapabilityIndex';
import { CapabilityPassport } from './CapabilityPassport';
import { RolePaths, SuiteSwitch, ReplayControls } from './ExperienceControls';
import { MissionDebrief } from './MissionDebrief';
import { WorkplaceScene } from './WorkplaceScene';
import { ExperiencePage } from './ExperiencePage';

const escape = (text: string) => renderToStaticMarkup(<span>{text}</span>).slice(6, -7);

describe('capability lab semantic interface', () => {
  it('opens a useful workplace without starting or mutating the assessment', () => {
    const before = toAssessment(useAssessment.getState());
    const html = renderToStaticMarkup(<ExperiencePage />);
    expect(html).toContain('A workplace you can play with.');
    expect(html).toContain('data-suite="o365e3"');
    expect(html).toContain('A fictional workplace.');
    expect(html).toContain('No AI runs behind these examples.');
    expect(html).toContain('aria-label="Capability lab"');
    expect(html).toContain('role="status" aria-live="polite"');
    expect(html).not.toContain('Start a new assessment');
    expect(html).not.toContain('Toggle presenter guidance');
    expect(toAssessment(useAssessment.getState())).toEqual(before);
  });

  it('exposes all eight illustrated spaces as named native controls', () => {
    const html = renderToStaticMarkup(<WorkplaceScene missions={EXPERIENCE_MISSIONS} state={createExperienceState()} onEnter={() => {}} />);
    for (const mission of EXPERIENCE_MISSIONS) {
      expect(html).toContain(escape(`Enter ${mission.title}. ${mission.room}`));
      expect(html).toContain(escape(mission.room));
    }
    expect(html.match(/class="lab-space /g)).toHaveLength(8);
    expect(html).toContain('A fictional office, not a network diagram.');
    expect(html).not.toContain('<canvas');
  });

  it('offers exact suite labels without price or investment controls', () => {
    for (const suite of ['o365e3', 'm365e7'] as const) {
      const html = renderToStaticMarkup(<SuiteSwitch suite={suite} onChange={() => {}} />);
      expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
      expect(html).toContain('Office 365');
      expect(html).toContain('Microsoft 365');
      expect(html).toContain('separate, resumable run');
      expect(html).not.toMatch(/saving|price|discount/i);
    }
  });

  it('keeps role selection optional and the complete catalog available', () => {
    const roles = renderToStaticMarkup(<RolePaths role="everyone" onChange={() => {}} />);
    expect(roles).toContain('All spaces stay open');
    const html = renderToStaticMarkup(<CapabilityIndex onMission={() => {}} />);
    expect(html).toContain(`${CATEGORIES.length} of ${CATEGORIES.length} categories shown`);
    expect(html.match(/class="lab-capability"/g)).toHaveLength(CATEGORIES.length);
    expect(html).toContain('Already available');
    expect(html).toContain('Still separate');
    expect(html).toContain('Microsoft 365 backup');
  });

  it('never implies a first visit is completed or certified', () => {
    const html = renderToStaticMarkup(<CapabilityPassport state={createExperienceState()} onMission={() => {}} />);
    expect(html).toContain('0 of 8 discoveries collected.');
    expect(html).toContain('not a certification or a readiness score');
    expect(html).not.toContain('Discovery collected</span>');
  });

  it('exposes accessible bounded rewind and redo controls', () => {
    const state = experienceReducer(createExperienceState(), { type: 'enter', id: 'brief' });
    const html = renderToStaticMarkup(<ReplayControls state={state} dispatch={vi.fn()} onReset={() => {}} />);
    expect(html).toContain('aria-label="Rewind your decisions"');
    expect(html).toContain('aria-valuetext="Starting setup"');
    expect(html).toContain('disabled=""');
  });

  it.each(EXPERIENCE_MISSIONS)('$id debrief includes both suites, conditions and source links', mission => {
    const html = renderToStaticMarkup(<MissionDebrief mission={mission} progress={createExperienceState().missions[mission.id]}
      onDiscover={() => {}} onCatalog={() => {}} onNext={() => {}} />);
    expect(html).toContain(escape(mission.comparison.o365e3));
    expect(html).toContain(escape(mission.comparison.m365e7));
    expect(html).toContain(escape(mission.boundary));
    expect(html).toContain('Sources behind this example');
    expect(html).toContain('href="#architecture"');
    expect(html).toContain('href="#assessment"');
    expect(html).toContain('disabled=""');
  });
});
