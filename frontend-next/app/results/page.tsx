'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AnalysedComment, AnalysisResponse, LabelStat, ToxicityLabel } from '@/lib/types';
import { CANONICAL_LABELS } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { Nav } from '@/components/ui/Nav';
import { Footer } from '@/components/ui/Footer';
import { VideoHeader } from '@/components/results/VideoHeader';
import { VerdictBand } from '@/components/results/VerdictBand';
import { KpiRow } from '@/components/results/KpiRow';
import { CategoryBreakdown } from '@/components/results/CategoryBreakdown';
import { MostToxicComments } from '@/components/results/MostToxicComments';
import { Charts } from '@/components/results/Charts';
import { CommentExplorer } from '@/components/results/CommentExplorer';
import { ExportMenu } from '@/components/results/ExportMenu';
import { ResultTabs } from '@/components/results/ResultTabs';

const STORAGE_KEY = 'toxiscan:result';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: AnalysisResponse };

const CANONICAL_LABEL_SET: ReadonlySet<string> = new Set(CANONICAL_LABELS);

function isToxicityLabel(value: unknown): value is ToxicityLabel {
  return typeof value === 'string' && CANONICAL_LABEL_SET.has(value);
}

function isPrediction(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isToxicityLabel(record.label) &&
    typeof record.score === 'number' &&
    typeof record.percentage === 'string'
  );
}

function isAnalysedComment(value: unknown): value is AnalysedComment {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.text === 'string' &&
    Array.isArray(record.predictions) &&
    record.predictions.every(isPrediction) &&
    isToxicityLabel(record.mostLikelyCategory) &&
    typeof record.confidence === 'number'
  );
}

function isLabelStat(value: unknown): value is LabelStat {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isToxicityLabel(record.label) &&
    typeof record.count === 'number' &&
    typeof record.percentage === 'string' &&
    typeof record.avgConfidence === 'string'
  );
}

/**
 * Defensive shape check for whatever JSON came out of sessionStorage. We
 * never trust it fully — the goal is "never crash, never blank-screen",
 * not full schema validation. Anything structurally off routes to the
 * empty state rather than propagating into a render crash.
 */
function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;

  const videoInfo = record.videoInfo as Record<string, unknown> | undefined;
  if (
    typeof videoInfo !== 'object' ||
    videoInfo === null ||
    typeof videoInfo.id !== 'string' ||
    typeof videoInfo.title !== 'string'
  ) {
    return false;
  }

  const analysis = record.analysis as Record<string, unknown> | undefined;
  if (typeof analysis !== 'object' || analysis === null) return false;

  const hasCoreFields =
    typeof analysis.totalAnalyzed === 'number' &&
    typeof analysis.errored === 'number' &&
    typeof analysis.overallToxicityScore === 'string' &&
    typeof analysis.avgConfidence === 'string' &&
    typeof analysis.toxicCount === 'number' &&
    typeof analysis.nonToxicCount === 'number' &&
    Array.isArray(analysis.labelStats) &&
    Array.isArray(analysis.mostToxicComments) &&
    Array.isArray(analysis.allResults);

  if (!hasCoreFields) return false;

  return (
    (analysis.labelStats as unknown[]).every(isLabelStat) &&
    (analysis.mostToxicComments as unknown[]).every(isAnalysedComment) &&
    (analysis.allResults as unknown[]).every(isAnalysedComment)
  );
}

export default function ResultsPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    // sessionStorage is unavailable during SSR; this effect only ever runs
    // client-side, so reading here (rather than during render) is required.
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setState({ status: 'error' });
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      if (!isAnalysisResponse(parsed)) {
        setState({ status: 'error' });
        return;
      }
      setState({ status: 'ready', data: parsed });
    } catch {
      setState({ status: 'error' });
    }
  }, []);

  if (state.status === 'loading') {
    return <ResultsSkeleton />;
  }

  if (state.status === 'error') {
    return <EmptyResultsState />;
  }

  const { data } = state;
  const comments: AnalysedComment[] = data.analysis.allResults;

  return (
    <div className="min-h-screen bg-canvas">
      <Nav />

      <main className="pb-24">
        <VideoHeader videoInfo={data.videoInfo} />
        <VerdictBand analysis={data.analysis} />
        <div className="section-rhythm pt-6">
          <KpiRow analysis={data.analysis} />
        </div>

        <div className="editorial-container mt-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="display-md text-ink">The full picture</h2>
            <ExportMenu data={data} />
          </div>

          <ResultTabs
            overview={
              <div className="flex flex-col gap-16">
                <CategoryBreakdown labelStats={data.analysis.labelStats} />
                <MostToxicComments comments={data.analysis.mostToxicComments} />
              </div>
            }
            charts={<Charts labelStats={data.analysis.labelStats} />}
            comments={<CommentExplorer allResults={comments} />}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="editorial-container flex flex-col gap-8 pt-12">
        <Skeleton className="h-48 w-full rounded-[var(--radius-xl)]" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-xl)]" />
        <Skeleton className="h-24 w-full rounded-[var(--radius-xl)]" />
        <Skeleton className="h-96 w-full rounded-[var(--radius-xl)]" />
      </div>
    </div>
  );
}

function EmptyResultsState() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="orb orb-drifting -z-10 h-72 w-72 bg-[var(--color-gradient-peach)]" />
      <p className="caption-uppercase text-muted">No results found</p>
      <h1 className="display-lg mt-3 text-ink">We couldn&apos;t find an analysis to show</h1>
      <p className="body-md mt-3 max-w-md text-body">
        Your results may have expired, or you opened this page directly. Start a new analysis from
        the homepage to see a report here.
      </p>
      <Link
        href="/"
        className="btn-type mt-8 inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-6 py-3 text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-active)]"
      >
        Analyse a video
      </Link>
    </div>
  );
}
