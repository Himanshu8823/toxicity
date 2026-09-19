'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthField } from './AuthField';
import { Button } from '@/components/ui/Button';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Whether the recovery link has produced a usable session yet. The browser
 * client picks the tokens out of the URL asynchronously on mount, so the form
 * would otherwise let someone type a password only to fail on submit.
 */
type RecoveryState = 'checking' | 'ready' | 'invalid';

export function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recovery, setRecovery] = useState<RecoveryState>('checking');

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    // getSession() rather than getUser(): at this point we only need to know
    // whether the recovery tokens were consumed, and updateUser() revalidates
    // against the server anyway.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setRecovery(data.session ? 'ready' : 'invalid');
    });

    // The link's tokens may land after the first check, so listen for the
    // PASSWORD_RECOVERY / SIGNED_IN event the client emits once it parses them.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) setRecovery('ready');
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    let invalid = false;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      invalid = true;
    }
    if (confirmPassword !== password) {
      setConfirmError('Both passwords must match.');
      invalid = true;
    }
    if (invalid) return;

    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setFormError(error.message);
      setSubmitting(false);
      return;
    }

    router.push('/dashboard');
    // The password change rotates the session cookies; refresh so server
    // components render against the new ones rather than the cached payload.
    router.refresh();
  }

  if (recovery === 'invalid') {
    return (
      <div className="hairline-card p-7 shadow-[var(--shadow-soft-drop)] sm:p-9">
        <p className="caption-uppercase text-muted">Link expired</p>
        <h1 className="display-lg mt-3 text-ink">This link no longer works</h1>
        <p className="body-md mt-4 text-body">
          Password reset links are single-use and expire quickly. Request a fresh
          one and it will work straight away.
        </p>
        <Link
          href="/forgot-password"
          className="btn-type mt-8 inline-flex h-10 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-5 text-on-primary transition-colors duration-150 hover:bg-primary-active"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="hairline-card p-7 shadow-[var(--shadow-soft-drop)] sm:p-9">
      <p className="caption-uppercase text-muted">Account recovery</p>
      <h1 className="display-lg mt-3 text-ink">Choose a new password</h1>
      <p className="body-md mt-3 text-body">
        Once you save it you will be signed in and taken to your dashboard.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <AuthField
          label="New password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          value={password}
          error={passwordError ?? undefined}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          disabled={recovery === 'checking'}
          onChange={(event) => {
            setPassword(event.target.value);
            setPasswordError(null);
          }}
        />

        <AuthField
          label="Confirm new password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          value={confirmPassword}
          error={confirmError ?? undefined}
          disabled={recovery === 'checking'}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setConfirmError(null);
          }}
        />

        {formError && (
          <p role="alert" className="caption text-[var(--color-semantic-error)]">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          loading={submitting}
          disabled={recovery === 'checking'}
          className="mt-1 w-full"
        >
          {submitting ? 'Saving password' : 'Save new password'}
        </Button>
      </form>
    </div>
  );
}
