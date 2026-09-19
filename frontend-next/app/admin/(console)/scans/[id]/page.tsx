import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import { getScanForAdmin } from '@/lib/db/queries/admin';
import {
  CATEGORY_META,
  SEVERITY_META,
  isHarmful,
} from '@/lib/analysis/taxonomy';
import type { Severity, ScanStatus, ToxicityCategory } from '@/lib/db/schema';
import {
  ConsolePage,
  EmptyState,
  Figure,
  Mono,
  Panel,
  Stat,
  StatRow,
  StatusDot,
  Table,
  Tag,
  Td,
  Th,
  formatCount,
  formatDateTime,
  formatDuration,
  formatPercent,
  type DotTone,
} from '@/components/admin/console';
import {
  CategoryDistribution,
  DistributionBars,
} from '@/components/admin/charts';

/**
 * One scan, seen by an admin.
 *
 * Strictly read-only. The same data has a user-facing view under
 * `/dashboard/scans/[id]` with feedback controls and a delete button; this one
 * deliberately has
 * neither. An admin looking at somebody else's scan is investigating, and a
 * correction made from here would enter the ground-truth set attributed to the
 * wrong person — which is precisely the data the metrics page depends on being
 * clean.
 */

/** How many verdicts to render before the list stops. */
const MAX_COMMENTS = 200;

