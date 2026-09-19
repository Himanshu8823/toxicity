/**
 * Classification metrics, computed from nothing but arrays.
 *
 * Deliberately free of database access and of any import from `lib/db`. An
 * examiner should be able to read this file, check the arithmetic against the
 * textbook definitions, and run it on hand-written fixtures — that is only
 * possible if the numbers arriving here are plain data.
 *
 * The ground truth is human: a user flags a prediction as wrong, an admin
 * accepts the correction, and the accepted correction is what we score the
 * model against. Rejected feedback means the model was right, so the model's
 * own label stands as truth for that row.
 */

/**
 * One scored observation. `predicted` is what the model said, `actual` is what
 * the human review settled on, and `score` is the model's confidence in its own
 * prediction — needed for ROC-AUC and nothing else.
 */
export interface Observation<L extends string = string> {
  predicted: L;
  actual: L;
  /** Model confidence, 0–1. Optional: not every row carries a usable score. */
  score?: number;
}

/**
 * A square matrix indexed by label, laid out `matrix[actual][predicted]` —
 * rows are truth, columns are prediction, which is the convention every paper
 * on the subject uses. Reading across a row shows where one true class leaked;
 * reading down a column shows what a predicted class was really made of.
 */
export interface ConfusionMatrix<L extends string = string> {
  labels: readonly L[];
  /** `matrix[i][j]` = count of items whose truth is `labels[i]`, predicted `labels[j]`. */
  matrix: number[][];
  total: number;
}

/**
 * Builds the matrix over an explicit label set.
 *
 * The label set is passed in rather than derived from the data so that a class
 * with zero observations still gets a row — an empty row is a finding, and
 * silently dropping it would make the matrix look better than it is.
 */
export function confusionMatrix<L extends string>(
  observations: readonly Observation<L>[],
  labels: readonly L[]
): ConfusionMatrix<L> {
  const index = new Map<L, number>(labels.map((l, i) => [l, i]));
  const matrix: number[][] = labels.map(() => labels.map(() => 0));

  let total = 0;
  for (const o of observations) {
    const row = index.get(o.actual);
    const col = index.get(o.predicted);
    // A label outside the declared set is dropped rather than coerced: putting
    // it in the wrong cell would corrupt every figure derived from the matrix.
    if (row === undefined || col === undefined) continue;
    matrix[row][col] += 1;
    total += 1;
  }

  return { labels, matrix, total };
}

/**
 * The four counts for one label, treating it as the positive class and every
 * other label as negative. This is the one-vs-rest reduction that makes
 * precision and recall meaningful on a multi-class problem.
 */
