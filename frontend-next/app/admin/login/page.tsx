import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

export const metadata: Metadata = {
  title: 'Administrator access — ToxiScan',
  robots: { index: false, follow: false },
};

/**
 * The admin gate, deliberately nothing like `/login`.
 *
 * It sits outside the `(auth)` route group and renders on the dark surface
 * with monospace labels: someone who lands here by accident should be able to
 * tell at a glance that this is not the door they wanted. No registration
 * link — admin accounts are granted, never self-served.
 */
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-dark">
      <header className="flex h-16 items-center border-b border-[#292524]">
        <div className="editorial-container">
          <Link
            href="/"
            className="caption-uppercase font-mono text-on-dark-soft transition-colors hover:text-on-dark"
          >
            ToxiScan
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[400px]">
          <p className="caption-uppercase font-mono text-on-dark-soft">
            Restricted
          </p>
          <h1 className="title-md mt-4 font-mono text-on-dark">
            Administrator access
          </h1>
          <p className="body-sm mt-3 text-on-dark-soft">
            Credentials are verified against the administrator role. Every
            sign-in attempt on this surface is recorded.
          </p>

          <Suspense fallback={<AdminFormFallback />}>
            <AdminLoginForm />
          </Suspense>

          <p className="caption mt-10 border-t border-[#292524] pt-6 font-mono text-[#57534e]">
            Not an administrator?{' '}
            <Link href="/login" className="text-on-dark-soft underline underline-offset-4">
              Standard sign-in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/** Mirrors the form's geometry so nothing jumps when it hydrates. */
function AdminFormFallback() {
  return (
    <div className="mt-10 flex flex-col gap-5" aria-hidden="true">
      {[0, 1].map((index) => (
        <div key={index} className="flex flex-col gap-2">
          <div className="h-3 w-20 bg-surface-dark-elevated" />
          <div className="h-11 w-full rounded-[var(--radius-md)] bg-surface-dark-elevated" />
        </div>
      ))}
      <div className="mt-2 h-11 w-full rounded-[var(--radius-sm)] bg-surface-dark-elevated" />
    </div>
  );
}
