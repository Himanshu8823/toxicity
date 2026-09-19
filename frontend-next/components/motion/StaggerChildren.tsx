'use client';

import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface StaggerChildrenProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'transition' | 'variants'> {
  children: ReactNode;
  /** Delay between each child's entrance in seconds. Defaults to 0.08. */
  stagger?: number;
  /** Initial delay before the first child enters, in seconds. */
  delayChildren?: number;
  /** Direction of stagger reveal — `up` (default) or `none`. */
  direction?: 'up' | 'none';
  /** Per-child travel distance in px. Defaults to 24. */
  distance?: number;
  /** Per-child duration in seconds. Defaults to 0.7. */
  duration?: number;
  /** Trigger animation on mount (true) or in-view (false). */
  immediate?: boolean;
  /** Viewport trigger amount when not immediate. */
  amount?: number;
  /** When true, items rotate in from Z-axis (3D cascade). */
  rotate3d?: boolean;
  /** Rotation in degrees. Defaults to 8. */
  rotateDeg?: number;
  /** Optional className passthrough. */
  className?: string;
}

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/**
 * Stagger wrapper: reveals its direct children one after another as they
 * scroll into view. Each child must be a `motion.div` (or anything that
 * forwards the `hidden`/`show` variants via `variants={container.item}`).
 *
 * Two-step pattern: this component sets the parent variants and the
 * stagger config; children pick them up via the `variants` prop on
 * `<motion.div>`. See `StaggerItem` below for the convenience helper.
 */
export function StaggerChildren({
  children,
  stagger = 0.08,
  delayChildren = 0,
  direction = 'up',
  distance = 24,
  duration = 0.7,
  immediate = false,
  amount = 0.2,
  rotate3d = false,
  rotateDeg = 8,
  className,
  ...rest
}: StaggerChildrenProps) {
  const reduceMotion = useReducedMotion() ?? false;

  if (reduceMotion) {
    return <div className={cn(className)} {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
  }

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: stagger,
        delayChildren,
      },
    },
  };

  // Item variants are merged into a context provider so descendant
  // <StaggerItem /> components can pick them up without prop drilling.
  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      {...(immediate ? { animate: 'show' } : { whileInView: 'show' })}
      viewport={{ once: true, amount }}
      variants={container}
      style={{ transformStyle: 'preserve-3d' }}
      {...rest}
    >
      <StaggerContext.Provider
        value={{ direction, distance, duration, ease: EASE_OUT_EXPO, rotate3d, rotateDeg }}
      >
        {children}
      </StaggerContext.Provider>
    </motion.div>
  );
}

interface StaggerContextValue {
  direction: 'up' | 'none';
  distance: number;
  duration: number;
  ease: typeof EASE_OUT_EXPO;
  rotate3d: boolean;
  rotateDeg: number;
}

const StaggerContext = createStaggerContext();

import { createContext, useContext } from 'react';

function createStaggerContext() {
  return createContext<StaggerContextValue | null>(null);
}

export interface StaggerItemProps extends HTMLMotionProps<'div'> {
  /** Override the inherited distance. */
  distance?: number;
  /** Override the inherited rotation. */
  rotateDeg?: number;
}

export function StaggerItem({ distance, rotateDeg, ...rest }: StaggerItemProps) {
  const ctx = useContext(StaggerContext);
  const d = distance ?? ctx?.distance ?? 24;
  const direction = ctx?.direction ?? 'up';
  const duration = ctx?.duration ?? 0.7;
  const ease = ctx?.ease ?? EASE_OUT_EXPO;
  const rotate3d = ctx?.rotate3d ?? false;
  const rot = rotateDeg ?? ctx?.rotateDeg ?? 8;

  const offsetY = direction === 'up' ? d : 0;

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: offsetY,
      filter: 'blur(6px)',
      ...(rotate3d ? { rotateX: rot, rotateY: -rot * 0.5 } : {}),
    },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      rotateX: 0,
      rotateY: 0,
      transition: { duration, ease },
    },
  };

  return (
    <motion.div
      variants={variants}
      style={{ transformStyle: 'preserve-3d' }}
      {...rest}
    />
  );
}

export default StaggerChildren;
