import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type CardOrbTone = 'mint' | 'peach' | 'lavender' | 'sky' | 'rose';

const ORB_TONE_COLORS: Record<CardOrbTone, string> = {
  mint: 'var(--color-gradient-mint)',
  peach: 'var(--color-gradient-peach)',
  lavender: 'var(--color-gradient-lavender)',
  sky: 'var(--color-gradient-sky)',
  rose: 'var(--color-gradient-rose)',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Adds the single soft-drop shadow tier on hover, per DESIGN.md elevation. */
  hover?: boolean;
  /**
   * When set, bleeds one pastel gradient orb behind the card content as
   * pure atmosphere — never a card surface colour, never text.
   */
  orb?: CardOrbTone;
}

/**
 * The base white surface: 1px hairline, `radius-xl`, single soft-drop
 * shadow tier. `overflow-hidden` is required whenever `orb` is set so the
 * blurred bloom never escapes the card's rounded corners.
 */
export function Card({ children, hover = false, orb, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'hairline-card relative p-6',
        orb && 'overflow-hidden',
        hover && 'transition-shadow duration-200 hover:shadow-[var(--shadow-soft-drop)]',
        className,
      )}
      {...props}
    >
      {orb && (
        <div
          className="orb orb-drifting -right-10 -top-12 h-40 w-40"
          style={{ background: ORB_TONE_COLORS[orb] }}
          aria-hidden="true"
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
