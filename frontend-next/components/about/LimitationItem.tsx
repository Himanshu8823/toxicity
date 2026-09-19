'use client';

import { Reveal, CardSpotlight } from '@/components/motion';

export interface LimitationItemProps {
  title: string;
  description: string;
  /** Index used to stagger the reveal. */
  index: number;
  /** A unique accent color per item so the grid reads as varied, not flat. */
  accent: string;
}

/** One honest limitation entry. Client component. */
export function LimitationItem({ title, description, index, accent }: LimitationItemProps) {
  return (
    <Reveal
      axis="3d"
      direction={index % 2 === 0 ? 'left' : 'right'}
      distance={36}
      rotateDeg={6}
      duration={0.9}
      delay={index * 0.08}
    >
      <CardSpotlight
        className="hairline-card lift-on-hover relative h-full overflow-hidden p-6"
        color={`${accent}55`}
        size={280}
      >
        <div
          className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full opacity-40 blur-3xl"
          style={{ background: accent }}
          aria-hidden="true"
        />
        <div className="relative">
          <span className="caption-uppercase text-muted">Limit · {String(index + 1).padStart(2, '0')}</span>
          <h3 className="title-sm mt-2 text-ink">{title}</h3>
          <p className="body-sm mt-3 text-body">{description}</p>
        </div>
      </CardSpotlight>
    </Reveal>
  );
}

export default LimitationItem;
