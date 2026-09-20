import 'server-only';

import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '../client';
import {
  auditLog,
  commentAnalyses,
  comments,
  feedback,
  profiles,
  reports,
  scans,
  type Severity,
  type ToxicityCategory,
  type UserRole,
  type ScanStatus,
} from '../schema';

/**
 * Cross-user reads for the admin console.
 *
 * Every function here spans accounts by design, which is precisely why nothing
 * in this file may be reached without `requireAdmin()` upstream. The Drizzle
 * client connects as the database owner and is not subject to row-level
 * security, so the guard is the only thing standing between these queries and
 * a signed-in user's curiosity.
 *
 * Kept separate from `queries/scans.ts` so the user-scoped and admin-scoped
 * surfaces never blur into one another.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns an ISO timestamp for `n` days ago at midnight UTC.
 *
 * Why ISO and not `Date`: drizzle's `postgres-js` driver rejects a JS `Date`
 * bound into a `sql\`...\`` template (it serialises the parameter as a JS
 * object the driver cannot encode). The Postgres server needs the value as
 * a string it can cast to `timestamptz`. Returning ISO from here means every
 * caller just passes the string and the cast in SQL handles the rest.
 */
export function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

// ─── Platform overview ───────────────────────────────────────────────────────

export interface PlatformStats {
  totalUsers: number;
  newUsersThisWeek: number;
  suspendedUsers: number;
  adminUsers: number;

  totalScans: number;
  scansThisWeek: number;
  failedScans: number;
  /** Failed as a share of all scans, 0–1. */
  failureRate: number;

  commentsAnalysed: number;
  harmfulComments: number;
  /** Harmful as a share of everything analysed, 0–1. */
  harmfulRate: number;

  reportsGenerated: number;
  openFeedback: number;
  disagreementCount: number;
}

/**
 * Every headline number on the overview, in one round trip.
 *
 * Written as a single `select` of scalar subqueries rather than eight awaited
 * queries: the overview is the first page an admin lands on, and eight
 * sequential round trips to Supabase is most of a second of nothing.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const weekAgo = daysAgo(7);

  const [row] = await db
    .select({
      totalUsers: sql<number>`(select count(*) from ${profiles})::int`,
      newUsersThisWeek: sql<number>`(select count(*) from ${profiles} where ${profiles.createdAt} >= ${weekAgo})::int`,
      suspendedUsers: sql<number>`(select count(*) from ${profiles} where ${profiles.isSuspended})::int`,
      adminUsers: sql<number>`(select count(*) from ${profiles} where ${profiles.role} = 'admin')::int`,

      totalScans: sql<number>`(select count(*) from ${scans})::int`,
      scansThisWeek: sql<number>`(select count(*) from ${scans} where ${scans.createdAt} >= ${weekAgo})::int`,
      failedScans: sql<number>`(select count(*) from ${scans} where ${scans.status} = 'failed')::int`,

      commentsAnalysed: sql<number>`(select count(*) from ${commentAnalyses})::int`,
      harmfulComments: sql<number>`(select count(*) from ${commentAnalyses} where ${commentAnalyses.category} <> 'non_toxic')::int`,
      disagreementCount: sql<number>`(select count(*) from ${commentAnalyses} where ${commentAnalyses.modelsDisagree})::int`,

      reportsGenerated: sql<number>`(select count(*) from ${reports})::int`,
      openFeedback: sql<number>`(select count(*) from ${feedback} where ${feedback.status} = 'open')::int`,
    })
    .from(sql`(select 1) as _`);

  const stats = row ?? {
    totalUsers: 0,
    newUsersThisWeek: 0,
    suspendedUsers: 0,
    adminUsers: 0,
    totalScans: 0,
    scansThisWeek: 0,
    failedScans: 0,
    commentsAnalysed: 0,
    harmfulComments: 0,
    disagreementCount: 0,
    reportsGenerated: 0,
    openFeedback: 0,
  };

  return {
    ...stats,
    failureRate: stats.totalScans === 0 ? 0 : stats.failedScans / stats.totalScans,
    harmfulRate:
      stats.commentsAnalysed === 0
        ? 0
        : stats.harmfulComments / stats.commentsAnalysed,
  };
}

export interface DailyCount {
  day: string;
  value: number;
}

/**
 * Scans per day, gap-filled.
 *
 * `generate_series` supplies the missing days as zeroes: a line chart that
 * simply skips quiet days compresses time and makes activity look steadier
 * than it was.
 */
