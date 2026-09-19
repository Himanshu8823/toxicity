import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import {
  countUsers,
  listUsers,
  type ListUsersOptions,
  type UserSortKey,
} from '@/lib/db/queries/admin';
import type { UserRole } from '@/lib/db/schema';
import {
  ConsolePage,
  EmptyState,
  Figure,
  Pagination,
  Panel,
  SortableTh,
  StatusDot,
  Table,
  Td,
  Th,
  formatCount,
  formatDate,
  relativeTime,
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
import { ConfirmAction } from '@/components/admin/ConfirmAction';

/**
 * User administration.
 *
 * Every mutating control on this page goes through `PATCH /api/admin/users/:id`
 * rather than a Server Action, for one reason: that route is also the thing an
 * examiner can call with curl, and having exactly one path into a privileged
 * change means exactly one place where the guard and the audit write have to
 * be right.
 */

const PAGE_SIZE = 25;

const ROLE_OPTIONS = [
  { value: '', label: 'Any role' },
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
] as const;

const STATE_OPTIONS = [
  { value: '', label: 'Any state' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
] as const;

const SORT_KEYS: readonly UserSortKey[] = [
  'email',
  'createdAt',
  'lastSeenAt',
  'scanCount',
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin = await requireAdmin();
  // Next 16: searchParams is a Promise and must be awaited before it is read.
  const params = await searchParams;

  const search = param(params, 'q');
  const roleRaw = param(params, 'role');
  const stateRaw = param(params, 'state');
  const sortRaw = param(params, 'sort', 'createdAt');
  const directionRaw = param(params, 'dir', 'desc');
  const page = pageParam(params);

  const role: UserRole | undefined =
    roleRaw === 'user' || roleRaw === 'admin' ? roleRaw : undefined;
  const suspended =
    stateRaw === 'suspended' ? true : stateRaw === 'active' ? false : undefined;
  const sort: UserSortKey = SORT_KEYS.includes(sortRaw as UserSortKey)
    ? (sortRaw as UserSortKey)
    : 'createdAt';
  const direction: 'asc' | 'desc' = directionRaw === 'asc' ? 'asc' : 'desc';

  const options: ListUsersOptions = { search, role, suspended };

  const [rows, total] = await Promise.all([
    listUsers({
      ...options,
      sort,
      direction,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countUsers(options),
  ]);

  // Changing a filter resets to page one: staying on page 7 of a result set
  // that now has two pages shows an empty table for no obvious reason.
  const sortHref = (key: UserSortKey): string =>
    buildHref('/admin/users', params, {
      sort: key,
      dir: sort === key && direction === 'desc' ? 'asc' : 'desc',
      page: undefined,
    });

  return (
    <ConsolePage
      title="Users"
      description="Every account on the platform. Role changes and suspensions take effect on the account's next request and are written to the audit log."
    >
      <FilterBar action="/admin/users" hidden={{ sort, dir: direction }}>
        <FilterField label="Search" htmlFor="user-search">
          <TextFilter
            id="user-search"
            name="q"
            defaultValue={search}
            placeholder="Email or name"
          />
        </FilterField>
        <FilterField label="Role" htmlFor="user-role">
          <SelectFilter
            id="user-role"
            name="role"
            defaultValue={roleRaw}
            options={ROLE_OPTIONS}
          />
        </FilterField>
        <FilterField label="State" htmlFor="user-state">
          <SelectFilter
            id="user-state"
            name="state"
            defaultValue={stateRaw}
            options={STATE_OPTIONS}
          />
        </FilterField>
        <FilterSubmit />
        <FilterReset href="/admin/users" />
      </FilterBar>

      <Panel bodyClassName="px-0 py-0">
        {rows.length === 0 ? (
          <EmptyState
            title="No users match these filters"
            description={
              search || role || suspended !== undefined
                ? 'Try widening the search, or reset the filters.'
                : 'Accounts will appear here as people sign up.'
            }
          />
        ) : (
          <>
            <Table caption="Platform users with their activity and account state">
              <thead>
                <tr>
                  <SortableTh
                    href={sortHref('email')}
                    active={sort === 'email'}
                    direction={direction}
                  >
                    Account
                  </SortableTh>
                  <Th>Role</Th>
                  <SortableTh
                    href={sortHref('scanCount')}
                    active={sort === 'scanCount'}
                    direction={direction}
                    align="right"
                  >
                    Scans
                  </SortableTh>
                  <Th align="right">Comments</Th>
                  <SortableTh
                    href={sortHref('createdAt')}
                    active={sort === 'createdAt'}
                    direction={direction}
                  >
                    Joined
                  </SortableTh>
                  <SortableTh
                    href={sortHref('lastSeenAt')}
                    active={sort === 'lastSeenAt'}
                    direction={direction}
                  >
                    Last seen
                  </SortableTh>
                  <Th>State</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => {
                  // An admin cannot demote or suspend themselves: the action
                  // would succeed and then immediately lock them out of the
                  // page they performed it on.
                  const isSelf = user.id === admin.id;
                  const nextRole: UserRole =
                    user.role === 'admin' ? 'user' : 'admin';

                  return (
                    <tr key={user.id} className="hover:bg-canvas-soft">
                      <Td>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-ink">
                            {user.email}
                            {isSelf ? (
                              <span className="ml-1.5 text-[11px] text-muted-soft">
                                (you)
                              </span>
                            ) : null}
                          </span>
                          <span className="text-[11.5px] text-muted-soft">
                            {user.fullName ?? 'No name set'}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span
                          className={
                            user.role === 'admin'
                              ? 'text-[12.5px] font-medium text-ink'
                              : 'text-[12.5px] text-muted'
                          }
                        >
                          {user.role}
                        </span>
                      </Td>
                      <Td align="right">
                        {user.scanCount > 0 ? (
                          <Link
                            href={`/admin/scans?user=${user.id}`}
                            className="font-mono text-[12.5px] tabular-nums text-ink underline-offset-2 hover:underline"
                          >
                            {formatCount(user.scanCount)}
                          </Link>
                        ) : (
                          <Figure className="text-[12.5px] text-muted-soft">0</Figure>
                        )}
                      </Td>
                      <Td align="right">
                        <Figure className="text-[12.5px]">
                          {formatCount(user.commentsAnalysed)}
                        </Figure>
                      </Td>
                      <Td>
                        <span className="font-mono text-[11.5px] tabular-nums text-muted">
                          {formatDate(user.createdAt)}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-[11.5px] tabular-nums text-muted">
                          {relativeTime(user.lastSeenAt)}
                        </span>
                      </Td>
                      <Td>
                        <StatusDot
                          tone={user.isSuspended ? 'critical' : 'positive'}
                          label={user.isSuspended ? 'Suspended' : 'Active'}
                        />
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSelf ? (
                            <span className="text-[11.5px] text-muted-soft">
                              Self-management disabled
                            </span>
                          ) : (
                            <>
                              <ConfirmAction
                                endpoint={`/api/admin/users/${user.id}`}
                                body={{ role: nextRole }}
                                label={
                                  nextRole === 'admin' ? 'Promote' : 'Demote'
                                }
                                destructive={nextRole === 'user'}
                                confirmTitle={
                                  nextRole === 'admin'
                                    ? 'Grant administrator access?'
                                    : 'Revoke administrator access?'
                                }
                                confirmLabel={
                                  nextRole === 'admin' ? 'Promote' : 'Demote'
                                }
                                confirmBody={
                                  nextRole === 'admin' ? (
                                    <>
                                      <strong className="text-ink">
                                        {user.email}
                                      </strong>{' '}
                                      will be able to see every account&rsquo;s
                                      data, change roles and suspend users.
                                    </>
                                  ) : (
                                    <>
                                      <strong className="text-ink">
                                        {user.email}
                                      </strong>{' '}
                                      will lose access to this console
                                      immediately.
                                    </>
                                  )
                                }
                              />
                              <ConfirmAction
                                endpoint={`/api/admin/users/${user.id}`}
                                body={{ isSuspended: !user.isSuspended }}
                                label={user.isSuspended ? 'Restore' : 'Suspend'}
                                destructive={!user.isSuspended}
                                confirmTitle={
                                  user.isSuspended
                                    ? 'Restore this account?'
                                    : 'Suspend this account?'
                                }
                                confirmLabel={
                                  user.isSuspended ? 'Restore' : 'Suspend'
                                }
                                confirmBody={
                                  user.isSuspended ? (
                                    <>
                                      <strong className="text-ink">
                                        {user.email}
                                      </strong>{' '}
                                      will be able to sign in and run scans
                                      again.
                                    </>
                                  ) : (
                                    <>
                                      <strong className="text-ink">
                                        {user.email}
                                      </strong>{' '}
                                      will be signed out and blocked from
                                      signing in. Their{' '}
                                      {formatCount(user.scanCount)} scans and
                                      their data are kept.
                                    </>
                                  )
                                }
                              />
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              unit="users"
              hrefFor={(p) => buildHref('/admin/users', params, { page: p })}
            />
          </>
        )}
      </Panel>
    </ConsolePage>
  );
}
