'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from '@/components/three/useReducedMotion';
import { cn } from '@/lib/utils';

export interface CardSpotlightProps {
  children: ReactNode;
  /** Spotlight size in px. */
  size?: number;
  /** Spotlight colour (rgba). */
  color?: string;
  /** Optional className passthrough. */
  className?: string;
}

/**
 * Wraps content with a soft radial spotlight that follows the cursor.
 * Used on cards — when the user hovers, a faint coloured halo tracks
 * the cursor inside the card. Reads as "physical light on the surface".
 *
 * Implementation: an absolutely-positioned div with a radial gradient
 * whose background-position is updated via CSS variables on `pointermove`.
 * No React state — runs entirely through the DOM, so 60fps.
 */
export function CardSpotlight({
  children,
  size = 320,
  color = 'rgba(167, 229, 211, 0.35)',
  className,
}: CardSpotlightProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (reduceMotion) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    function onMove(e: PointerEvent) {
      const r = el!.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      el!.style.setProperty('--spot-x', `${x}px`);
      el!.style.setProperty('--spot-y', `${y}px`);
      el!.style.setProperty('--spot-active', '1');
    }
    function onLeave() {
      el!.style.setProperty('--spot-active', '0');
    }
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [reduceMotion]);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={{
        // CSS vars for spotlight position; defaults to centre / inactive.
        ['--spot-x' as string]: '50%',
        ['--spot-y' as string]: '50%',
        ['--spot-active' as string]: '0',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(${size}px circle at var(--spot-x) var(--spot-y), ${color}, transparent 60%)`,
          opacity: 'var(--spot-active)',
          transition: 'opacity 0.4s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export default CardSpotlight;
