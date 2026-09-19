'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ScrollLockSectionProps {
  /** Children that get pinned in place while the user scrolls through. */
  children: ReactNode;
  /** Total scroll distance (in viewport heights) the user travels while the
   * section is pinned. Defaults to 1.5 viewports. */
  distanceVh?: number;
  /** When true, fades content out as the user approaches the end of the
   * pinned range — useful for handing off to the next section. */
  fadeOut?: boolean;
  /** Outer wrapper className. */
  className?: string;
  /** Inner pinned container className. */
  innerClassName?: string;
}

/**
 * A pinned, scroll-driven storytelling section. The inner content is `position:
 * sticky`'d to the viewport for the full scroll-distance of the outer wrapper,
 * so a normal page scroll becomes a cinematic scrub timeline.
 *
 * Reduced motion: no pin, content flows normally.
 */
export function ScrollLockSection({
  children,
  distanceVh = 1.5,
  fadeOut = true,
  className,
  innerClassName,
}: ScrollLockSectionProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // Subtle inner scale + rotateY as you scrub through for cinematic depth.
  const innerScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.02, 1.04]);
  const innerRotate = useTransform(scrollYProgress, [0, 1], [-1.5, 1.5]);
  const innerOpacity = useTransform(
    scrollYProgress,
    fadeOut ? [0, 0.85, 1] : [0, 1],
    fadeOut ? [1, 1, 0.3] : [1, 1]
  );

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={cn('relative', className)}
      style={{ height: `${distanceVh * 100}vh` }}
    >
      <motion.div
        className={cn('sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden', innerClassName)}
        style={{
          scale: innerScale,
          rotate: innerRotate,
          opacity: innerOpacity,
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export default ScrollLockSection;
