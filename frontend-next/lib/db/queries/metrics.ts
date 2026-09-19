import 'server-only';

import { and, count, desc, eq, sql, type SQL } from 'drizzle-orm';
import { db } from '../client';
import {
  commentAnalyses,
  comments,
  feedback,
  modelMetrics,
  type NewModelMetric,
  type Severity,
  type ToxicityCategory,
} from '../schema';
import { dateRangeFilter } from './admin';
import {
  BINARY_LABELS,
  averagedScores,
  binaryCounts,
  confusionMatrix,
  labelScores,
  rocAuc,
  toBinary,
  type AveragedScores,
  type ConfusionMatrix,
  type LabelScores,
  type Observation,
  type RocResult,
} from '@/lib/metrics/confusion';
import { CATEGORIES, isHarmful } from '@/lib/analysis/taxonomy';

/**
 * The evaluation queries.
 *
 * These pull labelled rows out of the database and hand them to the pure
 * functions in `lib/metrics/confusion.ts`. No arithmetic happens here — the
 * split is deliberate, so the metrics can be tested on fixtures without a
 * database and the SQL can be read without following the maths.
 *
 * Ground truth comes from reviewed `feedback`:
 *  - accepted + incorrect  → truth is the user's correction
 *  - accepted + correct    → truth is the model's own label, confirmed
 *  - rejected              → the reviewer sided with the model, so truth is
 *                            the model's label
 *  - open                  → not yet truth; excluded entirely
 *
 * That last exclusion matters. Scoring against unreviewed complaints would
 * measure how annoyed users are, not how accurate the model is.
 */

// ─── Labelled sample ─────────────────────────────────────────────────────────

/** One reviewed row: what the model said, what the human settled on. */
export interface LabelledRow {
  feedbackId: string;
  analysisId: string;
  modelName: string;
  modelVersion: string | null;
  language: string | null;
  predictedCategory: ToxicityCategory;
  predictedSeverity: Severity;
  confidence: number;
  actualCategory: ToxicityCategory;
  actualSeverity: Severity;
  commentText: string;
  commentAuthor: string | null;
  rationale: string | null;
  modelsDisagree: boolean;
  reviewedAt: Date | null;
  createdAt: Date;
}

export interface MetricsRange {
  from?: Date;
  to?: Date;
}

/**
 * Every reviewed feedback row, resolved to a (predicted, actual) pair.
 *
 * `coalesce(corrected_category, category)` is the whole trick: when a reviewer
 * accepted a correction the corrected label wins, and in every other reviewed
 * case the model's own label stands. Done in SQL so the fallback cannot drift
 * between call sites.
 */
export async function getLabelledSample(
  range: MetricsRange = {}
): Promise<LabelledRow[]> {
  const clauses: SQL[] = [
    sql`f.status in ('accepted', 'rejected')`,
  ];
  if (range.from) clauses.push(sql`f.created_at >= ${range.from}`);
  if (range.to) clauses.push(sql`f.created_at <= ${range.to}`);

  const rows = await db.execute<{
    feedback_id: string;
    analysis_id: string;
    model_name: string;
    model_version: string | null;
    language: string | null;
    predicted_category: ToxicityCategory;
    predicted_severity: Severity;
    confidence: number;
    actual_category: ToxicityCategory;
    actual_severity: Severity;
    comment_text: string;
    comment_author: string | null;
    rationale: string | null;
    models_disagree: boolean;
    reviewed_at: string | null;
    created_at: string;
  }>(sql`
    select
      f.id as feedback_id,
      ca.id as analysis_id,
      ca.model_name,
      ca.model_version,
      ca.language,
      ca.category as predicted_category,
      ca.severity as predicted_severity,
      ca.confidence,
      case
        when f.status = 'accepted' and f.verdict = 'incorrect'
          then coalesce(f.corrected_category, ca.category)
        else ca.category
      end as actual_category,
      case
        when f.status = 'accepted' and f.verdict = 'incorrect'
          then coalesce(f.corrected_severity, ca.severity)
        else ca.severity
      end as actual_severity,
      c.text as comment_text,
      c.author_name as comment_author,
      ca.rationale,
      ca.models_disagree,
      f.reviewed_at,
      f.created_at
    from ${feedback} f
    join ${commentAnalyses} ca on ca.id = f.comment_analysis_id
    join ${comments} c on c.id = ca.comment_id
    where ${sql.join(clauses, sql` and `)}
    order by f.created_at desc
  `);

  return [...rows].map((r) => ({
    feedbackId: r.feedback_id,
    analysisId: r.analysis_id,
    modelName: r.model_name,
    modelVersion: r.model_version,
    language: r.language,
    predictedCategory: r.predicted_category,
    predictedSeverity: r.predicted_severity,
    confidence: Number(r.confidence),
    actualCategory: r.actual_category,
    actualSeverity: r.actual_severity,
    commentText: r.comment_text,
    commentAuthor: r.comment_author,
    rationale: r.rationale,
    modelsDisagree: r.models_disagree,
    reviewedAt: r.reviewed_at ? new Date(r.reviewed_at) : null,
    createdAt: new Date(r.created_at),
  }));
}

