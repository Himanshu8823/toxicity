'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

export interface MagneticButtonProps {
  /** Visible button label. */
  children: ReactNode;
  /** Where the button goes. Renders as <Link> if set, else <button>. */
  href?: string;
  /** Variant: ink pill primary, outline pill secondary, or ghost text. */
  variant?: 'primary' | 'outline';
  /** Size scale — md is the editorial default (40px). */
  size?: 'md' | 'lg';
  /** onClick handler for <button> mode. */
  onClick?: ComponentProps<'button'>['onClick'];
  /** Disabled state. */
  disabled?: boolean;
  /** Optional trailing icon (rendered inside a nested circle). */
  trailingIcon?: ReactNode;
  /** Pass-through className. */
  className?: string;
}

/**
 * The signature CTA: ink-pill (or outline) with a magnetic hover lift.
 * The trailing-icon circle wrapper is the "button-in-button" pattern from
 * the high-end-visual-design skill — when present, the arrow translates
 * and scales on group hover to create internal kinetic tension.
 *
 * Uses motion + `whileHover` / `whileTap` so the lift feels physical:
 *   - hover: 1.5px lift, trailing icon translates diagonally + scales 1.05
 *   - tap:   0.98 scale
 * Reduced-motion users get the plain ink-pill without lift or scale.
 */
export function MagneticButton({
  children,
  href,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  trailingIcon,
  className,
}: MagneticButtonProps) {
  const reduceMotion = useReducedMotion() ?? false;

  const baseClasses = cn(
    'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-pill)] font-medium tracking-normal transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
    size === 'md' ? 'h-10 px-5 text-[15px]' : 'h-12 px-7 text-[16px]',
    variant === 'primary'
      ? 'bg-primary text-on-primary hover:bg-primary-active'
      : 'border border-hairline-strong bg-transparent text-ink hover:border-ink',
    disabled && 'pointer-events-none opacity-50',
    className,
  );

  const inner = (
    <>
      <span className="relative z-10">{children}</span>
      {trailingIcon ? (
        <span
          aria-hidden="true"
          className={cn(
            'relative z-10 inline-flex items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            variant === 'primary'
              ? 'h-7 w-7 bg-white/15 group-hover:bg-white/25'
              : 'h-7 w-7 bg-[var(--color-surface-strong)] group-hover:bg-[var(--color-hairline-strong)]',
            size === 'lg' && 'h-8 w-8',
          )}
          style={reduceMotion ? undefined : { willChange: 'transform' }}
        >
          <motion.span
            aria-hidden="true"
            className="inline-flex items-center justify-center"
            whileHover={reduceMotion ? undefined : { x: 1.5, y: -1.5, scale: 1.05 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          >
            {trailingIcon}
          </motion.span>
        </span>
      ) : null}
    </>
  );

  const motionProps = reduceMotion
    ? {}
    : {
        whileHover: { y: -1.5 },
        whileTap: { scale: 0.98 },
        transition: { duration: 0.4, ease: EASE_OUT_EXPO },
      };

  if (href) {
    return (
      <motion.span
        className="inline-block"
        {...motionProps}
        style={{ willChange: 'transform' }}
      >
        <Link href={href} className={baseClasses} aria-disabled={disabled}>
          {inner}
        </Link>
      </motion.span>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
      {...motionProps}
      style={{ willChange: 'transform' }}
    >
      {inner}
    </motion.button>
  );
}

export default MagneticButton;
