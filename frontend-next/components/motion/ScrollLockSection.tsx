'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ScrollLockSectionProps {
  /** Children rendered in normal flow. */
  children: ReactNode;
  /** No longer used — kept for API stability. */
  distanceVh?: number;
  /** No longer used — kept for API stability. */
  fadeOut?: boolean;
  /** Outer wrapper className. */
  className?: string;
  /** Inner container className. */
  innerClassName?: string;
}

/**
 * A normal-flow section. The previous implementation pinned the inner
 * content to the viewport and used scroll progress to drive a scrub
 * timeline, which constrained the section's height and clipped tall
 * cards. Cards now flow normally; the section's height is whatever the
 * content needs it to be.
 */
export function ScrollLockSection({
  children,
  className,
  innerClassName,
}: ScrollLockSectionProps) {
  return (
    <div className={cn('relative', className)}>
      <div className={cn(innerClassName)}>{children}</div>
    </div>
  );
}

export default ScrollLockSection;
