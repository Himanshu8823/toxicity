'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthField } from '@/components/auth/AuthField';
import { Button } from '@/components/ui/Button';

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
      setError(
        signInError?.message === 'Invalid login credentials'
          ? 'That email and password combination is not recognised.'
          : signInError?.message ?? 'Sign-in failed.'
      );
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
    <div className="hairline-card p-7 shadow-[var(--shadow-soft-drop)] sm:p-9">
      <p className="caption-uppercase text-muted">Restricted</p>
      <h1 className="display-lg mt-3 text-ink">Administrator access</h1>
      <p className="body-md mt-3 text-body">
        Credentials are verified against the administrator role. Every sign-in
        attempt on this surface is recorded.
      </p>

      {suspended && (
        <p
          role="alert"
          className="caption mt-6 rounded-[var(--radius-md)] border border-hairline-strong bg-canvas-soft p-3 text-body"
        >
          This administrator account has been suspended.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <AuthField
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
          <p role="alert" className="caption text-[var(--color-semantic-error)]">
            {error}
          </p>
        )}

        <Button type="submit" loading={submitting} className="mt-1 w-full">
          {submitting ? 'Verifying' : 'Sign in'}
        </Button>
      </form>

      <p className="body-sm mt-7 border-t border-hairline pt-6 text-muted">
        Not an administrator?{' '}
        <a href="/login" className="text-ink underline underline-offset-4">
          Standard sign-in
        </a>
      </p>
    </div>
  );
}

export default AdminLoginForm;
