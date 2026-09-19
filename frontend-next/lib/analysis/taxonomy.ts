/**
 * The category taxonomy, and the bridge back to the legacy five labels.
 *
 * The original app had five states (`non_toxic`, `insult`, `obscenity`,
 * `threat`, `dangerous`). That conflated things worth separating — "dangerous"
 * was carrying hate speech, identity attacks and self-harm all at once, which
 * makes it useless as a moderation signal.
 *
 * The nine categories below split those out. The legacy five are kept as a
 * projection so existing UI keeps rendering while it is migrated.
 */

import type { Severity, ToxicityCategory } from '@/lib/db/schema';

export const CATEGORIES: readonly ToxicityCategory[] = [
  'non_toxic',
  'insult',
  'harassment',
  'hate_speech',
  'threat',
  'profanity',
  'sexual_explicit',
  'identity_attack',
  'self_harm',
] as const;

export const HARMFUL_CATEGORIES: ReadonlySet<ToxicityCategory> = new Set(
  CATEGORIES.filter((c) => c !== 'non_toxic')
);

export interface CategoryMeta {
  category: ToxicityCategory;
  display: string;
  description: string;
  /** Atmospheric pastel, matching the existing design tokens. */
  pastel: string;
  /** Ink shade — this is what actually carries severity in text and charts. */
  ink: string;
  /**
   * Weight used when a comment scores across several categories: the heaviest
   * wins. Ordered by how much real-world harm the category represents.
   */
  weight: number;
}

export const CATEGORY_META: Record<ToxicityCategory, CategoryMeta> = {
  non_toxic: {
    category: 'non_toxic',
    display: 'Non-toxic',
    description: 'No insults, obscenity or threatening intent detected.',
    pastel: '#a7e5d3',
    ink: '#3f6b5c',
    weight: 0,
  },
  profanity: {
    category: 'profanity',
    display: 'Profanity',
    description: 'Crude or vulgar language, not aimed at anyone in particular.',
    pastel: '#c8b8e0',
    ink: '#5f4d7a',
    weight: 1,
  },
  insult: {
    category: 'insult',
    display: 'Insult',
    description: 'Hostile or disrespectful language aimed at a person or group.',
    pastel: '#f4c5a8',
    ink: '#8a5a3c',
    weight: 2,
  },
  sexual_explicit: {
    category: 'sexual_explicit',
    display: 'Sexual content',
    description: 'Sexually explicit language or unwanted sexual advances.',
    pastel: '#e8b8c4',
    ink: '#8a3f52',
    weight: 3,
  },
  harassment: {
    category: 'harassment',
    display: 'Harassment',
    description:
      'Sustained or targeted abuse directed at one person, rather than a single insult.',
    pastel: '#f4c5a8',
    ink: '#8a5a3c',
    weight: 4,
  },
  identity_attack: {
    category: 'identity_attack',
    display: 'Identity attack',
    description:
      'An attack on who someone is — their race, religion, gender, caste, sexuality or disability.',
    pastel: '#a8c8e8',
    ink: '#3d5f80',
    weight: 5,
  },
  hate_speech: {
    category: 'hate_speech',
    display: 'Hate speech',
    description:
      'Language that dehumanises or incites hostility against a protected group.',
    pastel: '#a8c8e8',
    ink: '#3d5f80',
    weight: 6,
  },
  self_harm: {
    category: 'self_harm',
    display: 'Self-harm',
    description:
      'Content encouraging self-harm or suicide, or expressing intent to self-harm.',
    pastel: '#c8b8e0',
    ink: '#5f4d7a',
    weight: 7,
  },
  threat: {
    category: 'threat',
    display: 'Threat',
    description: 'Language expressing intent to harm a person or group.',
    pastel: '#e8b8c4',
    ink: '#8a3f52',
    weight: 8,
  },
};

// ─── Severity ────────────────────────────────────────────────────────────────

export const SEVERITIES: readonly Severity[] = [
  'none',
  'mild',
  'moderate',
  'severe',
  'critical',
] as const;

