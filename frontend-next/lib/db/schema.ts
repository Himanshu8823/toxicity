/**
 * ToxiScan database schema.
 *
 * Lives in Supabase Postgres; `profiles.id` is a foreign key onto Supabase's
 * own `auth.users` table, which Drizzle does not manage — Supabase Auth owns
 * it. Everything else here is ours.
 *
 * Conventions:
 *  - every table has a uuid primary key defaulted in the database
 *  - every user-owned table cascades from `profiles`, so deleting an account
 *    removes its data without leaving orphans
 *  - timestamps are `timestamptz`, always stored UTC
 *  - anything a list view filters or sorts on carries an index
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

export const scanStatusEnum = pgEnum('scan_status', [
  'pending',
  'running',
  'complete',
  'failed',
]);

/**
 * The nine-category taxonomy that replaces the original five labels.
 * `lib/analysis/taxonomy.ts` maps these back onto the legacy five for any UI
 * that has not been migrated yet.
 */
export const toxicityCategoryEnum = pgEnum('toxicity_category', [
  'non_toxic',
  'insult',
  'harassment',
  'hate_speech',
  'threat',
  'profanity',
  'sexual_explicit',
  'identity_attack',
  'self_harm',
]);

/** Ordered: comparisons elsewhere rely on this being least → most severe. */
export const severityEnum = pgEnum('severity', [
  'none',
  'mild',
  'moderate',
  'severe',
  'critical',
]);

export const reportFormatEnum = pgEnum('report_format', ['pdf', 'csv', 'json']);

export const reportStatusEnum = pgEnum('report_status', [
  'pending',
  'ready',
  'failed',
]);

export const feedbackVerdictEnum = pgEnum('feedback_verdict', [
  'correct',
  'incorrect',
]);

export const feedbackStatusEnum = pgEnum('feedback_status', [
  'open',
  'accepted',
  'rejected',
]);

export const usageKindEnum = pgEnum('usage_kind', [
  'scan',
  'report',
  'playground',
]);

// ─── profiles ────────────────────────────────────────────────────────────────

/**
 * One row per authenticated user, created by a trigger when Supabase Auth
 * inserts into `auth.users` (see the migration). Holds everything the app
 * needs that Supabase Auth does not store itself.
 */
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    fullName: text('full_name'),
    avatarUrl: text('avatar_url'),
    role: userRoleEnum('role').notNull().default('user'),
    /** UI language and the default assumed for pasted text in the playground. */
    preferredLanguage: text('preferred_language').notNull().default('en'),
    isSuspended: boolean('is_suspended').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  },
  (t) => [
    index('profiles_role_idx').on(t.role),
    uniqueIndex('profiles_email_idx').on(t.email),
  ]
);

// ─── scans ───────────────────────────────────────────────────────────────────

/** One analysis run against one YouTube video. */
export const scans = pgTable(
  'scans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),

    videoId: text('video_id').notNull(),
    videoTitle: text('video_title'),
    channelName: text('channel_name'),
    thumbnailUrl: text('thumbnail_url'),
    /** Kept as text: YouTube returns counts that overflow int4. */
    viewCount: text('view_count'),
    commentCount: text('comment_count'),

    status: scanStatusEnum('status').notNull().default('pending'),
    requestedComments: integer('requested_comments').notNull().default(50),
    analysedCount: integer('analysed_count').notNull().default(0),
    erroredCount: integer('errored_count').notNull().default(0),

    /** Percentage 0–100 of comments landing in any harmful category. */
    overallToxicityScore: real('overall_toxicity_score'),
    avgConfidence: real('avg_confidence'),
    /** Most common detected language across the comments, e.g. `hi`. */
    dominantLanguage: text('dominant_language'),

    durationMs: integer('duration_ms'),
    errorMessage: text('error_message'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('scans_user_created_idx').on(t.userId, t.createdAt.desc()),
    index('scans_video_idx').on(t.videoId),
    index('scans_status_idx').on(t.status),
  ]
);

// ─── comments ────────────────────────────────────────────────────────────────

/**
 * A comment as fetched from YouTube. `parentId` is what makes context-aware
 * detection possible: a reply is scored with its parent in view.
 */
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scanId: uuid('scan_id')
      .notNull()
      .references(() => scans.id, { onDelete: 'cascade' }),

    youtubeCommentId: text('youtube_comment_id'),
    /**
     * Set when this comment is a reply, so the pipeline can pass context.
     * The `AnyPgColumn` annotation is what lets a table reference itself —
     * without it the type is circular and TypeScript gives up.
     */
    parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, {
      onDelete: 'cascade',
    }),

    authorName: text('author_name'),
    text: text('text').notNull(),
    /** SHA-256 of the normalised text — the cache key for `comment_analyses`. */
    textHash: text('text_hash').notNull(),
    language: text('language'),
    likeCount: integer('like_count').default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('comments_scan_idx').on(t.scanId),
    index('comments_hash_idx').on(t.textHash),
    index('comments_parent_idx').on(t.parentId),
  ]
);

