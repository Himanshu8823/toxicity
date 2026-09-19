import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Filter controls for the console tables.
 *
 * All of them are plain GET forms and links. That is not a limitation: filter
 * state belongs in the URL so an operator can bookmark "failed scans, page 3"
 * and send it to somebody, and a GET form gives that for free while keeping
 * every page a Server Component.
 */

export function FilterBar({
  action,
  children,
  hidden,
}: {
  action: string;
  children: ReactNode;
  /** Params to carry through the submit that are not themselves controls. */
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form
      action={action}
      method="get"
      className="mb-4 flex flex-wrap items-end gap-2 rounded-[var(--radius-xs)] border border-hairline bg-surface-card px-3 py-2.5"
    >
      {hidden
        ? Object.entries(hidden)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)
        : null}
      {children}
    </form>
  );
}

export function FilterField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={htmlFor}
        className="caption-uppercase text-[9.5px] text-muted-soft"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const CONTROL =
  'h-8 rounded-[var(--radius-xs)] border border-hairline bg-canvas-soft px-2 text-[12.5px] text-ink ' +
  'focus:border-ink focus:outline-none';

export function TextFilter({
  id,
  name,
  defaultValue,
  placeholder,
  width = 'w-56',
}: {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  width?: string;
}) {
  return (
    <input
      id={id}
      name={name}
      type="search"
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={cn(CONTROL, width)}
    />
  );
}

export function SelectFilter({
  id,
  name,
  defaultValue,
  options,
  width = 'w-40',
}: {
  id: string;
  name: string;
  defaultValue?: string;
  options: readonly { value: string; label: string }[];
  width?: string;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue ?? ''}
      className={cn(CONTROL, width)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function DateFilter({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <input
      id={id}
      name={name}
      type="date"
      defaultValue={defaultValue}
      className={cn(CONTROL, 'w-[150px]')}
    />
  );
}

export function FilterSubmit({ label = 'Apply' }: { label?: string }) {
  return (
    <button
      type="submit"
      className="h-8 rounded-[var(--radius-xs)] bg-primary px-3 text-[12.5px] font-medium text-on-primary hover:bg-primary-active"
    >
      {label}
    </button>
  );
}

export function FilterReset({ href, label = 'Reset' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center rounded-[var(--radius-xs)] border border-hairline px-3 text-[12.5px] font-medium text-muted hover:border-hairline-strong hover:text-ink"
    >
      {label}
    </Link>
  );
}

/** A row of link-shaped filters, for small closed sets like a status. */
export function ChipFilters({
  options,
  activeValue,
  hrefFor,
  label,
}: {
  options: readonly { value: string; label: string; count?: number }[];
  activeValue: string;
  hrefFor: (value: string) => string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1">
      {options.map((o) => {
        const active = o.value === activeValue;
        return (
          <Link
            key={o.value}
            href={hrefFor(o.value)}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-xs)] border px-2.5 text-[12.5px] font-medium',
              active
                ? 'border-ink bg-primary text-on-primary'
                : 'border-hairline text-muted hover:border-hairline-strong hover:text-ink'
            )}
          >
            {o.label}
            {o.count !== undefined ? (
              <span
                className={cn(
                  'font-mono text-[10.5px] tabular-nums',
                  active ? 'text-on-dark-soft' : 'text-muted-soft'
                )}
              >
                {o.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Search-param helpers ────────────────────────────────────────────────────

/**
 * In Next 16 `searchParams` is a Promise and each value may be a string, an
 * array (repeated key) or undefined. These two collapse that to the single
 * string every page here actually wants, rather than every page re-deriving it.
 */
export type SearchParams = Record<string, string | string[] | undefined>;

export function param(
  params: SearchParams,
  key: string,
  fallback = ''
): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

/** A positive page number, clamped — `?page=-4` must not become a negative offset. */
export function pageParam(params: SearchParams, key = 'page'): number {
  const raw = Number.parseInt(param(params, key, '1'), 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

/** Builds a URL from the current params with some keys overridden or dropped. */
export function buildHref(
  basePath: string,
  params: SearchParams,
  overrides: Record<string, string | number | undefined>
): string {
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (key in overrides) continue;
    const single = Array.isArray(value) ? value[0] : value;
    if (single) next.set(key, single);
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === '') continue;
    next.set(key, String(value));
  }

  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}