// ─── Evaluation shapes ───────────────────────────────────────────────────────

/** A model/language slice with every figure the page renders for it. */
export interface EvaluationSlice {
  modelName: string;
  /** `null` means "all languages pooled" for this model. */
  language: string | null;
  sampleSize: number;
  /** Nine-class matrix over the full taxonomy. */
  categoryMatrix: ConfusionMatrix<ToxicityCategory>;
  categoryScores: LabelScores[];
  categoryAverages: AveragedScores;
  /** The harmful-vs-clean reduction — the decision moderation actually makes. */
  binaryMatrix: ConfusionMatrix<'harmful' | 'clean'>;
  binaryCounts: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
  };
  binaryPrecision: number;
  binaryRecall: number;
  binaryF1: number;
  roc: RocResult;
}

function buildSlice(
  modelName: string,
  language: string | null,
  rows: readonly LabelledRow[]
): EvaluationSlice {
  const observations: Observation<ToxicityCategory>[] = rows.map((r) => ({
    predicted: r.predictedCategory,
    actual: r.actualCategory,
    score: r.confidence,
  }));

  const categoryMatrix = confusionMatrix(observations, CATEGORIES);
  const binary = toBinary(observations, (label) => isHarmful(label));
  const binaryMatrix = confusionMatrix(binary, BINARY_LABELS);
  const counts = binaryCounts(binaryMatrix, 'harmful');
  const scores = labelScores(binaryMatrix).find((s) => s.label === 'harmful');

  /**
   * ROC needs a score for the *positive* class. The stored confidence is the
   * model's confidence in whatever it predicted, so for a clean prediction it
   * has to be flipped — a 0.95-confident "clean" is a 0.05 harmful score.
   */
  const rocSamples = rows.map((r) => ({
    score: isHarmful(r.predictedCategory) ? r.confidence : 1 - r.confidence,
    positive: isHarmful(r.actualCategory),
  }));

  return {
    modelName,
    language,
    sampleSize: rows.length,
    categoryMatrix,
    categoryScores: labelScores(categoryMatrix),
    categoryAverages: averagedScores(categoryMatrix),
    binaryMatrix,
    binaryCounts: counts,
    binaryPrecision: scores?.precision ?? 0,
    binaryRecall: scores?.recall ?? 0,
    binaryF1: scores?.f1 ?? 0,
    roc: rocAuc(rocSamples),
  };
}

export interface EvaluationReport {
  /** Everything pooled — the headline figure. */
  overall: EvaluationSlice;
  /** One slice per model, languages pooled. */
  byModel: EvaluationSlice[];
  /** One slice per (model, language) pair with enough rows to mean anything. */
  byModelLanguage: EvaluationSlice[];
  falsePositives: LabelledRow[];
  falseNegatives: LabelledRow[];
  sampleSize: number;
  /** Feedback still awaiting review — context for how provisional the numbers are. */
  pendingReview: number;
}

