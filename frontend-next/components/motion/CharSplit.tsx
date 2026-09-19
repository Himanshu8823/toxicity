'use client';

import React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CharSplitProps extends Omit<HTMLMotionProps<'h1'>, 'children'> {
  /** The full heading string. Split per-character for staggered reveal. */
  text: string;
  /** Delay between each character, in seconds. Defaults to 0.025. */
  stagger?: number;
  /** Initial delay before the first character enters, in seconds. */
  delay?: number;
  /** Per-character travel distance in px. Defaults to 14. */
  distance?: number;
  /** Per-character duration in seconds. Defaults to 0.55. */
  duration?: number;
  /** When true, animation runs on mount; otherwise on viewport entry. */
  immediate?: boolean;
  /** Viewport trigger amount (0-1). Defaults to 0.4. */
  amount?: number;
  /** Tag for the outer wrapper. */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span';
  /** Class for the outer wrapper. */
  className?: string;
  /** Class applied to each character span. */
  charClassName?: string;
}

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/**
 * Splits a string into per-character spans and reveals them with a blur+fade+rise
 * cascade — the editorial "splitting text" effect, like ink sliding onto paper
 * one letter at a time.
 *
 * Words are kept as indivisible units: each whole word sits inside a single
 * `inline-block` wrapper with `white-space: nowrap`, so the browser can ONLY
 * break between words — never mid-word. Inside each word, the characters
 * still animate in cascade, with the delay computed so the reveal flows
 * left-to-right across the entire line.
 *
 * Respects `prefers-reduced-motion: reduce` by snapping to the final state.
 */
export function CharSplit({
  text,
  stagger = 0.025,
  delay = 0,
  distance = 14,
  duration = 0.55,
  immediate = true,
  amount = 0.4,
  as: Tag = 'h1',
  className,
  charClassName,
  ...rest
}: CharSplitProps) {
  const reduceMotion = useReducedMotion() ?? false;

  // Split into words first; a plain space sits between each word-wrapper
  // so the browser can break on whole-word boundaries only.
  const words = text.split(' ');

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: distance,
      filter: 'blur(8px)',
    },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration, ease: EASE_OUT_EXPO },
    },
  };

  if (reduceMotion) {
    return (
      <Tag className={className} {...(rest as React.HTMLAttributes<HTMLElement>)}>
        {text}
      </Tag>
    );
  }

  // We compute a per-character stagger across the whole string so the
  // cascade reads left-to-right across words, not word-by-word.
  let charIndex = 0;

  return (
    <motion.div
      className={cn(className)}
      style={{ display: 'block' }}
      initial="hidden"
      {...(immediate ? { animate: 'show' } : { whileInView: 'show' })}
      viewport={{ once: true, amount }}
      {...(rest as HTMLMotionProps<'div'>)}
    >
      <Tag className="m-0 p-0" style={{ display: 'inline' }}>
        {words.map((word, wIdx) => {
          const chars = Array.from(word);
          const wordEl = (
            <span
              key={`w-${wIdx}`}
              style={{
                display: 'inline-block',
                whiteSpace: 'nowrap', // word itself never breaks
              }}
            >
              {chars.map((ch) => {
                const idx = charIndex;
                charIndex += 1;
                return (
                  <motion.span
                    key={`c-${wIdx}-${idx}`}
                    aria-hidden="true"
                    initial={itemVariants.hidden}
                    animate={itemVariants.show}
                    transition={{
                      duration,
                      ease: EASE_OUT_EXPO,
                      delay: delay + idx * stagger,
                    }}
                    className={charClassName}
                    style={{
                      display: 'inline-block',
                      willChange: 'transform, opacity, filter',
                    }}
                  >
                    {ch}
                  </motion.span>
                );
              })}
            </span>
          );
          return wIdx < words.length - 1 ? (
            <React.Fragment key={`wf-${wIdx}`}>
              {wordEl}
              {' '}
            </React.Fragment>
          ) : (
            wordEl
          );
        })}
        {/* Preserve accessibility: real text for screen readers */}
        <span className="sr-only">{text}</span>
      </Tag>
    </motion.div>
  );
}

export default CharSplit;
