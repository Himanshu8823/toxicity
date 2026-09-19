import type { Severity, ToxicityCategory } from '@/lib/db/schema';
import { SEVERITY_META, severityRank } from './taxonomy';

/**
 * Turning a confidence score into a severity band.
 *
 * Confidence alone is not severity: a classifier 95% sure something is
 * profanity has found something mild it is very sure about, while one 60% sure
 * it is a threat has found something serious it is unsure about. So the
 * category sets the floor and the confidence moves the band within it.
 */

/** The lowest severity a category can ever be reported at, once it fires. */
const CATEGORY_FLOOR: Record<ToxicityCategory, Severity> = {
  non_toxic: 'none',
  profanity: 'mild',
  insult: 'mild',
  sexual_explicit: 'moderate',
  harassment: 'moderate',
  identity_attack: 'severe',
  hate_speech: 'severe',
  self_harm: 'severe',
  // A credible threat is never "mild" regardless of how unsure the model is.
  threat: 'severe',
};

/** The highest a category can reach on confidence alone. */
const CATEGORY_CEILING: Record<ToxicityCategory, Severity> = {
  non_toxic: 'none',
  profanity: 'moderate',
  insult: 'severe',
  sexual_explicit: 'severe',
  harassment: 'severe',
  identity_attack: 'critical',
  hate_speech: 'critical',
  self_harm: 'critical',
  threat: 'critical',
};

const ORDER: readonly Severity[] = ['none', 'mild', 'moderate', 'severe', 'critical'];

function clamp(severity: Severity, floor: Severity, ceiling: Severity): Severity {
  const rank = severityRank(severity);
  if (rank < severityRank(floor)) return floor;
  if (rank > severityRank(ceiling)) return ceiling;
  return severity;
}

/** Confidence → a raw band, before the category constrains it. */
function bandFromConfidence(confidence: number): Severity {
  if (confidence >= 0.9) return 'critical';
  if (confidence >= 0.75) return 'severe';
  if (confidence >= 0.55) return 'moderate';
  if (confidence >= 0.35) return 'mild';
  return 'none';
}

/**
 * The severity for a classifier verdict, before any Groq adjustment.
 */
export function deriveSeverity(
  category: ToxicityCategory,
  confidence: number
): Severity {
  if (category === 'non_toxic') return 'none';

  return clamp(
    bandFromConfidence(confidence),
    CATEGORY_FLOOR[category],
    CATEGORY_CEILING[category]
  );
}

export interface SeverityAdjustment {
  /** What Groq independently assessed, when it was consulted. */
  groqSeverity?: Severity;
  /** Sarcasm hides intent, so a sarcastic comment is worse than it scores. */
  isSarcastic: boolean;
  /** Harmful only in context — also worse than the text alone suggests. */
  contextShifted: boolean;
}

/**
 * Final severity, combining the classifier's band with Groq's read.
 *
 * Groq may move the band by one step in either direction, and sarcasm or a
 * context shift each add a further step upward. It cannot leap from `mild` to
 * `critical` in one go: the statistical score stays the anchor, because an LLM
 * asked to rate severity will drift upward over a long run and the metrics
 * page has to stay meaningful.
 */
export function adjustSeverity(
  base: Severity,
  category: ToxicityCategory,
  adjustment: SeverityAdjustment
): Severity {
  if (category === 'non_toxic' && !adjustment.isSarcastic) return 'none';

  let rank = severityRank(base);

  if (adjustment.groqSeverity) {
    const groqRank = severityRank(adjustment.groqSeverity);
    // Move toward Groq's view, one step at a time.
    if (groqRank > rank) rank += 1;
    else if (groqRank < rank) rank -= 1;
  }

  // Implicit toxicity is the harder kind to catch and the easier kind to
  // under-rate, so both signals push upward.
  if (adjustment.isSarcastic) rank += 1;
  if (adjustment.contextShifted) rank += 1;

  const bounded = ORDER[Math.max(0, Math.min(ORDER.length - 1, rank))];

  return clamp(bounded, CATEGORY_FLOOR[category], CATEGORY_CEILING[category]);
}

export function severityLabel(severity: Severity): string {
  return SEVERITY_META[severity].display;
}
