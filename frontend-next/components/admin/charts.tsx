'use client';

import { useId, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CATEGORY_META } from '@/lib/analysis/taxonomy';
import type { ToxicityCategory } from '@/lib/db/schema';
import { Figure, formatCount, formatPercent } from './console';

/**
 * Charts for the console.
 *
 * The user-facing results pages already ship Recharts because they are
 * interactive surfaces — hovering a bar, reading a tooltip, scrubbing the axis
 * is the experience. The console carries the same kind of data, and the
 * previous server-only inline SVG treatment made the densest page in the app
 * look the dullest. These versions are Client Components built on Recharts but
 * styled in the console dialect — ink-on-canvas, hairlines rather than
 * saturated fills, tabular numerals — so an admin reading a metric sees the
 * same figure whether they read it here or on the public dashboard.
 *
 * Each chart also renders a visually-hidden table with the same numbers, so
 * the information is reachable without sight.
 */

// ─── Palette ──────────────────────────────────────────────────────────────────

/** Axis ticks, grid lines, secondary text — kept off the ink scale. */
const AXIS_COLOR = '#a8a29e';

/** A muted ink wash for area fills — warm enough to read as a signal. */
const AREA_INK = '#7a6a5c';
const AREA_PASTEL = '#d9c7b8';

/**
 * Sequential ink shades used by the distribution bars when the caller hasn't
 * supplied a per-row colour. Each row is darker than the last so the bars rank
 * left-to-right without any extra annotation.
 */
const DISTRIBUTION_INKS = [
  '#1f1d1b',
  '#3a3633',
  '#56504b',
  '#736963',
  '#8f837a',
  '#aaa091',
  '#c4bba8',
  '#dbd2bf',
  '#ebe3d1',
];

// ─── Tooltip shell ────────────────────────────────────────────────────────────

/**
 * The shell every chart tooltip uses. Keeps the visual language identical
 * across the console — a hairline card with the value in tabular numerics —
 * so the reader's eye doesn't have to relearn it per chart.
 */
function TooltipShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-xs)] border border-hairline bg-surface-card px-3 py-2 shadow-[var(--shadow-soft-drop)]">
      {children}
    </div>
  );
}

// ─── Time series ──────────────────────────────────────────────────────────────

export interface SeriesPoint {
  day: string;
  value: number;
}

interface DailyTooltipPayload {
  payload: SeriesPoint;
}

function DailyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: DailyTooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <TooltipShell>
      <p className="text-[12.5px] text-ink">
        {new Date(point.day).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </p>
      <p className="mt-0.5 font-mono text-[11.5px] tabular-nums text-muted">
        <Figure className="text-[11.5px]">{formatCount(point.value)}</Figure>{' '}
        {point.value === 1 ? 'event' : 'events'}
      </p>
    </TooltipShell>
  );
}

/**
 * A daily series, drawn as an area chart with smooth monotone interpolation.
 *
 * An area rather than bars because the shape of the run is the answer to the
 * implicit question — a fortnight climbing is a finding a single tall bar
 * would hide. The gradient fades to transparent so the chart reads as
 * atmosphere against the canvas rather than a block of colour.
 */
export function DailyBars({
  data,
  label,
  height = 220,
}: {
  data: readonly SeriesPoint[];
  label: string;
  height?: number;
}) {
  const gradientId = useId();

  const { rows, total, max } = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const max = data.reduce((peak, d) => (d.value > peak ? d.value : peak), 0);
    return { rows: [...data], total, max };
  }, [data]);

  if (rows.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center">
        <p className="text-[12.5px] text-muted-soft">No activity in this period.</p>
      </div>
    );
  }

  return (
    <figure className="m-0">
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={rows}
            margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={AREA_PASTEL} stopOpacity={0.95} />
                <stop offset="100%" stopColor={AREA_PASTEL} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--color-hairline)"
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              axisLine={{ stroke: 'var(--color-hairline)' }}
              tickLine={false}
              minTickGap={28}
              tickFormatter={(value: string) =>
                new Date(value).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                })
              }
            />
            <YAxis
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
              allowDecimals={false}
              tickFormatter={(value: number) =>
                value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value.toString()
              }
            />
            <Tooltip
              content={<DailyTooltip />}
              cursor={{ stroke: 'var(--color-hairline-strong)', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={AREA_INK}
              strokeWidth={1.75}
              fill={`url(#${gradientId})`}
              dot={{ r: 2.25, fill: AREA_INK, stroke: 'var(--color-surface-card)', strokeWidth: 1 }}
              activeDot={{ r: 4.5, fill: AREA_INK, stroke: 'var(--color-surface-card)', strokeWidth: 2 }}
              animationDuration={600}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-muted-soft">
        <span>{rows[0]?.day}</span>
        <span>
          peak{' '}
          <Figure className="text-[11.5px]">{formatCount(max)}</Figure> · total{' '}
          <Figure className="text-[11.5px]">{formatCount(total)}</Figure> ·{' '}
          <Figure className="text-[11.5px]">{rows.length}</Figure> days
        </span>
        <span>{rows[rows.length - 1]?.day}</span>
      </figcaption>

      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.day}>
              <td>{row.day}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

// ─── Distribution ────────────────────────────────────────────────────────────

interface DistributionRow {
  key: string;
  label: string;
  value: number;
  ink?: string;
}

interface DistributionTooltipPayload {
  payload: DistributionRow & { share: number };
}

function DistributionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: DistributionTooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;

  return (
    <TooltipShell>
      <p
        className="text-[12.5px] font-medium"
        style={row.ink ? { color: row.ink } : undefined}
      >
        {row.label}
      </p>
      <p className="mt-0.5 font-mono text-[11.5px] tabular-nums text-muted">
        <Figure className="text-[11.5px]">{formatCount(row.value)}</Figure> ·{' '}
        {formatPercent(row.share, 1)}
      </p>
    </TooltipShell>
  );
}

