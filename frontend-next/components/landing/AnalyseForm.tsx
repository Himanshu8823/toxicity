'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { analyzeVideo, extractVideoId, toApiMessage } from '@/lib/api';

const MIN_COMMENTS = 10;
const MAX_COMMENTS = 200;
const DEFAULT_COMMENTS = 50;

/** Staged, honest status copy. No fake percentage — the backend genuinely
 * takes anywhere from ~10s to ~3min depending on comment count. */
const STAGES: ReadonlyArray<{ at: number; label: string }> = [
  { at: 0, label: 'Fetching comments…' },
  { at: 6, label: 'Scoring comments…' },
  { at: 20, label: 'Scoring comments…' },
  { at: 45, label: 'Aggregating results…' },
];

function currentStageLabel(elapsedSeconds: number): string {
  let label = STAGES[0].label;
  for (const stage of STAGES) {
    if (elapsedSeconds >= stage.at) label = stage.label;
  }
  return label;
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export interface AnalyseFormProps {
  className?: string;
}

export function AnalyseForm({ className }: AnalyseFormProps) {
  const router = useRouter();
  const urlInputId = useId();
  const rangeInputId = useId();

  const [url, setUrl] = useState('');
  const [maxComments, setMaxComments] = useState(DEFAULT_COMMENTS);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startTimer() {
    setElapsedSeconds(0);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const trimmed = url.trim();
    if (!trimmed) {
      setFieldError('Paste a YouTube video URL to begin.');
      return;
    }
    if (!extractVideoId(trimmed)) {
      setFieldError('That does not look like a YouTube video URL.');
      return;
    }

    setFieldError(null);
    setRequestError(null);
    setIsLoading(true);
    startTimer();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await analyzeVideo(trimmed, maxComments, controller.signal);
      sessionStorage.setItem('toxiscan:result', JSON.stringify(data));
      router.push('/results');
    } catch (err) {
      if (controller.signal.aborted) {
        setRequestError('Analysis cancelled.');
      } else {
        setRequestError(toApiMessage(err));
      }
    } finally {
      stopTimer();
      setIsLoading(false);
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  const stageLabel = currentStageLabel(elapsedSeconds);

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      noValidate
    >
      <div className="hairline-card flex flex-col gap-5 p-5 sm:p-6">
        <Input
          id={urlInputId}
          label="YouTube video URL"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://www.youtube.com/watch?v=…"
          value={url}
          disabled={isLoading}
          error={fieldError ?? undefined}
          hint={fieldError ? undefined : 'Paste the link to any public video with comments enabled.'}
          onChange={(event) => {
            setUrl(event.target.value);
            if (fieldError) setFieldError(null);
          }}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={rangeInputId} className="title-sm text-ink">
              Comments to analyse
            </label>
            <span className="body-strong text-ink" aria-hidden>
              {maxComments}
            </span>
          </div>
          <input
            id={rangeInputId}
            type="range"
            min={MIN_COMMENTS}
            max={MAX_COMMENTS}
            step={5}
            value={maxComments}
            disabled={isLoading}
            onChange={(event) => setMaxComments(Number(event.target.value))}
            aria-valuetext={`${maxComments} comments`}
            className="h-11 w-full cursor-pointer accent-[var(--color-ink)] disabled:cursor-not-allowed"
          />
          <div className="caption flex items-center justify-between text-muted">
            <span>{MIN_COMMENTS}</span>
            <span>{MAX_COMMENTS} max</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isLoading}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Analysing…' : 'Analyse comments'}
          </Button>
          {isLoading ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleCancel}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          ) : null}
        </div>

        <div aria-live="polite" aria-busy={isLoading} className="min-h-[1.5rem]">
          {isLoading ? (
            <p className="body-sm text-muted">
              {stageLabel} <span className="text-body-strong">{formatElapsed(elapsedSeconds)}</span> elapsed —
              larger comment counts can take up to a few minutes.
            </p>
          ) : requestError ? (
            <p className="body-sm" style={{ color: 'var(--color-semantic-error)' }}>
              {requestError}
            </p>
          ) : (
            <p className="body-sm text-muted">
              Public videos only. Nothing you analyse is stored.
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
