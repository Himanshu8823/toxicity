import { Skeleton } from '@/components/ui/Skeleton';

/**
 * The scan detail silhouette.
 *
 * This is the slowest route in the dashboard — it reads every comment and
 * analysis for the scan plus this user's feedback on them — so the placeholder
 * is on screen the longest and has the most to answer for. It mirrors the real
 * page section by section: breadcrumb, video header, six tiles, two charts,
 * then the comment list with its filter bar.
 */
export default function ScanDetailLoading() {
  return (
    <div aria-hidden="true">
      <div className="mb-6">
        <Skeleton className="h-4 w-28 rounded-[var(--radius-xs)]" />
      </div>

      {/* Video header — the thumbnail keeps its aspect ratio on mobile and its
          fixed 192×108 on wide screens, matching the real <Image>. */}
      <div className="hairline-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Skeleton className="aspect-video w-full shrink-0 rounded-[var(--radius-md)] sm:h-[108px] sm:w-[192px]" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-8 w-3/4 max-w-[420px]" />
            <Skeleton className="mt-2 h-4 w-1/3 max-w-[180px]" />
            <div className="mt-3 flex flex-wrap gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-hairline pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-10 w-40 rounded-[var(--radius-pill)]" />
            <Skeleton className="h-10 w-20 rounded-[var(--radius-md)]" />
            <Skeleton className="h-10 w-40 rounded-[var(--radius-pill)]" />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[116px] rounded-[var(--radius-xl)]" />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[320px] rounded-[var(--radius-xl)]" />
        <Skeleton className="h-[320px] rounded-[var(--radius-xl)]" />
      </div>

      {/* Comment list: heading and the three filter selects, then cards. */}
      <div className="mt-10">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-2 h-4 w-40" />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <Skeleton className="h-3 w-16 rounded-[var(--radius-xs)]" />
                <Skeleton className="h-9 w-36 rounded-[var(--radius-md)]" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="hairline-card p-4 sm:p-5">
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-1.5 h-4 w-4/5 max-w-[46ch]" />
              <div className="mt-4 flex flex-wrap gap-2">
                <Skeleton className="h-6 w-24 rounded-[var(--radius-pill)]" />
                <Skeleton className="h-6 w-28 rounded-[var(--radius-pill)]" />
                <Skeleton className="h-6 w-20 rounded-[var(--radius-pill)]" />
              </div>
              {/* The feedback strip, so the card does not grow on hydration. */}
              <div className="mt-4 border-t border-hairline pt-3">
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-24 rounded-[var(--radius-pill)]" />
                  <Skeleton className="h-8 w-28 rounded-[var(--radius-pill)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
