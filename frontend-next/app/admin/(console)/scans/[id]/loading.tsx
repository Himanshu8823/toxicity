import { ConsoleDashboardSkeleton } from '@/app/admin/(console)/ConsoleSkeletons';

/**
 * The detail read pulls up to 200 comments with their analyses in one join, so
 * a busy scan takes noticeably longer to arrive than the list it was opened
 * from. Without this the click appears to do nothing.
 */
export default function Loading() {
  return <ConsoleDashboardSkeleton panels={3} />;
}
