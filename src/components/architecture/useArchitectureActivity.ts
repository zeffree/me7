import { useEffect, useRef, useState, type Dispatch } from 'react';
import type { ArchitectureAction } from '@/data/architectureTypes';
import { PLAYBACK_INTERVAL_MS } from '@/lib/architectureSimulation';

export function useArchitectureActivity() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  const [inView, setInView] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const updateVisibility = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', updateVisibility);
    updateVisibility();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(motion.matches);
    motion.addEventListener('change', updateMotion);
    updateMotion();
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(
      entries => setInView(entries.some(entry => entry.isIntersecting)),
      { threshold: 0.05 },
    );
    if (viewportRef.current) observer?.observe(viewportRef.current);
    return () => {
      document.removeEventListener('visibilitychange', updateVisibility);
      motion.removeEventListener('change', updateMotion);
      observer?.disconnect();
    };
  }, []);

  return { viewportRef, active: visible && inView, reducedMotion };
}

export function useArchitecturePlayback(playing: boolean, active: boolean, dispatch: Dispatch<ArchitectureAction>) {
  useEffect(() => {
    if (!playing || !active) return;
    const timer = window.setInterval(() => dispatch({ type: 'tick' }), PLAYBACK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [playing, active, dispatch]);
}
