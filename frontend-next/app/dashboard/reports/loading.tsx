import { Skeleton } from '@/components/ui/Skeleton';
import { HeaderSkeleton } from '@/components/dashboard/ListSkeleton';

/**
 * Reports' silhouette.
 *
 * `ListSkeleton` is deliberately *not* reused here: `ReportRow` has no
 * thumbnail, and borrowing a silhouette with one would promise an image that
 * never arrives — a 120px hole collapsing on hydration is exactly the jump
 * these files exist to prevent. This mirrors the real row instead: title,
 * badge strip, and the download control pinned right on wide screens.
 */
export default function ReportsLoading() {
  return (
    <>
      <HeaderSkeleton />

      <div className="flex flex-col gap-3" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="hairline-card p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-3/4 max-w-[360px]" />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-14 rounded-[var(--radius-pill)]" />
                  <Skeleton className="h-6 w-20 rounded-[var(--radius-pill)]" />
                  <Skeleton className="h-6 w-16 rounded-[var(--radius-pill)]" />
                  <Skeleton className="h-6 w-28 rounded-[var(--radius-pill)]" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded-[var(--radius-pill)] sm:w-32" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
