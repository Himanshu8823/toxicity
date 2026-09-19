import 'server-only';

import { classify, isClassifierError } from './classifiers';
import { detectLanguage, dominantLanguage, type DetectedLanguage } from './language';
import { enrichComments, isGroqConfigured, type EnrichmentInput } from './groq';
import { adjustSeverity, deriveSeverity } from './severity';
import { hashText } from './hash';
import { isHarmful } from './taxonomy';
import type { Severity, ToxicityCategory } from '@/lib/db/schema';

/**
 * The analysis pipeline.
 *
 * One comment's journey: detect language → pick and run a classifier → enrich
 * with Groq → merge the two verdicts → out. Everything else in the app is
 * storage and presentation around this.
 *
 * Deliberately free of database calls. It takes text in and returns verdicts,
 * which keeps it testable and lets the caller decide what is worth persisting.
 */

export interface PipelineInput {
  /** Stable identifier for matching results back onto the caller's records. */
  id: string;
  text: string;
  /** The parent's text, for replies — this is what enables context detection. */
  parentText?: string;
}

export interface AnalysedResult {
  id: string;
  text: string;
  textHash: string;
  language: string;
  languageConfidence: number;
  isCodeMixed: boolean;

  category: ToxicityCategory;
  severity: Severity;
  confidence: number;
  harmful: boolean;

  modelName: string;
  modelVersion: string;
  rawScores: Record<string, number>;

  isSarcastic: boolean;
  contextShifted: boolean;
  rationale: string | null;
  groqScores: Record<string, unknown> | null;
  /**
   * The classifier and Groq disagreed. Not a failure — these are the rows most
   * worth showing a human, and the disagreement rate is itself a metric.
   */
  modelsDisagree: boolean;

  error?: string;
}

export interface PipelineOptions {
  /** Skip Groq entirely. Faster, and the fallback when no key is configured. */
  skipEnrichment?: boolean;
  /** Classifier calls to run at once. */
  concurrency?: number;
}

export interface PipelineSummary {
  results: AnalysedResult[];
  analysedCount: number;
  erroredCount: number;
  /** Percentage 0–100 of analysed comments in any harmful category. */
  overallToxicityScore: number;
  avgConfidence: number;
  dominantLanguage: string;
  durationMs: number;
  categoryCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  languageCounts: Record<string, number>;
  disagreementRate: number;
  enrichmentUsed: boolean;
}

/** Classifier calls in flight at once. HF throttles hard above this. */
const DEFAULT_CONCURRENCY = 8;

/** Runs `worker` over `items`, at most `limit` at a time, preserving order. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

/**
 * Analyses a set of comments end to end.
 */
