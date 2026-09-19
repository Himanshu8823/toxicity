/**
 * Types mirroring the Express backend contract in `backend/server.js`.
 * The backend is the source of truth — do not change these shapes
 * without changing the server first.
 */

export const CANONICAL_LABELS = [
  'non_toxic',
  'insult',
  'obscenity',
  'threat',
  'dangerous',
] as const;

export type ToxicityLabel = (typeof CANONICAL_LABELS)[number];

/** Labels the backend counts as harmful (everything except non_toxic). */
export const HARMFUL_LABELS: ReadonlySet<ToxicityLabel> = new Set<ToxicityLabel>([
  'insult',
  'obscenity',
  'threat',
  'dangerous',
]);

export interface Prediction {
  label: ToxicityLabel;
  score: number;
  /** Pre-formatted by the server, e.g. "82.14%". */
  percentage: string;
}

export interface CommentResult {
  text: string;
  predictions?: Prediction[];
  mostLikelyCategory?: ToxicityLabel;
  confidence?: number;
  /** Present instead of the fields above when the model call failed. */
  error?: string;
}

/** A comment result that the server confirmed as analysed (no `error`). */
export interface AnalysedComment extends CommentResult {
  predictions: Prediction[];
  mostLikelyCategory: ToxicityLabel;
  confidence: number;
}

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  /** Already locale-formatted by the server, e.g. "1,234,567". */
  viewCount: string;
  commentCount: string;
}

export interface LabelStat {
  label: ToxicityLabel;
  count: number;
  /** Server-formatted to one decimal, e.g. "42.9". */
  percentage: string;
  avgConfidence: string;
}

export interface Analysis {
  totalAnalyzed: number;
  errored: number;
  overallToxicityScore: string;
  avgConfidence: string;
  toxicCount: number;
  nonToxicCount: number;
  labelStats: LabelStat[];
  mostToxicComments: AnalysedComment[];
  allResults: AnalysedComment[];
}

/** Response of `POST /analyze-video`. */
export interface AnalysisResponse {
  videoInfo: VideoInfo;
  analysis: Analysis;
}

/** Response of `POST /analyze-toxicity` (single text). */
export interface SingleTextResult {
  text: string;
  predictions: Prediction[];
  mostLikelyCategory: ToxicityLabel;
  confidence: number;
}

/** Response of `POST /analyze-toxicity-batch`. */
export interface BatchTextResult {
  totalTexts: number;
  results: CommentResult[];
}

export interface ApiErrorBody {
  error: string;
  details?: string;
}

// ─── Migrated API shapes ─────────────────────────────────────────────────────
//
// The routes under `app/api/analyze/` return richer results than the five-label
// Express backend did: a nine-category taxonomy, a severity band, the detected
// language, and the sarcasm/context signals. The legacy interfaces above are
// kept because components still read them through the compatibility view in
// `lib/analysis/taxonomy.ts`; new code should use the shapes below.

export const TOXICITY_CATEGORIES = [
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

export type ToxicityCategoryName = (typeof TOXICITY_CATEGORIES)[number];

export const SEVERITY_LEVELS = [
  'none',
  'mild',
  'moderate',
  'severe',
  'critical',
] as const;

export type SeverityName = (typeof SEVERITY_LEVELS)[number];

/** One comment's verdict, as the analyze routes return it. */
export interface AnalysedCommentV2 {
  id?: string;
  text: string;
  language: string;
  languageConfidence?: number;
  isCodeMixed?: boolean;
  category: ToxicityCategoryName;
  severity: SeverityName;
  confidence: number;
  harmful: boolean;
  /** Surface reading and intent differ — the hard case to catch. */
  isSarcastic: boolean;
  /** Harmful only given the comment it replies to. */
  contextShifted?: boolean;
  /** One line from the language model on why it landed where it did. */
  rationale: string | null;
  modelName: string;
  rawScores?: Record<string, number>;
  /** The classifier and the language model reached different verdicts. */
  modelsDisagree: boolean;
  error?: string;
}

/** Response of `POST /api/analyze/video`. */
export interface VideoAnalysisResponse {
  scanId: string;
  videoInfo: VideoInfo;
  analysis: {
    totalAnalyzed: number;
    errored: number;
    overallToxicityScore: string;
    avgConfidence: string;
    dominantLanguage: string;
    durationMs: number;
    disagreementRate: string;
    enrichmentUsed: boolean;
    categoryCounts: Record<string, number>;
    severityCounts: Record<string, number>;
    languageCounts: Record<string, number>;
    mostToxicComments: AnalysedCommentV2[];
    allResults: AnalysedCommentV2[];
  };
}

/** Response of `POST /api/analyze/text`. */
export interface TextAnalysisResponse extends AnalysedCommentV2 {
  languageConfidence: number;
  isCodeMixed: boolean;
}

/** Response of `POST /api/analyze/batch`. */
export interface BatchAnalysisResponse {
  totalTexts: number;
  analysed: number;
  errored: number;
  dominantLanguage: string;
  categoryCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  languageCounts: Record<string, number>;
  results: AnalysedCommentV2[];
}