// ─── comment_analyses ────────────────────────────────────────────────────────

/**
 * What the models made of one comment.
 *
 * `textHash` is duplicated here deliberately: identical comment text is scored
 * once and reused across scans and users, so the cache lookup hits this table
 * directly without joining `comments`.
 */
export const commentAnalyses = pgTable(
  'comment_analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),

    textHash: text('text_hash').notNull(),
    language: text('language'),

    category: toxicityCategoryEnum('category').notNull(),
    severity: severityEnum('severity').notNull(),
    confidence: real('confidence').notNull(),

    /** Which classifier produced `rawScores`, e.g. `muril` or `xlmr`. */
    modelName: text('model_name').notNull(),
    modelVersion: text('model_version'),

    /** Groq's read of the comment, where it was consulted. */
    isSarcastic: boolean('is_sarcastic').notNull().default(false),
    /** True when the comment is only toxic given its parent. */
    contextShifted: boolean('context_shifted').notNull().default(false),
    rationale: text('rationale'),

    /** Full label→score map from the classifier, kept for the metrics page. */
    rawScores: jsonb('raw_scores').$type<Record<string, number>>(),
    groqScores: jsonb('groq_scores').$type<Record<string, unknown>>(),
    /**
     * Set when the classifier and Groq reached different verdicts. A useful
     * signal in its own right — these are the rows worth human review.
     */
    modelsDisagree: boolean('models_disagree').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('comment_analyses_comment_idx').on(t.commentId),
    index('comment_analyses_hash_idx').on(t.textHash),
    index('comment_analyses_category_idx').on(t.category),
    index('comment_analyses_severity_idx').on(t.severity),
    index('comment_analyses_disagree_idx').on(t.modelsDisagree),
  ]
);

// ─── saved_analyses ──────────────────────────────────────────────────────────

/** A scan the user explicitly bookmarked, with their own notes on it. */
export const savedAnalyses = pgTable(
  'saved_analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    scanId: uuid('scan_id')
      .notNull()
      .references(() => scans.id, { onDelete: 'cascade' }),

    title: text('title'),
    note: text('note'),
    tags: text('tags').array().notNull().default(sql`ARRAY[]::text[]`),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // A scan is either saved or it is not; saving twice is a no-op.
    uniqueIndex('saved_user_scan_idx').on(t.userId, t.scanId),
    index('saved_user_created_idx').on(t.userId, t.createdAt.desc()),
  ]
);

// ─── reports ─────────────────────────────────────────────────────────────────

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    scanId: uuid('scan_id')
      .notNull()
      .references(() => scans.id, { onDelete: 'cascade' }),

    format: reportFormatEnum('format').notNull(),
    status: reportStatusEnum('status').notNull().default('pending'),
    title: text('title'),
    /** Path inside the Supabase Storage bucket, not a public URL. */
    storagePath: text('storage_path'),
    fileSize: integer('file_size'),
    errorMessage: text('error_message'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('reports_user_created_idx').on(t.userId, t.createdAt.desc())]
);

// ─── feedback ────────────────────────────────────────────────────────────────

/**
 * Human-in-the-loop. A user says a prediction was wrong; an admin reviews it.
 * Accepted feedback becomes the ground truth the metrics page scores against.
 */
export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    commentAnalysisId: uuid('comment_analysis_id')
      .notNull()
      .references(() => commentAnalyses.id, { onDelete: 'cascade' }),

    verdict: feedbackVerdictEnum('verdict').notNull(),
    /** What the user says it should have been, when they said it was wrong. */
    correctedCategory: toxicityCategoryEnum('corrected_category'),
    correctedSeverity: severityEnum('corrected_severity'),
    note: text('note'),

    status: feedbackStatusEnum('status').notNull().default('open'),
    reviewedBy: uuid('reviewed_by').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One verdict per user per prediction; re-submitting updates in place.
    uniqueIndex('feedback_user_analysis_idx').on(t.userId, t.commentAnalysisId),
    index('feedback_status_idx').on(t.status),
    index('feedback_created_idx').on(t.createdAt.desc()),
  ]
);

// ─── model_metrics ───────────────────────────────────────────────────────────

/**
 * A snapshot of how a model performed on one language over one period,
 * computed from accepted `feedback` rows. Stored rather than derived on every
 * page load so the admin metrics page stays fast as the table grows.
 */
