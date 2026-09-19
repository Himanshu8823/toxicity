import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Loading silhouettes for the console routes.
 *
 * Shared rather than written per route because every console page has the same
 * bones — page header, filter bar, then a panel of rows — and three
 * hand-rolled copies would drift apart the first time the header changed.
 *
 * The geometry matches `ConsolePage` and `Panel` deliberately: a placeholder
 * that is the wrong height shifts the page under a reader the instant the real
 * content lands, which is worse than showing nothing.
 */

function PageHeaderSkeleton() {
  return (
    <header className="mb-8 border-b border-hairline pb-5">
      <Skeleton className="h-8 w-56 rounded-[var(--radius-xs)]" />
      <Skeleton className="mt-3 h-4 w-full max-w-[64ch] rounded-[var(--radius-xs)]" />
    </header>
  );
}

function FilterBarSkeleton({ fields }: { fields: number }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-2 rounded-[var(--radius-xs)] border border-hairline bg-surface-card px-3 py-2.5">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <Skeleton className="h-2.5 w-12 rounded-[var(--radius-xs)]" />
          <Skeleton className="h-8 w-44 rounded-[var(--radius-xs)]" />
        </div>
      ))}
      <Skeleton className="h-8 w-16 rounded-[var(--radius-xs)]" />
    </div>
  );
}

/** Header, filters, and a panel of table rows. */
export function ConsoleTableSkeleton({
  rows = 10,
  columns = 6,
  filters = 2,
}: {
  rows?: number;
  columns?: number;
  filters?: number;
}) {
  return (
    <div className="pb-20" aria-hidden="true">
      <PageHeaderSkeleton />
      <FilterBarSkeleton fields={filters} />

      <section className="rounded-[var(--radius-xs)] border border-hairline bg-surface-card">
        <div className="flex gap-3 border-b border-hairline px-3 py-2">
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton
              key={i}
              className="h-2.5 flex-1 rounded-[var(--radius-xs)]"
            />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div
            key={r}
            className="flex items-center gap-3 border-b border-hairline-soft px-3 py-3"
          >
            {Array.from({ length: columns }, (_, c) => (
              <Skeleton
                key={c}
                className="h-3.5 flex-1 rounded-[var(--radius-xs)]"
                // The first column carries the primary label on every console
                // table, so it is drawn wider — an even grid reads as a
                // spreadsheet, not as the table that is about to replace it.
                style={c === 0 ? { flexGrow: 2.2 } : undefined}
              />
            ))}
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-2.5">
          <Skeleton className="h-3 w-40 rounded-[var(--radius-xs)]" />
          <Skeleton className="h-7 w-36 rounded-[var(--radius-xs)]" />
        </div>
      </section>
    </div>
  );
}

/** The six-cell figure strip at the top of the stat-led pages. */
export function StatRowSkeleton() {
  return (
    <div className="grid grid-cols-2 rounded-[var(--radius-xs)] border border-hairline bg-surface-card px-4 py-1 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="border-l border-hairline px-4 py-3 first:border-l-0 first:pl-0"
        >
          <Skeleton className="h-2.5 w-16 rounded-[var(--radius-xs)]" />
          <Skeleton className="mt-2 h-6 w-20 rounded-[var(--radius-xs)]" />
          <Skeleton className="mt-2 h-3 w-24 rounded-[var(--radius-xs)]" />
        </div>
      ))}
    </div>
  );
}

/** A titled panel with a block of body beneath it. */
export function PanelSkeleton({ height = 160 }: { height?: number }) {
  return (
    <section className="rounded-[var(--radius-xs)] border border-hairline bg-surface-card">
      <div className="border-b border-hairline-soft px-4 py-3">
        <Skeleton className="h-3 w-40 rounded-[var(--radius-xs)]" />
        <Skeleton className="mt-2 h-3 w-full max-w-[48ch] rounded-[var(--radius-xs)]" />
      </div>
      <div className="px-4 py-4">
        <Skeleton
          className="w-full rounded-[var(--radius-xs)]"
          style={{ height }}
        />
      </div>
    </section>
  );
}

/** Header, stat strip, then stacked panels — the metrics and feedback shape. */
export function ConsoleDashboardSkeleton({
  panels = 3,
  filters = 0,
}: {
  panels?: number;
  filters?: number;
}) {
  return (
    <div className="pb-20" aria-hidden="true">
      <PageHeaderSkeleton />
      {filters > 0 ? <FilterBarSkeleton fields={filters} /> : null}
      <StatRowSkeleton />
      <div className="mt-4 flex flex-col gap-4">
        {Array.from({ length: panels }, (_, i) => (
          <PanelSkeleton key={i} height={i === 0 ? 200 : 160} />
        ))}
      </div>
    </div>
  );
}
