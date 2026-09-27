import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppShell } from './AppShell';
import { APP_ROUTES, type AppPage } from './appRoute';

const state = vi.hoisted(() => ({
  started: true,
  sellerMode: false,
  theme: 'light',
  storageError: null as string | null,
  toggleSellerMode: vi.fn(),
  toggleTheme: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('@/store/useAssessment', () => ({
  useAssessment: () => state,
  toAssessment: vi.fn(),
}));

function renderShell(page: AppPage) {
  return renderToStaticMarkup(<AppShell page={page} onHome={() => {}} onAssessment={() => {}}>Page content</AppShell>);
}

beforeEach(() => {
  state.started = true;
  state.storageError = null;
});

describe('page-specific application shell', () => {
  it.each<AppPage>(['assessment', 'audit', 'architecture', 'experience'])('keeps global navigation and disclaimer in %s', page => {
    const html = renderShell(page);
    expect(html).toContain(`href="#${APP_ROUTES[page].mainId}"`);
    expect(html).toContain(`<main id="${APP_ROUTES[page].mainId}" tabindex="-1">Page content</main>`);
    expect(html).toContain(`href="${APP_ROUTES[page].href}" aria-current="page"`);
    expect(html).toContain('aria-label="E7 assessment home"');
    expect(html).toContain('aria-label="Use dark theme"');
    expect(html).toContain('personal project by Zeffree Kan');
    expect(html).toContain('mailto:zeffree@live.com');
  });

  it.each<AppPage>(['assessment', 'audit'])('preserves assessment controls and workspace disclosures in %s', page => {
    const html = renderShell(page);
    expect(html).toContain('Local browser workspace');
    expect(html).toContain('aria-label="Toggle presenter guidance"');
    expect(html).toContain('aria-label="Start a new assessment"');
    expect(html).toContain('Local storage can be unavailable or cleared');
    expect(html).toContain('Shared links contain your inputs and are not encrypted');
  });

  it.each<AppPage>(['assessment', 'audit'])('preserves storage failure status and alert in %s', page => {
    state.storageError = 'This assessment could not be saved.';
    const html = renderShell(page);
    expect(html).toContain('save-status error');
    expect(html).toContain('Not saved · export a copy');
    expect(html).toContain('role="alert">This assessment could not be saved.</div>');
  });

  it.each<AppPage>(['assessment', 'audit'])('does not offer reset before an assessment has started in %s', page => {
    state.started = false;
    expect(renderShell(page)).not.toContain('aria-label="Start a new assessment"');
  });

  it.each<AppPage>(['architecture', 'experience'])('hides assessment-only controls, storage failures and workspace disclosures in %s', page => {
    state.storageError = 'This assessment could not be saved.';
    const html = renderShell(page);
    for (const text of [
      'save-status', 'Local browser workspace', 'Toggle presenter guidance',
      'Start a new assessment', 'role="alert"', state.storageError,
      'Local storage can be unavailable or cleared', 'Shared links contain your inputs',
    ]) expect(html).not.toContain(text);
  });
});
