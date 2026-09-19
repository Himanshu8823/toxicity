import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import {
  MIN_SLICE_SIZE,
  getDisagreementByLanguage,
  getDisagreementExamples,
  getEvaluationReport,
  getLabelledSample,
  listMetricSnapshots,
  type EvaluationSlice,
  type MetricsRange,
} from '@/lib/db/queries/metrics';
import { formatMetric } from '@/lib/metrics/confusion';
import type { LabelledRow } from '@/lib/db/queries/metrics';
import { CATEGORY_META, SEVERITY_META } from '@/lib/analysis/taxonomy';
import {
  ConsolePage,
  EmptyState,
  Figure,
  Panel,
  Stat,
  StatRow,
  Table,
  Tag,
  Td,
  Th,
  formatCount,
  formatDate,
  formatPercent,
} from '@/components/admin/console';
import { RocCurve } from '@/components/admin/charts';
import {
  DateFilter,
  FilterBar,
  FilterField,
  FilterReset,
  FilterSubmit,
  param,
  type SearchParams,
} from '@/components/admin/filters';
import { BinaryMatrix, CategoryMatrix } from './Matrix';
import { RecomputeButton } from './RecomputeButton';

/**
 * Model evaluation.
 *
 * The page an examiner will spend the longest on, so it is built to be argued
 * with rather than admired. Every figure states the sample it came from, every
 * formula is written out next to the number it produced, and any slice thinner
 * than `MIN_SLICE_SIZE` says so instead of printing a confident-looking decimal
 * derived from four rows.
 *
 * Ground truth is the reviewed feedback queue and nothing else — see
 * `lib/db/queries/metrics.ts` for how a review becomes a label. That makes the
 * labelled sample small and non-random, which is a real limitation and is
 * stated on the page rather than buried.
 */

/** How many concrete error examples to print per class. */
const EXAMPLE_LIMIT = 12;