export interface BinaryCounts {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

export function binaryCounts<L extends string>(
  cm: ConfusionMatrix<L>,
  label: L
): BinaryCounts {
  const i = cm.labels.indexOf(label);
  if (i < 0) {
    return {
      truePositives: 0,
      falsePositives: 0,
      trueNegatives: 0,
      falseNegatives: 0,
    };
  }

  const truePositives = cm.matrix[i][i];

  // Column i minus the diagonal: predicted this label, was something else.
  let falsePositives = 0;
  for (let r = 0; r < cm.labels.length; r += 1) {
    if (r !== i) falsePositives += cm.matrix[r][i];
  }

  // Row i minus the diagonal: really this label, predicted something else.
  let falseNegatives = 0;
  for (let c = 0; c < cm.labels.length; c += 1) {
    if (c !== i) falseNegatives += cm.matrix[i][c];
  }

  const trueNegatives =
    cm.total - truePositives - falsePositives - falseNegatives;

  return { truePositives, falsePositives, trueNegatives, falseNegatives };
}

/**
 * Precision = TP / (TP + FP). Of everything the model flagged, how much
 * deserved it. Returns 0 when the model never predicted the class at all —
 * the alternative, NaN, propagates into every average downstream.
 */
export function precision(counts: BinaryCounts): number {
  const denominator = counts.truePositives + counts.falsePositives;
  return denominator === 0 ? 0 : counts.truePositives / denominator;
}

/** Recall = TP / (TP + FN). Of everything that deserved flagging, how much was caught. */
export function recall(counts: BinaryCounts): number {
  const denominator = counts.truePositives + counts.falseNegatives;
  return denominator === 0 ? 0 : counts.truePositives / denominator;
}

/**
 * F1 = 2PR / (P + R), the harmonic mean. Harmonic rather than arithmetic
 * because it refuses to be rescued by one strong half: a model with perfect
 * recall and near-zero precision scores near zero, which is the honest answer.
 */
export function f1(counts: BinaryCounts): number {
  const p = precision(counts);
  const r = recall(counts);
  return p + r === 0 ? 0 : (2 * p * r) / (p + r);
}

/** Accuracy over the whole matrix: the diagonal over the total. */
export function accuracy<L extends string>(cm: ConfusionMatrix<L>): number {
  if (cm.total === 0) return 0;
  let correct = 0;
  for (let i = 0; i < cm.labels.length; i += 1) correct += cm.matrix[i][i];
  return correct / cm.total;
}

export interface LabelScores extends BinaryCounts {
  label: string;
  precision: number;
  recall: number;
  f1: number;
  /** Rows whose truth is this label — the weight it carries in a macro/weighted average. */
  support: number;
}

/** Per-label precision/recall/F1 with support, i.e. a classification report. */
export function labelScores<L extends string>(
  cm: ConfusionMatrix<L>
): LabelScores[] {
  return cm.labels.map((label) => {
    const counts = binaryCounts(cm, label);
    return {
      label,
      ...counts,
      precision: precision(counts),
      recall: recall(counts),
      f1: f1(counts),
      support: counts.truePositives + counts.falseNegatives,
    };
  });
}

export interface AveragedScores {
  /** Unweighted mean across labels — every class counts the same. */
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  /** Mean weighted by support — dominated by whichever class is commonest. */
  weightedPrecision: number;
  weightedRecall: number;
  weightedF1: number;
  accuracy: number;
  support: number;
}

/**
 * Both averages, because they answer different questions and an examiner will
 * ask about the gap between them. A wide gap means the model is carried by the
 * majority class and fails on the rare ones — which, for toxicity, is exactly
 * the failure that matters.
 */
export function averagedScores<L extends string>(
  cm: ConfusionMatrix<L>
): AveragedScores {
  const scores = labelScores(cm);
  const n = scores.length || 1;
  const totalSupport = scores.reduce((sum, s) => sum + s.support, 0);

  const macroPrecision = scores.reduce((s, x) => s + x.precision, 0) / n;
  const macroRecall = scores.reduce((s, x) => s + x.recall, 0) / n;
  const macroF1 = scores.reduce((s, x) => s + x.f1, 0) / n;

  const weight = (pick: (s: LabelScores) => number): number =>
    totalSupport === 0
      ? 0
      : scores.reduce((sum, s) => sum + pick(s) * s.support, 0) / totalSupport;

  return {
    macroPrecision,
    macroRecall,
    macroF1,
    weightedPrecision: weight((s) => s.precision),
    weightedRecall: weight((s) => s.recall),
    weightedF1: weight((s) => s.f1),
    accuracy: accuracy(cm),
    support: totalSupport,
  };
}

// ─── ROC-AUC ─────────────────────────────────────────────────────────────────

/** One point on the curve, kept so the page can plot it rather than just state the area. */
export interface RocPoint {
  falsePositiveRate: number;
  truePositiveRate: number;
  threshold: number;
}

export interface RocResult {
  auc: number;
  points: RocPoint[];
  positives: number;
  negatives: number;
  /** False when one class is missing — AUC is undefined there, not zero. */
  computable: boolean;
}

/**
 * ROC-AUC by the rank-sum (Mann–Whitney U) identity, which is exact and needs
 * no threshold sweep:
 *
 *   AUC = (sum of ranks of positives − n₊(n₊+1)/2) / (n₊ · n₋)
 *
 * It equals the probability that a randomly chosen positive is scored above a
 * randomly chosen negative. Tied scores share their average rank, so a model
 * that outputs one constant confidence scores exactly 0.5 rather than
 * accidentally looking perfect.
 *
 * The curve points are swept separately, only so the page has something to draw.
 */
export function rocAuc(
  samples: readonly { score: number; positive: boolean }[]
): RocResult {
  const usable = samples.filter((s) => Number.isFinite(s.score));
  const positives = usable.filter((s) => s.positive).length;
  const negatives = usable.length - positives;

  if (positives === 0 || negatives === 0) {
    return { auc: 0, points: [], positives, negatives, computable: false };
  }

  const sorted = [...usable].sort((a, b) => a.score - b.score);

  // Average ranks within each block of tied scores.
  const ranks = new Array<number>(sorted.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].score === sorted[i].score) j += 1;
    const averageRank = (i + 1 + (j + 1)) / 2;
    for (let k = i; k <= j; k += 1) ranks[k] = averageRank;
    i = j + 1;
  }

  let positiveRankSum = 0;
  for (let k = 0; k < sorted.length; k += 1) {
    if (sorted[k].positive) positiveRankSum += ranks[k];
  }

  const auc =
    (positiveRankSum - (positives * (positives + 1)) / 2) /
    (positives * negatives);

  return {
    auc,
    points: rocCurve(usable, positives, negatives),
    positives,
    negatives,
    computable: true,
  };
}

