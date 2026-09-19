'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary for the whole dashboard tree.
 *
 * Every page here opens with a database query, so the realistic failure is a
 * connection that dropped or a query that timed out — transient, and worth
 * offering a retry for rather than sending someone back to the landing page.
 *
 * The underlying message is deliberately not shown: it would be a Postgres
 * error or a stack frame, which tells the person nothing they can act on and
 * leaks the shape of the schema. It goes to the console instead, where it is
 * useful.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard]', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <p className="caption-uppercase text-muted">Something went wrong</p>

      <h1 className="display-sm mt-3 max-w-[24ch]">
        This page could not be loaded.
      </h1>

      <p className="body-md mt-4 max-w-[46ch] text-body">
        The error has been logged. It is usually a dropped connection to the
        database — trying again often clears it.
      </p>

      {error.digest ? (
        <p className="caption mt-6 text-muted-soft">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-[var(--radius-pill)] bg-ink px-5 py-2.5 text-[15px] text-canvas transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Try again
        </button>

        <Link
          href="/dashboard"
          className="rounded-[var(--radius-pill)] border border-hairline px-5 py-2.5 text-[15px] text-ink transition-colors hover:border-hairline-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
