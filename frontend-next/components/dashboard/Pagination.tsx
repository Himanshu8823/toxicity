import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  /** 1-based. */
  page: number;
  totalPages: number;
  /** Path without the query string, e.g. `/dashboard/history`. */
  basePath: string;
  /**
   * Filters and sorts already on the URL. Preserved across page links so
   * paging never silently drops the user's filter.
   */
  params?: Record<string, string | undefined>;
  /** Describes what is being paged, for the landmark's accessible name. */
  label?: string;
  className?: string;
}

/** Builds `?page=n` with every other active query parameter carried over. */
function hrefFor(
  basePath: string,
  page: number,
  params: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  // Page 1 is the canonical URL, so it carries no `page` parameter at all.
  if (page > 1) search.set('page', String(page));

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * Which page numbers to render: always the first and last, always a window
 * around the current page, with `null` standing in for the elided runs. Keeps
 * the control a fixed width however many pages exist.
 */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: (number | null)[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) items.push(null);
  for (let i = start; i <= end; i++) items.push(i);
  if (end < totalPages - 1) items.push(null);

  items.push(totalPages);
  return items;
}

const STEP_CLASS =
  'btn-type inline-flex h-9 items-center justify-center rounded-[var(--radius-pill)] border border-hairline-strong px-4 transition-colors duration-150';

/**
 * Page links for a server-rendered list.
 *
 * Real `<a href>`s rather than click handlers: paging is a navigation, so it
 * must survive a middle-click, a bookmark and a page reload. That also keeps
 * the whole control usable with JavaScript still loading.
 */
export function Pagination({
  page,
  totalPages,
  basePath,
  params = {},
  label = 'Pages',
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = pageWindow(page, totalPages);

  return (
    <nav
      aria-label={label}
      className={cn('flex items-center justify-between gap-4', className)}
    >
      {page > 1 ? (
        <Link href={hrefFor(basePath, page - 1, params)} rel="prev" className={cn(STEP_CLASS, 'text-ink hover:border-ink')}>
          Previous
        </Link>
      ) : (
        <span className={cn(STEP_CLASS, 'cursor-not-allowed text-muted-soft opacity-60')} aria-disabled="true">
          Previous
        </span>
      )}

      <ol className="hidden items-center gap-1 sm:flex">
        {items.map((item, index) =>
          item === null ? (
            <li key={`gap-${index}`} className="caption px-2 text-muted-soft" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(basePath, item, params)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
                className={cn(
                  'caption inline-flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-pill)] px-3 tabular-nums transition-colors duration-150',
                  item === page
                    ? 'bg-primary text-on-primary'
                    : 'text-muted hover:bg-surface-strong hover:text-ink',
                )}
              >
                {item}
              </Link>
            </li>
          ),
        )}
      </ol>

      {/* Phones get the plain counter instead of the number strip. */}
      <p className="caption text-muted tabular-nums sm:hidden">
        Page {page} of {totalPages}
      </p>

      {page < totalPages ? (
        <Link href={hrefFor(basePath, page + 1, params)} rel="next" className={cn(STEP_CLASS, 'text-ink hover:border-ink')}>
          Next
        </Link>
      ) : (
        <span className={cn(STEP_CLASS, 'cursor-not-allowed text-muted-soft opacity-60')} aria-disabled="true">
          Next
        </span>
      )}
    </nav>
  );
}

export default Pagination;
