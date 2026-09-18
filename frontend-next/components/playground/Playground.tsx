'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { analyzeText, toApiMessage } from '@/lib/api';
import type { SingleTextResult } from '@/lib/types';
import { LABEL_META, LABEL_ORDER } from '@/lib/labels';
import { formatScore } from '@/lib/utils';

const MAX_CHARS = 1000;
const DEBOUNCE_MS = 700;

interface ExamplePrompt {
  label: string;
  text: string;
}

/**
 * A mix of neutral, mildly rude and hostile sample sentences so the model's
 * behaviour is legible across the range — deliberately mild, illustrative
 * rather than gratuitous. No slurs, no graphic content.
 */
const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    label: 'Neutral',
    text: 'Thanks for the detailed walkthrough, this really helped me understand the topic.',
  },
  {
    label: 'Neutral',
    text: 'I disagree with your conclusion, but I appreciate the effort you put into this video.',
  },
  {
    label: 'Mildly rude',
    text: "This is honestly kind of a lazy take, did you even research this before posting?",
  },
  {
    label: 'Mildly rude',
    text: 'Wow, another clickbait title. You people never learn, do you.',
  },
  {
    label: 'Hostile',
    text: 'You are an absolute idiot and everyone in the comments agrees you should be ashamed.',
  },
  {
    label: 'Hostile',
    text: 'Nobody wants to hear from a loser like you, just delete your channel already.',
  },
];

type Status = 'idle' | 'loading' | 'success' | 'error';

function BarRow({
  label,
  score,
  percentage,
  pastel,
  ink,
  isWinner,
  reduceMotion,
}: {
  label: string;
  score: number;
  percentage: string;
  pastel: string;
  ink: string;
  isWinner: boolean;
  reduceMotion: boolean;
}) {
  const widthPercent = Math.min(100, Math.max(0, score * 100));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="body-sm"
          style={{ color: ink, fontWeight: isWinner ? 600 : 400 }}
        >
          {label}
        </span>
        <span className="caption text-muted" style={{ color: isWinner ? ink : undefined }}>
          {percentage}
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-[var(--radius-pill)]"
        style={{ background: 'var(--color-surface-strong)' }}
      >
        <motion.div
          className="h-full rounded-[var(--radius-pill)]"
          style={{ background: pastel }}
          initial={{ width: reduceMotion ? `${widthPercent}%` : 0 }}
          animate={{ width: `${widthPercent}%` }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
          }
        />
      </div>
    </div>
  );
}

export interface PlaygroundProps {
  className?: string;
}

