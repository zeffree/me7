import { describe, expect, it } from 'vitest';
import { CATEGORIES, DOMAINS } from '../categories';
import { getSource } from '../sources';
import { describeCapability, filterCapabilities } from './capabilities';
import { EXPERIENCE_MISSIONS, getExperienceMission } from './missions';
import { ROLE_PATHS } from './roles';
import { LAB_SUITES, MISSION_IDS } from './types';

describe('living workplace content contract', () => {
  it('registers exactly eight distinct, complete missions in workplace order', () => {
    expect(EXPERIENCE_MISSIONS.map(mission => mission.id)).toEqual([...MISSION_IDS]);
    expect(new Set(EXPERIENCE_MISSIONS.map(mission => mission.room)).size).toBe(8);
    for (const mission of EXPERIENCE_MISSIONS) {
      expect(getExperienceMission(mission.id)).toBe(mission);
      for (const value of [mission.title, mission.intro, mission.objective, mission.product, mission.boundary, mission.takeaway]) {
        expect(value.trim().length).toBeGreaterThan(8);
      }
      for (const suite of LAB_SUITES) expect(mission.comparison[suite].length).toBeGreaterThan(30);
      expect(mission.prerequisites.length).toBeGreaterThan(0);
      expect(mission.variants.everyday.description).not.toBe(mission.variants.curveball.description);
      expect(DOMAINS.some(domain => domain.id === mission.domain)).toBe(true);
    }
  });

  it.each(EXPERIENCE_MISSIONS)('$id points to real source records and catalog categories', mission => {
    expect(mission.sourceIds.length).toBeGreaterThan(0);
    expect(mission.categoryIds.length).toBeGreaterThan(0);
    for (const id of mission.sourceIds) {
      const source = getSource(id);
      expect(source, `${mission.id}: missing source ${id}`).toBeDefined();
      expect(source?.url).toMatch(/^https:\/\/(?:learn\.microsoft\.com|www\.microsoft\.com|blogs\.microsoft\.com)\//);
    }
    for (const id of mission.categoryIds) expect(CATEGORIES.some(category => category.id === id), `${mission.id}: missing category ${id}`).toBe(true);
  });

  it('keeps all roles open and points recommendations at existing spaces', () => {
    expect(ROLE_PATHS.map(role => role.id)).toEqual(['everyone', 'business', 'it', 'security', 'leader']);
    for (const role of ROLE_PATHS) {
      expect(role.missions.length).toBeGreaterThanOrEqual(4);
      for (const id of role.missions) expect(getExperienceMission(id)).toBeDefined();
    }
  });
});

describe('complete, baseline-aware capability index', () => {
  it('includes every current category without a separate hand-maintained inventory', () => {
    expect(filterCapabilities('', 'all', 'all')).toEqual(CATEGORIES);
    for (const category of CATEGORIES) {
      const detail = describeCapability(category);
      expect(detail.coverage).toBe(category.coverage.o365e3);
      expect(detail.baseline).toBeTruthy();
      expect(detail.category.e7Component).toBeTruthy();
    }
  });

  it('keeps exclusions findable without requiring a playable mission', () => {
    const separate = filterCapabilities('', 'all', 'not-covered');
    expect(separate.map(category => category.id)).toEqual(CATEGORIES.filter(category => category.coverage.o365e3 === 'not-covered').map(category => category.id));
    expect(separate.map(category => category.id)).toEqual(expect.arrayContaining(['saas-backup', 'esignature', 'contact-center', 'siem-soar']));
    expect(filterCapabilities('backup', 'all', 'all').length).toBeGreaterThan(0);
  });

  it('combines case-insensitive terms with domain and coverage filters', () => {
    expect(filterCapabilities('  POWER   BI ', 'analytics', 'all').some(category => category.id === 'business-intelligence')).toBe(true);
    expect(filterCapabilities('Power BI', 'identity', 'all')).toHaveLength(0);
    expect(filterCapabilities('no-such-capability-xyz', 'all', 'all')).toHaveLength(0);
    for (const domain of DOMAINS) expect(filterCapabilities('', domain.id, 'all').every(category => category.domain === domain.id)).toBe(true);
  });
});
