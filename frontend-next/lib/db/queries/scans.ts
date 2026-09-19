import 'server-only';

import { and, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  commentAnalyses,
  comments,
  savedAnalyses,
  scans,
  usageEvents,
  type NewComment,
  type NewCommentAnalysis,
  type Scan,
} from '../schema';
import type { AnalysedResult, PipelineSummary } from '@/lib/analysis/pipeline';

/** Everything the app does with scans and their comments. */

// ─── Writes ──────────────────────────────────────────────────────────────────

export interface CreateScanInput {
  userId: string;
  videoId: string;
  videoTitle: string;
  channelName: string;
  thumbnailUrl: string;
  viewCount: string;
  commentCount: string;
  requestedComments: number;
}

/** Opens a scan in `running`, so a failure part-way is still visible. */
export async function createScan(input: CreateScanInput): Promise<Scan> {
  const [scan] = await db
    .insert(scans)
    .values({ ...input, status: 'running' })
    .returning();

  return scan;
}

export interface CompleteScanInput {
  scanId: string;
  userId: string;
  summary: PipelineSummary;
  /** Keyed by the `id` each result carries back from the pipeline. */
  commentsByResultId: Map<string, PersistableComment>;
}

export interface PersistableComment {
  youtubeCommentId: string;
  authorName: string;
  text: string;
  likeCount: number;
  publishedAt: Date | null;
  /** The YouTube id of the parent, resolved to our own uuid on insert. */
  parentYoutubeId: string | null;
}

/**
 * Persists a finished scan: its comments, their analyses, the rollup on the
 * scan row, and the usage event.
 *
 * One transaction — a half-written scan would show wrong totals on the
 * dashboard, which is worse than no scan at all.
 */
export async function completeScan({
  scanId,
  userId,
  summary,
  commentsByResultId,
}: CompleteScanInput): Promise<void> {
  await db.transaction(async (tx) => {
    // Parents must exist before replies can point at them, and the pipeline
    // returns them in order, so insert in two passes.
    const analysed = summary.results;

    const parentRows: NewComment[] = [];
    const replyResults: AnalysedResult[] = [];
    const parentResults: AnalysedResult[] = [];

    for (const result of analysed) {
      const source = commentsByResultId.get(result.id);
      if (!source) continue;

      if (source.parentYoutubeId) {
        replyResults.push(result);
      } else {
        parentResults.push(result);
        parentRows.push({
          scanId,
          youtubeCommentId: source.youtubeCommentId,
          authorName: source.authorName,
          text: source.text,
          textHash: result.textHash,
          language: result.language,
          likeCount: source.likeCount,
          publishedAt: source.publishedAt,
          parentId: null,
        });
      }
    }

    const insertedParents =
      parentRows.length > 0
        ? await tx.insert(comments).values(parentRows).returning({
            id: comments.id,
            youtubeCommentId: comments.youtubeCommentId,
          })
        : [];

    // YouTube id → our uuid, so replies can be linked.
    const idByYoutubeId = new Map<string, string>();
    for (const row of insertedParents) {
      if (row.youtubeCommentId) idByYoutubeId.set(row.youtubeCommentId, row.id);
    }

    const replyRows: NewComment[] = [];
    for (const result of replyResults) {
      const source = commentsByResultId.get(result.id)!;
      replyRows.push({
        scanId,
        youtubeCommentId: source.youtubeCommentId,
        authorName: source.authorName,
        text: source.text,
        textHash: result.textHash,
        language: result.language,
        likeCount: source.likeCount,
        publishedAt: source.publishedAt,
        parentId: source.parentYoutubeId
          ? (idByYoutubeId.get(source.parentYoutubeId) ?? null)
          : null,
      });
    }

    const insertedReplies =
      replyRows.length > 0
        ? await tx.insert(comments).values(replyRows).returning({
            id: comments.id,
            youtubeCommentId: comments.youtubeCommentId,
          })
        : [];

    for (const row of insertedReplies) {
      if (row.youtubeCommentId) idByYoutubeId.set(row.youtubeCommentId, row.id);
    }

    // ── Analyses ───────────────────────────────────────────────────────────
    const analysisRows: NewCommentAnalysis[] = [];

    for (const result of [...parentResults, ...replyResults]) {
      const source = commentsByResultId.get(result.id);
      if (!source || result.error) continue;

      const commentId = idByYoutubeId.get(source.youtubeCommentId);
      if (!commentId) continue;

      analysisRows.push({
        commentId,
        textHash: result.textHash,
        language: result.language,
        category: result.category,
        severity: result.severity,
        confidence: result.confidence,
        modelName: result.modelName,
        modelVersion: result.modelVersion,
        isSarcastic: result.isSarcastic,
        contextShifted: result.contextShifted,
        rationale: result.rationale,
        rawScores: result.rawScores,
        groqScores: result.groqScores,
        modelsDisagree: result.modelsDisagree,
      });
    }

    if (analysisRows.length > 0) {
      await tx.insert(commentAnalyses).values(analysisRows);
    }

    // ── Rollup ─────────────────────────────────────────────────────────────
    await tx
      .update(scans)
      .set({
        status: 'complete',
        analysedCount: summary.analysedCount,
        erroredCount: summary.erroredCount,
        overallToxicityScore: summary.overallToxicityScore,
        avgConfidence: summary.avgConfidence,
        dominantLanguage: summary.dominantLanguage,
        durationMs: summary.durationMs,
        completedAt: new Date(),
      })
      .where(eq(scans.id, scanId));

    await tx.insert(usageEvents).values({
      userId,
      kind: 'scan',
      scanId,
      units: summary.analysedCount,
    });
  });
}

