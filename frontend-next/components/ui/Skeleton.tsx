import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Renders a circle instead of the default rounded rectangle. */
  circle?: boolean;
}

/**
 * Hairline shimmer placeholder. The shimmer is a plain CSS animation, so
 * the global `prefers-reduced-motion` rule in `globals.css` (which forces
 * every animation to `0.01ms`) already neutralises it to a static tint —
 * no extra JS check needed here.
 */
export function Skeleton({ circle = false, className, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'relative overflow-hidden bg-surface-strong',
        circle ? 'rounded-full' : 'rounded-[var(--radius-md)]',
        className,
      )}
      {...props}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent"
        aria-hidden="true"
      />
      <style>{`
        @keyframes skeleton-shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
