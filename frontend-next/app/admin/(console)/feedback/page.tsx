import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import {
  countFeedback,
  feedbackStatusCounts,
  listFeedback,
  type FeedbackQueueItem,
  type ListFeedbackOptions,
} from '@/lib/db/queries/admin';
import { CATEGORY_META, SEVERITY_META } from '@/lib/analysis/taxonomy';
import {
  ConsolePage,
  EmptyState,
  Figure,
  Mono,
  Pagination,
  Panel,
  Stat,
  StatRow,
  StatusDot,
  Tag,
  formatCount,
  formatDateTime,
  relativeTime,
  type DotTone,
} from '@/components/admin/console';
import {
  ChipFilters,
  buildHref,
  pageParam,
  param,
  type SearchParams,
} from '@/components/admin/filters';
import { ConfirmAction } from '@/components/admin/ConfirmAction';

/**
 * The review queue — the human-in-the-loop step.
 *
 * Every figure on the metrics page traces back to a decision made here, which
 * is why this page shows the model's verdict and the user's correction side by
 * side rather than asking a reviewer to take the complaint on trust. Accepting
 * a correction writes ground truth; rejecting it confirms the model. Both are
 * consequential, so both go through a confirmation.
 */

const PAGE_SIZE = 20;

type FeedbackStatus = 'open' | 'accepted' | 'rejected';

