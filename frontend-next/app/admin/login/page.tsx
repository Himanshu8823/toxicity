import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

/**
 * Administrator sign-in.
 *
 * Intentionally outside the user-facing `(auth)` route group so the surface
 * stays separate, but visually identical to it: same canvas background, same
 * atmospheric orbs, same wordmark, same form geometry. The signal that this
 * is a different door comes from the copy, not from a black screen.
 */
export const metadata: Metadata = {
  title: 'Administrator access — ToxiScan',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-canvas">
      {/* Atmosphere — same as the user auth layout. */}
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
          <Link
            href="/"
            className="display-sm text-ink"
            aria-label="ToxiScan home"
          >
            ToxiScan
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
        <div className="w-full max-w-[440px]">
          <Suspense fallback={null}>
            <AdminLoginForm />
          </Suspense>
        </div>
      </main>

      <div className="grain" aria-hidden="true" />
    </div>
  );
}
