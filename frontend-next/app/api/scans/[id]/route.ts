import { requireUserApi } from '@/lib/auth/guards';
import { deleteScan, getScanDetail } from '@/lib/db/queries/scans';

/**
 * `GET|DELETE /api/scans/[id]` — one scan the user owns.
 *
 * Both operations scope the query by the session user id rather than checking
 * ownership afterwards, so a scan belonging to someone else is indistinguish-
 * able from one that does not exist. That is deliberate: a 403 would confirm
 * the id is real.
 */

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const { id } = await params;
  const detail = await getScanDetail(id, auth.user.id);

  if (!detail) {
    return Response.json({ error: 'Scan not found.' }, { status: 404 });
  }

  return Response.json(detail);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const { id } = await params;
  const deleted = await deleteScan(id, auth.user.id);

  if (!deleted) {
    return Response.json({ error: 'Scan not found.' }, { status: 404 });
  }

  // Comments, analyses, saved entries and reports all cascade from the scan
  // row, so nothing is left behind.
  return Response.json({ deleted: true });
}
