import 'server-only';

import { languageName } from '@/lib/analysis/language';
import type {
  Comment,
  CommentAnalysis,
  Scan,
} from '@/lib/db/schema';

/**
 * Report bodies.
 *
 * Two of the three formats live here: CSV for someone who wants the rows in a
 * spreadsheet, JSON for anyone building on the data. The PDF is built in
 * `pdf.ts` using `pdfkit`, so a download gives the user a real `.pdf` rather
 * than a print dialog. The PDF builder mirrors the visual structure that used
 * to live in `buildHtml`.
 */

export interface ReportRow {
  comment: Comment;
  analysis: CommentAnalysis | null;
}

export interface ReportData {
  scan: Scan;
  rows: readonly ReportRow[];
  generatedAt: Date;
  generatedFor: string;
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  'comment_id',
  'author',
  'text',
  'language',
  'category',
  'severity',
  'confidence',
  'model',
  'is_sarcastic',
  'context_shifted',
  'models_disagree',
  'rationale',
  'likes',
  'published_at',
] as const;

/**
 * Escapes one CSV field.
 *
 * A leading `=`, `+`, `-` or `@` is prefixed with a quote: spreadsheet
 * applications treat those as formulas, and comment text is attacker-supplied.
 * Without this, a comment reading `=HYPERLINK(...)` executes when the file is
 * opened.
 */
function csvField(value: unknown): string {
  if (value == null) return '';

  let text = String(value);

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function buildCsv({ rows }: ReportData): string {
  const lines = [CSV_COLUMNS.join(',')];

  for (const { comment, analysis } of rows) {
    lines.push(
      [
        comment.youtubeCommentId,
        comment.authorName,
        comment.text,
        analysis?.language ? languageName(analysis.language) : '',
        analysis?.category ?? '',
        analysis?.severity ?? '',
        analysis?.confidence != null ? analysis.confidence.toFixed(4) : '',
        analysis?.modelName ?? '',
        analysis?.isSarcastic ? 'yes' : 'no',
        analysis?.contextShifted ? 'yes' : 'no',
        analysis?.modelsDisagree ? 'yes' : 'no',
        analysis?.rationale ?? '',
        comment.likeCount ?? 0,
        comment.publishedAt?.toISOString() ?? '',
      ]
        .map(csvField)
        .join(',')
    );
  }

  // CRLF and a BOM: Excel opens UTF-8 as the local codepage otherwise, which
  // mangles every Hindi and Marathi comment in the file.
  return `﻿${lines.join('\r\n')}\r\n`;
}

// ─── JSON ────────────────────────────────────────────────────────────────────

export function buildJson(data: ReportData): string {
  const { scan, rows, generatedAt, generatedFor } = data;

  return JSON.stringify(
    {
      report: {
        generatedAt: generatedAt.toISOString(),
        generatedFor,
        tool: 'ToxiScan',
      },
      video: {
        id: scan.videoId,
        title: scan.videoTitle,
        channel: scan.channelName,
        url: `https://www.youtube.com/watch?v=${scan.videoId}`,
        viewCount: scan.viewCount,
        commentCount: scan.commentCount,
      },
      analysis: {
        scanId: scan.id,
        status: scan.status,
        analysedCount: scan.analysedCount,
        erroredCount: scan.erroredCount,
        overallToxicityScore: scan.overallToxicityScore,
        avgConfidence: scan.avgConfidence,
        dominantLanguage: scan.dominantLanguage,
        durationMs: scan.durationMs,
        startedAt: scan.createdAt.toISOString(),
        completedAt: scan.completedAt?.toISOString() ?? null,
      },
      comments: rows.map(({ comment, analysis }) => ({
        id: comment.youtubeCommentId,
        author: comment.authorName,
        text: comment.text,
        likes: comment.likeCount,
        publishedAt: comment.publishedAt?.toISOString() ?? null,
        isReply: comment.parentId !== null,
        verdict: analysis
          ? {
              language: analysis.language,
              category: analysis.category,
              severity: analysis.severity,
              confidence: analysis.confidence,
              model: analysis.modelName,
              modelVersion: analysis.modelVersion,
              isSarcastic: analysis.isSarcastic,
              contextShifted: analysis.contextShifted,
              modelsDisagree: analysis.modelsDisagree,
              rationale: analysis.rationale,
              rawScores: analysis.rawScores,
            }
          : null,
      })),
    },
    null,
    2
  );
}
