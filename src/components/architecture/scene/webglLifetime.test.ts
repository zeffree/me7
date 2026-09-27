import { describe, expect, it, vi } from 'vitest';
import { bindContextLifecycle } from './webglLifetime';

describe('architecture graphics lifecycle', () => {
  it('reports real context loss once and permits an explicit manual retry', () => {
    const canvas = new EventTarget();
    const report = vi.fn();
    const cleanup = bindContextLifecycle(canvas, report);
    const lost = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(lost);
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(lost.defaultPrevented).toBe(true);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(expect.stringContaining('interactive 2D'));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(report).toHaveBeenLastCalledWith(expect.stringContaining('Retry 3D'));
    cleanup();
  });

  it('does not interpret deliberate disposal as graphics failure', () => {
    const canvas = new EventTarget();
    const report = vi.fn();
    const cleanup = bindContextLifecycle(canvas, report);
    cleanup();
    cleanup();
    const lost = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(lost);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(report).not.toHaveBeenCalled();
    expect(lost.defaultPrevented).toBe(false);
  });

  it('rebinds cleanly after a StrictMode-style setup/cleanup/setup cycle', () => {
    const canvas = new EventTarget();
    const retired = vi.fn();
    const current = vi.fn();
    bindContextLifecycle(canvas, retired)();
    const cleanup = bindContextLifecycle(canvas, current);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(current).not.toHaveBeenCalled();
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(retired).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledTimes(1);
    cleanup();
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(current).toHaveBeenCalledTimes(1);
  });
});
