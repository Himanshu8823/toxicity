'use client';

import { useReducedMotion } from '@/components/three/useReducedMotion';

export interface AuroraProps {
  /** Tailwind className for the wrapper. */
  className?: string;
}

/**
 * An animated SVG aurora: pastel gradient bands flowing across the
 * viewport. Used as a section background — sits behind text at low
 * opacity so the brand voice stays editorial, not club-lighting.
 *
 * Pure CSS animation (gradient + transform), no rAF — cheap to render.
 */
export function Aurora({ className }: AuroraProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 600"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="aurora-mint" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a7e5d3" stopOpacity="0" />
            <stop offset="50%" stopColor="#a7e5d3" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#a7e5d3" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="aurora-peach" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f4c5a8" stopOpacity="0" />
            <stop offset="50%" stopColor="#f4c5a8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#f4c5a8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="aurora-lavender" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c8b8e0" stopOpacity="0" />
            <stop offset="50%" stopColor="#c8b8e0" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#c8b8e0" stopOpacity="0" />
          </linearGradient>
          <filter id="aurora-blur">
            <feGaussianBlur stdDeviation="40" />
          </filter>
        </defs>

        <g filter="url(#aurora-blur)">
          <ellipse
            cx="200"
            cy="120"
            rx="500"
            ry="120"
            fill="url(#aurora-mint)"
            style={{
              transformOrigin: '200px 120px',
              animation: reduceMotion ? undefined : 'aurora-drift-1 14s ease-in-out infinite',
            }}
          />
          <ellipse
            cx="700"
            cy="240"
            rx="600"
            ry="140"
            fill="url(#aurora-peach)"
            style={{
              transformOrigin: '700px 240px',
              animation: reduceMotion ? undefined : 'aurora-drift-2 18s ease-in-out infinite',
            }}
          />
          <ellipse
            cx="1200"
            cy="160"
            rx="540"
            ry="130"
            fill="url(#aurora-lavender)"
            style={{
              transformOrigin: '1200px 160px',
              animation: reduceMotion ? undefined : 'aurora-drift-3 22s ease-in-out infinite',
            }}
          />
        </g>
      </svg>

      <style>{`
        @keyframes aurora-drift-1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(8%, 4%, 0) scale(1.08); }
        }
        @keyframes aurora-drift-2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-6%, 6%, 0) scale(1.05); }
        }
        @keyframes aurora-drift-3 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(5%, -4%, 0) scale(1.1); }
        }
      `}</style>
    </div>
  );
}

export default Aurora;
