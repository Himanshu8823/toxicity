import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Route-level fallback shown while the landing page's server component
 * (and its client children) prepare. Mirrors the hero silhouette so the
 * swap-in doesn't jolt: label → headline → subhead → form card.
 */
export default function Loading() {
  return (
    <div className="editorial-container pt-20 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24">
      <Skeleton className="h-4 w-24 rounded-[var(--radius-xs)]" />

      <div className="mt-5 flex flex-col gap-3">
        <Skeleton className="h-12 w-full max-w-[560px] sm:h-14" />
        <Skeleton className="h-12 w-4/5 max-w-[440px] sm:h-14" />
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Skeleton className="h-4 w-full max-w-[54ch]" />
        <Skeleton className="h-4 w-3/4 max-w-[40ch]" />
      </div>

      <div className="mt-10 max-w-[560px]">
        <Skeleton className="h-[220px] w-full rounded-[var(--radius-xl)] sm:h-[200px]" />
      </div>
    </div>
  );
}
