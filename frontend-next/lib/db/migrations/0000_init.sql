CREATE TYPE "public"."feedback_status" AS ENUM('open', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."feedback_verdict" AS ENUM('correct', 'incorrect');--> statement-breakpoint
CREATE TYPE "public"."report_format" AS ENUM('pdf', 'csv', 'json');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('pending', 'running', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('none', 'mild', 'moderate', 'severe', 'critical');--> statement-breakpoint
CREATE TYPE "public"."toxicity_category" AS ENUM('non_toxic', 'insult', 'harassment', 'hate_speech', 'threat', 'profanity', 'sexual_explicit', 'identity_attack', 'self_harm');--> statement-breakpoint
CREATE TYPE "public"."usage_kind" AS ENUM('scan', 'report', 'playground');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"text_hash" text NOT NULL,
	"language" text,
	"category" "toxicity_category" NOT NULL,
	"severity" "severity" NOT NULL,
	"confidence" real NOT NULL,
	"model_name" text NOT NULL,
	"model_version" text,
	"is_sarcastic" boolean DEFAULT false NOT NULL,
	"context_shifted" boolean DEFAULT false NOT NULL,
	"rationale" text,
	"raw_scores" jsonb,
	"groq_scores" jsonb,
	"models_disagree" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"youtube_comment_id" text,
	"parent_id" uuid,
	"author_name" text,
	"text" text NOT NULL,
	"text_hash" text NOT NULL,
	"language" text,
	"like_count" integer DEFAULT 0,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"comment_analysis_id" uuid NOT NULL,
	"verdict" "feedback_verdict" NOT NULL,
	"corrected_category" "toxicity_category",
	"corrected_severity" "severity",
	"note" text,
	"status" "feedback_status" DEFAULT 'open' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_name" text NOT NULL,
	"language" text,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"true_positives" integer DEFAULT 0 NOT NULL,
	"false_positives" integer DEFAULT 0 NOT NULL,
	"true_negatives" integer DEFAULT 0 NOT NULL,
	"false_negatives" integer DEFAULT 0 NOT NULL,
	"precision" numeric(5, 4),
	"recall" numeric(5, 4),
	"f1" numeric(5, 4),
	"roc_auc" numeric(5, 4),
	"sample_size" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"scan_id" uuid NOT NULL,
	"format" "report_format" NOT NULL,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"title" text,
	"storage_path" text,
	"file_size" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"scan_id" uuid NOT NULL,
	"title" text,
	"note" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"video_id" text NOT NULL,
	"video_title" text,
	"channel_name" text,
	"thumbnail_url" text,
	"view_count" text,
	"comment_count" text,
	"status" "scan_status" DEFAULT 'pending' NOT NULL,
	"requested_comments" integer DEFAULT 50 NOT NULL,
	"analysed_count" integer DEFAULT 0 NOT NULL,
	"errored_count" integer DEFAULT 0 NOT NULL,
	"overall_toxicity_score" real,
	"avg_confidence" real,
	"dominant_language" text,
	"duration_ms" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "usage_kind" NOT NULL,
	"scan_id" uuid,
	"units" integer DEFAULT 1 NOT NULL,
	"tokens_used" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_analyses" ADD CONSTRAINT "comment_analyses_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_comment_analysis_id_comment_analyses_id_fk" FOREIGN KEY ("comment_analysis_id") REFERENCES "public"."comment_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_analyses" ADD CONSTRAINT "saved_analyses_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_analyses" ADD CONSTRAINT "saved_analyses_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comment_analyses_comment_idx" ON "comment_analyses" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_analyses_hash_idx" ON "comment_analyses" USING btree ("text_hash");--> statement-breakpoint
CREATE INDEX "comment_analyses_category_idx" ON "comment_analyses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "comment_analyses_severity_idx" ON "comment_analyses" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "comment_analyses_disagree_idx" ON "comment_analyses" USING btree ("models_disagree");--> statement-breakpoint
CREATE INDEX "comments_scan_idx" ON "comments" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "comments_hash_idx" ON "comments" USING btree ("text_hash");--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_user_analysis_idx" ON "feedback" USING btree ("user_id","comment_analysis_id");--> statement-breakpoint
CREATE INDEX "feedback_status_idx" ON "feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "feedback_created_idx" ON "feedback" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "model_metrics_model_lang_idx" ON "model_metrics" USING btree ("model_name","language");--> statement-breakpoint
CREATE INDEX "model_metrics_period_idx" ON "model_metrics" USING btree ("period_end" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_idx" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "reports_user_created_idx" ON "reports" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "saved_user_scan_idx" ON "saved_analyses" USING btree ("user_id","scan_id");--> statement-breakpoint
CREATE INDEX "saved_user_created_idx" ON "saved_analyses" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "scans_user_created_idx" ON "scans" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "scans_video_idx" ON "scans" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "scans_status_idx" ON "scans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "usage_user_created_idx" ON "usage_events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "usage_kind_created_idx" ON "usage_events" USING btree ("kind","created_at" DESC NULLS LAST);