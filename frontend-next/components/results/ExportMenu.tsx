'use client';

import { useState } from 'react';
import type { AnalysisResponse } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export interface ExportMenuProps {
  data: AnalysisResponse;
  className?: string;
}

/** Escapes a single CSV field per RFC 4180: quotes doubled, wrapped in quotes
 * whenever the value contains a comma, quote, or newline. */
function csvField(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(data: AnalysisResponse): string {
  const header = ['text', 'mostLikelyCategory', 'confidence', 'error'];
  const rows = data.analysis.allResults.map((comment) => [
    csvField(comment.text ?? ''),
    csvField(comment.mostLikelyCategory ?? ''),
    csvField(Number.isFinite(comment.confidence) ? comment.confidence : ''),
    csvField(''),
  ]);
  return [header.map(csvField).join(','), ...rows.map((row) => row.join(','))].join('\r\n');
}

function downloadBlob(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

/** Client-side JSON/CSV export via Blob + object URL, revoked immediately
 * after the synthetic click triggers the download. */
export function ExportMenu({ data, className }: ExportMenuProps) {
  const [lastAction, setLastAction] = useState<'json' | 'csv' | null>(null);
  const videoId = data.videoInfo?.id?.trim() || 'video';

  function handleExportJson() {
    downloadBlob(JSON.stringify(data, null, 2), 'application/json', `toxiscan-${videoId}.json`);
    setLastAction('json');
  }

  function handleExportCsv() {
    downloadBlob(buildCsv(data), 'text/csv;charset=utf-8', `toxiscan-${videoId}.csv`);
    setLastAction('csv');
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <Button variant="outline" size="sm" icon={<DownloadIcon />} onClick={handleExportJson}>
        Export JSON
      </Button>
      <Button variant="outline" size="sm" icon={<DownloadIcon />} onClick={handleExportCsv}>
        Export CSV
      </Button>
      <span className="caption text-muted" role="status" aria-live="polite">
        {lastAction === 'json' && 'JSON download started.'}
        {lastAction === 'csv' && 'CSV download started.'}
      </span>
    </div>
  );
}

export default ExportMenu;