export async function failScan(scanId: string, message: string): Promise<void> {
  await db
    .update(scans)
    .set({
      status: 'failed',
      errorMessage: message.slice(0, 500),
      completedAt: new Date(),
    })
    .where(eq(scans.id, scanId));
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export interface ScanListItem extends Scan {
  isSaved: boolean;
}

export async function listScansForUser(
  userId: string,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<ScanListItem[]> {
  const rows = await db
    .select({
      scan: scans,
      savedId: savedAnalyses.id,
    })
    .from(scans)
    .leftJoin(
      savedAnalyses,
      and(eq(savedAnalyses.scanId, scans.id), eq(savedAnalyses.userId, userId))
    )
    .where(eq(scans.userId, userId))
    .orderBy(desc(scans.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({ ...r.scan, isSaved: r.savedId !== null }));
}

export async function countScansForUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(scans)
    .where(eq(scans.userId, userId));

  return row?.value ?? 0;
}

/** A scan with every comment and analysis, for the detail page. */
export async function getScanDetail(scanId: string, userId?: string) {
  const [scan] = await db
    .select()
    .from(scans)
    .where(
      userId
        ? and(eq(scans.id, scanId), eq(scans.userId, userId))
        : eq(scans.id, scanId)
    )
    .limit(1);

  if (!scan) return null;

  const rows = await db
    .select({
      comment: comments,
      analysis: commentAnalyses,
    })
    .from(comments)
    .leftJoin(commentAnalyses, eq(commentAnalyses.commentId, comments.id))
    .where(eq(comments.scanId, scanId))
    .orderBy(desc(commentAnalyses.confidence));

  return { scan, comments: rows };
}

export async function deleteScan(scanId: string, userId: string): Promise<boolean> {
  const deleted = await db
    .delete(scans)
    .where(and(eq(scans.id, scanId), eq(scans.userId, userId)))
    .returning({ id: scans.id });

  return deleted.length > 0;
}

// ─── Dashboard aggregates ────────────────────────────────────────────────────

export interface UserStats {
  totalScans: number;
  totalComments: number;
  harmfulComments: number;
  avgToxicity: number;
  savedCount: number;
  scansThisWeek: number;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totals] = await db
    .select({
      totalScans: count(),
      totalComments: sql<number>`coalesce(sum(${scans.analysedCount}), 0)::int`,
      avgToxicity: sql<number>`coalesce(avg(${scans.overallToxicityScore}), 0)::float`,
    })
    .from(scans)
    .where(and(eq(scans.userId, userId), eq(scans.status, 'complete')));

  const [thisWeek] = await db
    .select({ value: count() })
    .from(scans)
    .where(and(eq(scans.userId, userId), gte(scans.createdAt, weekAgo)));

  const [saved] = await db
    .select({ value: count() })
    .from(savedAnalyses)
    .where(eq(savedAnalyses.userId, userId));

  const [harmful] = await db
    .select({ value: count() })
    .from(commentAnalyses)
    .innerJoin(comments, eq(comments.id, commentAnalyses.commentId))
    .innerJoin(scans, eq(scans.id, comments.scanId))
    .where(
      and(
        eq(scans.userId, userId),
        sql`${commentAnalyses.category} <> 'non_toxic'`
      )
    );

  return {
    totalScans: totals?.totalScans ?? 0,
    totalComments: totals?.totalComments ?? 0,
    harmfulComments: harmful?.value ?? 0,
    avgToxicity: totals?.avgToxicity ?? 0,
    savedCount: saved?.value ?? 0,
    scansThisWeek: thisWeek?.value ?? 0,
  };
}

/** Toxicity over time, for the dashboard trend chart. */
export async function getToxicityTrend(userId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return db
    .select({
      day: sql<string>`date_trunc('day', ${scans.createdAt})::date::text`,
      scans: count(),
      avgToxicity: sql<number>`coalesce(avg(${scans.overallToxicityScore}), 0)::float`,
      comments: sql<number>`coalesce(sum(${scans.analysedCount}), 0)::int`,
    })
    .from(scans)
    .where(
      and(
        eq(scans.userId, userId),
        eq(scans.status, 'complete'),
        gte(scans.createdAt, since)
      )
    )
    .groupBy(sql`date_trunc('day', ${scans.createdAt})`)
    .orderBy(sql`date_trunc('day', ${scans.createdAt})`);
}

/** Category split across everything this user has scanned. */
export async function getCategoryBreakdown(userId: string) {
  return db
    .select({
      category: commentAnalyses.category,
      value: count(),
    })
    .from(commentAnalyses)
    .innerJoin(comments, eq(comments.id, commentAnalyses.commentId))
    .innerJoin(scans, eq(scans.id, comments.scanId))
    .where(eq(scans.userId, userId))
    .groupBy(commentAnalyses.category)
    .orderBy(desc(count()));
}

/** Language split, which is what shows the multilingual support working. */
export async function getLanguageBreakdown(userId: string) {
  return db
    .select({
      language: commentAnalyses.language,
      value: count(),
    })
    .from(commentAnalyses)
    .innerJoin(comments, eq(comments.id, commentAnalyses.commentId))
    .innerJoin(scans, eq(scans.id, comments.scanId))
    .where(eq(scans.userId, userId))
    .groupBy(commentAnalyses.language)
    .orderBy(desc(count()));
}

/** Cached verdicts for text we have already scored, keyed by hash. */
export async function findCachedAnalyses(hashes: readonly string[]) {
  if (hashes.length === 0) return new Map<string, typeof commentAnalyses.$inferSelect>();

  const rows = await db
    .select()
    .from(commentAnalyses)
    .where(inArray(commentAnalyses.textHash, [...hashes]));

  const byHash = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    // Several scans may have scored the same text; any one will do.
    if (!byHash.has(row.textHash)) byHash.set(row.textHash, row);
  }

  return byHash;
}
