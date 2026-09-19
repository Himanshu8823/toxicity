import { z } from 'zod';
import { requireAdminApi } from '@/lib/auth/guards';
import { clientIp, recordAudit } from '@/lib/admin/audit';
import {
  getEvaluationReport,
  snapshotModelMetrics,
  type MetricsRange,
} from '@/lib/db/queries/metrics';

/**
 * `POST /api/admin/metrics/recompute` — freeze the current evaluation into
 * `model_metrics`.
 *
 * Deliberately manual rather than on a schedule. A snapshot is a claim about
 * the model made on a date, over a stated sample, and it is worth more when a
 * person decided the sample was large enough to be worth quoting than when a
 * cron job wrote a row over a weekend with four labels in it.
 */

export const runtime = 'nodejs';

/**
 * The whole labelled sample is read and scored in memory before anything is
 * written, and that work grows with the feedback table. 120s is the ceiling
 * rather than the expectation — a timeout here writes nothing, so the worst
 * case is a wasted click, not a half-written snapshot.
 */
export const maxDuration = 120;

/**
 * Dates arrive as ISO strings over JSON.
 *
 * Written as one string rule plus a refinement rather than a union of the
 * date-only and date-time forms: a failing union reports itself as "Invalid
 * input", and a period is the one thing about a snapshot that must not be
 * guessed at, so the caller gets told exactly what was wrong with theirs.
 */
const isoDate = z
  .string()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(value) &&
      !Number.isNaN(new Date(value).getTime()),
    {
      message:
        'Use an ISO date such as 2026-01-31, or a full timestamp such as 2026-01-31T00:00:00Z.',
    }
  )
  .transform((value) => new Date(value));

const bodySchema = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: 'The `from` date must not be after the `to` date.',
    path: ['from'],
  });

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const { user: admin } = auth;

  /**
   * The body is optional in full: an empty POST means "everything reviewed so
   * far", which is the usual case. A missing or unparseable body is therefore
   * treated as `{}` rather than as an error — but a body that is present and
   * malformed still has to fail loudly, or a typo'd date would silently widen
   * the period to all time.
   */
  let raw: unknown = {};
  try {
    const text = await request.text();
    if (text.trim().length > 0) raw = JSON.parse(text);
  } catch {
    return Response.json(
      { error: 'Body must be JSON, or omitted entirely to cover all time.' },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid date range.' },
      { status: 400 }
    );
  }

  const range: MetricsRange = { from: parsed.data.from, to: parsed.data.to };

  try {
    /**
     * The report is computed alongside the snapshot so the response can say how
     * much evidence the written rows rest on. `snapshotModelMetrics` builds the
     * same report internally; running it twice costs one extra read of the
     * labelled sample, which is cheap next to returning a row count with no
     * indication of whether it means anything.
     */
    const [result, report] = await Promise.all([
      snapshotModelMetrics(range),
      getEvaluationReport(range),
    ]);

    await recordAudit({
      actorId: admin.id,
      action: 'metrics.recomputed',
      entity: 'model_metrics',
      entityId: null,
      metadata: {
        written: result.written,
        periodStart: result.periodStart.toISOString(),
        periodEnd: result.periodEnd.toISOString(),
        sampleSize: report.sampleSize,
        pendingReview: report.pendingReview,
        requestedFrom: range.from?.toISOString() ?? null,
        requestedTo: range.to?.toISOString() ?? null,
      },
      ip: await clientIp(),
    });

    return Response.json({
      written: result.written,
      periodStart: result.periodStart,
      periodEnd: result.periodEnd,
      sampleSize: report.sampleSize,
      pendingReview: report.pendingReview,
      models: report.byModel.map((slice) => ({
        modelName: slice.modelName,
        sampleSize: slice.sampleSize,
        precision: slice.binaryPrecision,
        recall: slice.binaryRecall,
        f1: slice.binaryF1,
      })),
      message:
        result.written === 0
          ? 'Nothing to snapshot — no reviewed feedback falls in that period. Triage some of the open queue first.'
          : `Wrote ${result.written} snapshot ${result.written === 1 ? 'row' : 'rows'} from ${report.sampleSize} reviewed ${report.sampleSize === 1 ? 'label' : 'labels'}.`,
    });
  } catch (error) {
    console.error('[admin/metrics/recompute]', error);
    return Response.json(
      { error: 'Could not recompute the metrics. Nothing was written.' },
      { status: 500 }
    );
  }
}