export interface SeverityMeta {
  severity: Severity;
  display: string;
  description: string;
  ink: string;
  pastel: string;
  /** Position in the scale — used for comparisons and for sorting. */
  rank: number;
}

export const SEVERITY_META: Record<Severity, SeverityMeta> = {
  none: {
    severity: 'none',
    display: 'None',
    description: 'Nothing harmful detected.',
    ink: '#3f6b5c',
    pastel: '#a7e5d3',
    rank: 0,
  },
  mild: {
    severity: 'mild',
    display: 'Mild',
    description: 'Rude or crude, but unlikely to cause real harm.',
    ink: '#5f4d7a',
    pastel: '#c8b8e0',
    rank: 1,
  },
  moderate: {
    severity: 'moderate',
    display: 'Moderate',
    description: 'Clearly hostile and aimed at someone.',
    ink: '#8a5a3c',
    pastel: '#f4c5a8',
    rank: 2,
  },
  severe: {
    severity: 'severe',
    display: 'Severe',
    description: 'Abusive, hateful, or targeting who a person is.',
    ink: '#8a3f52',
    pastel: '#e8b8c4',
    rank: 3,
  },
  critical: {
    severity: 'critical',
    display: 'Critical',
    description:
      'Credible threats, incitement, or content that may need reporting beyond the platform.',
    ink: '#3d5f80',
    pastel: '#a8c8e8',
    rank: 4,
  },
};

export function severityRank(severity: Severity): number {
  return SEVERITY_META[severity].rank;
}

export function isMoreSevere(a: Severity, b: Severity): boolean {
  return severityRank(a) > severityRank(b);
}

// ─── Legacy bridge ───────────────────────────────────────────────────────────

/** The five labels the original backend returned. */
export type LegacyLabel =
  | 'non_toxic'
  | 'insult'
  | 'obscenity'
  | 'threat'
  | 'dangerous';

/**
 * Projects a nine-category verdict onto the original five, so components not
 * yet migrated keep working. Lossy by design — that loss is exactly why the
 * taxonomy was widened.
 */
export function toLegacyLabel(category: ToxicityCategory): LegacyLabel {
  switch (category) {
    case 'non_toxic':
      return 'non_toxic';
    case 'insult':
    case 'harassment':
      return 'insult';
    case 'profanity':
    case 'sexual_explicit':
      return 'obscenity';
    case 'threat':
      return 'threat';
    case 'hate_speech':
    case 'identity_attack':
    case 'self_harm':
      return 'dangerous';
  }
}

/**
 * Coerces any string into a known category. Unknown values become
 * `hate_speech` rather than `non_toxic`: if something harmful arrives in a
 * shape we do not recognise, it must not be waved through as clean.
 */
export function normalizeCategory(raw: string | null | undefined): ToxicityCategory {
  const key = String(raw ?? '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if ((CATEGORIES as readonly string[]).includes(key)) {
    return key as ToxicityCategory;
  }

  // Label names used by the upstream models and the old backend.
  switch (key) {
    case 'not_toxic':
    case 'normal':
    case 'neutral':
    case 'label_0':
    case 'clean':
      return 'non_toxic';
    case 'obscene':
    case 'obscenity':
      return 'profanity';
    case 'toxic':
    case 'severe_toxic':
    case 'severe_toxicity':
    case 'toxicity':
    case 'label_1':
    case 'abusive':
      return 'insult';
    case 'identity_hate':
    case 'identity_attack':
      return 'identity_attack';
    case 'sexual':
    case 'sexual_explicit':
      return 'sexual_explicit';
    case 'dangerous':
      return 'hate_speech';
    default:
      return 'hate_speech';
  }
}

export function categoryMeta(category: ToxicityCategory): CategoryMeta {
  return CATEGORY_META[category];
}

export function isHarmful(category: ToxicityCategory): boolean {
  return HARMFUL_CATEGORIES.has(category);
}
