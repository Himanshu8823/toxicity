import { ConsoleDashboardSkeleton } from '@/app/admin/(console)/ConsoleSkeletons';

/**
 * The slowest route in the console by a wide margin: `getEvaluationReport`
 * pulls the whole labelled sample and rebuilds every confusion matrix in
 * memory, alongside four other queries. Without a fallback the nav appears to
 * hang on the click.
 */
export default function Loading() {
  return <ConsoleDashboardSkeleton panels={4} filters={2} />;
}