const STATUSES: readonly FeedbackStatus[] = ['open', 'accepted', 'rejected'];

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  // Next 16: searchParams is a Promise and must be awaited before it is read.
  const params = await searchParams;

  const statusRaw = param(params, 'status', 'open');
  const page = pageParam(params);

  // Defaults to the open queue rather than to everything: this is a worklist,
  // and landing on a thousand settled items buries the twelve that need a
  // decision. `?status=all` is the explicit way to see the lot.
  const status = STATUSES.includes(statusRaw as FeedbackStatus)
    ? (statusRaw as FeedbackStatus)
    : undefined;

  const options: ListFeedbackOptions = { status };

  const [items, total, counts] = await Promise.all([
    listFeedback({
      ...options,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countFeedback(options),
    feedbackStatusCounts(),
  ]);

  const reviewed = counts.accepted + counts.rejected;
  const allCount = counts.open + reviewed;

  return (
    <ConsolePage
      title="Feedback review"
      description="User-reported verdicts awaiting a decision. Accepting a correction makes it ground truth for the evaluation; rejecting it records that the model was right. Either way the row stops being ambiguous."
    >
      <StatRow>
        <Stat
          label="Open"
          value={formatCount(counts.open)}
          hint={counts.open > 0 ? 'Awaiting a decision' : 'Queue is clear'}
          emphasis
        />
        <Stat
          label="Accepted"
          value={formatCount(counts.accepted)}
          hint="Correction became ground truth"
        />
        <Stat
          label="Rejected"
          value={formatCount(counts.rejected)}
          hint="Reviewer sided with the model"
        />
        <Stat
          label="Reviewed"
          value={formatCount(reviewed)}
          hint={
            allCount === 0
              ? 'Nothing reported yet'
              : `${((reviewed / allCount) * 100).toFixed(0)}% of all reports`
          }
        />
        <Stat
          label="Labelled sample"
          value={formatCount(reviewed)}
          hint="Rows the metrics page can score against"
        />
        <Stat
          label="Acceptance rate"
          value={
            reviewed === 0
              ? '—'
              : `${((counts.accepted / reviewed) * 100).toFixed(0)}%`
          }
          hint="How often the reporter turned out to be right"
        />
      </StatRow>

      <div className="mt-5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <ChipFilters
          label="Filter feedback by status"
          activeValue={status ?? 'all'}
          hrefFor={(value) =>
            buildHref('/admin/feedback', params, {
              status: value === 'all' ? undefined : value,
              page: undefined,
            })
          }
          options={[
            { value: 'open', label: 'Open', count: counts.open },
            { value: 'accepted', label: 'Accepted', count: counts.accepted },
            { value: 'rejected', label: 'Rejected', count: counts.rejected },
            { value: 'all', label: 'All', count: allCount },
          ]}
        />
        <p className="text-[12px] text-muted-soft">
          Decisions feed{' '}
          <Link
            href="/admin/metrics"
            className="text-ink underline underline-offset-2"
          >
            the evaluation
          </Link>
          .
        </p>
      </div>

      <Panel bodyClassName="px-0 py-0">
        {items.length === 0 ? (
          <EmptyState
            title={
              status === 'open'
                ? 'Nothing waiting for review'
                : 'No feedback in this state'
            }
            description={
              status === 'open'
                ? 'Every report has been decided. New ones appear here as users flag verdicts.'
                : 'Try another status, or the All tab.'
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-hairline">
              {items.map((item) => (
                <FeedbackCard key={item.id} item={item} />
              ))}
            </ul>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              unit="reports"
              hrefFor={(p) => buildHref('/admin/feedback', params, { page: p })}
            />
          </>
        )}
      </Panel>
    </ConsolePage>
  );
}

/**
 * One report, laid out as a comparison.
 *
 * The comment sits above both verdicts because a reviewer has to read the text
 * before either label means anything — putting the model's answer first would
 * anchor the decision on it.
 */
function FeedbackCard({ item }: { item: FeedbackQueueItem }) {
  const predicted = CATEGORY_META[item.predictedCategory];
  const predictedSeverity = SEVERITY_META[item.predictedSeverity];
  const corrected = item.correctedCategory
    ? CATEGORY_META[item.correctedCategory]
    : null;
  const correctedSeverity = item.correctedSeverity
    ? SEVERITY_META[item.correctedSeverity]
    : null;

  const isOpen = item.status === 'open';

  return (
    <li className="px-4 py-4">
      <div className="flex flex-wrap items-center gap-2.5 text-[11.5px] text-muted-soft">
        <StatusDot tone={statusTone(item.status)} label={item.status} />
        <span aria-hidden="true">·</span>
        <span>
          Reported by {item.reporterEmail ?? 'a deleted account'}{' '}
          {relativeTime(item.createdAt)}
        </span>
        {item.videoTitle ? (
          <>
            <span aria-hidden="true">·</span>
            <Link
              href={`/admin/scans/${item.scanId}`}
              className="max-w-[240px] truncate text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              {item.videoTitle}
            </Link>
          </>
        ) : null}
        {item.language ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{item.language}</span>
          </>
        ) : null}
        <span aria-hidden="true">·</span>
        <Mono value={item.analysisId} />
      </div>

      <blockquote className="mt-2.5 border-l-2 border-hairline-strong pl-3 text-[13.5px] leading-relaxed text-body">
        {item.commentText}
        {item.commentAuthor ? (
          <footer className="mt-1 text-[11.5px] text-muted-soft">
            — {item.commentAuthor}
          </footer>
        ) : null}
      </blockquote>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-[var(--radius-xs)] border border-hairline bg-canvas-soft px-3 py-2.5">
          <p className="caption-uppercase text-[9.5px] text-muted-soft">
            Model said
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Tag ink={predicted.ink}>{predicted.display}</Tag>
            <Tag ink={predictedSeverity.ink}>{predictedSeverity.display}</Tag>
            <span className="text-[11.5px] text-muted-soft">
              confidence{' '}
              <Figure className="text-[11.5px]">
                {item.confidence.toFixed(3)}
              </Figure>
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-muted-soft">
            {item.modelName}
            {item.modelVersion ? ` · ${item.modelVersion}` : ''}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {item.isSarcastic ? <Tag>Sarcasm</Tag> : null}
            {item.modelsDisagree ? <Tag>Models disagree</Tag> : null}
          </div>
          {item.rationale ? (
            <p className="mt-2 max-w-prose text-[12px] leading-relaxed text-muted">
              <span className="caption-uppercase text-[9.5px] text-muted-soft">
                Groq rationale
              </span>
              <br />
              {item.rationale}
            </p>
          ) : null}
        </div>

        <div className="rounded-[var(--radius-xs)] border border-hairline bg-canvas-soft px-3 py-2.5">
          <p className="caption-uppercase text-[9.5px] text-muted-soft">
            User says
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.verdict === 'correct' ? (
              <span className="text-[12.5px] text-body-strong">
                The verdict was right
              </span>
            ) : corrected ? (
              <>
                <Tag ink={corrected.ink}>{corrected.display}</Tag>
                {correctedSeverity ? (
                  <Tag ink={correctedSeverity.ink}>
                    {correctedSeverity.display}
                  </Tag>
                ) : null}
              </>
            ) : (
              <span className="text-[12.5px] text-body-strong">
                Wrong, but no replacement label given
              </span>
            )}
          </div>
          {item.note ? (
            <p className="mt-2 max-w-prose text-[12.5px] leading-relaxed text-body">
              &ldquo;{item.note}&rdquo;
            </p>
          ) : (
            <p className="mt-2 text-[12px] text-muted-soft">No note left.</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11.5px] text-muted-soft">
          {isOpen
            ? 'Accepting records the user’s label as truth. Rejecting records the model’s.'
            : `Reviewed by ${item.reviewerEmail ?? 'an admin'} ${formatDateTime(item.reviewedAt)}.`}
        </p>
        {isOpen ? (
          <div className="flex items-center gap-1.5">
            <ConfirmAction
              endpoint={`/api/admin/feedback/${item.id}`}
              body={{ status: 'accepted' }}
              label="Accept"
              confirmTitle="Accept this correction?"
              confirmLabel="Accept"
              confirmBody={
                item.verdict === 'correct' ? (
                  <>
                    The reporter agreed with the model, so{' '}
                    <strong className="text-ink">{predicted.display}</strong>{' '}
                    will be confirmed as ground truth for this comment.
                  </>
                ) : (
                  <>
                    <strong className="text-ink">
                      {corrected?.display ?? 'The correction'}
                    </strong>{' '}
                    replaces{' '}
                    <strong className="text-ink">{predicted.display}</strong> as
                    ground truth for this comment, and the model is scored
                    against it on the metrics page.
                  </>
                )
              }
            />
            <ConfirmAction
              endpoint={`/api/admin/feedback/${item.id}`}
              body={{ status: 'rejected' }}
              label="Reject"
              destructive
              confirmTitle="Reject this report?"
              confirmLabel="Reject"
              confirmBody={
                <>
                  The model&rsquo;s verdict of{' '}
                  <strong className="text-ink">{predicted.display}</strong>{' '}
                  stands and becomes ground truth for this comment. The report
                  is kept, marked rejected.
                </>
              }
            />
          </div>
        ) : null}
      </div>
    </li>
  );
}

function statusTone(status: FeedbackStatus): DotTone {
  switch (status) {
    case 'open':
      return 'warn';
    case 'accepted':
      return 'positive';
    case 'rejected':
      return 'neutral';
  }
}