export default async function AdminScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  // Next 16: params is a Promise and must be awaited before it is read.
  const { id } = await params;

  const detail = await getScanForAdmin(id);
  if (!detail) notFound();

  const { scan, ownerEmail, ownerId, comments } = detail;

  // The breakdowns are computed here rather than in SQL: the query has already
  // returned every row the page renders, so a second round trip to Postgres
  // would be counting the same array a second time.
  const analysed = comments.filter((c) => c.category !== null);

  const categoryCounts = new Map<ToxicityCategory, number>();
  const severityCounts = new Map<Severity, number>();
  const languageCounts = new Map<string, number>();
  let disagreements = 0;
  let sarcastic = 0;
  let harmful = 0;

  for (const c of analysed) {
    if (c.category) {
      categoryCounts.set(c.category, (categoryCounts.get(c.category) ?? 0) + 1);
      if (isHarmful(c.category)) harmful += 1;
    }
    if (c.severity) {
      severityCounts.set(c.severity, (severityCounts.get(c.severity) ?? 0) + 1);
    }
    const lang = c.language ?? 'unknown';
    languageCounts.set(lang, (languageCounts.get(lang) ?? 0) + 1);
    if (c.modelsDisagree) disagreements += 1;
    if (c.isSarcastic) sarcastic += 1;
  }

  const categoryRows = [...categoryCounts.entries()]
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);

  // Severity is an ordered scale, so it is sorted by rank rather than by count:
  // a bar chart of severities that jumps mild → severe → moderate is unreadable.
  const severityRows = [...severityCounts.entries()]
    .sort((a, b) => SEVERITY_META[a[0]].rank - SEVERITY_META[b[0]].rank)
    .map(([severity, value]) => ({
      key: severity,
      label: SEVERITY_META[severity].display,
      value,
      ink: SEVERITY_META[severity].ink,
    }));

  const languageRows = [...languageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([language, value]) => ({ key: language, label: language, value }));

  return (
    <ConsolePage
      title={scan.videoTitle ?? 'Untitled video'}
      description={`Scan ${scan.id} · read-only admin view.`}
      actions={
        <Link
          href="/admin/scans"
          className="inline-flex h-8 items-center rounded-[var(--radius-xs)] border border-hairline px-3 text-[12.5px] font-medium text-muted hover:border-hairline-strong hover:text-ink"
        >
          Back to scans
        </Link>
      }
    >
      <Panel title="Video" bodyClassName="px-4 py-3">
        <dl className="grid gap-x-8 gap-y-2.5 text-[12.5px] sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Video id">
            <Mono value={scan.videoId} chars={20} />
          </Field>
          <Field label="Channel">{scan.channelName ?? '—'}</Field>
          <Field label="Owner">
            {ownerEmail ? (
              <Link
                href={`/admin/scans?user=${ownerId ?? ''}`}
                className="text-ink underline underline-offset-2"
              >
                {ownerEmail}
              </Link>
            ) : (
              'Deleted account'
            )}
          </Field>
          <Field label="Requested">
            {formatCount(scan.requestedComments)} comments
          </Field>
          <Field label="Started">{formatDateTime(scan.createdAt)}</Field>
          <Field label="Completed">{formatDateTime(scan.completedAt)}</Field>
          <Field label="Status">
            <StatusDot tone={statusTone(scan.status)} label={scan.status} />
          </Field>
          <Field label="Source">
            <a
              href={`https://www.youtube.com/watch?v=${scan.videoId}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-ink underline underline-offset-2"
            >
              Open on YouTube
            </a>
          </Field>
          {scan.errorMessage ? (
            <Field label="Error" className="sm:col-span-2 lg:col-span-3">
              <span className="text-semantic-error">{scan.errorMessage}</span>
            </Field>
          ) : null}
        </dl>
      </Panel>

      <div className="mt-4">
        <StatRow>
          <Stat
            label="Analysed"
            value={formatCount(scan.analysedCount)}
            hint={
              scan.erroredCount > 0
                ? `${formatCount(scan.erroredCount)} failed`
                : 'No analysis errors'
            }
            emphasis
          />
          <Stat
            label="Harmful"
            value={formatCount(harmful)}
            hint={
              analysed.length === 0
                ? 'Nothing analysed'
                : `${formatPercent(harmful / analysed.length, 1)} of this sample`
            }
            emphasis
          />
          <Stat
            label="Toxicity score"
            value={
              scan.overallToxicityScore === null
                ? '—'
                : formatPercent(scan.overallToxicityScore / 100, 1)
            }
            hint="Recorded by the pipeline at scan time"
          />
          <Stat
            label="Avg confidence"
            value={
              scan.avgConfidence === null
                ? '—'
                : scan.avgConfidence.toFixed(3)
            }
            hint="Across every verdict in this scan"
          />
          <Stat
            label="Disagreements"
            value={formatCount(disagreements)}
            hint={`${formatCount(sarcastic)} flagged sarcastic`}
          />
          <Stat
            label="Duration"
            value={formatDuration(scan.durationMs)}
            hint={
              scan.durationMs && scan.analysedCount > 0
                ? `${Math.round(scan.durationMs / scan.analysedCount)}ms per comment`
                : 'Not recorded'
            }
          />
        </StatRow>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel
          title="Categories"
          description="Verdict distribution across the comments in this scan."
        >
          <CategoryDistribution
            rows={categoryRows}
            caption="Comment count by toxicity category in this scan"
          />
        </Panel>
        <Panel
          title="Severity"
          description="Ordered by the scale, not by volume."
        >
          <DistributionBars
            rows={severityRows}
            caption="Comment count by severity in this scan"
          />
        </Panel>
        <Panel
          title="Languages"
          description="Detected per comment, which is what chose the classifier."
        >
          <DistributionBars
            rows={languageRows}
            caption="Comment count by detected language in this scan"
          />
        </Panel>
      </div>

      <div className="mt-4">
        <Panel
          title="Comments"
          description="Ordered by model confidence — the verdicts the pipeline was most certain about come first."
          bodyClassName="px-0 py-0"
          footnote={
            comments.length >= MAX_COMMENTS ? (
              <>
                Showing the first{' '}
                <Figure className="text-[12px]">{MAX_COMMENTS}</Figure> comments
                of this scan.
              </>
            ) : (
              <>
                <Figure className="text-[12px]">
                  {formatCount(comments.length)}
                </Figure>{' '}
                comments, of which{' '}
                <Figure className="text-[12px]">
                  {formatCount(analysed.length)}
                </Figure>{' '}
                carry a verdict.
              </>
            )
          }
        >
          {comments.length === 0 ? (
            <EmptyState
              title="No comments stored for this scan"
              description={
                scan.status === 'failed'
                  ? 'The scan failed before any comments were analysed.'
                  : 'The scan has not fetched any comments yet.'
              }
            />
          ) : (
            <Table caption="Every stored comment in this scan with the verdict the pipeline reached">
              <thead>
                <tr>
                  <Th>Comment</Th>
                  <Th>Category</Th>
                  <Th>Severity</Th>
                  <Th align="right">Confidence</Th>
                  <Th>Model</Th>
                  <Th>Flags</Th>
                </tr>
              </thead>
              <tbody>
                {comments.map((comment) => (
                  <tr key={comment.id} className="align-top">
                    <Td className="align-top">
                      <p className="max-w-[46ch] text-[13px] leading-relaxed text-body">
                        {comment.text}
                      </p>
                      <p className="mt-1 text-[11.5px] text-muted-soft">
                        {comment.authorName ?? 'Unknown author'}
                        {comment.language ? ` · ${comment.language}` : ''}
                        {comment.likeCount
                          ? ` · ${formatCount(comment.likeCount)} likes`
                          : ''}
                      </p>
                    </Td>
                    <Td className="align-top">
                      {comment.category ? (
                        <Tag ink={CATEGORY_META[comment.category].ink}>
                          {CATEGORY_META[comment.category].display}
                        </Tag>
                      ) : (
                        <span className="text-[12px] text-muted-soft">
                          Not analysed
                        </span>
                      )}
                    </Td>
                    <Td className="align-top">
                      {comment.severity ? (
                        <Tag ink={SEVERITY_META[comment.severity].ink}>
                          {SEVERITY_META[comment.severity].display}
                        </Tag>
                      ) : (
                        <span className="text-[12px] text-muted-soft">—</span>
                      )}
                    </Td>
                    <Td align="right" className="align-top">
                      <Figure className="text-[12.5px]">
                        {comment.confidence === null
                          ? '—'
                          : comment.confidence.toFixed(3)}
                      </Figure>
                    </Td>
                    <Td className="align-top">
                      <span className="font-mono text-[11.5px] text-muted">
                        {comment.modelName ?? '—'}
                      </span>
                    </Td>
                    <Td className="align-top">
                      <div className="flex flex-col items-start gap-1">
                        {comment.isSarcastic ? <Tag>Sarcasm</Tag> : null}
                        {comment.contextShifted ? (
                          <Tag>Context-shifted</Tag>
                        ) : null}
                        {comment.modelsDisagree ? (
                          <Tag>Models disagree</Tag>
                        ) : null}
                        {!comment.isSarcastic &&
                        !comment.contextShifted &&
                        !comment.modelsDisagree ? (
                          <span className="text-[11.5px] text-muted-soft">
                            —
                          </span>
                        ) : null}
                        {comment.rationale ? (
                          <p className="max-w-[28ch] text-[11.5px] leading-relaxed text-muted-soft">
                            {comment.rationale}
                          </p>
                        ) : null}
                      </div>
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

/** One label/value pair in the video header's definition list. */
function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="caption-uppercase text-[9.5px] text-muted-soft">
        {label}
      </dt>
      <dd className="mt-0.5 text-[12.5px] text-body">{children}</dd>
    </div>
  );
}

function statusTone(status: ScanStatus): DotTone {
  switch (status) {
    case 'complete':
      return 'positive';
    case 'failed':
      return 'critical';
    case 'running':
      return 'warn';
    case 'pending':
      return 'idle';
  }
}
