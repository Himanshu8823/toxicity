import 'server-only';

import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../client';
import {
  savedAnalyses,
  scans,
  type SavedAnalysis,
  type Scan,
} from '../schema';

/**
 * Saved analyses — the user's own bookmarks over their scans.
 *
 * Kept out of `scans.ts` because saving is a separate concern from scanning:
 * a scan exists whether or not anyone bookmarked it, and the two tables are
 * written by different parts of the app.
 */

/**
 * A saved row always travels with its scan. Every surface that lists saved
 * analyses needs the video title and thumbnail too, so joining here saves the
 * caller an N+1 it would otherwise write itself.
 */
export interface SavedAnalysisWithScan {
  saved: SavedAnalysis;
  scan: Scan;
}

export async function listSavedForUser(
  userId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<SavedAnalysisWithScan[]> {
  const rows = await db
    .select({ saved: savedAnalyses, scan: scans })
    .from(savedAnalyses)
    .innerJoin(scans, eq(scans.id, savedAnalyses.scanId))
    .where(eq(savedAnalyses.userId, userId))
    .orderBy(desc(savedAnalyses.createdAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function countSavedForUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(savedAnalyses)
    .where(eq(savedAnalyses.userId, userId));

  return row?.value ?? 0;
}

/** Whether this user has already bookmarked this scan. */
export async function isScanSaved(
  userId: string,
  scanId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: savedAnalyses.id })
    .from(savedAnalyses)
    .where(
      and(eq(savedAnalyses.userId, userId), eq(savedAnalyses.scanId, scanId))
    )
    .limit(1);

  return Boolean(row);
}

export interface SaveScanInput {
  userId: string;
  scanId: string;
  title?: string | null;
  note?: string | null;
  tags?: string[];
}

/**
 * Bookmarks a scan, or updates the note and tags if it is already bookmarked.
 *
 * Upsert rather than insert because `saved_user_scan_idx` makes a second save
 * a constraint violation, and a user clicking "save" twice should not see an
 * error — the second click is simply a no-op with fresher notes.
 *
 * Ownership is enforced by the inner select: a scan belonging to someone else
 * matches nothing, so nothing is written and the caller gets `null`.
 */
export async function saveScan(
  input: SaveScanInput
): Promise<SavedAnalysis | null> {
  const [owned] = await db
    .select({ id: scans.id })
    .from(scans)
    .where(and(eq(scans.id, input.scanId), eq(scans.userId, input.userId)))
    .limit(1);

  if (!owned) return null;

  const [row] = await db
    .insert(savedAnalyses)
    .values({
      userId: input.userId,
      scanId: input.scanId,
      title: input.title ?? null,
      note: input.note ?? null,
      tags: input.tags ?? [],
    })
    .onConflictDoUpdate({
      target: [savedAnalyses.userId, savedAnalyses.scanId],
      set: {
        title: input.title ?? null,
        note: input.note ?? null,
        tags: input.tags ?? [],
      },
    })
    .returning();

  return row ?? null;
}

export interface UpdateSavedInput {
  savedId: string;
  userId: string;
  note?: string | null;
  tags?: string[];
  title?: string | null;
}

/**
 * Edits the user's own annotations on a bookmark.
 *
 * Only the keys actually supplied are written — passing `undefined` for `note`
 * must leave the existing note alone rather than blanking it, which is the
 * difference between "I did not edit this" and "I cleared this".
 */
export async function updateSavedAnalysis({
  savedId,
  userId,
  note,
  tags,
  title,
}: UpdateSavedInput): Promise<SavedAnalysis | null> {
  const patch: Partial<Pick<SavedAnalysis, 'note' | 'tags' | 'title'>> = {};
  if (note !== undefined) patch.note = note;
  if (tags !== undefined) patch.tags = tags;
  if (title !== undefined) patch.title = title;

  if (Object.keys(patch).length === 0) return null;

  const [row] = await db
    .update(savedAnalyses)
    .set(patch)
    .where(and(eq(savedAnalyses.id, savedId), eq(savedAnalyses.userId, userId)))
    .returning();

  return row ?? null;
}

/** Removes a bookmark by its own id. Returns false when it was not theirs. */
export async function deleteSavedAnalysis(
  savedId: string,
  userId: string
): Promise<boolean> {
  const deleted = await db
    .delete(savedAnalyses)
    .where(and(eq(savedAnalyses.id, savedId), eq(savedAnalyses.userId, userId)))
    .returning({ id: savedAnalyses.id });

  return deleted.length > 0;
}

/**
 * Removes a bookmark by the scan it points at.
 *
 * The scan detail page knows the scan id but not the saved-row id, so it
 * needs this shape rather than `deleteSavedAnalysis`.
 */
export async function unsaveScan(
  userId: string,
  scanId: string
): Promise<boolean> {
  const deleted = await db
    .delete(savedAnalyses)
    .where(
      and(eq(savedAnalyses.userId, userId), eq(savedAnalyses.scanId, scanId))
    )
    .returning({ id: savedAnalyses.id });

  return deleted.length > 0;
}

/** Every distinct tag this user has used, for filter chips and autocomplete. */
export async function listTagsForUser(userId: string): Promise<string[]> {
  const rows = await db
    .select({ tags: savedAnalyses.tags })
    .from(savedAnalyses)
    .where(eq(savedAnalyses.userId, userId));

  const seen = new Set<string>();
  for (const row of rows) {
    for (const tag of row.tags) seen.add(tag);
  }

  return [...seen].sort((a, b) => a.localeCompare(b));
}
