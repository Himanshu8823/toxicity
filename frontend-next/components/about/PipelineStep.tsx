'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Reveal, CardSpotlight } from '@/components/motion';

export interface PipelineStepProps {
  number: string;
  title: string;
  description: string;
  /** Index 0..3 — used to stagger and to pick a unique atmospheric accent. */
  index: number;
  /** The accent pastel for this step (matches the section palette). */
  accent: string;
  /** Inline SVG illustration that visually represents this step. */
  illustration: 'url' | 'fetch' | 'score' | 'aggregate';
}

/**
 * One numbered step in the "how it works" pipeline — cinematic 3D card
 * with reveal-on-scroll, card spotlight, and an inline SVG illustration
 * that abstractly represents what happens at this stage.
 */
export function PipelineStep({
  number,
  title,
  description,
  index,
  accent,
  illustration,
}: PipelineStepProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <Reveal
      axis="3d"
      direction={index % 2 === 0 ? 'up' : 'down'}
      distance={48}
      rotateDeg={8}
      duration={1.0}
      delay={index * 0.12}
      blur
    >
      <CardSpotlight
        className="hairline-card lift-on-hover relative h-full overflow-hidden p-6"
        color={`${accent}55`}
        size={320}
      >
        <div
          className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full opacity-50 blur-3xl"
          style={{ background: accent }}
          aria-hidden="true"
        />
        <div className="relative flex items-start gap-5">
          <span className="display-sm shrink-0 text-muted-soft" aria-hidden="true">
            {number}
          </span>
          <div className="flex-1">
            <h3 className="title-md text-ink">{title}</h3>
            <p className="body-sm mt-2 max-w-[52ch] text-body">{description}</p>
          </div>
        </div>

        {/* Illustration */}
        <div className="relative mt-6 w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-strong)]">
          <PipelineIllustration kind={illustration} accent={accent} />
        </div>
      </CardSpotlight>
    </Reveal>
  );
}

/* ----- Inline SVG illustrations per pipeline step ----- */

function PipelineIllustration({
  kind,
  accent,
}: {
  kind: 'url' | 'fetch' | 'score' | 'aggregate';
  accent: string;
}) {
  if (kind === 'url') {
    return (
      <svg viewBox="0 0 320 160" className="h-auto w-full">
        <defs>
          <linearGradient id={`bg-url-${accent}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a8c8e8" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill={`url(#bg-url-${accent})`} />
        {/* URL field */}
        <rect x="30" y="40" width="260" height="36" rx="18" fill="#ffffff" stroke="#d6d3d1" />
        <text x="50" y="62" fontFamily="Inter, sans-serif" fontSize="13" fill="#777169">
          https://youtu.be/dQw4w9WgXcQ
        </text>
        <line x1="220" y1="44" x2="220" y2="72" stroke="#0c0a09" strokeWidth="1.5" />
        {/* ID extraction arrow */}
        <path d="M160 96 L160 120" stroke="#0c0a09" strokeWidth="1" strokeDasharray="3 3" />
        <text x="160" y="142" fontFamily="Inter, sans-serif" fontSize="11" fill="#777169" textAnchor="middle">
          video id: dQw4w9WgXcQ
        </text>
      </svg>
    );
  }
  if (kind === 'fetch') {
    return (
      <svg viewBox="0 0 320 160" className="h-auto w-full">
        <defs>
          <linearGradient id={`bg-fetch-${accent}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor="#c8b8e0" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill={`url(#bg-fetch-${accent})`} />
        {/* YouTube API call */}
        <rect x="30" y="40" width="100" height="80" rx="10" fill="#ffffff" opacity="0.85" />
        <text x="80" y="65" fontFamily="Inter, sans-serif" fontSize="11" fill="#777169" textAnchor="middle">YouTube</text>
        <text x="80" y="80" fontFamily="Inter, sans-serif" fontSize="11" fill="#777169" textAnchor="middle">Data API</text>
        <circle cx="80" cy="105" r="6" fill={accent} />
        {/* Comment stream */}
        <g transform="translate(160, 50)">
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(0, ${i * 14})`}>
              <rect width="120" height="10" rx="2" fill="#ffffff" opacity="0.85" />
            </g>
          ))}
        </g>
        {/* Connecting line */}
        <line x1="130" y1="80" x2="160" y2="80" stroke="#777169" strokeWidth="1" strokeDasharray="3 3" />
      </svg>
    );
  }
  if (kind === 'score') {
    return (
      <svg viewBox="0 0 320 160" className="h-auto w-full">
        <defs>
          <linearGradient id={`bg-score-${accent}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a7e5d3" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill={`url(#bg-score-${accent})`} />
        {/* Comments going through nodes */}
        {[30, 80, 130, 180].map((y, i) => (
          <g key={i}>
            <rect x="30" y={y - 5} width="80" height="10" rx="2" fill="#ffffff" opacity="0.85" />
            <line x1="115" y1={y} x2="155" y2={y} stroke="#777169" strokeWidth="1" />
            <circle cx="170" cy={y} r="9" fill={accent} />
            <line x1="185" y1={y} x2="225" y2={y} stroke="#777169" strokeWidth="1" />
            <rect x="225" y={y - 5} width="65" height="10" rx="2" fill="#0c0a09" opacity="0.9" />
          </g>
        ))}
      </svg>
    );
  }
  // aggregate
  return (
    <svg viewBox="0 0 320 160" className="h-auto w-full">
      <defs>
        <linearGradient id={`bg-agg-${accent}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f4c5a8" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <rect width="320" height="160" fill={`url(#bg-agg-${accent})`} />
      {/* Donut */}
      <g transform="translate(80, 80)">
        <circle cx="0" cy="0" r="42" fill="#ffffff" opacity="0.85" />
        {[
          { pct: 0.45, c: '#a7e5d3' },
          { pct: 0.25, c: '#c8b8e0' },
          { pct: 0.18, c: '#f4c5a8' },
          { pct: 0.12, c: '#a8c8e8' },
        ].map((d, i, arr) => {
          let acc = 0;
          for (let j = 0; j < i; j += 1) acc += arr[j].pct;
          const start = acc * Math.PI * 2 - Math.PI / 2;
          const end = (acc + d.pct) * Math.PI * 2 - Math.PI / 2;
          const x1 = Math.cos(start) * 42;
          const y1 = Math.sin(start) * 42;
          const x2 = Math.cos(end) * 42;
          const y2 = Math.sin(end) * 42;
          const large = d.pct > 0.5 ? 1 : 0;
          return (
            <path
              key={i}
              d={`M 0 0 L ${x1} ${y1} A 42 42 0 ${large} 1 ${x2} ${y2} Z`}
              fill={d.c}
            />
          );
        })}
        <circle cx="0" cy="0" r="18" fill="#fafafa" />
      </g>
      {/* Report */}
      <g transform="translate(170, 30)">
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(0, ${i * 22})`}>
            <rect width="120" height="14" rx="2" fill="#ffffff" opacity="0.85" />
            <rect x="0" y="0" width={120 * [0.6, 0.4, 0.85, 0.7][i]} height="14" rx="2" fill={accent} opacity="0.8" />
          </g>
        ))}
      </g>
    </svg>
  );
}

export default PipelineStep;
