import type { Analysis } from '@/lib/types';

export interface KpiRowProps {
  analysis: Analysis;
}

interface Kpi {
  value: string;
  label: string;
}

/** Safe percentage formatter for values that are already 0–100 strings. */
function pct(raw: string): string {
  const n = Number(raw);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : '—';
}

/**
 * Five editorial stat tiles separated by hairlines rather than boxed cards —
 * numbers carry the weight, not chrome.
 */
export function KpiRow({ analysis }: KpiRowProps) {
  const total = analysis.totalAnalyzed;
  const harmfulShare = total > 0 ? ((analysis.toxicCount / total) * 100).toFixed(0) : '0';
  const cleanShare = total > 0 ? ((analysis.nonToxicCount / total) * 100).toFixed(0) : '0';

  const kpis: Kpi[] = [
    { value: pct(analysis.overallToxicityScore), label: 'Overall toxicity' },
    { value: total.toLocaleString(), label: 'Comments analysed' },
    { value: `${harmfulShare}%`, label: 'Harmful share' },
    { value: `${cleanShare}%`, label: 'Clean share' },
    { value: pct(analysis.avgConfidence), label: 'Avg. confidence' },
  ];

  return (
    <div className="editorial-container">
      <div className="hairline-card grid grid-cols-2 divide-y divide-hairline sm:grid-cols-5 sm:divide-y-0 sm:divide-x">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className={
              index === kpis.length - 1
                ? 'col-span-2 flex flex-col gap-2 px-5 py-6 text-center sm:col-span-1 sm:px-4'
                : 'flex flex-col gap-2 px-5 py-6 text-center sm:px-4'
            }
          >
            <span className="display-sm text-ink">{kpi.value}</span>
            <span className="caption-uppercase text-muted">{kpi.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default KpiRow;
