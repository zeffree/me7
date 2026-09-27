import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

/**
 * Animates a displayed number towards `target`. Server rendering, tests, reduced motion and
 * printing always receive the exact final value; only the on-screen presentation animates.
 */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(target);
  const shown = useRef(target);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    if (!Number.isFinite(target) || prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      shown.current = target;
      setValue(target);
      return;
    }
    const start = first ? 0 : shown.current;
    if (start === target) { setValue(target); return; }
    const length = first ? duration : Math.min(duration, 520);
    const began = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / length);
      const next = progress >= 1 ? target : start + (target - start) * easeOutCubic(progress);
      shown.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    shown.current = start;
    setValue(start);
    frame = requestAnimationFrame(tick);
    const settle = () => { cancelAnimationFrame(frame); shown.current = target; setValue(target); };
    window.addEventListener('beforeprint', settle);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('beforeprint', settle); };
  }, [target, duration]);
  return value;
}

/** Becomes true once the element has been scrolled into view, and stays true. */
export function useSeen<T extends Element>(threshold = 0.2): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setSeen(true); observer.disconnect(); }
    }, { threshold });
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, seen];
}
