'use client';

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * A button that asks before it acts, then PATCHes.
 *
 * Uses a native `<dialog>` with `showModal()`, which gives focus trapping,
 * Escape-to-close and the inert backdrop for free — all of which a hand-rolled
 * div would have to reimplement, usually badly. The confirm button takes focus
 * on open so the whole interaction is keyboard-operable without a Tab.
 *
 * The request body never carries an actor id. The route derives the acting
 * admin from the session; anything this component sent would be a suggestion,
 * and treating it as anything more would be the bug.
 */

export interface ConfirmActionProps {
  /** Endpoint to PATCH. Must be an admin route that re-checks the session. */
  endpoint: string;
  /** JSON body of the request — the change being made, never who is making it. */
  body: Record<string, unknown>;
  label: string;
  /** Title of the confirmation dialog. Omit to act without confirming. */
  confirmTitle?: string;
  confirmBody?: ReactNode;
  confirmLabel?: string;
  /** Destructive actions get the ink-filled confirm button and a firmer prompt. */
  destructive?: boolean;
  className?: string;
}

export function ConfirmAction({
  endpoint,
  body,
  label,
  confirmTitle,
  confirmBody,
  confirmLabel,
  destructive = false,
  className,
}: ConfirmActionProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const needsConfirm = Boolean(confirmTitle);

  useEffect(() => {
    if (!error) return;
    // Clear a stale error once the operator has had time to read it, so a
    // retry does not start out looking like it already failed.
    const timer = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(timer);
  }, [error]);

  async function run() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const message =
          payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          typeof (payload as { error: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : `Request failed (${response.status}).`;
        setError(message);
        return;
      }

      dialogRef.current?.close();
      // The page is a Server Component reading live tables, so a refresh is
      // what puts the new state on screen — there is no client cache to patch.
      startTransition(() => router.refresh());
    } catch {
      setError('Could not reach the server. Check your connection and retry.');
    } finally {
      setBusy(false);
    }
  }

  function open() {
    if (!needsConfirm) {
      void run();
      return;
    }
    setError(null);
    dialogRef.current?.showModal();
    // Focus the confirm button rather than the dialog, so Enter completes the
    // action and Escape cancels it with no navigation in between.
    window.requestAnimationFrame(() => confirmRef.current?.focus());
  }

  const working = busy || pending;

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={working}
        className={cn(
          'inline-flex h-6 items-center rounded-[var(--radius-xs)] border px-2 text-[11.5px] font-medium whitespace-nowrap transition-colors disabled:opacity-50',
          destructive
            ? 'border-hairline-strong text-ink hover:border-ink hover:bg-surface-strong'
            : 'border-hairline text-muted hover:border-hairline-strong hover:text-ink',
          className
        )}
      >
        {working ? 'Working…' : label}
      </button>

      {error && !needsConfirm ? (
        <span role="alert" className="ml-2 text-[11.5px] text-semantic-error">
          {error}
        </span>
      ) : null}

      {needsConfirm ? (
        <dialog
          ref={dialogRef}
          aria-labelledby={`${endpoint}-confirm-title`}
          className="m-auto w-[min(420px,calc(100vw-32px))] rounded-[var(--radius-sm)] border border-hairline bg-surface-card p-0 text-body backdrop:bg-ink/25"
          onClose={() => setError(null)}
        >
          <div className="px-5 pt-5 pb-4">
            <h2
              id={`${endpoint}-confirm-title`}
              className="title-sm text-ink"
            >
              {confirmTitle}
            </h2>
            {confirmBody ? (
              <div className="mt-2 text-[13px] leading-relaxed text-muted">
                {confirmBody}
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="mt-3 text-[12.5px] text-semantic-error">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-hairline-soft px-5 py-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex h-8 items-center rounded-[var(--radius-xs)] border border-hairline px-3 text-[12.5px] font-medium text-muted hover:border-hairline-strong hover:text-ink"
            >
              Cancel
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={() => void run()}
              disabled={working}
              className="inline-flex h-8 items-center rounded-[var(--radius-xs)] bg-primary px-3 text-[12.5px] font-medium text-on-primary hover:bg-primary-active disabled:opacity-60"
            >
              {working ? 'Working…' : (confirmLabel ?? 'Confirm')}
            </button>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
