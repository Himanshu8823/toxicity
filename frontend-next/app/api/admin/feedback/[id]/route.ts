import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAdminApi } from '@/lib/auth/guards';
import { clientIp, recordAudit } from '@/lib/admin/audit';
import { db } from '@/lib/db/client';
import { feedback } from '@/lib/db/schema';
import { getFeedbackById } from '@/lib/db/queries/admin';

/**
 * `PATCH /api/admin/feedback/[id]` — triage one piece of user feedback.
 *
 * This is where a complaint becomes ground truth. `getLabelledSample` treats
 * every non-open row as settled: accepted + incorrect means the user's
 * correction is the truth, anything else means the model's own label stands.
 * So accepting or rejecting here is what every precision, recall and ROC
 * figure on `/admin/metrics` is ultimately computed from.
 */

export const runtime = 'nodejs';

const paramsSchema = z.object({
  id: z.string().uuid('That is not a valid feedback id.'),
});

const bodySchema = z.object({
  status: z.enum(['accepted', 'rejected'], {
    message: 'Status must be either `accepted` or `rejected`.',
  }),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const { user: admin } = auth;

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return Response.json(
      { error: parsedParams.error.issues[0]?.message ?? 'Invalid feedback id.' },
      { status: 400 }
    );
  }

  const { id } = parsedParams.data;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? 'Invalid request.')
        : 'Invalid request body.';
    return Response.json({ error: message }, { status: 400 });
  }

  const existing = await getFeedbackById(id);
  if (!existing) {
    return Response.json({ error: 'No such feedback item.' }, { status: 404 });
  }

  /**
   * Only `open` items may be triaged.
   *
   * Silently re-triaging would move a row between "the correction is truth"
   * and "the model was right" after the metrics had already been snapshotted
   * against it, so two snapshots over the same period would disagree with no
   * trace of why. If a verdict really needs revisiting, the user re-submits
   * their feedback, which resets the row to `open` and leaves a record.
   */
  if (existing.status !== 'open') {
    return Response.json(
      {
        error: `This item was already ${existing.status}. Re-triaging would silently change the ground truth the metrics were computed from — ask the reporter to re-submit their feedback if the verdict needs revisiting.`,
      },
      { status: 409 }
    );
  }

  try {
    const reviewedAt = new Date();

    const [updated] = await db
      .update(feedback)
      .set({
        status: body.status,
        // The reviewer is the session admin, never anything the caller sent.
        reviewedBy: admin.id,
        reviewedAt,
      })
      .where(eq(feedback.id, id))
      .returning();

    await recordAudit({
      actorId: admin.id,
      action: body.status === 'accepted' ? 'feedback.accepted' : 'feedback.rejected',
      entity: 'feedback',
      entityId: id,
      metadata: {
        verdict: existing.verdict,
        correctedCategory: existing.correctedCategory,
        correctedSeverity: existing.correctedSeverity,
        commentAnalysisId: existing.commentAnalysisId,
        reporterId: existing.userId,
      },
      ip: await clientIp(),
    });

    return Response.json({
      feedback: {
        id: updated.id,
        status: updated.status,
        verdict: updated.verdict,
        correctedCategory: updated.correctedCategory,
        correctedSeverity: updated.correctedSeverity,
        note: updated.note,
        reviewedBy: updated.reviewedBy,
        reviewedAt: updated.reviewedAt,
        createdAt: updated.createdAt,
      },
      message:
        body.status === 'accepted'
          ? 'Accepted — this row now counts as ground truth. Recompute the metrics to see it reflected.'
          : 'Rejected — the model’s original label stands as truth for this row.',
    });
  } catch (error) {
    console.error('[admin/feedback]', error);
    return Response.json(
      { error: 'Could not update that feedback item.' },
      { status: 500 }
    );
  }
}
