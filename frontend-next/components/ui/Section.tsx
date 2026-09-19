import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  AtmosphericBackdrop,
  TopographicBackdrop,
  AnimatedRibbon,
} from '@/components/motion';

export type SectionBackdropKind = 'atmosphere' | 'topographic' | 'ribbon' | 'none';

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
  /** Which backdrop layer to render behind the section content. */
  backdrop?: SectionBackdropKind;
  /** Custom pastel colors for the atmospheric backdrop. */
  backdropColors?: string[];
  /** Visual intensity for the atmospheric backdrop. */
  backdropIntensity?: 'soft' | 'normal' | 'bold';
}

/**
 * The standard editorial band: `editorial-container section-rhythm`
 * wrapping an optional eyebrow + display heading + description, with an
 * optional alternating `canvas-soft` background per the 96px section
 * rhythm DESIGN.md specifies.
 *
 * Optional atmospheric backdrop layer (`atmosphere`, `topographic`, or
 * `ribbon`) fills the section with movement so the page never reads as
 * empty white space between cards.
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
  backdrop = 'none',
  backdropColors,
  backdropIntensity = 'normal',
  ...props
}: SectionProps) {
  return (
    <section className={cn('relative overflow-hidden', soft && 'bg-canvas-soft', className)} {...props}>
      {backdrop === 'atmosphere' && (
        <AtmosphericBackdrop
          colors={backdropColors}
          intensity={backdropIntensity}
          className="z-0"
        />
      )}
      {backdrop === 'topographic' && <TopographicBackdrop className="z-0" />}
      <div className={cn('editorial-container section-rhythm relative z-10', containerClassName)}>
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
      {backdrop === 'ribbon' && (
        <div className="absolute inset-x-0 bottom-0 z-0">
          <AnimatedRibbon colors={backdropColors} />
        </div>
      )}
    </section>
  );
}

export default Section;
