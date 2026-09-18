import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'outline' | 'text';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables interaction while true. */
  loading?: boolean;
  /** Optional leading icon, rendered before children. */
  icon?: ReactNode;
}

const BASE =
  'btn-type inline-flex items-center justify-center gap-2 whitespace-nowrap ' +
  'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'rounded-[var(--radius-pill)] bg-primary text-on-primary hover:bg-primary-active ' +
    'active:bg-primary-active',
  outline:
    'rounded-[var(--radius-pill)] border border-hairline-strong bg-transparent text-ink ' +
    'hover:border-ink',
  text: 'rounded-[var(--radius-xs)] bg-transparent text-ink underline-offset-4 hover:underline',
};

const SIZE_CLASSES: Record<ButtonVariant, Record<ButtonSize, string>> = {
  primary: {
    sm: 'h-9 px-4',
    md: 'h-10 px-5',
  },
  outline: {
    sm: 'h-9 px-4',
    md: 'h-10 px-5',
  },
  text: {
    sm: 'h-auto px-0 py-0.5',
    md: 'h-auto px-0 py-1',
  },
};

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4 animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2z"
      />
    </svg>
  );
}

/**
 * The single CTA family DESIGN.md allows: a near-black ink pill
 * (`primary`), a transparent hairline outline (`outline`), and an inline
 * ink text link (`text`). No saturated colour ever appears here.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[variant][size], className)}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      <span className={loading ? 'opacity-80' : undefined}>{children}</span>
    </button>
  );
});
