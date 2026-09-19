import { ConsoleTableSkeleton } from '@/app/admin/(console)/ConsoleSkeletons';

/**
 * `listScanOwners` scans every profile with a scan before the table can even be
 * filtered, so this route is reliably the slowest of the plain tables.
 */
export default function Loading() {
  return <ConsoleTableSkeleton rows={10} columns={8} filters={3} />;
}
