import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import {
  countAllScans,
  listAllScans,
  listScanOwners,
  type ListScansOptions,
} from '@/lib/db/queries/admin';
import type { ScanStatus } from '@/lib/db/schema';
import {
  ConsolePage,
  EmptyState,
  Figure,
  Mono,
  Pagination,
  Panel,
  StatusDot,
  Table,
  Td,
  Th,
  formatCount,
  formatDuration,
  formatPercent,
  relativeTime,
  type DotTone,
} from '@/components/admin/console';
import {
  FilterBar,
  FilterField,
  FilterReset,
  FilterSubmit,
  SelectFilter,
  TextFilter,
  buildHref,
  pageParam,
  param,
  type SearchParams,
} from '@/components/admin/filters';

/**
 * Every scan on the platform, newest first.
 *
 * Ordering is fixed rather than sortable, unlike the users table. A scan list is
 * read chronologically — "what has been running" — and the expensive columns
 * here (toxicity, duration) are derived per row, so offering them as sort keys
 * would invite a full-table sort to answer a question nobody asks.
 */

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'complete', label: 'Complete' },
  { value: 'failed', label: 'Failed' },
] as const;

const STATUSES: readonly ScanStatus[] = [
  'pending',
  'running',
  'complete',
  'failed',
];

export default async function AdminScansPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  // Next 16: searchParams is a Promise and must be awaited before it is read.
  const params = await searchParams;

  const search = param(params, 'q');
  const statusRaw = param(params, 'status');
  // Named `user` rather than `owner` so the link from the users table —
  // `/admin/scans?user=<id>` — lands here without a second parameter name.
  const userRaw = param(params, 'user');
  const page = pageParam(params);

  const status = STATUSES.includes(statusRaw as ScanStatus)
    ? (statusRaw as ScanStatus)
    : undefined;

  const owners = await listScanOwners();
  // An owner id from the query string is only honoured if it is in the facet
  // list; an arbitrary uuid would silently return an empty table with no clue
  // as to why.
  const userId = owners.some((o) => o.id === userRaw) ? userRaw : undefined;

  const options: ListScansOptions = { status, userId, search };

  const [rows, total] = await Promise.all([
    listAllScans({
      ...options,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countAllScans(options),
  ]);

  const ownerOptions = [
    { value: '', label: 'Any owner' },
    ...owners.map((o) => ({
      value: o.id,
      label: `${o.email} (${o.scanCount})`,
    })),
  ];

  const filtered = Boolean(search || status || userId);

  return (
    <ConsolePage
      title="Scans"
      description="Every scan run on the platform, across all accounts. Read-only — an admin can inspect a scan but never alters somebody else's data from here."
    >
      <FilterBar action="/admin/scans">
        <FilterField label="Search" htmlFor="scan-search">
          <TextFilter
            id="scan-search"
            name="q"
            defaultValue={search}
            placeholder="Title, video id or channel"
          />
        </FilterField>
        <FilterField label="Status" htmlFor="scan-status">
          <SelectFilter
            id="scan-status"
            name="status"
            defaultValue={statusRaw}
            options={STATUS_OPTIONS}
          />
        </FilterField>
        <FilterField label="Owner" htmlFor="scan-owner">
          <SelectFilter
            id="scan-owner"
            name="user"
            defaultValue={userId ?? ''}
            options={ownerOptions}
            width="w-64"
          />
        </FilterField>
        <FilterSubmit />
        <FilterReset href="/admin/scans" />
      </FilterBar>

      <Panel bodyClassName="px-0 py-0">
        {rows.length === 0 ? (
          <EmptyState
            title={filtered ? 'No scans match these filters' : 'No scans yet'}
            description={
              filtered
                ? 'Try widening the search, or reset the filters.'
                : 'Scans will appear here as soon as anyone analyses a video.'
            }
          />
        ) : (
          <>
            <Table caption="Every scan across all accounts, with its owner, outcome and timing">
              <thead>
                <tr>
                  <Th>Video</Th>
                  <Th>Owner</Th>
                  <Th align="right">Analysed</Th>
                  <Th align="right">Toxicity</Th>
                  <Th>Language</Th>
                  <Th>Status</Th>
                  <Th align="right">Duration</Th>
                  <Th align="right">Created</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((scan) => (
                  <tr key={scan.id} className="hover:bg-canvas-soft">
                    <Td>
                      <Link
                        href={`/admin/scans/${scan.id}`}
                        className="flex flex-col gap-0.5 underline-offset-2 hover:underline"
                      >
                        <span className="max-w-[320px] truncate text-[13px] font-medium text-ink">
                          {scan.videoTitle ?? 'Untitled video'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Mono value={scan.videoId} chars={11} />
                          {scan.channelName ? (
                            <span className="max-w-[160px] truncate text-[11.5px] text-muted-soft">
                              · {scan.channelName}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      <span className="max-w-[200px] truncate text-[12.5px] text-muted">
                        {scan.ownerEmail ?? 'Deleted account'}
                      </span>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {formatCount(scan.analysedCount)}
                      </Figure>
                      {scan.erroredCount > 0 ? (
                        <span
                          className="ml-1.5 text-[11.5px] text-muted-soft"
                          title={`${scan.erroredCount} comments failed to analyse`}
                        >
                          +{scan.erroredCount} err
                        </span>
                      ) : null}
                    </Td>
                    <Td align="right">
                      {/* Stored 0–100, not 0–1 — `formatPercent` expects a
                          fraction, so it is divided back down here. */}
                      {scan.overallToxicityScore === null ? (
                        <span className="text-[12.5px] text-muted-soft">—</span>
                      ) : (
                        <Figure className="text-[12.5px]">
                          {formatPercent(scan.overallToxicityScore / 100, 1)}
                        </Figure>
                      )}
                    </Td>
                    <Td>
                      <span className="font-mono text-[11.5px] text-muted">
                        {scan.dominantLanguage ?? '—'}
                      </span>
                    </Td>
                    <Td>
                      <StatusDot
                        tone={statusTone(scan.status)}
                        label={scan.status}
                      />
                    </Td>
                    <Td align="right">
                      <span className="font-mono text-[11.5px] tabular-nums text-muted">
                        {formatDuration(scan.durationMs)}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="font-mono text-[11.5px] tabular-nums text-muted">
                        {relativeTime(scan.createdAt)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              unit="scans"
              hrefFor={(p) => buildHref('/admin/scans', params, { page: p })}
            />
          </>
        )}
      </Panel>
    </ConsolePage>
  );
}

/** Scan status onto the muted dot palette. */
function statusTone(status: ScanStatus): DotTone {
  switch (status) {
    case 'complete':
      return 'positive';
    case 'failed':
      return 'critical';
    case 'running':
      return 'warn';
    case 'pending':
      return 'idle';
  }
}