export function Playground({ className }: PlaygroundProps) {
  const textareaId = useId();

  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<SingleTextResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion() ?? false;

  const runAnalysis = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      abortRef.current?.abort();
      setStatus('idle');
      setResult(null);
      setErrorMessage(null);
      return;
    }

    // Always abort the previous in-flight request first — out-of-order
    // responses must never overwrite a newer result.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('loading');
    setErrorMessage(null);

    try {
      const data = await analyzeText(trimmed, controller.signal);
      if (controller.signal.aborted) return;
      setResult(data);
      setStatus('success');
    } catch (err) {
      if (controller.signal.aborted) return;
      setErrorMessage(toApiMessage(err));
      setStatus('error');
    }
  }, []);

  // Debounced live analysis — fires ~700ms after typing stops.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      abortRef.current?.abort();
      setStatus('idle');
      setResult(null);
      setErrorMessage(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void runAnalysis(text);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, runAnalysis]);

  // Clean up any in-flight request and pending debounce on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSubmitNow() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void runAnalysis(text);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const isSubmitCombo = (event.metaKey || event.ctrlKey) && event.key === 'Enter';
    if (isSubmitCombo) {
      event.preventDefault();
      handleSubmitNow();
    }
  }

  function handleExampleClick(prompt: ExamplePrompt) {
    setText(prompt.text);
  }

  function handleRetry() {
    handleSubmitNow();
  }

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isLoading = status === 'loading';

  const winnerMeta = result ? LABEL_META[result.mostLikelyCategory] : null;

  return (
    <div className={className}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        {/* Input column */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor={textareaId} className="title-sm text-ink">
              Try a sentence
            </label>
            <textarea
              id={textareaId}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or paste a comment to see how the model scores it…"
              rows={8}
              aria-describedby={`${textareaId}-count ${textareaId}-note`}
              aria-invalid={isOverLimit ? true : undefined}
              className="hairline-card body-md w-full resize-none p-5 text-ink outline-none transition-colors focus:border-[var(--color-ink)]"
              style={{ minHeight: '200px' }}
            />
            <div className="flex items-center justify-between gap-3">
              <p
                id={`${textareaId}-count`}
                className={`caption ${isOverLimit ? '' : 'text-muted'}`}
                style={isOverLimit ? { color: 'var(--color-semantic-error)' } : undefined}
              >
                {charCount} / {MAX_CHARS} characters
                {isOverLimit ? ' — please shorten your text' : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={isLoading}
              disabled={isLoading || !text.trim() || isOverLimit}
              onClick={handleSubmitNow}
            >
              Analyse now
            </Button>
            <span className="caption text-muted">or press ⌘/Ctrl + Enter</span>
          </div>

          <div className="flex flex-col gap-3">
            <span className="caption-uppercase text-muted">Try an example</span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt.text}
                  type="button"
                  onClick={() => handleExampleClick(prompt)}
                  className="caption inline-flex min-h-[36px] items-center rounded-[var(--radius-pill)] border border-hairline-strong bg-surface-card px-3 py-1.5 text-body transition-colors hover:border-[var(--color-ink)] hover:text-ink"
                  title={prompt.text}
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>

          <p id={`${textareaId}-note`} className="caption text-muted">
            Results are probabilistic model scores, not a moderation verdict — accuracy
            varies by language and context. This tool informs; it does not judge people.
          </p>
        </div>

        {/* Result column */}
        <div
          aria-live="polite"
          aria-busy={isLoading}
          className="hairline-card flex min-h-[360px] flex-col p-6 sm:p-8"
        >
          {status === 'idle' ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="display-sm max-w-[22ch] text-muted">
                Start typing to see how ToxiScan reads it.
              </p>
              <p className="body-sm mt-3 max-w-[36ch] text-muted">
                Results appear here automatically, a moment after you stop typing.
              </p>
            </div>
          ) : null}

          {isLoading && !result ? (
            <div className="flex flex-1 flex-col gap-6">
              <Skeleton className="h-9 w-2/3" />
              <div className="flex flex-col gap-4">
                {LABEL_ORDER.map((label) => (
                  <Skeleton key={label} className="h-8 w-full" />
                ))}
              </div>
            </div>
          ) : null}

          {status === 'error' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <p
                className="body-md max-w-[40ch]"
                style={{ color: 'var(--color-semantic-error)' }}
              >
                {errorMessage}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                Try again
              </Button>
            </div>
          ) : null}

          {status === 'success' && result && winnerMeta ? (
            <div className="flex flex-1 flex-col gap-8">
              <div>
                <span className="caption-uppercase text-muted">Most likely</span>
                <p
                  className="display-md mt-2"
                  style={{ color: winnerMeta.ink, opacity: isLoading ? 0.5 : 1 }}
                >
                  {winnerMeta.display}
                </p>
                <p className="body-sm mt-2 text-body">{winnerMeta.description}</p>
              </div>

              <div className="flex flex-col gap-4" style={{ opacity: isLoading ? 0.5 : 1 }}>
                {LABEL_ORDER.map((label) => {
                  const meta = LABEL_META[label];
                  const prediction = result.predictions.find((p) => p.label === label);
                  const score = prediction?.score ?? 0;
                  const percentage = prediction?.percentage ?? formatScore(0);
                  return (
                    <BarRow
                      key={label}
                      label={meta.display}
                      score={score}
                      percentage={percentage}
                      pastel={meta.pastel}
                      ink={meta.ink}
                      isWinner={label === result.mostLikelyCategory}
                      reduceMotion={reduceMotion}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Playground;
