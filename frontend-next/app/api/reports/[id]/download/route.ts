import { and, eq } from 'drizzle-orm';
import { requireUserApi } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { reports } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * `GET /api/reports/[id]/download` — hand back a generated report.
 *
 * The bucket is private, so the file is streamed through here rather than
 * linked to directly. Ownership is checked against the session, never against
 * anything in the URL: the report id alone must not be enough to read someone
 * else's analysis.
 */

export const runtime = 'nodejs';

const DISPOSITION_TYPE: Record<string, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

const EXTENSION: Record<string, string> = {
  pdf: 'pdf',
  csv: 'csv',
  json: 'json',
};

/** A filename that is safe on every filesystem. */
function safeFilename(title: string, extension: string): string {
  const base =
    title
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'toxiscan-report';

  return `${base}.${extension}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const { id } = await params;

  const [report] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.userId, auth.user.id)))
    .limit(1);

  if (!report) {
    return Response.json({ error: 'Report not found.' }, { status: 404 });
  }

  if (report.status !== 'ready' || !report.storagePath) {
    return Response.json(
      {
        error:
          report.status === 'failed'
            ? 'That report failed to generate. Try generating it again.'
            : 'That report is still being generated.',
      },
      { status: 409 }
    );
  }

  const storage = createAdminClient().storage.from('reports');
  const { data, error } = await storage.download(report.storagePath);

  if (error || !data) {
    console.error('[reports/download]', error);
    return Response.json(
      { error: 'The report file could not be retrieved.' },
      { status: 500 }
    );
  }

  const extension = EXTENSION[report.format] ?? 'txt';
  const filename = safeFilename(report.title ?? 'toxiscan-report', extension);

  return new Response(data, {
    headers: {
      'Content-Type': DISPOSITION_TYPE[report.format] ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Reports are immutable once generated, but they are also private —
      // never let a shared cache hold one.
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
