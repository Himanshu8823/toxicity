import { z } from 'zod';
import { analyseSingle } from '@/lib/analysis/pipeline';
import { getSessionUser } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { usageEvents } from '@/lib/db/schema';

/**
 * `POST /api/analyze/text` — score one piece of text.
 *
 * Open to signed-out visitors on purpose: the playground is how someone
 * decides whether the tool is worth signing up for, and putting it behind a
 * login removes the only way to try it. Usage is recorded when there is a user
 * to record it against.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const bodySchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Enter some text to analyse.')
    // Long enough for any real comment; short enough to bound a model call.
    .max(5000, 'That text is too long — 5000 characters is the limit.'),
  skipEnrichment: z.boolean().default(false),
});

export async function POST(request: Request) {
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

  try {
    const result = await analyseSingle(body.text, {
      skipEnrichment: body.skipEnrichment,
    });

    if (result.error) {
      return Response.json(
        { error: 'The model could not score that text.', details: result.error },
        { status: 502 }
      );
    }

    const user = await getSessionUser();
    if (user) {
      await db
        .insert(usageEvents)
        .values({ userId: user.id, kind: 'playground', units: 1 });
    }

    return Response.json({
      text: result.text,
      language: result.language,
      languageConfidence: result.languageConfidence,
      isCodeMixed: result.isCodeMixed,
      category: result.category,
      severity: result.severity,
      confidence: result.confidence,
      harmful: result.harmful,
      isSarcastic: result.isSarcastic,
      rationale: result.rationale,
      modelName: result.modelName,
      rawScores: result.rawScores,
      modelsDisagree: result.modelsDisagree,
    });
  } catch (error) {
    console.error('[analyze/text]', error);
    return Response.json(
      {
        error: 'The analysis failed.',
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
