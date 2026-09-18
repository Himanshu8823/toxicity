import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Validation message, shown in `--color-semantic-error` below the field. */
  error?: string;
  /** Supplementary copy shown below the field when there is no error. */
  hint?: string;
  containerClassName?: string;
}

/**
 * `text-input`: 44px height, `radius-md` (8px), 1px `hairline-strong`
 * border, focus thickens to a 2px ink border (via `focus-visible` + a
 * matching `focus:` ring since text inputs should show the ring on plain
 * focus, not only keyboard focus).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, containerClassName, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint && !error ? `${inputId}-hint` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="body-strong text-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={errorId ?? hintId}
        className={cn(
          'body-md h-11 rounded-[var(--radius-md)] border bg-surface-card px-4 text-ink',
          'placeholder:text-muted-soft transition-colors duration-150',
          'focus:border-2 focus:border-ink focus:px-[15px] focus:outline-none',
          error ? 'border-[var(--color-semantic-error)]' : 'border-hairline-strong',
          'disabled:cursor-not-allowed disabled:bg-surface-strong disabled:text-muted-soft',
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="caption text-[var(--color-semantic-error)]">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="caption text-muted">
          {hint}
        </p>
      )}
    </div>
  );
});
