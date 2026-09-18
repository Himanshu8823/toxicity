import type { LabelStat, ToxicityLabel } from '@/lib/types';
import { LABEL_META, LABEL_ORDER } from '@/lib/labels';
import { clamp } from '@/lib/utils';

export interface CategoryBreakdownProps {
  labelStats: LabelStat[];
}

interface Row {
  label: ToxicityLabel;
  count: number;
  percentage: number;
  avgConfidence: number;
}

/**
 * Back-fills `labelStats` so every canonical label renders a row, even when
 * the backend omitted labels that never occurred in this batch.
 */
function toRows(labelStats: LabelStat[]): Row[] {
  const byLabel = new Map(labelStats.map((stat) => [stat.label, stat]));
  return LABEL_ORDER.map((label) => {
    const stat = byLabel.get(label);
    const percentage = stat ? Number(stat.percentage) : 0;
    const avgConfidence = stat ? Number(stat.avgConfidence) : 0;
    return {
      label,
      count: stat?.count ?? 0,
      percentage: Number.isFinite(percentage) ? percentage : 0,
      avgConfidence: Number.isFinite(avgConfidence) ? avgConfidence : 0,
    };
  });
}

/**
 * A magazine-table reading of category share: label, count, a thin
 * proportion bar (pastel fill, ink outline — never red/green), percentage,
 * average confidence. Deliberately not a dashboard progress-bar list —
 * hairline rows, generous type, no chrome.
 */
export function CategoryBreakdown({ labelStats }: CategoryBreakdownProps) {
  const rows = toRows(labelStats);

  return (
    <div className="editorial-container">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h3 className="display-sm text-ink">By category</h3>
        <span className="caption-uppercase text-muted">Share of analysed comments</span>
      </div>

      <div className="hairline-card divide-y divide-hairline">
        {rows.map((row) => {
          const meta = LABEL_META[row.label];
          const barWidth = clamp(row.percentage, 0, 100);
          return (
            <div
              key={row.label}
              className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:gap-6 sm:py-4"
            >
              <div className="flex w-full items-baseline justify-between gap-3 sm:w-44 sm:flex-col sm:items-start sm:justify-start sm:gap-1">
                <span className="title-sm text-ink">{meta.display}</span>
                <span className="caption text-muted">{row.count.toLocaleString()} comments</span>
              </div>

              <div
                className="relative h-2.5 w-full flex-1 overflow-hidden rounded-[var(--radius-pill)] border"
                style={{ borderColor: meta.ink, backgroundColor: 'var(--color-surface-strong)' }}
                role="img"
                aria-label={`${meta.display}: ${row.percentage.toFixed(1)} percent, average confidence ${row.avgConfidence.toFixed(1)} percent`}
              >
                <div
                  className="h-full rounded-[var(--radius-pill)]"
                  style={{ width: `${barWidth}%`, backgroundColor: meta.pastel }}
                />
              </div>

              <div className="flex w-full shrink-0 items-center justify-between gap-4 sm:w-44 sm:justify-end">
                <span className="body-strong text-ink">{row.percentage.toFixed(1)}%</span>
                <span className="caption text-muted">{row.avgConfidence.toFixed(1)}% conf.</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryBreakdown;
