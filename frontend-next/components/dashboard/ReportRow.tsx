'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { ReportWithScan } from '@/lib/db/queries/reports';
import type { Report, ReportFormat } from '@/lib/db/schema';
import { deleteReportAction } from '@/app/dashboard/actions';
import { formatDateTime, formatFileSize } from './format';
import { cn } from '@/lib/utils';

export interface ReportRowProps {
  entry: ReportWithScan;
}

/**
 * `schema.ts` exports `ReportFormat` but not the status union, so it is read
 * off the row type instead of being hand-written — a status added to the enum
 * then fails this map at compile time rather than rendering blank. Taken as a
 * type only, so no Drizzle runtime reaches this client bundle.
 */
type ReportStatus = Report['status'];

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: 'Generating',
  ready: 'Ready',
  failed: 'Failed',
};

const FORMAT_LABEL: Record<ReportFormat, string> = {
  pdf: 'PDF',
  csv: 'CSV',
  json: 'JSON',
};

function DownloadIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

/**
 * One generated report.
 *
 * Download is a plain anchor to the download route rather than a fetch: the
 * browser's own download handling is what the user expects, and the route can
 * set `Content-Disposition` without this component knowing the filename.
 *
 * Only a `ready` report is downloadable — a `pending` one has no file behind
 * it yet, and offering the button anyway would produce a confusing 404.
 */
export function ReportRow({ entry }: ReportRowProps) {
  const { report, scan } = entry;
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const title =
    report.title?.trim() || scan.videoTitle?.trim() || 'Untitled video';

  function onDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteReportAction(report.id);
      setMessage(result.message ?? null);
      setConfirming(false);
    });
  }

  return (
    <li className={cn('hairline-card p-4 sm:p-5', pending && 'opacity-60')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="title-sm">
            <Link
              href={`/dashboard/scans/${scan.id}`}
              className="text-ink transition-colors hover:text-primary-active"
            >
              {title}
            </Link>
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="caption-uppercase inline-flex items-center rounded-[var(--radius-pill)] bg-surface-strong px-2.5 py-1 text-ink">
              {FORMAT_LABEL[report.format]}
            </span>
            <span
              className={cn(
                'caption-uppercase inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-1',
                report.status === 'failed'
                  ? 'border-hairline-strong text-[var(--color-semantic-error)]'
                  : 'border-hairline text-muted',
              )}
            >
              {report.status === 'pending' && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
              )}
              {STATUS_LABEL[report.status]}
            </span>
            <span className="caption text-muted tabular-nums">
              {formatFileSize(report.fileSize)}
            </span>
            <span className="caption text-muted-soft">
              <time dateTime={new Date(report.createdAt).toISOString()}>
                {formatDateTime(report.createdAt)}
              </time>
            </span>
          </div>

          {report.status === 'failed' && report.errorMessage && (
            <p className="caption mt-2 text-[var(--color-semantic-error)]">
              {report.errorMessage}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {report.status === 'ready' ? (
            <a
              href={`/api/reports/${report.id}/download`}
              download
              className="btn-type inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-primary px-4 text-on-primary transition-colors duration-150 hover:bg-primary-active"
            >
              <DownloadIcon />
              Download
            </a>
          ) : (
            <span
              className="btn-type inline-flex h-9 cursor-not-allowed items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-hairline px-4 text-muted-soft"
              aria-disabled="true"
            >
              <DownloadIcon />
              Download
            </span>
          )}

          <button
            type="button"
            onClick={onDelete}
            onBlur={() => setConfirming(false)}
            disabled={pending}
            aria-label={confirming ? `Confirm deleting the report for ${title}` : `Delete the report for ${title}`}
            className={cn(
              'btn-type inline-flex h-9 items-center justify-center rounded-[var(--radius-pill)] border px-3 transition-colors duration-150',
              confirming
                ? 'border-[var(--color-semantic-error)] text-[var(--color-semantic-error)]'
                : 'border-hairline-strong text-muted hover:border-ink hover:text-ink',
            )}
          >
            {confirming ? 'Sure?' : 'Delete'}
          </button>
        </div>
      </div>

      <p aria-live="polite" className="caption mt-2 text-muted empty:hidden">
        {message}
      </p>
    </li>
  );
}

export default ReportRow;
