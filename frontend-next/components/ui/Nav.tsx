'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface NavLinkItem {
  href: string;
  label: string;
}

export interface NavProps {
  links?: NavLinkItem[];
  ctaHref?: string;
  ctaLabel?: string;
}

const DEFAULT_LINKS: NavLinkItem[] = [
  { href: '/#analyse-form', label: 'Analyse' },
  { href: '/playground', label: 'Playground' },
  { href: '/about', label: 'About' },
];

function isActiveHref(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * 64px top nav on the `canvas` surface: wordmark left, links centre-right,
 * ink pill CTA right. Collapses to a hamburger + full-screen drawer below
 * 768px (Tailwind's `md` breakpoint), matching DESIGN.md's "hamburger below
 * 768px" rule.
 */
export function Nav({
  links = DEFAULT_LINKS,
  ctaHref = '/#analyse-form',
  ctaLabel = 'Analyse a video',
}: NavProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Lock scroll and close the drawer automatically on route change.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const { style } = document.body;
    const previous = style.overflow;
    style.overflow = 'hidden';
    return () => {
      style.overflow = previous;
    };
  }, [drawerOpen]);

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-hairline bg-canvas">
      <div className="editorial-container flex h-16 items-center justify-between">
        <Link href="/" className="display-sm text-ink" aria-label="ToxiScan home">
          ToxiScan
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {links.map((link) => {
            const active = isActiveHref(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'nav-link-type transition-colors',
                  active ? 'text-ink' : 'text-muted hover:text-ink',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href={ctaHref}
          className="btn-type hidden h-10 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-5 text-on-primary transition-colors hover:bg-primary-active md:inline-flex"
        >
          {ctaLabel}
        </Link>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-ink md:hidden"
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {drawerOpen ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      <div
        id="mobile-nav-drawer"
        className={cn(
          'fixed inset-x-0 top-16 z-40 origin-top border-b border-hairline bg-canvas md:hidden',
          'transition-[transform,opacity] duration-200 ease-out',
          drawerOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0',
        )}
      >
        <nav
          aria-label="Mobile"
          className="editorial-container flex flex-col gap-1 py-4"
        >
          {links.map((link) => {
            const active = isActiveHref(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'nav-link-type rounded-[var(--radius-md)] px-3 py-3',
                  active ? 'bg-surface-strong text-ink' : 'text-muted hover:text-ink',
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href={ctaHref}
            className="btn-type mt-3 flex h-10 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-5 text-on-primary"
          >
            {ctaLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}
