'use client';

import { Children, useRef, type ReactNode } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { cn } from '@/lib/utils';

export interface HorizontalScrollProps {
  /** Total scroll distance (in viewport heights) for the horizontal journey.
   * Higher = slower, more cinematic. Defaults to 2.5vh per card. */
  distanceVh?: number;
  /** Children — each direct child is laid out horizontally side-by-side. */
  children: ReactNode;
  /** Width of each card in px. Defaults to 420. */
  cardWidth?: number;
  /** Gap between cards in px. Defaults to 32. */
  gap?: number;
  /** Outer wrapper class. */
  className?: string;
  /** Inner sticky-wrapper class. */
  innerClassName?: string;
  /** Sticky wrapper width — usually equals cardWidth so the gallery is centered. */
  stickyWidth?: string;
}

/**
 * A pinned horizontal-scroll section. As the user scrolls vertically past the
 * outer wrapper, the inner track translates horizontally — each card passing
 * through the centered sticky slot in turn.
 *
 * Pattern (reference: Motion's ScrollHorizontal example):
 *  - Outer wrapper = total scroll distance tall (e.g. 4 cards × 100vh = 400vh)
 *  - Inner sticky-wrapper = centered viewport-height slot
 *  - Inner gallery = horizontal flex of cards
 *  - x transform maps scrollYProgress[0..1] → [0, -(N-1)*(W+GAP)]
 *
 * Reduced motion: no pin, content flows as a regular horizontal scroll-x
 * strip that the user can swipe.
 */
export function HorizontalScroll({
  distanceVh,
  children,
  cardWidth = 420,
  gap = 32,
  className,
  innerClassName,
  stickyWidth,
}: HorizontalScrollProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const childArray = Children.toArray(children);
  const totalCards = childArray.length;

  // Total translation = enough to bring the LAST card into the centered slot.
  // We start with the FIRST card centered, and end with the LAST card centered,
  // so we travel (N-1) × (W + GAP) pixels horizontally.
  const totalTranslate = (totalCards - 1) * (cardWidth + gap);
  const wrapperHeight = distanceVh ?? Math.max(2, totalCards) * 100;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const x = useTransform(scrollYProgress, [0, 1], [0, -totalTranslate]);

  if (reduceMotion) {
    return (
      <div className={cn('relative w-full overflow-x-auto', className)}>
        <div
          className={cn('flex gap-8 px-6 py-12', innerClassName)}
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {childArray.map((child, i) => (
            <div
              key={i}
              className="shrink-0"
              style={{ width: cardWidth, scrollSnapAlign: 'center' }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn('relative', className)}
      style={{ height: `${wrapperHeight}vh` }}
    >
      <div
        className={cn(
          'sticky top-0 flex h-screen items-center justify-center overflow-hidden',
          innerClassName
        )}
        style={{ width: stickyWidth ?? '100%' }}
      >
        <motion.div
          className="flex h-full items-center"
          style={{
            gap: `${gap}px`,
            x,
            willChange: 'transform',
            paddingLeft: `calc(50vw - ${cardWidth / 2}px)`,
            paddingRight: `calc(50vw - ${cardWidth / 2}px)`,
          }}
        >
          {childArray.map((child, i) => (
            <div
              key={i}
              className="shrink-0"
              style={{ width: cardWidth }}
            >
              {child}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default HorizontalScroll;