export async function getScansOverTime(days = 30): Promise<DailyCount[]> {
  const since = daysAgo(days);

  const rows = await db.execute<{ day: string; value: number }>(sql`
    select
      d::date::text as day,
      coalesce(s.n, 0)::int as value
    from generate_series(${since}::timestamptz, now(), interval '1 day') as d
    left join (
      select date_trunc('day', created_at) as day, count(*) as n
      from ${scans}
      where created_at >= ${since}
      group by 1
    ) s on s.day = date_trunc('day', d)
    order by d
  `);

  return [...rows];
}

/** Signups per day, gap-filled the same way and for the same reason. */
export async function getSignupsOverTime(days = 30): Promise<DailyCount[]> {
  const since = daysAgo(days);

  const rows = await db.execute<{ day: string; value: number }>(sql`
    select
      d::date::text as day,
      coalesce(p.n, 0)::int as value
    from generate_series(${since}::timestamptz, now(), interval '1 day') as d
    left join (
      select date_trunc('day', created_at) as day, count(*) as n
      from ${profiles}
      where created_at >= ${since}
      group by 1
    ) p on p.day = date_trunc('day', d)
    order by d
  `);

  return [...rows];
}

export interface CategorySlice {
  category: ToxicityCategory;
  value: number;
}

/** Category split across every account. */
export async function getPlatformCategoryBreakdown(): Promise<CategorySlice[]> {
  return db
    .select({ category: commentAnalyses.category, value: count() })
    .from(commentAnalyses)
    .groupBy(commentAnalyses.category)
    .orderBy(desc(count()));
}

export interface LanguageSlice {
  language: string | null;
  value: number;
  harmful: number;
}

/**
 * Language split platform-wide, with the harmful count per language.
 *
 * The harmful column is the interesting one: an uneven harmful rate across
 * languages is either a real difference in the corpora or a model that is
 * worse in one language, and both are worth knowing.
 */
export async function getPlatformLanguageBreakdown(): Promise<LanguageSlice[]> {
  return db
    .select({
      language: commentAnalyses.language,
      value: count(),
      harmful: sql<number>`count(*) filter (where ${commentAnalyses.category} <> 'non_toxic')::int`,
    })
    .from(commentAnalyses)
    .groupBy(commentAnalyses.language)
    .orderBy(desc(count()));
}

export interface ActivityEntry {
  id: string;
  kind: 'audit' | 'scan';
  action: string;
  detail: string | null;
  actor: string | null;
  createdAt: Date;
}

/**
 * The recent-activity feed: audit entries and scans interleaved.
 *
 * Merged in application code rather than with a SQL `union`, because the two
 * sources have nothing in common but a timestamp and forcing them into one
 * shape in SQL would cost more in casts than the sort saves.
 */
export async function getRecentActivity(limit = 12): Promise<ActivityEntry[]> {
  const [auditRows, scanRows] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        createdAt: auditLog.createdAt,
        actorEmail: profiles.email,
      })
      .from(auditLog)
      .leftJoin(profiles, eq(profiles.id, auditLog.actorId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit),
    db
      .select({
        id: scans.id,
        videoTitle: scans.videoTitle,
        videoId: scans.videoId,
        status: scans.status,
        createdAt: scans.createdAt,
        ownerEmail: profiles.email,
      })
      .from(scans)
      .leftJoin(profiles, eq(profiles.id, scans.userId))
      .orderBy(desc(scans.createdAt))
      .limit(limit),
  ]);

  const merged: ActivityEntry[] = [
    ...auditRows.map((r) => ({
      id: `audit:${r.id}`,
      kind: 'audit' as const,
      action: r.action,
      detail: r.entityId ? `${r.entity} ${r.entityId.slice(0, 8)}` : r.entity,
      actor: r.actorEmail,
      createdAt: r.createdAt,
    })),
    ...scanRows.map((r) => ({
      id: `scan:${r.id}`,
      kind: 'scan' as const,
      action: `scan.${r.status}`,
      detail: r.videoTitle ?? r.videoId,
      actor: r.ownerEmail,
      createdAt: r.createdAt,
    })),
  ];

  return merged
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  isSuspended: boolean;
  createdAt: Date;
  lastSeenAt: Date | null;
  scanCount: number;
  commentsAnalysed: number;
}

