import { SEVERITIES, SEVERITY_META } from '@/lib/analysis/taxonomy';
import type { Severity } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

export interface SeverityBadgeProps {
  severity: Severity;
  /**
   * Draws the five-step scale as filled dots alongside the word, so severity
   * is readable at a glance without relying on colour alone.
   */
  showScale?: boolean;
  className?: string;
}

/**
 * The severity label as a pill, optionally with its position on the scale.
 *
 * The dots matter for accessibility: `SEVERITY_META` inks are close in
 * luminance by design, so colour alone cannot be the only way to tell
 * "mild" from "critical".
 */
export function SeverityBadge({
  severity,
  showScale = false,
  className,
}: SeverityBadgeProps) {
  const meta = SEVERITY_META[severity];

  return (
    <span
      className={cn(
        'caption-uppercase inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-surface-strong px-2.5 py-1',
        className,
      )}
      style={{ color: meta.ink }}
      title={meta.description}
    >
      {meta.display}
      {showScale && (
        <span className="inline-flex gap-[3px]" aria-hidden="true">
          {SEVERITIES.map((step) => (
            <span
              key={step}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor:
                  SEVERITY_META[step].rank <= meta.rank
                    ? meta.ink
                    : 'var(--color-hairline-strong)',
              }}
            />
          ))}
        </span>
      )}
      {showScale && (
        <span className="sr-only">
          — severity {meta.rank} of {SEVERITIES.length - 1}
        </span>
      )}
    </span>
  );
}

export default SeverityBadge;
