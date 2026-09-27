import { describe, expect, it, vi } from 'vitest';
import { watchScenePalette, type ScenePalette } from './palette';

const light: ScenePalette = {
  paper: '#ffffff', ground: '#edf1f5', wash: '#f5f7fa', ink: '#14263c', muted: '#516177',
  rule: '#d4dce6', action: '#194dc4', actionWash: '#eaf0ff', note: '#fbf0c5',
  noteInk: '#5a4510', positive: '#12604e', negative: '#a33337', ledger: '#19354a',
};
const dark = { ...light, ground: '#101c28', paper: '#182737', ink: '#eef4f9' };

describe('scene palette subscriptions', () => {
  it('reads settled tokens after both deferred root-theme toggles, not the earlier prop value', () => {
    let tokens = light;
    let notify = () => {};
    const changed = vi.fn();
    const cleanup = watchScenePalette(() => tokens, refresh => { notify = refresh; return () => {}; }, changed);
    expect(changed).toHaveBeenLastCalledWith(light);
    tokens = dark;
    notify();
    expect(changed).toHaveBeenLastCalledWith(dark);
    tokens = light;
    notify();
    expect(changed).toHaveBeenLastCalledWith(light);
    expect(changed).toHaveBeenCalledTimes(3);
    cleanup();
  });

  it('does not rebuild GPU materials for unrelated ancestor mutations', () => {
    let notify = () => {};
    const changed = vi.fn();
    const cleanup = watchScenePalette(() => ({ ...light }), refresh => { notify = refresh; return () => {}; }, changed);
    notify();
    notify();
    expect(changed).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('disconnects on cleanup and ignores already-queued observer notifications', () => {
    let notify = () => {};
    let tokens = dark;
    const changed = vi.fn();
    const disconnect = vi.fn();
    const cleanup = watchScenePalette(() => tokens, refresh => { notify = refresh; return disconnect; }, changed);
    cleanup();
    tokens = light;
    notify();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(changed).toHaveBeenCalledExactlyOnceWith(dark);
  });
});
