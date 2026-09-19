import { z } from 'zod';
import { requireUserApi } from '@/lib/auth/guards';
import { countScansForUser, listScansForUser } from '@/lib/db/queries/scans';

/**
 * `GET /api/scans` — the signed-in user's scan history.
 *
 * Server Components read the same data through `lib/db/queries/scans.ts`
 * directly; this route exists for client-side pagination and refresh, where a
 * full navigation would be the wrong tool.
 */

export const runtime = 'nodejs';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: Request) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);

  const parsed = querySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    perPage: searchParams.get('perPage') ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid pagination parameters.' },
      { status: 400 }
    );
  }

  const { page, perPage } = parsed.data;

  const [scans, total] = await Promise.all([
    listScansForUser(auth.user.id, {
      limit: perPage,
      offset: (page - 1) * perPage,
    }),
    countScansForUser(auth.user.id),
  ]);

  return Response.json({
    scans,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
  });
}
