'use client';

import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface AuthFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Validation message. Replaces the hint and marks the field invalid. */
  error?: string;
  /** Supplementary copy, shown only while the field is valid. */
  hint?: string;
  /** Monospace label + input, for the admin surface's utilitarian dialect. */
  mono?: boolean;
}

/**
 * The labelled input every auth form is built from.
 *
 * `components/ui/Input` exists and is close, but it is a plain module used by
 * server-rendered marketing pages. Auth forms need the field to be usable in a
 * client tree with a caller-supplied id-free API and an admin variant, so this
 * is a sibling rather than a prop bolted onto the shared primitive.
 *
 * The id is generated rather than required, because `useId` output is stable
 * across server and client render — hand-written ids in four separate forms
 * would eventually collide.
 */
export function AuthField({
  label,
  error,
  hint,
  mono = false,
  className,
  ...props
}: AuthFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  // Only one description is ever live, so the field points at whichever is
  // actually rendered — pointing at an absent node silences the announcement.
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className={cn(
          mono ? 'caption-uppercase font-mono text-on-dark-soft' : 'body-strong text-ink',
        )}
      >
        {label}
      </label>

      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'body-md h-11 w-full rounded-[var(--radius-md)] border px-4 transition-colors duration-150',
          'focus:outline-none',
          mono
            ? [
                'border-[#3a3633] bg-surface-dark-elevated font-mono text-on-dark',
                'placeholder:text-[#57534e]',
                'focus:border-on-dark-soft',
                error && 'border-[var(--color-semantic-error)]',
              ]
            : [
                'bg-surface-card text-ink placeholder:text-muted-soft',
                // Growing the border by 1px on focus would shift the text, so
                // the horizontal padding gives the pixel back.
                'focus:border-2 focus:border-ink focus:px-[15px]',
                error ? 'border-[var(--color-semantic-error)]' : 'border-hairline-strong',
              ],
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="caption text-[var(--color-semantic-error)]"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={cn('caption', mono ? 'text-on-dark-soft' : 'text-muted')}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
