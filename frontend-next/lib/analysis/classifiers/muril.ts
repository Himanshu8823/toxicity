import 'server-only';

import { classifyWithHf } from './hf-client';
import type { ClassifierOutcome, ClassifierResult } from './types';

/**
 * `Hate-speech-CNERG/indic-abusive-allInOne-MuRIL` — the Indic classifier.
 *
 * Covers Bengali, Devanagari Hindi, code-mixed Hindi, Kannada, Malayalam,
 * Marathi, Tamil, Urdu, code-mixed Urdu and English. This is the model that
 * makes Hindi and Marathi support real rather than a cross-lingual guess.
 *
 * The trade-off: it is binary. `LABEL_0` normal, `LABEL_1` abusive — no
 * category, no severity. So it answers "is this abusive, and how sure are
 * you", and Groq is what turns that into a category. The pipeline treats a
 * MuRIL hit as provisional `insult` until Groq refines it.
 */

const MODEL = 'Hate-speech-CNERG/indic-abusive-allInOne-MuRIL';
const VERSION = 'allInOne-v1';

/** Languages the model was trained on. */
export const MURIL_LANGUAGES = new Set([
  'hi',
  'mr',
  'bn',
  'ta',
  'te',
  'ur',
  'en',
]);

const ABUSIVE_LABEL = 'label_1';
const NORMAL_LABEL = 'label_0';

export async function classifyWithMuril(
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

    const abusive = rawScores[ABUSIVE_LABEL] ?? 0;
    const normal = rawScores[NORMAL_LABEL] ?? 0;

    if (abusive > normal) {
      // Provisional only. The model cannot say *what kind* of abuse this is,
      // so `insult` stands in as the least-assuming harmful category and Groq
      // is expected to narrow it.
      return buildResult('insult', abusive, rawScores, language, true);
    }

    return buildResult('non_toxic', normal, rawScores, language, false);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Classification failed.',
      modelName: MODEL,
    };
  }
}

function buildResult(
  category: 'insult' | 'non_toxic',
  confidence: number,
  rawScores: Record<string, number>,
  language: string,
  provisional: boolean
): ClassifierResult & { provisionalCategory: boolean } {
  return {
    category,
    confidence: Math.max(0, Math.min(1, confidence)),
    rawScores,
    modelName: MODEL,
    modelVersion: VERSION,
    outOfDomain: !MURIL_LANGUAGES.has(language),
    /**
     * Signals to the merge step that the category is a placeholder and Groq
     * should be allowed to replace it outright, not merely nudge it.
     */
    provisionalCategory: provisional,
  };
}
