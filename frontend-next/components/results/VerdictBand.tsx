'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Scene } from '@/components/three/Scene';
import type { Analysis, ToxicityLabel } from '@/lib/types';
import { LABEL_ORDER } from '@/lib/labels';
import { toxicityVerdict } from '@/lib/labels';

// `Scene` owns the <Canvas> and every "should this be WebGL at all" decision
// (reduced motion, weak device, no WebGL). ToxicitySpectrum uses R3F hooks and
// must therefore always be mounted as its child, never on its own.
const ToxicitySpectrum = dynamic(
  () => import('@/components/three/ToxicitySpectrum').then((mod) => mod.ToxicitySpectrum),
  { ssr: false },
);

export interface VerdictBandProps {
  analysis: Analysis;
}

/**
 * The headline read: a large editorial score, a plain-language verdict, and
 * an honest count of what was actually analysed (including failures). The
 * ToxicitySpectrum 3D piece sits behind/beside the score as the atmospheric
 * moment for this page — not decoration bolted on afterward.
 */
export function VerdictBand({ analysis }: VerdictBandProps) {
  const scoreNumber = Number(analysis.overallToxicityScore);
  const safeScore = Number.isFinite(scoreNumber) ? scoreNumber : 0;
  const verdict = toxicityVerdict(safeScore);

  const distribution = useMemo(() => {
    const byLabel = new Map(analysis.labelStats.map((stat) => [stat.label, stat]));
    return LABEL_ORDER.map((label: ToxicityLabel) => ({
      label,
      value: byLabel.get(label)?.count ?? 0,
    }));
  }, [analysis.labelStats]);

  const hasErrors = analysis.errored > 0;

  return (
    <section className="editorial-container relative pt-12 pb-4 sm:pt-16">
      <div className="orb orb-drifting -top-24 left-1/2 h-72 w-72 -translate-x-1/2 bg-[var(--color-gradient-lavender)] sm:h-96 sm:w-96" />

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-center">
        <div className="fade-rise flex min-w-0 flex-col items-start gap-4">
          <span className="caption-uppercase text-muted">Overall read</span>
          <div className="flex items-baseline gap-4">
            <span className="display-mega text-ink">
              {Number.isFinite(scoreNumber) ? safeScore.toFixed(1) : '—'}
              <span className="display-lg text-muted">%</span>
            </span>
          </div>
          <h2 className="display-lg text-ink">{verdict.headline}</h2>
          <p className="body-md w-full max-w-[32rem] text-body">{verdict.detail}</p>
          <p className="caption text-muted">
            Based on {analysis.totalAnalyzed.toLocaleString()} analysed comment
            {analysis.totalAnalyzed === 1 ? '' : 's'}
            {hasErrors ? (
              <>
                {' '}
                — {analysis.errored.toLocaleString()} comment{analysis.errored === 1 ? '' : 's'} could
                not be scored.
              </>
            ) : (
              '.'
            )}
          </p>
        </div>

        <div className="relative h-64 w-full sm:h-80">
          <Scene ariaHidden cameraPosition={[0, 0, 9.5]}>
            <ToxicitySpectrum distribution={distribution} />
          </Scene>
        </div>
      </div>
    </section>
  );
}

export default VerdictBand;
