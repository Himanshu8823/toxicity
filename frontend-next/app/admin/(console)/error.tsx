'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary for the admin console.
 *
 * The metrics page runs the heaviest queries in the application — a full
 * labelled sample, per-slice confusion matrices, ROC curves — so a timeout
 * here is more likely than anywhere else, and a retry is genuinely worth
 * offering before anyone goes looking for a real fault.
 *
 * Unlike the user-facing boundary this one shows the message: the only people
 * who reach it are administrators, for whom "relation does not exist" is the
 * fastest possible route to the cause. It is still not a stack trace.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin]', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-start justify-center px-6">
      <p className="caption-uppercase text-muted">Console error</p>

      <h1 className="display-sm mt-3 max-w-[30ch]">
        This view could not be loaded.
      </h1>

      <p className="body-md mt-4 max-w-[54ch] text-body">
        The metrics and audit views run large aggregate queries; a timeout here
        usually clears on a retry. If it does not, check that the migrations
        have been applied with <span className="font-mono">npm run check</span>.
      </p>

      <pre className="hairline-card mt-6 max-w-full overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-body">
        {error.message}
        {error.digest ? `\n\nReference: ${error.digest}` : ''}
      </pre>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-[var(--radius-pill)] bg-ink px-5 py-2.5 text-[15px] text-canvas transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Try again
        </button>

        <Link
          href="/admin"
          className="rounded-[var(--radius-pill)] border border-hairline px-5 py-2.5 text-[15px] text-ink transition-colors hover:border-hairline-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
