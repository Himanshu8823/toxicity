'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ReportFormat } from '@/lib/db/schema';
import { saveScanAction, unsaveScanAction } from '@/app/dashboard/actions';
import { cn } from '@/lib/utils';

export interface ScanActionsProps {
  scanId: string;
  initiallySaved: boolean;
}

const FORMATS: { value: ReportFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
];

/**
 * Save and report generation for one scan.
 *
 * Saving goes through a Server Action because it writes a row this app owns;
 * report generation goes through `POST /api/reports` because it also has to
 * render a file and upload it to storage, which is a Route Handler's job.
 *
 * The report endpoint is built in parallel, so a non-ok response is reported
 * inline and the page stays usable — this control never assumes it succeeded.
 */
export function ScanActions({ scanId, initiallySaved }: ScanActionsProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onToggleSave() {
    startTransition(async () => {
      const result = saved
        ? await unsaveScanAction(scanId)
        : await saveScanAction(scanId);
      if (result.ok) setSaved((s) => !s);
      setMessage(result.message ?? null);
    });
  }

  async function onGenerate() {
    setGenerating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId, format }),
      });

      if (!response.ok) {
        // The endpoint may or may not send a JSON body on failure.
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setMessage(
          body?.error ?? 'That report could not be generated. Please try again.',
        );
        return;
      }

      setMessage('Report queued — it will appear under Reports.');
      // Reports live on another route; refreshing keeps its count honest.
      router.refresh();
    } catch {
      setMessage('That report could not be generated. Check your connection.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onToggleSave}
          disabled={pending}
          aria-pressed={saved}
          className={cn(
            'btn-type inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-pill)] border px-5 transition-colors duration-150 disabled:opacity-50',
            saved
              ? 'border-ink bg-surface-strong text-ink'
              : 'border-hairline-strong text-ink hover:border-ink',
          )}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={saved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 3h12v18l-6-4.5L6 21V3Z" />
          </svg>
          {saved ? 'Saved' : 'Save this scan'}
        </button>

        <div className="flex items-center gap-2">
          <label htmlFor="report-format" className="sr-only">
            Report format
          </label>
          <select
            id="report-format"
            value={format}
            onChange={(e) => setFormat(e.target.value as ReportFormat)}
            className="body-sm h-10 rounded-[var(--radius-md)] border border-hairline-strong bg-surface-card px-3 text-ink focus:border-2 focus:border-ink focus:outline-none"
          >
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="btn-type inline-flex h-10 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-5 text-on-primary transition-colors duration-150 hover:bg-primary-active disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Generate report'}
          </button>
        </div>
      </div>

      <p aria-live="polite" className="caption text-muted empty:hidden">
        {message}
      </p>
    </div>
  );
}

export default ScanActions;
