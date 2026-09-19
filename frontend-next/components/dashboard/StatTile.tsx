import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatTileTone = 'mint' | 'peach' | 'lavender' | 'sky' | 'rose' | 'none';

const TONE_COLORS: Record<Exclude<StatTileTone, 'none'>, string> = {
  mint: 'var(--color-gradient-mint)',
  peach: 'var(--color-gradient-peach)',
  lavender: 'var(--color-gradient-lavender)',
  sky: 'var(--color-gradient-sky)',
  rose: 'var(--color-gradient-rose)',
};

export interface StatTileProps {
  /** Small uppercase label — what the number counts. */
  label: string;
  /** Pre-formatted for display; the tile does no number formatting itself. */
  value: string;
  /** One short line of context under the number. Optional. */
  hint?: ReactNode;
  /** Pastel orb bled behind the tile as atmosphere. Never a surface fill. */
  tone?: StatTileTone;
  className?: string;
}

/**
 * One number on the overview grid.
 *
 * The value is rendered at `display-md` in the serif face: these are the
 * figures the page exists to show, and the editorial scale is what separates
 * them from the labels around them. Formatting is the caller's job so a count,
 * a percentage and a duration can all share this tile without it growing a
 * `format` prop that guesses wrong.
 */
export function StatTile({ label, value, hint, tone = 'none', className }: StatTileProps) {
  return (
    <div
      className={cn(
        'hairline-card lift-on-hover relative overflow-hidden p-5 sm:p-6',
        className,
      )}
    >
      {tone !== 'none' && (
        <div
          className="orb -right-8 -top-10 h-28 w-28"
          style={{ background: TONE_COLORS[tone] }}
          aria-hidden="true"
        />
      )}
      <div className="relative">
        <p className="caption-uppercase text-muted">{label}</p>
        <p className="display-md mt-2 text-ink tabular-nums">{value}</p>
        {hint && <p className="caption mt-1.5 text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export default StatTile;
