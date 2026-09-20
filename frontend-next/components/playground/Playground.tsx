'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResultPanel } from '@/components/playground/ResultPanel';
import { EXAMPLE_PROMPTS, type ExamplePrompt } from '@/components/playground/examples';
import { analyzeText, toApiMessage } from '@/lib/api';
import type { TextAnalysisResponse } from '@/lib/types';

const MAX_CHARS = 1000;

type Status = 'idle' | 'loading' | 'success' | 'error';

export interface PlaygroundProps {
  className?: string;
}

export function Playground({ className }: PlaygroundProps) {
  const textareaId = useId();

  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<TextAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
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

  // Clean up any in-flight request on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function handleSubmitNow() {
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

  // A result already on screen stays on screen while the next one loads, dimmed
  // rather than replaced — swapping it for a skeleton on every keystroke pause
  // makes the panel flicker and loses the reader's place.
  const showResult = result !== null && (status === 'success' || isLoading);

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
              placeholder="Type or paste a comment in any supported language — English, Hindi, Marathi, or romanised Hinglish…"
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
                  className="caption inline-flex min-h-[36px] items-center rounded-[var(--radius-pill)] border border-hairline-strong bg-surface-card px-3 py-1.5 text-body transition-colors hover:border-[var(--color-ink)] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2"
                  title={prompt.text}
                >
                  {prompt.label}
                  <span className="sr-only"> — {prompt.hint}</span>
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
                Click Analyse to see how ToxiScan reads it.
              </p>
              <p className="body-sm mt-3 max-w-[38ch] text-muted">
                You will get a category, a severity level, the language it was
                detected in and which model scored it.
              </p>
            </div>
          ) : null}

          {isLoading && !result ? (
            <div className="flex flex-1 flex-col gap-6">
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          ) : null}

          {status === 'error' ? (
            <div
              role="alert"
              className="flex flex-1 flex-col items-center justify-center gap-4 text-center"
            >
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

          {showResult && result ? (
            <ResultPanel
              result={result}
              isStale={isLoading}
              reduceMotion={reduceMotion}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Playground;
