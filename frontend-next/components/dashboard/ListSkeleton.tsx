import { Skeleton } from '@/components/ui/Skeleton';

export interface ListSkeletonProps {
  /** How many placeholder rows to draw. */
  rows?: number;
}

/**
 * The silhouette of a list of scan, saved or report rows.
 *
 * Deliberately matches `ScanRow`'s geometry — thumbnail, two text lines, a
 * badge strip — so the swap from placeholder to content does not shift the
 * page under a reader who has already started scanning it.
 */
export function ListSkeleton({ rows = 4 }: ListSkeletonProps) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="hairline-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Skeleton className="aspect-video w-full shrink-0 sm:h-[68px] sm:w-[120px]" />
            <div className="flex-1">
              <Skeleton className="h-5 w-3/4 max-w-[380px]" />
              <Skeleton className="mt-2 h-3.5 w-1/3 max-w-[180px]" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-6 w-20 rounded-[var(--radius-pill)]" />
                <Skeleton className="h-6 w-16 rounded-[var(--radius-pill)]" />
                <Skeleton className="h-6 w-24 rounded-[var(--radius-pill)]" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Heading block shared by every dashboard route's loading state. */
export function HeaderSkeleton() {
  return (
    <div className="mb-8" aria-hidden="true">
      <Skeleton className="h-3.5 w-20 rounded-[var(--radius-xs)]" />
      <Skeleton className="mt-3 h-9 w-2/3 max-w-[420px]" />
      <Skeleton className="mt-4 h-4 w-full max-w-[52ch]" />
    </div>
  );
}

export default ListSkeleton;