export const modelMetrics = pgTable(
  'model_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    modelName: text('model_name').notNull(),
    language: text('language'),

    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

    truePositives: integer('true_positives').notNull().default(0),
    falsePositives: integer('false_positives').notNull().default(0),
    trueNegatives: integer('true_negatives').notNull().default(0),
    falseNegatives: integer('false_negatives').notNull().default(0),

    /** numeric(5,4): 0.0000–1.0000, exact — these are reported figures. */
    precision: numeric('precision', { precision: 5, scale: 4 }),
    recall: numeric('recall', { precision: 5, scale: 4 }),
    f1: numeric('f1', { precision: 5, scale: 4 }),
    rocAuc: numeric('roc_auc', { precision: 5, scale: 4 }),

    sampleSize: integer('sample_size').notNull().default(0),
    computedAt: timestamp('computed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('model_metrics_model_lang_idx').on(t.modelName, t.language),
    index('model_metrics_period_idx').on(t.periodEnd.desc()),
  ]
);

// ─── usage_events ────────────────────────────────────────────────────────────

/** Append-only. Powers "how much have I used" and the admin totals alike. */
export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),

    kind: usageKindEnum('kind').notNull(),
    scanId: uuid('scan_id').references(() => scans.id, { onDelete: 'set null' }),

    /** Comments scored, texts classified — whatever the unit is for `kind`. */
    units: integer('units').notNull().default(1),
    tokensUsed: integer('tokens_used').default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('usage_user_created_idx').on(t.userId, t.createdAt.desc()),
    index('usage_kind_created_idx').on(t.kind, t.createdAt.desc()),
  ]
);

// ─── audit_log ───────────────────────────────────────────────────────────────

/** Every admin action, so privileged changes are never silent. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),

    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ip: text('ip'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('audit_actor_idx').on(t.actorId),
    index('audit_created_idx').on(t.createdAt.desc()),
    index('audit_entity_idx').on(t.entity, t.entityId),
  ]
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const profilesRelations = relations(profiles, ({ many }) => ({
  scans: many(scans),
  savedAnalyses: many(savedAnalyses),
  reports: many(reports),
  feedback: many(feedback),
  usageEvents: many(usageEvents),
}));

export const scansRelations = relations(scans, ({ one, many }) => ({
  user: one(profiles, { fields: [scans.userId], references: [profiles.id] }),
  comments: many(comments),
  savedAnalyses: many(savedAnalyses),
  reports: many(reports),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  scan: one(scans, { fields: [comments.scanId], references: [scans.id] }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'comment_replies',
  }),
  replies: many(comments, { relationName: 'comment_replies' }),
  analysis: one(commentAnalyses),
}));

export const commentAnalysesRelations = relations(
  commentAnalyses,
  ({ one, many }) => ({
    comment: one(comments, {
      fields: [commentAnalyses.commentId],
      references: [comments.id],
    }),
    feedback: many(feedback),
  })
);

export const savedAnalysesRelations = relations(savedAnalyses, ({ one }) => ({
  user: one(profiles, {
    fields: [savedAnalyses.userId],
    references: [profiles.id],
  }),
  scan: one(scans, { fields: [savedAnalyses.scanId], references: [scans.id] }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  user: one(profiles, { fields: [reports.userId], references: [profiles.id] }),
  scan: one(scans, { fields: [reports.scanId], references: [scans.id] }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(profiles, { fields: [feedback.userId], references: [profiles.id] }),
  analysis: one(commentAnalyses, {
    fields: [feedback.commentAnalysisId],
    references: [commentAnalyses.id],
  }),
  reviewer: one(profiles, {
    fields: [feedback.reviewedBy],
    references: [profiles.id],
    relationName: 'feedback_reviewer',
  }),
}));

export const usageEventsRelations = relations(usageEvents, ({ one }) => ({
  user: one(profiles, {
    fields: [usageEvents.userId],
    references: [profiles.id],
  }),
  scan: one(scans, { fields: [usageEvents.scanId], references: [scans.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(profiles, {
    fields: [auditLog.actorId],
    references: [profiles.id],
  }),
}));

// ─── Inferred types ──────────────────────────────────────────────────────────

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type CommentAnalysis = typeof commentAnalyses.$inferSelect;
export type NewCommentAnalysis = typeof commentAnalyses.$inferInsert;
export type SavedAnalysis = typeof savedAnalyses.$inferSelect;
export type NewSavedAnalysis = typeof savedAnalyses.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
export type ModelMetric = typeof modelMetrics.$inferSelect;
export type NewModelMetric = typeof modelMetrics.$inferInsert;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type ScanStatus = (typeof scanStatusEnum.enumValues)[number];
export type ToxicityCategory = (typeof toxicityCategoryEnum.enumValues)[number];
export type Severity = (typeof severityEnum.enumValues)[number];
export type ReportFormat = (typeof reportFormatEnum.enumValues)[number];
export type FeedbackVerdict = (typeof feedbackVerdictEnum.enumValues)[number];
