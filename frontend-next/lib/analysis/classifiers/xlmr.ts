import 'server-only';

import { classifyWithHf } from './hf-client';
import type { ClassifierOutcome, ClassifierResult } from './types';
import type { ToxicityCategory } from '@/lib/db/schema';

/**
 * `unitary/multilingual-toxic-xlm-roberta` — the European-language classifier.
 *
 * Trained on English, French, Spanish, Italian, Portuguese, Turkish and
 * Russian. The model card is explicit that it should only be tested on those,
 * so anything else routed here is marked `outOfDomain` and leaned on less.
 *
 * Its seven labels map almost directly onto our taxonomy, which is why it is
 * the primary model wherever it is in domain.
 */

const MODEL = 'unitary/multilingual-toxic-xlm-roberta';
const VERSION = 'multilingual-v1';

/** Languages the model was actually trained on. */
export const XLMR_LANGUAGES = new Set([
  'en',
  'fr',
  'es',
  'it',
  'pt',
  'tr',
  'ru',
]);

/**
 * Model label → our category. `toxicity` is the model's catch-all and is the
 * weakest signal, so it only wins when nothing more specific fired.
 */
const LABEL_MAP: Record<string, ToxicityCategory> = {
  toxicity: 'insult',
  toxic: 'insult',
  severe_toxicity: 'harassment',
  severe_toxic: 'harassment',
  obscene: 'profanity',
  threat: 'threat',
  insult: 'insult',
  identity_attack: 'identity_attack',
  identity_hate: 'identity_attack',
  sexual_explicit: 'sexual_explicit',
};

/**
 * Below this a label is treated as not firing at all. The model emits a score
 * for every label on every input, so without a floor every comment would
 * "contain" all seven.
 */
const FIRING_THRESHOLD = 0.5;

/** Specific labels beat the generic `toxicity` catch-all when both fire. */
const GENERIC_LABELS = new Set(['toxicity', 'toxic']);

export async function classifyWithXlmr(
  text: string,
  language: string
): Promise<ClassifierOutcome> {
  try {
    const scores = await classifyWithHf({ model: MODEL, text });

    if (scores.length === 0) {
      return { error: 'Model returned no labels.', modelName: MODEL };
    }

    const rawScores: Record<string, number> = {};
    for (const { label, score } of scores) {
      rawScores[label.toLowerCase()] = score;
    }

    const fired = scores
      .filter((s) => s.score >= FIRING_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    if (fired.length === 0) {
      // Confidence in "clean" is how far the strongest harmful label fell
      // short of firing.
      const strongest = Math.max(...scores.map((s) => s.score));
      return buildResult('non_toxic', 1 - strongest, rawScores, language);
    }

    // Prefer a specific label over the generic one, even if it scored lower —
    // "threat at 0.61" is far more useful than "toxicity at 0.88".
    const specific = fired.find((s) => !GENERIC_LABELS.has(s.label.toLowerCase()));
    const chosen = specific ?? fired[0];

    const category = LABEL_MAP[chosen.label.toLowerCase()] ?? 'insult';

    return buildResult(category, chosen.score, rawScores, language);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Classification failed.',
      modelName: MODEL,
    };
  }
}

function buildResult(
  category: ToxicityCategory,
  confidence: number,
  rawScores: Record<string, number>,
  language: string
): ClassifierResult {
  return {
    category,
    confidence: Math.max(0, Math.min(1, confidence)),
    rawScores,
    modelName: MODEL,
    modelVersion: VERSION,
    outOfDomain: !XLMR_LANGUAGES.has(language),
  };
}
