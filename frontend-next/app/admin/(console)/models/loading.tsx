import { ConsoleDashboardSkeleton } from '@/app/admin/(console)/ConsoleSkeletons';

/**
 * Three grouped aggregates over the whole `comment_analyses` table, none of
 * which is bounded by a date range — this page gets slower as the corpus grows,
 * so it gets a fallback now rather than when somebody notices.
 */
export default function Loading() {
  return <ConsoleDashboardSkeleton panels={3} />;
}
