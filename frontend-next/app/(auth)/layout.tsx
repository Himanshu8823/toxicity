import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Shell for the user-facing auth pages.
 *
 * Deliberately without Nav and Footer: these pages have exactly one job, and
 * every extra link is an invitation to abandon it. The wordmark stays, because
 * a page with no way back to the site reads as a phishing form.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-canvas">
      {/* Atmosphere only. Sits behind everything and never takes a click. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="orb orb-drifting -left-24 -top-32 h-[380px] w-[380px]"
          style={{ background: 'var(--color-gradient-lavender)' }}
        />
        <div
          className="orb orb-drifting -right-28 top-1/3 h-[320px] w-[320px]"
          style={{ background: 'var(--color-gradient-mint)', animationDelay: '-7s' }}
        />
        <div
          className="orb orb-drifting bottom-[-140px] left-1/4 h-[300px] w-[300px]"
          style={{ background: 'var(--color-gradient-peach)', animationDelay: '-14s' }}
        />
      </div>

      <header className="relative z-10 flex h-16 items-center">
        <div className="editorial-container">
          <Link href="/" className="display-sm text-ink" aria-label="ToxiScan home">
            ToxiScan
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>

      <div className="grain" aria-hidden="true" />
    </div>
  );
}
