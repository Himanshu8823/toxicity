'use client';

import { motion, type Transition } from 'framer-motion';
import { CategoryBadge } from '@/components/dashboard/CategoryBadge';
import { LanguageBadge } from '@/components/dashboard/LanguageBadge';
import { SeverityBadge } from '@/components/dashboard/SeverityBadge';
import { languageName } from '@/lib/analysis/language';
import { CATEGORY_META, SEVERITIES, SEVERITY_META } from '@/lib/analysis/taxonomy';
import type { Severity, ToxicityCategory } from '@/lib/db/schema';
import type { TextAnalysisResponse } from '@/lib/types';
import { formatScore } from '@/lib/utils';

/**
 * The result side of the playground.
 *
 * Split out of `Playground` because the input half is pure state machinery and
 * this half is pure presentation of one `TextAnalysisResponse` — keeping them
 * apart means the response shape can move again without touching the debounce,
 * abort and keyboard logic that took the most care to get right.
 */

interface ResultPanelProps {
  result: TextAnalysisResponse;
  /** Dims the panel while a newer request for the same box is in flight. */
  isStale: boolean;
  reduceMotion: boolean;
}

/** Framer transitions read better as one shared easing than as scattered literals. */
function ease(reduceMotion: boolean, delay = 0): Transition {
  return reduceMotion
    ? { duration: 0 }
    : { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] };
}

/**
 * Severity as a position on the five-level scale rather than a word.
 *
 * "Moderate" means nothing on its own — the reader needs to see that there are
 * two steps above it before they can judge how alarmed to be.
 */
function SeverityScale({
  severity,
  reduceMotion,
}: {
  severity: Severity;
  reduceMotion: boolean;
}) {
  const meta = SEVERITY_META[severity];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="caption-uppercase text-muted">Severity</span>
        <span className="caption" style={{ color: meta.ink }}>
          {meta.display} · {meta.rank} of {SEVERITIES.length - 1}
        </span>
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        {SEVERITIES.map((step, index) => {
          const reached = SEVERITY_META[step].rank <= meta.rank;
          return (
            <motion.div
              key={step}
              className="h-2 flex-1 rounded-[var(--radius-pill)]"
              style={{
                background: reached ? meta.pastel : 'var(--color-surface-strong)',
              }}
              initial={reduceMotion ? false : { opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={ease(reduceMotion, index * 0.05)}
            />
          );
        })}
      </div>
      {/* The bars are decorative; this is the same information as prose. */}
      <p className="sr-only">
        Severity {meta.display}, level {meta.rank} of {SEVERITIES.length - 1}.
      </p>
      <p className="body-sm text-muted">{meta.description}</p>
    </div>
  );
}

/**
 * A signal worth calling out in its own right — sarcasm or a model split.
 *
 * Rendered as a bordered note rather than a pill because both are claims about
 * the reading, not labels on it, and they need a sentence to be useful.
 */
function SignalNote({
  title,
  body,
  ink,
}: {
  title: string;
  body: string;
  ink: string;
}) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-hairline-strong bg-surface-card p-4"
      style={{ borderLeftColor: ink, borderLeftWidth: '3px' }}
    >
      <p className="caption-uppercase" style={{ color: ink }}>
        {title}
      </p>
      <p className="body-sm mt-1.5 text-body">{body}</p>
    </div>
  );
}

/**
 * Per-label classifier scores.
 *
 * Keys differ by model — MuRIL emits `label_0`/`label_1`, XLM-R emits named
 * heads like `toxicity` and `threat` — so whatever arrives is rendered as it
 * arrives. Assuming a fixed set here is exactly how the old five-bar breakdown
 * ended up rendering zeroes for labels the model never returned.
 */
