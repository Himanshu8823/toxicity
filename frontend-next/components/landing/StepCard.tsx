'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { CardSpotlight } from '@/components/motion';

export interface PipelineStepCard {
  number: string;
  title: string;
  description: string;
  accent: string;
  illustration: 'paste' | 'fetch' | 'score' | 'aggregate' | 'read';
}

export interface StepCardProps {
  step: PipelineStepCard;
  index: number;
}

/**
 * One horizontal-scroll-locked chapter card — wide, cinematic,
 * each fills 100vw with internal layered illustration.
 */
export function StepCard({ step, index }: StepCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  // Each card pops in slightly with its own scroll progress.
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start'],
  });

  const cardScale = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0.92, 1, 1, 1.04]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.6, 1, 1, 0.7]);

  return (
    <motion.div
      ref={cardRef}
      style={
        reduceMotion
          ? undefined
          : {
              scale: cardScale,
              opacity: cardOpacity,
              transformStyle: 'preserve-3d',
            }
      }
      className="relative w-full max-w-[820px]"
    >
      <CardSpotlight
        className="hairline-card relative overflow-hidden p-8 sm:p-10"
        color={`${step.accent}66`}
        size={420}
      >
        {/* Atmospheric corner orb */}
        <div
          className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full opacity-50 blur-3xl"
          style={{ background: step.accent }}
          aria-hidden="true"
        />

        <div className="relative grid gap-8 sm:grid-cols-[1fr_minmax(0,1.1fr)] sm:items-center">
          {/* Number + text */}
          <div>
            <span className="caption-uppercase text-muted-soft">Chapter {step.number}</span>
            <h3 className="display-md mt-3 text-ink">{step.title}</h3>
            <p className="body-md mt-4 text-body">{step.description}</p>

            {/* Step progress dots */}
            <div className="mt-8 flex items-center gap-2" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="block h-1.5 rounded-full transition-all duration-700"
                  style={{
                    width: i === index ? 32 : 12,
                    background: i === index ? step.accent : 'var(--color-hairline-strong)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Illustration panel */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-strong)]">
            <StepIllustration kind={step.illustration} accent={step.accent} />
          </div>
        </div>
      </CardSpotlight>
    </motion.div>
  );
}

/* ============================================================
   Per-step illustrations — detailed SVG diagrams per step.
   ============================================================ */

function StepIllustration({
  kind,
  accent,
}: {
  kind: 'paste' | 'fetch' | 'score' | 'aggregate' | 'read';
  accent: string;
}) {
  if (kind === 'paste') {
    return (
      <svg viewBox="0 0 480 360" className="h-full w-full">
        <defs>
          <linearGradient id={`bg-paste-${accent}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a8c8e8" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <rect width="480" height="360" fill={`url(#bg-paste-${accent})`} />
        <rect x="40" y="80" width="400" height="56" rx="28" fill="#ffffff" stroke="#d6d3d1" strokeWidth="1.5" />
        <text x="72" y="115" fontFamily="Inter, sans-serif" fontSize="18" fill="#777169">
          https://www.youtube.com/watch?v=…
        </text>
        <line x1="340" y1="88" x2="340" y2="128" stroke="#0c0a09" strokeWidth="2" />
        <circle cx="240" cy="240" r="40" fill="#0c0a09" />
        <path d="M230 222 L230 258 L260 240 Z" fill="#ffffff" />
        <rect x="40" y="180" width="160" height="32" rx="16" fill="#ffffff" opacity="0.85" />
        <circle cx="60" cy="196" r="10" fill={accent} />
        <text x="80" y="200" fontFamily="Inter, sans-serif" fontSize="13" fill="#777169">Channel · Video</text>
      </svg>
    );
  }
  if (kind === 'fetch') {
    return (
      <svg viewBox="0 0 480 360" className="h-full w-full">
        <defs>
          <linearGradient id={`bg-fetch-${accent}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c8b8e0" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="480" height="360" fill={`url(#bg-fetch-${accent})`} />
        <rect x="40" y="60" width="140" height="240" rx="14" fill="#ffffff" opacity="0.92" />
        <text x="110" y="100" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600" fill="#0c0a09" textAnchor="middle">YouTube API</text>
        <text x="110" y="120" fontFamily="Inter, sans-serif" fontSize="11" fill="#777169" textAnchor="middle">v3 · comments.list</text>
        <g transform="translate(220, 60)">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <g key={i} transform={`translate(0, ${i * 34})`}>
              <rect width="220" height="22" rx="4" fill="#ffffff" opacity={0.85 - i * 0.05} />
              <rect width={50 + i * 18} height="22" rx="4" fill={accent} opacity="0.75" />
            </g>
          ))}
        </g>
        <path d="M195 180 L218 180" stroke="#0c0a09" strokeWidth="1.5" strokeDasharray="4 4" />
        <polygon points="218,176 226,180 218,184" fill="#0c0a09" />
      </svg>
    );
  }
  if (kind === 'score') {
    return (
      <svg viewBox="0 0 480 360" className="h-full w-full">
        <defs>
          <linearGradient id={`bg-score-${accent}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a7e5d3" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="480" height="360" fill={`url(#bg-score-${accent})`} />
        {[40, 90, 140, 190, 240, 290].map((y, i) => (
          <g key={i}>
            <rect x="30" y={y - 11} width="120" height="22" rx="3" fill="#ffffff" opacity="0.9" />
            <line x1="160" y1={y} x2="210" y2={y} stroke="#777169" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="240" cy={y} r="14" fill={accent} />
            <circle cx="240" cy={y} r="6" fill="#ffffff" />
            <line x1="270" y1={y} x2="320" y2={y} stroke="#777169" strokeWidth="1" strokeDasharray="3 3" />
            <rect x="320" y={y - 11} width="120" height="22" rx="3" fill="#0c0a09" opacity="0.9" />
            <text x="380" y={y + 4} fontFamily="Inter, sans-serif" fontSize="11" fill="#ffffff" textAnchor="middle">
              {(0.12 + i * 0.16).toFixed(2)}
            </text>
          </g>
        ))}
      </svg>
    );
  }
  if (kind === 'aggregate') {
    return (
      <svg viewBox="0 0 480 360" className="h-full w-full">
        <defs>
          <linearGradient id={`bg-agg-${accent}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f4c5a8" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="480" height="360" fill={`url(#bg-agg-${accent})`} />
        <g transform="translate(120, 180)">
          <circle cx="0" cy="0" r="74" fill="#ffffff" opacity="0.92" />
          {[
            { pct: 0.42, c: '#a7e5d3' },
            { pct: 0.26, c: '#c8b8e0' },
            { pct: 0.18, c: '#f4c5a8' },
            { pct: 0.14, c: '#a8c8e8' },
          ].map((d, i, arr) => {
            let acc = 0;
            for (let j = 0; j < i; j += 1) acc += arr[j].pct;
            const start = acc * Math.PI * 2 - Math.PI / 2;
            const end = (acc + d.pct) * Math.PI * 2 - Math.PI / 2;
            const x1 = Math.cos(start) * 74;
            const y1 = Math.sin(start) * 74;
            const x2 = Math.cos(end) * 74;
            const y2 = Math.sin(end) * 74;
            const large = d.pct > 0.5 ? 1 : 0;
            return (
              <path
                key={i}
                d={`M 0 0 L ${x1} ${y1} A 74 74 0 ${large} 1 ${x2} ${y2} Z`}
                fill={d.c}
              />
            );
          })}
          <circle cx="0" cy="0" r="32" fill="#fafafa" />
          <text x="0" y="5" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="600" fill="#0c0a09" textAnchor="middle">42%</text>
        </g>
        <g transform="translate(240, 70)">
          {[
            { label: 'Safe', pct: 0.55, c: '#a7e5d3' },
            { label: 'Insult', pct: 0.30, c: '#c8b8e0' },
            { label: 'Obscene', pct: 0.40, c: '#f4c5a8' },
            { label: 'Threat', pct: 0.65, c: '#a8c8e8' },
            { label: 'Dangerous', pct: 0.50, c: '#e8b8c4' },
          ].map((row, i) => (
            <g key={i} transform={`translate(0, ${i * 50})`}>
              <text x="0" y="12" fontFamily="Inter, sans-serif" fontSize="13" fill="#0c0a09">{row.label}</text>
              <rect x="0" y="20" width="200" height="10" rx="5" fill="#ffffff" opacity="0.85" />
              <rect x="0" y="20" width={200 * row.pct} height="10" rx="5" fill={row.c} />
              <text x="210" y="29" fontFamily="Inter, sans-serif" fontSize="11" fill="#777169">{Math.round(row.pct * 100)}%</text>
            </g>
          ))}
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 480 360" className="h-full w-full">
      <defs>
        <linearGradient id={`bg-read-${accent}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
          <stop offset="100%" stopColor="#e8b8c4" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <rect width="480" height="360" fill={`url(#bg-read-${accent})`} />
      <rect x="40" y="40" width="400" height="280" rx="14" fill="#ffffff" opacity="0.95" />
      <text x="60" y="74" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" fill="#777169" letterSpacing="1.5">
        OVERALL TOXICITY
      </text>
      <text x="60" y="120" fontFamily="EB Garamond, serif" fontSize="56" fontWeight="300" fill="#0c0a09">
        0.34
      </text>
      <text x="60" y="148" fontFamily="Inter, sans-serif" fontSize="13" fill="#777169">
        Confidence 78% · 200 comments analysed
      </text>
      <g transform="translate(60, 180)">
        {[
          { label: 'Safe', w: 200, c: '#a7e5d3' },
          { label: 'Insult', w: 140, c: '#c8b8e0' },
          { label: 'Obscene', w: 90, c: '#f4c5a8' },
          { label: 'Threat', w: 50, c: '#a8c8e8' },
          { label: 'Dangerous', w: 30, c: '#e8b8c4' },
        ].map((b, i) => (
          <g key={i} transform={`translate(0, ${i * 24})`}>
            <text x="0" y="10" fontFamily="Inter, sans-serif" fontSize="11" fill="#777169">{b.label}</text>
            <rect x="60" y="0" width="240" height="10" rx="5" fill="#f0efed" />
            <rect x="60" y="0" width={b.w} height="10" rx="5" fill={b.c} />
          </g>
        ))}
      </g>
    </svg>
  );
}

export default StepCard;
