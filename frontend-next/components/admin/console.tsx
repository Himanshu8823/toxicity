import type { ReactNode, ThHTMLAttributes } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * The console dialect.
 *
 * The admin area shares every token with the marketing site — same ink, same
 * hairlines, same off-white canvas, so it is visibly the same product — but
 * spends them differently. Where the public pages are generous and card-led,
 * these are dense and table-led: 12–13px type, tabular numerals, monospace for
 * anything an operator might need to copy, and a square 4px radius instead of
 * the editorial 16px.
 *
 * Nothing here introduces a colour. Status is carried by weight, by a hairline,
 * and by a 6px dot — never by a saturated fill, which would turn the page into
 * the bootstrap dashboard this deliberately is not.
 */

// ─── Structure ───────────────────────────────────────────────────────────────

export function ConsolePage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="pb-20">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-5">
        <div className="max-w-2xl">
          <h1 className="display-sm text-ink">{title}</h1>
          {description ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  footnote,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  footnote?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius-xs)] border border-hairline bg-surface-card',
        className
      )}
    >
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline-soft px-4 py-3">
          <div>
            <h2 className="caption-uppercase text-[11px] text-ink">{title}</h2>
            {description ? (
              <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn('px-4 py-4', bodyClassName)}>{children}</div>
      {footnote ? (
        <footer className="border-t border-hairline-soft px-4 py-2.5 text-[12px] text-muted-soft">
          {footnote}
        </footer>
      ) : null}
    </section>
  );
}

// ─── Figures ─────────────────────────────────────────────────────────────────

/**
 * A single number with its label.
 *
 * `font-variant-numeric: tabular-nums` is not a flourish — without it the
 * digits shift width as figures update and a column of numbers stops lining up,
 * which is the one thing a stat row exists to do.
 */
export function Stat({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="border-l border-hairline px-4 py-3 first:border-l-0 first:pl-0">
      <div className="caption-uppercase text-[10.5px] text-muted-soft">{label}</div>
      <div
        className={cn(
          'mt-1.5 font-mono tabular-nums leading-none text-ink',
          emphasis ? 'text-[26px]' : 'text-[22px]'
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-1.5 text-[12px] text-muted">{hint}</div>
      ) : null}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 rounded-[var(--radius-xs)] border border-hairline bg-surface-card px-4 py-1 sm:grid-cols-3 lg:grid-cols-6">
      {children}
    </div>
  );
}

/** Monospaced figure for use inside prose and table cells. */
export function Figure({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('font-mono tabular-nums text-ink', className)}>
      {children}
    </span>
  );
}

/** A uuid, truncated to its first block and kept selectable in full via title. */
export function Mono({ value, chars = 8 }: { value: string; chars?: number }) {
  return (
    <span
      title={value}
      className="font-mono text-[11.5px] tracking-tight text-muted"
    >
      {value.slice(0, chars)}
    </span>
  );
}

// ─── Status ──────────────────────────────────────────────────────────────────

export type DotTone = 'neutral' | 'positive' | 'warn' | 'critical' | 'idle';

const DOT_COLOR: Record<DotTone, string> = {
  // Muted rather than saturated: these sit in a dense table and a bright red
  // dot on every failed row would drown out everything else on the page.
  neutral: '#a8a29e',
  positive: '#3f6b5c',
  warn: '#8a5a3c',
  critical: '#8a3f52',
  idle: 'var(--color-hairline-strong)',
};

export function StatusDot({ tone, label }: { tone: DotTone; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden="true"
        className="inline-block h-[6px] w-[6px] rounded-full"
        style={{ backgroundColor: DOT_COLOR[tone] }}
      />
      <span className="text-[12.5px] text-body-strong">{label}</span>
    </span>
  );
}

/** A quiet pill for taxonomy labels — ink from the taxonomy, never a fill. */
export function Tag({
  children,
  ink,
  className,
}: {
  children: ReactNode;
  ink?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-xs)] border border-hairline bg-surface-strong px-1.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap',
        className
      )}
      style={ink ? { color: ink } : undefined}
    >
      {children}
    </span>
  );
}

// ─── Tables ──────────────────────────────────────────────────────────────────

export function Table({
  caption,
  children,
  className,
}: {
  /** Visually hidden, but it is what a screen reader announces for the table. */
  caption: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-left', className)}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  align = 'left',
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className={cn(
        'caption-uppercase border-b border-hairline px-3 py-2 text-[10.5px] font-semibold whitespace-nowrap text-muted',
        align === 'right' && 'text-right',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

/**
 * A column header that sorts.
 *
 * `aria-sort` is what makes the current sort audible; without it a screen
 * reader announces an ordinary link and the user has no idea the table is
 * ordered at all. Rendered as a link so sorting survives with JavaScript off
 * and so each sort state has its own shareable URL.
 */
export function SortableTh({
  children,
  href,
  active,
  direction,
  align = 'left',
}: {
  children: ReactNode;
  href: string;
  active: boolean;
  direction: 'asc' | 'desc';
  align?: 'left' | 'right';
}) {
  return (
    <th
      scope="col"
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(
        'border-b border-hairline px-3 py-2 whitespace-nowrap',
        align === 'right' && 'text-right'
      )}
    >
      <Link
        href={href}
        className={cn(
          'caption-uppercase inline-flex items-center gap-1 text-[10.5px] font-semibold hover:text-ink',
          active ? 'text-ink' : 'text-muted'
        )}
      >
        {children}
        <span aria-hidden="true" className="text-[9px] leading-none">
          {active ? (direction === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </Link>
    </th>
  );
}

export function Td({
  children,
  align = 'left',
  className,
}: {
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'border-b border-hairline-soft px-3 py-2.5 align-middle text-[13px] text-body',
        align === 'right' && 'text-right',
        className
      )}
    >
      {children}
    </td>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="title-sm text-ink">{title}</p>
      {description ? (
        <p className="max-w-sm text-[13px] leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

/**
 * Offset pagination, rendered as two links.
 *
 * Offsets rather than cursors: an admin genuinely wants "page 4 of 12" here,
 * the tables are moderate in size, and a cursor scheme would rule out the
 * sortable headers above.
 */
export function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
  unit = 'rows',
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
  unit?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-2.5"
    >
      <p className="text-[12px] text-muted" aria-live="polite">
        <Figure className="text-[12px]">{first}</Figure>–
        <Figure className="text-[12px]">{last}</Figure> of{' '}
        <Figure className="text-[12px]">{total.toLocaleString()}</Figure> {unit}
        <span className="mx-2 text-hairline-strong">|</span>
        page <Figure className="text-[12px]">{page}</Figure> of{' '}
        <Figure className="text-[12px]">{pages}</Figure>
      </p>
      <div className="flex items-center gap-2">
        <PageLink href={hrefFor(page - 1)} disabled={page <= 1}>
          Previous
        </PageLink>
        <PageLink href={hrefFor(page + 1)} disabled={page >= pages}>
          Next
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const className =
    'inline-flex h-7 items-center rounded-[var(--radius-xs)] border px-2.5 text-[12px] font-medium';

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(className, 'border-hairline-soft text-muted-soft')}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        className,
        'border-hairline-strong text-ink hover:border-ink hover:bg-surface-strong'
      )}
    >
      {children}
    </Link>
  );
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatDateTime(value: Date | string | null): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDate(value: Date | string | null): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Coarse relative time — precise enough for a feed, cheap enough for every row. */
export function relativeTime(value: Date | string | null): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export function formatCount(value: number): string {
  return value.toLocaleString('en-GB');
}
