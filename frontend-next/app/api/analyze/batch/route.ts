import { z } from 'zod';
import { analyseComments } from '@/lib/analysis/pipeline';
import { getSessionUser } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { usageEvents } from '@/lib/db/schema';

/**
 * `POST /api/analyze/batch` — score several pieces of text at once.
 *
 * Like the single-text route, open to signed-out visitors. The ceiling of 50
 * exists so one request cannot consume the whole Groq minute-budget and starve
 * everyone else mid-scan.
 */

export const runtime = 'nodejs';
export const maxDuration = 120;

const bodySchema = z.object({
  texts: z
    .array(z.string().trim().min(1).max(5000))
    .min(1, 'Provide at least one piece of text.')
    .max(50, 'That is more than 50 texts — split the request up.'),
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
    const summary = await analyseComments(
      body.texts.map((text, i) => ({ id: String(i), text })),
      { skipEnrichment: body.skipEnrichment }
    );

    const user = await getSessionUser();
    if (user) {
      await db.insert(usageEvents).values({
        userId: user.id,
        kind: 'playground',
        units: summary.analysedCount,
      });
    }

    return Response.json({
      totalTexts: body.texts.length,
      analysed: summary.analysedCount,
      errored: summary.erroredCount,
      dominantLanguage: summary.dominantLanguage,
      categoryCounts: summary.categoryCounts,
      severityCounts: summary.severityCounts,
      languageCounts: summary.languageCounts,
      results: summary.results.map((r) => ({
        text: r.text,
        language: r.language,
        isCodeMixed: r.isCodeMixed,
        category: r.category,
        severity: r.severity,
        confidence: r.confidence,
        harmful: r.harmful,
        isSarcastic: r.isSarcastic,
        rationale: r.rationale,
        modelName: r.modelName,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error('[analyze/batch]', error);
    return Response.json(
      {
        error: 'The analysis failed.',
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