/**
 * A categorical distribution, drawn as horizontal bars with hover detail.
 *
 * Horizontal because category names are long and a vertical bar would force
 * the labels to rotate into illegibility on a laptop width. The bar is an
 * accent on the figure rather than the figure itself — the number on the
 * right stays the thing being read.
 */
export function DistributionBars({
  rows,
  caption,
  emptyMessage = 'Nothing recorded yet.',
  height,
}: {
  rows: readonly { key: string; label: string; value: number; ink?: string }[];
  caption: string;
  emptyMessage?: string;
  /** Optional override; default scales with the row count. */
  height?: number;
}) {
  const chartRows = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + r.value, 0);
    return rows.map((r) => ({
      ...r,
      share: total > 0 ? (r.value / total) * 100 : 0,
    }));
  }, [rows]);

  const total = chartRows.reduce((sum, r) => sum + r.value, 0);

  if (chartRows.length === 0 || total === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-[12.5px] text-muted-soft">{emptyMessage}</p>
      </div>
    );
  }

  const computedHeight = height ?? Math.max(160, chartRows.length * 36 + 24);

  return (
    <figure className="m-0">
      <div style={{ height: computedHeight }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartRows}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            barCategoryGap={6}
          >
            <CartesianGrid
              stroke="var(--color-hairline)"
              strokeDasharray="2 4"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              axisLine={{ stroke: 'var(--color-hairline)' }}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: 'var(--color-ink)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={140}
            />
            <Tooltip
              content={<DistributionTooltip />}
              cursor={{ fill: 'var(--color-surface-strong)' }}
            />
            <Bar
              dataKey="value"
              radius={[0, 3, 3, 0]}
              animationDuration={600}
              isAnimationActive
            >
              {chartRows.map((row, i) => (
                <Cell
                  key={row.key}
                  fill={row.ink ?? DISTRIBUTION_INKS[i % DISTRIBUTION_INKS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Count</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {chartRows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td>{row.value}</td>
              <td>{row.share.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
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

interface RocPoint {
  falsePositiveRate: number;
  truePositiveRate: number;
}

interface RocTooltipPayload {
  payload: RocPoint & { index: number };
}

function RocTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: RocTooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;

  return (
    <TooltipShell>
      <p className="text-[12.5px] text-ink">Operating point #{p.index + 1}</p>
      <p className="mt-0.5 font-mono text-[11.5px] tabular-nums text-muted">
        FPR {(p.falsePositiveRate * 100).toFixed(1)}% · TPR{' '}
        {(p.truePositiveRate * 100).toFixed(1)}%
      </p>
    </TooltipShell>
  );
}

/**
 * The ROC curve for one slice.
 *
 * The chance diagonal is drawn behind the curve with a dashed reference line
 * so the gap — which is what AUC actually measures — is the visual story
 * rather than the absolute shape.
 */
export function RocCurve({
  points,
  auc,
  size = 220,
}: {
  points: readonly { falsePositiveRate: number; truePositiveRate: number }[];
  auc: number;
  size?: number;
}) {
  const chartData = useMemo(
    () => points.map((p, i) => ({ ...p, index: i })),
    [points]
  );

  if (points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-[12px] text-muted-soft">
          Not enough labelled data to plot a curve.
        </p>
      </div>
    );
  }

  return (
    <figure className="m-0">
      <div style={{ width: '100%', height: size, maxWidth: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <CartesianGrid
              stroke="var(--color-hairline)"
              strokeDasharray="2 4"
            />
            <XAxis
              type="number"
              dataKey="falsePositiveRate"
              domain={[0, 1]}
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              axisLine={{ stroke: 'var(--color-hairline)' }}
              tickLine={false}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            />
            <YAxis
              type="number"
              dataKey="truePositiveRate"
              domain={[0, 1]}
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              axisLine={{ stroke: 'var(--color-hairline)' }}
              tickLine={false}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              width={36}
            />
            <Tooltip
              content={<RocTooltip />}
              cursor={{ stroke: 'var(--color-hairline-strong)', strokeWidth: 1 }}
            />
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: 1, y: 1 },
              ]}
              stroke="var(--color-hairline-strong)"
              strokeDasharray="3 3"
              ifOverflow="extendDomain"
            />
            <Line
              type="monotone"
              dataKey="truePositiveRate"
              stroke="var(--color-ink)"
              strokeWidth={1.75}
              dot={{ r: 2.5, fill: 'var(--color-ink)', stroke: 'var(--color-surface-card)', strokeWidth: 1 }}
              activeDot={{ r: 4.5, fill: 'var(--color-ink)', stroke: 'var(--color-surface-card)', strokeWidth: 2 }}
              animationDuration={600}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-[11.5px] text-muted">
        Dashed line is chance (AUC 0.500). Area under curve{' '}
        <Figure className="text-[11.5px]">{auc.toFixed(3)}</Figure>.
      </figcaption>
    </figure>
  );
}