export type UserSortKey = 'email' | 'createdAt' | 'lastSeenAt' | 'scanCount';

export interface ListUsersOptions {
  search?: string;
  role?: UserRole;
  suspended?: boolean;
  sort?: UserSortKey;
  direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

function userFilters(options: ListUsersOptions): SQL | undefined {
  const clauses: SQL[] = [];

  if (options.search) {
    // Escape the LIKE wildcards so a search for `100%` is not a match-all.
    const term = `%${options.search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const match = or(ilike(profiles.email, term), ilike(profiles.fullName, term));
    if (match) clauses.push(match);
  }
  if (options.role) clauses.push(eq(profiles.role, options.role));
  if (options.suspended !== undefined) {
    clauses.push(eq(profiles.isSuspended, options.suspended));
  }

  return clauses.length === 0 ? undefined : and(...clauses);
}

/**
 * One page of users with their activity counts.
 *
 * The two counts come from correlated subqueries rather than joins: joining
 * `scans` and then `comments` would multiply rows together and need a
 * `count(distinct)` over the product, which is both slower and easy to get
 * subtly wrong.
 */
export async function listUsers(
  options: ListUsersOptions = {}
): Promise<AdminUserRow[]> {
  const {
    sort = 'createdAt',
    direction = 'desc',
    limit = 25,
    offset = 0,
  } = options;

  // Fully-qualified subqueries with explicit aliases. Drizzle does not always
  // qualify column references inside a nested `sql\`...\`` template, and an
  // unqualified `id` in a three-table join is ambiguous to Postgres — it
  // fails with "column reference 'id' is ambiguous". Casting to a literal
  // SQL fragment with table aliases sidesteps that entirely.
  const scanCount = sql<number>`(
    select count(*)::int
    from "scans" "s"
    where "s"."user_id" = "profiles"."id"
  )`;

  const commentsAnalysed = sql<number>`(
    select count(*)::int
    from "comment_analyses" "ca"
    join "comments" "c" on "c"."id" = "ca"."comment_id"
    join "scans" "s" on "s"."id" = "c"."scan_id"
    where "s"."user_id" = "profiles"."id"
  )`;

  const sortColumn =
    sort === 'email'
      ? profiles.email
      : sort === 'lastSeenAt'
        ? profiles.lastSeenAt
        : sort === 'scanCount'
          ? scanCount
          : profiles.createdAt;

  return db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      role: profiles.role,
      isSuspended: profiles.isSuspended,
      createdAt: profiles.createdAt,
      lastSeenAt: profiles.lastSeenAt,
      scanCount,
      commentsAnalysed,
    })
    .from(profiles)
    .where(userFilters(options))
    .orderBy(direction === 'asc' ? asc(sortColumn) : desc(sortColumn))
    .limit(limit)
    .offset(offset);
}

export async function countUsers(options: ListUsersOptions = {}): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(profiles)
    .where(userFilters(options));

  return row?.value ?? 0;
}

export async function getUserById(id: string) {
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);

  return row ?? null;
}

/**
 * How many admins remain besides this one.
 *
 * Guards the last-admin case: demoting or suspending the only administrator
 * locks everybody out of the console with no way back in through the UI.
 */
export async function countOtherAdmins(excludingId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(profiles)
    .where(
      and(
        eq(profiles.role, 'admin'),
        eq(profiles.isSuspended, false),
        ne(profiles.id, excludingId)
      )
    );

  return row?.value ?? 0;
}

// ─── Scans ───────────────────────────────────────────────────────────────────

