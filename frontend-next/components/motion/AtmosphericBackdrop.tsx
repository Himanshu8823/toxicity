'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export interface AtmosphericBackdropProps {
  /** The pastel colors to use as floating orbs. Defaults to the 5 design-system pastels. */
  colors?: string[];
  /** Optional inline content to layer on top of the animated orbs (e.g. a 3D scene). */
  children?: React.ReactNode;
  /** When true, the orbs pulse larger and the layer fades more dramatically. */
  intensity?: 'soft' | 'normal' | 'bold';
  className?: string;
}

const DEFAULT_COLORS = [
  '#a7e5d3', // mint
  '#c8b8e0', // lavender
  '#f4c5a8', // peach
  '#a8c8e8', // sky
  '#e8b8c4', // rose
];

/**
 * Full-bleed atmospheric backdrop: a layer of large, soft, slowly-floating
 * pastel orbs that sits behind section content. Always `pointer-events: none`
 * so it never blocks clicks. Pairs with the existing `.grain` overlay.
 *
 * The orbs drift on independent infinite loops — never synchronized — so the
 * layer reads as living atmosphere, not a static gradient.
 */
export function AtmosphericBackdrop({
  colors = DEFAULT_COLORS,
  children,
  intensity = 'normal',
  className,
}: AtmosphericBackdropProps) {
  const opacity = intensity === 'bold' ? 0.65 : intensity === 'soft' ? 0.35 : 0.5;
  const blur = intensity === 'bold' ? 80 : intensity === 'soft' ? 100 : 90;

  // Pause the orb animation when the section is off-screen — saves CPU
  // when the user is reading the hero or another section above.
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0, once: false });

  return (
    <div
      ref={ref}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
      aria-hidden="true"
    >
      {colors.map((color, i) => {
        const size = 220 + (i % 3) * 80;
        const positions: Array<{ x: string; y: string }> = [
          { x: '-8%', y: '12%' },
          { x: '60%', y: '-6%' },
          { x: '20%', y: '70%' },
          { x: '78%', y: '60%' },
          { x: '40%', y: '30%' },
        ];
        const pos = positions[i % positions.length];
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              background: color,
              width: size,
              height: size,
              left: pos.x,
              top: pos.y,
              filter: `blur(${blur}px)`,
              opacity,
              willChange: 'transform',
            }}
            // Initial state (held while off-screen) — same coords as the
            // first keyframe of the loop so there's no jump on entry.
            initial={{ x: 0, y: 0, scale: 1 }}
            animate={
              inView
                ? {
                    x: [0, 40, -30, 0],
                    y: [0, -30, 20, 0],
                    scale: [1, 1.08, 0.95, 1],
                  }
                : { x: 0, y: 0, scale: 1 }
            }
            transition={
              inView
                ? {
                    duration: 18 + (i % 4) * 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 1.2,
                  }
                : { duration: 0 }
            }
          />
        );
      })}
      {children}
    </div>
  );
}

/**
 * A wide "ribbon" of horizontal animated bars — used as a section transition
 * or as a banner divider so the page never feels like it stops.
 */
export function AnimatedRibbon({
  colors = DEFAULT_COLORS,
  className,
}: {
  colors?: string[];
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none relative h-[12px] w-full overflow-hidden ${className ?? ''}`}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0 flex"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        style={{ width: '200%' }}
      >
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="block h-full"
            style={{
              width: '8%',
              background: colors[i % colors.length],
              opacity: 0.4 + (i % 3) * 0.18,
              marginRight: '2%',
              borderRadius: '999px',
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}

/**
 * A subtle SVG-illustration backdrop: thin concentric arcs and circles,
 * drifting slowly, like topographic lines on a printed page.
 */
export function TopographicBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-30"
      >
        <defs>
          <radialGradient id="topo-fade" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#0c0a09" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0c0a09" stopOpacity="0" />
          </radialGradient>
        </defs>
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.circle
            key={i}
            cx={150 + i * 90}
            cy={200 + (i % 4) * 120}
            r={60 + i * 28}
            fill="none"
            stroke="#0c0a09"
            strokeWidth="0.8"
            strokeOpacity={0.18}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.18 }}
            transition={{ duration: 1.2, delay: i * 0.06, ease: 'easeOut' }}
          />
        ))}
        <rect width="1200" height="800" fill="url(#topo-fade)" />
      </svg>
    </div>
  );
}

export default AtmosphericBackdrop;
