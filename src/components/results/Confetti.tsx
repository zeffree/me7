import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

const COLOURS = ['#12a174', '#3fd19d', '#194dc4', '#7a4fd6', '#f2b233', '#e2557a', '#1fb5c0', '#ff8a3d'];
const STORAGE_PREFIX = 'me7:celebrated:';

interface Piece { x: number; y: number; vx: number; vy: number; size: number; spin: number; angle: number; colour: string; round: boolean; wobble: number }

/**
 * A single, self-removing confetti burst on a fixed, click-through canvas. Decorative only:
 * hidden from assistive technology and print, and skipped entirely under reduced motion.
 */
export function fireConfetti(origin?: DOMRect): () => void {
  if (typeof document === 'undefined' || prefersReducedMotion()) return () => {};
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas no-print';
  canvas.setAttribute('aria-hidden', 'true');
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  document.body.appendChild(canvas);
  const context = canvas.getContext('2d');
  if (!context) { canvas.remove(); return () => {}; }
  context.scale(ratio, ratio);
  const originX = origin ? origin.left + origin.width / 2 : width / 2;
  const originY = origin ? Math.max(40, origin.top + origin.height * 0.35) : height * 0.3;
  const spread = origin ? Math.min(origin.width / 2, 420) : width / 3;
  const pieces: Piece[] = Array.from({ length: 170 }, (_, index) => {
    const angle = (-90 + (Math.random() - 0.5) * 110) * Math.PI / 180;
    const speed = 7 + Math.random() * 9;
    return {
      x: originX + (Math.random() - 0.5) * spread, y: originY,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
      size: 6 + Math.random() * 7, spin: (Math.random() - 0.5) * 0.35, angle: Math.random() * Math.PI,
      colour: COLOURS[index % COLOURS.length], round: Math.random() < 0.28, wobble: Math.random() * 10,
    };
  });
  const began = performance.now();
  const lifetime = 2800;
  let frame = 0;
  const draw = (now: number) => {
    const elapsed = now - began;
    context.clearRect(0, 0, width, height);
    context.globalAlpha = elapsed > lifetime - 700 ? Math.max(0, (lifetime - elapsed) / 700) : 1;
    for (const piece of pieces) {
      piece.vx *= 0.985;
      piece.vy = piece.vy * 0.985 + 0.32;
      piece.x += piece.vx + Math.sin((elapsed / 180) + piece.wobble) * 0.6;
      piece.y += piece.vy;
      piece.angle += piece.spin;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.angle);
      context.fillStyle = piece.colour;
      if (piece.round) { context.beginPath(); context.arc(0, 0, piece.size / 2.4, 0, Math.PI * 2); context.fill(); }
      else context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
      context.restore();
    }
    if (elapsed < lifetime) frame = requestAnimationFrame(draw);
    else canvas.remove();
  };
  frame = requestAnimationFrame(draw);
  return () => { cancelAnimationFrame(frame); canvas.remove(); };
}

/**
 * Celebrates a genuine recurring saving once per distinct result per browser session, and returns
 * a replay action. Never fires when `enabled` is false.
 */
export function useCelebration(key: string, enabled: boolean, target: RefObject<HTMLElement | null>) {
  const stop = useRef<() => void>(() => {});
  const replay = useCallback(() => {
    stop.current();
    stop.current = fireConfetti(target.current?.getBoundingClientRect());
  }, [target]);
  useEffect(() => {
    if (!enabled) return;
    const storageKey = STORAGE_PREFIX + key;
    try { if (window.sessionStorage.getItem(storageKey)) return; } catch { /* storage unavailable */ }
    // Marked inside the timer so a development double-mount cannot consume the celebration.
    const timer = window.setTimeout(() => {
      try { window.sessionStorage.setItem(storageKey, '1'); } catch { /* storage unavailable */ }
      replay();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [key, enabled, replay]);
  useEffect(() => () => stop.current(), []);
  return replay;
}
