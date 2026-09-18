import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** Small caption-uppercase label above the heading, e.g. "How it works". */
  eyebrow?: string;
  /** Display heading rendered at `display-lg`. Omit for a headless section. */
  heading?: ReactNode;
  /** Supporting copy under the heading. */
  description?: ReactNode;
  /** Alternates the section onto the lighter `canvas-soft` band per DESIGN.md rhythm. */
  soft?: boolean;
  /** Extra classes applied to the inner `editorial-container`, not the outer <section>. */
  containerClassName?: string;
  headingClassName?: string;
}

/**
 * The standard editorial band: `editorial-container section-rhythm`
 * wrapping an optional eyebrow + display heading + description, with an
 * optional alternating `canvas-soft` background per the 96px section
 * rhythm DESIGN.md specifies.
 */
export function Section({
  children,
  eyebrow,
  heading,
  description,
  soft = false,
  className,
  containerClassName,
  headingClassName,
  ...props
}: SectionProps) {
  return (
    <section className={cn(soft && 'bg-canvas-soft', className)} {...props}>
      <div className={cn('editorial-container section-rhythm', containerClassName)}>
        {(eyebrow || heading || description) && (
          <div className="mb-12 max-w-[65ch]">
            {eyebrow && <p className="caption-uppercase text-muted">{eyebrow}</p>}
            {heading && (
              <h2 className={cn('display-lg mt-3', headingClassName)}>{heading}</h2>
            )}
            {description && <p className="body-md mt-4 text-body">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
