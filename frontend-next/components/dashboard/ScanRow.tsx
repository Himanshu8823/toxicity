'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ScanStatus } from '@/lib/db/schema';
import type { ScanListItem } from '@/lib/db/queries/scans';
import { deleteScanAction, toggleSaveAction } from '@/app/dashboard/actions';
import { LanguageBadge } from './LanguageBadge';
import { formatCount, formatPercent, formatRelative } from './format';
import { cn } from '@/lib/utils';

export interface ScanRowProps {
  scan: ScanListItem;
  /** Hides save and delete — the overview's recent list is read-only. */
  readOnly?: boolean;
}

/** Status is a state, not a severity, so it stays in muted ink throughout. */
const STATUS_LABEL: Record<ScanStatus, string> = {
  pending: 'Queued',
  running: 'Running',
  complete: 'Complete',
  failed: 'Failed',
};

function StatusPill({ status }: { status: ScanStatus }) {
  return (
    <span
      className={cn(
        'caption-uppercase inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-1',
        status === 'failed'
          ? 'border-hairline-strong text-[var(--color-semantic-error)]'
          : 'border-hairline text-muted',
      )}
    >
      {(status === 'running' || status === 'pending') && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12v18l-6-4.5L6 21V3Z" />
    </svg>
  );
}

/**
 * One scan in a list.
 *
 * A card at every width rather than a table row: the fields are a thumbnail, a
 * two-line title and four badges, which a `<td>` grid cannot hold on a phone
 * without either horizontal scroll or truncation down to uselessness. The
 * outer element is an `<li>` so a list of these is a list to a screen reader.
 *
 * Save and delete are optimistic in the sense that the pending state is shown
 * immediately, but the real state comes back from `revalidatePath` — the row
 * never claims a change the server did not make.
 */
export function ScanRow({ scan, readOnly = false }: ScanRowProps) {
  const [saved, setSaved] = useState(scan.isSaved);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const title = scan.videoTitle?.trim() || 'Untitled video';
  const hasThumbnail = Boolean(scan.thumbnailUrl?.trim());

  function onToggleSave() {
    startTransition(async () => {
      const result = await toggleSaveAction(scan.id, saved);
      if (result.ok) setSaved((s) => !s);
      setMessage(result.message ?? null);
    });
  }

  function onDelete() {
    // Two-step rather than `window.confirm`: a native dialog is not styleable,
    // blocks the main thread, and reads badly on mobile.
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteScanAction(scan.id);
      setMessage(result.message ?? null);
      setConfirmingDelete(false);
    });
  }

  return (
    <li
      className={cn(
        'hairline-card lift-on-hover p-4 sm:p-5',
        pending && 'opacity-60',
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Link
          href={`/dashboard/scans/${scan.id}`}
          className="relative block aspect-video w-full shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-strong sm:h-[68px] sm:w-[120px]"
          tabIndex={-1}
          aria-hidden="true"
        >
          {hasThumbnail ? (
            <Image
              src={scan.thumbnailUrl as string}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 120px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-soft)" strokeWidth="1.5">
                <path d="m10 9 5 3-5 3V9Z" />
                <rect x="2" y="4" width="20" height="16" rx="3" />
              </svg>
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <h3 className="title-sm">
            <Link
              href={`/dashboard/scans/${scan.id}`}
              className="text-ink transition-colors hover:text-primary-active"
            >
              {title}
            </Link>
          </h3>
          {scan.channelName && (
            <p className="caption mt-0.5 truncate text-muted">{scan.channelName}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusPill status={scan.status} />
            <LanguageBadge code={scan.dominantLanguage} />
            <span className="caption text-muted tabular-nums">
              {formatCount(scan.analysedCount)} comments
            </span>
            {scan.status === 'complete' && (
              <span className="caption text-muted tabular-nums">
                {formatPercent(scan.overallToxicityScore)} toxic
              </span>
            )}
            <span className="caption text-muted-soft">
              <time dateTime={new Date(scan.createdAt).toISOString()}>
                {formatRelative(scan.createdAt)}
              </time>
            </span>
          </div>

          {scan.status === 'failed' && scan.errorMessage && (
            <p className="caption mt-2 text-[var(--color-semantic-error)]">
              {scan.errorMessage}
            </p>
          )}
        </div>

        {!readOnly && (
          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
            <Link
              href={`/dashboard/scans/${scan.id}`}
              className="btn-type inline-flex h-9 items-center justify-center rounded-[var(--radius-pill)] border border-hairline-strong px-4 text-ink transition-colors duration-150 hover:border-ink"
            >
              View
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleSave}
                disabled={pending}
                aria-pressed={saved}
                aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] border transition-colors duration-150',
                  saved
                    ? 'border-ink text-ink'
                    : 'border-hairline-strong text-muted hover:border-ink hover:text-ink',
                )}
              >
                <BookmarkIcon filled={saved} />
              </button>

              <button
                type="button"
                onClick={onDelete}
                onBlur={() => setConfirmingDelete(false)}
                disabled={pending}
                aria-label={
                  confirmingDelete
                    ? `Confirm deleting ${title}`
                    : `Delete ${title}`
                }
                className={cn(
                  'btn-type inline-flex h-9 items-center justify-center rounded-[var(--radius-pill)] border px-3 transition-colors duration-150',
                  confirmingDelete
                    ? 'border-[var(--color-semantic-error)] text-[var(--color-semantic-error)]'
                    : 'border-hairline-strong text-muted hover:border-ink hover:text-ink',
                )}
              >
                {confirmingDelete ? 'Sure?' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action outcomes are announced rather than only shown. */}
      <p aria-live="polite" className="caption mt-2 text-muted empty:hidden">
        {message}
      </p>
    </li>
  );
}

export default ScanRow;
