'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthField } from '@/components/auth/AuthField';

const NO_ACCESS_MESSAGE = 'This account does not have administrator access.';

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suspended = searchParams.get('error') === 'suspended';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setError('Those credentials were not accepted.');
      setSubmitting(false);
      return;
    }

    // The role lives in our `profiles` table, not in the JWT, so a correct
    // password is not yet authorisation. RLS lets a user read their own row.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', data.user.id)
      .single<{ role: string; is_suspended: boolean }>();

    if (!profile || profile.role !== 'admin' || profile.is_suspended) {
      // Leaving the session in place would silently sign them in as a plain
      // user on a page that claims to be an admin gate. Undo it.
      await supabase.auth.signOut();
      setError(NO_ACCESS_MESSAGE);
      setSubmitting(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5" noValidate>
      {suspended && (
        <p
          role="alert"
          className="caption border border-[#3a3633] bg-surface-dark-elevated p-3 font-mono text-on-dark-soft"
        >
          This administrator account has been suspended.
        </p>
      )}

      <AuthField
        mono
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="admin@toxiscan.app"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <AuthField
        mono
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && (
        <p
          role="alert"
          className="caption border-l-2 border-[var(--color-semantic-error)] pl-3 font-mono text-on-dark-soft"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting || undefined}
        className="btn-type mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-on-dark font-mono uppercase tracking-[0.08em] text-ink transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Verifying' : 'Authenticate'}
      </button>
    </form>
  );
}
