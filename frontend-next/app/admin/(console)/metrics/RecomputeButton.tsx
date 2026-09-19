'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Freezes the current evaluation into `model_metrics`.
 *
 * A POST rather than a link, because it writes. The date range travels in the
 * body so the snapshot records the same window the page is showing — a snapshot
 * of "everything" taken while looking at one month would be quietly wrong in
 * the one place where being quietly wrong matters most.
 *
 * `/api/admin/metrics/recompute` is owned by another part of the build. If it
 * is not there yet this reports the failure in place rather than throwing; the
 * rest of the page is read-only and stays usable.
 */
export function RecomputeButton({ from, to }: { from?: string; to?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function run() {
    setBusy(true);
    setMessage(null);
    setFailed(false);

    try {
      const response = await fetch('/api/admin/metrics/recompute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ from, to }),
      });

      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const detail =
          payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          typeof (payload as { error: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : `Recompute failed (${response.status}).`;
        setFailed(true);
        setMessage(detail);
        return;
      }

      const payload: unknown = await response.json().catch(() => null);

      // The route explains a zero-row snapshot better than a count can —
      // "0 slices" reads as a failure when it actually means the range holds
      // no reviewed feedback yet. Prefer its wording where it gives one.
      const stated =
        payload &&
        typeof payload === 'object' &&
        'message' in payload &&
        typeof (payload as { message: unknown }).message === 'string'
          ? (payload as { message: string }).message
          : null;

      const written =
        payload &&
        typeof payload === 'object' &&
        'written' in payload &&
        typeof (payload as { written: unknown }).written === 'number'
          ? (payload as { written: number }).written
          : null;

      setMessage(
        stated ??
          (written === null
            ? 'Snapshot written.'
            : `Snapshot written: ${written} slices.`)
      );
      startTransition(() => router.refresh());
    } catch {
      setFailed(true);
      setMessage('Could not reach the server. Check your connection and retry.');
    } finally {
      setBusy(false);
    }
  }

  const working = busy || pending;

  return (
    <div className="flex items-center gap-2">
      {message ? (
        <span
          role="status"
          className={
            failed
              ? 'text-[11.5px] text-semantic-error'
              : 'text-[11.5px] text-muted'
          }
        >
          {message}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => void run()}
        disabled={working}
        className="inline-flex h-8 items-center rounded-[var(--radius-xs)] bg-primary px-3 text-[12.5px] font-medium text-on-primary hover:bg-primary-active disabled:opacity-60"
      >
        {working ? 'Computing…' : 'Recompute snapshot'}
      </button>
    </div>
  );
}
