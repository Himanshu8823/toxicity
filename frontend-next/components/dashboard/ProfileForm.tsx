'use client';

import { useState, useTransition } from 'react';
import { SUPPORTED_LANGUAGES } from '@/lib/analysis/language';
import { updateProfileAction } from '@/app/dashboard/actions';
import { avatarInitial } from './format';

export interface ProfileFormProps {
  email: string;
  initialFullName: string;
  initialLanguage: string;
}

/**
 * Name and preferred language.
 *
 * A Client Component rather than a plain `<form action={…}>` so the result
 * message can appear inline without a navigation — the form is three fields
 * and a full round trip to a redirect would be heavier than the edit.
 *
 * The avatar initial updates as the name is typed, because it is derived from
 * the name and showing the old letter next to the new name reads as a bug.
 */
export function ProfileForm({
  email,
  initialFullName,
  initialLanguage,
}: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [language, setLanguage] = useState(initialLanguage);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(true);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateProfileAction({
        fullName,
        preferredLanguage: language,
      });
      setOk(result.ok);
      setMessage(result.message ?? null);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary"
          aria-hidden="true"
        >
          <span className="display-sm">{avatarInitial(fullName, email)}</span>
        </span>
        <div className="min-w-0">
          <p className="body-strong truncate text-ink">
            {fullName.trim() || 'No name set'}
          </p>
          <p className="caption truncate text-muted">{email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="full-name" className="body-strong text-ink">
          Full name
        </label>
        <input
          id="full-name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={120}
          autoComplete="name"
          placeholder="How you would like to be addressed"
          className="body-md h-11 rounded-[var(--radius-md)] border border-hairline-strong bg-surface-card px-4 text-ink placeholder:text-muted-soft focus:border-2 focus:border-ink focus:px-[15px] focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="preferred-language" className="body-strong text-ink">
          Preferred language
        </label>
        <select
          id="preferred-language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-describedby="preferred-language-hint"
          className="body-md h-11 rounded-[var(--radius-md)] border border-hairline-strong bg-surface-card px-4 text-ink focus:border-2 focus:border-ink focus:outline-none"
        >
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <p id="preferred-language-hint" className="caption text-muted">
          The language assumed for pasted text in the playground when detection
          is uncertain. It does not restrict which languages a scan detects.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-type inline-flex h-10 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-5 text-on-primary transition-colors duration-150 hover:bg-primary-active disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save profile'}
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

export default ProfileForm;
