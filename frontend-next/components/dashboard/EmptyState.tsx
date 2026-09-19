import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** Serif headline. Written as an invitation, not as an apology. */
  title: string;
  /** One or two sentences saying what would fill this space and why. */
  description: ReactNode;
  action?: { href: string; label: string };
  /** Secondary, lower-commitment route out of the empty screen. */
  secondaryAction?: { href: string; label: string };
  /** Optional illustration or extra content rendered under the actions. */
  children?: ReactNode;
  className?: string;
}

/**
 * What a list shows when it has nothing in it.
 *
 * An empty dashboard is the first thing most people see, so it gets the same
 * atmospheric treatment as the landing page rather than a grey "no data" box:
 * the pastel orbs, the serif headline, and a real next step. A blank screen
 * reads as a broken app; this reads as a page waiting for its first scan.
 */
export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'hairline-card relative overflow-hidden px-6 py-14 text-center sm:px-10 sm:py-20',
        className,
      )}
    >
      <div
        className="orb orb-drifting -left-16 -top-20 h-56 w-56"
        style={{ background: 'var(--color-gradient-mint)' }}
        aria-hidden="true"
      />
      <div
        className="orb orb-drifting -bottom-24 -right-12 h-64 w-64"
        style={{ background: 'var(--color-gradient-lavender)' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-[52ch] flex-col items-center">
        <h2 className="display-md text-ink">{title}</h2>
        <p className="body-md mt-4 text-body">{description}</p>

        {(action || secondaryAction) && (
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            {action && (
              <Link
                href={action.href}
                className="btn-type inline-flex h-10 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-5 text-on-primary transition-colors duration-150 hover:bg-primary-active"
              >
                {action.label}
              </Link>
            )}
            {secondaryAction && (
              <Link
                href={secondaryAction.href}
                className="btn-type inline-flex h-10 items-center justify-center rounded-[var(--radius-pill)] border border-hairline-strong px-5 text-ink transition-colors duration-150 hover:border-ink"
              >
                {secondaryAction.label}
              </Link>
            )}
          </div>
        )}

        {children && <div className="mt-8 w-full">{children}</div>}
      </div>
    </div>
  );
}

export default EmptyState;
