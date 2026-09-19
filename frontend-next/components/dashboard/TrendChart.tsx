'use client';

import { useId, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface TrendPoint {
  /** `YYYY-MM-DD`, as `getToxicityTrend` returns it. */
  day: string;
  scans: number;
  avgToxicity: number;
  comments: number;
}

export interface TrendChartProps {
  data: TrendPoint[];
  /** Window the data covers, used in the caption and the empty message. */
  days?: number;
}

const AXIS_COLOR = '#a8a29e';
/** Peach: warm enough to read as a signal, muted enough not to alarm. */
const AREA_INK = '#8a5a3c';
const AREA_PASTEL = '#f4c5a8';

interface TooltipPayloadItem {
  payload: TrendPoint;
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="hairline-card px-3 py-2 shadow-[var(--shadow-soft-drop)]">
      <p className="body-sm text-ink">
        {new Date(point.day).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        })}
      </p>
      <p className="caption text-muted tabular-nums">
        {point.avgToxicity.toFixed(1)}% toxic · {point.scans} scan
        {point.scans === 1 ? '' : 's'} · {point.comments.toLocaleString('en-GB')} comments
      </p>
    </div>
  );
}

/**
 * Average toxicity per day over the trailing window.
 *
 * An area rather than a line because the shape of the run matters more than
 * any one day: a single 80% scan is noise, a fortnight climbing is a finding.
 * The gradient fades to transparent so the chart stays atmosphere-weight
 * against the canvas rather than becoming a block of colour.
 *
 * Days with no scans are absent from the query result, not zero — plotting
 * them as zero would draw a clean day that never happened, so the series is
 * left sparse and the axis carries the dates.
 */
export function TrendChart({ data, days = 30 }: TrendChartProps) {
  const gradientId = useId();

  const rows = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        avgToxicity: Number.isFinite(point.avgToxicity) ? point.avgToxicity : 0,
      })),
    [data],
  );

  if (rows.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center">
        <p className="body-sm text-muted">
          No completed scans in the last {days} days yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={AREA_PASTEL} stopOpacity={0.85} />
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
              tick={{ fill: AXIS_COLOR, fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-hairline)' }}
              tickLine={false}
              minTickGap={24}
              tickFormatter={(value: string) =>
                new Date(value).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })
              }
            />
            <YAxis
              tick={{ fill: AXIS_COLOR, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              width={44}
              tickFormatter={(value: number) => `${value}%`}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'var(--color-hairline-strong)' }} />
            <Area
              type="monotone"
              dataKey="avgToxicity"
              stroke={AREA_INK}
              strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              dot={{ r: 2.5, fill: AREA_INK, stroke: 'var(--color-surface-card)', strokeWidth: 1 }}
              activeDot={{ r: 4, fill: AREA_INK }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* The chart's content, reachable without seeing it. */}
      <table className="sr-only">
        <caption>Average toxicity per day over the last {days} days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Average toxicity</th>
            <th scope="col">Scans</th>
            <th scope="col">Comments analysed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.day}>
              <td>{row.day}</td>
              <td>{row.avgToxicity.toFixed(1)}%</td>
              <td>{row.scans}</td>
              <td>{row.comments}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default TrendChart;
