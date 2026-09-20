'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export interface DashboardNavProps {
  /** Shown in the user chip; falls back to the email when unset. */
  userName: string;
  userEmail: string;
  /** Single character for the avatar circle. */
  initial: string;
}

interface NavItem {
  href: string;
  label: string;
  /** Inline SVG path data — no icon font, matching the rest of the app. */
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/analyse', label: 'Analyse', icon: 'M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z' },
  { href: '/dashboard', label: 'Overview', icon: 'M3 12h7V3H3v9Zm11 9h7v-9h-7v9ZM3 21h7v-5H3v5Zm11-12h7V3h-7v6Z' },
  { href: '/dashboard/text-analysis', label: 'Text analysis', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z' },
  { href: '/dashboard/history', label: 'History', icon: 'M12 8v5l3 2M3 12a9 9 0 1 0 2.6-6.4M3 4v4h4' },
  { href: '/dashboard/saved', label: 'Saved', icon: 'M6 3h12v18l-6-4.5L6 21V3Z' },
  { href: '/dashboard/reports', label: 'Reports', icon: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5M9 13h6M9 17h6' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-2-1.2L14.6 2h-4l-.4 2.7a7.5 7.5 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2l.4 2.7h4l.4-2.7c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z' },
];

/** `/dashboard` must not light up while the user is on `/dashboard/analyse` or `/dashboard/saved`. */
function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

/**
 * Sign-out lives in the client because the session cookie is rotated by the
 * browser Supabase client; doing it server-side would leave a stale client
 * session behind until the next full reload.
 */
function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // `refresh()` as well as `push()`: the Server Components above this tree
    // cached the signed-in user, and only a refresh discards that.
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className={cn(
        'btn-type inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-hairline-strong px-4 text-ink transition-colors duration-150 hover:border-ink disabled:opacity-50',
        className,
      )}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

/**
 * The dashboard's navigation, in both of its forms.
 *
 * Desktop (`lg` and up): a fixed sidebar column with the wordmark, the five
 * links, and the user chip pinned to the bottom.
 *
 * Below `lg`: a sticky top bar with a disclosure drawer, because a 240px
 * sidebar on a 360px phone leaves no room for the content it is navigating.
 * Both render the same link list from `NAV_ITEMS` so they can never drift.
 */
export function DashboardNav({ userName, userEmail, initial }: DashboardNavProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Navigating is the end of the drawer's job.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const links = NAV_ITEMS.map((item) => {
    const active = isActive(pathname, item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'nav-link-type flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 transition-colors duration-150',
            active
              ? 'bg-surface-strong text-ink'
              : 'text-muted hover:bg-surface-strong/60 hover:text-ink',
          )}
        >
          <NavIcon d={item.icon} />
          {item.label}
        </Link>
      </li>
    );
  });

  const userChip = (
    <div className="flex items-center gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary"
        aria-hidden="true"
      >
        <span className="body-strong">{initial}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="body-sm block truncate text-ink">{userName}</span>
        <span className="caption block truncate text-muted">{userEmail}</span>
      </span>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[264px] lg:flex-col lg:border-r lg:border-hairline lg:bg-canvas-soft">
        <div className="flex h-16 shrink-0 items-center px-6">
          <Link href="/" className="display-sm text-ink" aria-label="ToxiScan home">
            ToxiScan
          </Link>
        </div>

        <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-4 py-2">
          <ul className="flex flex-col gap-1">{links}</ul>
        </nav>

        <div className="shrink-0 border-t border-hairline p-4">
          {userChip}
          <SignOutButton className="mt-3 w-full" />
        </div>
      </div>

      {/* ── Mobile top bar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-hairline bg-canvas lg:hidden">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="display-sm text-ink" aria-label="ToxiScan home">
            ToxiScan
          </Link>

          <button
            type="button"
            onClick={() => setDrawerOpen((open) => !open)}
            aria-expanded={drawerOpen}
            aria-controls="dashboard-drawer"
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-ink"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {drawerOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        <div
          id="dashboard-drawer"
          hidden={!drawerOpen}
          className="border-t border-hairline bg-canvas px-4 py-4 sm:px-6"
        >
          <nav aria-label="Dashboard">
            <ul className="flex flex-col gap-1">{links}</ul>
          </nav>
          <div className="mt-4 border-t border-hairline pt-4">
            {userChip}
            <SignOutButton className="mt-3 w-full" />
          </div>
        </div>
      </header>
    </>
  );
}

export default DashboardNav;
