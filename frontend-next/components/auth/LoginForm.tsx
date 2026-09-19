'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthField } from './AuthField';
import { Button } from '@/components/ui/Button';

/** Copy for the `?error=` values `proxy.ts` and the guards can send here. */
const REDIRECT_ERRORS: Record<string, string> = {
  suspended:
    'This account has been suspended. Contact support if you believe that is a mistake.',
  auth: 'That sign-in link is no longer valid. Enter your details to continue.',
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `next` comes from the proxy when it bounces an unauthenticated request.
  // Only same-site paths are honoured: an absolute URL here would turn the
  // login page into an open redirect.
  const rawNext = searchParams.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
    ? rawNext
    : '/dashboard';

  const redirectError = REDIRECT_ERRORS[searchParams.get('error') ?? ''];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // Supabase already refuses to say which half was wrong, and neither do
      // we — distinguishing them would confirm which emails have accounts.
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'That email and password combination is not recognised.'
          : signInError.message,
      );
      setSubmitting(false);
      return;
    }

    router.push(next);
    // Required: push alone reuses the cached RSC payload, which was rendered
    // for a signed-out visitor. refresh() re-fetches it with the new session.
    router.refresh();
  }

  return (
    <div className="hairline-card p-7 shadow-[var(--shadow-soft-drop)] sm:p-9">
      <p className="caption-uppercase text-muted">Welcome back</p>
      <h1 className="display-lg mt-3 text-ink">Sign in</h1>
      <p className="body-md mt-3 text-body">
        Pick up where you left off — your scans and reports are waiting.
      </p>

      {redirectError && (
        <p
          role="alert"
          className="caption mt-6 rounded-[var(--radius-md)] border border-hairline-strong bg-canvas-soft p-3 text-body"
        >
          {redirectError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <AuthField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <div className="flex flex-col gap-2">
          <AuthField
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Link
            href="/forgot-password"
            className="caption self-end text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        {error && (
          <p role="alert" className="caption text-[var(--color-semantic-error)]">
            {error}
          </p>
        )}

        <Button type="submit" loading={submitting} className="mt-1 w-full">
          {submitting ? 'Signing in' : 'Sign in'}
        </Button>
      </form>

      <p className="body-sm mt-7 border-t border-hairline pt-6 text-muted">
        New to ToxiScan?{' '}
        <Link href="/register" className="text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
