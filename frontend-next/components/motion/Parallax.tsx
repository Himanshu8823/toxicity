'use client';

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface ParallaxProps {
  children: ReactNode;
  /**
   * How far (in px) the element travels over its scroll range.
   * Positive moves the element *with* the scroll (drifts down);
   * negative drifts against the scroll (drifts up).
   * Defaults to 60.
   */
  speed?: number;
  /** Ref forwarded to the wrapper div — useful for parent scroll contexts. */
  wrapperRef?: React.RefObject<HTMLDivElement | null>;
  /** Render the parallax effect on the wrapping div (default) or expose a motion value via children-as-function. */
  mode?: 'wrap' | 'render';
  /** Pass-through className. */
  className?: string;
}

interface ParallaxRenderProps {
  y: MotionValue<number>;
  scrollYProgress: MotionValue<number>;
}

/**
 * A scroll-driven parallax wrapper. Tracks scroll progress over the
 * element's bounding box and translates the wrapper on the Y axis.
 *
 * `speed` semantics:
 *   > 0  — element drifts DOWN as you scroll past it (looks like it's further away)
 *   < 0  — element drifts UP as you scroll past it (looks like it's closer)
 *   = 0  — static (useful as a passthrough)
 */
export function Parallax({
  children,
  speed = 60,
  wrapperRef,
  mode = 'wrap',
  className,
}: ParallaxProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const localRef = useRef<HTMLDivElement | null>(null);
  const target = wrapperRef ?? localRef;

  const { scrollYProgress } = useScroll({
    target,
    offset: ['start end', 'end start'],
  });

  // speed positive → drift DOWN; negative → drift UP. Range is ±|speed|/2.
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);

  const renderMode: 'wrap' | 'render' = mode;
  const shouldAnimate = !reduceMotion && speed !== 0;

  if (renderMode === 'render') {
    // Render-prop callers get the motion values regardless of animation
    // status — in reduced-motion they receive undefined so they can branch.
    const renderChildren = shouldAnimate
      ? (children as unknown as (props: { y: MotionValue<number>; scrollYProgress: MotionValue<number> }) => ReactNode)({ y, scrollYProgress })
      : typeof children === 'function'
        ? (children as unknown as (props: { y: MotionValue<number> | undefined; scrollYProgress: MotionValue<number> }) => ReactNode)({ y: undefined, scrollYProgress })
        : children;
    return <div ref={target} className={cn(className)}>{renderChildren}</div>;
  }

  if (!shouldAnimate) {
    return <div ref={target} className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div ref={target} style={{ y }} className={cn(className)}>
      {children}
    </motion.div>
  );
}

export type { ParallaxRenderProps };
export default Parallax;
