import { CANONICAL_LABELS, HARMFUL_LABELS, type ToxicityLabel } from './types';

/**
 * Presentation metadata for the legacy five toxicity states.
 *
 * These are no longer the taxonomy — `lib/analysis/taxonomy.ts` holds the
 * current nine categories and five severity levels, and is the source of truth.
 * What lives here is the projection of those nine onto the older five, kept so
 * the components that still read `LABEL_META` keep rendering while they migrate.
 * Change the taxonomy there, not here.
 *
 * Colour note: ElevenLabs has no saturated alert palette, so severity is
 * carried by the five atmospheric gradient tokens rather than red/green.
 * Ink weight (`ink`) is what actually signals severity in charts and text —
 * the pastel is atmosphere, exactly as DESIGN.md requires.
 */
export interface LabelMeta {
  label: ToxicityLabel;
  /** Human-facing name, e.g. "Non-toxic". */
  display: string;
  /** Atmospheric pastel from the gradient token set. */
  pastel: string;
  /** Warm ink shade used for text, strokes and chart fills. */
  ink: string;
  description: string;
  harmful: boolean;
}

export const LABEL_META: Record<ToxicityLabel, LabelMeta> = {
  non_toxic: {
    label: 'non_toxic',
    display: 'Non-toxic',
    pastel: '#a7e5d3',
    ink: '#3f6b5c',
    description: 'No insults, obscenity or threatening intent detected.',
    harmful: false,
  },
  insult: {
    label: 'insult',
    display: 'Insult',
    pastel: '#f4c5a8',
    ink: '#8a5a3c',
    description: 'Hostile or disrespectful language aimed at a person or group.',
    harmful: true,
  },
  obscenity: {
    label: 'obscenity',
    display: 'Obscenity',
    pastel: '#c8b8e0',
    ink: '#5f4d7a',
    description: 'Profanity or sexually explicit language.',
    harmful: true,
  },
  threat: {
    label: 'threat',
    display: 'Threat',
    pastel: '#a8c8e8',
    ink: '#3d5f80',
    description: 'Language expressing intent to harm.',
    harmful: true,
  },
  dangerous: {
    label: 'dangerous',
    display: 'Dangerous',
    pastel: '#e8b8c4',
    ink: '#8a3f52',
    description: 'Content that may damage reputation or encourage harm.',
    harmful: true,
  },
};

/** Display order: safest first, most severe last. */
export const LABEL_ORDER: readonly ToxicityLabel[] = CANONICAL_LABELS;

/**
 * Coerces any server or legacy label string into one of the legacy five.
 * Unknown values fall back to `dangerous` so nothing harmful is silently
 * shown as clean. The nine-category mapping lives in `lib/analysis/taxonomy.ts`.
 */
export function normalizeLabel(raw: string | undefined | null): ToxicityLabel {
  const key = String(raw ?? '').toLowerCase().replace(/[\s-]+/g, '_');

  if (key === 'non_toxic' || key === 'not_toxic' || key === 'normal' || key === 'neutral') {
    return 'non_toxic';
  }
  if (key === 'insult') return 'insult';
  if (key === 'obscene' || key === 'obscenity') return 'obscenity';
  if (key === 'threat') return 'threat';
  if (key === 'dangerous') return 'dangerous';

  return 'dangerous';
}

export function getLabelMeta(raw: string | undefined | null): LabelMeta {
  return LABEL_META[normalizeLabel(raw)];
}

export function isHarmful(raw: string | undefined | null): boolean {
  return HARMFUL_LABELS.has(normalizeLabel(raw));
}

/**
 * Plain-language reading of an overall toxicity percentage (0–100).
 * Deliberately non-alarmist: the tool reports, it does not scold.
 */
export function toxicityVerdict(score: number): { headline: string; detail: string } {
  if (score < 5) {
    return {
      headline: 'Healthy',
      detail: 'Almost every comment reads as non-toxic.',
    };
  }
  if (score < 15) {
    return {
      headline: 'Mostly civil',
      detail: 'A small share of comments carry harmful language.',
    };
  }
  if (score < 35) {
    return {
      headline: 'Mixed',
      detail: 'A noticeable minority of comments are harmful.',
    };
  }
  if (score < 60) {
    return {
      headline: 'Contentious',
      detail: 'Harmful language appears across a large share of the thread.',
    };
  }
  return {
    headline: 'Hostile',
    detail: 'The majority of sampled comments were flagged as harmful.',
  };
}
