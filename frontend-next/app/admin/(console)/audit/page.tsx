import { requireAdmin } from '@/lib/auth/guards';
import {
  countAuditLog,
  getAuditFacets,
  listAuditLog,
  type ListAuditOptions,
} from '@/lib/db/queries/admin';
import {
  ConsolePage,
  EmptyState,
  Mono,
  Pagination,
  Panel,
  Table,
  Td,
  Th,
  formatDateTime,
  relativeTime,
} from '@/components/admin/console';
import {
  FilterBar,
  FilterField,
  FilterReset,
  FilterSubmit,
  SelectFilter,
  buildHref,
  pageParam,
  param,
  type SearchParams,
} from '@/components/admin/filters';

/**
 * The audit log.
 *
 * Append-only and never edited from this page — there is no action column for
 * exactly that reason. A log an administrator can prune is not evidence of
 * anything, and the whole value of this table is that a privileged change made
 * elsewhere in the console leaves a row here that nobody can quietly remove.
 */

const PAGE_SIZE = 50;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  // Next 16: searchParams is a Promise and must be awaited before it is read.
  const params = await searchParams;

  const actorRaw = param(params, 'actor');
  const actionRaw = param(params, 'action');
  const page = pageParam(params);

  const facets = await getAuditFacets();

  // Both filters are validated against the facets rather than passed through:
  // an id or action that never occurs returns an empty table that looks like a
  // bug rather than like a typo.
  const actorId = facets.actors.some((a) => a.id === actorRaw)
    ? actorRaw
    : undefined;
  const action = facets.actions.includes(actionRaw) ? actionRaw : undefined;

  const options: ListAuditOptions = { actorId, action };

  const [rows, total] = await Promise.all([
    listAuditLog({
      ...options,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countAuditLog(options),
  ]);

  const filtered = Boolean(actorId || action);

  return (
    <ConsolePage
      title="Audit log"
      description="Every privileged action, as it was recorded. Append-only: nothing on this page can be edited or removed from the console."
    >
      <FilterBar action="/admin/audit">
        <FilterField label="Actor" htmlFor="audit-actor">
          <SelectFilter
            id="audit-actor"
            name="actor"
            defaultValue={actorId ?? ''}
            width="w-64"
            options={[
              { value: '', label: 'Any actor' },
              ...facets.actors.map((a) => ({ value: a.id, label: a.email })),
            ]}
          />
        </FilterField>
        <FilterField label="Action" htmlFor="audit-action">
          <SelectFilter
            id="audit-action"
            name="action"
            defaultValue={action ?? ''}
            width="w-56"
            options={[
              { value: '', label: 'Any action' },
              ...facets.actions.map((a) => ({ value: a, label: a })),
            ]}
          />
        </FilterField>
        <FilterSubmit />
        <FilterReset href="/admin/audit" />
      </FilterBar>

      <Panel bodyClassName="px-0 py-0">
        {rows.length === 0 ? (
          <EmptyState
            title={filtered ? 'No entries match these filters' : 'Log is empty'}
            description={
              filtered
                ? 'Try another actor or action, or reset the filters.'
                : 'Entries appear here the first time an admin changes a role, suspends an account or reviews feedback.'
            }
          />
        ) : (
          <>
            <Table caption="Audit log entries with actor, action, affected entity and origin">
              <thead>
                <tr>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Entity</Th>
                  <Th>Detail</Th>
                  <Th>IP</Th>
                  <Th align="right">When</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-canvas-soft">
                    <Td>
                      <span className="max-w-[200px] truncate text-[12.5px] text-body-strong">
                        {row.actorEmail ?? 'system'}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[12px] text-ink">
                        {row.action}
                      </span>
                    </Td>
                    <Td>
                      <span className="flex items-center gap-1.5">
                        <span className="text-[12.5px] text-muted">
                          {row.entity}
                        </span>
                        {row.entityId ? <Mono value={row.entityId} /> : null}
                      </span>
                    </Td>
                    <Td>
                      <span className="block max-w-[320px] truncate font-mono text-[11.5px] text-muted-soft">
                        {summariseMetadata(row.metadata)}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[11.5px] text-muted-soft">
                        {row.ip ?? '—'}
                      </span>
                    </Td>
                    <Td align="right">
                      {/* Relative reads faster when scanning; the exact stamp
                          is the thing you actually cite, so it stays in the
                          title where a copy-paste can reach it. */}
                      <span
                        className="font-mono text-[11.5px] tabular-nums text-muted"
                        title={formatDateTime(row.createdAt)}
                      >
                        {relativeTime(row.createdAt)}
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
              unit="entries"
              hrefFor={(p) => buildHref('/admin/audit', params, { page: p })}
            />
          </>
        )}
      </Panel>
    </ConsolePage>
  );
}

/**
 * Flattens the metadata jsonb into one scannable line.
 *
 * Deliberately lossy and truncated: the column is a glance, and a nested object
 * pretty-printed into a table cell destroys the row rhythm that makes a log
 * readable at all.
 */
function summariseMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata) return '—';

  const parts: string[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) continue;
    const rendered =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    parts.push(`${key}=${rendered.slice(0, 40)}`);
    if (parts.length === 4) break;
  }

  return parts.length === 0 ? '—' : parts.join(' · ');
}