function RawScores({
  scores,
  reduceMotion,
}: {
  scores: Record<string, number>;
  reduceMotion: boolean;
}) {
  const rows = Object.entries(scores).sort(([, a], [, b]) => b - a);
  if (rows.length === 0) return null;

  return (
    <details className="group">
      <summary className="caption-uppercase cursor-pointer list-none text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2">
        Model scores ({rows.length})
        <span aria-hidden="true" className="ml-1.5 inline-block group-open:hidden">
          +
        </span>
        <span aria-hidden="true" className="ml-1.5 hidden group-open:inline-block">
          −
        </span>
      </summary>
      <div className="mt-4 flex flex-col gap-3">
        {rows.map(([label, score], index) => {
          const width = Math.min(100, Math.max(0, score * 100));
          return (
            <div key={label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                {/* Raw key, not a prettified one: this section exists for people
                    who want to line the numbers up against the model's own output. */}
                <span className="caption text-body">{label}</span>
                <span className="caption text-muted">{formatScore(score)}</span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)]"
                style={{ background: 'var(--color-surface-strong)' }}
              >
                <motion.div
                  className="h-full rounded-[var(--radius-pill)]"
                  style={{ background: 'var(--color-hairline-strong)' }}
                  initial={{ width: reduceMotion ? `${width}%` : 0 }}
                  animate={{ width: `${width}%` }}
                  transition={ease(reduceMotion, index * 0.03)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

export function ResultPanel({ result, isStale, reduceMotion }: ResultPanelProps) {
  const category = result.category as ToxicityCategory;
  const severity = result.severity as Severity;
  const categoryInfo = CATEGORY_META[category];

  // Code-mixed text is romanised Hindi/Marathi more often than anything else,
  // and calling it plain "Hindi" hides the capability the routing exists for.
  const languageLabel = result.isCodeMixed
    ? `${languageName(result.language)} (romanised / code-mixed)`
    : languageName(result.language);

  const rawScores = result.rawScores ?? {};

  return (
    <motion.div
      className="flex flex-1 flex-col gap-8"
      style={{ opacity: isStale ? 0.5 : 1 }}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: isStale ? 0.5 : 1, y: 0 }}
      transition={ease(reduceMotion)}
    >
      {/* ── The verdict ────────────────────────────────────────────────── */}
      <div>
        <span className="caption-uppercase text-muted">Verdict</span>
        <p className="display-md mt-2" style={{ color: categoryInfo.ink }}>
          {categoryInfo.display}
        </p>
        <p className="body-sm mt-2 text-body">{categoryInfo.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CategoryBadge category={category} withTitle />
          <SeverityBadge severity={severity} showScale />
          <span className="caption text-muted">
            {formatScore(result.confidence)} confidence
          </span>
        </div>
      </div>

      <SeverityScale severity={severity} reduceMotion={reduceMotion} />

      {/* ── Provenance: what read it, and in what language ──────────────── */}
      <div className="flex flex-col gap-3 border-t border-hairline pt-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="caption-uppercase text-muted">Detected language</span>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageBadge code={result.language} />
            <span className="caption text-muted">
              {formatScore(result.languageConfidence)} confidence
            </span>
          </div>
        </div>
        {result.isCodeMixed ? (
          <p className="body-sm text-body">
            Read as {languageLabel} — Indic words written in Latin script, which is
            where generic detectors usually guess English.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="caption-uppercase text-muted">Scored by</span>
          <span className="body-sm text-ink">{result.modelName}</span>
        </div>
      </div>

      {/* ── Signals the classifier alone would have missed ───────────────── */}
      {result.isSarcastic || result.modelsDisagree ? (
        <div className="flex flex-col gap-3">
          {result.isSarcastic ? (
            <SignalNote
              title="Sarcasm detected"
              body="Read literally this looks harmless, but the intent behind it does not match the words. The verdict above reflects the intent."
              ink={SEVERITY_META.moderate.ink}
            />
          ) : null}
          {result.modelsDisagree ? (
            <SignalNote
              title="Models disagree"
              body="The classifier and the language model landed on different verdicts. Worth a second read by a human — this is the kind of text automated moderation gets wrong."
              ink={SEVERITY_META.severe.ink}
            />
          ) : null}
        </div>
      ) : null}

      {/* ── The model's own reasoning ────────────────────────────────────── */}
      {result.rationale ? (
        <div className="flex flex-col gap-2 border-t border-hairline pt-6">
          <span className="caption-uppercase text-muted">Why</span>
          <p className="body-sm text-body italic">{result.rationale}</p>
        </div>
      ) : null}

      {/* ── Numbers, for whoever wants them ──────────────────────────────── */}
      <div className="mt-auto border-t border-hairline pt-6">
        <RawScores scores={rawScores} reduceMotion={reduceMotion} />
      </div>
    </motion.div>
  );
}

export default ResultPanel;

