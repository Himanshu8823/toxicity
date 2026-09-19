import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/guards';
import {
  getCategoryBreakdown,
  getLanguageBreakdown,
  getToxicityTrend,
  getUserStats,
  listScansForUser,
} from '@/lib/db/queries/scans';
import { categoryMeta } from '@/lib/analysis/taxonomy';
import { languageName } from '@/lib/analysis/language';
import { StatTile } from '@/components/dashboard/StatTile';
import { ScanRow } from '@/components/dashboard/ScanRow';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { TrendChart } from '@/components/dashboard/TrendChart';
import {
  BreakdownChart,
  type BreakdownDatum,
} from '@/components/dashboard/BreakdownChart';
import {
  formatCount,
  formatPercent,
} from '@/components/dashboard/format';

export const metadata: Metadata = {
  title: 'Overview — ToxiScan',
};

const TREND_DAYS = 30;

/**
 * Language has no taxonomy colour of its own, so the pastels are cycled by
 * position. They carry no meaning here — the chart is a magnitude comparison,
 * and using category inks would falsely imply Hindi means something.
 */
const LANGUAGE_PALETTE = [
  { pastel: '#a8c8e8', ink: '#3d5f80' },
  { pastel: '#a7e5d3', ink: '#3f6b5c' },
  { pastel: '#c8b8e0', ink: '#5f4d7a' },
  { pastel: '#f4c5a8', ink: '#8a5a3c' },
  { pastel: '#e8b8c4', ink: '#8a3f52' },
] as const;

function Panel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <section className="hairline-card p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="title-md text-ink">{title}</h2>
          {description && <p className="caption mt-1 text-muted">{description}</p>}
        </div>
        {action && (
          <Link
            href={action.href}
            className="btn-type shrink-0 text-ink underline-offset-4 hover:underline"
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function DashboardOverviewPage() {
  const user = await requireUser();

  // Independent aggregates — one round trip's worth of latency, not six.
  const [stats, trend, categories, languages, recentScans] = await Promise.all([
    getUserStats(user.id),
    getToxicityTrend(user.id, TREND_DAYS),
    getCategoryBreakdown(user.id),
    getLanguageBreakdown(user.id),
    listScansForUser(user.id, { limit: 5 }),
  ]);

  const firstName = user.profile.fullName?.trim().split(/\s+/)[0];

  // "Never scanned" is a different state from "scanned and found nothing", and
  // only the first one deserves the full-page invitation.
  if (stats.totalScans === 0 && recentScans.length === 0) {
    return (
      <>
        <header className="mb-8">
          <p className="caption-uppercase text-muted">Overview</p>
          <h1 className="display-lg mt-2 text-ink">
            {firstName ? `Welcome, ${firstName}` : 'Welcome to ToxiScan'}
          </h1>
        </header>

        <EmptyState
          title="Your first comment section is one URL away"
          description="Paste a link to any public YouTube video and ToxiScan will read its comments — scoring each one across nine categories, in thirteen languages, and telling you which verdicts it is least sure about."
          action={{ href: '/#analyse-form', label: 'Analyse a video' }}
          secondaryAction={{ href: '/playground', label: 'Try the playground' }}
        >
          <p className="caption text-muted">
            Nothing is analysed until you ask for it, and every scan stays on
            your account alone.
          </p>
        </EmptyState>
      </>
    );
  }

  const categoryData: BreakdownDatum[] = categories.map((row) => {
    const meta = categoryMeta(row.category);
    return {
      key: row.category,
      display: meta.display,
      value: row.value,
      pastel: meta.pastel,
      ink: meta.ink,
    };
  });

  const languageData: BreakdownDatum[] = languages.map((row, index) => {
    const tone = LANGUAGE_PALETTE[index % LANGUAGE_PALETTE.length];
    return {
      key: row.language ?? 'unknown',
      display: row.language ? languageName(row.language) : 'Undetected',
      value: row.value,
      pastel: tone.pastel,
      ink: tone.ink,
    };
  });

  const languagesSeen = languageData.filter((d) => d.key !== 'unknown').length;

  return (
    <>
      <header className="mb-8">
        <p className="caption-uppercase text-muted">Overview</p>
        <h1 className="display-lg mt-2 text-ink">
          {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        </h1>
        <p className="body-md mt-3 max-w-[60ch] text-body">
          Everything you have analysed so far, and how the conversations you
          have looked at have been trending.
        </p>
      </header>

      <section aria-label="Your totals" className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile
          label="Total scans"
          value={formatCount(stats.totalScans)}
          hint={`${formatCount(stats.scansThisWeek)} this week`}
          tone="sky"
        />
        <StatTile
          label="Comments analysed"
          value={formatCount(stats.totalComments)}
          hint="Across every completed scan"
          tone="mint"
        />
        <StatTile
          label="Harmful found"
          value={formatCount(stats.harmfulComments)}
          hint={
            stats.totalComments > 0
              ? `${((stats.harmfulComments / stats.totalComments) * 100).toFixed(1)}% of all comments`
              : 'Nothing scored yet'
          }
          tone="peach"
        />
        <StatTile
          label="Avg. toxicity"
          value={formatPercent(stats.avgToxicity)}
          hint="Mean across completed scans"
          tone="rose"
        />
        <StatTile
          label="Saved analyses"
          value={formatCount(stats.savedCount)}
          hint="Bookmarked for later"
          tone="lavender"
        />
        <StatTile
          label="Scans this week"
          value={formatCount(stats.scansThisWeek)}
          hint="Last seven days"
        />
      </section>

      {/* Language first among the charts: it is the claim the project makes. */}
      <div className="mt-8">
        <Panel
          title="Languages detected"
          description={
            languagesSeen > 0
              ? `${languagesSeen} language${languagesSeen === 1 ? '' : 's'} across your comments — each routed to the classifier that handles it best.`
              : 'Language is detected before any model runs, so each comment reaches the right classifier.'
          }
        >
          <BreakdownChart
            data={languageData}
            variant="bar"
            caption="Comments analysed by detected language"
            emptyMessage="No languages detected yet — run a scan to see the split."
          />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Toxicity trend"
          description={`Average toxicity per day over the last ${TREND_DAYS} days.`}
        >
          <TrendChart data={trend} days={TREND_DAYS} />
        </Panel>

        <Panel
          title="Category breakdown"
          description="Where every scored comment landed in the taxonomy."
        >
          <BreakdownChart
            data={categoryData}
            variant="donut"
            caption="Comments by toxicity category"
            emptyMessage="No categories to chart yet."
          />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="Recent scans"
          description="Your five most recent analyses."
          action={{ href: '/dashboard/history', label: 'View all' }}
        >
          {recentScans.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {recentScans.map((scan) => (
                <ScanRow key={scan.id} scan={scan} readOnly />
              ))}
            </ul>
          ) : (
            <p className="body-sm text-muted">
              No scans yet.{' '}
              <Link href="/#analyse-form" className="text-ink underline underline-offset-4">
                Analyse a video
              </Link>{' '}
              to get started.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
