import { languageName } from '@/lib/analysis/language';
import { cn } from '@/lib/utils';

export interface LanguageBadgeProps {
  /** ISO 639-1 code as stored on the row. `null` where detection never ran. */
  code: string | null | undefined;
  /** Renders the code only (e.g. `HI`) — for dense rows where space is tight. */
  compact?: boolean;
  className?: string;
}

/**
 * The detected language of a comment or scan.
 *
 * Deliberately neutral ink rather than a taxonomy colour: language is not a
 * severity signal, and tinting it would imply some languages are worse than
 * others. The full name is always available to screen readers even in
 * `compact` mode, since a bare "UR" is not a word.
 */
export function LanguageBadge({ code, compact = false, className }: LanguageBadgeProps) {
  const known = Boolean(code);
  const name = known ? languageName(code as string) : 'Unknown';
  const short = known ? (code as string).toUpperCase() : '—';

  return (
    <span
      className={cn(
        'caption-uppercase inline-flex items-center rounded-[var(--radius-pill)] border border-hairline bg-transparent px-2.5 py-1 text-muted',
        className,
      )}
      title={compact ? name : undefined}
    >
      <span aria-hidden={compact ? undefined : 'true'}>{compact ? short : name}</span>
      {compact && <span className="sr-only">{name}</span>}
    </span>
  );
}

export default LanguageBadge;
