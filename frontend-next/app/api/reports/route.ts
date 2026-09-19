import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { requireUserApi } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { commentAnalyses, comments, reports, scans, usageEvents } from '@/lib/db/schema';
import { buildCsv, buildJson, type ReportData } from '@/lib/reports/builders';
import { buildPdf } from '@/lib/reports/pdf';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * `POST /api/reports` — generate a report for one of the user's scans.
 *
 * The file is built here and uploaded to the private `reports` bucket; the
 * download route hands out a short-lived signed URL. Generating is a one-off
 * cost and reports are re-downloaded far more often than they are made, so
 * storing beats rebuilding on every request.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const bodySchema = z.object({
  scanId: z.string().uuid('Not a valid scan id.'),
  format: z.enum(['pdf', 'csv', 'json']).default('pdf'),
  title: z.string().trim().max(200).optional(),
});

const CONTENT_TYPE: Record<string, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

const EXTENSION: Record<string, string> = {
  pdf: 'pdf',
  csv: 'csv',
  json: 'json',
};

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

  const [scan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.id, body.scanId), eq(scans.userId, user.id)))
    .limit(1);

  if (!scan) {
    return Response.json({ error: 'Scan not found.' }, { status: 404 });
  }

  if (scan.status !== 'complete') {
    return Response.json(
      { error: 'That scan has not finished, so there is nothing to report on yet.' },
      { status: 409 }
    );
  }

  const [report] = await db
    .insert(reports)
    .values({
      userId: user.id,
      scanId: scan.id,
      format: body.format,
      title: body.title ?? scan.videoTitle ?? 'ToxiScan report',
      status: 'pending',
    })
    .returning();

  try {
    const rows = await db
      .select({ comment: comments, analysis: commentAnalyses })
      .from(comments)
      .leftJoin(commentAnalyses, eq(commentAnalyses.commentId, comments.id))
      .where(eq(comments.scanId, scan.id))
      .orderBy(desc(commentAnalyses.confidence));

    const data: ReportData = {
      scan,
      rows,
      generatedAt: new Date(),
      generatedFor: user.profile.fullName ?? user.email,
    };

    const contents =
      body.format === 'csv'
        ? Buffer.from(buildCsv(data), 'utf-8')
        : body.format === 'json'
          ? Buffer.from(buildJson(data), 'utf-8')
          : await buildPdf(data);

    const path = `${user.id}/${report.id}.${EXTENSION[body.format]}`;

    // Service role: the upload is on the user's behalf but runs server-side,
    // where there is no user JWT for the storage policy to check.
    const storage = createAdminClient().storage.from('reports');

    const { error: uploadError } = await storage.upload(path, contents, {
      contentType: CONTENT_TYPE[body.format],
      upsert: true,
    });

    if (uploadError) throw new Error(uploadError.message);

    const size = contents.length;

    const [ready] = await db
      .update(reports)
      .set({ status: 'ready', storagePath: path, fileSize: size })
      .where(eq(reports.id, report.id))
      .returning();

    await db
      .insert(usageEvents)
      .values({ userId: user.id, kind: 'report', scanId: scan.id, units: 1 });

    return Response.json({
      id: ready.id,
      format: ready.format,
      status: ready.status,
      fileSize: ready.fileSize,
      downloadUrl: `/api/reports/${ready.id}/download`,
    });
  } catch (error) {
    console.error('[reports]', error);

    await db
      .update(reports)
      .set({
        status: 'failed',
        errorMessage:
          error instanceof Error ? error.message.slice(0, 500) : 'Unknown error',
      })
      .where(eq(reports.id, report.id));

    return Response.json(
      { error: 'Could not generate that report.' },
      { status: 500 }
    );
  }
}

/** `GET /api/reports` — the user's reports, newest first. */
export async function GET() {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const rows = await db
    .select({
      id: reports.id,
      format: reports.format,
      status: reports.status,
      title: reports.title,
      fileSize: reports.fileSize,
      createdAt: reports.createdAt,
      scanId: reports.scanId,
      videoTitle: scans.videoTitle,
      videoId: scans.videoId,
    })
    .from(reports)
    .innerJoin(scans, eq(scans.id, reports.scanId))
    .where(eq(reports.userId, auth.user.id))
    .orderBy(desc(reports.createdAt))
    .limit(100);

  return Response.json({ reports: rows });
}
