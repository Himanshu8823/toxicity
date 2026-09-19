import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import {
  getLatencyByLanguage,
  getModelLanguageMatrix,
  getModelUsage,
  type ModelLanguageRow,
} from '@/lib/db/queries/admin';
import {
  ConsolePage,
  EmptyState,
  Figure,
  Panel,
  Stat,
  StatRow,
  Table,
  Td,
  Th,
  formatCount,
  formatDuration,
  formatPercent,
} from '@/components/admin/console';
import { DistributionBars } from '@/components/admin/charts';

/**
 * Model routing, observed.
 *
 * The project routes Indic languages to MuRIL and European ones to XLM-R,
 * because XLM-R has no usable Hindi or Marathi head. That is a claim, and this
 * page is where it either holds up or does not: if the routing works, the
 * model × language grid below separates into two blocks with almost no overlap,
 * and nobody has to take the architecture diagram on faith.
 */

export default async function AdminModelsPage() {
  await requireAdmin();

  const [usage, matrix, latency] = await Promise.all([
    getModelUsage(),
    getModelLanguageMatrix(),
    getLatencyByLanguage(),
  ]);

  const totalVolume = usage.reduce((sum, row) => sum + row.volume, 0);
  const totalDisagreements = usage.reduce(
    (sum, row) => sum + row.disagreements,
    0
  );
  const weightedConfidence =
    totalVolume === 0
      ? 0
      : usage.reduce((sum, row) => sum + row.avgConfidence * row.volume, 0) /
        totalVolume;

  const totalScans = latency.reduce((sum, row) => sum + row.scans, 0);
  const weightedErrorRate =
    totalScans === 0
      ? 0
      : latency.reduce((sum, row) => sum + row.errorRate * row.scans, 0) /
        totalScans;

  // The grid is built per model so each model's languages read as a block. A
  // single flat table sorted by volume interleaves them and hides the very
  // separation the page exists to show.
  const byModel = new Map<string, ModelLanguageRow[]>();
  for (const row of matrix) {
    const bucket = byModel.get(row.modelName);
    if (bucket) bucket.push(row);
    else byModel.set(row.modelName, [row]);
  }

  return (
    <ConsolePage
      title="Models"
      description="Which classifier handled what, and how well. Language routing is the design decision this page exists to make checkable — figures cover every analysis, not just the human-reviewed ones."
    >
      <StatRow>
        <Stat
          label="Analyses"
          value={formatCount(totalVolume)}
          hint={`${usage.length} model build${usage.length === 1 ? '' : 's'} in use`}
          emphasis
        />
        <Stat
          label="Models"
          value={formatCount(new Set(usage.map((u) => u.modelName)).size)}
          hint="Distinct classifiers, versions pooled"
        />
        <Stat
          label="Languages"
          value={formatCount(
            new Set(matrix.map((m) => m.language ?? 'unknown')).size
          )}
          hint="Detected across every analysis"
        />
        <Stat
          label="Avg confidence"
          value={totalVolume === 0 ? '—' : weightedConfidence.toFixed(3)}
          hint="Volume-weighted across models"
        />
        <Stat
          label="Disagreement"
          value={
            totalVolume === 0
              ? '—'
              : formatPercent(totalDisagreements / totalVolume, 1)
          }
          hint={`${formatCount(totalDisagreements)} classifier/Groq splits`}
        />
        <Stat
          label="Comment error rate"
          value={totalScans === 0 ? '—' : formatPercent(weightedErrorRate, 2)}
          hint="Comments that failed to analyse"
        />
      </StatRow>

      <div className="mt-4">
        <Panel
          title="Volume per model"
          description="One row per model build. Disagreement rate is how often Groq contradicted the classifier — high is not automatically bad, but it is always worth looking at."
          bodyClassName="px-0 py-0"
          footnote={
            <>
              Disagreements are the rows most worth human review; they surface
              in{' '}
              <Link
                href="/admin/feedback"
                className="text-ink underline underline-offset-2"
              >
                the review queue
              </Link>{' '}
              and are scored on{' '}
              <Link
                href="/admin/metrics"
                className="text-ink underline underline-offset-2"
              >
                the metrics page
              </Link>
              .
            </>
          }
        >
          {usage.length === 0 ? (
            <EmptyState
              title="No analyses recorded"
              description="Model usage appears here as soon as the pipeline has classified anything."
            />
          ) : (
            <Table caption="Analysis volume, confidence and disagreement rate per model build">
              <thead>
                <tr>
                  <Th>Model</Th>
                  <Th>Version</Th>
                  <Th align="right">Analyses</Th>
                  <Th align="right">Share</Th>
                  <Th align="right">Languages</Th>
                  <Th align="right">Avg confidence</Th>
                  <Th align="right">Harmful rate</Th>
                  <Th align="right">Disagreement rate</Th>
                </tr>
              </thead>
              <tbody>
                {usage.map((row) => (
                  <tr
                    key={`${row.modelName}-${row.modelVersion ?? 'none'}`}
                    className="hover:bg-canvas-soft"
                  >
                    <Td>
                      <span className="font-mono text-[12.5px] font-medium text-ink">
                        {row.modelName}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[11.5px] text-muted">
                        {row.modelVersion ?? '—'}
                      </span>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {formatCount(row.volume)}
                      </Figure>
                    </Td>
                    <Td align="right">
                      <span className="font-mono text-[12px] tabular-nums text-muted">
                        {totalVolume === 0
                          ? '—'
                          : formatPercent(row.volume / totalVolume, 1)}
                      </span>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">{row.languages}</Figure>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {row.avgConfidence.toFixed(3)}
                      </Figure>
                    </Td>
                    <Td align="right">
                      <span className="font-mono text-[12px] tabular-nums text-muted">
                        {formatPercent(row.harmfulRate, 1)}
                      </span>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {formatPercent(row.disagreementRate, 1)}
                      </Figure>
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
          title="Routing grid: model × language"
          description="The routing table as the data actually shows it, rather than as the config declares it. A language appearing under two models means traffic is being split — check the language detector before the classifiers."
          footnote="MuRIL carries the Indic languages because XLM-R has no usable Hindi or Marathi head. If that routing holds, the blocks below barely overlap."
        >
          {matrix.length === 0 ? (
            <EmptyState
              title="No analyses recorded"
              description="The routing grid fills in as scans run."
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {[...byModel.entries()].map(([modelName, rows]) => {
                const modelVolume = rows.reduce((s, r) => s + r.volume, 0);
                return (
                  <div key={modelName}>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-mono text-[12.5px] font-medium text-ink">
                        {modelName}
                      </h3>
                      <p className="text-[11.5px] text-muted-soft">
                        <Figure className="text-[11.5px]">
                          {formatCount(modelVolume)}
                        </Figure>{' '}
                        analyses across{' '}
                        <Figure className="text-[11.5px]">{rows.length}</Figure>{' '}
                        language{rows.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <DistributionBars
                      caption={`Analysis volume by detected language for ${modelName}`}
                      rows={rows.map((r) => ({
                        key: `${modelName}-${r.language ?? 'unknown'}`,
                        label: `${r.language ?? 'unknown'} · ${formatPercent(
                          r.disagreementRate,
                          0
                        )} disagree`,
                        value: r.volume,
                      }))}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-4">
        <Panel
          title="Latency and errors by language"
          description="Average wall time per comment, grouped by each scan's dominant language."
          bodyClassName="px-0 py-0"
          footnote="The pipeline does not time each classifier call individually, so this is per scan attributed by dominant language — a good proxy for per-model cost, not a direct measurement of it."
        >
          {latency.length === 0 ? (
            <EmptyState
              title="No timed scans"
              description="Latency is recorded on completed scans; none have finished in this window."
            />
          ) : (
            <Table caption="Average latency per comment and comment error rate, by dominant scan language">
              <thead>
                <tr>
                  <Th>Dominant language</Th>
                  <Th align="right">Scans</Th>
                  <Th align="right">Avg per comment</Th>
                  <Th align="right">Comment error rate</Th>
                </tr>
              </thead>
              <tbody>
                {latency.map((row) => (
                  <tr
                    key={row.language ?? 'unknown'}
                    className="hover:bg-canvas-soft"
                  >
                    <Td>
                      <span className="font-mono text-[12.5px] text-ink">
                        {row.language ?? 'unknown'}
                      </span>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {formatCount(row.scans)}
                      </Figure>
                    </Td>
                    <Td align="right">
                      <Figure className="text-[12.5px]">
                        {row.avgMsPerComment === 0
                          ? '—'
                          : formatDuration(row.avgMsPerComment)}
                      </Figure>
                    </Td>
                    <Td align="right">
                      <span className="font-mono text-[12px] tabular-nums text-muted">
                        {formatPercent(row.errorRate, 2)}
                      </span>
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
