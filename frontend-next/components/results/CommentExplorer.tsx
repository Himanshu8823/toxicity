'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AnalysedComment, ToxicityLabel } from '@/lib/types';
import { LABEL_META, LABEL_ORDER } from '@/lib/labels';
import { cn, truncate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface CommentExplorerProps {
  allResults: AnalysedComment[];
}

type FilterValue = 'all' | ToxicityLabel;
type SortValue = 'most-toxic' | 'least-toxic' | 'longest' | 'original';

const PAGE_SIZE = 20;
const TEXT_PREVIEW_LIMIT = 600;
const DEBOUNCE_MS = 250;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

/** Non-toxic comments score highest confidence in the "clean" direction, so
 * "most toxic" ranks by confidence among harmful labels and treats non-toxic
 * as the bottom of the scale — reusing `confidence` (0–1) directly. */
function toxicityRank(comment: AnalysedComment): number {
  const isNonToxic = comment.mostLikelyCategory === 'non_toxic';
  return isNonToxic ? -comment.confidence : comment.confidence;
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function CommentExplorer({ allResults }: CommentExplorerProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [sort, setSort] = useState<SortValue>('original');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterValue, number> = {
      all: allResults.length,
      non_toxic: 0,
      insult: 0,
      obscenity: 0,
      threat: 0,
      dangerous: 0,
    };
    for (const comment of allResults) {
      const label = comment.mostLikelyCategory;
      if (label && label in counts) counts[label as ToxicityLabel] += 1;
    }
    return counts;
  }, [allResults]);

  const filtered = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    let rows = allResults;

    if (filter !== 'all') {
      rows = rows.filter((comment) => comment.mostLikelyCategory === filter);
    }
    if (needle) {
      rows = rows.filter((comment) => comment.text?.toLowerCase().includes(needle));
    }
    return rows;
  }, [allResults, filter, debouncedQuery]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    switch (sort) {
      case 'most-toxic':
        return rows.sort((a, b) => toxicityRank(b) - toxicityRank(a));
      case 'least-toxic':
        return rows.sort((a, b) => toxicityRank(a) - toxicityRank(b));
      case 'longest':
        return rows.sort((a, b) => (b.text?.length ?? 0) - (a.text?.length ?? 0));
      case 'original':
      default:
        return rows;
    }
  }, [filtered, sort]);

  // Reset pagination whenever the effective result set changes shape.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, debouncedQuery, sort]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  const filterPills: { value: FilterValue; label: string }[] = [
    { value: 'all', label: 'All' },
    ...LABEL_ORDER.map((label) => ({ value: label, label: LABEL_META[label].display })),
  ];

  return (
    <div className="editorial-container flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <label className="relative block">
          <span className="sr-only">Search comments</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search comment text…"
            className="body-md h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-hairline-strong)] bg-surface-card pl-10 pr-4 text-ink outline-none placeholder:text-muted focus:border-2 focus:border-[var(--color-ink)]"
          />
        </label>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {filterPills.map((pill) => {
            const isActive = filter === pill.value;
            return (
              <button
                key={pill.value}
                type="button"
                onClick={() => setFilter(pill.value)}
                aria-pressed={isActive}
                className={cn(
                  'caption-uppercase rounded-[var(--radius-pill)] border px-3.5 py-2 transition-colors',
                  isActive
                    ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-on-primary)]'
                    : 'border-hairline bg-surface-card text-body hover:border-[var(--color-hairline-strong)]',
                )}
              >
                {pill.label} · {filterCounts[pill.value]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="caption text-muted">
            {sorted.length.toLocaleString()} comment{sorted.length === 1 ? '' : 's'}
          </span>
          <label className="flex items-center gap-2">
            <span className="caption-uppercase text-muted">Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortValue)}
              className="body-sm rounded-[var(--radius-sm)] border border-hairline bg-surface-card px-2.5 py-1.5 text-ink outline-none focus:border-2 focus:border-[var(--color-ink)]"
            >
              <option value="original">Original order</option>
              <option value="most-toxic">Most toxic</option>
              <option value="least-toxic">Least toxic</option>
              <option value="longest">Longest</option>
            </select>
          </label>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="hairline-card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="title-sm text-ink">No comments match</p>
          <p className="body-sm text-muted">Try a different search term or filter.</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {visible.map((comment, index) => (
              <CommentCard key={`${index}-${comment.text.slice(0, 24)}`} comment={comment} />
            ))}
          </ul>

          {hasMore ? (
            <Button
              variant="outline"
              className="mx-auto"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Show more ({sorted.length - visible.length} remaining)
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function CommentCard({ comment }: { comment: AnalysedComment }) {
  const meta = LABEL_META[comment.mostLikelyCategory] ?? LABEL_META.dangerous;
  const confidencePct = clampPct(comment.confidence * 100);
  const text = comment.text ?? '';

  return (
    <li className="hairline-card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge labelTone={comment.mostLikelyCategory}>{meta.display}</Badge>
        <span className="caption text-muted">{confidencePct.toFixed(1)}% confidence</span>
      </div>

      <p className="body-md whitespace-pre-wrap break-words text-body">
        {truncate(text, TEXT_PREVIEW_LIMIT)}
      </p>

      <div
        className="h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)]"
        style={{ backgroundColor: 'var(--color-surface-strong)' }}
        role="img"
        aria-label={`Confidence ${confidencePct.toFixed(1)} percent`}
      >
        <div
          className="h-full rounded-[var(--radius-pill)]"
          style={{ width: `${confidencePct}%`, backgroundColor: meta.pastel }}
        />
      </div>
    </li>
  );
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

export default CommentExplorer;
