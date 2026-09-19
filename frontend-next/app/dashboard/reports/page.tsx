import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/guards';
import {
  countReportsForUser,
  listReportsForUser,
} from '@/lib/db/queries/reports';
import { ReportRow } from '@/components/dashboard/ReportRow';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Pagination } from '@/components/dashboard/Pagination';
import { formatCount } from '@/components/dashboard/format';

export const metadata: Metadata = {
  title: 'Reports — ToxiScan',
};

const PAGE_SIZE = 10;

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const rawPage = Number(readParam(params.page) ?? '1');
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  const [total, entries] = await Promise.all([
    countReportsForUser(user.id),
    listReportsForUser(user.id, {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const generating = entries.filter((e) => e.report.status === 'pending').length;

  return (
    <>
      <header className="mb-8">
        <p className="caption-uppercase text-muted">Reports</p>
        <h1 className="display-lg mt-2 text-ink">Exports of your scans</h1>
        <p className="body-md mt-3 max-w-[60ch] text-body">
          {total > 0
            ? `${formatCount(total)} report${total === 1 ? '' : 's'} generated. A report is a snapshot — it keeps the numbers as they were when you asked for it.`
            : 'Nothing generated yet.'}
        </p>
      </header>

      {generating > 0 && (
        <p
          aria-live="polite"
          className="caption mb-6 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-4 py-3 text-muted"
        >
          {generating} report{generating === 1 ? ' is' : 's are'} still
          generating. Reload this page to check again.
        </p>
      )}

      {total === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Open any completed scan and generate a report from it — as a PDF to read, a CSV to work with, or JSON to feed into something else. They all land here."
          action={{ href: '/dashboard/history', label: 'Pick a scan' }}
          secondaryAction={{ href: '/#analyse-form', label: 'Analyse a video' }}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <ReportRow key={entry.report.id} entry={entry} />
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/dashboard/reports"
            label="Report pages"
            className="mt-8"
          />
        </>
      )}
    </>
  );
}
