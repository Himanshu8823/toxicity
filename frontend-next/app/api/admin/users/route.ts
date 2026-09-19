import { z } from 'zod';
import { requireAdminApi } from '@/lib/auth/guards';
import {
  countUsers,
  listUsers,
  type ListUsersOptions,
} from '@/lib/db/queries/admin';
import { userRoleEnum } from '@/lib/db/schema';

/**
 * `GET /api/admin/users` — one page of accounts.
 *
 * `/admin/users` renders the same rows server-side through `listUsers`; this
 * route exists so the page can refresh itself after a role change or a
 * suspension without a full navigation. The query parameters mirror that
 * page's URL exactly (`q`, `role`, `state`, `sort`, `dir`, `page`), so a link
 * and a fetch never disagree about what is being asked for.
 */

export const runtime = 'nodejs';

const querySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  role: z.enum(userRoleEnum.enumValues).optional(),
  // `state` rather than a raw boolean, matching the page's filter select.
  state: z.enum(['active', 'suspended']).optional(),
  sort: z
    .enum(['email', 'createdAt', 'lastSeenAt', 'scanCount'])
    .default('createdAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);

  const parsed = querySchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    role: searchParams.get('role') || undefined,
    state: searchParams.get('state') || undefined,
    sort: searchParams.get('sort') ?? undefined,
    dir: searchParams.get('dir') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    perPage: searchParams.get('perPage') ?? undefined,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json(
      {
        error: issue
          ? `Invalid \`${issue.path.join('.')}\`: ${issue.message}`
          : 'Invalid query parameters.',
      },
      { status: 400 }
    );
  }

  const { q, role, state, sort, dir, page, perPage } = parsed.data;

  const filters: ListUsersOptions = {
    search: q,
    role,
    suspended:
      state === 'suspended' ? true : state === 'active' ? false : undefined,
  };

  // The count uses the filters without the pagination, so `totalPages`
  // describes the whole result set rather than the page in hand.
  const [users, total] = await Promise.all([
    listUsers({
      ...filters,
      sort,
      direction: dir,
      limit: perPage,
      offset: (page - 1) * perPage,
    }),
    countUsers(filters),
  ]);

  return Response.json({
    users,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
  });
}
