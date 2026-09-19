import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { and, eq, inArray } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { feedback as feedbackTable } from '@/lib/db/schema';
import { getScanDetail } from '@/lib/db/queries/scans';
import { isScanSaved } from '@/lib/db/queries/saved';
import type { ExistingFeedback } from '@/components/dashboard/FeedbackControls';
import {
  CATEGORIES,
  CATEGORY_META,
  SEVERITIES,
  SEVERITY_META,
} from '@/lib/analysis/taxonomy';
import { languageName } from '@/lib/analysis/language';
import type { Severity, ToxicityCategory } from '@/lib/db/schema';
import { StatTile } from '@/components/dashboard/StatTile';
import { CommentList } from '@/components/dashboard/CommentList';
import { ScanActions } from '@/components/dashboard/ScanActions';
import { LanguageBadge } from '@/components/dashboard/LanguageBadge';
import {
  BreakdownChart,
  type BreakdownDatum,
} from '@/components/dashboard/BreakdownChart';
import {
  formatBigCount,
  formatConfidence,
  formatCount,
  formatDateTime,
  formatDuration,
  formatPercent,
} from '@/components/dashboard/format';

export const metadata: Metadata = {
  title: 'Scan detail — ToxiScan',
};

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="hairline-card p-5 sm:p-6">
      <h2 className="title-md text-ink">{title}</h2>
      {description && <p className="caption mt-1 text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 16: dynamic params arrive as a Promise.
  const { id } = await params;
  const user = await requireUser();

  // Scoped to the user inside the query, so another account's uuid 404s
  // rather than leaking that the scan exists at all.
  const detail = await getScanDetail(id, user.id);
  if (!detail) notFound();

  const { scan, comments } = detail;
  const saved = await isScanSaved(user.id, scan.id);

  // One pass over the comments for every rollup the page needs — the detail
  // query already returned all of them, so a second database read would be
  // work done twice.
  const categoryCounts = new Map<ToxicityCategory, number>();
  const severityCounts = new Map<Severity, number>();
  const languageCounts = new Map<string, number>();
  let disagreements = 0;
  let sarcastic = 0;
  let contextShifted = 0;
  let harmful = 0;
  let scored = 0;

  for (const { comment, analysis } of comments) {
    if (!analysis) continue;
    scored += 1;

    categoryCounts.set(
      analysis.category,
      (categoryCounts.get(analysis.category) ?? 0) + 1,
    );
    severityCounts.set(
      analysis.severity,
      (severityCounts.get(analysis.severity) ?? 0) + 1,
    );

    const lang = analysis.language ?? comment.language ?? 'unknown';
    languageCounts.set(lang, (languageCounts.get(lang) ?? 0) + 1);

    if (analysis.modelsDisagree) disagreements += 1;
    if (analysis.isSarcastic) sarcastic += 1;
    if (analysis.contextShifted) contextShifted += 1;
    if (analysis.category !== 'non_toxic') harmful += 1;
  }

  /**
   * Every verdict this user has already given on this scan, in one read.
   *
   * The alternative — each `FeedbackControls` firing its own
   * `GET /api/feedback` on mount — is N+1 by construction: a 200-comment scan
   * would open 200 connections the instant it hydrated to answer a question
   * this single `inArray` answers before the page is even sent. Lazy-on-first-
   * interaction would avoid the storm but leaves every card lying about its
   * state until touched, which is worse for the one user who has already been
   * through the list correcting things.
   */
  const analysisIds = comments
    .map(({ analysis }) => analysis?.id)
    .filter((id): id is string => Boolean(id));

  const feedbackByAnalysisId: Record<string, ExistingFeedback> = {};
  if (analysisIds.length > 0) {
    const rows = await db
      .select({
        commentAnalysisId: feedbackTable.commentAnalysisId,
        verdict: feedbackTable.verdict,
        correctedCategory: feedbackTable.correctedCategory,
        correctedSeverity: feedbackTable.correctedSeverity,
        note: feedbackTable.note,
      })
      .from(feedbackTable)
      .where(
        and(
          eq(feedbackTable.userId, user.id),
          inArray(feedbackTable.commentAnalysisId, analysisIds),
        ),
      );

    for (const row of rows) {
      feedbackByAnalysisId[row.commentAnalysisId] = {
        verdict: row.verdict,
        correctedCategory: row.correctedCategory,
        correctedSeverity: row.correctedSeverity,
        note: row.note,
      };
    }
  }

  const categoryData: BreakdownDatum[] = CATEGORIES.filter((c) =>
    categoryCounts.has(c),
  ).map((c) => ({
    key: c,
    display: CATEGORY_META[c].display,
    value: categoryCounts.get(c) ?? 0,
    pastel: CATEGORY_META[c].pastel,
    ink: CATEGORY_META[c].ink,
  }));

  const severityData: BreakdownDatum[] = SEVERITIES.filter((s) =>
    severityCounts.has(s),
  ).map((s) => ({
    key: s,
    display: SEVERITY_META[s].display,
    value: severityCounts.get(s) ?? 0,
    pastel: SEVERITY_META[s].pastel,
    ink: SEVERITY_META[s].ink,
  }));

  const title = scan.videoTitle?.trim() || 'Untitled video';
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(scan.videoId)}`;
  const hasThumbnail = Boolean(scan.thumbnailUrl?.trim());
  const disagreementRate = scored > 0 ? (disagreements / scored) * 100 : null;

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6">
        <Link
          href="/dashboard/history"
          className="caption inline-flex items-center gap-1.5 text-muted transition-colors hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to history
        </Link>
      </nav>

      {/* ── Video header ────────────────────────────────────────────────── */}
      <header className="hairline-card relative overflow-hidden p-5 sm:p-6">
        <div
          className="orb orb-drifting -right-16 -top-20 h-56 w-56"
          style={{ background: 'var(--color-gradient-sky)' }}
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-strong sm:h-[108px] sm:w-[192px]">
            {hasThumbnail ? (
              <Image
                src={scan.thumbnailUrl as string}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 192px"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-soft)" strokeWidth="1.5" aria-hidden="true">
                  <path d="m10 9 5 3-5 3V9Z" />
                  <rect x="2" y="4" width="20" height="16" rx="3" />
                </svg>
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="display-md text-ink">{title}</h1>
            {scan.channelName && (
              <p className="body-sm mt-1 text-muted">{scan.channelName}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="caption text-muted tabular-nums">
                {formatBigCount(scan.viewCount)} views
              </span>
              <span className="caption text-muted tabular-nums">
                {formatBigCount(scan.commentCount)} comments on YouTube
              </span>
              <span className="caption text-muted-soft">
                Scanned{' '}
                <time dateTime={new Date(scan.createdAt).toISOString()}>
                  {formatDateTime(scan.createdAt)}
                </time>
              </span>
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="caption inline-flex items-center gap-1.5 text-ink underline-offset-4 hover:underline"
              >
                Watch on YouTube
                <ExternalLinkIcon />
              </a>
            </div>
          </div>
        </div>

        {scan.status === 'failed' && (
          <p
            role="alert"
            className="body-sm relative mt-4 rounded-[var(--radius-md)] border border-hairline-strong px-4 py-3 text-[var(--color-semantic-error)]"
          >
            This scan failed. {scan.errorMessage ?? 'No reason was recorded.'}
          </p>
        )}

        <div className="relative mt-5 border-t border-hairline pt-5">
          <ScanActions scanId={scan.id} initiallySaved={saved} />
        </div>
      </header>

      {/* ── Summary tiles ───────────────────────────────────────────────── */}
      <section
        aria-label="Scan summary"
        className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3"
      >
        <StatTile
          label="Analysed"
          value={formatCount(scan.analysedCount)}
          hint={
            scan.erroredCount > 0
              ? `${formatCount(scan.erroredCount)} errored`
              : 'All comments scored'
          }
          tone="mint"
        />
        <StatTile
          label="Harmful"
          value={formatCount(harmful)}
          hint={formatPercent(scan.overallToxicityScore) + ' of the scan'}
          tone="peach"
        />
        <StatTile
          label="Avg. confidence"
          value={formatConfidence(scan.avgConfidence)}
          hint="Mean across every verdict"
          tone="sky"
        />
        <StatTile
          label="Dominant language"
          value={scan.dominantLanguage ? languageName(scan.dominantLanguage) : '—'}
          hint={`${languageCounts.size} detected in total`}
          tone="lavender"
        />
        <StatTile
          label="Took"
          value={formatDuration(scan.durationMs)}
          hint="End to end"
        />
        <StatTile
          label="Models disagreed"
          value={formatPercent(disagreementRate)}
          hint={`${formatCount(disagreements)} comment${disagreements === 1 ? '' : 's'} worth review`}
          tone="rose"
        />
      </section>

      {/* The research signals, called out before the charts so they are not
          lost among the aggregates. */}
      {(sarcastic > 0 || contextShifted > 0 || disagreements > 0) && (
        <section
          aria-label="Research signals"
          className="hairline-card mt-6 p-5 sm:p-6"
        >
          <h2 className="title-md text-ink">What the models noticed</h2>
          <p className="caption mt-1 text-muted">
            Signals beyond a plain category — the cases a single classifier
            would have got wrong on its own.
          </p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="caption-uppercase text-muted">Read as sarcasm</dt>
              <dd className="display-sm mt-1 text-ink tabular-nums">
                {formatCount(sarcastic)}
              </dd>
              <p className="caption mt-1 text-muted">
                Literal wording did not match intent.
              </p>
            </div>
            <div>
              <dt className="caption-uppercase text-muted">Context-shifted</dt>
              <dd className="display-sm mt-1 text-ink tabular-nums">
                {formatCount(contextShifted)}
              </dd>
              <p className="caption mt-1 text-muted">
                Only toxic once the parent comment was read.
              </p>
            </div>
            <div>
              <dt className="caption-uppercase text-muted">Models disagreed</dt>
              <dd className="display-sm mt-1 text-ink tabular-nums">
                {formatCount(disagreements)}
              </dd>
              <p className="caption mt-1 text-muted">
                Classifier and language model reached different verdicts.
              </p>
            </div>
          </dl>
        </section>
      )}

      {/* ── Breakdowns ──────────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Categories"
          description="Where this scan's comments landed in the taxonomy."
        >
          <BreakdownChart
            data={categoryData}
            variant="donut"
            caption="Comments by toxicity category in this scan"
            emptyMessage="Nothing was scored in this scan."
          />
        </Panel>

        <Panel title="Severity" description="How serious each verdict was.">
          <BreakdownChart
            data={severityData}
            variant="bar"
            caption="Comments by severity in this scan"
            emptyMessage="Nothing was scored in this scan."
          />
        </Panel>
      </div>

      {/* ── Languages ───────────────────────────────────────────────────── */}
      {languageCounts.size > 0 && (
        <section className="hairline-card mt-6 p-5 sm:p-6">
          <h2 className="title-md text-ink">Languages in this comment section</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {[...languageCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([code, count]) => (
                <li key={code} className="flex items-center gap-1.5">
                  <LanguageBadge code={code === 'unknown' ? null : code} />
                  <span className="caption text-muted tabular-nums">{count}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* ── Comments ────────────────────────────────────────────────────── */}
      <div className="mt-10">
        {comments.length > 0 ? (
          <CommentList
            entries={comments}
            feedbackByAnalysisId={feedbackByAnalysisId}
          />
        ) : (
          <div className="hairline-card px-6 py-12 text-center">
            <h2 className="title-md text-ink">No comments were stored</h2>
            <p className="body-sm mx-auto mt-2 max-w-[48ch] text-muted">
              {scan.status === 'failed'
                ? 'This scan failed before any comment was saved.'
                : 'This scan completed without storing any comments — the video may have had comments disabled.'}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
