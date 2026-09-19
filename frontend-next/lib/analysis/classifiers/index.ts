import 'server-only';

import { classifyWithMuril, MURIL_LANGUAGES } from './muril';
import { classifyWithXlmr, XLMR_LANGUAGES } from './xlmr';
import type { ClassifierOutcome } from './types';

export { isClassifierError } from './types';
export type {
  ClassifierResult,
  ClassifierError,
  ClassifierOutcome,
} from './types';

/**
 * Picks a classifier by language and runs it.
 *
 * Neither model covers everything, and using one for all languages is what
 * made the original app English-and-Russian-only. The routing:
 *
 *  - Indic languages → MuRIL, which is trained on them
 *  - European languages → XLM-R, which has the richer label set
 *  - English → XLM-R, because seven categories beat a binary verdict, even
 *    though both models handle it
 *  - anything else → XLM-R on cross-lingual transfer, flagged out-of-domain
 */

/** Indic languages where MuRIL is the better model. */
const INDIC_LANGUAGES = new Set(['hi', 'mr', 'bn', 'ta', 'te', 'ur']);

export type ClassifierName = 'muril' | 'xlmr';

export function selectClassifier(
  language: string,
  isCodeMixed: boolean
): ClassifierName {
  // Romanised Hindi/Marathi is Latin script but Indic language — MuRIL was
  // trained on exactly this, XLM-R was not.
  if (isCodeMixed) return 'muril';
  if (INDIC_LANGUAGES.has(language)) return 'muril';
  return 'xlmr';
}

export async function classify(
  text: string,
  language: string,
  isCodeMixed = false
): Promise<ClassifierOutcome> {
  const classifier = selectClassifier(language, isCodeMixed);

  return classifier === 'muril'
    ? classifyWithMuril(text, language)
    : classifyWithXlmr(text, language);
}

/** Whether any classifier claims to support this language natively. */
export function isSupportedLanguage(language: string): boolean {
  return MURIL_LANGUAGES.has(language) || XLMR_LANGUAGES.has(language);
}

export { MURIL_LANGUAGES, XLMR_LANGUAGES };
