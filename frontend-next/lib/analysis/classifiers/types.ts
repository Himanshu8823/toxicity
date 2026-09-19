import type { ToxicityCategory } from '@/lib/db/schema';

/**
 * The single shape every classifier normalises to, so the pipeline never has
 * to know which model produced a result.
 */
export interface ClassifierResult {
  /** Best-guess category after the model's own labels are mapped across. */
  category: ToxicityCategory;
  /** 0–1 confidence in `category`. */
  confidence: number;
  /** The model's full label→score map, kept verbatim for the metrics page. */
  rawScores: Record<string, number>;
  modelName: string;
  modelVersion: string;
  /**
   * True when the model is being used outside the languages it was trained
   * on. Those results are still useful, but they are the ones Groq should
   * override more readily and the ones worth flagging for human review.
   */
  outOfDomain: boolean;
  /**
   * Set by binary classifiers, which can say a comment is abusive but not
   * what kind of abuse it is. When true the merge step lets Groq replace the
   * category outright instead of only adjusting it.
   */
  provisionalCategory?: boolean;
}

export interface ClassifierError {
  error: string;
  modelName: string;
}

export type ClassifierOutcome = ClassifierResult | ClassifierError;

export function isClassifierError(
  outcome: ClassifierOutcome
): outcome is ClassifierError {
  return 'error' in outcome;
}

/** One label/score pair as the HF text-classification API returns it. */
export interface HfLabelScore {
  label: string;
  score: number;
}
