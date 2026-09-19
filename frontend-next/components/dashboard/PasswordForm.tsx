'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Supabase's own floor is six; eight is the lowest worth asking for. */
const MIN_LENGTH = 8;

/**
 * Password change.
 *
 * This one has to be a Client Component: `supabase.auth.updateUser` needs the
 * browser session, and passing a new password through a Server Action would
 * mean the plaintext travelling to our server on its way to Supabase for no
 * reason at all. Here it goes straight from the field to Supabase.
 *
 * The confirmation field is checked locally before the call — a mistyped
 * repeat is not worth a network round trip to discover.
 */
export function PasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(true);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (password.length < MIN_LENGTH) {
      setOk(false);
      setMessage(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }

    if (password !== confirm) {
      setOk(false);
      setMessage('Those two passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setOk(false);
        setMessage(error.message);
        return;
      }

      setOk(true);
      setMessage('Password changed.');
      setPassword('');
      setConfirm('');
    } catch {
      setOk(false);
      setMessage('That could not be saved. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-password" className="body-strong text-ink">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          required
          aria-describedby="new-password-hint"
          className="body-md h-11 rounded-[var(--radius-md)] border border-hairline-strong bg-surface-card px-4 text-ink focus:border-2 focus:border-ink focus:px-[15px] focus:outline-none"
        />
        <p id="new-password-hint" className="caption text-muted">
          At least {MIN_LENGTH} characters.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm-password" className="body-strong text-ink">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          className="body-md h-11 rounded-[var(--radius-md)] border border-hairline-strong bg-surface-card px-4 text-ink focus:border-2 focus:border-ink focus:px-[15px] focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="btn-type inline-flex h-10 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-5 text-on-primary transition-colors duration-150 hover:bg-primary-active disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Change password'}
        </button>
        <p
          aria-live="polite"
          className="caption empty:hidden"
          style={{ color: ok ? 'var(--color-muted)' : 'var(--color-semantic-error)' }}
        >
          {message}
        </p>
      </div>
    </form>
  );
}

export default PasswordForm;
