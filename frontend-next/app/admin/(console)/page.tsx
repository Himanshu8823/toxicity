import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import {
  getPlatformCategoryBreakdown,
  getPlatformLanguageBreakdown,
  getPlatformStats,
  getRecentActivity,
  getScansOverTime,
  getSignupsOverTime,
} from '@/lib/db/queries/admin';
import {
  ConsolePage,
  Panel,
  Stat,
  StatRow,
  Figure,
  StatusDot,
  formatCount,
  formatPercent,
  relativeTime,
  EmptyState,
  type DotTone,
} from '@/components/admin/console';
import {
  CategoryDistribution,
  DailyBars,
  DistributionBars,
} from '@/components/admin/charts';

/**
 * Platform overview.
 *
 * The first screen an operator sees, so it answers the three questions they
 * actually arrive with — is anything broken, is anything waiting for me, and
 * what has been happening — before it offers anything to explore.
 */

export default async function AdminOverviewPage() {
  // Defence in depth. The layout above already ran this, and the proxy before
  // that, but a page that reads cross-user data states its own requirement.
  await requireAdmin();

  const [stats, scanSeries, signupSeries, categories, languages, activity] =
    await Promise.all([
      getPlatformStats(),
      getScansOverTime(30),
      getSignupsOverTime(30),
      getPlatformCategoryBreakdown(),
      getPlatformLanguageBreakdown(),
      getRecentActivity(14),
    ]);

  return (
    <ConsolePage
      title="Platform overview"
      description="Every account, every scan. Figures are live — nothing on this page is cached."
    >
      <StatRow>
        <Stat
          label="Users"
          value={formatCount(stats.totalUsers)}
          hint={`+${stats.newUsersThisWeek} this week · ${stats.suspendedUsers} suspended`}
          emphasis
        />
        <Stat
          label="Scans"
          value={formatCount(stats.totalScans)}
          hint={`+${stats.scansThisWeek} this week`}
          emphasis
        />
        <Stat
          label="Failure rate"
          value={formatPercent(stats.failureRate)}
          hint={`${formatCount(stats.failedScans)} failed scans`}
        />
        <Stat
          label="Comments analysed"
          value={formatCount(stats.commentsAnalysed)}
          hint={`${formatCount(stats.disagreementCount)} model disagreements`}
        />
        <Stat
          label="Harmful rate"
          value={formatPercent(stats.harmfulRate)}
          hint={`${formatCount(stats.harmfulComments)} harmful comments`}
        />
        <Stat
          label="Open feedback"
          value={formatCount(stats.openFeedback)}
          hint={
            stats.openFeedback > 0 ? 'Awaiting human review' : 'Queue is clear'
          }
        />
      </StatRow>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Scans, last 30 days"
          description="One bar per day across every account."
        >
          <DailyBars data={scanSeries} label="Scans per day" />
        </Panel>
        <Panel
          title="Signups, last 30 days"
          description="New profiles created, by the day the account was made."
        >
          <DailyBars data={signupSeries} label="Signups per day" />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Category distribution"
          description="Every analysed comment platform-wide, by the category the pipeline settled on."
          footnote={
            <>
              Reports generated to date:{' '}
              <Figure className="text-[12px]">
                {formatCount(stats.reportsGenerated)}
              </Figure>
            </>
          }
        >
          <CategoryDistribution
            rows={categories}
            caption="Comment count by toxicity category across the whole platform"
          />
        </Panel>

        <Panel
          title="Language distribution"
          description="Detected language per analysed comment, with the harmful share of each."
          footnote={
            <>
              An uneven harmful share across languages is either a real
              difference in the corpora or a model performing worse in one of
              them — the{' '}
              <Link href="/admin/metrics" className="text-ink underline underline-offset-2">
                metrics page
              </Link>{' '}
              separates the two.
            </>
          }
        >
          <DistributionBars
            caption="Comment count by detected language across the whole platform"
            rows={languages.map((l) => ({
              key: l.language ?? 'unknown',
              label: `${l.language ?? 'unknown'} · ${formatPercent(
                l.value === 0 ? 0 : l.harmful / l.value,
                0
              )} harmful`,
              value: l.value,
            }))}
          />
        </Panel>
      </div>

      <div className="mt-4">
        <Panel
          title="Recent activity"
          description="Admin actions from the audit log, interleaved with the latest scans."
          bodyClassName="px-0 py-0"
          footnote={
            <Link
              href="/admin/audit"
              className="text-ink underline underline-offset-2"
            >
              Full audit log
            </Link>
          }
        >
          {activity.length === 0 ? (
            <EmptyState
              title="Nothing has happened yet"
              description="Scans and admin actions will appear here as they occur."
            />
          ) : (
            <ul className="divide-y divide-hairline-soft">
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <StatusDot
                    tone={activityTone(entry.action)}
                    label={entry.action}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-body">
                    {entry.detail ?? '—'}
                  </span>
                  <span className="hidden max-w-[200px] shrink-0 truncate text-[12px] text-muted sm:inline">
                    {entry.actor ?? 'system'}
                  </span>
                  <span className="w-[72px] shrink-0 text-right font-mono text-[11.5px] tabular-nums text-muted-soft">
                    {relativeTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </ConsolePage>
  );
}

/** Maps an action name onto the muted dot palette. Unknown actions stay neutral. */
function activityTone(action: string): DotTone {
  if (action === 'scan.failed') return 'critical';
  if (action === 'scan.complete') return 'positive';
  if (action === 'scan.running' || action === 'scan.pending') return 'idle';
  if (action.startsWith('user.suspend')) return 'critical';
  if (action.startsWith('feedback.accepted')) return 'warn';
  return 'neutral';
}