export default async function AdminMetricsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  // Next 16: searchParams is a Promise and must be awaited before it is read.
  const params = await searchParams;

  const fromRaw = param(params, 'from');
  const toRaw = param(params, 'to');

  const from = parseDate(fromRaw);
  // An inclusive upper bound: a user picking today expects today's rows in,
  // and a bare date parses to midnight, which would exclude all of them.
  const to = parseDate(toRaw, true);
  const range: MetricsRange = { from, to };

  const [report, labelled, disagreement, examples, snapshots] =
    await Promise.all([
      getEvaluationReport(range),
      getLabelledSample(range),
      getDisagreementByLanguage(range),
      getDisagreementExamples(8, range),
      listMetricSnapshots(10),
    ]);

  const { overall } = report;
  const thin = report.sampleSize < MIN_SLICE_SIZE;

  // Slices that exist in the data but were filtered out of `byModelLanguage`
  // for being too thin. Naming them is the honest move: silently dropping them
  // makes the reported slices look like the whole picture.
  const thinSlices = countThinSlices(labelled);

  return (
    <ConsolePage
      title="Model evaluation"
      description="Precision, recall, F1 and ROC-AUC computed against human-reviewed ground truth. Nothing here is estimated or back-filled: every observation is one reviewed feedback row."
      actions={<RecomputeButton from={fromRaw || undefined} to={toRaw || undefined} />}
    >
      <FilterBar action="/admin/metrics">
        <FilterField label="From" htmlFor="metrics-from">
          <DateFilter id="metrics-from" name="from" defaultValue={fromRaw} />
        </FilterField>
        <FilterField label="To" htmlFor="metrics-to">
          <DateFilter id="metrics-to" name="to" defaultValue={toRaw} />
        </FilterField>
        <FilterSubmit />
        <FilterReset href="/admin/metrics" />
      </FilterBar>

      <StatRow>
        <Stat
          label="Labelled sample"
          value={formatCount(report.sampleSize)}
          hint={
            thin
              ? `Below the ${MIN_SLICE_SIZE}-row floor`
              : 'Reviewed feedback rows'
          }
          emphasis
        />
        <Stat
          label="Awaiting review"
          value={formatCount(report.pendingReview)}
          hint={
            report.pendingReview > 0
              ? 'Not yet ground truth'
              : 'Queue is clear'
          }
        />
        <Stat
          label="Precision"
          value={thin ? '—' : formatMetric(overall.binaryPrecision)}
          hint="Harmful vs clean"
          emphasis
        />
        <Stat
          label="Recall"
          value={thin ? '—' : formatMetric(overall.binaryRecall)}
          hint="Harmful vs clean"
          emphasis
        />
        <Stat
          label="F1"
          value={thin ? '—' : formatMetric(overall.binaryF1)}
          hint="Harmonic mean of the two"
          emphasis
        />
        <Stat
          label="ROC-AUC"
          value={
            overall.roc.computable ? formatMetric(overall.roc.auc) : '—'
          }
          hint={
            overall.roc.computable
              ? `${overall.roc.positives} positive · ${overall.roc.negatives} negative`
              : 'One class absent — undefined'
          }
        />
      </StatRow>

      {thin ? (
        <div className="mt-4 rounded-[var(--radius-xs)] border border-hairline-strong bg-surface-strong px-4 py-3">
          <p className="text-[13px] leading-relaxed text-body">
            <strong className="text-ink">
              Too few labels to report a figure.
            </strong>{' '}
            This range holds{' '}
            <Figure className="text-[13px]">{report.sampleSize}</Figure>{' '}
            reviewed row{report.sampleSize === 1 ? '' : 's'}, below the{' '}
            <Figure className="text-[13px]">{MIN_SLICE_SIZE}</Figure>-row floor.
            Every score below would swing by tenths on a single review, so they
            are suppressed rather than printed.{' '}
            {report.pendingReview > 0 ? (
              <>
                There {report.pendingReview === 1 ? 'is' : 'are'}{' '}
                <Link
                  href="/admin/feedback"
                  className="text-ink underline underline-offset-2"
                >
                  {formatCount(report.pendingReview)} report
                  {report.pendingReview === 1 ? '' : 's'} awaiting review
                </Link>
                ; deciding them is what grows this sample.
              </>
            ) : (
              'The sample grows as users flag verdicts and an admin reviews them.'
            )}
          </p>
        </div>
      ) : null}

      {/* ─── Working ────────────────────────────────────────────────────── */}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <Panel
          title="Harmful vs clean"
          description="The decision moderation actually makes, pooled across every model."
        >
          <BinaryMatrix
            counts={overall.binaryCounts}
            caption="Confusion matrix for the harmful versus clean decision across all models"
          />
        </Panel>

        <Panel
          title="The working"
          description="Each figure above, with the counts substituted into its definition."
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            <Formula
              name="Precision"
              formula="TP / (TP + FP)"
              meaning="Of everything flagged harmful, how much deserved it."
              numerator={overall.binaryCounts.truePositives}
              denominator={
                overall.binaryCounts.truePositives +
                overall.binaryCounts.falsePositives
              }
              result={overall.binaryPrecision}
              suppressed={thin}
            />
            <Formula
              name="Recall"
              formula="TP / (TP + FN)"
              meaning="Of everything that was harmful, how much was caught."
              numerator={overall.binaryCounts.truePositives}
              denominator={
                overall.binaryCounts.truePositives +
                overall.binaryCounts.falseNegatives
              }
              result={overall.binaryRecall}
              suppressed={thin}
            />
            <Formula
              name="F1"
              formula="2PR / (P + R)"
              meaning="Harmonic mean — refuses to be rescued by one strong half."
              substitution={`2 × ${formatMetric(overall.binaryPrecision)} × ${formatMetric(overall.binaryRecall)} / (${formatMetric(overall.binaryPrecision)} + ${formatMetric(overall.binaryRecall)})`}
              result={overall.binaryF1}
              suppressed={thin}
            />
            <Formula
              name="Accuracy"
              formula="(TP + TN) / total"
              meaning="Reported last on purpose: with an imbalanced corpus it flatters."
              numerator={
                overall.binaryCounts.truePositives +
                overall.binaryCounts.trueNegatives
              }
              denominator={overall.binaryMatrix.total}
              result={
                overall.binaryMatrix.total === 0
                  ? 0
                  : (overall.binaryCounts.truePositives +
                      overall.binaryCounts.trueNegatives) /
                    overall.binaryMatrix.total
              }
              suppressed={thin}
            />
          </dl>
        </Panel>
      </div>

      {/* ─── Per-slice ──────────────────────────────────────────────────── */}

      <div className="mt-4">
        <Panel
          title="Per model"
          description="Languages pooled. Each row is scored only against the reviewed rows that model produced."
          bodyClassName="px-0 py-0"
        >
          <SliceTable
            slices={report.byModel}
            caption="Precision, recall, F1 and ROC-AUC per model with languages pooled"
            showLanguage={false}
          />
        </Panel>
      </div>

      <div className="mt-4">
        <Panel
          title="Per model, per language"
          description={`One row per (model, language) pair. Pairs with fewer than ${MIN_SLICE_SIZE} reviewed rows are withheld — they are still counted in the pooled figures above.`}
          bodyClassName="px-0 py-0"
          footnote={
            thinSlices.length > 0 ? (
              <>
                Withheld for sample size:{' '}
                {thinSlices
                  .map((s) => `${s.key} (${s.count})`)
                  .join(', ')}
                . These are not zero-scoring slices; they are slices no figure
                can honestly be quoted for.
              </>
            ) : undefined
          }
        >
          <SliceTable
            slices={report.byModelLanguage}
            caption="Precision, recall, F1 and ROC-AUC per model and detected language"
            showLanguage
          />
        </Panel>
      </div>

      {/* ─── Confusion matrices ─────────────────────────────────────────── */}

      <div className="mt-4">
        <Panel
          title="Confusion matrices, full taxonomy"
          description="Rows are the human label, columns the model's. The diagonal is agreement; everything off it is a specific, named confusion."
        >
          {overall.categoryMatrix.total === 0 ? (
            <EmptyState
              title="No labelled observations"
              description="A matrix needs reviewed feedback to fill it. Decide some reports and it appears here."
            />
          ) : (
            <div className="flex flex-col gap-6">
              <MatrixBlock
                heading="All models, all languages"
                slice={overall}
              />
              {report.byModelLanguage.map((slice) => (
                <MatrixBlock
                  key={`${slice.modelName}-${slice.language ?? 'pooled'}`}
                  heading={`${slice.modelName} · ${slice.language ?? 'language unknown'}`}
                  slice={slice}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ─── ROC ────────────────────────────────────────────────────────── */}

      <div className="mt-4">
        <Panel
          title="ROC curves"
          description="Plotted where both classes are present in the slice. The score is the model's confidence in 'harmful' — a confident 'clean' is flipped to 1 − confidence."
        >
          {[overall, ...report.byModel].filter((s) => s.roc.computable)
            .length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-muted-soft">
              No slice has both a harmful and a clean observation, so AUC is
              undefined rather than zero. One reviewed row of the missing class
              is all it takes.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[overall, ...report.byModel]
                .filter((s) => s.roc.computable)
                .map((slice) => (
                  <div key={`roc-${slice.modelName}`}>
                    <p className="mb-1.5 text-[12.5px] font-medium text-ink">
                      {slice.modelName}
                    </p>
                    <RocCurve points={slice.roc.points} auc={slice.roc.auc} />
                    <p className="mt-1 text-[11.5px] text-muted-soft">
                      n = <Figure className="text-[11.5px]">{slice.sampleSize}</Figure>{' '}
                      ({slice.roc.positives} harmful, {slice.roc.negatives}{' '}
                      clean)
                    </p>
                  </div>
                ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ─── Errors, with the text ──────────────────────────────────────── */}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel
          title="False positives"
          description="The model called it harmful; a human confirmed it was clean. Over-flagging costs trust and buries real abuse in noise."
          footnote={
            <>
              <Figure className="text-[12px]">
                {formatCount(report.falsePositives.length)}
              </Figure>{' '}
              in this range
              {report.falsePositives.length > EXAMPLE_LIMIT
                ? `, showing the first ${EXAMPLE_LIMIT}`
                : ''}
              .
            </>
          }
          bodyClassName="px-0 py-0"
        >
          <ErrorList
            rows={report.falsePositives.slice(0, EXAMPLE_LIMIT)}
            emptyTitle="No false positives in this range"
            emptyDescription="Either the model never over-flagged, or nobody has reported an over-flag that survived review."
          />
        </Panel>

        <Panel
          title="False negatives"
          description="The model called it clean; a human said it was harmful. The costlier error for a moderation tool — these are the comments that got through."
          footnote={
            <>
              <Figure className="text-[12px]">
                {formatCount(report.falseNegatives.length)}
              </Figure>{' '}
              in this range
              {report.falseNegatives.length > EXAMPLE_LIMIT
                ? `, showing the first ${EXAMPLE_LIMIT}`
                : ''}
              .
            </>
          }
          bodyClassName="px-0 py-0"
        >
          <ErrorList
            rows={report.falseNegatives.slice(0, EXAMPLE_LIMIT)}
            emptyTitle="No false negatives in this range"
            emptyDescription="Note that a miss is only visible here if a user noticed it and reported it — absence is weaker evidence than presence."
          />
        </Panel>
      </div>

      {/* ─── Disagreement ───────────────────────────────────────────────── */}

      <div className="mt-4">
        <Panel
          title="Model disagreement by language"
          description="How often the classifier and Groq reached different verdicts. This needs no human labels, so it covers the whole corpus rather than the reviewed sliver — the most statistically solid figure on the page."
          bodyClassName="px-0 py-0"
          footnote="A high rate in one language means the two models read that language differently, and at least one of them reads it wrong. It does not say which."
        >
          {disagreement.length === 0 ? (
            <EmptyState
              title="Nothing analysed in this range"
              description="Disagreement is recorded per analysis, so it needs scans in the window."
            />
          ) : (
            <Table caption="Model disagreement rate by detected language and model">
              <thead>
                <tr>
                  <Th>Language</Th>
                  <Th>Model</Th>
                  <Th align="right">Analysed</Th>
                  <Th align="right">Disagreements</Th>
                  <Th align="right">Rate</Th>
                  <Th align="right">Avg confidence when disagreeing</Th>
                </tr>
              </thead>
              <tbody>
                {disagreement.map((row) => (
                  <tr
                    key={`${row.modelName}-${row.language ?? 'unknown'}`}
                    className="hover:bg-canvas-soft"
                  >
                    <Td>
                      <span className="font-mono text-[12px] text-ink">
                        {row.language ?? 'unknown'}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[11.5px] text-muted">
                        {row.modelName}
                      </span>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {formatCount(row.total)}
                      </Figure>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {formatCount(row.disagreements)}
                      </Figure>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {formatPercent(row.rate, 1)}
                      </Figure>
                    </Td>
                    <Td align="right">
                      <span className="font-mono text-[12px] tabular-nums text-muted">
                        {row.disagreements === 0
                          ? '—'
                          : row.avgConfidenceWhenDisagreeing.toFixed(3)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>

      <div className="mt-4">
        <Panel
          title="Disagreement examples"
          description="The rate above with faces attached — the highest-confidence comments where the two models parted company."
          bodyClassName="px-0 py-0"
        >
          {examples.length === 0 ? (
            <EmptyState
              title="No disagreements recorded"
              description="Either Groq was not consulted in this range, or the two models agreed every time."
            />
          ) : (
            <ul className="divide-y divide-hairline-soft">
              {examples.map((example) => (
                <li key={example.id} className="px-4 py-3">
                  <p className="max-w-prose text-[13px] leading-relaxed text-body">
                    {example.text}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Tag ink={CATEGORY_META[example.category].ink}>
                      {CATEGORY_META[example.category].display}
                    </Tag>
                    <Tag ink={SEVERITY_META[example.severity].ink}>
                      {SEVERITY_META[example.severity].display}
                    </Tag>
                    {example.isSarcastic ? <Tag>Sarcasm</Tag> : null}
                    <span className="font-mono text-[11px] text-muted-soft">
                      {example.modelName} ·{' '}
                      {example.language ?? 'unknown'} ·{' '}
                      {example.confidence.toFixed(3)}
                    </span>
                  </div>
                  {example.rationale ? (
                    <p className="mt-1.5 max-w-prose text-[12px] leading-relaxed text-muted">
                      {example.rationale}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ─── Snapshots ──────────────────────────────────────────────────── */}

      <div className="mt-4">
        <Panel
          title="Snapshots"
          description="Frozen evaluations from model_metrics. A dated snapshot is what lets a write-up quote a figure that will not silently move as the feedback table grows."
          bodyClassName="px-0 py-0"
        >
          {snapshots.length === 0 ? (
            <EmptyState
              title="No snapshots taken"
              description="Use Recompute snapshot above to freeze the current evaluation, including the date range in view."
            />
          ) : (
            <Table caption="Stored metric snapshots, newest first">
              <thead>
                <tr>
                  <Th>Computed</Th>
                  <Th>Model</Th>
                  <Th>Language</Th>
                  <Th>Period</Th>
                  <Th align="right">n</Th>
                  <Th align="right">Precision</Th>
                  <Th align="right">Recall</Th>
                  <Th align="right">F1</Th>
                  <Th align="right">ROC-AUC</Th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="hover:bg-canvas-soft">
                    <Td>
                      <span className="font-mono text-[11.5px] tabular-nums text-muted">
                        {formatDate(snapshot.computedAt)}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[11.5px] text-ink">
                        {snapshot.modelName}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[11.5px] text-muted">
                        {snapshot.language ?? 'pooled'}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[11.5px] tabular-nums text-muted">
                        {formatDate(snapshot.periodStart)} –{' '}
                        {formatDate(snapshot.periodEnd)}
                      </span>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {formatCount(snapshot.sampleSize)}
                      </Figure>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {snapshot.precision ?? '—'}
                      </Figure>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {snapshot.recall ?? '—'}
                      </Figure>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {snapshot.f1 ?? '—'}
                      </Figure>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {snapshot.rocAuc ?? '—'}
                      </Figure>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </ConsolePage>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

/**
 * One metric with its definition and the substitution that produced it.
 *
 * The substitution is the point. A bare "0.842" is an assertion; "27 / 32 =
 * 0.844" is a claim an examiner can check in their head and argue with.
 */
function Formula({
  name,
  formula,
  meaning,
  numerator,
  denominator,
  substitution,
  result,
  suppressed,
}: {
  name: string;
  formula: string;
  meaning: string;
  numerator?: number;
  denominator?: number;
  substitution?: string;
  result: number;
  suppressed: boolean;
}) {
  const working =
    substitution ??
    (numerator !== undefined && denominator !== undefined
      ? `${numerator} / ${denominator}`
      : null);

  return (
    <div className="rounded-[var(--radius-xs)] border border-hairline bg-canvas-soft px-3 py-2.5">
      <dt className="flex items-baseline justify-between gap-2">
        <span className="caption-uppercase text-[10px] text-muted">{name}</span>
        <span className="font-mono text-[17px] tabular-nums text-ink">
          {suppressed ? '—' : formatMetric(result)}
        </span>
      </dt>
      <dd className="mt-1">
        <p className="font-mono text-[11.5px] text-body-strong">{formula}</p>
        {working ? (
          <p className="mt-0.5 font-mono text-[11.5px] tabular-nums text-muted">
            = {working}
            {denominator === 0 ? ' → 0 by convention (undefined)' : ''}
          </p>
        ) : null}
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted-soft">
          {meaning}
        </p>
      </dd>
    </div>
  );
}

/** The per-slice score table, shared by the pooled and per-language views. */
function SliceTable({
  slices,
  caption,
  showLanguage,
}: {
  slices: readonly EvaluationSlice[];
  caption: string;
  showLanguage: boolean;
}) {
  if (slices.length === 0) {
    return (
      <EmptyState
        title="No slice has enough labels"
        description={`A slice needs at least ${MIN_SLICE_SIZE} reviewed rows before a figure is quoted for it. Reviewing more feedback is what fills this table.`}
      />
    );
  }

  return (
    <Table caption={caption}>
      <thead>
        <tr>
          <Th>Model</Th>
          {showLanguage ? <Th>Language</Th> : null}
          <Th align="right">n</Th>
          <Th align="right">TP</Th>
          <Th align="right">FP</Th>
          <Th align="right">FN</Th>
          <Th align="right">TN</Th>
          <Th align="right">Precision</Th>
          <Th align="right">Recall</Th>
          <Th align="right">F1</Th>
          <Th align="right">ROC-AUC</Th>
          <Th align="right">Macro F1</Th>
        </tr>
      </thead>
      <tbody>
        {slices.map((slice) => {
          // A slice below the floor still renders its counts — those are facts
          // — but its derived scores are withheld, because a ratio of three
          // observations is not a measurement.
          const thin = slice.sampleSize < MIN_SLICE_SIZE;

          return (
            <tr
              key={`${slice.modelName}-${slice.language ?? 'pooled'}`}
              className="hover:bg-canvas-soft"
            >
              <Td>
                <span className="font-mono text-[12px] text-ink">
                  {slice.modelName}
                </span>
              </Td>
              {showLanguage ? (
                <Td>
                  <span className="font-mono text-[12px] text-muted">
                    {slice.language ?? 'unknown'}
                  </span>
                </Td>
              ) : null}
              <Td align="right">
                <Figure className="text-[12.5px]">{slice.sampleSize}</Figure>
              </Td>
              <Td align="right">
                <Figure className="text-[12.5px]">
                  {slice.binaryCounts.truePositives}
                </Figure>
              </Td>
              <Td align="right">
                <Figure className="text-[12.5px]">
                  {slice.binaryCounts.falsePositives}
                </Figure>
              </Td>
              <Td align="right">
                <Figure className="text-[12.5px]">
                  {slice.binaryCounts.falseNegatives}
                </Figure>
              </Td>
              <Td align="right">
                <Figure className="text-[12.5px]">
                  {slice.binaryCounts.trueNegatives}
                </Figure>
              </Td>
              <ScoreCell value={slice.binaryPrecision} thin={thin} />
              <ScoreCell value={slice.binaryRecall} thin={thin} />
              <ScoreCell value={slice.binaryF1} thin={thin} />
              <Td align="right">
                {slice.roc.computable && !thin ? (
                  <Figure className="text-[12.5px]">
                    {formatMetric(slice.roc.auc)}
                  </Figure>
                ) : (
                  <span
                    className="text-[12px] text-muted-soft"
                    title={
                      thin
                        ? `Fewer than ${MIN_SLICE_SIZE} labels`
                        : 'One class absent — AUC undefined'
                    }
                  >
                    —
                  </span>
                )}
              </Td>
              <ScoreCell value={slice.categoryAverages.macroF1} thin={thin} />
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

function ScoreCell({ value, thin }: { value: number; thin: boolean }) {
  return (
    <Td align="right">
      {thin ? (
        <span
          className="text-[12px] text-muted-soft"
          title={`Fewer than ${MIN_SLICE_SIZE} labelled rows — no figure quoted`}
        >
          n&nbsp;&lt;&nbsp;{MIN_SLICE_SIZE}
        </span>
      ) : (
        <Figure className="text-[12.5px]">{formatMetric(value)}</Figure>
      )}
    </Td>
  );
}

function MatrixBlock({
  heading,
  slice,
}: {
  heading: string;
  slice: EvaluationSlice;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[12.5px] font-medium text-ink">{heading}</h3>
        <p className="text-[11.5px] text-muted-soft">
          n = <Figure className="text-[11.5px]">{slice.sampleSize}</Figure> ·
          accuracy{' '}
          <Figure className="text-[11.5px]">
            {formatMetric(slice.categoryAverages.accuracy)}
          </Figure>{' '}
          · macro F1{' '}
          <Figure className="text-[11.5px]">
            {formatMetric(slice.categoryAverages.macroF1)}
          </Figure>{' '}
          · weighted F1{' '}
          <Figure className="text-[11.5px]">
            {formatMetric(slice.categoryAverages.weightedF1)}
          </Figure>
        </p>
      </div>
      <CategoryMatrix
        matrix={slice.categoryMatrix}
        caption={`Nine-category confusion matrix for ${heading}`}
      />
    </div>
  );
}

/** A list of misclassified comments with the two labels that disagreed. */
function ErrorList({
  rows,
  emptyTitle,
  emptyDescription,
}: {
  rows: readonly LabelledRow[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="divide-y divide-hairline-soft">
      {rows.map((row) => (
        <li key={row.feedbackId} className="px-4 py-3">
          <p className="max-w-prose text-[13px] leading-relaxed text-body">
            {row.commentText}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-soft">
            <span>model</span>
            <Tag ink={CATEGORY_META[row.predictedCategory].ink}>
              {CATEGORY_META[row.predictedCategory].display}
            </Tag>
            <span aria-hidden="true">→</span>
            <span>human</span>
            <Tag ink={CATEGORY_META[row.actualCategory].ink}>
              {CATEGORY_META[row.actualCategory].display}
            </Tag>
            <span className="font-mono">
              {row.modelName} · {row.language ?? 'unknown'} ·{' '}
              {row.confidence.toFixed(3)}
            </span>
            {row.modelsDisagree ? <Tag>Models disagreed</Tag> : null}
          </div>
          {row.rationale ? (
            <p className="mt-1.5 max-w-prose text-[12px] leading-relaxed text-muted">
              {row.rationale}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** A `yyyy-mm-dd` from the date input, or undefined when absent or malformed. */
function parseDate(value: string, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const date = new Date(endOfDay ? `${value}T23:59:59.999` : value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * The (model, language) pairs `getEvaluationReport` withheld for being too
 * thin. Recomputed from the same sample it used, so the two cannot disagree.
 */
function countThinSlices(
  rows: readonly LabelledRow[]
): { key: string; count: number }[] {
  const buckets = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.modelName} · ${row.language ?? 'unknown'}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [...buckets.entries()]
    .filter(([, count]) => count < MIN_SLICE_SIZE)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}
