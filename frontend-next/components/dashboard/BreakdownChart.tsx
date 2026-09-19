'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface BreakdownDatum {
  /** Stable key — the category, severity or language code. */
  key: string;
  /** What the reader sees. */
  display: string;
  value: number;
  /** Fill, from `CATEGORY_META` / `SEVERITY_META`. Never a recharts default. */
  pastel: string;
  /** Stroke and label ink, from the same meta. */
  ink: string;
}

export interface BreakdownChartProps {
  data: BreakdownDatum[];
  /**
   * `donut` for a share-of-whole read, `bar` for comparing magnitudes.
   * Horizontal bars, because category names are long and would otherwise be
   * rotated into illegibility on a phone.
   */
  variant?: 'donut' | 'bar';
  /** Describes the chart for screen readers and the fallback table. */
  caption: string;
  /** Shown when every value is zero or the series is empty. */
  emptyMessage?: string;
  className?: string;
}

interface TooltipPayloadItem {
  payload: BreakdownDatum & { share: number };
}

function BreakdownTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;

  return (
    <div className="hairline-card px-3 py-2 shadow-[var(--shadow-soft-drop)]">
      <p className="body-sm" style={{ color: row.ink }}>
        {row.display}
      </p>
      <p className="caption text-muted tabular-nums">
        {row.value.toLocaleString('en-GB')} · {row.share.toFixed(1)}%
      </p>
    </div>
  );
}

const AXIS_COLOR = '#a8a29e';

/**
 * One categorical breakdown, as a donut or as horizontal bars.
 *
 * Every colour arrives on the datum from the taxonomy, so this component never
 * decides what a category looks like — that decision lives in
 * `lib/analysis/taxonomy.ts` and stays consistent across every surface.
 *
 * Both variants ship a visually-hidden table with the same numbers, since a
 * chart is the one component where the information is genuinely unavailable to
 * a screen reader otherwise.
 */
export function BreakdownChart({
  data,
  variant = 'bar',
  caption,
  emptyMessage = 'Nothing to chart yet.',
  className,
}: BreakdownChartProps) {
  const rows = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    return data.map((d) => ({
      ...d,
      share: total > 0 ? (d.value / total) * 100 : 0,
    }));
  }, [data]);

  const total = rows.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className={cn('flex h-56 items-center justify-center', className)}>
        <p className="body-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  // Bars need vertical room per row; the donut is a fixed square.
  const height = variant === 'donut' ? 256 : Math.max(180, rows.length * 34 + 24);

  return (
    <div className={className}>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          {variant === 'donut' ? (
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="display"
                innerRadius="58%"
                outerRadius="86%"
                paddingAngle={2}
                stroke="var(--color-surface-card)"
                strokeWidth={2}
              >
                {rows.map((row) => (
                  <Cell key={row.key} fill={row.pastel} stroke={row.ink} strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip content={<BreakdownTooltip />} />
            </PieChart>
          ) : (
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              barCategoryGap={8}
            >
              <XAxis
                type="number"
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="display"
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={112}
              />
              <Tooltip
                content={<BreakdownTooltip />}
                cursor={{ fill: 'var(--color-surface-strong)' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {rows.map((row) => (
                  <Cell key={row.key} fill={row.pastel} stroke={row.ink} strokeWidth={1} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Donuts carry no axis labels, so the legend is the only visible key. */}
      {variant === 'donut' && (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {rows.map((row) => (
            <li key={row.key} className="caption flex items-center gap-2 text-muted">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border"
                style={{ background: row.pastel, borderColor: row.ink }}
                aria-hidden="true"
              />
              <span style={{ color: row.ink }}>{row.display}</span>
              <span className="tabular-nums">{row.share.toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      )}

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Count</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.display}</td>
              <td>{row.value}</td>
              <td>{row.share.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BreakdownChart;
