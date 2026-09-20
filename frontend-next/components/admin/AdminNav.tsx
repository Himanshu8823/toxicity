'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * The console's primary navigation.
 *
 * A Client Component solely because the active item depends on the pathname.
 * Everything it renders is passed down from the server layout — no data, no
 * session, nothing that would be worth shipping to the browser on its own.
 */

export interface AdminNavItem {
  href: string;
  label: string;
  /** Shown as a superscript figure — the queue depth for Feedback. */
  badge?: number;
}

export function AdminNav({ items }: { items: readonly AdminNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-0.5">
      {items.map((item) => {
        // `/admin` must match only itself; every deeper section matches its subtree.
        const active =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-8 items-center gap-1.5 rounded-[var(--radius-xs)] px-2.5 text-[13px] font-medium transition-colors',
              active
                ? 'bg-surface-strong text-ink'
                : 'text-muted hover:bg-surface-strong hover:text-ink'
            )}
          >
            {item.label}
            {item.badge !== undefined && item.badge > 0 ? (
              <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-soft">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
