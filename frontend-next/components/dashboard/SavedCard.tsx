'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { SavedAnalysisWithScan } from '@/lib/db/queries/saved';
import { deleteSavedAction, updateSavedAction } from '@/app/dashboard/actions';
import { LanguageBadge } from './LanguageBadge';
import { formatCount, formatDate, formatPercent } from './format';
import { cn } from '@/lib/utils';

export interface SavedCardProps {
  entry: SavedAnalysisWithScan;
}

/**
 * One bookmarked scan, with its note and tags editable in place.
 *
 * Editing happens on the card rather than on a separate page: a note is one
 * or two lines and a round trip to an edit screen costs more attention than
 * the edit itself. The form collapses back to the reading view on save, so
 * the default state of a list of these stays scannable.
 */
export function SavedCard({ entry }: SavedCardProps) {
  const { saved, scan } = entry;

  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(saved.note ?? '');
  const [tags, setTags] = useState(saved.tags.join(', '));
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [pending, startTransition] = useTransition();

  // What the card shows when not editing — updated locally on a successful
  // save so the row reads correctly before revalidation lands.
  const [shownNote, setShownNote] = useState(saved.note ?? '');
  const [shownTags, setShownTags] = useState<string[]>(saved.tags);

  const title = saved.title?.trim() || scan.videoTitle?.trim() || 'Untitled video';
  const hasThumbnail = Boolean(scan.thumbnailUrl?.trim());

  function onSave() {
    startTransition(async () => {
      const result = await updateSavedAction(saved.id, { note, tags });
      setMessage(result.message ?? null);
      if (result.ok) {
        setShownNote(note.trim());
        setShownTags(
          [
            ...new Set(
              tags
                .split(',')
                .map((t) => t.trim().replace(/^#/, '').toLowerCase())
                .filter(Boolean),
            ),
          ].slice(0, 12),
        );
        setEditing(false);
      }
    });
  }

  function onRemove() {
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteSavedAction(saved.id);
      setMessage(result.message ?? null);
      setConfirmingRemove(false);
    });
  }

  return (
    <li className={cn('hairline-card p-4 sm:p-5', pending && 'opacity-60')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-strong sm:h-[68px] sm:w-[120px]">
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-soft)" strokeWidth="1.5" aria-hidden="true">
                <path d="m10 9 5 3-5 3V9Z" />
                <rect x="2" y="4" width="20" height="16" rx="3" />
              </svg>
            </span>
          )}
        </div>

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

          <div className="mt-2 flex flex-wrap items-center gap-2">
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
              saved <time dateTime={new Date(saved.createdAt).toISOString()}>{formatDate(saved.createdAt)}</time>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            aria-expanded={editing}
            className="btn-type inline-flex h-9 items-center justify-center rounded-[var(--radius-pill)] border border-hairline-strong px-4 text-ink transition-colors duration-150 hover:border-ink"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={onRemove}
            onBlur={() => setConfirmingRemove(false)}
            disabled={pending}
            aria-label={confirmingRemove ? `Confirm removing ${title}` : `Remove ${title} from saved`}
            className={cn(
              'btn-type inline-flex h-9 items-center justify-center rounded-[var(--radius-pill)] border px-3 transition-colors duration-150',
              confirmingRemove
                ? 'border-[var(--color-semantic-error)] text-[var(--color-semantic-error)]'
                : 'border-hairline-strong text-muted hover:border-ink hover:text-ink',
            )}
          >
            {confirmingRemove ? 'Sure?' : 'Unsave'}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 border-t border-hairline pt-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`note-${saved.id}`} className="body-strong text-ink">
                Note
              </label>
              <textarea
                id={`note-${saved.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Why this one is worth keeping."
                className="body-md rounded-[var(--radius-md)] border border-hairline-strong bg-surface-card px-4 py-3 text-ink placeholder:text-muted-soft focus:border-2 focus:border-ink focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`tags-${saved.id}`} className="body-strong text-ink">
                Tags
              </label>
              <input
                id={`tags-${saved.id}`}
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="research, hindi, follow-up"
                aria-describedby={`tags-hint-${saved.id}`}
                className="body-md h-11 rounded-[var(--radius-md)] border border-hairline-strong bg-surface-card px-4 text-ink placeholder:text-muted-soft focus:border-2 focus:border-ink focus:px-[15px] focus:outline-none"
              />
              <p id={`tags-hint-${saved.id}`} className="caption text-muted">
                Comma-separated. Lower-cased and de-duplicated on save; up to twelve.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onSave}
                disabled={pending}
                className="btn-type inline-flex h-10 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-5 text-on-primary transition-colors duration-150 hover:bg-primary-active disabled:opacity-50"
              >
                {pending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        (shownNote || shownTags.length > 0) && (
          <div className="mt-4 border-t border-hairline pt-3">
            {shownNote && <p className="body-sm text-body">{shownNote}</p>}
            {shownTags.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {shownTags.map((tag) => (
                  <li
                    key={tag}
                    className="caption inline-flex items-center rounded-[var(--radius-pill)] bg-surface-strong px-2.5 py-0.5 text-muted"
                  >
                    #{tag}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      )}

      <p aria-live="polite" className="caption mt-2 text-muted empty:hidden">
        {message}
      </p>
    </li>
  );
}

export default SavedCard;
