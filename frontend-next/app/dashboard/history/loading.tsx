import { Skeleton } from '@/components/ui/Skeleton';
import { HeaderSkeleton, ListSkeleton } from '@/components/dashboard/ListSkeleton';

/**
 * History's silhouette: heading, the status filter chips, then a page of scan
 * rows. `ListSkeleton` already matches `ScanRow`'s geometry exactly, so only
 * the filter strip above it has to be drawn here — and it must be, or the
 * whole list jumps up by 56px the moment the real page arrives.
 */
export default function HistoryLoading() {
  return (
    <>
      <HeaderSkeleton />

      <div className="mb-6 flex flex-wrap gap-2" aria-hidden="true">
        {[64, 88, 76, 72].map((width, i) => (
          <Skeleton
            key={i}
            className="h-8 rounded-[var(--radius-pill)]"
            style={{ width }}
          />
        ))}
      </div>

      <ListSkeleton rows={6} />
    </>
  );
}
