'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
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
  // Match root-level hash links as active only when we're on the home page.
  if (href.startsWith('/#')) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/**
 * 64px top nav on the `canvas` surface: wordmark left, links centre-right,
 * ink pill CTA right. Collapses to a hamburger + full-screen drawer below
 * 768px (Tailwind's `md` breakpoint), matching DESIGN.md's "hamburger below
 * 768px" rule.
 *
 * Scrolled state: when the page has scrolled past 8px, the bottom border
 * softens into a hairline drop shadow and the nav settles to a 60px height.
 * The active link's underline animates in via `layoutId` so it slides
 * between links during navigation rather than fading.
 */
export function Nav({
  links = DEFAULT_LINKS,
  ctaHref = '/#analyse-form',
  ctaLabel = 'Analyse a video',
}: NavProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion() ?? false;

  // Lock scroll and close the drawer automatically on route change.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Body-scroll lock while the mobile drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const { style } = document.body;
    const previous = style.overflow;
    style.overflow = 'hidden';
    return () => {
      style.overflow = previous;
    };
  }, [drawerOpen]);

  // Scrolled-state listener. Throttled via rAF so we don't thrash React
  // on every scroll frame.
  useEffect(() => {
    let frame = 0;
    let mounted = true;
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!mounted) return;
        setScrolled(window.scrollY > 8);
      });
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      mounted = false;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <motion.header
      className={cn(
        'sticky top-0 z-50 border-b bg-canvas transition-[height,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        scrolled
          ? 'h-[60px] border-transparent shadow-[var(--shadow-soft-drop)]'
          : 'h-16 border-hairline',
      )}
      animate={reduceMotion ? undefined : { height: scrolled ? 60 : 64 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
    >
      <div className="editorial-container flex h-full items-center justify-between">
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
                  'nav-link-type relative inline-block py-1 transition-colors',
                  active ? 'text-ink' : 'text-muted hover:text-ink',
                )}
              >
                <span className="relative">
                  {link.label}
                  {active ? (
                    <motion.span
                      layoutId="nav-active-indicator"
                      className="absolute inset-x-0 -bottom-1 h-[1.5px] rounded-full bg-ink"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { duration: 0.5, ease: EASE_OUT_EXPO }
                      }
                    />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>

        <Link
          href={ctaHref}
          className="btn-type hidden h-10 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-5 text-on-primary transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1.5px] hover:bg-primary-active hover:shadow-[var(--shadow-soft-drop)] md:inline-flex"
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
          'fixed inset-x-0 top-[60px] z-40 origin-top border-b border-hairline bg-canvas md:hidden',
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
    </motion.header>
  );
}
