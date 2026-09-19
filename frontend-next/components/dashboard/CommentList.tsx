'use client';

import { useMemo, useState } from 'react';
import type { Comment, CommentAnalysis, Severity, ToxicityCategory } from '@/lib/db/schema';
import {
  CATEGORIES,
  CATEGORY_META,
  SEVERITIES,
  SEVERITY_META,
} from '@/lib/analysis/taxonomy';
import { CommentCard } from './CommentCard';
import type { ExistingFeedback } from './FeedbackControls';
import { cn } from '@/lib/utils';

export interface CommentListEntry {
  comment: Comment;
  analysis: CommentAnalysis | null;
}

export interface CommentListProps {
  entries: CommentListEntry[];
  /**
   * This user's existing verdicts, keyed by `commentAnalysisId`.
   *
   * Resolved in one server-side read on the scan detail page rather than a GET
   * per card: a 200-comment scan would otherwise fire 200 requests the moment
   * it hydrated, all to answer a question one query already answers.
   */
  feedbackByAnalysisId?: Record<string, ExistingFeedback>;
}

type SortKey = 'confidence' | 'severity' | 'recent';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'confidence', label: 'Confidence' },
  { value: 'severity', label: 'Severity' },
  { value: 'recent', label: 'Newest' },
];

/** How many render at once — a 200-comment scan would otherwise be a wall. */
const PAGE_STEP = 25;

const SELECT_CLASS =
  'body-sm h-9 rounded-[var(--radius-md)] border border-hairline-strong bg-surface-card px-3 text-ink focus:border-2 focus:border-ink focus:outline-none';

/**
 * The scan's comments, with filtering and sorting.
 *
 * Client-side rather than through the URL: the whole comment set is already on
 * the page (the detail query returns all of it in one read), so a round trip
 * per filter change would be latency bought for nothing.
 *
 * Only categories and severities actually present are offered as options —
 * a filter that can only ever return nothing is worse than no filter.
 */
export function CommentList({
  entries,
  feedbackByAnalysisId,
}: CommentListProps) {
  const [category, setCategory] = useState<ToxicityCategory | 'all'>('all');
  const [severity, setSeverity] = useState<Severity | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('confidence');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [visible, setVisible] = useState(PAGE_STEP);

  const presentCategories = useMemo(() => {
    const seen = new Set(
      entries.map((e) => e.analysis?.category).filter(Boolean) as ToxicityCategory[],
    );
    return CATEGORIES.filter((c) => seen.has(c));
  }, [entries]);

  const presentSeverities = useMemo(() => {
    const seen = new Set(
      entries.map((e) => e.analysis?.severity).filter(Boolean) as Severity[],
    );
    return SEVERITIES.filter((s) => seen.has(s));
  }, [entries]);

  const flaggedCount = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.analysis?.isSarcastic ||
          e.analysis?.contextShifted ||
          e.analysis?.modelsDisagree,
      ).length,
    [entries],
  );

  const filtered = useMemo(() => {
    const rows = entries.filter((entry) => {
      const a = entry.analysis;
      if (category !== 'all' && a?.category !== category) return false;
      if (severity !== 'all' && a?.severity !== severity) return false;
      if (
        onlyFlagged &&
        !(a?.isSarcastic || a?.contextShifted || a?.modelsDisagree)
      ) {
        return false;
      }
      return true;
    });

    // Unscored comments sort last under every key — they have no value to
    // compare on, and burying them keeps the top of the list meaningful.
    return [...rows].sort((x, y) => {
      const a = x.analysis;
      const b = y.analysis;
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;

      switch (sort) {
        case 'confidence':
          return b.confidence - a.confidence;
        case 'severity': {
          const diff = SEVERITY_META[b.severity].rank - SEVERITY_META[a.severity].rank;
          return diff !== 0 ? diff : b.confidence - a.confidence;
        }
        case 'recent': {
          const bt = x.comment.publishedAt ? new Date(x.comment.publishedAt).getTime() : 0;
          const at = y.comment.publishedAt ? new Date(y.comment.publishedAt).getTime() : 0;
          return at - bt;
        }
      }
    });
  }, [entries, category, severity, sort, onlyFlagged]);

  const shown = filtered.slice(0, visible);

  function resetPaging<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setVisible(PAGE_STEP);
    };
  }

  return (
    <section aria-labelledby="comments-heading">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="comments-heading" className="title-md text-ink">
            Comments
          </h2>
          <p aria-live="polite" className="caption mt-1 text-muted tabular-nums">
            Showing {shown.length} of {filtered.length}
            {filtered.length !== entries.length && ` (${entries.length} total)`}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-category" className="caption-uppercase text-muted">
              Category
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) =>
                resetPaging(setCategory)(e.target.value as ToxicityCategory | 'all')
              }
              className={SELECT_CLASS}
            >
              <option value="all">All categories</option>
              {presentCategories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].display}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="filter-severity" className="caption-uppercase text-muted">
              Severity
            </label>
            <select
              id="filter-severity"
              value={severity}
              onChange={(e) =>
                resetPaging(setSeverity)(e.target.value as Severity | 'all')
              }
              className={SELECT_CLASS}
            >
              <option value="all">All severities</option>
              {presentSeverities.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_META[s].display}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="sort-comments" className="caption-uppercase text-muted">
              Sort by
            </label>
            <select
              id="sort-comments"
              value={sort}
              onChange={(e) => resetPaging(setSort)(e.target.value as SortKey)}
              className={SELECT_CLASS}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {flaggedCount > 0 && (
        <button
          type="button"
          onClick={() => resetPaging(setOnlyFlagged)(!onlyFlagged)}
          aria-pressed={onlyFlagged}
          className={cn(
            'caption mb-5 inline-flex h-8 items-center rounded-[var(--radius-pill)] border px-3.5 transition-colors duration-150',
            onlyFlagged
              ? 'border-ink bg-primary text-on-primary'
              : 'border-hairline-strong text-muted hover:border-ink hover:text-ink',
          )}
        >
          Only sarcasm, context shifts and disagreements ({flaggedCount})
        </button>
      )}

      {shown.length === 0 ? (
        <div className="hairline-card px-6 py-12 text-center">
          <p className="body-md text-ink">No comments match those filters.</p>
          <button
            type="button"
            onClick={() => {
              setCategory('all');
              setSeverity('all');
              setOnlyFlagged(false);
              setVisible(PAGE_STEP);
            }}
            className="btn-type mt-4 inline-flex h-9 items-center justify-center rounded-[var(--radius-pill)] border border-hairline-strong px-4 text-ink transition-colors hover:border-ink"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {shown.map((entry) => (
              <CommentCard
                key={entry.comment.id}
                comment={entry.comment}
                analysis={entry.analysis}
                feedback={
                  entry.analysis
                    ? (feedbackByAnalysisId?.[entry.analysis.id] ?? null)
                    : null
                }
              />
            ))}
          </ul>

          {visible < filtered.length && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_STEP)}
                className="btn-type inline-flex h-10 items-center justify-center rounded-[var(--radius-pill)] border border-hairline-strong px-5 text-ink transition-colors hover:border-ink"
              >
                Show {Math.min(PAGE_STEP, filtered.length - visible)} more
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default CommentList;
