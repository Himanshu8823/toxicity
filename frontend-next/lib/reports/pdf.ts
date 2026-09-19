import 'server-only';

import PDFDocument from 'pdfkit';
import { languageName } from '@/lib/analysis/language';
import type {
  Comment,
  CommentAnalysis,
  Scan,
} from '@/lib/db/schema';

/**
 * Minimal placeholder PDF — empty body, header + footer only.
 *
 * Kept intentionally simple: it produces a valid, downloadable `.pdf` without
 * trying to lay out the full report. The previous full-layout version used
 * manual coordinate math and overlapped itself when text wrapped unexpectedly.
 * This file's job is to be the smallest thing that satisfies "the download
 * endpoint returns a real PDF" until a proper layout pass replaces it.
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

export function buildPdf(data: ReportData): Promise<Buffer> {
  const { scan, generatedAt, generatedFor } = data;

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 64, bottom: 64, left: 56, right: 56 },
      info: {
        Title: `ToxiScan report — ${scan.videoTitle ?? scan.videoId}`,
        Author: 'ToxiScan',
        Subject: 'YouTube comment toxicity analysis',
        CreationDate: generatedAt,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Eyebrow
    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#7a7670')
      .text('TOXISCAN  ·  ANALYSIS REPORT', {
        characterSpacing: 1.4,
      });

    // Title
    doc.moveDown(0.4);
    doc
      .font('Times-Roman')
      .fontSize(28)
      .fillColor('#0c0a09')
      .text(scan.videoTitle ?? 'Untitled video', {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      });

    doc.moveDown(0.6);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#3f3f3f')
      .text(
        [
          scan.channelName,
          `youtube.com/watch?v=${scan.videoId}`,
        ]
          .filter(Boolean)
          .join('  ·  ')
      );

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#7a7670')
      .text(
        `Generated ${generatedAt.toLocaleString('en-GB', {
          dateStyle: 'long',
          timeStyle: 'short',
        })} for ${generatedFor}`
      );

    // Footer
    doc
      .font('Times-Italic')
      .fontSize(8)
      .fillColor('#7a7670')
      .text(
        '\n\nEvery score is a model confidence, not a fact.',
        doc.page.margins.left,
        doc.page.height - doc.page.margins.bottom - 20
      );

    doc.end();
  });
}
