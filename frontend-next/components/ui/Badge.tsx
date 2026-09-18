import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LABEL_META } from '@/lib/labels';
import type { ToxicityLabel } from '@/lib/types';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  /**
   * When set, the badge text is tinted with that label's ink shade
   * (`LABEL_META[label].ink`) instead of the default ink. The pill
   * background stays `surface-strong` regardless — colour signals
   * severity through text only, never through a saturated fill.
   */
  labelTone?: ToxicityLabel;
}

/** `badge-pill`: `surface-strong` background, `caption-uppercase` type, pill radius. */
export function Badge({ children, labelTone, className, style, ...props }: BadgeProps) {
  const tone = labelTone ? LABEL_META[labelTone].ink : undefined;

  return (
    <span
      className={cn(
        'caption-uppercase inline-flex items-center rounded-[var(--radius-pill)] bg-surface-strong px-2.5 py-1 text-ink',
        className,
      )}
      style={tone ? { color: tone, ...style } : style}
      {...props}
    >
      {children}
    </span>
  );
}
