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
