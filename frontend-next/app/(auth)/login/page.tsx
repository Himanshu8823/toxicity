import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthCardSkeleton } from '@/components/auth/AuthCardSkeleton';

export const metadata: Metadata = {
  title: 'Sign in — ToxiScan',
  description: 'Sign in to ToxiScan to run scans and read your saved reports.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  // The form reads `?next=` and `?error=` via useSearchParams, which Next 16
  // refuses to prerender outside a boundary.
  return (
    <Suspense fallback={<AuthCardSkeleton fields={2} />}>
      <LoginForm />
    </Suspense>
  );
}
