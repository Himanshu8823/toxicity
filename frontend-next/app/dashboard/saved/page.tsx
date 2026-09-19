import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/guards';
import {
  countSavedForUser,
  listSavedForUser,
  listTagsForUser,
} from '@/lib/db/queries/saved';
import { SavedCard } from '@/components/dashboard/SavedCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Pagination } from '@/components/dashboard/Pagination';
import { formatCount } from '@/components/dashboard/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Saved analyses — ToxiScan',
};

const PAGE_SIZE = 10;

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const tag = readParam(params.tag)?.toLowerCase();
  const rawPage = Number(readParam(params.page) ?? '1');
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  const [total, allTags] = await Promise.all([
    countSavedForUser(user.id),
    listTagsForUser(user.id),
  ]);

  /**
   * Tags live in a Postgres array, and filtering on one means an array
   * containment predicate. A user's bookmark list is small by nature — these
   * are things they chose one at a time — so the tag filter is applied in
   * memory rather than pushing an `&&` operator through the query layer.
   */
  let entries;
  let filteredTotal: number;

  if (tag) {
    const all = await listSavedForUser(user.id, { limit: Math.max(total, 1) });
    const matching = all.filter((entry) => entry.saved.tags.includes(tag));
    filteredTotal = matching.length;
    entries = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  } else {
    filteredTotal = total;
    entries = await listSavedForUser(user.id, {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
  }

  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));

  return (
    <>
      <header className="mb-8">
        <p className="caption-uppercase text-muted">Saved</p>
        <h1 className="display-lg mt-2 text-ink">The ones you kept</h1>
        <p className="body-md mt-3 max-w-[60ch] text-body">
          {total > 0
            ? `${formatCount(total)} saved analys${total === 1 ? 'is' : 'es'}, with whatever you wrote about them.`
            : 'Nothing saved yet.'}
        </p>
      </header>

      {allTags.length > 0 && (
        <nav aria-label="Filter by tag" className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/dashboard/saved"
            aria-current={tag === undefined ? 'true' : undefined}
            className={cn(
              'caption inline-flex h-8 items-center rounded-[var(--radius-pill)] border px-3.5 transition-colors duration-150',
              tag === undefined
                ? 'border-ink bg-primary text-on-primary'
                : 'border-hairline-strong text-muted hover:border-ink hover:text-ink',
            )}
          >
            All
          </Link>
          {allTags.map((t) => (
            <Link
              key={t}
              href={`/dashboard/saved?tag=${encodeURIComponent(t)}`}
              aria-current={tag === t ? 'true' : undefined}
              className={cn(
                'caption inline-flex h-8 items-center rounded-[var(--radius-pill)] border px-3.5 transition-colors duration-150',
                tag === t
                  ? 'border-ink bg-primary text-on-primary'
                  : 'border-hairline-strong text-muted hover:border-ink hover:text-ink',
              )}
            >
              #{t}
            </Link>
          ))}
        </nav>
      )}

      {total === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          description="Saving a scan keeps it here with room for a note and a few tags — so a comment section you want to come back to in a month is still findable in a month."
          action={{ href: '/dashboard/history', label: 'Browse your scans' }}
          secondaryAction={{ href: '/#analyse-form', label: 'Analyse a video' }}
        />
      ) : entries.length === 0 ? (
        <div className="hairline-card px-6 py-12 text-center">
          <h2 className="title-md text-ink">Nothing tagged #{tag}</h2>
          <p className="body-sm mx-auto mt-2 max-w-[48ch] text-muted">
            That tag has no saved analyses on this page.
          </p>
          <Link
            href="/dashboard/saved"
            className="btn-type mt-6 inline-flex h-10 items-center justify-center rounded-[var(--radius-pill)] border border-hairline-strong px-5 text-ink transition-colors hover:border-ink"
          >
            Show everything saved
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <SavedCard key={entry.saved.id} entry={entry} />
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/dashboard/saved"
            params={{ tag }}
            label="Saved analyses pages"
            className="mt-8"
          />
        </>
      )}
    </>
  );
}
