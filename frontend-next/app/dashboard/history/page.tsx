import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/guards';
import {
  countScansForUser,
  listScansForUser,
  type ScanListItem,
} from '@/lib/db/queries/scans';
import type { ScanStatus } from '@/lib/db/schema';
import { ScanRow } from '@/components/dashboard/ScanRow';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Pagination } from '@/components/dashboard/Pagination';
import { formatCount } from '@/components/dashboard/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Scan history — ToxiScan',
};

const PAGE_SIZE = 10;

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'complete', label: 'Complete' },
  { value: 'running', label: 'Running' },
  { value: 'pending', label: 'Queued' },
  { value: 'failed', label: 'Failed' },
];

const VALID_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'running',
  'complete',
  'failed',
]);

/** A query parameter is whatever the URL says, so it is parsed, not trusted. */
function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const rawStatus = readParam(params.status);
  const status: ScanStatus | undefined =
    rawStatus && VALID_STATUSES.has(rawStatus)
      ? (rawStatus as ScanStatus)
      : undefined;

  const rawPage = Number(readParam(params.page) ?? '1');
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  const totalScans = await countScansForUser(user.id);

  /**
   * `listScansForUser` does not filter by status, and `scans.ts` is off
   * limits, so the filter is applied here. To keep paging honest under a
   * filter, a filtered view pulls the user's scans in one page-sized-agnostic
   * read and slices locally; the unfiltered view pages in the database, which
   * is the path that actually has to scale.
   */
  let rows: ScanListItem[];
  let filteredTotal: number;

  if (status) {
    const all = await listScansForUser(user.id, { limit: totalScans || 1 });
    const matching = all.filter((scan) => scan.status === status);
    filteredTotal = matching.length;
    rows = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  } else {
    filteredTotal = totalScans;
    rows = await listScansForUser(user.id, {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
  }

  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));

  return (
    <>
      <header className="mb-8">
        <p className="caption-uppercase text-muted">History</p>
        <h1 className="display-lg mt-2 text-ink">Every scan you have run</h1>
        <p className="body-md mt-3 max-w-[60ch] text-body">
          {totalScans > 0
            ? `${formatCount(totalScans)} scan${totalScans === 1 ? '' : 's'} on your account. Open one to read its comments, or save the ones worth returning to.`
            : 'Nothing here yet.'}
        </p>
      </header>

      {totalScans > 0 && (
        <nav aria-label="Filter by status" className="mb-6 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => {
            const active =
              filter.value === 'all' ? status === undefined : status === filter.value;
            const href =
              filter.value === 'all'
                ? '/dashboard/history'
                : `/dashboard/history?status=${filter.value}`;

            return (
              <Link
                key={filter.value}
                href={href}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'caption inline-flex h-8 items-center rounded-[var(--radius-pill)] border px-3.5 transition-colors duration-150',
                  active
                    ? 'border-ink bg-primary text-on-primary'
                    : 'border-hairline-strong text-muted hover:border-ink hover:text-ink',
                )}
              >
                {filter.label}
              </Link>
            );
          })}
        </nav>
      )}

      {totalScans === 0 ? (
        <EmptyState
          title="No scans yet"
          description="Once you analyse a video it lands here, with its comments, its scores and the verdicts the models were least sure about — kept for as long as you want it."
          action={{ href: '/#analyse-form', label: 'Analyse a video' }}
          secondaryAction={{ href: '/playground', label: 'Try the playground' }}
        />
      ) : rows.length === 0 ? (
        <div className="hairline-card px-6 py-12 text-center">
          <h2 className="title-md text-ink">Nothing matches that filter</h2>
          <p className="body-sm mx-auto mt-2 max-w-[48ch] text-muted">
            You have scans, but none of them are{' '}
            {STATUS_FILTERS.find((f) => f.value === status)?.label.toLowerCase()}.
          </p>
          <Link
            href="/dashboard/history"
            className="btn-type mt-6 inline-flex h-10 items-center justify-center rounded-[var(--radius-pill)] border border-hairline-strong px-5 text-ink transition-colors hover:border-ink"
          >
            Show all scans
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {rows.map((scan) => (
              <ScanRow key={scan.id} scan={scan} />
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/dashboard/history"
            params={{ status }}
            label="Scan history pages"
            className="mt-8"
          />
        </>
      )}
    </>
  );
}
