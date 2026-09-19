'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/components/three/useReducedMotion';

export interface WordTiltProps {
  /** The full heading string. Split on whitespace into individual word spans. */
  text: string;
  /** Maximum rotation in degrees at full displacement. */
  maxRotate?: number;
  /** Maximum translation in px at full displacement. */
  maxTranslate?: number;
  /** Falloff radius in CSS px — words closer than this tilt more. */
  influenceRadius?: number;
  /** Easing for the lerp (0..1, lower = laggier). */
  lerp?: number;
  /** Tag for the outer wrapper. */
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div' | 'p';
  /** Class for the outer wrapper. */
  className?: string;
  /** Class applied to each word span. */
  wordClassName?: string;
}

interface WordRect {
  el: HTMLSpanElement;
  cx: number;
  cy: number;
}

/**
 * Splits a string into per-word spans and tilts each one toward (or away
 * from) the cursor based on inverse distance. Pure CSS 3D transforms —
 * no canvas — and rAF lerped so the tilt feels physical, not snappy.
 *
 * Reduced motion: renders the words as plain spans with no animation.
 * Touch devices: also skipped, since cursor-tilt has no meaning there.
 */
export function WordTilt({
  text,
  maxRotate = 8,
  maxTranslate = 8,
  influenceRadius = 220,
  lerp = 0.18,
  as: Tag = 'h1',
  className,
  wordClassName,
}: WordTiltProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const cursorRef = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const wordsRef = useRef<WordRect[]>([]);
  const currentTiltRef = useRef<{ x: number; y: number }[]>([]);
  const rafRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion() ?? false;

  const words = text.split(/(\s+)/);

  useEffect(() => {
    const container = containerRef.current as HTMLElement | null;
    if (!container) return;
    if (reduceMotion) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    // Cache word rects on mount and on resize.
    function cacheRects() {
      const wordEls = container!.querySelectorAll<HTMLSpanElement>('[data-word-tilt-word]');
      const list: WordRect[] = [];
      wordEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        list.push({ el, cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
      });
      wordsRef.current = list;
      currentTiltRef.current = list.map(() => ({ x: 0, y: 0 }));
    }
    cacheRects();
    const ro = new ResizeObserver(cacheRects);
    ro.observe(container);

    function onMove(e: PointerEvent) {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
    }
    container.addEventListener('pointermove', onMove, { passive: true });

    let mounted = true;
    function frame() {
      if (!mounted) return;
      const cx = cursorRef.current.x;
      const cy = cursorRef.current.y;
      const r2 = influenceRadius * influenceRadius;
      const words = wordsRef.current;
      const currents = currentTiltRef.current;

      for (let i = 0; i < words.length; i += 1) {
        const w = words[i];
        const dx = w.cx - cx;
        const dy = w.cy - cy;
        const d2 = dx * dx + dy * dy;
        let targetX = 0;
        let targetY = 0;
        if (d2 < r2) {
          const norm = 1 - d2 / r2;
          const eased = norm * norm * (3 - 2 * norm);
          // Word tilts toward cursor: pulling in the cursor direction.
          targetX = (dx / Math.sqrt(d2 || 1)) * maxTranslate * eased;
          targetY = (dy / Math.sqrt(d2 || 1)) * maxTranslate * eased;
        }
        // Lerp current toward target.
        currents[i].x += (targetX - currents[i].x) * lerp;
        currents[i].y += (targetY - currents[i].y) * lerp;

        const rotZ = (currents[i].x / maxTranslate) * maxRotate * (d2 < r2 ? 1 : 0);
        const rotX = -(currents[i].y / maxTranslate) * maxRotate * (d2 < r2 ? 1 : 0);
        w.el.style.transform = `translate3d(${currents[i].x}px, ${currents[i].y}px, 0) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`;
      }

      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      container.removeEventListener('pointermove', onMove);
    };
  }, [maxRotate, maxTranslate, influenceRadius, lerp, reduceMotion]);

  return (
    <Tag
      ref={containerRef as never}
      className={className}
      style={{ perspective: '600px' }}
    >
      {words.map((word, i) => {
        if (/^\s+$/.test(word)) {
          return <span key={i}>{word}</span>;
        }
        return (
          <span
            key={i}
            data-word-tilt-word=""
            className={wordClassName}
            style={{
              display: 'inline-block',
              transformStyle: 'preserve-3d',
              willChange: 'transform',
            }}
          >
            {word}
          </span>
        );
      })}
    </Tag>
  );
}

export default WordTilt;
