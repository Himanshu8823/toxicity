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
      <header className="sticky top-0 z-40 border-b border-hairline bg-canvas-soft/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-5 px-4 sm:px-6">
          <Link
            href="/admin"
            className="flex shrink-0 items-baseline gap-2"
            aria-label="ToxiScan Admin home"
          >
            <span className="font-display text-[19px] leading-none font-normal text-ink">
              ToxiScan
            </span>
            <span className="caption-uppercase rounded-[var(--radius-xs)] border border-hairline-strong px-1.5 py-[3px] text-[9.5px] leading-none text-muted">
              Admin
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 md:block">
            <AdminNav items={items} />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden text-[12.5px] text-muted hover:text-ink lg:inline"
            >
              Back to app
            </Link>
            <div className="flex items-center gap-2 rounded-[var(--radius-xs)] border border-hairline bg-surface-card px-2 py-1">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-on-primary"
              >
                {name.slice(0, 1).toUpperCase()}
              </span>
              <span
                className="max-w-[160px] truncate text-[12.5px] text-body-strong"
                title={admin.email}
              >
                {admin.email}
              </span>
              {/*
                A plain form POST rather than a click handler: sign-out is a
                state change, it must not be reachable by a GET, and doing it
                this way keeps the whole shell a Server Component.
              */}
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-[var(--radius-xs)] border border-hairline-strong px-1.5 py-[3px] text-[11.5px] font-medium text-ink hover:border-ink hover:bg-surface-strong"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* The nav wraps below the bar on narrow viewports rather than collapsing
            into a menu: seven destinations is few enough to show them all. */}
        <div className="overflow-x-auto border-t border-hairline-soft px-4 py-1.5 md:hidden">
          <AdminNav items={items} />
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 pt-7 sm:px-6">{children}</main>
    </div>
  );
}
