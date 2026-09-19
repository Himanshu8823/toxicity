'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthField } from './AuthField';
import { Button } from '@/components/ui/Button';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setFieldError('That does not look like an email address.');
      return;
    }

    setFieldError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    // An unknown address is not an error worth surfacing — reporting it would
    // turn this form into a way to test which emails have accounts. Only a
    // genuine transport failure (rate limit, outage) is shown.
    if (error) {
      setFormError(error.message);
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <div className="hairline-card p-7 shadow-[var(--shadow-soft-drop)] sm:p-9">
        <p className="caption-uppercase text-muted">Request received</p>
        <h1 className="display-lg mt-3 text-ink">Check your inbox</h1>
        <p className="body-md mt-4 text-body">
          If an account exists for that address, a reset link is on its way.
        </p>
        <p className="body-sm mt-4 text-muted">
          The link expires after a short while — request another if it lapses.
        </p>
        <Link
          href="/login"
          className="btn-type mt-8 inline-flex h-10 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-5 text-on-primary transition-colors duration-150 hover:bg-primary-active"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="hairline-card p-7 shadow-[var(--shadow-soft-drop)] sm:p-9">
      <p className="caption-uppercase text-muted">Account recovery</p>
      <h1 className="display-lg mt-3 text-ink">Reset your password</h1>
      <p className="body-md mt-3 text-body">
        Enter the address you signed up with and we will send you a link to choose
        a new password.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <AuthField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={email}
          error={fieldError ?? undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldError(null);
          }}
        />

        {formError && (
          <p role="alert" className="caption text-[var(--color-semantic-error)]">
            {formError}
          </p>
        )}

        <Button type="submit" loading={submitting} className="mt-1 w-full">
          {submitting ? 'Sending link' : 'Send reset link'}
        </Button>
      </form>

      <p className="body-sm mt-7 border-t border-hairline pt-6 text-muted">
        Remembered it?{' '}
        <Link href="/login" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
