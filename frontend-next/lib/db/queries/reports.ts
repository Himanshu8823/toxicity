import 'server-only';

import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../client';
import { reports, scans, type Report, type Scan } from '../schema';

/**
 * Generated reports — exports of a scan as PDF, CSV or JSON.
 *
 * Reads only. Report *creation* belongs to `POST /api/reports`, which owns the
 * storage upload and the `pending → ready` transition; splitting that here
 * would put half of one operation in two places.
 */

/**
 * A report is meaningless without the scan it describes: the list shows the
 * video title, not the report's uuid. Joined here so the page renders from one
 * query.
 */
export interface ReportWithScan {
  report: Report;
  scan: Scan;
}

export async function listReportsForUser(
  userId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<ReportWithScan[]> {
  return db
    .select({ report: reports, scan: scans })
    .from(reports)
    .innerJoin(scans, eq(scans.id, reports.scanId))
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countReportsForUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(reports)
    .where(eq(reports.userId, userId));

  return row?.value ?? 0;
}

/** Reports generated from one scan, for the scan detail page. */
export async function listReportsForScan(
  userId: string,
  scanId: string
): Promise<Report[]> {
  return db
    .select()
    .from(reports)
    .where(and(eq(reports.userId, userId), eq(reports.scanId, scanId)))
    .orderBy(desc(reports.createdAt));
}

/** One report, scoped to its owner so a guessed uuid reveals nothing. */
export async function getReportForUser(
  reportId: string,
  userId: string
): Promise<Report | null> {
  const [row] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.userId, userId)))
    .limit(1);

  return row ?? null;
}

export async function deleteReport(
  reportId: string,
  userId: string
): Promise<boolean> {
  const deleted = await db
    .delete(reports)
    .where(and(eq(reports.id, reportId), eq(reports.userId, userId)))
    .returning({ id: reports.id });

  return deleted.length > 0;
}