/**
 * Minimum rows before a (model, language) slice is reported.
 *
 * Below this the figures swing wildly on a single row and invite exactly the
 * over-reading they cannot support. Slices under the floor are still counted
 * in the pooled numbers; they just do not get their own confident-looking
 * table.
 */
export const MIN_SLICE_SIZE = 5;

/** Assembles the whole metrics page from one pass over the labelled sample. */
export async function getEvaluationReport(
  range: MetricsRange = {}
): Promise<EvaluationReport> {
  const [rows, pendingRow] = await Promise.all([
    getLabelledSample(range),
    db
      .select({ value: count() })
      .from(feedback)
      .where(eq(feedback.status, 'open')),
  ]);

  const byModel = new Map<string, LabelledRow[]>();
  const byModelLanguage = new Map<string, LabelledRow[]>();

  for (const row of rows) {
    const modelKey = row.modelName;
    const langKey = `${row.modelName}\u0000${row.language ?? 'unknown'}`;

    const modelBucket = byModel.get(modelKey);
    if (modelBucket) modelBucket.push(row);
    else byModel.set(modelKey, [row]);

    const langBucket = byModelLanguage.get(langKey);
    if (langBucket) langBucket.push(row);
    else byModelLanguage.set(langKey, [row]);
  }

  // A false positive is the model crying wolf: it called something harmful
  // that a human confirmed was clean. A false negative is the opposite, and is
  // the more costly of the two for a moderation tool.
  const falsePositives = rows.filter(
    (r) => isHarmful(r.predictedCategory) && !isHarmful(r.actualCategory)
  );
  const falseNegatives = rows.filter(
    (r) => !isHarmful(r.predictedCategory) && isHarmful(r.actualCategory)
  );

  return {
    overall: buildSlice('all models', null, rows),
    byModel: [...byModel.entries()]
      .map(([model, bucket]) => buildSlice(model, null, bucket))
      .sort((a, b) => b.sampleSize - a.sampleSize),
    byModelLanguage: [...byModelLanguage.entries()]
      .map(([key, bucket]) => {
        const [model, language] = key.split('\u0000');
        return buildSlice(model, language === 'unknown' ? null : language, bucket);
      })
      .filter((s) => s.sampleSize >= MIN_SLICE_SIZE)
      .sort((a, b) => b.sampleSize - a.sampleSize),
    falsePositives,
    falseNegatives,
    sampleSize: rows.length,
    pendingReview: pendingRow[0]?.value ?? 0,
  };
}

// ─── Model disagreement ──────────────────────────────────────────────────────

export interface DisagreementRow {
  language: string | null;
  modelName: string;
  total: number;
  disagreements: number;
  rate: number;
  /** How confident the classifier was on the rows where Groq contradicted it. */
  avgConfidenceWhenDisagreeing: number;
}

/**
 * How often the classifier and Groq reached different verdicts, split by
 * language and model.
 *
 * This needs no human labels at all, so it covers the whole corpus rather than
 * the reviewed sliver — which makes it the most statistically solid figure on
 * the page. A high rate in one language is a genuine finding: it means the two
 * models are reading that language differently, and at least one of them is
 * reading it wrong.
 */
export async function getDisagreementByLanguage(
  range: MetricsRange = {}
): Promise<DisagreementRow[]> {
  const filter = dateRangeFilter(commentAnalyses.createdAt, range.from, range.to);

  const rows = await db
    .select({
      language: commentAnalyses.language,
      modelName: commentAnalyses.modelName,
      total: count(),
      disagreements: sql<number>`count(*) filter (where ${commentAnalyses.modelsDisagree})::int`,
      avgConfidenceWhenDisagreeing: sql<number>`coalesce(avg(${commentAnalyses.confidence}) filter (where ${commentAnalyses.modelsDisagree}), 0)::float`,
    })
    .from(commentAnalyses)
    .where(filter)
    .groupBy(commentAnalyses.language, commentAnalyses.modelName)
    .orderBy(desc(count()));

  return rows.map((r) => ({
    language: r.language,
    modelName: r.modelName,
    total: r.total,
    disagreements: r.disagreements,
    rate: r.total === 0 ? 0 : r.disagreements / r.total,
    avgConfidenceWhenDisagreeing: Number(r.avgConfidenceWhenDisagreeing),
  }));
}

