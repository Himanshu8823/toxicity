/**
 * Display formatting shared across the dashboard.
 *
 * Lives here rather than in `lib/utils.ts` because every one of these encodes
 * a presentation decision specific to this area — how a count reads on a stat
 * tile, how a YouTube count string is abbreviated — not a general utility.
 */

/** `1234` → `"1,234"`. Counts are always grouped; they are read, not parsed. */
export function formatCount(value: number): string {
  return value.toLocaleString('en-GB');
}

/** A 0–100 toxicity score as a percentage, e.g. `12.345` → `"12.3%"`. */
export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

/** A 0–1 model confidence as a percentage, e.g. `0.8214` → `"82%"`. */
export function formatConfidence(value: number | null, decimals = 0): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * YouTube returns view and comment counts as strings that overflow int4, so
 * they are abbreviated rather than grouped — "1.2M views" is the number
 * anybody actually wants from a header.
 */
export function formatBigCount(raw: string | null): string {
  if (!raw) return '—';
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;

  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Milliseconds as the coarsest unit that still reads precisely enough. */
export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;

  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/** Absolute date, short and unambiguous — "12 Mar 2026". */
export function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Date and time, for rows where "which of today's three scans" matters. */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';

  return `${formatDate(d)}, ${d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/** File size in the largest unit that keeps the number under four digits. */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Relative time for recency ("2 hours ago"), falling back to an absolute date
 * past a week — "37 days ago" is harder to place than the date itself.
 */
export function formatRelative(date: Date | string | null): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';

  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  if (days <= 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  return formatDate(d);
}

/** The circle in the user chip needs one character, and never an empty one. */
export function avatarInitial(name: string | null, email: string): string {
  const source = name?.trim() || email;
  return (source.at(0) ?? '?').toUpperCase();
}
