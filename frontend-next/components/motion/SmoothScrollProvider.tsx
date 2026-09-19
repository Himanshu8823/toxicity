'use client';

import { ReactLenis } from 'lenis/react';
import type { LenisOptions } from 'lenis';
import { useReducedMotion } from '@/components/three/useReducedMotion';
import type { ReactNode } from 'react';

/**
 * Smooth scroll provider. Wires Lenis at the root so the entire document
 * gets inertial scrolling. When the user prefers reduced motion, the
 * native scroll behaviour takes over (Lenis is never instantiated).
 *
 * `root` lets Lenis manage `window` scrolling itself, so we don't need
 * to render wrapper/content divs around the page. `autoRaf` is on by
 * default — we leave it that way.
 *
 * Tuned for editorial reading: `lerp: 0.1` (subtle inertia, not floaty),
 * `wheelMultiplier: 1` (no overshoot), `touchMultiplier: 2` (mobile catch-up).
 * Anchor links (#analyse-form) get smooth-scroll handling for free via
 * Lenis's default `anchors` option.
 */
const LENIS_OPTIONS: LenisOptions = {
  lerp: 0.1,
  wheelMultiplier: 1,
  touchMultiplier: 2,
  // Lenis defaults: duration 1.2s, exp-out easing. Good for editorial.
};

export interface SmoothScrollProviderProps {
  children: ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    // Native scroll only — no inertia, no animation.
    return <>{children}</>;
  }

  return <ReactLenis root options={LENIS_OPTIONS}>{children}</ReactLenis>;
}

export default SmoothScrollProvider;