/** A handful of disagreements with the text, so the rate has faces attached. */
export async function getDisagreementExamples(limit = 8, range: MetricsRange = {}) {
  const clauses: SQL[] = [eq(commentAnalyses.modelsDisagree, true)];
  const filter = dateRangeFilter(commentAnalyses.createdAt, range.from, range.to);
  if (filter) clauses.push(filter);

  return db
    .select({
      id: commentAnalyses.id,
      text: comments.text,
      language: commentAnalyses.language,
      category: commentAnalyses.category,
      severity: commentAnalyses.severity,
      confidence: commentAnalyses.confidence,
      modelName: commentAnalyses.modelName,
      rationale: commentAnalyses.rationale,
      isSarcastic: commentAnalyses.isSarcastic,
    })
    .from(commentAnalyses)
    .innerJoin(comments, eq(comments.id, commentAnalyses.commentId))
    .where(and(...clauses))
    .orderBy(desc(commentAnalyses.confidence))
    .limit(limit);
}

// ─── Snapshots ───────────────────────────────────────────────────────────────

/**
 * Freezes the current evaluation into `model_metrics`.
 *
 * Two reasons to store what could be recomputed: the page stays fast as the
 * feedback table grows, and a dated snapshot lets a write-up say "as of this
 * date, on this many labels" instead of quoting a number that silently moves.
 */
export async function snapshotModelMetrics(
  range: MetricsRange = {}
): Promise<{ written: number; periodStart: Date; periodEnd: Date }> {
  const report = await getEvaluationReport(range);

  const periodStart = range.from ?? earliestOf(report) ?? new Date();
  const periodEnd = range.to ?? new Date();

  // Per (model, language) plus a pooled row per model, so a later query can ask
  // either question without recomputing.
  const slices = [...report.byModel, ...report.byModelLanguage];

  const values: NewModelMetric[] = slices
    .filter((s) => s.sampleSize > 0)
    .map((s) => ({
      modelName: s.modelName,
      language: s.language,
      periodStart,
      periodEnd,
      truePositives: s.binaryCounts.truePositives,
      falsePositives: s.binaryCounts.falsePositives,
      trueNegatives: s.binaryCounts.trueNegatives,
      falseNegatives: s.binaryCounts.falseNegatives,
      // numeric(5,4) columns take strings: passing a float would round-trip
      // through a JS double and lose the exactness the column type buys.
      precision: s.binaryPrecision.toFixed(4),
      recall: s.binaryRecall.toFixed(4),
      f1: s.binaryF1.toFixed(4),
      rocAuc: s.roc.computable ? s.roc.auc.toFixed(4) : null,
      sampleSize: s.sampleSize,
    }));

  if (values.length === 0) {
    return { written: 0, periodStart, periodEnd };
  }

  await db.insert(modelMetrics).values(values);

  return { written: values.length, periodStart, periodEnd };
}

function earliestOf(report: EvaluationReport): Date | null {
  let earliest: Date | null = null;
  for (const row of [...report.falsePositives, ...report.falseNegatives]) {
    if (!earliest || row.createdAt < earliest) earliest = row.createdAt;
  }
  return earliest;
}

/** The most recent snapshots, newest first — the history behind the live figures. */
export async function listMetricSnapshots(limit = 20) {
  return db
    .select()
    .from(modelMetrics)
    .orderBy(desc(modelMetrics.computedAt))
    .limit(limit);
}
