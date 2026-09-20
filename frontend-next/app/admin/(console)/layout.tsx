import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { feedbackStatusCounts } from '@/lib/db/queries/admin';
import { AdminNav, type AdminNavItem } from '@/components/admin/AdminNav';

/**
 * The console shell.
 *
 * Lives in a `(console)` route group so that `app/admin/login/page.tsx` — one
 * level up, outside the group — renders without any of this chrome. A signed-out
 * visitor must not see a nav bar advertising sections they cannot reach, and a
 * layout that called `requireAdmin()` around the login page would bounce them
 * back to the login page they are already on.
 *
 * `requireAdmin()` here covers every page beneath it. `proxy.ts` has already
 * redirected non-admins, but the proxy is routing, not authorisation, and this
 * is the check that actually reads the role from our own tables.
 */

export const metadata: Metadata = {
  title: 'ToxiScan Admin',
  robots: { index: false, follow: false },
};

/**
 * The console reads live tables on every request. Caching it would show an
 * admin a suspension they just applied as still pending.
 */
export const dynamic = 'force-dynamic';

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  // The open count rides in the nav because the review queue is the one section
  // with work waiting in it — the rest are things you go and look at.
  const counts = await feedbackStatusCounts();

  const items: AdminNavItem[] = [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/scans', label: 'Scans' },
    { href: '/admin/feedback', label: 'Feedback', badge: counts.open },
    { href: '/admin/metrics', label: 'Metrics' },
    { href: '/admin/models', label: 'Models' },
    { href: '/admin/audit', label: 'Audit' },
  ];

  const name = admin.profile.fullName ?? admin.email;

  return (
    <div className="min-h-screen bg-canvas-soft">
      {/* Fixed left sidebar — same dialect as the dashboard. */}
      <aside
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[240px] lg:flex-col lg:border-r lg:border-hairline lg:bg-canvas-soft"
        aria-label="Admin navigation"
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline px-5">
          <Link
            href="/admin"
            className="flex items-baseline gap-2"
            aria-label="ToxiScan Admin home"
          >
            <span className="font-display text-[19px] leading-none font-normal text-ink">
              ToxiScan
            </span>
            <span className="caption-uppercase rounded-[var(--radius-xs)] border border-hairline-strong px-1.5 py-[3px] text-[9.5px] leading-none text-muted">
              Admin
            </span>
          </Link>
        </div>

        <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-3 py-4">
          <AdminNav items={items} />
        </nav>

        <div className="shrink-0 border-t border-hairline p-3">
          <div className="flex items-center gap-2.5 rounded-[var(--radius-xs)] border border-hairline bg-surface-card px-2.5 py-2">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-on-primary"
            >
              {name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[12.5px] font-medium text-ink"
                title={name}
              >
                {name}
              </p>
              <p
                className="truncate text-[11px] text-muted"
                title={admin.email}
              >
                {admin.email}
              </p>
            </div>
          </div>

          <form action="/auth/signout" method="post" className="mt-2.5">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-xs)] border border-hairline-strong px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink hover:bg-surface-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M15 4h4v16h-4M9 12h11M14 8l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar — sidebar collapses below lg, nav re-appears as a wrap row. */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-canvas-soft/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/admin"
            className="flex items-baseline gap-2"
            aria-label="ToxiScan Admin home"
          >
            <span className="font-display text-[19px] leading-none font-normal text-ink">
              ToxiScan
            </span>
            <span className="caption-uppercase rounded-[var(--radius-xs)] border border-hairline-strong px-1.5 py-[3px] text-[9.5px] leading-none text-muted">
              Admin
            </span>
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-[var(--radius-xs)] border border-hairline-strong px-2 py-1 text-[11.5px] font-medium text-ink hover:border-ink hover:bg-surface-strong"
            >
              Sign out
            </button>
          </form>
        </div>
        {/* Wrap row of all 7 destinations — narrow enough at <md that
            horizontal scroll beats a hamburger here. */}
        <div className="overflow-x-auto border-t border-hairline-soft px-4 py-1.5">
          <AdminNav items={items} />
        </div>
      </header>

      <main className="lg:pl-[240px]">
        <div className="mx-auto max-w-[1280px] px-4 pt-7 pb-12 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
