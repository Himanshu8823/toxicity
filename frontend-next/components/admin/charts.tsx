import { CATEGORY_META } from '@/lib/analysis/taxonomy';
import type { ToxicityCategory } from '@/lib/db/schema';
import { Figure, formatCount, formatPercent } from './console';

/**
 * Charts for the console, drawn as inline SVG on the server.
 *
 * The public results pages use Recharts, which is the right call there: they
 * are interactive, they animate, and the bundle buys something. Here it buys
 * nothing. These charts are read, not explored, and shipping a charting runtime
 * to render a sparkline of daily counts would make the densest page in the app
 * also the heaviest.
 *
 * Everything below is a Server Component with zero client JavaScript.
 */

// ─── Time series ─────────────────────────────────────────────────────────────

export interface SeriesPoint {
  day: string;
  value: number;
}

/**
 * A daily bar series.
 *
 * Bars rather than a line: the underlying data is a count per discrete day, and
 * a line between two days implies values in between that do not exist.
 */
export function DailyBars({
  data,
  label,
  height = 96,
}: {
  data: readonly SeriesPoint[];
  label: string;
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-[12.5px] text-muted-soft">
        No activity in this period.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const width = 100;
  const slot = width / data.length;
  // Leave a hairline of space between bars, but never let them vanish on a
  // 90-day range where each slot is well under a pixel.
  const barWidth = Math.max(slot * 0.62, 0.35);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`${label}: ${formatCount(total)} across ${data.length} days, peaking at ${formatCount(max)}.`}
      >
        {/* Quartile guides, drawn behind the bars so they read as paper ruling. */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={0}
            x2={width}
            y1={height - height * f}
            y2={height - height * f}
            stroke="#f0efed"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {data.map((d, i) => {
          const h = d.value === 0 ? 0 : Math.max((d.value / max) * height, 1.5);
          return (
            <rect
              key={d.day}
              x={i * slot + (slot - barWidth) / 2}
              y={height - h}
              width={barWidth}
              height={h}
              fill="#292524"
              opacity={0.82}
            >
              <title>{`${d.day}: ${formatCount(d.value)}`}</title>
            </rect>
          );
        })}
        <line
          x1={0}
          x2={width}
          y1={height}
          y2={height}
          stroke="#d6d3d1"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption className="mt-2 flex items-center justify-between text-[11.5px] text-muted-soft">
        <span>{data[0]?.day}</span>
        <span>
          peak <Figure className="text-[11.5px]">{formatCount(max)}</Figure> · total{' '}
          <Figure className="text-[11.5px]">{formatCount(total)}</Figure>
        </span>
        <span>{data[data.length - 1]?.day}</span>
      </figcaption>
    </figure>
  );
}

// ─── Distribution ────────────────────────────────────────────────────────────

/**
 * A horizontal distribution, rendered as a labelled table rather than a pie.
 *
 * A nine-slice pie with a long tail is unreadable, and the question being asked
 * of this data is "how many, and what share" — both of which a row of figures
 * answers better than an arc does. The bar is an accent on the number, not the
 * number itself.
 */
export function DistributionBars({
  rows,
  caption,
  emptyMessage = 'Nothing recorded yet.',
}: {
  rows: readonly { key: string; label: string; value: number; ink?: string }[];
  caption: string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-[12.5px] text-muted-soft">
        {emptyMessage}
      </p>
    );
  }

  const total = rows.reduce((sum, r) => sum + r.value, 0);
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Label</th>
          <th scope="col">Count</th>
          <th scope="col">Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th
              scope="row"
              className="w-[38%] py-[5px] pr-3 text-[12.5px] font-normal text-body"
            >
              <span style={row.ink ? { color: row.ink } : undefined}>
                {row.label}
              </span>
            </th>
            <td className="py-[5px] pr-3">
              <span
                aria-hidden="true"
                className="block h-[7px] rounded-[1px]"
                style={{
                  width: `${Math.max((row.value / max) * 100, 1)}%`,
                  backgroundColor: row.ink ?? '#292524',
                  opacity: 0.55,
                }}
              />
            </td>
            <td className="w-[14%] py-[5px] text-right">
              <Figure className="text-[12.5px]">{formatCount(row.value)}</Figure>
            </td>
            <td className="w-[13%] py-[5px] pl-2 text-right text-[12px] text-muted-soft">
              {total === 0 ? '—' : formatPercent(row.value / total, 1)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Convenience wrapper: category rows already carry their taxonomy ink. */
export function CategoryDistribution({
  rows,
  caption,
}: {
  rows: readonly { category: ToxicityCategory; value: number }[];
  caption: string;
}) {
  return (
    <DistributionBars
      caption={caption}
      rows={rows.map((r) => ({
        key: r.category,
        label: CATEGORY_META[r.category].display,
        value: r.value,
        ink: CATEGORY_META[r.category].ink,
      }))}
    />
  );
}

// ─── ROC curve ───────────────────────────────────────────────────────────────

/**
 * The ROC curve for one slice.
 *
 * Square by construction, with the chance diagonal drawn in: the whole point of
 * the plot is how far the curve sits above that diagonal, and without it the
 * shape says nothing.
 */
export function RocCurve({
  points,
  auc,
  size = 180,
}: {
  points: readonly { falsePositiveRate: number; truePositiveRate: number }[];
  auc: number;
  size?: number;
}) {
  if (points.length < 2) {
    return (
      <p className="py-6 text-center text-[12px] text-muted-soft">
        Not enough labelled data to plot a curve.
      </p>
    );
  }

  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${(p.falsePositiveRate * size).toFixed(2)} ${(
          size - p.truePositiveRate * size
        ).toFixed(2)}`
    )
    .join(' ');

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full max-w-[220px]"
        role="img"
        aria-label={`ROC curve with area under curve ${auc.toFixed(3)}.`}
      >
        <rect
          x={0}
          y={0}
          width={size}
          height={size}
          fill="#fafafa"
          stroke="#e7e5e4"
        />
        <line
          x1={0}
          y1={size}
          x2={size}
          y2={0}
          stroke="#d6d3d1"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <path d={path} fill="none" stroke="#292524" strokeWidth={1.5} />
      </svg>
      <figcaption className="mt-1.5 text-[11.5px] text-muted">
        Dashed line is chance (AUC 0.500). Area under curve{' '}
        <Figure className="text-[11.5px]">{auc.toFixed(3)}</Figure>.
      </figcaption>
    </figure>
  );
}
