import { Skeleton } from '@/components/ui/Skeleton';
import { HeaderSkeleton, ListSkeleton } from '@/components/dashboard/ListSkeleton';

/**
 * Saved's silhouette: heading, the tag filter chips, then saved cards.
 *
 * `SavedCard` shares `ScanRow`'s thumbnail-plus-two-lines geometry, so
 * `ListSkeleton` is an honest stand-in for it. The tag strip is drawn at an
 * uneven set of widths rather than a uniform one — real tags are words, and a
 * row of identical pills reads as a loading bar, not as a filter.
 */
export default function SavedLoading() {
  return (
    <>
      <HeaderSkeleton />

      <div className="mb-6 flex flex-wrap gap-2" aria-hidden="true">
        {[48, 92, 68, 110, 74].map((width, i) => (
          <Skeleton
            key={i}
            className="h-8 rounded-[var(--radius-pill)]"
            style={{ width }}
          />
        ))}
      </div>

      <ListSkeleton rows={5} />
    </>
  );
}