/**
 * The curve itself, swept from the highest threshold down. Kept private: the
 * area comes from the rank sum above, which is exact, so this exists purely
 * for the plot.
 */
function rocCurve(
  samples: readonly { score: number; positive: boolean }[],
  positives: number,
  negatives: number
): RocPoint[] {
  const descending = [...samples].sort((a, b) => b.score - a.score);
  const points: RocPoint[] = [
    { falsePositiveRate: 0, truePositiveRate: 0, threshold: Infinity },
  ];

  let tp = 0;
  let fp = 0;
  for (let k = 0; k < descending.length; k += 1) {
    if (descending[k].positive) tp += 1;
    else fp += 1;

    // Emit only at the end of a run of equal scores: a threshold cannot split
    // two items the model scored identically.
    const isLast = k === descending.length - 1;
    if (isLast || descending[k + 1].score !== descending[k].score) {
      points.push({
        falsePositiveRate: fp / negatives,
        truePositiveRate: tp / positives,
        threshold: descending[k].score,
      });
    }
  }

  return points;
}

// ─── Harmful / clean reduction ───────────────────────────────────────────────

/**
 * Collapses the nine-category problem to the binary one that moderation
 * actually acts on: is this comment harmful or not.
 *
 * Worth reporting alongside the full matrix. A model can shuffle `insult` and
 * `harassment` between themselves all day without changing whether a comment
 * gets hidden, and the binary view is what an examiner asking "does it work"
 * is really asking about.
 */
export type BinaryLabel = 'harmful' | 'clean';

export const BINARY_LABELS: readonly BinaryLabel[] = ['harmful', 'clean'] as const;

export function toBinary<L extends string>(
  observations: readonly Observation<L>[],
  isPositive: (label: L) => boolean
): Observation<BinaryLabel>[] {
  return observations.map((o) => ({
    predicted: isPositive(o.predicted) ? 'harmful' : 'clean',
    actual: isPositive(o.actual) ? 'harmful' : 'clean',
    score: o.score,
  }));
}

/** Formats a 0–1 metric for display, or an em dash when it is not defined. */
export function formatMetric(value: number | null, decimals = 3): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return value.toFixed(decimals);
}
