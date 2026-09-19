import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { requireUserApi } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { savedAnalyses, scans } from '@/lib/db/schema';

/**
 * `POST|DELETE /api/scans/[id]/save` — bookmark a scan, or remove the bookmark.
 *
 * POST doubles as "update my note and tags": the unique index on
 * (user_id, scan_id) means saving twice is an update, not a duplicate, which
 * is what the UI wants when someone edits a note on an already-saved scan.
 */

export const runtime = 'nodejs';

const bodySchema = z.object({
  title: z.string().trim().max(200).optional(),
  note: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const { id } = await params;

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json().catch(() => ({}));
    body = bodySchema.parse(raw);
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? 'Invalid request.')
        : 'Invalid request body.';
    return Response.json({ error: message }, { status: 400 });
  }

  const [scan] = await db
    .select({ id: scans.id, title: scans.videoTitle })
    .from(scans)
    .where(and(eq(scans.id, id), eq(scans.userId, auth.user.id)))
    .limit(1);

  if (!scan) {
    return Response.json({ error: 'Scan not found.' }, { status: 404 });
  }

  const [saved] = await db
    .insert(savedAnalyses)
    .values({
      userId: auth.user.id,
      scanId: scan.id,
      title: body.title ?? scan.title,
      note: body.note,
      tags: body.tags ?? [],
    })
    .onConflictDoUpdate({
      target: [savedAnalyses.userId, savedAnalyses.scanId],
      set: {
        // Only overwrite what was actually sent, so saving again from a list
        // view does not wipe a note written on the detail page.
        ...(body.title !== undefined && { title: body.title }),
        ...(body.note !== undefined && { note: body.note }),
        ...(body.tags !== undefined && { tags: body.tags }),
      },
    })
    .returning();

  return Response.json({ saved });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const { id } = await params;

  const removed = await db
    .delete(savedAnalyses)
    .where(
      and(
        eq(savedAnalyses.scanId, id),
        eq(savedAnalyses.userId, auth.user.id)
      )
    )
    .returning({ id: savedAnalyses.id });

  if (removed.length === 0) {
    return Response.json({ error: 'That scan was not saved.' }, { status: 404 });
  }

  return Response.json({ removed: true });
}
