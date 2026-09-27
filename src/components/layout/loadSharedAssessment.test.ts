import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSharedAssessment } from './loadSharedAssessment';
import { toAssessment, useAssessment } from '@/store/useAssessment';
import { encodeAssessment } from '@/store/share';

const data = new Map<string, string>();
function mockWindow(payload?: string, confirm = true) {
  const replaceState = vi.fn();
  const confirmDialog = vi.fn(() => confirm);
  vi.stubGlobal('window', {
    location: new URL(payload === undefined ? 'https://example.com/#main-content' : `https://example.com/?view=assessment#d=${payload}`),
    history: { replaceState },
    confirm: confirmDialog,
  });
  return { replaceState, confirmDialog };
}

beforeEach(() => {
  data.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
  useAssessment.getState().reset();
  useAssessment.getState().setOrgName('Existing customer');
  useAssessment.getState().start();
  useAssessment.setState({ storageError: null });
});
afterEach(() => vi.unstubAllGlobals());

describe('shared assessment entry', () => {
  it('leaves an ordinary visit alone', () => {
    const { replaceState, confirmDialog } = mockWindow();
    expect(loadSharedAssessment()).toBe(false);
    expect(useAssessment.getState().flash).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
    expect(confirmDialog).not.toHaveBeenCalled();
  });

  it('reports a malformed link without replacing existing inputs', () => {
    const before = toAssessment(useAssessment.getState());
    const { replaceState, confirmDialog } = mockWindow('invalid');
    expect(loadSharedAssessment()).toBe(false);
    expect(toAssessment(useAssessment.getState())).toEqual(before);
    expect(useAssessment.getState().flash).toContain('invalid or incomplete');
    expect(useAssessment.getState().flash).toContain('not replaced');
    expect(confirmDialog).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith({}, '', 'https://example.com/?view=assessment');
  });

  it('rejects a decoded assessment with invalid model inputs before confirmation', () => {
    const before = toAssessment(useAssessment.getState());
    const { confirmDialog } = mockWindow(encodeAssessment({ ...before, seats: -1 }));
    expect(loadSharedAssessment()).toBe(false);
    expect(toAssessment(useAssessment.getState())).toEqual(before);
    expect(useAssessment.getState().flash).toContain('could not be loaded');
    expect(confirmDialog).not.toHaveBeenCalled();
  });

  it.each(['EUR', 'GBP'])('rejects a %s share before replacement confirmation without changing current inputs', (currency) => {
    const before = toAssessment(useAssessment.getState());
    const { confirmDialog, replaceState } = mockWindow(encodeAssessment({
      ...before, currency, orgName: 'Non-USD share',
      assumptions: { ...before.assumptions, pricesConfirmed: true },
    }));
    expect(loadSharedAssessment()).toBe(false);
    expect(toAssessment(useAssessment.getState())).toEqual(before);
    expect(useAssessment.getState().flash).toContain('No FX conversion');
    expect(useAssessment.getState().flash).toContain('not replaced');
    expect(confirmDialog).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledOnce();
  });

  it('keeps the current assessment and URL when replacement is cancelled', () => {
    const before = toAssessment(useAssessment.getState());
    const { replaceState, confirmDialog } = mockWindow(encodeAssessment({ ...before, orgName: 'Shared customer' }), false);
    expect(loadSharedAssessment()).toBe(false);
    expect(confirmDialog).toHaveBeenCalledOnce();
    expect(replaceState).not.toHaveBeenCalled();
    expect(toAssessment(useAssessment.getState())).toEqual(before);
    expect(useAssessment.getState().flash).toContain('unchanged');
  });

  it('loads accepted inputs, surfaces review notes and clears the payload', () => {
    const shared = { ...toAssessment(useAssessment.getState()), orgName: 'Shared customer', reviewWarnings: ['Confirm the imported contract currency.'] };
    const { replaceState, confirmDialog } = mockWindow(encodeAssessment(shared));
    expect(loadSharedAssessment()).toBe(true);
    expect(confirmDialog).toHaveBeenCalledOnce();
    expect(useAssessment.getState().orgName).toBe('Shared customer');
    expect(useAssessment.getState().step).toBe('results');
    expect(useAssessment.getState().flash).toContain('Shared assessment loaded');
    expect(useAssessment.getState().flash).toContain('Confirm the imported contract currency.');
    expect(replaceState).toHaveBeenCalledOnce();
  });
});
