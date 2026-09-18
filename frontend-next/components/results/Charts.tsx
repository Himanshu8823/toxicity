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
import type { LabelStat, ToxicityLabel } from '@/lib/types';
import { LABEL_META, LABEL_ORDER } from '@/lib/labels';

export interface ChartsProps {
  labelStats: LabelStat[];
}

interface ChartRow {
  label: ToxicityLabel;
  display: string;
  count: number;
  percentage: number;
  avgConfidence: number;
  pastel: string;
  ink: string;
}

function toChartRows(labelStats: LabelStat[]): ChartRow[] {
  const byLabel = new Map(labelStats.map((stat) => [stat.label, stat]));
  return LABEL_ORDER.map((label) => {
    const stat = byLabel.get(label);
    const meta = LABEL_META[label];
    const percentage = stat ? Number(stat.percentage) : 0;
    const avgConfidence = stat ? Number(stat.avgConfidence) : 0;
    return {
      label,
      display: meta.display,
      count: stat?.count ?? 0,
      percentage: Number.isFinite(percentage) ? percentage : 0,
      avgConfidence: Number.isFinite(avgConfidence) ? avgConfidence : 0,
      pastel: meta.pastel,
      ink: meta.ink,
    };
  });
}

const AXIS_COLOR = '#a8a29e';

interface TooltipEntry {
  payload: ChartRow;
}

/** Hairline-card tooltip — no default Recharts chrome, no drop shadow. */
function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="hairline-card px-3 py-2 shadow-[var(--shadow-soft-drop)]">
      <p className="body-sm text-ink">{row.display}</p>
      <p className="caption text-muted">
        {row.count.toLocaleString()} comments · {row.percentage.toFixed(1)}% · {row.avgConfidence.toFixed(1)}% conf.
      </p>
    </div>
  );
}

/** Visually-hidden accessible summary for screen readers / non-visual agents. */
function ChartSummary({ rows, caption }: { rows: ChartRow[]; caption: string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Category</th>
          <th scope="col">Count</th>
          <th scope="col">Percentage</th>
          <th scope="col">Avg. confidence</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td>{row.display}</td>
            <td>{row.count}</td>
            <td>{row.percentage.toFixed(1)}%</td>
            <td>{row.avgConfidence.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChartCard({
  title,
  description,
  children,
  summary,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  summary: React.ReactNode;
}) {
  return (
    <div className="hairline-card flex flex-col gap-4 p-5 sm:p-6">
      <div>
        <h4 className="title-md text-ink">{title}</h4>
        <p className="caption text-muted">{description}</p>
      </div>
      <div className="h-64 w-full sm:h-72">{children}</div>
      {summary}
    </div>
  );
}

/**
 * Three chart views over the same category data: distribution donut, count
 * bars, confidence bars. All colour comes from LABEL_META — pastel fills,
 * ink strokes — nothing alarmist. Custom tooltip replaces Recharts' default
 * chrome; axes and grid lines stay muted per DESIGN.md.
 */
export function Charts({ labelStats }: ChartsProps) {
  const rows = useMemo(() => toChartRows(labelStats), [labelStats]);
  const totalCount = rows.reduce((sum, row) => sum + row.count, 0);
  const hasData = totalCount > 0;

  return (
    <div className="editorial-container flex flex-col gap-6">
      <ChartCard
        title="Category distribution"
        description="Share of analysed comments per category."
        summary={<ChartSummary rows={rows} caption="Category distribution by share of comments" />}
      >
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <title>Category distribution donut chart</title>
              <Pie
                data={rows}
                dataKey="count"
                nameKey="display"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                stroke="var(--color-canvas)"
                strokeWidth={2}
              >
                {rows.map((row) => (
                  <Cell key={row.label} fill={row.pastel} stroke={row.ink} strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartState />
        )}
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Comment count by category"
          description="Raw number of comments assigned to each label."
          summary={<ChartSummary rows={rows} caption="Comment count by category" />}
        >
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <title>Comment count bar chart</title>
                <XAxis
                  dataKey="display"
                  tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-hairline)' }}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={44}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-strong)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {rows.map((row) => (
                    <Cell key={row.label} fill={row.pastel} stroke={row.ink} strokeWidth={1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState />
          )}
        </ChartCard>

        <ChartCard
          title="Average confidence by category"
          description="Model's mean confidence when it assigned this label."
          summary={<ChartSummary rows={rows} caption="Average model confidence by category" />}
        >
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <title>Average confidence bar chart</title>
                <XAxis
                  dataKey="display"
                  tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-hairline)' }}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  width={44}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-strong)' }} />
                <Bar dataKey="avgConfidence" radius={[4, 4, 0, 0]}>
                  {rows.map((row) => (
                    <Cell key={row.label} fill={row.pastel} stroke={row.ink} strokeWidth={1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p className="body-sm text-muted">No category data to chart yet.</p>
    </div>
  );
}

export default Charts;
