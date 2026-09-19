import { Skeleton } from '@/components/ui/Skeleton';
import { HeaderSkeleton, ListSkeleton } from '@/components/dashboard/ListSkeleton';

/**
 * The overview's silhouette: six stat tiles, three panels, then recent scans.
 *
 * The tile grid repeats the real page's `grid-cols-2 lg:grid-cols-3` rather
 * than a generic block, because this page's aggregates are six separate
 * queries and the placeholder is on screen long enough for a reflow at swap-in
 * to be felt rather than just measured.
 */
export default function DashboardLoading() {
  return (
    <>
      <HeaderSkeleton />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[116px] rounded-[var(--radius-xl)]" />
        ))}
      </div>

      <div className="mt-8" aria-hidden="true">
        <Skeleton className="h-[280px] rounded-[var(--radius-xl)]" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2" aria-hidden="true">
        <Skeleton className="h-[320px] rounded-[var(--radius-xl)]" />
        <Skeleton className="h-[320px] rounded-[var(--radius-xl)]" />
      </div>

      <section className="hairline-card mt-6 p-5 sm:p-6">
        <Skeleton className="h-6 w-40" aria-hidden="true" />
        <div className="mt-5">
          <ListSkeleton rows={3} />
        </div>
      </section>
    </>
  );
}