export interface AdminScanRow {
  id: string;
  videoId: string;
  videoTitle: string | null;
  channelName: string | null;
  status: ScanStatus;
  analysedCount: number;
  erroredCount: number;
  overallToxicityScore: number | null;
  dominantLanguage: string | null;
  durationMs: number | null;
  createdAt: Date;
  ownerId: string;
  ownerEmail: string | null;
}

export interface ListScansOptions {
  status?: ScanStatus;
  userId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

function scanFilters(options: ListScansOptions): SQL | undefined {
  const clauses: SQL[] = [];

  if (options.status) clauses.push(eq(scans.status, options.status));
  if (options.userId) clauses.push(eq(scans.userId, options.userId));
  if (options.search) {
    const term = `%${options.search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const match = or(
      ilike(scans.videoTitle, term),
      ilike(scans.videoId, term),
      ilike(scans.channelName, term)
    );
    if (match) clauses.push(match);
  }

  return clauses.length === 0 ? undefined : and(...clauses);
}

export async function listAllScans(
  options: ListScansOptions = {}
): Promise<AdminScanRow[]> {
  const { limit = 25, offset = 0 } = options;

  return db
    .select({
      id: scans.id,
      videoId: scans.videoId,
      videoTitle: scans.videoTitle,
      channelName: scans.channelName,
      status: scans.status,
      analysedCount: scans.analysedCount,
      erroredCount: scans.erroredCount,
      overallToxicityScore: scans.overallToxicityScore,
      dominantLanguage: scans.dominantLanguage,
      durationMs: scans.durationMs,
      createdAt: scans.createdAt,
      ownerId: scans.userId,
      ownerEmail: profiles.email,
    })
    .from(scans)
    .leftJoin(profiles, eq(profiles.id, scans.userId))
    .where(scanFilters(options))
    .orderBy(desc(scans.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countAllScans(
  options: ListScansOptions = {}
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(scans)
    .where(scanFilters(options));

  return row?.value ?? 0;
}

/** Read-only scan detail for the admin view: the scan, its owner, its comments. */
export async function getScanForAdmin(scanId: string) {
  const [header] = await db
    .select({
      scan: scans,
      ownerEmail: profiles.email,
      ownerId: profiles.id,
    })
    .from(scans)
    .leftJoin(profiles, eq(profiles.id, scans.userId))
    .where(eq(scans.id, scanId))
    .limit(1);

  if (!header) return null;

  const rows = await db
    .select({
      id: comments.id,
      text: comments.text,
      authorName: comments.authorName,
      language: comments.language,
      likeCount: comments.likeCount,
      category: commentAnalyses.category,
      severity: commentAnalyses.severity,
      confidence: commentAnalyses.confidence,
      modelName: commentAnalyses.modelName,
      modelsDisagree: commentAnalyses.modelsDisagree,
      isSarcastic: commentAnalyses.isSarcastic,
      // Harmful only in the light of the comment it replies to. One of the
      // three signals the detail page flags, so it has to come back with them.
      contextShifted: commentAnalyses.contextShifted,
      rationale: commentAnalyses.rationale,
    })
    .from(comments)
    .leftJoin(commentAnalyses, eq(commentAnalyses.commentId, comments.id))
    .where(eq(comments.scanId, scanId))
    .orderBy(desc(commentAnalyses.confidence))
    .limit(200);

  return { ...header, comments: rows };
}

/** Distinct owners who have ever run a scan, for the scans-page filter. */
export async function listScanOwners(): Promise<
  { id: string; email: string; scanCount: number }[]
> {
  return db
    .select({
      id: profiles.id,
      email: profiles.email,
      scanCount: count(scans.id),
    })
    .from(profiles)
    .innerJoin(scans, eq(scans.userId, profiles.id))
    .groupBy(profiles.id, profiles.email)
    .orderBy(desc(count(scans.id)))
    .limit(200);
}

// ─── Feedback review queue ───────────────────────────────────────────────────

export interface FeedbackQueueItem {
  id: string;
  status: 'open' | 'accepted' | 'rejected';
  verdict: 'correct' | 'incorrect';
  note: string | null;
  correctedCategory: ToxicityCategory | null;
  correctedSeverity: Severity | null;
  createdAt: Date;
  reviewedAt: Date | null;

  reporterEmail: string | null;
  reviewerEmail: string | null;

  analysisId: string;
  commentText: string;
  commentAuthor: string | null;
  language: string | null;

  predictedCategory: ToxicityCategory;
  predictedSeverity: Severity;
  confidence: number;
  modelName: string;
  modelVersion: string | null;
  modelsDisagree: boolean;
  isSarcastic: boolean;
  rationale: string | null;

  scanId: string;
  videoTitle: string | null;
}

export interface ListFeedbackOptions {
  status?: 'open' | 'accepted' | 'rejected';
  limit?: number;
  offset?: number;
}

function feedbackFilters(options: ListFeedbackOptions): SQL | undefined {
  return options.status ? eq(feedback.status, options.status) : undefined;
}

/**
 * The review queue: a feedback row joined to everything a reviewer needs to
 * judge it without leaving the page.
 *
 * The reviewer alias is a second join onto `profiles` — Drizzle needs the
 * table aliased explicitly, otherwise the reporter and reviewer joins collide.
 */
export async function listFeedback(
  options: ListFeedbackOptions = {}
): Promise<FeedbackQueueItem[]> {
  const { limit = 20, offset = 0 } = options;
  const reporter = sql`reporter`;
  const reviewer = sql`reviewer`;

  const rows = await db.execute<{
    id: string;
    status: 'open' | 'accepted' | 'rejected';
    verdict: 'correct' | 'incorrect';
    note: string | null;
    corrected_category: ToxicityCategory | null;
    corrected_severity: Severity | null;
    created_at: string;
    reviewed_at: string | null;
    reporter_email: string | null;
    reviewer_email: string | null;
    analysis_id: string;
    comment_text: string;
    comment_author: string | null;
    language: string | null;
    predicted_category: ToxicityCategory;
    predicted_severity: Severity;
    confidence: number;
    model_name: string;
    model_version: string | null;
    models_disagree: boolean;
    is_sarcastic: boolean;
    rationale: string | null;
    scan_id: string;
    video_title: string | null;
  }>(sql`
    select
      f.id,
      f.status,
      f.verdict,
      f.note,
      f.corrected_category,
      f.corrected_severity,
      f.created_at,
      f.reviewed_at,
      ${reporter}.email as reporter_email,
      ${reviewer}.email as reviewer_email,
      ca.id as analysis_id,
      c.text as comment_text,
      c.author_name as comment_author,
      ca.language,
      ca.category as predicted_category,
      ca.severity as predicted_severity,
      ca.confidence,
      ca.model_name,
      ca.model_version,
      ca.models_disagree,
      ca.is_sarcastic,
      ca.rationale,
      s.id as scan_id,
      s.video_title
    from ${feedback} f
    join ${commentAnalyses} ca on ca.id = f.comment_analysis_id
    join ${comments} c on c.id = ca.comment_id
    join ${scans} s on s.id = c.scan_id
    left join ${profiles} ${reporter} on ${reporter}.id = f.user_id
    left join ${profiles} ${reviewer} on ${reviewer}.id = f.reviewed_by
    ${options.status ? sql`where f.status = ${options.status}` : sql``}
    order by
      -- Open items first regardless of date: this is a work queue, not a log.
      case when f.status = 'open' then 0 else 1 end,
      f.created_at desc
    limit ${limit} offset ${offset}
  `);

  return [...rows].map((r) => ({
    id: r.id,
    status: r.status,
    verdict: r.verdict,
    note: r.note,
    correctedCategory: r.corrected_category,
    correctedSeverity: r.corrected_severity,
    createdAt: new Date(r.created_at),
    reviewedAt: r.reviewed_at ? new Date(r.reviewed_at) : null,
    reporterEmail: r.reporter_email,
    reviewerEmail: r.reviewer_email,
    analysisId: r.analysis_id,
    commentText: r.comment_text,
    commentAuthor: r.comment_author,
    language: r.language,
    predictedCategory: r.predicted_category,
    predictedSeverity: r.predicted_severity,
    confidence: Number(r.confidence),
    modelName: r.model_name,
    modelVersion: r.model_version,
    modelsDisagree: r.models_disagree,
    isSarcastic: r.is_sarcastic,
    rationale: r.rationale,
    scanId: r.scan_id,
    videoTitle: r.video_title,
  }));
}

export async function countFeedback(
  options: ListFeedbackOptions = {}
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(feedback)
    .where(feedbackFilters(options));

  return row?.value ?? 0;
}

/** Counts per status, so the filter chips can carry numbers. */
export async function feedbackStatusCounts(): Promise<
  Record<'open' | 'accepted' | 'rejected', number>
> {
  const rows = await db
    .select({ status: feedback.status, value: count() })
    .from(feedback)
    .groupBy(feedback.status);

  const result = { open: 0, accepted: 0, rejected: 0 };
  for (const row of rows) result[row.status] = row.value;
  return result;
}

export async function getFeedbackById(id: string) {
  const [row] = await db
    .select()
    .from(feedback)
    .where(eq(feedback.id, id))
    .limit(1);

  return row ?? null;
}

// ─── Model routing ───────────────────────────────────────────────────────────

export interface ModelUsageRow {
  modelName: string;
  modelVersion: string | null;
  volume: number;
  avgConfidence: number;
  disagreements: number;
  disagreementRate: number;
  harmful: number;
  harmfulRate: number;
  languages: number;
}

/**
 * Volume and quality per model.
 *
 * This is what makes the routing decision defensible: if MuRIL is handling the
 * Indic traffic and XLM-R the European traffic, it shows up here as two
 * populations with different language counts, not as an assertion in a report.
 */
export async function getModelUsage(
  from?: Date,
  to?: Date
): Promise<ModelUsageRow[]> {
  const range = dateRangeFilter(commentAnalyses.createdAt, from, to);

  const rows = await db
    .select({
      modelName: commentAnalyses.modelName,
      modelVersion: commentAnalyses.modelVersion,
      volume: count(),
      avgConfidence: sql<number>`coalesce(avg(${commentAnalyses.confidence}), 0)::float`,
      disagreements: sql<number>`count(*) filter (where ${commentAnalyses.modelsDisagree})::int`,
      harmful: sql<number>`count(*) filter (where ${commentAnalyses.category} <> 'non_toxic')::int`,
      languages: countDistinct(commentAnalyses.language),
    })
    .from(commentAnalyses)
    .where(range)
    .groupBy(commentAnalyses.modelName, commentAnalyses.modelVersion)
    .orderBy(desc(count()));

  return rows.map((r) => ({
    ...r,
    avgConfidence: Number(r.avgConfidence),
    disagreementRate: r.volume === 0 ? 0 : r.disagreements / r.volume,
    harmfulRate: r.volume === 0 ? 0 : r.harmful / r.volume,
  }));
}

export interface ModelLanguageRow {
  modelName: string;
  language: string | null;
  volume: number;
  avgConfidence: number;
  disagreements: number;
  disagreementRate: number;
}

/** The model × language grid — the routing table, observed rather than declared. */
export async function getModelLanguageMatrix(
  from?: Date,
  to?: Date
): Promise<ModelLanguageRow[]> {
  const range = dateRangeFilter(commentAnalyses.createdAt, from, to);

  const rows = await db
    .select({
      modelName: commentAnalyses.modelName,
      language: commentAnalyses.language,
      volume: count(),
      avgConfidence: sql<number>`coalesce(avg(${commentAnalyses.confidence}), 0)::float`,
      disagreements: sql<number>`count(*) filter (where ${commentAnalyses.modelsDisagree})::int`,
    })
    .from(commentAnalyses)
    .where(range)
    .groupBy(commentAnalyses.modelName, commentAnalyses.language)
    .orderBy(desc(count()));

  return rows.map((r) => ({
    ...r,
    avgConfidence: Number(r.avgConfidence),
    disagreementRate: r.volume === 0 ? 0 : r.disagreements / r.volume,
  }));
}

/**
 * Average scan latency per dominant language, as a stand-in for per-model
 * latency: the pipeline does not time each classifier call individually, but a
 * scan's dominant language determines which model did most of its work.
 */
export async function getLatencyByLanguage(
  from?: Date,
  to?: Date
): Promise<
  { language: string | null; avgMsPerComment: number; scans: number; errorRate: number }[]
> {
  const clauses: SQL[] = [isNotNull(scans.durationMs)];
  const range = dateRangeFilter(scans.createdAt, from, to);
  if (range) clauses.push(range);

  const rows = await db
    .select({
      language: scans.dominantLanguage,
      scans: count(),
      totalMs: sql<number>`coalesce(sum(${scans.durationMs}), 0)::float`,
      totalComments: sql<number>`coalesce(sum(${scans.analysedCount}), 0)::float`,
      totalErrored: sql<number>`coalesce(sum(${scans.erroredCount}), 0)::float`,
    })
    .from(scans)
    .where(and(...clauses))
    .groupBy(scans.dominantLanguage)
    .orderBy(desc(count()));

  return rows.map((r) => {
    const analysed = Number(r.totalComments);
    const errored = Number(r.totalErrored);
    return {
      language: r.language,
      scans: r.scans,
      avgMsPerComment: analysed === 0 ? 0 : Number(r.totalMs) / analysed,
      errorRate: analysed + errored === 0 ? 0 : errored / (analysed + errored),
    };
  });
}

// ─── Audit log ───────────────────────────────────────────────────────────────

export interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: Date;
  actorId: string | null;
  actorEmail: string | null;
}

export interface ListAuditOptions {
  actorId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

function auditFilters(options: ListAuditOptions): SQL | undefined {
  const clauses: SQL[] = [];
  if (options.actorId) clauses.push(eq(auditLog.actorId, options.actorId));
  if (options.action) clauses.push(eq(auditLog.action, options.action));
  return clauses.length === 0 ? undefined : and(...clauses);
}

export async function listAuditLog(
  options: ListAuditOptions = {}
): Promise<AuditRow[]> {
  const { limit = 50, offset = 0 } = options;

  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      metadata: auditLog.metadata,
      ip: auditLog.ip,
      createdAt: auditLog.createdAt,
      actorId: auditLog.actorId,
      actorEmail: profiles.email,
    })
    .from(auditLog)
    .leftJoin(profiles, eq(profiles.id, auditLog.actorId))
    .where(auditFilters(options))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countAuditLog(
  options: ListAuditOptions = {}
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(auditLog)
    .where(auditFilters(options));

  return row?.value ?? 0;
}

/** The distinct actions and actors present, to populate the filter selects. */
export async function getAuditFacets(): Promise<{
  actions: string[];
  actors: { id: string; email: string }[];
}> {
  const [actionRows, actorRows] = await Promise.all([
    db
      .selectDistinct({ action: auditLog.action })
      .from(auditLog)
      .orderBy(asc(auditLog.action)),
    db
      .selectDistinct({ id: profiles.id, email: profiles.email })
      .from(auditLog)
      .innerJoin(profiles, eq(profiles.id, auditLog.actorId))
      .orderBy(asc(profiles.email)),
  ]);

  return {
    actions: actionRows.map((r) => r.action),
    actors: actorRows,
  };
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

/**
 * An inclusive date-range predicate, or `undefined` when neither bound is set.
 * Exported because the metrics queries need exactly the same semantics and two
 * subtly different range filters would make two pages disagree.
 */
export function dateRangeFilter(
  column: Parameters<typeof gte>[0],
  from?: Date,
  to?: Date
): SQL | undefined {
  const clauses: SQL[] = [];
  if (from) clauses.push(gte(column, from));
  if (to) clauses.push(lte(column, to));
  if (clauses.length === 0) return undefined;
  return clauses.length === 1 ? clauses[0] : and(...clauses);
}

/** Resolves a set of user ids to emails, for rendering ids as people. */
export async function emailsForIds(
  ids: readonly string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const rows = await db
    .select({ id: profiles.id, email: profiles.email })
    .from(profiles)
    .where(inArray(profiles.id, [...ids]));

  return new Map(rows.map((r) => [r.id, r.email]));
}
