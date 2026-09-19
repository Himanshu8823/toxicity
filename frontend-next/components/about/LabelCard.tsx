'use client';

import type { LabelMeta } from '@/lib/labels';
import { Reveal, CardSpotlight, Parallax } from '@/components/motion';

export interface LabelCardProps {
  meta: LabelMeta;
  /** Index 0..4 — used to stagger the reveal. */
  index: number;
}

/** One of the five toxicity-state cards on the About page. Client component. */
export function LabelCard({ meta, index }: LabelCardProps) {
  return (
    <Reveal
      axis="3d"
      direction="up"
      distance={48}
      rotateDeg={10}
      duration={1.0}
      delay={index * 0.1}
    >
      <CardSpotlight
        className="hairline-card lift-on-hover relative h-full overflow-hidden p-6"
        color={`${meta.pastel}66`}
        size={300}
      >
        <Parallax speed={30} mode="wrap">
          <div
            className="orb orb-drifting -right-10 -top-10 h-32 w-32"
            style={{ background: meta.pastel }}
            aria-hidden="true"
          />
        </Parallax>
        <h3 className="title-md relative" style={{ color: meta.ink }}>
          {meta.display}
        </h3>
        <p className="body-sm relative mt-2 text-body">{meta.description}</p>
        <span
          className="caption-uppercase relative mt-5 inline-block rounded-[var(--radius-pill)] px-2.5 py-1"
          style={{ background: 'var(--color-surface-strong)', color: meta.ink }}
        >
          {meta.harmful ? 'Harmful' : 'Clean'}
        </span>
      </CardSpotlight>
    </Reveal>
  );
}

export default LabelCard;
