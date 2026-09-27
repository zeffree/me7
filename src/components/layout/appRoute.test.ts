import { describe, expect, it } from 'vitest';
import { APP_ROUTES, readAppRoute, type AppPage } from './appRoute';

describe('application page routes', () => {
  it.each<[string, AppPage]>([
    ['', 'assessment'],
    ['#', 'assessment'],
    ['#assessment', 'assessment'],
    ['#main-content', 'assessment'],
    ['#audit', 'audit'],
    ['#audit-main-content', 'audit'],
  ])('recognizes %s as %s', (hash, page) => {
    expect(readAppRoute(hash)).toBe(page);
  });

  it.each<AppPage>(['assessment', 'audit'])('keeps %s mounted when its skip link changes the hash', page => {
    const route = APP_ROUTES[page];
    expect(readAppRoute(route.href)).toBe(page);
    expect(readAppRoute(`#${route.mainId}`)).toBe(page);
  });

  it.each([
    '#d=compressed-assessment',
    '#architecture',
    '#experience',
    '#experience-main-content',
    '#d=architecture',
    '#d=abc%2Bdef&section=architecture',
    '#architecture&d=compressed-assessment',
    '#architecture=1',
    '#architecture?mission=access',
    '#architecture-main-content-extra',
    '#experience?mission=brief',
    '#experience&d=compressed-assessment',
    '#experience-main-content-extra',
    '#Experience',
    '#Architecture',
    '#%61rchitecture',
    '#audit&architecture',
    '#unknown',
    '?d=legacy-assessment',
    'architecture',
  ])('does not treat payloads or unrelated fragments as routes: %s', hash => {
    expect(readAppRoute(hash)).toBeNull();
  });

  it('leaves legacy query payloads separate from page recognition', () => {
    const url = new URL('https://example.com/?d=legacy-assessment#main-content');
    expect(readAppRoute(url.hash)).toBe('assessment');
    expect(url.searchParams.get('d')).toBe('legacy-assessment');
  });

  it('no longer routes the retired architecture and experience pages', () => {
    const url = new URL('https://example.com/?d=legacy-assessment#architecture');
    expect(readAppRoute(url.hash)).toBeNull();
    expect(url.searchParams.get('d')).toBe('legacy-assessment');
  });
});
