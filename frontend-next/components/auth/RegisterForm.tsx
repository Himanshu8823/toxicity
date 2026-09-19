'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthField } from './AuthField';
import { Button } from '@/components/ui/Button';

const MIN_PASSWORD_LENGTH = 8;

/** Deliberately permissive. The confirmation email is the real check. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface FormValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = 'Tell us what to call you.';
  }

  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'That does not look like an email address.';
  }

  if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Both passwords must match.';
  }

  return errors;
}

export function RegisterForm() {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  function setValue<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    // Clear the field's error as soon as it is touched: leaving it up while
    // someone is mid-correction reads as the correction being rejected.
    setFieldErrors((previous) =>
      previous[key] ? { ...previous, [key]: undefined } : previous,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    const email = values.email.trim();

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: values.password,
      options: {
        // Stored on auth.users.raw_user_meta_data; the profiles trigger copies
        // it into profiles.full_name when the row is created.
        data: { full_name: values.fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setFormError(error.message);
      setSubmitting(false);
      return;
    }

    // A project with email confirmation on returns a user but no session; one
    // with it off returns both and the account is live immediately. Only the
    // second case can go straight to the dashboard.
    if (data.session) {
      router.push('/dashboard');
      router.refresh();
      return;
    }

    setConfirmationSentTo(email);
    setSubmitting(false);
  }

  if (confirmationSentTo) {
    return (
      <div className="hairline-card p-7 shadow-[var(--shadow-soft-drop)] sm:p-9">
        <p className="caption-uppercase text-muted">Almost there</p>
        <h1 className="display-lg mt-3 text-ink">Check your inbox</h1>
        <p className="body-md mt-4 text-body">
          We sent a confirmation link to{' '}
          <span className="body-strong text-ink">{confirmationSentTo}</span>. Open it
          to finish setting up your account.
        </p>
        <p className="body-sm mt-4 text-muted">
          Nothing after a few minutes? Check your spam folder, or try registering
          again with a different address.
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
      <p className="caption-uppercase text-muted">Get started</p>
      <h1 className="display-lg mt-3 text-ink">Create an account</h1>
      <p className="body-md mt-3 text-body">
        Save every scan, revisit past reports, and export what you find.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <AuthField
          label="Full name"
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          required
          value={values.fullName}
          error={fieldErrors.fullName}
          onChange={(event) => setValue('fullName', event.target.value)}
        />

        <AuthField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={values.email}
          error={fieldErrors.email}
          onChange={(event) => setValue('email', event.target.value)}
        />

        <AuthField
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          value={values.password}
          error={fieldErrors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          onChange={(event) => setValue('password', event.target.value)}
        />

        <AuthField
          label="Confirm password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          value={values.confirmPassword}
          error={fieldErrors.confirmPassword}
          onChange={(event) => setValue('confirmPassword', event.target.value)}
        />

        {formError && (
          <p role="alert" className="caption text-[var(--color-semantic-error)]">
            {formError}
          </p>
        )}

        <Button type="submit" loading={submitting} className="mt-1 w-full">
          {submitting ? 'Creating account' : 'Create account'}
        </Button>
      </form>

      <p className="body-sm mt-7 border-t border-hairline pt-6 text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
