import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { requireUserApi } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import {
  commentAnalyses,
  comments,
  feedback,
  scans,
  toxicityCategoryEnum,
  severityEnum,
} from '@/lib/db/schema';

/**
 * `POST /api/feedback` — a user tells us a prediction was wrong.
 *
 * The human-in-the-loop entry point. Accepted feedback becomes the ground
 * truth that `/admin/metrics` scores the models against, which is what makes
 * the precision and recall figures on that page mean anything — without it
 * they would be the model marking its own homework.
 *
 * Re-submitting updates the existing verdict rather than stacking duplicates,
 * and doing so resets it to `open` so an admin sees the revision.
 */

export const runtime = 'nodejs';

const bodySchema = z
  .object({
    commentAnalysisId: z.string().uuid('Not a valid analysis id.'),
    verdict: z.enum(['correct', 'incorrect']),
    correctedCategory: z.enum(toxicityCategoryEnum.enumValues).optional(),
    correctedSeverity: z.enum(severityEnum.enumValues).optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) =>
      data.verdict === 'correct' ||
      data.correctedCategory !== undefined ||
      data.note !== undefined,
    {
      message:
        'Tell us what it should have been, or leave a note explaining why.',
      path: ['correctedCategory'],
    }
  );

export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const { user } = auth;

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

  // Feedback is only meaningful about a prediction the user can actually see,
  // and letting anyone submit against any analysis id would let them poison
  // the ground truth for scans that are not theirs.
  const [owned] = await db
    .select({ id: commentAnalyses.id })
    .from(commentAnalyses)
    .innerJoin(comments, eq(comments.id, commentAnalyses.commentId))
    .innerJoin(scans, eq(scans.id, comments.scanId))
    .where(
      and(
        eq(commentAnalyses.id, body.commentAnalysisId),
        eq(scans.userId, user.id)
      )
    )
    .limit(1);

  if (!owned) {
    return Response.json(
      { error: 'That prediction is not part of one of your scans.' },
      { status: 404 }
    );
  }

  try {
    const [row] = await db
      .insert(feedback)
      .values({
        userId: user.id,
        commentAnalysisId: body.commentAnalysisId,
        verdict: body.verdict,
        correctedCategory: body.correctedCategory,
        correctedSeverity: body.correctedSeverity,
        note: body.note,
      })
      .onConflictDoUpdate({
        target: [feedback.userId, feedback.commentAnalysisId],
        set: {
          verdict: body.verdict,
          correctedCategory: body.correctedCategory ?? null,
          correctedSeverity: body.correctedSeverity ?? null,
          note: body.note ?? null,
          // A changed verdict needs looking at again, even if the previous one
          // had already been triaged.
          status: 'open',
          reviewedBy: null,
          reviewedAt: null,
        },
      })
      .returning();

    return Response.json({
      id: row.id,
      verdict: row.verdict,
      status: row.status,
      message:
        body.verdict === 'correct'
          ? 'Thanks — recorded.'
          : 'Thanks — this will be reviewed and used to measure the model.',
    });
  } catch (error) {
    console.error('[feedback]', error);
    return Response.json(
      { error: 'Could not record that feedback.' },
      { status: 500 }
    );
  }
}

/**
 * `GET /api/feedback?commentAnalysisId=…` — what this user already said about
 * a prediction, so the UI can show its buttons in the right state.
 */
export async function GET(request: Request) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const id = new URL(request.url).searchParams.get('commentAnalysisId');
  if (!id) {
    return Response.json(
      { error: 'commentAnalysisId is required.' },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select()
    .from(feedback)
    .where(
      and(
        eq(feedback.userId, auth.user.id),
        eq(feedback.commentAnalysisId, id)
      )
    )
    .limit(1);

  return Response.json({ feedback: existing ?? null });
}