export async function analyseComments(
  inputs: readonly PipelineInput[],
  options: PipelineOptions = {}
): Promise<PipelineSummary> {
  const startedAt = Date.now();
  const { skipEnrichment = false, concurrency = DEFAULT_CONCURRENCY } = options;

  if (inputs.length === 0) {
    return emptySummary(Date.now() - startedAt);
  }

  // ── 1. Language detection (local, no network) ─────────────────────────────
  const detections: DetectedLanguage[] = inputs.map((i) => detectLanguage(i.text));

  // ── 2. Classification ─────────────────────────────────────────────────────
  const classified = await mapWithConcurrency(inputs, concurrency, async (input, i) => {
    const detection = detections[i];
    const outcome = await classify(input.text, detection.code, detection.isCodeMixed);
    return { input, detection, outcome };
  });

  // ── 3. Enrichment ─────────────────────────────────────────────────────────
  // Only comments that classified successfully are worth a Groq slot; a failed
  // classification has no verdict for Groq to second-guess.
  const enrichmentInputs: EnrichmentInput[] = [];

  classified.forEach(({ input, detection, outcome }, index) => {
    if (isClassifierError(outcome)) return;

    enrichmentInputs.push({
      index,
      text: input.text,
      language: detection.code,
      parentText: input.parentText,
      classifierCategory: outcome.category,
      classifierConfidence: outcome.confidence,
    });
  });

  const useEnrichment = !skipEnrichment && isGroqConfigured();
  const enrichments = useEnrichment
    ? await enrichComments(enrichmentInputs)
    : new Map();

  // ── 4. Merge ──────────────────────────────────────────────────────────────
  const results: AnalysedResult[] = classified.map(
    ({ input, detection, outcome }, index) => {
      const base = {
        id: input.id,
        text: input.text,
        textHash: hashText(input.text),
        language: detection.code,
        languageConfidence: detection.confidence,
        isCodeMixed: detection.isCodeMixed,
      };

      if (isClassifierError(outcome)) {
        return {
          ...base,
          category: 'non_toxic' as ToxicityCategory,
          severity: 'none' as Severity,
          confidence: 0,
          harmful: false,
          modelName: outcome.modelName,
          modelVersion: 'unknown',
          rawScores: {},
          isSarcastic: false,
          contextShifted: false,
          rationale: null,
          groqScores: null,
          modelsDisagree: false,
          error: outcome.error,
        };
      }

      const enrichment = enrichments.get(index);

      // The classifier owns the category unless it admitted it cannot name one
      // (MuRIL's binary verdict) or Groq is confident it got it wrong.
      const categoryFromGroq =
        enrichment &&
        (outcome.provisionalCategory || enrichment.classifierLooksWrong);

      const category: ToxicityCategory = categoryFromGroq
        ? enrichment.category
        : outcome.category;

      const baseSeverity = deriveSeverity(category, outcome.confidence);

      const severity = enrichment
        ? adjustSeverity(baseSeverity, category, {
            groqSeverity: enrichment.severity,
            isSarcastic: enrichment.isSarcastic,
            contextShifted: enrichment.contextShifted,
          })
        : baseSeverity;

      // Disagreement means a materially different verdict, not a different
      // shade of the same one. A provisional category being filled in is the
      // system working as designed, not a conflict.
      const disagree = Boolean(
        enrichment &&
          !outcome.provisionalCategory &&
          (enrichment.classifierLooksWrong ||
            isHarmful(enrichment.category) !== isHarmful(outcome.category))
      );

      return {
        ...base,
        category,
        severity,
        confidence: outcome.confidence,
        harmful: isHarmful(category),
        modelName: outcome.modelName,
        modelVersion: outcome.modelVersion,
        rawScores: outcome.rawScores,
        isSarcastic: enrichment?.isSarcastic ?? false,
        contextShifted: enrichment?.contextShifted ?? false,
        rationale: enrichment?.rationale ?? null,
        groqScores: enrichment
          ? {
              category: enrichment.category,
              severity: enrichment.severity,
              classifierLooksWrong: enrichment.classifierLooksWrong,
            }
          : null,
        modelsDisagree: disagree,
      };
    }
  );

  return summarise(results, detections, useEnrichment, Date.now() - startedAt);
}

/** Convenience wrapper for the playground, which scores one pasted string. */
export async function analyseSingle(
  text: string,
  options: PipelineOptions = {}
): Promise<AnalysedResult> {
  const summary = await analyseComments([{ id: 'single', text }], options);
  return summary.results[0];
}

// ─── Summary ─────────────────────────────────────────────────────────────────

function summarise(
  results: readonly AnalysedResult[],
  detections: readonly DetectedLanguage[],
  enrichmentUsed: boolean,
  durationMs: number
): PipelineSummary {
  const analysed = results.filter((r) => !r.error);
  const errored = results.length - analysed.length;

  const categoryCounts: Record<string, number> = {};
  const severityCounts: Record<string, number> = {};
  const languageCounts: Record<string, number> = {};

  let harmfulCount = 0;
  let confidenceSum = 0;
  let disagreements = 0;

  for (const r of analysed) {
    categoryCounts[r.category] = (categoryCounts[r.category] ?? 0) + 1;
    severityCounts[r.severity] = (severityCounts[r.severity] ?? 0) + 1;
    languageCounts[r.language] = (languageCounts[r.language] ?? 0) + 1;

    if (r.harmful) harmfulCount++;
    if (r.modelsDisagree) disagreements++;
    confidenceSum += r.confidence;
  }

  const total = analysed.length;

  return {
    results: [...results],
    analysedCount: total,
    erroredCount: errored,
    overallToxicityScore: total > 0 ? (harmfulCount / total) * 100 : 0,
    avgConfidence: total > 0 ? confidenceSum / total : 0,
    dominantLanguage: dominantLanguage(detections),
    durationMs,
    categoryCounts,
    severityCounts,
    languageCounts,
    disagreementRate: total > 0 ? (disagreements / total) * 100 : 0,
    enrichmentUsed,
  };
}

function emptySummary(durationMs: number): PipelineSummary {
  return {
    results: [],
    analysedCount: 0,
    erroredCount: 0,
    overallToxicityScore: 0,
    avgConfidence: 0,
    dominantLanguage: 'unknown',
    durationMs,
    categoryCounts: {},
    severityCounts: {},
    languageCounts: {},
    disagreementRate: 0,
    enrichmentUsed: false,
  };
}
