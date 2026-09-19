'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/components/three/useReducedMotion';

export interface MagneticCursorProps {
  /** Outer ring size in px. */
  size?: number;
  /** Trail dot size in px. */
  dotSize?: number;
  /** Colour of the ring stroke. */
  ringColor?: string;
  /** Colour of the trailing dot. */
  dotColor?: string;
  /** Lerp factor for the trailing dot (0..1, lower = laggier). */
  dotLerp?: number;
}

/**
 * A custom round cursor that lerps behind the system pointer. The outer
 * ring tracks the cursor 1:1; the trailing dot lerps so it lags slightly
 * — the signature "physics cursor" feel.
 *
 * Hover-aware: when the cursor passes over `[data-cursor="hover"]`, the
 * ring scales up and the dot contracts. Pressed state on `[data-cursor-press]`.
 *
 * Pointer-events: none throughout so it never blocks clicks.
 * Skipped entirely on touch devices (no fine pointer) and reduced motion.
 */
export function MagneticCursor({
  size = 32,
  dotSize = 6,
  ringColor = 'rgba(12, 10, 9, 0.55)',
  dotColor = 'rgba(12, 10, 9, 0.95)',
  dotLerp = 0.18,
}: MagneticCursorProps) {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef({ x: -100, y: -100 });
  const currentRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    // Skip on coarse pointers (touch-only devices) — a custom cursor is
    // worse than native there.
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (reduceMotion) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    // Hide the native cursor everywhere — we replace it.
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = 'none';

    function onMove(e: PointerEvent) {
      targetRef.current.x = e.clientX;
      targetRef.current.y = e.clientY;
    }
    window.addEventListener('pointermove', onMove, { passive: true });

    let hovering = false;
    function onOver(e: PointerEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const hover = t.closest('[data-cursor="hover"]');
      const press = t.closest('[data-cursor="press"]');
      if (press) {
        ring!.dataset.state = 'press';
      } else if (hover) {
        ring!.dataset.state = 'hover';
        hovering = true;
      } else {
        ring!.dataset.state = 'idle';
        hovering = false;
      }
    }
    window.addEventListener('pointerover', onOver, { passive: true });

    let mounted = true;
    function frame() {
      if (!mounted) return;
      const target = targetRef.current;
      const current = currentRef.current;

      // Ring tracks 1:1
      ring!.style.transform = `translate3d(${target.x - size / 2}px, ${target.y - size / 2}px, 0)`;

      // Dot lerps behind
      current.x += (target.x - current.x) * dotLerp;
      current.y += (target.y - current.y) * dotLerp;
      dot!.style.transform = `translate3d(${current.x - dotSize / 2}px, ${current.y - dotSize / 2}px, 0)`;

      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      document.body.style.cursor = prevCursor;
    };
  }, [size, dotSize, dotLerp, reduceMotion]);

  // Don't render anything on touch / reduced-motion.
  if (reduceMotion) return null;
  if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
    return null;
  }

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: size,
          height: size,
          border: `1.5px solid ${ringColor}`,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9999,
          transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1), height 0.3s cubic-bezier(0.22,1,0.36,1), border-color 0.3s cubic-bezier(0.22,1,0.36,1)',
          willChange: 'transform',
        }}
      />
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: dotSize,
          height: dotSize,
          background: dotColor,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9999,
          willChange: 'transform',
        }}
      />
    </>
  );
}

export default MagneticCursor;
