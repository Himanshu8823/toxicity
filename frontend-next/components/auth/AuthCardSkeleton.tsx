import { cn } from '@/lib/utils';

export interface AuthCardSkeletonProps {
  /** Number of input rows to mimic, so the fallback matches the real form's height. */
  fields?: number;
}

/**
 * Suspense fallback for the auth forms.
 *
 * Any form reading `useSearchParams` must sit behind a boundary in Next 16, so
 * every auth page renders this while the client half hydrates. It mirrors the
 * card's geometry rather than showing a spinner, so nothing shifts when the
 * real form arrives.
 */
export function AuthCardSkeleton({ fields = 2 }: AuthCardSkeletonProps) {
  return (
    <div
      className="hairline-card p-7 shadow-[var(--shadow-soft-drop)] sm:p-9"
      aria-hidden="true"
    >
      <div className="h-3 w-24 rounded-[var(--radius-xs)] bg-surface-strong" />
      <div className="mt-4 h-9 w-40 rounded-[var(--radius-sm)] bg-surface-strong" />
      <div className="mt-4 h-4 w-full rounded-[var(--radius-xs)] bg-surface-strong" />

      <div className="mt-8 flex flex-col gap-5">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="h-4 w-20 rounded-[var(--radius-xs)] bg-surface-strong" />
            <div className="h-11 w-full rounded-[var(--radius-md)] bg-surface-strong" />
          </div>
        ))}
        <div
          className={cn(
            'mt-1 h-10 w-full rounded-[var(--radius-pill)] bg-surface-strong',
          )}
        />
      </div>
    </div>
  );
}
