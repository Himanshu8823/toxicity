import { ConsoleDashboardSkeleton } from '@/app/admin/(console)/ConsoleSkeletons';

/**
 * The queue joins feedback through analyses and comments to scans, and twice
 * more onto profiles for the reporter and reviewer. It is the heaviest read in
 * the console after the metrics page.
 */
export default function Loading() {
  return <ConsoleDashboardSkeleton panels={2} />;
}
