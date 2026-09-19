'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';
export type RevealAxis = '2d' | '3d';

export interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'transition'> {
  children: ReactNode;
  /** Vertical / horizontal travel distance in px. Defaults to 24. */
  distance?: number;
  /** Direction the element comes from. Defaults to `up`. */
  direction?: RevealDirection;
  /** Animation duration in seconds. Defaults to 0.8. */
  duration?: number;
  /** Delay before the animation starts, in seconds. */
  delay?: number;
  /** When true, animation runs on mount instead of in-view. */
  immediate?: boolean;
  /** Amount of element visible before triggering (0-1). Defaults to 0.2. */
  amount?: number;
  /** Adds a starting blur (px) that resolves to 0 — the editorial signature. */
  blur?: boolean;
  /** When `3d`, also rotates on X or Y axis on entry. Use with `rotateDeg`. */
  axis?: RevealAxis;
  /** Degrees of rotation on entry (3D axis only). Defaults to 12. */
  rotateDeg?: number;
  /** Optional className passthrough. */
  className?: string;
}

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

function getOffset(direction: RevealDirection, distance: number) {
  switch (direction) {
    case 'up':
      return { x: 0, y: distance };
    case 'down':
      return { x: 0, y: -distance };
    case 'left':
      return { x: distance, y: 0 };
    case 'right':
      return { x: -distance, y: 0 };
    case 'none':
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * The standard "element comes into view" wrapper. Uses framer-motion's
 * whileInView under the hood. Editorial easing — heavy, confident, slow.
 * Respects `prefers-reduced-motion: reduce` by snapping to the final state.
 */
export function Reveal({
  children,
  distance = 24,
  direction = 'up',
  duration = 0.8,
  delay = 0,
  immediate = false,
  amount = 0.2,
  blur = false,
  axis = '2d',
  rotateDeg = 12,
  className,
  ...rest
}: RevealProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const offset = getOffset(direction, distance);

  if (reduceMotion) {
    return (
      <div className={className} {...(rest as React.HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  // Pick the rotation axis based on the entry direction so the rotation
  // feels like it's pushing the element *in* along its travel axis.
  let rotateX = 0;
  let rotateY = 0;
  if (axis === '3d') {
    if (direction === 'up' || direction === 'down') {
      rotateX = direction === 'up' ? rotateDeg : -rotateDeg;
    } else if (direction === 'left' || direction === 'right') {
      rotateY = direction === 'left' ? -rotateDeg : rotateDeg;
    } else {
      rotateY = rotateDeg;
    }
  }

  const initial = {
    opacity: 0,
    x: offset.x,
    y: offset.y,
    filter: blur ? 'blur(8px)' : 'blur(0px)',
    ...(axis === '3d' ? { rotateX, rotateY } : {}),
  };
  const whileInView = {
    opacity: 1,
    x: 0,
    y: 0,
    filter: 'blur(0px)',
    ...(axis === '3d' ? { rotateX: 0, rotateY: 0 } : {}),
  };

  return (
    <motion.div
      className={cn(className)}
      style={{ transformStyle: 'preserve-3d', ...((rest as { style?: object }).style ?? {}) }}
      initial={initial}
      {...(immediate ? { animate: whileInView } : { whileInView })}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE_OUT_EXPO }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
