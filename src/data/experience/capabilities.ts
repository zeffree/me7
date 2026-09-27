import { CATEGORIES, DOMAINS, type Category, type Coverage, type DomainId } from '../categories';
import { CATEGORY_EVIDENCE } from '../evidence';
import { EXPERIENCE_MISSIONS } from './missions';

export const LAB_COVERAGE_LABELS: Record<Coverage, string> = {
  already: 'Already available',
  unlocked: 'Newly included offering',
  upgrade: 'Higher tier',
  'not-covered': 'Still separate',
};

const BASELINE_EXPLANATIONS: Record<Coverage, string> = {
  already: 'Office 365 E3 already includes a relevant capability in this area. It is not a new E7 benefit.',
  unlocked: 'The compared offering goes beyond Office 365 E3. Basic features or separately purchased tools may still help with the task today.',
  upgrade: 'Office 365 E3 has a foundational tier. E7 adds a higher tier, not the first capability in this area.',
  'not-covered': 'This offering is not supplied by the E7 suite comparison either. A separate product, service or consumption arrangement remains relevant.',
};

export function describeCapability(category: Category) {
  const evidence = CATEGORY_EVIDENCE[category.id];
  return {
    category,
    coverage: category.coverage.o365e3,
    baseline: BASELINE_EXPLANATIONS[category.coverage.o365e3],
    conditions: evidence?.conditions ?? [],
    sourceIds: evidence?.sourceIds ?? [],
    missions: EXPERIENCE_MISSIONS.filter(mission => mission.categoryIds.includes(category.id)),
  };
}

export function filterCapabilities(query: string, domain: DomainId | 'all', coverage: Coverage | 'all') {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return CATEGORIES.filter(category => {
    const searchable = [category.name, category.whatItIs, category.e7Component, ...category.examples].join(' ').toLocaleLowerCase();
    return (domain === 'all' || category.domain === domain)
      && (coverage === 'all' || category.coverage.o365e3 === coverage)
      && words.every(word => searchable.includes(word));
  });
}

export function isCapabilityDomain(value: string): value is DomainId | 'all' {
  return value === 'all' || DOMAINS.some(domain => domain.id === value);
}

export function isCapabilityCoverage(value: string): value is Coverage | 'all' {
  return value === 'all' || value === 'already' || value === 'unlocked' || value === 'upgrade' || value === 'not-covered';
}
